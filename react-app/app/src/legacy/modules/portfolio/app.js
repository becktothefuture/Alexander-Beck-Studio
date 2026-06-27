import { loadRuntimeConfig } from '../utils/runtime-config.js';
import { applyWallFrameFromConfig, applyWallFrameLayout } from '../visual/wall-frame.js';
import { applyPortfolioConfig, loadPortfolioConfig, normalizePortfolioConfig } from './portfolio-config.js';
import {
  relayoutPortfolioProjectLabels,
  initializePortfolioPit,
  applyPortfolioAccentBallColor,
  resolvePortfolioLabelContent,
} from './pit-mode.js';
import { createSoundToggle } from '../ui/sound-toggle.js';
import { initializeDarkMode } from '../visual/dark-mode-v2.js';
import { getPaletteTemplateOverrideFromUrl, getPortfolioProjectPaletteColor, getWeatherDrivenPaletteTemplate, maybeAutoPickCursorColor, rotatePaletteChapterOnReload } from '../visual/colors.js';
import { getGlobals } from '../core/state.js';
import { initNoiseSystem } from '../visual/noise-system.js';
import { initTimeDisplay } from '../ui/time-display.js';
import { upgradeSocialIcons } from '../ui/social-icons.js';
import { loadRuntimeText } from '../utils/text-loader.js';
import { applyRuntimeTextToDOM } from '../ui/apply-text.js';
import { waitForFonts } from '../utils/font-loader.js';
import * as SoundEngine from '../audio/sound-engine.js';
import { initSharedChrome } from '../ui/shared-chrome.js';
import { loadShellConfig, syncShellToDocument } from '../visual/site-shell.js';
import { completeDirectBoot, waitForFrames, waitForPageReadyBarrier } from '../visual/page-orchestrator.js';
import { navigateWithTransition, resetTransitionState, setupPrefetchOnHover, NAV_STATES } from '../utils/page-nav.js';
import { MODES } from '../core/constants.js';
import {
  setupRenderer,
  getCanvas,
  getContext,
  resize,
  setForceRenderCallback,
  detectOptimalDPR,
  disposeRendererListeners,
} from '../rendering/renderer.js';
import { render } from '../physics/engine.js';
import { clampBallPositionToWallInterior } from '../physics/Ball.js';
import { relaxOverlapsWithKinematicBall } from '../physics/collision.js';
import { portfolioCanvasPointHitsBody } from '../physics/portfolio-pit-narrow-phase.js';
import { setCanvas } from '../core/state.js';
import { initModeSystem, setMode, getForceApplicator } from '../modes/mode-controller.js';
import { startMainLoop } from '../rendering/loop.js';
import { announceToScreenReader } from '../utils/accessibility.js';
import { destroyQuoteDisplay } from '../ui/quote-display.js';
import { setupPointer } from '../input/pointer.js';
import { setupOverscrollLock } from '../input/overscroll-lock.js';
import { refreshCursor, setupCustomCursor, updateCursorSize } from '../rendering/cursor.js';
import { PortfolioProjectDrawer, getProjectContentBlocks } from './project-drawer.js';
import { getBasePathWithTrailingSlash } from '../../../lib/base-path.js';
import { getTransitionPhase, isRouteTransitionPhase } from '../../../lib/transition-phase.js';

const BASE_PATH = (() => {
  try {
    const base = window.PORTFOLIO_BASE || '';
    if (base) return base.endsWith('/') ? base : `${base}/`;
    return getBasePathWithTrailingSlash();
  } catch (error) {
    return getBasePathWithTrailingSlash();
  }
})();

const CONFIG = {
  basePath: BASE_PATH,
  assetBasePath: `${BASE_PATH}images/portfolio/pages/`,
  dataPath: `${BASE_PATH}config/contents-portfolio.json`,
  coverFallback: `${BASE_PATH}images/portfolio/folio-cover/cover-default.webp`,
};

let activePortfolioBootstrapRunId = 0;

const PORTFOLIO_CLICK_DRAG_THRESHOLD_PX = 12;
const PORTFOLIO_CARD_RELEASE_OPEN_DELAY_MS = 96;
const PORTFOLIO_OPEN_GHOST_DURATION_MS = 360;
const PORTFOLIO_DECK_DEFAULTS = Object.freeze({
  reducedMotionDurationMs: 1,
  scrollSensitivity: 1,
  scrollPixelsPerProject: 560,
  inputCapProjects: 0.24,
  followSmoothing: 0.16,
  settleIdleMs: 150,
  settleStrength: 0.13,
  cardWidthPercent: 88,
  cardMaxWidthPx: 1360,
  cardHeightCqh: 43,
  cardMaxHeightPx: 500,
  centerYPercent: 67.5,
  perspectivePx: 1200,
  depthGap1Px: 44,
  depthZ1Px: -26,
  depthScale1: 0.952,
  depthBlur1Px: 0.42,
  rotateXStepDeg: -0.42,
  exitTravelPx: 220,
  exitFadeStart: 0.28,
  exitFadeEnd: 0.58,
  wrapDepthPx: 120,
  reappearStart: 0.84,
  reappearFade: 0.12,
  exitScale: 1.045,
  exitBlurPx: 3.2,
  contactShadowOpacity: 0.12,
});
const PORTFOLIO_DECK_INTRO_FALLBACK = Object.freeze({
  title: 'I design digital experiences around human response.',
  body: 'A curated selection of product projects across product systems, interaction models, and shipped digital experiences.',
});
const PORTFOLIO_CARD_DARK_INK = Object.freeze({
  css: '#111111',
  hex: '#111111',
});
const PORTFOLIO_CARD_LIGHT_INK = Object.freeze({
  css: '#f5f1ea',
  hex: '#f5f1ea',
});

const DRAG_SAMPLE_LIMIT = 5;
const DRAG_SAMPLE_MAX_AGE_MS = 140;
let CACHE_BUST_VALUE = null;

function getCacheBustValue() {
  if (CACHE_BUST_VALUE !== null) return CACHE_BUST_VALUE;
  if (typeof window !== 'undefined' && typeof window.__BUILD_TIMESTAMP__ !== 'undefined') {
    CACHE_BUST_VALUE = String(window.__BUILD_TIMESTAMP__);
  } else {
    CACHE_BUST_VALUE = String(Date.now());
  }
  return CACHE_BUST_VALUE;
}

function serializeRect(rect) {
  if (!rect || !(rect.width > 0) || !(rect.height > 0)) return null;
  return {
    x: Number(rect.x.toFixed(2)),
    y: Number(rect.y.toFixed(2)),
    top: Number(rect.top.toFixed(2)),
    left: Number(rect.left.toFixed(2)),
    right: Number(rect.right.toFixed(2)),
    bottom: Number(rect.bottom.toFixed(2)),
    width: Number(rect.width.toFixed(2)),
    height: Number(rect.height.toFixed(2)),
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + ((end - start) * amount);
}

function easeInCubic(value) {
  const t = clamp(value, 0, 1);
  return t * t * t;
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - (2 * t));
}

function toNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeWheelDeltaY(event) {
  const deltaY = Number(event?.deltaY) || 0;
  if (event?.deltaMode === 1) return deltaY * 16;
  if (event?.deltaMode === 2) return deltaY * (window.innerHeight || 900);
  return deltaY;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function installPortfolioAuditBridge(app) {
  if (typeof window === 'undefined') return;
  window.__ABS_PORTFOLIO_AUDIT__ = {
    getApp: () => app,
    getGlobals,
  };
}

function removePortfolioAuditBridge(app) {
  if (typeof window === 'undefined') return;
  if (window.__ABS_PORTFOLIO_AUDIT__?.getApp?.() === app) {
    delete window.__ABS_PORTFOLIO_AUDIT__;
  }
}

function hexToRgb(hex) {
  const value = String(hex || "var(--color-detected-000000)").replace('#', '').trim();
  const normalized = value.length === 3
    ? value.split('').map((part) => part + part).join('')
    : value.padEnd(6, '0').slice(0, 6);
  const int = Number.parseInt(normalized, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function getContrastText(fill) {
  const background = hexToRgb(fill);
  const darkInkRatio = getContrastRatio(hexToRgb(PORTFOLIO_CARD_DARK_INK.hex), background);
  const lightInkRatio = getContrastRatio(hexToRgb(PORTFOLIO_CARD_LIGHT_INK.hex), background);
  return darkInkRatio >= lightInkRatio ? PORTFOLIO_CARD_DARK_INK.css : PORTFOLIO_CARD_LIGHT_INK.css;
}

function getContrastRatio(first, second) {
  const firstLuminance = getRelativeLuminance(first);
  const secondLuminance = getRelativeLuminance(second);
  const high = Math.max(firstLuminance, secondLuminance);
  const low = Math.min(firstLuminance, secondLuminance);
  return (high + 0.05) / (low + 0.05);
}

function getRelativeLuminance({ r, g, b }) {
  const toLinear = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  return (0.2126 * toLinear(r)) + (0.7152 * toLinear(g)) + (0.0722 * toLinear(b));
}

function getReadableLabelRotation(rotationRad) {
  if (!Number.isFinite(rotationRad)) return 0;
  let normalized = rotationRad % (Math.PI * 2);
  if (normalized > Math.PI) normalized -= Math.PI * 2;
  if (normalized < -Math.PI) normalized += Math.PI * 2;
  if (normalized > Math.PI * 0.5) normalized -= Math.PI;
  if (normalized < -Math.PI * 0.5) normalized += Math.PI;
  return normalized;
}

function getProjectCardTheme(project, projectIndex, projectCount) {
  const accent = getProjectAccentColor(projectIndex, projectCount);
  return {
    accent,
    glow: accent,
    base: accent,
    deep: accent,
    ink: getContrastText(accent),
  };
}

function applyProjectCardTheme(element, project, projectIndex, projectCount) {
  if (!element) return;
  const theme = getProjectCardTheme(project, projectIndex, projectCount);
  element.style.setProperty('--portfolio-card-accent', theme.accent);
  element.style.setProperty('--portfolio-card-glow', theme.glow);
  element.style.setProperty('--portfolio-card-base', theme.base);
  element.style.setProperty('--portfolio-card-deep', theme.deep);
  element.style.setProperty('--portfolio-card-surface', theme.base);
  element.style.setProperty('--portfolio-card-ink', theme.ink);
}

function setPortfolioSheetHostHidden(hidden) {
  const host = document.getElementById('portfolio-sheet-host');
  if (!host) return;
  if (hidden) {
    host.setAttribute('aria-hidden', 'true');
  } else {
    host.removeAttribute('aria-hidden');
  }
}

function shouldRotatePortfolioLabels() {
  // Portfolio bodies have their own render silhouette and should keep the label
  // attached to the body rotation even when the global home pit pebble controls are off.
  return true;
}

async function fetchPortfolioData() {
  const paths = [
    CONFIG.dataPath,
    `${CONFIG.basePath}js/contents-portfolio.json`,
    '../dist/js/contents-portfolio.json',
  ];

  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: 'no-cache' });
      if (!response.ok) continue;
      return await response.json();
    } catch (error) {
      continue;
    }
  }

  throw new Error('No portfolio data found');
}

