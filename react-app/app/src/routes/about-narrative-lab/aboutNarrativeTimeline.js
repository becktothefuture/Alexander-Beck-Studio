import { compileAboutNarrativeDocument } from './aboutNarrativeCompiler.js';
import {
  cloneAboutNarrativeDocument,
  validateAboutNarrativeDocument,
} from './aboutNarrativeSchema.js';

export const ABOUT_NARRATIVE_TIMELINE_STEP = 0.005;

const RHYTHM_EPSILON = 0.000001;
const ABOUT_NARRATIVE_CLIPBOARD_VERSION = 1;
const ABOUT_NARRATIVE_CLIPBOARD_KIND = 'cue-group';

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

function makeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}

function getAboutNarrativeUsedIds(document) {
  return new Set((document?.sections || []).flatMap((section) => [
    section.id,
    ...(section.text?.cues || []).map((cue) => cue.id),
    ...(section.text?.blocks || []).map((block) => block.id),
    ...(section.text?.disciplineReveal ? [section.text.disciplineReveal.id] : []),
  ]));
}

function nextDuplicateId(sourceId, usedIds) {
  const base = makeSlug(sourceId);
  let suffix = 2;
  let id = `${base}-${suffix}`;
  while (usedIds.has(id)) {
    suffix += 1;
    id = `${base}-${suffix}`;
  }
  usedIds.add(id);
  return id;
}

function getCueEntries({ document, plan, members, primary }) {
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
    const cueIndex = section?.text?.cues?.findIndex((item) => item.id === member.cueId) ?? -1;
    const cue = section?.text?.cues?.[cueIndex];
    if (!section || !compiled || !cue || !(compiled.travelWU > 0)) {
      return { valid: false, reason: `Title Cue ${member.cueId} is no longer available.` };
    }
    const hold = Number(cue.hold);
    const bounds = getAboutNarrativeCueTimingBounds(cue);
    entries.push({
      member,
      section,
      sectionIndex,
      cue,
      cueIndex,
      compiled,
      hold,
      bounds,
      globalWU: cleanTimelineValue(compiled.startWU + (hold * compiled.travelWU)),
      minGlobalWU: cleanTimelineValue(compiled.startWU + (bounds.min * compiled.travelWU)),
      maxGlobalWU: cleanTimelineValue(compiled.startWU + (bounds.max * compiled.travelWU)),
    });
  }

  const primaryMember = normalizeCueMember(primary) || entries[0].member;
  const primaryEntry = entries.find((entry) => (
    cueMemberKey(entry.member) === cueMemberKey(primaryMember)
  )) || entries[0];
  return { valid: true, entries, primaryEntry };
}

function sortCueEntries(entries) {
  return [...entries].sort((left, right) => (
    (left.globalWU - right.globalWU)
    || (left.sectionIndex - right.sectionIndex)
    || (left.cueIndex - right.cueIndex)
    || left.cue.id.localeCompare(right.cue.id)
  ));
}

function createCueMove(entry, globalWU) {
  const hold = (Number(globalWU) - entry.compiled.startWU) / entry.compiled.travelWU;
  const moved = moveAboutNarrativeCueTiming(entry.cue, hold, { snap: false });
  return {
    sectionId: entry.member.sectionId,
    sectionIndex: entry.sectionIndex,
    cueId: entry.member.cueId,
    enter: moved.enter,
    hold: moved.hold,
    exit: moved.exit,
    storyWU: cleanTimelineValue(entry.compiled.startWU + (moved.hold * entry.compiled.travelWU)),
  };
}

function getCandidateValidation(document) {
  const schemaDiagnostics = validateAboutNarrativeDocument(document);
  const schemaErrors = schemaDiagnostics.filter((item) => item.level === 'error');
  if (schemaErrors.length) {
    return {
      valid: false,
      reason: schemaErrors[0].message,
      diagnostics: schemaDiagnostics,
    };
  }
  const plan = compileAboutNarrativeDocument(document);
  if (!plan.valid) {
    const error = plan.diagnostics.find((item) => item.level === 'error');
    return {
      valid: false,
      reason: error?.message || 'The proposed About narrative is not valid.',
      diagnostics: plan.diagnostics,
    };
  }
  return { valid: true, diagnostics: plan.diagnostics, plan };
}

