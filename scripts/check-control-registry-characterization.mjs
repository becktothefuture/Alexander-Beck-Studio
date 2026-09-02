#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NARRATIVE_MODE_SEQUENCE } from '../react-app/app/src/legacy/modules/core/constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const appRoot = resolve(repoRoot, 'react-app', 'app');
const registryPath = resolve(appRoot, 'src', 'legacy', 'modules', 'ui', 'control-registry.js');
const fixturePath = resolve(__dirname, 'fixtures', 'control-registry-characterization.json');
const requireFromApp = createRequire(resolve(appRoot, 'package.json'));
const vite = await import(pathToFileURL(requireFromApp.resolve('vite')).href);

function installBrowserStubs(storage) {
  const cssValues = new Map();
  const paletteEvents = [];
  globalThis.getComputedStyle = () => ({
    getPropertyValue(name) {
      return cssValues.get(name) || '';
    },
  });
  globalThis.HTMLElement = class HTMLElement {};
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  globalThis.localStorage = storage;
  globalThis.window = {
    devicePixelRatio: 1,
    innerHeight: 900,
    innerWidth: 1440,
    location: { hostname: 'localhost', pathname: '/', search: '' },
    matchMedia: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }),
    dispatchEvent(event) {
      if (event?.type === 'bb:paletteChanged') paletteEvents.push(event);
      return true;
    },
  };
  globalThis.document = {
    body: { classList: { contains: () => false } },
    documentElement: {
      classList: { contains: () => false, toggle() {} },
      dataset: {},
      style: {
        getPropertyValue(name) {
          return cssValues.get(name) || '';
        },
        setProperty(name, value) {
          cssValues.set(name, String(value));
        },
        removeProperty(name) {
          cssValues.delete(name);
        },
      },
    },
    getElementById: () => null,
    querySelector: () => null,
  };
  return { cssValues, paletteEvents };
}

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    read(key) {
      return values.get(key);
    },
  };
}

async function loadRegistry(storage) {
  const { cssValues, paletteEvents } = installBrowserStubs(storage);
  const result = await vite.build({
    configFile: false,
    define: { 'import.meta.env.DEV': 'false' },
    logLevel: 'silent',
    root: appRoot,
    plugins: [{
      name: 'control-registry-characterization-entry',
      transform(source, id) {
        if (id !== registryPath) return null;
        return `${source}\nexport function __getGlobals() { return getGlobals(); }\n`;
      },
    }],
    build: {
      write: false,
      target: 'esnext',
      minify: false,
      lib: {
        entry: registryPath,
        formats: ['es'],
        fileName: 'control-registry-characterization',
      },
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  });
  const buildResults = Array.isArray(result) ? result : [result];
  const source = buildResults
    .flatMap((buildResult) => buildResult.output || [])
    .find((output) => output.type === 'chunk')?.code;
  assert.ok(source, 'Vite did not emit the control registry characterization bundle.');
  const registry = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  return { registry, cssValues, paletteEvents };
}

function normalizeData(value) {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map(normalizeData);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nested]) => typeof nested !== 'function' && nested !== undefined)
        .map(([key, nested]) => [key, normalizeData(nested)]),
    );
  }
  return null;
}

function normalizeControls(registry) {
  return registry.getAllControls().map((control) => ({
    id: control.id ?? null,
    label: control.label ?? null,
    labels: normalizeData(control.labels ?? null),
    type: control.type || 'range',
    default: normalizeData(control.default ?? null),
    min: normalizeData(control.min ?? null),
    max: normalizeData(control.max ?? null),
    step: normalizeData(control.step ?? null),
    options: normalizeData(control.options ?? null),
    stateKey: control.stateKey ?? null,
    cssVar: control.cssVar ?? null,
    designScope: control.designScope ?? null,
    group: control.group ?? null,
    hint: control.hint ?? null,
    section: control.section,
    behavior: {
      parse: typeof control.parse === 'function',
      format: typeof control.format === 'function',
      onChange: typeof control.onChange === 'function',
      otherCallbacks: Object.keys(control)
        .filter((key) => !['parse', 'format', 'onChange'].includes(key) && typeof control[key] === 'function')
        .sort(),
      reinitMode: Boolean(control.reinitMode),
    },
  }));
}

