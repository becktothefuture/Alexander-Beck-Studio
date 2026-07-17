export const ABOUT_NARRATIVE_TIMELINE_STEP = 0.005;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function cleanTimelineValue(value) {
  return Number(Number(value).toFixed(6));
}

function getSectionAtStoryWU(plan, storyWU) {
  if (!plan?.sections?.length) return { section: null, sectionIndex: -1 };
  const clampedStoryWU = clamp(Number(storyWU) || 0, 0, Number(plan.maxStoryWU || 0));
  let sectionIndex = plan.sections.findIndex((section, index) => {
    const nextStartWU = plan.sections[index + 1]?.startWU ?? Number.POSITIVE_INFINITY;
    return clampedStoryWU >= section.startWU && clampedStoryWU < nextStartWU;
  });
  if (sectionIndex < 0) sectionIndex = plan.sections.length - 1;
  return { section: plan.sections[sectionIndex], sectionIndex, storyWU: clampedStoryWU };
}

function cueMemberKey(member) {
  return `${member.sectionId}:${member.cueId}`;
}

function normalizeCueMember(member) {
  if (member?.type !== 'cue' || !member.sectionId || !member.cueId) return null;
  return {
    type: 'cue',
    sectionId: member.sectionId,
    cueId: member.cueId,
    keyPart: member.keyPart || 'focus',
  };
}

function makeCueSelection(primary, members) {
  const selection = { ...primary };
  delete selection.members;
  if (members.length > 1) selection.members = members;
  return selection;
}

export function getAboutNarrativeExtentField(profile) {
  return profile === 'mobile' ? 'mobileExtentWU' : 'extentWU';
}

export function captureAboutNarrativePlayheadContext({
  plan,
  storyWU,
  resizedSectionId,
}) {
  const { section, sectionIndex, storyWU: clampedStoryWU } = getSectionAtStoryWU(plan, storyWU);
  const resizedSectionIndex = plan?.sections?.findIndex((item) => item.id === resizedSectionId) ?? -1;
  if (!section || resizedSectionIndex < 0 || sectionIndex < resizedSectionIndex) {
    return {
      mode: 'absolute',
      storyWU: cleanTimelineValue(clampedStoryWU || 0),
    };
  }
  return {
    mode: 'section',
    storyWU: cleanTimelineValue(clampedStoryWU),
    sectionId: section.id,
    localProgress: cleanTimelineValue(clamp(
      (clampedStoryWU - section.startWU) / Math.max(0.001, section.travelWU),
      0,
      1,
    )),
  };
}

export function remapAboutNarrativePlayheadContext(context, plan) {
  if (!plan?.sections?.length) return 0;
  if (context?.mode !== 'section') {
    return cleanTimelineValue(clamp(Number(context?.storyWU) || 0, 0, Number(plan.maxStoryWU || 0)));
  }
  const section = plan.sections.find((item) => item.id === context.sectionId);
  if (!section) {
    return cleanTimelineValue(clamp(Number(context.storyWU) || 0, 0, Number(plan.maxStoryWU || 0)));
  }
  return cleanTimelineValue(clamp(
    section.startWU + (clamp(Number(context.localProgress) || 0, 0, 1) * section.travelWU),
    0,
    Number(plan.maxStoryWU || 0),
  ));
}

export function getAboutNarrativeSelectionMembers(selection) {
  const primary = normalizeCueMember(selection);
  if (!primary) return [];
  const candidates = Array.isArray(selection.members) ? selection.members : [];
  const members = [];
  const seen = new Set();
  [primary, ...candidates].forEach((candidate) => {
    const member = normalizeCueMember(candidate);
    if (!member) return;
    const key = cueMemberKey(member);
    if (seen.has(key)) return;
    seen.add(key);
    members.push(member);
  });
  return members;
}

