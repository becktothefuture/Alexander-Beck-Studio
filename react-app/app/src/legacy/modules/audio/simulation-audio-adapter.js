import { playCollisionSound, playDetentClick } from './sound-engine.js';

const DEFAULT_MIN_INTERVAL_MS = 90;
const DEFAULT_DETENT_INTERVAL_MS = 32;
const DEFAULT_DETENT_STEP = Math.PI / 20;
const DEFAULT_MIN_DETENT_VELOCITY = 0.055;

const lastTriggerById = new Map();
const lastDetentById = new Map();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function canTrigger(id, minIntervalMs = DEFAULT_MIN_INTERVAL_MS, now = nowMs()) {
  const key = String(id || 'simulation-audio');
  const last = lastTriggerById.get(key) || -Infinity;
  if (now - last < minIntervalMs) return false;
  lastTriggerById.set(key, now);
  return true;
}

function recordDebugEvent(type, id, detail = {}) {
  if (typeof window === 'undefined') return;
  const store = window.__ABS_SIMULATION_AUDIO__ || {
    total: 0,
    byType: {},
    byId: {},
    events: [],
  };
  store.total += 1;
  store.byType[type] = (store.byType[type] || 0) + 1;
  store.byId[id] = (store.byId[id] || 0) + 1;
  store.lastEvent = {
    type,
    id,
    at: nowMs(),
    ...detail,
  };
  if (store.events.length < 80) {
    store.events.push(store.lastEvent);
  } else {
    store.events[store.total % store.events.length] = store.lastEvent;
  }
  window.__ABS_SIMULATION_AUDIO__ = store;
}

export function resetSimulationAudioDebug() {
  lastTriggerById.clear();
  lastDetentById.clear();
  if (typeof window === 'undefined') return;
  window.__ABS_SIMULATION_AUDIO__ = {
    total: 0,
    byType: {},
    byId: {},
    events: [],
  };
}

export function triggerImpact({
  id = 'impact',
  radius = 18,
  intensity = 0.78,
  x = 0.5,
  minIntervalMs = DEFAULT_MIN_INTERVAL_MS,
} = {}) {
  const key = String(id);
  if (!canTrigger(key, minIntervalMs)) return false;
  const safeRadius = clamp(Number(radius) || 18, 4, 96);
  const safeIntensity = clamp(Number(intensity) || 0, 0, 1);
  const safeX = clamp(Number(x) || 0.5, 0, 1);
  recordDebugEvent('impact', key, { intensity: safeIntensity, x: safeX });
  playCollisionSound(safeRadius, safeIntensity, safeX, key);
  return true;
}

export function triggerPressure({
  id = 'pressure',
  intensity = 0.72,
  x = 0.5,
  radius = 20,
  minIntervalMs = 140,
} = {}) {
  return triggerImpact({ id, radius, intensity, x, minIntervalMs });
}

export function triggerRelease({
  id = 'release',
  intensity = 0.82,
  x = 0.5,
  radius = 24,
  minIntervalMs = 120,
} = {}) {
  return triggerImpact({ id, radius, intensity, x, minIntervalMs });
}

export function triggerDetent({
  id = 'detent',
  value = 0,
  step = DEFAULT_DETENT_STEP,
  velocity = 0,
  minVelocity = DEFAULT_MIN_DETENT_VELOCITY,
  minIntervalMs = DEFAULT_DETENT_INTERVAL_MS,
  gain = 0.05,
  filterHz = 3200,
} = {}) {
  const safeStep = Math.max(0.001, Math.abs(Number(step) || DEFAULT_DETENT_STEP));
  const safeVelocity = Number(velocity) || 0;
  if (Math.abs(safeVelocity) < minVelocity) return false;

  const key = String(id);
  const detent = Math.floor((Number(value) || 0) / safeStep);
  if (lastDetentById.get(key) === detent) return false;
  if (!canTrigger(key, minIntervalMs)) return false;

  lastDetentById.set(key, detent);
  recordDebugEvent('detent', key, {
    detent,
    velocity: safeVelocity,
  });
  playDetentClick({
    gain: clamp(Number(gain) || 0.05, 0, 0.12),
    filterHz: clamp(Number(filterHz) || 3200, 700, 5200),
  });
  return true;
}

if (typeof window !== 'undefined') {
  window.__ABS_RESET_SIMULATION_AUDIO_DEBUG__ = resetSimulationAudioDebug;
}
