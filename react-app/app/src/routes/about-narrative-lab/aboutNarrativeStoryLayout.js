import {
  synchronizeAboutNarrativeMomentTriggers,
} from './aboutNarrativeMoments.js';
import {
  getAboutNarrativeCameraRotationFromQuaternion,
  writeAboutNarrativeCameraLookAtQuaternion,
} from './aboutNarrativeCameraRig.js';
import {
  compileAboutNarrativeLongRideTrack,
  sampleAboutNarrativeLongRidePositionInto,
} from './aboutNarrativeLongRideTrack.js';
import { ABOUT_NARRATIVE_CAREER_SEQUENCE_KIND } from './aboutNarrativeTrackSchema.js';

const FLOW_EPSILON = 0.000001;
const DEFAULT_PROFILE_ID = 'desktop';

export const ABOUT_NARRATIVE_STORY_GAP_PRESETS = Object.freeze({
  none: Object.freeze({ desktop: 0, tablet: 0, mobile: 0 }),
  tight: Object.freeze({ desktop: 0.12, tablet: 0.11, mobile: 0.1 }),
  standard: Object.freeze({ desktop: 0.32, tablet: 0.28, mobile: 0.22 }),
  chapter: Object.freeze({ desktop: 0.58, tablet: 0.5, mobile: 0.4 }),
  finale: Object.freeze({ desktop: 1.05, tablet: 0.92, mobile: 0.78 }),
  // Includes the complete physical passage plus the reading lead/tail. The
  // same authored gap works with the fitted rail at narrow and zoomed layouts.
  passage: Object.freeze({ desktop: 3.8, tablet: 3.8, mobile: 3.8 }),
  arrival: Object.freeze({ desktop: 0.8, tablet: 0.8, mobile: 0.8 }),
});

export const ABOUT_NARRATIVE_STORY_FOCUS_MODES = Object.freeze([
  'middle',
  'reading-start',
]);

const PROFILE_ESTIMATES = Object.freeze({
  desktop: Object.freeze({
    charactersPerScreen: 1_750,
    disciplineItemScreens: 0.22,
    careerHeadingScreens: 0.12,
    careerItemScreens: 0.14,
    careerIndependentWorkScreens: 0.1,
    editorialLeadScreens: 0.82,
    editorialTailScreens: 0.24,
    titleContentPaddingScreens: 0.2,
  }),
  tablet: Object.freeze({
    charactersPerScreen: 1_350,
    disciplineItemScreens: 0.25,
    careerHeadingScreens: 0.13,
    careerItemScreens: 0.16,
    careerIndependentWorkScreens: 0.12,
    editorialLeadScreens: 0.76,
    editorialTailScreens: 0.22,
    titleContentPaddingScreens: 0.22,
  }),
  mobile: Object.freeze({
    charactersPerScreen: 840,
    disciplineItemScreens: 0.3,
    careerHeadingScreens: 0.15,
    careerItemScreens: 0.2,
    careerIndependentWorkScreens: 0.15,
    editorialLeadScreens: 0.68,
    editorialTailScreens: 0.2,
    titleContentPaddingScreens: 0.26,
  }),
});

const cleanWU = (value) => Number(Number(value).toFixed(6));
const finite = (value) => Number.isFinite(Number(value));
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const clone = (value) => (value === undefined ? undefined : structuredClone(value));

function getMeasurement(measurements, fieldId) {
  if (!measurements) return null;
  if (measurements instanceof Map) return measurements.get(fieldId) || null;
  return measurements[fieldId] || null;
}

function textLength(value) {
  if (typeof value === 'string') return value.trim().length;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + textLength(item), 0);
  if (!value || typeof value !== 'object') return 0;
  return Object.entries(value).reduce((sum, [key, child]) => (
    ['src', 'poster', 'alt', 'id', 'type', 'kind'].includes(key)
      ? sum
      : sum + textLength(child)
  ), 0);
}

function mediaFootprintScreens(field, profile) {
  const block = field?.block;
  if (!block || typeof block !== 'object') return 0;
  if (block.kind === 'disciplines') {
    return (block.items?.length || 0) * profile.disciplineItemScreens;
  }
  return (block.modules || []).reduce((screens, module) => {
    if (module.kind === 'logo-grid') return screens + 0.95;
    if (module.kind === 'media-deck' || module.kind === 'interactive-stack') return screens + 1.1;
    if (module.kind === 'list') return screens + 0.18;
    if (module.kind === ABOUT_NARRATIVE_CAREER_SEQUENCE_KIND) {
      return screens
        + profile.careerHeadingScreens
        + ((module.items?.length || 0) * profile.careerItemScreens)
        + (module.independentWork ? profile.careerIndependentWorkScreens : 0);
    }
    return screens;
  }, 0);
}

