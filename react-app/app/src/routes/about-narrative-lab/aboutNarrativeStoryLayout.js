import {
  synchronizeAboutNarrativeMomentTriggers,
} from './aboutNarrativeMoments.js';
import {
  getAboutNarrativeCameraRotationFromQuaternion,
  writeAboutNarrativeCameraLookAtQuaternion,
} from './aboutNarrativeCameraRig.js';
import { ABOUT_BLENDER_STAGE_IDS } from './aboutBlenderStages.js';
import { ABOUT_NARRATIVE_PHYSICAL_STAGE_BOUNDARIES } from './aboutNarrativeDefinitions.js';
import {
  compileAboutNarrativeLongRideTrack,
  sampleAboutNarrativeLongRidePositionInto,
} from './aboutNarrativeLongRideTrack.js';
import {
  ABOUT_NARRATIVE_CAREER_SEQUENCE_KIND,
  isAboutNarrativeConnectedFlightPacing,
} from './aboutNarrativeTrackSchema.js';

const FLOW_EPSILON = 0.000001;
const DEFAULT_PROFILE_ID = 'desktop';

// Physical viewport travel captured from the first statement, independent of
// the story-to-scroll ratio, line wrapping, and the following chapter.
export const ABOUT_NARRATIVE_TITLE_TRAVEL_SCREENS = Object.freeze({
  desktop: 0.24, tablet: 0.22, mobile: 0.2,
});