export function toggleAboutNarrativeCueSelection(selection, cueSelection, {
  additive = true,
} = {}) {
  const target = normalizeCueMember(cueSelection);
  if (!target) return selection;
  if (!additive || selection?.type !== 'cue') return target;

  const targetKey = cueMemberKey(target);
  const current = getAboutNarrativeSelectionMembers(selection);
  const targetIndex = current.findIndex((member) => cueMemberKey(member) === targetKey);
  if (targetIndex < 0) return makeCueSelection(target, [...current, target]);
  if (current.length === 1) return target;

  const members = current.filter((_, index) => index !== targetIndex);
  const currentPrimaryKey = cueMemberKey(normalizeCueMember(selection));
  const primary = currentPrimaryKey === targetKey
    ? members.at(-1)
    : members.find((member) => cueMemberKey(member) === currentPrimaryKey) || members.at(-1);
  return makeCueSelection(primary, members);
}

export function snapAboutNarrativeTimelineValue(value, step = ABOUT_NARRATIVE_TIMELINE_STEP) {
  return cleanTimelineValue(Math.round(Number(value) / step) * step);
}

export function getAboutNarrativeCameraKeyTimingBounds(keys, keyIndex) {
  const key = keys[keyIndex];
  if (!key) return { min: 0, max: 1, locked: true };
  if (keyIndex === 0 || keyIndex === keys.length - 1) {
    return { min: Number(key.at), max: Number(key.at), locked: true };
  }
  return {
    min: cleanTimelineValue(Number(keys[keyIndex - 1].at) + ABOUT_NARRATIVE_TIMELINE_STEP),
    max: cleanTimelineValue(Number(keys[keyIndex + 1].at) - ABOUT_NARRATIVE_TIMELINE_STEP),
    locked: false,
  };
}

export function resolveAboutNarrativeCameraKeyDrop({
  document,
  plan,
  sourceSectionIndex,
  sourceKeyIndex,
  storyWU,
}) {
  if (!document?.sections?.length || !plan?.sections?.length) {
    return { valid: false, reason: 'The camera timeline is not ready.' };
  }

  const clampedStoryWU = clamp(Number(storyWU), 0, Number(plan.maxStoryWU || storyWU));
  let sectionIndex = plan.sections.findIndex((section, index) => {
    const nextStartWU = plan.sections[index + 1]?.startWU ?? Number.POSITIVE_INFINITY;
    return clampedStoryWU >= section.startWU && clampedStoryWU < nextStartWU;
  });
  if (sectionIndex < 0) sectionIndex = plan.sections.length - 1;

  const compiled = plan.sections[sectionIndex];
  const section = document.sections[sectionIndex];
  if (!compiled || !section?.camera?.keys?.length || !(compiled.travelWU > 0)) {
    return { valid: false, reason: 'This Section cannot receive a camera key.' };
  }

  const rawAt = (clampedStoryWU - compiled.startWU) / compiled.travelWU;
  const requestedAt = clamp(
    snapAboutNarrativeTimelineValue(rawAt),
    ABOUT_NARRATIVE_TIMELINE_STEP,
    1 - ABOUT_NARRATIVE_TIMELINE_STEP,
  );
  const neighbours = section.camera.keys
    .filter((key, keyIndex) => !(sectionIndex === sourceSectionIndex && keyIndex === sourceKeyIndex))
    .map((key) => Number(key.at))
    .sort((a, b) => a - b);
  const nextIndex = neighbours.findIndex((at) => at > requestedAt);
  const insertionIndex = nextIndex < 0 ? neighbours.length : nextIndex;
  const previousAt = neighbours[insertionIndex - 1] ?? 0;
  const nextAt = neighbours[insertionIndex] ?? 1;
  const min = cleanTimelineValue(previousAt + ABOUT_NARRATIVE_TIMELINE_STEP);
  const max = cleanTimelineValue(nextAt - ABOUT_NARRATIVE_TIMELINE_STEP);
  if (min > max) {
    return {
      valid: false,
      reason: `${section.label} has no safe gap for another camera key here.`,
      sectionIndex,
      sectionId: section.id,
    };
  }

  const at = cleanTimelineValue(clamp(requestedAt, min, max));
  const keyIndex = neighbours.findIndex((item) => item > at);
  return {
    valid: true,
    sectionIndex,
    sectionId: section.id,
    sectionLabel: section.label,
    keyIndex: keyIndex < 0 ? neighbours.length : keyIndex,
    at,
    storyWU: cleanTimelineValue(compiled.startWU + (at * compiled.travelWU)),
  };
}