function estimateNaturalScreens(field, profile) {
  const characterScreens = textLength(field.kind === 'title' ? field.text : field.block)
    / profile.charactersPerScreen;
  return Math.max(0.04, characterScreens + mediaFootprintScreens(field, profile));
}

function measuredNaturalScreens(measurement) {
  const measuredHeightPx = Number(
    measurement?.contentHeightPx
    ?? measurement?.measuredHeightPx,
  );
  const viewportHeightPx = Number(measurement?.viewportHeightPx);
  if (!(measuredHeightPx >= 0) || !(viewportHeightPx > 0)) return null;
  return measuredHeightPx / viewportHeightPx;
}

function getFlow(field) {
  const flow = field?.flow;
  if (!flow || typeof flow !== 'object') return null;
  return {
    minScreens: clamp(Number(flow.minScreens) || 0.6, 0.2, 12),
    gapAfter: ABOUT_NARRATIVE_STORY_GAP_PRESETS[flow.gapAfter]
      ? flow.gapAfter
      : 'tight',
    focusMode: ABOUT_NARRATIVE_STORY_FOCUS_MODES.includes(flow.focusMode)
      ? flow.focusMode
      : field.kind === 'scroll-block' ? 'reading-start' : 'middle',
    focusOffsetScreens: finite(flow.focusOffsetScreens)
      ? clamp(Number(flow.focusOffsetScreens), 0, 6)
      : null,
  };
}

function getSectionDurationWU(
  field,
  flow,
  naturalScreens,
  profile,
  editorialLeadScreens,
) {
  const paddingScreens = field.kind === 'scroll-block'
    ? editorialLeadScreens + profile.editorialTailScreens
    : profile.titleContentPaddingScreens;
  return cleanWU(Math.max(flow.minScreens, naturalScreens + paddingScreens));
}

function getFocusWU(field, flow, startWU, durationWU) {
  if (flow.focusOffsetScreens != null) {
    return cleanWU(startWU + Math.min(durationWU, flow.focusOffsetScreens));
  }
  if (flow.focusMode === 'reading-start' || field.kind === 'scroll-block') {
    return cleanWU(startWU + Math.min(durationWU * 0.4, 0.58));
  }
  return cleanWU(startWU + (durationWU * 0.5));
}

function compileLegacyLayout(fields, profileId) {
  const ordered = [...fields]
    .sort((left, right) => Number(left.startWU) - Number(right.startWU)
      || String(left.id).localeCompare(String(right.id)));
  const compiledFields = ordered.map((field) => ({
    id: field.id,
    kind: field.kind,
    startWU: cleanWU(field.startWU),
    focusWU: cleanWU(field.focusWU),
    endWU: cleanWU(field.endWU),
    durationWU: cleanWU(Number(field.endWU) - Number(field.startWU)),
    naturalScreens: null,
    minScreens: null,
    gapAfter: null,
    measured: false,
  }));
  const gaps = compiledFields.slice(0, -1).map((field, index) => {
    const next = compiledFields[index + 1];
    return {
      id: `gap-${field.id}-to-${next.id}`,
      fromFieldId: field.id,
      toFieldId: next.id,
      preset: 'legacy',
      startWU: field.endWU,
      endWU: next.startWU,
      durationWU: cleanWU(Math.max(0, next.startWU - field.endWU)),
    };
  });
  const durationWU = compiledFields.at(-1)?.endWU || 0;
  return Object.freeze({
    mode: 'legacy',
    profileId,
    valid: true,
    diagnostics: Object.freeze([]),
    fields: Object.freeze(compiledFields.map(Object.freeze)),
    gaps: Object.freeze(gaps.map(Object.freeze)),
    durationWU,
    contentExtentWU: cleanWU(durationWU + 1),
    signature: `legacy:${profileId}:${durationWU}`,
  });
}

/**
 * Compile the authored Story Stack into the only timing rail the renderer sees.
 *
 * Text owns order and page length. A measured content height may make a block
 * longer or shorter, while the small named gap presets provide intentional
 * breathing room. No camera, Form, or Effect is allowed to create page length.
 */
