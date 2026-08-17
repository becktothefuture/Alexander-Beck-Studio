export const ABOUT_NARRATIVE_MOMENT_PHASES = Object.freeze([
  Object.freeze({ id: 'enter', label: 'Enter', field: 'startWU' }),
  Object.freeze({ id: 'focus', label: 'Focus', field: 'focusWU' }),
  Object.freeze({ id: 'exit', label: 'Exit', field: 'endWU' }),
]);

const PHASE_BY_ID = new Map(ABOUT_NARRATIVE_MOMENT_PHASES.map((phase) => [phase.id, phase]));
const TRIGGER_KEYS = new Set([
  'anchorType',
  'momentId',
  'phase',
  'gapId',
  'progress',
  'offsetWU',
]);
const TIME_EPSILON_WU = 0.000001;

const cleanWU = (value) => Number(Number(value).toFixed(6));
const finite = (value) => Number.isFinite(Number(value));

function humanizeId(value) {
  return String(value || '')
    .replace(/^text-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getMomentLabel(field) {
  if (field.kind === 'title' && typeof field.text === 'string' && field.text.trim()) {
    return field.text.trim();
  }
  return field.block?.label
    || humanizeId(field.block?.id)
    || field.label
    || humanizeId(field.id);
}

function getMomentField(document, momentId) {
  return (document?.tracks?.text?.fields || []).find((field) => field.id === momentId) || null;
}

function resolvedMomentTime(document, field, phaseId, profileId = 'base') {
  const phase = PHASE_BY_ID.get(phaseId);
  if (!field || !phase) return null;
  const override = profileId === 'base'
    ? null
    : document?.profiles?.[profileId]?.overrides?.text?.[field.id];
  const value = Number(override?.[phase.field] ?? field[phase.field]);
  return Number.isFinite(value) ? value : null;
}

/** Text fields are the fixed page spine and expose named moments to choreography. */
export function getAboutNarrativeStoryMoments(document, { profileId = 'base' } = {}) {
  return (document?.tracks?.text?.fields || [])
    .filter((field) => field.publishable !== false && field.kind !== 'stub')
    .map((field) => ({
      id: field.id,
      label: getMomentLabel(field),
      kind: field.kind,
      startWU: resolvedMomentTime(document, field, 'enter', profileId),
      focusWU: resolvedMomentTime(document, field, 'focus', profileId),
      endWU: resolvedMomentTime(document, field, 'exit', profileId),
      field,
    }))
    .filter((moment) => [moment.startWU, moment.focusWU, moment.endWU].every(Number.isFinite))
    .sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id));
}

export function getAboutNarrativeMomentAtWU(document, storyWU) {
  const moments = getAboutNarrativeStoryMoments(document);
  if (!moments.length) return null;
  const time = Number(storyWU);
  let active = moments[0];
  moments.forEach((moment) => {
    if (moment.startWU <= time + TIME_EPSILON_WU) active = moment;
  });
  return active;
}

export function resolveAboutNarrativeMomentTriggerWU(document, trigger, {
  profileId = 'base',
  storyLayout = null,
} = {}) {
  if (!trigger || typeof trigger !== 'object') return null;
  if (trigger.anchorType === 'gap' || trigger.gapId) {
    const gap = storyLayout?.gaps?.find((item) => item.id === trigger.gapId);
    if (!gap || !finite(trigger.progress) || !finite(trigger.offsetWU)) return null;
    const progress = Math.min(1, Math.max(0, Number(trigger.progress)));
    return cleanWU(
      Number(gap.startWU)
      + (Number(gap.durationWU) * progress)
      + Number(trigger.offsetWU),
    );
  }
  const field = getMomentField(document, trigger.momentId);
  const anchorWU = resolvedMomentTime(document, field, trigger.phase, profileId);
  if (!Number.isFinite(anchorWU) || !finite(trigger.offsetWU)) return null;
  return cleanWU(anchorWU + Number(trigger.offsetWU));
}

