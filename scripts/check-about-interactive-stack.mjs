import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  ABOUT_INTERACTIVE_STACK_DEFAULTS,
  ABOUT_INTERACTIVE_STACK_MAX_ITEMS,
  ABOUT_INTERACTIVE_STACK_MIN_ITEMS,
  resolveAboutInteractiveStackParameters,
} from '../react-app/app/src/routes/about-narrative-lab/aboutInteractiveStackContract.js';
import {
  advanceAboutInteractiveStackOrder,
  createAboutInteractiveStackOrder,
  createAboutInteractiveStackSlots,
  reconcileAboutInteractiveStackOrder,
  retreatAboutInteractiveStackOrder,
} from '../react-app/app/src/routes/about-narrative-lab/aboutInteractiveStackModel.js';
import { validateAboutNarrativeTrackDocument } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackSchema.js';

const configPath = new URL('../react-app/app/public/config/contents-about.json', import.meta.url);
const canonical = JSON.parse(await readFile(configPath, 'utf8'));
const disciplineField = canonical.tracks.text.fields.find((field) => field.id === 'text-disciplines-title');
const stackModule = disciplineField?.block?.modules?.find((module) => module.id === 'project-impressions');

function stackErrorCodes(document) {
  const fieldIndex = document.tracks.text.fields.findIndex((field) => field.id === 'text-disciplines-title');
  const moduleIndex = document.tracks.text.fields[fieldIndex].block.modules
    .findIndex((module) => module.id === 'project-impressions');
  const stackPath = `tracks.text.fields.${fieldIndex}.block.modules.${moduleIndex}`;
  return validateAboutNarrativeTrackDocument(document)
    .filter((item) => item.level === 'error' && item.path.startsWith(stackPath))
    .map((item) => item.code);
}

test('canonical Interactive stack contains 20 strict, valid image records', () => {
  assert.ok(stackModule);
  assert.equal(stackModule.items.length, 20);
  assert.equal(stackErrorCodes(canonical).length, 0);
  assert.equal(new Set(stackModule.items.map((item) => item.id)).size, 20);
});

test('seeded order and visual slots are deterministic without render-time randomness', () => {
  const firstOrder = createAboutInteractiveStackOrder(stackModule.items, 240721);
  const secondOrder = createAboutInteractiveStackOrder(stackModule.items, 240721);
  assert.deepEqual(firstOrder, secondOrder);
  assert.notDeepEqual(firstOrder, createAboutInteractiveStackOrder(stackModule.items, 240722));
  assert.deepEqual(
    createAboutInteractiveStackSlots(7, stackModule.parameters),
    createAboutInteractiveStackSlots(7, stackModule.parameters),
  );
  assert.deepEqual(createAboutInteractiveStackSlots(1, stackModule.parameters)[0], {
    depth: 0,
    xPct: 0,
    yPct: 0,
    rotationDeg: 0,
    scale: 1,
  });
});

test('forward and backward navigation are exact inverses', () => {
  const order = createAboutInteractiveStackOrder(stackModule.items, stackModule.parameters.seed);
  assert.deepEqual(retreatAboutInteractiveStackOrder(advanceAboutInteractiveStackOrder(order)), order);
  assert.deepEqual(advanceAboutInteractiveStackOrder(retreatAboutInteractiveStackOrder(order)), order);
  assert.deepEqual(advanceAboutInteractiveStackOrder([]), []);
  assert.deepEqual(retreatAboutInteractiveStackOrder(['only']), ['only']);
});

test('a 1,000-cycle logical soak stays bounded and returns to the seeded order', () => {
  const initial = createAboutInteractiveStackOrder(stackModule.items, stackModule.parameters.seed);
  let order = initial;
  for (let index = 0; index < 1000; index += 1) {
    order = advanceAboutInteractiveStackOrder(order);
    assert.equal(order.length, 20);
    assert.equal(new Set(order).size, 20);
  }
  assert.deepEqual(order, initial);
});

test('live item reconciliation preserves survivors and seeds only additions', () => {
  const initialItems = stackModule.items.slice(0, 5);
  const order = createAboutInteractiveStackOrder(initialItems, 12);
  const nextItems = [initialItems[1], initialItems[3], stackModule.items[8], stackModule.items[9]];
  const reconciled = reconcileAboutInteractiveStackOrder(order, nextItems, 12);
  assert.deepEqual(
    reconciled.slice(0, 2),
    order.filter((id) => nextItems.some((item) => item.id === id)),
  );
  assert.equal(new Set(reconciled).size, nextItems.length);
  assert.ok(reconciled.includes('impression-09'));
  assert.ok(reconciled.includes('impression-10'));
});

test('parameter resolution clamps invalid live values to shared bounds', () => {
  assert.deepEqual(resolveAboutInteractiveStackParameters({}), ABOUT_INTERACTIVE_STACK_DEFAULTS);
  const resolved = resolveAboutInteractiveStackParameters({
    seed: -4,
    stagePaddingPct: 100,
    cardWidthPct: 1,
    transitionMs: 9999,
  });
  assert.equal(resolved.seed, 0);
  assert.equal(resolved.stagePaddingPct, 22);
  assert.equal(resolved.cardWidthPct, 45);
  assert.equal(resolved.transitionMs, 700);
});

test('strict schema rejects duplicate IDs, unsupported fields, invalid limits, and video without poster', () => {
  const duplicate = structuredClone(canonical);
  const duplicateModule = duplicate.tracks.text.fields.find((field) => field.id === 'text-disciplines-title')
    .block.modules.find((module) => module.id === 'project-impressions');
  duplicateModule.items[1].id = duplicateModule.items[0].id;
  assert.ok(stackErrorCodes(duplicate).includes('duplicate-id'));

  const unknown = structuredClone(canonical);
  unknown.tracks.text.fields.find((field) => field.id === 'text-disciplines-title')
    .block.modules.find((module) => module.id === 'project-impressions').items[0].mystery = true;
  assert.ok(stackErrorCodes(unknown).includes('unknown-key'));

  const video = structuredClone(canonical);
  const videoItem = video.tracks.text.fields.find((field) => field.id === 'text-disciplines-title')
    .block.modules.find((module) => module.id === 'project-impressions').items[0];
  videoItem.type = 'video';
  assert.ok(stackErrorCodes(video).includes('unsafe-text'));

  assert.equal(ABOUT_INTERACTIVE_STACK_MIN_ITEMS, 1);
  assert.equal(ABOUT_INTERACTIVE_STACK_MAX_ITEMS, 40);
});

test('all preview assets meet the authored geometry and transfer budgets', async () => {
  let totalBytes = 0;
  for (const item of stackModule.items) {
    const file = fileURLToPath(new URL(`.${item.src}`, new URL('../react-app/app/public/', import.meta.url)));
    const metadata = await sharp(file).metadata();
    const details = await stat(file);
    totalBytes += details.size;
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, item.width);
    assert.equal(metadata.height, item.height);
    assert.ok(Math.max(metadata.width, metadata.height) <= 960);
    assert.ok(details.size <= 120 * 1024);
  }
  assert.ok(totalBytes <= 1.5 * 1024 * 1024);
});
