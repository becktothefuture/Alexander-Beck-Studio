import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire, registerHooks } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ABOUT_SCENE_CONTROL_REGISTRY } from '../react-app/app/src/routes/about-narrative-lab/aboutSceneControlRegistry.js';
import { createAboutNarrativePersistenceService } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePersistenceServer.js';
import {
  loadAboutNarrativePointFieldPersistenceSource,
  serializeAboutNarrativePointFieldSource,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldPersistence.js';
import {
  ABOUT_VISIBILITY_CONTROLS,
  getRollercoasterAppearance,
  getRollercoasterAppearanceState,
  getRollercoasterVisibilityBounds,
  loadRollercoasterAppearance,
  revertRollercoasterAppearance,
  saveRollercoasterAppearance,
  setRollercoasterAppearance,
  subscribeRollercoasterAppearance,
} from '../react-app/app/src/routes/about-rollercoaster/rollercoasterAppearance.js';
import { flattenDesignConfigDir } from './lib/flatten-design-config.mjs';

const ROOT = new URL('../', import.meta.url);
const componentUrl = new URL('react-app/app/src/routes/about-rollercoaster/AboutRollercoasterControls.jsx', ROOT);
const requireApp = createRequire(new URL('react-app/app/package.json', ROOT));
const { transformSync } = requireApp('esbuild');
const React = requireApp('react');
const { renderToStaticMarkup } = requireApp('react-dom/server');

// Compile this one JSX module for Node, without an application build. Its
// internal pure operations are tested directly; no test-only API ships.
const loader = registerHooks({
  load(url, context, nextLoad) {
    if (url === componentUrl.href) {
      const source = `${readFileSync(componentUrl, 'utf8')}\nexport { listCopyControls, editContentDocument, createContentEditor, editorEnabled, editorShortcut, SourceInspector, savePanelChanges, VisibilityControls };`;
      return {
        format: 'module', shortCircuit: true,
        source: transformSync(source, { loader: 'jsx', format: 'esm', jsx: 'automatic', define: { __DEV__: 'true' } }).code,
      };
    }
    if (url.endsWith('/about-narrative-parameters.css') || url.endsWith('/rollercoaster-controls.css')) {
      return { format: 'module', shortCircuit: true, source: 'export default {};' };
    }
    return nextLoad(url, context);
  },
});
const { listCopyControls, editContentDocument, createContentEditor, editorEnabled, editorShortcut, SourceInspector, savePanelChanges, VisibilityControls } = await import(componentUrl.href);
loader.deregister();
const canonical = JSON.parse(await readFile(new URL('react-app/app/public/config/contents-about.json', ROOT), 'utf8'));
const controls = listCopyControls(canonical);
const opening = controls.find(control => control.fieldId === 'text-promise-main' && control.path.at(-1) === 'text');
const readPath = (document, path) => path.reduce((value, key) => value[key], document);
const clone = value => structuredClone(value);
const loadedSource = () => ({ document: clone(canonical), hash: 'baseline-hash' });
const canonicalDesign = JSON.parse(await readFile(new URL('react-app/app/public/config/design-system.json', ROOT), 'utf8'));

test('copy mapping covers the canonical titles, complete nested prose, career and client accessibility text', () => {
  assert.deepEqual([...new Set(controls.map(control => control.fieldId))], canonical.tracks.text.fields.filter(field => field.publishable).map(field => field.id));
  assert.equal(new Set(controls.map(control => control.id)).size, controls.length);
  for (const control of controls) {
    assert.equal(readPath(canonical, control.path), control.value);
    assert.deepEqual(editContentDocument(canonical, control.id, control.value), canonical,
      `An unchanged ${control.id} must preserve the whole source document.`);
    assert.ok(!control.path.some(part => ['id', 'src', 'startWU', 'endWU', 'stageId', 'parameters'].includes(part)));
  }
  const career = canonical.tracks.text.fields.find(field => field.id === 'text-background-unit').block.modules.find(module => module.kind === 'career-sequence');
  for (const job of career.items) {
    for (const key of ['yearLabel', 'employer', 'role', 'description']) {
      assert.ok(controls.some(control => control.fieldId === 'text-background-unit' && control.path.at(-1) === key && control.value === job[key]));
    }
  }
  assert.equal(controls.filter(control => control.path.at(-1) === 'alt').length, 15);
  assert.ok(controls.some(control => control.value === 'Let’s begin.'));
  assert.ok(controls.some(control => control.value === 'How I work'));
});

test('editing changes only the selected website value and rejects scene, timing, unsafe or invalid writes', () => {
  const before = clone(canonical);
  const edited = editContentDocument(canonical, opening.id, 'Hello, I’m Alex.');
  assert.equal(readPath(edited, opening.path), 'Hello, I’m Alex.');
  assert.deepEqual(canonical, before, 'A draft must not mutate the imported canonical module.');
  readPath(edited, opening.path.slice(0, -1))[opening.path.at(-1)] = opening.value;
  assert.deepEqual(edited, canonical, 'All unrelated source, asset and compatibility fields survive.');
  for (const id of ['globals.pointMaterial.pointSize', 'globals.sceneMotion.masterSpeed', 'globals.textMotion.bookendViewportY', 'tracks.text.fields.0.startWU', 'source.circleField.radius']) {
    assert.throws(() => editContentDocument(canonical, id, 2), /not a website/);
  }
  assert.throws(() => editContentDocument(canonical, opening.id, ''), /non-empty/);
  assert.throws(() => editContentDocument(canonical, opening.id, '<script>alert(1)</script>'), /plain/);
  assert.throws(() => editContentDocument(canonical, opening.id, 42), /plain text/);
});

test('every typography control retains its existing limits and survives the canonical serialization boundary', () => {
  for (const control of ABOUT_SCENE_CONTROL_REGISTRY.typography) {
    for (const value of [control.min, control.max]) {
      const edited = editContentDocument(canonical, `globals.typography.${control.id}`, value);
      const reloaded = loadAboutNarrativePointFieldPersistenceSource(serializeAboutNarrativePointFieldSource(edited));
      assert.equal(reloaded.valid, true, control.id);
      assert.equal(reloaded.document.globals.typography[control.id], value);
      assert.deepEqual(reloaded.document.tracks.text.fields, loadAboutNarrativePointFieldPersistenceSource(canonical).document.tracks.text.fields);
    }
    assert.throws(() => editContentDocument(canonical, `globals.typography.${control.id}`, control.max + control.step), /must be between/);
    assert.throws(() => editContentDocument(canonical, `globals.typography.${control.id}`, NaN), /must be between/);
  }
});

test('live draft updates, invalid partial copy and revert have explicit save eligibility', async () => {
  let notifications = 0;
  const editor = createContentEditor(canonical, { loadSource: async () => loadedSource() });
  const unsubscribe = editor.subscribe(() => { notifications += 1; });
  assert.equal(editor.change(opening.id, 'Pending'), false, 'Editing waits for the current canonical hash.');
  assert.equal(await editor.load(), true);
  assert.equal(editor.canSave(), false);
  assert.equal(editor.change(opening.id, 'Hello, I’m Alex.'), true);
  assert.equal(editor.getSnapshot().dirty, true);
  assert.equal(editor.canSave(), true);
  assert.equal(editor.change(opening.id, ''), false);
  assert.equal(readPath(editor.getSnapshot().document, opening.path), 'Hello, I’m Alex.');
  assert.ok(editor.getSnapshot().inputError);
  assert.equal(editor.canSave(), false, 'An invalid visible draft cannot save the preceding valid text by accident.');
  assert.equal(await editor.load(), false, 'A routine reload cannot discard a draft implicitly.');
  assert.equal(editor.revert(), true);
  assert.deepEqual(editor.getSnapshot().document, canonical);
  assert.equal(editor.getSnapshot().inputError, '');
  assert.equal(editor.getSnapshot().dirty, false);
  assert.ok(notifications >= 5, 'The live apply subscriber receives the actual document transitions.');
  unsubscribe();
});

test('the existing HTTP client and atomic service save, reload and protect concurrent source edits', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'about-rollercoaster-controls-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const configPath = join(directory, 'contents-about.json');
  await writeFile(configPath, JSON.stringify(canonical));
  const service = createAboutNarrativePersistenceService({ configPath, targetVersion: canonical.schemaVersion });
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    assert.equal(url, '/api/about-narrative/config');
    assert.equal(options.headers['X-ABS-Editor'], 'about-narrative-v1');
    try {
      const result = options.method === 'POST'
        ? await service.save(options.body, options.headers['If-Match']) : await service.read();
      return Response.json(result, { headers: { ETag: `"${result.hash}"` } });
    } catch (error) {
      return Response.json({ message: error.message, currentHash: error.currentHash }, { status: error.statusCode || 400 });
    }
  });
  const editor = createContentEditor(canonical);
  assert.equal(await editor.load(), true);
  const initialHash = editor.getSnapshot().hash;
  const normalizedBaseline = clone(editor.getSnapshot().document);
  const currentOpening = listCopyControls(normalizedBaseline).find(control => control.fieldId === 'text-promise-main' && control.path.at(-1) === 'text');
  editor.change(currentOpening.id, 'Hello, I’m Alex.');
  editor.change('globals.typography.mainTitleSizeScale', 0.9);
  assert.equal(await editor.save(), true);
  assert.notEqual(editor.getSnapshot().hash, initialHash);
  const disk = JSON.parse(await readFile(configPath, 'utf8'));
  assert.equal(readPath(disk, currentOpening.path), 'Hello, I’m Alex.');
  assert.equal(disk.globals.typography.mainTitleSizeScale, 0.9);
  readPath(disk, currentOpening.path.slice(0, -1))[currentOpening.path.at(-1)] = readPath(normalizedBaseline, currentOpening.path);
  disk.globals.typography.mainTitleSizeScale = normalizedBaseline.globals.typography.mainTitleSizeScale;
  assert.deepEqual(disk, normalizedBaseline, 'The save must not change hidden scene compatibility data.');

  const reloaded = createContentEditor(canonical);
  assert.equal(await reloaded.load(), true);
  assert.equal(readPath(reloaded.getSnapshot().document, currentOpening.path), 'Hello, I’m Alex.');
  assert.equal(reloaded.getSnapshot().document.globals.typography.mainTitleSizeScale, 0.9);
  editor.change(currentOpening.id, 'A local draft.');
  const currentDisk = await service.read();
  const external = editContentDocument(currentDisk.document, currentOpening.id, 'A source edit.');
  await service.save(external, currentDisk.hash);
  assert.equal(await editor.save(), false);
  assert.equal(editor.getSnapshot().conflict, true);
  assert.equal(readPath(editor.getSnapshot().document, currentOpening.path), 'A local draft.');
  assert.equal(editor.canSave(), false);
  assert.equal(await editor.load(), false);
  assert.equal(readPath((await service.read()).document, currentOpening.path), 'A source edit.');
  assert.equal(await editor.load({ discard: true }), true);
  assert.equal(editor.getSnapshot().conflict, false);
  assert.equal(readPath(editor.getSnapshot().document, currentOpening.path), 'A source edit.');
  assert.equal(requests.filter(request => request.options.method === 'POST').length, 2);
});

