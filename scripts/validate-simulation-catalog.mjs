#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  SIMULATION_ADMIN_PATHS,
  SIMULATION_STAGES,
  getSimulationPreviewPaths,
  isAllowedSimulationStage,
  readSimulationCatalog,
} from './lib/simulation-admin-store.mjs';

function stripQuery(path) {
  return String(path || '').split('?')[0];
}

function stripLeadingSlash(path) {
  return stripQuery(path).replace(/^\/+/, '');
}

function fileExistsFromApp(path) {
  return existsSync(resolve(SIMULATION_ADMIN_PATHS.reactAppRoot, stripLeadingSlash(path)));
}

function fileExistsFromPublic(path) {
  return existsSync(resolve(SIMULATION_ADMIN_PATHS.reactAppRoot, 'public', stripLeadingSlash(path)));
}

function fileExistsFromRepo(path) {
  return existsSync(resolve(SIMULATION_ADMIN_PATHS.repoRoot, path));
}

function sourceIncludes(source, value) {
  return Boolean(value && source.includes(value));
}

function isValidIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return false;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10) - 1;
  const day = Number.parseInt(match[3], 10);
  const timestamp = Date.UTC(year, month, day);
  const parsed = new Date(timestamp);
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month
    && parsed.getUTCDate() === day;
}

async function readSource(path) {
  return readFile(path, 'utf8').catch(() => '');
}

function addRequiredFieldErrors(errors, entry, fields) {
  fields.forEach((field) => {
    if (entry[field] === undefined || entry[field] === null || entry[field] === '') {
      errors.push(`${entry.id || '<missing id>'}: missing ${field}`);
    }
  });
}

async function main() {
  const catalog = await readSimulationCatalog();
  const simulations = Array.isArray(catalog.simulations) ? catalog.simulations : [];
  const errors = [];
  const warnings = [];
  const seenIds = new Set();
  const routesSource = await readSource(SIMULATION_ADMIN_PATHS.routeRegistryPath);
  const viteSource = await readSource(SIMULATION_ADMIN_PATHS.viteConfigPath);
  const constantsSource = await readSource(SIMULATION_ADMIN_PATHS.constantsPath);

  if (!simulations.length) {
    errors.push('Catalog has no simulations.');
  }

  simulations.forEach((entry) => {
    addRequiredFieldErrors(errors, entry, ['id', 'name', 'chapter', 'stage', 'surface', 'origin', 'launchPath', 'reviewStatus', 'summary']);
    if (!entry.id) return;

    if (seenIds.has(entry.id)) {
      errors.push(`${entry.id}: duplicate simulation id`);
    }
    seenIds.add(entry.id);

    if (!isAllowedSimulationStage(entry.stage)) {
      errors.push(`${entry.id}: invalid stage "${entry.stage}"`);
    }

    if (entry.stage === SIMULATION_STAGES.DAILY_ROTATION && entry.surface === 'lab-route' && !entry.dailyHref) {
      errors.push(`${entry.id}: lab-route daily rotation entries require dailyHref`);
    }

    if (entry.surface === 'home-mode') {
      const modeParam = new URL(`http://local${entry.launchPath}`).searchParams.get('mode');
      if (modeParam !== entry.id) {
        errors.push(`${entry.id}: home-mode launchPath must use ?mode=${entry.id}`);
      }
      if (!sourceIncludes(constantsSource, `'${entry.id}'`)) {
        errors.push(`${entry.id}: home-mode id is not present in constants.js`);
      }
    }

    if (entry.surface === 'lab-route') {
      if (!fileExistsFromApp(entry.launchPath)) {
        errors.push(`${entry.id}: missing lab html ${stripQuery(entry.launchPath)}`);
      }
      if (!sourceIncludes(routesSource, stripQuery(entry.launchPath))) {
        errors.push(`${entry.id}: launchPath is missing from route registry`);
      }
      if (!sourceIncludes(viteSource, stripLeadingSlash(entry.launchPath))) {
        errors.push(`${entry.id}: launchPath is missing from Vite inputs`);
      }
      if (entry.configPath && !fileExistsFromPublic(entry.configPath)) {
        errors.push(`${entry.id}: missing config ${stripQuery(entry.configPath)}`);
      }
    }

    if (entry.dailyHref && !fileExistsFromApp(entry.dailyHref)) {
      errors.push(`${entry.id}: dailyHref points at missing html ${stripQuery(entry.dailyHref)}`);
    }

    if (entry.stage !== SIMULATION_STAGES.HIDDEN) {
      const { posterPath, gifPath } = getSimulationPreviewPaths(entry);
      if (!existsSync(posterPath)) {
        errors.push(`${entry.id}: missing preview poster`);
      }
      if (!existsSync(gifPath)) {
        errors.push(`${entry.id}: missing preview gif`);
      }
    }

    if (entry.stage === SIMULATION_STAGES.AUTOMATION_CANDIDATE) {
      if (!entry.pitchPath) {
        errors.push(`${entry.id}: automation candidates require pitchPath`);
      } else if (!fileExistsFromRepo(entry.pitchPath)) {
        errors.push(`${entry.id}: pitchPath does not exist`);
      }
    }

    if (entry.capture) {
      if (entry.capture.capturePath && !String(entry.capture.capturePath).startsWith('/')) {
        errors.push(`${entry.id}: capture.capturePath must be root-relative`);
      }
      if (entry.capture.delayMs !== undefined && (!Number.isFinite(entry.capture.delayMs) || entry.capture.delayMs < 0)) {
        errors.push(`${entry.id}: capture.delayMs must be a positive number`);
      }
      if (entry.capture.readySelector !== undefined && typeof entry.capture.readySelector !== 'string') {
        errors.push(`${entry.id}: capture.readySelector must be a string`);
      }
      if (entry.capture.notes !== undefined && typeof entry.capture.notes !== 'string') {
        errors.push(`${entry.id}: capture.notes must be a string`);
      }
    }
  });

  const dailyCount = simulations.filter((entry) => entry.stage === SIMULATION_STAGES.DAILY_ROTATION).length;
  const candidateCount = simulations.filter((entry) => entry.stage === SIMULATION_STAGES.AUTOMATION_CANDIDATE).length;
  const dailyRotation = catalog.dailyRotation || {};

  if (!dailyCount) {
    errors.push('Catalog has no daily-rotation simulations.');
  }

  if (dailyRotation.anchorDate !== undefined && !isValidIsoDate(dailyRotation.anchorDate)) {
    errors.push('dailyRotation.anchorDate must be a valid YYYY-MM-DD date');
  }

  if (dailyRotation.anchorSimulationId !== undefined) {
    const anchorEntry = simulations.find((entry) => entry.id === dailyRotation.anchorSimulationId);
    if (!anchorEntry) {
      errors.push(`dailyRotation.anchorSimulationId points at missing simulation "${dailyRotation.anchorSimulationId}"`);
    } else if (anchorEntry.stage !== SIMULATION_STAGES.DAILY_ROTATION) {
      errors.push(`dailyRotation.anchorSimulationId "${dailyRotation.anchorSimulationId}" is not in daily rotation`);
    }
  }

  if (!catalog.updatedAt) {
    warnings.push('Catalog is missing updatedAt.');
  }

  if (warnings.length) {
    console.warn('Simulation catalog warnings:');
    warnings.forEach((warning) => console.warn(`- ${warning}`));
  }

  if (errors.length) {
    console.error('Simulation catalog validation failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(`Simulation catalog validation passed (${simulations.length} simulations, ${dailyCount} daily, ${candidateCount} candidates).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
