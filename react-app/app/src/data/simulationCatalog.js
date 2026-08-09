import catalogData from './simulationCatalog.json' with { type: 'json' };

export const SIMULATION_STAGES = Object.freeze({
  DAILY_ROTATION: 'daily-rotation',
  COLLECTION: 'collection',
  AUTOMATION_CANDIDATE: 'automation-candidate',
  HIDDEN: 'hidden',
});

const STAGE_LABELS = Object.freeze({
  [SIMULATION_STAGES.DAILY_ROTATION]: 'Daily Simulation',
  [SIMULATION_STAGES.COLLECTION]: 'Collection',
  [SIMULATION_STAGES.AUTOMATION_CANDIDATE]: 'Automation candidates',
  [SIMULATION_STAGES.HIDDEN]: 'Hidden',
});

export const SIMULATION_FOCUS_STORAGE_KEY = 'abs_simulation_focus_choice_v1';
export const SIMULATION_FOCUS_STORAGE_VERSION = 2;
export const SIMULATION_FOCUS_CHANGED_EVENT = 'abs:simulation-focus-changed';
export const SIMULATION_RELOAD_STORAGE_KEY = 'abs_simulation_reload_choice_v1';

export const SIMULATION_ID_ALIASES = Object.freeze({
  'wall-repel': 'repel-room',
  bubbles: 'pit',
  'weave-field': 'pit',
});

let volatileFocusChoice = null;
let volatileReloadSimulationId = null;
const SIMULATION_FOCUS_PAGE_LOAD_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function normalizeSimulationId(id) {
  const value = String(id || '').trim();
  return SIMULATION_ID_ALIASES[value] || value;
}

function dispatchSimulationFocusChanged(detail = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(SIMULATION_FOCUS_CHANGED_EVENT, {
    detail: {
      storageKey: SIMULATION_FOCUS_STORAGE_KEY,
      ...detail,
    },
  }));
}

function withPreviewDefaults(entry) {
  const previewBase = `/previews/simulations/${entry.previewId || entry.id}`;
  return Object.freeze({
    ...entry,
    stageLabel: STAGE_LABELS[entry.stage] || entry.stage,
    preview: Object.freeze({
      poster: `${previewBase}/poster.png`,
      animated: `${previewBase}/preview.gif`,
      ...(entry.preview || {}),
    }),
  });
}

export const SIMULATION_CATALOG_VERSION = catalogData.version;
export const SIMULATION_CATALOG_UPDATED_AT = catalogData.updatedAt;
export const SIMULATION_STAGE_DESCRIPTIONS = Object.freeze({ ...(catalogData.stages || {}) });
export const SIMULATION_CATALOG = Object.freeze(
  (catalogData.simulations || []).map(withPreviewDefaults),
);

export const SIMULATION_BY_ID = Object.freeze(
  Object.fromEntries(
    SIMULATION_CATALOG.flatMap((entry) => {
      const ids = new Set([
        entry.id,
        ...(Array.isArray(entry.legacyIds) ? entry.legacyIds : []),
      ]);
      Object.entries(SIMULATION_ID_ALIASES).forEach(([alias, canonical]) => {
        if (canonical === entry.id) ids.add(alias);
      });
      return Array.from(ids).map((id) => [id, entry]);
    }),
  ),
);

export const DAILY_ROTATION_SIMULATION_IDS = Object.freeze(
  SIMULATION_CATALOG
    .filter((entry) => entry.stage === SIMULATION_STAGES.DAILY_ROTATION)
    .map((entry) => entry.id),
);

export const EXTENDED_SIMULATION_IDS = Object.freeze(
  SIMULATION_CATALOG
    .filter((entry) => entry.stage === SIMULATION_STAGES.COLLECTION && entry.includeInNarrative)
    .map((entry) => entry.id),
);

export const ROUTE_BACKED_DAILY_HREFS = Object.freeze(
  Object.fromEntries(
    SIMULATION_CATALOG
      .filter((entry) => entry.stage === SIMULATION_STAGES.DAILY_ROTATION && entry.dailyHref)
      .map((entry) => [entry.id, entry.dailyHref]),
  ),
);

export function getSimulationById(id) {
  return SIMULATION_BY_ID[normalizeSimulationId(id)] || SIMULATION_BY_ID[id] || null;
}

export function getSimulationName(id) {
  return getSimulationById(id)?.name || id;
}

