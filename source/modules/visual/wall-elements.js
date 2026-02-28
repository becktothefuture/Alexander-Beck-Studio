// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         WALL ELEMENTS SYSTEM                                 ║
// ║                                                                              ║
// ║  Single outer container + content area:                                      ║
// ║  #abs-scene → .wall-3 → #bravia-balls → .wall-edges, canvas                ║
// ║                                                                              ║
// ║  .wall-3        outer frame (fixed, padding T, radius R+T, shadows + shine) ║
// ║  #bravia-balls  content area (bg: page-bg, radius R, overflow clip)         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { readTokenVar } from '../utils/tokens.js';

let wall3El = null;
let wallEdgesEl = null;
let initialized = false;
let wallUpdateRaf = null;

// ═══════════════════════════════════════════════════════════════════════════════
// LIGHT SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════

let lightSimTimeout = null;

function applyAmbientLightMul(multiplier) {
  document.documentElement.style.setProperty('--ambient-light-mul', String(multiplier));
}

export function initLightSimulation() {
  if (lightSimTimeout) clearTimeout(lightSimTimeout);
  lightSimTimeout = null;
  const baseline = 1.0;
  applyAmbientLightMul(baseline);

  const g = getGlobals();
  if (!g || g.wallLightFluctuationEnabled !== true) return;
  if (!wallEdgesEl) return;

  const tick = () => {
    const globals = getGlobals();
    if (!globals || !wallEdgesEl) {
      lightSimTimeout = setTimeout(tick, 1000);
      return;
    }
    if (globals.wallLightFluctuationEnabled !== true) {
      lightSimTimeout = null;
      applyAmbientLightMul(baseline);
      return;
    }
    const strength = Math.max(0, Number(globals.wallLightFluctuationStrength ?? 0.15) || 0);
    const randomFactor = (Math.random() - 0.5) * 2;
    const targetMul = 1.0 + (randomFactor * strength);
    applyAmbientLightMul(targetMul.toFixed(3));
    lightSimTimeout = setTimeout(tick, 3000 + Math.random() * 3000);
  };
  tick();
}

// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

export function initWallElements() {
  if (initialized) return;

  const container = document.getElementById('bravia-balls');
  if (!container) {
    console.warn('⚠️ #bravia-balls not found, cannot create wall elements');
    return;
  }

  const scene = container.parentElement;
  if (scene && scene.id === 'abs-scene') {
    wall3El = document.createElement('div');
    wall3El.className = 'wall-3';
    wall3El.setAttribute('aria-hidden', 'true');

    // Explicit inline background as failsafe: CSS var(--wall-design-color)
    // can silently fail in certain browser/GPU-compositing scenarios.
    const g = getGlobals();
    const wallColor = g?.frameColor || readTokenVar('--wall-design-color', '#242529');
    wall3El.style.backgroundColor = wallColor;

    scene.insertBefore(wall3El, container);
    wall3El.appendChild(container);

    syncOuterWallDisabledState(container);
  }

  wallEdgesEl = document.createElement('div');
  wallEdgesEl.className = 'wall-edges';
  wallEdgesEl.setAttribute('aria-hidden', 'true');
  container.insertBefore(wallEdgesEl, container.firstChild);

  // Move .noise into #bravia-balls so it shares the same overflow clip + border-radius
  const noiseEl = document.querySelector('.scene-effects .noise');
  if (noiseEl) container.appendChild(noiseEl);

  initialized = true;
  initLightSimulation();
  updateWallElements();

  const g = getGlobals();
  if (g) {
    import('../ui/control-registry.js').then(({ updateWallShadowCSS }) => {
      updateWallShadowCSS(g);
    }).catch(() => {});
  }
}

/** Sync wall-3 disabled state with #bravia-balls (outer wall edge toggle). */
export function syncOuterWallDisabledState(container) {
  if (!wall3El || !container) return;
  const disabled = container.classList.contains('outer-wall-edge-disabled');
  wall3El.classList.toggle('outer-wall-edge-disabled', disabled);
}

// Backward-compat alias
export const syncOuterWall2DisabledState = syncOuterWallDisabledState;

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE WALLS — set CSS variables on :root for .wall-edges and pseudos
// ═══════════════════════════════════════════════════════════════════════════════

