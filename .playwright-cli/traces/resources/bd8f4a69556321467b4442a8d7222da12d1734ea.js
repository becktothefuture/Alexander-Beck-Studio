import { compileAboutNarrativeDocument } from "/src/routes/about-narrative-lab/aboutNarrativeCompiler.js";
import {
  cloneAboutNarrativeDocument,
  validateAboutNarrativeDocument,
} from "/src/routes/about-narrative-lab/aboutNarrativeSchema.js";

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
    ? snapAboutNarrativeTimelineValue(requestedFocus)
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
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cue.id || '') || seenCueIds.has(cue.id)) {
      return { valid: false, reason: 'Copied Cue IDs must be unique lower-case slugs.' };
    }
    seenCueIds.add(cue.id);
    if (!cue.text?.trim() || ![cue.enter, cue.hold, cue.exit].every((value) => Number.isFinite(Number(value)))) {
      return { valid: false, reason: 'A copied Cue has invalid text or timing.' };
    }
    if (cue.enter > cue.hold || cue.hold > cue.exit || cue.hold < 0 || cue.hold > 1) {
      return { valid: false, reason: 'A copied Cue has an invalid timing envelope.' };
    }
  }
  const hasOrigin = payload.items.some((item) => Math.abs(Number(item.offsetWU)) <= RHYTHM_EPSILON);
  if (!hasOrigin) return { valid: false, reason: 'The copied Cue group has no timeline origin.' };
  return {
    valid: true,
    payload: cloneAboutNarrativeDocument(payload),
  };
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFib3V0TmFycmF0aXZlVGltZWxpbmUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY29tcGlsZUFib3V0TmFycmF0aXZlRG9jdW1lbnQgfSBmcm9tIFwiL3NyYy9yb3V0ZXMvYWJvdXQtbmFycmF0aXZlLWxhYi9hYm91dE5hcnJhdGl2ZUNvbXBpbGVyLmpzXCI7XG5pbXBvcnQge1xuICBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG4gIHZhbGlkYXRlQWJvdXROYXJyYXRpdmVEb2N1bWVudCxcbn0gZnJvbSBcIi9zcmMvcm91dGVzL2Fib3V0LW5hcnJhdGl2ZS1sYWIvYWJvdXROYXJyYXRpdmVTY2hlbWEuanNcIjtcblxuZXhwb3J0IGNvbnN0IEFCT1VUX05BUlJBVElWRV9USU1FTElORV9TVEVQID0gMC4wMDU7XG5cbmNvbnN0IFJIWVRITV9FUFNJTE9OID0gMC4wMDAwMDE7XG5jb25zdCBBQk9VVF9OQVJSQVRJVkVfQ0xJUEJPQVJEX1ZFUlNJT04gPSAxO1xuY29uc3QgQUJPVVRfTkFSUkFUSVZFX0NMSVBCT0FSRF9LSU5EID0gJ2N1ZS1ncm91cCc7XG5cbmNvbnN0IGNsYW1wID0gKHZhbHVlLCBtaW4sIG1heCkgPT4gTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIHZhbHVlKSk7XG5cbmZ1bmN0aW9uIGNsZWFuVGltZWxpbmVWYWx1ZSh2YWx1ZSkge1xuICByZXR1cm4gTnVtYmVyKE51bWJlcih2YWx1ZSkudG9GaXhlZCg2KSk7XG59XG5cbmZ1bmN0aW9uIGdldFNlY3Rpb25BdFN0b3J5V1UocGxhbiwgc3RvcnlXVSkge1xuICBpZiAoIXBsYW4/LnNlY3Rpb25zPy5sZW5ndGgpIHJldHVybiB7IHNlY3Rpb246IG51bGwsIHNlY3Rpb25JbmRleDogLTEgfTtcbiAgY29uc3QgY2xhbXBlZFN0b3J5V1UgPSBjbGFtcChOdW1iZXIoc3RvcnlXVSkgfHwgMCwgMCwgTnVtYmVyKHBsYW4ubWF4U3RvcnlXVSB8fCAwKSk7XG4gIGxldCBzZWN0aW9uSW5kZXggPSBwbGFuLnNlY3Rpb25zLmZpbmRJbmRleCgoc2VjdGlvbiwgaW5kZXgpID0+IHtcbiAgICBjb25zdCBuZXh0U3RhcnRXVSA9IHBsYW4uc2VjdGlvbnNbaW5kZXggKyAxXT8uc3RhcnRXVSA/PyBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG4gICAgcmV0dXJuIGNsYW1wZWRTdG9yeVdVID49IHNlY3Rpb24uc3RhcnRXVSAmJiBjbGFtcGVkU3RvcnlXVSA8IG5leHRTdGFydFdVO1xuICB9KTtcbiAgaWYgKHNlY3Rpb25JbmRleCA8IDApIHNlY3Rpb25JbmRleCA9IHBsYW4uc2VjdGlvbnMubGVuZ3RoIC0gMTtcbiAgcmV0dXJuIHsgc2VjdGlvbjogcGxhbi5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLCBzZWN0aW9uSW5kZXgsIHN0b3J5V1U6IGNsYW1wZWRTdG9yeVdVIH07XG59XG5cbmZ1bmN0aW9uIGN1ZU1lbWJlcktleShtZW1iZXIpIHtcbiAgcmV0dXJuIGAke21lbWJlci5zZWN0aW9uSWR9OiR7bWVtYmVyLmN1ZUlkfWA7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUN1ZU1lbWJlcihtZW1iZXIpIHtcbiAgaWYgKG1lbWJlcj8udHlwZSAhPT0gJ2N1ZScgfHwgIW1lbWJlci5zZWN0aW9uSWQgfHwgIW1lbWJlci5jdWVJZCkgcmV0dXJuIG51bGw7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ2N1ZScsXG4gICAgc2VjdGlvbklkOiBtZW1iZXIuc2VjdGlvbklkLFxuICAgIGN1ZUlkOiBtZW1iZXIuY3VlSWQsXG4gICAga2V5UGFydDogbWVtYmVyLmtleVBhcnQgfHwgJ2ZvY3VzJyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWFrZUN1ZVNlbGVjdGlvbihwcmltYXJ5LCBtZW1iZXJzKSB7XG4gIGNvbnN0IHNlbGVjdGlvbiA9IHsgLi4ucHJpbWFyeSB9O1xuICBkZWxldGUgc2VsZWN0aW9uLm1lbWJlcnM7XG4gIGlmIChtZW1iZXJzLmxlbmd0aCA+IDEpIHNlbGVjdGlvbi5tZW1iZXJzID0gbWVtYmVycztcbiAgcmV0dXJuIHNlbGVjdGlvbjtcbn1cblxuZnVuY3Rpb24gbWFrZVNsdWcodmFsdWUpIHtcbiAgcmV0dXJuIFN0cmluZyh2YWx1ZSB8fCAnJylcbiAgICAudG9Mb3dlckNhc2UoKVxuICAgIC5yZXBsYWNlKC9bXmEtejAtOV0rL2csICctJylcbiAgICAucmVwbGFjZSgvXi18LSQvZywgJycpIHx8ICdpdGVtJztcbn1cblxuZnVuY3Rpb24gZ2V0QWJvdXROYXJyYXRpdmVVc2VkSWRzKGRvY3VtZW50KSB7XG4gIHJldHVybiBuZXcgU2V0KChkb2N1bWVudD8uc2VjdGlvbnMgfHwgW10pLmZsYXRNYXAoKHNlY3Rpb24pID0+IFtcbiAgICBzZWN0aW9uLmlkLFxuICAgIC4uLihzZWN0aW9uLnRleHQ/LmN1ZXMgfHwgW10pLm1hcCgoY3VlKSA9PiBjdWUuaWQpLFxuICAgIC4uLihzZWN0aW9uLnRleHQ/LmJsb2NrcyB8fCBbXSkubWFwKChibG9jaykgPT4gYmxvY2suaWQpLFxuICAgIC4uLihzZWN0aW9uLnRleHQ/LmRpc2NpcGxpbmVSZXZlYWwgPyBbc2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWwuaWRdIDogW10pLFxuICBdKSk7XG59XG5cbmZ1bmN0aW9uIG5leHREdXBsaWNhdGVJZChzb3VyY2VJZCwgdXNlZElkcykge1xuICBjb25zdCBiYXNlID0gbWFrZVNsdWcoc291cmNlSWQpO1xuICBsZXQgc3VmZml4ID0gMjtcbiAgbGV0IGlkID0gYCR7YmFzZX0tJHtzdWZmaXh9YDtcbiAgd2hpbGUgKHVzZWRJZHMuaGFzKGlkKSkge1xuICAgIHN1ZmZpeCArPSAxO1xuICAgIGlkID0gYCR7YmFzZX0tJHtzdWZmaXh9YDtcbiAgfVxuICB1c2VkSWRzLmFkZChpZCk7XG4gIHJldHVybiBpZDtcbn1cblxuZnVuY3Rpb24gZ2V0Q3VlRW50cmllcyh7IGRvY3VtZW50LCBwbGFuLCBtZW1iZXJzLCBwcmltYXJ5IH0pIHtcbiAgaWYgKCFkb2N1bWVudD8uc2VjdGlvbnM/Lmxlbmd0aCB8fCAhcGxhbj8udmFsaWQgfHwgIXBsYW4uc2VjdGlvbnM/Lmxlbmd0aCkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIHRleHQgdGltZWxpbmUgaXMgbm90IHJlYWR5LicgfTtcbiAgfVxuXG4gIGNvbnN0IG5vcm1hbGl6ZWRNZW1iZXJzID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHtcbiAgICAuLi4obm9ybWFsaXplQ3VlTWVtYmVyKHByaW1hcnkpIHx8IG5vcm1hbGl6ZUN1ZU1lbWJlcihtZW1iZXJzPy5bMF0pIHx8IHt9KSxcbiAgICBtZW1iZXJzLFxuICB9KTtcbiAgaWYgKCFub3JtYWxpemVkTWVtYmVycy5sZW5ndGgpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1NlbGVjdCBhdCBsZWFzdCBvbmUgdGl0bGUgQ3VlLicgfTtcbiAgfVxuXG4gIGNvbnN0IGVudHJpZXMgPSBbXTtcbiAgZm9yIChjb25zdCBtZW1iZXIgb2Ygbm9ybWFsaXplZE1lbWJlcnMpIHtcbiAgICBjb25zdCBzZWN0aW9uSW5kZXggPSBkb2N1bWVudC5zZWN0aW9ucy5maW5kSW5kZXgoKHNlY3Rpb24pID0+IHNlY3Rpb24uaWQgPT09IG1lbWJlci5zZWN0aW9uSWQpO1xuICAgIGNvbnN0IHNlY3Rpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICAgIGNvbnN0IGNvbXBpbGVkID0gcGxhbi5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtZW1iZXIuc2VjdGlvbklkKTtcbiAgICBjb25zdCBjdWVJbmRleCA9IHNlY3Rpb24/LnRleHQ/LmN1ZXM/LmZpbmRJbmRleCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbWVtYmVyLmN1ZUlkKSA/PyAtMTtcbiAgICBjb25zdCBjdWUgPSBzZWN0aW9uPy50ZXh0Py5jdWVzPy5bY3VlSW5kZXhdO1xuICAgIGlmICghc2VjdGlvbiB8fCAhY29tcGlsZWQgfHwgIWN1ZSB8fCAhKGNvbXBpbGVkLnRyYXZlbFdVID4gMCkpIHtcbiAgICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiBgVGl0bGUgQ3VlICR7bWVtYmVyLmN1ZUlkfSBpcyBubyBsb25nZXIgYXZhaWxhYmxlLmAgfTtcbiAgICB9XG4gICAgY29uc3QgaG9sZCA9IE51bWJlcihjdWUuaG9sZCk7XG4gICAgY29uc3QgYm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMoY3VlKTtcbiAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgbWVtYmVyLFxuICAgICAgc2VjdGlvbixcbiAgICAgIHNlY3Rpb25JbmRleCxcbiAgICAgIGN1ZSxcbiAgICAgIGN1ZUluZGV4LFxuICAgICAgY29tcGlsZWQsXG4gICAgICBob2xkLFxuICAgICAgYm91bmRzLFxuICAgICAgZ2xvYmFsV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShjb21waWxlZC5zdGFydFdVICsgKGhvbGQgKiBjb21waWxlZC50cmF2ZWxXVSkpLFxuICAgICAgbWluR2xvYmFsV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShjb21waWxlZC5zdGFydFdVICsgKGJvdW5kcy5taW4gKiBjb21waWxlZC50cmF2ZWxXVSkpLFxuICAgICAgbWF4R2xvYmFsV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShjb21waWxlZC5zdGFydFdVICsgKGJvdW5kcy5tYXggKiBjb21waWxlZC50cmF2ZWxXVSkpLFxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgcHJpbWFyeU1lbWJlciA9IG5vcm1hbGl6ZUN1ZU1lbWJlcihwcmltYXJ5KSB8fCBlbnRyaWVzWzBdLm1lbWJlcjtcbiAgY29uc3QgcHJpbWFyeUVudHJ5ID0gZW50cmllcy5maW5kKChlbnRyeSkgPT4gKFxuICAgIGN1ZU1lbWJlcktleShlbnRyeS5tZW1iZXIpID09PSBjdWVNZW1iZXJLZXkocHJpbWFyeU1lbWJlcilcbiAgKSkgfHwgZW50cmllc1swXTtcbiAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGVudHJpZXMsIHByaW1hcnlFbnRyeSB9O1xufVxuXG5mdW5jdGlvbiBzb3J0Q3VlRW50cmllcyhlbnRyaWVzKSB7XG4gIHJldHVybiBbLi4uZW50cmllc10uc29ydCgobGVmdCwgcmlnaHQpID0+IChcbiAgICAobGVmdC5nbG9iYWxXVSAtIHJpZ2h0Lmdsb2JhbFdVKVxuICAgIHx8IChsZWZ0LnNlY3Rpb25JbmRleCAtIHJpZ2h0LnNlY3Rpb25JbmRleClcbiAgICB8fCAobGVmdC5jdWVJbmRleCAtIHJpZ2h0LmN1ZUluZGV4KVxuICAgIHx8IGxlZnQuY3VlLmlkLmxvY2FsZUNvbXBhcmUocmlnaHQuY3VlLmlkKVxuICApKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQ3VlTW92ZShlbnRyeSwgZ2xvYmFsV1UpIHtcbiAgY29uc3QgaG9sZCA9IChOdW1iZXIoZ2xvYmFsV1UpIC0gZW50cnkuY29tcGlsZWQuc3RhcnRXVSkgLyBlbnRyeS5jb21waWxlZC50cmF2ZWxXVTtcbiAgY29uc3QgbW92ZWQgPSBtb3ZlQWJvdXROYXJyYXRpdmVDdWVUaW1pbmcoZW50cnkuY3VlLCBob2xkLCB7IHNuYXA6IGZhbHNlIH0pO1xuICByZXR1cm4ge1xuICAgIHNlY3Rpb25JZDogZW50cnkubWVtYmVyLnNlY3Rpb25JZCxcbiAgICBzZWN0aW9uSW5kZXg6IGVudHJ5LnNlY3Rpb25JbmRleCxcbiAgICBjdWVJZDogZW50cnkubWVtYmVyLmN1ZUlkLFxuICAgIGVudGVyOiBtb3ZlZC5lbnRlcixcbiAgICBob2xkOiBtb3ZlZC5ob2xkLFxuICAgIGV4aXQ6IG1vdmVkLmV4aXQsXG4gICAgc3RvcnlXVTogY2xlYW5UaW1lbGluZVZhbHVlKGVudHJ5LmNvbXBpbGVkLnN0YXJ0V1UgKyAobW92ZWQuaG9sZCAqIGVudHJ5LmNvbXBpbGVkLnRyYXZlbFdVKSksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldENhbmRpZGF0ZVZhbGlkYXRpb24oZG9jdW1lbnQpIHtcbiAgY29uc3Qgc2NoZW1hRGlhZ25vc3RpY3MgPSB2YWxpZGF0ZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoZG9jdW1lbnQpO1xuICBjb25zdCBzY2hlbWFFcnJvcnMgPSBzY2hlbWFEaWFnbm9zdGljcy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0ubGV2ZWwgPT09ICdlcnJvcicpO1xuICBpZiAoc2NoZW1hRXJyb3JzLmxlbmd0aCkge1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICByZWFzb246IHNjaGVtYUVycm9yc1swXS5tZXNzYWdlLFxuICAgICAgZGlhZ25vc3RpY3M6IHNjaGVtYURpYWdub3N0aWNzLFxuICAgIH07XG4gIH1cbiAgY29uc3QgcGxhbiA9IGNvbXBpbGVBYm91dE5hcnJhdGl2ZURvY3VtZW50KGRvY3VtZW50KTtcbiAgaWYgKCFwbGFuLnZhbGlkKSB7XG4gICAgY29uc3QgZXJyb3IgPSBwbGFuLmRpYWdub3N0aWNzLmZpbmQoKGl0ZW0pID0+IGl0ZW0ubGV2ZWwgPT09ICdlcnJvcicpO1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICByZWFzb246IGVycm9yPy5tZXNzYWdlIHx8ICdUaGUgcHJvcG9zZWQgQWJvdXQgbmFycmF0aXZlIGlzIG5vdCB2YWxpZC4nLFxuICAgICAgZGlhZ25vc3RpY3M6IHBsYW4uZGlhZ25vc3RpY3MsXG4gICAgfTtcbiAgfVxuICByZXR1cm4geyB2YWxpZDogdHJ1ZSwgZGlhZ25vc3RpY3M6IHBsYW4uZGlhZ25vc3RpY3MsIHBsYW4gfTtcbn1cblxuZnVuY3Rpb24gY29weUNhbWVyYVBvc2UodGFyZ2V0LCBzb3VyY2UpIHtcbiAgaWYgKCF0YXJnZXQgfHwgIXNvdXJjZSkgcmV0dXJuO1xuICB0YXJnZXQub2Zmc2V0ID0gWy4uLnNvdXJjZS5vZmZzZXRdO1xuICB0YXJnZXQubG9va0F0T2Zmc2V0ID0gWy4uLnNvdXJjZS5sb29rQXRPZmZzZXRdO1xuICB0YXJnZXQuZm92ID0gc291cmNlLmZvdjtcbiAgdGFyZ2V0LnJvbGwgPSBzb3VyY2Uucm9sbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFib3V0TmFycmF0aXZlRXh0ZW50RmllbGQocHJvZmlsZSkge1xuICByZXR1cm4gcHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlRXh0ZW50V1UnIDogJ2V4dGVudFdVJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhcHR1cmVBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCh7XG4gIHBsYW4sXG4gIHN0b3J5V1UsXG4gIHJlc2l6ZWRTZWN0aW9uSWQsXG59KSB7XG4gIGNvbnN0IHsgc2VjdGlvbiwgc2VjdGlvbkluZGV4LCBzdG9yeVdVOiBjbGFtcGVkU3RvcnlXVSB9ID0gZ2V0U2VjdGlvbkF0U3RvcnlXVShwbGFuLCBzdG9yeVdVKTtcbiAgY29uc3QgcmVzaXplZFNlY3Rpb25JbmRleCA9IHBsYW4/LnNlY3Rpb25zPy5maW5kSW5kZXgoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHJlc2l6ZWRTZWN0aW9uSWQpID8/IC0xO1xuICBpZiAoIXNlY3Rpb24gfHwgcmVzaXplZFNlY3Rpb25JbmRleCA8IDAgfHwgc2VjdGlvbkluZGV4IDwgcmVzaXplZFNlY3Rpb25JbmRleCkge1xuICAgIHJldHVybiB7XG4gICAgICBtb2RlOiAnYWJzb2x1dGUnLFxuICAgICAgc3RvcnlXVTogY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wZWRTdG9yeVdVIHx8IDApLFxuICAgIH07XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBtb2RlOiAnc2VjdGlvbicsXG4gICAgc3RvcnlXVTogY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wZWRTdG9yeVdVKSxcbiAgICBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsXG4gICAgbG9jYWxQcm9ncmVzczogY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKFxuICAgICAgKGNsYW1wZWRTdG9yeVdVIC0gc2VjdGlvbi5zdGFydFdVKSAvIE1hdGgubWF4KDAuMDAxLCBzZWN0aW9uLnRyYXZlbFdVKSxcbiAgICAgIDAsXG4gICAgICAxLFxuICAgICkpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVtYXBBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dChjb250ZXh0LCBwbGFuKSB7XG4gIGlmICghcGxhbj8uc2VjdGlvbnM/Lmxlbmd0aCkgcmV0dXJuIDA7XG4gIGlmIChjb250ZXh0Py5tb2RlICE9PSAnc2VjdGlvbicpIHtcbiAgICByZXR1cm4gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKE51bWJlcihjb250ZXh0Py5zdG9yeVdVKSB8fCAwLCAwLCBOdW1iZXIocGxhbi5tYXhTdG9yeVdVIHx8IDApKSk7XG4gIH1cbiAgY29uc3Qgc2VjdGlvbiA9IHBsYW4uc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gY29udGV4dC5zZWN0aW9uSWQpO1xuICBpZiAoIXNlY3Rpb24pIHtcbiAgICByZXR1cm4gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKE51bWJlcihjb250ZXh0LnN0b3J5V1UpIHx8IDAsIDAsIE51bWJlcihwbGFuLm1heFN0b3J5V1UgfHwgMCkpKTtcbiAgfVxuICByZXR1cm4gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKFxuICAgIHNlY3Rpb24uc3RhcnRXVSArIChjbGFtcChOdW1iZXIoY29udGV4dC5sb2NhbFByb2dyZXNzKSB8fCAwLCAwLCAxKSAqIHNlY3Rpb24udHJhdmVsV1UpLFxuICAgIDAsXG4gICAgTnVtYmVyKHBsYW4ubWF4U3RvcnlXVSB8fCAwKSxcbiAgKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc2VsZWN0aW9uKSB7XG4gIGNvbnN0IHByaW1hcnkgPSBub3JtYWxpemVDdWVNZW1iZXIoc2VsZWN0aW9uKTtcbiAgaWYgKCFwcmltYXJ5KSByZXR1cm4gW107XG4gIGNvbnN0IGNhbmRpZGF0ZXMgPSBBcnJheS5pc0FycmF5KHNlbGVjdGlvbi5tZW1iZXJzKSA/IHNlbGVjdGlvbi5tZW1iZXJzIDogW107XG4gIGNvbnN0IG1lbWJlcnMgPSBbXTtcbiAgY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbiAgW3ByaW1hcnksIC4uLmNhbmRpZGF0ZXNdLmZvckVhY2goKGNhbmRpZGF0ZSkgPT4ge1xuICAgIGNvbnN0IG1lbWJlciA9IG5vcm1hbGl6ZUN1ZU1lbWJlcihjYW5kaWRhdGUpO1xuICAgIGlmICghbWVtYmVyKSByZXR1cm47XG4gICAgY29uc3Qga2V5ID0gY3VlTWVtYmVyS2V5KG1lbWJlcik7XG4gICAgaWYgKHNlZW4uaGFzKGtleSkpIHJldHVybjtcbiAgICBzZWVuLmFkZChrZXkpO1xuICAgIG1lbWJlcnMucHVzaChtZW1iZXIpO1xuICB9KTtcbiAgcmV0dXJuIG1lbWJlcnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbihzZWxlY3Rpb24sIGN1ZVNlbGVjdGlvbiwge1xuICBhZGRpdGl2ZSA9IHRydWUsXG59ID0ge30pIHtcbiAgY29uc3QgdGFyZ2V0ID0gbm9ybWFsaXplQ3VlTWVtYmVyKGN1ZVNlbGVjdGlvbik7XG4gIGlmICghdGFyZ2V0KSByZXR1cm4gc2VsZWN0aW9uO1xuICBpZiAoIWFkZGl0aXZlIHx8IHNlbGVjdGlvbj8udHlwZSAhPT0gJ2N1ZScpIHJldHVybiB0YXJnZXQ7XG5cbiAgY29uc3QgdGFyZ2V0S2V5ID0gY3VlTWVtYmVyS2V5KHRhcmdldCk7XG4gIGNvbnN0IGN1cnJlbnQgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc2VsZWN0aW9uKTtcbiAgY29uc3QgdGFyZ2V0SW5kZXggPSBjdXJyZW50LmZpbmRJbmRleCgobWVtYmVyKSA9PiBjdWVNZW1iZXJLZXkobWVtYmVyKSA9PT0gdGFyZ2V0S2V5KTtcbiAgaWYgKHRhcmdldEluZGV4IDwgMCkgcmV0dXJuIG1ha2VDdWVTZWxlY3Rpb24odGFyZ2V0LCBbLi4uY3VycmVudCwgdGFyZ2V0XSk7XG4gIGlmIChjdXJyZW50Lmxlbmd0aCA9PT0gMSkgcmV0dXJuIHRhcmdldDtcblxuICBjb25zdCBtZW1iZXJzID0gY3VycmVudC5maWx0ZXIoKF8sIGluZGV4KSA9PiBpbmRleCAhPT0gdGFyZ2V0SW5kZXgpO1xuICBjb25zdCBjdXJyZW50UHJpbWFyeUtleSA9IGN1ZU1lbWJlcktleShub3JtYWxpemVDdWVNZW1iZXIoc2VsZWN0aW9uKSk7XG4gIGNvbnN0IHByaW1hcnkgPSBjdXJyZW50UHJpbWFyeUtleSA9PT0gdGFyZ2V0S2V5XG4gICAgPyBtZW1iZXJzLmF0KC0xKVxuICAgIDogbWVtYmVycy5maW5kKChtZW1iZXIpID0+IGN1ZU1lbWJlcktleShtZW1iZXIpID09PSBjdXJyZW50UHJpbWFyeUtleSkgfHwgbWVtYmVycy5hdCgtMSk7XG4gIHJldHVybiBtYWtlQ3VlU2VsZWN0aW9uKHByaW1hcnksIG1lbWJlcnMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZSh2YWx1ZSwgc3RlcCA9IEFCT1VUX05BUlJBVElWRV9USU1FTElORV9TVEVQKSB7XG4gIHJldHVybiBjbGVhblRpbWVsaW5lVmFsdWUoTWF0aC5yb3VuZChOdW1iZXIodmFsdWUpIC8gc3RlcCkgKiBzdGVwKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFib3V0TmFycmF0aXZlQ2FtZXJhS2V5VGltaW5nQm91bmRzKGtleXMsIGtleUluZGV4KSB7XG4gIGNvbnN0IGtleSA9IGtleXNba2V5SW5kZXhdO1xuICBpZiAoIWtleSkgcmV0dXJuIHsgbWluOiAwLCBtYXg6IDEsIGxvY2tlZDogdHJ1ZSB9O1xuICBpZiAoa2V5SW5kZXggPT09IDAgfHwga2V5SW5kZXggPT09IGtleXMubGVuZ3RoIC0gMSkge1xuICAgIHJldHVybiB7IG1pbjogTnVtYmVyKGtleS5hdCksIG1heDogTnVtYmVyKGtleS5hdCksIGxvY2tlZDogdHJ1ZSB9O1xuICB9XG4gIHJldHVybiB7XG4gICAgbWluOiBjbGVhblRpbWVsaW5lVmFsdWUoTnVtYmVyKGtleXNba2V5SW5kZXggLSAxXS5hdCkgKyBBQk9VVF9OQVJSQVRJVkVfVElNRUxJTkVfU1RFUCksXG4gICAgbWF4OiBjbGVhblRpbWVsaW5lVmFsdWUoTnVtYmVyKGtleXNba2V5SW5kZXggKyAxXS5hdCkgLSBBQk9VVF9OQVJSQVRJVkVfVElNRUxJTkVfU1RFUCksXG4gICAgbG9ja2VkOiBmYWxzZSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVBYm91dE5hcnJhdGl2ZUNhbWVyYUtleURyb3Aoe1xuICBkb2N1bWVudCxcbiAgcGxhbixcbiAgc291cmNlU2VjdGlvbkluZGV4LFxuICBzb3VyY2VLZXlJbmRleCxcbiAgc3RvcnlXVSxcbn0pIHtcbiAgaWYgKCFkb2N1bWVudD8uc2VjdGlvbnM/Lmxlbmd0aCB8fCAhcGxhbj8uc2VjdGlvbnM/Lmxlbmd0aCkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIGNhbWVyYSB0aW1lbGluZSBpcyBub3QgcmVhZHkuJyB9O1xuICB9XG5cbiAgY29uc3QgY2xhbXBlZFN0b3J5V1UgPSBjbGFtcChOdW1iZXIoc3RvcnlXVSksIDAsIE51bWJlcihwbGFuLm1heFN0b3J5V1UgfHwgc3RvcnlXVSkpO1xuICBsZXQgc2VjdGlvbkluZGV4ID0gcGxhbi5zZWN0aW9ucy5maW5kSW5kZXgoKHNlY3Rpb24sIGluZGV4KSA9PiB7XG4gICAgY29uc3QgbmV4dFN0YXJ0V1UgPSBwbGFuLnNlY3Rpb25zW2luZGV4ICsgMV0/LnN0YXJ0V1UgPz8gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuICAgIHJldHVybiBjbGFtcGVkU3RvcnlXVSA+PSBzZWN0aW9uLnN0YXJ0V1UgJiYgY2xhbXBlZFN0b3J5V1UgPCBuZXh0U3RhcnRXVTtcbiAgfSk7XG4gIGlmIChzZWN0aW9uSW5kZXggPCAwKSBzZWN0aW9uSW5kZXggPSBwbGFuLnNlY3Rpb25zLmxlbmd0aCAtIDE7XG5cbiAgY29uc3QgY29tcGlsZWQgPSBwbGFuLnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gIGNvbnN0IHNlY3Rpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICBpZiAoIWNvbXBpbGVkIHx8ICFzZWN0aW9uPy5jYW1lcmE/LmtleXM/Lmxlbmd0aCB8fCAhKGNvbXBpbGVkLnRyYXZlbFdVID4gMCkpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoaXMgU2VjdGlvbiBjYW5ub3QgcmVjZWl2ZSBhIGNhbWVyYSBrZXkuJyB9O1xuICB9XG5cbiAgY29uc3QgcmF3QXQgPSAoY2xhbXBlZFN0b3J5V1UgLSBjb21waWxlZC5zdGFydFdVKSAvIGNvbXBpbGVkLnRyYXZlbFdVO1xuICBjb25zdCByZXF1ZXN0ZWRBdCA9IGNsYW1wKFxuICAgIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUocmF3QXQpLFxuICAgIEFCT1VUX05BUlJBVElWRV9USU1FTElORV9TVEVQLFxuICAgIDEgLSBBQk9VVF9OQVJSQVRJVkVfVElNRUxJTkVfU1RFUCxcbiAgKTtcbiAgY29uc3QgbmVpZ2hib3VycyA9IHNlY3Rpb24uY2FtZXJhLmtleXNcbiAgICAuZmlsdGVyKChrZXksIGtleUluZGV4KSA9PiAhKHNlY3Rpb25JbmRleCA9PT0gc291cmNlU2VjdGlvbkluZGV4ICYmIGtleUluZGV4ID09PSBzb3VyY2VLZXlJbmRleCkpXG4gICAgLm1hcCgoa2V5KSA9PiBOdW1iZXIoa2V5LmF0KSlcbiAgICAuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xuICBjb25zdCBuZXh0SW5kZXggPSBuZWlnaGJvdXJzLmZpbmRJbmRleCgoYXQpID0+IGF0ID4gcmVxdWVzdGVkQXQpO1xuICBjb25zdCBpbnNlcnRpb25JbmRleCA9IG5leHRJbmRleCA8IDAgPyBuZWlnaGJvdXJzLmxlbmd0aCA6IG5leHRJbmRleDtcbiAgY29uc3QgcHJldmlvdXNBdCA9IG5laWdoYm91cnNbaW5zZXJ0aW9uSW5kZXggLSAxXSA/PyAwO1xuICBjb25zdCBuZXh0QXQgPSBuZWlnaGJvdXJzW2luc2VydGlvbkluZGV4XSA/PyAxO1xuICBjb25zdCBtaW4gPSBjbGVhblRpbWVsaW5lVmFsdWUocHJldmlvdXNBdCArIEFCT1VUX05BUlJBVElWRV9USU1FTElORV9TVEVQKTtcbiAgY29uc3QgbWF4ID0gY2xlYW5UaW1lbGluZVZhbHVlKG5leHRBdCAtIEFCT1VUX05BUlJBVElWRV9USU1FTElORV9TVEVQKTtcbiAgaWYgKG1pbiA+IG1heCkge1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICByZWFzb246IGAke3NlY3Rpb24ubGFiZWx9IGhhcyBubyBzYWZlIGdhcCBmb3IgYW5vdGhlciBjYW1lcmEga2V5IGhlcmUuYCxcbiAgICAgIHNlY3Rpb25JbmRleCxcbiAgICAgIHNlY3Rpb25JZDogc2VjdGlvbi5pZCxcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgYXQgPSBjbGVhblRpbWVsaW5lVmFsdWUoY2xhbXAocmVxdWVzdGVkQXQsIG1pbiwgbWF4KSk7XG4gIGNvbnN0IGtleUluZGV4ID0gbmVpZ2hib3Vycy5maW5kSW5kZXgoKGl0ZW0pID0+IGl0ZW0gPiBhdCk7XG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgc2VjdGlvbkluZGV4LFxuICAgIHNlY3Rpb25JZDogc2VjdGlvbi5pZCxcbiAgICBzZWN0aW9uTGFiZWw6IHNlY3Rpb24ubGFiZWwsXG4gICAga2V5SW5kZXg6IGtleUluZGV4IDwgMCA/IG5laWdoYm91cnMubGVuZ3RoIDoga2V5SW5kZXgsXG4gICAgYXQsXG4gICAgc3RvcnlXVTogY2xlYW5UaW1lbGluZVZhbHVlKGNvbXBpbGVkLnN0YXJ0V1UgKyAoYXQgKiBjb21waWxlZC50cmF2ZWxXVSkpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMoY3VlKSB7XG4gIGNvbnN0IGZvY3VzID0gTnVtYmVyKGN1ZS5ob2xkKTtcbiAgY29uc3QgbGVhZCA9IE1hdGgubWF4KDAsIGZvY3VzIC0gTnVtYmVyKGN1ZS5lbnRlcikpO1xuICBjb25zdCB0cmFpbCA9IE1hdGgubWF4KDAsIE51bWJlcihjdWUuZXhpdCkgLSBmb2N1cyk7XG4gIHJldHVybiB7XG4gICAgbWluOiBNYXRoLm1heCgwLCBsZWFkIC0gMSksXG4gICAgbWF4OiBNYXRoLm1pbigxLCAyIC0gdHJhaWwpLFxuICAgIGxlYWQsXG4gICAgdHJhaWwsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtb3ZlQWJvdXROYXJyYXRpdmVDdWVUaW1pbmcoY3VlLCBuZXh0Rm9jdXMsIHsgc25hcCA9IHRydWUgfSA9IHt9KSB7XG4gIGNvbnN0IGJvdW5kcyA9IGdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzKGN1ZSk7XG4gIGNvbnN0IHJlcXVlc3RlZEZvY3VzID0gY2xhbXAoTnVtYmVyKG5leHRGb2N1cyksIGJvdW5kcy5taW4sIGJvdW5kcy5tYXgpO1xuICBjb25zdCBob2xkID0gc25hcFxuICAgID8gc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZShyZXF1ZXN0ZWRGb2N1cylcbiAgICA6IGNsZWFuVGltZWxpbmVWYWx1ZShyZXF1ZXN0ZWRGb2N1cyk7XG4gIHJldHVybiB7XG4gICAgLi4uY3VlLFxuICAgIGVudGVyOiBjbGVhblRpbWVsaW5lVmFsdWUoaG9sZCAtIGJvdW5kcy5sZWFkKSxcbiAgICBob2xkLFxuICAgIGV4aXQ6IGNsZWFuVGltZWxpbmVWYWx1ZShob2xkICsgYm91bmRzLnRyYWlsKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwTW92ZSh7XG4gIGRvY3VtZW50LFxuICBwbGFuLFxuICBtZW1iZXJzLFxuICBwcmltYXJ5LFxuICBkZWx0YVdVLFxuICBsb2NhbERlbHRhLFxufSkge1xuICBjb25zdCByZXNvbHZlZCA9IGdldEN1ZUVudHJpZXMoeyBkb2N1bWVudCwgcGxhbiwgbWVtYmVycywgcHJpbWFyeSB9KTtcbiAgaWYgKCFyZXNvbHZlZC52YWxpZCkgcmV0dXJuIHJlc29sdmVkO1xuICBjb25zdCB7IGVudHJpZXMsIHByaW1hcnlFbnRyeSB9ID0gcmVzb2x2ZWQ7XG4gIGNvbnN0IHJlcXVlc3RlZERlbHRhV1UgPSBOdW1iZXIuaXNGaW5pdGUoTnVtYmVyKGRlbHRhV1UpKVxuICAgID8gTnVtYmVyKGRlbHRhV1UpXG4gICAgOiBOdW1iZXIobG9jYWxEZWx0YSB8fCAwKSAqIHByaW1hcnlFbnRyeS5jb21waWxlZC50cmF2ZWxXVTtcbiAgY29uc3QgbWluRGVsdGFXVSA9IE1hdGgubWF4KC4uLmVudHJpZXMubWFwKChlbnRyeSkgPT4gZW50cnkubWluR2xvYmFsV1UgLSBlbnRyeS5nbG9iYWxXVSkpO1xuICBjb25zdCBtYXhEZWx0YVdVID0gTWF0aC5taW4oLi4uZW50cmllcy5tYXAoKGVudHJ5KSA9PiBlbnRyeS5tYXhHbG9iYWxXVSAtIGVudHJ5Lmdsb2JhbFdVKSk7XG4gIGNvbnN0IGFwcGxpZWREZWx0YVdVID0gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKHJlcXVlc3RlZERlbHRhV1UsIG1pbkRlbHRhV1UsIG1heERlbHRhV1UpKTtcbiAgY29uc3QgbW92ZXMgPSBlbnRyaWVzLm1hcCgoZW50cnkpID0+IGNyZWF0ZUN1ZU1vdmUoZW50cnksIGVudHJ5Lmdsb2JhbFdVICsgYXBwbGllZERlbHRhV1UpKTtcblxuICByZXR1cm4ge1xuICAgIHZhbGlkOiB0cnVlLFxuICAgIHJlcXVlc3RlZERlbHRhV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShyZXF1ZXN0ZWREZWx0YVdVKSxcbiAgICBkZWx0YVdVOiBhcHBsaWVkRGVsdGFXVSxcbiAgICBtaW5EZWx0YVdVOiBjbGVhblRpbWVsaW5lVmFsdWUobWluRGVsdGFXVSksXG4gICAgbWF4RGVsdGFXVTogY2xlYW5UaW1lbGluZVZhbHVlKG1heERlbHRhV1UpLFxuICAgIG1vdmVzLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRGlzdHJpYnV0aW9uKHtcbiAgZG9jdW1lbnQsXG4gIHBsYW4sXG4gIG1lbWJlcnMsXG4gIHByaW1hcnksXG59KSB7XG4gIGNvbnN0IHJlc29sdmVkID0gZ2V0Q3VlRW50cmllcyh7IGRvY3VtZW50LCBwbGFuLCBtZW1iZXJzLCBwcmltYXJ5IH0pO1xuICBpZiAoIXJlc29sdmVkLnZhbGlkKSByZXR1cm4gcmVzb2x2ZWQ7XG4gIGNvbnN0IG9yZGVyZWQgPSBzb3J0Q3VlRW50cmllcyhyZXNvbHZlZC5lbnRyaWVzKTtcbiAgaWYgKG9yZGVyZWQubGVuZ3RoIDwgMikge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnU2VsZWN0IGF0IGxlYXN0IHR3byB0aXRsZSBDdWVzIHRvIGRpc3RyaWJ1dGUuJyB9O1xuICB9XG4gIGNvbnN0IGdhcFdVID0gY2xlYW5UaW1lbGluZVZhbHVlKFxuICAgIChvcmRlcmVkLmF0KC0xKS5nbG9iYWxXVSAtIG9yZGVyZWRbMF0uZ2xvYmFsV1UpIC8gKG9yZGVyZWQubGVuZ3RoIC0gMSksXG4gICk7XG4gIGNvbnN0IHJlc3VsdCA9IHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUV4YWN0R2FwKHtcbiAgICBkb2N1bWVudCxcbiAgICBwbGFuLFxuICAgIG1lbWJlcnM6IG9yZGVyZWQubWFwKChlbnRyeSkgPT4gZW50cnkubWVtYmVyKSxcbiAgICBwcmltYXJ5OiBvcmRlcmVkWzBdLm1lbWJlcixcbiAgICBnYXBXVSxcbiAgICBhbmNob3I6ICdmaXJzdCcsXG4gIH0pO1xuICByZXR1cm4ge1xuICAgIC4uLnJlc3VsdCxcbiAgICBvcGVyYXRpb246ICdkaXN0cmlidXRlJyxcbiAgICBnYXBXVSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUV4YWN0R2FwKHtcbiAgZG9jdW1lbnQsXG4gIHBsYW4sXG4gIG1lbWJlcnMsXG4gIHByaW1hcnksXG4gIGdhcFdVLFxuICBhbmNob3IgPSAncHJpbWFyeScsXG59KSB7XG4gIGNvbnN0IHJlc29sdmVkID0gZ2V0Q3VlRW50cmllcyh7IGRvY3VtZW50LCBwbGFuLCBtZW1iZXJzLCBwcmltYXJ5IH0pO1xuICBpZiAoIXJlc29sdmVkLnZhbGlkKSByZXR1cm4gcmVzb2x2ZWQ7XG4gIGNvbnN0IG9yZGVyZWQgPSBzb3J0Q3VlRW50cmllcyhyZXNvbHZlZC5lbnRyaWVzKTtcbiAgaWYgKG9yZGVyZWQubGVuZ3RoIDwgMikge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnU2VsZWN0IGF0IGxlYXN0IHR3byB0aXRsZSBDdWVzIHRvIHNldCBhIGdhcC4nIH07XG4gIH1cbiAgaWYgKCFbJ3ByaW1hcnknLCAnZmlyc3QnLCAnbGFzdCddLmluY2x1ZGVzKGFuY2hvcikpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ0Nob29zZSBQcmltYXJ5LCBGaXJzdCwgb3IgTGFzdCBhcyB0aGUgZ2FwIGFuY2hvci4nIH07XG4gIH1cblxuICBjb25zdCByZXF1ZXN0ZWRHYXBXVSA9IE51bWJlcihnYXBXVSk7XG4gIGlmICghTnVtYmVyLmlzRmluaXRlKHJlcXVlc3RlZEdhcFdVKSB8fCByZXF1ZXN0ZWRHYXBXVSA8IDApIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ0dhcCBtdXN0IGJlIGEgbm9uLW5lZ2F0aXZlIFdVIHZhbHVlLicgfTtcbiAgfVxuICBjb25zdCBhbmNob3JJbmRleCA9IGFuY2hvciA9PT0gJ2ZpcnN0J1xuICAgID8gMFxuICAgIDogYW5jaG9yID09PSAnbGFzdCdcbiAgICAgID8gb3JkZXJlZC5sZW5ndGggLSAxXG4gICAgICA6IE1hdGgubWF4KDAsIG9yZGVyZWQuZmluZEluZGV4KChlbnRyeSkgPT4gKFxuICAgICAgICBjdWVNZW1iZXJLZXkoZW50cnkubWVtYmVyKSA9PT0gY3VlTWVtYmVyS2V5KHJlc29sdmVkLnByaW1hcnlFbnRyeS5tZW1iZXIpXG4gICAgICApKSk7XG4gIGNvbnN0IGFuY2hvckVudHJ5ID0gb3JkZXJlZFthbmNob3JJbmRleF07XG4gIGNvbnN0IGFuY2hvcldVID0gYW5jaG9yRW50cnkuZ2xvYmFsV1U7XG4gIGxldCBtaW5pbXVtVmFsaWRHYXBXVSA9IDA7XG4gIGxldCBtYXhpbXVtVmFsaWRHYXBXVSA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcblxuICBvcmRlcmVkLmZvckVhY2goKGVudHJ5LCBpbmRleCkgPT4ge1xuICAgIGNvbnN0IG9mZnNldCA9IGluZGV4IC0gYW5jaG9ySW5kZXg7XG4gICAgaWYgKG9mZnNldCA+IDApIHtcbiAgICAgIG1pbmltdW1WYWxpZEdhcFdVID0gTWF0aC5tYXgobWluaW11bVZhbGlkR2FwV1UsIChlbnRyeS5taW5HbG9iYWxXVSAtIGFuY2hvcldVKSAvIG9mZnNldCk7XG4gICAgICBtYXhpbXVtVmFsaWRHYXBXVSA9IE1hdGgubWluKG1heGltdW1WYWxpZEdhcFdVLCAoZW50cnkubWF4R2xvYmFsV1UgLSBhbmNob3JXVSkgLyBvZmZzZXQpO1xuICAgIH0gZWxzZSBpZiAob2Zmc2V0IDwgMCkge1xuICAgICAgY29uc3QgZGlzdGFuY2UgPSAtb2Zmc2V0O1xuICAgICAgbWluaW11bVZhbGlkR2FwV1UgPSBNYXRoLm1heChtaW5pbXVtVmFsaWRHYXBXVSwgKGFuY2hvcldVIC0gZW50cnkubWF4R2xvYmFsV1UpIC8gZGlzdGFuY2UpO1xuICAgICAgbWF4aW11bVZhbGlkR2FwV1UgPSBNYXRoLm1pbihtYXhpbXVtVmFsaWRHYXBXVSwgKGFuY2hvcldVIC0gZW50cnkubWluR2xvYmFsV1UpIC8gZGlzdGFuY2UpO1xuICAgIH1cbiAgfSk7XG4gIG1pbmltdW1WYWxpZEdhcFdVID0gY2xlYW5UaW1lbGluZVZhbHVlKE1hdGgubWF4KDAsIG1pbmltdW1WYWxpZEdhcFdVKSk7XG4gIG1heGltdW1WYWxpZEdhcFdVID0gY2xlYW5UaW1lbGluZVZhbHVlKE1hdGgubWF4KDAsIG1heGltdW1WYWxpZEdhcFdVKSk7XG5cbiAgY29uc3QgYm91bmRhcnlEZXRhaWxzID0ge1xuICAgIHJlcXVlc3RlZEdhcFdVOiBjbGVhblRpbWVsaW5lVmFsdWUocmVxdWVzdGVkR2FwV1UpLFxuICAgIG1pbmltdW1WYWxpZEdhcFdVLFxuICAgIG1heGltdW1WYWxpZEdhcFdVLFxuICAgIGFuY2hvcixcbiAgICBhbmNob3JDdWVJZDogYW5jaG9yRW50cnkuY3VlLmlkLFxuICB9O1xuICBpZiAobWluaW11bVZhbGlkR2FwV1UgPiBtYXhpbXVtVmFsaWRHYXBXVSArIFJIWVRITV9FUFNJTE9OKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbGlkOiBmYWxzZSxcbiAgICAgIHJlYXNvbjogJ1RoZXNlIFNlY3Rpb24gYm91bmRhcmllcyBkbyBub3QgcGVybWl0IG9uZSBzaGFyZWQgQ3VlIGdhcC4nLFxuICAgICAgLi4uYm91bmRhcnlEZXRhaWxzLFxuICAgIH07XG4gIH1cbiAgaWYgKHJlcXVlc3RlZEdhcFdVID4gbWF4aW11bVZhbGlkR2FwV1UgKyBSSFlUSE1fRVBTSUxPTikge1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICByZWFzb246IGBTZWN0aW9uIGJvdW5kYXJpZXMgbGltaXQgdGhpcyBnYXAgdG8gJHttYXhpbXVtVmFsaWRHYXBXVS50b0ZpeGVkKDMpfSBXVS5gLFxuICAgICAgLi4uYm91bmRhcnlEZXRhaWxzLFxuICAgIH07XG4gIH1cbiAgaWYgKHJlcXVlc3RlZEdhcFdVIDwgbWluaW11bVZhbGlkR2FwV1UgLSBSSFlUSE1fRVBTSUxPTikge1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICByZWFzb246IGBTZWN0aW9uIGJvdW5kYXJpZXMgcmVxdWlyZSBhdCBsZWFzdCAke21pbmltdW1WYWxpZEdhcFdVLnRvRml4ZWQoMyl9IFdVLmAsXG4gICAgICAuLi5ib3VuZGFyeURldGFpbHMsXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IG1vdmVzID0gb3JkZXJlZC5tYXAoKGVudHJ5LCBpbmRleCkgPT4gKFxuICAgIGNyZWF0ZUN1ZU1vdmUoZW50cnksIGFuY2hvcldVICsgKChpbmRleCAtIGFuY2hvckluZGV4KSAqIHJlcXVlc3RlZEdhcFdVKSlcbiAgKSk7XG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgLi4uYm91bmRhcnlEZXRhaWxzLFxuICAgIG1vdmVzLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBBbGlnbih7XG4gIGRvY3VtZW50LFxuICBwbGFuLFxuICBtZW1iZXJzLFxuICBwcmltYXJ5LFxuICBwbGF5aGVhZFdVLFxufSkge1xuICBjb25zdCByZXNvbHZlZCA9IGdldEN1ZUVudHJpZXMoeyBkb2N1bWVudCwgcGxhbiwgbWVtYmVycywgcHJpbWFyeSB9KTtcbiAgaWYgKCFyZXNvbHZlZC52YWxpZCkgcmV0dXJuIHJlc29sdmVkO1xuICBpZiAoIU51bWJlci5pc0Zpbml0ZShOdW1iZXIocGxheWhlYWRXVSkpKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGUgcGxheWhlYWQgcG9zaXRpb24gaXMgbm90IGF2YWlsYWJsZS4nIH07XG4gIH1cbiAgY29uc3QgcmVxdWVzdGVkRGVsdGFXVSA9IE51bWJlcihwbGF5aGVhZFdVKSAtIHJlc29sdmVkLnByaW1hcnlFbnRyeS5nbG9iYWxXVTtcbiAgY29uc3QgcmVzdWx0ID0gcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBNb3ZlKHtcbiAgICBkb2N1bWVudCxcbiAgICBwbGFuLFxuICAgIG1lbWJlcnMsXG4gICAgcHJpbWFyeTogcmVzb2x2ZWQucHJpbWFyeUVudHJ5Lm1lbWJlcixcbiAgICBkZWx0YVdVOiByZXF1ZXN0ZWREZWx0YVdVLFxuICB9KTtcbiAgaWYgKCFyZXN1bHQudmFsaWQpIHJldHVybiByZXN1bHQ7XG4gIHJldHVybiB7XG4gICAgLi4ucmVzdWx0LFxuICAgIHBsYXloZWFkV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShOdW1iZXIocGxheWhlYWRXVSkpLFxuICAgIGFsaWduZWQ6IE1hdGguYWJzKHJlc3VsdC5kZWx0YVdVIC0gcmVxdWVzdGVkRGVsdGFXVSkgPD0gUkhZVEhNX0VQU0lMT04sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVBYm91dE5hcnJhdGl2ZUR1cGxpY2F0ZUlkKGRvY3VtZW50LCBzb3VyY2VJZCwge1xuICByZXNlcnZlZElkcyA9IFtdLFxufSA9IHt9KSB7XG4gIGNvbnN0IHVzZWRJZHMgPSBnZXRBYm91dE5hcnJhdGl2ZVVzZWRJZHMoZG9jdW1lbnQpO1xuICByZXNlcnZlZElkcy5mb3JFYWNoKChpZCkgPT4gdXNlZElkcy5hZGQoU3RyaW5nKGlkKSkpO1xuICByZXR1cm4gbmV4dER1cGxpY2F0ZUlkKHNvdXJjZUlkLCB1c2VkSWRzKTtcbn1cblxuZnVuY3Rpb24gcmVtYXBDdWVSZWZlcmVuY2UoY3VlLCBpZE1hcCkge1xuICBpZiAoIWN1ZT8uYW5jaG9yIHx8ICFpZE1hcC5oYXMoY3VlLmFuY2hvcikpIHJldHVybiBjdWU7XG4gIHJldHVybiB7IC4uLmN1ZSwgYW5jaG9yOiBpZE1hcC5nZXQoY3VlLmFuY2hvcikgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGR1cGxpY2F0ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXAoe1xuICBkb2N1bWVudCxcbiAgbWVtYmVycyxcbiAgcHJpbWFyeSxcbn0pIHtcbiAgaWYgKCFkb2N1bWVudD8uc2VjdGlvbnM/Lmxlbmd0aCkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIEFib3V0IGRvY3VtZW50IGlzIG5vdCByZWFkeS4nIH07XG4gIH1cbiAgY29uc3Qgbm9ybWFsaXplZE1lbWJlcnMgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoe1xuICAgIC4uLihub3JtYWxpemVDdWVNZW1iZXIocHJpbWFyeSkgfHwgbm9ybWFsaXplQ3VlTWVtYmVyKG1lbWJlcnM/LlswXSkgfHwge30pLFxuICAgIG1lbWJlcnMsXG4gIH0pO1xuICBpZiAoIW5vcm1hbGl6ZWRNZW1iZXJzLmxlbmd0aCkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnU2VsZWN0IGF0IGxlYXN0IG9uZSB0aXRsZSBDdWUgdG8gZHVwbGljYXRlLicgfTtcbiAgfVxuICBjb25zdCBzZWxlY3RlZEtleXMgPSBuZXcgU2V0KG5vcm1hbGl6ZWRNZW1iZXJzLm1hcChjdWVNZW1iZXJLZXkpKTtcbiAgY29uc3QgYXZhaWxhYmxlS2V5cyA9IG5ldyBTZXQoKGRvY3VtZW50LnNlY3Rpb25zIHx8IFtdKS5mbGF0TWFwKChzZWN0aW9uKSA9PiAoXG4gICAgKHNlY3Rpb24udGV4dD8uY3VlcyB8fCBbXSkubWFwKChjdWUpID0+IGAke3NlY3Rpb24uaWR9OiR7Y3VlLmlkfWApXG4gICkpKTtcbiAgY29uc3QgbWlzc2luZ01lbWJlciA9IG5vcm1hbGl6ZWRNZW1iZXJzLmZpbmQoKG1lbWJlcikgPT4gIWF2YWlsYWJsZUtleXMuaGFzKGN1ZU1lbWJlcktleShtZW1iZXIpKSk7XG4gIGlmIChtaXNzaW5nTWVtYmVyKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246IGBUaXRsZSBDdWUgJHttaXNzaW5nTWVtYmVyLmN1ZUlkfSBpcyBubyBsb25nZXIgYXZhaWxhYmxlLmAgfTtcbiAgfVxuXG4gIGNvbnN0IGNhbmRpZGF0ZSA9IGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChkb2N1bWVudCk7XG4gIGNvbnN0IHVzZWRJZHMgPSBnZXRBYm91dE5hcnJhdGl2ZVVzZWRJZHMoY2FuZGlkYXRlKTtcbiAgY29uc3QgaWRNYXAgPSBuZXcgTWFwKCk7XG4gIGNhbmRpZGF0ZS5zZWN0aW9ucy5mb3JFYWNoKChzZWN0aW9uKSA9PiB7XG4gICAgKHNlY3Rpb24udGV4dD8uY3VlcyB8fCBbXSkuZm9yRWFjaCgoY3VlKSA9PiB7XG4gICAgICBpZiAoIXNlbGVjdGVkS2V5cy5oYXMoYCR7c2VjdGlvbi5pZH06JHtjdWUuaWR9YCkpIHJldHVybjtcbiAgICAgIGlkTWFwLnNldChjdWUuaWQsIG5leHREdXBsaWNhdGVJZChjdWUuaWQsIHVzZWRJZHMpKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgY29uc3QgaXRlbXMgPSBbXTtcbiAgY2FuZGlkYXRlLnNlY3Rpb25zLmZvckVhY2goKHNlY3Rpb24pID0+IHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoc2VjdGlvbi50ZXh0Py5jdWVzKSkgcmV0dXJuO1xuICAgIHNlY3Rpb24udGV4dC5jdWVzID0gc2VjdGlvbi50ZXh0LmN1ZXMuZmxhdE1hcCgoY3VlKSA9PiB7XG4gICAgICBjb25zdCBtZW1iZXJLZXkgPSBgJHtzZWN0aW9uLmlkfToke2N1ZS5pZH1gO1xuICAgICAgaWYgKCFzZWxlY3RlZEtleXMuaGFzKG1lbWJlcktleSkpIHJldHVybiBbY3VlXTtcbiAgICAgIGNvbnN0IGR1cGxpY2F0ZSA9IHJlbWFwQ3VlUmVmZXJlbmNlKHtcbiAgICAgICAgLi4uY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KGN1ZSksXG4gICAgICAgIGlkOiBpZE1hcC5nZXQoY3VlLmlkKSxcbiAgICAgIH0sIGlkTWFwKTtcbiAgICAgIGl0ZW1zLnB1c2goe1xuICAgICAgICBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsXG4gICAgICAgIHNvdXJjZUN1ZUlkOiBjdWUuaWQsXG4gICAgICAgIGN1ZUlkOiBkdXBsaWNhdGUuaWQsXG4gICAgICAgIGN1ZTogZHVwbGljYXRlLFxuICAgICAgfSk7XG4gICAgICByZXR1cm4gW2N1ZSwgZHVwbGljYXRlXTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgY29uc3QgdmFsaWRhdGlvbiA9IGdldENhbmRpZGF0ZVZhbGlkYXRpb24oY2FuZGlkYXRlKTtcbiAgaWYgKCF2YWxpZGF0aW9uLnZhbGlkKSByZXR1cm4gdmFsaWRhdGlvbjtcbiAgY29uc3QgcHJpbWFyeU1lbWJlciA9IG5vcm1hbGl6ZUN1ZU1lbWJlcihwcmltYXJ5KSB8fCBub3JtYWxpemVkTWVtYmVyc1swXTtcbiAgY29uc3QgcHJpbWFyeUN1ZUlkID0gaWRNYXAuZ2V0KHByaW1hcnlNZW1iZXIuY3VlSWQpIHx8IGl0ZW1zWzBdLmN1ZUlkO1xuICBjb25zdCBzZWxlY3Rpb25NZW1iZXJzID0gaXRlbXMubWFwKChpdGVtKSA9PiAoe1xuICAgIHR5cGU6ICdjdWUnLFxuICAgIHNlY3Rpb25JZDogaXRlbS5zZWN0aW9uSWQsXG4gICAgY3VlSWQ6IGl0ZW0uY3VlSWQsXG4gICAga2V5UGFydDogJ2ZvY3VzJyxcbiAgfSkpO1xuICBjb25zdCBwcmltYXJ5U2VsZWN0aW9uID0gc2VsZWN0aW9uTWVtYmVycy5maW5kKChtZW1iZXIpID0+IG1lbWJlci5jdWVJZCA9PT0gcHJpbWFyeUN1ZUlkKVxuICAgIHx8IHNlbGVjdGlvbk1lbWJlcnNbMF07XG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgZG9jdW1lbnQ6IGNhbmRpZGF0ZSxcbiAgICBkaWFnbm9zdGljczogdmFsaWRhdGlvbi5kaWFnbm9zdGljcyxcbiAgICBpZE1hcDogT2JqZWN0LmZyb21FbnRyaWVzKGlkTWFwKSxcbiAgICBpdGVtcyxcbiAgICBzZWxlY3Rpb246IG1ha2VDdWVTZWxlY3Rpb24ocHJpbWFyeVNlbGVjdGlvbiwgc2VsZWN0aW9uTWVtYmVycyksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGl0Y2hBYm91dE5hcnJhdGl2ZUNhbWVyYUJvdW5kYXJpZXMoZG9jdW1lbnQsIHtcbiAgYm91bmRhcnlJbmRleGVzID0gbnVsbCxcbn0gPSB7fSkge1xuICBjb25zdCBjYW5kaWRhdGUgPSBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoZG9jdW1lbnQpO1xuICBjb25zdCByZXF1ZXN0ZWRCb3VuZGFyaWVzID0gYm91bmRhcnlJbmRleGVzID09IG51bGxcbiAgICA/IGNhbmRpZGF0ZS5zZWN0aW9ucy5tYXAoKF8sIGluZGV4KSA9PiBpbmRleCkuc2xpY2UoMSlcbiAgICA6IFsuLi5uZXcgU2V0KGJvdW5kYXJ5SW5kZXhlcy5tYXAoTnVtYmVyKSldLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiBsZWZ0IC0gcmlnaHQpO1xuICByZXF1ZXN0ZWRCb3VuZGFyaWVzLmZvckVhY2goKHNlY3Rpb25JbmRleCkgPT4ge1xuICAgIGlmICghTnVtYmVyLmlzSW50ZWdlcihzZWN0aW9uSW5kZXgpIHx8IHNlY3Rpb25JbmRleCA8PSAwIHx8IHNlY3Rpb25JbmRleCA+PSBjYW5kaWRhdGUuc2VjdGlvbnMubGVuZ3RoKSByZXR1cm47XG4gICAgY29uc3QgcHJldmlvdXNLZXkgPSBjYW5kaWRhdGUuc2VjdGlvbnNbc2VjdGlvbkluZGV4IC0gMV0/LmNhbWVyYT8ua2V5cz8uYXQoLTEpO1xuICAgIGNvbnN0IG5leHRLZXkgPSBjYW5kaWRhdGUuc2VjdGlvbnNbc2VjdGlvbkluZGV4XT8uY2FtZXJhPy5rZXlzPy5bMF07XG4gICAgY29weUNhbWVyYVBvc2UobmV4dEtleSwgcHJldmlvdXNLZXkpO1xuICB9KTtcbiAgcmV0dXJuIGNhbmRpZGF0ZTtcbn1cblxuZnVuY3Rpb24gcmVtYXBTZWN0aW9uUmVmZXJlbmNlcyh2YWx1ZSwgaWRNYXAsIGtleSA9ICcnKSB7XG4gIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkgcmV0dXJuIHZhbHVlLm1hcCgoaXRlbSkgPT4gcmVtYXBTZWN0aW9uUmVmZXJlbmNlcyhpdGVtLCBpZE1hcCwga2V5KSk7XG4gIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgIGNvbnN0IHJlZmVyZW5jZUtleSA9IGtleSA9PT0gJ2FuY2hvcicgfHwga2V5LmVuZHNXaXRoKCdJZCcpIHx8IGtleS5lbmRzV2l0aCgnUmVmJyk7XG4gICAgcmV0dXJuIHJlZmVyZW5jZUtleSAmJiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnICYmIGlkTWFwLmhhcyh2YWx1ZSlcbiAgICAgID8gaWRNYXAuZ2V0KHZhbHVlKVxuICAgICAgOiB2YWx1ZTtcbiAgfVxuICByZXR1cm4gT2JqZWN0LmZyb21FbnRyaWVzKE9iamVjdC5lbnRyaWVzKHZhbHVlKS5tYXAoKFtjaGlsZEtleSwgY2hpbGRWYWx1ZV0pID0+IFtcbiAgICBjaGlsZEtleSxcbiAgICByZW1hcFNlY3Rpb25SZWZlcmVuY2VzKGNoaWxkVmFsdWUsIGlkTWFwLCBjaGlsZEtleSksXG4gIF0pKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGR1cGxpY2F0ZUFib3V0TmFycmF0aXZlU2VjdGlvbih7XG4gIGRvY3VtZW50LFxuICBzZWN0aW9uSWQsXG59KSB7XG4gIGlmICghZG9jdW1lbnQ/LnNlY3Rpb25zPy5sZW5ndGgpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBBYm91dCBkb2N1bWVudCBpcyBub3QgcmVhZHkuJyB9O1xuICB9XG4gIGNvbnN0IHNvdXJjZUluZGV4ID0gZG9jdW1lbnQuc2VjdGlvbnMuZmluZEluZGV4KChzZWN0aW9uKSA9PiBzZWN0aW9uLmlkID09PSBzZWN0aW9uSWQpO1xuICBjb25zdCBzb3VyY2UgPSBkb2N1bWVudC5zZWN0aW9uc1tzb3VyY2VJbmRleF07XG4gIGlmICghc291cmNlKSByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogYFNlY3Rpb24gJHtzZWN0aW9uSWR9IGlzIG5vIGxvbmdlciBhdmFpbGFibGUuYCB9O1xuICBpZiAoc291cmNlLmxvY2tlZCkgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdVbmxvY2sgdGhpcyBTZWN0aW9uIGJlZm9yZSBkdXBsaWNhdGluZyBpdC4nIH07XG4gIGlmIChzb3VyY2UudHlwZSA9PT0gJ2ZpbmFsZScpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBwcm90ZWN0ZWQgZmluYWxlIGNhbm5vdCBiZSBkdXBsaWNhdGVkLicgfTtcbiAgfVxuXG4gIGNvbnN0IHVzZWRJZHMgPSBnZXRBYm91dE5hcnJhdGl2ZVVzZWRJZHMoZG9jdW1lbnQpO1xuICBjb25zdCBpZE1hcCA9IG5ldyBNYXAoKTtcbiAgaWRNYXAuc2V0KHNvdXJjZS5pZCwgbmV4dER1cGxpY2F0ZUlkKHNvdXJjZS5pZCwgdXNlZElkcykpO1xuICAoc291cmNlLnRleHQ/LmN1ZXMgfHwgW10pLmZvckVhY2goKGN1ZSkgPT4gaWRNYXAuc2V0KGN1ZS5pZCwgbmV4dER1cGxpY2F0ZUlkKGN1ZS5pZCwgdXNlZElkcykpKTtcbiAgKHNvdXJjZS50ZXh0Py5ibG9ja3MgfHwgW10pLmZvckVhY2goKGJsb2NrKSA9PiBpZE1hcC5zZXQoYmxvY2suaWQsIG5leHREdXBsaWNhdGVJZChibG9jay5pZCwgdXNlZElkcykpKTtcbiAgaWYgKHNvdXJjZS50ZXh0Py5kaXNjaXBsaW5lUmV2ZWFsKSB7XG4gICAgY29uc3QgcmV2ZWFsID0gc291cmNlLnRleHQuZGlzY2lwbGluZVJldmVhbDtcbiAgICBpZE1hcC5zZXQocmV2ZWFsLmlkLCBuZXh0RHVwbGljYXRlSWQocmV2ZWFsLmlkLCB1c2VkSWRzKSk7XG4gIH1cblxuICBsZXQgZHVwbGljYXRlID0gcmVtYXBTZWN0aW9uUmVmZXJlbmNlcyhjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoc291cmNlKSwgaWRNYXApO1xuICBkdXBsaWNhdGUuaWQgPSBpZE1hcC5nZXQoc291cmNlLmlkKTtcbiAgZHVwbGljYXRlLmxhYmVsID0gYCR7c291cmNlLmxhYmVsfSBjb3B5YDtcbiAgKGR1cGxpY2F0ZS50ZXh0Py5jdWVzIHx8IFtdKS5mb3JFYWNoKChjdWUsIGN1ZUluZGV4KSA9PiB7XG4gICAgY3VlLmlkID0gaWRNYXAuZ2V0KHNvdXJjZS50ZXh0LmN1ZXNbY3VlSW5kZXhdLmlkKTtcbiAgfSk7XG4gIChkdXBsaWNhdGUudGV4dD8uYmxvY2tzIHx8IFtdKS5mb3JFYWNoKChibG9jaywgYmxvY2tJbmRleCkgPT4ge1xuICAgIGJsb2NrLmlkID0gaWRNYXAuZ2V0KHNvdXJjZS50ZXh0LmJsb2Nrc1tibG9ja0luZGV4XS5pZCk7XG4gIH0pO1xuICBpZiAoZHVwbGljYXRlLnRleHQ/LmRpc2NpcGxpbmVSZXZlYWwpIHtcbiAgICBkdXBsaWNhdGUudGV4dC5kaXNjaXBsaW5lUmV2ZWFsLmlkID0gaWRNYXAuZ2V0KHNvdXJjZS50ZXh0LmRpc2NpcGxpbmVSZXZlYWwuaWQpO1xuICB9XG5cbiAgY29uc3QgY2FuZGlkYXRlID0gY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KGRvY3VtZW50KTtcbiAgY29uc3QgaW5zZXJ0SW5kZXggPSBzb3VyY2VJbmRleCArIDE7XG4gIGNhbmRpZGF0ZS5zZWN0aW9ucy5zcGxpY2UoaW5zZXJ0SW5kZXgsIDAsIGR1cGxpY2F0ZSk7XG4gIGNvbnN0IHN0aXRjaGVkID0gc3RpdGNoQWJvdXROYXJyYXRpdmVDYW1lcmFCb3VuZGFyaWVzKGNhbmRpZGF0ZSwge1xuICAgIGJvdW5kYXJ5SW5kZXhlczogW2luc2VydEluZGV4LCBpbnNlcnRJbmRleCArIDFdLFxuICB9KTtcbiAgZHVwbGljYXRlID0gc3RpdGNoZWQuc2VjdGlvbnNbaW5zZXJ0SW5kZXhdO1xuICBjb25zdCB2YWxpZGF0aW9uID0gZ2V0Q2FuZGlkYXRlVmFsaWRhdGlvbihzdGl0Y2hlZCk7XG4gIGlmICghdmFsaWRhdGlvbi52YWxpZCkgcmV0dXJuIHZhbGlkYXRpb247XG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgZG9jdW1lbnQ6IHN0aXRjaGVkLFxuICAgIGRpYWdub3N0aWNzOiB2YWxpZGF0aW9uLmRpYWdub3N0aWNzLFxuICAgIHNlY3Rpb246IGR1cGxpY2F0ZSxcbiAgICBzZWN0aW9uSW5kZXg6IGluc2VydEluZGV4LFxuICAgIHNvdXJjZVNlY3Rpb25JZDogc291cmNlLmlkLFxuICAgIHNlY3Rpb25JZDogZHVwbGljYXRlLmlkLFxuICAgIGlkTWFwOiBPYmplY3QuZnJvbUVudHJpZXMoaWRNYXApLFxuICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogZHVwbGljYXRlLmlkIH0sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQoe1xuICBkb2N1bWVudCxcbiAgcGxhbixcbiAgbWVtYmVycyxcbiAgcHJpbWFyeSxcbn0pIHtcbiAgY29uc3QgcmVzb2x2ZWQgPSBnZXRDdWVFbnRyaWVzKHsgZG9jdW1lbnQsIHBsYW4sIG1lbWJlcnMsIHByaW1hcnkgfSk7XG4gIGlmICghcmVzb2x2ZWQudmFsaWQpIHJldHVybiByZXNvbHZlZDtcbiAgY29uc3Qgb3JkZXJlZCA9IHNvcnRDdWVFbnRyaWVzKHJlc29sdmVkLmVudHJpZXMpO1xuICBjb25zdCBvcmlnaW5XVSA9IG9yZGVyZWRbMF0uZ2xvYmFsV1U7XG4gIHJldHVybiB7XG4gICAgdmVyc2lvbjogQUJPVVRfTkFSUkFUSVZFX0NMSVBCT0FSRF9WRVJTSU9OLFxuICAgIGtpbmQ6IEFCT1VUX05BUlJBVElWRV9DTElQQk9BUkRfS0lORCxcbiAgICBpdGVtczogb3JkZXJlZC5tYXAoKGVudHJ5KSA9PiAoe1xuICAgICAgb2Zmc2V0V1U6IGNsZWFuVGltZWxpbmVWYWx1ZShlbnRyeS5nbG9iYWxXVSAtIG9yaWdpbldVKSxcbiAgICAgIGN1ZTogY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KGVudHJ5LmN1ZSksXG4gICAgfSkpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQocGF5bG9hZCkge1xuICBpZiAoIXBheWxvYWQgfHwgdHlwZW9mIHBheWxvYWQgIT09ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkocGF5bG9hZCkpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBlZGl0b3IgY2xpcGJvYXJkIGlzIGVtcHR5IG9yIGRhbWFnZWQuJyB9O1xuICB9XG4gIGlmIChwYXlsb2FkLnZlcnNpb24gIT09IEFCT1VUX05BUlJBVElWRV9DTElQQk9BUkRfVkVSU0lPTikge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhpcyBlZGl0b3IgY2xpcGJvYXJkIHZlcnNpb24gaXMgbm90IHN1cHBvcnRlZC4nIH07XG4gIH1cbiAgaWYgKHBheWxvYWQua2luZCAhPT0gQUJPVVRfTkFSUkFUSVZFX0NMSVBCT0FSRF9LSU5EKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdPbmx5IGNvcGllZCB0aXRsZSBDdWUgZ3JvdXBzIGNhbiBiZSBwYXN0ZWQgaGVyZS4nIH07XG4gIH1cbiAgaWYgKCFBcnJheS5pc0FycmF5KHBheWxvYWQuaXRlbXMpIHx8ICFwYXlsb2FkLml0ZW1zLmxlbmd0aCB8fCBwYXlsb2FkLml0ZW1zLmxlbmd0aCA+IDEwMCkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIGNvcGllZCBDdWUgZ3JvdXAgbXVzdCBjb250YWluIGJldHdlZW4gMSBhbmQgMTAwIHRpdGxlcy4nIH07XG4gIH1cbiAgY29uc3Qgc2VlbkN1ZUlkcyA9IG5ldyBTZXQoKTtcbiAgZm9yIChjb25zdCBpdGVtIG9mIHBheWxvYWQuaXRlbXMpIHtcbiAgICBpZiAoIWl0ZW0gfHwgdHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkoaXRlbSkpIHtcbiAgICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnQSBjb3BpZWQgQ3VlIGl0ZW0gaXMgZGFtYWdlZC4nIH07XG4gICAgfVxuICAgIGNvbnN0IHVua25vd25JdGVtS2V5ID0gT2JqZWN0LmtleXMoaXRlbSkuZmluZCgoa2V5KSA9PiAhWydvZmZzZXRXVScsICdjdWUnXS5pbmNsdWRlcyhrZXkpKTtcbiAgICBpZiAodW5rbm93bkl0ZW1LZXkpIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiBgVW5rbm93biBjbGlwYm9hcmQgZmllbGQg4oCcJHt1bmtub3duSXRlbUtleX3igJ0uYCB9O1xuICAgIGlmICghTnVtYmVyLmlzRmluaXRlKE51bWJlcihpdGVtLm9mZnNldFdVKSkgfHwgTnVtYmVyKGl0ZW0ub2Zmc2V0V1UpIDwgMCkge1xuICAgICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdDb3BpZWQgQ3VlIG9mZnNldHMgbXVzdCBiZSBub24tbmVnYXRpdmUgV1UgdmFsdWVzLicgfTtcbiAgICB9XG4gICAgY29uc3QgY3VlID0gaXRlbS5jdWU7XG4gICAgaWYgKCFjdWUgfHwgdHlwZW9mIGN1ZSAhPT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShjdWUpKSB7XG4gICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ0EgY29waWVkIEN1ZSBpcyBtaXNzaW5nIGl0cyBhdXRob3JlZCB0aXRsZS4nIH07XG4gICAgfVxuICAgIGlmICghL15bYS16MC05XSsoPzotW2EtejAtOV0rKSokLy50ZXN0KGN1ZS5pZCB8fCAnJykgfHwgc2VlbkN1ZUlkcy5oYXMoY3VlLmlkKSkge1xuICAgICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdDb3BpZWQgQ3VlIElEcyBtdXN0IGJlIHVuaXF1ZSBsb3dlci1jYXNlIHNsdWdzLicgfTtcbiAgICB9XG4gICAgc2VlbkN1ZUlkcy5hZGQoY3VlLmlkKTtcbiAgICBpZiAoIWN1ZS50ZXh0Py50cmltKCkgfHwgIVtjdWUuZW50ZXIsIGN1ZS5ob2xkLCBjdWUuZXhpdF0uZXZlcnkoKHZhbHVlKSA9PiBOdW1iZXIuaXNGaW5pdGUoTnVtYmVyKHZhbHVlKSkpKSB7XG4gICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ0EgY29waWVkIEN1ZSBoYXMgaW52YWxpZCB0ZXh0IG9yIHRpbWluZy4nIH07XG4gICAgfVxuICAgIGlmIChjdWUuZW50ZXIgPiBjdWUuaG9sZCB8fCBjdWUuaG9sZCA+IGN1ZS5leGl0IHx8IGN1ZS5ob2xkIDwgMCB8fCBjdWUuaG9sZCA+IDEpIHtcbiAgICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnQSBjb3BpZWQgQ3VlIGhhcyBhbiBpbnZhbGlkIHRpbWluZyBlbnZlbG9wZS4nIH07XG4gICAgfVxuICB9XG4gIGNvbnN0IGhhc09yaWdpbiA9IHBheWxvYWQuaXRlbXMuc29tZSgoaXRlbSkgPT4gTWF0aC5hYnMoTnVtYmVyKGl0ZW0ub2Zmc2V0V1UpKSA8PSBSSFlUSE1fRVBTSUxPTik7XG4gIGlmICghaGFzT3JpZ2luKSByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBjb3BpZWQgQ3VlIGdyb3VwIGhhcyBubyB0aW1lbGluZSBvcmlnaW4uJyB9O1xuICByZXR1cm4ge1xuICAgIHZhbGlkOiB0cnVlLFxuICAgIHBheWxvYWQ6IGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChwYXlsb2FkKSxcbiAgfTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxNQUFNLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDO0FBQ3pHLE1BQU0sQ0FBQztBQUNQLENBQUMsQ0FBQywyQkFBMkI7QUFDN0IsQ0FBQyxDQUFDLDhCQUE4QjtBQUNoQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQzs7QUFFaEUsTUFBTSxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7O0FBRWxELEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQy9CLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQyxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQzs7QUFFbEQsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7O0FBRXRFLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNuQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDOztBQUVBLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckYsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGlCQUFpQjtBQUNyRixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFdBQVc7QUFDNUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0QsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3hGOztBQUVBLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUM5Qzs7QUFFQSxRQUFRLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJO0FBQy9FLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQztBQUNIOztBQUVBLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU87QUFDMUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU87QUFDckQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTO0FBQ2xCOztBQUVBLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3BDOztBQUVBLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFO0FBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztBQUM1RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMOztBQUVBLFFBQVEsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7QUFDakMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztBQUNqQixDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFDWDs7QUFFQSxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0QsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQztBQUM5RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTztBQUNYLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyRSxDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7QUFDbEcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQztBQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7QUFDL0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3RixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkUsQ0FBQyxDQUFD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TSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWTtBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVE7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSjs7QUFFQSxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRO0FBQ3BGLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDN0UsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENB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TSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3BFOztBQUVBLE1BQU0sQ0FBQyxRQUFRLENBQUMsc0NBQXNDLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdkUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7QUFDNUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNuRCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3JFLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMs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QUFDLElBQUk7QUFDTixDQUFDLENBQUMsT0FBTztBQUNULENBQUMsQ0FBQyxPQUFPO0FBQ1QsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUTtBQUN0QyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7QUFDbEQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEYsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLGtCQUFrQjtBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxRSxDQUFDLENBQUMsQ0FBQztBQUNILENB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QUMsTUFBTSxDQUFDLEtBQUssQ0FBQztBQUN0QyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRSxDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxNQUFNO0FBQ2hG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QUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ3BELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztBQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRTtBQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTO0FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQztBQUN0RCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVU7QUFDMUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztBQUMzRSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDdkUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSztBQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZO0FBQzFGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUk7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxVQUFVLENBQUMsV0FBVztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztBQUNuRSxDQUFDLENBQUMsQ0FBQztBQUNIOztBQUVBLE1BQU0sQ0FBQyxRQUFRLENBQUMsb0NBQW9DLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0QsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDO0FBQ3pELENBQUMsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNuRixDQUFDLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNO0FBQ2pILENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZFLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTO0FBQ2xCOztBQUVBLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2hHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSztBQUN2RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ2IsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMOztBQUVBLE1BQU0sQ0FBQyxRQUFRLENBQUMsOEJBQThCLENBQUM7QUFDL0MsQ0FBQyxDQUFDLFFBQVE7QUFDVixDQUFDLENBQUMsU0FBUztBQUNYLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkUsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUN4RixDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUM7QUFDL0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlGLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pGLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDO0FBQ3BELENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDM0QsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNqRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ3pHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3RCxDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ3BGLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7QUFDckMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDMUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFELENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzNELENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztBQUNuRixDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQztBQUN6RCxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDdEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLG9DQUFvQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ25FLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUM7QUFDNUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQztBQUNyRCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVU7QUFDMUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSTtBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUTtBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLFdBQVc7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRTtBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUMzRCxDQUFDLENBQUMsQ0FBQztBQUNIOztBQUVBLE1BQU0sQ0FBQyxRQUFRLENBQUMsdUNBQXVDLENBQUM7QUFDeEQsQ0FBQyxDQUFDLFFBQVE7QUFDVixDQUFDLENBQUMsSUFBSTtBQUNOLENBQUMsQ0FBQyxPQUFPO0FBQ1QsQ0FBQyxDQUFDLE9BQU87QUFDVCxDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDdEUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRO0FBQ3RDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztBQUNsRCxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDdEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsaUNBQWlDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsOEJBQThCO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQzdELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7QUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDO0FBQ0g7O0FBRUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyx5Q0FBeUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNuRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ3pFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRixDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7QUFDN0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RGLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RixDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM1RixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xHLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNsRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDOUYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNGLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQy9ELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BGLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3BGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoSCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JGLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUM7QUFDbkcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakcsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSTtBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsMkJBQTJCLENBQUMsT0FBTyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxDQUFDO0FBQ0g7In0=