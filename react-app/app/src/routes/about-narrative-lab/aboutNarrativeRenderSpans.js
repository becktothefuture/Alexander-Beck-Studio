const DEFAULT_PROFILE_ID = 'desktop';
const PRESSURE_EPSILON = 0.000001;

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function finite(value) {
  return Number.isFinite(Number(value));
}

function cleanWU(value) {
  return Number(Number(value).toFixed(6));
}

function pushDiagnostic(diagnostics, level, code, path, message, details = {}) {
  diagnostics.push({ level, code, path, message, ...details });
}

function getTrackCollections(input) {
  const model = input?.model || input;
  return {
    textFields: input?.textFields || model?.tracks?.text?.fields || [],
    worlds: input?.worlds || model?.tracks?.worlds?.objects || [],
  };
}

function getStoryToScrollMapper(resolver) {
  if (typeof resolver === 'function') return resolver;
  if (typeof resolver?.scrollWUFromStoryWU === 'function') {
    return (storyWU, context) => resolver.scrollWUFromStoryWU(storyWU, context);
  }
  if (typeof resolver?.storyToScrollWU === 'function') {
    return (storyWU, context) => resolver.storyToScrollWU(storyWU, context);
  }
  return null;
}

function getLayoutMode(field) {
  return String(
    field.layoutMode
    || field.layout?.mode
    || field.layoutHint
    || 'flow',
  );
}

function getPresentationMode(field) {
  return String(
    field.presentationMode
    || field.presentation?.mode
    || (field.kind === 'title' ? field.movement : '')
    || field.kind
    || 'text',
  );
}

function compareSemanticFields(left, right) {
  return Number(left.focusWU) - Number(right.focusWU)
    || Number(left.startWU) - Number(right.startWU)
    || String(left.id).localeCompare(String(right.id));
}

function compareWorldStarts(left, right) {
  return Number(left.startWU) - Number(right.startWU)
    || String(left.id).localeCompare(String(right.id));
}

function getCrossedWorldIds(worlds, startWU, endWU) {
  const crossed = [];
  for (const world of worlds) {
    const worldStartWU = Number(world.startWU);
    if (worldStartWU <= startWU) continue;
    if (worldStartWU >= endWU) break;
    crossed.push(world.id);
  }
  return crossed;
}

function getPressureInput(contentPressure, fieldId, spanId) {
  if (!contentPressure) return null;
  if (contentPressure instanceof Map) {
    return contentPressure.get(fieldId) || contentPressure.get(spanId) || null;
  }
  return contentPressure[fieldId] || contentPressure[spanId] || null;
}

function getRequiredScrollWU(input) {
  if (!input || typeof input !== 'object') return Number.NaN;
  if (finite(input.requiredScrollWU)) return Number(input.requiredScrollWU);
  if (finite(input.measuredHeightPx) && finite(input.viewportHeightPx) && Number(input.viewportHeightPx) > 0) {
    return Number(input.measuredHeightPx) / Number(input.viewportHeightPx);
  }
  return Number.NaN;
}

/**
 * Validates compiled render spans and optional post-layout measurements.
 * Measurements can report pressure, but they never alter authored Story WU or
 * the resolver-produced Scroll WU bounds.
 */
