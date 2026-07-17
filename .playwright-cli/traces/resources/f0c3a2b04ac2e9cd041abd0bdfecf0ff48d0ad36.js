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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFib3V0TmFycmF0aXZlVGltZWxpbmUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY29tcGlsZUFib3V0TmFycmF0aXZlRG9jdW1lbnQgfSBmcm9tIFwiL3NyYy9yb3V0ZXMvYWJvdXQtbmFycmF0aXZlLWxhYi9hYm91dE5hcnJhdGl2ZUNvbXBpbGVyLmpzXCI7XG5pbXBvcnQge1xuICBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG4gIHZhbGlkYXRlQWJvdXROYXJyYXRpdmVEb2N1bWVudCxcbn0gZnJvbSBcIi9zcmMvcm91dGVzL2Fib3V0LW5hcnJhdGl2ZS1sYWIvYWJvdXROYXJyYXRpdmVTY2hlbWEuanNcIjtcblxuZXhwb3J0IGNvbnN0IEFCT1VUX05BUlJBVElWRV9USU1FTElORV9TVEVQID0gMC4wMDU7XG5cbmNvbnN0IFJIWVRITV9FUFNJTE9OID0gMC4wMDAwMDE7XG5jb25zdCBBQk9VVF9OQVJSQVRJVkVfQ0xJUEJPQVJEX1ZFUlNJT04gPSAxO1xuY29uc3QgQUJPVVRfTkFSUkFUSVZFX0NMSVBCT0FSRF9LSU5EID0gJ2N1ZS1ncm91cCc7XG5cbmNvbnN0IGNsYW1wID0gKHZhbHVlLCBtaW4sIG1heCkgPT4gTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIHZhbHVlKSk7XG5cbmZ1bmN0aW9uIGNsZWFuVGltZWxpbmVWYWx1ZSh2YWx1ZSkge1xuICByZXR1cm4gTnVtYmVyKE51bWJlcih2YWx1ZSkudG9GaXhlZCg2KSk7XG59XG5cbmZ1bmN0aW9uIGdldFNlY3Rpb25BdFN0b3J5V1UocGxhbiwgc3RvcnlXVSkge1xuICBpZiAoIXBsYW4/LnNlY3Rpb25zPy5sZW5ndGgpIHJldHVybiB7IHNlY3Rpb246IG51bGwsIHNlY3Rpb25JbmRleDogLTEgfTtcbiAgY29uc3QgY2xhbXBlZFN0b3J5V1UgPSBjbGFtcChOdW1iZXIoc3RvcnlXVSkgfHwgMCwgMCwgTnVtYmVyKHBsYW4ubWF4U3RvcnlXVSB8fCAwKSk7XG4gIGxldCBzZWN0aW9uSW5kZXggPSBwbGFuLnNlY3Rpb25zLmZpbmRJbmRleCgoc2VjdGlvbiwgaW5kZXgpID0+IHtcbiAgICBjb25zdCBuZXh0U3RhcnRXVSA9IHBsYW4uc2VjdGlvbnNbaW5kZXggKyAxXT8uc3RhcnRXVSA/PyBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG4gICAgcmV0dXJuIGNsYW1wZWRTdG9yeVdVID49IHNlY3Rpb24uc3RhcnRXVSAmJiBjbGFtcGVkU3RvcnlXVSA8IG5leHRTdGFydFdVO1xuICB9KTtcbiAgaWYgKHNlY3Rpb25JbmRleCA8IDApIHNlY3Rpb25JbmRleCA9IHBsYW4uc2VjdGlvbnMubGVuZ3RoIC0gMTtcbiAgcmV0dXJuIHsgc2VjdGlvbjogcGxhbi5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLCBzZWN0aW9uSW5kZXgsIHN0b3J5V1U6IGNsYW1wZWRTdG9yeVdVIH07XG59XG5cbmZ1bmN0aW9uIGN1ZU1lbWJlcktleShtZW1iZXIpIHtcbiAgcmV0dXJuIGAke21lbWJlci5zZWN0aW9uSWR9OiR7bWVtYmVyLmN1ZUlkfWA7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUN1ZU1lbWJlcihtZW1iZXIpIHtcbiAgaWYgKG1lbWJlcj8udHlwZSAhPT0gJ2N1ZScgfHwgIW1lbWJlci5zZWN0aW9uSWQgfHwgIW1lbWJlci5jdWVJZCkgcmV0dXJuIG51bGw7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ2N1ZScsXG4gICAgc2VjdGlvbklkOiBtZW1iZXIuc2VjdGlvbklkLFxuICAgIGN1ZUlkOiBtZW1iZXIuY3VlSWQsXG4gICAga2V5UGFydDogbWVtYmVyLmtleVBhcnQgfHwgJ2ZvY3VzJyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWFrZUN1ZVNlbGVjdGlvbihwcmltYXJ5LCBtZW1iZXJzKSB7XG4gIGNvbnN0IHNlbGVjdGlvbiA9IHsgLi4ucHJpbWFyeSB9O1xuICBkZWxldGUgc2VsZWN0aW9uLm1lbWJlcnM7XG4gIGlmIChtZW1iZXJzLmxlbmd0aCA+IDEpIHNlbGVjdGlvbi5tZW1iZXJzID0gbWVtYmVycztcbiAgcmV0dXJuIHNlbGVjdGlvbjtcbn1cblxuZnVuY3Rpb24gbWFrZVNsdWcodmFsdWUpIHtcbiAgcmV0dXJuIFN0cmluZyh2YWx1ZSB8fCAnJylcbiAgICAudG9Mb3dlckNhc2UoKVxuICAgIC5yZXBsYWNlKC9bXmEtejAtOV0rL2csICctJylcbiAgICAucmVwbGFjZSgvXi18LSQvZywgJycpIHx8ICdpdGVtJztcbn1cblxuZnVuY3Rpb24gZ2V0QWJvdXROYXJyYXRpdmVVc2VkSWRzKGRvY3VtZW50KSB7XG4gIHJldHVybiBuZXcgU2V0KChkb2N1bWVudD8uc2VjdGlvbnMgfHwgW10pLmZsYXRNYXAoKHNlY3Rpb24pID0+IFtcbiAgICBzZWN0aW9uLmlkLFxuICAgIC4uLihzZWN0aW9uLnRleHQ/LmN1ZXMgfHwgW10pLm1hcCgoY3VlKSA9PiBjdWUuaWQpLFxuICAgIC4uLihzZWN0aW9uLnRleHQ/LmJsb2NrcyB8fCBbXSkubWFwKChibG9jaykgPT4gYmxvY2suaWQpLFxuICAgIC4uLihzZWN0aW9uLnRleHQ/LmRpc2NpcGxpbmVSZXZlYWwgPyBbc2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWwuaWRdIDogW10pLFxuICBdKSk7XG59XG5cbmZ1bmN0aW9uIG5leHREdXBsaWNhdGVJZChzb3VyY2VJZCwgdXNlZElkcykge1xuICBjb25zdCBiYXNlID0gbWFrZVNsdWcoc291cmNlSWQpO1xuICBsZXQgc3VmZml4ID0gMjtcbiAgbGV0IGlkID0gYCR7YmFzZX0tJHtzdWZmaXh9YDtcbiAgd2hpbGUgKHVzZWRJZHMuaGFzKGlkKSkge1xuICAgIHN1ZmZpeCArPSAxO1xuICAgIGlkID0gYCR7YmFzZX0tJHtzdWZmaXh9YDtcbiAgfVxuICB1c2VkSWRzLmFkZChpZCk7XG4gIHJldHVybiBpZDtcbn1cblxuZnVuY3Rpb24gZ2V0Q3VlRW50cmllcyh7IGRvY3VtZW50LCBwbGFuLCBtZW1iZXJzLCBwcmltYXJ5IH0pIHtcbiAgaWYgKCFkb2N1bWVudD8uc2VjdGlvbnM/Lmxlbmd0aCB8fCAhcGxhbj8udmFsaWQgfHwgIXBsYW4uc2VjdGlvbnM/Lmxlbmd0aCkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIHRleHQgdGltZWxpbmUgaXMgbm90IHJlYWR5LicgfTtcbiAgfVxuXG4gIGNvbnN0IG5vcm1hbGl6ZWRNZW1iZXJzID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHtcbiAgICAuLi4obm9ybWFsaXplQ3VlTWVtYmVyKHByaW1hcnkpIHx8IG5vcm1hbGl6ZUN1ZU1lbWJlcihtZW1iZXJzPy5bMF0pIHx8IHt9KSxcbiAgICBtZW1iZXJzLFxuICB9KTtcbiAgaWYgKCFub3JtYWxpemVkTWVtYmVycy5sZW5ndGgpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1NlbGVjdCBhdCBsZWFzdCBvbmUgdGl0bGUgQ3VlLicgfTtcbiAgfVxuXG4gIGNvbnN0IGVudHJpZXMgPSBbXTtcbiAgZm9yIChjb25zdCBtZW1iZXIgb2Ygbm9ybWFsaXplZE1lbWJlcnMpIHtcbiAgICBjb25zdCBzZWN0aW9uSW5kZXggPSBkb2N1bWVudC5zZWN0aW9ucy5maW5kSW5kZXgoKHNlY3Rpb24pID0+IHNlY3Rpb24uaWQgPT09IG1lbWJlci5zZWN0aW9uSWQpO1xuICAgIGNvbnN0IHNlY3Rpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICAgIGNvbnN0IGNvbXBpbGVkID0gcGxhbi5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtZW1iZXIuc2VjdGlvbklkKTtcbiAgICBjb25zdCBjdWVJbmRleCA9IHNlY3Rpb24/LnRleHQ/LmN1ZXM/LmZpbmRJbmRleCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbWVtYmVyLmN1ZUlkKSA/PyAtMTtcbiAgICBjb25zdCBjdWUgPSBzZWN0aW9uPy50ZXh0Py5jdWVzPy5bY3VlSW5kZXhdO1xuICAgIGlmICghc2VjdGlvbiB8fCAhY29tcGlsZWQgfHwgIWN1ZSB8fCAhKGNvbXBpbGVkLnRyYXZlbFdVID4gMCkpIHtcbiAgICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiBgVGl0bGUgQ3VlICR7bWVtYmVyLmN1ZUlkfSBpcyBubyBsb25nZXIgYXZhaWxhYmxlLmAgfTtcbiAgICB9XG4gICAgY29uc3QgaG9sZCA9IE51bWJlcihjdWUuaG9sZCk7XG4gICAgY29uc3QgYm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMoY3VlKTtcbiAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgbWVtYmVyLFxuICAgICAgc2VjdGlvbixcbiAgICAgIHNlY3Rpb25JbmRleCxcbiAgICAgIGN1ZSxcbiAgICAgIGN1ZUluZGV4LFxuICAgICAgY29tcGlsZWQsXG4gICAgICBob2xkLFxuICAgICAgYm91bmRzLFxuICAgICAgZ2xvYmFsV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShjb21waWxlZC5zdGFydFdVICsgKGhvbGQgKiBjb21waWxlZC50cmF2ZWxXVSkpLFxuICAgICAgbWluR2xvYmFsV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShjb21waWxlZC5zdGFydFdVICsgKGJvdW5kcy5taW4gKiBjb21waWxlZC50cmF2ZWxXVSkpLFxuICAgICAgbWF4R2xvYmFsV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShjb21waWxlZC5zdGFydFdVICsgKGJvdW5kcy5tYXggKiBjb21waWxlZC50cmF2ZWxXVSkpLFxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgcHJpbWFyeU1lbWJlciA9IG5vcm1hbGl6ZUN1ZU1lbWJlcihwcmltYXJ5KSB8fCBlbnRyaWVzWzBdLm1lbWJlcjtcbiAgY29uc3QgcHJpbWFyeUVudHJ5ID0gZW50cmllcy5maW5kKChlbnRyeSkgPT4gKFxuICAgIGN1ZU1lbWJlcktleShlbnRyeS5tZW1iZXIpID09PSBjdWVNZW1iZXJLZXkocHJpbWFyeU1lbWJlcilcbiAgKSkgfHwgZW50cmllc1swXTtcbiAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGVudHJpZXMsIHByaW1hcnlFbnRyeSB9O1xufVxuXG5mdW5jdGlvbiBzb3J0Q3VlRW50cmllcyhlbnRyaWVzKSB7XG4gIHJldHVybiBbLi4uZW50cmllc10uc29ydCgobGVmdCwgcmlnaHQpID0+IChcbiAgICAobGVmdC5nbG9iYWxXVSAtIHJpZ2h0Lmdsb2JhbFdVKVxuICAgIHx8IChsZWZ0LnNlY3Rpb25JbmRleCAtIHJpZ2h0LnNlY3Rpb25JbmRleClcbiAgICB8fCAobGVmdC5jdWVJbmRleCAtIHJpZ2h0LmN1ZUluZGV4KVxuICAgIHx8IGxlZnQuY3VlLmlkLmxvY2FsZUNvbXBhcmUocmlnaHQuY3VlLmlkKVxuICApKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQ3VlTW92ZShlbnRyeSwgZ2xvYmFsV1UpIHtcbiAgY29uc3QgaG9sZCA9IChOdW1iZXIoZ2xvYmFsV1UpIC0gZW50cnkuY29tcGlsZWQuc3RhcnRXVSkgLyBlbnRyeS5jb21waWxlZC50cmF2ZWxXVTtcbiAgY29uc3QgbW92ZWQgPSBtb3ZlQWJvdXROYXJyYXRpdmVDdWVUaW1pbmcoZW50cnkuY3VlLCBob2xkLCB7IHNuYXA6IGZhbHNlIH0pO1xuICByZXR1cm4ge1xuICAgIHNlY3Rpb25JZDogZW50cnkubWVtYmVyLnNlY3Rpb25JZCxcbiAgICBzZWN0aW9uSW5kZXg6IGVudHJ5LnNlY3Rpb25JbmRleCxcbiAgICBjdWVJZDogZW50cnkubWVtYmVyLmN1ZUlkLFxuICAgIGVudGVyOiBtb3ZlZC5lbnRlcixcbiAgICBob2xkOiBtb3ZlZC5ob2xkLFxuICAgIGV4aXQ6IG1vdmVkLmV4aXQsXG4gICAgc3RvcnlXVTogY2xlYW5UaW1lbGluZVZhbHVlKGVudHJ5LmNvbXBpbGVkLnN0YXJ0V1UgKyAobW92ZWQuaG9sZCAqIGVudHJ5LmNvbXBpbGVkLnRyYXZlbFdVKSksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldENhbmRpZGF0ZVZhbGlkYXRpb24oZG9jdW1lbnQpIHtcbiAgY29uc3Qgc2NoZW1hRGlhZ25vc3RpY3MgPSB2YWxpZGF0ZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoZG9jdW1lbnQpO1xuICBjb25zdCBzY2hlbWFFcnJvcnMgPSBzY2hlbWFEaWFnbm9zdGljcy5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0ubGV2ZWwgPT09ICdlcnJvcicpO1xuICBpZiAoc2NoZW1hRXJyb3JzLmxlbmd0aCkge1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICByZWFzb246IHNjaGVtYUVycm9yc1swXS5tZXNzYWdlLFxuICAgICAgZGlhZ25vc3RpY3M6IHNjaGVtYURpYWdub3N0aWNzLFxuICAgIH07XG4gIH1cbiAgY29uc3QgcGxhbiA9IGNvbXBpbGVBYm91dE5hcnJhdGl2ZURvY3VtZW50KGRvY3VtZW50KTtcbiAgaWYgKCFwbGFuLnZhbGlkKSB7XG4gICAgY29uc3QgZXJyb3IgPSBwbGFuLmRpYWdub3N0aWNzLmZpbmQoKGl0ZW0pID0+IGl0ZW0ubGV2ZWwgPT09ICdlcnJvcicpO1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICByZWFzb246IGVycm9yPy5tZXNzYWdlIHx8ICdUaGUgcHJvcG9zZWQgQWJvdXQgbmFycmF0aXZlIGlzIG5vdCB2YWxpZC4nLFxuICAgICAgZGlhZ25vc3RpY3M6IHBsYW4uZGlhZ25vc3RpY3MsXG4gICAgfTtcbiAgfVxuICByZXR1cm4geyB2YWxpZDogdHJ1ZSwgZGlhZ25vc3RpY3M6IHBsYW4uZGlhZ25vc3RpY3MsIHBsYW4gfTtcbn1cblxuZnVuY3Rpb24gY29weUNhbWVyYVBvc2UodGFyZ2V0LCBzb3VyY2UpIHtcbiAgaWYgKCF0YXJnZXQgfHwgIXNvdXJjZSkgcmV0dXJuO1xuICB0YXJnZXQub2Zmc2V0ID0gWy4uLnNvdXJjZS5vZmZzZXRdO1xuICB0YXJnZXQubG9va0F0T2Zmc2V0ID0gWy4uLnNvdXJjZS5sb29rQXRPZmZzZXRdO1xuICB0YXJnZXQuZm92ID0gc291cmNlLmZvdjtcbiAgdGFyZ2V0LnJvbGwgPSBzb3VyY2Uucm9sbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFib3V0TmFycmF0aXZlRXh0ZW50RmllbGQocHJvZmlsZSkge1xuICByZXR1cm4gcHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlRXh0ZW50V1UnIDogJ2V4dGVudFdVJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhcHR1cmVBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCh7XG4gIHBsYW4sXG4gIHN0b3J5V1UsXG4gIHJlc2l6ZWRTZWN0aW9uSWQsXG59KSB7XG4gIGNvbnN0IHsgc2VjdGlvbiwgc2VjdGlvbkluZGV4LCBzdG9yeVdVOiBjbGFtcGVkU3RvcnlXVSB9ID0gZ2V0U2VjdGlvbkF0U3RvcnlXVShwbGFuLCBzdG9yeVdVKTtcbiAgY29uc3QgcmVzaXplZFNlY3Rpb25JbmRleCA9IHBsYW4/LnNlY3Rpb25zPy5maW5kSW5kZXgoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHJlc2l6ZWRTZWN0aW9uSWQpID8/IC0xO1xuICBpZiAoIXNlY3Rpb24gfHwgcmVzaXplZFNlY3Rpb25JbmRleCA8IDAgfHwgc2VjdGlvbkluZGV4IDwgcmVzaXplZFNlY3Rpb25JbmRleCkge1xuICAgIHJldHVybiB7XG4gICAgICBtb2RlOiAnYWJzb2x1dGUnLFxuICAgICAgc3RvcnlXVTogY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wZWRTdG9yeVdVIHx8IDApLFxuICAgIH07XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBtb2RlOiAnc2VjdGlvbicsXG4gICAgc3RvcnlXVTogY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wZWRTdG9yeVdVKSxcbiAgICBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsXG4gICAgbG9jYWxQcm9ncmVzczogY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKFxuICAgICAgKGNsYW1wZWRTdG9yeVdVIC0gc2VjdGlvbi5zdGFydFdVKSAvIE1hdGgubWF4KDAuMDAxLCBzZWN0aW9uLnRyYXZlbFdVKSxcbiAgICAgIDAsXG4gICAgICAxLFxuICAgICkpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVtYXBBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dChjb250ZXh0LCBwbGFuKSB7XG4gIGlmICghcGxhbj8uc2VjdGlvbnM/Lmxlbmd0aCkgcmV0dXJuIDA7XG4gIGlmIChjb250ZXh0Py5tb2RlICE9PSAnc2VjdGlvbicpIHtcbiAgICByZXR1cm4gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKE51bWJlcihjb250ZXh0Py5zdG9yeVdVKSB8fCAwLCAwLCBOdW1iZXIocGxhbi5tYXhTdG9yeVdVIHx8IDApKSk7XG4gIH1cbiAgY29uc3Qgc2VjdGlvbiA9IHBsYW4uc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gY29udGV4dC5zZWN0aW9uSWQpO1xuICBpZiAoIXNlY3Rpb24pIHtcbiAgICByZXR1cm4gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKE51bWJlcihjb250ZXh0LnN0b3J5V1UpIHx8IDAsIDAsIE51bWJlcihwbGFuLm1heFN0b3J5V1UgfHwgMCkpKTtcbiAgfVxuICByZXR1cm4gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKFxuICAgIHNlY3Rpb24uc3RhcnRXVSArIChjbGFtcChOdW1iZXIoY29udGV4dC5sb2NhbFByb2dyZXNzKSB8fCAwLCAwLCAxKSAqIHNlY3Rpb24udHJhdmVsV1UpLFxuICAgIDAsXG4gICAgTnVtYmVyKHBsYW4ubWF4U3RvcnlXVSB8fCAwKSxcbiAgKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc2VsZWN0aW9uKSB7XG4gIGNvbnN0IHByaW1hcnkgPSBub3JtYWxpemVDdWVNZW1iZXIoc2VsZWN0aW9uKTtcbiAgaWYgKCFwcmltYXJ5KSByZXR1cm4gW107XG4gIGNvbnN0IGNhbmRpZGF0ZXMgPSBBcnJheS5pc0FycmF5KHNlbGVjdGlvbi5tZW1iZXJzKSA/IHNlbGVjdGlvbi5tZW1iZXJzIDogW107XG4gIGNvbnN0IG1lbWJlcnMgPSBbXTtcbiAgY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbiAgW3ByaW1hcnksIC4uLmNhbmRpZGF0ZXNdLmZvckVhY2goKGNhbmRpZGF0ZSkgPT4ge1xuICAgIGNvbnN0IG1lbWJlciA9IG5vcm1hbGl6ZUN1ZU1lbWJlcihjYW5kaWRhdGUpO1xuICAgIGlmICghbWVtYmVyKSByZXR1cm47XG4gICAgY29uc3Qga2V5ID0gY3VlTWVtYmVyS2V5KG1lbWJlcik7XG4gICAgaWYgKHNlZW4uaGFzKGtleSkpIHJldHVybjtcbiAgICBzZWVuLmFkZChrZXkpO1xuICAgIG1lbWJlcnMucHVzaChtZW1iZXIpO1xuICB9KTtcbiAgcmV0dXJuIG1lbWJlcnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbihzZWxlY3Rpb24sIGN1ZVNlbGVjdGlvbiwge1xuICBhZGRpdGl2ZSA9IHRydWUsXG59ID0ge30pIHtcbiAgY29uc3QgdGFyZ2V0ID0gbm9ybWFsaXplQ3VlTWVtYmVyKGN1ZVNlbGVjdGlvbik7XG4gIGlmICghdGFyZ2V0KSByZXR1cm4gc2VsZWN0aW9uO1xuICBpZiAoIWFkZGl0aXZlIHx8IHNlbGVjdGlvbj8udHlwZSAhPT0gJ2N1ZScpIHJldHVybiB0YXJnZXQ7XG5cbiAgY29uc3QgdGFyZ2V0S2V5ID0gY3VlTWVtYmVyS2V5KHRhcmdldCk7XG4gIGNvbnN0IGN1cnJlbnQgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc2VsZWN0aW9uKTtcbiAgY29uc3QgdGFyZ2V0SW5kZXggPSBjdXJyZW50LmZpbmRJbmRleCgobWVtYmVyKSA9PiBjdWVNZW1iZXJLZXkobWVtYmVyKSA9PT0gdGFyZ2V0S2V5KTtcbiAgaWYgKHRhcmdldEluZGV4IDwgMCkgcmV0dXJuIG1ha2VDdWVTZWxlY3Rpb24odGFyZ2V0LCBbLi4uY3VycmVudCwgdGFyZ2V0XSk7XG4gIGlmIChjdXJyZW50Lmxlbmd0aCA9PT0gMSkgcmV0dXJuIHRhcmdldDtcblxuICBjb25zdCBtZW1iZXJzID0gY3VycmVudC5maWx0ZXIoKF8sIGluZGV4KSA9PiBpbmRleCAhPT0gdGFyZ2V0SW5kZXgpO1xuICBjb25zdCBjdXJyZW50UHJpbWFyeUtleSA9IGN1ZU1lbWJlcktleShub3JtYWxpemVDdWVNZW1iZXIoc2VsZWN0aW9uKSk7XG4gIGNvbnN0IHByaW1hcnkgPSBjdXJyZW50UHJpbWFyeUtleSA9PT0gdGFyZ2V0S2V5XG4gICAgPyBtZW1iZXJzLmF0KC0xKVxuICAgIDogbWVtYmVycy5maW5kKChtZW1iZXIpID0+IGN1ZU1lbWJlcktleShtZW1iZXIpID09PSBjdXJyZW50UHJpbWFyeUtleSkgfHwgbWVtYmVycy5hdCgtMSk7XG4gIHJldHVybiBtYWtlQ3VlU2VsZWN0aW9uKHByaW1hcnksIG1lbWJlcnMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZSh2YWx1ZSwgc3RlcCA9IEFCT1VUX05BUlJBVElWRV9USU1FTElORV9TVEVQKSB7XG4gIHJldHVybiBjbGVhblRpbWVsaW5lVmFsdWUoTWF0aC5yb3VuZChOdW1iZXIodmFsdWUpIC8gc3RlcCkgKiBzdGVwKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFib3V0TmFycmF0aXZlQ2FtZXJhS2V5VGltaW5nQm91bmRzKGtleXMsIGtleUluZGV4KSB7XG4gIGNvbnN0IGtleSA9IGtleXNba2V5SW5kZXhdO1xuICBpZiAoIWtleSkgcmV0dXJuIHsgbWluOiAwLCBtYXg6IDEsIGxvY2tlZDogdHJ1ZSB9O1xuICBpZiAoa2V5SW5kZXggPT09IDAgfHwga2V5SW5kZXggPT09IGtleXMubGVuZ3RoIC0gMSkge1xuICAgIHJldHVybiB7IG1pbjogTnVtYmVyKGtleS5hdCksIG1heDogTnVtYmVyKGtleS5hdCksIGxvY2tlZDogdHJ1ZSB9O1xuICB9XG4gIHJldHVybiB7XG4gICAgbWluOiBjbGVhblRpbWVsaW5lVmFsdWUoTnVtYmVyKGtleXNba2V5SW5kZXggLSAxXS5hdCkgKyBBQk9VVF9OQVJSQVRJVkVfVElNRUxJTkVfU1RFUCksXG4gICAgbWF4OiBjbGVhblRpbWVsaW5lVmFsdWUoTnVtYmVyKGtleXNba2V5SW5kZXggKyAxXS5hdCkgLSBBQk9VVF9OQVJSQVRJVkVfVElNRUxJTkVfU1RFUCksXG4gICAgbG9ja2VkOiBmYWxzZSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVBYm91dE5hcnJhdGl2ZUNhbWVyYUtleURyb3Aoe1xuICBkb2N1bWVudCxcbiAgcGxhbixcbiAgc291cmNlU2VjdGlvbkluZGV4LFxuICBzb3VyY2VLZXlJbmRleCxcbiAgc3RvcnlXVSxcbn0pIHtcbiAgaWYgKCFkb2N1bWVudD8uc2VjdGlvbnM/Lmxlbmd0aCB8fCAhcGxhbj8uc2VjdGlvbnM/Lmxlbmd0aCkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIGNhbWVyYSB0aW1lbGluZSBpcyBub3QgcmVhZHkuJyB9O1xuICB9XG5cbiAgY29uc3QgY2xhbXBlZFN0b3J5V1UgPSBjbGFtcChOdW1iZXIoc3RvcnlXVSksIDAsIE51bWJlcihwbGFuLm1heFN0b3J5V1UgfHwgc3RvcnlXVSkpO1xuICBsZXQgc2VjdGlvbkluZGV4ID0gcGxhbi5zZWN0aW9ucy5maW5kSW5kZXgoKHNlY3Rpb24sIGluZGV4KSA9PiB7XG4gICAgY29uc3QgbmV4dFN0YXJ0V1UgPSBwbGFuLnNlY3Rpb25zW2luZGV4ICsgMV0/LnN0YXJ0V1UgPz8gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuICAgIHJldHVybiBjbGFtcGVkU3RvcnlXVSA+PSBzZWN0aW9uLnN0YXJ0V1UgJiYgY2xhbXBlZFN0b3J5V1UgPCBuZXh0U3RhcnRXVTtcbiAgfSk7XG4gIGlmIChzZWN0aW9uSW5kZXggPCAwKSBzZWN0aW9uSW5kZXggPSBwbGFuLnNlY3Rpb25zLmxlbmd0aCAtIDE7XG5cbiAgY29uc3QgY29tcGlsZWQgPSBwbGFuLnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gIGNvbnN0IHNlY3Rpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICBpZiAoIWNvbXBpbGVkIHx8ICFzZWN0aW9uPy5jYW1lcmE/LmtleXM/Lmxlbmd0aCB8fCAhKGNvbXBpbGVkLnRyYXZlbFdVID4gMCkpIHtcbiAgICByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoaXMgU2VjdGlvbiBjYW5ub3QgcmVjZWl2ZSBhIGNhbWVyYSBrZXkuJyB9O1xuICB9XG5cbiAgY29uc3QgcmF3QXQgPSAoY2xhbXBlZFN0b3J5V1UgLSBjb21waWxlZC5zdGFydFdVKSAvIGNvbXBpbGVkLnRyYXZlbFdVO1xuICBjb25zdCByZXF1ZXN0ZWRBdCA9IGNsYW1wKFxuICAgIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUocmF3QXQpLFxuICAgIEFCT1VUX05BUlJBVElWRV9USU1FTElORV9TVEVQLFxuICAgIDEgLSBBQk9VVF9OQVJSQVRJVkVfVElNRUxJTkVfU1RFUCxcbiAgKTtcbiAgY29uc3QgbmVpZ2hib3VycyA9IHNlY3Rpb24uY2FtZXJhLmtleXNcbiAgICAuZmlsdGVyKChrZXksIGtleUluZGV4KSA9PiAhKHNlY3Rpb25JbmRleCA9PT0gc291cmNlU2VjdGlvbkluZGV4ICYmIGtleUluZGV4ID09PSBzb3VyY2VLZXlJbmRleCkpXG4gICAgLm1hcCgoa2V5KSA9PiBOdW1iZXIoa2V5LmF0KSlcbiAgICAuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xuICBjb25zdCBuZXh0SW5kZXggPSBuZWlnaGJvdXJzLmZpbmRJbmRleCgoYXQpID0+IGF0ID4gcmVxdWVzdGVkQXQpO1xuICBjb25zdCBpbnNlcnRpb25JbmRleCA9IG5leHRJbmRleCA8IDAgPyBuZWlnaGJvdXJzLmxlbmd0aCA6IG5leHRJbmRleDtcbiAgY29uc3QgcHJldmlvdXNBdCA9IG5laWdoYm91cnNbaW5zZXJ0aW9uSW5kZXggLSAxXSA/PyAwO1xuICBjb25zdCBuZXh0QXQgPSBuZWlnaGJvdXJzW2luc2VydGlvbkluZGV4XSA/PyAxO1xuICBjb25zdCBtaW4gPSBjbGVhblRpbWVsaW5lVmFsdWUocHJldmlvdXNBdCArIEFCT1VUX05BUlJBVElWRV9USU1FTElORV9TVEVQKTtcbiAgY29uc3QgbWF4ID0gY2xlYW5UaW1lbGluZVZhbHVlKG5leHRBdCAtIEFCT1VUX05BUlJBVElWRV9USU1FTElORV9TVEVQKTtcbiAgaWYgKG1pbiA+IG1heCkge1xuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICByZWFzb246IGAke3NlY3Rpb24ubGFiZWx9IGhhcyBubyBzYWZlIGdhcCBmb3IgYW5vdGhlciBjYW1lcmEga2V5IGhlcmUuYCxcbiAgICAgIHNlY3Rpb25JbmRleCxcbiAgICAgIHNlY3Rpb25JZDogc2VjdGlvbi5pZCxcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgYXQgPSBjbGVhblRpbWVsaW5lVmFsdWUoY2xhbXAocmVxdWVzdGVkQXQsIG1pbiwgbWF4KSk7XG4gIGNvbnN0IGtleUluZGV4ID0gbmVpZ2hib3Vycy5maW5kSW5kZXgoKGl0ZW0pID0+IGl0ZW0gPiBhdCk7XG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgc2VjdGlvbkluZGV4LFxuICAgIHNlY3Rpb25JZDogc2VjdGlvbi5pZCxcbiAgICBzZWN0aW9uTGFiZWw6IHNlY3Rpb24ubGFiZWwsXG4gICAga2V5SW5kZXg6IGtleUluZGV4IDwgMCA/IG5laWdoYm91cnMubGVuZ3RoIDoga2V5SW5kZXgsXG4gICAgYXQsXG4gICAgc3RvcnlXVTogY2xlYW5UaW1lbGluZVZhbHVlKGNvbXBpbGVkLnN0YXJ0V1UgKyAoYXQgKiBjb21waWxlZC50cmF2ZWxXVSkpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMoY3VlKSB7XG4gIGNvbnN0IGZvY3VzID0gTnVtYmVyKGN1ZS5ob2xkKTtcbiAgY29uc3QgbGVhZCA9IE1hdGgubWF4KDAsIGZvY3VzIC0gTnVtYmVyKGN1ZS5lbnRlcikpO1xuICBjb25zdCB0cmFpbCA9IE1hdGgubWF4KDAsIE51bWJlcihjdWUuZXhpdCkgLSBmb2N1cyk7XG4gIHJldHVybiB7XG4gICAgbWluOiAwLFxuICAgIG1heDogMSxcbiAgICBsZWFkLFxuICAgIHRyYWlsLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbW92ZUFib3V0TmFycmF0aXZlQ3VlVGltaW5nKGN1ZSwgbmV4dEZvY3VzKSB7XG4gIGNvbnN0IGJvdW5kcyA9IGdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzKGN1ZSk7XG4gIGNvbnN0IGhvbGQgPSBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlKGNsYW1wKE51bWJlcihuZXh0Rm9jdXMpLCBib3VuZHMubWluLCBib3VuZHMubWF4KSk7XG4gIHJldHVybiB7XG4gICAgLi4uY3VlLFxuICAgIGVudGVyOiBjbGVhblRpbWVsaW5lVmFsdWUoaG9sZCAtIGJvdW5kcy5sZWFkKSxcbiAgICBob2xkLFxuICAgIGV4aXQ6IGNsZWFuVGltZWxpbmVWYWx1ZShob2xkICsgYm91bmRzLnRyYWlsKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwTW92ZSh7XG4gIGRvY3VtZW50LFxuICBwbGFuLFxuICBtZW1iZXJzLFxuICBwcmltYXJ5LFxuICBkZWx0YVdVLFxuICBsb2NhbERlbHRhLFxufSkge1xuICBpZiAoIWRvY3VtZW50Py5zZWN0aW9ucz8ubGVuZ3RoIHx8ICFwbGFuPy52YWxpZCB8fCAhcGxhbi5zZWN0aW9ucz8ubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGUgdGV4dCB0aW1lbGluZSBpcyBub3QgcmVhZHkuJyB9O1xuICB9XG5cbiAgY29uc3Qgbm9ybWFsaXplZE1lbWJlcnMgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoe1xuICAgIC4uLihub3JtYWxpemVDdWVNZW1iZXIocHJpbWFyeSkgfHwgbm9ybWFsaXplQ3VlTWVtYmVyKG1lbWJlcnM/LlswXSkgfHwge30pLFxuICAgIG1lbWJlcnMsXG4gIH0pO1xuICBpZiAoIW5vcm1hbGl6ZWRNZW1iZXJzLmxlbmd0aCkge1xuICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnU2VsZWN0IGF0IGxlYXN0IG9uZSB0aXRsZSBDdWUuJyB9O1xuICB9XG5cbiAgY29uc3QgZW50cmllcyA9IFtdO1xuICBmb3IgKGNvbnN0IG1lbWJlciBvZiBub3JtYWxpemVkTWVtYmVycykge1xuICAgIGNvbnN0IHNlY3Rpb25JbmRleCA9IGRvY3VtZW50LnNlY3Rpb25zLmZpbmRJbmRleCgoc2VjdGlvbikgPT4gc2VjdGlvbi5pZCA9PT0gbWVtYmVyLnNlY3Rpb25JZCk7XG4gICAgY29uc3Qgc2VjdGlvbiA9IGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gICAgY29uc3QgY29tcGlsZWQgPSBwbGFuLnNlY3Rpb25zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1lbWJlci5zZWN0aW9uSWQpO1xuICAgIGNvbnN0IGN1ZSA9IHNlY3Rpb24/LnRleHQ/LmN1ZXM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1lbWJlci5jdWVJZCk7XG4gICAgaWYgKCFzZWN0aW9uIHx8ICFjb21waWxlZCB8fCAhY3VlIHx8ICEoY29tcGlsZWQudHJhdmVsV1UgPiAwKSkge1xuICAgICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246IGBUaXRsZSBDdWUgJHttZW1iZXIuY3VlSWR9IGlzIG5vIGxvbmdlciBhdmFpbGFibGUuYCB9O1xuICAgIH1cbiAgICBjb25zdCBob2xkID0gTnVtYmVyKGN1ZS5ob2xkKTtcbiAgICBjb25zdCBib3VuZHMgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZ0JvdW5kcyhjdWUpO1xuICAgIGVudHJpZXMucHVzaCh7IG1lbWJlciwgc2VjdGlvbkluZGV4LCBjb21waWxlZCwgY3VlLCBob2xkLCBib3VuZHMgfSk7XG4gIH1cblxuICBjb25zdCBwcmltYXJ5TWVtYmVyID0gbm9ybWFsaXplQ3VlTWVtYmVyKHByaW1hcnkpIHx8IGVudHJpZXNbMF0ubWVtYmVyO1xuICBjb25zdCBwcmltYXJ5RW50cnkgPSBlbnRyaWVzLmZpbmQoKGVudHJ5KSA9PiBjdWVNZW1iZXJLZXkoZW50cnkubWVtYmVyKSA9PT0gY3VlTWVtYmVyS2V5KHByaW1hcnlNZW1iZXIpKSB8fCBlbnRyaWVzWzBdO1xuICBjb25zdCByZXF1ZXN0ZWREZWx0YVdVID0gTnVtYmVyLmlzRmluaXRlKE51bWJlcihkZWx0YVdVKSlcbiAgICA/IE51bWJlcihkZWx0YVdVKVxuICAgIDogTnVtYmVyKGxvY2FsRGVsdGEgfHwgMCkgKiBwcmltYXJ5RW50cnkuY29tcGlsZWQudHJhdmVsV1U7XG4gIGNvbnN0IG1pbkRlbHRhV1UgPSBNYXRoLm1heCguLi5lbnRyaWVzLm1hcCgoZW50cnkpID0+IC1lbnRyeS5ob2xkICogZW50cnkuY29tcGlsZWQudHJhdmVsV1UpKTtcbiAgY29uc3QgbWF4RGVsdGFXVSA9IE1hdGgubWluKC4uLmVudHJpZXMubWFwKChlbnRyeSkgPT4gKDEgLSBlbnRyeS5ob2xkKSAqIGVudHJ5LmNvbXBpbGVkLnRyYXZlbFdVKSk7XG4gIGNvbnN0IGFwcGxpZWREZWx0YVdVID0gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKHJlcXVlc3RlZERlbHRhV1UsIG1pbkRlbHRhV1UsIG1heERlbHRhV1UpKTtcbiAgY29uc3QgbW92ZXMgPSBlbnRyaWVzLm1hcCgoZW50cnkpID0+IHtcbiAgICBjb25zdCBob2xkID0gY2xlYW5UaW1lbGluZVZhbHVlKGNsYW1wKFxuICAgICAgZW50cnkuaG9sZCArIChhcHBsaWVkRGVsdGFXVSAvIGVudHJ5LmNvbXBpbGVkLnRyYXZlbFdVKSxcbiAgICAgIDAsXG4gICAgICAxLFxuICAgICkpO1xuICAgIHJldHVybiB7XG4gICAgICBzZWN0aW9uSWQ6IGVudHJ5Lm1lbWJlci5zZWN0aW9uSWQsXG4gICAgICBzZWN0aW9uSW5kZXg6IGVudHJ5LnNlY3Rpb25JbmRleCxcbiAgICAgIGN1ZUlkOiBlbnRyeS5tZW1iZXIuY3VlSWQsXG4gICAgICBlbnRlcjogY2xlYW5UaW1lbGluZVZhbHVlKGhvbGQgLSBlbnRyeS5ib3VuZHMubGVhZCksXG4gICAgICBob2xkLFxuICAgICAgZXhpdDogY2xlYW5UaW1lbGluZVZhbHVlKGhvbGQgKyBlbnRyeS5ib3VuZHMudHJhaWwpLFxuICAgIH07XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgcmVxdWVzdGVkRGVsdGFXVTogY2xlYW5UaW1lbGluZVZhbHVlKHJlcXVlc3RlZERlbHRhV1UpLFxuICAgIGRlbHRhV1U6IGFwcGxpZWREZWx0YVdVLFxuICAgIG1pbkRlbHRhV1U6IGNsZWFuVGltZWxpbmVWYWx1ZShtaW5EZWx0YVdVKSxcbiAgICBtYXhEZWx0YVdVOiBjbGVhblRpbWVsaW5lVmFsdWUobWF4RGVsdGFXVSksXG4gICAgbW92ZXMsXG4gIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxDQUFDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztBQUN6RyxNQUFNLENBQUM7QUFDUCxDQUFDLENBQUMsMkJBQTJCO0FBQzdCLENBQUMsQ0FBQyw4QkFBOEI7QUFDaEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7O0FBRWhFLE1BQU0sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHOztBQUVsRCxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUMvQixLQUFLLENBQUMsaUNBQWlDLENBQUMsQ0FB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QUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNwQzs7QUFFQSxRQUFRLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRTtBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztBQUN0RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7QUFDNUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENB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QUFDLENBQUM7QUFDckUsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDO0FBQ2xHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUM7QUFDbkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDO0FBQy9FLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7QUFDN0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxD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LENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztBQUN6RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVKLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUk7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUM7QUFDMUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxjQUFjO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUNULENBQUMsQ0FBQyxDQUFDO0FBQ0g7In0=