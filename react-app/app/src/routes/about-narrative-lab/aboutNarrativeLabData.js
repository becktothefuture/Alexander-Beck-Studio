import homeContent from 'virtual:abs-content/home';

export const ABOUT_NARRATIVE_SETTINGS_KEY = 'abs:about-narrative-lab:settings:v1';

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
  backgroundOpacity: 0.58,
  backgroundCrossfade: 0.18,
  editorialRevealThreshold: 0.74,
  readingWidth: 46,
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
    id: 'background',
    label: 'Background',
    controls: [
      { id: 'backgroundOpacity', label: 'Opacity', min: 0, max: 0.9, step: 0.01 },
      { id: 'backgroundCrossfade', label: 'Crossfade', min: 0.08, max: 0.32, step: 0.01 },
    ],
  },
  {
    id: 'reading',
    label: 'Reading',
    controls: [
      { id: 'editorialRevealThreshold', label: 'Reveal threshold', min: 0.6, max: 0.9, step: 0.01 },
      { id: 'readingWidth', label: 'Reading width', min: 34, max: 56, step: 1, suffix: 'rem' },
    ],
  },
]);

export const ABOUT_NARRATIVE_BACKGROUNDS = Object.freeze([
  {
    id: 'unresolved-density',
    src: '/images/about-narrative-lab/unresolved-density.webp',
  },
  {
    id: 'ordered-field',
    src: '/images/about-narrative-lab/ordered-field.webp',
  },
  {
    id: 'responsive-living-structure',
    src: '/images/about-narrative-lab/responsive-living-structure.webp',
  },
  {
    id: 'open-release',
    src: '/images/about-narrative-lab/open-release.webp',
  },
]);

export const ABOUT_NARRATIVE_CLIENTS = Object.freeze([
  'American Heart Association',
  'S&P Global',
  'Yoti',
  'Bentley',
  'Sony',
  'Jaguar Land Rover',
  'McCann',
  'Maybourne Hotels',
  'SunExpress',
  'Lufthansa Group',
  'Turkish Airlines',
  'Tourism Ireland',
  'Experian',
  'Money and Pensions Service',
  'Frankfurt Opera',
  'DCC',
]);

export const ABOUT_NARRATIVE_SECTIONS = Object.freeze([
  {
    id: 'present',
    label: 'Present',
    type: 'spatial',
    variant: 'opener',
    backgroundStage: 0,
    copy: 'I help organisations shape complex ideas into clear, human and emotionally compelling experiences—especially when the answer is still being figured out.',
    fragments: [
      'I help organisations shape complex ideas',
      'into clear, human and emotionally compelling experiences',
      'especially when the answer is still being figured out.',
    ],
  },
  {
    id: 'profile',
    label: 'Profile',
    type: 'editorial',
    backgroundStage: 0,
    paragraphs: [
      'I’m a creative designer, technologist and systems thinker based in London. At Critical Mass, I work on digital experiences for the American Heart Association.',
      'Teams bring me in to solve complexity, connect ambitious ideas to practical execution, and turn research, user needs and business ambition into purposeful, surprising work.',
    ],
  },
  {
    id: 'perspective',
    label: 'Perspective',
    type: 'spatial',
    variant: 'default',
    backgroundStage: 1,
    copy: 'The whole experience matters: how it works, how it looks, and how it makes people feel.',
    fragments: [
      'The whole experience matters:',
      'how it works, how it looks,',
      'and how it makes people feel.',
    ],
  },
  {
    id: 'trajectory',
    label: 'Trajectory',
    type: 'editorial',
    backgroundStage: 1,
    paragraphs: [
      'My path moved from language, technology and visual communication into interaction, behaviour and trust, then into products, brands and systems in implementation. Denaline, Yoti and MRM are the main turns; education stays a quiet footnote.',
    ],
  },
  {
    id: 'payoff',
    label: 'From ambition to reality',
    type: 'spatial',
    variant: 'default',
    backgroundStage: 2,
    copy: 'From ambition to reality, I help teams find the organising idea, make it tangible and protect what matters through delivery.',
    fragments: [
      'From ambition to reality,',
      'I help teams find the organising idea,',
      'make it tangible and protect what matters through delivery.',
    ],
  },
  {
    id: 'practice',
    label: 'Practice',
    type: 'editorial',
    backgroundStage: 2,
    paragraphs: [
      'Today I work through immersion, clear creative direction, genuine collaboration and prototypes people can experience. My client context spans healthcare, finance, mobility, travel, technology and culture.',
    ],
    clients: ABOUT_NARRATIVE_CLIENTS,
  },
  {
    id: 'curiosity',
    label: 'Curiosity',
    type: 'cabinet',
    backgroundStage: 2,
    items: [
      {
        title: 'iOS keyboard exploration',
        caption: 'Rethinking a familiar input until its assumptions become visible.',
      },
      {
        title: 'Spatial interface experiments',
        caption: 'Testing how a website can feel architectural without losing clarity.',
      },
      {
        title: '3D and visual R&D',
        caption: 'Exploring material, motion and atmosphere as product-design tools.',
      },
    ],
  },
  {
    id: 'next',
    label: 'Next',
    type: 'spatial',
    variant: 'closing',
    backgroundStage: 3,
    copy: 'I’m looking for greater responsibility in innovation, creative direction and early-stage experience design—especially around AI, trust, privacy, robotics, digital identity, education and healthcare.',
    fragments: [
      'I’m looking for greater responsibility',
      'in innovation, creative direction and early-stage experience design',
      'especially around AI, trust, privacy, robotics, digital identity, education and healthcare.',
    ],
    support: [
      'If you are tackling a meaningful problem that is not neatly defined, I’d like to hear from you.',
    ],
  },
]);

export const ABOUT_NARRATIVE_CONTACT = Object.freeze({
  email: homeContent.contact?.email || 'alexander@beck.fyi',
  linkedin: homeContent.socials?.items?.linkedin?.url || 'https://www.linkedin.com/in/thisisbeck/',
});
