import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { relative, resolve } from 'node:path';
import test from 'node:test';

import {
  SIMULATION_ADMIN_PATHS,
  applySimulationRouteDeletionSourceEdits,
  createSimulationIssue,
  deleteSimulation,
  readSimulationCatalog,
  updateSimulationIssueStatus,
  updateSimulationReviewStatus,
  updateSimulationStage,
} from './lib/simulation-admin-store.mjs';
import { LOCAL_FILE_TRANSACTION_IO } from './lib/local-file-transaction.mjs';
import { addRouteSourceValidationErrors } from './validate-simulation-catalog.mjs';

async function createRouteSourceCopies() {
  const root = await mkdtemp(resolve(tmpdir(), 'abs-simulation-delete-'));
  const paths = {
    routeRegistryPath: resolve(root, 'route-manifest.js'),
    viteConfigPath: resolve(root, 'vite.config.js'),
    siteAppPath: resolve(root, 'SiteApp.jsx'),
  };
  await Promise.all([
    writeFile(paths.routeRegistryPath, await readFile(SIMULATION_ADMIN_PATHS.routeRegistryPath, 'utf8'), 'utf8'),
    writeFile(paths.viteConfigPath, await readFile(SIMULATION_ADMIN_PATHS.viteConfigPath, 'utf8'), 'utf8'),
    writeFile(paths.siteAppPath, await readFile(SIMULATION_ADMIN_PATHS.siteAppPath, 'utf8'), 'utf8'),
  ]);
  return { root, paths };
}

