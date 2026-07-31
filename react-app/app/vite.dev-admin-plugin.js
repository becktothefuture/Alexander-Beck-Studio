import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { lstatSync, realpathSync } from 'node:fs';
import {
  writeFile,
} from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import process from 'node:process';
import { flattenDesignConfigDir } from '../../scripts/lib/flatten-design-config.mjs';
import { runLocalFileTransaction } from '../../scripts/lib/local-file-transaction.mjs';
import {
  SIMULATION_ADMIN_PATHS,
  createSimulationIssue,
  createSimulationDeletionPlan,
  deleteSimulation,
  getSimulationDashboardStatus,
  updateSimulationIssueStatus,
  updateSimulationReviewStatus,
  updateSimulationStage,
} from '../../scripts/lib/simulation-admin-store.mjs';
import { normalizeLoaderPlaygroundConfig } from './src/routes/loader-playground/loaderPlaygroundControls.js';
import { normalizeAtmosphereLabConfig } from './src/routes/atmosphere-lab/atmosphereLabControls.js';
import {
  ABOUT_NARRATIVE_EDITOR_HEADER,
  ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES,
} from './src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';
import { createAboutNarrativePersistenceService } from './src/routes/about-narrative-lab/aboutNarrativePersistenceServer.js';

const repoRoot = SIMULATION_ADMIN_PATHS.repoRoot;
const KIBIBYTE = 1024;
const LOCAL_JSON_WRITE_LIMITS = Object.freeze({
  aboutNarrative: ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES,
  designSystem: 1024 * KIBIBYTE,
  simulationConfig: 256 * KIBIBYTE,
  simulationAdmin: 256 * KIBIBYTE,
});
let aboutNarrativeEditorWrite = null;

export function shouldSuppressAboutNarrativeEditorReload(file) {
  if (!aboutNarrativeEditorWrite) return false;
  const matches = aboutNarrativeEditorWrite.file === file
    && Date.now() <= aboutNarrativeEditorWrite.expiresAt;
  if (Date.now() > aboutNarrativeEditorWrite.expiresAt) aboutNarrativeEditorWrite = null;
  return matches;
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function createWriteRequestError(statusCode, message, details = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, details);
  return error;
}

function sendWriteError(res, error, fallbackMessage) {
  const aboutValidation = error?.name === 'AboutNarrativeValidationError';
  const message = error?.message || fallbackMessage;
  sendJson(res, error?.statusCode || (aboutValidation ? 422 : 500), {
    ok: false,
    error: message,
    message,
    diagnostics: aboutValidation ? error.diagnostics : undefined,
    currentHash: error?.currentHash,
    plan: error?.plan,
  });
}

function isJsonContentType(req) {
  const mediaType = String(req.headers['content-type'] || '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase();
  return mediaType === 'application/json';
}

async function readLimitedRequestJson(req, maxBytes, sizeErrorMessage) {
  const contentLengthHeader = req.headers['content-length'];
  const contentLength = contentLengthHeader === undefined
    ? null
    : Number(contentLengthHeader);
  if (contentLength !== null && (!Number.isSafeInteger(contentLength) || contentLength < 0)) {
    throw createWriteRequestError(400, 'Content-Length must be a non-negative integer.');
  }
  if (contentLength !== null && contentLength > maxBytes) {
    throw createWriteRequestError(413, sizeErrorMessage);
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > maxBytes) {
      throw createWriteRequestError(413, sizeErrorMessage);
    }
    chunks.push(Buffer.from(chunk));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw createWriteRequestError(400, 'Request body must contain valid JSON.');
  }
}

function requestIsSameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (typeof origin !== 'string' || typeof host !== 'string') return false;
  if (!origin || origin === 'null' || !host) return false;
  const originSyntax = /^(https?):\/\/[^/?#\\\s]+$/i.exec(origin);
  if (!originSyntax || originSyntax[0] !== origin) return false;
  if (/[@/?#\\\s]/.test(host)) return false;

  const protocol = req.socket?.encrypted ? 'https:' : 'http:';
  try {
    const parsedOrigin = new URL(origin);
    const effectiveRequestUrl = new URL(`${protocol}//${host}`);
    if (parsedOrigin.username || parsedOrigin.password) return false;
    if (effectiveRequestUrl.username || effectiveRequestUrl.password) return false;
    if (effectiveRequestUrl.pathname !== '/' || effectiveRequestUrl.search || effectiveRequestUrl.hash) return false;
    if (parsedOrigin.protocol !== protocol) return false;
    return parsedOrigin.origin === effectiveRequestUrl.origin;
  } catch {
    return false;
  }
}

function resolveRealContainmentPath(filePath) {
  const absolutePath = resolve(filePath);
  let existingAncestor = absolutePath;
  while (true) {
    try {
      lstatSync(existingAncestor);
      break;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    const parentPath = dirname(existingAncestor);
    if (parentPath === existingAncestor) {
      throw new Error(`No existing ancestor is available for local write path: ${absolutePath}`);
    }
    existingAncestor = parentPath;
  }
  const realAncestor = realpathSync(existingAncestor);
  return resolve(realAncestor, relative(existingAncestor, absolutePath));
}

function pathIsWithin(rootPath, targetPath) {
  const realRootPath = resolveRealContainmentPath(rootPath);
  const realTargetPath = resolveRealContainmentPath(targetPath);
  const targetRelativePath = relative(realRootPath, realTargetPath);
  return targetRelativePath === ''
    || (!targetRelativePath.startsWith('..') && !targetRelativePath.startsWith('/'));
}

function assertConfiguredWriteTargets(targetPaths, allowedRootPaths) {
  for (const targetPath of targetPaths) {
    if (!allowedRootPaths.some((rootPath) => pathIsWithin(rootPath, targetPath))) {
      throw new Error(`Refusing to configure a local write outside its allowlisted roots: ${targetPath}`);
    }
  }
}

function validateJsonObject(payload, message = 'Request body must be a JSON object.') {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createWriteRequestError(400, message);
  }
  return payload;
}

function validateConfigPayload(payload, message) {
  const nextConfig = validateJsonObject(payload)?.config;
  if (!nextConfig || typeof nextConfig !== 'object' || Array.isArray(nextConfig)) {
    throw createWriteRequestError(400, message);
  }
  return nextConfig;
}

function createLocalJsonWriteHandler({
  maxBytes,
  sizeErrorMessage = 'Request body exceeds the endpoint size limit.',
  allowedRootPaths = [],
  targetPaths = [],
  authorize = null,
  validate = validateJsonObject,
  handle,
  failureMessage,
}) {
  assertConfiguredWriteTargets(targetPaths, allowedRootPaths);

  return async (req, res) => {
    try {
      if (req.method !== 'POST') {
        throw createWriteRequestError(405, 'Method Not Allowed');
      }
      if (authorize) await authorize(req);
      if (!requestIsSameOrigin(req)) {
        throw createWriteRequestError(403, 'The request must come from this development origin.');
      }
      if (!isJsonContentType(req)) {
        throw createWriteRequestError(415, 'Request requires application/json.');
      }

      const payload = await readLimitedRequestJson(req, maxBytes, sizeErrorMessage);
      const validatedPayload = await validate(payload, req);
      await handle(validatedPayload, req, res);
    } catch (error) {
      sendWriteError(res, error, failureMessage);
    }
  };
}

function runRepoNodeScript(args, { timeoutMs = 120000 } = {}) {
  return runRepoCommand(process.execPath, args, { timeoutMs });
}

function runRepoCommand(command, args, { timeoutMs = 120000 } = {}) {
  return new Promise((resolveCommand) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout = [];
    const stderr = [];
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolveCommand({
        ok: code === 0,
        code,
        signal,
        stdout: Buffer.concat(stdout).toString('utf8').trim(),
        stderr: Buffer.concat(stderr).toString('utf8').trim(),
      });
    });
  });
}