export function createAboutNarrativeMomentTrigger(document, atWU, {
  momentId = null,
  phase = null,
} = {}) {
  const time = Number(atWU);
  if (!Number.isFinite(time)) return null;
  const moments = getAboutNarrativeStoryMoments(document)
    .filter((moment) => !momentId || moment.id === momentId);
  const candidates = moments.flatMap((moment) => ABOUT_NARRATIVE_MOMENT_PHASES
    .filter((candidatePhase) => !phase || candidatePhase.id === phase)
    .map((candidatePhase, phaseIndex) => ({
      moment,
      phase: candidatePhase,
      phaseIndex,
      anchorWU: Number(moment[candidatePhase.field]),
    })))
    .filter((candidate) => Number.isFinite(candidate.anchorWU))
    .sort((left, right) => (
      Math.abs(time - left.anchorWU) - Math.abs(time - right.anchorWU)
      || left.moment.startWU - right.moment.startWU
      || left.phaseIndex - right.phaseIndex
    ));
  const nearest = candidates[0];
  if (!nearest) return null;
  return {
    momentId: nearest.moment.id,
    phase: nearest.phase.id,
    offsetWU: cleanWU(time - nearest.anchorWU),
  };
}

function findById(items, id) {
  return (items || []).find((item) => item.id === id) || null;
}

/**
 * Returns the animation object addressed by an editor selection. Text fields
 * are moments, not bound animation targets, so they intentionally return null.
 */
export function getAboutNarrativeMomentTarget(document, selection) {
  if (!selection?.id) return null;
  if (selection.type === 'camera-key') {
    return { type: selection.type, object: findById(document?.tracks?.camera?.moveKeys, selection.id) };
  }
  if (selection.type === 'camera-orientation-key') {
    return { type: selection.type, object: findById(document?.tracks?.camera?.lookKeys, selection.id) };
  }
  if (selection.type === 'camera-lens-key') {
    return { type: selection.type, object: findById(document?.tracks?.camera?.lensKeys, selection.id) };
  }
  if (selection.type === 'visibility-key') {
    return { type: selection.type, object: findById(document?.tracks?.visibility?.keys, selection.id) };
  }
  if (selection.type === 'point-field-key') {
    return { type: selection.type, object: findById(document?.tracks?.pointField?.keys, selection.id) };
  }
  if (selection.type === 'interaction') {
    return { type: selection.type, object: findById(document?.tracks?.interactions?.clips, selection.id) };
  }
  if (selection.type === 'camera-orbit') {
    const orbit = document?.tracks?.camera?.orbit;
    return { type: selection.type, object: orbit?.id === selection.id ? orbit : null };
  }
  return null;
}

function targetTime(target, bindingKey = 'trigger') {
  if (!target?.object) return null;
  if (target.type === 'interaction') {
    return Number(bindingKey === 'endTrigger' ? target.object.endWU : target.object.activationWU);
  }
  if (target.type === 'camera-orbit') {
    return Number(bindingKey === 'endTrigger' ? target.object.endWU : target.object.startWU);
  }
  return Number(target.object.atWU);
}

function applyResolvedTrigger(target, bindingKey, nextWU) {
  if (!target?.object || !Number.isFinite(nextWU)) return;
  const object = target.object;
  if (target.type === 'interaction') {
    if (bindingKey === 'endTrigger') {
      object.endWU = cleanWU(nextWU);
      return;
    }
    const leadWU = Number(object.activationWU) - Number(object.startWU);
    object.activationWU = cleanWU(nextWU);
    object.startWU = cleanWU(nextWU - leadWU);
    return;
  }
  if (target.type === 'camera-orbit') {
    object[bindingKey === 'endTrigger' ? 'endWU' : 'startWU'] = cleanWU(nextWU);
    return;
  }
  object.atWU = cleanWU(nextWU);
}

export function setAboutNarrativeMomentTrigger(document, selection, trigger, {
  bindingKey = 'trigger',
  storyLayout = null,
} = {}) {
  const target = getAboutNarrativeMomentTarget(document, selection);
  if (!target?.object || !['trigger', 'endTrigger'].includes(bindingKey)) return false;
  const gapAnchor = trigger?.anchorType === 'gap' || trigger?.gapId;
  const nextTrigger = gapAnchor ? {
    anchorType: 'gap',
    gapId: String(trigger?.gapId || ''),
    progress: cleanWU(trigger?.progress || 0),
    offsetWU: cleanWU(trigger?.offsetWU || 0),
  } : {
    momentId: String(trigger?.momentId || ''),
    phase: String(trigger?.phase || ''),
    offsetWU: cleanWU(trigger?.offsetWU || 0),
  };
  const nextWU = resolveAboutNarrativeMomentTriggerWU(document, nextTrigger, { storyLayout });
  if (!Number.isFinite(nextWU)) return false;
  target.object[bindingKey] = nextTrigger;
  applyResolvedTrigger(target, bindingKey, nextWU);
  return true;
}