function normalizeBehaviorResult(value) {
  return {
    type: value === null ? 'null' : typeof value,
    value: normalizeData(value),
  };
}

function characterizeParseFormat(registry) {
  return registry.getAllControls()
    .filter((control) => control.id)
    .map((control) => {
      const defaultInput = control.type === 'checkbox' || control.type === 'toggle'
        ? Boolean(control.default)
        : String(control.default ?? '');
      return {
        id: control.id,
        formatDefault: typeof control.format === 'function'
          ? normalizeBehaviorResult(control.format(control.default))
          : null,
        parseDefaultInput: typeof control.parse === 'function'
          ? normalizeBehaviorResult(control.parse(defaultInput))
          : null,
      };
    });
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function assertRegistryContract(registry, controls, renderedIds, generatedDescriptors, fixture) {
  const ids = controls.map((control) => control.id).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, 'Control IDs must be unique after retired controls are excluded.');
  assert.deepEqual(Object.keys(registry.CONTROL_SECTIONS), fixture.sectionOrder, 'Control section order drifted.');
  assert.equal(ids.length, fixture.controlCount, 'Active control count drifted.');
  assert.equal(digest(controls), fixture.descriptorDigest, 'Control IDs/order/types/defaults/state bindings drifted.');
  assert.equal(renderedIds.length, fixture.renderedControlCount, 'Rendered control count drifted.');
  assert.equal(digest(renderedIds), fixture.renderedIdDigest, 'Rendered control applicability/order drifted.');
  assert.equal(digest(generatedDescriptors), fixture.generatedMarkupDigest, 'Generated control values/options/states drifted.');
  for (const expected of fixture.sentinels) {
    const actual = controls.find((control) => control.id === expected.id);
    assert.ok(actual, `Control sentinel ${expected.id} disappeared.`);
    assert.deepEqual(
      Object.fromEntries(Object.keys(expected).map((key) => [key, actual[key]])),
      expected,
      `Control sentinel ${expected.id} drifted.`,
    );
  }
}

function assertParseFormatContract(parseFormatResults, fixture) {
  assert.equal(parseFormatResults.length, fixture.controlCount, 'Parse/format coverage lost an active control.');
  assert.equal(
    digest(parseFormatResults),
    fixture.parseFormatDigest,
    'Control parse(defaultInput) or format(default) behavior drifted.',
  );
}

