import catalogData from './simulationCatalog.json';

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
export const SIMULATION_FOCUS_STORAGE_VERSION = 1;
export const SIMULATION_FOCUS_CHANGED_EVENT = 'abs:simulation-focus-changed';

export const SIMULATION_ID_ALIASES = Object.freeze({
  'wall-repel': 'repel-room',
});

let volatileFocusChoice = null;

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
export const DAILY_ROTATION_ANCHOR = Object.freeze({ ...(catalogData.dailyRotation || {}) });

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

export function getDayOfYear(date = new Date()) {
  const oneDay = 1000 * 60 * 60 * 24;
  const start = Date.UTC(date.getFullYear(), 0, 1);
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((current - start) / oneDay);
}

function getUtcDayStamp(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / (1000 * 60 * 60 * 24));
}

export function getDailyFocusDayStamp(date = new Date()) {
  return getUtcDayStamp(date);
}

function parseAnchorDayStamp(anchorDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(anchorDate || ''));
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10) - 1;
  const day = Number.parseInt(match[3], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const stamp = Math.floor(Date.UTC(year, month, day) / (1000 * 60 * 60 * 24));
  const parsed = new Date(stamp * 1000 * 60 * 60 * 24);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month || parsed.getUTCDate() !== day) {
    return null;
  }

  return stamp;
}

function getAnchoredDailyRotationIndex(date, dailySimulations) {
  const anchorIndex = dailySimulations.findIndex((entry) => entry.id === DAILY_ROTATION_ANCHOR.anchorSimulationId);
  const anchorDayStamp = parseAnchorDayStamp(DAILY_ROTATION_ANCHOR.anchorDate);
  if (anchorIndex < 0 || anchorDayStamp === null) return null;

  const daysSinceAnchor = getUtcDayStamp(date) - anchorDayStamp;
  return ((anchorIndex + daysSinceAnchor) % dailySimulations.length + dailySimulations.length) % dailySimulations.length;
}

export function getDailyRotationIndex(date = new Date(), simulations = SIMULATION_CATALOG) {
  const dailySimulations = simulations.filter((entry) => entry.stage === SIMULATION_STAGES.DAILY_ROTATION);
  if (!dailySimulations.length) return -1;
  return getAnchoredDailyRotationIndex(date, dailySimulations) ?? getDayOfYear(date) % dailySimulations.length;
}

export function getDailySimulation(date = new Date(), simulations = SIMULATION_CATALOG) {
  const dailySimulations = simulations.filter((entry) => entry.stage === SIMULATION_STAGES.DAILY_ROTATION);
  if (!dailySimulations.length) return null;
  const index = getDailyRotationIndex(date, simulations);
  return index >= 0 ? dailySimulations[index] : null;
}

export function getDailySimulationId(date = new Date(), simulations = SIMULATION_CATALOG) {
  return getDailySimulation(date, simulations)?.id || null;
}

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
    return window.localStorage || null;
  } catch {
    return null;
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

export function clearManualSimulationFocus(options = {}) {
  removeFocusChoice(getFocusStorage(options.storage));
  dispatchSimulationFocusChanged({ simulationId: null, source: 'clear' });
}

export function readManualSimulationFocus(options = {}) {
  const {
    date = new Date(),
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
  const dayStamp = getDailyFocusDayStamp(date);
  const isValid = (
    stored
    && stored.version === SIMULATION_FOCUS_STORAGE_VERSION
    && stored.catalogVersion === catalogVersion
    && stored.dayStamp === dayStamp
    && isDailyFocusSimulation(normalizeSimulationId(stored.simulationId), simulations)
  );

  if (!isValid) {
    removeFocusChoice(focusStorage);
    return null;
  }

  return Object.freeze({
    version: stored.version,
    dayStamp: stored.dayStamp,
    simulationId: normalizeSimulationId(stored.simulationId),
    catalogVersion: stored.catalogVersion,
  });
}

export function writeManualSimulationFocus(simulationId, options = {}) {
  const {
    date = new Date(),
    storage,
    simulations = SIMULATION_CATALOG,
    catalogVersion = SIMULATION_CATALOG_VERSION,
  } = options;
  const focusStorage = getFocusStorage(storage);
  const canonicalSimulationId = normalizeSimulationId(simulationId);
  if (!isDailyFocusSimulation(canonicalSimulationId, simulations)) return null;

  const choice = {
    version: SIMULATION_FOCUS_STORAGE_VERSION,
    dayStamp: getDailyFocusDayStamp(date),
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

  dispatchSimulationFocusChanged({ simulationId: canonicalSimulationId, source: 'manual' });
  return savedChoice;
}

export function getResolvedSimulationFocus(options = {}) {
  const {
    date = new Date(),
    storage,
    simulations = SIMULATION_CATALOG,
    catalogVersion = SIMULATION_CATALOG_VERSION,
  } = options;
  const dailySimulation = getDailySimulation(date, simulations);
  const manualChoice = readManualSimulationFocus({ date, storage, simulations, catalogVersion });
  const selectedSimulation = manualChoice
    ? getSimulationFromList(manualChoice.simulationId, simulations)
    : null;
  const activeSimulation = selectedSimulation || dailySimulation || null;

  return Object.freeze({
    dayStamp: getDailyFocusDayStamp(date),
    dailyId: dailySimulation?.id || null,
    dailySimulation,
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