export function getAboutNarrativeCueTimingBounds(cue) {
  const focus = Number(cue.hold);
  const lead = Math.max(0, focus - Number(cue.enter));
  const trail = Math.max(0, Number(cue.exit) - focus);
  return {
    min: 0,
    max: 1,
    lead,
    trail,
  };
}

export function moveAboutNarrativeCueTiming(cue, nextFocus) {
  const bounds = getAboutNarrativeCueTimingBounds(cue);
  const hold = snapAboutNarrativeTimelineValue(clamp(Number(nextFocus), bounds.min, bounds.max));
  return {
    ...cue,
    enter: cleanTimelineValue(hold - bounds.lead),
    hold,
    exit: cleanTimelineValue(hold + bounds.trail),
  };
}

export function resolveAboutNarrativeCueGroupMove({
  document,
  plan,
  members,
  primary,
  deltaWU,
  localDelta,
}) {
  if (!document?.sections?.length || !plan?.valid || !plan.sections?.length) {
    return { valid: false, reason: 'The text timeline is not ready.' };
  }

  const normalizedMembers = getAboutNarrativeSelectionMembers({
    ...(normalizeCueMember(primary) || normalizeCueMember(members?.[0]) || {}),
    members,
  });
  if (!normalizedMembers.length) {
    return { valid: false, reason: 'Select at least one title Cue.' };
  }

  const entries = [];
  for (const member of normalizedMembers) {
    const sectionIndex = document.sections.findIndex((section) => section.id === member.sectionId);
    const section = document.sections[sectionIndex];
    const compiled = plan.sections.find((item) => item.id === member.sectionId);
    const cue = section?.text?.cues?.find((item) => item.id === member.cueId);
    if (!section || !compiled || !cue || !(compiled.travelWU > 0)) {
      return { valid: false, reason: `Title Cue ${member.cueId} is no longer available.` };
    }
    const hold = Number(cue.hold);
    const bounds = getAboutNarrativeCueTimingBounds(cue);
    entries.push({ member, sectionIndex, compiled, cue, hold, bounds });
  }

  const primaryMember = normalizeCueMember(primary) || entries[0].member;
  const primaryEntry = entries.find((entry) => cueMemberKey(entry.member) === cueMemberKey(primaryMember)) || entries[0];
  const requestedDeltaWU = Number.isFinite(Number(deltaWU))
    ? Number(deltaWU)
    : Number(localDelta || 0) * primaryEntry.compiled.travelWU;
  const minDeltaWU = Math.max(...entries.map((entry) => -entry.hold * entry.compiled.travelWU));
  const maxDeltaWU = Math.min(...entries.map((entry) => (1 - entry.hold) * entry.compiled.travelWU));
  const appliedDeltaWU = cleanTimelineValue(clamp(requestedDeltaWU, minDeltaWU, maxDeltaWU));
  const moves = entries.map((entry) => {
    const hold = cleanTimelineValue(clamp(
      entry.hold + (appliedDeltaWU / entry.compiled.travelWU),
      0,
      1,
    ));
    return {
      sectionId: entry.member.sectionId,
      sectionIndex: entry.sectionIndex,
      cueId: entry.member.cueId,
      enter: cleanTimelineValue(hold - entry.bounds.lead),
      hold,
      exit: cleanTimelineValue(hold + entry.bounds.trail),
    };
  });

  return {
    valid: true,
    requestedDeltaWU: cleanTimelineValue(requestedDeltaWU),
    deltaWU: appliedDeltaWU,
    minDeltaWU: cleanTimelineValue(minDeltaWU),
    maxDeltaWU: cleanTimelineValue(maxDeltaWU),
    moves,
  };
}
