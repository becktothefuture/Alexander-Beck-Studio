import catalogData from './simulationCatalog.json';

export const SIMULATION_STAGES = Object.freeze({
  DAILY_ROTATION: 'daily-rotation',
  COLLECTION: 'collection',
  AUTOMATION_CANDIDATE: 'automation-candidate',
  HIDDEN: 'hidden',
});

const STAGE_LABELS = Object.freeze({
  [SIMULATION_STAGES.DAILY_ROTATION]: 'Daily rotation',
  [SIMULATION_STAGES.COLLECTION]: 'Collection',
  [SIMULATION_STAGES.AUTOMATION_CANDIDATE]: 'Automation candidates',
  [SIMULATION_STAGES.HIDDEN]: 'Hidden',
});

function withPreviewDefaults(entry) {
  const previewBase = `/previews/simulations/${entry.id}`;
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
  Object.fromEntries(SIMULATION_CATALOG.map((entry) => [entry.id, entry])),
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

function parseAnchorDayStamp(anchorDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(anchorDate || ''));
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10) - 1;
  const day = Number.parseInt(match[3], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  return Math.floor(Date.UTC(year, month, day) / (1000 * 60 * 60 * 24));
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
  return SIMULATION_BY_ID[id] || null;
}

export function getSimulationName(id) {
  return getSimulationById(id)?.name || id;
}

export function isSimulationInDailyRotation(id) {
  return getSimulationById(id)?.stage === SIMULATION_STAGES.DAILY_ROTATION;
}