test('in-flight saves block mutations and duplicate submissions, and failures retain the draft', async () => {
  let finishSave;
  let saves = 0;
  const editor = createContentEditor(canonical, {
    loadSource: async () => loadedSource(),
    saveSource: () => { saves += 1; return new Promise((resolve, reject) => { finishSave = reject; }); },
  });
  await editor.load();
  editor.change(opening.id, 'A local draft.');
  const saving = editor.save();
  assert.equal(editor.getSnapshot().status, 'saving');
  assert.equal(editor.change(opening.id, 'A racing edit.'), false);
  assert.equal(editor.revert(), false);
  assert.equal(await editor.load({ discard: true }), false);
  assert.equal(await editor.save(), false);
  finishSave(new Error('Network unavailable'));
  assert.equal(await saving, false);
  assert.equal(saves, 1);
  assert.equal(editor.getSnapshot().dirty, true);
  assert.equal(readPath(editor.getSnapshot().document, opening.path), 'A local draft.');
  assert.equal(editor.canSave(), true, 'A transport error may be retried with the same baseline.');
});

test('a missing hash, unavailable authoring endpoint or future schema never enables writes', async () => {
  for (const loadSource of [
    async () => ({ document: canonical, hash: '' }),
    async () => { throw new Error('Read-only preview'); },
    async () => { throw Object.assign(new Error('Future schema'), { code: 'future-schema' }); },
  ]) {
    const editor = createContentEditor(canonical, { loadSource });
    assert.equal(await editor.load(), false);
    assert.equal(editor.change(opening.id, 'Cannot save'), false);
    assert.equal(editor.canSave(), false);
    assert.deepEqual(editor.getSnapshot().document, canonical);
    assert.ok(['failed', 'read-only'].includes(editor.getSnapshot().status));
  }
});

