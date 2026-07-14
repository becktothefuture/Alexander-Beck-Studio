import homeContent from 'virtual:abs-content/home';
import { validateAboutNarrativeStory } from './aboutNarrativeStages.js';

export const ABOUT_NARRATIVE_SETTINGS_KEY = 'abs:about-narrative-lab:settings:v6';

export const ABOUT_NARRATIVE_DEFAULT_SETTINGS = Object.freeze({
  scrollSmoothing: 0.82,
  spatialLength: 1,
  fragmentSpread: 0.68,
  farScale: 0.72,
  nearScale: 1.42,
  entryDepth: 520,
  exitDepth: 360,
  exitDrift: 32,
  maxBlur: 20,
  fadeWindow: 0.18,
  editorialRevealThreshold: 0.74,
  readingWidth: 58,
  fieldOpacity: 0.82,
  cameraSpeed: 1,
  pointSize: 3.6,
  waveStrength: 0.68,
  cameraRoll: 0.38,
  bustScale: 0.58,
  bustRotationSpeed: 0.026,
  bustDragSensitivity: 1,
});

export const ABOUT_NARRATIVE_CONTROL_GROUPS = Object.freeze([
  {
    id: 'motion',
    label: 'Motion & timing',
    controls: [
      { id: 'scrollSmoothing', label: 'Scroll smoothing', min: 0, max: 1, step: 0.01 },
      { id: 'spatialLength', label: 'Spatial length', min: 0.75, max: 1.5, step: 0.05 },
      { id: 'fragmentSpread', label: 'Heading separation', min: 0.52, max: 0.86, step: 0.01 },
      { id: 'farScale', label: 'Far scale', min: 0.55, max: 0.9, step: 0.01 },
      { id: 'nearScale', label: 'Near scale', min: 1.1, max: 1.7, step: 0.01 },
      { id: 'entryDepth', label: 'Entry depth', min: 260, max: 760, step: 10, suffix: 'px' },
      { id: 'exitDepth', label: 'Exit depth', min: 180, max: 560, step: 10, suffix: 'px' },
      { id: 'exitDrift', label: 'Exit drift', min: 0, max: 64, step: 1, suffix: 'px' },
      { id: 'maxBlur', label: 'Maximum blur', min: 0, max: 28, step: 1, suffix: 'px' },
      { id: 'fadeWindow', label: 'Fade window', min: 0.08, max: 0.32, step: 0.01 },
    ],
  },
  {
    id: 'world',
    label: 'Point-cloud world',
    controls: [
      { id: 'fieldOpacity', label: 'Field opacity', min: 0.2, max: 1, step: 0.01 },
      { id: 'cameraSpeed', label: 'Forward cadence', min: 0.5, max: 1.5, step: 0.01 },
      { id: 'pointSize', label: 'Point size', min: 1.5, max: 7, step: 0.1, suffix: 'px' },
      { id: 'waveStrength', label: 'Terrain waves', min: 0, max: 1.4, step: 0.01 },
      { id: 'cameraRoll', label: 'Camera roll', min: 0, max: 0.7, step: 0.01 },
      { id: 'bustScale', label: 'Bust scale', min: 0.42, max: 0.9, step: 0.01 },
      { id: 'bustRotationSpeed', label: 'Bust rotation', min: 0, max: 0.12, step: 0.001 },
      { id: 'bustDragSensitivity', label: 'Bust drag', min: 0.3, max: 1.8, step: 0.05 },
    ],
  },
  {
    id: 'reading',
    label: 'Reading',
    controls: [
      { id: 'editorialRevealThreshold', label: 'Reveal threshold', min: 0.6, max: 0.9, step: 0.01 },
      { id: 'readingWidth', label: 'Reading width', min: 42, max: 72, step: 1, suffix: 'rem' },
    ],
  },
]);