function resolveAsset(src) {
  if (!src) return '';
  if (/^https?:\/\//.test(src)) return src;
  const trimmed = src.replace(/^\/+/, '');
  const baseUrl = /^(?:images|video)\//.test(trimmed)
    ? `${CONFIG.basePath}${trimmed}`
    : `${CONFIG.assetBasePath}${trimmed}`;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}v=${getCacheBustValue()}`;
}

class PortfolioPitApp {
  constructor({ config, projects }) {
    this.config = normalizePortfolioConfig(config);
    this.projects = Array.isArray(projects) ? projects : [];
    this.canvas = document.getElementById('c');
    this.mount = document.getElementById('portfolioProjectMount');
    this.appFrame = document.getElementById('app-frame');
    this.dragPointerId = null;
    this.dragBall = null;
    this.dragStart = null;
    this.dragMoved = false;
    this.dragVelocity = { vx: 0, vy: 0 };
    this.dragSamples = [];
    this.isProjectOpen = false;
    this.projectOpenTimeouts = [];
    this.selectedBall = null;
    this.selectedProjectIndex = -1;
    this.focusedProjectIndex = -1;
    this.hoveredBallIndex = -1;
    this.lastFocusedElement = null;
    this.projectNav = null;
    this.projectButtons = [];
    this.projectLabelLayer = null;
    this.projectLabels = [];
    this._portfolioBodiesRefreshToken = 0;
    this.projectDrawerView = null;
    this.boundProjectKeydown = (event) => this.handleProjectKeydown(event);
    this.boundAuditOpenProject = (event) => {
      const index = Number(event?.detail?.index ?? 0);
      if (!Number.isInteger(index) || index < 0) return;
      const ball = this.getBallByProjectIndex(index);
      if (ball) this.openProject(ball);
    };
    this.boundResize = () => {
      window.requestAnimationFrame(() => {
        resize();
        if (!this.isProjectOpen) return;
        const project = this.projects[this.selectedProjectIndex];
        if (project) this.syncProjectHero(project, false);
      });
    };
    this.boundPaletteChange = () => {
      this.applyProjectPalette();
      if (this.isProjectOpen && this.selectedProjectIndex >= 0) {
        this.syncProjectHero(this.projects[this.selectedProjectIndex], false);
      }
    };
  }

  async init() {
    this.ensureAnnouncer();
    this.createProjectView();
    this.createAccessibleProjectNav();
    const globals = getGlobals();
    globals.portfolioProjects = this.projects;
    globals.portfolioPitConfig = this.config.runtime;

    initModeSystem();
    await setMode(MODES.PORTFOLIO_PIT);
    this.applyPortfolioPhysicsProfile();
    this.applyProjectPalette();
    this.ensureProjectLabelLayer();
    this.syncProjectLabels();
    globals.portfolioDomLabels = true;
    globals.portfolioSyncLabelLayer = () => this.syncProjectLabels();
    globals.portfolioRelayoutLabels = () => {
      relayoutPortfolioProjectLabels();
      this.syncProjectLabels();
    };
    this.bindCanvasInteractions();
    this.bindProjectOverlay();
    this.setupDrawerMediaScrollShift();
    document.addEventListener('abs:portfolio:open-project', this.boundAuditOpenProject);
    window.addEventListener('resize', this.boundResize, { passive: true });
    window.addEventListener('bb:paletteChanged', this.boundPaletteChange);
  }

  destroy() {
    this._portfolioBodiesRefreshToken += 1;
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('bb:paletteChanged', this.boundPaletteChange);
    document.removeEventListener('abs:portfolio:open-project', this.boundAuditOpenProject);
    this.teardownDrawerMediaScrollShift();
    document.removeEventListener('keydown', this.boundProjectKeydown, true);
    this.clearProjectOpenTimeouts();
    if (this.projectNav) this.projectNav.remove();
    if (this.projectLabelLayer) this.projectLabelLayer.remove();
    this.projectDrawerView?.destroy();
    const globals = getGlobals();
    globals.ballBallSurfaceGapPx = 0;
    globals.collisionPairSlopPx = null;
    globals.portfolioDomLabels = false;
    globals.portfolioPerformancePriority = false;
    globals.portfolioSyncLabelLayer = null;
    globals.portfolioRelayoutLabels = null;
    this.restoreBackgroundInteractivity();
  }

  applyRuntimeConfig(runtime) {
    this.config.runtime = normalizePortfolioConfig({ runtime }).runtime;
    const globals = getGlobals();
    globals.portfolioPitConfig = this.config.runtime;
    if (this.isProjectOpen && this.selectedProjectIndex >= 0) {
      const project = this.projects[this.selectedProjectIndex];
      if (project) this.syncProjectHero(project, false);
    }
  }

  refreshPitBodies() {
    const globals = getGlobals();
    globals.portfolioPitConfig = this.config.runtime;
    const refreshToken = ++this._portfolioBodiesRefreshToken;
    void setMode(MODES.PORTFOLIO_PIT).then((applied) => {
      if (refreshToken !== this._portfolioBodiesRefreshToken) return;
      const currentGlobals = getGlobals();
      if (!applied || currentGlobals.currentMode !== MODES.PORTFOLIO_PIT) return;
      this.applyPortfolioPhysicsProfile();
      this.applyProjectPalette();
      this.ensureProjectLabelLayer();
      this.syncProjectLabels();
    });
  }

  applyPortfolioPhysicsProfile() {
    const globals = getGlobals();
    const baseGravity = toNumber(globals.gravityMultiplierPit, 1.1);
    const gravityScale = clamp(
      toNumber(this.config.runtime.motion?.gravityScale, this.config.runtime.motion?.settleGravityScale ?? 0.42),
      0.15,
      0.85
    );
    const massMultiplier = clamp(toNumber(this.config.runtime.motion?.massMultiplier, 1), 0.5, 2);
    const bodySpacing = clamp(toNumber(this.config.runtime.bodies?.ballSpacing, 0.08), 0, 1);
    const layoutWallInset = this.config.runtime.layout?.wallInset;
    const wallInset = layoutWallInset === undefined || layoutWallInset === null
      ? Math.max(0, Math.round(toNumber(globals.wallInset, 5)))
      : Math.max(0, Math.round(toNumber(layoutWallInset, 0)));
    const ballBallSurfaceGapPx = Math.max(0, toNumber(this.config.runtime.bodies?.ballBallSurfaceGapPx, 0));
    const collisionPairSlopPx = this.config.runtime.bodies?.collisionPairSlopPx ?? null;
    globals.gravityMultiplier = baseGravity * gravityScale;
    globals.G = globals.GE * globals.gravityMultiplier;
    globals.physicsSkipSleepingSteps = false;
    const dpr = globals.DPR || 1;
    globals.ballSpacing = bodySpacing;
    globals.ballBallSurfaceGapPx = ballBallSurfaceGapPx * dpr;
    globals.collisionPairSlopPx = collisionPairSlopPx === null
      ? null
      : collisionPairSlopPx * dpr;
    globals.wallInset = wallInset;
    globals.physicsCollisionIterations = Math.max(
      14,
      Math.round(Number(globals.physicsCollisionIterations ?? 10) || 10)
    );

    const balls = Array.isArray(globals.balls) ? globals.balls : [];
    for (let index = 0; index < balls.length; index += 1) {
      const ball = balls[index];
      if (!ball) continue;
      ball.m = globals.ballMassKg * massMultiplier;
    }
  }

  applyProjectPalette() {
    const globals = getGlobals();
    const balls = Array.isArray(globals.balls) ? globals.balls : [];
    const n = balls.length;
    for (let index = 0; index < n; index += 1) {
      const ball = balls[index];
      if (ball.__portfolioAccentCircle) {
        applyPortfolioAccentBallColor(ball);
        continue;
      }
      const color = getPortfolioProjectPaletteColor(index, n);
      ball.color = color;
      ball.labelColor = getContrastText(color);
    }
  }

  /** Mount in `#portfolio-sheet-host` when present — sibling after `.fade-content` in `#abs-scene`; see `docs/reference/LAYER-STACKING.md`. */
  createProjectView() {
    const sheetHost = document.getElementById('portfolio-sheet-host');
    const host = sheetHost || this.mount || this.canvas?.parentElement;
    if (!host) return;
    this.projectDrawerView?.destroy();
    this.projectDrawerView = new PortfolioProjectDrawer({
      host,
      resolveAsset,
      coverFallback: CONFIG.coverFallback,
      onRequestClose: () => {
        SoundEngine.playHoverSound?.();
        this.closeProject();
      },
    });
    this.projectView = this.projectDrawerView.mount();
    this.projectBackdrop = this.projectDrawerView.backdrop;
    this.projectDrawer = this.projectDrawerView.drawer;
    this.projectScroll = this.projectDrawerView.scroll;
    this.projectImage = this.projectDrawerView.image;
    this.projectEyebrow = this.projectDrawerView.eyebrow;
    this.projectTitle = this.projectDrawerView.title;
    this.projectContent = this.projectDrawerView.content;
    this.projectClose = this.projectDrawerView.closeButton;
  }

  bindProjectOverlay() {}

  setupDrawerMediaScrollShift() {
    this.projectDrawerView?.setupMediaScrollShift();
  }

  teardownDrawerMediaScrollShift() {
    this.projectDrawerView?.teardownMediaScrollShift();
  }

  scheduleDrawerMediaScrollShift() {
    this.projectDrawerView?.scheduleDrawerMediaScrollShift();
  }

  updateDrawerMediaScrollShift() {
    if (!this.isProjectOpen) return;
    this.projectDrawerView?.updateDrawerMediaScrollShift();
  }

  resetDrawerMediaTransforms() {
    this.projectDrawerView?.resetMediaTransforms();
  }

  resetProjectScrollTop() {
    this.projectDrawerView?.resetScrollTop();
  }

  ensureAnnouncer() {
    if (document.getElementById('announcer')) return;
    const announcer = document.createElement('div');
    announcer.id = 'announcer';
    announcer.className = 'screen-reader';
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announcer);
  }

  createAccessibleProjectNav() {
    if (!this.mount) return;
    const existing = document.getElementById('portfolioProjectNav');
    if (existing) existing.remove();

    const nav = document.createElement('div');
    nav.id = 'portfolioProjectNav';
    nav.className = 'screen-reader';
    nav.setAttribute('aria-label', 'Portfolio projects');

    const intro = document.createElement('p');
    intro.id = 'portfolioProjectNavHint';
    intro.textContent = 'Use Tab to move through projects, then press Enter or Space to open one.';
    nav.appendChild(intro);

    this.projectButtons = this.projects.map((project, index) => {
      const labelContent = resolvePortfolioLabelContent(project, `Project ${index + 1}`);
      const ariaLabel = labelContent.eyebrow
        ? `${labelContent.eyebrow}: ${labelContent.title}`
        : labelContent.title;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.projectIndex = String(index);
      button.setAttribute('aria-describedby', 'portfolioProjectNavHint');
      button.setAttribute('aria-controls', 'portfolioProjectView');
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', ariaLabel);
      button.textContent = labelContent.title;
      button.addEventListener('focus', () => this.setFocusedProjectIndex(index));
      button.addEventListener('blur', () => {
        if (this.focusedProjectIndex === index && !this.isProjectOpen) this.setFocusedProjectIndex(-1);
      });
      button.addEventListener('click', () => {
        const ball = this.getBallByProjectIndex(index);
        if (ball) this.openProject(ball);
      });
      nav.appendChild(button);
      return button;
    });

    this.mount.appendChild(nav);
    this.projectNav = nav;
  }

  ensureProjectLabelLayer() {
    if (!this.mount) return;
    const existing = this.mount.querySelector('.portfolio-label-layer');
    if (existing) existing.remove();

    const layer = document.createElement('div');
    layer.className = 'portfolio-label-layer';
    layer.setAttribute('aria-hidden', 'true');
    this.projectLabels = this.projects.map((project, index) => {
      const label = document.createElement('div');
      label.className = 'portfolio-project-label';
      label.dataset.projectIndex = String(index);

      const text = document.createElement('div');
      text.className = 'portfolio-project-label__text';
      const eyebrow = document.createElement('div');
      eyebrow.className = 'portfolio-project-label__eyebrow';
      const title = document.createElement('div');
      title.className = 'portfolio-project-label__title';
      text.append(eyebrow, title);
      label.appendChild(text);
      label.__portfolioEyebrow = eyebrow;
      label.__portfolioTitle = title;
      layer.appendChild(label);
      return label;
    });

    this.mount.appendChild(layer);
    this.projectLabelLayer = layer;
  }

  syncProjectLabels() {
    if (!this.projectLabelLayer) return;
    const globals = getGlobals();
    const dpr = globals.DPR || 1;
    const balls = Array.isArray(globals.balls) ? globals.balls : [];

    for (let index = 0; index < this.projectLabels.length; index += 1) {
      const label = this.projectLabels[index];
      if (!label) continue;
      const text = label.firstElementChild;
      const eyebrow = label.__portfolioEyebrow;
      const title = label.__portfolioTitle;
      const ball = balls.find((entry) => entry?.projectIndex === index);

      if (!ball || ball.__portfolioHidden) {
        label.style.opacity = '0';
        label.__portfolioSyncSignature = '';
        continue;
      }

      const eyebrowLines = Array.isArray(ball.label?.eyebrow?.lines) ? ball.label.eyebrow.lines : [];
      const titleLines = Array.isArray(ball.label?.title?.lines) ? ball.label.title.lines : [ball.projectTitle || 'Project'];
      const eyebrowKey = eyebrowLines.join('\n');
      const titleKey = titleLines.join('\n');
      if (eyebrow) {
        if (eyebrowLines.length) {
          eyebrow.hidden = false;
          if (eyebrow.dataset.textKey !== eyebrowKey) {
            eyebrow.innerHTML = eyebrowLines.map((line) => `<span>${escapeHtml(line)}</span>`).join('');
            eyebrow.dataset.textKey = eyebrowKey;
          }
        } else {
          eyebrow.hidden = true;
          eyebrow.dataset.textKey = '';
          eyebrow.innerHTML = '';
        }
      }
      if (title) {
        if (title.dataset.textKey !== titleKey) {
          title.innerHTML = titleLines.map((line) => `<span>${escapeHtml(line)}</span>`).join('');
          title.dataset.textKey = titleKey;
        }
        title.hidden = false;
      }

      const diameter = ball.r * 2;
      const width = diameter / dpr;
      const height = diameter / dpr;
      const rotation = shouldRotatePortfolioLabels()
        ? getReadableLabelRotation(ball.theta || 0)
        : 0;
      const titleFontSize = (ball.label?.titleFontSize || ball.label?.fontSize || 20) / dpr;
      const titleLineHeight = (ball.label?.titleLineHeight || (titleFontSize * 0.84)) / Math.max(titleFontSize, 1);
      const eyebrowFontSize = (ball.label?.eyebrowFontSize || Math.max(10, titleFontSize * 0.42)) / dpr;
      const eyebrowLineHeight = (ball.label?.eyebrowLineHeight || (eyebrowFontSize * 0.92)) / Math.max(eyebrowFontSize, 1);
      const gap = (ball.label?.gap || 0) / dpr;
      const alpha = clamp(toNumber(ball.__portfolioDimAlpha, 1), 0, 1) * (ball.__portfolioSelected ? 0 : 1);
      const syncSignature = [
        width.toFixed(2),
        height.toFixed(2),
        (ball.x / dpr).toFixed(2),
        (ball.y / dpr).toFixed(2),
        rotation.toFixed(3),
        alpha.toFixed(3),
        ball.labelColor || "var(--color-brand-white)",
        gap.toFixed(2),
        titleFontSize.toFixed(2),
        titleLineHeight.toFixed(3),
        eyebrowFontSize.toFixed(2),
        eyebrowLineHeight.toFixed(3),
        eyebrowKey,
        titleKey,
      ].join('|');
      if (label.__portfolioSyncSignature === syncSignature) {
        continue;
      }
      label.__portfolioSyncSignature = syncSignature;

      const widthCss = `${width}px`;
      const heightCss = `${height}px`;
      const hoverScale = ball._hoverScale ?? 1;
      const transformCss = `translate(${ball.x / dpr}px, ${ball.y / dpr}px) translate(-50%, -50%) rotate(${rotation}rad) scale(${hoverScale.toFixed(4)})`;
      const opacityCss = `${alpha}`;
      const colorCss = ball.labelColor || "var(--color-brand-white)";
      const gapCss = `${gap}px`;

      if (label.style.width !== widthCss) label.style.width = widthCss;
      if (label.style.height !== heightCss) label.style.height = heightCss;
      if (label.style.transform !== transformCss) label.style.transform = transformCss;
      if (label.style.opacity !== opacityCss) label.style.opacity = opacityCss;
      if (label.style.color !== colorCss) label.style.color = colorCss;
      if (label.style.getPropertyValue('--portfolio-label-stack-gap') !== gapCss) {
        label.style.setProperty('--portfolio-label-stack-gap', gapCss);
      }

      if (text) {
        const titleSizeCss = `${titleFontSize}px`;
        const titleLineHeightCss = `${titleLineHeight}`;
        const eyebrowSizeCss = `${eyebrowFontSize}px`;
        const eyebrowLineHeightCss = `${eyebrowLineHeight}`;
        if (text.style.getPropertyValue('--portfolio-label-title-size') !== titleSizeCss) {
          text.style.setProperty('--portfolio-label-title-size', titleSizeCss);
        }
        if (text.style.getPropertyValue('--portfolio-label-title-line-height') !== titleLineHeightCss) {
          text.style.setProperty('--portfolio-label-title-line-height', titleLineHeightCss);
        }
        if (text.style.getPropertyValue('--portfolio-label-eyebrow-size') !== eyebrowSizeCss) {
          text.style.setProperty('--portfolio-label-eyebrow-size', eyebrowSizeCss);
        }
        if (text.style.getPropertyValue('--portfolio-label-eyebrow-line-height') !== eyebrowLineHeightCss) {
          text.style.setProperty('--portfolio-label-eyebrow-line-height', eyebrowLineHeightCss);
        }
      }
    }
  }

  bindCanvasInteractions() {
    if (!this.canvas) return;
    this.canvas.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
    this.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event));
    this.canvas.addEventListener('pointerup', (event) => this.handlePointerUp(event));
    this.canvas.addEventListener('pointercancel', (event) => this.handlePointerUp(event));
    this.canvas.addEventListener('pointermove', (event) => this.handleHoverMove(event));
    this.canvas.addEventListener('pointerleave', () => { this.hoveredBallIndex = -1; getGlobals().__portfolioHoveredIndex = -1; });
  }

  getCanvasPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    const globals = getGlobals();
    const scaleX = rect.width > 0 ? this.canvas.width / rect.width : (globals.DPR || 1);
    const scaleY = rect.height > 0 ? this.canvas.height / rect.height : (globals.DPR || 1);
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  hitTestBall(point) {
    const globals = getGlobals();
    const balls = Array.isArray(globals.balls) ? globals.balls : [];
    for (let index = balls.length - 1; index >= 0; index -= 1) {
      const ball = balls[index];
      if (!ball || ball.__portfolioHidden) continue;
      if (Number.isInteger(ball.projectIndex)) {
        if (portfolioCanvasPointHitsBody(ball, point.x, point.y, globals)) return ball;
        continue;
      }
      const dx = point.x - ball.x;
      const dy = point.y - ball.y;
      if ((dx * dx) + (dy * dy) <= (ball.r * ball.r)) {
        return ball;
      }
    }
    return null;
  }

  hitTestProjectLabelClientPoint(clientX, clientY) {
    if (!Array.isArray(this.projectLabels) || !this.projectLabels.length) return null;
    let bestMatch = null;

    for (let index = 0; index < this.projectLabels.length; index += 1) {
      const label = this.projectLabels[index];
      if (!(label instanceof HTMLElement)) continue;
      if (label.style.opacity === '0') continue;
      const rect = label.getBoundingClientRect();
      if (!(rect.width > 8 && rect.height > 8)) continue;
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) continue;

      const projectIndex = Number(label.dataset.projectIndex);
      if (!Number.isInteger(projectIndex)) continue;
      const centerX = rect.left + (rect.width / 2);
      const centerY = rect.top + (rect.height / 2);
      const distance = Math.hypot(clientX - centerX, clientY - centerY);

      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { projectIndex, distance };
      }
    }

    return bestMatch ? this.getBallByProjectIndex(bestMatch.projectIndex) : null;
  }

  getBallByProjectIndex(projectIndex) {
    const globals = getGlobals();
    const balls = Array.isArray(globals.balls) ? globals.balls : [];
    for (let index = 0; index < balls.length; index += 1) {
      const ball = balls[index];
      if (ball?.projectIndex === projectIndex) return ball;
    }
    return null;
  }

  setFocusedProjectIndex(projectIndex) {
    this.focusedProjectIndex = Number.isInteger(projectIndex) ? projectIndex : -1;
  }

  handleHoverMove(event) {
    if (this.dragBall || this.isProjectOpen) {
      this.hoveredBallIndex = -1;
      getGlobals().__portfolioHoveredIndex = -1;
      return;
    }
    const point = this.getCanvasPoint(event);
    const hit = this.hitTestBall(point);
    this.hoveredBallIndex = hit && Number.isInteger(hit.projectIndex) ? hit.projectIndex : -1;
    getGlobals().__portfolioHoveredIndex = this.hoveredBallIndex;
  }

  pushDragSample(x, y, stamp) {
    this.dragSamples.push({ x, y, t: stamp });
    while (this.dragSamples.length > DRAG_SAMPLE_LIMIT) this.dragSamples.shift();
  }

  estimateDragVelocity() {
    const samples = Array.isArray(this.dragSamples) ? this.dragSamples : [];
    if (samples.length < 2) return { vx: 0, vy: 0 };
    const newest = samples[samples.length - 1]?.t ?? 0;
    const recent = samples.filter((sample) => (newest - sample.t) <= DRAG_SAMPLE_MAX_AGE_MS);
    if (recent.length < 2) return { vx: 0, vy: 0 };

    let sumVx = 0;
    let sumVy = 0;
    let sumWeight = 0;
    for (let index = 1; index < recent.length; index += 1) {
      const prev = recent[index - 1];
      const next = recent[index];
      const dt = (next.t - prev.t) / 1000;
      if (dt <= 0) continue;
      const weight = index;
      sumVx += (((next.x - prev.x) / dt) * weight);
      sumVy += (((next.y - prev.y) / dt) * weight);
      sumWeight += weight;
    }

    if (sumWeight <= 0) return { vx: 0, vy: 0 };
    return {
      vx: sumVx / sumWeight,
      vy: sumVy / sumWeight,
    };
  }

  clampDragVelocity(velocity) {
    const dpr = getGlobals().DPR || 1;
    const maxSpeedPx = clamp(
      toNumber(this.config.runtime.motion?.dragMaxSpeedPx, 2200),
      400,
      12000
    ) * dpr;
    const speed = Math.hypot(velocity.vx, velocity.vy);
    if (!(speed > maxSpeedPx) || speed <= 1e-6) return velocity;
    const scale = maxSpeedPx / speed;
    return {
      vx: velocity.vx * scale,
      vy: velocity.vy * scale,
    };
  }

  estimateReleaseAngularVelocity(ball, velocity) {
    if (!ball || !this.dragStart || !velocity) return 0;
    const grabOffsetX = Number(this.dragStart.offsetX) || 0;
    const grabOffsetY = Number(this.dragStart.offsetY) || 0;
    const grabDistance = Math.hypot(grabOffsetX, grabOffsetY);
    if (!(grabDistance > 1e-3)) return 0;

    const cross = (grabOffsetX * velocity.vy) - (grabOffsetY * velocity.vx);
    const tangentialSpeed = cross / grabDistance;
    const armRatio = clamp(grabDistance / Math.max(ball.r, 1), 0, 1);
    return (tangentialSpeed / Math.max(ball.r, 1)) * armRatio * 1.15;
  }

  handlePointerDown(event) {
    if (this.isProjectOpen) return;
    const point = this.getCanvasPoint(event);
    const bodyHit = this.hitTestBall(point);
    if (!bodyHit) {
      const labelHit = this.hitTestProjectLabelClientPoint(event.clientX, event.clientY);
      if (labelHit) {
        this.openProject(labelHit);
      }
      return;
    }

    this.dragPointerId = event.pointerId;
    this.dragBall = bodyHit;
    this.dragBall.isPointerLocked = true;
    this.dragBall.vx = 0;
    this.dragBall.vy = 0;
    this.dragBall.omega = 0;
    this.dragBall.wake?.();
    this.dragMoved = false;
    this.dragStart = {
      point,
      clientX: event.clientX,
      clientY: event.clientY,
      stamp: performance.now(),
      offsetX: point.x - bodyHit.x,
      offsetY: point.y - bodyHit.y,
      lastX: point.x,
      lastY: point.y,
      lastStamp: performance.now(),
    };
    this.dragVelocity = { vx: 0, vy: 0 };
    this.dragSamples = [];
    this.pushDragSample(bodyHit.x, bodyHit.y, this.dragStart.stamp);
    this.canvas.setPointerCapture?.(event.pointerId);
  }

  handlePointerMove(event) {
    if (this.dragPointerId !== event.pointerId || !this.dragBall || !this.dragStart) return;
    const point = this.getCanvasPoint(event);
    const dx = event.clientX - this.dragStart.clientX;
    const dy = event.clientY - this.dragStart.clientY;
    const distance = Math.hypot(dx, dy);
    if (distance > PORTFOLIO_CLICK_DRAG_THRESHOLD_PX) this.dragMoved = true;

    const now = performance.now();
    const targetX = point.x - this.dragStart.offsetX;
    const targetY = point.y - this.dragStart.offsetY;

    this.dragBall.x = targetX;
    this.dragBall.y = targetY;
    if (this.canvas) {
      clampBallPositionToWallInterior(this.dragBall, this.canvas.width, this.canvas.height);
    }
    relaxOverlapsWithKinematicBall(this.dragBall);
    this.pushDragSample(this.dragBall.x, this.dragBall.y, now);
    this.dragVelocity = this.clampDragVelocity(this.estimateDragVelocity());
    this.dragStart.lastX = targetX;
    this.dragStart.lastY = targetY;
    this.dragStart.lastStamp = now;
  }

  handlePointerUp(event) {
    if (this.dragPointerId !== event.pointerId || !this.dragBall) return;
    this.canvas.releasePointerCapture?.(event.pointerId);

    const releasedBall = this.dragBall;
    const throwMultiplier = clamp(toNumber(this.config.runtime.motion?.dragThrowMultiplier, 1.05), 0.2, 2);
    const maxAngularSpeed = clamp(toNumber(this.config.runtime.motion?.maxAngularSpeed, 6.5), 0.5, 30);
    releasedBall.isPointerLocked = false;
    releasedBall.sleepTimer = 0;
    releasedBall.isGrounded = false;
    releasedBall.hasSupport = false;

    if (this.dragMoved) {
      const throwVelocity = this.clampDragVelocity({
        vx: this.dragVelocity.vx * throwMultiplier,
        vy: this.dragVelocity.vy * throwMultiplier,
      });
      const releaseOmega = this.estimateReleaseAngularVelocity(releasedBall, throwVelocity);
      releasedBall.vx = throwVelocity.vx;
      releasedBall.vy = throwVelocity.vy;
      releasedBall.omega = clamp(releaseOmega, -maxAngularSpeed, maxAngularSpeed);
      releasedBall.wake?.();
    } else {
      releasedBall.vx = 0;
      releasedBall.vy = 0;
      this.openProject(releasedBall);
    }

    this.dragPointerId = null;
    this.dragBall = null;
    this.dragStart = null;
    this.dragMoved = false;
    this.dragSamples = [];
  }

  clearProjectOpenTimeouts() {
    while (this.projectOpenTimeouts.length) {
      window.clearTimeout(this.projectOpenTimeouts.pop());
    }
  }

  prefetchProjectAssets(project) {
    if (!project) return;
    [project.image, ...getProjectContentBlocks(project).map((block) => block.src)].forEach((src) => {
      if (!src) return;
      if (/\.(mp4|webm)$/i.test(src)) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = resolveAsset(src);
    });
  }

  applyNeighborImpulse(selectedBall) {
    const impulse = clamp(toNumber(this.config.runtime.motion?.neighborImpulse, 0), 0, 1400);
    if (impulse <= 0) return;
    const globals = getGlobals();
    const balls = Array.isArray(globals.balls) ? globals.balls : [];
    for (let index = 0; index < balls.length; index += 1) {
      const ball = balls[index];
      if (!ball || ball === selectedBall) continue;
      const dx = ball.x - selectedBall.x;
      const dy = ball.y - selectedBall.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const strength = (impulse / distance) * 0.65;
      ball.vx += (dx / distance) * strength;
      ball.vy += (dy / distance) * strength;
      ball.__portfolioDimAlpha = 0.2;
      ball.wake?.();
    }
  }

  syncProjectHero(project, animate = true) {
    if (!this.selectedBall) throw new Error('Cannot sync project hero without a selected portfolio body');
    if (!project) throw new Error('Cannot sync project hero without project data');
    if (!this.projectView || !this.projectDrawerView) {
      throw new Error('Portfolio project drawer is not mounted');
    }

    const openDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? clamp(toNumber(this.config.runtime.behavior?.reducedMotionDurationMs, 320), 120, 700)
      : clamp(toNumber(this.config.runtime.motion?.openDurationMs, 420), 200, 1200);
    const imageFadeMs = clamp(toNumber(this.config.runtime.motion?.imageFadeMs, 220), 0, 600);
    const titleDelay = clamp(toNumber(this.config.runtime.motion?.titleRevealDelayMs, 280), 0, 1200);

    this.projectDrawerView.syncProject(project, {
      animate,
      openDurationMs: openDuration,
      imageFadeMs,
      titleDelayMs: titleDelay,
      accentColor: this.selectedBall?.color || getPortfolioProjectPaletteColor(this.selectedProjectIndex, this.projects.length),
      motionConfig: this.config.runtime.motion || {},
    });
    this.syncProjectButtonStates();
  }

  openProject(ball) {
    if (!ball || this.isProjectOpen) return;
    const project = this.projects[ball.projectIndex];
    if (!project) return;
    const labelContent = resolvePortfolioLabelContent(project, project?.title || 'Project');
    const spokenLabel = labelContent.eyebrow
      ? `${labelContent.eyebrow}: ${labelContent.title}`
      : labelContent.title;

    SoundEngine.playHoverSound?.();
    this.prefetchProjectAssets(project);
    this.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.selectedBall = ball;
    this.selectedProjectIndex = ball.projectIndex;
    this.isProjectOpen = true;
    this.setFocusedProjectIndex(-1);

    // Freeze all pebbles in place — no dimming, no hiding, no physics.
    const globals = getGlobals();
    const allBalls = Array.isArray(globals.balls) ? globals.balls : [];
    for (let i = 0; i < allBalls.length; i += 1) {
      const b = allBalls[i];
      if (!b) continue;
      b.vx = 0;
      b.vy = 0;
      b.omega = 0;
      b.isPointerLocked = true;
      if (b.sleep) b.sleep(); else b.isSleeping = true;
    }
    globals.__portfolioDrawerOpen = true;

    this.disableBackgroundInteractivity();
    try {
      this.syncProjectHero(project, true);
    } catch (error) {
      this.restoreBackgroundInteractivity();
      // Unfreeze all balls on failure
      const g = getGlobals();
      g.__portfolioDrawerOpen = false;
      const allB = Array.isArray(g.balls) ? g.balls : [];
      for (let i = 0; i < allB.length; i += 1) {
        const b = allB[i];
        if (!b) continue;
        b.__portfolioDimAlpha = 1;
        b.isPointerLocked = false;
        if (b.wake) b.wake();
      }
      this.isProjectOpen = false;
      this.selectedBall = null;
      this.selectedProjectIndex = -1;
      this.syncProjectButtonStates();
      announceToScreenReader('Project view failed to open');
      console.error('[portfolio] Failed to open project drawer', error);
      return;
    }
    announceToScreenReader(`Opened project: ${spokenLabel}`);
    document.addEventListener('keydown', this.boundProjectKeydown, true);

    const openDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? clamp(toNumber(this.config.runtime.behavior?.reducedMotionDurationMs, 320), 120, 700)
      : clamp(toNumber(this.config.runtime.motion?.openDurationMs, 420), 200, 1200);
    this.projectOpenTimeouts.push(window.setTimeout(() => {
      this.projectClose?.focus();
    }, Math.min(900, openDuration + 80)));
  }

  finishProjectClose() {
    this.restoreBackgroundInteractivity();

    const globals = getGlobals();
    globals.__portfolioDrawerOpen = false;
    const balls = Array.isArray(globals.balls) ? globals.balls : [];
    for (let index = 0; index < balls.length; index += 1) {
      const ball = balls[index];
      if (!ball) continue;
      ball.__portfolioDimAlpha = 1;
      ball.isPointerLocked = false;
      if (ball.wake) ball.wake();
    }
    if (this.selectedBall) {
      this.selectedBall.__portfolioSelected = false;
      this.selectedBall.isPointerLocked = false;
    }
    this.isProjectOpen = false;
    const restoredIndex = this.selectedProjectIndex;
    this.selectedBall = null;
    this.selectedProjectIndex = -1;
    this.syncProjectButtonStates();
    if (restoredIndex >= 0) this.setFocusedProjectIndex(restoredIndex);
    announceToScreenReader('Closed project view');
    if (this.lastFocusedElement?.focus) {
      this.lastFocusedElement.focus();
    } else if (restoredIndex >= 0 && this.projectButtons[restoredIndex]?.focus) {
      this.projectButtons[restoredIndex].focus();
    }
  }

  closeProject() {
    if (!this.isProjectOpen) return;
    if (!this.projectView) {
      this.finishProjectClose();
      return;
    }
    if (this.projectView.classList.contains('is-closing')) return;
    this.clearProjectOpenTimeouts();
    this.projectView.classList.remove('is-title-visible');
    document.removeEventListener('keydown', this.boundProjectKeydown, true);

    const openDuration = clamp(toNumber(this.config.runtime.motion?.openDurationMs, 420), 200, 1200);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.projectDrawerView?.beginClose({
      reducedMotion,
      durationMs: openDuration,
      onComplete: () => this.finishProjectClose(),
    });
  }

  syncProjectButtonStates() {
    for (let index = 0; index < this.projectButtons.length; index += 1) {
      const button = this.projectButtons[index];
      if (!button) continue;
      const expanded = this.isProjectOpen && index === this.selectedProjectIndex;
      button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }
  }

  disableBackgroundInteractivity() {
    document.body.classList.add('portfolio-project-open');
    setPortfolioSheetHostHidden(false);
    refreshCursor();
    if (this.appFrame) {
      this.appFrame.setAttribute('aria-hidden', 'true');
      this.appFrame.inert = true;
    }
    if (this.projectNav) {
      this.projectNav.setAttribute('aria-hidden', 'true');
      this.projectNav.inert = true;
    }
  }

  restoreBackgroundInteractivity() {
    document.body.classList.remove('portfolio-project-open');
    setPortfolioSheetHostHidden(true);
    refreshCursor();
    if (this.appFrame) {
      this.appFrame.removeAttribute('aria-hidden');
      this.appFrame.inert = false;
    }
    if (this.projectNav) {
      this.projectNav.removeAttribute('aria-hidden');
      this.projectNav.inert = false;
    }
  }

  getProjectFocusableElements() {
    return this.projectDrawerView?.getFocusableElements() || [];
  }

  handleProjectKeydown(event) {
    if (!this.isProjectOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeProject();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusables = this.getProjectFocusableElements();
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !this.projectView.contains(active))) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && (active === last || !this.projectView.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }
}