export function isSimulationInDailyRotation(id) {
  return getSimulationById(id)?.stage === SIMULATION_STAGES.DAILY_ROTATION;
}

function getSimulationFromList(id, simulations = SIMULATION_CATALOG) {
  const canonicalId = normalizeSimulationId(id);
  if (simulations === SIMULATION_CATALOG) return getSimulationById(canonicalId);
  return simulations.find((entry) => (
    entry.id === canonicalId
    || (Array.isArray(entry.legacyIds) && entry.legacyIds.includes(String(id || '').trim()))
  )) || null;
}

function isDailyFocusSimulation(id, simulations = SIMULATION_CATALOG) {
  return getSimulationFromList(id, simulations)?.stage === SIMULATION_STAGES.DAILY_ROTATION;
}

function getFocusStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage || null;
  } catch {
    return null;
  }
}

function getReloadStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage || null;
  } catch {
    return null;
  }
}

function readLastReloadSimulationId(storage, simulations, catalogVersion) {
  try {
    const raw = storage?.getItem?.(SIMULATION_RELOAD_STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    if (stored?.catalogVersion !== catalogVersion) return null;
    return isDailyFocusSimulation(stored.simulationId, simulations)
      ? normalizeSimulationId(stored.simulationId)
      : null;
  } catch {
    return null;
  }
}

function rememberReloadSimulationId(simulationId, storage, catalogVersion) {
  try {
    storage?.setItem?.(SIMULATION_RELOAD_STORAGE_KEY, JSON.stringify({
      catalogVersion,
      simulationId,
    }));
  } catch {
    /* Reload selection still works for the current page without persistence. */
  }
}

function removeFocusChoice(storage) {
  volatileFocusChoice = null;
  try {
    storage?.removeItem?.(SIMULATION_FOCUS_STORAGE_KEY);
  } catch {
    /* no-op */
  }
}

function parseStoredFocusChoice(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function getDailyFocusSimulations(simulations = SIMULATION_CATALOG) {
  return simulations.filter((entry) => entry.stage === SIMULATION_STAGES.DAILY_ROTATION);
}

export function getDailyFocusSimulationIds(simulations = SIMULATION_CATALOG) {
  return getDailyFocusSimulations(simulations).map((entry) => entry.id);
}

export function getReloadSimulation(simulations = SIMULATION_CATALOG, options = {}) {
  const dailySimulations = getDailyFocusSimulations(simulations);
  if (!dailySimulations.length) return null;

  const cachedSimulation = volatileReloadSimulationId
    ? getSimulationFromList(volatileReloadSimulationId, simulations)
    : null;
  if (cachedSimulation?.stage === SIMULATION_STAGES.DAILY_ROTATION) return cachedSimulation;

  const reloadStorage = getReloadStorage(options.storage);
  const catalogVersion = options.catalogVersion ?? SIMULATION_CATALOG_VERSION;
  const lastSimulationId = readLastReloadSimulationId(reloadStorage, simulations, catalogVersion);
  const candidates = dailySimulations.length > 1
    ? dailySimulations.filter((entry) => entry.id !== lastSimulationId)
    : dailySimulations;
  const randomValue = Number(options.random?.() ?? Math.random());
  const safeRandomValue = Number.isFinite(randomValue)
    ? Math.min(Math.max(randomValue, 0), 0.9999999999999999)
    : 0;
  const selectedSimulation = candidates[Math.floor(safeRandomValue * candidates.length)] || candidates[0];

  volatileReloadSimulationId = selectedSimulation.id;
  rememberReloadSimulationId(selectedSimulation.id, reloadStorage, catalogVersion);
  return selectedSimulation;
}

export function getReloadSimulationId(simulations = SIMULATION_CATALOG, options = {}) {
  return getReloadSimulation(simulations, options)?.id || null;
}

export function rememberReloadSimulation(simulationId, options = {}) {
  const {
    storage,
    simulations = SIMULATION_CATALOG,
    catalogVersion = SIMULATION_CATALOG_VERSION,
  } = options;
  const canonicalSimulationId = normalizeSimulationId(simulationId);
  if (!isDailyFocusSimulation(canonicalSimulationId, simulations)) return null;

  rememberReloadSimulationId(
    canonicalSimulationId,
    getReloadStorage(storage),
    catalogVersion,
  );
  return canonicalSimulationId;
}

export function clearManualSimulationFocus(options = {}) {
  removeFocusChoice(getFocusStorage(options.storage));
  dispatchSimulationFocusChanged({ simulationId: null, source: 'clear' });
}

export function readManualSimulationFocus(options = {}) {
  const {
    storage,
    simulations = SIMULATION_CATALOG,
    catalogVersion = SIMULATION_CATALOG_VERSION,
  } = options;
  const focusStorage = getFocusStorage(storage);

  let rawChoice = null;
  if (focusStorage) {
    try {
      rawChoice = focusStorage.getItem(SIMULATION_FOCUS_STORAGE_KEY);
    } catch {
      rawChoice = null;
    }
  }

  const stored = parseStoredFocusChoice(rawChoice) || volatileFocusChoice;
  const isValid = (
    stored
    && stored.version === SIMULATION_FOCUS_STORAGE_VERSION
    && stored.catalogVersion === catalogVersion
    && stored.pageLoadId === SIMULATION_FOCUS_PAGE_LOAD_ID
    && isDailyFocusSimulation(normalizeSimulationId(stored.simulationId), simulations)
  );

  if (!isValid) {
    removeFocusChoice(focusStorage);
    return null;
  }

  return Object.freeze({
    version: stored.version,
    pageLoadId: stored.pageLoadId,
    simulationId: normalizeSimulationId(stored.simulationId),
    catalogVersion: stored.catalogVersion,
  });
}

export function writeManualSimulationFocus(simulationId, options = {}) {
  const {
    storage,
    reloadStorage,
    simulations = SIMULATION_CATALOG,
    catalogVersion = SIMULATION_CATALOG_VERSION,
  } = options;
  const focusStorage = getFocusStorage(storage);
  const canonicalSimulationId = normalizeSimulationId(simulationId);
  if (!isDailyFocusSimulation(canonicalSimulationId, simulations)) return null;

  const choice = {
    version: SIMULATION_FOCUS_STORAGE_VERSION,
    pageLoadId: SIMULATION_FOCUS_PAGE_LOAD_ID,
    simulationId: canonicalSimulationId,
    catalogVersion,
  };
  const savedChoice = Object.freeze({ ...choice });
  volatileFocusChoice = savedChoice;

  if (focusStorage) {
    try {
      focusStorage.setItem(SIMULATION_FOCUS_STORAGE_KEY, JSON.stringify(choice));
    } catch {
      /* The volatile fallback keeps the current page session usable. */
    }
  }

  rememberReloadSimulation(canonicalSimulationId, {
    storage: reloadStorage,
    simulations,
    catalogVersion,
  });

  dispatchSimulationFocusChanged({ simulationId: canonicalSimulationId, source: 'manual' });
  return savedChoice;
}

export function getResolvedSimulationFocus(options = {}) {
  const {
    storage,
    reloadStorage,
    random,
    simulations = SIMULATION_CATALOG,
    catalogVersion = SIMULATION_CATALOG_VERSION,
  } = options;
  const reloadSimulation = getReloadSimulation(simulations, {
    storage: reloadStorage,
    random,
    catalogVersion,
  });
  const manualChoice = readManualSimulationFocus({ storage, simulations, catalogVersion });
  const selectedSimulation = manualChoice
    ? getSimulationFromList(manualChoice.simulationId, simulations)
    : null;
  const activeSimulation = selectedSimulation || reloadSimulation || null;

  return Object.freeze({
    dailyId: reloadSimulation?.id || null,
    dailySimulation: reloadSimulation,
    reloadId: reloadSimulation?.id || null,
    reloadSimulation,
    selectedId: selectedSimulation?.id || null,
    selectedSimulation,
    activeId: activeSimulation?.id || null,
    activeSimulation,
    isManualSelection: Boolean(selectedSimulation),
    catalogVersion,
  });
}

export function getSimulationLaunchTarget(id, simulations = SIMULATION_CATALOG) {
  const canonicalId = normalizeSimulationId(id);
  const entry = getSimulationFromList(canonicalId, simulations);
  if (!entry || !isDailyFocusSimulation(canonicalId, simulations)) return null;

  return Object.freeze({
    id: entry.id,
    name: entry.name,
    surface: entry.surface,
    href: entry.dailyHref || entry.launchPath || '/index.html',
    routeBacked: entry.surface === 'lab-route',
    mode: entry.surface === 'home-mode' ? entry.id : null,
    entry,
  });
}