function copyCameraPose(target, source) {
  if (!target || !source) return;
  target.offset = [...source.offset];
  target.lookAtOffset = [...source.lookAtOffset];
  target.fov = source.fov;
  target.roll = source.roll;
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
    min: Math.max(0, lead - 1),
    max: Math.min(1, 2 - trail),
    lead,
    trail,
  };
}

export function moveAboutNarrativeCueTiming(cue, nextFocus, { snap = true } = {}) {
  const bounds = getAboutNarrativeCueTimingBounds(cue);
  const requestedFocus = clamp(Number(nextFocus), bounds.min, bounds.max);
  const hold = snap
    ? cleanTimelineValue(clamp(
      snapAboutNarrativeTimelineValue(requestedFocus),
      bounds.min,
      bounds.max,
    ))
    : cleanTimelineValue(requestedFocus);
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
  const resolved = getCueEntries({ document, plan, members, primary });
  if (!resolved.valid) return resolved;
  const { entries, primaryEntry } = resolved;
  const requestedDeltaWU = Number.isFinite(Number(deltaWU))
    ? Number(deltaWU)
    : Number(localDelta || 0) * primaryEntry.compiled.travelWU;
  const minDeltaWU = Math.max(...entries.map((entry) => entry.minGlobalWU - entry.globalWU));
  const maxDeltaWU = Math.min(...entries.map((entry) => entry.maxGlobalWU - entry.globalWU));
  const appliedDeltaWU = cleanTimelineValue(clamp(requestedDeltaWU, minDeltaWU, maxDeltaWU));
  const moves = entries.map((entry) => createCueMove(entry, entry.globalWU + appliedDeltaWU));

  return {
    valid: true,
    requestedDeltaWU: cleanTimelineValue(requestedDeltaWU),
    deltaWU: appliedDeltaWU,
    minDeltaWU: cleanTimelineValue(minDeltaWU),
    maxDeltaWU: cleanTimelineValue(maxDeltaWU),
    moves,
  };
}

export function resolveAboutNarrativeCueDistribution({
  document,
  plan,
  members,
  primary,
}) {
  const resolved = getCueEntries({ document, plan, members, primary });
  if (!resolved.valid) return resolved;
  const ordered = sortCueEntries(resolved.entries);
  if (ordered.length < 2) {
    return { valid: false, reason: 'Select at least two title Cues to distribute.' };
  }
  const gapWU = cleanTimelineValue(
    (ordered.at(-1).globalWU - ordered[0].globalWU) / (ordered.length - 1),
  );
  const result = resolveAboutNarrativeCueExactGap({
    document,
    plan,
    members: ordered.map((entry) => entry.member),
    primary: ordered[0].member,
    gapWU,
    anchor: 'first',
  });
  return {
    ...result,
    operation: 'distribute',
    gapWU,
  };
}