export function refreshAboutNarrativeMomentTriggers(document, selection) {
  const target = getAboutNarrativeMomentTarget(document, selection);
  if (!target?.object) return false;
  const trigger = createAboutNarrativeMomentTrigger(document, targetTime(target, 'trigger'));
  if (!trigger) return false;
  target.object.trigger = trigger;
  if (target.type === 'interaction' || target.type === 'camera-orbit') {
    const endTrigger = createAboutNarrativeMomentTrigger(document, targetTime(target, 'endTrigger'));
    if (!endTrigger) return false;
    target.object.endTrigger = endTrigger;
  }
  return true;
}

export function getAboutNarrativeMomentTargets(document) {
  const targets = [];
  const push = (type, objects) => (objects || []).forEach((object) => {
    targets.push({ type, id: object.id, object });
  });
  push('camera-key', document?.tracks?.camera?.moveKeys);
  push('camera-orientation-key', document?.tracks?.camera?.lookKeys);
  push('camera-lens-key', document?.tracks?.camera?.lensKeys);
  push('visibility-key', document?.tracks?.visibility?.keys);
  push('point-field-key', document?.tracks?.pointField?.keys);
  push('interaction', document?.tracks?.interactions?.clips);
  if (document?.tracks?.camera?.orbit) {
    targets.push({
      type: 'camera-orbit',
      id: document.tracks.camera.orbit.id,
      object: document.tracks.camera.orbit,
    });
  }
  return targets;
}

/** Converts legacy absolute animation times into explicit moment bindings. */
export function attachAboutNarrativeMomentTriggers(document) {
  getAboutNarrativeMomentTargets(document).forEach((entry) => {
    refreshAboutNarrativeMomentTriggers(document, { type: entry.type, id: entry.id });
  });
  return document;
}

/**
 * Re-resolves cached animation times from the fixed Text spine. The binding is
 * authoritative; absolute WU values only keep the renderer's hot path simple.
 */
export function synchronizeAboutNarrativeMomentTriggers(document, { storyLayout = null } = {}) {
  getAboutNarrativeMomentTargets(document).forEach((entry) => {
    const target = { type: entry.type, object: entry.object };
    const triggerWU = resolveAboutNarrativeMomentTriggerWU(
      document,
      entry.object.trigger,
      { storyLayout },
    );
    if (Number.isFinite(triggerWU)) applyResolvedTrigger(target, 'trigger', triggerWU);
    if (entry.type === 'interaction' || entry.type === 'camera-orbit') {
      const endWU = resolveAboutNarrativeMomentTriggerWU(
        document,
        entry.object.endTrigger,
        { storyLayout },
      );
      if (Number.isFinite(endWU)) applyResolvedTrigger(target, 'endTrigger', endWU);
    }
  });
  return document;
}

