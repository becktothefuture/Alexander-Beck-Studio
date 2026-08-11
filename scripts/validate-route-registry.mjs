#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = resolve(repoRoot, 'react-app/app');

const BASELINE_COUNTS = Object.freeze({
  viteInputs: 31,
  htmlEntries: 31,
  entryModules: 25,
  routeDefinitions: 22,
  shellTabs: 5,
});

const EXPECTED_SHELL_TAB_ORDER = Object.freeze([
  'home',
  'portfolio',
  'about',
  'playground',
  'contact',
]);

function addError(errors, code, message) {
  errors.push({ code, message });
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates];
}

function extractViteInputs(source) {
  return Array.from(source.matchAll(
    /(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$]*))\s*:\s*resolve\(__dirname,\s*['"]([^'"]+\.html)['"]\)/g,
  )).map((match) => ({ key: match[1] || match[2], htmlPath: match[3] }));
}

function extractModuleScriptSource(source) {
  const moduleScripts = Array.from(source.matchAll(/<script\b([^>]*)>/gi))
    .map((match) => match[1])
    .filter((attributes) => /\btype\s*=\s*["']module["']/i.test(attributes));
  if (moduleScripts.length !== 1) return { count: moduleScripts.length, src: null };
  const srcMatch = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(moduleScripts[0]);
  return { count: 1, src: srcMatch?.[1] || null };
}

function findMatchingDelimiter(source, startIndex, openCharacter, closeCharacter) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && nextCharacter === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === '/' && nextCharacter === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && nextCharacter === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === openCharacter) depth += 1;
    if (character === closeCharacter) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function extractNamedObjectBody(source, constName) {
  const declaration = new RegExp(`const\\s+${constName}\\s*=`, 'm').exec(source);
  if (!declaration) return null;
  const openIndex = source.indexOf('{', declaration.index + declaration[0].length);
  if (openIndex < 0) return null;
  const closeIndex = findMatchingDelimiter(source, openIndex, '{', '}');
  if (closeIndex < 0) return null;
  return source.slice(openIndex + 1, closeIndex);
}

function extractRouteDefinitions(source) {
  const body = extractNamedObjectBody(source, 'ROUTE_MANIFEST');
  if (body === null) return null;
  const definitions = [];
  const propertyPattern = /^  (?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*\{/gm;
  let propertyMatch;
  while ((propertyMatch = propertyPattern.exec(body))) {
    const key = propertyMatch[1] || propertyMatch[2] || propertyMatch[3];
    const openIndex = body.indexOf('{', propertyMatch.index);
    const closeIndex = findMatchingDelimiter(body, openIndex, '{', '}');
    if (closeIndex < 0) {
      definitions.push({ key, id: null, path: null, aliases: [], layout: null, shellTab: null });
      continue;
    }
    const definitionBody = body.slice(openIndex + 1, closeIndex);
    const id = /\bid\s*:\s*['"]([^'"]+)['"]/.exec(definitionBody)?.[1] || null;
    const path = /\bpath\s*:\s*['"]([^'"]+)['"]/.exec(definitionBody)?.[1] || null;
    const aliasesMatch = /\baliases\s*:\s*\[([\s\S]*?)\]/.exec(definitionBody);
    const aliases = aliasesMatch
      ? Array.from(aliasesMatch[1].matchAll(/['"]([^'"]+)['"]/g)).map((match) => match[1])
      : [];
    const layout = /\blayout\s*:\s*['"]([^'"]+)['"]/.exec(definitionBody)?.[1] || null;
    const shellTabStart = /\bshellTab\s*:\s*\{/.exec(definitionBody);
    let shellTab = null;
    if (shellTabStart) {
      const shellTabOpenIndex = definitionBody.indexOf('{', shellTabStart.index);
      const shellTabCloseIndex = findMatchingDelimiter(definitionBody, shellTabOpenIndex, '{', '}');
      if (shellTabCloseIndex >= 0) {
        const shellTabBody = definitionBody.slice(shellTabOpenIndex + 1, shellTabCloseIndex);
        shellTab = {
          order: Number.parseInt(/\border\s*:\s*(\d+)/.exec(shellTabBody)?.[1] || '', 10),
          label: /\blabel\s*:\s*['"]([^'"]+)['"]/.exec(shellTabBody)?.[1] || null,
          ariaLabel: /\bariaLabel\s*:\s*['"]([^'"]+)['"]/.exec(shellTabBody)?.[1] || null,
          icon: /\bicon\s*:\s*['"]([^'"]+)['"]/.exec(shellTabBody)?.[1] || null,
          iconOnly: /\biconOnly\s*:\s*(true|false)/.exec(shellTabBody)?.[1] === 'true',
        };
      }
    }
    definitions.push({ key, id, path, aliases, layout, shellTab });
    propertyPattern.lastIndex = closeIndex + 1;
  }
  return definitions;
}

function extractSiteAppDescriptors(source) {
  const body = extractNamedObjectBody(source, 'ROUTE_DESCRIPTORS');
  if (body === null) return null;
  const descriptors = [];
  const propertyPattern = /^  (?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*defineRouteDescriptor\s*\(/gm;
  let propertyMatch;
  while ((propertyMatch = propertyPattern.exec(body))) {
    const key = propertyMatch[1] || propertyMatch[2] || propertyMatch[3];
    const openIndex = body.indexOf('(', propertyMatch.index);
    const closeIndex = findMatchingDelimiter(body, openIndex, '(', ')');
    if (closeIndex < 0) {
      descriptors.push({ key, routeId: null, getView: null, runtime: null });
      continue;
    }
    const descriptorBody = body.slice(openIndex + 1, closeIndex);
    const routeId = /^\s*['"]([^'"]+)['"]/.exec(descriptorBody)?.[1] || null;
    const getView = /\bgetView\s*:\s*([A-Za-z_$][\w$]*)/.exec(descriptorBody)?.[1] || null;
    const runtime = /\bruntime\s*:\s*([A-Za-z_$][\w$]*)/.exec(descriptorBody)?.[1] || null;
    descriptors.push({ key, routeId, getView, runtime });
    propertyPattern.lastIndex = closeIndex + 1;
  }
  return descriptors;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractFunctionBody(source, functionName) {
  const declaration = new RegExp(
    `(?:export\\s+)?function\\s+${escapeRegExp(functionName)}\\s*\\(`,
    'm',
  ).exec(source);
  if (!declaration) return null;
  const openIndex = source.indexOf('{', declaration.index + declaration[0].length);
  if (openIndex < 0) return null;
  const closeIndex = findMatchingDelimiter(source, openIndex, '{', '}');
  return closeIndex < 0 ? null : source.slice(openIndex + 1, closeIndex);
}

function extractSiteAppImportOwners(source) {
  const owners = new Map();
  Array.from(source.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"]/g))
    .forEach((match) => {
      match[1].split(',').map((binding) => binding.trim()).filter(Boolean).forEach((binding) => {
        const [importedName, localName = importedName] = binding.split(/\s+as\s+/);
        const owner = { importedName, sourcePath: match[2] };
        const currentOwners = owners.get(localName) || [];
        currentOwners.push(owner);
        owners.set(localName, currentOwners);
      });
    });
  return owners;
}

function sourceDeclaresBinding(source, bindingName) {
  if (!source || !bindingName) return false;
  const binding = escapeRegExp(bindingName);
  return new RegExp(`(?:export\\s+)?(?:const|let|var|function|class)\\s+${binding}\\b`, 'm').test(source);
}

function getImportedBindingOwnersUsedByFunction(functionBody, importOwners) {
  if (functionBody === null) return [];
  const owners = new Set();
  importOwners.forEach((bindings, localName) => {
    if (!new RegExp(`\\b${escapeRegExp(localName)}\\b`).test(functionBody)) return;
    bindings.forEach((binding) => owners.add(binding.sourcePath));
  });
  return [...owners].sort();
}

function classifyDescriptorView(functionBody) {
  if (functionBody === null) return 'unknown';
  if (/\blayout\s*:\s*['"]standalone['"]/.test(functionBody)) return 'standalone';
  if (/\brouteRenderKey\s*:\s*['"]home['"]/.test(functionBody)) return 'home-scene';
  return 'shell';
}

function extractShellScenes(source) {
  const functionStart = source.indexOf('function RouteSceneMount');
  const functionEnd = source.indexOf('\nfunction ', functionStart + 1);
  const body = functionStart >= 0
    ? source.slice(functionStart, functionEnd >= 0 ? functionEnd : source.length)
    : '';
  return Array.from(body.matchAll(
    /case\s+['"]([^'"]+)['"]\s*:\s*(?:default\s*:\s*)?return\s*<div\s+([^>]+)>/g,
  )).map((match) => ({
    id: match[1],
    sfid: /\bdata-sfid\s*=\s*["']([^"']+)["']/.exec(match[2])?.[1] || null,
    routeView: /\bdata-shell-route-view\s*=\s*["']([^"']+)["']/.exec(match[2])?.[1] || null,
    routeViewExpression: /\bdata-shell-route-view\s*=\s*\{([^}]+)\}/.exec(match[2])?.[1]?.trim() || null,
  }));
}

function entryMountsSiteApp(source) {
  return source.includes("from '../components/app/SiteApp.jsx'") && /<SiteApp\s*\/>/.test(source);
}

function expectedViteKey(htmlPath) {
  return htmlPath.replace(/\.html$/, '');
}

function extensionlessAlias(path) {
  return path.endsWith('.html') ? path.slice(0, -'.html'.length) : path;
}

async function listAuthoredHtmlPaths() {
  const rootFiles = (await readdir(appRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => entry.name);
  const labFiles = (await readdir(resolve(appRoot, 'lab'), { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => `lab/${entry.name}`);
  return [...rootFiles, ...labFiles].sort();
}

export async function collectRouteRegistrySnapshot() {
  const viteSource = await readFile(resolve(appRoot, 'vite.config.js'), 'utf8');
  const routeManifestSource = await readFile(resolve(appRoot, 'src/lib/route-manifest.js'), 'utf8');
  const siteAppSource = await readFile(resolve(appRoot, 'src/components/app/SiteApp.jsx'), 'utf8');
  const studioShellSource = await readFile(resolve(appRoot, 'src/components/app/StudioShell.jsx'), 'utf8');
  const catalog = JSON.parse(await readFile(resolve(appRoot, 'src/data/simulationCatalog.json'), 'utf8'));
  const htmlPaths = await listAuthoredHtmlPaths();
  const htmlEntries = [];

  for (const htmlPath of htmlPaths) {
    const source = await readFile(resolve(appRoot, htmlPath), 'utf8');
    htmlEntries.push({ htmlPath, ...extractModuleScriptSource(source) });
  }

  const entryDir = resolve(appRoot, 'src/entries');
  const entryFiles = (await readdir(entryDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.(?:js|jsx)$/.test(entry.name))
    .map((entry) => `/src/entries/${entry.name}`)
    .sort();
  const entrySources = new Map();
  for (const entryFile of entryFiles) {
    entrySources.set(entryFile, await readFile(resolve(appRoot, entryFile.replace(/^\//, '')), 'utf8'));
  }

  const siteAppDescriptors = extractSiteAppDescriptors(siteAppSource);
  if (siteAppDescriptors) {
    const importOwners = extractSiteAppImportOwners(siteAppSource);
    const siteAppDir = resolve(appRoot, 'src/components/app');
    for (const descriptor of siteAppDescriptors) {
      const resolvedOwners = [];
      const localBody = extractFunctionBody(siteAppSource, descriptor.getView);
      if (localBody !== null) resolvedOwners.push({ body: localBody, owner: 'SiteApp.jsx' });

      for (const importedOwner of importOwners.get(descriptor.getView) || []) {
        const ownerPath = resolve(siteAppDir, importedOwner.sourcePath);
        const ownerSource = await readFile(ownerPath, 'utf8').catch(() => null);
        const body = ownerSource === null
          ? null
          : extractFunctionBody(ownerSource, importedOwner.importedName);
        if (body !== null) resolvedOwners.push({ body, owner: importedOwner.sourcePath });
      }

      descriptor.viewOwnerStatus = resolvedOwners.length === 1
        ? 'resolved'
        : (resolvedOwners.length > 1 ? 'ambiguous' : 'missing');
      descriptor.viewOwner = resolvedOwners.length === 1 ? resolvedOwners[0].owner : null;
      descriptor.viewKind = resolvedOwners.length === 1
        ? classifyDescriptorView(resolvedOwners[0].body)
        : 'unknown';
      descriptor.localViewRuntimeOwnerCandidates = descriptor.viewOwner === 'SiteApp.jsx'
        ? getImportedBindingOwnersUsedByFunction(localBody, importOwners)
        : [];

      const runtimeOwners = [];
      if (sourceDeclaresBinding(siteAppSource, descriptor.runtime)) {
        runtimeOwners.push({ owner: 'SiteApp.jsx' });
      }
      for (const importedOwner of importOwners.get(descriptor.runtime) || []) {
        const ownerPath = resolve(siteAppDir, importedOwner.sourcePath);
        const ownerSource = await readFile(ownerPath, 'utf8').catch(() => null);
        if (sourceDeclaresBinding(ownerSource, importedOwner.importedName)) {
          runtimeOwners.push({ owner: importedOwner.sourcePath });
        }
      }
      descriptor.runtimeOwnerStatus = runtimeOwners.length === 1
        ? 'resolved'
        : (runtimeOwners.length > 1 ? 'ambiguous' : 'missing');
      descriptor.runtimeOwner = runtimeOwners.length === 1 ? runtimeOwners[0].owner : null;
    }
  }

  const routesModule = await import(pathToFileURL(resolve(appRoot, 'src/lib/routes.js')).href);
  const routes = extractRouteDefinitions(routeManifestSource);
  const knownAliasResults = (routes || []).flatMap((route) => route.aliases.map((alias) => ({
    alias,
    expectedRouteId: route.id,
    resolvedRouteId: routesModule.resolveRouteFromPathname(alias)?.id || null,
  })));

  return {
    viteInputs: extractViteInputs(viteSource),
    htmlEntries,
    entryFiles,
    entrySources,
    routes,
    shellTabs: routesModule.SHELL_ROUTE_TABS.map((tab) => ({ ...tab })),
    routeResolution: {
      knownAliasResults,
      unknownPathRouteId: routesModule.resolveRouteFromPathname('/__abs-unknown-route__')?.id || null,
      unknownRouteId: routesModule.getRouteById('__abs-unknown-route__')?.id || null,
      spaEligibility: (routes || []).map((route) => ({
        routeId: route.id,
        expected: route.layout === 'shared-shell',
        actual: routesModule.isSharedShellRoute(routesModule.getRouteById(route.id)),
      })),
    },
    siteAppDescriptors,
    shellScenes: extractShellScenes(studioShellSource),
    catalogLabRoutes: (catalog.simulations || [])
      .filter((entry) => entry.surface === 'lab-route')
      .map((entry) => ({ id: entry.id, launchPath: String(entry.launchPath || '').split('?')[0] })),
  };
}

function indexUnique(errors, entries, getKey, duplicateCode, label) {
  const index = new Map();
  entries.forEach((entry) => {
    const key = getKey(entry);
    if (index.has(key)) addError(errors, duplicateCode, `${label}: duplicate "${key}"`);
    index.set(key, entry);
  });
  return index;
}

function compareSets(errors, actualValues, expectedValues, missingCode, extraCode, label) {
  const actual = new Set(actualValues);
  const expected = new Set(expectedValues);
  expected.forEach((value) => {
    if (!actual.has(value)) addError(errors, missingCode, `${label}: missing "${value}"`);
  });
  actual.forEach((value) => {
    if (!expected.has(value)) addError(errors, extraCode, `${label}: unexpected "${value}"`);
  });
}

export function validateRouteRegistrySnapshot(snapshot) {
  const errors = [];
  if (snapshot.viteInputs.length !== BASELINE_COUNTS.viteInputs) {
    addError(errors, 'vite-input-count-drift', `Vite inputs: expected ${BASELINE_COUNTS.viteInputs}, found ${snapshot.viteInputs.length}`);
  }
  if (snapshot.htmlEntries.length !== BASELINE_COUNTS.htmlEntries) {
    addError(errors, 'html-entry-count-drift', `HTML entries: expected ${BASELINE_COUNTS.htmlEntries}, found ${snapshot.htmlEntries.length}`);
  }
  if (snapshot.entryFiles.length !== BASELINE_COUNTS.entryModules) {
    addError(errors, 'entry-module-count-drift', `Entry modules: expected ${BASELINE_COUNTS.entryModules}, found ${snapshot.entryFiles.length}`);
  }

  const viteByKey = indexUnique(errors, snapshot.viteInputs, (entry) => entry.key, 'vite-input-key-duplicate', 'Vite inputs');
  const viteByPath = indexUnique(errors, snapshot.viteInputs, (entry) => entry.htmlPath, 'vite-input-path-duplicate', 'Vite inputs');
  snapshot.viteInputs.forEach((entry) => {
    if (entry.key !== expectedViteKey(entry.htmlPath)) {
      addError(errors, 'vite-input-key-drift', `${entry.htmlPath}: Vite key "${entry.key}" must be "${expectedViteKey(entry.htmlPath)}"`);
    }
  });

  const htmlByPath = indexUnique(errors, snapshot.htmlEntries, (entry) => entry.htmlPath, 'html-entry-duplicate', 'HTML entries');
  compareSets(
    errors,
    [...viteByPath.keys()],
    [...htmlByPath.keys()],
    'vite-input-missing',
    'vite-input-extra',
    'Vite/HTML registry',
  );
  snapshot.htmlEntries.forEach((entry) => {
    if (entry.count !== 1 || !entry.src) {
      addError(errors, 'html-module-script-missing', `${entry.htmlPath}: expected one module script with src`);
    }
  });

  const referencedEntryFiles = snapshot.htmlEntries.map((entry) => entry.src).filter(Boolean);
  compareSets(
    errors,
    snapshot.entryFiles,
    referencedEntryFiles,
    'entry-module-missing',
    'entry-module-extra',
    'HTML/entry-module registry',
  );
  referencedEntryFiles.forEach((entryFile) => {
    if (!entryFile.startsWith('/src/entries/') || !snapshot.entrySources.has(entryFile)) {
      addError(errors, 'entry-module-target-missing', `HTML module target "${entryFile}" does not exist under src/entries`);
    }
  });

  if (!Array.isArray(snapshot.routes)) {
    addError(errors, 'route-registry-missing', 'route-manifest.js: missing ROUTE_MANIFEST object');
    return errors;
  }
  if (snapshot.routes.length !== BASELINE_COUNTS.routeDefinitions) {
    addError(errors, 'route-definition-count-drift', `Route definitions: expected ${BASELINE_COUNTS.routeDefinitions}, found ${snapshot.routes.length}`);
  }
  const routesByKey = indexUnique(errors, snapshot.routes, (entry) => entry.key, 'route-definition-key-duplicate', 'Route definitions');
  const routesById = indexUnique(errors, snapshot.routes, (entry) => entry.id, 'route-id-duplicate', 'Route definitions');
  const routeByAlias = new Map();
  snapshot.routes.forEach((route) => {
    if (route.key !== route.id) {
      addError(errors, 'route-id-drift', `${route.key}: route id "${route.id}" must match its registry key`);
    }
    if (!route.path?.startsWith('/') || !route.path.endsWith('.html')) {
      addError(errors, 'route-path-drift', `${route.key}: route path "${route.path}" must be an absolute HTML path`);
    }
    if (route.layout !== 'shared-shell' && route.layout !== 'standalone') {
      addError(errors, 'route-layout-missing', `${route.key}: route layout must be "shared-shell" or "standalone"`);
    }
    if (!route.aliases.includes(route.path)) {
      addError(errors, 'route-alias-canonical-missing', `${route.key}: aliases must include canonical path "${route.path}"`);
    }
    const shortAlias = extensionlessAlias(route.path);
    if (!route.aliases.includes(shortAlias)) {
      addError(errors, 'route-alias-short-missing', `${route.key}: aliases must include extensionless path "${shortAlias}"`);
    }
    findDuplicates(route.aliases).forEach((alias) => {
      addError(errors, 'route-alias-duplicate', `${route.key}: duplicate alias "${alias}"`);
    });
    route.aliases.forEach((alias) => {
      if (routeByAlias.has(alias) && routeByAlias.get(alias) !== route.id) {
        addError(errors, 'route-alias-collision', `${alias}: alias belongs to both ${routeByAlias.get(alias)} and ${route.id}`);
      }
      routeByAlias.set(alias, route.id);
      if (alias.endsWith('.html') && !route.aliases.includes(extensionlessAlias(alias))) {
        addError(errors, 'route-alias-pair-drift', `${route.key}: "${alias}" is missing its extensionless alias`);
      }
    });
  });

  const manifestTabs = snapshot.routes
    .filter((route) => route.shellTab)
    .sort((left, right) => left.shellTab.order - right.shellTab.order);
  if (manifestTabs.length !== BASELINE_COUNTS.shellTabs) {
    addError(errors, 'shell-tab-count-drift', `Route manifest: expected ${BASELINE_COUNTS.shellTabs} shell tabs, found ${manifestTabs.length}`);
  }
  const tabOrders = manifestTabs.map((route) => route.shellTab.order);
  if (findDuplicates(tabOrders).length || tabOrders.some((order, index) => order !== index)) {
    addError(errors, 'shell-tab-order-drift', 'Route manifest: shell tab order must be unique and contiguous from zero');
  }
  manifestTabs.forEach((route) => {
    if (!route.shellTab.label || !route.shellTab.ariaLabel) {
      addError(errors, 'shell-tab-metadata-missing', `${route.id}: shell tab label and ariaLabel are required`);
    }
    if (!route.shellTab.icon) {
      addError(errors, 'shell-tab-icon-missing', `${route.id}: shell tab icon is required`);
    }
  });
  const runtimeTabsById = indexUnique(errors, snapshot.shellTabs, (tab) => tab.routeId, 'shell-tab-route-duplicate', 'Runtime shell tabs');
  compareSets(
    errors,
    [...runtimeTabsById.keys()],
    manifestTabs.map((route) => route.id),
    'shell-tab-runtime-missing',
    'shell-tab-runtime-extra',
    'Route manifest/runtime shell tabs',
  );
  const manifestTabOrder = manifestTabs.map((route) => route.id).join(',');
  const runtimeTabOrder = snapshot.shellTabs.map((tab) => tab.routeId).join(',');
  const expectedTabOrder = EXPECTED_SHELL_TAB_ORDER.join(',');
  if (manifestTabOrder !== expectedTabOrder) {
    addError(errors, 'shell-tab-semantic-order-drift', `Route manifest shell tab order "${manifestTabOrder}" must be "${expectedTabOrder}"`);
  }
  if (manifestTabOrder !== runtimeTabOrder) {
    addError(errors, 'shell-tab-runtime-order-drift', `Runtime shell tab order "${runtimeTabOrder}" must match manifest order "${manifestTabOrder}"`);
  }
  manifestTabs.forEach((route) => {
    const runtimeTab = runtimeTabsById.get(route.id);
    if (!runtimeTab) return;
    const expectedTab = {
      href: route.path,
      label: route.shellTab.label,
      ariaLabel: route.shellTab.ariaLabel,
      icon: route.shellTab.icon || undefined,
      iconOnly: route.shellTab.iconOnly,
    };
    Object.entries(expectedTab).forEach(([property, expectedValue]) => {
      if (runtimeTab[property] !== expectedValue) {
        addError(errors, 'shell-tab-runtime-drift', `${route.id}: runtime shell tab ${property} does not match the route manifest`);
      }
    });
  });

  snapshot.routeResolution.knownAliasResults.forEach((result) => {
    if (result.resolvedRouteId !== result.expectedRouteId) {
      addError(errors, 'route-alias-runtime-drift', `${result.alias}: resolved to "${result.resolvedRouteId}" instead of "${result.expectedRouteId}"`);
    }
  });
  if (snapshot.routeResolution.unknownPathRouteId !== null) {
    addError(errors, 'unknown-path-internal-match', `Unknown same-origin paths must not resolve internally; found "${snapshot.routeResolution.unknownPathRouteId}"`);
  }
  if (snapshot.routeResolution.unknownRouteId !== null) {
    addError(errors, 'unknown-id-internal-match', `Unknown route ids must not fall back internally; found "${snapshot.routeResolution.unknownRouteId}"`);
  }
  snapshot.routeResolution.spaEligibility.forEach((result) => {
    if (result.actual !== result.expected) {
      addError(errors, 'route-spa-eligibility-drift', `${result.routeId}: SPA eligibility must follow manifest layout`);
    }
  });

  if (!Array.isArray(snapshot.siteAppDescriptors)) {
    addError(errors, 'siteapp-registry-missing', 'SiteApp.jsx: missing ROUTE_DESCRIPTORS object');
    return errors;
  }
  const descriptorsByKey = indexUnique(errors, snapshot.siteAppDescriptors, (entry) => entry.key, 'siteapp-descriptor-key-duplicate', 'SiteApp descriptors');
  const descriptorsById = indexUnique(errors, snapshot.siteAppDescriptors, (entry) => entry.routeId, 'siteapp-descriptor-id-duplicate', 'SiteApp descriptors');
  compareSets(
    errors,
    [...routesById.keys()],
    [...descriptorsById.keys()],
    'route-definition-missing',
    'siteapp-descriptor-missing',
    'Route manifest/SiteApp registry',
  );
  snapshot.siteAppDescriptors.forEach((descriptor) => {
    if (descriptor.key !== descriptor.routeId) {
      addError(errors, 'siteapp-descriptor-id-drift', `${descriptor.key}: descriptor route id "${descriptor.routeId}" must match its key`);
    }
    if (descriptor.viewOwnerStatus === 'ambiguous') {
      addError(errors, 'siteapp-descriptor-view-owner-ambiguous', `${descriptor.key}: getView function "${descriptor.getView}" has ambiguous ownership`);
    } else if (descriptor.viewOwnerStatus !== 'resolved' || descriptor.viewKind === 'unknown') {
      addError(errors, 'siteapp-descriptor-view-owner-missing', `${descriptor.key}: getView function "${descriptor.getView}" has no readable SiteApp import or local owner`);
    }
    if (!descriptor.runtime) {
      addError(errors, 'siteapp-descriptor-runtime-missing', `${descriptor.key}: descriptor has no explicit runtime identifier`);
    } else if (descriptor.runtimeOwnerStatus === 'ambiguous') {
      addError(errors, 'siteapp-descriptor-runtime-owner-ambiguous', `${descriptor.key}: runtime "${descriptor.runtime}" has ambiguous ownership`);
    } else if (descriptor.runtimeOwnerStatus !== 'resolved') {
      addError(errors, 'siteapp-descriptor-runtime-owner-missing', `${descriptor.key}: runtime "${descriptor.runtime}" has no readable SiteApp import or local owner`);
    } else if (
      descriptor.viewOwner === 'SiteApp.jsx'
      && descriptor.localViewRuntimeOwnerCandidates.length === 0
    ) {
      addError(errors, 'siteapp-descriptor-local-view-runtime-owner-missing', `${descriptor.key}: local getView wrapper has no imported route owner to validate its runtime against`);
    } else if (
      descriptor.viewOwner === 'SiteApp.jsx'
      && descriptor.localViewRuntimeOwnerCandidates.length > 1
    ) {
      addError(errors, 'siteapp-descriptor-local-view-runtime-owner-ambiguous', `${descriptor.key}: local getView wrapper delegates to multiple imported route owners`);
    } else if (
      descriptor.viewOwner === 'SiteApp.jsx'
      && descriptor.runtimeOwner !== descriptor.localViewRuntimeOwnerCandidates[0]
    ) {
      addError(errors, 'siteapp-descriptor-runtime-owner-drift', `${descriptor.key}: runtime owner "${descriptor.runtimeOwner}" must match local getView delegate owner "${descriptor.localViewRuntimeOwnerCandidates[0]}"`);
    } else if (
      descriptor.viewOwner
      && descriptor.viewOwner !== 'SiteApp.jsx'
      && descriptor.runtimeOwner !== descriptor.viewOwner
    ) {
      addError(errors, 'siteapp-descriptor-runtime-owner-drift', `${descriptor.key}: runtime owner "${descriptor.runtimeOwner}" must match view owner "${descriptor.viewOwner}"`);
    }
    const routeLayout = routesById.get(descriptor.routeId)?.layout;
    const descriptorLayout = descriptor.viewKind === 'standalone' ? 'standalone' : 'shared-shell';
    if (routeLayout && routeLayout !== descriptorLayout) {
      addError(errors, 'route-layout-descriptor-drift', `${descriptor.key}: manifest layout "${routeLayout}" conflicts with ${descriptor.viewKind} view ownership`);
    }
  });

  snapshot.routes.forEach((route) => {
    const htmlPath = route.path?.replace(/^\//, '');
    if (!htmlPath || !viteByPath.has(htmlPath)) {
      addError(errors, 'route-vite-input-missing', `${route.id}: canonical path "${route.path}" is not a Vite input`);
      return;
    }
    const htmlEntry = htmlByPath.get(htmlPath);
    const entrySource = snapshot.entrySources.get(htmlEntry?.src) || '';
    if (!entryMountsSiteApp(entrySource)) {
      addError(errors, 'route-entry-shell-drift', `${route.id}: canonical HTML entry does not mount SiteApp`);
    }
  });

  snapshot.htmlEntries.forEach((htmlEntry) => {
    const entrySource = snapshot.entrySources.get(htmlEntry.src) || '';
    if (!entryMountsSiteApp(entrySource)) return;
    const routeId = routeByAlias.get(`/${htmlEntry.htmlPath}`);
    if (!routeId) {
      addError(errors, 'shared-shell-entry-route-missing', `${htmlEntry.htmlPath}: SiteApp entry has no route path or alias`);
    } else if (!descriptorsById.has(routeId)) {
      addError(errors, 'shared-shell-entry-descriptor-missing', `${htmlEntry.htmlPath}: route ${routeId} has no SiteApp descriptor`);
    }
  });

  const expectedSceneIds = snapshot.siteAppDescriptors
    .filter((descriptor) => descriptor.viewKind === 'shell')
    .map((descriptor) => descriptor.routeId);
  const allowedSceneIds = new Set(expectedSceneIds);
  const scenesById = indexUnique(errors, snapshot.shellScenes, (entry) => entry.id, 'shell-scene-duplicate', 'StudioShell scenes');
  expectedSceneIds.forEach((id) => {
    if (!scenesById.has(id)) addError(errors, 'shell-scene-missing', `SiteApp/StudioShell registry: missing "${id}"`);
  });
  scenesById.forEach((scene, id) => {
    if (!allowedSceneIds.has(id)) addError(errors, 'shell-scene-extra', `SiteApp/StudioShell registry: unexpected "${id}"`);
  });
  snapshot.shellScenes.forEach((scene) => {
    const expectedSfid = `sfid:shell/${scene.id}`;
    if (scene.sfid !== expectedSfid) {
      addError(errors, 'shell-scene-sfid-drift', `${scene.id}: shell data-sfid "${scene.sfid}" must be "${expectedSfid}"`);
    }
    if (scene.id === 'home') {
      if (scene.routeViewExpression !== "routeRenderKey || 'home'" || scene.routeView) {
        addError(errors, 'shell-scene-route-view-drift', 'home: shell route-view metadata must retain the current fallback expression');
      }
    } else if (scene.routeViewExpression) {
      addError(errors, 'shell-scene-route-view-expression-drift', `${scene.id}: non-Home shell route-view metadata must not use an expression`);
    } else if (scene.routeView && scene.routeView !== scene.id) {
      addError(errors, 'shell-scene-route-view-drift', `${scene.id}: shell route-view metadata resolves to "${scene.routeView}"`);
    }
  });
  const riftScene = scenesById.get('rift-rings');
  if (riftScene) {
    if (!riftScene.routeView && !riftScene.routeViewExpression) {
      addError(errors, 'rift-shell-route-view-missing', 'rift-rings: literal data-shell-route-view="rift-rings" is required');
    } else if (riftScene.routeViewExpression) {
      addError(errors, 'rift-shell-route-view-expression-drift', 'rift-rings: data-shell-route-view must be a literal, not an expression');
    } else if (riftScene.routeView !== 'rift-rings') {
      addError(errors, 'rift-shell-route-view-drift', `rift-rings: data-shell-route-view resolves to "${riftScene.routeView}"`);
    }
  }

  const catalogById = indexUnique(errors, snapshot.catalogLabRoutes, (entry) => entry.id, 'catalog-route-duplicate', 'Simulation catalog routes');
  snapshot.catalogLabRoutes.forEach((catalogRoute) => {
    const route = routesById.get(catalogRoute.id);
    if (!route) {
      addError(errors, 'catalog-route-definition-missing', `${catalogRoute.id}: catalog lab route has no route-manifest definition`);
      return;
    }
    if (catalogRoute.launchPath !== route.path) {
      addError(errors, 'catalog-route-path-drift', `${catalogRoute.id}: catalog launchPath "${catalogRoute.launchPath}" must be "${route.path}"`);
    }
    if (!descriptorsById.has(catalogRoute.id)) {
      addError(errors, 'catalog-route-descriptor-missing', `${catalogRoute.id}: catalog lab route has no SiteApp descriptor`);
    }
    const descriptor = descriptorsById.get(catalogRoute.id);
    if (descriptor?.viewKind === 'standalone') {
      addError(errors, 'catalog-standalone-route-drift', `${catalogRoute.id}: standalone route must not claim a simulation-catalog lab relationship`);
    } else if (!scenesById.has(catalogRoute.id)) {
      addError(errors, 'catalog-route-scene-missing', `${catalogRoute.id}: catalog lab route has no StudioShell scene`);
    }
  });
  catalogById.forEach((catalogRoute) => {
    if (!catalogRoute.launchPath || !viteByPath.has(catalogRoute.launchPath.replace(/^\//, ''))) {
      addError(errors, 'catalog-route-vite-input-missing', `${catalogRoute.id}: catalog launchPath is not a Vite input`);
    }
  });

  snapshot.viteInputs.forEach((input) => {
    if (!existsSync(resolve(appRoot, input.htmlPath))) {
      addError(errors, 'vite-input-file-missing', `${input.key}: Vite input file "${input.htmlPath}" does not exist`);
    }
  });

  return errors;
}

function cloneSnapshot(snapshot) {
  return {
    ...structuredClone({
      viteInputs: snapshot.viteInputs,
      htmlEntries: snapshot.htmlEntries,
      entryFiles: snapshot.entryFiles,
      routes: snapshot.routes,
      shellTabs: snapshot.shellTabs,
      routeResolution: snapshot.routeResolution,
      siteAppDescriptors: snapshot.siteAppDescriptors,
      shellScenes: snapshot.shellScenes,
      catalogLabRoutes: snapshot.catalogLabRoutes,
    }),
    entrySources: new Map(snapshot.entrySources),
  };
}

async function runFixtures() {
  const baseline = await collectRouteRegistrySnapshot();
  const baselineErrors = validateRouteRegistrySnapshot(baseline);
  if (baselineErrors.length) {
    throw new Error(`Route registry fixture baseline is invalid:\n${baselineErrors.map((error) => `- ${error.message}`).join('\n')}`);
  }

  const fixtures = [
    ['missing Vite input', 'vite-input-missing', (snapshot) => snapshot.viteInputs.pop()],
    ['unexpected Vite input', 'vite-input-extra', (snapshot) => snapshot.viteInputs.push({ key: 'extra', htmlPath: 'extra.html' })],
    ['Vite key drift', 'vite-input-key-drift', (snapshot) => { snapshot.viteInputs[0].key = 'home'; }],
    ['missing HTML entry', 'vite-input-extra', (snapshot) => snapshot.htmlEntries.pop()],
    ['unexpected HTML entry', 'vite-input-missing', (snapshot) => snapshot.htmlEntries.push({ htmlPath: 'extra.html', count: 1, src: '/src/entries/index.jsx' })],
    ['missing HTML module script', 'html-module-script-missing', (snapshot) => { snapshot.htmlEntries[0].src = null; }],
    ['missing entry module', 'entry-module-missing', (snapshot) => snapshot.entryFiles.pop()],
    ['unexpected entry module', 'entry-module-extra', (snapshot) => snapshot.entryFiles.push('/src/entries/extra.jsx')],
    ['standalone/shared-shell entry drift', 'shared-shell-entry-route-missing', (snapshot) => { snapshot.htmlEntries.find((entry) => entry.htmlPath === 'explain-it-like-im.html').src = '/src/entries/index.jsx'; }],
    ['missing route definition', 'route-definition-missing', (snapshot) => snapshot.routes.pop()],
    ['unexpected route definition', 'siteapp-descriptor-missing', (snapshot) => snapshot.routes.push({ key: 'extra', id: 'extra', path: '/extra.html', aliases: ['/extra.html', '/extra'] })],
    ['route id drift', 'route-id-drift', (snapshot) => { snapshot.routes[0].id = 'not-home'; }],
    ['route path drift', 'route-vite-input-missing', (snapshot) => { snapshot.routes[0].path = '/home.html'; }],
    ['route layout omission', 'route-layout-missing', (snapshot) => { snapshot.routes[0].layout = null; }],
    ['standalone route layout drift', 'route-layout-descriptor-drift', (snapshot) => { snapshot.routes.find((route) => route.id === 'loader-playground').layout = 'shared-shell'; }],
    ['canonical alias omission', 'route-alias-canonical-missing', (snapshot) => { snapshot.routes[0].aliases = snapshot.routes[0].aliases.filter((alias) => alias !== snapshot.routes[0].path); }],
    ['extensionless alias omission', 'route-alias-short-missing', (snapshot) => { snapshot.routes[0].aliases = snapshot.routes[0].aliases.filter((alias) => alias !== extensionlessAlias(snapshot.routes[0].path)); }],
    ['alias collision', 'route-alias-collision', (snapshot) => snapshot.routes[1].aliases.push(snapshot.routes[0].aliases[0])],
    ['known alias runtime drift', 'route-alias-runtime-drift', (snapshot) => { snapshot.routeResolution.knownAliasResults[0].resolvedRouteId = 'about'; }],
    ['unknown path Home fallback', 'unknown-path-internal-match', (snapshot) => { snapshot.routeResolution.unknownPathRouteId = 'home'; }],
    ['unknown id Home fallback', 'unknown-id-internal-match', (snapshot) => { snapshot.routeResolution.unknownRouteId = 'home'; }],
    ['standalone SPA eligibility drift', 'route-spa-eligibility-drift', (snapshot) => { snapshot.routeResolution.spaEligibility.find((route) => route.routeId === 'loader-playground').actual = true; }],
    ['missing fifth manifest shell tab', 'shell-tab-count-drift', (snapshot) => { snapshot.routes.find((route) => route.id === 'playground').shellTab = null; }],
    ['missing manifest shell tab', 'shell-tab-runtime-extra', (snapshot) => { snapshot.routes.find((route) => route.id === 'contact').shellTab = null; }],
    ['shell tab metadata omission', 'shell-tab-metadata-missing', (snapshot) => { snapshot.routes.find((route) => route.id === 'about').shellTab.ariaLabel = null; }],
    ['shell tab icon omission', 'shell-tab-icon-missing', (snapshot) => { snapshot.routes.find((route) => route.id === 'home').shellTab.icon = null; }],
    ['shell tab semantic order drift', 'shell-tab-semantic-order-drift', (snapshot) => {
      const contactOrder = snapshot.routes.find((route) => route.id === 'contact').shellTab.order;
      snapshot.routes.find((route) => route.id === 'contact').shellTab.order = snapshot.routes.find((route) => route.id === 'playground').shellTab.order;
      snapshot.routes.find((route) => route.id === 'playground').shellTab.order = contactOrder;
      snapshot.shellTabs = snapshot.shellTabs.map((tab) => ({ ...tab })).sort((left, right) => (
        snapshot.routes.find((route) => route.id === left.routeId).shellTab.order
        - snapshot.routes.find((route) => route.id === right.routeId).shellTab.order
      ));
    }],
    ['shell tab runtime order drift', 'shell-tab-runtime-order-drift', (snapshot) => { snapshot.shellTabs.reverse(); }],
    ['shell tab href drift', 'shell-tab-runtime-drift', (snapshot) => { snapshot.shellTabs.find((tab) => tab.routeId === 'portfolio').href = '/work.html'; }],
    ['missing SiteApp descriptor', 'siteapp-descriptor-missing', (snapshot) => snapshot.siteAppDescriptors.pop()],
    ['unexpected SiteApp descriptor', 'route-definition-missing', (snapshot) => snapshot.siteAppDescriptors.push({ key: 'extra', routeId: 'extra', getView: 'getExtraView' })],
    ['SiteApp descriptor id drift', 'siteapp-descriptor-id-drift', (snapshot) => { snapshot.siteAppDescriptors[0].routeId = 'about'; }],
    ['SiteApp getView owner omission', 'siteapp-descriptor-view-owner-missing', (snapshot) => { snapshot.siteAppDescriptors[0].viewOwnerStatus = 'missing'; }],
    ['SiteApp getView owner ambiguity', 'siteapp-descriptor-view-owner-ambiguous', (snapshot) => { snapshot.siteAppDescriptors[0].viewOwnerStatus = 'ambiguous'; }],
    ['SiteApp runtime omission', 'siteapp-descriptor-runtime-missing', (snapshot) => { snapshot.siteAppDescriptors[0].runtime = null; }],
    ['SiteApp runtime owner omission', 'siteapp-descriptor-runtime-owner-missing', (snapshot) => { snapshot.siteAppDescriptors[0].runtimeOwnerStatus = 'missing'; }],
    ['SiteApp runtime wrong owner', 'siteapp-descriptor-runtime-owner-drift', (snapshot) => { snapshot.siteAppDescriptors.find((descriptor) => descriptor.routeId === 'portfolio').runtimeOwner = '../../routes/home/HomeRoute.jsx'; }],
    ['SiteApp runtime owner ambiguity', 'siteapp-descriptor-runtime-owner-ambiguous', (snapshot) => { snapshot.siteAppDescriptors[0].runtimeOwnerStatus = 'ambiguous'; }],
    ['atmosphere local-wrapper runtime wrong owner', 'siteapp-descriptor-runtime-owner-drift', (snapshot) => { snapshot.siteAppDescriptors.find((descriptor) => descriptor.routeId === 'atmosphere-webgl-post').runtimeOwner = '../../routes/contact/ContactRoute.jsx'; }],
    ['atmosphere local-wrapper route owner omission', 'siteapp-descriptor-local-view-runtime-owner-missing', (snapshot) => { snapshot.siteAppDescriptors.find((descriptor) => descriptor.routeId === 'atmosphere-webgl-post').localViewRuntimeOwnerCandidates = []; }],
    ['atmosphere local-wrapper route owner ambiguity', 'siteapp-descriptor-local-view-runtime-owner-ambiguous', (snapshot) => { snapshot.siteAppDescriptors.find((descriptor) => descriptor.routeId === 'atmosphere-webgl-post').localViewRuntimeOwnerCandidates.push('../../routes/contact/ContactRoute.jsx'); }],
    ['Loader entry drift', 'route-entry-shell-drift', (snapshot) => { snapshot.htmlEntries.find((entry) => entry.htmlPath === 'lab/loader-playground.html').src = '/src/entries/explain-it-like-im.jsx'; }],
    ['Loader descriptor omission', 'siteapp-descriptor-missing', (snapshot) => { snapshot.siteAppDescriptors = snapshot.siteAppDescriptors.filter((descriptor) => descriptor.routeId !== 'loader-playground'); }],
    ['Loader catalog drift', 'catalog-standalone-route-drift', (snapshot) => snapshot.catalogLabRoutes.push({ id: 'loader-playground', launchPath: '/lab/loader-playground.html' })],
    ['missing shell scene', 'shell-scene-missing', (snapshot) => snapshot.shellScenes.pop()],
    ['Rift shared-shell scene omission', 'shell-scene-missing', (snapshot) => { snapshot.shellScenes = snapshot.shellScenes.filter((scene) => scene.id !== 'rift-rings'); }],
    ['Loader standalone scene addition', 'shell-scene-extra', (snapshot) => snapshot.shellScenes.push({ id: 'loader-playground', sfid: 'sfid:shell/loader-playground', routeView: null, routeViewExpression: null })],
    ['Simulations standalone scene addition', 'shell-scene-extra', (snapshot) => snapshot.shellScenes.push({ id: 'simulations', sfid: 'sfid:shell/simulations', routeView: null, routeViewExpression: null })],
    ['unexpected shell scene', 'shell-scene-extra', (snapshot) => snapshot.shellScenes.push({ id: 'extra', sfid: 'sfid:shell/extra', routeView: null, routeViewExpression: null })],
    ['shell scene sfid drift', 'shell-scene-sfid-drift', (snapshot) => { snapshot.shellScenes[0].sfid = 'sfid:shell/not-home'; }],
    ['shell scene route-view drift', 'shell-scene-route-view-drift', (snapshot) => { snapshot.shellScenes.find((scene) => scene.id === 'home').routeViewExpression = "routeRenderKey || 'about'"; }],
    ['Rift route-view omission', 'rift-shell-route-view-missing', (snapshot) => {
      const riftScene = snapshot.shellScenes.find((scene) => scene.id === 'rift-rings');
      riftScene.routeView = null;
      riftScene.routeViewExpression = null;
    }],
    ['Rift route-view wrong literal', 'rift-shell-route-view-drift', (snapshot) => {
      const riftScene = snapshot.shellScenes.find((scene) => scene.id === 'rift-rings');
      riftScene.routeView = 'home';
      riftScene.routeViewExpression = null;
    }],
    ['Rift expression-form route-view drift', 'rift-shell-route-view-expression-drift', (snapshot) => {
      const riftScene = snapshot.shellScenes.find((scene) => scene.id === 'rift-rings');
      riftScene.routeView = null;
      riftScene.routeViewExpression = 'routeRenderKey';
    }],
    ['catalog route without definition', 'catalog-route-definition-missing', (snapshot) => snapshot.catalogLabRoutes.push({ id: 'extra', launchPath: '/lab/extra.html' })],
    ['catalog route path drift', 'catalog-route-path-drift', (snapshot) => { snapshot.catalogLabRoutes[0].launchPath = '/lab/not-repel-room.html'; }],
  ];

  const failures = [];
  fixtures.forEach(([name, expectedCode, mutate]) => {
    const snapshot = cloneSnapshot(baseline);
    mutate(snapshot);
    const errors = validateRouteRegistrySnapshot(snapshot);
    if (!errors.some((error) => error.code === expectedCode)) {
      failures.push(`${name}: expected ${expectedCode}, received ${errors.map((error) => error.code).join(', ') || 'no error'}`);
    }
  });
  const standaloneLoader = cloneSnapshot(baseline);
  const loaderDescriptor = standaloneLoader.siteAppDescriptors
    .find((descriptor) => descriptor.routeId === 'loader-playground');
  if (loaderDescriptor?.viewKind !== 'standalone') {
    failures.push('standalone Loader acceptance: Loader descriptor was not derived as standalone');
  }
  if (standaloneLoader.shellScenes.some((scene) => scene.id === 'loader-playground')) {
    failures.push('standalone Loader acceptance: Loader unexpectedly has a StudioShell scene');
  }
  const standaloneErrors = validateRouteRegistrySnapshot(standaloneLoader);
  if (standaloneErrors.length) {
    failures.push(`standalone Loader acceptance: ${standaloneErrors.map((error) => error.code).join(', ')}`);
  }
  if (failures.length) throw new Error(`Route registry fixtures failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
  console.log(`Route registry fixtures passed: ${fixtures.length} supported omission/drift classes fail closed.`);
}

async function main() {
  if (process.argv.includes('--fixtures')) {
    await runFixtures();
    return;
  }
  const snapshot = await collectRouteRegistrySnapshot();
  const errors = validateRouteRegistrySnapshot(snapshot);
  if (errors.length) {
    console.error(`Route registry validation failed:\n${errors.map((error) => `- [${error.code}] ${error.message}`).join('\n')}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Route registry validation passed: ${snapshot.viteInputs.length} Vite inputs, ${snapshot.entryFiles.length} entry modules, ${snapshot.routes.length} SiteApp routes, ${snapshot.shellScenes.length} shell scenes.`);
}

const isDirectRun = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
