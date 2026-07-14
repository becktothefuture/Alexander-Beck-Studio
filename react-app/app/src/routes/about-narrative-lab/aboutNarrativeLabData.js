import homeContent from 'virtual:abs-content/home';

export const ABOUT_NARRATIVE_SETTINGS_KEY = 'abs:about-narrative-lab:settings:v4';

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
  waveStrength: 0.68,
  cameraRoll: 0.38,
  bustScale: 0.58,
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
      { id: 'waveStrength', label: 'Terrain waves', min: 0, max: 1.4, step: 0.01 },
      { id: 'cameraRoll', label: 'Camera roll', min: 0, max: 0.7, step: 0.01 },
      { id: 'bustScale', label: 'Bust scale', min: 0.42, max: 0.9, step: 0.01 },
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

export const ABOUT_NARRATIVE_SECTIONS = Object.freeze([
  {
    id: 'invitation',
    label: 'Invitation',
    type: 'opening',
    variant: 'opener',
    copy: 'I help organisations shape complex ideas…',
  },
  {
    id: 'promise',
    label: 'What clarity makes possible',
    type: 'editorial',
    variant: 'opening-continuation',
    prose: [
      {
        text: 'into clear, human and emotionally compelling experiences.',
      },
    ],
  },
  {
    id: 'complexity',
    label: 'Complexity',
    type: 'spatial',
    variant: 'approach',
    copy: 'We are surrounded by systems becoming denser, faster and harder to read.',
    fragments: [
      'We are surrounded by systems becoming denser,',
      'faster and harder to read.',
    ],
  },
  {
    id: 'attention',
    label: 'Learning to see',
    type: 'editorial',
    prose: [
      {
        text: 'I came to design through language and technology—two systems for carrying an idea from one mind to another. Visual form taught me that attention is shaped by choices: what comes forward, what recedes, what connects and what disappears.',
      },
      {
        text: 'Clarity begins with attention: deciding what comes forward, what recedes, what connects and what disappears.',
        emphasis: true,
      },
    ],
    details: [
      'That path expanded from composition and visual language into interfaces, behaviour, trust, products and systems.',
    ],
    inlineVisual: 'attention-field',
  },
  {
    id: 'ai',
    label: 'Possibility and judgement',
    type: 'constellation',
    variant: 'constellation',
    copy: 'AI multiplies possibilities. Judgement gives them direction.',
    fragments: [
      'AI multiplies possibilities.',
      'Judgement gives them direction.',
    ],
  },
  {
    id: 'structure',
    label: 'Passing through',
    type: 'spatial',
    variant: 'traverse',
    copy: 'Complexity is not the enemy. Confusion is.',
    fragments: [
      'Complexity is not the enemy.',
      'Confusion is.',
    ],
  },
  {
    id: 'stillness',
    label: 'From order to life',
    type: 'spatial',
    variant: 'living-field',
    copy: 'A perfect system can still feel lifeless. Character begins when it learns to respond.',
    fragments: [
      'A perfect system can still feel lifeless.',
      'Character begins when it learns to respond.',
    ],
  },
  {
    id: 'practice',
    label: 'Making ideas tangible',
    type: 'editorial',
    prose: [
      {
        text: 'The work often begins before the format is known. I immerse myself in the problem, look for the organising idea, and make it tangible enough for people to test together. Prototypes turn opinions into something we can experience. Systems help the idea travel.',
      },
      {
        text: 'Character is not decoration added after the useful work. It lives in how something responds, how movement guides attention, how a constraint becomes a useful choice, and how a person can sense that somebody cared.',
      },
      {
        text: 'The aim is not less complexity. It is more meaning, made legible.',
        emphasis: true,
      },
    ],
    details: [
      'The contexts change—from healthcare and identity to finance, mobility and culture—but the work repeatedly moves from an unresolved question towards something people can see, test and shape together.',
    ],
  },
  {
    id: 'point-of-view',
    label: 'Point of view',
    type: 'finale',
    variant: 'finale',
    copy: 'In the end, clarity is a point of view… by finding what must survive.',
    fragments: [
      'In the end, clarity is a point of view.',
      '…by finding what must survive.',
    ],
    cta: 'Bring me something unresolved.',
  },
]);

export const ABOUT_NARRATIVE_CONTACT = Object.freeze({
  email: homeContent.contact?.email || 'alexander@beck.fyi',
  linkedin: homeContent.socials?.items?.linkedin?.url || 'https://www.linkedin.com/in/thisisbeck/',
});
