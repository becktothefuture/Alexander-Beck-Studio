export const ABOUT_NARRATIVE_DEFAULT_STAGE = 'approach';

export const ABOUT_NARRATIVE_STAGES = Object.freeze({
  approach: Object.freeze({
    shape: 'cluster',
    cameraDistanceWU: 8,
    transform: Object.freeze({ x: 0, y: 1.55, scale: 0.72 }),
  }),
  'calm-field': Object.freeze({
    shape: 'calm-field',
    cameraDistanceWU: 1.8,
    transform: Object.freeze({ x: 0, y: 0.2, scale: 1 }),
  }),
  'discipline-grid': Object.freeze({
    shape: 'discipline-grid',
    cameraDistanceWU: 4.2,
    transform: Object.freeze({ x: 0, y: 0, scale: 0.92 }),
  }),
  'living-field': Object.freeze({
    shape: 'living-field',
    cameraDistanceWU: 0.8,
    transform: Object.freeze({ x: 0, y: 0, scale: 1 }),
  }),
  'bust-resolve': Object.freeze({
    shape: 'bust',
    cameraDistanceWU: 5.4,
    transform: Object.freeze({ x: 0, y: 0.42, scale: 0.84 }),
    interaction: 'horizontal-spin',
  }),
});

export const ABOUT_NARRATIVE_STAGE_IDS = Object.freeze(Object.keys(ABOUT_NARRATIVE_STAGES));

const SECTION_MODES = new Set(['spatial', 'editorial', 'finale']);
const BLOCK_KINDS = new Set(['prose', 'highlight', 'detail', 'list', 'clients', 'disciplines']);

export function compileAboutNarrativeStageSequence(sections) {
  let currentStage = ABOUT_NARRATIVE_DEFAULT_STAGE;
  let currentStageStartIndex = 0;

  return sections.map((section, index) => {
    const requestedStage = section.world || 'continue';
    const previousStage = currentStage;
    const previousStageStartIndex = currentStageStartIndex;
    const changesStage = requestedStage !== 'continue' && requestedStage !== currentStage;

    if (requestedStage !== 'continue') currentStage = requestedStage;
    if (changesStage || index === 0) currentStageStartIndex = index;

    return Object.freeze({
      stageId: currentStage,
      stageStartIndex: currentStageStartIndex,
      fromStageId: changesStage ? previousStage : currentStage,
      fromStageStartIndex: changesStage ? previousStageStartIndex : currentStageStartIndex,
      changesStage,
    });
  });
}

export function validateAboutNarrativeStory(sections) {
  if (!Array.isArray(sections) || !sections.length) {
    throw new Error('About narrative story requires at least one section.');
  }

  const seenIds = new Set();
  let finaleCount = 0;

  sections.forEach((section, index) => {
    if (!section?.id || seenIds.has(section.id)) {
      throw new Error(`About narrative section ${index + 1} has a missing or duplicate id.`);
    }
    seenIds.add(section.id);

    if (!SECTION_MODES.has(section.mode)) {
      throw new Error(`About narrative section "${section.id}" has unknown mode "${section.mode}".`);
    }

    if (!Number.isFinite(section.durationWU) || section.durationWU <= 0) {
      throw new Error(`About narrative section "${section.id}" needs a positive durationWU.`);
    }

    if (section.world !== 'continue' && !ABOUT_NARRATIVE_STAGES[section.world]) {
      throw new Error(`About narrative section "${section.id}" references unknown world stage "${section.world}".`);
    }

    if (section.mode === 'spatial' && (!Array.isArray(section.lines) || !section.lines.length)) {
      throw new Error(`Spatial section "${section.id}" needs at least one line.`);
    }

    if (section.mode === 'editorial') {
      if (!Array.isArray(section.blocks) || !section.blocks.length) {
        throw new Error(`Editorial section "${section.id}" needs at least one block.`);
      }
      section.blocks.forEach((block) => {
        if (!BLOCK_KINDS.has(block.kind)) {
          throw new Error(`Editorial section "${section.id}" has unknown block kind "${block.kind}".`);
        }
      });
    }

    if (section.mode === 'finale') finaleCount += 1;
  });

  if (finaleCount !== 1 || sections.at(-1)?.mode !== 'finale') {
    throw new Error('About narrative story needs exactly one finale, and it must be last.');
  }

  return sections;
}