export function resolveAboutNarrativeCueExactGap({
  document,
  plan,
  members,
  primary,
  gapWU,
  anchor = 'primary',
}) {
  const resolved = getCueEntries({ document, plan, members, primary });
  if (!resolved.valid) return resolved;
  const ordered = sortCueEntries(resolved.entries);
  if (ordered.length < 2) {
    return { valid: false, reason: 'Select at least two title Cues to set a gap.' };
  }
  if (!['primary', 'first', 'last'].includes(anchor)) {
    return { valid: false, reason: 'Choose Primary, First, or Last as the gap anchor.' };
  }

  const requestedGapWU = Number(gapWU);
  if (!Number.isFinite(requestedGapWU) || requestedGapWU < 0) {
    return { valid: false, reason: 'Gap must be a non-negative WU value.' };
  }
  const anchorIndex = anchor === 'first'
    ? 0
    : anchor === 'last'
      ? ordered.length - 1
      : Math.max(0, ordered.findIndex((entry) => (
        cueMemberKey(entry.member) === cueMemberKey(resolved.primaryEntry.member)
      )));
  const anchorEntry = ordered[anchorIndex];
  const anchorWU = anchorEntry.globalWU;
  let minimumValidGapWU = 0;
  let maximumValidGapWU = Number.POSITIVE_INFINITY;

  ordered.forEach((entry, index) => {
    const offset = index - anchorIndex;
    if (offset > 0) {
      minimumValidGapWU = Math.max(minimumValidGapWU, (entry.minGlobalWU - anchorWU) / offset);
      maximumValidGapWU = Math.min(maximumValidGapWU, (entry.maxGlobalWU - anchorWU) / offset);
    } else if (offset < 0) {
      const distance = -offset;
      minimumValidGapWU = Math.max(minimumValidGapWU, (anchorWU - entry.maxGlobalWU) / distance);
      maximumValidGapWU = Math.min(maximumValidGapWU, (anchorWU - entry.minGlobalWU) / distance);
    }
  });
  minimumValidGapWU = cleanTimelineValue(Math.max(0, minimumValidGapWU));
  maximumValidGapWU = cleanTimelineValue(Math.max(0, maximumValidGapWU));

  const boundaryDetails = {
    requestedGapWU: cleanTimelineValue(requestedGapWU),
    minimumValidGapWU,
    maximumValidGapWU,
    anchor,
    anchorCueId: anchorEntry.cue.id,
  };
  if (minimumValidGapWU > maximumValidGapWU + RHYTHM_EPSILON) {
    return {
      valid: false,
      reason: 'These Section boundaries do not permit one shared Cue gap.',
      ...boundaryDetails,
    };
  }
  if (requestedGapWU > maximumValidGapWU + RHYTHM_EPSILON) {
    return {
      valid: false,
      reason: `Section boundaries limit this gap to ${maximumValidGapWU.toFixed(3)} WU.`,
      ...boundaryDetails,
    };
  }
  if (requestedGapWU < minimumValidGapWU - RHYTHM_EPSILON) {
    return {
      valid: false,
      reason: `Section boundaries require at least ${minimumValidGapWU.toFixed(3)} WU.`,
      ...boundaryDetails,
    };
  }

  const moves = ordered.map((entry, index) => (
    createCueMove(entry, anchorWU + ((index - anchorIndex) * requestedGapWU))
  ));
  return {
    valid: true,
    ...boundaryDetails,
    moves,
  };
}

export function resolveAboutNarrativeCueGroupAlign({
  document,
  plan,
  members,
  primary,
  playheadWU,
}) {
  const resolved = getCueEntries({ document, plan, members, primary });
  if (!resolved.valid) return resolved;
  if (!Number.isFinite(Number(playheadWU))) {
    return { valid: false, reason: 'The playhead position is not available.' };
  }
  const requestedDeltaWU = Number(playheadWU) - resolved.primaryEntry.globalWU;
  const result = resolveAboutNarrativeCueGroupMove({
    document,
    plan,
    members,
    primary: resolved.primaryEntry.member,
    deltaWU: requestedDeltaWU,
  });
  if (!result.valid) return result;
  return {
    ...result,
    playheadWU: cleanTimelineValue(Number(playheadWU)),
    aligned: Math.abs(result.deltaWU - requestedDeltaWU) <= RHYTHM_EPSILON,
  };
}

export function createAboutNarrativeDuplicateId(document, sourceId, {
  reservedIds = [],
} = {}) {
  const usedIds = getAboutNarrativeUsedIds(document);
  reservedIds.forEach((id) => usedIds.add(String(id)));
  return nextDuplicateId(sourceId, usedIds);
}