export function compileAboutNarrativeStoryLayout(document, {
  profileId = DEFAULT_PROFILE_ID,
  measurements = null,
} = {}) {
  const profile = PROFILE_ESTIMATES[profileId] || PROFILE_ESTIMATES.desktop;
  const authoredEditorialLead = Number(document?.globals?.editorialRevealThreshold);
  const editorialLeadScreens = Number.isFinite(authoredEditorialLead)
    ? clamp(authoredEditorialLead, 0, 4)
    : profile.editorialLeadScreens;
  const fields = (document?.tracks?.text?.fields || [])
    .filter((field) => field.publishable !== false && field.kind !== 'stub');
  const flowFields = fields.filter((field) => field.flow && typeof field.flow === 'object');
  if (!flowFields.length) return compileLegacyLayout(fields, profileId);

  const diagnostics = [];
  if (flowFields.length !== fields.length) {
    fields.filter((field) => !field.flow).forEach((field) => diagnostics.push({
      level: 'error',
      code: 'story-flow-required',
      path: `tracks.text.fields.${field.id}.flow`,
      message: `Text block “${field.id}” requires Story Stack flow settings.`,
    }));
  }

  let cursorWU = 0;
  const compiledFields = [];
  const gaps = [];
  fields.forEach((field, index) => {
    const flow = getFlow(field) || {
      minScreens: 0.6,
      gapAfter: 'tight',
      focusMode: field.kind === 'scroll-block' ? 'reading-start' : 'middle',
      focusOffsetScreens: null,
    };
    const measurement = getMeasurement(measurements, field.id);
    const measuredScreens = measuredNaturalScreens(measurement);
    const naturalScreens = measuredScreens ?? estimateNaturalScreens(field, profile);
    const durationWU = getSectionDurationWU(
      field,
      flow,
      naturalScreens,
      profile,
      editorialLeadScreens,
    );
    const startWU = cleanWU(cursorWU);
    const focusWU = getFocusWU(field, flow, startWU, durationWU);
    const endWU = cleanWU(startWU + durationWU);
    compiledFields.push({
      id: field.id,
      kind: field.kind,
      startWU,
      focusWU,
      endWU,
      durationWU,
      naturalScreens: cleanWU(naturalScreens),
      minScreens: flow.minScreens,
      gapAfter: flow.gapAfter,
      measured: measuredScreens != null,
    });

    const next = fields[index + 1];
    if (!next) {
      cursorWU = endWU;
      return;
    }
    const gapDurationWU = Number(
      ABOUT_NARRATIVE_STORY_GAP_PRESETS[flow.gapAfter]?.[profileId]
      ?? ABOUT_NARRATIVE_STORY_GAP_PRESETS.tight[profileId]
      ?? 0.1,
    );
    const gap = {
      id: `gap-${field.id}-to-${next.id}`,
      fromFieldId: field.id,
      toFieldId: next.id,
      preset: flow.gapAfter,
      startWU: endWU,
      endWU: cleanWU(endWU + gapDurationWU),
      durationWU: cleanWU(gapDurationWU),
    };
    gaps.push(gap);
    cursorWU = gap.endWU;
  });

  const durationWU = cleanWU(compiledFields.at(-1)?.endWU || 0);
  const signature = JSON.stringify({
    profileId,
    fields: compiledFields.map((field) => [field.id, field.startWU, field.focusWU, field.endWU]),
    gaps: gaps.map((gap) => [gap.id, gap.preset, gap.durationWU]),
  });
  return Object.freeze({
    mode: 'content-flow',
    profileId,
    valid: !diagnostics.some((item) => item.level === 'error'),
    diagnostics: Object.freeze(diagnostics.map(Object.freeze)),
    fields: Object.freeze(compiledFields.map(Object.freeze)),
    gaps: Object.freeze(gaps.map(Object.freeze)),
    durationWU,
    contentExtentWU: cleanWU(durationWU + 1),
    editorialLeadWU: cleanWU(editorialLeadScreens),
    editorialTailWU: cleanWU(profile.editorialTailScreens),
    signature,
  });
}

/**
 * Materialize derived values for the existing hot-path renderer. The returned
 * document is runtime-only: persisted Story Stack content remains authoritative.
 */