test('the existing slash shortcut respects text editing, modifiers, composition and edit=0', () => {
  assert.equal(editorEnabled(false, ''), false);
  assert.equal(editorEnabled(true, '?edit=0'), false);
  assert.equal(editorEnabled(true, '?edit=1'), true);
  assert.equal(editorShortcut({ key: '/', target: null }), true);
  assert.equal(editorShortcut({ key: 'p' }), false);
  for (const modifier of ['metaKey', 'ctrlKey', 'altKey', 'shiftKey', 'repeat', 'isComposing']) {
    assert.equal(editorShortcut({ key: '/', [modifier]: true }), false);
  }
  assert.equal(editorShortcut({ key: '/', target: { isContentEditable: true } }), false);
  assert.equal(editorShortcut({ key: '/', target: { closest: () => ({ tagName: 'TEXTAREA' }) } }), false);
});

test('the source inspector separates Blender surfaces from browser-owned circle density', () => {
  const meta = {
    schema: 'about-rollercoaster-world/v2',
    source: { file: 'source-assets/about-surface-world/about-surface-world.blend', sha256: 'a'.repeat(64) },
    cameraSha256: 'b'.repeat(64), geometry: { sha256: 'c'.repeat(64), objectCount: 12 },
    fog: { near: 12, far: 120 },
    referenceSeconds: 180, totalDistanceWU: 360,
    controls: [
      { key: 'referenceSeconds', label: 'Reference duration', unit: 'seconds', baseline: 180, range: [30, 600] },
      { key: 'fogNear', label: 'Fog begins', binding: 'fog.near', baseline: 12 },
    ],
    beats: [{ id: 'tunnel-a', kind: 'travel', start: 0.2, end: 0.4, scrollScreens: 6.4 }],
    motionGroups: [{ id: 1, kind: 'rotate', amplitude: 0.2, period: 8, phase: 0.3 }],
  };
  const html = renderToStaticMarkup(React.createElement(SourceInspector, { meta }));
  for (const text of [meta.source.file, meta.source.sha256, meta.cameraSha256, meta.geometry.sha256, 'Surface objects', 'rollercoasterField.js', '6.4 viewport heights', 'rotate', 'amplitude', 'period', 'Reference duration', 'allowed 30–600']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /Points SHA-256|Circle radius|Circle spacing|Fog near|Fog begins/);
  assert.doesNotMatch(html, /<(input|textarea|select|button)\b/);
  assert.match(renderToStaticMarkup(React.createElement(SourceInspector, { meta: null })), /Waiting for the saved Blender scene/);
});

