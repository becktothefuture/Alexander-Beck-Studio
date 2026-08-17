#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  compileAboutNarrativeComposerPlan,
  getAboutNarrativeComposerCameraSample,
} from '../../react-app/app/src/routes/about-narrative-lab/aboutNarrativeComposer.js';
import {
  createAboutNarrativeLongAssemblyBlueprint,
} from '../../react-app/app/src/routes/about-narrative-lab/aboutNarrativeLongAssembly.js';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const DEFAULT_CONFIG = path.join(REPO_ROOT, 'react-app/app/public/config/contents-about.json');
const DEFAULT_TOKENS = path.join(REPO_ROOT, 'react-app/app/public/css/tokens.css');
const DEFAULT_WORLD_META = path.join(
  REPO_ROOT,
  'react-app/app/public/models/about-v2-edited-world/meta.json',
);
const DEFAULT_OUTPUT = path.join(
  REPO_ROOT,
  'source-assets/about-v2-blender/about-v2-scene-source.json',
);
const MATERIAL_TOKENS = ['--ball-1', '--ball-4', '--ball-3', '--ball-7', '--ball-8', '--ball-6'];
const MATERIAL_NAMES = ['Atmosphere', 'Stone', 'Steel', 'Glass', 'Signal', 'Organic'];

function parseArgs(argv) {
  const options = {
    config: DEFAULT_CONFIG,
    tokens: DEFAULT_TOKENS,
    worldMeta: DEFAULT_WORLD_META,
    output: DEFAULT_OUTPUT,
    cameraSamples: 721,
    durationSeconds: 120,
    fps: 30,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === '--config') options.config = path.resolve(value);
    else if (argument === '--tokens') options.tokens = path.resolve(value);
    else if (argument === '--world-meta') options.worldMeta = path.resolve(value);
    else if (argument === '--output') options.output = path.resolve(value);
    else if (argument === '--camera-samples') options.cameraSamples = Number(value);
    else if (argument === '--duration') options.durationSeconds = Number(value);
    else if (argument === '--fps') options.fps = Number(value);
    else continue;
    index += 1;
  }
  return options;
}

function requireFinitePositive(value, label) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be finite and positive.`);
  return value;
}

function readPalette(tokensPath) {
  const source = fs.readFileSync(tokensPath, 'utf8');
  return MATERIAL_TOKENS.map((token, index) => {
    const match = source.match(new RegExp(`${token.replaceAll('-', '\\-')}\\s*:\\s*(#[0-9a-fA-F]{6})`));
    if (!match) throw new Error(`Missing ${token} in ${tokensPath}.`);
    return { slot: index, name: MATERIAL_NAMES[index], token, color: match[1].toLowerCase() };
  });
}

function runtimeStages(track) {
  const runtimeAt = (baseWU) => baseWU <= 22
    ? track.mapper.runtimeWUAtBaseWU(baseWU)
    : track.storyDurationWU + (baseWU - 22);
  return Object.fromEntries(Object.entries(track.baseStages).map(([id, stage]) => [id, {
    startWU: runtimeAt(stage.startWU),
    endWU: runtimeAt(stage.endWU),
  }]));
}

function roundNumber(value) {
  return Number(Number(value).toFixed(9));
}

function roundVector(values) {
  return values.map(roundNumber);
}

