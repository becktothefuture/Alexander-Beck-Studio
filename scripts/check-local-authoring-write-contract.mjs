import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { createDevAdminPlugin } from '../react-app/app/vite.dev-admin-plugin.js';
import {
  ABOUT_NARRATIVE_EDITOR_HEADER,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';
import {
  SIMULATION_ADMIN_PATHS,
  readSimulationCatalog,
} from './lib/simulation-admin-store.mjs';
import { flattenDesignConfigDir } from './lib/flatten-design-config.mjs';
import {
  LOCAL_FILE_TRANSACTION_IO,
  applyLocalFileTransaction,
} from './lib/local-file-transaction.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const canonicalConfigDir = resolve(repoRoot, 'react-app/app/public/config');
const canonicalAboutPath = resolve(canonicalConfigDir, 'contents-about.json');
const canonicalDesignSystemPath = resolve(canonicalConfigDir, 'design-system.json');

function createResponse() {
  const headers = new Map();
  return {
    statusCode: 200,
    body: '',
    setHeader(name, value) {
      headers.set(String(name).toLowerCase(), String(value));
    },
    getHeader(name) {
      return headers.get(String(name).toLowerCase());
    },
    end(chunk = '') {
      this.body += String(chunk);
    },
  };
}

function createRequest({
  method = 'POST',
  body = '{}',
  headers = {},
  encrypted = false,
} = {}) {
  const request = Readable.from(body ? [Buffer.from(body)] : []);
  request.method = method;
  request.socket = { encrypted };
  request.headers = {
    host: 'studio.local:8012',
    origin: 'http://studio.local:8012',
    'content-type': 'application/json',
    ...headers,
  };
  return request;
}

function createAdminHarness(publicConfigDir, options = {}) {
  const handlers = new Map();
  const websocketMessages = [];
  const plugin = createDevAdminPlugin({ publicConfigDir, ...options });
  plugin.configureServer({
    middlewares: {
      use(path, handler) {
        handlers.set(path, handler);
      },
    },
    ws: {
      send(message) {
        websocketMessages.push(message);
      },
    },
  });

  return {
    handlers,
    websocketMessages,
    async request(path, options = {}) {
      const handler = handlers.get(path);
      assert.ok(handler, `Missing middleware for ${path}`);
      const response = createResponse();
      await handler(createRequest(options), response);
      return {
        ...response,
        json: response.body ? JSON.parse(response.body) : null,
      };
    },
  };
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

async function readConfigSnapshot(configDir) {
  const names = [
    'design-system.json',
    'default-config.json',
    'shell-config.json',
    'portfolio-config.json',
    'cv-config.json',
  ];
  return Promise.all(names.map((name) => readFile(resolve(configDir, name), 'utf8')));
}

async function createTemporaryConfigDir() {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'abs-write-contract-'));
  const configDir = resolve(temporaryRoot, 'config');
  await mkdir(configDir, { recursive: true });
  await Promise.all([
    writeFile(
      resolve(configDir, 'contents-about.json'),
      await readFile(canonicalAboutPath, 'utf8'),
      'utf8',
    ),
    writeFile(
      resolve(configDir, 'design-system.json'),
      await readFile(canonicalDesignSystemPath, 'utf8'),
      'utf8',
    ),
  ]);
  return { temporaryRoot, configDir };
}

