import { cloneAboutNarrativeDocument } from './aboutNarrativeSchema.js';
import { validateAboutNarrativePointFieldDocument } from './aboutNarrativePointFieldSchema.js';

const DISCIPLINE_DESCRIPTIONS = Object.freeze({
  'Product Design': 'Understanding what people need, then working out what the product should do.',
  'Experience Design': 'Looking at the whole journey, including the parts no one owns yet.',
  'Art Direction': 'Finding a visual idea that gives the work its own character.',
  'Motion & 3D': 'Using movement and space when a flat explanation is not enough.',
  'Creative Engineering': 'Making ideas in code so I can see how they really behave.',
  'Parametric Systems': 'Creating rules that allow variety without becoming chaotic.',
});

const VARIANTS = Object.freeze({
  current: {
    label: 'Current spoken candidate',
    description: 'Hi, I’m Alex. I’m a designer at heart, and I love what I do.',
    earlyTitles: [
      'I’ve always been fascinated by complex problems…',
      '…especially those that require multidisciplinary thinking.',
    ],
    first: [
      {
        kind: 'prose',
        text: 'You might be wondering what I mean by a complex problem. It can be identity technology, a financial product or something as ordinary as a keyboard. The scale changes. I enjoy finding out what sits behind the surface. Sometimes that means explaining it better. Sometimes it means inventing a different way of using it.',
      },
      {
        kind: 'prose',
        text: 'I started my career 13 years ago in visual communication, after changing course from Computer Science to Communication Design in Mainz. Technology interested me, but I kept coming back to the effect an image, a word or a piece of motion can have on someone. It can explain an idea and change how the person receiving it feels about it. I still find that fascinating.',
      },
      {
        kind: 'prose',
        text: 'My work gradually became more digital. At Denaline I found myself becoming the digital specialist, working on interfaces, icon systems and motion, often alongside developers. Moving to London to join Yoti made the questions more serious. Identity technology had to work properly, of course, and people also had to understand why they should trust it. That was when product, brand and communication stopped feeling like separate jobs to me.',
      },
    ],
    bridgeTitles: [
      'I didn’t plan a multidisciplinary career…',
      '…it happened because I kept getting curious about the next part.',
    ],
    disciplineDescriptions: DISCIPLINE_DESCRIPTIONS,
    second: [
      {
        kind: 'prose',
        text: 'When I start a project, I tend to disappear into it for a while. I ask questions, collect references and speak to the people who know the subject properly. Quite often the brief is only one version of the story. Making something early helps me check what I have understood. Even a rough prototype can show where everyone agrees and where they really don’t.',
      },
      {
        kind: 'prose',
        text: 'I like giving the work a strong direction, although I don’t expect my first idea to survive untouched. The people around the project should be able to change it. I stay close when it is built too, partly because I enjoy that part and partly because I have seen good ideas lose their character in the final implementation.',
      },
      {
        kind: 'prose',
        text: 'AI has opened another area for me. I use it most days to explore ideas, make prototypes and sometimes simply to get unstuck. It is incredibly useful. It also makes it very easy to produce work that looks finished before anyone has asked whether it is any good. That worries me. I think the purposeful use of AI depends on people remaining responsible for what they make and why.',
      },
      {
        kind: 'prose',
        text: 'Outside work, I spend a lot of time with music, Lego and independent games. I also have a habit of becoming preoccupied with small things that bother me more than they probably should. The iOS keyboard became one of those things, so I started redesigning it. Trust, privacy and robotics are on my mind too, although for now they are questions rather than projects.',
      },
    ],
    closingTitles: [
      'Different disciplines don’t simply add up…',
      '…they change one another as the work develops…',
      '…until the combination becomes something of its own.',
    ],
    finaleTitle: 'Let’s make something new',
    finaleDescription: 'If you have a complex problem in mind, I’d be curious to hear about it.',
  },
});

const MODULE_IDS = Object.freeze({
  first: ['context', 'education', 'practice'],
  second: ['attention', 'language-context', 'ai-judgement', 'ambitious-teams'],
});

const TITLE_IDS = Object.freeze({
  opener: 'text-promise-main',
  early: ['text-complexity-idea', 'text-complexity-conditions'],
  bridge: ['text-complexity-curiosity', 'text-complexity-listen'],
  closing: ['text-life-momentum', 'text-life-form', 'text-life-character'],
  finale: 'text-epilogue-invitation',
});

export const ABOUT_NARRATIVE_COPY_VARIANTS = Object.freeze(
  Object.entries(VARIANTS).map(([id, variant]) => Object.freeze({
    id,
    label: variant.label,
  })),
);

const VARIANTS_BY_ID = new Map(ABOUT_NARRATIVE_COPY_VARIANTS.map((variant) => [variant.id, variant]));

function replaceTitle(field, text, description = undefined) {
  field.text = text;
  if (description !== undefined) field.description = description;
}

function replaceEditorialModules(field, moduleIds, replacements) {
  const replacementsById = new Map(moduleIds.map((id, index) => [id, replacements[index]]));
  field.block.modules = field.block.modules.map((module) => {
    const replacement = replacementsById.get(module.id);
    if (!replacement) return module;
    return {
      id: module.id,
      ...cloneAboutNarrativeDocument(replacement),
    };
  });
}

export function getAboutNarrativeCopyVariant(value) {
  const variantId = value instanceof URLSearchParams ? value.get('copy') : value;
  return VARIANTS_BY_ID.get(String(variantId || '').trim().toLowerCase()) || null;
}

export function createAboutNarrativeCopyVariantDocument(baseDocument, variantId) {
  const variantDescriptor = getAboutNarrativeCopyVariant(variantId);
  if (!variantDescriptor) return baseDocument;

  const variant = VARIANTS[variantDescriptor.id];
  const document = cloneAboutNarrativeDocument(baseDocument);
  const fields = new Map(document.tracks.text.fields.map((field) => [field.id, field]));

  replaceTitle(fields.get(TITLE_IDS.opener), 'About Me', variant.description);
  TITLE_IDS.early.forEach((id, index) => replaceTitle(fields.get(id), variant.earlyTitles[index]));
  TITLE_IDS.bridge.forEach((id, index) => replaceTitle(fields.get(id), variant.bridgeTitles[index]));
  TITLE_IDS.closing.forEach((id, index) => replaceTitle(fields.get(id), variant.closingTitles[index]));
  replaceTitle(fields.get(TITLE_IDS.finale), variant.finaleTitle, variant.finaleDescription);

  const firstEditorial = fields.get('text-background-unit');
  const secondEditorial = fields.get('text-disciplines-title');
  replaceEditorialModules(firstEditorial, MODULE_IDS.first, variant.first);
  replaceEditorialModules(secondEditorial, MODULE_IDS.second, variant.second);

  const clientGrid = firstEditorial.block.modules.find((module) => module.id === 'selected-clients');
  clientGrid.label = 'Selected work from across my career.';

  const disciplineReveal = document.tracks.interactions.clips.find((clip) => clip.id === 'motion-discipline-reveal');
  disciplineReveal.parameters.items.forEach((item) => {
    item.description = variant.disciplineDescriptions[item.label] || item.description;
  });

  const errors = validateAboutNarrativePointFieldDocument(document)
    .filter((diagnostic) => diagnostic.level === 'error');
  if (errors.length) {
    const error = new Error(errors
      .map((diagnostic) => diagnostic.path + ': ' + diagnostic.message)
      .join('\n'));
    error.name = 'AboutNarrativeCopyVariantValidationError';
    error.diagnostics = errors;
    throw error;
  }
  return document;
}