test('visibility defaults use four canonical keys and the existing Home sizing names', async (t) => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests += 1;
    assert.equal(url, '/config/design-system.json');
    assert.equal(options.cache, 'no-store');
    return Response.json(canonicalDesign);
  });
  assert.deepEqual(ABOUT_VISIBILITY_CONTROLS.map(control => [control.id, control.runtimeKey, control.min, control.max, control.defaultValue]), [
    ['nearHidden', 'aboutVisibilityNearHiddenWU', 0, 8, 2],
    ['nearClear', 'aboutVisibilityNearClearWU', 0.1, 12, 7],
    ['farClear', 'aboutVisibilityFarClearWU', 3, 60, 12],
    ['farHidden', 'aboutVisibilityFarHiddenWU', 4, 120, 38],
  ]);
  const loaded = await loadRollercoasterAppearance({ forceReload: true });
  assert.equal(loaded, getRollercoasterAppearance(), 'Renderer snapshots are stable between changes.');
  assert.equal(loaded.homeSimulationBodyRadiusPx, canonicalDesign.runtime.homeSimulationBodyRadiusPx);
  assert.equal(loaded.mobileSimulationBodyScale, canonicalDesign.runtime.mobileSimulationBodyScale);
  assert.ok(!Object.hasOwn(loaded, 'homeSimulationMobileRadiusScale'));
  ABOUT_VISIBILITY_CONTROLS.forEach(control => assert.equal(canonicalDesign.runtime[control.runtimeKey], control.defaultValue));
  assert.equal(await loadRollercoasterAppearance(), loaded);
  assert.equal(requests, 1, 'A second renderer/panel load reuses the same initialized store.');
});