export function validateAboutNarrativeRenderSpans(plan, {
  contentPressure = null,
} = {}) {
  const diagnostics = [];
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    return [{
      level: 'error',
      code: 'render-span-plan',
      path: 'renderSpans',
      message: 'Render span plan must be an object.',
    }];
  }
  if (!Array.isArray(plan.spans)) {
    return [{
      level: 'error',
      code: 'render-span-list',
      path: 'renderSpans.spans',
      message: 'Render span plan must contain a spans array.',
    }];
  }

  const spanIds = new Set();
  const semanticFieldIds = new Set();
  let previousSemanticKey = null;

  plan.spans.forEach((span, spanIndex) => {
    const path = `renderSpans.spans.${spanIndex}`;
    if (!span?.id || typeof span.id !== 'string') {
      pushDiagnostic(diagnostics, 'error', 'render-span-id', `${path}.id`, 'Render spans require a stable string ID.');
    } else if (spanIds.has(span.id)) {
      pushDiagnostic(diagnostics, 'error', 'render-span-id-duplicate', `${path}.id`, `Render span ID “${span.id}” is duplicated.`);
    } else {
      spanIds.add(span.id);
    }

    if (!Array.isArray(span?.fieldIds) || span.fieldIds.length !== 1) {
      pushDiagnostic(
        diagnostics,
        'error',
        'render-span-semantic-cardinality',
        `${path}.fieldIds`,
        'Each render span must own exactly one semantic Text field.',
      );
    }
    (span?.fieldIds || []).forEach((fieldId) => {
      if (semanticFieldIds.has(fieldId)) {
        pushDiagnostic(
          diagnostics,
          'error',
          'render-field-duplicate',
          `${path}.fieldIds`,
          `Publishable Text field “${fieldId}” has more than one semantic output.`,
        );
      }
      semanticFieldIds.add(fieldId);
    });

    const story = span?.storyBounds;
    const scroll = span?.scrollBounds;
    if (!finite(story?.startWU) || !finite(story?.focusWU) || !finite(story?.endWU)) {
      pushDiagnostic(diagnostics, 'error', 'render-story-bounds', `${path}.storyBounds`, 'Story bounds must contain finite start, focus, and end WU.');
    } else if (story.startWU > story.focusWU || story.focusWU > story.endWU) {
      pushDiagnostic(diagnostics, 'error', 'render-story-order', `${path}.storyBounds`, 'Story bounds must be ordered start, focus, end.');
    }
    if (!finite(scroll?.startWU) || !finite(scroll?.focusWU) || !finite(scroll?.endWU)) {
      pushDiagnostic(diagnostics, 'error', 'render-scroll-bounds', `${path}.scrollBounds`, 'Scroll bounds must contain finite start, focus, and end WU.');
    } else if (scroll.startWU > scroll.focusWU || scroll.focusWU > scroll.endWU) {
      pushDiagnostic(diagnostics, 'error', 'render-scroll-order', `${path}.scrollBounds`, 'Profile mapping must preserve start, focus, end ordering.');
    }
    if (typeof span?.layoutMode !== 'string' || !span.layoutMode) {
      pushDiagnostic(diagnostics, 'error', 'render-layout-mode', `${path}.layoutMode`, 'Render spans require a layout mode.');
    }
    if (typeof span?.presentationMode !== 'string' || !span.presentationMode) {
      pushDiagnostic(diagnostics, 'error', 'render-presentation-mode', `${path}.presentationMode`, 'Render spans require a presentation mode.');
    }
    if (!Array.isArray(span?.crossedWorldIds)) {
      pushDiagnostic(diagnostics, 'error', 'render-crossed-worlds', `${path}.crossedWorldIds`, 'crossedWorldIds must be an array.');
    }

    const semanticKey = [
      Number(story?.focusWU),
      Number(story?.startWU),
      String(span?.fieldIds?.[0] || ''),
    ];
    if (previousSemanticKey) {
      const outOfOrder = semanticKey[0] < previousSemanticKey[0]
        || (semanticKey[0] === previousSemanticKey[0] && semanticKey[1] < previousSemanticKey[1])
        || (semanticKey[0] === previousSemanticKey[0]
          && semanticKey[1] === previousSemanticKey[1]
          && semanticKey[2].localeCompare(previousSemanticKey[2]) < 0);
      if (outOfOrder) {
        pushDiagnostic(diagnostics, 'error', 'render-semantic-order', path, 'Render spans must follow focusWU, startWU, stable ID order.');
      }
    }
    previousSemanticKey = semanticKey;

    const fieldId = span?.fieldIds?.[0];
    const pressureInput = getPressureInput(contentPressure, fieldId, span?.id);
    if (pressureInput) {
      const requiredScrollWU = getRequiredScrollWU(pressureInput);
      if (!finite(requiredScrollWU) || requiredScrollWU < 0) {
        pushDiagnostic(
          diagnostics,
          'error',
          'content-pressure-input',
          `contentPressure.${fieldId || span?.id}`,
          'Content pressure requires a non-negative requiredScrollWU or measuredHeightPx/viewportHeightPx pair.',
          { fieldId, spanId: span?.id, profileId: plan.profileId },
        );
      } else {
        const availableScrollWU = Math.max(0, Number(scroll.endWU) - Number(scroll.startWU));
        const overflowWU = requiredScrollWU - availableScrollWU;
        if (overflowWU > PRESSURE_EPSILON) {
          pushDiagnostic(
            diagnostics,
            'warning',
            'content-pressure',
            `contentPressure.${fieldId || span?.id}`,
            `Text field “${fieldId}” needs ${requiredScrollWU.toFixed(3)} Scroll WU but has ${availableScrollWU.toFixed(3)}.`,
            {
              fieldId,
              spanId: span?.id,
              profileId: plan.profileId,
              requiredScrollWU: cleanWU(requiredScrollWU),
              availableScrollWU: cleanWU(availableScrollWU),
              overflowWU: cleanWU(overflowWU),
            },
          );
        }
      }
    }
  });

  return diagnostics;
}