function cameraSamples(plan, count) {
  return Array.from({ length: count }, (_, index) => {
    const amount = index / Math.max(1, count - 1);
    const storyWU = plan.durationWU * amount;
    const sample = getAboutNarrativeComposerCameraSample(plan, storyWU);
    return {
      storyWU: roundNumber(storyWU),
      position: roundVector(sample.position),
      quaternion: roundVector(sample.quaternion),
      lookAtTarget: roundVector(sample.lookAtTarget),
      rollDegrees: roundNumber(sample.lookAtRoll),
      fovDegrees: roundNumber(sample.fov),
    };
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const cameraSampleCount = Math.max(2, Math.round(requireFinitePositive(
    options.cameraSamples,
    'Camera sample count',
  )));
  const durationSeconds = requireFinitePositive(options.durationSeconds, 'Duration');
  const fps = Math.max(1, Math.round(requireFinitePositive(options.fps, 'FPS')));
  const configSource = fs.readFileSync(options.config, 'utf8');
  const document = JSON.parse(configSource);
  const plan = compileAboutNarrativeComposerPlan(document, {
    inlineSize: 1440,
    blockSize: 1000,
    previewMotionProfile: 'full',
  });
  if (!plan.valid) throw new Error(JSON.stringify(plan.diagnostics, null, 2));
  const world = plan.worlds.find((candidate) => candidate.shapeId === 'long-assembly-corridor-v1');
  if (!world) throw new Error('About V2 does not contain the Long Assembly world.');
  const editedWorldMeta = JSON.parse(fs.readFileSync(options.worldMeta, 'utf8'));
  if (!editedWorldMeta.ocean) {
    throw new Error(`About V2 edited-world metadata has no ocean contract: ${options.worldMeta}`);
  }

  const blueprint = createAboutNarrativeLongAssemblyBlueprint(world.shapeParameters);
  const forbiddenRoles = new Set([
    'continuous-deck',
    'continuous-rail',
    'track-ties',
    'signal-conduit',
    'ground-support',
  ]);
  if (blueprint.primitives.some((primitive) => (
    primitive.beat === 'rail' || forbiddenRoles.has(primitive.role)
  ))) {
    throw new Error('The Blender source still contains removed bottom-track geometry.');
  }

  const ocean = editedWorldMeta.ocean;
  const editedWorldBlend = path.resolve(editedWorldMeta.source?.file || '');
  if (!fs.existsSync(editedWorldBlend)) {
    throw new Error(`About V2 edited-world source Blend is missing: ${editedWorldBlend}`);
  }
  const editedWorldBlendHash = crypto
    .createHash('sha256')
    .update(fs.readFileSync(editedWorldBlend))
    .digest('hex');
  if (editedWorldBlendHash !== editedWorldMeta.source.sha256) {
    throw new Error('About V2 edited-world source Blend no longer matches its exported website assets.');
  }
  const payload = {
    version: 2,
    generator: 'scripts/about-v2-blender/export-about-v2-blender-source.mjs',
    source: {
      config: path.relative(REPO_ROOT, options.config),
      configSha256: crypto.createHash('sha256').update(configSource).digest('hex'),
      editedWorldMeta: path.relative(REPO_ROOT, options.worldMeta),
      editedWorldBlend: path.relative(REPO_ROOT, editedWorldBlend),
      editedWorldBlendSha256: editedWorldBlendHash,
      profile: 'desktop',
      viewport: [1440, 1000],
      motionProfile: 'full',
    },
    coordinateSystem: {
      website: 'right-handed, Y-up, camera forward -Z',
      blender: 'right-handed, Z-up, camera forward -Z',
      websiteToBlender: ['x', '-z', 'y'],
      units: '1 website world unit = 1 Blender metre',
    },
    timeline: {
      durationSeconds,
      fps,
      frameStart: 1,
      frameEnd: Math.round(durationSeconds * fps),
      storyDurationWU: plan.durationWU,
    },
    palette: readPalette(options.tokens),
    world: {
      id: world.id,
      shapeId: world.shapeId,
      transform: world.transform,
      shapeParameters: world.shapeParameters,
      terminalWU: blueprint.terminalWU,
      stages: runtimeStages(blueprint.track),
      primitives: blueprint.primitives,
      ocean: {
        source: path.relative(REPO_ROOT, options.worldMeta),
        nearZ: roundNumber(ocean.nearZ),
        farZ: roundNumber(ocean.farZ),
        baseY: roundNumber(world.shapeParameters.oceanHeight ?? ocean.baseY),
        nearHalfWidth: roundNumber(ocean.nearHalfWidth),
        farHalfWidth: roundNumber(ocean.farHalfWidth),
        cameraEnd: roundVector(ocean.cameraEnd),
        nearOffset: roundNumber(ocean.nearOffset),
        gridColumns: 97,
        gridRows: 129,
        animation: {
          amplitude: roundNumber(world.shapeParameters.oceanAmplitude ?? 0.56),
          speed: roundNumber(world.shapeParameters.oceanSpeed ?? 0.82),
          chop: roundNumber(world.shapeParameters.oceanChop ?? 0.24),
          fogDistanceScale: roundNumber(world.shapeParameters.oceanFogDistanceScale ?? 3.2),
          splashAmount: roundNumber(world.shapeParameters.oceanSplashAmount ?? 0.95),
          splashHeight: roundNumber(world.shapeParameters.oceanSplashHeight ?? 3.2),
          websiteClickImpulseHeight: 5.8,
          websiteClickImpulseSeconds: 5.2,
        },
      },
    },
    camera: {
      name: 'ABS_CAMERA',
      pathName: 'ABS_CAMERA_PATH',
      sampleCount: cameraSampleCount,
      clipStart: 0.03,
      clipEnd: 1000,
      samples: cameraSamples(plan, cameraSampleCount),
    },
  };

  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(payload, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    output: path.relative(REPO_ROOT, options.output),
    primitives: blueprint.primitives.length,
    oceanVertices: payload.world.ocean.gridColumns * payload.world.ocean.gridRows,
    cameraSamples: cameraSampleCount,
    storyDurationWU: plan.durationWU,
    timelineFrames: payload.timeline.frameEnd,
  }, null, 2)}\n`);
}

main();