test('invalid visibility intervals never apply and dynamic slider limits keep all four values ordered', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json(canonicalDesign));
  await loadRollercoasterAppearance({ forceReload: true });
  const initial = getRollercoasterAppearance();
  const notifications = [];
  const unsubscribe = subscribeRollercoasterAppearance(config => notifications.push(config));
  t.after(unsubscribe);
  for (const invalid of [
    { nearHidden: -0.1 }, { nearHidden: 9 }, { nearHidden: initial.nearClear },
    { nearClear: 0 }, { nearClear: 13 }, { nearClear: 5, farClear: 4 },
    { farClear: 2 }, { farClear: 61 }, { farClear: initial.farHidden },
    { farHidden: 3 }, { farHidden: 121 }, { farHidden: NaN }, { farHidden: Infinity },
    { farHidden: '40' }, { farHidden: null }, { pointSize: 8 },
    { homeSimulationBodyRadiusPx: 14 }, { mobileSimulationBodyScale: 1 },
  ]) {
    assert.throws(() => setRollercoasterAppearance(invalid), undefined, JSON.stringify(invalid));
    assert.equal(getRollercoasterAppearance(), initial);
  }
  assert.equal(notifications.length, 0, 'Rejected values never reach the renderer.');
  for (const corridor of [
    { nearHidden: 0, nearClear: 0.1, farClear: 3, farHidden: 4 },
    { nearHidden: 0.099, nearClear: 0.1, farClear: 3.99, farHidden: 4 },
    { nearHidden: 8, nearClear: 12, farClear: 12, farHidden: 120 },
  ]) {
    setRollercoasterAppearance(corridor);
    for (const control of ABOUT_VISIBILITY_CONTROLS) {
      const config = getRollercoasterAppearance();
      const bounds = getRollercoasterVisibilityBounds(control.id, config);
      assert.ok(bounds.min <= config[control.id] && config[control.id] <= bounds.max);
      for (const value of [bounds.min, bounds.max]) {
        const next = setRollercoasterAppearance({ ...config, [control.id]: value });
        assert.ok(next.nearHidden < next.nearClear && next.nearClear <= next.farClear && next.farClear < next.farHidden);
      }
      setRollercoasterAppearance(corridor);
    }
  }
  assert.ok(notifications.length > 0);
  assert.equal(getRollercoasterAppearanceState().dirty, true);
  assert.equal(revertRollercoasterAppearance(), true);
  assert.deepEqual(getRollercoasterAppearance(), initial);
  assert.equal(getRollercoasterAppearanceState().dirty, false);
});