function getProjectAccentColor(projectIndex, projectCount) {
  return getPortfolioProjectPaletteColor(projectIndex, Math.max(1, projectCount || 1));
}

function getProjectTags(project) {
  return Array.isArray(project?.tags) ? project.tags.slice(0, 3) : [];
}

function getProjectImageSrc(project) {
  if (project?.image) return project.image;
  const imageBlock = getProjectContentBlocks(project).find((block) => {
    const src = String(block?.src || '');
    return block?.type === 'image' || /\.(avif|jpe?g|png|webp)$/i.test(src);
  });
  return imageBlock?.src || '';
}

function getProjectVideoSrc(project) {
  if (project?.thumbnailVideo) return project.thumbnailVideo;
  if (project?.video) return project.video;
  return '';
}

function getPortfolioVideoMimeType(src) {
  if (/\.webm(\?|#|$)/i.test(src)) return 'video/webm';
  if (/\.mp4(\?|#|$)/i.test(src)) return 'video/mp4';
  return '';
}

function shouldReducePortfolioMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

class PortfolioScrollApp {
  constructor({ config, projects }) {
    this.config = normalizePortfolioConfig(config);
    this.projects = Array.isArray(projects) ? projects : [];
    this.canvas = document.getElementById('c');
    this.mount = document.getElementById('portfolioProjectMount');
    this.appFrame = document.getElementById('app-frame');
    this.cards = [];
    this.mediaVideos = [];
    this.activeProjectIndex = 0;
    this.deckTargetPosition = 0;
    this.deckDisplayPosition = 0;
    this.deckAnimationFrame = 0;
    this.deckLastFrameAt = 0;
    this.deckIsSettling = false;
    this.deckSettleTimer = 0;
    this.deckMotionDirection = -1;
    this.deckOptions = { ...PORTFOLIO_DECK_DEFAULTS };
    this.deckStage = null;
    this.deckPin = null;
    this.deckViewport = null;
    this.deckStatus = null;
    this.pendingDeckFocusIndex = -1;
    this.pendingDeckAnnounce = false;
    this.ignoreNextCardClick = false;
    this.suppressNextCardClick = false;
    this.pressedCardState = null;
    this.pressOpenTimer = 0;
    this.projectOpenGhost = null;
    this.projectOpenGhostAnimation = null;
    this.projectOpenGhostToken = 0;
    this.projectOpenPhase = 'closed';
    this.projectOpenDebug = null;
    this.pointerState = null;
    this.isProjectOpen = false;
    this.selectedProjectIndex = -1;
    this.lastFocusedElement = null;
    this.projectDrawerView = null;
    this.videoObserver = null;
    this.cardObserver = null;
    this.projectOpenTimeouts = [];
    this.boundProjectKeydown = (event) => this.handleProjectKeydown(event);
    this.boundDeckWheel = (event) => this.handleDeckWheel(event);
    this.boundDeckPointerDown = (event) => this.handleDeckPointerDown(event);
    this.boundDeckPointerMove = (event) => this.handleDeckPointerMove(event);
    this.boundDeckPointerUp = (event) => this.handleDeckPointerUp(event);
    this.boundDeckPointerCancel = (event) => this.handleDeckPointerCancel(event);
    this.boundAuditOpenProject = (event) => {
      const requestedId = event?.detail?.projectId || event?.detail?.id;
      const requestedIndex = requestedId
        ? this.projects.findIndex((project) => String(project?.id) === String(requestedId))
        : event?.detail?.index;
      const index = Number(requestedIndex ?? 0);
      if (Number.isInteger(index) && index >= 0) this.openProjectByIndex(index);
    };
    this.boundResize = () => this.updateCardMetrics();
    this.boundPaletteChange = () => this.applyProjectPalette();
  }

  async init() {
    this.ensureAnnouncer();
    this.createProjectView();
    this.renderProjectDeck();
    this.setupDeckEvents();
    this.applyProjectPalette();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    this.updateCardMetrics();
    this.setActiveProject(0, { immediate: true });
    this.setupVideoObserver();
    document.addEventListener('abs:portfolio:open-project', this.boundAuditOpenProject);
    window.addEventListener('resize', this.boundResize, { passive: true });
    window.addEventListener('bb:paletteChanged', this.boundPaletteChange);

    const globals = getGlobals();
    globals.portfolioProjects = this.projects;
    globals.portfolioDomLabels = true;
    globals.portfolioSyncLabelLayer = () => this.updateCardMetrics();
    globals.portfolioRelayoutLabels = () => this.updateCardMetrics();
    installPortfolioAuditBridge(this);
  }

  destroy() {
    removePortfolioAuditBridge(this);
    document.removeEventListener('abs:portfolio:open-project', this.boundAuditOpenProject);
    document.removeEventListener('keydown', this.boundProjectKeydown, true);
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('bb:paletteChanged', this.boundPaletteChange);
    this.teardownDeckEvents();
    this.stopDeckAnimation();
    this.clearDeckSettleTimer();
    this.clearProjectOpenTimeouts();
    this.clearPressedCard();
    this.clearProjectOpenGhost();
    this.videoObserver?.disconnect();
    this.cardObserver?.disconnect();
    this.pauseAllVideos();
    this.projectDrawerView?.destroy();
    this.restoreBackgroundInteractivity();

    const globals = getGlobals();
    globals.portfolioDomLabels = false;
    globals.portfolioSyncLabelLayer = null;
    globals.portfolioRelayoutLabels = null;
    globals.__portfolioDrawerOpen = false;
  }

  applyRuntimeConfig(runtime) {
    this.config.runtime = normalizePortfolioConfig({ runtime }).runtime;
    this.applyDeckTuning();
    this.updateDeckSlots({ force: true });
    if (this.isProjectOpen && this.selectedProjectIndex >= 0) {
      this.syncProjectHero(this.projects[this.selectedProjectIndex], false);
    }
  }

  refreshPitBodies() {
    this.updateCardMetrics();
  }

  syncProjectLabels() {
    this.updateCardMetrics();
  }

  ensureAnnouncer() {
    if (document.getElementById('announcer')) return;
    const announcer = document.createElement('div');
    announcer.id = 'announcer';
    announcer.className = 'screen-reader';
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announcer);
  }

  createProjectView() {
    const sheetHost = document.getElementById('portfolio-sheet-host');
    const host = sheetHost || this.mount || this.canvas?.parentElement;
    if (!host) return;
    this.projectDrawerView?.destroy();
    this.projectDrawerView = new PortfolioProjectDrawer({
      host,
      resolveAsset,
      coverFallback: CONFIG.coverFallback,
      onRequestClose: () => {
        SoundEngine.playHoverSound?.();
        this.closeProject();
      },
    });
    this.projectView = this.projectDrawerView.mount();
    this.projectClose = this.projectDrawerView.closeButton;
  }

  readDeckIntroContent() {
    const title = String(this.mount?.dataset?.introTitle || '').trim()
      || PORTFOLIO_DECK_INTRO_FALLBACK.title;
    const body = String(this.mount?.dataset?.introBody || '').trim()
      || PORTFOLIO_DECK_INTRO_FALLBACK.body;
    return { title, body };
  }

  createDeckIntro() {
    const { title, body } = this.readDeckIntroContent();
    const intro = document.createElement('section');
    intro.className = 'portfolio-deck-intro';
    intro.setAttribute('aria-labelledby', 'portfolioDeckIntroTitle');

    const heading = document.createElement('h2');
    heading.id = 'portfolioDeckIntroTitle';
    heading.className = 'portfolio-deck-intro__title';
    heading.textContent = title;

    const copy = document.createElement('p');
    copy.className = 'portfolio-deck-intro__body';
    copy.textContent = body;

    intro.append(heading, copy);
    return intro;
  }

  renderProjectDeck() {
    if (!this.mount) return;
    this.mount.replaceChildren();
    this.mount.classList.add('is-deck-ready');
    this.applyDeckTuning();

    const stage = document.createElement('section');
    stage.className = 'portfolio-deck-stage';
    stage.setAttribute('aria-label', 'Selected portfolio projects');
    stage.setAttribute('aria-roledescription', 'carousel');
    stage.tabIndex = -1;

    const pin = document.createElement('div');
    pin.className = 'portfolio-deck-pin';

    const intro = this.createDeckIntro();

    const viewport = document.createElement('div');
    viewport.className = 'portfolio-deck-viewport';
    viewport.setAttribute('aria-labelledby', 'portfolioDeckIntroTitle');

    const mist = document.createElement('div');
    mist.className = 'portfolio-deck-mist';
    mist.setAttribute('aria-hidden', 'true');

    this.cards = this.projects.map((project, index) => {
      const card = this.createProjectCard(project, index);
      viewport.appendChild(card);
      return card;
    });

    const status = document.createElement('div');
    status.className = 'screen-reader portfolio-deck-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');

    pin.append(intro, viewport, mist, status);
    stage.append(pin);
    this.mount.appendChild(stage);
    this.deckStage = stage;
    this.deckPin = pin;
    this.deckViewport = viewport;
    this.deckStatus = status;
  }

  createProjectCard(project, index) {
    const labelContent = resolvePortfolioLabelContent(project, project?.title || `Project ${index + 1}`);
    const spokenLabel = labelContent.eyebrow
      ? `${labelContent.eyebrow}: ${labelContent.title}`
      : labelContent.title;
    const card = document.createElement('article');
    card.className = 'portfolio-project-card portfolio-deck-card portfolio-project-label';
    card.dataset.projectIndex = String(index);
    card.dataset.projectId = String(project?.id || `project-${index + 1}`);
    applyProjectCardTheme(card, project, index, this.projects.length);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '-1');
    card.setAttribute('aria-haspopup', 'dialog');
    card.setAttribute('aria-controls', 'portfolioProjectView');
    card.setAttribute('aria-expanded', 'false');
    card.setAttribute('aria-label', `Open project ${index + 1}: ${spokenLabel}`);

    const copy = document.createElement('div');
    copy.className = 'portfolio-project-card__copy';

    const client = document.createElement('p');
    client.className = 'portfolio-project-card__client';
    client.textContent = project?.client || project?.eyebrow || `Project ${index + 1}`;

    const title = document.createElement('h3');
    title.className = 'portfolio-project-card__title portfolio-project-label__text';
    const titleText = document.createElement('span');
    titleText.className = 'portfolio-project-card__title-text';
    titleText.textContent = project?.displayTitle || project?.title || labelContent.title;
    title.append(titleText);

    const tags = document.createElement('ul');
    tags.className = 'portfolio-project-card__tags';
    tags.setAttribute('aria-label', 'Project tags');
    getProjectTags(project).forEach((tag) => {
      const item = document.createElement('li');
      item.textContent = tag;
      tags.appendChild(item);
    });

    copy.append(client, title);
    if (tags.childElementCount) copy.appendChild(tags);

    const media = this.createProjectCardMedia(project, index);
    card.append(copy, media);
    card.addEventListener('pointerdown', (event) => this.handleCardPointerDown(event, index));
    card.addEventListener('pointermove', (event) => this.handleCardPointerMove(event, index));
    card.addEventListener('pointerup', (event) => this.handleCardPointerUp(event, index));
    card.addEventListener('pointercancel', (event) => this.handleCardPointerCancel(event, index));
    card.addEventListener('lostpointercapture', (event) => this.handleCardLostPointerCapture(event, index));
    card.addEventListener('click', (event) => this.handleCardClick(event, index));
    card.addEventListener('keydown', (event) => this.handleCardKeydown(event, index));
    card.addEventListener('pointerenter', () => this.prefetchProjectAssets(project));
    card.addEventListener('focus', () => card.classList.add('is-keyboard-focused'));
    card.addEventListener('blur', () => card.classList.remove('is-keyboard-focused'));
    return card;
  }

  createProjectCardMedia(project, index) {
    const frame = document.createElement('figure');
    frame.className = 'portfolio-project-card__media';
    frame.setAttribute('aria-hidden', 'true');
    const imageSrc = getProjectImageSrc(project);
    const videoSrc = getProjectVideoSrc(project);
    const reduceMotion = shouldReducePortfolioMotion();

    if (videoSrc && !reduceMotion) {
      const video = document.createElement('video');
      video.className = 'portfolio-project-card__video';
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = true;
      video.preload = index < 2 ? 'metadata' : 'none';
      video.dataset.projectIndex = String(index);
      if (imageSrc) video.poster = resolveAsset(imageSrc);
      const source = document.createElement('source');
      source.src = resolveAsset(videoSrc);
      source.type = getPortfolioVideoMimeType(videoSrc) || 'video/mp4';
      video.appendChild(source);
      frame.appendChild(video);
      this.mediaVideos.push(video);
    } else if (imageSrc) {
      const image = document.createElement('img');
      image.className = 'portfolio-project-card__image';
      image.src = resolveAsset(imageSrc);
      image.alt = '';
      image.loading = index < 2 ? 'eager' : 'lazy';
      image.decoding = 'async';
      frame.appendChild(image);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'portfolio-project-card__media-fallback';
      frame.appendChild(fallback);
    }

    const veil = document.createElement('div');
    veil.className = 'portfolio-project-card__media-veil';
    frame.appendChild(veil);
    return frame;
  }

  setupVideoObserver() {
    if (shouldReducePortfolioMotion() || !this.mediaVideos.length) {
      this.pauseAllVideos();
      return;
    }
    this.videoObserver?.disconnect();
    this.updateVideoPlayback();
  }

  setupCardObserver() {
    this.updateDeckSlots();
  }

  setupDeckEvents() {
    if (!this.deckStage) return;
    this.teardownDeckEvents();
    this.deckStage.addEventListener('wheel', this.boundDeckWheel, { passive: false });
    this.deckStage.addEventListener('pointerdown', this.boundDeckPointerDown);
    this.deckStage.addEventListener('pointermove', this.boundDeckPointerMove);
    this.deckStage.addEventListener('pointerup', this.boundDeckPointerUp);
    this.deckStage.addEventListener('pointercancel', this.boundDeckPointerCancel);
  }

  teardownDeckEvents() {
    if (!this.deckStage) return;
    this.deckStage.removeEventListener('wheel', this.boundDeckWheel);
    this.deckStage.removeEventListener('pointerdown', this.boundDeckPointerDown);
    this.deckStage.removeEventListener('pointermove', this.boundDeckPointerMove);
    this.deckStage.removeEventListener('pointerup', this.boundDeckPointerUp);
    this.deckStage.removeEventListener('pointercancel', this.boundDeckPointerCancel);
  }

  applyProjectPalette() {
    this.cards.forEach((card, index) => {
      applyProjectCardTheme(card, this.projects[index], index, this.projects.length);
    });
  }

  updateCardMetrics() {
    if (!this.mount) return;
    this.mount.style.setProperty('--portfolio-project-count', String(this.projects.length));
    this.applyDeckTuning();
    this.updateDeckFromScroll({ force: true });
  }

  resolveDeckOptions() {
    const runtime = this.config?.runtime || {};
    const deck = runtime.deck || runtime.carousel || {};
    const motionDeck = runtime.motion?.deck || {};
    return {
      ...PORTFOLIO_DECK_DEFAULTS,
      ...deck,
      ...motionDeck,
    };
  }

  applyDeckTuning() {
    if (!this.mount) return;
    this.deckOptions = this.resolveDeckOptions();
    const cardWidthPercent = clamp(toNumber(this.deckOptions.cardWidthPercent, PORTFOLIO_DECK_DEFAULTS.cardWidthPercent), 50, 98);
    const cardMaxWidthPx = clamp(toNumber(this.deckOptions.cardMaxWidthPx, PORTFOLIO_DECK_DEFAULTS.cardMaxWidthPx), 640, 1800);
    const cardHeightCqh = clamp(toNumber(this.deckOptions.cardHeightCqh, PORTFOLIO_DECK_DEFAULTS.cardHeightCqh), 24, 72);
    const cardMaxHeightPx = clamp(toNumber(this.deckOptions.cardMaxHeightPx, PORTFOLIO_DECK_DEFAULTS.cardMaxHeightPx), 260, 820);
    const centerYPercent = clamp(toNumber(this.deckOptions.centerYPercent, PORTFOLIO_DECK_DEFAULTS.centerYPercent), 45, 85);
    const perspectivePx = clamp(toNumber(this.deckOptions.perspectivePx, PORTFOLIO_DECK_DEFAULTS.perspectivePx), 500, 2600);
    const depthGapPx = clamp(toNumber(this.deckOptions.depthGap1Px, PORTFOLIO_DECK_DEFAULTS.depthGap1Px), 0, 140);
    const depthZPx = -Math.abs(clamp(toNumber(this.deckOptions.depthZ1Px, PORTFOLIO_DECK_DEFAULTS.depthZ1Px), -140, -1));
    const depthScale1 = clamp(toNumber(this.deckOptions.depthScale1, PORTFOLIO_DECK_DEFAULTS.depthScale1), 0.78, 1);
    const depthScaleStep = Math.max(0, 1 - depthScale1);
    const depthBlurPx = clamp(toNumber(this.deckOptions.depthBlur1Px, PORTFOLIO_DECK_DEFAULTS.depthBlur1Px), 0, 6);
    const contactShadowOpacity = clamp(
      toNumber(this.deckOptions.contactShadowOpacity, PORTFOLIO_DECK_DEFAULTS.contactShadowOpacity),
      0,
      0.18
    );

    this.mount.style.setProperty('--portfolio-deck-card-width-fluid', `${cardWidthPercent}%`);
    this.mount.style.setProperty('--portfolio-deck-card-width-max', `${cardMaxWidthPx}px`);
    this.mount.style.setProperty('--portfolio-deck-card-height-fluid', `${cardHeightCqh}cqh`);
    this.mount.style.setProperty('--portfolio-deck-card-height-max', `${cardMaxHeightPx}px`);
    this.mount.style.setProperty('--portfolio-deck-center-y', `${centerYPercent}%`);
    this.mount.style.setProperty('--portfolio-deck-perspective', `${perspectivePx}px`);
    this.mount.style.setProperty('--portfolio-deck-depth-gap-1', `${depthGapPx}px`);
    this.mount.style.setProperty('--portfolio-deck-depth-gap-2', `${depthGapPx * 2}px`);
    this.mount.style.setProperty('--portfolio-deck-depth-z-1', `${depthZPx}px`);
    this.mount.style.setProperty('--portfolio-deck-depth-z-2', `${depthZPx * 2}px`);
    this.mount.style.setProperty('--portfolio-deck-depth-scale-1', String(depthScale1));
    this.mount.style.setProperty('--portfolio-deck-depth-scale-2', String(clamp(1 - (depthScaleStep * 2), 0.72, 1)));
    this.mount.style.setProperty('--portfolio-deck-depth-blur-1', `${depthBlurPx}px`);
    this.mount.style.setProperty('--portfolio-deck-depth-blur-2', `${depthBlurPx * 2}px`);
    this.mount.style.setProperty('--portfolio-card-contact-shadow-opacity', contactShadowOpacity.toFixed(3));
  }

  wrapProjectIndex(index) {
    const count = this.projects.length;
    if (!count) return 0;
    return ((Math.round(index) % count) + count) % count;
  }

  wrapDeckPosition(position) {
    const count = this.projects.length;
    if (!count) return 0;
    const wrapped = position % count;
    return wrapped < 0 ? wrapped + count : wrapped;
  }

  getNearestContinuousPositionForIndex(index, referencePosition = this.deckTargetPosition) {
    const count = this.projects.length;
    if (!count) return 0;
    const wrappedIndex = this.wrapProjectIndex(index);
    return wrappedIndex + (Math.round((referencePosition - wrappedIndex) / count) * count);
  }

  getDeckConveyorPhase(index, position) {
    if (!this.projects.length) return 0;
    return this.wrapDeckPosition(position - index);
  }

  getDeckMotionDirectionForPosition(position = this.deckDisplayPosition) {
    const displayDelta = this.deckTargetPosition - position;
    if (Math.abs(displayDelta) > 0.0001) return displayDelta > 0 ? 1 : -1;
    return this.deckMotionDirection || -1;
  }

  getDeckTransitionState(position) {
    if (!this.projects.length) return null;
    const direction = this.getDeckMotionDirectionForPosition(position);
    const nearestPosition = Math.round(position);
    const offset = position - nearestPosition;
    const nextPosition = nearestPosition + (Math.abs(offset) > 0.0001 ? Math.sign(offset) : direction);

    return {
      direction,
      progress: clamp(Math.abs(offset), 0, 1),
      fromActiveIndex: this.wrapProjectIndex(nearestPosition),
      toActiveIndex: this.wrapProjectIndex(nextPosition),
      outgoingIndex: this.wrapProjectIndex(nearestPosition),
    };
  }

  getNearestDisplayIndex() {
    return this.wrapProjectIndex(this.deckDisplayPosition);
  }

  getDeckIntentIndex() {
    return this.wrapProjectIndex(Math.round(this.deckTargetPosition));
  }

  isDeckPositionSettled(position = this.deckDisplayPosition) {
    return Math.abs(position - Math.round(position)) < 0.003
      && Math.abs(this.deckTargetPosition - position) < 0.003
      && !this.deckIsSettling;
  }

  getDeckMotionMetrics() {
    const height = this.deckStage?.clientHeight || window.innerHeight || 900;
    const depthGap = toNumber(this.deckOptions.depthGap1Px, clamp(height * 0.044, 30, 42));
    const depthZ = Math.abs(toNumber(this.deckOptions.depthZ1Px, -18));
    const depthScaleStep = Math.max(0.012, 1 - clamp(toNumber(this.deckOptions.depthScale1, 0.962), 0.88, 0.99));
    const depthBlurStep = clamp(toNumber(this.deckOptions.depthBlur1Px, 0.35), 0, 2);
    const rotateXStepDeg = clamp(toNumber(this.deckOptions.rotateXStepDeg, PORTFOLIO_DECK_DEFAULTS.rotateXStepDeg), -2, 2);
    return {
      depthGap,
      depthZ,
      depthScaleStep,
      depthBlurStep,
      rotateXStepDeg,
    };
  }

  getDeckLoopOptions() {
    const stageHeight = this.deckStage?.clientHeight || window.innerHeight || 900;
    const defaultExitTravel = clamp(stageHeight * 0.26, 150, 260);
    const exitTravel = clamp(
      toNumber(this.deckOptions.exitTravelPx, defaultExitTravel),
      48,
      Math.max(96, stageHeight * 0.54)
    );
    const exitFadeStart = clamp(
      toNumber(this.deckOptions.exitFadeStart, PORTFOLIO_DECK_DEFAULTS.exitFadeStart),
      0.04,
      0.68
    );
    const exitFadeEnd = clamp(
      Math.max(
        exitFadeStart + 0.08,
        toNumber(this.deckOptions.exitFadeEnd, PORTFOLIO_DECK_DEFAULTS.exitFadeEnd)
      ),
      exitFadeStart + 0.06,
      0.82
    );
    const reappearStart = clamp(
      Math.max(
        exitFadeEnd + 0.08,
        toNumber(this.deckOptions.reappearStart, PORTFOLIO_DECK_DEFAULTS.reappearStart)
      ),
      exitFadeEnd + 0.06,
      0.96
    );
    const reappearFade = clamp(
      toNumber(this.deckOptions.reappearFade, PORTFOLIO_DECK_DEFAULTS.reappearFade),
      0.03,
      0.24
    );

    return {
      exitTravel,
      exitFadeStart,
      exitFadeEnd,
      wrapDepth: clamp(
        toNumber(this.deckOptions.wrapDepthPx, PORTFOLIO_DECK_DEFAULTS.wrapDepthPx),
        16,
        Math.max(48, stageHeight * 0.42)
      ),
      reappearStart,
      reappearEnd: Math.min(1, reappearStart + reappearFade),
      exitScale: clamp(
        toNumber(this.deckOptions.exitScale, PORTFOLIO_DECK_DEFAULTS.exitScale),
        0.96,
        1.12
      ),
      exitBlur: clamp(
        toNumber(this.deckOptions.exitBlurPx, PORTFOLIO_DECK_DEFAULTS.exitBlurPx),
        0.4,
        7
      ),
    };
  }

  getDeckCardPose(depth) {
    const metrics = this.getDeckMotionMetrics();
    const activeAmount = clamp(1 - Math.abs(depth), 0, 1);
    if (depth <= 0.006 || activeAmount > 0.994) {
      return {
        slot: '0',
        visualSlot: 'front',
        zone: 'visible-stack',
        depth,
        depthLabel: '0',
        zIndex: 700,
        x: 0,
        y: 0,
        z: 0,
        rotateX: 0,
        scale: 1,
        blur: 0,
        saturate: 1,
      opacity: 1,
      pointerEvents: this.isProjectOpen ? 'none' : 'auto',
    };
  }

    const visibleDepth = Math.max(0, depth);
    const depthLabel = Math.max(1, Math.ceil(visibleDepth));
    const deepestDepth = Math.max(1, this.projects.length - 1);
    const rearSettle = smoothstep(
      Math.max(0.01, deepestDepth - 1.15),
      deepestDepth,
      visibleDepth
    );
    const stackY = -(metrics.depthGap * visibleDepth) + (metrics.depthGap * 0.32 * rearSettle);
    const stackOpacity = lerp(1, 0.68, rearSettle);
    const stackSaturate = clamp(1 - (0.035 * visibleDepth) - (0.05 * rearSettle), 0.72, 1);
    return {
      slot: `-${depthLabel}`,
      visualSlot: visibleDepth < 1 ? 'incoming' : `depth-${depthLabel}`,
      zone: 'visible-stack',
      depth: visibleDepth,
      depthLabel: String(depthLabel),
      zIndex: Math.max(2, Math.round(700 - (visibleDepth * 10))),
      x: 0,
      y: stackY,
      z: -(metrics.depthZ * visibleDepth),
      rotateX: metrics.rotateXStepDeg * visibleDepth,
      scale: clamp(1 - (metrics.depthScaleStep * visibleDepth), 0.78, 1),
      blur: clamp(metrics.depthBlurStep * visibleDepth, 0, 2.6),
      saturate: stackSaturate,
      opacity: stackOpacity,
      pointerEvents: 'none',
    };
  }

  getDeckLoopWrapPose(state) {
    const metrics = this.getDeckMotionMetrics();
    const projectCount = Math.max(1, this.projects.length);
    const progress = clamp(state?.progress ?? 0, 0, 1);
    const options = this.getDeckLoopOptions();
    const deepestPose = this.getDeckCardPose(Math.max(0, projectCount - 1));
    const exitZ = Math.max(metrics.depthZ * 2.2, options.exitTravel * 0.34);
    const exitRotateX = -metrics.rotateXStepDeg * 1.55;
    const moveT = smoothstep(0, options.exitFadeEnd, progress);
    const fadeT = smoothstep(options.exitFadeStart, options.exitFadeEnd, progress);
    const exitPose = {
      x: 0,
      y: options.exitTravel * moveT,
      z: exitZ * moveT,
      rotateX: lerp(0, exitRotateX, moveT),
      scale: lerp(1, options.exitScale, moveT),
      blur: lerp(0, options.exitBlur, fadeT),
      saturate: lerp(1, 0.82, fadeT),
      opacity: lerp(1, 0, fadeT),
    };

    if (progress < options.exitFadeEnd) {
      return {
        slot: 'exit',
        visualSlot: 'exit',
        zone: 'visible-exit',
        depth: -1,
        depthLabel: 'exit',
        zIndex: 720,
        x: exitPose.x,
        y: exitPose.y,
        z: exitPose.z,
        rotateX: exitPose.rotateX,
        scale: exitPose.scale,
        blur: exitPose.blur,
        saturate: exitPose.saturate,
        opacity: exitPose.opacity,
        visibility: exitPose.opacity <= 0.01 ? 'hidden' : 'visible',
        pointerEvents: 'none',
      };
    }

    if (progress < options.reappearStart) {
      const wrapT = smoothstep(options.exitFadeEnd, options.reappearStart, progress);
      const wrapArc = Math.sin(wrapT * Math.PI);
      return {
        slot: 'hidden-wrap',
        visualSlot: 'hidden-wrap',
        zone: 'hidden-wrap',
        depth: projectCount,
        depthLabel: 'wrap',
        zIndex: 710,
        x: 0,
        y: lerp(exitPose.y, deepestPose.y, wrapT),
        z: lerp(exitPose.z, deepestPose.z, wrapT) - (options.wrapDepth * wrapArc),
        rotateX: lerp(exitPose.rotateX, deepestPose.rotateX, wrapT),
        scale: lerp(exitPose.scale, deepestPose.scale, wrapT),
        blur: Math.max(options.exitBlur, deepestPose.blur),
        saturate: lerp(0.82, deepestPose.saturate, wrapT),
        opacity: 0,
        visibility: 'hidden',
        pointerEvents: 'none',
      };
    }

    const reappearT = smoothstep(options.reappearStart, options.reappearEnd, progress);
    return {
      slot: 'rejoin',
      visualSlot: 'rejoin',
      zone: 'rear-reappear',
      depth: Math.max(1, projectCount - 1),
      depthLabel: 'rejoin',
      zIndex: Math.max(1, deepestPose.zIndex - 1),
      x: 0,
      y: deepestPose.y,
      z: deepestPose.z,
      rotateX: deepestPose.rotateX,
      scale: deepestPose.scale,
      blur: lerp(Math.max(options.exitBlur, deepestPose.blur), deepestPose.blur, reappearT),
      saturate: lerp(0.82, deepestPose.saturate, reappearT),
      opacity: deepestPose.opacity * reappearT,
      visibility: reappearT <= 0.02 ? 'hidden' : 'visible',
      pointerEvents: 'none',
    };
  }

  getDeckLoopPoseForPhase(phase, count) {
    const stackLimit = Math.max(0, count - 1);
    if (phase <= stackLimit || shouldReducePortfolioMotion()) {
      return {
        ...this.getDeckCardPose(Math.min(phase, stackLimit)),
        phase,
      };
    }
    return {
      ...this.getDeckLoopWrapPose({
        progress: count - phase,
      }),
      phase,
    };
  }

  getDeckPoseForPosition(index, position) {
    const count = this.projects.length;
    if (!count) return this.getDeckCardPose(0);
    const renderPosition = Math.abs(position - Math.round(position)) < 0.003
      ? Math.round(position)
      : position;
    const phase = this.getDeckConveyorPhase(index, renderPosition);
    return this.getDeckLoopPoseForPhase(phase, count);
  }

  applyDeckCardPose(card, pose) {
    card.dataset.deckSlot = pose.slot;
    card.dataset.deckVisualSlot = pose.visualSlot || pose.slot;
    card.dataset.deckZone = pose.zone || pose.visualSlot || pose.slot;
    card.dataset.deckDepth = pose.depthLabel || String(Math.abs(Number(pose.slot) || 0));
    card.style.zIndex = String(pose.zIndex);
    const poseOpacity = Number(pose.opacity.toFixed(4));
    card.style.setProperty('--portfolio-card-pose-opacity', String(poseOpacity));
    card.style.setProperty('--portfolio-card-x', `${(pose.x || 0).toFixed(2)}px`);
    card.style.setProperty('--portfolio-card-y', `${pose.y.toFixed(2)}px`);
    card.style.setProperty('--portfolio-card-z', `${pose.z.toFixed(2)}px`);
    card.style.setProperty('--portfolio-card-rotate-x', `${pose.rotateX.toFixed(2)}deg`);
    card.style.setProperty('--portfolio-card-scale', pose.scale.toFixed(4));
    card.style.setProperty('--portfolio-card-pose-blur', `${pose.blur.toFixed(2)}px`);
    card.style.setProperty('--portfolio-card-pose-saturate', pose.saturate.toFixed(3));
    const visualDepth = Math.max(0, Number(pose.depth) || 0);
    const revealOrder = (pose.visualSlot || pose.slot) === 'front'
      ? 5
      : Math.max(0, 5 - Math.min(5, Math.round(visualDepth)));
    card.style.setProperty('--portfolio-card-reveal-delay', `${170 + (revealOrder * 28)}ms`);
    card.style.removeProperty('opacity');
    card.style.removeProperty('transform');
    card.style.removeProperty('filter');
    card.style.visibility = pose.visibility || 'visible';
    card.style.pointerEvents = pose.pointerEvents;
  }

  updateDeckFromScroll(options = {}) {
    if (!this.cards.length) return;
    const shouldCommitActive = options.force
      || options.activeChanged
      || this.isDeckPositionSettled();
    const nextActiveIndex = shouldCommitActive
      ? this.wrapProjectIndex(Math.round(this.deckDisplayPosition))
      : this.activeProjectIndex;
    const activeChanged = nextActiveIndex !== this.activeProjectIndex;
    if (shouldCommitActive) this.activeProjectIndex = nextActiveIndex;

    this.cards.forEach((card, index) => {
      const isActive = index === this.activeProjectIndex;
      const pose = this.getDeckPoseForPosition(index, this.deckDisplayPosition);
      this.applyDeckCardPose(card, pose);
      card.classList.toggle('is-active', isActive);
      card.classList.toggle('is-depth-card', !isActive);
      card.classList.toggle('is-depth-1', pose.slot === '-1');
      card.classList.toggle('is-depth-2', pose.slot === '-2');
      card.setAttribute('tabindex', isActive && !this.isProjectOpen ? '0' : '-1');
      card.setAttribute('aria-hidden', 'false');
      card.setAttribute('aria-expanded', this.isProjectOpen && index === this.selectedProjectIndex ? 'true' : 'false');
    });
    this.mount?.style.setProperty('--portfolio-deck-active-index', String(this.activeProjectIndex));
    this.mount?.style.setProperty('--portfolio-deck-scroll-progress', String(this.deckDisplayPosition));
    if (activeChanged || options.activeChanged || options.force) {
      this.updateDeckStatus();
      this.updateVideoPlayback();
    }

    if (this.pendingDeckFocusIndex === this.activeProjectIndex) {
      this.cards[this.activeProjectIndex]?.focus({ preventScroll: true });
      this.pendingDeckFocusIndex = -1;
    }

    if (this.pendingDeckAnnounce) {
      const project = this.projects[this.activeProjectIndex];
      const label = project?.displayTitle || project?.title || `Project ${this.activeProjectIndex + 1}`;
      announceToScreenReader(`Selected project ${this.activeProjectIndex + 1} of ${this.projects.length}: ${label}`);
      this.pendingDeckAnnounce = false;
    }
  }

  getDeckDebugSnapshot() {
    const state = this.getDeckTransitionState(this.deckDisplayPosition);
    const drawer = this.projectDrawerView?.drawer || null;
    const drawerStyles = drawer ? getComputedStyle(drawer) : null;
    const deckStageStyles = this.deckStage ? getComputedStyle(this.deckStage) : null;
    const ghostRect = this.projectOpenGhost?.getBoundingClientRect?.() || null;
    return {
      targetPosition: this.deckTargetPosition,
      displayPosition: this.deckDisplayPosition,
      activeIndex: this.activeProjectIndex,
      intendedIndex: this.getDeckIntentIndex(),
      settledIndex: this.wrapProjectIndex(Math.round(this.deckDisplayPosition)),
      direction: this.deckMotionDirection,
      transitionProgress: state?.progress ?? 0,
      settled: this.isDeckPositionSettled(),
      isSettled: this.isDeckPositionSettled(),
      open: {
        phase: this.projectOpenPhase,
        isProjectOpen: this.isProjectOpen,
        selectedIndex: this.selectedProjectIndex,
        pressed: Boolean(this.pressedCardState),
        hasGhost: Boolean(this.projectOpenGhost),
        originRect: this.projectOpenDebug?.originRect || null,
        ghostRect: serializeRect(ghostRect) || this.projectOpenDebug?.ghostRect || null,
        drawerRect: serializeRect(drawer?.getBoundingClientRect?.()) || this.projectOpenDebug?.drawerRect || null,
        drawerTransform: drawerStyles?.transform || '',
        drawerOpacity: drawerStyles?.opacity || '',
        deckOpacity: deckStageStyles?.opacity || '',
        deckVisibility: deckStageStyles?.visibility || '',
      },
      cards: this.cards.map((card, index) => {
        const pose = this.getDeckPoseForPosition(index, this.deckDisplayPosition);
        const phase = this.getDeckConveyorPhase(index, this.deckDisplayPosition);
        return {
          index,
          isActive: index === this.activeProjectIndex,
          slot: pose.slot,
          visualSlot: pose.visualSlot || pose.slot,
          zone: pose.zone || pose.visualSlot || pose.slot,
          phase,
          depth: pose.depth,
          x: pose.x || 0,
          y: pose.y,
          z: pose.z,
          rotateX: pose.rotateX,
          scale: pose.scale,
          blur: pose.blur,
          opacity: pose.opacity,
          visibility: pose.visibility || 'visible',
          zIndex: pose.zIndex,
        };
      }),
    };
  }

  updateDeckSlots(options = {}) {
    this.updateDeckFromScroll({ force: true, ...options });
  }

  getDeckFollowSmoothing() {
    return clamp(
      toNumber(this.deckOptions.followSmoothing, PORTFOLIO_DECK_DEFAULTS.followSmoothing),
      0.04,
      0.5
    );
  }

  getDeckSettleStrength() {
    return clamp(
      toNumber(this.deckOptions.settleStrength, PORTFOLIO_DECK_DEFAULTS.settleStrength),
      0.03,
      0.45
    );
  }

  getDeckScrollPixelsPerProject() {
    return clamp(
      toNumber(this.deckOptions.scrollPixelsPerProject, PORTFOLIO_DECK_DEFAULTS.scrollPixelsPerProject),
      160,
      1200
    );
  }

  getDeckScrollSensitivity() {
    return clamp(
      toNumber(this.deckOptions.scrollSensitivity, PORTFOLIO_DECK_DEFAULTS.scrollSensitivity),
      0.15,
      3
    );
  }

  getDeckInputCapProjects() {
    return clamp(
      toNumber(this.deckOptions.inputCapProjects, PORTFOLIO_DECK_DEFAULTS.inputCapProjects),
      0.05,
      0.75
    );
  }

  startDeckAnimation() {
    if (this.deckAnimationFrame || !this.cards.length) return;
    this.deckLastFrameAt = 0;
    this.deckAnimationFrame = window.requestAnimationFrame((timestamp) => this.stepDeckAnimation(timestamp));
  }

  stopDeckAnimation() {
    if (!this.deckAnimationFrame) return;
    window.cancelAnimationFrame(this.deckAnimationFrame);
    this.deckAnimationFrame = 0;
    this.deckLastFrameAt = 0;
  }

  clearDeckSettleTimer() {
    if (!this.deckSettleTimer) return;
    window.clearTimeout(this.deckSettleTimer);
    this.deckSettleTimer = 0;
  }

  scheduleDeckSettle() {
    this.clearDeckSettleTimer();
    if (this.isProjectOpen || !this.projects.length || shouldReducePortfolioMotion()) return;
    const delayMs = clamp(
      toNumber(this.deckOptions.settleIdleMs, PORTFOLIO_DECK_DEFAULTS.settleIdleMs),
      60,
      520
    );
    this.deckSettleTimer = window.setTimeout(() => {
      this.deckSettleTimer = 0;
      this.deckIsSettling = true;
      this.startDeckAnimation();
    }, delayMs);
  }

  setDeckPosition(position, options = {}) {
    if (!this.projects.length) return;
    this.clearDeckSettleTimer();
    const reducedMotion = shouldReducePortfolioMotion();
    const nextPosition = Number.isFinite(position) ? position : 0;
    const previousTargetPosition = this.deckTargetPosition;
    this.deckTargetPosition = reducedMotion && !options.allowFractionalReducedMotion
      ? Math.round(nextPosition)
      : nextPosition;
    const targetDelta = this.deckTargetPosition - previousTargetPosition;
    if (Math.abs(targetDelta) > 0.0001) {
      this.deckMotionDirection = targetDelta > 0 ? 1 : -1;
    }
    this.deckIsSettling = false;
    if (options.immediate || reducedMotion) {
      this.deckDisplayPosition = this.deckTargetPosition;
      this.updateDeckSlots({ activeChanged: true, force: true });
      return;
    }
    this.startDeckAnimation();
    if (options.settle !== false) this.scheduleDeckSettle();
  }

  stepDeckAnimation(timestamp) {
    this.deckAnimationFrame = 0;
    if (!this.cards.length) return;

    const previousTimestamp = this.deckLastFrameAt || timestamp;
    const frameFactor = clamp((timestamp - previousTimestamp) / 16.67, 0.5, 2.5);
    this.deckLastFrameAt = timestamp;

    if (this.deckIsSettling) {
      const targetIndex = Math.round(this.deckTargetPosition);
      const settleAlpha = 1 - Math.pow(1 - this.getDeckSettleStrength(), frameFactor);
      this.deckTargetPosition += (targetIndex - this.deckTargetPosition) * settleAlpha;
      if (Math.abs(targetIndex - this.deckTargetPosition) < 0.0015) {
        this.deckTargetPosition = targetIndex;
        this.deckIsSettling = false;
      }
    }

    const followAlpha = shouldReducePortfolioMotion()
      ? 1
      : 1 - Math.pow(1 - this.getDeckFollowSmoothing(), frameFactor);
    const delta = this.deckTargetPosition - this.deckDisplayPosition;
    this.deckDisplayPosition += delta * followAlpha;
    const remainingDelta = this.deckTargetPosition - this.deckDisplayPosition;
    if (Math.abs(remainingDelta) < 0.0015 && !this.deckIsSettling) {
      this.deckDisplayPosition = this.deckTargetPosition;
    }

    this.updateDeckFromScroll();

    if (this.deckIsSettling || Math.abs(this.deckTargetPosition - this.deckDisplayPosition) > 0.0015) {
      this.deckAnimationFrame = window.requestAnimationFrame((nextTimestamp) => this.stepDeckAnimation(nextTimestamp));
    } else {
      this.deckLastFrameAt = 0;
      this.updateDeckFromScroll({ activeChanged: true });
    }
  }

  updateDeckStatus() {
    const project = this.projects[this.activeProjectIndex];
    const label = project?.displayTitle || project?.title || `Project ${this.activeProjectIndex + 1}`;
    const client = project?.client || project?.eyebrow || '';
    const text = client
      ? `${client}: ${label}. Project ${this.activeProjectIndex + 1} of ${this.projects.length}.`
      : `${label}. Project ${this.activeProjectIndex + 1} of ${this.projects.length}.`;
    if (this.deckStatus) this.deckStatus.textContent = text;
  }

  setActiveProject(index, options = {}) {
    if (!this.projects.length) return;
    const nextIndex = this.wrapProjectIndex(index);
    const changed = nextIndex !== this.getDeckIntentIndex();
    this.pendingDeckFocusIndex = options.focus ? nextIndex : -1;
    this.pendingDeckAnnounce = Boolean(options.announce && (changed || options.immediate));
    const nextPosition = this.getNearestContinuousPositionForIndex(nextIndex);
    this.setDeckPosition(nextPosition, {
      immediate: options.immediate,
      settle: true,
    });
    if (options.immediate || shouldReducePortfolioMotion()) {
      this.activeProjectIndex = nextIndex;
      this.updateDeckSlots({ activeChanged: changed || options.immediate, force: true });
    }
  }

  advanceActiveProject(direction, options = {}) {
    if (!direction || !this.projects.length) return;
    this.setActiveProject(this.getDeckIntentIndex() + direction, options);
  }

  handleDeckWheel(event) {
    if (this.isProjectOpen || !this.projects.length) return;
    const deltaY = Number(event.deltaY) || 0;
    const deltaX = Number(event.deltaX) || 0;
    if (Math.abs(deltaY) < Math.abs(deltaX) || Math.abs(deltaY) < 1) return;
    event.preventDefault();

    const normalizedDelta = normalizeWheelDeltaY(event);
    const pixelsPerProject = this.getDeckScrollPixelsPerProject();
    const sensitivity = this.getDeckScrollSensitivity();
    const inputCap = this.getDeckInputCapProjects();
    const projectDelta = clamp((normalizedDelta / pixelsPerProject) * sensitivity, -inputCap, inputCap);
    if (Math.abs(projectDelta) < 0.0001) return;
    this.setDeckPosition(this.deckTargetPosition + projectDelta);
  }

  handleDeckPointerDown(event) {
    if (this.isProjectOpen || event.pointerType === 'mouse' || !this.projects.length) return;
    const now = performance.now();
    this.clearDeckSettleTimer();
    this.deckIsSettling = false;
    this.pointerState = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: now,
      startTime: now,
      startTargetPosition: this.deckTargetPosition,
      dragged: false,
    };
    this.deckStage?.setPointerCapture?.(event.pointerId);
  }

  handleDeckPointerMove(event) {
    if (!this.pointerState || event.pointerId !== this.pointerState.pointerId) return;
    const now = performance.now();
    const deltaY = event.clientY - this.pointerState.startY;
    if (Math.abs(deltaY) > PORTFOLIO_CLICK_DRAG_THRESHOLD_PX) {
      this.pointerState.dragged = true;
      this.ignoreNextCardClick = true;
    }
    if (this.pointerState.dragged) {
      const targetPosition = this.pointerState.startTargetPosition
        - ((deltaY / this.getDeckScrollPixelsPerProject()) * this.getDeckScrollSensitivity());
      this.setDeckPosition(targetPosition, { settle: false });
    }
    this.pointerState.lastY = event.clientY;
    this.pointerState.lastTime = now;
  }

  finishDeckPointer(event, cancelled = false) {
    if (!this.pointerState || event.pointerId !== this.pointerState.pointerId) return;
    const pointerState = this.pointerState;
    this.pointerState = null;
    this.deckStage?.releasePointerCapture?.(event.pointerId);
    if (cancelled || !pointerState.dragged) return;

    this.scheduleDeckSettle();
  }

  handleDeckPointerUp(event) {
    this.finishDeckPointer(event, false);
  }

  handleDeckPointerCancel(event) {
    this.finishDeckPointer(event, true);
  }

  clearPressedCard() {
    window.clearTimeout(this.pressOpenTimer);
    this.pressOpenTimer = 0;
    if (!this.pressedCardState) {
      if (!this.isProjectOpen && (this.projectOpenPhase === 'pressing' || this.projectOpenPhase === 'release')) {
        this.projectOpenPhase = 'closed';
      }
      return;
    }
    const { index, pointerId } = this.pressedCardState;
    const card = this.cards[index];
    if (card) {
      card.classList.remove('is-pressing', 'is-opening-release');
      if (Number.isFinite(pointerId)) {
        try {
          if (card.hasPointerCapture?.(pointerId)) card.releasePointerCapture(pointerId);
        } catch (error) {
          /* ignore */
        }
      }
    }
    this.pressedCardState = null;
    if (!this.isProjectOpen && (this.projectOpenPhase === 'pressing' || this.projectOpenPhase === 'release')) {
      this.projectOpenPhase = 'closed';
    }
  }

  clearProjectOpenGhost() {
    this.projectOpenGhostToken += 1;
    if (this.projectOpenGhostAnimation) {
      try {
        this.projectOpenGhostAnimation.cancel();
      } catch (error) {
        /* ignore */
      }
    }
    this.projectOpenGhostAnimation = null;
    this.projectOpenGhost?.remove();
    this.projectOpenGhost = null;
    this.projectOpenDebug = null;
  }

  canPressCard(index, event) {
    if (this.isProjectOpen || !event?.isPrimary) return false;
    if (event.pointerType === 'mouse' && event.button !== 0) return false;
    if (event.pointerType === 'touch') return false;
    const card = this.cards[index];
    return card?.dataset?.deckVisualSlot === 'front'
      && index === this.getDeckIntentIndex()
      && this.isDeckPositionSettled();
  }

  handleCardPointerDown(event, index) {
    if (!this.canPressCard(index, event)) return;
    const card = this.cards[index];
    if (!card) return;
    this.clearPressedCard();
    this.pressedCardState = {
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      cancelled: false,
    };
    this.projectOpenPhase = 'pressing';
    card.classList.remove('is-opening-release');
    card.classList.add('is-pressing');
    try {
      card.setPointerCapture?.(event.pointerId);
    } catch (error) {
      /* ignore */
    }
  }

  handleCardPointerMove(event, index) {
    if (!this.pressedCardState || this.pressedCardState.index !== index) return;
    if (this.pressedCardState.pointerId !== event.pointerId) return;
    const dx = event.clientX - this.pressedCardState.startX;
    const dy = event.clientY - this.pressedCardState.startY;
    if (Math.hypot(dx, dy) <= PORTFOLIO_CLICK_DRAG_THRESHOLD_PX) return;
    this.pressedCardState.cancelled = true;
    this.clearPressedCard();
  }

  handleCardPointerUp(event, index) {
    if (!this.pressedCardState || this.pressedCardState.index !== index) return;
    if (this.pressedCardState.pointerId !== event.pointerId) return;
    const card = this.cards[index];
    const wasCancelled = this.pressedCardState.cancelled;
    const originRect = card?.getBoundingClientRect() || null;
    this.pressedCardState = null;
    if (card?.hasPointerCapture?.(event.pointerId)) {
      try {
        card.releasePointerCapture(event.pointerId);
      } catch (error) {
        /* ignore */
      }
    }
    card?.classList.remove('is-pressing');
    if (wasCancelled || !this.canPressCard(index, event)) {
      card?.classList.remove('is-opening-release');
      return;
    }

    event.preventDefault();
    this.suppressNextCardClick = true;
    this.projectOpenPhase = 'release';
    card?.classList.add('is-opening-release');
    window.clearTimeout(this.pressOpenTimer);
    const openDelay = shouldReducePortfolioMotion() ? 0 : PORTFOLIO_CARD_RELEASE_OPEN_DELAY_MS;
    this.pressOpenTimer = window.setTimeout(() => {
      this.pressOpenTimer = 0;
      card?.classList.remove('is-opening-release');
      this.openProjectByIndex(index, { originRect, inputType: 'pointer' });
    }, openDelay);
  }

  handleCardPointerCancel(event, index) {
    if (!this.pressedCardState || this.pressedCardState.index !== index) return;
    if (this.pressedCardState.pointerId !== event.pointerId) return;
    this.clearPressedCard();
  }

  handleCardLostPointerCapture(event, index) {
    if (!this.pressedCardState || this.pressedCardState.index !== index) return;
    if (this.pressedCardState.pointerId !== event.pointerId) return;
    if (this.pressOpenTimer) return;
    this.clearPressedCard();
  }

  handleCardClick(event, index) {
    if (this.suppressNextCardClick) {
      this.suppressNextCardClick = false;
      event.preventDefault();
      return;
    }
    if (this.ignoreNextCardClick) {
      this.ignoreNextCardClick = false;
      event.preventDefault();
      return;
    }
    const intentIndex = this.getDeckIntentIndex();
    const isFrontCard = this.cards[index]?.dataset?.deckVisualSlot === 'front';
    if (!isFrontCard || index !== intentIndex || !this.isDeckPositionSettled()) {
      event.preventDefault();
      this.setActiveProject(index, { focus: true, announce: true });
      return;
    }
    event.preventDefault();
    if (event.detail > 0) return;
    const originRect = this.cards[index]?.getBoundingClientRect() || null;
    this.openProjectByIndex(index, { originRect, inputType: 'synthetic-click' });
  }

  handleCardKeydown(event, index) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const intentIndex = this.getDeckIntentIndex();
      if (index !== intentIndex || !this.isDeckPositionSettled()) {
        this.setActiveProject(index, { focus: true, announce: true });
        return;
      }
      this.openProjectByIndex(index, { inputType: 'keyboard', useGhost: false });
      return;
    }

    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
    this.advanceActiveProject(direction, { focus: true, announce: true });
  }

  clearProjectOpenTimeouts() {
    while (this.projectOpenTimeouts.length) {
      window.clearTimeout(this.projectOpenTimeouts.pop());
    }
  }

  pauseAllVideos() {
    this.mediaVideos.forEach((video) => {
      try {
        video.pause();
      } catch (_) {
        /* ignore */
      }
    });
  }

  updateVideoPlayback() {
    if (shouldReducePortfolioMotion() || this.isProjectOpen) {
      this.pauseAllVideos();
      return;
    }
    this.mediaVideos.forEach((video) => {
      const index = Number(video.dataset.projectIndex);
      const isActive = Number.isInteger(index) && index === this.activeProjectIndex;
      if (!isActive) {
        video.pause();
        return;
      }
      video.play().catch(() => {});
    });
  }

  resumeVisibleVideos() {
    this.updateVideoPlayback();
  }

  prefetchProjectAssets(project) {
    if (!project) return;
    [getProjectImageSrc(project), ...getProjectContentBlocks(project).map((block) => block.src)].forEach((src) => {
      if (!src || /\.(mp4|webm)$/i.test(src)) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = resolveAsset(src);
    });
  }

  syncProjectHero(project, animate = true, originRect = null, options = {}) {
    if (!project || !this.projectDrawerView) return;
    const openDuration = shouldReducePortfolioMotion()
      ? clamp(toNumber(this.config.runtime.behavior?.reducedMotionDurationMs, 320), 120, 700)
      : clamp(toNumber(this.config.runtime.motion?.openDurationMs, 420), 200, 1200);
    const imageFadeMs = clamp(toNumber(this.config.runtime.motion?.imageFadeMs, 220), 0, 600);
    const titleDelay = clamp(toNumber(this.config.runtime.motion?.titleRevealDelayMs, 280), 0, 1200);

    this.projectDrawerView.syncProject(project, {
      animate,
      openDurationMs: openDuration,
      imageFadeMs,
      titleDelayMs: titleDelay,
      accentColor: getProjectCardTheme(project, this.selectedProjectIndex, this.projects.length).accent,
      motionConfig: this.config.runtime.motion || {},
      originRect,
      deferReveal: Boolean(options.deferReveal),
    });
    this.syncProjectButtonStates();
  }

  getProjectOpenTimings() {
    return {
      openDuration: shouldReducePortfolioMotion()
        ? clamp(toNumber(this.config.runtime.behavior?.reducedMotionDurationMs, 320), 120, 700)
        : clamp(toNumber(this.config.runtime.motion?.openDurationMs, 420), 200, 1200),
      imageFadeMs: clamp(toNumber(this.config.runtime.motion?.imageFadeMs, 220), 0, 600),
      titleDelayMs: clamp(toNumber(this.config.runtime.motion?.titleRevealDelayMs, 280), 0, 1200),
      ghostDurationMs: clamp(
        toNumber(this.config.runtime.motion?.openGhostDurationMs, PORTFOLIO_OPEN_GHOST_DURATION_MS),
        180,
        700,
      ),
    };
  }

  startProjectOpenGhost(projectIndex, originRect, durationMs, onComplete) {
    const card = this.cards[projectIndex];
    const targetRect = this.projectDrawerView?.getDrawerRect?.();
    if (!card || !originRect || !targetRect) {
      onComplete?.();
      return false;
    }

    this.clearProjectOpenGhost();
    const token = this.projectOpenGhostToken + 1;
    this.projectOpenGhostToken = token;
    const ghost = card.cloneNode(true);
    ghost.classList.add('portfolio-project-open-ghost');
    ghost.classList.remove('is-pressing', 'is-opening-release', 'is-keyboard-focused', 'is-selected');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.removeAttribute('role');
    ghost.removeAttribute('tabindex');
    ghost.removeAttribute('aria-controls');
    ghost.removeAttribute('aria-expanded');
    ghost.inert = true;

    ghost.querySelectorAll('video').forEach((video) => {
      try {
        video.pause();
      } catch (error) {
        /* ignore */
      }
      video.removeAttribute('autoplay');
      video.controls = false;
    });

    const cardStyle = getComputedStyle(card);
    const drawerStyle = this.projectDrawerView?.drawer
      ? getComputedStyle(this.projectDrawerView.drawer)
      : cardStyle;
    [
      '--portfolio-card-media-width',
      '--portfolio-card-pad',
      '--portfolio-card-copy-pad-x',
      '--portfolio-card-copy-pad-y',
      '--portfolio-card-media-radius',
      '--portfolio-card-contact-shadow',
      '--portfolio-card-contact-shadow-hover',
      '--portfolio-card-surface',
      '--portfolio-card-base',
      '--portfolio-card-accent',
      '--portfolio-card-ink',
      '--portfolio-card-muted',
    ].forEach((name) => {
      const value = cardStyle.getPropertyValue(name);
      if (value) ghost.style.setProperty(name, value.trim());
    });
    Object.assign(ghost.style, {
      left: `${originRect.left}px`,
      top: `${originRect.top}px`,
      width: `${originRect.width}px`,
      height: `${originRect.height}px`,
      borderRadius: cardStyle.borderRadius,
    });

    const host = document.getElementById('portfolio-sheet-host') || this.projectView?.parentElement || document.body;
    host.appendChild(ghost);
    this.projectOpenGhost = ghost;
    this.projectOpenPhase = 'ghost';
    this.projectOpenDebug = {
      phase: 'ghost',
      originRect: serializeRect(originRect),
      drawerRect: serializeRect(targetRect),
      ghostRect: serializeRect(ghost.getBoundingClientRect()),
      inputOwnsOpen: true,
    };

    const keyframes = [
      {
        left: `${originRect.left}px`,
        top: `${originRect.top}px`,
        width: `${originRect.width}px`,
        height: `${originRect.height}px`,
        borderRadius: cardStyle.borderRadius,
        opacity: 1,
        filter: 'blur(0px) saturate(1)',
        offset: 0,
      },
      {
        left: `${targetRect.left}px`,
        top: `${targetRect.top}px`,
        width: `${targetRect.width}px`,
        height: `${targetRect.height}px`,
        borderRadius: drawerStyle.borderRadius || '0px',
        opacity: 1,
        filter: 'blur(0.6px) saturate(0.98)',
        offset: 0.78,
      },
      {
        left: `${targetRect.left}px`,
        top: `${targetRect.top}px`,
        width: `${targetRect.width}px`,
        height: `${targetRect.height}px`,
        borderRadius: drawerStyle.borderRadius || '0px',
        opacity: 0,
        filter: 'blur(5px) saturate(0.92)',
        offset: 1,
      },
    ];

    if (!ghost.animate) {
      Object.assign(ghost.style, {
        left: `${targetRect.left}px`,
        top: `${targetRect.top}px`,
        width: `${targetRect.width}px`,
        height: `${targetRect.height}px`,
        borderRadius: drawerStyle.borderRadius || '0px',
        opacity: '0',
        filter: 'blur(5px) saturate(0.92)',
      });
      window.setTimeout(() => {
        if (this.projectOpenGhostToken !== token) return;
        this.clearProjectOpenGhost();
        onComplete?.();
      }, durationMs);
      return true;
    }

    const animation = ghost.animate(keyframes, {
      duration: durationMs,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'forwards',
    });
    this.projectOpenGhostAnimation = animation;
    animation.finished
      .then(() => {
        if (this.projectOpenGhostToken !== token) return;
        this.projectOpenDebug = {
          ...(this.projectOpenDebug || {}),
          phase: 'ghost-complete',
          ghostRect: serializeRect(ghost.getBoundingClientRect()),
        };
        this.clearProjectOpenGhost();
        onComplete?.();
      })
      .catch(() => {});
    return true;
  }

  revealPreparedProject({ animate = true, titleDelayMs = 280 } = {}) {
    if (!this.isProjectOpen || !this.projectDrawerView) return;
    this.projectOpenPhase = 'drawer-reveal';
    this.projectOpenDebug = {
      ...(this.projectOpenDebug || {}),
      phase: 'drawer-reveal',
      drawerRect: serializeRect(this.projectDrawerView.getDrawerRect?.()),
    };
    this.projectDrawerView.reveal({ animate, titleDelayMs });
    const revealSettledDelay = shouldReducePortfolioMotion()
      ? 0
      : clamp(toNumber(this.config.runtime.motion?.openDurationMs, 420), 200, 1200);
    this.projectOpenTimeouts.push(window.setTimeout(() => {
      if (!this.isProjectOpen) return;
      this.projectOpenPhase = 'open';
      this.projectOpenDebug = {
        ...(this.projectOpenDebug || {}),
        phase: 'open',
        drawerRect: serializeRect(this.projectDrawerView?.getDrawerRect?.()),
      };
    }, revealSettledDelay));
  }

  openProjectByIndex(index, options = {}) {
    if (this.isProjectOpen) return;
    const projectIndex = clamp(index, 0, this.projects.length - 1);
    const project = this.projects[projectIndex];
    if (!project) return;
    const originRect = options?.originRect || this.cards[projectIndex]?.getBoundingClientRect() || null;
    const timings = this.getProjectOpenTimings();
    const useGhost = options?.useGhost !== false
      && options?.inputType !== 'keyboard'
      && !shouldReducePortfolioMotion()
      && Boolean(originRect && originRect.width > 0 && originRect.height > 0);
    this.clearPressedCard();
    const labelContent = resolvePortfolioLabelContent(project, project?.title || `Project ${projectIndex + 1}`);
    const spokenLabel = labelContent.eyebrow
      ? `${labelContent.eyebrow}: ${labelContent.title}`
      : labelContent.title;

    this.clearDeckSettleTimer();
    this.stopDeckAnimation();
    this.deckIsSettling = false;
    this.deckTargetPosition = this.deckDisplayPosition;
    this.pendingDeckFocusIndex = -1;
    this.pendingDeckAnnounce = false;
    SoundEngine.playHoverSound?.();
    this.prefetchProjectAssets(project);
    this.pauseAllVideos();
    this.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.selectedProjectIndex = projectIndex;
    this.isProjectOpen = true;
    getGlobals().__portfolioDrawerOpen = true;
    this.disableBackgroundInteractivity();
    this.syncProjectHero(project, true, originRect, { deferReveal: useGhost });
    this.cards[projectIndex]?.classList.add('is-selected');
    this.updateDeckSlots();
    announceToScreenReader(`Opened project: ${spokenLabel}`);
    document.addEventListener('keydown', this.boundProjectKeydown, true);

    if (useGhost && this.startProjectOpenGhost(projectIndex, originRect, timings.ghostDurationMs, () => {
      this.revealPreparedProject({ animate: true, titleDelayMs: timings.titleDelayMs });
    })) {
      this.projectOpenTimeouts.push(window.setTimeout(() => {
        this.projectClose?.focus();
      }, Math.min(1100, timings.ghostDurationMs + timings.openDuration + 80)));
      return;
    }

    this.revealPreparedProject({ animate: true, titleDelayMs: timings.titleDelayMs });
    this.projectOpenTimeouts.push(window.setTimeout(() => {
      this.projectClose?.focus();
    }, Math.min(900, timings.openDuration + 80)));
  }

  finishProjectClose() {
    const restoredIndex = this.selectedProjectIndex;
    this.clearProjectOpenGhost();
    this.cards.forEach((card) => card.classList.remove('is-selected'));
    this.isProjectOpen = false;
    this.selectedProjectIndex = -1;
    this.projectOpenPhase = 'closed';
    this.projectOpenDebug = null;
    getGlobals().__portfolioDrawerOpen = false;
    this.restoreBackgroundInteractivity();
    if (restoredIndex >= 0) this.setActiveProject(restoredIndex, { focus: false, announce: false, immediate: true });
    this.syncProjectButtonStates();
    this.resumeVisibleVideos();
    announceToScreenReader('Closed project view');
    if (this.lastFocusedElement?.focus) {
      this.lastFocusedElement.focus();
    } else if (restoredIndex >= 0) {
      this.cards[restoredIndex]?.focus();
    }
  }

  closeProject() {
    if (!this.isProjectOpen) return;
    this.clearProjectOpenGhost();
    if (!this.projectView) {
      this.finishProjectClose();
      return;
    }
    if (this.projectView.classList.contains('is-closing')) return;
    this.clearProjectOpenTimeouts();
    this.projectOpenPhase = 'closing';
    this.projectView.classList.remove('is-title-visible');
    document.removeEventListener('keydown', this.boundProjectKeydown, true);

    const openDuration = clamp(toNumber(this.config.runtime.motion?.openDurationMs, 420), 200, 1200);
    this.projectDrawerView?.beginClose({
      reducedMotion: shouldReducePortfolioMotion(),
      durationMs: openDuration,
      onComplete: () => this.finishProjectClose(),
    });
  }

  syncProjectButtonStates() {
    this.cards.forEach((card, index) => {
      const expanded = this.isProjectOpen && index === this.selectedProjectIndex;
      card.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
    this.updateDeckSlots();
  }

  disableBackgroundInteractivity() {
    document.body.classList.add('portfolio-project-open');
    setPortfolioSheetHostHidden(false);
    refreshCursor();
    if (this.appFrame) {
      this.appFrame.setAttribute('aria-hidden', 'true');
      this.appFrame.inert = true;
    }
  }

  restoreBackgroundInteractivity() {
    document.body.classList.remove('portfolio-project-open');
    setPortfolioSheetHostHidden(true);
    refreshCursor();
    if (this.appFrame) {
      this.appFrame.removeAttribute('aria-hidden');
      this.appFrame.inert = false;
    }
  }

  getProjectFocusableElements() {
    return this.projectDrawerView?.getFocusableElements() || [];
  }

  handleProjectKeydown(event) {
    if (!this.isProjectOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeProject();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusables = this.getProjectFocusableElements();
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !this.projectView.contains(active))) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && (active === last || !this.projectView.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }
}

/**
 * Wait until `#simulations` has a real layout box (gate transitions / SPA can report 0×0
 * for several frames). Without this, `resize()` no-ops and the pit seeds against a default buffer.
 */
async function waitForPitSimulationHostReady(options = {}) {
  const minPx = Math.max(24, Number(options.minEdgePx) || 48);
  const timeoutMs = Math.max(250, Number(options.timeoutMs) || 8000);

  const measure = () => {
    const host = document.getElementById('simulations');
    const w = host?.clientWidth ?? 0;
    const h = host?.clientHeight ?? 0;
    return Boolean(host && w >= minPx && h >= minPx);
  };

  if (measure()) return true;

  return new Promise((resolve) => {
    let done = false;
    let ro = null;
    let iv = 0;
    const finish = (ok) => {
      if (done) return;
      done = true;
      try {
        ro?.disconnect();
      } catch (_) {
        /* ignore */
      }
      clearInterval(iv);
      clearTimeout(tid);
      resolve(ok);
    };

    const host = document.getElementById('simulations');
    if (host && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (measure()) finish(true);
      });
      ro.observe(host);
    }

    iv = window.setInterval(() => {
      if (measure()) finish(true);
    }, 24);

    const tid = window.setTimeout(() => finish(measure()), timeoutMs);
  });
}