const ABOUT_NARRATIVE_SECTION_DATA = [
  {
    id: 'invitation',
    label: 'Invitation',
    mode: 'spatial',
    layout: 'opener',
    durationWU: 1,
    mobileDurationWU: 1,
    lines: ['I help organisations shape complex ideas…'],
    world: 'approach',
  },
  {
    id: 'promise',
    label: 'What clarity makes possible',
    mode: 'editorial',
    layout: 'opening-continuation',
    durationWU: 1.1,
    mobileDurationWU: 1.1,
    blocks: [
      {
        kind: 'prose',
        text: 'into clear, human and emotionally compelling experiences.',
      },
    ],
    world: 'continue',
  },
  {
    id: 'complexity',
    label: 'Complexity',
    mode: 'spatial',
    layout: 'center',
    durationWU: 2,
    mobileDurationWU: 1.75,
    lines: [
      'We are surrounded by systems becoming denser,',
      'faster and harder to read.',
    ],
    world: 'continue',
  },
  {
    id: 'attention',
    label: 'Learning to see',
    mode: 'editorial',
    layout: 'reading',
    durationWU: 1.4,
    mobileDurationWU: 1.5,
    blocks: [
      {
        kind: 'prose',
        text: 'I came to design through language and technology—two systems for carrying an idea from one mind to another. Visual form taught me that attention is shaped by choices: what comes forward, what recedes, what connects and what disappears.',
      },
      {
        kind: 'highlight',
        text: 'Clarity begins with attention: deciding what comes forward, what recedes, what connects and what disappears.',
      },
      {
        kind: 'visual',
        visual: 'attention-field',
      },
      {
        kind: 'detail',
        text: 'That path expanded from composition and visual language into interfaces, behaviour, trust, products and systems.',
      },
    ],
    world: 'continue',
  },
  {
    id: 'focus',
    label: 'Possibility and direction',
    mode: 'spatial',
    layout: 'lower',
    durationWU: 1.8,
    mobileDurationWU: 1.6,
    lines: [
      'Possibility expands.',
      'A point of view gives it direction.',
    ],
    world: 'aperture',
  },
  {
    id: 'structure',
    label: 'Passing through',
    mode: 'spatial',
    layout: 'center',
    durationWU: 2,
    mobileDurationWU: 1.75,
    lines: [
      'Complexity is not the enemy.',
      'Confusion is.',
    ],
    world: 'traverse',
  },
  {
    id: 'stillness',
    label: 'From order to life',
    mode: 'spatial',
    layout: 'wide',
    durationWU: 2,
    mobileDurationWU: 1.75,
    lines: [
      'A perfect system can still feel lifeless.',
      'Character begins when it learns to respond.',
    ],
    world: 'living-field',
  },
  {
    id: 'practice',
    label: 'Making ideas tangible',
    mode: 'editorial',
    layout: 'reading',
    durationWU: 1.8,
    mobileDurationWU: 2,
    blocks: [
      {
        kind: 'prose',
        text: 'The work often begins before the format is known. I immerse myself in the problem, look for the organising idea, and make it tangible enough for people to test together. Prototypes turn opinions into something we can experience. Systems help the idea travel.',
      },
      {
        kind: 'prose',
        text: 'Character is not decoration added after the useful work. It lives in how something responds, how movement guides attention, how a constraint becomes a useful choice, and how a person can sense that somebody cared.',
      },
      {
        kind: 'highlight',
        text: 'The aim is not less complexity. It is more meaning, made legible.',
      },
      {
        kind: 'detail',
        text: 'The contexts change—from healthcare and identity to finance, mobility and culture—but the work repeatedly moves from an unresolved question towards something people can see, test and shape together.',
      },
    ],
    world: 'continue',
  },
  {
    id: 'point-of-view',
    label: 'Point of view',
    mode: 'finale',
    layout: 'text-bust-cta',
    durationWU: 2.2,
    mobileDurationWU: 1.85,
    lines: [
      'In the end, clarity is a point of view.',
      '…by finding what must survive.',
    ],
    prompt: 'Bring me something unresolved.',
    world: 'bust-resolve',
  },
];

validateAboutNarrativeStory(ABOUT_NARRATIVE_SECTION_DATA);

export const ABOUT_NARRATIVE_STORY = Object.freeze({
  version: 1,
  sections: Object.freeze(ABOUT_NARRATIVE_SECTION_DATA.map((section) => Object.freeze(section))),
});

export const ABOUT_NARRATIVE_SECTIONS = ABOUT_NARRATIVE_STORY.sections;

export const ABOUT_NARRATIVE_CONTACT = Object.freeze({
  email: homeContent.contact?.email || 'alexander@beck.fyi',
  linkedin: homeContent.socials?.items?.linkedin?.url || 'https://www.linkedin.com/in/thisisbeck/',
});