function applyWallElementsNow() {
  if (!wallEdgesEl) return;
  const g = getGlobals();
  const isDark = document.body.classList.contains('dark-mode');
  const root = document.documentElement;

  // Shine scale: outer wall = full, inner content edge = reduced
  const INNER_SHINE_SCALE = 0.4;

  // Inner border (gradient stops + opacities) — softer shine on content edge
  const innerSpread = g.innerWallBorderGradientSpread ?? 75;
  const innerBrightOp = (isDark ? (g.innerWallBorderBrightOpacityDark ?? 0.6) : (g.innerWallBorderBrightOpacityLight ?? 0.5)) * INNER_SHINE_SCALE;
  const innerDimOp = (isDark ? (g.innerWallBorderDimOpacityDark ?? 0.2) : (g.innerWallBorderDimOpacityLight ?? 0.15)) * INNER_SHINE_SCALE;
  const innerShadowOp = (isDark ? (g.innerWallBorderShadowOpacityDark ?? 0.35) : (g.innerWallBorderShadowOpacityLight ?? 0.2)) * INNER_SHINE_SCALE;
  root.style.setProperty('--inner-wall-border-width', `${g.innerWallBorderWidth ?? 2}px`);
  root.style.setProperty('--inner-wall-grad-stop-bright', '0deg');
  root.style.setProperty('--inner-wall-grad-stop-dim-start', `${innerSpread}deg`);
  root.style.setProperty('--inner-wall-grad-stop-dim-end', `${360 - innerSpread}deg`);
  root.style.setProperty('--inner-wall-border-bright-opacity', `calc(${innerBrightOp} * var(--ambient-light-mul, 1))`);
  root.style.setProperty('--inner-wall-border-dim-opacity', `calc(${innerDimOp} * var(--ambient-light-mul, 1))`);
  root.style.setProperty('--inner-wall-border-shadow-opacity', String(innerShadowOp));

  // Outer border (full shine for .wall-3)
  const outerSpread = g.outerWallBorderGradientSpread ?? 85;
  const outerBrightOp = isDark ? (g.outerWallBorderBrightOpacityDark ?? 0.6) : (g.outerWallBorderBrightOpacityLight ?? 0.5);
  const outerDimOp = isDark ? (g.outerWallBorderDimOpacityDark ?? 0.2) : (g.outerWallBorderDimOpacityLight ?? 0.15);
  const outerShadowOp = isDark ? (g.outerWallBorderShadowOpacityDark ?? 0.4) : (g.outerWallBorderShadowOpacityLight ?? 0.25);
  root.style.setProperty('--outer-wall-border-width', `${g.outerWallBorderWidth ?? 2}px`);
  root.style.setProperty('--outer-wall-grad-stop-bright', '0deg');
  root.style.setProperty('--outer-wall-grad-stop-dim-start', `${outerSpread}deg`);
  root.style.setProperty('--outer-wall-grad-stop-dim-end', `${360 - outerSpread}deg`);
  root.style.setProperty('--outer-wall-border-bright-opacity', `calc(${outerBrightOp} * var(--ambient-light-mul, 1))`);
  root.style.setProperty('--outer-wall-border-dim-opacity', `calc(${outerDimOp} * var(--ambient-light-mul, 1))`);
  root.style.setProperty('--outer-wall-border-shadow-opacity', String(outerShadowOp));

  // Gap depth (AO + cast shadow — base values)
  const aoOpacity = isDark ? (g.wallAOOpacityDark ?? 0.3) : (g.wallAOOpacityLight ?? 0.15);
  const aoSpread = g.wallAOSpread ?? 2;
  root.style.setProperty('--wall-ao-opacity', String(aoOpacity));
  root.style.setProperty('--wall-ao-spread', `${aoSpread}px`);
  root.style.setProperty('--outer-wall-cast-shadow-offset', `${g.outerWallCastShadowOffset ?? 3}px`);
  root.style.setProperty('--outer-wall-cast-shadow-blur', `${g.outerWallCastShadowBlur ?? 12}px`);
  root.style.setProperty('--outer-wall-cast-shadow-opacity', String(isDark
    ? (g.outerWallCastShadowOpacityDark ?? 0.25)
    : (g.outerWallCastShadowOpacityLight ?? 0.15)));
  root.style.setProperty('--outer-wall-top-shadow-offset', `${g.outerWallTopShadowOffset ?? 3}px`);
  root.style.setProperty('--outer-wall-top-shadow-blur', `${g.outerWallTopShadowBlur ?? 8}px`);
  root.style.setProperty('--outer-wall-top-shadow-opacity', String(isDark
    ? (g.outerWallTopShadowOpacityDark ?? 0.6)
    : (g.outerWallTopShadowOpacityLight ?? 0.4)));

  // ── Graduated inset shadows (2-layer: outer strongest, inner lighter) ──
  const baseSoftBlur = 25;
  const baseStrongBlur = 17;
  const baseSoftOp = isDark ? 0.22 : 0.17;
  const baseStrongOp = isDark ? 0.95 : 0.85;
  const baseSoftOffset = 3;
  const baseStrongOffset = 5;

  // Outer wall (.wall-3) — full strength
  root.style.setProperty('--w3-shadow-soft-offset', `${baseSoftOffset}px`);
  root.style.setProperty('--w3-shadow-soft-blur', `${baseSoftBlur}px`);
  root.style.setProperty('--w3-shadow-soft-opacity', String(baseSoftOp));
  root.style.setProperty('--w3-shadow-strong-offset', `${baseStrongOffset}px`);
  root.style.setProperty('--w3-shadow-strong-blur', `${baseStrongBlur}px`);
  root.style.setProperty('--w3-shadow-strong-opacity', String(baseStrongOp));

  // Inner content (#bravia-balls) — softer but visible (×0.45)
  const INNER_SHADOW_SCALE = 0.45;
  root.style.setProperty('--w1-shadow-soft-offset', `${Math.round(baseSoftOffset * 0.7)}px`);
  root.style.setProperty('--w1-shadow-soft-blur', `${Math.round(baseSoftBlur * 0.6)}px`);
  root.style.setProperty('--w1-shadow-soft-opacity', String(+(baseSoftOp * INNER_SHADOW_SCALE).toFixed(3)));
  root.style.setProperty('--w1-shadow-strong-offset', `${Math.round(baseStrongOffset * 0.7)}px`);
  root.style.setProperty('--w1-shadow-strong-blur', `${Math.round(baseStrongBlur * 0.6)}px`);
  root.style.setProperty('--w1-shadow-strong-opacity', String(+(baseStrongOp * INNER_SHADOW_SCALE).toFixed(3)));
}

