import homeContent from 'virtual:abs-content/home';
import { validateAboutNarrativeStory } from './aboutNarrativeStages.js';

export const ABOUT_NARRATIVE_SETTINGS_KEY = 'abs:about-narrative-lab:settings:v7';

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
  bustScale: 0.76,
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
    id: 'promise',
    label: 'Promise',
    mode: 'spatial',
    layout: 'opener',
    durationWU: 1.25,
    mobileDurationWU: 1.15,
    lines: ['I help shape complex ideas into emotionally compelling experiences.'],
    world: 'approach',
  },
  {
    id: 'complexity',
    label: 'Entering complexity',
    mode: 'spatial',
    layout: 'center',
    durationWU: 2.8,
    mobileDurationWU: 2.45,
    lines: [
      'At the beginning, an idea can feel like everything at once.',
      'It might need to be useful, original, technically possible and emotionally right—all before its shape is clear.',
      'This is the part I enjoy: learning what is there, understanding what matters to the people involved, and finding the direction that can hold it together.',
    ],
    world: 'continue',
  },
  {
    id: 'background',
    label: 'Curiosity connects the work',
    mode: 'editorial',
    layout: 'reading',
    durationWU: 2.25,
    mobileDurationWU: 2.6,
    blocks: [
      {
        kind: 'prose',
        text: 'I have always had one foot in the technical and one in the visual. I studied Computer Science before Communication Design, then built a practice across digital products, identity, interfaces, motion and creative technology. The common thread is curiosity: how something works, how it feels, and how those qualities can strengthen one another.',
      },
      {
        kind: 'list',
        label: 'Things I keep coming back to',
        items: [
          'Emerging technology with a useful role in people’s lives.',
          'Products and systems with character.',
          'Strong visual ideas that also work.',
          'Making ideas tangible early, because a deck can only do so much.',
        ],
      },
      {
        kind: 'clients',
        text: 'That curiosity has shaped work with Yoti, S&P Global, Bentley, SunExpress, McCann and the American Heart Association across identity, finance, mobility, healthcare and digital products.',
      },
    ],
    world: 'calm-field',
  },
  {
    id: 'practice-reveal',
    label: 'The practice comes into view',
    mode: 'spatial',
    layout: 'constellation',
    durationWU: 1.7,
    mobileDurationWU: 1.55,
    lines: ['Over time, those interests became a practice built across six connected disciplines.'],
    world: 'discipline-grid',
  },
  {
    id: 'disciplines',
    label: 'Six disciplines. One connected practice.',
    mode: 'editorial',
    layout: 'disciplines',
    durationWU: 2.8,
    mobileDurationWU: 3.2,
    blocks: [
      {
        kind: 'disciplines',
        items: [
          'Product Design',
          'Experience Design',
          'Art Direction',
          'Motion & 3D',
          'Creative Engineering',
          'Parametric Systems',
        ],
      },
      {
        kind: 'prose',
        text: 'Product Design and Experience Design help me understand the opportunity and shape how the experience works. Art Direction gives the idea character and a point of view. Motion & 3D make behaviour, space and feeling tangible. Creative Engineering and Parametric Systems let me explore directly through code, tools and working systems.',
      },
      {
        kind: 'prose',
        text: 'AI runs through this practice as both a creative material and a practical capability, expanding what I can explore, generate and build. Judgement, craft and context give those possibilities purpose.',
      },
      {
        kind: 'prose',
        text: 'Moving between the disciplines lets one kind of thinking change another. An insight can reshape the product. A technical experiment can unlock the visual language. Motion can make an interaction easier to understand. Each move informs the next until the work begins to feel coherent.',
      },
    ],
    world: 'continue',
  },
  {
    id: 'bringing-life',
    label: 'Bringing the idea to life',
    mode: 'spatial',
    layout: 'living-field',
    durationWU: 3,
    mobileDurationWU: 2.7,
    lines: [
      'As these ways of thinking begin to work together, the idea gathers momentum.',
      'What was difficult to picture takes on form, behaviour and character.',
      'It becomes something people can understand, interact with and feel.',
      'That is what I mean by bringing an idea to life.',
    ],
    world: 'living-field',
  },
  {
    id: 'role',
    label: 'The role I play',
    mode: 'editorial',
    layout: 'exit',
    durationWU: 1.25,
    mobileDurationWU: 1.4,
    blocks: [
      {
        kind: 'highlight',
        text: 'This is the role I play for ambitious teams: bringing design, creative technology and AI together to shape new products, services and experiences from early direction to the details that make them convincing.',
      },
    ],
    world: 'continue',
  },
  {
    id: 'epilogue',
    label: 'Alexander Beck',
    mode: 'finale',
    layout: 'text-bust-cta',
    durationWU: 2.4,
    mobileDurationWU: 2.1,
    lines: ['Alexander Beck'],
    profile: 'Creative technologist, multidisciplinary designer and AI specialist.',
    prompt: 'Using creativity and technology to shape something new.',
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
