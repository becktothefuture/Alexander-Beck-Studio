// Presentation only. The saved theme and its DOM state commit immediately.
export const DEFAULT_THEME_TRANSITION = Object.freeze({ surfaceDurationMs: 313, glowDurationMs: 500 });

export function normalizeThemeTransition(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const duration = (value, fallback) => Number.isFinite(Number(value))
    ? Math.round(Math.max(0, Math.min(1000, Number(value)))) : fallback;
  const surfaceDurationMs = duration(source.surfaceDurationMs, DEFAULT_THEME_TRANSITION.surfaceDurationMs);
  return {
    surfaceDurationMs,
    glowDurationMs: Math.max(surfaceDurationMs, duration(source.glowDurationMs, DEFAULT_THEME_TRANSITION.glowDurationMs)),
  };
}

export function themeProgress(elapsed, duration) {
  const t = duration > 0 ? Math.max(0, Math.min(1, elapsed / duration)) : 1;
  return t * t * (3 - 2 * t);
}

export function parseThemeColour(value) {
  const hex = String(value).trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((part) => part + part).join('') : hex;
    return [0, 2, 4].map((offset) => Number.parseInt(full.slice(offset, offset + 2), 16));
  }
  const rgb = String(value).match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  return rgb ? rgb.slice(1, 4).map(Number) : null;
}

