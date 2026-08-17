const TIME_EPSILON_WU = 0.000001;

const cleanWU = (value) => Number(Number(value).toFixed(6));

function orderedKeys(pointField) {
  return [...(pointField?.keys || [])]
    .map((key, sourceOrder) => ({ key, sourceOrder }))
    .sort((left, right) => (
      Number(left.key.atWU) - Number(right.key.atWU)
      || left.sourceOrder - right.sourceOrder
    ))
    .map((entry) => entry.key);
}

/**
 * Forms own one contiguous story interval at a time. During a morph the
 * destination Form owns the interval, because it is the state the point field
 * is becoming. This gives Effects one deterministic owner without changing
 * the visual interpolation between source and destination geometry.
 */
export function getAboutNarrativeFormSequence(pointField, durationWU) {
  const keys = orderedKeys(pointField);
  const storyEndWU = Math.max(0, Number(durationWU) || 0);
  if (!keys.length) return [];

  const sequence = [];
  const append = (stateId, startWU, endWU, fromKeyId, toKeyId) => {
    const start = cleanWU(startWU);
    const end = cleanWU(endWU);
    if (!stateId || end < start - TIME_EPSILON_WU) return;
    const previous = sequence.at(-1);
    if (previous?.stateId === stateId
      && Math.abs(previous.endWU - start) <= TIME_EPSILON_WU) {
      previous.endWU = end;
      previous.toKeyId = toKeyId;
      return;
    }
    sequence.push({ stateId, startWU: start, endWU: end, fromKeyId, toKeyId });
  };

  for (let index = 0; index < keys.length - 1; index += 1) {
    const from = keys[index];
    const to = keys[index + 1];
    // The destination Form owns both morph and hold spans. This matches the
    // renderer's active `world.to` state and keeps authoring/runtime in sync.
    append(to.stateId, from.atWU, to.atWU, from.id, to.id);
  }

  const finalKey = keys.at(-1);
  if (Number(finalKey.atWU) <= storyEndWU + TIME_EPSILON_WU) {
    append(finalKey.stateId, finalKey.atWU, storyEndWU, finalKey.id, finalKey.id);
  }
  return sequence;
}

export function getAboutNarrativeFormOwnershipRanges(pointField, durationWU, stateId) {
  return getAboutNarrativeFormSequence(pointField, durationWU)
    .filter((range) => range.stateId === stateId);
}

/**
 * Boundary times belong to the Form that starts at that boundary. This makes
 * one Effect end exactly when the next Form Effect begins, with no overlap.
 */
export function getAboutNarrativeFormOwnershipRangeAt(
  pointField,
  durationWU,
  stateId,
  storyWU,
) {
  const time = Number(storyWU);
  const storyEndWU = Number(durationWU);
  return getAboutNarrativeFormOwnershipRanges(pointField, durationWU, stateId)
    .find((range) => (
      time >= range.startWU - TIME_EPSILON_WU
      && (
        time < range.endWU - TIME_EPSILON_WU
        || (Math.abs(time - range.endWU) <= TIME_EPSILON_WU
          && Math.abs(range.endWU - storyEndWU) <= TIME_EPSILON_WU)
      )
    )) || null;
}

export function isAboutNarrativeEffectInsideFormRange(clip, range) {
  if (!clip || !range) return false;
  return Number(clip.startWU) >= range.startWU - TIME_EPSILON_WU
    && Number(clip.activationWU) >= range.startWU - TIME_EPSILON_WU
    && Number(clip.endWU) <= range.endWU + TIME_EPSILON_WU;
}

/**
 * Effects are a single storytelling lane, not a layer stack. Return every
 * real temporal collision so the editor and document validator can enforce
 * the same one-at-a-time sequence. Touching boundaries are intentionally
 * valid: one effect may release exactly as the next effect starts.
 */
export function getAboutNarrativeEffectSequenceOverlaps(clips) {
  const ordered = [...(clips || [])]
    .filter((clip) => Number.isFinite(Number(clip?.startWU))
      && Number.isFinite(Number(clip?.endWU)))
    .sort((left, right) => (
      Number(left.startWU) - Number(right.startWU)
      || Number(left.endWU) - Number(right.endWU)
      || String(left.id).localeCompare(String(right.id))
    ));
  const overlaps = [];
  for (let leftIndex = 0; leftIndex < ordered.length; leftIndex += 1) {
    const left = ordered[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < ordered.length; rightIndex += 1) {
      const right = ordered[rightIndex];
      if (Number(right.startWU) >= Number(left.endWU) - TIME_EPSILON_WU) break;
      overlaps.push({ left, right });
    }
  }
  return overlaps;
}

function rangeContains(range, storyWU) {
  const time = Number(storyWU);
  return time >= Number(range.startWU) - TIME_EPSILON_WU
    && time <= Number(range.endWU) + TIME_EPSILON_WU;
}

function mapTimeBetweenRanges(time, before, after) {
  const beforeDuration = Number(before.endWU) - Number(before.startWU);
  if (beforeDuration <= TIME_EPSILON_WU) return cleanWU(after.startWU);
  const progress = Math.min(1, Math.max(
    0,
    (Number(time) - Number(before.startWU)) / beforeDuration,
  ));
  return cleanWU(
    Number(after.startWU)
      + (progress * (Number(after.endWU) - Number(after.startWU))),
  );
}

/**
 * Keeps Effects attached when a Form boundary or Form identity is edited.
 * Each Effect retains its proportional position inside the owning interval,
 * so Form editing cannot create overlaps or leave animation on a stale Form.
 */
export function reconcileAboutNarrativeEffectsWithFormSequence(
  clips,
  beforePointField,
  afterPointField,
  durationWU,
) {
  const beforeRanges = getAboutNarrativeFormSequence(beforePointField, durationWU);
  const afterRanges = getAboutNarrativeFormSequence(afterPointField, durationWU);
  const changedIds = [];

  (clips || []).forEach((clip) => {
    const before = beforeRanges.find((range) => (
      range.stateId === clip.targetStateId && rangeContains(range, clip.activationWU)
    ));
    if (!before) return;

    const sameState = afterRanges.filter((range) => range.stateId === before.stateId);
    const after = sameState.find((range) => rangeContains(range, clip.activationWU))
      // Changing a key's Form identity intentionally transfers Effects in that
      // interval to the newly selected Form before considering a later interval
      // that happens to reuse the old Form.
      || afterRanges.find((range) => (
        rangeContains(range, clip.activationWU)
        && (range.fromKeyId === before.fromKeyId || range.toKeyId === before.toKeyId)
      ))
      || sameState.find((range) => (
        range.fromKeyId === before.fromKeyId || range.toKeyId === before.toKeyId
      ));
    if (!after) return;

    clip.startWU = mapTimeBetweenRanges(clip.startWU, before, after);
    clip.activationWU = mapTimeBetweenRanges(clip.activationWU, before, after);
    clip.endWU = mapTimeBetweenRanges(clip.endWU, before, after);
    clip.targetStateId = after.stateId;
    changedIds.push(clip.id);
  });

  return changedIds;
}