export function materializeAboutNarrativeStoryLayout(document, layout) {
  if (!layout?.valid || layout.mode !== 'content-flow') return clone(document);
  const output = clone(document);
  const timingById = new Map(layout.fields.map((field) => [field.id, field]));
  output.tracks.text.fields.forEach((field) => {
    const timing = timingById.get(field.id);
    if (!timing) return;
    field.startWU = timing.startWU;
    field.focusWU = timing.focusWU;
    field.endWU = timing.endWU;
  });
  Object.entries(output.profiles || {}).forEach(([profileId, profile]) => {
    if (profileId === 'reduced-motion' || !profile) return;
    profile.storyDurationWU = layout.durationWU;
    profile.scrollDurationWU = layout.durationWU;
  });
  synchronizeAboutNarrativeMomentTriggers(output, { storyLayout: layout });

  // A semantic trigger should keep every derived object inside the new page.
  // Clamp only numerical caches; the trigger remains the persisted authority.
  const clampTime = (target, key) => {
    if (!finite(target?.[key])) return;
    target[key] = cleanWU(clamp(Number(target[key]), 0, layout.durationWU));
  };
  ['moveKeys', 'lookKeys', 'lensKeys'].forEach((lane) => {
    (output.tracks.camera?.[lane] || []).forEach((key) => clampTime(key, 'atWU'));
  });
  (output.tracks.visibility?.keys || []).forEach((key) => clampTime(key, 'atWU'));
  (output.tracks.pointField?.keys || []).forEach((key) => clampTime(key, 'atWU'));
  // Rail anchors are spatial waypoints expressed in WU. Shorter copy must not
  // leave a world beyond the end of its own story rail, so only the runtime
  // projection is fitted to the derived content length.
  const pointFieldStates = output.tracks.pointField?.stateDefinitions || [];
  pointFieldStates.forEach((state) => {
    clampTime(state, 'railAnchorWU');
    if (state.shapeId === 'long-assembly-corridor-v1') {
      // The permanent ride uses Story Stack duration as physical track length.
      // Copy edits therefore move every landmark and the final terminal together
      // without changing their order or introducing another timing authority.
      state.shapeParameters = {
        ...(state.shapeParameters || {}),
        storyDurationWU: layout.durationWU,
        backgroundAnchorWU: timingById.get('text-background-unit')?.startWU ?? 3.6,
        intersectionAnchorWU: timingById.get('text-complexity-listen')?.startWU ?? 8.05,
        disciplinesAnchorWU: timingById.get('text-disciplines-title')?.startWU ?? 11.5,
        cityAnchorWU: timingById.get('text-life-character')?.startWU ?? 16.1,
        finaleAnchorWU: timingById.get('text-epilogue-invitation')?.startWU ?? 20.1,
      };
    }
  });
  const longRideState = pointFieldStates.find(
    (state) => state.shapeId === 'long-assembly-corridor-v1',
  );
  if (longRideState) {
    // The same compiled track places the permanent world and every camera
    // waypoint. Shorter copy removes local distance; longer copy extends it.
    const ride = compileAboutNarrativeLongRideTrack(longRideState.shapeParameters);
    (output.tracks.camera?.moveKeys || []).forEach((key) => {
      if (!Array.isArray(key.position) || key.position.length < 3) return;
      sampleAboutNarrativeLongRidePositionInto(ride, Number(key.atWU), key.position);
      key.position = key.position.map(cleanWU);
    });
    (output.tracks.camera?.lookKeys || []).forEach((key) => {
      if (!Array.isArray(key.rotation) || key.rotation.length < 3) return;
      const position = sampleAboutNarrativeLongRidePositionInto(
        ride,
        Number(key.atWU),
        [0, 0, 0],
      );
      const target = sampleAboutNarrativeLongRidePositionInto(
        ride,
        Math.min(
          ride.tailEndWU,
          Number(key.atWU) + ride.lookAheadWU,
        ),
        [0, 0, 0],
      );
      const quaternion = writeAboutNarrativeCameraLookAtQuaternion(
        [0, 0, 0, 1],
        position,
        target,
        0,
      );
      key.rotation = getAboutNarrativeCameraRotationFromQuaternion(quaternion).map(cleanWU);
    });
  }
  (output.tracks.interactions?.clips || []).forEach((clip) => {
    clampTime(clip, 'startWU');
    clampTime(clip, 'activationWU');
    clampTime(clip, 'endWU');
    if (Number(clip.startWU) > Number(clip.activationWU)) clip.startWU = clip.activationWU;
    if (Number(clip.activationWU) > Number(clip.endWU)) clip.endWU = clip.activationWU;
  });
  clampTime(output.tracks.camera?.orbit, 'startWU');
  clampTime(output.tracks.camera?.orbit, 'endWU');
  const orbit = output.tracks.camera?.orbit;
  const ripple = (output.tracks.interactions?.clips || []).find(
    (clip) => clip.id === 'interaction-grid-ripple',
  );
  if (orbit && ripple?.parameters) {
    // The unified wave envelope begins its release exactly where the orbit
    // takes ownership, even when the semantic finale gap changes length.
    ripple.parameters.releaseWU = cleanWU(Math.max(
      0,
      Number(ripple.endWU) - Number(orbit.startWU),
    ));
  }
  return output;
}

export function getAboutNarrativeStoryGap(layout, gapId) {
  return layout?.gaps?.find((gap) => gap.id === gapId) || null;
}

export function getAboutNarrativeStoryField(layout, fieldId) {
  return layout?.fields?.find((field) => field.id === fieldId) || null;
}

export function isAboutNarrativeContentFlow(document) {
  const fields = document?.tracks?.text?.fields || [];
  return fields.some((field) => field?.flow && typeof field.flow === 'object');
}

export function storyLayoutChanged(previous, next) {
  return String(previous?.signature || '') !== String(next?.signature || '')
    || Math.abs(Number(previous?.durationWU || 0) - Number(next?.durationWU || 0)) > FLOW_EPSILON;
}