function createFailingTransactionIo({ method, at = 1 }) {
  let calls = 0;
  const fail = () => {
    calls += 1;
    if (calls === at) throw new Error(`Injected ${method} failure at call ${at}`);
  };
  return {
    ...LOCAL_FILE_TRANSACTION_IO,
    async open(...args) {
      const handle = await LOCAL_FILE_TRANSACTION_IO.open(...args);
      if (method !== 'writeFile') return handle;
      return new Proxy(handle, {
        get(target, property) {
          if (property === 'writeFile') {
            return async (...writeArgs) => {
              fail();
              return target.writeFile(...writeArgs);
            };
          }
          const value = Reflect.get(target, property, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    },
    async [method](...args) {
      fail();
      return LOCAL_FILE_TRANSACTION_IO[method](...args);
    },
  };
}

async function createDeletionFixture() {
  const root = await mkdtemp(resolve(tmpdir(), 'abs-simulation-delete-transaction-'));
  const reactAppRoot = resolve(root, 'react-app/app');
  const paths = {
    ...SIMULATION_ADMIN_PATHS,
    repoRoot: root,
    reactAppRoot,
    simulationCatalogPath: resolve(reactAppRoot, 'src/data/simulationCatalog.json'),
    simulationActivityPath: resolve(root, 'docs/simulations/activity.jsonl'),
    simulationIssuesDir: resolve(root, 'docs/simulations/issues'),
    simulationPreviewsDir: resolve(reactAppRoot, 'public/previews/simulations'),
    simulationPitchesDir: resolve(root, 'docs/simulations/pitches'),
    simulationLabDir: resolve(reactAppRoot, 'lab'),
    simulationEntriesDir: resolve(reactAppRoot, 'src/entries'),
    simulationRoutesDir: resolve(reactAppRoot, 'src/routes'),
    simulationPublicConfigDir: resolve(reactAppRoot, 'public/config'),
    siteAppPath: resolve(reactAppRoot, 'src/components/app/SiteApp.jsx'),
    routeRegistryPath: resolve(reactAppRoot, 'src/lib/route-manifest.js'),
    viteConfigPath: resolve(reactAppRoot, 'vite.config.js'),
  };
  const catalog = await readSimulationCatalog();
  const simulation = catalog.simulations.find((entry) => entry.id === 'beach-ball-room');
  const fixtureCatalog = { ...catalog, simulations: [simulation] };
  const files = [
    [paths.simulationCatalogPath, `${JSON.stringify(fixtureCatalog, null, 2)}\n`],
    [paths.simulationActivityPath, '{"id":"beach-ball-room","type":"probe"}\n{"id":"other","type":"keep"}\n'],
    [paths.routeRegistryPath, await readFile(SIMULATION_ADMIN_PATHS.routeRegistryPath, 'utf8')],
    [paths.viteConfigPath, await readFile(SIMULATION_ADMIN_PATHS.viteConfigPath, 'utf8')],
    [paths.siteAppPath, await readFile(SIMULATION_ADMIN_PATHS.siteAppPath, 'utf8')],
    [resolve(paths.simulationLabDir, 'beach-ball-room.html'), await readFile(resolve(SIMULATION_ADMIN_PATHS.simulationLabDir, 'beach-ball-room.html'), 'utf8')],
    [resolve(paths.simulationEntriesDir, 'beach-ball-room.jsx'), 'export const fixture = true;\n'],
    [resolve(paths.simulationRoutesDir, 'beach-ball-room/fixture.txt'), 'route fixture\n'],
    [resolve(paths.simulationPreviewsDir, 'beach-ball-room/poster.png'), 'preview fixture\n'],
    [resolve(paths.simulationPitchesDir, '2026-06-25-beach-ball-room.md'), 'pitch fixture\n'],
  ];
  for (const [filePath, content] of files) {
    await mkdir(resolve(filePath, '..'), { recursive: true });
    await writeFile(filePath, content, 'utf8');
  }
  await mkdir(paths.simulationIssuesDir, { recursive: true });
  return { root, paths };
}

async function snapshotTree(root) {
  const snapshot = {};
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const filePath = resolve(directory, entry.name);
      const key = relative(root, filePath).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        snapshot[`${key}/`] = null;
        await visit(filePath);
      } else {
        snapshot[key] = await readFile(filePath, 'utf8');
      }
    }
  }
  await visit(root);
  return snapshot;
}

test('dedicated lab deletion updates manifest, Vite, and SiteApp only after every edit preflights', async (t) => {
  await t.test('supported combined SiteApp descriptor is removed with its route wiring', async () => {
    const { root, paths } = await createRouteSourceCopies();
    try {
      await applySimulationRouteDeletionSourceEdits({ id: 'beach-ball-room', ...paths });
      const [manifest, vite, siteApp] = await Promise.all([
        readFile(paths.routeRegistryPath, 'utf8'),
        readFile(paths.viteConfigPath, 'utf8'),
        readFile(paths.siteAppPath, 'utf8'),
      ]);
      assert.doesNotMatch(manifest, /'beach-ball-room': \{/);
      assert.doesNotMatch(vite, /'lab\/beach-ball-room': resolve/);
      assert.doesNotMatch(siteApp, /BeachBallRoomRoute\.jsx/);
      assert.doesNotMatch(siteApp, /'beach-ball-room': defineRouteDescriptor/);
      assert.match(manifest, /'flock-of-birds': \{/);
      assert.match(siteApp, /'flock-of-birds': defineRouteDescriptor/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await t.test('incompatible SiteApp shape leaves all source files byte-identical', async () => {
    const { root, paths } = await createRouteSourceCopies();
    try {
      const incompatibleSiteApp = (await readFile(paths.siteAppPath, 'utf8')).replace(
        "getView: getBeachBallRoomRouteView, runtime: BEACH_BALL_ROOM_ROUTE_RUNTIME",
        "getView: incompatibleBeachBallView, runtime: BEACH_BALL_ROOM_ROUTE_RUNTIME",
      );
      await writeFile(paths.siteAppPath, incompatibleSiteApp, 'utf8');
      const before = await Promise.all(Object.values(paths).map((path) => readFile(path, 'utf8')));

      await assert.rejects(
        applySimulationRouteDeletionSourceEdits({ id: 'beach-ball-room', ...paths }),
        (error) => error?.statusCode === 409 && /SiteApp descriptor/.test(error.message),
      );

      const after = await Promise.all(Object.values(paths).map((path) => readFile(path, 'utf8')));
      assert.deepEqual(after, before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

test('simulation deletion is atomic, rollback-safe, and serialized', async (t) => {
  await t.test('write, quarantine rename, and install rename failures restore exact state', async () => {
    for (const failure of [
      { method: 'writeFile', at: 3 },
      { method: 'rename', at: 4 },
      { method: 'rename', at: 12 },
    ]) {
      const { root, paths } = await createDeletionFixture();
      try {
        const before = await snapshotTree(root);
        await assert.rejects(
          deleteSimulation({
            id: 'beach-ball-room',
            confirmId: 'beach-ball-room',
            paths,
            transactionIo: createFailingTransactionIo(failure),
          }),
          new RegExp(`Injected ${failure.method} failure`),
        );
        assert.deepEqual(
          await snapshotTree(root),
          before,
          `${failure.method} call ${failure.at} must restore every replacement and deletion`,
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  });

  await t.test('overlapping deletion requests cannot observe a mixed revision', async () => {
    const { root, paths } = await createDeletionFixture();
    try {
      const results = await Promise.allSettled([
        deleteSimulation({ id: 'beach-ball-room', confirmId: 'beach-ball-room', paths }),
        deleteSimulation({ id: 'beach-ball-room', confirmId: 'beach-ball-room', paths }),
      ]);
      assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
      const rejected = results.find(({ status }) => status === 'rejected');
      assert.equal(rejected.reason?.statusCode, 404);

      const catalog = JSON.parse(await readFile(paths.simulationCatalogPath, 'utf8'));
      assert.equal(catalog.simulations.some(({ id }) => id === 'beach-ball-room'), false);
      assert.doesNotMatch(await readFile(paths.routeRegistryPath, 'utf8'), /'beach-ball-room': \{/);
      assert.doesNotMatch(await readFile(paths.viteConfigPath, 'utf8'), /'lab\/beach-ball-room': resolve/);
      assert.doesNotMatch(await readFile(paths.siteAppPath, 'utf8'), /BeachBallRoomRoute\.jsx/);
      assert.equal(
        Object.keys(await snapshotTree(root)).some((path) => path.includes('beach-ball-room')),
        false,
      );
      assert.equal(
        Object.keys(await snapshotTree(root)).some((path) => path.includes('.abs-local-file-transaction-')),
        false,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

test('simulation admin catalog, activity, and issue mutations are atomic and serialized', async (t) => {
  await t.test('catalog and activity staging failures restore exact state', async () => {
    for (const failure of [
      { method: 'writeFile', at: 2, label: 'catalog' },
      { method: 'writeFile', at: 3, label: 'activity' },
    ]) {
      const { root, paths } = await createDeletionFixture();
      try {
        const before = await snapshotTree(root);
        await assert.rejects(
          updateSimulationStage({
            id: 'beach-ball-room',
            stage: 'hidden',
            catalogPath: paths.simulationCatalogPath,
            activityPath: paths.simulationActivityPath,
            transactionRoot: root,
            transactionIo: createFailingTransactionIo(failure),
          }),
          /Injected writeFile failure/,
        );
        assert.deepEqual(
          await snapshotTree(root),
          before,
          `${failure.label} staging failure must preserve catalog and activity`,
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  });

  await t.test('overlapping stage and review mutations retain both updates and activities', async () => {
    const { root, paths } = await createDeletionFixture();
    const shared = {
      catalogPath: paths.simulationCatalogPath,
      activityPath: paths.simulationActivityPath,
      transactionRoot: root,
    };
    try {
      await Promise.all([
        updateSimulationStage({ id: 'beach-ball-room', stage: 'hidden', ...shared }),
        updateSimulationReviewStatus({ id: 'beach-ball-room', reviewStatus: 'disabled', ...shared }),
      ]);
      const catalog = await readSimulationCatalog(paths.simulationCatalogPath);
      const simulation = catalog.simulations.find(({ id }) => id === 'beach-ball-room');
      assert.equal(simulation.stage, 'hidden');
      assert.equal(simulation.reviewStatus, 'disabled');
      const activity = (await readFile(paths.simulationActivityPath, 'utf8'))
        .trim().split('\n').map((line) => JSON.parse(line));
      assert.equal(activity.filter(({ type }) => type === 'stage-change').length, 1);
      assert.equal(activity.filter(({ type }) => type === 'review-status-change').length, 1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await t.test('issue activity failure does not leave an unlogged issue file', async () => {
    const { root, paths } = await createDeletionFixture();
    try {
      const before = await snapshotTree(root);
      await assert.rejects(
        createSimulationIssue({
          id: 'beach-ball-room',
          title: 'Must roll back',
          catalogPath: paths.simulationCatalogPath,
          issuesDir: paths.simulationIssuesDir,
          activityPath: paths.simulationActivityPath,
          transactionRoot: root,
          transactionIo: createFailingTransactionIo({ method: 'writeFile', at: 3 }),
        }),
        /Injected writeFile failure/,
      );
      assert.deepEqual(await snapshotTree(root), before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await t.test('identical concurrent issue titles receive unique files and retain every activity', async () => {
    const { root, paths } = await createDeletionFixture();
    const shared = {
      catalogPath: paths.simulationCatalogPath,
      issuesDir: paths.simulationIssuesDir,
      activityPath: paths.simulationActivityPath,
      transactionRoot: root,
    };
    try {
      const created = await Promise.all([
        createSimulationIssue({
          id: 'beach-ball-room',
          title: 'Identical concurrent issue',
          note: 'First unique note',
          ...shared,
        }),
        createSimulationIssue({
          id: 'beach-ball-room',
          title: 'Identical concurrent issue',
          note: 'Second unique note',
          ...shared,
        }),
      ]);
      assert.notEqual(created[0].filePath, created[1].filePath);
      assert.match(await readFile(created[0].filePath, 'utf8'), /First unique note/);
      assert.match(await readFile(created[1].filePath, 'utf8'), /Second unique note/);
      const activity = (await readFile(paths.simulationActivityPath, 'utf8'))
        .trim().split('\n').map((line) => JSON.parse(line));
      assert.equal(activity.filter(({ type }) => type === 'issue-created').length, 2);
      assert.equal(
        new Set(activity.filter(({ type }) => type === 'issue-created').map(({ issue }) => issue)).size,
        2,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await t.test('overlapping issue status updates retain both activities', async () => {
    const { root, paths } = await createDeletionFixture();
    const shared = {
      catalogPath: paths.simulationCatalogPath,
      issuesDir: paths.simulationIssuesDir,
      activityPath: paths.simulationActivityPath,
      transactionRoot: root,
    };
    try {
      const created = await createSimulationIssue({
        id: 'beach-ball-room',
        title: 'Concurrent status issue',
        ...shared,
      });
      const fileName = created.filePath.split('/').at(-1);
      await Promise.all([
        updateSimulationIssueStatus({ fileName, status: 'resolved', ...shared }),
        updateSimulationIssueStatus({ fileName, status: 'open', ...shared }),
      ]);
      assert.match(await readFile(created.filePath, 'utf8'), /^- Status: open$/m);
      const activity = (await readFile(paths.simulationActivityPath, 'utf8'))
        .trim().split('\n').map((line) => JSON.parse(line));
      assert.equal(activity.filter(({ type }) => type === 'issue-status-change').length, 2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

test('simulation validation defers base route identity to the manifest validator', async () => {
  const [catalog, routesSource, viteSource, siteAppSource] = await Promise.all([
    readSimulationCatalog(),
    readFile(SIMULATION_ADMIN_PATHS.routeRegistryPath, 'utf8'),
    readFile(SIMULATION_ADMIN_PATHS.viteConfigPath, 'utf8'),
    readFile(SIMULATION_ADMIN_PATHS.siteAppPath, 'utf8'),
  ]);

  const baseRouteMutationErrors = [];
  addRouteSourceValidationErrors(baseRouteMutationErrors, catalog.simulations, {
    routesSource: routesSource.replace("path: '/index.html'", "path: '/renamed-home.html'"),
    viteSource,
    siteAppSource,
  });
  assert.equal(
    baseRouteMutationErrors.some((message) => message.startsWith('home:')),
    false,
    'The simulation validator must not maintain a competing Home path contract',
  );

  const catalogRouteMutationErrors = [];
  addRouteSourceValidationErrors(catalogRouteMutationErrors, catalog.simulations, {
    routesSource: routesSource.replace(
      "path: '/lab/beach-ball-room.html'",
      "path: '/lab/renamed-beach-ball-room.html'",
    ),
    viteSource,
    siteAppSource,
  });
  assert.ok(catalogRouteMutationErrors.some((message) => (
    message.startsWith('beach-ball-room: route manifest path')
  )));
});