test('appearance save fresh-merges only four runtime keys and survives the real atomic flatten/reload path', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'about-visibility-save-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await flattenDesignConfigDir(directory, canonicalDesign);
  const configPath = join(directory, 'design-system.json');
  const requests = [];
  let submitted;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    if (url === '/config/design-system.json') {
      assert.equal(options.cache, 'no-store');
      return Response.json(JSON.parse(await readFile(configPath, 'utf8')));
    }
    assert.equal(url, '/api/design-system/config');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'application/json');
    submitted = JSON.parse(options.body).config;
    await flattenDesignConfigDir(directory, submitted);
    return Response.json({ ok: true });
  });
  await loadRollercoasterAppearance({ forceReload: true });
  setRollercoasterAppearance({ nearHidden: 1, nearClear: 3, farClear: 18, farHidden: 40 });

  // Another editor changes unrelated settings after our panel loaded.
  const changedElsewhere = JSON.parse(await readFile(configPath, 'utf8'));
  changedElsewhere.runtime.homeSimulationBodyRadiusPx = 12;
  changedElsewhere.runtime.mobileSimulationBodyScale = 0.9;
  changedElsewhere.runtime.appearanceRegressionMarker = { keep: ['current', 'runtime'] };
  changedElsewhere.contact.appearanceRegressionMarker = 'current contact';
  changedElsewhere.portfolio.appearanceRegressionMarker = { keep: true };
  changedElsewhere.shell.theme.appearanceRegressionMarker = 'current shell';
  await flattenDesignConfigDir(directory, changedElsewhere);
  const fresh = JSON.parse(await readFile(configPath, 'utf8'));
  const saved = await saveRollercoasterAppearance();
  assert.deepEqual(ABOUT_VISIBILITY_CONTROLS.map(control => saved[control.id]), [1, 3, 18, 40]);
  assert.equal(saved.homeSimulationBodyRadiusPx, 12);
  assert.equal(saved.mobileSimulationBodyScale, 0.9);
  const expected = clone(fresh);
  ABOUT_VISIBILITY_CONTROLS.forEach(control => { expected.runtime[control.runtimeKey] = saved[control.id]; });
  assert.deepEqual(submitted, expected, 'The POST changes exactly the four owned keys in a freshly read document.');
  assert.deepEqual(JSON.parse(await readFile(configPath, 'utf8')), expected);
  const flattened = JSON.parse(await readFile(join(directory, 'default-config.json'), 'utf8'));
  ABOUT_VISIBILITY_CONTROLS.forEach(control => assert.equal(flattened[control.runtimeKey], saved[control.id]));
  assert.deepEqual(await loadRollercoasterAppearance({ forceReload: true }), saved);
  assert.equal(getRollercoasterAppearanceState().dirty, false);
  assert.deepEqual(requests.map(request => request.options.method || 'GET'), ['GET', 'GET', 'POST', 'GET', 'GET']);
});

test('failed loads, failed writes and unverified writes preserve the visible appearance draft', async (t) => {
  let disk = clone(canonicalDesign);
  let failure = '';
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (options.method === 'POST') {
      if (failure === 'write') return Response.json({ message: 'Write refused' }, { status: 500 });
      if (failure !== 'verification') disk = JSON.parse(options.body).config;
      return Response.json({ ok: true });
    }
    if (failure === 'read') return Response.json({ message: 'Unavailable' }, { status: 503 });
    return Response.json(disk);
  });
  await loadRollercoasterAppearance({ forceReload: true });
  setRollercoasterAppearance({ farHidden: 44 });
  const draft = getRollercoasterAppearance();
  for (const mode of ['write', 'verification']) {
    failure = mode;
    await assert.rejects(saveRollercoasterAppearance(), mode === 'write' ? /Write refused/ : /could not be verified/);
    assert.equal(getRollercoasterAppearance(), draft);
    assert.equal(getRollercoasterAppearanceState().dirty, true);
  }
  failure = 'read';
  await assert.rejects(loadRollercoasterAppearance({ forceReload: true }), /Could not load/);
  assert.equal(getRollercoasterAppearance(), draft);
  assert.equal(getRollercoasterAppearanceState().dirty, true);
  assert.equal(getRollercoasterAppearanceState().status, 'failed');
  assert.throws(() => setRollercoasterAppearance({ farHidden: 45 }), /Load the canonical/);
  failure = '';
  disk.runtime.aboutVisibilityNearClearWU = 0.2;
  await assert.rejects(loadRollercoasterAppearance({ forceReload: true }), /Visibility must follow/);
  assert.equal(getRollercoasterAppearance(), draft, 'An invalid saved interval also keeps the last valid draft.');
  disk = clone(canonicalDesign);
  await loadRollercoasterAppearance({ forceReload: true });
});

