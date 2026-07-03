import { useLayoutEffect } from 'react';
import { initState, applyLayoutCSSVars, getGlobals } from '../../legacy/modules/core/state.js';
import { loadRuntimeConfig } from '../../legacy/modules/utils/runtime-config.js';
import { initializeDarkMode } from '../../legacy/modules/visual/dark-mode-v2.js';
import { loadShellConfig, syncShellToDocument } from '../../legacy/modules/visual/site-shell.js';
import { applyExpertiseLegendColors } from '../../legacy/modules/ui/legend-colors.js';
import { initLegendFilterSystem } from '../../legacy/modules/ui/legend-filter.js';
import { createSoundToggle } from '../../legacy/modules/ui/sound-toggle.js';
import { initTimeDisplay } from '../../legacy/modules/ui/time-display.js';

let runtimeConfigPromise = null;
let shellConfigPromise = null;

function loadDailyFocusRuntimeConfig() {
  if (!runtimeConfigPromise) {
    runtimeConfigPromise = loadRuntimeConfig();
  }
  return runtimeConfigPromise;
}

function loadDailyFocusShellConfig() {
  if (!shellConfigPromise) {
    shellConfigPromise = loadShellConfig();
  }
  return shellConfigPromise;
}

function applyHomeUiConfigVars() {
  const globals = getGlobals();
  const root = document.documentElement;

  if (Number.isFinite(globals?.topLogoWidthVw)) {
    root.style.setProperty('--top-logo-width-vw', String(globals.topLogoWidthVw));
  }
  if (Number.isFinite(globals?.homeMainLinksBelowLogoPx)) {
    root.style.setProperty('--home-main-links-below-logo-px', `${Math.round(globals.homeMainLinksBelowLogoPx)}px`);
  }
  if (Number.isFinite(globals?.footerNavBarTopVh)) {
    root.style.setProperty('--footer-nav-bar-top', `${globals.footerNavBarTopVh}vh`);
    root.style.setProperty('--footer-nav-bar-top-svh', `${globals.footerNavBarTopVh}svh`);
    root.style.setProperty('--footer-nav-bar-top-dvh', `${globals.footerNavBarTopVh}dvh`);
  }
  if (Number.isFinite(globals?.footerNavBarGapVw)) {
    const minPx = Math.round(globals.footerNavBarGapVw * 9.6);
    const maxPx = Math.round(minPx * 1.67);
    root.style.setProperty('--footer-nav-bar-gap', `clamp(${minPx}px, ${globals.footerNavBarGapVw}vw, ${maxPx}px)`);
  }
  if (Number.isFinite(globals?.uiHitAreaMul)) {
    root.style.setProperty('--ui-hit-area-mul', String(globals.uiHitAreaMul));
  }
  if (Number.isFinite(globals?.uiIconCornerRadiusMul)) {
    root.style.setProperty('--ui-icon-corner-radius-mul', String(globals.uiIconCornerRadiusMul));
  }
  if (Number.isFinite(globals?.uiIconFramePx) && Math.round(globals.uiIconFramePx) > 0) {
    root.style.setProperty('--ui-icon-frame-size', `${Math.round(globals.uiIconFramePx)}px`);
  }
  if (Number.isFinite(globals?.uiIconGlyphPx) && Math.round(globals.uiIconGlyphPx) > 0) {
    root.style.setProperty('--ui-icon-glyph-size', `${Math.round(globals.uiIconGlyphPx)}px`);
  }
  if (Number.isFinite(globals?.linkTextPadding)) {
    const padding = Math.round(globals.linkTextPadding);
    root.style.setProperty('--link-text-padding', `${padding}px`);
    root.style.setProperty('--link-text-margin', `${-padding}px`);
  }
  if (Number.isFinite(globals?.linkIconPadding)) {
    const padding = Math.round(globals.linkIconPadding);
    root.style.setProperty('--link-icon-padding', `${padding}px`);
    root.style.setProperty('--link-icon-margin', `${-padding}px`);
  }
  if (Number.isFinite(globals?.linkColorInfluence)) {
    root.style.setProperty('--link-color-influence', String(globals.linkColorInfluence));
  }
  if (Number.isFinite(globals?.linkImpactScale)) {
    root.style.setProperty('--link-impact-scale', String(globals.linkImpactScale));
  }
  if (Number.isFinite(globals?.linkImpactBlur)) {
    root.style.setProperty('--link-impact-blur', `${globals.linkImpactBlur}px`);
  }
  if (Number.isFinite(globals?.linkImpactDuration)) {
    root.style.setProperty('--link-impact-duration', `${Math.round(globals.linkImpactDuration)}ms`);
  }
  if (Number.isFinite(globals?.linkHoverNudge)) {
    root.style.setProperty('--link-nudge', `${globals.linkHoverNudge}px`);
  }
}

function initializeSharedHomeChrome() {
  initTimeDisplay();
  applyExpertiseLegendColors();

  const legendAlreadyInteractive = !!document.querySelector('#expertise-legend .legend__item--interactive');
  if (!legendAlreadyInteractive) {
    initLegendFilterSystem();
  }

  createSoundToggle();
}

export function DailyFocusShellBridge() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let cancelled = false;
    let runtimeConfig = null;
    let shellConfig = null;

    const applyShellVars = () => {
      if (cancelled || !runtimeConfig || !shellConfig) return;
      initState(runtimeConfig);
      syncShellToDocument({
        config: shellConfig,
        isDark: document.documentElement.classList.contains('dark-mode'),
      });
      applyLayoutCSSVars();
      applyHomeUiConfigVars();
      initializeDarkMode();
      applyHomeUiConfigVars();
      initializeSharedHomeChrome();
      document.documentElement.classList.add('js-enabled');
    };

    Promise.all([loadDailyFocusRuntimeConfig(), loadDailyFocusShellConfig()])
      .then(([config, loadedShellConfig]) => {
        if (cancelled) return;
        runtimeConfig = config;
        shellConfig = loadedShellConfig;
        applyShellVars();
      })
      .catch(() => undefined);

    window.addEventListener('resize', applyShellVars);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', applyShellVars);
    };
  }, []);

  return null;
}