function remapCueReference(cue, idMap) {
  if (!cue?.anchor || !idMap.has(cue.anchor)) return cue;
  return { ...cue, anchor: idMap.get(cue.anchor) };
}

export function duplicateAboutNarrativeCueGroup({
  document,
  members,
  primary,
}) {
  if (!document?.sections?.length) {
    return { valid: false, reason: 'The About document is not ready.' };
  }
  const normalizedMembers = getAboutNarrativeSelectionMembers({
    ...(normalizeCueMember(primary) || normalizeCueMember(members?.[0]) || {}),
    members,
  });
  if (!normalizedMembers.length) {
    return { valid: false, reason: 'Select at least one title Cue to duplicate.' };
  }
  const selectedKeys = new Set(normalizedMembers.map(cueMemberKey));
  const availableKeys = new Set((document.sections || []).flatMap((section) => (
    (section.text?.cues || []).map((cue) => `${section.id}:${cue.id}`)
  )));
  const missingMember = normalizedMembers.find((member) => !availableKeys.has(cueMemberKey(member)));
  if (missingMember) {
    return { valid: false, reason: `Title Cue ${missingMember.cueId} is no longer available.` };
  }

  const candidate = cloneAboutNarrativeDocument(document);
  const usedIds = getAboutNarrativeUsedIds(candidate);
  const idMap = new Map();
  candidate.sections.forEach((section) => {
    (section.text?.cues || []).forEach((cue) => {
      if (!selectedKeys.has(`${section.id}:${cue.id}`)) return;
      idMap.set(cue.id, nextDuplicateId(cue.id, usedIds));
    });
  });

  const items = [];
  candidate.sections.forEach((section) => {
    if (!Array.isArray(section.text?.cues)) return;
    section.text.cues = section.text.cues.flatMap((cue) => {
      const memberKey = `${section.id}:${cue.id}`;
      if (!selectedKeys.has(memberKey)) return [cue];
      const duplicate = remapCueReference({
        ...cloneAboutNarrativeDocument(cue),
        id: idMap.get(cue.id),
      }, idMap);
      items.push({
        sectionId: section.id,
        sourceCueId: cue.id,
        cueId: duplicate.id,
        cue: duplicate,
      });
      return [cue, duplicate];
    });
  });

  const validation = getCandidateValidation(candidate);
  if (!validation.valid) return validation;
  const primaryMember = normalizeCueMember(primary) || normalizedMembers[0];
  const primaryCueId = idMap.get(primaryMember.cueId) || items[0].cueId;
  const selectionMembers = items.map((item) => ({
    type: 'cue',
    sectionId: item.sectionId,
    cueId: item.cueId,
    keyPart: 'focus',
  }));
  const primarySelection = selectionMembers.find((member) => member.cueId === primaryCueId)
    || selectionMembers[0];
  return {
    valid: true,
    document: candidate,
    diagnostics: validation.diagnostics,
    idMap: Object.fromEntries(idMap),
    items,
    selection: makeCueSelection(primarySelection, selectionMembers),
  };
}

export function stitchAboutNarrativeCameraBoundaries(document, {
  boundaryIndexes = null,
} = {}) {
  const candidate = cloneAboutNarrativeDocument(document);
  const requestedBoundaries = boundaryIndexes == null
    ? candidate.sections.map((_, index) => index).slice(1)
    : [...new Set(boundaryIndexes.map(Number))].sort((left, right) => left - right);
  requestedBoundaries.forEach((sectionIndex) => {
    if (!Number.isInteger(sectionIndex) || sectionIndex <= 0 || sectionIndex >= candidate.sections.length) return;
    const previousKey = candidate.sections[sectionIndex - 1]?.camera?.keys?.at(-1);
    const nextKey = candidate.sections[sectionIndex]?.camera?.keys?.[0];
    copyCameraPose(nextKey, previousKey);
  });
  return candidate;
}