export function validateAboutNarrativeMomentTriggers(document) {
  const diagnostics = [];
  const momentIds = new Set(getAboutNarrativeStoryMoments(document).map((moment) => moment.id));
  const validateTrigger = (entry, bindingKey, actualWU) => {
    const trigger = entry.object?.[bindingKey];
    const path = entry.type === 'camera-orbit'
      ? `tracks.camera.orbit.${bindingKey}`
      : `${entry.type}:${entry.id}.${bindingKey}`;
    if (!trigger || typeof trigger !== 'object') {
      diagnostics.push({ level: 'error', code: 'moment-trigger-required', path, message: 'Every animation trigger must belong to a Text moment or Story gap.' });
      return;
    }
    Object.keys(trigger).forEach((key) => {
      if (TRIGGER_KEYS.has(key)) return;
      diagnostics.push({
        level: 'error',
        code: 'moment-trigger-unknown-key',
        path: `${path}.${key}`,
        message: `Unknown moment trigger field “${key}”.`,
      });
    });
    const gapAnchor = trigger.anchorType === 'gap' || trigger.gapId;
    if (gapAnchor) {
      if (trigger.anchorType !== 'gap') {
        diagnostics.push({ level: 'error', code: 'moment-trigger-anchor-type', path: `${path}.anchorType`, message: 'Story gap triggers require anchorType “gap”.' });
      }
      if (typeof trigger.gapId !== 'string' || !trigger.gapId.startsWith('gap-')) {
        diagnostics.push({ level: 'error', code: 'moment-trigger-gap', path: `${path}.gapId`, message: 'Story gap trigger requires a semantic gap ID.' });
      }
      if (!finite(trigger.progress) || Number(trigger.progress) < 0 || Number(trigger.progress) > 1) {
        diagnostics.push({ level: 'error', code: 'moment-trigger-gap-progress', path: `${path}.progress`, message: 'Story gap progress must stay between 0 and 1.' });
      }
    } else {
      if (!momentIds.has(trigger.momentId)) {
        diagnostics.push({ level: 'error', code: 'moment-trigger-target', path: `${path}.momentId`, message: `Unknown Text moment “${trigger.momentId}”.` });
      }
      if (!PHASE_BY_ID.has(trigger.phase)) {
        diagnostics.push({ level: 'error', code: 'moment-trigger-phase', path: `${path}.phase`, message: 'Moment trigger phase must be enter, focus, or exit.' });
      }
    }
    if (!finite(trigger.offsetWU)) {
      diagnostics.push({ level: 'error', code: 'moment-trigger-offset', path: `${path}.offsetWU`, message: 'Moment trigger offset must be finite.' });
    }
    // Gap anchors are profile-derived and are checked when Story Layout is
    // compiled. Text anchors can still be drift-checked in the source model.
    const resolvedWU = gapAnchor
      ? null
      : resolveAboutNarrativeMomentTriggerWU(document, trigger);
    if (Number.isFinite(resolvedWU)
      && Math.abs(Number(actualWU) - resolvedWU) > TIME_EPSILON_WU) {
      diagnostics.push({ level: 'error', code: 'moment-trigger-drift', path, message: 'Animation timing has drifted away from its Text moment binding.' });
    }
  };

  getAboutNarrativeMomentTargets(document).forEach((entry) => {
    const target = { type: entry.type, object: entry.object };
    validateTrigger(entry, 'trigger', targetTime(target, 'trigger'));
    if (entry.type === 'interaction' || entry.type === 'camera-orbit') {
      validateTrigger(entry, 'endTrigger', targetTime(target, 'endTrigger'));
    }
  });

  // Responsive layout may change geometry, never the reading rhythm. Timing
  // overrides would detach animation from the shared Text moments.
  ['desktop', 'tablet', 'mobile'].forEach((profileId) => {
    const overrides = document?.profiles?.[profileId]?.overrides || {};
    const timingPaths = [];
    Object.entries(overrides.camera || {}).forEach(([id, value]) => {
      if (finite(value?.atWU)) timingPaths.push(`profiles.${profileId}.overrides.camera.${id}.atWU`);
    });
    Object.entries(overrides.visibility || {}).forEach(([id, value]) => {
      if (finite(value?.atWU)) timingPaths.push(`profiles.${profileId}.overrides.visibility.${id}.atWU`);
    });
    Object.entries(overrides.pointField?.keys || {}).forEach(([id, value]) => {
      if (finite(value?.atWU)) timingPaths.push(`profiles.${profileId}.overrides.pointField.keys.${id}.atWU`);
    });
    Object.entries(overrides.text || {}).forEach(([id, value]) => {
      ['startWU', 'focusWU', 'endWU'].forEach((field) => {
        if (finite(value?.[field])) timingPaths.push(`profiles.${profileId}.overrides.text.${id}.${field}`);
      });
    });
    Object.entries(overrides.interactions || {}).forEach(([id, value]) => {
      ['startWU', 'activationWU', 'endWU'].forEach((field) => {
        if (finite(value?.[field])) timingPaths.push(`profiles.${profileId}.overrides.interactions.${id}.${field}`);
      });
    });
    timingPaths.forEach((path) => diagnostics.push({
      level: 'error',
      code: 'moment-profile-timing',
      path,
      message: 'Responsive profiles inherit timing from the shared Text moments; only geometry may vary by profile.',
    }));
  });
  return diagnostics;
}
