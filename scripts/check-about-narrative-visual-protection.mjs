import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const helperSource = await readFile(new URL('./audit-about-narrative-surfel-v2-helpers.mjs', import.meta.url), 'utf8');
const auditSource = await readFile(new URL('./audit-about-narrative-runtime-visuals.mjs', import.meta.url), 'utf8');
const helperStart = helperSource.indexOf('export async function getAboutSurfelState(');
const helperEnd = helperSource.indexOf('export async function driveAboutStoryWU(', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'The actual state collector must be available to the DOM harness.');
const helperBody = helperSource.slice(helperStart, helperEnd).replace('export async function', 'async function');
const entryExpression = auditSource.match(/const unrevealedEntry = ([\s\S]*?);/u)?.[1];
assert.ok(entryExpression, 'The actual visual-audit entry policy must be available.');
const permitsUnpaintedEntry = new Function('state', 'checkpoint', `return (${entryExpression});`);

const bounds = (left, top, right, bottom) => ({
  left, top, right, bottom, width: right - left, height: bottom - top,
});
const union = (rectangles) => rectangles.length ? bounds(
  Math.min(...rectangles.map((rect) => rect.left)),
  Math.min(...rectangles.map((rect) => rect.top)),
  Math.max(...rectangles.map((rect) => rect.right)),
  Math.max(...rectangles.map((rect) => rect.bottom)),
) : bounds(0, 0, 0, 0);
const toNdc = (rect) => ({
  minX: rect.left / 500 - 1, maxX: rect.right / 500 - 1,
  minY: 1 - rect.bottom / 450, maxY: 1 - rect.top / 450,
});

// Execute the real collector and its page.evaluate callback without importing
// browser launch/setup code. Geometry, opacity and Range results are controlled
// fixtures; they do not prove browser paint, glyph shape or WebGL occlusion.
async function collectState({
  titleOpacity = 1,
  descriptionOpacity = 0,
  actionOpacity = 0,
  lockupOpacity = 1,
  editorial = false,
  scenePoints = [],
} = {}) {
  class Element {
    constructor(text = '', options = {}) {
      this.textContent = text;
      this.alpha = options.opacity ?? 1;
      this.tagName = options.tagName || 'div';
      this.classes = new Set(options.classes || []);
      this.classList = { contains: (name) => this.classes.has(name) };
      this.rectangle = options.rectangle || bounds(100, 100, 600, 600);
      this.painted = options.painted || [this.rectangle];
      this.parentElement = null;
      this.dataset = {};
      this.properties = {};
      this.clipPath = 'none';
    }

    getBoundingClientRect() { return this.rectangle; }
    querySelectorAll() { return []; }
    querySelector() { return null; }
    closest() { return null; }
    matches(selector) {
      return selector.split(',').some((entry) => {
        const value = entry.trim();
        return value.startsWith('.') ? this.classes.has(value.slice(1)) : this.tagName === value;
      });
    }
  }

  const root = new Element('Synthetic About content');
  const scrollport = { scrollTop: 0, scrollHeight: 2000, clientHeight: 900 };
  const canvas = new Element('', { rectangle: bounds(0, 0, 1000, 900) });
  const field = new Element('', { rectangle: bounds(100, 0, 600, 1000) });
  field.parentElement = root;
  field.dataset.textFieldId = editorial ? 'editorial-fixture' : 'text-epilogue-invitation';
  const lockup = new Element('', { opacity: lockupOpacity });
  lockup.parentElement = field;
  const title = new Element('Visible title', {
    opacity: titleOpacity,
    painted: [bounds(200, 70, 500, 110), bounds(250, 115, 450, 155)],
  });
  const description = new Element('Visible description', {
    opacity: descriptionOpacity,
    classes: ['route-intro-description'],
    painted: [bounds(200, 180, 450, 202), bounds(210, 205, 440, 227)],
  });
  const action = new Element('Visible action', {
    opacity: actionOpacity,
    tagName: 'button',
    rectangle: bounds(180, 260, 470, 324),
    painted: [bounds(240, 282, 420, 302)],
  });
  for (const node of [title, description, action]) node.parentElement = lockup;
  lockup.querySelectorAll = () => [description, action];
  field.querySelector = (selector) => {
    if (editorial) return null;
    return selector.includes('opening-copy') ? lockup : title;
  };
  const titleSpan = new Element();
  titleSpan.querySelector = (selector) => selector === '[data-text-field-id]' ? field : title;
  root.querySelectorAll = (selector) => {
    if (selector === '.about-narrative-render-span--title') return editorial ? [] : [titleSpan];
    return editorial ? [field] : [];
  };

  if (editorial) {
    field.closest = () => field;
    field.clipPath = 'inset(100px 0 700px)';
    field.properties = {
      '--reading-stage-start': '100px', '--reading-stage-end': '300px',
      '--reading-stage-clip-top': '100px', '--reading-stage-clip-bottom': '700px',
      '--reading-stage-feather': '18px',
    };
    const lines = [
      new Element('Readable line', { rectangle: bounds(120, 150, 400, 180) }),
      new Element('Partly clipped line', { rectangle: bounds(120, 290, 400, 320) }),
      new Element('Hidden line', { opacity: 0, rectangle: bounds(120, 190, 400, 220) }),
      new Element('Outside line', { rectangle: bounds(120, 400, 400, 430) }),
    ];
    for (const line of lines) line.parentElement = field;
    field.querySelectorAll = () => lines;
  }

  const document = {
    querySelector(selector) {
      if (selector === '.about-narrative-lab') return root;
      if (selector === '.about-narrative-scrollport') return scrollport;
      if (selector === '.about-narrative-world__canvas') return canvas;
      return field;
    },
    createRange() {
      let node;
      return {
        selectNodeContents(value) { node = value; },
        getBoundingClientRect() { return union(node.painted); },
        getClientRects() { return node.painted; },
      };
    },
  };
  const getComputedStyle = (node) => ({
    opacity: String(node.alpha), visibility: 'visible', display: 'block', clipPath: node.clipPath,
    getPropertyValue: (name) => node.properties[name] || '',
  });
  const diagnostics = ({ protectedNdcBounds: area } = {}) => ({
    modelFraming: { 'about.05': { protectedCenterVisibleCount: area ? scenePoints.filter(({ x, y }) => (
      x >= area.minX && x <= area.maxX && y >= area.minY && y <= area.maxY
    )).length : 0 } },
  });
  const window = { __aboutNarrativeRuntime: { getMetrics: diagnostics, getDiagnosticsSnapshot: diagnostics } };
  const getState = new Function('document', 'HTMLElement', 'getComputedStyle', 'window',
    `${helperBody}\nreturn getAboutSurfelState;`)(document, Element, getComputedStyle, window);
  return getState({ evaluate: (callback, input) => callback(input) }, { fieldId: field.dataset.textFieldId });
}