function remapSectionReferences(value, idMap, key = '') {
  if (Array.isArray(value)) return value.map((item) => remapSectionReferences(item, idMap, key));
  if (!value || typeof value !== 'object') {
    const referenceKey = key === 'anchor' || key.endsWith('Id') || key.endsWith('Ref');
    return referenceKey && typeof value === 'string' && idMap.has(value)
      ? idMap.get(value)
      : value;
  }
  return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [
    childKey,
    remapSectionReferences(childValue, idMap, childKey),
  ]));
}

export function duplicateAboutNarrativeSection({
  document,
  sectionId,
}) {
  if (!document?.sections?.length) {
    return { valid: false, reason: 'The About document is not ready.' };
  }
  const sourceIndex = document.sections.findIndex((section) => section.id === sectionId);
  const source = document.sections[sourceIndex];
  if (!source) return { valid: false, reason: `Section ${sectionId} is no longer available.` };
  if (source.locked) return { valid: false, reason: 'Unlock this Section before duplicating it.' };
  if (source.type === 'finale') {
    return { valid: false, reason: 'The protected finale cannot be duplicated.' };
  }

  const usedIds = getAboutNarrativeUsedIds(document);
  const idMap = new Map();
  idMap.set(source.id, nextDuplicateId(source.id, usedIds));
  (source.text?.cues || []).forEach((cue) => idMap.set(cue.id, nextDuplicateId(cue.id, usedIds)));
  (source.text?.blocks || []).forEach((block) => idMap.set(block.id, nextDuplicateId(block.id, usedIds)));
  if (source.text?.disciplineReveal) {
    const reveal = source.text.disciplineReveal;
    idMap.set(reveal.id, nextDuplicateId(reveal.id, usedIds));
  }

  let duplicate = remapSectionReferences(cloneAboutNarrativeDocument(source), idMap);
  duplicate.id = idMap.get(source.id);
  duplicate.label = `${source.label} copy`;
  (duplicate.text?.cues || []).forEach((cue, cueIndex) => {
    cue.id = idMap.get(source.text.cues[cueIndex].id);
  });
  (duplicate.text?.blocks || []).forEach((block, blockIndex) => {
    block.id = idMap.get(source.text.blocks[blockIndex].id);
  });
  if (duplicate.text?.disciplineReveal) {
    duplicate.text.disciplineReveal.id = idMap.get(source.text.disciplineReveal.id);
  }

  const candidate = cloneAboutNarrativeDocument(document);
  const insertIndex = sourceIndex + 1;
  candidate.sections.splice(insertIndex, 0, duplicate);
  const stitched = stitchAboutNarrativeCameraBoundaries(candidate, {
    boundaryIndexes: [insertIndex, insertIndex + 1],
  });
  duplicate = stitched.sections[insertIndex];
  const validation = getCandidateValidation(stitched);
  if (!validation.valid) return validation;
  return {
    valid: true,
    document: stitched,
    diagnostics: validation.diagnostics,
    section: duplicate,
    sectionIndex: insertIndex,
    sourceSectionId: source.id,
    sectionId: duplicate.id,
    idMap: Object.fromEntries(idMap),
    selection: { type: 'section', sectionId: duplicate.id },
  };
}

export function createAboutNarrativeCueClipboardPayload({
  document,
  plan,
  members,
  primary,
}) {
  const resolved = getCueEntries({ document, plan, members, primary });
  if (!resolved.valid) return resolved;
  const ordered = sortCueEntries(resolved.entries);
  const originWU = ordered[0].globalWU;
  return {
    version: ABOUT_NARRATIVE_CLIPBOARD_VERSION,
    kind: ABOUT_NARRATIVE_CLIPBOARD_KIND,
    items: ordered.map((entry) => ({
      offsetWU: cleanTimelineValue(entry.globalWU - originWU),
      cue: cloneAboutNarrativeDocument(entry.cue),
    })),
  };
}

export function validateAboutNarrativeCueClipboardPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, reason: 'The editor clipboard is empty or damaged.' };
  }
  if (payload.version !== ABOUT_NARRATIVE_CLIPBOARD_VERSION) {
    return { valid: false, reason: 'This editor clipboard version is not supported.' };
  }
  if (payload.kind !== ABOUT_NARRATIVE_CLIPBOARD_KIND) {
    return { valid: false, reason: 'Only copied title Cue groups can be pasted here.' };
  }
  if (!Array.isArray(payload.items) || !payload.items.length || payload.items.length > 100) {
    return { valid: false, reason: 'The copied Cue group must contain between 1 and 100 titles.' };
  }
  const seenCueIds = new Set();
  for (const item of payload.items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { valid: false, reason: 'A copied Cue item is damaged.' };
    }
    const unknownItemKey = Object.keys(item).find((key) => !['offsetWU', 'cue'].includes(key));
    if (unknownItemKey) return { valid: false, reason: `Unknown clipboard field “${unknownItemKey}”.` };
    if (!Number.isFinite(Number(item.offsetWU)) || Number(item.offsetWU) < 0) {
      return { valid: false, reason: 'Copied Cue offsets must be non-negative WU values.' };
    }
    const cue = item.cue;
    if (!cue || typeof cue !== 'object' || Array.isArray(cue)) {
      return { valid: false, reason: 'A copied Cue is missing its authored title.' };
    }
    const unknownCueKey = Object.keys(cue).find((key) => ![
      'id',
      'text',
      'enter',
      'hold',
      'exit',
      'preset',
      'anchor',
      'motion',
    ].includes(key));
    if (unknownCueKey) return { valid: false, reason: `Unknown copied Cue field “${unknownCueKey}”.` };
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cue.id || '') || seenCueIds.has(cue.id)) {
      return { valid: false, reason: 'Copied Cue IDs must be unique lower-case slugs.' };
    }
    seenCueIds.add(cue.id);
    if (
      !cue.text?.trim()
      || cue.text.length > 1200
      || /<\/?(?:script|style|iframe)|\bon\w+\s*=|javascript:/i.test(cue.text)
      || ![cue.enter, cue.hold, cue.exit].every((value) => Number.isFinite(Number(value)))
    ) {
      return { valid: false, reason: 'A copied Cue has invalid text or timing.' };
    }
    if (
      cue.enter < -1
      || cue.exit > 2
      || cue.enter > cue.hold
      || cue.hold > cue.exit
      || cue.hold < 0
      || cue.hold > 1
    ) {
      return { valid: false, reason: 'A copied Cue has an invalid timing envelope.' };
    }
    if (
      typeof cue.preset !== 'string'
      || !cue.preset
      || !cue.motion
      || typeof cue.motion !== 'object'
      || Array.isArray(cue.motion)
      || Object.keys(cue.motion).some((key) => key !== 'mode')
      || !['spatial', 'vertical'].includes(cue.motion.mode)
    ) {
      return { valid: false, reason: 'A copied Cue has unsupported title behavior.' };
    }
  }
  const hasOrigin = payload.items.some((item) => Math.abs(Number(item.offsetWU)) <= RHYTHM_EPSILON);
  if (!hasOrigin) return { valid: false, reason: 'The copied Cue group has no timeline origin.' };
  return {
    valid: true,
    payload: cloneAboutNarrativeDocument(payload),
  };
}