/**
 * Compiles sectionless Text fields into semantic DOM render spans.
 *
 * Render spans are derived compiler output. One publishable Text field always
 * produces exactly one span, so a World Start can annotate a crossing without
 * splitting or reparenting the field. The supplied resolver is the only owner
 * of Story WU to Scroll WU mapping.
 */
export function compileAboutNarrativeRenderSpans(input, {
  profileId = DEFAULT_PROFILE_ID,
  resolver,
  contentPressure = null,
} = {}) {
  const diagnostics = [];
  const mapStoryToScrollWU = getStoryToScrollMapper(resolver);
  if (!mapStoryToScrollWU) {
    return deepFreeze({
      valid: false,
      profileId,
      spans: [],
      diagnostics: [{
        level: 'error',
        code: 'render-profile-resolver',
        path: 'resolver',
        message: 'Render span compilation requires a Story WU to Scroll WU resolver.',
      }],
    });
  }

  const { textFields, worlds } = getTrackCollections(input);
  if (!Array.isArray(textFields) || !Array.isArray(worlds)) {
    return deepFreeze({
      valid: false,
      profileId,
      spans: [],
      diagnostics: [{
        level: 'error',
        code: 'render-track-input',
        path: 'tracks',
        message: 'Render span compilation requires Text fields and World objects arrays.',
      }],
    });
  }

  const seenFieldIds = new Set();
  const publishableFields = [];
  textFields.forEach((field, fieldIndex) => {
    if (field?.publishable !== true) return;
    const path = `textFields.${fieldIndex}`;
    if (!field.id || typeof field.id !== 'string') {
      pushDiagnostic(diagnostics, 'error', 'render-field-id', `${path}.id`, 'Publishable Text fields require a stable string ID.');
      return;
    }
    if (seenFieldIds.has(field.id)) {
      pushDiagnostic(diagnostics, 'error', 'render-field-id-duplicate', `${path}.id`, `Publishable Text field ID “${field.id}” is duplicated.`);
      return;
    }
    seenFieldIds.add(field.id);
    if (!finite(field.startWU) || !finite(field.focusWU) || !finite(field.endWU)) {
      pushDiagnostic(diagnostics, 'error', 'render-field-timing', path, `Text field “${field.id}” requires finite start, focus, and end WU.`);
      return;
    }
    if (Number(field.startWU) > Number(field.focusWU) || Number(field.focusWU) > Number(field.endWU)) {
      pushDiagnostic(diagnostics, 'error', 'render-field-timing-order', path, `Text field “${field.id}” must be ordered start, focus, end.`);
      return;
    }
    publishableFields.push(field);
  });

  const orderedWorlds = [...worlds]
    .filter((world, worldIndex) => {
      if (world?.id && typeof world.id === 'string' && finite(world.startWU)) return true;
      pushDiagnostic(
        diagnostics,
        'error',
        'render-world-start',
        `worlds.${worldIndex}`,
        'World Start annotations require a stable ID and finite startWU.',
      );
      return false;
    })
    .sort(compareWorldStarts);

  const spans = [...publishableFields]
    .sort(compareSemanticFields)
    .map((field) => {
      const storyBounds = {
        startWU: cleanWU(field.startWU),
        focusWU: cleanWU(field.focusWU),
        endWU: cleanWU(field.endWU),
      };
      const context = { profileId, fieldId: field.id };
      const scrollBounds = {
        startWU: cleanWU(mapStoryToScrollWU(storyBounds.startWU, context)),
        focusWU: cleanWU(mapStoryToScrollWU(storyBounds.focusWU, context)),
        endWU: cleanWU(mapStoryToScrollWU(storyBounds.endWU, context)),
      };
      return {
        id: `render-span-${field.id}`,
        fieldIds: [field.id],
        storyBounds,
        scrollBounds,
        layoutMode: getLayoutMode(field),
        presentationMode: getPresentationMode(field),
        crossedWorldIds: getCrossedWorldIds(
          orderedWorlds,
          storyBounds.startWU,
          storyBounds.endWU,
        ),
      };
    });

  const plan = {
    valid: false,
    profileId: String(profileId || DEFAULT_PROFILE_ID),
    spans,
    diagnostics: [],
  };
  const validationDiagnostics = validateAboutNarrativeRenderSpans(plan, { contentPressure });
  plan.diagnostics = [...diagnostics, ...validationDiagnostics];
  plan.valid = !plan.diagnostics.some((item) => item.level === 'error');
  return deepFreeze(plan);
}
