import { getLondonPalette } from './londonPalettes.js';
import {
  getNextTimeOfDayPaletteBoundary,
  getTimeOfDayPalettePeriod,
} from './timeOfDayPalette.js';
import {
  DEFAULT_SIMULATION_COLOR_DISTRIBUTION,
  createSimulationMaterialSequence,
  resolveSimulationColorDistribution,
  resolveSimulationPaletteColors,
  selectSimulationMaterialRole,
} from './simulationPaletteContract.js';

const BOUNDARY_SETTLE_MS = 32;

function freezeSnapshot({
  paletteId,
  periodId,
  generation,
  effectiveAt,
  nextBoundaryAt,
  colors,
  distribution,
}) {
  return Object.freeze({
    paletteId,
    periodId,
    generation,
    effectiveAt,
    nextBoundaryAt,
    colors: Object.freeze(colors.slice()),
    distribution: Object.freeze(distribution.map((row) => Object.freeze({ ...row }))),
  });
}

function distributionsMatch(left, right) {
  if (left.length !== right.length) return false;
  return left.every((row, index) => (
    row.roleId === right[index]?.roleId
    && row.label === right[index]?.label
    && row.colorIndex === right[index]?.colorIndex
    && row.weight === right[index]?.weight
  ));
}

function projectSnapshotToDocument(snapshot) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  snapshot.colors.forEach((color, index) => {
    root.style.setProperty(`--ball-${index + 1}`, color);
  });
  snapshot.distribution.forEach((row) => {
    const color = snapshot.colors[row.colorIndex];
    if (!color) return;
    root.style.setProperty(`--simulation-role-${row.roleId}`, color);
  });
  root.dataset.absTimeOfDayPalette = snapshot.paletteId;
  root.dataset.absSimulationPaletteId = snapshot.paletteId;
  root.dataset.absSimulationPalettePeriod = snapshot.periodId;
  root.dataset.absSimulationPaletteGeneration = String(snapshot.generation);
  root.dataset.absSimulationPaletteEffectiveAt = String(snapshot.effectiveAt);
}

function installReadOnlyDiagnostic(getSnapshot) {
  if (typeof window === 'undefined') return;
  Object.defineProperty(window, '__ABS_SIMULATION_PALETTE__', {
    configurable: true,
    enumerable: false,
    get: getSnapshot,
  });
}

export function createSimulationPaletteController({
  now = () => new Date(),
  setTimer = (callback, delay) => window.setTimeout(callback, delay),
  clearTimer = (timerId) => window.clearTimeout(timerId),
  project = projectSnapshotToDocument,
} = {}) {
  let distribution = resolveSimulationColorDistribution(DEFAULT_SIMULATION_COLOR_DISTRIBUTION);
  let generation = 0;
  let timerId = 0;
  let started = false;
  const listeners = new Set();

  function createSnapshot(date, nextGeneration) {
    const period = getTimeOfDayPalettePeriod(date);
    const palette = getLondonPalette(period.paletteId);
    const colors = resolveSimulationPaletteColors(palette?.light);
    const effectiveDate = new Date(date.getTime());
    effectiveDate.setHours(period.startHour, 0, 0, 0);
    return freezeSnapshot({
      paletteId: period.paletteId,
      periodId: period.id,
      generation: nextGeneration,
      effectiveAt: effectiveDate.getTime(),
      nextBoundaryAt: getNextTimeOfDayPaletteBoundary(date).getTime(),
      colors,
      distribution,
    });
  }

  let snapshot = createSnapshot(now(), ++generation);

  function publish(nextSnapshot) {
    snapshot = nextSnapshot;
    project(snapshot);
    listeners.forEach((listener) => listener(snapshot));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bb:paletteChanged', {
        detail: Object.freeze({
          paletteId: snapshot.paletteId,
          generation: snapshot.generation,
          snapshot,
        }),
      }));
    }
  }

  function schedule() {
    if (!started || typeof window === 'undefined') return;
    clearTimer(timerId);
    const delay = Math.max(1, snapshot.nextBoundaryAt - now().getTime() + BOUNDARY_SETTLE_MS);
    timerId = setTimer(() => {
      reconcile();
      schedule();
    }, delay);
  }

  function reconcile() {
    const date = now();
    const candidate = createSnapshot(date, generation + 1);
    const changed = candidate.paletteId !== snapshot.paletteId
      || candidate.periodId !== snapshot.periodId
      || candidate.effectiveAt !== snapshot.effectiveAt
      || !distributionsMatch(candidate.distribution, snapshot.distribution);
    if (changed) {
      generation += 1;
      publish(candidate);
    } else if (candidate.nextBoundaryAt !== snapshot.nextBoundaryAt) {
      snapshot = freezeSnapshot({ ...snapshot, nextBoundaryAt: candidate.nextBoundaryAt });
      project(snapshot);
    }
    return snapshot;
  }

  function configure({ colorDistribution } = {}) {
    const nextDistribution = resolveSimulationColorDistribution(colorDistribution);
    if (distributionsMatch(distribution, nextDistribution)) return snapshot;
    distribution = nextDistribution;
    generation += 1;
    publish(createSnapshot(now(), generation));
    schedule();
    return snapshot;
  }

  function handleVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    reconcile();
    schedule();
  }

  function handleLifecycleResume() {
    reconcile();
    schedule();
  }

  function start() {
    if (started || typeof window === 'undefined') return snapshot;
    started = true;
    installReadOnlyDiagnostic(() => snapshot);
    project(snapshot);
    window.addEventListener('pageshow', handleLifecycleResume);
    window.addEventListener('focus', handleLifecycleResume);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    reconcile();
    schedule();
    return snapshot;
  }

  function stop() {
    if (!started || typeof window === 'undefined') return;
    started = false;
    clearTimer(timerId);
    timerId = 0;
    window.removeEventListener('pageshow', handleLifecycleResume);
    window.removeEventListener('focus', handleLifecycleResume);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    listener(snapshot);
    return () => listeners.delete(listener);
  }

  return Object.freeze({
    getSnapshot: () => snapshot,
    subscribe,
    start,
    stop,
    reconcile,
    configure,
  });
}

const simulationPaletteController = createSimulationPaletteController();

export function getSimulationPaletteSnapshot() {
  return simulationPaletteController.getSnapshot();
}

export function subscribeSimulationPalette(listener) {
  return simulationPaletteController.subscribe(listener);
}

export function startSimulationPaletteController() {
  return simulationPaletteController.start();
}

export function stopSimulationPaletteController() {
  simulationPaletteController.stop();
}

export function configureSimulationPalette(options) {
  return simulationPaletteController.configure(options);
}

export { createSimulationMaterialSequence, selectSimulationMaterialRole };