function luminance(colour) {
  let total = 0;
  for (let index = 0; index < 3; index += 1) {
    const channel = colour[index] / 255;
    total += (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
      * [0.2126, 0.7152, 0.0722][index];
  }
  return total;
}

export function themeContrast(a, b) {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const BLACK = [0, 0, 0];
const WHITE = [255, 255, 255];

export function readableThemeInk(background, from, to) {
  const ink = themeContrast(background, from) >= themeContrast(background, to) ? from : to;
  if (themeContrast(background, ink) >= 4.5) return ink;
  return themeContrast(background, BLACK) >= themeContrast(background, WHITE) ? BLACK : WHITE;
}

const TRANSIENT_PROPERTIES = [
  '--abs-theme-window-bg', '--abs-theme-ink', '--abs-theme-muted-ink', '--abs-theme-rim-opacity',
  '--abs-theme-surface-duration', '--abs-theme-noise-opacity', '--abs-theme-noise-duration',
];
let transition = null;
let frameId = 0;
const rgb = (colour) => `rgb(${colour[0]}, ${colour[1]}, ${colour[2]})`;

export function getThemeGlowMix(now = performance.now()) {
  if (!transition) return null;
  const progress = themeProgress(now - transition.startedAt, transition.glowDurationMs);
  return transition.fromGlow + (transition.toGlow - transition.fromGlow) * progress;
}

export function getThemeTransitionSnapshot() {
  return transition ? {
    active: true,
    startedAt: transition.startedAt,
    surfaceDurationMs: transition.surfaceDurationMs,
    glowDurationMs: transition.glowDurationMs,
    glowMix: getThemeGlowMix(),
  } : { active: false };
}

export function finishThemeTransition() {
  if (frameId) cancelAnimationFrame(frameId);
  frameId = 0;
  if (!transition) return;
  const { root, motionQuery, onMotionChange, onVisibilityChange } = transition;
  motionQuery.removeEventListener('change', onMotionChange);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  for (const property of TRANSIENT_PROPERTIES) root.style.removeProperty(property);
  delete root.dataset.absThemeTransition;
  transition = null;
}

// Read once before changing theme. Interruption captures the displayed values,
// including the current glow mix, rather than jumping back to either endpoint.
export function captureThemeAppearance(isDark) {
  const root = document.documentElement;
  const style = getComputedStyle(document.body || root);
  const appearance = {
    background: parseThemeColour(style.getPropertyValue('--studio-window-bg')),
    ink: parseThemeColour(style.getPropertyValue('--text-primary')),
    mutedInk: parseThemeColour(style.getPropertyValue('--text-muted')),
    rim: Number.parseFloat(style.getPropertyValue('--abs-theme-rim-opacity') || style.getPropertyValue('--inner-wall-rim-opacity')),
    noiseOpacity: Number.parseFloat(style.getPropertyValue('--abs-theme-noise-opacity')
      || style.getPropertyValue(isDark ? '--noise-opacity-dark' : '--noise-opacity-light')) || 0,
    glowMix: getThemeGlowMix() ?? (isDark ? 1 : 0),
  };
  finishThemeTransition();
  return appearance;
}

function renderThemeFrame(now) {
  frameId = 0;
  if (!transition) return;
  const state = transition;
  if (state.motionQuery.matches || document.hidden) {
    finishThemeTransition();
    return;
  }
  const elapsed = now - state.startedAt;
  const progress = themeProgress(elapsed, state.surfaceDurationMs);
  const glowProgress = themeProgress(elapsed, state.glowDurationMs);
  const brightness = (colour) => Math.max(1, (colour[0] + colour[1] + colour[2]) / 3);
  if (progress < 1) {
    for (let index = 0; index < 3; index += 1) {
      state.background[index] = Math.round(state.from.background[index]
        + (state.to.background[index] - state.from.background[index]) * progress);
    }
    state.root.style.setProperty('--abs-theme-window-bg', rgb(state.background));
    state.root.style.setProperty('--abs-theme-ink', rgb(progress === 0 ? state.from.ink
      : readableThemeInk(state.background, state.from.ink, state.to.ink)));
    state.root.style.setProperty('--abs-theme-muted-ink', rgb(progress === 0 ? state.from.mutedInk
      : readableThemeInk(state.background, state.from.mutedInk, state.to.mutedInk)));
  } else {
    for (const property of TRANSIENT_PROPERTIES.slice(0, 3)) state.root.style.removeProperty(property);
    state.background = state.to.background;
  }
  // Keep grain's visible contrast steady while its background changes. A linear
  // opacity blend makes dark-mode grain disproportionately strong on mid-grey.
  const fromNoise = state.from.noiseOpacity * brightness(state.from.background);
  const toNoise = state.to.noiseOpacity * brightness(state.to.background);
  state.root.style.setProperty('--abs-theme-noise-opacity', String(Math.min(1,
    (fromNoise + (toNoise - fromNoise) * progress) / brightness(state.background))));
  state.root.style.setProperty('--abs-theme-rim-opacity', String(state.from.rim + (state.to.rim - state.from.rim) * glowProgress));
  if (elapsed >= state.glowDurationMs) {
    finishThemeTransition();
    return;
  }
  frameId = requestAnimationFrame(renderThemeFrame);
}

export function startThemeTransition(from, isDark, config) {
  const durations = normalizeThemeTransition(config);
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  if (motionQuery.matches || document.hidden || durations.glowDurationMs === 0) return;
  const to = captureThemeAppearance(isDark);
  if (![from.background, from.ink, from.mutedInk, to.background, to.ink, to.mutedInk].every(Boolean)
    || !Number.isFinite(from.rim) || !Number.isFinite(to.rim)) return;
  const root = document.documentElement;
  transition = {
    ...durations, root, from, to, background: [0, 0, 0],
    fromGlow: from.glowMix, toGlow: isDark ? 1 : 0,
    startedAt: performance.now(), motionQuery,
    onMotionChange: () => { if (motionQuery.matches) finishThemeTransition(); },
    onVisibilityChange: () => { if (document.hidden) finishThemeTransition(); },
  };
  motionQuery.addEventListener('change', transition.onMotionChange);
  document.addEventListener('visibilitychange', transition.onVisibilityChange);
  root.dataset.absThemeTransition = 'afterglow';
  root.style.setProperty('--abs-theme-surface-duration', `${durations.surfaceDurationMs}ms`);
  root.style.setProperty('--abs-theme-noise-duration', '0ms');
  renderThemeFrame(transition.startedAt);
}