test('multi-file design config saves are atomic and serialized', async (t) => {
  await t.test('pre-commit write and rename failures restore every byte', async () => {
    for (const failure of [
      { method: 'writeFile', at: 3 },
      { method: 'rename', at: 3 },
      { method: 'rename', at: 7 },
    ]) {
      const { temporaryRoot, configDir } = await createTemporaryConfigDir();
      try {
        await flattenDesignConfigDir(configDir);
        const before = await readConfigSnapshot(configDir);
        const nextConfig = JSON.parse(before[0]);
        nextConfig.version = Number(nextConfig.version || 1) + 100;
        nextConfig.runtime = {
          ...nextConfig.runtime,
          ballMassKg: Number(nextConfig.runtime.ballMassKg) + 0.125,
        };
        nextConfig.shell = {
          ...nextConfig.shell,
          motion: {
            ...nextConfig.shell.motion,
            shellRevealMs: Number(nextConfig.shell.motion.shellRevealMs) + 1,
          },
        };
        nextConfig.portfolio = {
          ...nextConfig.portfolio,
          runtime: {
            ...nextConfig.portfolio.runtime,
            layout: {
              ...nextConfig.portfolio.runtime.layout,
              headerTopSpacing: Number(nextConfig.portfolio.runtime.layout.headerTopSpacing) + 1,
            },
          },
        };
        nextConfig.cv = {
          ...nextConfig.cv,
          leftWidth: Number(nextConfig.cv.leftWidth) + 1,
        };

        await assert.rejects(
          flattenDesignConfigDir(configDir, nextConfig, {
            transactionIo: createFailingTransactionIo(failure),
          }),
          new RegExp(`Injected ${failure.method} failure`),
        );
        assert.deepEqual(
          await readConfigSnapshot(configDir),
          before,
          `${failure.method} call ${failure.at} must restore all config files`,
        );
      } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
      }
    }
  });

  await t.test('partial post-commit cleanup preserves the committed revision and fails closed later', async () => {
    const { temporaryRoot, configDir } = await createTemporaryConfigDir();
    try {
      await flattenDesignConfigDir(configDir);
      const nextConfig = JSON.parse(await readFile(resolve(configDir, 'design-system.json'), 'utf8'));
      nextConfig.version = Number(nextConfig.version || 1) + 50;
      const partialCleanupIo = {
        ...LOCAL_FILE_TRANSACTION_IO,
        async rm(targetPath, options) {
          if (String(targetPath).includes('.abs-local-file-transaction-')
            && String(targetPath).endsWith('/quarantine')) {
            const quarantined = await readdir(targetPath);
            if (quarantined[0]) {
              await LOCAL_FILE_TRANSACTION_IO.rm(resolve(targetPath, quarantined[0]), {
                recursive: true,
                force: true,
              });
            }
            throw new Error('Injected partial cleanup failure');
          }
          return LOCAL_FILE_TRANSACTION_IO.rm(targetPath, options);
        },
      };

      const result = await flattenDesignConfigDir(configDir, nextConfig, {
        transactionIo: partialCleanupIo,
      });
      assert.equal(result.designSystem.version, nextConfig.version);
      assert.equal(
        JSON.parse(await readFile(resolve(configDir, 'design-system.json'), 'utf8')).version,
        nextConfig.version,
      );
      const orphan = (await readdir(configDir)).find((name) => (
        name.startsWith('.abs-local-file-transaction-')
      ));
      assert.ok(orphan, 'cleanup failure must leave discoverable transaction state');
      await assert.rejects(
        flattenDesignConfigDir(configDir, { ...nextConfig, version: nextConfig.version + 1 }),
        (error) => error?.code === 'ABS_LOCAL_FILE_TRANSACTION_ORPHAN',
      );
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  await t.test('a fsynced COMMITTED marker makes later directory-sync failure irrevocable', async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'abs-transaction-commit-boundary-'));
    const firstPath = resolve(temporaryRoot, 'first.json');
    const secondPath = resolve(temporaryRoot, 'second.json');
    await writeFile(firstPath, 'first-original\n', 'utf8');
    await writeFile(secondPath, 'second-original\n', 'utf8');
    let transactionDirectorySyncs = 0;
    let renameCalls = 0;
    const transactionIo = {
      ...LOCAL_FILE_TRANSACTION_IO,
      async open(filePath, ...args) {
        const handle = await LOCAL_FILE_TRANSACTION_IO.open(filePath, ...args);
        const isTransactionDirectory = /\/\.abs-local-file-transaction-[^/]+$/.test(String(filePath));
        if (!isTransactionDirectory) return handle;
        return new Proxy(handle, {
          get(target, property) {
            if (property === 'sync') {
              return async () => {
                transactionDirectorySyncs += 1;
                if (transactionDirectorySyncs === 2) {
                  throw new Error('Injected post-COMMITTED directory sync failure');
                }
                return target.sync();
              };
            }
            const value = Reflect.get(target, property, target);
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
      },
      async rename(...args) {
        renameCalls += 1;
        if (renameCalls >= 5) throw new Error('Rollback must not run after COMMITTED');
        return LOCAL_FILE_TRANSACTION_IO.rename(...args);
      },
    };
    try {
      const result = await applyLocalFileTransaction({
        rootPath: temporaryRoot,
        replacements: [
          { path: firstPath, content: 'first-next\n' },
          { path: secondPath, content: 'second-next\n' },
        ],
      }, { io: transactionIo });
      assert.equal(result.committed, true);
      assert.equal(result.cleanupPending, true);
      assert.match(result.cleanupError.message, /post-COMMITTED directory sync failure/);
      assert.equal(renameCalls, 4, 'no rollback rename may run after COMMITTED is fsynced');
      assert.equal(await readFile(firstPath, 'utf8'), 'first-next\n');
      assert.equal(await readFile(secondPath, 'utf8'), 'second-next\n');

      const orphanName = (await readdir(temporaryRoot)).find((name) => (
        name.startsWith('.abs-local-file-transaction-')
      ));
      const orphanEntries = await readdir(resolve(temporaryRoot, orphanName));
      assert.ok(orphanEntries.includes('COMMITTED'));
      assert.equal(orphanEntries.includes('ROLLED_BACK'), false);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  await t.test('the transaction root is fsynced before the first target rename', async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'abs-transaction-root-sync-'));
    const targetPath = resolve(temporaryRoot, 'target.json');
    await writeFile(targetPath, 'original\n', 'utf8');
    const events = [];
    const transactionIo = {
      ...LOCAL_FILE_TRANSACTION_IO,
      async open(filePath, ...args) {
        const handle = await LOCAL_FILE_TRANSACTION_IO.open(filePath, ...args);
        return new Proxy(handle, {
          get(target, property) {
            if (property === 'sync') {
              return async () => {
                events.push(`sync:${filePath}`);
                return target.sync();
              };
            }
            const value = Reflect.get(target, property, target);
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
      },
      async rename(...args) {
        events.push(`rename:${args[0]}`);
        return LOCAL_FILE_TRANSACTION_IO.rename(...args);
      },
    };
    try {
      await applyLocalFileTransaction({
        rootPath: temporaryRoot,
        replacements: [{ path: targetPath, content: 'next\n' }],
      }, { io: transactionIo });
      const firstRenameIndex = events.findIndex((event) => event.startsWith('rename:'));
      const rootSyncIndex = events.findIndex((event) => event === `sync:${temporaryRoot}`);
      const journalSyncIndex = events.findIndex((event) => (
        event.startsWith(`sync:${temporaryRoot}/.abs-local-file-transaction-`)
        && !event.includes('/staged')
        && !event.includes('/quarantine')
      ));
      assert.ok(journalSyncIndex >= 0);
      assert.ok(rootSyncIndex > journalSyncIndex);
      assert.ok(firstRenameIndex > rootSyncIndex);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  await t.test('rollback terminal state remains unambiguous when cleanup or marker writing fails', async () => {
    for (const markerFailure of [false, true]) {
      const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'abs-transaction-rollback-state-'));
      const firstPath = resolve(temporaryRoot, 'first.json');
      const secondPath = resolve(temporaryRoot, 'second.json');
      await writeFile(firstPath, 'first-original\n', 'utf8');
      await writeFile(secondPath, 'second-original\n', 'utf8');
      let renameCalls = 0;
      let rmCalls = 0;
      const transactionIo = {
        ...LOCAL_FILE_TRANSACTION_IO,
        async open(filePath, ...args) {
          if (markerFailure && String(filePath).endsWith('/ROLLED_BACK')) {
            throw new Error('Injected rollback marker failure');
          }
          return LOCAL_FILE_TRANSACTION_IO.open(filePath, ...args);
        },
        async rename(...args) {
          renameCalls += 1;
          if (renameCalls === 4) throw new Error('Injected second install failure');
          return LOCAL_FILE_TRANSACTION_IO.rename(...args);
        },
        async rm(...args) {
          rmCalls += 1;
          if (!markerFailure && rmCalls === 2) {
            throw new Error('Injected rollback cleanup failure');
          }
          return LOCAL_FILE_TRANSACTION_IO.rm(...args);
        },
      };
      try {
        await assert.rejects(
          applyLocalFileTransaction({
            rootPath: temporaryRoot,
            replacements: [
              { path: firstPath, content: 'first-next\n' },
              { path: secondPath, content: 'second-next\n' },
            ],
          }, { io: transactionIo }),
          /Injected second install failure/,
        );
        assert.equal(await readFile(firstPath, 'utf8'), 'first-original\n');
        assert.equal(await readFile(secondPath, 'utf8'), 'second-original\n');

        const orphanName = (await readdir(temporaryRoot)).find((name) => (
          name.startsWith('.abs-local-file-transaction-')
        ));
        assert.ok(orphanName);
        const orphanPath = resolve(temporaryRoot, orphanName);
        const orphanEntries = await readdir(orphanPath);
        assert.ok(orphanEntries.includes('state.json'));
        assert.equal(orphanEntries.includes('COMMITTED'), false);
        assert.equal(orphanEntries.includes('ROLLED_BACK'), !markerFailure);
        const state = JSON.parse(await readFile(resolve(orphanPath, 'state.json'), 'utf8'));
        assert.deepEqual(state.targets.map(({ path }) => path), [firstPath, secondPath]);
        await assert.rejects(
          applyLocalFileTransaction({
            rootPath: temporaryRoot,
            replacements: [{ path: firstPath, content: 'blocked\n' }],
          }),
          (error) => error?.code === 'ABS_LOCAL_FILE_TRANSACTION_ORPHAN',
        );
      } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
      }
    }
  });

  await t.test('real containment rejects symlink-parent escapes for existing and missing targets', async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'abs-transaction-containment-'));
    const root = resolve(temporaryRoot, 'root');
    const outside = resolve(temporaryRoot, 'outside');
    await mkdir(root);
    await mkdir(outside);
    const outsideVictim = resolve(outside, 'victim.txt');
    await writeFile(outsideVictim, 'outside victim\n', 'utf8');
    await symlink(outside, resolve(root, 'linked'), 'dir');
    try {
      for (const targetPath of [outsideVictim, resolve(root, 'linked/missing.txt')]) {
        const transactionTarget = targetPath === outsideVictim
          ? resolve(root, 'linked/victim.txt')
          : targetPath;
        await assert.rejects(
          applyLocalFileTransaction({
            rootPath: root,
            deletions: [{ path: transactionTarget }],
          }),
          /outside its root/,
        );
      }
      assert.equal(await readFile(outsideVictim, 'utf8'), 'outside victim\n');
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  await t.test('overlapping saves publish one complete revision at a time', async () => {
    const { temporaryRoot, configDir } = await createTemporaryConfigDir();
    try {
      await flattenDesignConfigDir(configDir);
      const base = JSON.parse(await readFile(resolve(configDir, 'design-system.json'), 'utf8'));
      const first = { ...base, version: 701 };
      const second = { ...base, version: 702 };
      const [firstResult, secondResult] = await Promise.all([
        flattenDesignConfigDir(configDir, first),
        flattenDesignConfigDir(configDir, second),
      ]);
      assert.equal(firstResult.designSystem.version, 701);
      assert.equal(secondResult.designSystem.version, 702);
      const finalCanonical = JSON.parse(await readFile(resolve(configDir, 'design-system.json'), 'utf8'));
      const finalRuntime = JSON.parse(await readFile(resolve(configDir, 'default-config.json'), 'utf8'));
      assert.equal(finalCanonical.version, 702);
      assert.deepEqual(finalRuntime, secondResult.derived.runtime);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  await t.test('paired simulation config saves roll back and serialize as one revision', async () => {
    const { temporaryRoot, configDir } = await createTemporaryConfigDir();
    const repelPath = resolve(configDir, 'repel-room-demo.json');
    const wallPath = resolve(configDir, 'wall-repel-demo.json');
    try {
      const harness = createAdminHarness(configDir);
      const baseline = { version: 1, revision: 'baseline' };
      const baselineResponse = await harness.request('/api/repel-room/config', {
        body: JSON.stringify({ config: baseline }),
      });
      assert.equal(baselineResponse.statusCode, 200);
      const before = await Promise.all([readFile(repelPath, 'utf8'), readFile(wallPath, 'utf8')]);

      const failingHarness = createAdminHarness(configDir, {
        transactionIo: createFailingTransactionIo({ method: 'rename', at: 3 }),
      });
      const failed = await failingHarness.request('/api/wall-repel/config', {
        body: JSON.stringify({ config: { version: 1, revision: 'failed' } }),
      });
      assert.equal(failed.statusCode, 500);
      assert.deepEqual(await Promise.all([readFile(repelPath, 'utf8'), readFile(wallPath, 'utf8')]), before);

      const first = { version: 1, revision: 'first' };
      const second = { version: 1, revision: 'second' };
      const responses = await Promise.all([
        harness.request('/api/repel-room/config', { body: JSON.stringify({ config: first }) }),
        harness.request('/api/wall-repel/config', { body: JSON.stringify({ config: second }) }),
      ]);
      assert.deepEqual(responses.map(({ statusCode }) => statusCode), [200, 200]);
      assert.deepEqual(JSON.parse(await readFile(repelPath, 'utf8')), second);
      assert.deepEqual(JSON.parse(await readFile(wallPath, 'utf8')), second);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});

test('local authoring JSON write contract', async (t) => {
  const { temporaryRoot, configDir } = await createTemporaryConfigDir();
  const canonicalAboutBefore = await readFile(canonicalAboutPath, 'utf8');
  const canonicalDesignBefore = await readFile(canonicalDesignSystemPath, 'utf8');
  const canonicalCatalogBefore = await readFile(SIMULATION_ADMIN_PATHS.simulationCatalogPath, 'utf8');
  const canonicalActivityBefore = await readFile(SIMULATION_ADMIN_PATHS.simulationActivityPath, 'utf8').catch(() => '');
  const harness = createAdminHarness(configDir);

  try {
    await t.test('every POST route rejects a cross-origin request before side effects', async () => {
      const writeRoutes = [...harness.handlers.keys()].filter((path) => (
        path !== '/api/simulations/status'
      ));
      assert.ok(writeRoutes.length > 0);

      for (const path of writeRoutes) {
        const headers = { origin: 'https://hostile.example' };
        if (path === '/api/about-narrative/config') {
          headers['x-abs-editor'] = ABOUT_NARRATIVE_EDITOR_HEADER;
        }
        const response = await harness.request(path, { headers });
        assert.equal(response.statusCode, 403, path);
        assert.equal(response.json.ok, false, path);
        assert.match(response.json.error, /development origin/, path);
        assert.equal(response.json.message, response.json.error, path);
      }
    });

    await t.test('origin matching uses the socket scheme and normalized effective Host', async () => {
      const rejectedOrigins = [
        { headers: { origin: undefined }, label: 'missing Origin' },
        { headers: { origin: 'null' }, label: 'opaque Origin' },
        { headers: { origin: 'not-an-origin' }, label: 'malformed Origin' },
        { headers: { origin: 'https://studio.local:8012' }, label: 'cross-scheme Origin' },
        { headers: { origin: 'http://user@studio.local:8012' }, label: 'credentialed Origin' },
        { headers: { origin: 'http://studio.local:8012/' }, label: 'Origin path' },
        { headers: { origin: 'http://studio.local:8012/path' }, label: 'Origin path segment' },
        { headers: { origin: 'http://studio.local:8012\\path' }, label: 'backslash Origin path' },
        { headers: { origin: 'http://studio.local:8012?query=1' }, label: 'Origin query' },
        { headers: { origin: 'http://studio.local:8012#fragment' }, label: 'Origin fragment' },
        { headers: { host: undefined }, label: 'missing Host' },
        { headers: { host: 'studio.local:8012/path' }, label: 'malformed Host' },
        { headers: { host: 'studio.local:8012\\path' }, label: 'backslash Host path' },
        {
          headers: {
            origin: 'https://studio.local:8012',
            'x-forwarded-proto': 'https',
          },
          label: 'untrusted forwarded scheme',
        },
      ];

      for (const options of rejectedOrigins) {
        const response = await harness.request('/api/design-system/config', options);
        assert.equal(response.statusCode, 403, options.label);
      }

      const equivalentOrigins = [
        {
          headers: { host: 'STUDIO.LOCAL:80', origin: 'http://studio.local' },
          label: 'HTTP Host case and default port',
        },
        {
          headers: { host: 'studio.local', origin: 'http://STUDIO.local:80' },
          label: 'HTTP Origin case and default port',
        },
        {
          encrypted: true,
          headers: { host: 'STUDIO.LOCAL:443', origin: 'https://studio.local' },
          label: 'HTTPS Host case and default port',
        },
      ];

      for (const options of equivalentOrigins) {
        const response = await harness.request('/api/design-system/config', options);
        assert.equal(response.statusCode, 400, options.label);
        assert.equal(response.json.error, 'Missing config payload', options.label);
      }
    });

    await t.test('method, media type, size, JSON, and endpoint validation use one error contract', async () => {
      const method = await harness.request('/api/design-system/config', { method: 'PUT' });
      assert.equal(method.statusCode, 405);

      const mediaType = await harness.request('/api/design-system/config', {
        headers: { 'content-type': 'text/plain' },
      });
      assert.equal(mediaType.statusCode, 415);

      const oversized = await harness.request('/api/design-system/config', {
        body: '',
        headers: { 'content-length': String(1024 * 1024 + 1) },
      });
      assert.equal(oversized.statusCode, 413);

      const oversizedStream = 'x'.repeat(1024 * 1024 + 1);
      const streamedWithoutLength = await harness.request('/api/design-system/config', {
        body: oversizedStream,
      });
      assert.equal(streamedWithoutLength.statusCode, 413);

      const streamedWithUnderreportedLength = await harness.request('/api/design-system/config', {
        body: oversizedStream,
        headers: { 'content-length': '2' },
      });
      assert.equal(streamedWithUnderreportedLength.statusCode, 413);

      const malformed = await harness.request('/api/design-system/config', { body: '{"config":' });
      assert.equal(malformed.statusCode, 400);
      assert.match(malformed.json.error, /valid JSON/);

      const invalid = await harness.request('/api/design-system/config', { body: '{}' });
      assert.equal(invalid.statusCode, 400);
      assert.equal(invalid.json.error, 'Missing config payload');

      for (const response of [
        method,
        mediaType,
        oversized,
        streamedWithoutLength,
        streamedWithUnderreportedLength,
        malformed,
        invalid,
      ]) {
        assert.equal(response.json.ok, false);
        assert.equal(response.json.message, response.json.error);
        assert.equal(response.getHeader('content-type'), 'application/json');
      }
    });

    await t.test('configured paths and user-controlled issue paths cannot escape allowlists', async () => {
      assert.throws(
        () => createDevAdminPlugin({
          publicConfigDir: configDir,
          aboutNarrativeConfigPath: resolve(configDir, '../outside.json'),
        }),
        /outside its allowlisted roots/,
      );

      const outsideDirectory = resolve(temporaryRoot, 'outside');
      const linkedDirectory = resolve(configDir, 'linked-directory');
      const outsideAboutPath = resolve(outsideDirectory, 'contents-about.json');
      const linkedAboutPath = resolve(configDir, 'linked-about.json');
      await mkdir(outsideDirectory);
      await writeFile(outsideAboutPath, canonicalAboutBefore, 'utf8');
      await symlink(outsideDirectory, linkedDirectory, 'dir');
      await symlink(outsideAboutPath, linkedAboutPath, 'file');

      for (const aboutNarrativeConfigPath of [
        resolve(linkedDirectory, 'contents-about.json'),
        linkedAboutPath,
      ]) {
        assert.throws(
          () => createDevAdminPlugin({ publicConfigDir: configDir, aboutNarrativeConfigPath }),
          /outside its allowlisted roots/,
        );
      }

      const traversal = await harness.request('/api/simulations/issues/status', {
        body: JSON.stringify({ fileName: '../outside.md', status: 'resolved' }),
      });
      assert.equal(traversal.statusCode, 400);
      assert.equal(traversal.json.error, 'Invalid issue file name');
    });

    await t.test('valid design, simulation config, simulation admin, and About saves retain response contracts', async () => {
      const designSystem = JSON.parse(canonicalDesignBefore);
      const playgroundSentinel = {
        ...designSystem.playground,
        layoutPreset: 'loose',
        layoutSeed: 1618033,
        minimumWorldRows: 104,
        dotOpacity: 0.59,
        wheelSensitivity: 1.17,
      };
      designSystem.playground = {
        ...playgroundSentinel,
        diagnostics: { projectCount: 999 },
      };
      const design = await harness.request('/api/design-system/config', {
        body: JSON.stringify({ config: designSystem }),
      });
      assert.deepEqual(design.json, { ok: true, version: designSystem.version ?? 1 });
      assert.deepEqual(
        JSON.parse(await readFile(resolve(configDir, 'design-system.json'), 'utf8')).playground,
        playgroundSentinel,
        'the local design save must preserve nested Playground values',
      );

      const flockConfig = { version: 1, contractProbe: true };
      const flock = await harness.request('/api/flock-of-birds/config', {
        body: JSON.stringify({ config: flockConfig }),
      });
      assert.deepEqual(flock.json, { ok: true });
      assert.deepEqual(
        JSON.parse(await readFile(resolve(configDir, 'flock-of-birds-demo.json'), 'utf8')),
        flockConfig,
      );

      const catalog = await readSimulationCatalog();
      const unchangedSimulation = catalog.simulations.find((entry) => entry.reviewStatus);
      assert.ok(unchangedSimulation, 'Expected one simulation with a review status');
      const simulation = await harness.request('/api/simulations/review-status', {
        body: JSON.stringify({
          id: unchangedSimulation.id,
          reviewStatus: unchangedSimulation.reviewStatus,
        }),
      });
      assert.equal(simulation.statusCode, 200);
      assert.equal(simulation.json.ok, true);
      assert.equal(simulation.json.changed, false);

      const aboutGet = await harness.request('/api/about-narrative/config', {
        method: 'GET',
        body: '',
        headers: { 'x-abs-editor': ABOUT_NARRATIVE_EDITOR_HEADER },
      });
      assert.equal(aboutGet.statusCode, 200);
      assert.equal(aboutGet.getHeader('etag'), `"${aboutGet.json.hash}"`);

      const aboutSave = await harness.request('/api/about-narrative/config', {
        body: JSON.stringify(aboutGet.json.document),
        headers: {
          'x-abs-editor': ABOUT_NARRATIVE_EDITOR_HEADER,
          'if-match': aboutGet.json.hash,
        },
      });
      assert.equal(aboutSave.statusCode, 200);
      assert.deepEqual(Object.keys(aboutSave.json).sort(), ['document', 'hash', 'ok']);
      assert.equal(aboutSave.getHeader('etag'), `"${aboutSave.json.hash}"`);

      assert.equal(
        harness.handlers.has('/api/about-narrative/v2/config'),
        false,
        'The promoted About source must not retain a second writable endpoint.',
      );
    });

    await t.test('About validation and conflict behavior keep diagnostics and ETag recovery data', async () => {
      const current = await harness.request('/api/about-narrative/config', {
        method: 'GET',
        body: '',
        headers: { 'x-abs-editor': ABOUT_NARRATIVE_EDITOR_HEADER },
      });
      const conflict = await harness.request('/api/about-narrative/config', {
        body: JSON.stringify(current.json.document),
        headers: {
          'x-abs-editor': ABOUT_NARRATIVE_EDITOR_HEADER,
          'if-match': 'stale-hash',
        },
      });
      assert.equal(conflict.statusCode, 409);
      assert.equal(conflict.json.currentHash, current.json.hash);

      const validation = await harness.request('/api/about-narrative/config', {
        body: '{}',
        headers: {
          'x-abs-editor': ABOUT_NARRATIVE_EDITOR_HEADER,
          'if-match': current.json.hash,
        },
      });
      assert.equal(validation.statusCode, 422);
      assert.ok(Array.isArray(validation.json.diagnostics));
      assert.ok(validation.json.diagnostics.length > 0);
    });

    await t.test('the public mirror still returns 404 before any local authoring middleware', async () => {
      const previousPublicDev = process.env.ABS_PUBLIC_DEV;
      process.env.ABS_PUBLIC_DEV = '1';
      try {
        const { default: resolveViteConfig } = await import('../react-app/app/vite.config.js');
        const config = resolveViteConfig({ mode: 'development' });
        const guard = config.plugins.find((plugin) => plugin?.name === 'abs-public-dev-guard');
        assert.ok(guard, 'Expected the public development guard plugin');
        assert.equal(
          config.plugins.some((plugin) => plugin?.name === 'design-system-dev-plugin'),
          false,
        );

        let middleware;
        guard.configureServer({
          middlewares: {
            use(handler) {
              middleware = handler;
            },
          },
        });
        assert.equal(typeof middleware, 'function');

        for (const url of ['/api', '/api/design-system/config', '/@fs/private-file']) {
          const response = createResponse();
          let nextCalled = false;
          middleware({ url }, response, () => { nextCalled = true; });
          assert.equal(response.statusCode, 404, url);
          assert.equal(nextCalled, false, url);
        }

        let nextCalled = false;
        middleware({ url: '/index.html' }, createResponse(), () => { nextCalled = true; });
        assert.equal(nextCalled, true);
      } finally {
        if (previousPublicDev === undefined) delete process.env.ABS_PUBLIC_DEV;
        else process.env.ABS_PUBLIC_DEV = previousPublicDev;
      }
    });
  } finally {
    assert.equal(await readFile(canonicalAboutPath, 'utf8'), canonicalAboutBefore);
    assert.equal(await readFile(canonicalDesignSystemPath, 'utf8'), canonicalDesignBefore);
    assert.equal(
      await readFile(SIMULATION_ADMIN_PATHS.simulationCatalogPath, 'utf8'),
      canonicalCatalogBefore,
    );
    assert.equal(
      await readFile(SIMULATION_ADMIN_PATHS.simulationActivityPath, 'utf8').catch(() => ''),
      canonicalActivityBefore,
    );
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
