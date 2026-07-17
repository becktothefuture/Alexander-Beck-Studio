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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFib3V0TmFycmF0aXZlVGltZWxpbmUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY29tcGlsZUFib3V0TmFycmF0aXZlRG9jdW1lbnQgfSBmcm9tIFwiL3NyYy9yb3V0ZXMvYWJvdXQtbmFycmF0aXZlLWxhYi9hYm91dE5hcnJhdGl2ZUNvbXBpbGVyLmpzXCI7XG5pbXBvcnQge1xuICBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG4gIHZhbGlkYXRlQWJvdXROYXJyYXRpdmVEb2N1bWVudCxcbn0gZnJvbSBcIi9zcmMvcm91dGVzL2Fib3V0LW5hcnJhdGl2ZS1sYWIvYWJvdXROYXJyYXRpdmVTY2hlbWEuanNcIjtcblxuZXhwb3J0IGNvbnN0IEFCT1VUX05BUlJBVElWRV9USU1FTElORV9TVEVQID0gMC4wMDU7XG5cbmNvbnN0IFJIWVRITV9FUFNJTE9OID0gMC4wMDAwMDE7XG5jb25zdCBBQk9VVF9OQVJSQVRJVkVfQ0xJUEJPQVJEX1ZFUlNJT04gPSAxO1xuY29uc3QgQUJPVVRfTkFSUkFUSVZFX0NMSVBCT0FSRF9LSU5EID0gJ2N1ZS1ncm91cCc7XG5cbmNvbnN0IGNsYW1wID0gKHZhbHVlLCBtaW4sIG1heCkgPT4gTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIHZhbHVlKSk7XG5cbmZ1bmN0aW9uIGNsZWFuVGltZWxpbmVWYWx1ZSh2YWx1ZSkge1xuICByZXR1cm4gTnVtYmVyKE51bWJlcih2YWx1ZSkudG9GaXhlZCg2KSk7XG59XG5cbmZ1bmN0aW9uIGdldFNlY3Rpb25BdFN0b3J5V1UocGxhbiwgc3RvcnlXVSkge1xuICBpZiAoIXBsYW4/LnNlY3Rpb25zPy5sZW5ndGgpIHJldHVybiB7IHNlY3Rpb246IG51bGwsIHNlY3Rpb25JbmRleDogLTEgfTtcbiAgY29uc3QgY2xhbXBlZFN0b3J5V1UgPSBjbGFtcChOdW1iZXIoc3RvcnlXVSkgfHwgMCwgMCwgTnVtYmVyKHBsYW4ubWF4U3RvcnlXVSB8fCAwKSk7XG4gIGxldCBzZWN0aW9uSW5kZXggPSBwbGFuLnNlY3Rpb25zLmZpbmRJbmRleCgoc2VjdGlvbiwgaW5kZXgpID0+IHtcbiAgICBjb25zdCBuZXh0U3RhcnRXVSA9IHBsYW4uc2VjdGlvbnNbaW5kZXggKyAxXT8uc3RhcnRXVSA/PyBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG4gICAgcmV0dXJuIGNsYW1wZWRTdG9yeVdVID49IHNlY3Rpb24uc3RhcnRXVSAmJiBjbGFtcGVkU3RvcnlXVSA8IG5leHRTdGFydFdVO1xuICB9KTtcbiAgaWYgKHNlY3Rpb25JbmRleCA8IDApIHNlY3Rpb25JbmRleCA9IHBsYW4uc2VjdGlvbnMubGVuZ3RoIC0gMTtcbiAgcmV0dXJuIHsgc2VjdGlvbjogcGxhbi5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLCBzZWN0aW9uSW5kZXgsIHN0b3J5V1U6IGNsYW1wZWRTdG9yeVdVIH07XG59XG5cbmZ1bmN0aW9uIGN1ZU1lbWJlcktleShtZW1iZXIpIHtcbiAgcmV0dXJuIGAke21lbWJlci5zZWN0aW9uSWR9OiR7bWVtYmVyLmN1ZUlkfWA7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUN1ZU1lbWJlcihtZW1iZXIpIHtcbiAgaWYgKG1lbWJlcj8udHlwZSAhPT0gJ2N1ZScgfHwgIW1lbWJlci5zZWN0aW9uSWQgfHwgIW1lbWJlci5jdWVJZCkgcmV0dXJuIG51bGw7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ2N1ZScsXG4gICAgc2VjdGlvbklkOiBtZW1iZXIuc2VjdGlvbklkLFxuICAgIGN1ZUlkOiBtZW1iZXIuY3VlSWQsXG4gICAga2V5UGFydDogbWVtYmVyLmtleVBhcnQgfHwgJ2ZvY3VzJyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWFrZUN1ZVNlbGVjdGlvbihwcmltYXJ5LCBtZW1iZXJzKSB7XG4gIGNvbnN0IHNlbGVjdGlvbiA9IHsgLi4ucHJpbWFyeSB9O1xuICBkZWxldGUgc2VsZWN0aW9uLm1lbWJlcnM7XG4gIGlmIChtZW1iZXJzLmxlbmd0aCA+IDEpIHNlbGVjdGlvbi5tZW1iZXJzID0gbWVtYmVycztcbiAgcmV0dXJuIHNlbGVjdGlvbjtcbn1cblxuZnVuY3Rpb24gbWFrZVNsdWcodmFsdWUpIHtcbiAgcmV0dXJuIFN0cmluZyh2YWx1ZSB8fCAnJylcbiAgICAudG9Mb3dlckNhc2UoKVxuICAgIC5yZXBsYWNlKC9bXmEtejAtOV0rL2csICctJylcbiAgICAucmVwbGFjZSgvXi18LSQvZywgJycpIHx8ICdpdGVtJztcbn1cblxuZnVuY3Rpb24gZ2V0QWJvdXROYXJyYXRpdmVVc2VkSWRzKGRvY3VtZW50KSB7XG4gIHJldHVybiBuZXcgU2V0KChkb2N1bWVudD8uc2VjdGlvbnMgfHwgW10pLmZsYXRNYXAoKHNlY3Rpb24pID0+IFtcbiAgICBzZWN0aW9uLmlkLFxuICAgIC4uLihzZWN0aW9uLnRleHQ/LmN1ZXMgfHwgW10pLm1hcCgoY3VlKSA9PiBjdWUuaWQpLFxuICAgIC4uLihzZWN0aW9uLnRleHQ/LmJsb2NrcyB8fCBbXSkubWFwKChibG9jaykgPT4gYmxvY2suaWQpLFxuICAgIC4uLihzZWN0aW9uLnRleHQ/LmRpc2NpcGxpbmVSZXZlYWwgPyBbc2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWwuaWRdIDogW10pLFxuICBdKSk7XG59XG5cbmZ1bmN0aW9uIG5leHREdXBsaWNhdGVJZChzb3VyY2VJZCwgdXNlZElkcykge1xuICBjb25zdCBiYXNlID0gbWFrZVNsdWcoc291cmNlSWQpO1xuICBsZXQgc3VmZml4ID0gMjtcbiAgbGV0IGlkID0gYCR7YmFzZX0tJHtzdWZmaXh9YDtcbiAgd2hpbGUgKHVzZWRJZHMuaGFzKGlkKSkge1xuICAgIHN1ZmZpeCArPSAxO1xuICAgIGlkID0gYCR7YmFzZX0tJHtzdWZmaXh9YDtcbiAgfVxuICB1c2VkSWRzLmFkZChpZCk7XG4gIHJldHVybiBpZDtcbn1cblxuZnVuY3Rpb24gZ2V0Q3VlRW50cmllcyh7IGRvY3VtZW50LCBwbGFuLCBtZW1iZXJzLCBwcmltYXJ5IH0pIHtcbiAgaWYgKCFkb2N1bWVudD8uc2VjdGlvbnM/Lmxlbmd0aCB8fCAhcGxhbj8udmFsaWQgfHwgIXBsYW4uc2VjdGlvbnM/Lmxlbmd0aCkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIHRleHQgdGltZWxpbmUgaXMgbm90IHJlYWR5LicgfTtcbiAgfVxuXG4gIGNvbnN0IG5vcm1hbGl6ZWRNZW1iZXJzID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHtcbiAgICAuLi4obm9ybWFsaXplQ3VlTWVtYmVyKHByaW1hcnkpIHx8IG5vcm1hbGl6ZUN1ZU1lbWJlcihtZW1iZXJzPy5bMF0pIHx8IHt9KSxcbiAgICBtZW1iZXJzLFxuICB9KTtcbiAgaWYgKCFub3JtYWxpemVkTWVtYmVycy5sZW5ndGgpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1NlbGVjdCBhdCBsZWFzdCBvbmUgdGl0bGUgQ3VlLicgfTtcbiAgfVxuXG4gIGNvbnN0IGVudHJpZXMgPSBbXTtcbiAgZm9yIChjb25zdCBtZW1iZXIgb2Ygbm9ybWFsaXplZE1lbWJlcnMpIHtcbiAgICBjb25zdCBzZWN0aW9uSW5kZXggPSBkb2N1bWVudC5zZWN0aW9ucy5maW5kSW5kZXgoKHNlY3Rpb24pID0+IHNlY3Rpb24uaWQgPT09IG1lbWJlci5zZWN0aW9uSWQpO1xuICAgIGNvbnN0IHNlY3Rpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICAgIGNvbnN0IGNvbXBpbGVkID0gcGxhbi5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtZW1iZXIuc2VjdGlvbklkKTtcbiAgICBjb25zdCBjdWVJbmRleCA9IHNlY3Rpb24/LnRleHQ/LmN1ZXM/LmZpbmRJbmRleCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbWVtYmVyLmN1ZUlkKSA/PyAtMTtcbiAgICBjb25zdCBjdWUgPSBzZWN0aW9uPy50ZXh0Py5jdWVzPy5bY3VlSW5kZXhdO1xuICAgIGlmICghc2VjdGlvbiB8fCAhY29tcGlsZWQgfHwgIWN1ZSB8fCAhKGNvbXBpbGVkLnRyYXZlbFdVID4gMCkpIHtcbiAgICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiBgVGl0bGUgQ3VlICR7bWVtYmVyLmN1ZUlkfSBpcyBubyBsb25nZXIgYXZhaWxhYmxlLmAgfTtcbiAgICB9XG4gICAgY29uc3QgaG9sZCA9IE51bWJlcihjdWUuaG9sZCk7XG4gICAgY29uc3QgYm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMoY3VlKTtcbiAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgbWVtYmVyLFxuICAgICAgc2VjdGlvbixcbiAgICAgIHNlY3Rpb25JbmRleCxcbiAgICAgIGN1ZSxcbiAgICAgIGN1ZUluZGV4LFxuICAgICAgY29tcGlsZWQsXG4gICAgICBob2xkLFxuICAgICAgYm91bmRzLFxuICAgICAgZ2xvYmFsV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShjb21waWxlZC5zdGFydFdVICsgKGhvbGQgKiBjb21waWxlZC50cmF2ZWxXVSkpLFxuICAgICAgbWluR2xvYmFsV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShjb21waWxlZC5zdGFydFdVICsgKGJvdW5kcy5taW4gKiBjb21waWxlZC50cmF2ZWxXVSkpLFxuICAgICAgbWF4R2xvYmFsV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShjb21waWxlZC5zdGFydFdVICsgKGJvdW5kcy5tYXggKiBjb21waWxlZC50cmF2ZWxXVSkpLFxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgcHJpbWFyeU1lbWJlciA9IG5vcm1hbGl6ZUN1ZU1lbWJlcihwcmltYXJ5KSB8fCBlbnRyaWVzWzBdLm1lbWJlcjtcbiAgY29uc3QgcHJpbWFyeUVudHJ5ID0gZW50cmllcy5maW5kKChlbnRyeSkgPT4gKFxuICAgIGN1ZU1lbWJlcktleShlbnRyeS5tZW1iZXIpID09PSBjdWVNZW1iZXJLZXkocHJpbWFyeU1lbWJlcilcbiAgKSkgfHwgZW50cmllc1swXTtcbiAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGVudHJpZXMsIHByaW1hcnlFbnRyeSB9O1xufVxuXG5mdW5jdGlvbiBzb3J0Q3VlRW50cmllcyhlbnRyaWVzKSB7XG4gIHJldHVybiBbLi4uZW50cmllc10uc29ydCgobGVmdCwgcmlnaHQpID0+IChcbiAgICAobGVmdC5nbG9iYWxXVSAtIHJpZ2h0Lmdsb2JhbFdVKVxuICAgIHx8IChsZWZ0LnNlY3Rpb25JbmRleCAtIHJpZ2h0LnNlY3Rpb25JbmRleClcbiAgICB8fCAobGVmdC5jdWVJbmRleCAtIHJpZ2h0LmN1ZUluZGV4KVxuICAgIHx8IGxlZnQuY3VlLmlkLmxvY2FsZUNvbXBhcmUocmlnaHQuY3VlLmlkKVxuICApKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQ3VlTW92ZShlbnRyeSwgZ2xvYmFsV1UpIHtcbiAgY29uc3QgaG9sZCA9IChOdW1iZXIoZ2xvYmFsV1UpIC0gZW50cnkuY29tcGlsZWQuc3RhcnRXVSkgLyBlbnRyeS5jb21waWxlZC50cmF2ZWxXVTtcbiAgY29uc3QgbW92ZWQgPSBtb3ZlQWJvdXROYXJyYXRpdmVDdWVUaW1pbmcoZW50cnkuY3VlLCBob2xkLCB7IHNuYXA6IGZhbHNlIH0pO1xuICByZXR1cm4ge1xuICAgIHNlY3Rpb25JZDogZW50cnkubWVtYmVyLnNlY3Rpb25JZCxcbiAgICBzZWN0aW9uSW5kZXg6IGVudHJ5LnNlY3Rpb25JbmRleCxcbiAgICBjdWVJZDogZW50cnkubWVtYmVyLmN1ZUlkLFxuICAgIGVudGVyOiBtb3ZlZC5lbnRlcixcbiAgICBob2xkOiBtb3ZlZC5ob2xkLFxuICAgIGV4aXQ6IG1vdmVkLmV4aXQsXG4gICAgc3RvcnlXVTogY2xlYW5UaW1lbGluZVZhbHVlKGVudHJ5LmNvbXBpbGVkLnN0YXJ0V1UgKyAobW92ZWQuaG9sZCAqIGVudHJ5LmNvbXBpbGVkLnRyYXZlbFdVKSksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldENhbmRpZGF0ZVZhbGlkYXRpb24oZG9jdW1lbnQpIHtcbiAgY29uc3Qgc2NoZW1hRGlhZ25vc3RpY3MgPSB2YWxpZGF0ZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoZG9jdW1lbnQpO1xuICBjb25zdCBzY2hlbWFFcnJvcnMgPSBzY2hlbWFEaWFnbm9zdGljcy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0ubGV2ZWwgPT09ICdlcnJvcicpO1xuICBpZiAoc2NoZW1hRXJyb3JzLmxlbmd0aCkge1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICByZWFzb246IHNjaGVtYUVycm9yc1swXS5tZXNzYWdlLFxuICAgICAgZGlhZ25vc3RpY3M6IHNjaGVtYURpYWdub3N0aWNzLFxuICAgIH07XG4gIH1cbiAgY29uc3QgcGxhbiA9IGNvbXBpbGVBYm91dE5hcnJhdGl2ZURvY3VtZW50KGRvY3VtZW50KTtcbiAgaWYgKCFwbGFuLnZhbGlkKSB7XG4gICAgY29uc3QgZXJyb3IgPSBwbGFuLmRpYWdub3N0aWNzLmZpbmQoKGl0ZW0pID0+IGl0ZW0ubGV2ZWwgPT09ICdlcnJvcicpO1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICByZWFzb246IGVycm9yPy5tZXNzYWdlIHx8ICdUaGUgcHJvcG9zZWQgQWJvdXQgbmFycmF0aXZlIGlzIG5vdCB2YWxpZC4nLFxuICAgICAgZGlhZ25vc3RpY3M6IHBsYW4uZGlhZ25vc3RpY3MsXG4gICAgfTtcbiAgfVxuICByZXR1cm4geyB2YWxpZDogdHJ1ZSwgZGlhZ25vc3RpY3M6IHBsYW4uZGlhZ25vc3RpY3MsIHBsYW4gfTtcbn1cblxuZnVuY3Rpb24gY29weUNhbWVyYVBvc2UodGFyZ2V0LCBzb3VyY2UpIHtcbiAgaWYgKCF0YXJnZXQgfHwgIXNvdXJjZSkgcmV0dXJuO1xuICB0YXJnZXQub2Zmc2V0ID0gWy4uLnNvdXJjZS5vZmZzZXRdO1xuICB0YXJnZXQubG9va0F0T2Zmc2V0ID0gWy4uLnNvdXJjZS5sb29rQXRPZmZzZXRdO1xuICB0YXJnZXQuZm92ID0gc291cmNlLmZvdjtcbiAgdGFyZ2V0LnJvbGwgPSBzb3VyY2Uucm9sbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFib3V0TmFycmF0aXZlRXh0ZW50RmllbGQocHJvZmlsZSkge1xuICByZXR1cm4gcHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlRXh0ZW50V1UnIDogJ2V4dGVudFdVJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhcHR1cmVBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCh7XG4gIHBsYW4sXG4gIHN0b3J5V1UsXG4gIHJlc2l6ZWRTZWN0aW9uSWQsXG59KSB7XG4gIGNvbnN0IHsgc2VjdGlvbiwgc2VjdGlvbkluZGV4LCBzdG9yeVdVOiBjbGFtcGVkU3RvcnlXVSB9ID0gZ2V0U2VjdGlvbkF0U3RvcnlXVShwbGFuLCBzdG9yeVdVKTtcbiAgY29uc3QgcmVzaXplZFNlY3Rpb25JbmRleCA9IHBsYW4/LnNlY3Rpb25zPy5maW5kSW5kZXgoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHJlc2l6ZWRTZWN0aW9uSWQpID8/IC0xO1xuICBpZiAoIXNlY3Rpb24gfHwgcmVzaXplZFNlY3Rpb25JbmRleCA8IDAgfHwgc2VjdGlvbkluZGV4IDwgcmVzaXplZFNlY3Rpb25JbmRleCkge1xuICAgIHJldHVybiB7XG4gICAgICBtb2RlOiAnYWJzb2x1dGUnLFxuICAgICAgc3RvcnlXVTogY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wZWRTdG9yeVdVIHx8IDApLFxuICAgIH07XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBtb2RlOiAnc2VjdGlvbicsXG4gICAgc3RvcnlXVTogY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wZWRTdG9yeVdVKSxcbiAgICBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsXG4gICAgbG9jYWxQcm9ncmVzczogY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKFxuICAgICAgKGNsYW1wZWRTdG9yeVdVIC0gc2VjdGlvbi5zdGFydFdVKSAvIE1hdGgubWF4KDAuMDAxLCBzZWN0aW9uLnRyYXZlbFdVKSxcbiAgICAgIDAsXG4gICAgICAxLFxuICAgICkpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVtYXBBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dChjb250ZXh0LCBwbGFuKSB7XG4gIGlmICghcGxhbj8uc2VjdGlvbnM/Lmxlbmd0aCkgcmV0dXJuIDA7XG4gIGlmIChjb250ZXh0Py5tb2RlICE9PSAnc2VjdGlvbicpIHtcbiAgICByZXR1cm4gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKE51bWJlcihjb250ZXh0Py5zdG9yeVdVKSB8fCAwLCAwLCBOdW1iZXIocGxhbi5tYXhTdG9yeVdVIHx8IDApKSk7XG4gIH1cbiAgY29uc3Qgc2VjdGlvbiA9IHBsYW4uc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gY29udGV4dC5zZWN0aW9uSWQpO1xuICBpZiAoIXNlY3Rpb24pIHtcbiAgICByZXR1cm4gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKE51bWJlcihjb250ZXh0LnN0b3J5V1UpIHx8IDAsIDAsIE51bWJlcihwbGFuLm1heFN0b3J5V1UgfHwgMCkpKTtcbiAgfVxuICByZXR1cm4gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKFxuICAgIHNlY3Rpb24uc3RhcnRXVSArIChjbGFtcChOdW1iZXIoY29udGV4dC5sb2NhbFByb2dyZXNzKSB8fCAwLCAwLCAxKSAqIHNlY3Rpb24udHJhdmVsV1UpLFxuICAgIDAsXG4gICAgTnVtYmVyKHBsYW4ubWF4U3RvcnlXVSB8fCAwKSxcbiAgKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc2VsZWN0aW9uKSB7XG4gIGNvbnN0IHByaW1hcnkgPSBub3JtYWxpemVDdWVNZW1iZXIoc2VsZWN0aW9uKTtcbiAgaWYgKCFwcmltYXJ5KSByZXR1cm4gW107XG4gIGNvbnN0IGNhbmRpZGF0ZXMgPSBBcnJheS5pc0FycmF5KHNlbGVjdGlvbi5tZW1iZXJzKSA/IHNlbGVjdGlvbi5tZW1iZXJzIDogW107XG4gIGNvbnN0IG1lbWJlcnMgPSBbXTtcbiAgY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbiAgW3ByaW1hcnksIC4uLmNhbmRpZGF0ZXNdLmZvckVhY2goKGNhbmRpZGF0ZSkgPT4ge1xuICAgIGNvbnN0IG1lbWJlciA9IG5vcm1hbGl6ZUN1ZU1lbWJlcihjYW5kaWRhdGUpO1xuICAgIGlmICghbWVtYmVyKSByZXR1cm47XG4gICAgY29uc3Qga2V5ID0gY3VlTWVtYmVyS2V5KG1lbWJlcik7XG4gICAgaWYgKHNlZW4uaGFzKGtleSkpIHJldHVybjtcbiAgICBzZWVuLmFkZChrZXkpO1xuICAgIG1lbWJlcnMucHVzaChtZW1iZXIpO1xuICB9KTtcbiAgcmV0dXJuIG1lbWJlcnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbihzZWxlY3Rpb24sIGN1ZVNlbGVjdGlvbiwge1xuICBhZGRpdGl2ZSA9IHRydWUsXG59ID0ge30pIHtcbiAgY29uc3QgdGFyZ2V0ID0gbm9ybWFsaXplQ3VlTWVtYmVyKGN1ZVNlbGVjdGlvbik7XG4gIGlmICghdGFyZ2V0KSByZXR1cm4gc2VsZWN0aW9uO1xuICBpZiAoIWFkZGl0aXZlIHx8IHNlbGVjdGlvbj8udHlwZSAhPT0gJ2N1ZScpIHJldHVybiB0YXJnZXQ7XG5cbiAgY29uc3QgdGFyZ2V0S2V5ID0gY3VlTWVtYmVyS2V5KHRhcmdldCk7XG4gIGNvbnN0IGN1cnJlbnQgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc2VsZWN0aW9uKTtcbiAgY29uc3QgdGFyZ2V0SW5kZXggPSBjdXJyZW50LmZpbmRJbmRleCgobWVtYmVyKSA9PiBjdWVNZW1iZXJLZXkobWVtYmVyKSA9PT0gdGFyZ2V0S2V5KTtcbiAgaWYgKHRhcmdldEluZGV4IDwgMCkgcmV0dXJuIG1ha2VDdWVTZWxlY3Rpb24odGFyZ2V0LCBbLi4uY3VycmVudCwgdGFyZ2V0XSk7XG4gIGlmIChjdXJyZW50Lmxlbmd0aCA9PT0gMSkgcmV0dXJuIHRhcmdldDtcblxuICBjb25zdCBtZW1iZXJzID0gY3VycmVudC5maWx0ZXIoKF8sIGluZGV4KSA9PiBpbmRleCAhPT0gdGFyZ2V0SW5kZXgpO1xuICBjb25zdCBjdXJyZW50UHJpbWFyeUtleSA9IGN1ZU1lbWJlcktleShub3JtYWxpemVDdWVNZW1iZXIoc2VsZWN0aW9uKSk7XG4gIGNvbnN0IHByaW1hcnkgPSBjdXJyZW50UHJpbWFyeUtleSA9PT0gdGFyZ2V0S2V5XG4gICAgPyBtZW1iZXJzLmF0KC0xKVxuICAgIDogbWVtYmVycy5maW5kKChtZW1iZXIpID0+IGN1ZU1lbWJlcktleShtZW1iZXIpID09PSBjdXJyZW50UHJpbWFyeUtleSkgfHwgbWVtYmVycy5hdCgtMSk7XG4gIHJldHVybiBtYWtlQ3VlU2VsZWN0aW9uKHByaW1hcnksIG1lbWJlcnMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZSh2YWx1ZSwgc3RlcCA9IEFCT1VUX05BUlJBVElWRV9USU1FTElORV9TVEVQKSB7XG4gIHJldHVybiBjbGVhblRpbWVsaW5lVmFsdWUoTWF0aC5yb3VuZChOdW1iZXIodmFsdWUpIC8gc3RlcCkgKiBzdGVwKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFib3V0TmFycmF0aXZlQ2FtZXJhS2V5VGltaW5nQm91bmRzKGtleXMsIGtleUluZGV4KSB7XG4gIGNvbnN0IGtleSA9IGtleXNba2V5SW5kZXhdO1xuICBpZiAoIWtleSkgcmV0dXJuIHsgbWluOiAwLCBtYXg6IDEsIGxvY2tlZDogdHJ1ZSB9O1xuICBpZiAoa2V5SW5kZXggPT09IDAgfHwga2V5SW5kZXggPT09IGtleXMubGVuZ3RoIC0gMSkge1xuICAgIHJldHVybiB7IG1pbjogTnVtYmVyKGtleS5hdCksIG1heDogTnVtYmVyKGtleS5hdCksIGxvY2tlZDogdHJ1ZSB9O1xuICB9XG4gIHJldHVybiB7XG4gICAgbWluOiBjbGVhblRpbWVsaW5lVmFsdWUoTnVtYmVyKGtleXNba2V5SW5kZXggLSAxXS5hdCkgKyBBQk9VVF9OQVJSQVRJVkVfVElNRUxJTkVfU1RFUCksXG4gICAgbWF4OiBjbGVhblRpbWVsaW5lVmFsdWUoTnVtYmVyKGtleXNba2V5SW5kZXggKyAxXS5hdCkgLSBBQk9VVF9OQVJSQVRJVkVfVElNRUxJTkVfU1RFUCksXG4gICAgbG9ja2VkOiBmYWxzZSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVBYm91dE5hcnJhdGl2ZUNhbWVyYUtleURyb3Aoe1xuICBkb2N1bWVudCxcbiAgcGxhbixcbiAgc291cmNlU2VjdGlvbkluZGV4LFxuICBzb3VyY2VLZXlJbmRleCxcbiAgc3RvcnlXVSxcbn0pIHtcbiAgaWYgKCFkb2N1bWVudD8uc2VjdGlvbnM/Lmxlbmd0aCB8fCAhcGxhbj8uc2VjdGlvbnM/Lmxlbmd0aCkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIGNhbWVyYSB0aW1lbGluZSBpcyBub3QgcmVhZHkuJyB9O1xuICB9XG5cbiAgY29uc3QgY2xhbXBlZFN0b3J5V1UgPSBjbGFtcChOdW1iZXIoc3RvcnlXVSksIDAsIE51bWJlcihwbGFuLm1heFN0b3J5V1UgfHwgc3RvcnlXVSkpO1xuICBsZXQgc2VjdGlvbkluZGV4ID0gcGxhbi5zZWN0aW9ucy5maW5kSW5kZXgoKHNlY3Rpb24sIGluZGV4KSA9PiB7XG4gICAgY29uc3QgbmV4dFN0YXJ0V1UgPSBwbGFuLnNlY3Rpb25zW2luZGV4ICsgMV0/LnN0YXJ0V1UgPz8gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuICAgIHJldHVybiBjbGFtcGVkU3RvcnlXVSA+PSBzZWN0aW9uLnN0YXJ0V1UgJiYgY2xhbXBlZFN0b3J5V1UgPCBuZXh0U3RhcnRXVTtcbiAgfSk7XG4gIGlmIChzZWN0aW9uSW5kZXggPCAwKSBzZWN0aW9uSW5kZXggPSBwbGFuLnNlY3Rpb25zLmxlbmd0aCAtIDE7XG5cbiAgY29uc3QgY29tcGlsZWQgPSBwbGFuLnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gIGNvbnN0IHNlY3Rpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICBpZiAoIWNvbXBpbGVkIHx8ICFzZWN0aW9uPy5jYW1lcmE/LmtleXM/Lmxlbmd0aCB8fCAhKGNvbXBpbGVkLnRyYXZlbFdVID4gMCkpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoaXMgU2VjdGlvbiBjYW5ub3QgcmVjZWl2ZSBhIGNhbWVyYSBrZXkuJyB9O1xuICB9XG5cbiAgY29uc3QgcmF3QXQgPSAoY2xhbXBlZFN0b3J5V1UgLSBjb21waWxlZC5zdGFydFdVKSAvIGNvbXBpbGVkLnRyYXZlbFdVO1xuICBjb25zdCByZXF1ZXN0ZWRBdCA9IGNsYW1wKFxuICAgIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUocmF3QXQpLFxuICAgIEFCT1VUX05BUlJBVElWRV9USU1FTElORV9TVEVQLFxuICAgIDEgLSBBQk9VVF9OQVJSQVRJVkVfVElNRUxJTkVfU1RFUCxcbiAgKTtcbiAgY29uc3QgbmVpZ2hib3VycyA9IHNlY3Rpb24uY2FtZXJhLmtleXNcbiAgICAuZmlsdGVyKChrZXksIGtleUluZGV4KSA9PiAhKHNlY3Rpb25JbmRleCA9PT0gc291cmNlU2VjdGlvbkluZGV4ICYmIGtleUluZGV4ID09PSBzb3VyY2VLZXlJbmRleCkpXG4gICAgLm1hcCgoa2V5KSA9PiBOdW1iZXIoa2V5LmF0KSlcbiAgICAuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xuICBjb25zdCBuZXh0SW5kZXggPSBuZWlnaGJvdXJzLmZpbmRJbmRleCgoYXQpID0+IGF0ID4gcmVxdWVzdGVkQXQpO1xuICBjb25zdCBpbnNlcnRpb25JbmRleCA9IG5leHRJbmRleCA8IDAgPyBuZWlnaGJvdXJzLmxlbmd0aCA6IG5leHRJbmRleDtcbiAgY29uc3QgcHJldmlvdXNBdCA9IG5laWdoYm91cnNbaW5zZXJ0aW9uSW5kZXggLSAxXSA/PyAwO1xuICBjb25zdCBuZXh0QXQgPSBuZWlnaGJvdXJzW2luc2VydGlvbkluZGV4XSA/PyAxO1xuICBjb25zdCBtaW4gPSBjbGVhblRpbWVsaW5lVmFsdWUocHJldmlvdXNBdCArIEFCT1VUX05BUlJBVElWRV9USU1FTElORV9TVEVQKTtcbiAgY29uc3QgbWF4ID0gY2xlYW5UaW1lbGluZVZhbHVlKG5leHRBdCAtIEFCT1VUX05BUlJBVElWRV9USU1FTElORV9TVEVQKTtcbiAgaWYgKG1pbiA+IG1heCkge1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICByZWFzb246IGAke3NlY3Rpb24ubGFiZWx9IGhhcyBubyBzYWZlIGdhcCBmb3IgYW5vdGhlciBjYW1lcmEga2V5IGhlcmUuYCxcbiAgICAgIHNlY3Rpb25JbmRleCxcbiAgICAgIHNlY3Rpb25JZDogc2VjdGlvbi5pZCxcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgYXQgPSBjbGVhblRpbWVsaW5lVmFsdWUoY2xhbXAocmVxdWVzdGVkQXQsIG1pbiwgbWF4KSk7XG4gIGNvbnN0IGtleUluZGV4ID0gbmVpZ2hib3Vycy5maW5kSW5kZXgoKGl0ZW0pID0+IGl0ZW0gPiBhdCk7XG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgc2VjdGlvbkluZGV4LFxuICAgIHNlY3Rpb25JZDogc2VjdGlvbi5pZCxcbiAgICBzZWN0aW9uTGFiZWw6IHNlY3Rpb24ubGFiZWwsXG4gICAga2V5SW5kZXg6IGtleUluZGV4IDwgMCA/IG5laWdoYm91cnMubGVuZ3RoIDoga2V5SW5kZXgsXG4gICAgYXQsXG4gICAgc3RvcnlXVTogY2xlYW5UaW1lbGluZVZhbHVlKGNvbXBpbGVkLnN0YXJ0V1UgKyAoYXQgKiBjb21waWxlZC50cmF2ZWxXVSkpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMoY3VlKSB7XG4gIGNvbnN0IGZvY3VzID0gTnVtYmVyKGN1ZS5ob2xkKTtcbiAgY29uc3QgbGVhZCA9IE1hdGgubWF4KDAsIGZvY3VzIC0gTnVtYmVyKGN1ZS5lbnRlcikpO1xuICBjb25zdCB0cmFpbCA9IE1hdGgubWF4KDAsIE51bWJlcihjdWUuZXhpdCkgLSBmb2N1cyk7XG4gIHJldHVybiB7XG4gICAgbWluOiBNYXRoLm1heCgwLCBsZWFkIC0gMSksXG4gICAgbWF4OiBNYXRoLm1pbigxLCAyIC0gdHJhaWwpLFxuICAgIGxlYWQsXG4gICAgdHJhaWwsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtb3ZlQWJvdXROYXJyYXRpdmVDdWVUaW1pbmcoY3VlLCBuZXh0Rm9jdXMsIHsgc25hcCA9IHRydWUgfSA9IHt9KSB7XG4gIGNvbnN0IGJvdW5kcyA9IGdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzKGN1ZSk7XG4gIGNvbnN0IHJlcXVlc3RlZEZvY3VzID0gY2xhbXAoTnVtYmVyKG5leHRGb2N1cyksIGJvdW5kcy5taW4sIGJvdW5kcy5tYXgpO1xuICBjb25zdCBob2xkID0gc25hcFxuICAgID8gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKFxuICAgICAgc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZShyZXF1ZXN0ZWRGb2N1cyksXG4gICAgICBib3VuZHMubWluLFxuICAgICAgYm91bmRzLm1heCxcbiAgICApKVxuICAgIDogY2xlYW5UaW1lbGluZVZhbHVlKHJlcXVlc3RlZEZvY3VzKTtcbiAgcmV0dXJuIHtcbiAgICAuLi5jdWUsXG4gICAgZW50ZXI6IGNsZWFuVGltZWxpbmVWYWx1ZShob2xkIC0gYm91bmRzLmxlYWQpLFxuICAgIGhvbGQsXG4gICAgZXhpdDogY2xlYW5UaW1lbGluZVZhbHVlKGhvbGQgKyBib3VuZHMudHJhaWwpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBNb3ZlKHtcbiAgZG9jdW1lbnQsXG4gIHBsYW4sXG4gIG1lbWJlcnMsXG4gIHByaW1hcnksXG4gIGRlbHRhV1UsXG4gIGxvY2FsRGVsdGEsXG59KSB7XG4gIGNvbnN0IHJlc29sdmVkID0gZ2V0Q3VlRW50cmllcyh7IGRvY3VtZW50LCBwbGFuLCBtZW1iZXJzLCBwcmltYXJ5IH0pO1xuICBpZiAoIXJlc29sdmVkLnZhbGlkKSByZXR1cm4gcmVzb2x2ZWQ7XG4gIGNvbnN0IHsgZW50cmllcywgcHJpbWFyeUVudHJ5IH0gPSByZXNvbHZlZDtcbiAgY29uc3QgcmVxdWVzdGVkRGVsdGFXVSA9IE51bWJlci5pc0Zpbml0ZShOdW1iZXIoZGVsdGFXVSkpXG4gICAgPyBOdW1iZXIoZGVsdGFXVSlcbiAgICA6IE51bWJlcihsb2NhbERlbHRhIHx8IDApICogcHJpbWFyeUVudHJ5LmNvbXBpbGVkLnRyYXZlbFdVO1xuICBjb25zdCBtaW5EZWx0YVdVID0gTWF0aC5tYXgoLi4uZW50cmllcy5tYXAoKGVudHJ5KSA9PiBlbnRyeS5taW5HbG9iYWxXVSAtIGVudHJ5Lmdsb2JhbFdVKSk7XG4gIGNvbnN0IG1heERlbHRhV1UgPSBNYXRoLm1pbiguLi5lbnRyaWVzLm1hcCgoZW50cnkpID0+IGVudHJ5Lm1heEdsb2JhbFdVIC0gZW50cnkuZ2xvYmFsV1UpKTtcbiAgY29uc3QgYXBwbGllZERlbHRhV1UgPSBjbGVhblRpbWVsaW5lVmFsdWUoY2xhbXAocmVxdWVzdGVkRGVsdGFXVSwgbWluRGVsdGFXVSwgbWF4RGVsdGFXVSkpO1xuICBjb25zdCBtb3ZlcyA9IGVudHJpZXMubWFwKChlbnRyeSkgPT4gY3JlYXRlQ3VlTW92ZShlbnRyeSwgZW50cnkuZ2xvYmFsV1UgKyBhcHBsaWVkRGVsdGFXVSkpO1xuXG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgcmVxdWVzdGVkRGVsdGFXVTogY2xlYW5UaW1lbGluZVZhbHVlKHJlcXVlc3RlZERlbHRhV1UpLFxuICAgIGRlbHRhV1U6IGFwcGxpZWREZWx0YVdVLFxuICAgIG1pbkRlbHRhV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShtaW5EZWx0YVdVKSxcbiAgICBtYXhEZWx0YVdVOiBjbGVhblRpbWVsaW5lVmFsdWUobWF4RGVsdGFXVSksXG4gICAgbW92ZXMsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVEaXN0cmlidXRpb24oe1xuICBkb2N1bWVudCxcbiAgcGxhbixcbiAgbWVtYmVycyxcbiAgcHJpbWFyeSxcbn0pIHtcbiAgY29uc3QgcmVzb2x2ZWQgPSBnZXRDdWVFbnRyaWVzKHsgZG9jdW1lbnQsIHBsYW4sIG1lbWJlcnMsIHByaW1hcnkgfSk7XG4gIGlmICghcmVzb2x2ZWQudmFsaWQpIHJldHVybiByZXNvbHZlZDtcbiAgY29uc3Qgb3JkZXJlZCA9IHNvcnRDdWVFbnRyaWVzKHJlc29sdmVkLmVudHJpZXMpO1xuICBpZiAob3JkZXJlZC5sZW5ndGggPCAyKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdTZWxlY3QgYXQgbGVhc3QgdHdvIHRpdGxlIEN1ZXMgdG8gZGlzdHJpYnV0ZS4nIH07XG4gIH1cbiAgY29uc3QgZ2FwV1UgPSBjbGVhblRpbWVsaW5lVmFsdWUoXG4gICAgKG9yZGVyZWQuYXQoLTEpLmdsb2JhbFdVIC0gb3JkZXJlZFswXS5nbG9iYWxXVSkgLyAob3JkZXJlZC5sZW5ndGggLSAxKSxcbiAgKTtcbiAgY29uc3QgcmVzdWx0ID0gcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRXhhY3RHYXAoe1xuICAgIGRvY3VtZW50LFxuICAgIHBsYW4sXG4gICAgbWVtYmVyczogb3JkZXJlZC5tYXAoKGVudHJ5KSA9PiBlbnRyeS5tZW1iZXIpLFxuICAgIHByaW1hcnk6IG9yZGVyZWRbMF0ubWVtYmVyLFxuICAgIGdhcFdVLFxuICAgIGFuY2hvcjogJ2ZpcnN0JyxcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgLi4ucmVzdWx0LFxuICAgIG9wZXJhdGlvbjogJ2Rpc3RyaWJ1dGUnLFxuICAgIGdhcFdVLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRXhhY3RHYXAoe1xuICBkb2N1bWVudCxcbiAgcGxhbixcbiAgbWVtYmVycyxcbiAgcHJpbWFyeSxcbiAgZ2FwV1UsXG4gIGFuY2hvciA9ICdwcmltYXJ5Jyxcbn0pIHtcbiAgY29uc3QgcmVzb2x2ZWQgPSBnZXRDdWVFbnRyaWVzKHsgZG9jdW1lbnQsIHBsYW4sIG1lbWJlcnMsIHByaW1hcnkgfSk7XG4gIGlmICghcmVzb2x2ZWQudmFsaWQpIHJldHVybiByZXNvbHZlZDtcbiAgY29uc3Qgb3JkZXJlZCA9IHNvcnRDdWVFbnRyaWVzKHJlc29sdmVkLmVudHJpZXMpO1xuICBpZiAob3JkZXJlZC5sZW5ndGggPCAyKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdTZWxlY3QgYXQgbGVhc3QgdHdvIHRpdGxlIEN1ZXMgdG8gc2V0IGEgZ2FwLicgfTtcbiAgfVxuICBpZiAoIVsncHJpbWFyeScsICdmaXJzdCcsICdsYXN0J10uaW5jbHVkZXMoYW5jaG9yKSkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnQ2hvb3NlIFByaW1hcnksIEZpcnN0LCBvciBMYXN0IGFzIHRoZSBnYXAgYW5jaG9yLicgfTtcbiAgfVxuXG4gIGNvbnN0IHJlcXVlc3RlZEdhcFdVID0gTnVtYmVyKGdhcFdVKTtcbiAgaWYgKCFOdW1iZXIuaXNGaW5pdGUocmVxdWVzdGVkR2FwV1UpIHx8IHJlcXVlc3RlZEdhcFdVIDwgMCkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnR2FwIG11c3QgYmUgYSBub24tbmVnYXRpdmUgV1UgdmFsdWUuJyB9O1xuICB9XG4gIGNvbnN0IGFuY2hvckluZGV4ID0gYW5jaG9yID09PSAnZmlyc3QnXG4gICAgPyAwXG4gICAgOiBhbmNob3IgPT09ICdsYXN0J1xuICAgICAgPyBvcmRlcmVkLmxlbmd0aCAtIDFcbiAgICAgIDogTWF0aC5tYXgoMCwgb3JkZXJlZC5maW5kSW5kZXgoKGVudHJ5KSA9PiAoXG4gICAgICAgIGN1ZU1lbWJlcktleShlbnRyeS5tZW1iZXIpID09PSBjdWVNZW1iZXJLZXkocmVzb2x2ZWQucHJpbWFyeUVudHJ5Lm1lbWJlcilcbiAgICAgICkpKTtcbiAgY29uc3QgYW5jaG9yRW50cnkgPSBvcmRlcmVkW2FuY2hvckluZGV4XTtcbiAgY29uc3QgYW5jaG9yV1UgPSBhbmNob3JFbnRyeS5nbG9iYWxXVTtcbiAgbGV0IG1pbmltdW1WYWxpZEdhcFdVID0gMDtcbiAgbGV0IG1heGltdW1WYWxpZEdhcFdVID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuXG4gIG9yZGVyZWQuZm9yRWFjaCgoZW50cnksIGluZGV4KSA9PiB7XG4gICAgY29uc3Qgb2Zmc2V0ID0gaW5kZXggLSBhbmNob3JJbmRleDtcbiAgICBpZiAob2Zmc2V0ID4gMCkge1xuICAgICAgbWluaW11bVZhbGlkR2FwV1UgPSBNYXRoLm1heChtaW5pbXVtVmFsaWRHYXBXVSwgKGVudHJ5Lm1pbkdsb2JhbFdVIC0gYW5jaG9yV1UpIC8gb2Zmc2V0KTtcbiAgICAgIG1heGltdW1WYWxpZEdhcFdVID0gTWF0aC5taW4obWF4aW11bVZhbGlkR2FwV1UsIChlbnRyeS5tYXhHbG9iYWxXVSAtIGFuY2hvcldVKSAvIG9mZnNldCk7XG4gICAgfSBlbHNlIGlmIChvZmZzZXQgPCAwKSB7XG4gICAgICBjb25zdCBkaXN0YW5jZSA9IC1vZmZzZXQ7XG4gICAgICBtaW5pbXVtVmFsaWRHYXBXVSA9IE1hdGgubWF4KG1pbmltdW1WYWxpZEdhcFdVLCAoYW5jaG9yV1UgLSBlbnRyeS5tYXhHbG9iYWxXVSkgLyBkaXN0YW5jZSk7XG4gICAgICBtYXhpbXVtVmFsaWRHYXBXVSA9IE1hdGgubWluKG1heGltdW1WYWxpZEdhcFdVLCAoYW5jaG9yV1UgLSBlbnRyeS5taW5HbG9iYWxXVSkgLyBkaXN0YW5jZSk7XG4gICAgfVxuICB9KTtcbiAgbWluaW11bVZhbGlkR2FwV1UgPSBjbGVhblRpbWVsaW5lVmFsdWUoTWF0aC5tYXgoMCwgbWluaW11bVZhbGlkR2FwV1UpKTtcbiAgbWF4aW11bVZhbGlkR2FwV1UgPSBjbGVhblRpbWVsaW5lVmFsdWUoTWF0aC5tYXgoMCwgbWF4aW11bVZhbGlkR2FwV1UpKTtcblxuICBjb25zdCBib3VuZGFyeURldGFpbHMgPSB7XG4gICAgcmVxdWVzdGVkR2FwV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShyZXF1ZXN0ZWRHYXBXVSksXG4gICAgbWluaW11bVZhbGlkR2FwV1UsXG4gICAgbWF4aW11bVZhbGlkR2FwV1UsXG4gICAgYW5jaG9yLFxuICAgIGFuY2hvckN1ZUlkOiBhbmNob3JFbnRyeS5jdWUuaWQsXG4gIH07XG4gIGlmIChtaW5pbXVtVmFsaWRHYXBXVSA+IG1heGltdW1WYWxpZEdhcFdVICsgUkhZVEhNX0VQU0lMT04pIHtcbiAgICByZXR1cm4ge1xuICAgICAgdmFsaWQ6IGZhbHNlLFxuICAgICAgcmVhc29uOiAnVGhlc2UgU2VjdGlvbiBib3VuZGFyaWVzIGRvIG5vdCBwZXJtaXQgb25lIHNoYXJlZCBDdWUgZ2FwLicsXG4gICAgICAuLi5ib3VuZGFyeURldGFpbHMsXG4gICAgfTtcbiAgfVxuICBpZiAocmVxdWVzdGVkR2FwV1UgPiBtYXhpbXVtVmFsaWRHYXBXVSArIFJIWVRITV9FUFNJTE9OKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbGlkOiBmYWxzZSxcbiAgICAgIHJlYXNvbjogYFNlY3Rpb24gYm91bmRhcmllcyBsaW1pdCB0aGlzIGdhcCB0byAke21heGltdW1WYWxpZEdhcFdVLnRvRml4ZWQoMyl9IFdVLmAsXG4gICAgICAuLi5ib3VuZGFyeURldGFpbHMsXG4gICAgfTtcbiAgfVxuICBpZiAocmVxdWVzdGVkR2FwV1UgPCBtaW5pbXVtVmFsaWRHYXBXVSAtIFJIWVRITV9FUFNJTE9OKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbGlkOiBmYWxzZSxcbiAgICAgIHJlYXNvbjogYFNlY3Rpb24gYm91bmRhcmllcyByZXF1aXJlIGF0IGxlYXN0ICR7bWluaW11bVZhbGlkR2FwV1UudG9GaXhlZCgzKX0gV1UuYCxcbiAgICAgIC4uLmJvdW5kYXJ5RGV0YWlscyxcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgbW92ZXMgPSBvcmRlcmVkLm1hcCgoZW50cnksIGluZGV4KSA9PiAoXG4gICAgY3JlYXRlQ3VlTW92ZShlbnRyeSwgYW5jaG9yV1UgKyAoKGluZGV4IC0gYW5jaG9ySW5kZXgpICogcmVxdWVzdGVkR2FwV1UpKVxuICApKTtcbiAgcmV0dXJuIHtcbiAgICB2YWxpZDogdHJ1ZSxcbiAgICAuLi5ib3VuZGFyeURldGFpbHMsXG4gICAgbW92ZXMsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cEFsaWduKHtcbiAgZG9jdW1lbnQsXG4gIHBsYW4sXG4gIG1lbWJlcnMsXG4gIHByaW1hcnksXG4gIHBsYXloZWFkV1UsXG59KSB7XG4gIGNvbnN0IHJlc29sdmVkID0gZ2V0Q3VlRW50cmllcyh7IGRvY3VtZW50LCBwbGFuLCBtZW1iZXJzLCBwcmltYXJ5IH0pO1xuICBpZiAoIXJlc29sdmVkLnZhbGlkKSByZXR1cm4gcmVzb2x2ZWQ7XG4gIGlmICghTnVtYmVyLmlzRmluaXRlKE51bWJlcihwbGF5aGVhZFdVKSkpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBwbGF5aGVhZCBwb3NpdGlvbiBpcyBub3QgYXZhaWxhYmxlLicgfTtcbiAgfVxuICBjb25zdCByZXF1ZXN0ZWREZWx0YVdVID0gTnVtYmVyKHBsYXloZWFkV1UpIC0gcmVzb2x2ZWQucHJpbWFyeUVudHJ5Lmdsb2JhbFdVO1xuICBjb25zdCByZXN1bHQgPSByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cE1vdmUoe1xuICAgIGRvY3VtZW50LFxuICAgIHBsYW4sXG4gICAgbWVtYmVycyxcbiAgICBwcmltYXJ5OiByZXNvbHZlZC5wcmltYXJ5RW50cnkubWVtYmVyLFxuICAgIGRlbHRhV1U6IHJlcXVlc3RlZERlbHRhV1UsXG4gIH0pO1xuICBpZiAoIXJlc3VsdC52YWxpZCkgcmV0dXJuIHJlc3VsdDtcbiAgcmV0dXJuIHtcbiAgICAuLi5yZXN1bHQsXG4gICAgcGxheWhlYWRXVTogY2xlYW5UaW1lbGluZVZhbHVlKE51bWJlcihwbGF5aGVhZFdVKSksXG4gICAgYWxpZ25lZDogTWF0aC5hYnMocmVzdWx0LmRlbHRhV1UgLSByZXF1ZXN0ZWREZWx0YVdVKSA8PSBSSFlUSE1fRVBTSUxPTixcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUFib3V0TmFycmF0aXZlRHVwbGljYXRlSWQoZG9jdW1lbnQsIHNvdXJjZUlkLCB7XG4gIHJlc2VydmVkSWRzID0gW10sXG59ID0ge30pIHtcbiAgY29uc3QgdXNlZElkcyA9IGdldEFib3V0TmFycmF0aXZlVXNlZElkcyhkb2N1bWVudCk7XG4gIHJlc2VydmVkSWRzLmZvckVhY2goKGlkKSA9PiB1c2VkSWRzLmFkZChTdHJpbmcoaWQpKSk7XG4gIHJldHVybiBuZXh0RHVwbGljYXRlSWQoc291cmNlSWQsIHVzZWRJZHMpO1xufVxuXG5mdW5jdGlvbiByZW1hcEN1ZVJlZmVyZW5jZShjdWUsIGlkTWFwKSB7XG4gIGlmICghY3VlPy5hbmNob3IgfHwgIWlkTWFwLmhhcyhjdWUuYW5jaG9yKSkgcmV0dXJuIGN1ZTtcbiAgcmV0dXJuIHsgLi4uY3VlLCBhbmNob3I6IGlkTWFwLmdldChjdWUuYW5jaG9yKSB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZHVwbGljYXRlQWJvdXROYXJyYXRpdmVDdWVHcm91cCh7XG4gIGRvY3VtZW50LFxuICBtZW1iZXJzLFxuICBwcmltYXJ5LFxufSkge1xuICBpZiAoIWRvY3VtZW50Py5zZWN0aW9ucz8ubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGUgQWJvdXQgZG9jdW1lbnQgaXMgbm90IHJlYWR5LicgfTtcbiAgfVxuICBjb25zdCBub3JtYWxpemVkTWVtYmVycyA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyh7XG4gICAgLi4uKG5vcm1hbGl6ZUN1ZU1lbWJlcihwcmltYXJ5KSB8fCBub3JtYWxpemVDdWVNZW1iZXIobWVtYmVycz8uWzBdKSB8fCB7fSksXG4gICAgbWVtYmVycyxcbiAgfSk7XG4gIGlmICghbm9ybWFsaXplZE1lbWJlcnMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdTZWxlY3QgYXQgbGVhc3Qgb25lIHRpdGxlIEN1ZSB0byBkdXBsaWNhdGUuJyB9O1xuICB9XG4gIGNvbnN0IHNlbGVjdGVkS2V5cyA9IG5ldyBTZXQobm9ybWFsaXplZE1lbWJlcnMubWFwKGN1ZU1lbWJlcktleSkpO1xuICBjb25zdCBhdmFpbGFibGVLZXlzID0gbmV3IFNldCgoZG9jdW1lbnQuc2VjdGlvbnMgfHwgW10pLmZsYXRNYXAoKHNlY3Rpb24pID0+IChcbiAgICAoc2VjdGlvbi50ZXh0Py5jdWVzIHx8IFtdKS5tYXAoKGN1ZSkgPT4gYCR7c2VjdGlvbi5pZH06JHtjdWUuaWR9YClcbiAgKSkpO1xuICBjb25zdCBtaXNzaW5nTWVtYmVyID0gbm9ybWFsaXplZE1lbWJlcnMuZmluZCgobWVtYmVyKSA9PiAhYXZhaWxhYmxlS2V5cy5oYXMoY3VlTWVtYmVyS2V5KG1lbWJlcikpKTtcbiAgaWYgKG1pc3NpbmdNZW1iZXIpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogYFRpdGxlIEN1ZSAke21pc3NpbmdNZW1iZXIuY3VlSWR9IGlzIG5vIGxvbmdlciBhdmFpbGFibGUuYCB9O1xuICB9XG5cbiAgY29uc3QgY2FuZGlkYXRlID0gY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KGRvY3VtZW50KTtcbiAgY29uc3QgdXNlZElkcyA9IGdldEFib3V0TmFycmF0aXZlVXNlZElkcyhjYW5kaWRhdGUpO1xuICBjb25zdCBpZE1hcCA9IG5ldyBNYXAoKTtcbiAgY2FuZGlkYXRlLnNlY3Rpb25zLmZvckVhY2goKHNlY3Rpb24pID0+IHtcbiAgICAoc2VjdGlvbi50ZXh0Py5jdWVzIHx8IFtdKS5mb3JFYWNoKChjdWUpID0+IHtcbiAgICAgIGlmICghc2VsZWN0ZWRLZXlzLmhhcyhgJHtzZWN0aW9uLmlkfToke2N1ZS5pZH1gKSkgcmV0dXJuO1xuICAgICAgaWRNYXAuc2V0KGN1ZS5pZCwgbmV4dER1cGxpY2F0ZUlkKGN1ZS5pZCwgdXNlZElkcykpO1xuICAgIH0pO1xuICB9KTtcblxuICBjb25zdCBpdGVtcyA9IFtdO1xuICBjYW5kaWRhdGUuc2VjdGlvbnMuZm9yRWFjaCgoc2VjdGlvbikgPT4ge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShzZWN0aW9uLnRleHQ/LmN1ZXMpKSByZXR1cm47XG4gICAgc2VjdGlvbi50ZXh0LmN1ZXMgPSBzZWN0aW9uLnRleHQuY3Vlcy5mbGF0TWFwKChjdWUpID0+IHtcbiAgICAgIGNvbnN0IG1lbWJlcktleSA9IGAke3NlY3Rpb24uaWR9OiR7Y3VlLmlkfWA7XG4gICAgICBpZiAoIXNlbGVjdGVkS2V5cy5oYXMobWVtYmVyS2V5KSkgcmV0dXJuIFtjdWVdO1xuICAgICAgY29uc3QgZHVwbGljYXRlID0gcmVtYXBDdWVSZWZlcmVuY2Uoe1xuICAgICAgICAuLi5jbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoY3VlKSxcbiAgICAgICAgaWQ6IGlkTWFwLmdldChjdWUuaWQpLFxuICAgICAgfSwgaWRNYXApO1xuICAgICAgaXRlbXMucHVzaCh7XG4gICAgICAgIHNlY3Rpb25JZDogc2VjdGlvbi5pZCxcbiAgICAgICAgc291cmNlQ3VlSWQ6IGN1ZS5pZCxcbiAgICAgICAgY3VlSWQ6IGR1cGxpY2F0ZS5pZCxcbiAgICAgICAgY3VlOiBkdXBsaWNhdGUsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBbY3VlLCBkdXBsaWNhdGVdO1xuICAgIH0pO1xuICB9KTtcblxuICBjb25zdCB2YWxpZGF0aW9uID0gZ2V0Q2FuZGlkYXRlVmFsaWRhdGlvbihjYW5kaWRhdGUpO1xuICBpZiAoIXZhbGlkYXRpb24udmFsaWQpIHJldHVybiB2YWxpZGF0aW9uO1xuICBjb25zdCBwcmltYXJ5TWVtYmVyID0gbm9ybWFsaXplQ3VlTWVtYmVyKHByaW1hcnkpIHx8IG5vcm1hbGl6ZWRNZW1iZXJzWzBdO1xuICBjb25zdCBwcmltYXJ5Q3VlSWQgPSBpZE1hcC5nZXQocHJpbWFyeU1lbWJlci5jdWVJZCkgfHwgaXRlbXNbMF0uY3VlSWQ7XG4gIGNvbnN0IHNlbGVjdGlvbk1lbWJlcnMgPSBpdGVtcy5tYXAoKGl0ZW0pID0+ICh7XG4gICAgdHlwZTogJ2N1ZScsXG4gICAgc2VjdGlvbklkOiBpdGVtLnNlY3Rpb25JZCxcbiAgICBjdWVJZDogaXRlbS5jdWVJZCxcbiAgICBrZXlQYXJ0OiAnZm9jdXMnLFxuICB9KSk7XG4gIGNvbnN0IHByaW1hcnlTZWxlY3Rpb24gPSBzZWxlY3Rpb25NZW1iZXJzLmZpbmQoKG1lbWJlcikgPT4gbWVtYmVyLmN1ZUlkID09PSBwcmltYXJ5Q3VlSWQpXG4gICAgfHwgc2VsZWN0aW9uTWVtYmVyc1swXTtcbiAgcmV0dXJuIHtcbiAgICB2YWxpZDogdHJ1ZSxcbiAgICBkb2N1bWVudDogY2FuZGlkYXRlLFxuICAgIGRpYWdub3N0aWNzOiB2YWxpZGF0aW9uLmRpYWdub3N0aWNzLFxuICAgIGlkTWFwOiBPYmplY3QuZnJvbUVudHJpZXMoaWRNYXApLFxuICAgIGl0ZW1zLFxuICAgIHNlbGVjdGlvbjogbWFrZUN1ZVNlbGVjdGlvbihwcmltYXJ5U2VsZWN0aW9uLCBzZWxlY3Rpb25NZW1iZXJzKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0aXRjaEFib3V0TmFycmF0aXZlQ2FtZXJhQm91bmRhcmllcyhkb2N1bWVudCwge1xuICBib3VuZGFyeUluZGV4ZXMgPSBudWxsLFxufSA9IHt9KSB7XG4gIGNvbnN0IGNhbmRpZGF0ZSA9IGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChkb2N1bWVudCk7XG4gIGNvbnN0IHJlcXVlc3RlZEJvdW5kYXJpZXMgPSBib3VuZGFyeUluZGV4ZXMgPT0gbnVsbFxuICAgID8gY2FuZGlkYXRlLnNlY3Rpb25zLm1hcCgoXywgaW5kZXgpID0+IGluZGV4KS5zbGljZSgxKVxuICAgIDogWy4uLm5ldyBTZXQoYm91bmRhcnlJbmRleGVzLm1hcChOdW1iZXIpKV0uc29ydCgobGVmdCwgcmlnaHQpID0+IGxlZnQgLSByaWdodCk7XG4gIHJlcXVlc3RlZEJvdW5kYXJpZXMuZm9yRWFjaCgoc2VjdGlvbkluZGV4KSA9PiB7XG4gICAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKHNlY3Rpb25JbmRleCkgfHwgc2VjdGlvbkluZGV4IDw9IDAgfHwgc2VjdGlvbkluZGV4ID49IGNhbmRpZGF0ZS5zZWN0aW9ucy5sZW5ndGgpIHJldHVybjtcbiAgICBjb25zdCBwcmV2aW91c0tleSA9IGNhbmRpZGF0ZS5zZWN0aW9uc1tzZWN0aW9uSW5kZXggLSAxXT8uY2FtZXJhPy5rZXlzPy5hdCgtMSk7XG4gICAgY29uc3QgbmV4dEtleSA9IGNhbmRpZGF0ZS5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdPy5jYW1lcmE/LmtleXM/LlswXTtcbiAgICBjb3B5Q2FtZXJhUG9zZShuZXh0S2V5LCBwcmV2aW91c0tleSk7XG4gIH0pO1xuICByZXR1cm4gY2FuZGlkYXRlO1xufVxuXG5mdW5jdGlvbiByZW1hcFNlY3Rpb25SZWZlcmVuY2VzKHZhbHVlLCBpZE1hcCwga2V5ID0gJycpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSByZXR1cm4gdmFsdWUubWFwKChpdGVtKSA9PiByZW1hcFNlY3Rpb25SZWZlcmVuY2VzKGl0ZW0sIGlkTWFwLCBrZXkpKTtcbiAgaWYgKCF2YWx1ZSB8fCB0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnKSB7XG4gICAgY29uc3QgcmVmZXJlbmNlS2V5ID0ga2V5ID09PSAnYW5jaG9yJyB8fCBrZXkuZW5kc1dpdGgoJ0lkJykgfHwga2V5LmVuZHNXaXRoKCdSZWYnKTtcbiAgICByZXR1cm4gcmVmZXJlbmNlS2V5ICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgaWRNYXAuaGFzKHZhbHVlKVxuICAgICAgPyBpZE1hcC5nZXQodmFsdWUpXG4gICAgICA6IHZhbHVlO1xuICB9XG4gIHJldHVybiBPYmplY3QuZnJvbUVudHJpZXMoT2JqZWN0LmVudHJpZXModmFsdWUpLm1hcCgoW2NoaWxkS2V5LCBjaGlsZFZhbHVlXSkgPT4gW1xuICAgIGNoaWxkS2V5LFxuICAgIHJlbWFwU2VjdGlvblJlZmVyZW5jZXMoY2hpbGRWYWx1ZSwgaWRNYXAsIGNoaWxkS2V5KSxcbiAgXSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZHVwbGljYXRlQWJvdXROYXJyYXRpdmVTZWN0aW9uKHtcbiAgZG9jdW1lbnQsXG4gIHNlY3Rpb25JZCxcbn0pIHtcbiAgaWYgKCFkb2N1bWVudD8uc2VjdGlvbnM/Lmxlbmd0aCkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIEFib3V0IGRvY3VtZW50IGlzIG5vdCByZWFkeS4nIH07XG4gIH1cbiAgY29uc3Qgc291cmNlSW5kZXggPSBkb2N1bWVudC5zZWN0aW9ucy5maW5kSW5kZXgoKHNlY3Rpb24pID0+IHNlY3Rpb24uaWQgPT09IHNlY3Rpb25JZCk7XG4gIGNvbnN0IHNvdXJjZSA9IGRvY3VtZW50LnNlY3Rpb25zW3NvdXJjZUluZGV4XTtcbiAgaWYgKCFzb3VyY2UpIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiBgU2VjdGlvbiAke3NlY3Rpb25JZH0gaXMgbm8gbG9uZ2VyIGF2YWlsYWJsZS5gIH07XG4gIGlmIChzb3VyY2UubG9ja2VkKSByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1VubG9jayB0aGlzIFNlY3Rpb24gYmVmb3JlIGR1cGxpY2F0aW5nIGl0LicgfTtcbiAgaWYgKHNvdXJjZS50eXBlID09PSAnZmluYWxlJykge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIHByb3RlY3RlZCBmaW5hbGUgY2Fubm90IGJlIGR1cGxpY2F0ZWQuJyB9O1xuICB9XG5cbiAgY29uc3QgdXNlZElkcyA9IGdldEFib3V0TmFycmF0aXZlVXNlZElkcyhkb2N1bWVudCk7XG4gIGNvbnN0IGlkTWFwID0gbmV3IE1hcCgpO1xuICBpZE1hcC5zZXQoc291cmNlLmlkLCBuZXh0RHVwbGljYXRlSWQoc291cmNlLmlkLCB1c2VkSWRzKSk7XG4gIChzb3VyY2UudGV4dD8uY3VlcyB8fCBbXSkuZm9yRWFjaCgoY3VlKSA9PiBpZE1hcC5zZXQoY3VlLmlkLCBuZXh0RHVwbGljYXRlSWQoY3VlLmlkLCB1c2VkSWRzKSkpO1xuICAoc291cmNlLnRleHQ/LmJsb2NrcyB8fCBbXSkuZm9yRWFjaCgoYmxvY2spID0+IGlkTWFwLnNldChibG9jay5pZCwgbmV4dER1cGxpY2F0ZUlkKGJsb2NrLmlkLCB1c2VkSWRzKSkpO1xuICBpZiAoc291cmNlLnRleHQ/LmRpc2NpcGxpbmVSZXZlYWwpIHtcbiAgICBjb25zdCByZXZlYWwgPSBzb3VyY2UudGV4dC5kaXNjaXBsaW5lUmV2ZWFsO1xuICAgIGlkTWFwLnNldChyZXZlYWwuaWQsIG5leHREdXBsaWNhdGVJZChyZXZlYWwuaWQsIHVzZWRJZHMpKTtcbiAgfVxuXG4gIGxldCBkdXBsaWNhdGUgPSByZW1hcFNlY3Rpb25SZWZlcmVuY2VzKGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChzb3VyY2UpLCBpZE1hcCk7XG4gIGR1cGxpY2F0ZS5pZCA9IGlkTWFwLmdldChzb3VyY2UuaWQpO1xuICBkdXBsaWNhdGUubGFiZWwgPSBgJHtzb3VyY2UubGFiZWx9IGNvcHlgO1xuICAoZHVwbGljYXRlLnRleHQ/LmN1ZXMgfHwgW10pLmZvckVhY2goKGN1ZSwgY3VlSW5kZXgpID0+IHtcbiAgICBjdWUuaWQgPSBpZE1hcC5nZXQoc291cmNlLnRleHQuY3Vlc1tjdWVJbmRleF0uaWQpO1xuICB9KTtcbiAgKGR1cGxpY2F0ZS50ZXh0Py5ibG9ja3MgfHwgW10pLmZvckVhY2goKGJsb2NrLCBibG9ja0luZGV4KSA9PiB7XG4gICAgYmxvY2suaWQgPSBpZE1hcC5nZXQoc291cmNlLnRleHQuYmxvY2tzW2Jsb2NrSW5kZXhdLmlkKTtcbiAgfSk7XG4gIGlmIChkdXBsaWNhdGUudGV4dD8uZGlzY2lwbGluZVJldmVhbCkge1xuICAgIGR1cGxpY2F0ZS50ZXh0LmRpc2NpcGxpbmVSZXZlYWwuaWQgPSBpZE1hcC5nZXQoc291cmNlLnRleHQuZGlzY2lwbGluZVJldmVhbC5pZCk7XG4gIH1cblxuICBjb25zdCBjYW5kaWRhdGUgPSBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoZG9jdW1lbnQpO1xuICBjb25zdCBpbnNlcnRJbmRleCA9IHNvdXJjZUluZGV4ICsgMTtcbiAgY2FuZGlkYXRlLnNlY3Rpb25zLnNwbGljZShpbnNlcnRJbmRleCwgMCwgZHVwbGljYXRlKTtcbiAgY29uc3Qgc3RpdGNoZWQgPSBzdGl0Y2hBYm91dE5hcnJhdGl2ZUNhbWVyYUJvdW5kYXJpZXMoY2FuZGlkYXRlLCB7XG4gICAgYm91bmRhcnlJbmRleGVzOiBbaW5zZXJ0SW5kZXgsIGluc2VydEluZGV4ICsgMV0sXG4gIH0pO1xuICBkdXBsaWNhdGUgPSBzdGl0Y2hlZC5zZWN0aW9uc1tpbnNlcnRJbmRleF07XG4gIGNvbnN0IHZhbGlkYXRpb24gPSBnZXRDYW5kaWRhdGVWYWxpZGF0aW9uKHN0aXRjaGVkKTtcbiAgaWYgKCF2YWxpZGF0aW9uLnZhbGlkKSByZXR1cm4gdmFsaWRhdGlvbjtcbiAgcmV0dXJuIHtcbiAgICB2YWxpZDogdHJ1ZSxcbiAgICBkb2N1bWVudDogc3RpdGNoZWQsXG4gICAgZGlhZ25vc3RpY3M6IHZhbGlkYXRpb24uZGlhZ25vc3RpY3MsXG4gICAgc2VjdGlvbjogZHVwbGljYXRlLFxuICAgIHNlY3Rpb25JbmRleDogaW5zZXJ0SW5kZXgsXG4gICAgc291cmNlU2VjdGlvbklkOiBzb3VyY2UuaWQsXG4gICAgc2VjdGlvbklkOiBkdXBsaWNhdGUuaWQsXG4gICAgaWRNYXA6IE9iamVjdC5mcm9tRW50cmllcyhpZE1hcCksXG4gICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBkdXBsaWNhdGUuaWQgfSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZCh7XG4gIGRvY3VtZW50LFxuICBwbGFuLFxuICBtZW1iZXJzLFxuICBwcmltYXJ5LFxufSkge1xuICBjb25zdCByZXNvbHZlZCA9IGdldEN1ZUVudHJpZXMoeyBkb2N1bWVudCwgcGxhbiwgbWVtYmVycywgcHJpbWFyeSB9KTtcbiAgaWYgKCFyZXNvbHZlZC52YWxpZCkgcmV0dXJuIHJlc29sdmVkO1xuICBjb25zdCBvcmRlcmVkID0gc29ydEN1ZUVudHJpZXMocmVzb2x2ZWQuZW50cmllcyk7XG4gIGNvbnN0IG9yaWdpbldVID0gb3JkZXJlZFswXS5nbG9iYWxXVTtcbiAgcmV0dXJuIHtcbiAgICB2ZXJzaW9uOiBBQk9VVF9OQVJSQVRJVkVfQ0xJUEJPQVJEX1ZFUlNJT04sXG4gICAga2luZDogQUJPVVRfTkFSUkFUSVZFX0NMSVBCT0FSRF9LSU5ELFxuICAgIGl0ZW1zOiBvcmRlcmVkLm1hcCgoZW50cnkpID0+ICh7XG4gICAgICBvZmZzZXRXVTogY2xlYW5UaW1lbGluZVZhbHVlKGVudHJ5Lmdsb2JhbFdVIC0gb3JpZ2luV1UpLFxuICAgICAgY3VlOiBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoZW50cnkuY3VlKSxcbiAgICB9KSksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZChwYXlsb2FkKSB7XG4gIGlmICghcGF5bG9hZCB8fCB0eXBlb2YgcGF5bG9hZCAhPT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShwYXlsb2FkKSkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIGVkaXRvciBjbGlwYm9hcmQgaXMgZW1wdHkgb3IgZGFtYWdlZC4nIH07XG4gIH1cbiAgaWYgKHBheWxvYWQudmVyc2lvbiAhPT0gQUJPVVRfTkFSUkFUSVZFX0NMSVBCT0FSRF9WRVJTSU9OKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGlzIGVkaXRvciBjbGlwYm9hcmQgdmVyc2lvbiBpcyBub3Qgc3VwcG9ydGVkLicgfTtcbiAgfVxuICBpZiAocGF5bG9hZC5raW5kICE9PSBBQk9VVF9OQVJSQVRJVkVfQ0xJUEJPQVJEX0tJTkQpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ09ubHkgY29waWVkIHRpdGxlIEN1ZSBncm91cHMgY2FuIGJlIHBhc3RlZCBoZXJlLicgfTtcbiAgfVxuICBpZiAoIUFycmF5LmlzQXJyYXkocGF5bG9hZC5pdGVtcykgfHwgIXBheWxvYWQuaXRlbXMubGVuZ3RoIHx8IHBheWxvYWQuaXRlbXMubGVuZ3RoID4gMTAwKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGUgY29waWVkIEN1ZSBncm91cCBtdXN0IGNvbnRhaW4gYmV0d2VlbiAxIGFuZCAxMDAgdGl0bGVzLicgfTtcbiAgfVxuICBjb25zdCBzZWVuQ3VlSWRzID0gbmV3IFNldCgpO1xuICBmb3IgKGNvbnN0IGl0ZW0gb2YgcGF5bG9hZC5pdGVtcykge1xuICAgIGlmICghaXRlbSB8fCB0eXBlb2YgaXRlbSAhPT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShpdGVtKSkge1xuICAgICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdBIGNvcGllZCBDdWUgaXRlbSBpcyBkYW1hZ2VkLicgfTtcbiAgICB9XG4gICAgY29uc3QgdW5rbm93bkl0ZW1LZXkgPSBPYmplY3Qua2V5cyhpdGVtKS5maW5kKChrZXkpID0+ICFbJ29mZnNldFdVJywgJ2N1ZSddLmluY2x1ZGVzKGtleSkpO1xuICAgIGlmICh1bmtub3duSXRlbUtleSkgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246IGBVbmtub3duIGNsaXBib2FyZCBmaWVsZCDigJwke3Vua25vd25JdGVtS2V5feKAnS5gIH07XG4gICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUoTnVtYmVyKGl0ZW0ub2Zmc2V0V1UpKSB8fCBOdW1iZXIoaXRlbS5vZmZzZXRXVSkgPCAwKSB7XG4gICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ0NvcGllZCBDdWUgb2Zmc2V0cyBtdXN0IGJlIG5vbi1uZWdhdGl2ZSBXVSB2YWx1ZXMuJyB9O1xuICAgIH1cbiAgICBjb25zdCBjdWUgPSBpdGVtLmN1ZTtcbiAgICBpZiAoIWN1ZSB8fCB0eXBlb2YgY3VlICE9PSAnb2JqZWN0JyB8fCBBcnJheS5pc0FycmF5KGN1ZSkpIHtcbiAgICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnQSBjb3BpZWQgQ3VlIGlzIG1pc3NpbmcgaXRzIGF1dGhvcmVkIHRpdGxlLicgfTtcbiAgICB9XG4gICAgY29uc3QgdW5rbm93bkN1ZUtleSA9IE9iamVjdC5rZXlzKGN1ZSkuZmluZCgoa2V5KSA9PiAhW1xuICAgICAgJ2lkJyxcbiAgICAgICd0ZXh0JyxcbiAgICAgICdlbnRlcicsXG4gICAgICAnaG9sZCcsXG4gICAgICAnZXhpdCcsXG4gICAgICAncHJlc2V0JyxcbiAgICAgICdhbmNob3InLFxuICAgICAgJ21vdGlvbicsXG4gICAgXS5pbmNsdWRlcyhrZXkpKTtcbiAgICBpZiAodW5rbm93bkN1ZUtleSkgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246IGBVbmtub3duIGNvcGllZCBDdWUgZmllbGQg4oCcJHt1bmtub3duQ3VlS2V5feKAnS5gIH07XG4gICAgaWYgKCEvXlthLXowLTldKyg/Oi1bYS16MC05XSspKiQvLnRlc3QoY3VlLmlkIHx8ICcnKSB8fCBzZWVuQ3VlSWRzLmhhcyhjdWUuaWQpKSB7XG4gICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ0NvcGllZCBDdWUgSURzIG11c3QgYmUgdW5pcXVlIGxvd2VyLWNhc2Ugc2x1Z3MuJyB9O1xuICAgIH1cbiAgICBzZWVuQ3VlSWRzLmFkZChjdWUuaWQpO1xuICAgIGlmIChcbiAgICAgICFjdWUudGV4dD8udHJpbSgpXG4gICAgICB8fCBjdWUudGV4dC5sZW5ndGggPiAxMjAwXG4gICAgICB8fCAvPFxcLz8oPzpzY3JpcHR8c3R5bGV8aWZyYW1lKXxcXGJvblxcdytcXHMqPXxqYXZhc2NyaXB0Oi9pLnRlc3QoY3VlLnRleHQpXG4gICAgICB8fCAhW2N1ZS5lbnRlciwgY3VlLmhvbGQsIGN1ZS5leGl0XS5ldmVyeSgodmFsdWUpID0+IE51bWJlci5pc0Zpbml0ZShOdW1iZXIodmFsdWUpKSlcbiAgICApIHtcbiAgICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnQSBjb3BpZWQgQ3VlIGhhcyBpbnZhbGlkIHRleHQgb3IgdGltaW5nLicgfTtcbiAgICB9XG4gICAgaWYgKFxuICAgICAgY3VlLmVudGVyIDwgLTFcbiAgICAgIHx8IGN1ZS5leGl0ID4gMlxuICAgICAgfHwgY3VlLmVudGVyID4gY3VlLmhvbGRcbiAgICAgIHx8IGN1ZS5ob2xkID4gY3VlLmV4aXRcbiAgICAgIHx8IGN1ZS5ob2xkIDwgMFxuICAgICAgfHwgY3VlLmhvbGQgPiAxXG4gICAgKSB7XG4gICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ0EgY29waWVkIEN1ZSBoYXMgYW4gaW52YWxpZCB0aW1pbmcgZW52ZWxvcGUuJyB9O1xuICAgIH1cbiAgICBpZiAoXG4gICAgICB0eXBlb2YgY3VlLnByZXNldCAhPT0gJ3N0cmluZydcbiAgICAgIHx8ICFjdWUucHJlc2V0XG4gICAgICB8fCAhY3VlLm1vdGlvblxuICAgICAgfHwgdHlwZW9mIGN1ZS5tb3Rpb24gIT09ICdvYmplY3QnXG4gICAgICB8fCBBcnJheS5pc0FycmF5KGN1ZS5tb3Rpb24pXG4gICAgICB8fCBPYmplY3Qua2V5cyhjdWUubW90aW9uKS5zb21lKChrZXkpID0+IGtleSAhPT0gJ21vZGUnKVxuICAgICAgfHwgIVsnc3BhdGlhbCcsICd2ZXJ0aWNhbCddLmluY2x1ZGVzKGN1ZS5tb3Rpb24ubW9kZSlcbiAgICApIHtcbiAgICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnQSBjb3BpZWQgQ3VlIGhhcyB1bnN1cHBvcnRlZCB0aXRsZSBiZWhhdmlvci4nIH07XG4gICAgfVxuICB9XG4gIGNvbnN0IGhhc09yaWdpbiA9IHBheWxvYWQuaXRlbXMuc29tZSgoaXRlbSkgPT4gTWF0aC5hYnMoTnVtYmVyKGl0ZW0ub2Zmc2V0V1UpKSA8PSBSSFlUSE1fRVBTSUxPTik7XG4gIGlmICghaGFzT3JpZ2luKSByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBjb3BpZWQgQ3VlIGdyb3VwIGhhcyBubyB0aW1lbGluZSBvcmlnaW4uJyB9O1xuICByZXR1cm4ge1xuICAgIHZhbGlkOiB0cnVlLFxuICAgIHBheWxvYWQ6IGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChwYXlsb2FkKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwUGFzdGUoe1xuICBkb2N1bWVudCxcbiAgcGxhbixcbiAgcGF5bG9hZCxcbiAgZGVzdGluYXRpb25TZWN0aW9uSWQsXG4gIHBsYXloZWFkV1UsXG59KSB7XG4gIGNvbnN0IGNsaXBib2FyZCA9IHZhbGlkYXRlQWJvdXROYXJyYXRpdmVDdWVDbGlwYm9hcmRQYXlsb2FkKHBheWxvYWQpO1xuICBpZiAoIWNsaXBib2FyZC52YWxpZCkgcmV0dXJuIGNsaXBib2FyZDtcbiAgaWYgKCFkb2N1bWVudD8uc2VjdGlvbnM/Lmxlbmd0aCB8fCAhcGxhbj8udmFsaWQpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBBYm91dCB0aW1lbGluZSBpcyBub3QgcmVhZHkuJyB9O1xuICB9XG4gIGNvbnN0IGRlc3RpbmF0aW9uSW5kZXggPSBkb2N1bWVudC5zZWN0aW9ucy5maW5kSW5kZXgoKHNlY3Rpb24pID0+IHNlY3Rpb24uaWQgPT09IGRlc3RpbmF0aW9uU2VjdGlvbklkKTtcbiAgY29uc3QgZGVzdGluYXRpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tkZXN0aW5hdGlvbkluZGV4XTtcbiAgY29uc3QgY29tcGlsZWQgPSBwbGFuLnNlY3Rpb25zLmZpbmQoKHNlY3Rpb24pID0+IHNlY3Rpb24uaWQgPT09IGRlc3RpbmF0aW9uU2VjdGlvbklkKTtcbiAgaWYgKCFkZXN0aW5hdGlvbiB8fCAhY29tcGlsZWQpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ0Nob29zZSBhbiBhdmFpbGFibGUgZGVzdGluYXRpb24gU2VjdGlvbi4nIH07XG4gIH1cbiAgaWYgKCFBcnJheS5pc0FycmF5KGRlc3RpbmF0aW9uLnRleHQ/LmN1ZXMpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbGlkOiBmYWxzZSxcbiAgICAgIHJlYXNvbjogYCR7ZGVzdGluYXRpb24ubGFiZWx9IGRvZXMgbm90IGNvbnRhaW4gYSB0aXRsZSBDdWUgdHJhY2suYCxcbiAgICB9O1xuICB9XG4gIGlmICghKGNvbXBpbGVkLnRyYXZlbFdVID4gMCkgfHwgIU51bWJlci5pc0Zpbml0ZShOdW1iZXIocGxheWhlYWRXVSkpKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGUgZGVzdGluYXRpb24gcGxheWhlYWQgcG9zaXRpb24gaXMgbm90IGF2YWlsYWJsZS4nIH07XG4gIH1cblxuICBjb25zdCBpdGVtcyA9IGNsaXBib2FyZC5wYXlsb2FkLml0ZW1zO1xuICBsZXQgbWluaW11bU9yaWdpbldVID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZO1xuICBsZXQgbWF4aW11bU9yaWdpbldVID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgY29uc3QgYm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMoaXRlbS5jdWUpO1xuICAgIGNvbnN0IG9mZnNldFdVID0gTnVtYmVyKGl0ZW0ub2Zmc2V0V1UpO1xuICAgIG1pbmltdW1PcmlnaW5XVSA9IE1hdGgubWF4KFxuICAgICAgbWluaW11bU9yaWdpbldVLFxuICAgICAgY29tcGlsZWQuc3RhcnRXVSArIChib3VuZHMubWluICogY29tcGlsZWQudHJhdmVsV1UpIC0gb2Zmc2V0V1UsXG4gICAgKTtcbiAgICBtYXhpbXVtT3JpZ2luV1UgPSBNYXRoLm1pbihcbiAgICAgIG1heGltdW1PcmlnaW5XVSxcbiAgICAgIGNvbXBpbGVkLnN0YXJ0V1UgKyAoYm91bmRzLm1heCAqIGNvbXBpbGVkLnRyYXZlbFdVKSAtIG9mZnNldFdVLFxuICAgICk7XG4gIH0pO1xuICBtaW5pbXVtT3JpZ2luV1UgPSBjbGVhblRpbWVsaW5lVmFsdWUobWluaW11bU9yaWdpbldVKTtcbiAgbWF4aW11bU9yaWdpbldVID0gY2xlYW5UaW1lbGluZVZhbHVlKG1heGltdW1PcmlnaW5XVSk7XG4gIGlmIChtaW5pbXVtT3JpZ2luV1UgPiBtYXhpbXVtT3JpZ2luV1UgKyBSSFlUSE1fRVBTSUxPTikge1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICByZWFzb246IGBUaGUgY29waWVkIEN1ZSBncm91cCBpcyB3aWRlciB0aGFuICR7ZGVzdGluYXRpb24ubGFiZWx9J3MgdGl0bGUgdGltZWxpbmUuYCxcbiAgICAgIG1pbmltdW1PcmlnaW5XVSxcbiAgICAgIG1heGltdW1PcmlnaW5XVSxcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgcmVxdWVzdGVkT3JpZ2luV1UgPSBOdW1iZXIocGxheWhlYWRXVSk7XG4gIGNvbnN0IG9yaWdpbldVID0gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKFxuICAgIHJlcXVlc3RlZE9yaWdpbldVLFxuICAgIG1pbmltdW1PcmlnaW5XVSxcbiAgICBtYXhpbXVtT3JpZ2luV1UsXG4gICkpO1xuICBjb25zdCBjYW5kaWRhdGUgPSBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoZG9jdW1lbnQpO1xuICBjb25zdCB0YXJnZXQgPSBjYW5kaWRhdGUuc2VjdGlvbnNbZGVzdGluYXRpb25JbmRleF07XG4gIGNvbnN0IHVzZWRJZHMgPSBnZXRBYm91dE5hcnJhdGl2ZVVzZWRJZHMoY2FuZGlkYXRlKTtcbiAgY29uc3QgaWRNYXAgPSBuZXcgTWFwKCk7XG4gIGl0ZW1zLmZvckVhY2goKGl0ZW0pID0+IGlkTWFwLnNldChpdGVtLmN1ZS5pZCwgbmV4dER1cGxpY2F0ZUlkKGl0ZW0uY3VlLmlkLCB1c2VkSWRzKSkpO1xuICBjb25zdCBwYXN0ZWRJdGVtcyA9IGl0ZW1zLm1hcCgoaXRlbSwgaW5kZXgpID0+IHtcbiAgICBjb25zdCBzdG9yeVdVID0gY2xlYW5UaW1lbGluZVZhbHVlKG9yaWdpbldVICsgTnVtYmVyKGl0ZW0ub2Zmc2V0V1UpKTtcbiAgICBjb25zdCBsb2NhbEZvY3VzID0gKHN0b3J5V1UgLSBjb21waWxlZC5zdGFydFdVKSAvIGNvbXBpbGVkLnRyYXZlbFdVO1xuICAgIGNvbnN0IG1vdmVkID0gbW92ZUFib3V0TmFycmF0aXZlQ3VlVGltaW5nKGl0ZW0uY3VlLCBsb2NhbEZvY3VzLCB7IHNuYXA6IGZhbHNlIH0pO1xuICAgIGNvbnN0IGN1ZSA9IHJlbWFwQ3VlUmVmZXJlbmNlKHtcbiAgICAgIC4uLm1vdmVkLFxuICAgICAgaWQ6IGlkTWFwLmdldChpdGVtLmN1ZS5pZCksXG4gICAgfSwgaWRNYXApO1xuICAgIHJldHVybiB7XG4gICAgICBjdWUsXG4gICAgICBjdWVJZDogY3VlLmlkLFxuICAgICAgc291cmNlQ3VlSWQ6IGl0ZW0uY3VlLmlkLFxuICAgICAgb2Zmc2V0V1U6IGNsZWFuVGltZWxpbmVWYWx1ZShOdW1iZXIoaXRlbS5vZmZzZXRXVSkpLFxuICAgICAgc3RvcnlXVSxcbiAgICAgIG9yZGVyOiBpbmRleCxcbiAgICB9O1xuICB9KTtcbiAgdGFyZ2V0LnRleHQuY3VlcyA9IFsuLi50YXJnZXQudGV4dC5jdWVzLCAuLi5wYXN0ZWRJdGVtcy5tYXAoKGl0ZW0pID0+IGl0ZW0uY3VlKV1cbiAgICAubWFwKChjdWUsIGluZGV4KSA9PiAoeyBjdWUsIGluZGV4IH0pKVxuICAgIC5zb3J0KChsZWZ0LCByaWdodCkgPT4gKGxlZnQuY3VlLmhvbGQgLSByaWdodC5jdWUuaG9sZCkgfHwgKGxlZnQuaW5kZXggLSByaWdodC5pbmRleCkpXG4gICAgLm1hcCgoaXRlbSkgPT4gaXRlbS5jdWUpO1xuXG4gIGNvbnN0IHZhbGlkYXRpb24gPSBnZXRDYW5kaWRhdGVWYWxpZGF0aW9uKGNhbmRpZGF0ZSk7XG4gIGlmICghdmFsaWRhdGlvbi52YWxpZCkgcmV0dXJuIHZhbGlkYXRpb247XG4gIGNvbnN0IHNlbGVjdGlvbk1lbWJlcnMgPSBwYXN0ZWRJdGVtcy5tYXAoKGl0ZW0pID0+ICh7XG4gICAgdHlwZTogJ2N1ZScsXG4gICAgc2VjdGlvbklkOiBkZXN0aW5hdGlvblNlY3Rpb25JZCxcbiAgICBjdWVJZDogaXRlbS5jdWVJZCxcbiAgICBrZXlQYXJ0OiAnZm9jdXMnLFxuICB9KSk7XG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgZG9jdW1lbnQ6IGNhbmRpZGF0ZSxcbiAgICBkaWFnbm9zdGljczogdmFsaWRhdGlvbi5kaWFnbm9zdGljcyxcbiAgICBkZXN0aW5hdGlvblNlY3Rpb25JZCxcbiAgICByZXF1ZXN0ZWRPcmlnaW5XVTogY2xlYW5UaW1lbGluZVZhbHVlKHJlcXVlc3RlZE9yaWdpbldVKSxcbiAgICBvcmlnaW5XVSxcbiAgICBjbGFtcGVkOiBNYXRoLmFicyhvcmlnaW5XVSAtIHJlcXVlc3RlZE9yaWdpbldVKSA+IFJIWVRITV9FUFNJTE9OLFxuICAgIG1pbmltdW1PcmlnaW5XVSxcbiAgICBtYXhpbXVtT3JpZ2luV1UsXG4gICAgaWRNYXA6IE9iamVjdC5mcm9tRW50cmllcyhpZE1hcCksXG4gICAgaXRlbXM6IHBhc3RlZEl0ZW1zLFxuICAgIHNlbGVjdGlvbjogbWFrZUN1ZVNlbGVjdGlvbihzZWxlY3Rpb25NZW1iZXJzWzBdLCBzZWxlY3Rpb25NZW1iZXJzKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0Q3VlTG9vcEJvdW5kcyh7IGRvY3VtZW50LCBwbGFuLCBzb3VyY2UgfSkge1xuICBjb25zdCBtZW1iZXJzID0gc291cmNlLnR5cGUgPT09ICdjdWUtZ3JvdXAnXG4gICAgPyBzb3VyY2UubWVtYmVyc1xuICAgIDogZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHNvdXJjZSk7XG4gIGNvbnN0IHJlc29sdmVkID0gZ2V0Q3VlRW50cmllcyh7XG4gICAgZG9jdW1lbnQsXG4gICAgcGxhbixcbiAgICBtZW1iZXJzLFxuICAgIHByaW1hcnk6IHNvdXJjZS5wcmltYXJ5IHx8IHNvdXJjZSxcbiAgfSk7XG4gIGlmICghcmVzb2x2ZWQudmFsaWQpIHJldHVybiByZXNvbHZlZDtcbiAgY29uc3Qgb3JkZXJlZCA9IHNvcnRDdWVFbnRyaWVzKHJlc29sdmVkLmVudHJpZXMpO1xuICBjb25zdCBzdGFydFdVID0gTWF0aC5taW4oLi4ub3JkZXJlZC5tYXAoKGVudHJ5KSA9PiAoXG4gICAgZW50cnkuY29tcGlsZWQuc3RhcnRXVSArIChOdW1iZXIoZW50cnkuY3VlLmVudGVyKSAqIGVudHJ5LmNvbXBpbGVkLnRyYXZlbFdVKVxuICApKSk7XG4gIGNvbnN0IGVuZFdVID0gTWF0aC5tYXgoLi4ub3JkZXJlZC5tYXAoKGVudHJ5KSA9PiAoXG4gICAgZW50cnkuY29tcGlsZWQuc3RhcnRXVSArIChOdW1iZXIoZW50cnkuY3VlLmV4aXQpICogZW50cnkuY29tcGlsZWQudHJhdmVsV1UpXG4gICkpKTtcbiAgcmV0dXJuIHtcbiAgICB2YWxpZDogdHJ1ZSxcbiAgICBzdGFydFdVLFxuICAgIGVuZFdVLFxuICAgIHNvdXJjZVR5cGU6ICdjdWUtZ3JvdXAnLFxuICAgIHNvdXJjZUlkOiBvcmRlcmVkLm1hcCgoZW50cnkpID0+IGVudHJ5LmN1ZS5pZCkuam9pbignKycpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVyaXZlQWJvdXROYXJyYXRpdmVMb29wUmFuZ2Uoe1xuICBkb2N1bWVudCxcbiAgcGxhbixcbiAgc291cmNlLFxuICBwcmVSb2xsV1UgPSAwLFxuICBwb3N0Um9sbFdVID0gMCxcbiAgY2FtZXJhS2V5V2luZG93V1UgPSAwLjI1LFxufSkge1xuICBpZiAoIWRvY3VtZW50Py5zZWN0aW9ucz8ubGVuZ3RoIHx8ICFwbGFuPy52YWxpZCB8fCAhc291cmNlKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGUgbG9vcCBzb3VyY2UgaXMgbm90IGF2YWlsYWJsZS4nIH07XG4gIH1cbiAgY29uc3QgcHJlUm9sbCA9IE51bWJlcihwcmVSb2xsV1UpO1xuICBjb25zdCBwb3N0Um9sbCA9IE51bWJlcihwb3N0Um9sbFdVKTtcbiAgaWYgKCFOdW1iZXIuaXNGaW5pdGUocHJlUm9sbCkgfHwgcHJlUm9sbCA8IDAgfHwgIU51bWJlci5pc0Zpbml0ZShwb3N0Um9sbCkgfHwgcG9zdFJvbGwgPCAwKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdQcmUtcm9sbCBhbmQgcG9zdC1yb2xsIG11c3QgYmUgbm9uLW5lZ2F0aXZlIFdVIHZhbHVlcy4nIH07XG4gIH1cblxuICBjb25zdCBzb3VyY2VTZWN0aW9uID0gZG9jdW1lbnQuc2VjdGlvbnMuZmluZCgoc2VjdGlvbikgPT4gc2VjdGlvbi5pZCA9PT0gc291cmNlLnNlY3Rpb25JZCk7XG4gIGNvbnN0IGNvbXBpbGVkID0gcGxhbi5zZWN0aW9ucy5maW5kKChzZWN0aW9uKSA9PiBzZWN0aW9uLmlkID09PSBzb3VyY2Uuc2VjdGlvbklkKTtcbiAgbGV0IGJhc2VSYW5nZTtcbiAgaWYgKHNvdXJjZS50eXBlID09PSAnc2VjdGlvbicpIHtcbiAgICBpZiAoIXNvdXJjZVNlY3Rpb24gfHwgIWNvbXBpbGVkKSByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBzZWxlY3RlZCBTZWN0aW9uIGlzIG5vdCBhdmFpbGFibGUuJyB9O1xuICAgIGJhc2VSYW5nZSA9IHtcbiAgICAgIHN0YXJ0V1U6IGNvbXBpbGVkLnN0YXJ0V1UsXG4gICAgICBlbmRXVTogTWF0aC5taW4oY29tcGlsZWQuZW5kV1UsIHBsYW4ubWF4U3RvcnlXVSksXG4gICAgICBzb3VyY2VUeXBlOiAnc2VjdGlvbicsXG4gICAgICBzb3VyY2VJZDogc291cmNlU2VjdGlvbi5pZCxcbiAgICB9O1xuICB9IGVsc2UgaWYgKHNvdXJjZS50eXBlID09PSAnY3VlJyB8fCBzb3VyY2UudHlwZSA9PT0gJ2N1ZS1ncm91cCcpIHtcbiAgICBiYXNlUmFuZ2UgPSBnZXRDdWVMb29wQm91bmRzKHsgZG9jdW1lbnQsIHBsYW4sIHNvdXJjZSB9KTtcbiAgICBpZiAoIWJhc2VSYW5nZS52YWxpZCkgcmV0dXJuIGJhc2VSYW5nZTtcbiAgfSBlbHNlIGlmIChzb3VyY2UudHlwZSA9PT0gJ3dvcmxkJyB8fCBzb3VyY2UudHlwZSA9PT0gJ3dvcmxkLXRyYW5zaXRpb24nKSB7XG4gICAgY29uc3QgdHJhbnNpdGlvbiA9IGNvbXBpbGVkPy53b3JsZFN0YXRlPy50cmFuc2l0aW9uO1xuICAgIGlmICghc291cmNlU2VjdGlvbiB8fCAhY29tcGlsZWQgfHwgc291cmNlU2VjdGlvbi53b3JsZD8ubW9kZSAhPT0gJ3NldCcgfHwgIXRyYW5zaXRpb24pIHtcbiAgICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIHNlbGVjdGVkIFdvcmxkIHRyYW5zaXRpb24gaXMgbm90IGF2YWlsYWJsZS4nIH07XG4gICAgfVxuICAgIGJhc2VSYW5nZSA9IHtcbiAgICAgIHN0YXJ0V1U6IHRyYW5zaXRpb24uc3RhcnRXVSxcbiAgICAgIGVuZFdVOiB0cmFuc2l0aW9uLmVuZFdVLFxuICAgICAgc291cmNlVHlwZTogJ3dvcmxkLXRyYW5zaXRpb24nLFxuICAgICAgc291cmNlSWQ6IGAke3NvdXJjZVNlY3Rpb24uaWR9OnRyYW5zaXRpb25gLFxuICAgIH07XG4gIH0gZWxzZSBpZiAoc291cmNlLnR5cGUgPT09ICdjYW1lcmEta2V5Jykge1xuICAgIGNvbnN0IGtleSA9IHNvdXJjZVNlY3Rpb24/LmNhbWVyYT8ua2V5cz8uW3NvdXJjZS5rZXlJbmRleF07XG4gICAgY29uc3Qgd2luZG93V1UgPSBOdW1iZXIoY2FtZXJhS2V5V2luZG93V1UpO1xuICAgIGlmICgha2V5IHx8ICFjb21waWxlZCB8fCAhTnVtYmVyLmlzRmluaXRlKHdpbmRvd1dVKSB8fCB3aW5kb3dXVSA8PSAwKSB7XG4gICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBzZWxlY3RlZCBDYW1lcmEga2V5IHdpbmRvdyBpcyBub3QgYXZhaWxhYmxlLicgfTtcbiAgICB9XG4gICAgY29uc3Qga2V5V1UgPSBjb21waWxlZC5zdGFydFdVICsgKE51bWJlcihrZXkuYXQpICogY29tcGlsZWQudHJhdmVsV1UpO1xuICAgIGJhc2VSYW5nZSA9IHtcbiAgICAgIHN0YXJ0V1U6IGtleVdVIC0gd2luZG93V1UsXG4gICAgICBlbmRXVToga2V5V1UgKyB3aW5kb3dXVSxcbiAgICAgIHNvdXJjZVR5cGU6ICdjYW1lcmEta2V5JyxcbiAgICAgIHNvdXJjZUlkOiBgJHtzb3VyY2VTZWN0aW9uLmlkfTpjYW1lcmE6JHtzb3VyY2Uua2V5SW5kZXh9YCxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhpcyBzZWxlY3Rpb24gY2Fubm90IGNyZWF0ZSBhIGxvb3AuJyB9O1xuICB9XG5cbiAgaWYgKCEoYmFzZVJhbmdlLmVuZFdVID4gYmFzZVJhbmdlLnN0YXJ0V1UgKyBSSFlUSE1fRVBTSUxPTikpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoaXMgc291cmNlIGhhcyBubyBkdXJhdGlvbiB0byBsb29wLicgfTtcbiAgfVxuICBjb25zdCBzdGFydFdVID0gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKGJhc2VSYW5nZS5zdGFydFdVIC0gcHJlUm9sbCwgMCwgcGxhbi5tYXhTdG9yeVdVKSk7XG4gIGNvbnN0IGVuZFdVID0gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKGJhc2VSYW5nZS5lbmRXVSArIHBvc3RSb2xsLCAwLCBwbGFuLm1heFN0b3J5V1UpKTtcbiAgaWYgKCEoZW5kV1UgPiBzdGFydFdVICsgUkhZVEhNX0VQU0lMT04pKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGlzIGxvb3AgcmFuZ2UgZmFsbHMgb3V0c2lkZSB0aGUgbmFycmF0aXZlLicgfTtcbiAgfVxuICByZXR1cm4ge1xuICAgIHZhbGlkOiB0cnVlLFxuICAgIHN0YXJ0V1UsXG4gICAgZW5kV1UsXG4gICAgc291cmNlVHlwZTogYmFzZVJhbmdlLnNvdXJjZVR5cGUsXG4gICAgc291cmNlSWQ6IGJhc2VSYW5nZS5zb3VyY2VJZCxcbiAgfTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxNQUFNLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDO0FBQ3pHLE1BQU0sQ0FBQztBQUNQLENBQUMsQ0FBQywyQkFBMkI7QUFDN0IsQ0FBQyxDQUFDLDhCQUE4QjtBQUNoQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQzs7QUFFaEUsTUFBTSxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7O0FBRWxELEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQy9CLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQyxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQzs7QUFFbEQsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMs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RyxDQUFDO0FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQztBQUNIOztBQUVBLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU87QUFDMUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU87QUFDckQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTO0FBQ2xCOztBQUVBLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3BDOztBQUVBLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFO0FBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztBQUM1RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMOztBQUVBLFFBQVEsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7QUFDakMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztBQUNqQixDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFDWDs7QUFFQSxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0QsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQztBQUM5RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTztBQUNYLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyRSxDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7QUFDbEcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQztBQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7QUFDL0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3RixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUYsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0MsQ0FBQyxHQUFHLENBQUM7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPO0FBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWTtBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDMUYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDMUYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ3hFLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLGFBQWE7QUFDN0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDL0M7O0FBRUEsUUFBUSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNqQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWTtBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVE7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSjs7QUFFQSxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRO0FBQ3BGLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7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QyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUM3RixDQUFDLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3BFOztBQUVBLE1BQU0sQ0FBQyxRQUFRLENBQUMsc0NBQXNDLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdkUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7QUFDNUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNuRCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3JFLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLE1B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QyxJQUFJO0FBQ04sQ0FBQyxDQUFDLE9BQU87QUFDVCxDQUFDLENBQUMsT0FBTztBQUNULENBQUMsQ0FBQyxLQUFLO0FBQ1AsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUTtBQUN0QyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7QUFDbEQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuRixDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RixDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7QUFDdEMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlELENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0UsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTTtBQUNoRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNULENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO0FBQzFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUTtBQUN2QyxDQUFDLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUI7O0FBRWxELENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFdBQVc7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQzlGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQzlGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUNoRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUNoRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ3hFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsa0JBQWtC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QUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQztBQUNyRCxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDOUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN6RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ2xELENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNwRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztBQUNqQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRTtBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVKLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLENBQUM7QUFDdEQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVO0FBQzFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7QUFDM0UsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ3ZFLENBQUMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMs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LEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3RGLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUs7QUFDdkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUNiLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTDs7QUFFQSxNQUFNLENBQUMsUUFBUSxDQUFDLDhCQUE4QixDQUFDO0FBQy9DLENBQUMsQ0FBQyxRQUFRO0FBQ1YsQ0FBQyxDQUFDLFNBQVM7QUFDWCxDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZFLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDeEYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRixDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLFFBQVEsQ0FBQztBQUNwRCxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzNELENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDakcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUN6RyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQjtBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDN0QsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNwRixDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQzFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7QUFDbkYsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLENBQUM7QUFDekQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxvQ0FBb0MsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO0FBQzVDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7QUFDckQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVO0FBQzFDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUk7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVE7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxVQUFVLENBQUMsV0FBVztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxXQUFXO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRTtBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7QUFD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QyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkYsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDNUYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRyxDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzlGLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3BGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSTtBQUM3RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDekYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyRixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTTtBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FB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QUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUTtBQUN0QyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7QUFDbEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUTtBQUMvRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRO0FBQzlFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUk7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU87QUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVELENBQUMsQ0FBQyxDQUFDO0FBQ0g7O0FBRUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBQztBQUM5QyxDQUFDLENBQUMsUUFBUTtBQUNWLENBQUMsQ0FBQyxJQUFJO0FBQ04sQ0FBQyxDQUFDLE1BQU07QUFDUixDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2YsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzFCLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDOUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEUsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7QUFDbkMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDckMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdGLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztBQUM1RixDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztBQUNuRixDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVM7QUFDZixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ25FLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUM1RCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBQzVFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsVUFBVTtBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDM0YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPO0FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDO0FBQ2hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO0FBQzlELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6RixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7QUFDekUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNFLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFDL0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNFLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzVGLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3pGLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25GLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUk7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU87QUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVE7QUFDaEMsQ0FBQyxDQUFDLENBQUM7QUFDSDsifQ==