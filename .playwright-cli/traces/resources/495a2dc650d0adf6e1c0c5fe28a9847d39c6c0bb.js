import { compileAboutNarrativeDocument } from "/src/routes/about-narrative-lab/aboutNarrativeCompiler.js?t=1784283765510";
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFib3V0TmFycmF0aXZlVGltZWxpbmUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY29tcGlsZUFib3V0TmFycmF0aXZlRG9jdW1lbnQgfSBmcm9tIFwiL3NyYy9yb3V0ZXMvYWJvdXQtbmFycmF0aXZlLWxhYi9hYm91dE5hcnJhdGl2ZUNvbXBpbGVyLmpzP3Q9MTc4NDI4Mzc2NTUxMFwiO1xuaW1wb3J0IHtcbiAgY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50LFxuICB2YWxpZGF0ZUFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG59IGZyb20gXCIvc3JjL3JvdXRlcy9hYm91dC1uYXJyYXRpdmUtbGFiL2Fib3V0TmFycmF0aXZlU2NoZW1hLmpzXCI7XG5cbmV4cG9ydCBjb25zdCBBQk9VVF9OQVJSQVRJVkVfVElNRUxJTkVfU1RFUCA9IDAuMDA1O1xuXG5jb25zdCBSSFlUSE1fRVBTSUxPTiA9IDAuMDAwMDAxO1xuY29uc3QgQUJPVVRfTkFSUkFUSVZFX0NMSVBCT0FSRF9WRVJTSU9OID0gMTtcbmNvbnN0IEFCT1VUX05BUlJBVElWRV9DTElQQk9BUkRfS0lORCA9ICdjdWUtZ3JvdXAnO1xuXG5jb25zdCBjbGFtcCA9ICh2YWx1ZSwgbWluLCBtYXgpID0+IE1hdGgubWluKG1heCwgTWF0aC5tYXgobWluLCB2YWx1ZSkpO1xuXG5mdW5jdGlvbiBjbGVhblRpbWVsaW5lVmFsdWUodmFsdWUpIHtcbiAgcmV0dXJuIE51bWJlcihOdW1iZXIodmFsdWUpLnRvRml4ZWQoNikpO1xufVxuXG5mdW5jdGlvbiBnZXRTZWN0aW9uQXRTdG9yeVdVKHBsYW4sIHN0b3J5V1UpIHtcbiAgaWYgKCFwbGFuPy5zZWN0aW9ucz8ubGVuZ3RoKSByZXR1cm4geyBzZWN0aW9uOiBudWxsLCBzZWN0aW9uSW5kZXg6IC0xIH07XG4gIGNvbnN0IGNsYW1wZWRTdG9yeVdVID0gY2xhbXAoTnVtYmVyKHN0b3J5V1UpIHx8IDAsIDAsIE51bWJlcihwbGFuLm1heFN0b3J5V1UgfHwgMCkpO1xuICBsZXQgc2VjdGlvbkluZGV4ID0gcGxhbi5zZWN0aW9ucy5maW5kSW5kZXgoKHNlY3Rpb24sIGluZGV4KSA9PiB7XG4gICAgY29uc3QgbmV4dFN0YXJ0V1UgPSBwbGFuLnNlY3Rpb25zW2luZGV4ICsgMV0/LnN0YXJ0V1UgPz8gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuICAgIHJldHVybiBjbGFtcGVkU3RvcnlXVSA+PSBzZWN0aW9uLnN0YXJ0V1UgJiYgY2xhbXBlZFN0b3J5V1UgPCBuZXh0U3RhcnRXVTtcbiAgfSk7XG4gIGlmIChzZWN0aW9uSW5kZXggPCAwKSBzZWN0aW9uSW5kZXggPSBwbGFuLnNlY3Rpb25zLmxlbmd0aCAtIDE7XG4gIHJldHVybiB7IHNlY3Rpb246IHBsYW4uc2VjdGlvbnNbc2VjdGlvbkluZGV4XSwgc2VjdGlvbkluZGV4LCBzdG9yeVdVOiBjbGFtcGVkU3RvcnlXVSB9O1xufVxuXG5mdW5jdGlvbiBjdWVNZW1iZXJLZXkobWVtYmVyKSB7XG4gIHJldHVybiBgJHttZW1iZXIuc2VjdGlvbklkfToke21lbWJlci5jdWVJZH1gO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVDdWVNZW1iZXIobWVtYmVyKSB7XG4gIGlmIChtZW1iZXI/LnR5cGUgIT09ICdjdWUnIHx8ICFtZW1iZXIuc2VjdGlvbklkIHx8ICFtZW1iZXIuY3VlSWQpIHJldHVybiBudWxsO1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdjdWUnLFxuICAgIHNlY3Rpb25JZDogbWVtYmVyLnNlY3Rpb25JZCxcbiAgICBjdWVJZDogbWVtYmVyLmN1ZUlkLFxuICAgIGtleVBhcnQ6IG1lbWJlci5rZXlQYXJ0IHx8ICdmb2N1cycsXG4gIH07XG59XG5cbmZ1bmN0aW9uIG1ha2VDdWVTZWxlY3Rpb24ocHJpbWFyeSwgbWVtYmVycykge1xuICBjb25zdCBzZWxlY3Rpb24gPSB7IC4uLnByaW1hcnkgfTtcbiAgZGVsZXRlIHNlbGVjdGlvbi5tZW1iZXJzO1xuICBpZiAobWVtYmVycy5sZW5ndGggPiAxKSBzZWxlY3Rpb24ubWVtYmVycyA9IG1lbWJlcnM7XG4gIHJldHVybiBzZWxlY3Rpb247XG59XG5cbmZ1bmN0aW9uIG1ha2VTbHVnKHZhbHVlKSB7XG4gIHJldHVybiBTdHJpbmcodmFsdWUgfHwgJycpXG4gICAgLnRvTG93ZXJDYXNlKClcbiAgICAucmVwbGFjZSgvW15hLXowLTldKy9nLCAnLScpXG4gICAgLnJlcGxhY2UoL14tfC0kL2csICcnKSB8fCAnaXRlbSc7XG59XG5cbmZ1bmN0aW9uIGdldEFib3V0TmFycmF0aXZlVXNlZElkcyhkb2N1bWVudCkge1xuICByZXR1cm4gbmV3IFNldCgoZG9jdW1lbnQ/LnNlY3Rpb25zIHx8IFtdKS5mbGF0TWFwKChzZWN0aW9uKSA9PiBbXG4gICAgc2VjdGlvbi5pZCxcbiAgICAuLi4oc2VjdGlvbi50ZXh0Py5jdWVzIHx8IFtdKS5tYXAoKGN1ZSkgPT4gY3VlLmlkKSxcbiAgICAuLi4oc2VjdGlvbi50ZXh0Py5ibG9ja3MgfHwgW10pLm1hcCgoYmxvY2spID0+IGJsb2NrLmlkKSxcbiAgICAuLi4oc2VjdGlvbi50ZXh0Py5kaXNjaXBsaW5lUmV2ZWFsID8gW3NlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsLmlkXSA6IFtdKSxcbiAgXSkpO1xufVxuXG5mdW5jdGlvbiBuZXh0RHVwbGljYXRlSWQoc291cmNlSWQsIHVzZWRJZHMpIHtcbiAgY29uc3QgYmFzZSA9IG1ha2VTbHVnKHNvdXJjZUlkKTtcbiAgbGV0IHN1ZmZpeCA9IDI7XG4gIGxldCBpZCA9IGAke2Jhc2V9LSR7c3VmZml4fWA7XG4gIHdoaWxlICh1c2VkSWRzLmhhcyhpZCkpIHtcbiAgICBzdWZmaXggKz0gMTtcbiAgICBpZCA9IGAke2Jhc2V9LSR7c3VmZml4fWA7XG4gIH1cbiAgdXNlZElkcy5hZGQoaWQpO1xuICByZXR1cm4gaWQ7XG59XG5cbmZ1bmN0aW9uIGdldEN1ZUVudHJpZXMoeyBkb2N1bWVudCwgcGxhbiwgbWVtYmVycywgcHJpbWFyeSB9KSB7XG4gIGlmICghZG9jdW1lbnQ/LnNlY3Rpb25zPy5sZW5ndGggfHwgIXBsYW4/LnZhbGlkIHx8ICFwbGFuLnNlY3Rpb25zPy5sZW5ndGgpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSB0ZXh0IHRpbWVsaW5lIGlzIG5vdCByZWFkeS4nIH07XG4gIH1cblxuICBjb25zdCBub3JtYWxpemVkTWVtYmVycyA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyh7XG4gICAgLi4uKG5vcm1hbGl6ZUN1ZU1lbWJlcihwcmltYXJ5KSB8fCBub3JtYWxpemVDdWVNZW1iZXIobWVtYmVycz8uWzBdKSB8fCB7fSksXG4gICAgbWVtYmVycyxcbiAgfSk7XG4gIGlmICghbm9ybWFsaXplZE1lbWJlcnMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdTZWxlY3QgYXQgbGVhc3Qgb25lIHRpdGxlIEN1ZS4nIH07XG4gIH1cblxuICBjb25zdCBlbnRyaWVzID0gW107XG4gIGZvciAoY29uc3QgbWVtYmVyIG9mIG5vcm1hbGl6ZWRNZW1iZXJzKSB7XG4gICAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZG9jdW1lbnQuc2VjdGlvbnMuZmluZEluZGV4KChzZWN0aW9uKSA9PiBzZWN0aW9uLmlkID09PSBtZW1iZXIuc2VjdGlvbklkKTtcbiAgICBjb25zdCBzZWN0aW9uID0gZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XTtcbiAgICBjb25zdCBjb21waWxlZCA9IHBsYW4uc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbWVtYmVyLnNlY3Rpb25JZCk7XG4gICAgY29uc3QgY3VlSW5kZXggPSBzZWN0aW9uPy50ZXh0Py5jdWVzPy5maW5kSW5kZXgoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1lbWJlci5jdWVJZCkgPz8gLTE7XG4gICAgY29uc3QgY3VlID0gc2VjdGlvbj8udGV4dD8uY3Vlcz8uW2N1ZUluZGV4XTtcbiAgICBpZiAoIXNlY3Rpb24gfHwgIWNvbXBpbGVkIHx8ICFjdWUgfHwgIShjb21waWxlZC50cmF2ZWxXVSA+IDApKSB7XG4gICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogYFRpdGxlIEN1ZSAke21lbWJlci5jdWVJZH0gaXMgbm8gbG9uZ2VyIGF2YWlsYWJsZS5gIH07XG4gICAgfVxuICAgIGNvbnN0IGhvbGQgPSBOdW1iZXIoY3VlLmhvbGQpO1xuICAgIGNvbnN0IGJvdW5kcyA9IGdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzKGN1ZSk7XG4gICAgZW50cmllcy5wdXNoKHtcbiAgICAgIG1lbWJlcixcbiAgICAgIHNlY3Rpb24sXG4gICAgICBzZWN0aW9uSW5kZXgsXG4gICAgICBjdWUsXG4gICAgICBjdWVJbmRleCxcbiAgICAgIGNvbXBpbGVkLFxuICAgICAgaG9sZCxcbiAgICAgIGJvdW5kcyxcbiAgICAgIGdsb2JhbFdVOiBjbGVhblRpbWVsaW5lVmFsdWUoY29tcGlsZWQuc3RhcnRXVSArIChob2xkICogY29tcGlsZWQudHJhdmVsV1UpKSxcbiAgICAgIG1pbkdsb2JhbFdVOiBjbGVhblRpbWVsaW5lVmFsdWUoY29tcGlsZWQuc3RhcnRXVSArIChib3VuZHMubWluICogY29tcGlsZWQudHJhdmVsV1UpKSxcbiAgICAgIG1heEdsb2JhbFdVOiBjbGVhblRpbWVsaW5lVmFsdWUoY29tcGlsZWQuc3RhcnRXVSArIChib3VuZHMubWF4ICogY29tcGlsZWQudHJhdmVsV1UpKSxcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHByaW1hcnlNZW1iZXIgPSBub3JtYWxpemVDdWVNZW1iZXIocHJpbWFyeSkgfHwgZW50cmllc1swXS5tZW1iZXI7XG4gIGNvbnN0IHByaW1hcnlFbnRyeSA9IGVudHJpZXMuZmluZCgoZW50cnkpID0+IChcbiAgICBjdWVNZW1iZXJLZXkoZW50cnkubWVtYmVyKSA9PT0gY3VlTWVtYmVyS2V5KHByaW1hcnlNZW1iZXIpXG4gICkpIHx8IGVudHJpZXNbMF07XG4gIHJldHVybiB7IHZhbGlkOiB0cnVlLCBlbnRyaWVzLCBwcmltYXJ5RW50cnkgfTtcbn1cblxuZnVuY3Rpb24gc29ydEN1ZUVudHJpZXMoZW50cmllcykge1xuICByZXR1cm4gWy4uLmVudHJpZXNdLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiAoXG4gICAgKGxlZnQuZ2xvYmFsV1UgLSByaWdodC5nbG9iYWxXVSlcbiAgICB8fCAobGVmdC5zZWN0aW9uSW5kZXggLSByaWdodC5zZWN0aW9uSW5kZXgpXG4gICAgfHwgKGxlZnQuY3VlSW5kZXggLSByaWdodC5jdWVJbmRleClcbiAgICB8fCBsZWZ0LmN1ZS5pZC5sb2NhbGVDb21wYXJlKHJpZ2h0LmN1ZS5pZClcbiAgKSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUN1ZU1vdmUoZW50cnksIGdsb2JhbFdVKSB7XG4gIGNvbnN0IGhvbGQgPSAoTnVtYmVyKGdsb2JhbFdVKSAtIGVudHJ5LmNvbXBpbGVkLnN0YXJ0V1UpIC8gZW50cnkuY29tcGlsZWQudHJhdmVsV1U7XG4gIGNvbnN0IG1vdmVkID0gbW92ZUFib3V0TmFycmF0aXZlQ3VlVGltaW5nKGVudHJ5LmN1ZSwgaG9sZCwgeyBzbmFwOiBmYWxzZSB9KTtcbiAgcmV0dXJuIHtcbiAgICBzZWN0aW9uSWQ6IGVudHJ5Lm1lbWJlci5zZWN0aW9uSWQsXG4gICAgc2VjdGlvbkluZGV4OiBlbnRyeS5zZWN0aW9uSW5kZXgsXG4gICAgY3VlSWQ6IGVudHJ5Lm1lbWJlci5jdWVJZCxcbiAgICBlbnRlcjogbW92ZWQuZW50ZXIsXG4gICAgaG9sZDogbW92ZWQuaG9sZCxcbiAgICBleGl0OiBtb3ZlZC5leGl0LFxuICAgIHN0b3J5V1U6IGNsZWFuVGltZWxpbmVWYWx1ZShlbnRyeS5jb21waWxlZC5zdGFydFdVICsgKG1vdmVkLmhvbGQgKiBlbnRyeS5jb21waWxlZC50cmF2ZWxXVSkpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRDYW5kaWRhdGVWYWxpZGF0aW9uKGRvY3VtZW50KSB7XG4gIGNvbnN0IHNjaGVtYURpYWdub3N0aWNzID0gdmFsaWRhdGVBYm91dE5hcnJhdGl2ZURvY3VtZW50KGRvY3VtZW50KTtcbiAgY29uc3Qgc2NoZW1hRXJyb3JzID0gc2NoZW1hRGlhZ25vc3RpY3MuZmlsdGVyKChpdGVtKSA9PiBpdGVtLmxldmVsID09PSAnZXJyb3InKTtcbiAgaWYgKHNjaGVtYUVycm9ycy5sZW5ndGgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdmFsaWQ6IGZhbHNlLFxuICAgICAgcmVhc29uOiBzY2hlbWFFcnJvcnNbMF0ubWVzc2FnZSxcbiAgICAgIGRpYWdub3N0aWNzOiBzY2hlbWFEaWFnbm9zdGljcyxcbiAgICB9O1xuICB9XG4gIGNvbnN0IHBsYW4gPSBjb21waWxlQWJvdXROYXJyYXRpdmVEb2N1bWVudChkb2N1bWVudCk7XG4gIGlmICghcGxhbi52YWxpZCkge1xuICAgIGNvbnN0IGVycm9yID0gcGxhbi5kaWFnbm9zdGljcy5maW5kKChpdGVtKSA9PiBpdGVtLmxldmVsID09PSAnZXJyb3InKTtcbiAgICByZXR1cm4ge1xuICAgICAgdmFsaWQ6IGZhbHNlLFxuICAgICAgcmVhc29uOiBlcnJvcj8ubWVzc2FnZSB8fCAnVGhlIHByb3Bvc2VkIEFib3V0IG5hcnJhdGl2ZSBpcyBub3QgdmFsaWQuJyxcbiAgICAgIGRpYWdub3N0aWNzOiBwbGFuLmRpYWdub3N0aWNzLFxuICAgIH07XG4gIH1cbiAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGRpYWdub3N0aWNzOiBwbGFuLmRpYWdub3N0aWNzLCBwbGFuIH07XG59XG5cbmZ1bmN0aW9uIGNvcHlDYW1lcmFQb3NlKHRhcmdldCwgc291cmNlKSB7XG4gIGlmICghdGFyZ2V0IHx8ICFzb3VyY2UpIHJldHVybjtcbiAgdGFyZ2V0Lm9mZnNldCA9IFsuLi5zb3VyY2Uub2Zmc2V0XTtcbiAgdGFyZ2V0Lmxvb2tBdE9mZnNldCA9IFsuLi5zb3VyY2UubG9va0F0T2Zmc2V0XTtcbiAgdGFyZ2V0LmZvdiA9IHNvdXJjZS5mb3Y7XG4gIHRhcmdldC5yb2xsID0gc291cmNlLnJvbGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkKHByb2ZpbGUpIHtcbiAgcmV0dXJuIHByb2ZpbGUgPT09ICdtb2JpbGUnID8gJ21vYmlsZUV4dGVudFdVJyA6ICdleHRlbnRXVSc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYXB0dXJlQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQoe1xuICBwbGFuLFxuICBzdG9yeVdVLFxuICByZXNpemVkU2VjdGlvbklkLFxufSkge1xuICBjb25zdCB7IHNlY3Rpb24sIHNlY3Rpb25JbmRleCwgc3RvcnlXVTogY2xhbXBlZFN0b3J5V1UgfSA9IGdldFNlY3Rpb25BdFN0b3J5V1UocGxhbiwgc3RvcnlXVSk7XG4gIGNvbnN0IHJlc2l6ZWRTZWN0aW9uSW5kZXggPSBwbGFuPy5zZWN0aW9ucz8uZmluZEluZGV4KChpdGVtKSA9PiBpdGVtLmlkID09PSByZXNpemVkU2VjdGlvbklkKSA/PyAtMTtcbiAgaWYgKCFzZWN0aW9uIHx8IHJlc2l6ZWRTZWN0aW9uSW5kZXggPCAwIHx8IHNlY3Rpb25JbmRleCA8IHJlc2l6ZWRTZWN0aW9uSW5kZXgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbW9kZTogJ2Fic29sdXRlJyxcbiAgICAgIHN0b3J5V1U6IGNsZWFuVGltZWxpbmVWYWx1ZShjbGFtcGVkU3RvcnlXVSB8fCAwKSxcbiAgICB9O1xuICB9XG4gIHJldHVybiB7XG4gICAgbW9kZTogJ3NlY3Rpb24nLFxuICAgIHN0b3J5V1U6IGNsZWFuVGltZWxpbmVWYWx1ZShjbGFtcGVkU3RvcnlXVSksXG4gICAgc2VjdGlvbklkOiBzZWN0aW9uLmlkLFxuICAgIGxvY2FsUHJvZ3Jlc3M6IGNsZWFuVGltZWxpbmVWYWx1ZShjbGFtcChcbiAgICAgIChjbGFtcGVkU3RvcnlXVSAtIHNlY3Rpb24uc3RhcnRXVSkgLyBNYXRoLm1heCgwLjAwMSwgc2VjdGlvbi50cmF2ZWxXVSksXG4gICAgICAwLFxuICAgICAgMSxcbiAgICApKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbWFwQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQoY29udGV4dCwgcGxhbikge1xuICBpZiAoIXBsYW4/LnNlY3Rpb25zPy5sZW5ndGgpIHJldHVybiAwO1xuICBpZiAoY29udGV4dD8ubW9kZSAhPT0gJ3NlY3Rpb24nKSB7XG4gICAgcmV0dXJuIGNsZWFuVGltZWxpbmVWYWx1ZShjbGFtcChOdW1iZXIoY29udGV4dD8uc3RvcnlXVSkgfHwgMCwgMCwgTnVtYmVyKHBsYW4ubWF4U3RvcnlXVSB8fCAwKSkpO1xuICB9XG4gIGNvbnN0IHNlY3Rpb24gPSBwbGFuLnNlY3Rpb25zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IGNvbnRleHQuc2VjdGlvbklkKTtcbiAgaWYgKCFzZWN0aW9uKSB7XG4gICAgcmV0dXJuIGNsZWFuVGltZWxpbmVWYWx1ZShjbGFtcChOdW1iZXIoY29udGV4dC5zdG9yeVdVKSB8fCAwLCAwLCBOdW1iZXIocGxhbi5tYXhTdG9yeVdVIHx8IDApKSk7XG4gIH1cbiAgcmV0dXJuIGNsZWFuVGltZWxpbmVWYWx1ZShjbGFtcChcbiAgICBzZWN0aW9uLnN0YXJ0V1UgKyAoY2xhbXAoTnVtYmVyKGNvbnRleHQubG9jYWxQcm9ncmVzcykgfHwgMCwgMCwgMSkgKiBzZWN0aW9uLnRyYXZlbFdVKSxcbiAgICAwLFxuICAgIE51bWJlcihwbGFuLm1heFN0b3J5V1UgfHwgMCksXG4gICkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHNlbGVjdGlvbikge1xuICBjb25zdCBwcmltYXJ5ID0gbm9ybWFsaXplQ3VlTWVtYmVyKHNlbGVjdGlvbik7XG4gIGlmICghcHJpbWFyeSkgcmV0dXJuIFtdO1xuICBjb25zdCBjYW5kaWRhdGVzID0gQXJyYXkuaXNBcnJheShzZWxlY3Rpb24ubWVtYmVycykgPyBzZWxlY3Rpb24ubWVtYmVycyA6IFtdO1xuICBjb25zdCBtZW1iZXJzID0gW107XG4gIGNvbnN0IHNlZW4gPSBuZXcgU2V0KCk7XG4gIFtwcmltYXJ5LCAuLi5jYW5kaWRhdGVzXS5mb3JFYWNoKChjYW5kaWRhdGUpID0+IHtcbiAgICBjb25zdCBtZW1iZXIgPSBub3JtYWxpemVDdWVNZW1iZXIoY2FuZGlkYXRlKTtcbiAgICBpZiAoIW1lbWJlcikgcmV0dXJuO1xuICAgIGNvbnN0IGtleSA9IGN1ZU1lbWJlcktleShtZW1iZXIpO1xuICAgIGlmIChzZWVuLmhhcyhrZXkpKSByZXR1cm47XG4gICAgc2Vlbi5hZGQoa2V5KTtcbiAgICBtZW1iZXJzLnB1c2gobWVtYmVyKTtcbiAgfSk7XG4gIHJldHVybiBtZW1iZXJzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9nZ2xlQWJvdXROYXJyYXRpdmVDdWVTZWxlY3Rpb24oc2VsZWN0aW9uLCBjdWVTZWxlY3Rpb24sIHtcbiAgYWRkaXRpdmUgPSB0cnVlLFxufSA9IHt9KSB7XG4gIGNvbnN0IHRhcmdldCA9IG5vcm1hbGl6ZUN1ZU1lbWJlcihjdWVTZWxlY3Rpb24pO1xuICBpZiAoIXRhcmdldCkgcmV0dXJuIHNlbGVjdGlvbjtcbiAgaWYgKCFhZGRpdGl2ZSB8fCBzZWxlY3Rpb24/LnR5cGUgIT09ICdjdWUnKSByZXR1cm4gdGFyZ2V0O1xuXG4gIGNvbnN0IHRhcmdldEtleSA9IGN1ZU1lbWJlcktleSh0YXJnZXQpO1xuICBjb25zdCBjdXJyZW50ID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHNlbGVjdGlvbik7XG4gIGNvbnN0IHRhcmdldEluZGV4ID0gY3VycmVudC5maW5kSW5kZXgoKG1lbWJlcikgPT4gY3VlTWVtYmVyS2V5KG1lbWJlcikgPT09IHRhcmdldEtleSk7XG4gIGlmICh0YXJnZXRJbmRleCA8IDApIHJldHVybiBtYWtlQ3VlU2VsZWN0aW9uKHRhcmdldCwgWy4uLmN1cnJlbnQsIHRhcmdldF0pO1xuICBpZiAoY3VycmVudC5sZW5ndGggPT09IDEpIHJldHVybiB0YXJnZXQ7XG5cbiAgY29uc3QgbWVtYmVycyA9IGN1cnJlbnQuZmlsdGVyKChfLCBpbmRleCkgPT4gaW5kZXggIT09IHRhcmdldEluZGV4KTtcbiAgY29uc3QgY3VycmVudFByaW1hcnlLZXkgPSBjdWVNZW1iZXJLZXkobm9ybWFsaXplQ3VlTWVtYmVyKHNlbGVjdGlvbikpO1xuICBjb25zdCBwcmltYXJ5ID0gY3VycmVudFByaW1hcnlLZXkgPT09IHRhcmdldEtleVxuICAgID8gbWVtYmVycy5hdCgtMSlcbiAgICA6IG1lbWJlcnMuZmluZCgobWVtYmVyKSA9PiBjdWVNZW1iZXJLZXkobWVtYmVyKSA9PT0gY3VycmVudFByaW1hcnlLZXkpIHx8IG1lbWJlcnMuYXQoLTEpO1xuICByZXR1cm4gbWFrZUN1ZVNlbGVjdGlvbihwcmltYXJ5LCBtZW1iZXJzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUodmFsdWUsIHN0ZXAgPSBBQk9VVF9OQVJSQVRJVkVfVElNRUxJTkVfU1RFUCkge1xuICByZXR1cm4gY2xlYW5UaW1lbGluZVZhbHVlKE1hdGgucm91bmQoTnVtYmVyKHZhbHVlKSAvIHN0ZXApICogc3RlcCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBYm91dE5hcnJhdGl2ZUNhbWVyYUtleVRpbWluZ0JvdW5kcyhrZXlzLCBrZXlJbmRleCkge1xuICBjb25zdCBrZXkgPSBrZXlzW2tleUluZGV4XTtcbiAgaWYgKCFrZXkpIHJldHVybiB7IG1pbjogMCwgbWF4OiAxLCBsb2NrZWQ6IHRydWUgfTtcbiAgaWYgKGtleUluZGV4ID09PSAwIHx8IGtleUluZGV4ID09PSBrZXlzLmxlbmd0aCAtIDEpIHtcbiAgICByZXR1cm4geyBtaW46IE51bWJlcihrZXkuYXQpLCBtYXg6IE51bWJlcihrZXkuYXQpLCBsb2NrZWQ6IHRydWUgfTtcbiAgfVxuICByZXR1cm4ge1xuICAgIG1pbjogY2xlYW5UaW1lbGluZVZhbHVlKE51bWJlcihrZXlzW2tleUluZGV4IC0gMV0uYXQpICsgQUJPVVRfTkFSUkFUSVZFX1RJTUVMSU5FX1NURVApLFxuICAgIG1heDogY2xlYW5UaW1lbGluZVZhbHVlKE51bWJlcihrZXlzW2tleUluZGV4ICsgMV0uYXQpIC0gQUJPVVRfTkFSUkFUSVZFX1RJTUVMSU5FX1NURVApLFxuICAgIGxvY2tlZDogZmFsc2UsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQWJvdXROYXJyYXRpdmVDYW1lcmFLZXlEcm9wKHtcbiAgZG9jdW1lbnQsXG4gIHBsYW4sXG4gIHNvdXJjZVNlY3Rpb25JbmRleCxcbiAgc291cmNlS2V5SW5kZXgsXG4gIHN0b3J5V1UsXG59KSB7XG4gIGlmICghZG9jdW1lbnQ/LnNlY3Rpb25zPy5sZW5ndGggfHwgIXBsYW4/LnNlY3Rpb25zPy5sZW5ndGgpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBjYW1lcmEgdGltZWxpbmUgaXMgbm90IHJlYWR5LicgfTtcbiAgfVxuXG4gIGNvbnN0IGNsYW1wZWRTdG9yeVdVID0gY2xhbXAoTnVtYmVyKHN0b3J5V1UpLCAwLCBOdW1iZXIocGxhbi5tYXhTdG9yeVdVIHx8IHN0b3J5V1UpKTtcbiAgbGV0IHNlY3Rpb25JbmRleCA9IHBsYW4uc2VjdGlvbnMuZmluZEluZGV4KChzZWN0aW9uLCBpbmRleCkgPT4ge1xuICAgIGNvbnN0IG5leHRTdGFydFdVID0gcGxhbi5zZWN0aW9uc1tpbmRleCArIDFdPy5zdGFydFdVID8/IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcbiAgICByZXR1cm4gY2xhbXBlZFN0b3J5V1UgPj0gc2VjdGlvbi5zdGFydFdVICYmIGNsYW1wZWRTdG9yeVdVIDwgbmV4dFN0YXJ0V1U7XG4gIH0pO1xuICBpZiAoc2VjdGlvbkluZGV4IDwgMCkgc2VjdGlvbkluZGV4ID0gcGxhbi5zZWN0aW9ucy5sZW5ndGggLSAxO1xuXG4gIGNvbnN0IGNvbXBpbGVkID0gcGxhbi5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICBjb25zdCBzZWN0aW9uID0gZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XTtcbiAgaWYgKCFjb21waWxlZCB8fCAhc2VjdGlvbj8uY2FtZXJhPy5rZXlzPy5sZW5ndGggfHwgIShjb21waWxlZC50cmF2ZWxXVSA+IDApKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGlzIFNlY3Rpb24gY2Fubm90IHJlY2VpdmUgYSBjYW1lcmEga2V5LicgfTtcbiAgfVxuXG4gIGNvbnN0IHJhd0F0ID0gKGNsYW1wZWRTdG9yeVdVIC0gY29tcGlsZWQuc3RhcnRXVSkgLyBjb21waWxlZC50cmF2ZWxXVTtcbiAgY29uc3QgcmVxdWVzdGVkQXQgPSBjbGFtcChcbiAgICBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlKHJhd0F0KSxcbiAgICBBQk9VVF9OQVJSQVRJVkVfVElNRUxJTkVfU1RFUCxcbiAgICAxIC0gQUJPVVRfTkFSUkFUSVZFX1RJTUVMSU5FX1NURVAsXG4gICk7XG4gIGNvbnN0IG5laWdoYm91cnMgPSBzZWN0aW9uLmNhbWVyYS5rZXlzXG4gICAgLmZpbHRlcigoa2V5LCBrZXlJbmRleCkgPT4gIShzZWN0aW9uSW5kZXggPT09IHNvdXJjZVNlY3Rpb25JbmRleCAmJiBrZXlJbmRleCA9PT0gc291cmNlS2V5SW5kZXgpKVxuICAgIC5tYXAoKGtleSkgPT4gTnVtYmVyKGtleS5hdCkpXG4gICAgLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcbiAgY29uc3QgbmV4dEluZGV4ID0gbmVpZ2hib3Vycy5maW5kSW5kZXgoKGF0KSA9PiBhdCA+IHJlcXVlc3RlZEF0KTtcbiAgY29uc3QgaW5zZXJ0aW9uSW5kZXggPSBuZXh0SW5kZXggPCAwID8gbmVpZ2hib3Vycy5sZW5ndGggOiBuZXh0SW5kZXg7XG4gIGNvbnN0IHByZXZpb3VzQXQgPSBuZWlnaGJvdXJzW2luc2VydGlvbkluZGV4IC0gMV0gPz8gMDtcbiAgY29uc3QgbmV4dEF0ID0gbmVpZ2hib3Vyc1tpbnNlcnRpb25JbmRleF0gPz8gMTtcbiAgY29uc3QgbWluID0gY2xlYW5UaW1lbGluZVZhbHVlKHByZXZpb3VzQXQgKyBBQk9VVF9OQVJSQVRJVkVfVElNRUxJTkVfU1RFUCk7XG4gIGNvbnN0IG1heCA9IGNsZWFuVGltZWxpbmVWYWx1ZShuZXh0QXQgLSBBQk9VVF9OQVJSQVRJVkVfVElNRUxJTkVfU1RFUCk7XG4gIGlmIChtaW4gPiBtYXgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdmFsaWQ6IGZhbHNlLFxuICAgICAgcmVhc29uOiBgJHtzZWN0aW9uLmxhYmVsfSBoYXMgbm8gc2FmZSBnYXAgZm9yIGFub3RoZXIgY2FtZXJhIGtleSBoZXJlLmAsXG4gICAgICBzZWN0aW9uSW5kZXgsXG4gICAgICBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGF0ID0gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKHJlcXVlc3RlZEF0LCBtaW4sIG1heCkpO1xuICBjb25zdCBrZXlJbmRleCA9IG5laWdoYm91cnMuZmluZEluZGV4KChpdGVtKSA9PiBpdGVtID4gYXQpO1xuICByZXR1cm4ge1xuICAgIHZhbGlkOiB0cnVlLFxuICAgIHNlY3Rpb25JbmRleCxcbiAgICBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsXG4gICAgc2VjdGlvbkxhYmVsOiBzZWN0aW9uLmxhYmVsLFxuICAgIGtleUluZGV4OiBrZXlJbmRleCA8IDAgPyBuZWlnaGJvdXJzLmxlbmd0aCA6IGtleUluZGV4LFxuICAgIGF0LFxuICAgIHN0b3J5V1U6IGNsZWFuVGltZWxpbmVWYWx1ZShjb21waWxlZC5zdGFydFdVICsgKGF0ICogY29tcGlsZWQudHJhdmVsV1UpKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzKGN1ZSkge1xuICBjb25zdCBmb2N1cyA9IE51bWJlcihjdWUuaG9sZCk7XG4gIGNvbnN0IGxlYWQgPSBNYXRoLm1heCgwLCBmb2N1cyAtIE51bWJlcihjdWUuZW50ZXIpKTtcbiAgY29uc3QgdHJhaWwgPSBNYXRoLm1heCgwLCBOdW1iZXIoY3VlLmV4aXQpIC0gZm9jdXMpO1xuICByZXR1cm4ge1xuICAgIG1pbjogTWF0aC5tYXgoMCwgbGVhZCAtIDEpLFxuICAgIG1heDogTWF0aC5taW4oMSwgMiAtIHRyYWlsKSxcbiAgICBsZWFkLFxuICAgIHRyYWlsLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbW92ZUFib3V0TmFycmF0aXZlQ3VlVGltaW5nKGN1ZSwgbmV4dEZvY3VzLCB7IHNuYXAgPSB0cnVlIH0gPSB7fSkge1xuICBjb25zdCBib3VuZHMgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZ0JvdW5kcyhjdWUpO1xuICBjb25zdCByZXF1ZXN0ZWRGb2N1cyA9IGNsYW1wKE51bWJlcihuZXh0Rm9jdXMpLCBib3VuZHMubWluLCBib3VuZHMubWF4KTtcbiAgY29uc3QgaG9sZCA9IHNuYXBcbiAgICA/IGNsZWFuVGltZWxpbmVWYWx1ZShjbGFtcChcbiAgICAgIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUocmVxdWVzdGVkRm9jdXMpLFxuICAgICAgYm91bmRzLm1pbixcbiAgICAgIGJvdW5kcy5tYXgsXG4gICAgKSlcbiAgICA6IGNsZWFuVGltZWxpbmVWYWx1ZShyZXF1ZXN0ZWRGb2N1cyk7XG4gIHJldHVybiB7XG4gICAgLi4uY3VlLFxuICAgIGVudGVyOiBjbGVhblRpbWVsaW5lVmFsdWUoaG9sZCAtIGJvdW5kcy5sZWFkKSxcbiAgICBob2xkLFxuICAgIGV4aXQ6IGNsZWFuVGltZWxpbmVWYWx1ZShob2xkICsgYm91bmRzLnRyYWlsKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwTW92ZSh7XG4gIGRvY3VtZW50LFxuICBwbGFuLFxuICBtZW1iZXJzLFxuICBwcmltYXJ5LFxuICBkZWx0YVdVLFxuICBsb2NhbERlbHRhLFxufSkge1xuICBjb25zdCByZXNvbHZlZCA9IGdldEN1ZUVudHJpZXMoeyBkb2N1bWVudCwgcGxhbiwgbWVtYmVycywgcHJpbWFyeSB9KTtcbiAgaWYgKCFyZXNvbHZlZC52YWxpZCkgcmV0dXJuIHJlc29sdmVkO1xuICBjb25zdCB7IGVudHJpZXMsIHByaW1hcnlFbnRyeSB9ID0gcmVzb2x2ZWQ7XG4gIGNvbnN0IHJlcXVlc3RlZERlbHRhV1UgPSBOdW1iZXIuaXNGaW5pdGUoTnVtYmVyKGRlbHRhV1UpKVxuICAgID8gTnVtYmVyKGRlbHRhV1UpXG4gICAgOiBOdW1iZXIobG9jYWxEZWx0YSB8fCAwKSAqIHByaW1hcnlFbnRyeS5jb21waWxlZC50cmF2ZWxXVTtcbiAgY29uc3QgbWluRGVsdGFXVSA9IE1hdGgubWF4KC4uLmVudHJpZXMubWFwKChlbnRyeSkgPT4gZW50cnkubWluR2xvYmFsV1UgLSBlbnRyeS5nbG9iYWxXVSkpO1xuICBjb25zdCBtYXhEZWx0YVdVID0gTWF0aC5taW4oLi4uZW50cmllcy5tYXAoKGVudHJ5KSA9PiBlbnRyeS5tYXhHbG9iYWxXVSAtIGVudHJ5Lmdsb2JhbFdVKSk7XG4gIGNvbnN0IGFwcGxpZWREZWx0YVdVID0gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKHJlcXVlc3RlZERlbHRhV1UsIG1pbkRlbHRhV1UsIG1heERlbHRhV1UpKTtcbiAgY29uc3QgbW92ZXMgPSBlbnRyaWVzLm1hcCgoZW50cnkpID0+IGNyZWF0ZUN1ZU1vdmUoZW50cnksIGVudHJ5Lmdsb2JhbFdVICsgYXBwbGllZERlbHRhV1UpKTtcblxuICByZXR1cm4ge1xuICAgIHZhbGlkOiB0cnVlLFxuICAgIHJlcXVlc3RlZERlbHRhV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShyZXF1ZXN0ZWREZWx0YVdVKSxcbiAgICBkZWx0YVdVOiBhcHBsaWVkRGVsdGFXVSxcbiAgICBtaW5EZWx0YVdVOiBjbGVhblRpbWVsaW5lVmFsdWUobWluRGVsdGFXVSksXG4gICAgbWF4RGVsdGFXVTogY2xlYW5UaW1lbGluZVZhbHVlKG1heERlbHRhV1UpLFxuICAgIG1vdmVzLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRGlzdHJpYnV0aW9uKHtcbiAgZG9jdW1lbnQsXG4gIHBsYW4sXG4gIG1lbWJlcnMsXG4gIHByaW1hcnksXG59KSB7XG4gIGNvbnN0IHJlc29sdmVkID0gZ2V0Q3VlRW50cmllcyh7IGRvY3VtZW50LCBwbGFuLCBtZW1iZXJzLCBwcmltYXJ5IH0pO1xuICBpZiAoIXJlc29sdmVkLnZhbGlkKSByZXR1cm4gcmVzb2x2ZWQ7XG4gIGNvbnN0IG9yZGVyZWQgPSBzb3J0Q3VlRW50cmllcyhyZXNvbHZlZC5lbnRyaWVzKTtcbiAgaWYgKG9yZGVyZWQubGVuZ3RoIDwgMikge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnU2VsZWN0IGF0IGxlYXN0IHR3byB0aXRsZSBDdWVzIHRvIGRpc3RyaWJ1dGUuJyB9O1xuICB9XG4gIGNvbnN0IGdhcFdVID0gY2xlYW5UaW1lbGluZVZhbHVlKFxuICAgIChvcmRlcmVkLmF0KC0xKS5nbG9iYWxXVSAtIG9yZGVyZWRbMF0uZ2xvYmFsV1UpIC8gKG9yZGVyZWQubGVuZ3RoIC0gMSksXG4gICk7XG4gIGNvbnN0IHJlc3VsdCA9IHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUV4YWN0R2FwKHtcbiAgICBkb2N1bWVudCxcbiAgICBwbGFuLFxuICAgIG1lbWJlcnM6IG9yZGVyZWQubWFwKChlbnRyeSkgPT4gZW50cnkubWVtYmVyKSxcbiAgICBwcmltYXJ5OiBvcmRlcmVkWzBdLm1lbWJlcixcbiAgICBnYXBXVSxcbiAgICBhbmNob3I6ICdmaXJzdCcsXG4gIH0pO1xuICByZXR1cm4ge1xuICAgIC4uLnJlc3VsdCxcbiAgICBvcGVyYXRpb246ICdkaXN0cmlidXRlJyxcbiAgICBnYXBXVSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUV4YWN0R2FwKHtcbiAgZG9jdW1lbnQsXG4gIHBsYW4sXG4gIG1lbWJlcnMsXG4gIHByaW1hcnksXG4gIGdhcFdVLFxuICBhbmNob3IgPSAncHJpbWFyeScsXG59KSB7XG4gIGNvbnN0IHJlc29sdmVkID0gZ2V0Q3VlRW50cmllcyh7IGRvY3VtZW50LCBwbGFuLCBtZW1iZXJzLCBwcmltYXJ5IH0pO1xuICBpZiAoIXJlc29sdmVkLnZhbGlkKSByZXR1cm4gcmVzb2x2ZWQ7XG4gIGNvbnN0IG9yZGVyZWQgPSBzb3J0Q3VlRW50cmllcyhyZXNvbHZlZC5lbnRyaWVzKTtcbiAgaWYgKG9yZGVyZWQubGVuZ3RoIDwgMikge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnU2VsZWN0IGF0IGxlYXN0IHR3byB0aXRsZSBDdWVzIHRvIHNldCBhIGdhcC4nIH07XG4gIH1cbiAgaWYgKCFbJ3ByaW1hcnknLCAnZmlyc3QnLCAnbGFzdCddLmluY2x1ZGVzKGFuY2hvcikpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ0Nob29zZSBQcmltYXJ5LCBGaXJzdCwgb3IgTGFzdCBhcyB0aGUgZ2FwIGFuY2hvci4nIH07XG4gIH1cblxuICBjb25zdCByZXF1ZXN0ZWRHYXBXVSA9IE51bWJlcihnYXBXVSk7XG4gIGlmICghTnVtYmVyLmlzRmluaXRlKHJlcXVlc3RlZEdhcFdVKSB8fCByZXF1ZXN0ZWRHYXBXVSA8IDApIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ0dhcCBtdXN0IGJlIGEgbm9uLW5lZ2F0aXZlIFdVIHZhbHVlLicgfTtcbiAgfVxuICBjb25zdCBhbmNob3JJbmRleCA9IGFuY2hvciA9PT0gJ2ZpcnN0J1xuICAgID8gMFxuICAgIDogYW5jaG9yID09PSAnbGFzdCdcbiAgICAgID8gb3JkZXJlZC5sZW5ndGggLSAxXG4gICAgICA6IE1hdGgubWF4KDAsIG9yZGVyZWQuZmluZEluZGV4KChlbnRyeSkgPT4gKFxuICAgICAgICBjdWVNZW1iZXJLZXkoZW50cnkubWVtYmVyKSA9PT0gY3VlTWVtYmVyS2V5KHJlc29sdmVkLnByaW1hcnlFbnRyeS5tZW1iZXIpXG4gICAgICApKSk7XG4gIGNvbnN0IGFuY2hvckVudHJ5ID0gb3JkZXJlZFthbmNob3JJbmRleF07XG4gIGNvbnN0IGFuY2hvcldVID0gYW5jaG9yRW50cnkuZ2xvYmFsV1U7XG4gIGxldCBtaW5pbXVtVmFsaWRHYXBXVSA9IDA7XG4gIGxldCBtYXhpbXVtVmFsaWRHYXBXVSA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcblxuICBvcmRlcmVkLmZvckVhY2goKGVudHJ5LCBpbmRleCkgPT4ge1xuICAgIGNvbnN0IG9mZnNldCA9IGluZGV4IC0gYW5jaG9ySW5kZXg7XG4gICAgaWYgKG9mZnNldCA+IDApIHtcbiAgICAgIG1pbmltdW1WYWxpZEdhcFdVID0gTWF0aC5tYXgobWluaW11bVZhbGlkR2FwV1UsIChlbnRyeS5taW5HbG9iYWxXVSAtIGFuY2hvcldVKSAvIG9mZnNldCk7XG4gICAgICBtYXhpbXVtVmFsaWRHYXBXVSA9IE1hdGgubWluKG1heGltdW1WYWxpZEdhcFdVLCAoZW50cnkubWF4R2xvYmFsV1UgLSBhbmNob3JXVSkgLyBvZmZzZXQpO1xuICAgIH0gZWxzZSBpZiAob2Zmc2V0IDwgMCkge1xuICAgICAgY29uc3QgZGlzdGFuY2UgPSAtb2Zmc2V0O1xuICAgICAgbWluaW11bVZhbGlkR2FwV1UgPSBNYXRoLm1heChtaW5pbXVtVmFsaWRHYXBXVSwgKGFuY2hvcldVIC0gZW50cnkubWF4R2xvYmFsV1UpIC8gZGlzdGFuY2UpO1xuICAgICAgbWF4aW11bVZhbGlkR2FwV1UgPSBNYXRoLm1pbihtYXhpbXVtVmFsaWRHYXBXVSwgKGFuY2hvcldVIC0gZW50cnkubWluR2xvYmFsV1UpIC8gZGlzdGFuY2UpO1xuICAgIH1cbiAgfSk7XG4gIG1pbmltdW1WYWxpZEdhcFdVID0gY2xlYW5UaW1lbGluZVZhbHVlKE1hdGgubWF4KDAsIG1pbmltdW1WYWxpZEdhcFdVKSk7XG4gIG1heGltdW1WYWxpZEdhcFdVID0gY2xlYW5UaW1lbGluZVZhbHVlKE1hdGgubWF4KDAsIG1heGltdW1WYWxpZEdhcFdVKSk7XG5cbiAgY29uc3QgYm91bmRhcnlEZXRhaWxzID0ge1xuICAgIHJlcXVlc3RlZEdhcFdVOiBjbGVhblRpbWVsaW5lVmFsdWUocmVxdWVzdGVkR2FwV1UpLFxuICAgIG1pbmltdW1WYWxpZEdhcFdVLFxuICAgIG1heGltdW1WYWxpZEdhcFdVLFxuICAgIGFuY2hvcixcbiAgICBhbmNob3JDdWVJZDogYW5jaG9yRW50cnkuY3VlLmlkLFxuICB9O1xuICBpZiAobWluaW11bVZhbGlkR2FwV1UgPiBtYXhpbXVtVmFsaWRHYXBXVSArIFJIWVRITV9FUFNJTE9OKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbGlkOiBmYWxzZSxcbiAgICAgIHJlYXNvbjogJ1RoZXNlIFNlY3Rpb24gYm91bmRhcmllcyBkbyBub3QgcGVybWl0IG9uZSBzaGFyZWQgQ3VlIGdhcC4nLFxuICAgICAgLi4uYm91bmRhcnlEZXRhaWxzLFxuICAgIH07XG4gIH1cbiAgaWYgKHJlcXVlc3RlZEdhcFdVID4gbWF4aW11bVZhbGlkR2FwV1UgKyBSSFlUSE1fRVBTSUxPTikge1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICByZWFzb246IGBTZWN0aW9uIGJvdW5kYXJpZXMgbGltaXQgdGhpcyBnYXAgdG8gJHttYXhpbXVtVmFsaWRHYXBXVS50b0ZpeGVkKDMpfSBXVS5gLFxuICAgICAgLi4uYm91bmRhcnlEZXRhaWxzLFxuICAgIH07XG4gIH1cbiAgaWYgKHJlcXVlc3RlZEdhcFdVIDwgbWluaW11bVZhbGlkR2FwV1UgLSBSSFlUSE1fRVBTSUxPTikge1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICByZWFzb246IGBTZWN0aW9uIGJvdW5kYXJpZXMgcmVxdWlyZSBhdCBsZWFzdCAke21pbmltdW1WYWxpZEdhcFdVLnRvRml4ZWQoMyl9IFdVLmAsXG4gICAgICAuLi5ib3VuZGFyeURldGFpbHMsXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IG1vdmVzID0gb3JkZXJlZC5tYXAoKGVudHJ5LCBpbmRleCkgPT4gKFxuICAgIGNyZWF0ZUN1ZU1vdmUoZW50cnksIGFuY2hvcldVICsgKChpbmRleCAtIGFuY2hvckluZGV4KSAqIHJlcXVlc3RlZEdhcFdVKSlcbiAgKSk7XG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgLi4uYm91bmRhcnlEZXRhaWxzLFxuICAgIG1vdmVzLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBBbGlnbih7XG4gIGRvY3VtZW50LFxuICBwbGFuLFxuICBtZW1iZXJzLFxuICBwcmltYXJ5LFxuICBwbGF5aGVhZFdVLFxufSkge1xuICBjb25zdCByZXNvbHZlZCA9IGdldEN1ZUVudHJpZXMoeyBkb2N1bWVudCwgcGxhbiwgbWVtYmVycywgcHJpbWFyeSB9KTtcbiAgaWYgKCFyZXNvbHZlZC52YWxpZCkgcmV0dXJuIHJlc29sdmVkO1xuICBpZiAoIU51bWJlci5pc0Zpbml0ZShOdW1iZXIocGxheWhlYWRXVSkpKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGUgcGxheWhlYWQgcG9zaXRpb24gaXMgbm90IGF2YWlsYWJsZS4nIH07XG4gIH1cbiAgY29uc3QgcmVxdWVzdGVkRGVsdGFXVSA9IE51bWJlcihwbGF5aGVhZFdVKSAtIHJlc29sdmVkLnByaW1hcnlFbnRyeS5nbG9iYWxXVTtcbiAgY29uc3QgcmVzdWx0ID0gcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBNb3ZlKHtcbiAgICBkb2N1bWVudCxcbiAgICBwbGFuLFxuICAgIG1lbWJlcnMsXG4gICAgcHJpbWFyeTogcmVzb2x2ZWQucHJpbWFyeUVudHJ5Lm1lbWJlcixcbiAgICBkZWx0YVdVOiByZXF1ZXN0ZWREZWx0YVdVLFxuICB9KTtcbiAgaWYgKCFyZXN1bHQudmFsaWQpIHJldHVybiByZXN1bHQ7XG4gIHJldHVybiB7XG4gICAgLi4ucmVzdWx0LFxuICAgIHBsYXloZWFkV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShOdW1iZXIocGxheWhlYWRXVSkpLFxuICAgIGFsaWduZWQ6IE1hdGguYWJzKHJlc3VsdC5kZWx0YVdVIC0gcmVxdWVzdGVkRGVsdGFXVSkgPD0gUkhZVEhNX0VQU0lMT04sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVBYm91dE5hcnJhdGl2ZUR1cGxpY2F0ZUlkKGRvY3VtZW50LCBzb3VyY2VJZCwge1xuICByZXNlcnZlZElkcyA9IFtdLFxufSA9IHt9KSB7XG4gIGNvbnN0IHVzZWRJZHMgPSBnZXRBYm91dE5hcnJhdGl2ZVVzZWRJZHMoZG9jdW1lbnQpO1xuICByZXNlcnZlZElkcy5mb3JFYWNoKChpZCkgPT4gdXNlZElkcy5hZGQoU3RyaW5nKGlkKSkpO1xuICByZXR1cm4gbmV4dER1cGxpY2F0ZUlkKHNvdXJjZUlkLCB1c2VkSWRzKTtcbn1cblxuZnVuY3Rpb24gcmVtYXBDdWVSZWZlcmVuY2UoY3VlLCBpZE1hcCkge1xuICBpZiAoIWN1ZT8uYW5jaG9yIHx8ICFpZE1hcC5oYXMoY3VlLmFuY2hvcikpIHJldHVybiBjdWU7XG4gIHJldHVybiB7IC4uLmN1ZSwgYW5jaG9yOiBpZE1hcC5nZXQoY3VlLmFuY2hvcikgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGR1cGxpY2F0ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXAoe1xuICBkb2N1bWVudCxcbiAgbWVtYmVycyxcbiAgcHJpbWFyeSxcbn0pIHtcbiAgaWYgKCFkb2N1bWVudD8uc2VjdGlvbnM/Lmxlbmd0aCkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIEFib3V0IGRvY3VtZW50IGlzIG5vdCByZWFkeS4nIH07XG4gIH1cbiAgY29uc3Qgbm9ybWFsaXplZE1lbWJlcnMgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoe1xuICAgIC4uLihub3JtYWxpemVDdWVNZW1iZXIocHJpbWFyeSkgfHwgbm9ybWFsaXplQ3VlTWVtYmVyKG1lbWJlcnM/LlswXSkgfHwge30pLFxuICAgIG1lbWJlcnMsXG4gIH0pO1xuICBpZiAoIW5vcm1hbGl6ZWRNZW1iZXJzLmxlbmd0aCkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnU2VsZWN0IGF0IGxlYXN0IG9uZSB0aXRsZSBDdWUgdG8gZHVwbGljYXRlLicgfTtcbiAgfVxuICBjb25zdCBzZWxlY3RlZEtleXMgPSBuZXcgU2V0KG5vcm1hbGl6ZWRNZW1iZXJzLm1hcChjdWVNZW1iZXJLZXkpKTtcbiAgY29uc3QgYXZhaWxhYmxlS2V5cyA9IG5ldyBTZXQoKGRvY3VtZW50LnNlY3Rpb25zIHx8IFtdKS5mbGF0TWFwKChzZWN0aW9uKSA9PiAoXG4gICAgKHNlY3Rpb24udGV4dD8uY3VlcyB8fCBbXSkubWFwKChjdWUpID0+IGAke3NlY3Rpb24uaWR9OiR7Y3VlLmlkfWApXG4gICkpKTtcbiAgY29uc3QgbWlzc2luZ01lbWJlciA9IG5vcm1hbGl6ZWRNZW1iZXJzLmZpbmQoKG1lbWJlcikgPT4gIWF2YWlsYWJsZUtleXMuaGFzKGN1ZU1lbWJlcktleShtZW1iZXIpKSk7XG4gIGlmIChtaXNzaW5nTWVtYmVyKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246IGBUaXRsZSBDdWUgJHttaXNzaW5nTWVtYmVyLmN1ZUlkfSBpcyBubyBsb25nZXIgYXZhaWxhYmxlLmAgfTtcbiAgfVxuXG4gIGNvbnN0IGNhbmRpZGF0ZSA9IGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChkb2N1bWVudCk7XG4gIGNvbnN0IHVzZWRJZHMgPSBnZXRBYm91dE5hcnJhdGl2ZVVzZWRJZHMoY2FuZGlkYXRlKTtcbiAgY29uc3QgaWRNYXAgPSBuZXcgTWFwKCk7XG4gIGNhbmRpZGF0ZS5zZWN0aW9ucy5mb3JFYWNoKChzZWN0aW9uKSA9PiB7XG4gICAgKHNlY3Rpb24udGV4dD8uY3VlcyB8fCBbXSkuZm9yRWFjaCgoY3VlKSA9PiB7XG4gICAgICBpZiAoIXNlbGVjdGVkS2V5cy5oYXMoYCR7c2VjdGlvbi5pZH06JHtjdWUuaWR9YCkpIHJldHVybjtcbiAgICAgIGlkTWFwLnNldChjdWUuaWQsIG5leHREdXBsaWNhdGVJZChjdWUuaWQsIHVzZWRJZHMpKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgY29uc3QgaXRlbXMgPSBbXTtcbiAgY2FuZGlkYXRlLnNlY3Rpb25zLmZvckVhY2goKHNlY3Rpb24pID0+IHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoc2VjdGlvbi50ZXh0Py5jdWVzKSkgcmV0dXJuO1xuICAgIHNlY3Rpb24udGV4dC5jdWVzID0gc2VjdGlvbi50ZXh0LmN1ZXMuZmxhdE1hcCgoY3VlKSA9PiB7XG4gICAgICBjb25zdCBtZW1iZXJLZXkgPSBgJHtzZWN0aW9uLmlkfToke2N1ZS5pZH1gO1xuICAgICAgaWYgKCFzZWxlY3RlZEtleXMuaGFzKG1lbWJlcktleSkpIHJldHVybiBbY3VlXTtcbiAgICAgIGNvbnN0IGR1cGxpY2F0ZSA9IHJlbWFwQ3VlUmVmZXJlbmNlKHtcbiAgICAgICAgLi4uY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KGN1ZSksXG4gICAgICAgIGlkOiBpZE1hcC5nZXQoY3VlLmlkKSxcbiAgICAgIH0sIGlkTWFwKTtcbiAgICAgIGl0ZW1zLnB1c2goe1xuICAgICAgICBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsXG4gICAgICAgIHNvdXJjZUN1ZUlkOiBjdWUuaWQsXG4gICAgICAgIGN1ZUlkOiBkdXBsaWNhdGUuaWQsXG4gICAgICAgIGN1ZTogZHVwbGljYXRlLFxuICAgICAgfSk7XG4gICAgICByZXR1cm4gW2N1ZSwgZHVwbGljYXRlXTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgY29uc3QgdmFsaWRhdGlvbiA9IGdldENhbmRpZGF0ZVZhbGlkYXRpb24oY2FuZGlkYXRlKTtcbiAgaWYgKCF2YWxpZGF0aW9uLnZhbGlkKSByZXR1cm4gdmFsaWRhdGlvbjtcbiAgY29uc3QgcHJpbWFyeU1lbWJlciA9IG5vcm1hbGl6ZUN1ZU1lbWJlcihwcmltYXJ5KSB8fCBub3JtYWxpemVkTWVtYmVyc1swXTtcbiAgY29uc3QgcHJpbWFyeUN1ZUlkID0gaWRNYXAuZ2V0KHByaW1hcnlNZW1iZXIuY3VlSWQpIHx8IGl0ZW1zWzBdLmN1ZUlkO1xuICBjb25zdCBzZWxlY3Rpb25NZW1iZXJzID0gaXRlbXMubWFwKChpdGVtKSA9PiAoe1xuICAgIHR5cGU6ICdjdWUnLFxuICAgIHNlY3Rpb25JZDogaXRlbS5zZWN0aW9uSWQsXG4gICAgY3VlSWQ6IGl0ZW0uY3VlSWQsXG4gICAga2V5UGFydDogJ2ZvY3VzJyxcbiAgfSkpO1xuICBjb25zdCBwcmltYXJ5U2VsZWN0aW9uID0gc2VsZWN0aW9uTWVtYmVycy5maW5kKChtZW1iZXIpID0+IG1lbWJlci5jdWVJZCA9PT0gcHJpbWFyeUN1ZUlkKVxuICAgIHx8IHNlbGVjdGlvbk1lbWJlcnNbMF07XG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgZG9jdW1lbnQ6IGNhbmRpZGF0ZSxcbiAgICBkaWFnbm9zdGljczogdmFsaWRhdGlvbi5kaWFnbm9zdGljcyxcbiAgICBpZE1hcDogT2JqZWN0LmZyb21FbnRyaWVzKGlkTWFwKSxcbiAgICBpdGVtcyxcbiAgICBzZWxlY3Rpb246IG1ha2VDdWVTZWxlY3Rpb24ocHJpbWFyeVNlbGVjdGlvbiwgc2VsZWN0aW9uTWVtYmVycyksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGl0Y2hBYm91dE5hcnJhdGl2ZUNhbWVyYUJvdW5kYXJpZXMoZG9jdW1lbnQsIHtcbiAgYm91bmRhcnlJbmRleGVzID0gbnVsbCxcbn0gPSB7fSkge1xuICBjb25zdCBjYW5kaWRhdGUgPSBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoZG9jdW1lbnQpO1xuICBjb25zdCByZXF1ZXN0ZWRCb3VuZGFyaWVzID0gYm91bmRhcnlJbmRleGVzID09IG51bGxcbiAgICA/IGNhbmRpZGF0ZS5zZWN0aW9ucy5tYXAoKF8sIGluZGV4KSA9PiBpbmRleCkuc2xpY2UoMSlcbiAgICA6IFsuLi5uZXcgU2V0KGJvdW5kYXJ5SW5kZXhlcy5tYXAoTnVtYmVyKSldLnNvcnQoKGxlZnQsIHJpZ2h0KSA9PiBsZWZ0IC0gcmlnaHQpO1xuICByZXF1ZXN0ZWRCb3VuZGFyaWVzLmZvckVhY2goKHNlY3Rpb25JbmRleCkgPT4ge1xuICAgIGlmICghTnVtYmVyLmlzSW50ZWdlcihzZWN0aW9uSW5kZXgpIHx8IHNlY3Rpb25JbmRleCA8PSAwIHx8IHNlY3Rpb25JbmRleCA+PSBjYW5kaWRhdGUuc2VjdGlvbnMubGVuZ3RoKSByZXR1cm47XG4gICAgY29uc3QgcHJldmlvdXNLZXkgPSBjYW5kaWRhdGUuc2VjdGlvbnNbc2VjdGlvbkluZGV4IC0gMV0/LmNhbWVyYT8ua2V5cz8uYXQoLTEpO1xuICAgIGNvbnN0IG5leHRLZXkgPSBjYW5kaWRhdGUuc2VjdGlvbnNbc2VjdGlvbkluZGV4XT8uY2FtZXJhPy5rZXlzPy5bMF07XG4gICAgY29weUNhbWVyYVBvc2UobmV4dEtleSwgcHJldmlvdXNLZXkpO1xuICB9KTtcbiAgcmV0dXJuIGNhbmRpZGF0ZTtcbn1cblxuZnVuY3Rpb24gcmVtYXBTZWN0aW9uUmVmZXJlbmNlcyh2YWx1ZSwgaWRNYXAsIGtleSA9ICcnKSB7XG4gIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkgcmV0dXJuIHZhbHVlLm1hcCgoaXRlbSkgPT4gcmVtYXBTZWN0aW9uUmVmZXJlbmNlcyhpdGVtLCBpZE1hcCwga2V5KSk7XG4gIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgIGNvbnN0IHJlZmVyZW5jZUtleSA9IGtleSA9PT0gJ2FuY2hvcicgfHwga2V5LmVuZHNXaXRoKCdJZCcpIHx8IGtleS5lbmRzV2l0aCgnUmVmJyk7XG4gICAgcmV0dXJuIHJlZmVyZW5jZUtleSAmJiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnICYmIGlkTWFwLmhhcyh2YWx1ZSlcbiAgICAgID8gaWRNYXAuZ2V0KHZhbHVlKVxuICAgICAgOiB2YWx1ZTtcbiAgfVxuICByZXR1cm4gT2JqZWN0LmZyb21FbnRyaWVzKE9iamVjdC5lbnRyaWVzKHZhbHVlKS5tYXAoKFtjaGlsZEtleSwgY2hpbGRWYWx1ZV0pID0+IFtcbiAgICBjaGlsZEtleSxcbiAgICByZW1hcFNlY3Rpb25SZWZlcmVuY2VzKGNoaWxkVmFsdWUsIGlkTWFwLCBjaGlsZEtleSksXG4gIF0pKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGR1cGxpY2F0ZUFib3V0TmFycmF0aXZlU2VjdGlvbih7XG4gIGRvY3VtZW50LFxuICBzZWN0aW9uSWQsXG59KSB7XG4gIGlmICghZG9jdW1lbnQ/LnNlY3Rpb25zPy5sZW5ndGgpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBBYm91dCBkb2N1bWVudCBpcyBub3QgcmVhZHkuJyB9O1xuICB9XG4gIGNvbnN0IHNvdXJjZUluZGV4ID0gZG9jdW1lbnQuc2VjdGlvbnMuZmluZEluZGV4KChzZWN0aW9uKSA9PiBzZWN0aW9uLmlkID09PSBzZWN0aW9uSWQpO1xuICBjb25zdCBzb3VyY2UgPSBkb2N1bWVudC5zZWN0aW9uc1tzb3VyY2VJbmRleF07XG4gIGlmICghc291cmNlKSByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogYFNlY3Rpb24gJHtzZWN0aW9uSWR9IGlzIG5vIGxvbmdlciBhdmFpbGFibGUuYCB9O1xuICBpZiAoc291cmNlLmxvY2tlZCkgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdVbmxvY2sgdGhpcyBTZWN0aW9uIGJlZm9yZSBkdXBsaWNhdGluZyBpdC4nIH07XG4gIGlmIChzb3VyY2UudHlwZSA9PT0gJ2ZpbmFsZScpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBwcm90ZWN0ZWQgZmluYWxlIGNhbm5vdCBiZSBkdXBsaWNhdGVkLicgfTtcbiAgfVxuXG4gIGNvbnN0IHVzZWRJZHMgPSBnZXRBYm91dE5hcnJhdGl2ZVVzZWRJZHMoZG9jdW1lbnQpO1xuICBjb25zdCBpZE1hcCA9IG5ldyBNYXAoKTtcbiAgaWRNYXAuc2V0KHNvdXJjZS5pZCwgbmV4dER1cGxpY2F0ZUlkKHNvdXJjZS5pZCwgdXNlZElkcykpO1xuICAoc291cmNlLnRleHQ/LmN1ZXMgfHwgW10pLmZvckVhY2goKGN1ZSkgPT4gaWRNYXAuc2V0KGN1ZS5pZCwgbmV4dER1cGxpY2F0ZUlkKGN1ZS5pZCwgdXNlZElkcykpKTtcbiAgKHNvdXJjZS50ZXh0Py5ibG9ja3MgfHwgW10pLmZvckVhY2goKGJsb2NrKSA9PiBpZE1hcC5zZXQoYmxvY2suaWQsIG5leHREdXBsaWNhdGVJZChibG9jay5pZCwgdXNlZElkcykpKTtcbiAgaWYgKHNvdXJjZS50ZXh0Py5kaXNjaXBsaW5lUmV2ZWFsKSB7XG4gICAgY29uc3QgcmV2ZWFsID0gc291cmNlLnRleHQuZGlzY2lwbGluZVJldmVhbDtcbiAgICBpZE1hcC5zZXQocmV2ZWFsLmlkLCBuZXh0RHVwbGljYXRlSWQocmV2ZWFsLmlkLCB1c2VkSWRzKSk7XG4gIH1cblxuICBsZXQgZHVwbGljYXRlID0gcmVtYXBTZWN0aW9uUmVmZXJlbmNlcyhjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoc291cmNlKSwgaWRNYXApO1xuICBkdXBsaWNhdGUuaWQgPSBpZE1hcC5nZXQoc291cmNlLmlkKTtcbiAgZHVwbGljYXRlLmxhYmVsID0gYCR7c291cmNlLmxhYmVsfSBjb3B5YDtcbiAgKGR1cGxpY2F0ZS50ZXh0Py5jdWVzIHx8IFtdKS5mb3JFYWNoKChjdWUsIGN1ZUluZGV4KSA9PiB7XG4gICAgY3VlLmlkID0gaWRNYXAuZ2V0KHNvdXJjZS50ZXh0LmN1ZXNbY3VlSW5kZXhdLmlkKTtcbiAgfSk7XG4gIChkdXBsaWNhdGUudGV4dD8uYmxvY2tzIHx8IFtdKS5mb3JFYWNoKChibG9jaywgYmxvY2tJbmRleCkgPT4ge1xuICAgIGJsb2NrLmlkID0gaWRNYXAuZ2V0KHNvdXJjZS50ZXh0LmJsb2Nrc1tibG9ja0luZGV4XS5pZCk7XG4gIH0pO1xuICBpZiAoZHVwbGljYXRlLnRleHQ/LmRpc2NpcGxpbmVSZXZlYWwpIHtcbiAgICBkdXBsaWNhdGUudGV4dC5kaXNjaXBsaW5lUmV2ZWFsLmlkID0gaWRNYXAuZ2V0KHNvdXJjZS50ZXh0LmRpc2NpcGxpbmVSZXZlYWwuaWQpO1xuICB9XG5cbiAgY29uc3QgY2FuZGlkYXRlID0gY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KGRvY3VtZW50KTtcbiAgY29uc3QgaW5zZXJ0SW5kZXggPSBzb3VyY2VJbmRleCArIDE7XG4gIGNhbmRpZGF0ZS5zZWN0aW9ucy5zcGxpY2UoaW5zZXJ0SW5kZXgsIDAsIGR1cGxpY2F0ZSk7XG4gIGNvbnN0IHN0aXRjaGVkID0gc3RpdGNoQWJvdXROYXJyYXRpdmVDYW1lcmFCb3VuZGFyaWVzKGNhbmRpZGF0ZSwge1xuICAgIGJvdW5kYXJ5SW5kZXhlczogW2luc2VydEluZGV4LCBpbnNlcnRJbmRleCArIDFdLFxuICB9KTtcbiAgZHVwbGljYXRlID0gc3RpdGNoZWQuc2VjdGlvbnNbaW5zZXJ0SW5kZXhdO1xuICBjb25zdCB2YWxpZGF0aW9uID0gZ2V0Q2FuZGlkYXRlVmFsaWRhdGlvbihzdGl0Y2hlZCk7XG4gIGlmICghdmFsaWRhdGlvbi52YWxpZCkgcmV0dXJuIHZhbGlkYXRpb247XG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgZG9jdW1lbnQ6IHN0aXRjaGVkLFxuICAgIGRpYWdub3N0aWNzOiB2YWxpZGF0aW9uLmRpYWdub3N0aWNzLFxuICAgIHNlY3Rpb246IGR1cGxpY2F0ZSxcbiAgICBzZWN0aW9uSW5kZXg6IGluc2VydEluZGV4LFxuICAgIHNvdXJjZVNlY3Rpb25JZDogc291cmNlLmlkLFxuICAgIHNlY3Rpb25JZDogZHVwbGljYXRlLmlkLFxuICAgIGlkTWFwOiBPYmplY3QuZnJvbUVudHJpZXMoaWRNYXApLFxuICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogZHVwbGljYXRlLmlkIH0sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQoe1xuICBkb2N1bWVudCxcbiAgcGxhbixcbiAgbWVtYmVycyxcbiAgcHJpbWFyeSxcbn0pIHtcbiAgY29uc3QgcmVzb2x2ZWQgPSBnZXRDdWVFbnRyaWVzKHsgZG9jdW1lbnQsIHBsYW4sIG1lbWJlcnMsIHByaW1hcnkgfSk7XG4gIGlmICghcmVzb2x2ZWQudmFsaWQpIHJldHVybiByZXNvbHZlZDtcbiAgY29uc3Qgb3JkZXJlZCA9IHNvcnRDdWVFbnRyaWVzKHJlc29sdmVkLmVudHJpZXMpO1xuICBjb25zdCBvcmlnaW5XVSA9IG9yZGVyZWRbMF0uZ2xvYmFsV1U7XG4gIHJldHVybiB7XG4gICAgdmVyc2lvbjogQUJPVVRfTkFSUkFUSVZFX0NMSVBCT0FSRF9WRVJTSU9OLFxuICAgIGtpbmQ6IEFCT1VUX05BUlJBVElWRV9DTElQQk9BUkRfS0lORCxcbiAgICBpdGVtczogb3JkZXJlZC5tYXAoKGVudHJ5KSA9PiAoe1xuICAgICAgb2Zmc2V0V1U6IGNsZWFuVGltZWxpbmVWYWx1ZShlbnRyeS5nbG9iYWxXVSAtIG9yaWdpbldVKSxcbiAgICAgIGN1ZTogY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KGVudHJ5LmN1ZSksXG4gICAgfSkpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQocGF5bG9hZCkge1xuICBpZiAoIXBheWxvYWQgfHwgdHlwZW9mIHBheWxvYWQgIT09ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkocGF5bG9hZCkpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBlZGl0b3IgY2xpcGJvYXJkIGlzIGVtcHR5IG9yIGRhbWFnZWQuJyB9O1xuICB9XG4gIGlmIChwYXlsb2FkLnZlcnNpb24gIT09IEFCT1VUX05BUlJBVElWRV9DTElQQk9BUkRfVkVSU0lPTikge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhpcyBlZGl0b3IgY2xpcGJvYXJkIHZlcnNpb24gaXMgbm90IHN1cHBvcnRlZC4nIH07XG4gIH1cbiAgaWYgKHBheWxvYWQua2luZCAhPT0gQUJPVVRfTkFSUkFUSVZFX0NMSVBCT0FSRF9LSU5EKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdPbmx5IGNvcGllZCB0aXRsZSBDdWUgZ3JvdXBzIGNhbiBiZSBwYXN0ZWQgaGVyZS4nIH07XG4gIH1cbiAgaWYgKCFBcnJheS5pc0FycmF5KHBheWxvYWQuaXRlbXMpIHx8ICFwYXlsb2FkLml0ZW1zLmxlbmd0aCB8fCBwYXlsb2FkLml0ZW1zLmxlbmd0aCA+IDEwMCkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIGNvcGllZCBDdWUgZ3JvdXAgbXVzdCBjb250YWluIGJldHdlZW4gMSBhbmQgMTAwIHRpdGxlcy4nIH07XG4gIH1cbiAgY29uc3Qgc2VlbkN1ZUlkcyA9IG5ldyBTZXQoKTtcbiAgZm9yIChjb25zdCBpdGVtIG9mIHBheWxvYWQuaXRlbXMpIHtcbiAgICBpZiAoIWl0ZW0gfHwgdHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkoaXRlbSkpIHtcbiAgICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnQSBjb3BpZWQgQ3VlIGl0ZW0gaXMgZGFtYWdlZC4nIH07XG4gICAgfVxuICAgIGNvbnN0IHVua25vd25JdGVtS2V5ID0gT2JqZWN0LmtleXMoaXRlbSkuZmluZCgoa2V5KSA9PiAhWydvZmZzZXRXVScsICdjdWUnXS5pbmNsdWRlcyhrZXkpKTtcbiAgICBpZiAodW5rbm93bkl0ZW1LZXkpIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiBgVW5rbm93biBjbGlwYm9hcmQgZmllbGQg4oCcJHt1bmtub3duSXRlbUtleX3igJ0uYCB9O1xuICAgIGlmICghTnVtYmVyLmlzRmluaXRlKE51bWJlcihpdGVtLm9mZnNldFdVKSkgfHwgTnVtYmVyKGl0ZW0ub2Zmc2V0V1UpIDwgMCkge1xuICAgICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdDb3BpZWQgQ3VlIG9mZnNldHMgbXVzdCBiZSBub24tbmVnYXRpdmUgV1UgdmFsdWVzLicgfTtcbiAgICB9XG4gICAgY29uc3QgY3VlID0gaXRlbS5jdWU7XG4gICAgaWYgKCFjdWUgfHwgdHlwZW9mIGN1ZSAhPT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShjdWUpKSB7XG4gICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ0EgY29waWVkIEN1ZSBpcyBtaXNzaW5nIGl0cyBhdXRob3JlZCB0aXRsZS4nIH07XG4gICAgfVxuICAgIGNvbnN0IHVua25vd25DdWVLZXkgPSBPYmplY3Qua2V5cyhjdWUpLmZpbmQoKGtleSkgPT4gIVtcbiAgICAgICdpZCcsXG4gICAgICAndGV4dCcsXG4gICAgICAnZW50ZXInLFxuICAgICAgJ2hvbGQnLFxuICAgICAgJ2V4aXQnLFxuICAgICAgJ3ByZXNldCcsXG4gICAgICAnYW5jaG9yJyxcbiAgICAgICdtb3Rpb24nLFxuICAgIF0uaW5jbHVkZXMoa2V5KSk7XG4gICAgaWYgKHVua25vd25DdWVLZXkpIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiBgVW5rbm93biBjb3BpZWQgQ3VlIGZpZWxkIOKAnCR7dW5rbm93bkN1ZUtleX3igJ0uYCB9O1xuICAgIGlmICghL15bYS16MC05XSsoPzotW2EtejAtOV0rKSokLy50ZXN0KGN1ZS5pZCB8fCAnJykgfHwgc2VlbkN1ZUlkcy5oYXMoY3VlLmlkKSkge1xuICAgICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdDb3BpZWQgQ3VlIElEcyBtdXN0IGJlIHVuaXF1ZSBsb3dlci1jYXNlIHNsdWdzLicgfTtcbiAgICB9XG4gICAgc2VlbkN1ZUlkcy5hZGQoY3VlLmlkKTtcbiAgICBpZiAoXG4gICAgICAhY3VlLnRleHQ/LnRyaW0oKVxuICAgICAgfHwgY3VlLnRleHQubGVuZ3RoID4gMTIwMFxuICAgICAgfHwgLzxcXC8/KD86c2NyaXB0fHN0eWxlfGlmcmFtZSl8XFxib25cXHcrXFxzKj18amF2YXNjcmlwdDovaS50ZXN0KGN1ZS50ZXh0KVxuICAgICAgfHwgIVtjdWUuZW50ZXIsIGN1ZS5ob2xkLCBjdWUuZXhpdF0uZXZlcnkoKHZhbHVlKSA9PiBOdW1iZXIuaXNGaW5pdGUoTnVtYmVyKHZhbHVlKSkpXG4gICAgKSB7XG4gICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ0EgY29waWVkIEN1ZSBoYXMgaW52YWxpZCB0ZXh0IG9yIHRpbWluZy4nIH07XG4gICAgfVxuICAgIGlmIChcbiAgICAgIGN1ZS5lbnRlciA8IC0xXG4gICAgICB8fCBjdWUuZXhpdCA+IDJcbiAgICAgIHx8IGN1ZS5lbnRlciA+IGN1ZS5ob2xkXG4gICAgICB8fCBjdWUuaG9sZCA+IGN1ZS5leGl0XG4gICAgICB8fCBjdWUuaG9sZCA8IDBcbiAgICAgIHx8IGN1ZS5ob2xkID4gMVxuICAgICkge1xuICAgICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdBIGNvcGllZCBDdWUgaGFzIGFuIGludmFsaWQgdGltaW5nIGVudmVsb3BlLicgfTtcbiAgICB9XG4gICAgaWYgKFxuICAgICAgdHlwZW9mIGN1ZS5wcmVzZXQgIT09ICdzdHJpbmcnXG4gICAgICB8fCAhY3VlLnByZXNldFxuICAgICAgfHwgIWN1ZS5tb3Rpb25cbiAgICAgIHx8IHR5cGVvZiBjdWUubW90aW9uICE9PSAnb2JqZWN0J1xuICAgICAgfHwgQXJyYXkuaXNBcnJheShjdWUubW90aW9uKVxuICAgICAgfHwgT2JqZWN0LmtleXMoY3VlLm1vdGlvbikuc29tZSgoa2V5KSA9PiBrZXkgIT09ICdtb2RlJylcbiAgICAgIHx8ICFbJ3NwYXRpYWwnLCAndmVydGljYWwnXS5pbmNsdWRlcyhjdWUubW90aW9uLm1vZGUpXG4gICAgKSB7XG4gICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ0EgY29waWVkIEN1ZSBoYXMgdW5zdXBwb3J0ZWQgdGl0bGUgYmVoYXZpb3IuJyB9O1xuICAgIH1cbiAgfVxuICBjb25zdCBoYXNPcmlnaW4gPSBwYXlsb2FkLml0ZW1zLnNvbWUoKGl0ZW0pID0+IE1hdGguYWJzKE51bWJlcihpdGVtLm9mZnNldFdVKSkgPD0gUkhZVEhNX0VQU0lMT04pO1xuICBpZiAoIWhhc09yaWdpbikgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGUgY29waWVkIEN1ZSBncm91cCBoYXMgbm8gdGltZWxpbmUgb3JpZ2luLicgfTtcbiAgcmV0dXJuIHtcbiAgICB2YWxpZDogdHJ1ZSxcbiAgICBwYXlsb2FkOiBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQocGF5bG9hZCksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cFBhc3RlKHtcbiAgZG9jdW1lbnQsXG4gIHBsYW4sXG4gIHBheWxvYWQsXG4gIGRlc3RpbmF0aW9uU2VjdGlvbklkLFxuICBwbGF5aGVhZFdVLFxufSkge1xuICBjb25zdCBjbGlwYm9hcmQgPSB2YWxpZGF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZChwYXlsb2FkKTtcbiAgaWYgKCFjbGlwYm9hcmQudmFsaWQpIHJldHVybiBjbGlwYm9hcmQ7XG4gIGlmICghZG9jdW1lbnQ/LnNlY3Rpb25zPy5sZW5ndGggfHwgIXBsYW4/LnZhbGlkKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGUgQWJvdXQgdGltZWxpbmUgaXMgbm90IHJlYWR5LicgfTtcbiAgfVxuICBjb25zdCBkZXN0aW5hdGlvbkluZGV4ID0gZG9jdW1lbnQuc2VjdGlvbnMuZmluZEluZGV4KChzZWN0aW9uKSA9PiBzZWN0aW9uLmlkID09PSBkZXN0aW5hdGlvblNlY3Rpb25JZCk7XG4gIGNvbnN0IGRlc3RpbmF0aW9uID0gZG9jdW1lbnQuc2VjdGlvbnNbZGVzdGluYXRpb25JbmRleF07XG4gIGNvbnN0IGNvbXBpbGVkID0gcGxhbi5zZWN0aW9ucy5maW5kKChzZWN0aW9uKSA9PiBzZWN0aW9uLmlkID09PSBkZXN0aW5hdGlvblNlY3Rpb25JZCk7XG4gIGlmICghZGVzdGluYXRpb24gfHwgIWNvbXBpbGVkKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdDaG9vc2UgYW4gYXZhaWxhYmxlIGRlc3RpbmF0aW9uIFNlY3Rpb24uJyB9O1xuICB9XG4gIGlmICghQXJyYXkuaXNBcnJheShkZXN0aW5hdGlvbi50ZXh0Py5jdWVzKSkge1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICByZWFzb246IGAke2Rlc3RpbmF0aW9uLmxhYmVsfSBkb2VzIG5vdCBjb250YWluIGEgdGl0bGUgQ3VlIHRyYWNrLmAsXG4gICAgfTtcbiAgfVxuICBpZiAoIShjb21waWxlZC50cmF2ZWxXVSA+IDApIHx8ICFOdW1iZXIuaXNGaW5pdGUoTnVtYmVyKHBsYXloZWFkV1UpKSkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIGRlc3RpbmF0aW9uIHBsYXloZWFkIHBvc2l0aW9uIGlzIG5vdCBhdmFpbGFibGUuJyB9O1xuICB9XG5cbiAgY29uc3QgaXRlbXMgPSBjbGlwYm9hcmQucGF5bG9hZC5pdGVtcztcbiAgbGV0IG1pbmltdW1PcmlnaW5XVSA9IE51bWJlci5ORUdBVElWRV9JTkZJTklUWTtcbiAgbGV0IG1heGltdW1PcmlnaW5XVSA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcbiAgaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgIGNvbnN0IGJvdW5kcyA9IGdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzKGl0ZW0uY3VlKTtcbiAgICBjb25zdCBvZmZzZXRXVSA9IE51bWJlcihpdGVtLm9mZnNldFdVKTtcbiAgICBtaW5pbXVtT3JpZ2luV1UgPSBNYXRoLm1heChcbiAgICAgIG1pbmltdW1PcmlnaW5XVSxcbiAgICAgIGNvbXBpbGVkLnN0YXJ0V1UgKyAoYm91bmRzLm1pbiAqIGNvbXBpbGVkLnRyYXZlbFdVKSAtIG9mZnNldFdVLFxuICAgICk7XG4gICAgbWF4aW11bU9yaWdpbldVID0gTWF0aC5taW4oXG4gICAgICBtYXhpbXVtT3JpZ2luV1UsXG4gICAgICBjb21waWxlZC5zdGFydFdVICsgKGJvdW5kcy5tYXggKiBjb21waWxlZC50cmF2ZWxXVSkgLSBvZmZzZXRXVSxcbiAgICApO1xuICB9KTtcbiAgbWluaW11bU9yaWdpbldVID0gY2xlYW5UaW1lbGluZVZhbHVlKG1pbmltdW1PcmlnaW5XVSk7XG4gIG1heGltdW1PcmlnaW5XVSA9IGNsZWFuVGltZWxpbmVWYWx1ZShtYXhpbXVtT3JpZ2luV1UpO1xuICBpZiAobWluaW11bU9yaWdpbldVID4gbWF4aW11bU9yaWdpbldVICsgUkhZVEhNX0VQU0lMT04pIHtcbiAgICByZXR1cm4ge1xuICAgICAgdmFsaWQ6IGZhbHNlLFxuICAgICAgcmVhc29uOiBgVGhlIGNvcGllZCBDdWUgZ3JvdXAgaXMgd2lkZXIgdGhhbiAke2Rlc3RpbmF0aW9uLmxhYmVsfSdzIHRpdGxlIHRpbWVsaW5lLmAsXG4gICAgICBtaW5pbXVtT3JpZ2luV1UsXG4gICAgICBtYXhpbXVtT3JpZ2luV1UsXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IHJlcXVlc3RlZE9yaWdpbldVID0gTnVtYmVyKHBsYXloZWFkV1UpO1xuICBjb25zdCBvcmlnaW5XVSA9IGNsZWFuVGltZWxpbmVWYWx1ZShjbGFtcChcbiAgICByZXF1ZXN0ZWRPcmlnaW5XVSxcbiAgICBtaW5pbXVtT3JpZ2luV1UsXG4gICAgbWF4aW11bU9yaWdpbldVLFxuICApKTtcbiAgY29uc3QgY2FuZGlkYXRlID0gY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KGRvY3VtZW50KTtcbiAgY29uc3QgdGFyZ2V0ID0gY2FuZGlkYXRlLnNlY3Rpb25zW2Rlc3RpbmF0aW9uSW5kZXhdO1xuICBjb25zdCB1c2VkSWRzID0gZ2V0QWJvdXROYXJyYXRpdmVVc2VkSWRzKGNhbmRpZGF0ZSk7XG4gIGNvbnN0IGlkTWFwID0gbmV3IE1hcCgpO1xuICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiBpZE1hcC5zZXQoaXRlbS5jdWUuaWQsIG5leHREdXBsaWNhdGVJZChpdGVtLmN1ZS5pZCwgdXNlZElkcykpKTtcbiAgY29uc3QgcGFzdGVkSXRlbXMgPSBpdGVtcy5tYXAoKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgY29uc3Qgc3RvcnlXVSA9IGNsZWFuVGltZWxpbmVWYWx1ZShvcmlnaW5XVSArIE51bWJlcihpdGVtLm9mZnNldFdVKSk7XG4gICAgY29uc3QgbG9jYWxGb2N1cyA9IChzdG9yeVdVIC0gY29tcGlsZWQuc3RhcnRXVSkgLyBjb21waWxlZC50cmF2ZWxXVTtcbiAgICBjb25zdCBtb3ZlZCA9IG1vdmVBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZyhpdGVtLmN1ZSwgbG9jYWxGb2N1cywgeyBzbmFwOiBmYWxzZSB9KTtcbiAgICBjb25zdCBjdWUgPSByZW1hcEN1ZVJlZmVyZW5jZSh7XG4gICAgICAuLi5tb3ZlZCxcbiAgICAgIGlkOiBpZE1hcC5nZXQoaXRlbS5jdWUuaWQpLFxuICAgIH0sIGlkTWFwKTtcbiAgICByZXR1cm4ge1xuICAgICAgY3VlLFxuICAgICAgY3VlSWQ6IGN1ZS5pZCxcbiAgICAgIHNvdXJjZUN1ZUlkOiBpdGVtLmN1ZS5pZCxcbiAgICAgIG9mZnNldFdVOiBjbGVhblRpbWVsaW5lVmFsdWUoTnVtYmVyKGl0ZW0ub2Zmc2V0V1UpKSxcbiAgICAgIHN0b3J5V1UsXG4gICAgICBvcmRlcjogaW5kZXgsXG4gICAgfTtcbiAgfSk7XG4gIHRhcmdldC50ZXh0LmN1ZXMgPSBbLi4udGFyZ2V0LnRleHQuY3VlcywgLi4ucGFzdGVkSXRlbXMubWFwKChpdGVtKSA9PiBpdGVtLmN1ZSldXG4gICAgLm1hcCgoY3VlLCBpbmRleCkgPT4gKHsgY3VlLCBpbmRleCB9KSlcbiAgICAuc29ydCgobGVmdCwgcmlnaHQpID0+IChsZWZ0LmN1ZS5ob2xkIC0gcmlnaHQuY3VlLmhvbGQpIHx8IChsZWZ0LmluZGV4IC0gcmlnaHQuaW5kZXgpKVxuICAgIC5tYXAoKGl0ZW0pID0+IGl0ZW0uY3VlKTtcblxuICBjb25zdCB2YWxpZGF0aW9uID0gZ2V0Q2FuZGlkYXRlVmFsaWRhdGlvbihjYW5kaWRhdGUpO1xuICBpZiAoIXZhbGlkYXRpb24udmFsaWQpIHJldHVybiB2YWxpZGF0aW9uO1xuICBjb25zdCBzZWxlY3Rpb25NZW1iZXJzID0gcGFzdGVkSXRlbXMubWFwKChpdGVtKSA9PiAoe1xuICAgIHR5cGU6ICdjdWUnLFxuICAgIHNlY3Rpb25JZDogZGVzdGluYXRpb25TZWN0aW9uSWQsXG4gICAgY3VlSWQ6IGl0ZW0uY3VlSWQsXG4gICAga2V5UGFydDogJ2ZvY3VzJyxcbiAgfSkpO1xuICByZXR1cm4ge1xuICAgIHZhbGlkOiB0cnVlLFxuICAgIGRvY3VtZW50OiBjYW5kaWRhdGUsXG4gICAgZGlhZ25vc3RpY3M6IHZhbGlkYXRpb24uZGlhZ25vc3RpY3MsXG4gICAgZGVzdGluYXRpb25TZWN0aW9uSWQsXG4gICAgcmVxdWVzdGVkT3JpZ2luV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShyZXF1ZXN0ZWRPcmlnaW5XVSksXG4gICAgb3JpZ2luV1UsXG4gICAgY2xhbXBlZDogTWF0aC5hYnMob3JpZ2luV1UgLSByZXF1ZXN0ZWRPcmlnaW5XVSkgPiBSSFlUSE1fRVBTSUxPTixcbiAgICBtaW5pbXVtT3JpZ2luV1UsXG4gICAgbWF4aW11bU9yaWdpbldVLFxuICAgIGlkTWFwOiBPYmplY3QuZnJvbUVudHJpZXMoaWRNYXApLFxuICAgIGl0ZW1zOiBwYXN0ZWRJdGVtcyxcbiAgICBzZWxlY3Rpb246IG1ha2VDdWVTZWxlY3Rpb24oc2VsZWN0aW9uTWVtYmVyc1swXSwgc2VsZWN0aW9uTWVtYmVycyksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldEN1ZUxvb3BCb3VuZHMoeyBkb2N1bWVudCwgcGxhbiwgc291cmNlIH0pIHtcbiAgY29uc3QgbWVtYmVycyA9IHNvdXJjZS50eXBlID09PSAnY3VlLWdyb3VwJ1xuICAgID8gc291cmNlLm1lbWJlcnNcbiAgICA6IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhzb3VyY2UpO1xuICBjb25zdCByZXNvbHZlZCA9IGdldEN1ZUVudHJpZXMoe1xuICAgIGRvY3VtZW50LFxuICAgIHBsYW4sXG4gICAgbWVtYmVycyxcbiAgICBwcmltYXJ5OiBzb3VyY2UucHJpbWFyeSB8fCBzb3VyY2UsXG4gIH0pO1xuICBpZiAoIXJlc29sdmVkLnZhbGlkKSByZXR1cm4gcmVzb2x2ZWQ7XG4gIGNvbnN0IG9yZGVyZWQgPSBzb3J0Q3VlRW50cmllcyhyZXNvbHZlZC5lbnRyaWVzKTtcbiAgY29uc3Qgc3RhcnRXVSA9IE1hdGgubWluKC4uLm9yZGVyZWQubWFwKChlbnRyeSkgPT4gKFxuICAgIGVudHJ5LmNvbXBpbGVkLnN0YXJ0V1UgKyAoTnVtYmVyKGVudHJ5LmN1ZS5lbnRlcikgKiBlbnRyeS5jb21waWxlZC50cmF2ZWxXVSlcbiAgKSkpO1xuICBjb25zdCBlbmRXVSA9IE1hdGgubWF4KC4uLm9yZGVyZWQubWFwKChlbnRyeSkgPT4gKFxuICAgIGVudHJ5LmNvbXBpbGVkLnN0YXJ0V1UgKyAoTnVtYmVyKGVudHJ5LmN1ZS5leGl0KSAqIGVudHJ5LmNvbXBpbGVkLnRyYXZlbFdVKVxuICApKSk7XG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgc3RhcnRXVSxcbiAgICBlbmRXVSxcbiAgICBzb3VyY2VUeXBlOiAnY3VlLWdyb3VwJyxcbiAgICBzb3VyY2VJZDogb3JkZXJlZC5tYXAoKGVudHJ5KSA9PiBlbnRyeS5jdWUuaWQpLmpvaW4oJysnKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlcml2ZUFib3V0TmFycmF0aXZlTG9vcFJhbmdlKHtcbiAgZG9jdW1lbnQsXG4gIHBsYW4sXG4gIHNvdXJjZSxcbiAgcHJlUm9sbFdVID0gMCxcbiAgcG9zdFJvbGxXVSA9IDAsXG4gIGNhbWVyYUtleVdpbmRvd1dVID0gMC4yNSxcbn0pIHtcbiAgaWYgKCFkb2N1bWVudD8uc2VjdGlvbnM/Lmxlbmd0aCB8fCAhcGxhbj8udmFsaWQgfHwgIXNvdXJjZSkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIGxvb3Agc291cmNlIGlzIG5vdCBhdmFpbGFibGUuJyB9O1xuICB9XG4gIGNvbnN0IHByZVJvbGwgPSBOdW1iZXIocHJlUm9sbFdVKTtcbiAgY29uc3QgcG9zdFJvbGwgPSBOdW1iZXIocG9zdFJvbGxXVSk7XG4gIGlmICghTnVtYmVyLmlzRmluaXRlKHByZVJvbGwpIHx8IHByZVJvbGwgPCAwIHx8ICFOdW1iZXIuaXNGaW5pdGUocG9zdFJvbGwpIHx8IHBvc3RSb2xsIDwgMCkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnUHJlLXJvbGwgYW5kIHBvc3Qtcm9sbCBtdXN0IGJlIG5vbi1uZWdhdGl2ZSBXVSB2YWx1ZXMuJyB9O1xuICB9XG5cbiAgY29uc3Qgc291cmNlU2VjdGlvbiA9IGRvY3VtZW50LnNlY3Rpb25zLmZpbmQoKHNlY3Rpb24pID0+IHNlY3Rpb24uaWQgPT09IHNvdXJjZS5zZWN0aW9uSWQpO1xuICBjb25zdCBjb21waWxlZCA9IHBsYW4uc2VjdGlvbnMuZmluZCgoc2VjdGlvbikgPT4gc2VjdGlvbi5pZCA9PT0gc291cmNlLnNlY3Rpb25JZCk7XG4gIGxldCBiYXNlUmFuZ2U7XG4gIGlmIChzb3VyY2UudHlwZSA9PT0gJ3NlY3Rpb24nKSB7XG4gICAgaWYgKCFzb3VyY2VTZWN0aW9uIHx8ICFjb21waWxlZCkgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGUgc2VsZWN0ZWQgU2VjdGlvbiBpcyBub3QgYXZhaWxhYmxlLicgfTtcbiAgICBiYXNlUmFuZ2UgPSB7XG4gICAgICBzdGFydFdVOiBjb21waWxlZC5zdGFydFdVLFxuICAgICAgZW5kV1U6IE1hdGgubWluKGNvbXBpbGVkLmVuZFdVLCBwbGFuLm1heFN0b3J5V1UpLFxuICAgICAgc291cmNlVHlwZTogJ3NlY3Rpb24nLFxuICAgICAgc291cmNlSWQ6IHNvdXJjZVNlY3Rpb24uaWQsXG4gICAgfTtcbiAgfSBlbHNlIGlmIChzb3VyY2UudHlwZSA9PT0gJ2N1ZScgfHwgc291cmNlLnR5cGUgPT09ICdjdWUtZ3JvdXAnKSB7XG4gICAgYmFzZVJhbmdlID0gZ2V0Q3VlTG9vcEJvdW5kcyh7IGRvY3VtZW50LCBwbGFuLCBzb3VyY2UgfSk7XG4gICAgaWYgKCFiYXNlUmFuZ2UudmFsaWQpIHJldHVybiBiYXNlUmFuZ2U7XG4gIH0gZWxzZSBpZiAoc291cmNlLnR5cGUgPT09ICd3b3JsZCcgfHwgc291cmNlLnR5cGUgPT09ICd3b3JsZC10cmFuc2l0aW9uJykge1xuICAgIGNvbnN0IHRyYW5zaXRpb24gPSBjb21waWxlZD8ud29ybGRTdGF0ZT8udHJhbnNpdGlvbjtcbiAgICBpZiAoIXNvdXJjZVNlY3Rpb24gfHwgIWNvbXBpbGVkIHx8IHNvdXJjZVNlY3Rpb24ud29ybGQ/Lm1vZGUgIT09ICdzZXQnIHx8ICF0cmFuc2l0aW9uKSB7XG4gICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBzZWxlY3RlZCBXb3JsZCB0cmFuc2l0aW9uIGlzIG5vdCBhdmFpbGFibGUuJyB9O1xuICAgIH1cbiAgICBiYXNlUmFuZ2UgPSB7XG4gICAgICBzdGFydFdVOiB0cmFuc2l0aW9uLnN0YXJ0V1UsXG4gICAgICBlbmRXVTogdHJhbnNpdGlvbi5lbmRXVSxcbiAgICAgIHNvdXJjZVR5cGU6ICd3b3JsZC10cmFuc2l0aW9uJyxcbiAgICAgIHNvdXJjZUlkOiBgJHtzb3VyY2VTZWN0aW9uLmlkfTp0cmFuc2l0aW9uYCxcbiAgICB9O1xuICB9IGVsc2UgaWYgKHNvdXJjZS50eXBlID09PSAnY2FtZXJhLWtleScpIHtcbiAgICBjb25zdCBrZXkgPSBzb3VyY2VTZWN0aW9uPy5jYW1lcmE/LmtleXM/Lltzb3VyY2Uua2V5SW5kZXhdO1xuICAgIGNvbnN0IHdpbmRvd1dVID0gTnVtYmVyKGNhbWVyYUtleVdpbmRvd1dVKTtcbiAgICBpZiAoIWtleSB8fCAhY29tcGlsZWQgfHwgIU51bWJlci5pc0Zpbml0ZSh3aW5kb3dXVSkgfHwgd2luZG93V1UgPD0gMCkge1xuICAgICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGUgc2VsZWN0ZWQgQ2FtZXJhIGtleSB3aW5kb3cgaXMgbm90IGF2YWlsYWJsZS4nIH07XG4gICAgfVxuICAgIGNvbnN0IGtleVdVID0gY29tcGlsZWQuc3RhcnRXVSArIChOdW1iZXIoa2V5LmF0KSAqIGNvbXBpbGVkLnRyYXZlbFdVKTtcbiAgICBiYXNlUmFuZ2UgPSB7XG4gICAgICBzdGFydFdVOiBrZXlXVSAtIHdpbmRvd1dVLFxuICAgICAgZW5kV1U6IGtleVdVICsgd2luZG93V1UsXG4gICAgICBzb3VyY2VUeXBlOiAnY2FtZXJhLWtleScsXG4gICAgICBzb3VyY2VJZDogYCR7c291cmNlU2VjdGlvbi5pZH06Y2FtZXJhOiR7c291cmNlLmtleUluZGV4fWAsXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoaXMgc2VsZWN0aW9uIGNhbm5vdCBjcmVhdGUgYSBsb29wLicgfTtcbiAgfVxuXG4gIGlmICghKGJhc2VSYW5nZS5lbmRXVSA+IGJhc2VSYW5nZS5zdGFydFdVICsgUkhZVEhNX0VQU0lMT04pKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGlzIHNvdXJjZSBoYXMgbm8gZHVyYXRpb24gdG8gbG9vcC4nIH07XG4gIH1cbiAgY29uc3Qgc3RhcnRXVSA9IGNsZWFuVGltZWxpbmVWYWx1ZShjbGFtcChiYXNlUmFuZ2Uuc3RhcnRXVSAtIHByZVJvbGwsIDAsIHBsYW4ubWF4U3RvcnlXVSkpO1xuICBjb25zdCBlbmRXVSA9IGNsZWFuVGltZWxpbmVWYWx1ZShjbGFtcChiYXNlUmFuZ2UuZW5kV1UgKyBwb3N0Um9sbCwgMCwgcGxhbi5tYXhTdG9yeVdVKSk7XG4gIGlmICghKGVuZFdVID4gc3RhcnRXVSArIFJIWVRITV9FUFNJTE9OKSkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhpcyBsb29wIHJhbmdlIGZhbGxzIG91dHNpZGUgdGhlIG5hcnJhdGl2ZS4nIH07XG4gIH1cbiAgcmV0dXJuIHtcbiAgICB2YWxpZDogdHJ1ZSxcbiAgICBzdGFydFdVLFxuICAgIGVuZFdVLFxuICAgIHNvdXJjZVR5cGU6IGJhc2VSYW5nZS5zb3VyY2VUeXBlLFxuICAgIHNvdXJjZUlkOiBiYXNlUmFuZ2Uuc291cmNlSWQsXG4gIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxDQUFDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDO0FBQ3pILE1BQU0sQ0FBQztBQUNQLENBQUMsQ0FBQywyQkFBMkI7QUFDN0IsQ0FBQyxDQUFDLDhCQUE4QjtBQUNoQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQzs7QUFFaEUsTUFBTSxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7O0FBRWxELEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQy9CLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQyxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQzs7QUFFbEQsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFH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QUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQztBQUNIOztBQUVBLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU87QUFDMUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU87QUFDckQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTO0FBQ2xCOztBQUVBLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxD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QUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7QUFDbEcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQztBQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7QUFDL0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3RixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUYsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0MsQ0FBQyxHQUFHLENBQUM7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPO0FBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWTtBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDMUYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDMUYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ3hFLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLGFBQWE7QUFDN0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDL0M7O0FBRUEsUUFBUSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNqQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWTtBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVE7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSjs7QUFFQSxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRO0FBQ3BGLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFD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LCtCQUErQixDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUM3RixDQUFDLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3BFOztBQUVBLE1BQU0sQ0FBQyxRQUFRLENBQUMsc0NBQXNDLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdkUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7QUFDNUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNuRCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3JFLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FB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QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQixDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO0FBQ2xFLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUztBQUN0RSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RCxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUM7QUFDNUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUM7QUFDeEUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENB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QUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RixDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7QUFDdEMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlELENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0UsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTTtBQUNoRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNULENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO0FBQzFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUTtBQUN2QyxDQUFDLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUI7O0FBRWxELENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFdBQVc7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQzlGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQzlGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUNoRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUNoRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ3hFLENB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QUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRTtBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVKLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLENBQUM7QUFDdEQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVO0FBQzFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7QUFDM0UsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ3ZFLENBQUMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFD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QyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3RGLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUs7QUFDdkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUNiLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTDs7QUFFQSxNQUFNLENBQUMsUUFBUSxDQUFDLDhCQUE4QixDQUFDO0FBQy9DLENBQUMsQ0FBQyxRQUFRO0FBQ1YsQ0FBQyxDQUFDLFNBQVM7QUFDWCxDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZFLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDeEYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRixDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLFFBQVEsQ0FBQztBQUNwRCxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzNELENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDakcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUN6RyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQjtBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDN0QsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNwRixDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQzFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUss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Q0FBQyxDQUFDLDhCQUE4QixDQUFDLENBQUM7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkYsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDNUYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRyxDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzlGLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3BGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSTtBQUM3RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDekYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyRixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTTtBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENB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Q0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPO0FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUTtBQUN0QyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7QUFDbEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUTtBQUMvRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRO0FBQzlFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUk7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU87QUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVELENBQUMsQ0FBQyxDQUFDO0FBQ0g7O0FBRUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBQztBQUM5QyxDQUFDLENBQUMsUUFBUTtBQUNWLENBQUMsQ0FBQyxJQUFJO0FBQ04sQ0FBQyxDQUFDLE1BQU07QUFDUixDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2YsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzFCLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDOUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEUsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7QUFDbkMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7QUFDckMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdGLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztBQUM1RixDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztBQUNuRixDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVM7QUFDZixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ25FLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUM1RCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBQzVFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsVUFBVTtBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDM0YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPO0FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDO0FBQ2hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO0FBQzlELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6RixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7QUFDekUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNFLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFDL0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNFLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzVGLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3pGLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25GLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUk7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU87QUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVE7QUFDaEMsQ0FBQyxDQUFDLENBQUM7QUFDSDsifQ==