export function createDevAdminPlugin({
  publicConfigDir,
  aboutNarrativeConfigPath: aboutNarrativeConfigPathOverride = null,
  transactionIo,
}) {
  const publicConfigRoot = resolve(publicConfigDir);
  const aboutNarrativeConfigPath = aboutNarrativeConfigPathOverride
    ? resolve(aboutNarrativeConfigPathOverride)
    : resolve(publicConfigRoot, 'contents-about.json');
  const designSystemConfigPaths = [
    'design-system.json',
    'default-config.json',
    'shell-config.json',
    'portfolio-config.json',
    'cv-config.json',
  ].map((fileName) => resolve(publicConfigRoot, fileName));
  const flockOfBirdsConfigPath = resolve(publicConfigRoot, 'flock-of-birds-demo.json');
  const repelRoomConfigPath = resolve(publicConfigRoot, 'repel-room-demo.json');
  const wallRepelConfigPath = resolve(publicConfigRoot, 'wall-repel-demo.json');
  const loaderPlaygroundConfigPath = resolve(publicConfigRoot, 'loader-playground-demo.json');
  const atmosphereLabConfigPath = resolve(publicConfigRoot, 'atmosphere-lab.json');
  assertConfiguredWriteTargets([
    aboutNarrativeConfigPath,
    ...designSystemConfigPaths,
    flockOfBirdsConfigPath,
    repelRoomConfigPath,
    wallRepelConfigPath,
    loaderPlaygroundConfigPath,
    atmosphereLabConfigPath,
  ], [publicConfigRoot]);
  const aboutPersistence = createAboutNarrativePersistenceService({
    configPath: aboutNarrativeConfigPath,
    targetVersion: 6,
  });

  return {
    name: 'design-system-dev-plugin',
    configureServer(server) {
      aboutPersistence.cleanup().catch(() => {});

      const aboutNarrativeWriteHandler = createLocalJsonWriteHandler({
        maxBytes: LOCAL_JSON_WRITE_LIMITS.aboutNarrative,
        sizeErrorMessage: 'The About document exceeds the 1MiB limit.',
        allowedRootPaths: [publicConfigRoot],
        targetPaths: [aboutNarrativeConfigPath],
        authorize(req) {
          if (req.headers['x-abs-editor'] !== ABOUT_NARRATIVE_EDITOR_HEADER) {
            throw createWriteRequestError(403, 'Missing development editor header.');
          }
        },
        validate: validateJsonObject,
        async handle(document, req, res) {
          const result = await aboutPersistence.save(document, req.headers['if-match']);
          aboutNarrativeEditorWrite = {
            file: aboutNarrativeConfigPath,
            expiresAt: Date.now() + 1500,
          };
          res.setHeader('ETag', `"${result.hash}"`);
          sendJson(res, 200, { ok: true, document: result.document, hash: result.hash });
        },
        failureMessage: 'Failed to save About Narrative.',
      });

      server.middlewares.use('/api/about-narrative/config', async (req, res) => {
        if (req.method !== 'GET') {
          await aboutNarrativeWriteHandler(req, res);
          return;
        }
        if (req.headers['x-abs-editor'] !== ABOUT_NARRATIVE_EDITOR_HEADER) {
          sendWriteError(
            res,
            createWriteRequestError(403, 'Missing development editor header.'),
            'Failed to load About Narrative.',
          );
          return;
        }

        try {
          const current = await aboutPersistence.read();
          res.setHeader('ETag', `"${current.hash}"`);
          res.setHeader('Cache-Control', 'no-store');
          sendJson(res, 200, { ok: true, document: current.document, hash: current.hash });
        } catch (error) {
          sendWriteError(res, error, 'Failed to load About Narrative.');
        }
      });

      server.middlewares.use('/api/design-system/config', createLocalJsonWriteHandler({
        maxBytes: LOCAL_JSON_WRITE_LIMITS.designSystem,
        allowedRootPaths: [publicConfigRoot],
        targetPaths: designSystemConfigPaths,
        validate(payload) {
          return validateConfigPayload(payload, 'Missing config payload');
        },
        async handle(nextConfig, req, res) {
          const { designSystem: normalized } = await flattenDesignConfigDir(publicConfigDir, nextConfig, {
            transactionIo,
          });
          server.ws.send({
            type: 'full-reload',
            path: '/config/design-system.json',
          });

          sendJson(res, 200, { ok: true, version: normalized.version ?? 1 });
        },
        failureMessage: 'Failed to save design system',
      }));

      server.middlewares.use('/api/flock-of-birds/config', createLocalJsonWriteHandler({
        maxBytes: LOCAL_JSON_WRITE_LIMITS.simulationConfig,
        allowedRootPaths: [publicConfigRoot],
        targetPaths: [flockOfBirdsConfigPath],
        validate(payload) {
          return validateConfigPayload(payload, 'Missing flock of birds config payload');
        },
        async handle(nextConfig, req, res) {
          await writeFile(flockOfBirdsConfigPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf8');
          server.ws.send({
            type: 'full-reload',
            path: '/config/flock-of-birds-demo.json',
          });

          sendJson(res, 200, { ok: true });
        },
        failureMessage: 'Failed to save flock of birds config',
      }));

      const handleRepelRoomConfigSave = createLocalJsonWriteHandler({
        maxBytes: LOCAL_JSON_WRITE_LIMITS.simulationConfig,
        allowedRootPaths: [publicConfigRoot],
        targetPaths: [repelRoomConfigPath, wallRepelConfigPath],
        validate(payload) {
          return validateConfigPayload(payload, 'Missing repel room config payload');
        },
        async handle(nextConfig, req, res) {
          const serializedConfig = `${JSON.stringify(nextConfig, null, 2)}\n`;
          await runLocalFileTransaction({
            rootPath: publicConfigRoot,
            replacements: [
              { path: repelRoomConfigPath, content: serializedConfig },
              { path: wallRepelConfigPath, content: serializedConfig },
            ],
          }, { io: transactionIo });
          server.ws.send({
            type: 'full-reload',
            path: '/config/repel-room-demo.json',
          });

          sendJson(res, 200, { ok: true });
        },
        failureMessage: 'Failed to save repel room config',
      });

      server.middlewares.use('/api/repel-room/config', handleRepelRoomConfigSave);
      server.middlewares.use('/api/wall-repel/config', handleRepelRoomConfigSave);

      server.middlewares.use('/api/atmosphere-lab/config', createLocalJsonWriteHandler({
        maxBytes: LOCAL_JSON_WRITE_LIMITS.simulationConfig,
        allowedRootPaths: [publicConfigRoot],
        targetPaths: [atmosphereLabConfigPath],
        validate(payload) {
          return validateConfigPayload(payload, 'Missing atmosphere lab config payload');
        },
        async handle(nextConfig, req, res) {
          const normalizedConfig = normalizeAtmosphereLabConfig(nextConfig);
          await writeFile(atmosphereLabConfigPath, `${JSON.stringify(normalizedConfig, null, 2)}\n`, 'utf8');
          sendJson(res, 200, { ok: true, version: normalizedConfig.version });
        },
        failureMessage: 'Failed to save atmosphere lab config',
      }));

      server.middlewares.use('/api/loader-playground/config', createLocalJsonWriteHandler({
        maxBytes: LOCAL_JSON_WRITE_LIMITS.simulationConfig,
        allowedRootPaths: [publicConfigRoot],
        targetPaths: [loaderPlaygroundConfigPath],
        validate(payload) {
          return validateConfigPayload(payload, 'Missing loader playground config payload');
        },
        async handle(nextConfig, req, res) {
          const normalizedConfig = normalizeLoaderPlaygroundConfig(nextConfig);
          await writeFile(loaderPlaygroundConfigPath, `${JSON.stringify(normalizedConfig, null, 2)}\n`, 'utf8');
          server.ws.send({
            type: 'full-reload',
            path: '/config/loader-playground-demo.json',
          });

          sendJson(res, 200, { ok: true, version: normalizedConfig.version });
        },
        failureMessage: 'Failed to save loader playground config',
      }));

      server.middlewares.use('/api/simulations/issues/status', createLocalJsonWriteHandler({
        maxBytes: LOCAL_JSON_WRITE_LIMITS.simulationAdmin,
        allowedRootPaths: [
          SIMULATION_ADMIN_PATHS.simulationIssuesDir,
          dirname(SIMULATION_ADMIN_PATHS.simulationActivityPath),
        ],
        targetPaths: [
          SIMULATION_ADMIN_PATHS.simulationIssuesDir,
          SIMULATION_ADMIN_PATHS.simulationActivityPath,
        ],
        validate: validateJsonObject,
        async handle(payload, req, res) {
          const result = await updateSimulationIssueStatus({
            fileName: payload?.fileName,
            status: payload?.status,
            transactionIo,
          });
          sendJson(res, 200, { ok: true, ...result });
        },
        failureMessage: 'Failed to update simulation issue status',
      }));

      server.middlewares.use('/api/simulations/issues', createLocalJsonWriteHandler({
        maxBytes: LOCAL_JSON_WRITE_LIMITS.simulationAdmin,
        allowedRootPaths: [
          SIMULATION_ADMIN_PATHS.simulationIssuesDir,
          dirname(SIMULATION_ADMIN_PATHS.simulationActivityPath),
        ],
        targetPaths: [
          SIMULATION_ADMIN_PATHS.simulationIssuesDir,
          SIMULATION_ADMIN_PATHS.simulationActivityPath,
        ],
        validate: validateJsonObject,
        async handle(payload, req, res) {
          const { relativePath } = await createSimulationIssue({
            ...payload,
            transactionIo,
          });
          sendJson(res, 200, { ok: true, relativePath });
        },
        failureMessage: 'Failed to log simulation issue',
      }));

      server.middlewares.use('/api/simulations/delete', createLocalJsonWriteHandler({
        maxBytes: LOCAL_JSON_WRITE_LIMITS.simulationAdmin,
        allowedRootPaths: [repoRoot],
        targetPaths: [
          SIMULATION_ADMIN_PATHS.simulationCatalogPath,
          SIMULATION_ADMIN_PATHS.simulationActivityPath,
          SIMULATION_ADMIN_PATHS.simulationIssuesDir,
          SIMULATION_ADMIN_PATHS.simulationPreviewsDir,
          SIMULATION_ADMIN_PATHS.simulationPitchesDir,
          SIMULATION_ADMIN_PATHS.simulationLabDir,
          SIMULATION_ADMIN_PATHS.simulationEntriesDir,
          SIMULATION_ADMIN_PATHS.simulationRoutesDir,
          SIMULATION_ADMIN_PATHS.simulationPublicConfigDir,
          SIMULATION_ADMIN_PATHS.siteAppPath,
          SIMULATION_ADMIN_PATHS.routeRegistryPath,
          SIMULATION_ADMIN_PATHS.viteConfigPath,
        ],
        validate: validateJsonObject,
        async handle(payload, req, res) {
          const id = payload?.id;
          if (payload?.dryRun) {
            const plan = await createSimulationDeletionPlan({ id });
            sendJson(res, 200, { ok: true, plan });
            return;
          }

          const result = await deleteSimulation({
            id,
            confirmId: payload?.confirmId,
            transactionIo,
          });

          server.ws.send({
            type: 'full-reload',
            path: '/simulations.html',
          });

          sendJson(res, 200, { ok: true, ...result });
        },
        failureMessage: 'Failed to delete simulation',
      }));

      server.middlewares.use('/api/simulations/status', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          sendJson(res, 200, await getSimulationDashboardStatus());
        } catch (error) {
          sendJson(res, error?.statusCode || 500, { ok: false, error: error?.message || 'Failed to read simulation status' });
        }
      });

      server.middlewares.use('/api/simulations/validate', createLocalJsonWriteHandler({
        maxBytes: LOCAL_JSON_WRITE_LIMITS.simulationAdmin,
        validate: validateJsonObject,
        async handle(payload, req, res) {
          const result = await runRepoNodeScript(['scripts/validate-simulation-catalog.mjs'], {
            timeoutMs: 60000,
          });
          sendJson(res, result.ok ? 200 : 500, {
            ok: result.ok,
            stdout: result.stdout,
            stderr: result.stderr,
            code: result.code,
            signal: result.signal,
          });
        },
        failureMessage: 'Failed to validate the simulation catalog',
      }));

      server.middlewares.use('/api/simulations/build', createLocalJsonWriteHandler({
        maxBytes: LOCAL_JSON_WRITE_LIMITS.simulationAdmin,
        allowedRootPaths: [publicConfigRoot],
        targetPaths: designSystemConfigPaths,
        validate: validateJsonObject,
        async handle(payload, req, res) {
          const result = await runRepoCommand('npm', ['run', 'build'], {
            timeoutMs: 240000,
          });
          sendJson(res, result.ok ? 200 : 500, {
            ok: result.ok,
            stdout: result.stdout,
            stderr: result.stderr,
            code: result.code,
            signal: result.signal,
          });
        },
        failureMessage: 'Failed to build the site',
      }));

      server.middlewares.use('/api/simulations/capture', createLocalJsonWriteHandler({
        maxBytes: LOCAL_JSON_WRITE_LIMITS.simulationAdmin,
        allowedRootPaths: [SIMULATION_ADMIN_PATHS.simulationPreviewsDir],
        targetPaths: [SIMULATION_ADMIN_PATHS.simulationPreviewsDir],
        validate: validateJsonObject,
        async handle(payload, req, res) {
          const id = String(payload?.id || '').trim();
          if (!id) {
            throw createWriteRequestError(400, 'Missing simulation id');
          }

          const args = [
            'scripts/capture-simulation-previews.mjs',
            `--ids=${id}`,
            '--frames=4',
          ];
          if (payload?.baseUrl) {
            args.push(`--base-url=${payload.baseUrl}`);
          }

          const result = await runRepoNodeScript(args, { timeoutMs: 180000 });
          sendJson(res, result.ok ? 200 : 500, {
            ok: result.ok,
            stdout: result.stdout,
            stderr: result.stderr,
            code: result.code,
            signal: result.signal,
          });
        },
        failureMessage: 'Failed to capture simulation preview',
      }));

      server.middlewares.use('/api/simulations/review-status', createLocalJsonWriteHandler({
        maxBytes: LOCAL_JSON_WRITE_LIMITS.simulationAdmin,
        allowedRootPaths: [
          dirname(SIMULATION_ADMIN_PATHS.simulationCatalogPath),
          dirname(SIMULATION_ADMIN_PATHS.simulationActivityPath),
        ],
        targetPaths: [
          SIMULATION_ADMIN_PATHS.simulationCatalogPath,
          SIMULATION_ADMIN_PATHS.simulationActivityPath,
        ],
        validate: validateJsonObject,
        async handle(payload, req, res) {
          const { simulation, changed } = await updateSimulationReviewStatus({
            id: payload?.id,
            reviewStatus: payload?.reviewStatus,
            transactionIo,
          });
          sendJson(res, 200, { ok: true, simulation, changed });
        },
        failureMessage: 'Failed to update simulation review status',
      }));

      server.middlewares.use('/api/simulations/stage', createLocalJsonWriteHandler({
        maxBytes: LOCAL_JSON_WRITE_LIMITS.simulationAdmin,
        allowedRootPaths: [
          dirname(SIMULATION_ADMIN_PATHS.simulationCatalogPath),
          dirname(SIMULATION_ADMIN_PATHS.simulationActivityPath),
        ],
        targetPaths: [
          SIMULATION_ADMIN_PATHS.simulationCatalogPath,
          SIMULATION_ADMIN_PATHS.simulationActivityPath,
        ],
        validate: validateJsonObject,
        async handle(payload, req, res) {
          const { simulation, changed } = await updateSimulationStage({
            id: payload?.id,
            stage: payload?.stage,
            transactionIo,
          });

          if (changed) {
            server.ws.send({
              type: 'full-reload',
              path: '/simulations.html',
            });
          }

          sendJson(res, 200, { ok: true, simulation, changed });
        },
        failureMessage: 'Failed to update simulation stage',
      }));
    },
  };
}