function createEventElement(initial = {}) {
  const listeners = new Map();
  const element = {
    checked: false,
    children: [],
    style: {},
    textContent: '',
    value: '',
    ...initial,
    addEventListener(type, listener) {
      const handlers = listeners.get(type) || [];
      handlers.push(listener);
      listeners.set(type, handlers);
    },
    dispatch(type) {
      const handlers = listeners.get(type) || [];
      assert.ok(handlers.length > 0, `Expected a ${type} listener.`);
      for (const listener of handlers) listener({ currentTarget: this, target: this });
    },
    listenerCount(type) {
      return listeners.get(type)?.length || 0;
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
  };
  Object.defineProperty(element, 'innerHTML', {
    get() {
      return '';
    },
    set() {
      this.children.length = 0;
    },
  });
  return element;
}

function createProbeDocument(elements) {
  return {
    documentElement: globalThis.document.documentElement,
    createElement() {
      return createEventElement({ disabled: false });
    },
    getElementById(id) {
      return elements.get(id) || null;
    },
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readAttribute(tag, name) {
  return tag.match(new RegExp(`(?:^|\\s)${escapeRegex(name)}="([^"]*)"`))?.[1] ?? null;
}

function readInputTag(row, id) {
  return row.match(new RegExp(`<input[^>]+id="${escapeRegex(id)}"[^>]*>`))?.[0] || '';
}

function assertGeneratedMarkup(registry, controls) {
  for (const control of controls) {
    if (control.id) registry.setControlVisible(control.id, true);
  }
  const html = `${registry.generatePanelHTML()}${registry.getPuckColorControlsHTML()}`;
  const renderedIds = [...html.matchAll(/data-control-id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(renderedIds).size, renderedIds.length, 'Rendered controls must have unique row identities.');
  const generatedDescriptors = [];

  for (const id of renderedIds) {
    const control = controls.find((candidate) => candidate.id === id);
    assert.ok(control, `Rendered control ${id} is absent from the active registry.`);
    const escapedId = escapeRegex(control.id);
    if (control.type === 'colorDistribution') {
      const row = html.match(new RegExp(`<div[^>]+data-control-id="${escapedId}"[\\s\\S]*?<div class="color-dist-actions">[\\s\\S]*?</div>`))?.[0] || '';
      const colorLabels = [...row.matchAll(/aria-label="([^"]+) color"/g)].map((match) => match[1]);
      const weightLabels = [...row.matchAll(/aria-label="([^"]+) weight"/g)].map((match) => match[1]);
      assert.deepEqual(colorLabels, control.labels || []);
      assert.deepEqual(weightLabels, control.labels || []);
      assert.match(row, /type="button"[^>]+aria-label=/);
      generatedDescriptors.push({ id, type: control.type, colorLabels, weightLabels });
      continue;
    }
    const row = html.match(new RegExp(`<label[^>]+data-control-id="${escapedId}"[\\s\\S]*?</label>`))?.[0] || '';
    assert.ok(row, `Rendered control ${control.id} must use a label row.`);
    assert.match(row, new RegExp(`class="control-label"[^>]*>${escapeRegex(control.label)}</span>`));
    if (control.type === 'color') {
      const input = readInputTag(row, `${control.id}Picker`);
      assert.equal(readAttribute(input, 'aria-label'), control.label);
      generatedDescriptors.push({ id, type: control.type, value: readAttribute(input, 'value'), ariaLabel: control.label });
    } else if (control.type === 'select') {
      const select = row.match(new RegExp(`<select[^>]+id="${escapedId}Slider"[^>]*>[\\s\\S]*?</select>`))?.[0] || '';
      assert.equal(readAttribute(select.slice(0, select.indexOf('>') + 1), 'aria-label'), control.label);
      const options = [...select.matchAll(/<option value="([^"]*)"([^>]*)>([^<]*)<\/option>/g)].map((match) => ({
        value: match[1],
        label: match[3],
        selected: /\bselected\b/.test(match[2]),
      }));
      const expectedOptions = (control.options || []).map((option) => {
        const value = String(option && typeof option === 'object' ? (option.value ?? '') : option);
        return {
          value,
          label: String(option && typeof option === 'object' ? (option.label ?? option.value ?? '') : option),
          selected: String(control.default) === value,
        };
      });
      assert.deepEqual(options, expectedOptions, `${control.id} generated options drifted.`);
      generatedDescriptors.push({ id, type: control.type, options, ariaLabel: control.label });
    } else if (control.type === 'toggle' || control.type === 'checkbox') {
      const input = readInputTag(row, `${control.id}Slider`);
      assert.equal(readAttribute(input, 'aria-label'), control.label);
      const checked = /\schecked(?:\s|>)/.test(input);
      assert.equal(checked, Boolean(control.default), `${control.id} generated checked state drifted.`);
      generatedDescriptors.push({ id, type: control.type, checked, ariaLabel: control.label });
    } else {
      assert.equal(control.type, 'range', `Rendered control ${control.id} has unsupported type ${control.type}.`);
      const input = readInputTag(row, `${control.id}Slider`);
      const values = {
        min: readAttribute(input, 'min'),
        max: readAttribute(input, 'max'),
        step: readAttribute(input, 'step'),
        value: readAttribute(input, 'value'),
      };
      assert.deepEqual(values, {
        min: String(control.min),
        max: String(control.max),
        step: String(control.step),
        value: String(control.default),
      }, `${control.id} generated range constraints/default drifted.`);
      generatedDescriptors.push({ id, type: control.type, ...values });
    }
  }
  return { renderedIds, generatedDescriptors };
}

const storage = createStorage({ panel_control_visibility: JSON.stringify({ ballCount: false }) });
const [registryBundle, fixtureSource] = await Promise.all([
  loadRegistry(storage),
  readFile(fixturePath, 'utf8'),
]);
const { registry, cssValues, paletteEvents } = registryBundle;
const fixture = JSON.parse(fixtureSource);
const controls = normalizeControls(registry);
const parseFormatResults = characterizeParseFormat(registry);
registry.resetVisibility();
const { renderedIds, generatedDescriptors } = assertGeneratedMarkup(registry, controls);
registry.resetVisibility();

if (process.argv.includes('--print-contract')) {
  console.log(JSON.stringify({
    sectionOrder: Object.keys(registry.CONTROL_SECTIONS),
    controlCount: controls.filter((control) => control.id).length,
    descriptorDigest: digest(controls),
    renderedControlCount: renderedIds.length,
    renderedIdDigest: digest(renderedIds),
    generatedMarkupDigest: digest(generatedDescriptors),
    parseFormatDigest: digest(parseFormatResults),
    sentinels: fixture.sentinels.map(({ id }) => controls.find((control) => control.id === id)),
  }, null, 2));
}

test('control registry preserves IDs, order, defaults, and state bindings', () => {
  assertRegistryContract(registry, controls, renderedIds, generatedDescriptors, fixture);
});

test('every active control preserves parse and format behavior at its default boundary', () => {
  assertParseFormatContract(parseFormatResults, fixture);
});

test('every control section is reachable and every active control has an application path', () => {
  const modeMarkup = registry.generateModeSpecificSectionsHTML({ showAllModes: true });
  for (const [key, section] of Object.entries(registry.CONTROL_SECTIONS)) {
    if (section.mode) {
      const sectionPattern = new RegExp(`data-section-key="${key}"`);
      if (NARRATIVE_MODE_SEQUENCE.includes(section.mode)) {
        assert.match(modeMarkup, sectionPattern, `${key} is an unreachable active mode section.`);
      } else {
        assert.doesNotMatch(modeMarkup, sectionPattern, `${key} is a disabled mode section but remains visible.`);
      }
    } else {
      assert(
        registry.MASTER_SECTION_KEYS.includes(key),
        `${key} is an unreachable non-mode section.`,
      );
    }
    for (const control of section.controls || []) {
      if (!control.id) continue;
      assert(
        Boolean(control.stateKey || control.onChange || control.cssVar),
        `${control.id} has no state, CSS, or live application path.`,
      );
    }
  }

  const retiredIds = [
    'atmosphereEdgeStrength',
    'atmosphereEdgeWidthPx',
    'atmosphereEdgeInsetPx',
    'restitution',
    'entranceEnabled',
    'critterTurnDamp',
    'critterHiveStirStrength',
    'sceneImpactAnticipation',
    'starfieldIdleJitter',
    'kaleiMirror',
  ];
  const activeIds = new Set(controls.map((control) => control.id).filter(Boolean));
  for (const id of retiredIds) {
    assert.equal(activeIds.has(id), false, `${id} returned to the active panel contract.`);
  }
});

test('registered control binding preserves state, CSS/runtime, and atmosphere application', () => {
  const bgLight = createEventElement({ value: '#d8d8d8' });
  const bgLightVal = createEventElement();
  const bgDark = createEventElement({ value: '#18202a' });
  const bgDarkVal = createEventElement();
  const ballMass = createEventElement({ value: '123' });
  const ballMassVal = createEventElement();
  const cornerShape = createEventElement({ checked: false });
  const cornerShapeVal = createEventElement();
  const atmosphere = createEventElement({ value: '0.18' });
  const atmosphereVal = createEventElement();
  const atmosphereLightIntensity = createEventElement({ value: '0.73' });
  const atmosphereLightIntensityVal = createEventElement();
  const utilityRailButtonSize = createEventElement({ value: '52' });
  const utilityRailButtonSizeVal = createEventElement();
  const utilityRailHorizontalOffset = createEventElement({ value: '24' });
  const utilityRailHorizontalOffsetVal = createEventElement();
  const utilityRailMobileButtonSize = createEventElement({ value: '28' });
  const utilityRailMobileButtonSizeVal = createEventElement();
  const utilityRailMobileHorizontalOffset = createEventElement({ value: '-18' });
  const utilityRailMobileHorizontalOffsetVal = createEventElement();
  const utilityRailMobileVerticalPosition = createEventElement({ value: '78' });
  const utilityRailMobileVerticalPositionVal = createEventElement();
  const elements = new Map([
    ['bgLightPicker', bgLight],
    ['bgLightVal', bgLightVal],
    ['bgDarkPicker', bgDark],
    ['bgDarkVal', bgDarkVal],
    ['ballMassKgSlider', ballMass],
    ['ballMassKgVal', ballMassVal],
    ['cornerShapeSquircleEnabledSlider', cornerShape],
    ['cornerShapeSquircleEnabledVal', cornerShapeVal],
    ['atmosphereLargeSpreadSlider', atmosphere],
    ['atmosphereLargeSpreadVal', atmosphereVal],
    ['atmosphereLightIntensitySlider', atmosphereLightIntensity],
    ['atmosphereLightIntensityVal', atmosphereLightIntensityVal],
    ['utilityRailButtonSizePxSlider', utilityRailButtonSize],
    ['utilityRailButtonSizePxVal', utilityRailButtonSizeVal],
    ['utilityRailHorizontalOffsetPxSlider', utilityRailHorizontalOffset],
    ['utilityRailHorizontalOffsetPxVal', utilityRailHorizontalOffsetVal],
    ['utilityRailMobileButtonSizePxSlider', utilityRailMobileButtonSize],
    ['utilityRailMobileButtonSizePxVal', utilityRailMobileButtonSizeVal],
    ['utilityRailMobileHorizontalOffsetPxSlider', utilityRailMobileHorizontalOffset],
    ['utilityRailMobileHorizontalOffsetPxVal', utilityRailMobileHorizontalOffsetVal],
    ['utilityRailMobileVerticalPositionVhSlider', utilityRailMobileVerticalPosition],
    ['utilityRailMobileVerticalPositionVhVal', utilityRailMobileVerticalPositionVal],
  ]);
  const uiDocument = createProbeDocument(elements);

  registry.bindRegisteredControls({ uiDocument });

  bgLight.dispatch('input');
  assert.equal(bgLightVal.textContent, '#d8d8d8');
  assert.equal(cssValues.get('--studio-window-bg-light'), '#d8d8d8');
  assert.equal(cssValues.get('--studio-window-bg'), '#d8d8d8');

  bgDark.dispatch('input');
  assert.equal(bgDarkVal.textContent, '#18202a');
  assert.equal(cssValues.get('--studio-window-bg-dark'), '#18202a');
  assert.equal(
    cssValues.get('--studio-window-bg'),
    '#d8d8d8',
    'Editing the inactive theme must not replace the visible studio-window color.',
  );

  // `bindRegisteredControls` writes through the real shared state. Observe it through
  // public synchronization behavior and callback side effects, without test exports.
  const originalAtmosphere = registry.buildSimulationAtmosphereConfigFromControlState();
  atmosphere.dispatch('input');
  registry.hydrateSimulationAtmosphereControlState();
  const appliedAtmosphere = registry.buildSimulationAtmosphereConfigFromControlState();
  assert.equal(appliedAtmosphere.largeSpread, 0.18);
  assert.equal(atmosphereVal.textContent, '18%');

  atmosphereLightIntensity.dispatch('input');
  registry.hydrateSimulationAtmosphereControlState();
  const appliedThemeProfile = registry.buildSimulationAtmosphereConfigFromControlState();
  assert.equal(appliedThemeProfile.light.intensity, 0.73);
  assert.equal(atmosphereLightIntensityVal.textContent, '73%');

  cornerShape.dispatch('change');
  assert.equal(cornerShapeVal.textContent, 'Off');
  assert.ok(cssValues.has('--container-border'), 'Environment callback must apply layout CSS variables.');

  ballMass.dispatch('input');
  assert.equal(ballMassVal.textContent, '123 kg');

  utilityRailButtonSize.dispatch('input');
  utilityRailHorizontalOffset.dispatch('input');
  utilityRailMobileButtonSize.dispatch('input');
  utilityRailMobileHorizontalOffset.dispatch('input');
  utilityRailMobileVerticalPosition.dispatch('input');
  assert.equal(utilityRailButtonSizeVal.textContent, '52px');
  assert.equal(utilityRailHorizontalOffsetVal.textContent, '24px');
  assert.equal(utilityRailMobileButtonSizeVal.textContent, '28px');
  assert.equal(utilityRailMobileHorizontalOffsetVal.textContent, '-18px');
  assert.equal(utilityRailMobileVerticalPositionVal.textContent, '78%');
  assert.equal(cssValues.get('--utility-rail-button-size'), '52px');
  assert.equal(cssValues.get('--utility-rail-icon-size'), '23.92px');
  assert.equal(cssValues.get('--utility-rail-horizontal-offset'), '24px');
  assert.equal(cssValues.get('--utility-rail-mobile-button-size'), '28px');
  assert.equal(cssValues.get('--utility-rail-mobile-icon-size'), '12.88px');
  assert.equal(cssValues.get('--utility-rail-mobile-horizontal-offset'), '-18px');
  assert.equal(cssValues.get('--utility-rail-mobile-vertical-position'), '78svh');

  ballMass.value = '';
  registry.syncSlidersToState({ uiDocument, runOnChange: false });
  assert.equal(ballMass.value, 123, 'Bound range state must round-trip through public synchronization.');

  atmosphere.value = String(originalAtmosphere.largeSpread);
  atmosphere.dispatch('input');
  atmosphereLightIntensity.value = String(originalAtmosphere.light.intensity);
  atmosphereLightIntensity.dispatch('input');
  utilityRailButtonSize.value = '32';
  utilityRailButtonSize.dispatch('input');
  utilityRailHorizontalOffset.value = '0';
  utilityRailHorizontalOffset.dispatch('input');
  utilityRailMobileButtonSize.value = '25';
  utilityRailMobileButtonSize.dispatch('input');
  utilityRailMobileHorizontalOffset.value = '-11';
  utilityRailMobileHorizontalOffset.dispatch('input');
  utilityRailMobileVerticalPosition.value = '78';
  utilityRailMobileVerticalPosition.dispatch('input');
});

test('color distribution binding preserves normalization, uniqueness, publication, and repeated binding', async () => {
  const labels = registry.getControlById('colorDistribution').labels;
  const globals = registry.__getGlobals();
  const originalDistribution = globals.colorDistribution.map((row) => ({ ...row }));
  const originalConfigDistribution = globals.config?.colorDistribution;
  const seedLabels = labels.map((label) => label === 'Creative Engineering' ? 'Prototyping' : label);
  globals.colorDistribution = seedLabels.map((label, index) => ({
    roleId: `characterization-role-${index}`,
    label,
    colorIndex: 2,
    weight: 1,
  }));

  const reset = createEventElement();
  const total = createEventElement();
  const elements = new Map([
    ['colorDistResetBtn', reset],
    ['colorDistTotalVal', total],
  ]);
  const selects = [];
  const weights = [];
  const weightValues = [];
  const swatches = [];
  for (let index = 0; index < labels.length; index += 1) {
    const select = createEventElement();
    const weight = createEventElement();
    const weightValue = createEventElement();
    const swatch = createEventElement();
    selects.push(select);
    weights.push(weight);
    weightValues.push(weightValue);
    swatches.push(swatch);
    elements.set(`colorDistColor${index}`, select);
    elements.set(`colorDistWeight${index}`, weight);
    elements.set(`colorDistWeightVal${index}`, weightValue);
    elements.set(`colorDistSwatch${index}`, swatch);
  }

  let legendRefreshes = 0;
  const originalGetElementById = globalThis.document.getElementById;
  globalThis.document.getElementById = (id) => {
    if (id !== 'expertise-legend') return originalGetElementById(id);
    return {
      querySelectorAll() {
        legendRefreshes += 1;
        return [];
      },
    };
  };

  const eventStart = paletteEvents.length;
  const uiDocument = createProbeDocument(elements);
  registry.bindRegisteredControls({ uiDocument });

  assert.deepEqual(
    globals.colorDistribution.map(({ roleId, label, colorIndex, weight }) => ({ roleId, label, colorIndex, weight })),
    labels.map((label, index) => ({
      roleId: `characterization-role-${index}`,
      label,
      colorIndex: [2, 0, 1, 3, 4, 5][index],
      weight: [16, 16, 17, 17, 17, 17][index],
    })),
    'Initial binding must migrate legacy labels, make palette choices unique, and normalize weights to 100.',
  );
  assert.equal(paletteEvents.length, eventStart + 1, 'Initial normalization must publish one palette update.');
  assert.equal(total.textContent, '100%');
  assert.deepEqual(weights.map((element) => element.value), ['16', '16', '17', '17', '17', '17']);
  assert.deepEqual(weightValues.map((element) => element.textContent), [
    '16% (≈0)',
    '16% (≈0)',
    '17% (≈0)',
    '17% (≈0)',
    '17% (≈0)',
    '17% (≈0)',
  ]);
  assert.deepEqual(swatches.map((element) => element.style.backgroundColor), [
    'var(--ball-3)',
    'var(--ball-1)',
    'var(--ball-2)',
    'var(--ball-4)',
    'var(--ball-5)',
    'var(--ball-6)',
  ]);
  for (let rowIndex = 0; rowIndex < selects.length; rowIndex += 1) {
    assert.equal(selects[rowIndex].children.length, 8);
    for (let optionIndex = 0; optionIndex < 8; optionIndex += 1) {
      const selectedByAnotherRow = [2, 0, 1, 3, 4, 5].includes(optionIndex)
        && optionIndex !== [2, 0, 1, 3, 4, 5][rowIndex];
      assert.equal(selects[rowIndex].children[optionIndex].disabled, selectedByAnotherRow);
    }
  }

  registry.bindRegisteredControls({ uiDocument });
  assert.equal(reset.listenerCount('click'), 2, 'Repeated binding must preserve the existing listener behavior.');
  assert.ok(selects.every((element) => element.listenerCount('change') === 2));
  assert.ok(weights.every((element) => element.listenerCount('input') === 2));

  const beforeChoice = paletteEvents.length;
  selects[0].value = '6';
  selects[0].dispatch('change');
  await new Promise((resolvePromise) => setImmediate(resolvePromise));
  assert.equal(globals.colorDistribution[0].colorIndex, 6);
  assert.equal(paletteEvents.length, beforeChoice + 1, 'Repeated handlers must publish only one changed palette snapshot.');
  assert.equal(legendRefreshes, 2, 'Each existing repeated handler must request a legend refresh.');

  globals.config.colorDistribution = labels.map((label, index) => ({
    roleId: `reset-role-${index}`,
    label: label === 'Creative Engineering' ? 'Prototyping' : label,
    colorIndex: 7 - index,
    weight: [5, 10, 15, 20, 25, 25][index],
  }));
  const beforeReset = paletteEvents.length;
  reset.dispatch('click');
  await new Promise((resolvePromise) => setImmediate(resolvePromise));
  assert.equal(paletteEvents.length, beforeReset + 1, 'Reset must publish the configured defaults once.');
  assert.deepEqual(globals.colorDistribution.map((row) => row.label), labels);
  assert.deepEqual(globals.colorDistribution.map((row) => row.weight), [5, 10, 15, 20, 25, 25]);
  assert.equal(legendRefreshes, 4);

  const beforeZeroWeight = paletteEvents.length;
  weights[0].value = '0';
  weights[0].dispatch('input');
  await new Promise((resolvePromise) => setImmediate(resolvePromise));
  assert.equal(paletteEvents.length, beforeZeroWeight + 1);
  assert.deepEqual(
    globals.colorDistribution.map(({ roleId, label, colorIndex, weight }) => ({ roleId, label, colorIndex, weight })),
    originalDistribution.map(({ roleId, label, colorIndex, weight }) => ({ roleId, label, colorIndex, weight })),
    'A zero-weight row must retain the palette controller fallback semantics.',
  );
  assert.equal(total.textContent, '100%');
  assert.equal(legendRefreshes, 6);

  globals.config.colorDistribution = originalDistribution;
  reset.dispatch('click');
  await new Promise((resolvePromise) => setImmediate(resolvePromise));
  if (originalConfigDistribution === undefined) delete globals.config.colorDistribution;
  else globals.config.colorDistribution = originalConfigDistribution;
  globalThis.document.getElementById = originalGetElementById;
});

test('generated control markup preserves identity and accessible names', () => {
  assert.deepEqual(assertGeneratedMarkup(registry, controls), { renderedIds, generatedDescriptors });
  registry.resetVisibility();
});

test('visibility choices preserve their local-storage round trip', () => {
  registry.setControlVisible('ballCount', false);
  assert.equal(registry.isControlVisible('ballCount'), false);
  assert.deepEqual(JSON.parse(storage.read('panel_control_visibility')), { ballCount: false });
  registry.setControlVisible('ballCount', true);
  assert.equal(registry.isControlVisible('ballCount'), true);
  assert.deepEqual(JSON.parse(storage.read('panel_control_visibility')), { ballCount: true });
  registry.setControlVisible('noiseSeed', true);
  assert.equal(registry.isControlVisible('noiseSeed'), false, 'Retired controls must stay hidden.');
  registry.resetVisibility();
  assert.deepEqual(JSON.parse(storage.read('panel_control_visibility')), {});
});

test('intentional control contract breaks are rejected', () => {
  const brokenControls = structuredClone(controls);
  const target = brokenControls.find((control) => control.id);
  target.min = '__intentional-constraint-break__';
  assert.throws(() => assertRegistryContract(registry, brokenControls, renderedIds, generatedDescriptors, fixture), /drifted/);

  const brokenCallbacks = structuredClone(controls);
  const callbackTarget = brokenCallbacks.find((control) => control.behavior.onChange);
  callbackTarget.behavior.onChange = false;
  assert.throws(() => assertRegistryContract(registry, brokenCallbacks, renderedIds, generatedDescriptors, fixture), /drifted/);

  const brokenDefinitionMetadata = structuredClone(controls);
  const metadataTarget = brokenDefinitionMetadata.find((control) => control.id === 'atmosphereLightIntensity');
  metadataTarget.group = '__intentional-group-break__';
  assert.throws(() => assertRegistryContract(registry, brokenDefinitionMetadata, renderedIds, generatedDescriptors, fixture), /drifted/);

  const brokenParseFormat = structuredClone(parseFormatResults);
  brokenParseFormat[0].parseDefaultInput = { type: 'string', value: '__intentional-parse-break__' };
  assert.throws(() => assertParseFormatContract(brokenParseFormat, fixture), /drifted/);

  const brokenRegistry = {
    ...registry,
    generatePanelHTML: () => registry.generatePanelHTML().replace(/ aria-label="[^"]+"/g, ''),
  };
  assert.throws(() => assertGeneratedMarkup(brokenRegistry, controls), /Expected values|aria-label/);
});