export function resolveAboutNarrativeCueGroupPaste({
  document,
  plan,
  payload,
  destinationSectionId,
  playheadWU,
}) {
  const clipboard = validateAboutNarrativeCueClipboardPayload(payload);
  if (!clipboard.valid) return clipboard;
  if (!document?.sections?.length || !plan?.valid) {
    return { valid: false, reason: 'The About timeline is not ready.' };
  }
  const destinationIndex = document.sections.findIndex((section) => section.id === destinationSectionId);
  const destination = document.sections[destinationIndex];
  const compiled = plan.sections.find((section) => section.id === destinationSectionId);
  if (!destination || !compiled) {
    return { valid: false, reason: 'Choose an available destination Section.' };
  }
  if (!Array.isArray(destination.text?.cues)) {
    return {
      valid: false,
      reason: `${destination.label} does not contain a title Cue track.`,
    };
  }
  if (!(compiled.travelWU > 0) || !Number.isFinite(Number(playheadWU))) {
    return { valid: false, reason: 'The destination playhead position is not available.' };
  }

  const items = clipboard.payload.items;
  let minimumOriginWU = Number.NEGATIVE_INFINITY;
  let maximumOriginWU = Number.POSITIVE_INFINITY;
  items.forEach((item) => {
    const bounds = getAboutNarrativeCueTimingBounds(item.cue);
    const offsetWU = Number(item.offsetWU);
    minimumOriginWU = Math.max(
      minimumOriginWU,
      compiled.startWU + (bounds.min * compiled.travelWU) - offsetWU,
    );
    maximumOriginWU = Math.min(
      maximumOriginWU,
      compiled.startWU + (bounds.max * compiled.travelWU) - offsetWU,
    );
  });
  minimumOriginWU = cleanTimelineValue(minimumOriginWU);
  maximumOriginWU = cleanTimelineValue(maximumOriginWU);
  if (minimumOriginWU > maximumOriginWU + RHYTHM_EPSILON) {
    return {
      valid: false,
      reason: `The copied Cue group is wider than ${destination.label}'s title timeline.`,
      minimumOriginWU,
      maximumOriginWU,
    };
  }

  const requestedOriginWU = Number(playheadWU);
  const originWU = cleanTimelineValue(clamp(
    requestedOriginWU,
    minimumOriginWU,
    maximumOriginWU,
  ));
  const candidate = cloneAboutNarrativeDocument(document);
  const target = candidate.sections[destinationIndex];
  const usedIds = getAboutNarrativeUsedIds(candidate);
  const idMap = new Map();
  items.forEach((item) => idMap.set(item.cue.id, nextDuplicateId(item.cue.id, usedIds)));
  const pastedItems = items.map((item, index) => {
    const storyWU = cleanTimelineValue(originWU + Number(item.offsetWU));
    const localFocus = (storyWU - compiled.startWU) / compiled.travelWU;
    const moved = moveAboutNarrativeCueTiming(item.cue, localFocus, { snap: false });
    const cue = remapCueReference({
      ...moved,
      id: idMap.get(item.cue.id),
    }, idMap);
    return {
      cue,
      cueId: cue.id,
      sourceCueId: item.cue.id,
      offsetWU: cleanTimelineValue(Number(item.offsetWU)),
      storyWU,
      order: index,
    };
  });
  target.text.cues = [...target.text.cues, ...pastedItems.map((item) => item.cue)]
    .map((cue, index) => ({ cue, index }))
    .sort((left, right) => (left.cue.hold - right.cue.hold) || (left.index - right.index))
    .map((item) => item.cue);

  const validation = getCandidateValidation(candidate);
  if (!validation.valid) return validation;
  const selectionMembers = pastedItems.map((item) => ({
    type: 'cue',
    sectionId: destinationSectionId,
    cueId: item.cueId,
    keyPart: 'focus',
  }));
  return {
    valid: true,
    document: candidate,
    diagnostics: validation.diagnostics,
    destinationSectionId,
    requestedOriginWU: cleanTimelineValue(requestedOriginWU),
    originWU,
    clamped: Math.abs(originWU - requestedOriginWU) > RHYTHM_EPSILON,
    minimumOriginWU,
    maximumOriginWU,
    idMap: Object.fromEntries(idMap),
    items: pastedItems,
    selection: makeCueSelection(selectionMembers[0], selectionMembers),
  };
}

