#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  SIMULATION_ADMIN_PATHS,
  SIMULATION_STAGES,
  getSimulationPreviewPaths,
  isAllowedSimulationReviewStatus,
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

const DAILY_FOCUS_RUNTIME_COMPATIBILITY_CASES = new Map([
  [
    'beach-ball-room',
    'Collection-only lab route keeps Daily Focus shell runtime compatibility but is not in public Daily rotation.',
  ],
]);

const ALLOWED_SIMULATION_SURFACES = new Set([
  'home-mode',
  'lab-route',
  'route-runtime',
]);

const BASE_SHELL_ROUTE_PATHS = new Map([
  ['home', '/index.html'],
  ['portfolio', '/portfolio.html'],
  ['about', '/about.html'],
  ['styleguide', '/styleguide.html'],
  ['simulations', '/simulations.html'],
  ['palette-lab', '/palette-lab.html'],
]);

async function readSource(path) {
  return readFile(path, 'utf8').catch(() => '');
}

function extractSwitchCases(source) {
  return Array.from(source.matchAll(/case\s+['"]([^'"]+)['"]\s*:/g))
    .map((match) => match[1]);
}

function extractDailyRuntimeIds(source) {
  return Array.from(new Set([
    ...extractSwitchCases(source),
    ...Array.from(source.matchAll(/['"]([^'"]+)['"]:\s*\(\)\s*=>\s*import\(/g))
      .map((match) => match[1]),
  ]));
}

function extractStringObjectMaps(source, constName) {
  const pattern = new RegExp(`const\\s+${constName}\\s*=\\s*\\{([\\s\\S]*?)\\n\\s*\\};`, 'g');
  return Array.from(source.matchAll(pattern)).map((match) => {
    const entries = new Map();
    Array.from(match[1].matchAll(/(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$]*))\s*:\s*['"]([^'"]+)['"]/g))
      .forEach((entryMatch) => entries.set(entryMatch[1] || entryMatch[2], entryMatch[3]));
    return entries;
  });
}

function extractStringSet(source, constName) {
  const pattern = new RegExp(`const\\s+${constName}\\s*=\\s*new\\s+Set\\s*\\(\\s*\\[([\\s\\S]*?)\\]\\s*\\)`, 'm');
  const match = pattern.exec(source);
  if (!match) return null;
  return new Set(
    Array.from(match[1].matchAll(/['"]([^'"]+)['"]/g))
      .map((entryMatch) => entryMatch[1]),
  );
}

function extractRouteRegistryEntries(source) {
  const entries = new Map();
  Array.from(source.matchAll(/\n\s{2}['"]?([a-z0-9-]+)['"]?\s*:\s*\{[\s\S]*?\n\s{4}path:\s*['"]([^'"]+)['"]/g))
    .forEach((match) => entries.set(match[1], match[2]));
  return entries;
}

function extractViteInputHtmlPaths(source) {
  return new Set(
    Array.from(source.matchAll(/(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$]*))\s*:\s*resolve\(__dirname,\s*['"]([^'"]+\.html)['"]\)/g))
      .map((match) => `/${match[3]}`),
  );
}

function extractObjectKeys(source, constName) {
  const pattern = new RegExp(
    `const\\s+${constName}\\s*=\\s*(?:Object\\.freeze\\(\\s*)?\\{([\\s\\S]*?)\\n\\}(?:\\))?;`,
    'm',
  );
  const match = pattern.exec(source);
  if (!match) return null;
  return new Set(
    Array.from(match[1].matchAll(/^\s{2}(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$]*))\s*:/gm))
      .map((entryMatch) => entryMatch[1] || entryMatch[2]),
  );
}

function getExpectedShellRoutePaths(simulations) {
  const expected = new Map(BASE_SHELL_ROUTE_PATHS);
  simulations
    .filter((entry) => entry.surface === 'lab-route')
    .forEach((entry) => expected.set(entry.id, stripQuery(entry.launchPath)));
  return expected;
}