test('an in-flight appearance save blocks edits and coalesces repeated Save actions', async (t) => {
  let disk = clone(canonicalDesign);
  let posts = 0;
  let release;
  let signalPosted;
  const posted = new Promise(resolve => { signalPosted = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (options.method === 'POST') {
      posts += 1;
      signalPosted();
      await gate;
      disk = JSON.parse(options.body).config;
      return Response.json({ ok: true });
    }
    return Response.json(disk);
  });
  await loadRollercoasterAppearance({ forceReload: true });
  setRollercoasterAppearance({ farHidden: 42 });
  const first = saveRollercoasterAppearance();
  const second = saveRollercoasterAppearance();
  assert.throws(() => setRollercoasterAppearance({ farHidden: 43 }), /before editing/);
  assert.equal(revertRollercoasterAppearance(), false);
  await assert.rejects(loadRollercoasterAppearance({ forceReload: true }), /finish saving/);
  await posted;
  assert.equal(posts, 1);
  release();
  const results = await Promise.all([first, second]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(getRollercoasterAppearance().farHidden, 42);
  assert.equal(getRollercoasterAppearanceState().dirty, false);
});

test('a competing corridor change is reported as a conflict without overwriting either draft or source', async (t) => {
  const disk = clone(canonicalDesign);
  let posts = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (options.method === 'POST') posts += 1;
    return Response.json(disk);
  });
  await loadRollercoasterAppearance({ forceReload: true });
  setRollercoasterAppearance({ farHidden: 45 });
  disk.runtime.aboutVisibilityFarHiddenWU = 50;
  await assert.rejects(saveRollercoasterAppearance(), /changed on disk/);
  assert.equal(posts, 0);
  assert.equal(getRollercoasterAppearance().farHidden, 45);
  assert.equal(getRollercoasterAppearanceState().status, 'conflict');
  assert.equal(getRollercoasterAppearanceState().dirty, true);
  assert.equal(disk.runtime.aboutVisibilityFarHiddenWU, 50);
  await loadRollercoasterAppearance({ forceReload: true });
  assert.equal(getRollercoasterAppearance().farHidden, 50);
  assert.equal(getRollercoasterAppearanceState().dirty, false);
});

test('one panel save commits copy before appearance and reports partial failure explicitly', async () => {
  const events = [];
  const editor = createContentEditor(canonical, {
    loadSource: async () => loadedSource(),
    saveSource: async document => { events.push('copy'); return { document, hash: 'copy-saved' }; },
  });
  await editor.load();
  editor.change(opening.id, 'A combined save.');
  const appearance = {
    getState: () => ({ dirty: true, status: 'ready' }),
    save: async () => { events.push('appearance'); throw new Error('Source unavailable'); },
  };
  await assert.rejects(savePanelChanges(editor, appearance), /Copy saved\. Visibility not saved\. Source unavailable/);
  assert.deepEqual(events, ['copy', 'appearance']);
  assert.equal(editor.getSnapshot().dirty, false);

  events.length = 0;
  editor.change(opening.id, '');
  await assert.rejects(savePanelChanges(editor, appearance), /Copy not saved/);
  assert.deepEqual(events, [], 'Invalid visible copy blocks the shared Save action before either write.');
  editor.revert();
  appearance.save = async () => { events.push('appearance'); };
  assert.equal(await savePanelChanges(editor, appearance), 'Visibility settings saved.');
  assert.deepEqual(events, ['appearance']);
});

test('the corridor uses the fixed panel row controls and keeps Home size read only', () => {
  const html = renderToStaticMarkup(React.createElement(VisibilityControls, {
    appearance: getRollercoasterAppearanceState(), disabled: false, onError() {},
  }));
  assert.equal((html.match(/type="range"/g) || []).length, 4);
  for (const control of ABOUT_VISIBILITY_CONTROLS) {
    assert.ok(html.includes(control.label));
    assert.ok(html.includes(`about-visibility-${control.id}`));
  }
  assert.match(html, /Ball size linked to Home/);
  assert.doesNotMatch(html, /id="(?:homeSimulationBodyRadiusPx|mobileSimulationBodyScale)"/);
});