// The scanned river is the last part of the same physical journey. Its lead
// is visible travel through the city, followed by the compact invitation.
export const ABOUT_NARRATIVE_RIVER_TRAVEL_SHARE = 1 - ABOUT_NARRATIVE_PHYSICAL_STAGE_BOUNDARIES.at(-2);

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
    editorialTailScreens: 0.1,
    titleContentPaddingScreens: 0.2,
  }),
  tablet: Object.freeze({
    charactersPerScreen: 1_350,
    disciplineItemScreens: 0.25,
    careerHeadingScreens: 0.13,
    careerItemScreens: 0.16,
    careerIndependentWorkScreens: 0.12,
    editorialLeadScreens: 0.76,
    editorialTailScreens: 0.1,
    titleContentPaddingScreens: 0.22,
  }),
  mobile: Object.freeze({
    charactersPerScreen: 840,
    disciplineItemScreens: 0.3,
    careerHeadingScreens: 0.15,
    careerItemScreens: 0.2,
    careerIndependentWorkScreens: 0.15,
    editorialLeadScreens: 0.68,
    editorialTailScreens: 0.1,
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
    sceneLeadScreens: clamp(Number(flow.sceneLeadScreens) || 0, 0, 6),
    gapAfter: ABOUT_NARRATIVE_STORY_GAP_PRESETS[flow.gapAfter]
      ? flow.gapAfter
      : 'tight',
    focusMode: ABOUT_NARRATIVE_STORY_FOCUS_MODES.includes(flow.focusMode)
      ? flow.focusMode
      : field.kind === 'scroll-block' ? 'reading-start' : 'middle',
    focusOffsetScreens: finite(flow.focusOffsetScreens)
      ? clamp(Number(flow.focusOffsetScreens), 0, 6)
      : null,
    gapAfterScreens: finite(flow.gapAfterScreens)
      ? clamp(Number(flow.gapAfterScreens), 0, 3)
      : 0,
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

function finishStagedLayout({
  profileId, profile, editorialLeadScreens, diagnostics, compiledFields, sections,
  durationWU, pacingMode = 'legacy',
}) {
  const gaps = compiledFields.slice(0, -1).map((field, index) => {
    const next = compiledFields[index + 1];
    return {
      id: `gap-${field.id}-to-${next.id}`,
      fromFieldId: field.id,
      toFieldId: next.id,
      preset: 'none',
      startWU: field.endWU,
      endWU: next.startWU,
      durationWU: cleanWU(Math.max(0, next.startWU - field.endWU)),
    };
  });
  const signature = JSON.stringify({
    profileId,
    sections: sections.map((section) => [
      section.id,
      section.startWU,
      section.endWU,
      section.sceneStartWU,
      section.sceneEndWU,
      section.fieldIds,
    ]),
    fields: compiledFields.map((field) => [field.id, field.startWU, field.focusWU, field.endWU]),
  });
  return Object.freeze({
    mode: 'content-flow',
    sectionMode: 'content-paced',
    pacingMode,
    profileId,
    valid: !diagnostics.some((item) => item.level === 'error'),
    diagnostics: Object.freeze(diagnostics.map(Object.freeze)),
    fields: Object.freeze(compiledFields.map(Object.freeze)),
    gaps: Object.freeze(gaps.map(Object.freeze)),
    sections: Object.freeze(sections.map((section) => Object.freeze({
      ...section,
      fieldIds: Object.freeze(section.fieldIds),
    }))),
    durationWU,
    contentExtentWU: cleanWU(durationWU + 1),
    editorialLeadWU: cleanWU(editorialLeadScreens),
    editorialTailWU: cleanWU(profile.editorialTailScreens),
    riverStartWU: sections.at(-1).sceneStartWU,
    riverTravelShare: cleanWU((durationWU - sections.at(-1).sceneStartWU) / durationWU),
    signature,
  });
}

function compileConnectedFlightLayout({
  connectedFlight, fieldsByStage, measurementsById, durationById, gapAfterById,
  scrollToStory, profileId, profile, editorialLeadScreens, diagnostics,
}) {
  const boundaries = connectedFlight.physicalStageBoundaries;
  const stageDemands = ABOUT_BLENDER_STAGE_IDS.map((stageId, index) => {
    const stageFields = fieldsByStage.get(stageId);
    // Native prose can enter before its logical marker. Reserve that approach
    // inside the calm region even when it follows a short opening statement.
    let entryWU = 0;
    let contentWU = 0;
    stageFields.forEach((field) => {
      contentWU += measurementsById.get(field.id).flow.sceneLeadScreens * scrollToStory;
      const firstPixelWU = contentWU
        + (field.kind === 'scroll-block' ? (editorialLeadScreens - 1) * scrollToStory : 0);
      entryWU = Math.max(entryWU, -firstPixelWU);
      contentWU += durationById.get(field.id) + gapAfterById.get(field.id);
    });
    const readingEndFraction = index === 0
      ? connectedFlight.openingReadEndFraction : boundaries[index + 1];
    return { entryWU, contentWU, share: readingEndFraction - boundaries[index] };
  });
  const durationWU = cleanWU(Math.max(FLOW_EPSILON, ...stageDemands.map(
    ({ entryWU, contentWU, share }) => (entryWU + contentWU) / share,
  )));
  const compiledFields = [];
  const sections = ABOUT_BLENDER_STAGE_IDS.map((stageId, index) => {
    const stageFields = fieldsByStage.get(stageId);
    const demand = stageDemands[index];
    const startWU = cleanWU(boundaries[index] * durationWU);
    const endWU = cleanWU(boundaries[index + 1] * durationWU);
    const readingEndWU = index === 0
      ? cleanWU(connectedFlight.openingReadEndFraction * durationWU) : endWU;
    const extraWU = Math.max(0, readingEndWU - startWU - demand.entryWU - demand.contentWU);
    const readingDurationWU = stageFields.reduce((sum, field) => sum
      + (field.kind === 'scroll-block' ? durationById.get(field.id) : 0), 0);
    // Extra space belongs to native reading blocks. Bookends and intermediate
    // statements retain their existing lifecycle; the invitation ends the rail.
    let cursorWU = startWU + demand.entryWU
      + (index === ABOUT_BLENDER_STAGE_IDS.length - 1 ? extraWU : 0);
    stageFields.forEach((field) => {
      const flowData = measurementsById.get(field.id);
      const fieldDurationWU = cleanWU(durationById.get(field.id)
        + (field.kind === 'scroll-block' && readingDurationWU > 0
          ? extraWU * durationById.get(field.id) / readingDurationWU : 0));
      const fieldStartWU = cleanWU(cursorWU + flowData.flow.sceneLeadScreens * scrollToStory);
      const fieldEndWU = cleanWU(fieldStartWU + fieldDurationWU);
      compiledFields.push({
        id: field.id,
        stageId,
        stageIndex: index,
        kind: field.kind,
        startWU: fieldStartWU,
        focusWU: getFocusWU(field, flowData.flow, fieldStartWU, fieldDurationWU),
        endWU: fieldEndWU,
        durationWU: fieldDurationWU,
        naturalScreens: cleanWU(flowData.naturalScreens),
        minScreens: flowData.flow.minScreens,
        gapAfter: 'none',
        measured: flowData.measured,
      });
      cursorWU = fieldEndWU + gapAfterById.get(field.id);
    });
    return {
      id: stageId,
      index,
      startWU,
      endWU,
      durationWU: cleanWU(endWU - startWU),
      sceneStartWU: startWU,
      sceneEndWU: endWU,
      fieldIds: stageFields.map((field) => field.id),
      travelOnly: connectedFlight.travelOnlyStageIds.includes(stageId),
      readingAllocationWU: cleanWU(readingDurationWU > 0 ? extraWU : 0),
      approachAllocationWU: cleanWU(readingDurationWU > 0 ? demand.entryWU : extraWU),
    };
  });
  return finishStagedLayout({
    profileId, profile, editorialLeadScreens, diagnostics, compiledFields, sections,
    durationWU, pacingMode: 'connected-flight',
  });
}

function compileStagedLayout(document, fields, {
  profileId,
  profile,
  measurements,
  editorialLeadScreens,
  diagnostics,
}) {
  const stageIds = ABOUT_BLENDER_STAGE_IDS;
  const authoredConnectedFlight = document.globals?.storyPacing?.connectedFlight;
  const connectedFlight = isAboutNarrativeConnectedFlightPacing(authoredConnectedFlight)
    ? authoredConnectedFlight : null;
  if (authoredConnectedFlight != null && !connectedFlight) {
    diagnostics.push({
      level: 'error', code: 'connected-flight-pacing', path: 'globals.storyPacing.connectedFlight',
      message: 'Connected flight requires a valid physical pacing contract.',
    });
  }
  const fieldsByStage = new Map(stageIds.map((stageId) => [stageId, []]));
  fields.forEach((field) => fieldsByStage.get(field.stageId)?.push(field));
  stageIds.forEach((stageId) => {
    const travelOnly = connectedFlight?.travelOnlyStageIds.includes(stageId);
    if (travelOnly && fieldsByStage.get(stageId).length) {
      diagnostics.push({
        level: 'error', code: 'story-travel-has-text', path: `tracks.text.fields.${stageId}`,
        message: `Travel-only stage “${stageId}” cannot contain Text fields.`,
      });
    }
    if (!travelOnly && !fieldsByStage.get(stageId).length) {
      diagnostics.push({
        level: 'error',
        code: 'story-stage-empty',
        path: `tracks.text.fields.${stageId}`,
        message: `Story stage “${stageId}” needs at least one Text field.`,
      });
    }
  });

  const authoredProfile = document.profiles[profileId];
  const scrollToStory = authoredProfile.storyDurationWU / authoredProfile.scrollDurationWU;
  const pacing = document.globals?.storyPacing;
  const readingSpaceScale = Math.max(0.75, Number(pacing?.readingSpaceScale) || 1);
  const passageScale = Math.max(0.5, Number(pacing?.passageScale) || 1);
  const titleMotionScale = Math.max(0.1, Number(document.globals?.textMotion?.durationScale) || 1);
  const titleTravelScreens = (ABOUT_NARRATIVE_TITLE_TRAVEL_SCREENS[profileId]
    ?? ABOUT_NARRATIVE_TITLE_TRAVEL_SCREENS.desktop) * titleMotionScale;
  const readingClearanceScreens = Math.max(0, Number(pacing?.titleToProseGapScreens ?? 0.06));
  const measurementsById = new Map();
  const durationById = new Map();
  fields.forEach((field) => {
    const flow = getFlow(field);
    const measurement = getMeasurement(measurements, field.id);
    const measuredScreens = measuredNaturalScreens(measurement);
    const naturalScreens = measuredScreens ?? estimateNaturalScreens(field, profile);
    const physicalToStory = measuredScreens == null ? 1 : scrollToStory;
    const isStatement = field.kind === 'title'
      && field.preset !== 'opener-v1' && field.preset !== 'finale-v1';
    const readingFitWU = (naturalScreens + editorialLeadScreens
      + profile.editorialTailScreens) * physicalToStory;
    const durationWU = field.kind === 'scroll-block'
      ? cleanWU(Math.max(readingFitWU, Math.max(flow.minScreens, readingFitWU) * readingSpaceScale))
      : isStatement
        ? cleanWU(titleTravelScreens * scrollToStory)
        : cleanWU(Math.max(
          flow.minScreens * (field.preset === 'finale-v1' ? scrollToStory : 1),
          naturalScreens * physicalToStory,
        ));
    measurementsById.set(field.id, {
      flow,
      naturalScreens,
      protectedScreens: measurement?.protectedHeightPx != null
        ? Math.max(0, Number(measurement.protectedHeightPx)) / Math.max(1, Number(measurement.viewportHeightPx))
        : naturalScreens + (field.kind === 'title' ? profile.titleContentPaddingScreens : 0),
      measured: measuredScreens != null,
    });
    durationById.set(field.id, durationWU);
  });

  const requestedTotalWU = Number(
    document?.profiles?.[profileId]?.storyDurationWU
    ?? document?.profiles?.desktop?.storyDurationWU,
  );
  // A short estimated layout may need the authored reading allocation until
  // real measurements arrive. Allocate it to reading, never title motion.
  const occupiedTotalWU = [...durationById.values()].reduce((sum, value) => sum + value, 0);
  const readingFields = fields.filter((field) => field.kind === 'scroll-block');
  const readingTotalWU = readingFields.reduce((sum, field) => sum + durationById.get(field.id), 0);
  const completelyMeasured = fields.every((field) => measurementsById.get(field.id).measured);
  const extraReadingWU = completelyMeasured ? 0
    : Math.max(0, requestedTotalWU * readingSpaceScale - occupiedTotalWU);
  readingFields.forEach((field) => {
    const durationWU = durationById.get(field.id);
    durationById.set(field.id, cleanWU(durationWU
      + extraReadingWU * durationWU / Math.max(FLOW_EPSILON, readingTotalWU)));
  });
  const gapAfterById = new Map(fields.map((field, fieldIndex) => {
    const next = fields[fieldIndex + 1];
    // Physical stages already supply cross-region travel. Only handoffs inside
    // one calm region consume that region's reading allocation.
    if (connectedFlight && next?.stageId !== field.stageId) return [field.id, 0];
    const authoredGapScreens = measurementsById.get(field.id).flow.gapAfterScreens;
    const leadsToReading = field.kind === 'title' && next?.kind === 'scroll-block';
    const viewportY = Number(document.globals?.textMotion?.[
      field.preset === 'opener-v1' ? 'bookendViewportY' : 'standardViewportY'
    ] ?? 50) / 100;
    // Prose may enter the lower viewport while the title finishes its fixed
    // hold. At the exact title exit, its first pixel still sits below the
    // complete measured lockup plus the authored clearance. Earlier pixels
    // are farther down, so this never asks the title to move out of their way.
    const requiredGapScreens = Math.max(0, viewportY
      + measurementsById.get(field.id).protectedScreens * 0.5
      + readingClearanceScreens - editorialLeadScreens);
    const gapScreens = leadsToReading
      ? Math.max(requiredGapScreens, Math.max(authoredGapScreens, requiredGapScreens)
        * (['about.02', 'about.04'].includes(field.stageId) ? passageScale : 1))
      : authoredGapScreens;
    return [field.id, next ? cleanWU(gapScreens * scrollToStory) : 0];
  }));
  if (connectedFlight) {
    return compileConnectedFlightLayout({
      connectedFlight, fieldsByStage, measurementsById, durationById, gapAfterById,
      scrollToStory, profileId, profile, editorialLeadScreens, diagnostics,
    });
  }
  const compiledFields = [];
  let stageCursorWU = 0;
  const sections = stageIds.map((stageId, stageIndex) => {
    const stageFields = fieldsByStage.get(stageId);
    const startWU = cleanWU(stageCursorWU);
    let cursorWU = startWU;
    const authoredStageDurationWU = stageFields.reduce((sum, field) => sum
      + durationById.get(field.id)
      + measurementsById.get(field.id).flow.sceneLeadScreens * scrollToStory
      + gapAfterById.get(field.id), 0);
    const riverLeadWU = stageIndex === stageIds.length - 1
      ? Math.max(0, startWU * ABOUT_NARRATIVE_RIVER_TRAVEL_SHARE
        / (1 - ABOUT_NARRATIVE_RIVER_TRAVEL_SHARE) - authoredStageDurationWU)
      : 0;
    stageFields.forEach((field, fieldIndex) => {
      const durationWU = durationById.get(field.id);
      const flowData = measurementsById.get(field.id);
      // A scene can have its own uninterrupted approach before the invitation.
      // This space is authored in viewport lengths and survives text reflow.
      cursorWU = cleanWU(cursorWU + flowData.flow.sceneLeadScreens * scrollToStory
        + (fieldIndex === 0 ? riverLeadWU : 0));
      const fieldStartWU = cleanWU(cursorWU);
      const fieldEndWU = cleanWU(fieldStartWU + durationWU);
      compiledFields.push({
        id: field.id,
        stageId,
        stageIndex,
        kind: field.kind,
        startWU: fieldStartWU,
        focusWU: getFocusWU(field, flowData.flow, fieldStartWU, durationWU),
        endWU: fieldEndWU,
        durationWU,
        naturalScreens: cleanWU(flowData.naturalScreens),
        minScreens: flowData.flow.minScreens,
        gapAfter: 'none',
        measured: flowData.measured,
      });
      cursorWU = cleanWU(fieldEndWU + gapAfterById.get(field.id));
    });
    const endWU = cursorWU;
    const stageDurationWU = cleanWU(endWU - startWU);
    stageCursorWU = endWU;
    return {
      id: stageId,
      index: stageIndex,
      startWU,
      endWU,
      durationWU: stageDurationWU,
      fieldIds: stageFields.map((field) => field.id),
    };
  });

  // Text blocks enter before their logical timeline markers. Scene boundaries
  // meet that measured viewport entry so a tunnel is already clear when the
  // following prose begins, while titles retain their independent motion span.
  sections.forEach((section) => {
    const first = compiledFields.find((field) => field.id === section.fieldIds[0]);
    section.sceneStartWU = cleanWU(first?.kind === 'scroll-block'
      ? first.startWU + (editorialLeadScreens - 1) * scrollToStory
      : section.startWU);
  });
  sections.forEach((section, index) => {
    section.sceneEndWU = sections[index + 1]?.sceneStartWU ?? section.endWU;
  });

  // A physical gate cannot follow text reflow. Fit the complete layout to the
  // longest required stage, then use one constant rate for the whole journey.
  // The scene/section offset preserves the native lower-viewport prose entry.
  const physicalBoundaries = ABOUT_NARRATIVE_PHYSICAL_STAGE_BOUNDARIES;
  const fittedDurationWU = cleanWU(Math.max(...sections.map((section, index) => (
    (section.sceneEndWU - section.sceneStartWU)
      / (physicalBoundaries[index + 1] - physicalBoundaries[index])
  ))));
  const sectionOffsets = sections.map(section => section.sceneStartWU - section.startWU);
  sections.forEach((section, index) => {
    const originalStartWU = section.startWU;
    const originalSceneDurationWU = section.sceneEndWU - section.sceneStartWU;
    const targetSceneStartWU = cleanWU(physicalBoundaries[index] * fittedDurationWU);
    const targetSceneEndWU = cleanWU(physicalBoundaries[index + 1] * fittedDurationWU);
    const startWU = cleanWU(targetSceneStartWU - sectionOffsets[index]);
    const endWU = index === sections.length - 1 ? fittedDurationWU
      : cleanWU(targetSceneEndWU - sectionOffsets[index + 1]);
    const extraWU = Math.max(0, targetSceneEndWU - targetSceneStartWU - originalSceneDurationWU);
    const stageFields = compiledFields.filter(field => field.stageId === section.id);
    const readingDurationWU = stageFields.reduce((sum, field) => (
      sum + (field.kind === 'scroll-block' ? field.durationWU : 0)
    ), 0);
    // Split added reading room across the existing native blocks. Title pairs
    // keep their exact common lifecycle, with their extra approach/exit space
    // outside both title spans. The invitation keeps its compact endpoint.
    let cumulativeExtraWU = section.id === 'about.06' ? extraWU
      : ['about.02', 'about.04'].includes(section.id) ? extraWU * 0.5 : 0;
    for (const field of stageFields) {
      const addedDurationWU = field.kind === 'scroll-block' && readingDurationWU > 0
        ? extraWU * field.durationWU / readingDurationWU : 0;
      field.startWU = cleanWU(startWU + field.startWU - originalStartWU + cumulativeExtraWU);
      field.durationWU = cleanWU(field.durationWU + addedDurationWU);
      field.endWU = cleanWU(field.startWU + field.durationWU);
      field.focusWU = getFocusWU(field, measurementsById.get(field.id).flow,
        field.startWU, field.durationWU);
      cumulativeExtraWU += addedDurationWU;
    }
    section.startWU = startWU;
    section.endWU = endWU;
    section.durationWU = cleanWU(endWU - startWU);
    section.sceneStartWU = targetSceneStartWU;
    section.sceneEndWU = targetSceneEndWU;
    section.readingAllocationWU = cleanWU(readingDurationWU > 0 ? extraWU : 0);
    section.approachAllocationWU = cleanWU(readingDurationWU > 0 ? 0 : extraWU);
  });
  stageCursorWU = fittedDurationWU;

  return finishStagedLayout({
    profileId, profile, editorialLeadScreens, diagnostics, compiledFields, sections,
    durationWU: cleanWU(stageCursorWU),
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

  const stagedFields = fields.filter((field) => typeof field.stageId === 'string');
  if (stagedFields.length === fields.length) {
    return compileStagedLayout(document, fields, {
      profileId,
      profile,
      measurements,
      editorialLeadScreens,
      diagnostics,
    });
  }
  if (stagedFields.length) {
    fields.filter((field) => typeof field.stageId !== 'string').forEach((field) => diagnostics.push({
      level: 'error',
      code: 'story-stage-required',
      path: `tracks.text.fields.${field.id}.stageId`,
      message: `Text block “${field.id}” requires a Blender stage assignment.`,
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
    const authoredRatio = profile.scrollDurationWU / profile.storyDurationWU;
    profile.storyDurationWU = layout.durationWU;
    profile.scrollDurationWU = cleanWU(layout.durationWU * authoredRatio);
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