function getRouteBackedDailyIds(simulations) {
  return simulations
    .filter((entry) => entry.stage === SIMULATION_STAGES.DAILY_ROTATION)
    .filter((entry) => entry.surface === 'lab-route')
    .filter((entry) => entry.dailyHref)
    .map((entry) => entry.id);
}

function getRequiredLegacyLabelIds(simulations) {
  return simulations
    .filter((entry) => (
      entry.stage === SIMULATION_STAGES.DAILY_ROTATION
      || (entry.stage === SIMULATION_STAGES.COLLECTION && entry.includeInNarrative)
    ))
    .map((entry) => entry.id);
}

function addRouteSourceValidationErrors(errors, simulations, {
  routesSource,
  viteSource,
  siteAppSource,
}) {
  const expectedRoutes = getExpectedShellRoutePaths(simulations);
  const routeRegistryEntries = extractRouteRegistryEntries(routesSource);
  const viteInputPaths = extractViteInputHtmlPaths(viteSource);
  const routeDescriptorIds = extractObjectKeys(siteAppSource, 'ROUTE_DESCRIPTORS');

  if (!routeDescriptorIds) {
    errors.push('SiteApp.jsx: missing ROUTE_DESCRIPTORS map');
  }

  expectedRoutes.forEach((expectedPath, id) => {
    const registryPath = routeRegistryEntries.get(id);
    if (!registryPath) {
      errors.push(`${id}: missing route registry entry in routes.js`);
    } else if (registryPath !== expectedPath) {
      errors.push(`${id}: route registry path "${registryPath}" does not match expected "${expectedPath}"`);
    }

    if (!viteInputPaths.has(expectedPath)) {
      errors.push(`${id}: expected route path "${expectedPath}" is missing from Vite inputs`);
    }

    if (routeDescriptorIds && !routeDescriptorIds.has(id)) {
      errors.push(`${id}: missing ROUTE_DESCRIPTORS coverage in SiteApp.jsx`);
    }
  });
}

function addDailyFocusRuntimeCoverageErrors(errors, simulations, source, label) {
  const routeBackedDailyIds = getRouteBackedDailyIds(simulations);
  const routeBackedDailyIdSet = new Set(routeBackedDailyIds);
  const runtimeCases = extractDailyRuntimeIds(source);
  const runtimeCaseSet = new Set(runtimeCases);

  routeBackedDailyIds.forEach((id) => {
    if (!runtimeCaseSet.has(id)) {
      errors.push(`${id}: missing Daily Focus runtime coverage in ${label}`);
    }
  });

  runtimeCases
    .filter((id) => !routeBackedDailyIdSet.has(id))
    .filter((id) => !DAILY_FOCUS_RUNTIME_COMPATIBILITY_CASES.has(id))
    .forEach((id) => {
      errors.push(`${id}: extra Daily Focus runtime case in ${label}`);
    });

  DAILY_FOCUS_RUNTIME_COMPATIBILITY_CASES.forEach((reason, id) => {
    const entry = simulations.find((simulation) => simulation.id === id);
    if (!entry) {
      errors.push(`${id}: Daily Focus compatibility allowlist points at a missing catalog entry (${reason})`);
    } else if (entry.stage === SIMULATION_STAGES.DAILY_ROTATION) {
      errors.push(`${id}: Daily Focus compatibility allowlist should be removed now that this entry is in Daily rotation`);
    }
  });
}

function addDailyLabRouteIdCoverageErrors(errors, simulations, source, label) {
  const routeBackedDailyIds = getRouteBackedDailyIds(simulations);
  const routeBackedDailyIdSet = new Set(routeBackedDailyIds);
  const dailyLabRouteIds = extractStringSet(source, 'DAILY_LAB_ROUTE_IDS');

  if (!dailyLabRouteIds) {
    errors.push(`${label}: missing DAILY_LAB_ROUTE_IDS set`);
    return;
  }

  routeBackedDailyIds.forEach((id) => {
    if (!dailyLabRouteIds.has(id)) {
      errors.push(`${id}: missing DAILY_LAB_ROUTE_IDS coverage in ${label}`);
    }
  });

  dailyLabRouteIds.forEach((id) => {
    if (!routeBackedDailyIdSet.has(id)) {
      errors.push(`${id}: extra DAILY_LAB_ROUTE_IDS entry in ${label}`);
    }
  });
}