function getCueLoopBounds({ document, plan, source }) {
  const members = source.type === 'cue-group'
    ? source.members
    : getAboutNarrativeSelectionMembers(source);
  const resolved = getCueEntries({
    document,
    plan,
    members,
    primary: source.primary || source,
  });
  if (!resolved.valid) return resolved;
  const ordered = sortCueEntries(resolved.entries);
  const startWU = Math.min(...ordered.map((entry) => (
    entry.compiled.startWU + (Number(entry.cue.enter) * entry.compiled.travelWU)
  )));
  const endWU = Math.max(...ordered.map((entry) => (
    entry.compiled.startWU + (Number(entry.cue.exit) * entry.compiled.travelWU)
  )));
  return {
    valid: true,
    startWU,
    endWU,
    sourceType: 'cue-group',
    sourceId: ordered.map((entry) => entry.cue.id).join('+'),
  };
}

export function deriveAboutNarrativeLoopRange({
  document,
  plan,
  source,
  preRollWU = 0,
  postRollWU = 0,
  cameraKeyWindowWU = 0.25,
}) {
  if (!document?.sections?.length || !plan?.valid || !source) {
    return { valid: false, reason: 'The loop source is not available.' };
  }
  const preRoll = Number(preRollWU);
  const postRoll = Number(postRollWU);
  if (!Number.isFinite(preRoll) || preRoll < 0 || !Number.isFinite(postRoll) || postRoll < 0) {
    return { valid: false, reason: 'Pre-roll and post-roll must be non-negative WU values.' };
  }

  const sourceSection = document.sections.find((section) => section.id === source.sectionId);
  const compiled = plan.sections.find((section) => section.id === source.sectionId);
  let baseRange;
  if (source.type === 'section') {
    if (!sourceSection || !compiled) return { valid: false, reason: 'The selected Section is not available.' };
    baseRange = {
      startWU: compiled.startWU,
      endWU: Math.min(compiled.endWU, plan.maxStoryWU),
      sourceType: 'section',
      sourceId: sourceSection.id,
    };
  } else if (source.type === 'cue' || source.type === 'cue-group') {
    baseRange = getCueLoopBounds({ document, plan, source });
    if (!baseRange.valid) return baseRange;
  } else if (source.type === 'world' || source.type === 'world-transition') {
    const transition = compiled?.worldState?.transition;
    if (!sourceSection || !compiled || sourceSection.world?.mode !== 'set' || !transition) {
      return { valid: false, reason: 'The selected World transition is not available.' };
    }
    baseRange = {
      startWU: transition.startWU,
      endWU: transition.endWU,
      sourceType: 'world-transition',
      sourceId: `${sourceSection.id}:transition`,
    };
  } else if (source.type === 'camera-key') {
    const key = sourceSection?.camera?.keys?.[source.keyIndex];
    const windowWU = Number(cameraKeyWindowWU);
    if (!key || !compiled || !Number.isFinite(windowWU) || windowWU <= 0) {
      return { valid: false, reason: 'The selected Camera key window is not available.' };
    }
    const keyWU = compiled.startWU + (Number(key.at) * compiled.travelWU);
    baseRange = {
      startWU: keyWU - windowWU,
      endWU: keyWU + windowWU,
      sourceType: 'camera-key',
      sourceId: `${sourceSection.id}:camera:${source.keyIndex}`,
    };
  } else {
    return { valid: false, reason: 'This selection cannot create a loop.' };
  }

  if (!(baseRange.endWU > baseRange.startWU + RHYTHM_EPSILON)) {
    return { valid: false, reason: 'This source has no duration to loop.' };
  }
  const startWU = cleanTimelineValue(clamp(baseRange.startWU - preRoll, 0, plan.maxStoryWU));
  const endWU = cleanTimelineValue(clamp(baseRange.endWU + postRoll, 0, plan.maxStoryWU));
  if (!(endWU > startWU + RHYTHM_EPSILON)) {
    return { valid: false, reason: 'This loop range falls outside the narrative.' };
  }
  return {
    valid: true,
    startWU,
    endWU,
    sourceType: baseRange.sourceType,
    sourceId: baseRange.sourceId,
  };
}