function isCanvasBackingStoreReady(canvas) {
  if (!canvas) return false;
  const cssW = canvas.clientWidth || 0;
  const cssH = canvas.clientHeight || 0;
  if (cssW < 64 || cssH < 64) return false;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const minW = Math.ceil((cssW + 2) * dpr) - 2;
  const minH = Math.ceil((cssH + 2) * dpr) - 2;
  return canvas.width >= minW && canvas.height >= minH;
}

function rectIsUsable(rect) {
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

function rectHasUsableVisibleArea(rect, outerRect) {
  if (!rectIsUsable(rect) || !rectIsUsable(outerRect)) return false;
  const visibleWidth = Math.max(0, Math.min(rect.right, outerRect.right) - Math.max(rect.left, outerRect.left));
  const visibleHeight = Math.max(0, Math.min(rect.bottom, outerRect.bottom) - Math.max(rect.top, outerRect.top));
  return (
    visibleWidth >= Math.min(240, outerRect.width * 0.5)
    && visibleHeight >= Math.min(96, rect.height * 0.5)
  );
}

function rectsMatchWithinThreshold(previous, next, thresholdPx = 2) {
  if (!rectIsUsable(previous) || !rectIsUsable(next)) return false;
  return (
    Math.abs(previous.top - next.top) <= thresholdPx
    && Math.abs(previous.left - next.left) <= thresholdPx
    && Math.abs(previous.width - next.width) <= thresholdPx
    && Math.abs(previous.height - next.height) <= thresholdPx
  );
}

function readPortfolioPresentationSnapshot() {
  const wall = document.getElementById('simulations');
  const hero = document.getElementById('hero-title');
  const topbar = document.querySelector('.ui-top-main.route-topbar');
  const labelMount = document.getElementById('portfolioProjectMount');
  const firstLabel = labelMount?.querySelector('.portfolio-deck-card.is-active, .portfolio-project-label');
  const canvas = document.getElementById('c');

  const wallRect = wall?.getBoundingClientRect() || null;
  const heroRect = hero?.getBoundingClientRect() || null;
  const topbarRect = topbar?.getBoundingClientRect() || null;
  const firstLabelRect = firstLabel?.getBoundingClientRect() || null;
  const labelCount = labelMount?.querySelectorAll('.portfolio-deck-card, .portfolio-project-label').length || 0;
  const heroInsideWall = rectIsUsable(heroRect) && rectIsUsable(wallRect)
    && heroRect.left >= wallRect.left - 4
    && heroRect.right <= wallRect.right + 4
    && heroRect.top >= wallRect.top - 4
    && heroRect.bottom <= wallRect.bottom + 4;
  const heroReady = !hero || !rectIsUsable(heroRect) || heroInsideWall;
  const firstLabelReady = rectIsUsable(firstLabelRect)
    && rectIsUsable(wallRect)
    && firstLabelRect.width >= Math.min(240, wallRect.width * 0.5)
    && firstLabelRect.height >= 96
    && firstLabelRect.left >= wallRect.left - 8
    && firstLabelRect.right <= wallRect.right + 8
    && rectHasUsableVisibleArea(firstLabelRect, wallRect);

  return {
    wallRect,
    heroRect,
    topbarRect,
    firstLabelRect,
    canvasReady: isCanvasBackingStoreReady(canvas),
    labelCount,
    ready: Boolean(
      rectIsUsable(wallRect)
      && rectIsUsable(topbarRect)
      && isCanvasBackingStoreReady(canvas)
      && heroReady
      && labelCount > 0
      && firstLabelReady
    ),
  };
}

async function waitForStablePortfolioPresentation(options = {}) {
  const timeoutMs = Math.max(400, Number(options.timeoutMs) || 2000);
  const thresholdPx = Math.max(0.5, Number(options.thresholdPx) || 1.5);

  return new Promise((resolve) => {
    const startedAt = performance.now();
    let previous = null;
    let stablePasses = 0;

    const tick = () => {
      const snapshot = readPortfolioPresentationSnapshot();
      if (snapshot.ready && previous) {
        const stable = (
          rectsMatchWithinThreshold(previous.wallRect, snapshot.wallRect, thresholdPx)
          && (!previous.heroRect || !snapshot.heroRect || rectsMatchWithinThreshold(previous.heroRect, snapshot.heroRect, thresholdPx))
          && rectsMatchWithinThreshold(previous.firstLabelRect, snapshot.firstLabelRect, thresholdPx)
          && rectsMatchWithinThreshold(previous.topbarRect, snapshot.topbarRect, thresholdPx)
        );
        stablePasses = stable ? stablePasses + 1 : 0;
      } else if (!snapshot.ready) {
        stablePasses = 0;
      }

      if (snapshot.ready && stablePasses >= 1) {
        resolve(true);
        return;
      }

      if ((performance.now() - startedAt) >= timeoutMs) {
        resolve(snapshot.ready);
        return;
      }

      previous = snapshot;
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
}

function signalRouteReady(routeId) {
  if (typeof window === 'undefined' || !routeId) return;
  requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent('abs:route-ready', { detail: { routeId } }));
  });
}

export async function bootstrapPortfolio() {
  destroyQuoteDisplay();
  const shellRouteTransitionActive = isRouteTransitionPhase(getTransitionPhase());
  const bootstrapRunId = activePortfolioBootstrapRunId + 1;
  activePortfolioBootstrapRunId = bootstrapRunId;
  const isCurrentBootstrapRun = () => bootstrapRunId === activePortfolioBootstrapRunId;
  const root = document.documentElement;
  root.classList.add('portfolio-booting');
  root.classList.remove('portfolio-loaded');
  document.body.dataset.portfolioLoadState = 'booting';

  try {
    await loadRuntimeText();
    applyRuntimeTextToDOM();
  } catch (error) {
    console.warn('Portfolio text load failed', error);
  }

  await loadShellConfig();
  syncShellToDocument({
    isDark: document.documentElement.classList.contains('dark-mode')
  });

  const runtimeConfig = await loadRuntimeConfig();
  applyWallFrameFromConfig(runtimeConfig);
  const globals = getGlobals();
  globals.performanceHudEnabled = false;
  globals.portfolioPerformancePriority = true;
  syncShellToDocument({
    isDark: document.documentElement.classList.contains('dark-mode')
  });
  applyWallFrameLayout();

  setupRenderer();
  setCanvas(getCanvas(), getContext(), document.getElementById('simulations'));
  resize();
  setForceRenderCallback(render);

  await waitForPageReadyBarrier({
    waitForFonts: async () => {
      try {
        await waitForFonts();
        return true;
      } catch (error) {
        return false;
      }
    },
    minimumMs: 120
  });
  // Keep the wall frame visible while preparing the DOM deck. The deck mount
  // stays transparent until its first measured pose is stable, avoiding a
  // blank-page flash without exposing unpositioned cards.
  const pitCanvas = document.getElementById('c');
  const pitMount = document.getElementById('portfolioProjectMount');
  let deckRevealTimer = 0;
  let hardRevealTimer = 0;
  let portfolioLayersRevealed = false;
  const hideLegacyPortfolioCanvas = () => {
    if (!pitCanvas) return;
    pitCanvas.style.opacity = '0';
    pitCanvas.style.visibility = 'hidden';
    pitCanvas.style.pointerEvents = 'none';
  };
  const preparePortfolioLayers = () => {
    document.body.classList.remove('portfolio-deck-failed');
    root.classList.add('portfolio-booting');
    root.classList.remove('portfolio-loaded');
    document.body.dataset.portfolioLoadState = 'booting';
    hideLegacyPortfolioCanvas();
    if (pitMount) {
      pitMount.classList.add('is-portfolio-boot-preparing');
      pitMount.classList.remove('is-portfolio-deck-visible', 'is-portfolio-deck-revealing');
      pitMount.style.opacity = '1';
    }
  };
  const revealPortfolioLayers = () => {
    if (!isCurrentBootstrapRun()) return;
    if (portfolioLayersRevealed) return;
    portfolioLayersRevealed = true;
    window.clearTimeout(hardRevealTimer);
    root.classList.remove('portfolio-booting');
    root.classList.add('portfolio-loaded');
    document.body.dataset.portfolioLoadState = 'loaded';
    hideLegacyPortfolioCanvas();
    if (pitMount) {
      pitMount.classList.remove('is-portfolio-boot-preparing');
      pitMount.classList.add('is-portfolio-deck-visible', 'is-portfolio-deck-revealing');
      pitMount.style.opacity = '1';
      window.clearTimeout(deckRevealTimer);
      deckRevealTimer = window.setTimeout(() => {
        pitMount.classList.remove('is-portfolio-deck-revealing');
      }, 900);
    }
  };
  const scheduleHardReveal = (timeoutMs = 1200) => {
    window.clearTimeout(hardRevealTimer);
    const startedAt = performance.now();
    const tick = () => {
      if (!isCurrentBootstrapRun()) return;
      if (portfolioLayersRevealed) return;
      const hasDeckCards = Boolean(pitMount?.querySelector('.portfolio-project-card'));
      const timedOut = (performance.now() - startedAt) >= timeoutMs;
      if (hasDeckCards || timedOut) {
        revealPortfolioLayers();
        return;
      }
      hardRevealTimer = window.setTimeout(tick, 80);
    };
    hardRevealTimer = window.setTimeout(tick, 180);
  };
  preparePortfolioLayers();
  scheduleHardReveal(shellRouteTransitionActive ? 2400 : 2200);
  // Deck mount stays invisible; revealed after the first stable presentation.
  const hostLaidOut = await waitForPitSimulationHostReady();
  try {
    if (!hostLaidOut && import.meta.env?.DEV) {
      console.warn(
        '[portfolio] #simulations did not reach stable size in time; relying on follow-up resize.'
      );
    }
  } catch (_) {
    /* ignore */
  }
  // Gate / SPA transitions can leave #simulations at 0×0 for the first resize(); sizing
  // must be correct before seeding balls or labels stay wrong until a full reload.
  detectOptimalDPR();
  resize();

  SoundEngine.initSoundEngine();
  SoundEngine.applySoundConfigFromRuntimeConfig(runtimeConfig);
  createSoundToggle();
  initNoiseSystem({
    ...globals,
    noiseMotion: 'static',
    noiseFlicker: 0,
    noiseBlurPx: 0,
  });

  const globalsForPointer = getGlobals();
  globalsForPointer.mouseInCanvas = false;
  if (typeof window !== 'undefined') window.mouseInCanvas = false;
  setupPointer();
  setupOverscrollLock();
  setupCustomCursor();

  initSharedChrome({
    contactModal: true,
    cvModal: true,
    portfolioModal: false,
    cursorHiding: true,
    modalOverlayConfig: runtimeConfig || {}
  });

  const paletteOverride = getPaletteTemplateOverrideFromUrl();
  if (paletteOverride) {
    getGlobals().currentTemplate = paletteOverride;
  } else {
    getGlobals().currentTemplate = getWeatherDrivenPaletteTemplate() || rotatePaletteChapterOnReload();
  }
  initializeDarkMode();
  maybeAutoPickCursorColor('startup');
  initTimeDisplay();
  upgradeSocialIcons();

  const portfolioConfig = applyPortfolioConfig(await loadPortfolioConfig());
  const data = await fetchPortfolioData();
  const projects = Array.isArray(data?.projects) ? data.projects : [];

  const app = new PortfolioScrollApp({
    config: portfolioConfig,
    projects
  });
  try {
    await app.init();
  } catch (error) {
    console.error('Portfolio deck initialization failed', error);
    document.body.classList.add('portfolio-deck-failed');
    root.classList.remove('portfolio-booting');
    document.body.dataset.portfolioLoadState = 'loaded';
    revealPortfolioLayers();
    if (!shellRouteTransitionActive) {
      await completeDirectBoot({
        selectors: ['#abs-scene', '#app-frame'],
        detail: 'portfolio-deck-failed',
      });
    }
    if (shellRouteTransitionActive) {
      signalRouteReady('portfolio');
    }
    return () => {
      window.clearTimeout(deckRevealTimer);
      window.clearTimeout(hardRevealTimer);
      if (isCurrentBootstrapRun()) {
        root.classList.remove('portfolio-booting', 'portfolio-loaded');
        delete document.body.dataset.portfolioLoadState;
      }
      if (pitMount && isCurrentBootstrapRun()) {
        pitMount.classList.remove(
          'is-portfolio-boot-preparing',
          'is-portfolio-deck-visible',
          'is-portfolio-deck-revealing'
        );
      }
      try {
        disposeRendererListeners();
      } catch (e) {
        /* ignore */
      }
    };
  }
  installPortfolioAuditBridge(app);
  updateCursorSize();
  scheduleHardReveal(shellRouteTransitionActive ? 900 : 520);

  const settlePortfolioPresentation = () => {
    try {
      detectOptimalDPR();
      resize();
      app.syncProjectLabels();
      render();
    } catch (e) {
      /* ignore */
    }
  };
  settlePortfolioPresentation();

  // Wait one frame so the first JS-computed card poses land, then reveal with
  // CSS-level choreography. The stricter presentation check runs after the
  // reveal because it requires visible deck geometry.
  await new Promise((resolve) => requestAnimationFrame(resolve));
  settlePortfolioPresentation();
  revealPortfolioLayers();
  const presentationSettled = await waitForStablePortfolioPresentation({
    timeoutMs: shellRouteTransitionActive ? 700 : 520,
  });
  if (!presentationSettled && import.meta.env?.DEV) {
    console.warn('[portfolio] Presentation did not fully settle after reveal; using latest measured layout.');
  }

  if (!shellRouteTransitionActive) {
    await waitForFrames(2);
    await completeDirectBoot({
      selectors: ['#abs-scene', '#app-frame'],
      detail: presentationSettled ? 'portfolio-ready' : 'portfolio-ready-timeout',
    });
  }

  // During shell route-in, route-ready is emitted after the deck is visible and
  // at least one post-reveal stability pass has had a chance to complete.
  if (shellRouteTransitionActive) {
    signalRouteReady('portfolio');
  }

  const ABS_DEV = import.meta.env.DEV;
  if (ABS_DEV) {
    try {
      const { registerDevPanelRoute } = await import('../ui/panel-popup-manager.js');
      const { generatePanelSectionsHTML } = await import('./panel/control-registry.js');
      const { setupControls } = await import('./panel/controls.js');
      const { setupBuildControls } = await import('./panel/build-controls.js');
      const panelRequested = (() => {
        try {
          const params = new URLSearchParams(window.location.search);
          return params.get('panel') === '1' || params.get('configPanel') === '1';
        } catch (error) {
          return false;
        }
      })();

      const panelOptions = {
        page: 'portfolio',
        pageLabel: 'Portfolio',
        productLabel: 'Alexander Beck Studio',
        portfolioPanelConfig: portfolioConfig,
        pageHTML: generatePanelSectionsHTML(portfolioConfig),
        includePageSaveButton: true,
        pageSaveButtonId: 'savePortfolioConfigBtn',
        panelTitle: 'Settings',
        modeLabel: 'DEV MODE',
        setupPageControls: (_panel, panelOptions = {}) => {
          setupControls(portfolioConfig, {
            onMetricsChange: () => app.refreshPitBodies(),
            onRuntimeChange: (runtime) => app.applyRuntimeConfig(runtime),
            uiDocument: panelOptions.uiDocument,
          });
          setupBuildControls(portfolioConfig, panelOptions);
        },
      };
      registerDevPanelRoute(panelOptions);
      if (panelRequested) {
        const { createPanelDock } = await import('../ui/panel-dock.js');
        window.__PANEL_INITIALLY_VISIBLE__ = true;
        createPanelDock({
          ...panelOptions,
          preserveLauncherButton: false,
          skipToggleButton: false,
        });
      }
    } catch (error) {
      console.warn('Portfolio panel init failed', error);
    }
  }

  document.querySelectorAll('[data-nav-transition]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigateWithTransition(link.href, NAV_STATES.INTERNAL);
    });
  });

  const handlePageShow = (event) => {
    if (event.persisted) {
      resetTransitionState();
      const appFrame = document.getElementById('app-frame');
      if (appFrame) appFrame.style.opacity = '1';
    }
  };
  window.addEventListener('pageshow', handlePageShow);

  const backLink = document.querySelector('[data-nav-transition][href*="index"]');
  if (backLink) {
    setupPrefetchOnHover(backLink, 'index.html');
  }

  return () => {
    window.clearTimeout(deckRevealTimer);
    window.clearTimeout(hardRevealTimer);
    if (isCurrentBootstrapRun()) {
      root.classList.remove('portfolio-booting', 'portfolio-loaded');
      delete document.body.dataset.portfolioLoadState;
    }
    if (pitMount && isCurrentBootstrapRun()) {
      pitMount.classList.remove(
        'is-portfolio-boot-preparing',
        'is-portfolio-deck-visible',
        'is-portfolio-deck-revealing'
      );
    }
    try {
      disposeRendererListeners();
    } catch (e) {
      /* ignore */
    }
    window.removeEventListener('pageshow', handlePageShow);
    app.destroy();
  };
}