function addLabelDriftErrors(errors, simulations, maps, label) {
  const requiredLabelIds = getRequiredLegacyLabelIds(simulations);

  if (!maps.length) {
    errors.push(`${label}: no string label maps found`);
    return;
  }

  maps.forEach((map, index) => {
    requiredLabelIds.forEach((id) => {
      if (!map.has(id)) {
        errors.push(`${id}: missing ${label}#${index + 1} label`);
      }
    });

    map.forEach((name, id) => {
      const entry = simulations.find((simulation) => simulation.id === id);
      if (!entry || entry.name === name) return;
      errors.push(`${id}: ${label}#${index + 1} label "${name}" does not match catalog name "${entry.name}"`);
    });
  });
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
  const dailyFocusRuntimeLoaderSource = await readSource(resolve(
    SIMULATION_ADMIN_PATHS.reactAppRoot,
    'src/routes/daily-focus/dailyFocusRuntimeLoader.js',
  ));
  const dailyFocusShellBridgeSource = await readSource(resolve(
    SIMULATION_ADMIN_PATHS.reactAppRoot,
    'src/routes/daily-focus/DailyFocusShellBridge.jsx',
  ));
  const modeControllerSource = await readSource(resolve(
    SIMULATION_ADMIN_PATHS.reactAppRoot,
    'src/legacy/modules/modes/mode-controller.js',
  ));
  const controlsSource = await readSource(resolve(
    SIMULATION_ADMIN_PATHS.reactAppRoot,
    'src/legacy/modules/ui/controls.js',
  ));
  const controlRegistrySource = await readSource(resolve(
    SIMULATION_ADMIN_PATHS.reactAppRoot,
    'src/legacy/modules/ui/control-registry.js',
  ));
  const siteAppSource = await readSource(SIMULATION_ADMIN_PATHS.siteAppPath);

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

    if (!ALLOWED_SIMULATION_SURFACES.has(entry.surface)) {
      errors.push(`${entry.id}: invalid surface "${entry.surface}"`);
    }

    if (!isAllowedSimulationReviewStatus(entry.reviewStatus)) {
      errors.push(`${entry.id}: invalid reviewStatus "${entry.reviewStatus}"`);
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
  if (!dailyCount) {
    errors.push('Catalog has no daily-rotation simulations.');
  }

  addDailyFocusRuntimeCoverageErrors(
    errors,
    simulations,
    dailyFocusRuntimeLoaderSource,
    'dailyFocusRuntimeLoader.js',
  );
  addDailyFocusRuntimeCoverageErrors(
    errors,
    simulations,
    dailyFocusShellBridgeSource,
    'DailyFocusShellBridge.jsx',
  );
  addRouteSourceValidationErrors(errors, simulations, {
    routesSource,
    viteSource,
    siteAppSource,
  });
  addDailyLabRouteIdCoverageErrors(
    errors,
    simulations,
    await readSource(resolve(
      SIMULATION_ADMIN_PATHS.reactAppRoot,
      'src/hooks/useShellRouteTransition.js',
    )),
    'useShellRouteTransition.js',
  );
  addLabelDriftErrors(
    errors,
    simulations,
    extractStringObjectMaps(modeControllerSource, 'MODE_NAMES'),
    'mode-controller MODE_NAMES',
  );
  addLabelDriftErrors(
    errors,
    simulations,
    extractStringObjectMaps(controlsSource, 'modeNames'),
    'controls modeNames',
  );
  addLabelDriftErrors(
    errors,
    simulations,
    extractStringObjectMaps(controlRegistrySource, 'modeLabels'),
    'control-registry modeLabels',
  );

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