test('visible title protects each measured line rather than its wrapper', async () => {
  const state = await collectState();
  assert.equal(state.copyProtection.titleMeasured, true);
  assert.equal(state.copyProtection.titleOpacity, 1);
  assert.equal(state.copyProtection.lockupVisible, true);
  assert.equal(state.copyProtection.regions.length, 2);
  assert.deepEqual(state.copyProtection.regions.map((region) => region.protectedNdcBounds), [
    toNdc(bounds(200, 70, 500, 110)), toNdc(bounds(250, 115, 450, 155)),
  ]);
  assert.equal(permitsUnpaintedEntry(state, { id: 'invitation' }), false);
});

for (const [descriptionOpacity, actionOpacity, expectedRegions] of [[1, 0, 2], [0, 1, 1], [1, 1, 3]]) {
  test(`transparent title retains visible description=${descriptionOpacity}, action=${actionOpacity}`, async () => {
    const state = await collectState({ titleOpacity: 0, descriptionOpacity, actionOpacity });
    assert.equal(state.copyProtection.titleOpacity, 0);
    assert.equal(state.copyProtection.lockupVisible, true);
    assert.equal(state.copyProtection.regions.length, expectedRegions);
    assert.ok(state.protectedNdcBounds);
    assert.ok(state.copyProtection.regions.every((region) => region.text !== 'Visible title'));
    for (const id of ['lattice-title-entry', 'invitation']) {
      assert.equal(permitsUnpaintedEntry(state, { id }), false);
    }
  });
}

test('an entirely transparent lockup qualifies only for the named entry checkpoints', async () => {
  const state = await collectState({ descriptionOpacity: 1, actionOpacity: 1, lockupOpacity: 0 });
  assert.equal(state.copyProtection.titleMeasured, true);
  assert.equal(state.copyProtection.titleOpacity, 0, 'Ancestor opacity must suppress the title.');
  assert.equal(state.copyProtection.lockupVisible, false);
  assert.deepEqual(state.copyProtection.regions, []);
  assert.equal(state.protectedNdcBounds, null);
  for (const id of ['lattice-title-entry', 'invitation']) {
    assert.equal(permitsUnpaintedEntry(state, { id }), true);
  }
  for (const id of ['shaping', 'thinking', 'invitation-focus', 'terminal-hold']) {
    assert.equal(permitsUnpaintedEntry(state, { id }), false);
  }
});

test('visible action text detects overlap without protecting padded button corners', async () => {
  const state = await collectState({
    titleOpacity: 0, actionOpacity: 1,
    scenePoints: [{ x: 330 / 500 - 1, y: 1 - 290 / 450 }],
  });
  assert.equal(state.copyProtection.regions.length, 1);
  assert.deepEqual(state.copyProtection.regions[0].protectedNdcBounds, toNdc(bounds(240, 282, 420, 302)));
  assert.equal(state.copyProtection.maximumProtectedVisibleCount, 1,
    'An early visible action must not be certified as an empty protected region.');
  assert.equal(permitsUnpaintedEntry(state, { id: 'invitation' }), false);
});

test('editorial protection still filters hidden lines and clips partial lines', async () => {
  const state = await collectState({ editorial: true });
  assert.equal(state.copyProtection.mode, 'visible-editorial-lines');
  assert.equal(state.copyProtection.titleMeasured, false);
  assert.equal(state.copyProtection.visibleLineCount, 2);
  assert.equal(state.copyProtection.readableLineCount, 1);
  assert.deepEqual(state.copyProtection.regions.map((region) => region.text), ['Readable line', 'Partly clipped line']);
  assert.deepEqual(state.copyProtection.regions[1].bounds, {
    left: 120, right: 400, top: 290, bottom: 300,
  });
  assert.equal(state.visibleEditorialFields.length, 1);
  assert.equal(permitsUnpaintedEntry(state, { id: 'invitation' }), false);
});