export function requestWallElementUpdate() {
  if (wallUpdateRaf !== null) return;
  wallUpdateRaf = requestAnimationFrame(() => {
    wallUpdateRaf = null;
    applyWallElementsNow();
  });
}

export function updateWallElements() {
  requestWallElementUpdate();
}

// ═══════════════════════════════════════════════════════════════════════════════
// GETTERS — return same element for compatibility with effects panel sections
// ═══════════════════════════════════════════════════════════════════════════════

export function getOuterWall() { return wallEdgesEl; }
export function getInnerWall() { return wallEdgesEl; }

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════

export function getWall3() { return wall3El; }

export function syncWall3Background() {
  if (!wall3El) return;
  const g = getGlobals();
  const wallColor = g?.frameColor || readTokenVar('--wall-design-color', '#242529');
  wall3El.style.backgroundColor = wallColor;
}

export function destroyWallElements() {
  if (lightSimTimeout) {
    clearTimeout(lightSimTimeout);
    lightSimTimeout = null;
  }
  if (wallUpdateRaf !== null) {
    cancelAnimationFrame(wallUpdateRaf);
    wallUpdateRaf = null;
  }
  if (wallEdgesEl && wallEdgesEl.parentNode) {
    wallEdgesEl.parentNode.removeChild(wallEdgesEl);
  }
  // Move .noise back to .scene-effects before unwrapping
  const container = document.getElementById('bravia-balls');
  const noiseEl = container?.querySelector('.noise');
  const sceneEffects = document.querySelector('.scene-effects');
  if (noiseEl && sceneEffects) sceneEffects.appendChild(noiseEl);

  // Unwrap #bravia-balls from wall containers back to #abs-scene
  if (container && wall3El && wall3El.parentNode) {
    wall3El.parentNode.insertBefore(container, wall3El);
    wall3El.parentNode.removeChild(wall3El);
  }
  wall3El = null;
  wallEdgesEl = null;
  initialized = false;
}
