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
import { forceBootVisible, waitForPageReadyBarrier } from '../visual/page-orchestrator.js';
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
import { getTransitionPhase, isRouteTransitionPhase } from '../../../lib/transition-phase.js';

const BASE_PATH = (() => {
  try {
    const base = window.PORTFOLIO_BASE || '';
    return base && !base.endsWith('/') ? `${base}/` : base;
  } catch (error) {
    return '';
  }
})();

const CONFIG = {
  basePath: BASE_PATH,
  assetBasePath: `${BASE_PATH}images/portfolio/pages/`,
  dataPath: `${BASE_PATH}config/contents-portfolio.json`,
  coverFallback: `${BASE_PATH}images/portfolio/folio-cover/cover-default.webp`,
};

const PORTFOLIO_CLICK_DRAG_THRESHOLD_PX = 12;

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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
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
  const { r, g, b } = hexToRgb(fill);
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  const luminance = (0.2126 * channel(r)) + (0.7152 * channel(g)) + (0.0722 * channel(b));
  return luminance > 0.42 ? "var(--color-detected-111111)" : "var(--color-detected-f5f1ea)";
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
  const baseUrl = trimmed.startsWith('images/')
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
  const videoBlock = getProjectContentBlocks(project).find((block) => {
    const src = String(block?.src || '');
    return block?.type === 'video' || /\.(mp4|webm)$/i.test(src);
  });
  return videoBlock?.src || '';
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
    this.isProjectOpen = false;
    this.selectedProjectIndex = -1;
    this.lastFocusedElement = null;
    this.projectDrawerView = null;
    this.videoObserver = null;
    this.cardObserver = null;
    this.projectOpenTimeouts = [];
    this.boundProjectKeydown = (event) => this.handleProjectKeydown(event);
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
    this.renderProjectRail();
    this.setupVideoObserver();
    this.setupCardObserver();
    this.applyProjectPalette();
    this.updateCardMetrics();
    document.addEventListener('abs:portfolio:open-project', this.boundAuditOpenProject);
    window.addEventListener('resize', this.boundResize, { passive: true });
    window.addEventListener('bb:paletteChanged', this.boundPaletteChange);

    const globals = getGlobals();
    globals.portfolioProjects = this.projects;
    globals.portfolioDomLabels = true;
    globals.portfolioSyncLabelLayer = () => this.updateCardMetrics();
    globals.portfolioRelayoutLabels = () => this.updateCardMetrics();
  }

  destroy() {
    document.removeEventListener('abs:portfolio:open-project', this.boundAuditOpenProject);
    document.removeEventListener('keydown', this.boundProjectKeydown, true);
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('bb:paletteChanged', this.boundPaletteChange);
    this.clearProjectOpenTimeouts();
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

  renderProjectRail() {
    if (!this.mount) return;
    this.mount.replaceChildren();
    this.mount.classList.add('is-scroll-ready');

    const stage = document.createElement('section');
    stage.className = 'portfolio-scroll-stage';
    stage.setAttribute('aria-label', 'Selected portfolio projects');

    const list = document.createElement('div');
    list.className = 'portfolio-scroll-list';
    list.tabIndex = -1;

    this.cards = this.projects.map((project, index) => {
      const card = this.createProjectCard(project, index);
      list.appendChild(card);
      return card;
    });

    stage.appendChild(list);
    this.mount.appendChild(stage);
    this.scrollList = list;
  }

  createProjectCard(project, index) {
    const labelContent = resolvePortfolioLabelContent(project, project?.title || `Project ${index + 1}`);
    const accentColor = getProjectAccentColor(index, this.projects.length);
    const spokenLabel = labelContent.eyebrow
      ? `${labelContent.eyebrow}: ${labelContent.title}`
      : labelContent.title;
    const card = document.createElement('article');
    card.className = 'portfolio-project-card portfolio-project-label';
    card.dataset.projectIndex = String(index);
    card.style.setProperty('--portfolio-card-accent', accentColor);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
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
    title.textContent = project?.displayTitle || project?.title || labelContent.title;

    const summary = document.createElement('p');
    summary.className = 'portfolio-project-card__summary';
    summary.textContent = project?.summary || project?.overview || '';

    const tags = document.createElement('ul');
    tags.className = 'portfolio-project-card__tags';
    tags.setAttribute('aria-label', 'Project tags');
    getProjectTags(project).forEach((tag) => {
      const item = document.createElement('li');
      item.textContent = tag;
      tags.appendChild(item);
    });

    copy.append(client, title);
    if (summary.textContent) copy.appendChild(summary);
    if (tags.childElementCount) copy.appendChild(tags);

    const media = this.createProjectCardMedia(project, index);
    card.append(copy, media);
    card.addEventListener('click', () => this.openProjectByIndex(index));
    card.addEventListener('keydown', (event) => this.handleCardKeydown(event, index));
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
    if (!this.scrollList || shouldReducePortfolioMotion() || !this.mediaVideos.length) return;
    this.videoObserver?.disconnect();
    this.videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (!(video instanceof HTMLVideoElement)) return;
        if (this.isProjectOpen || !entry.isIntersecting) {
          video.pause();
          return;
        }
        video.play().catch(() => {});
      });
    }, {
      root: this.scrollList,
      threshold: 0.42,
    });
    this.mediaVideos.forEach((video) => this.videoObserver.observe(video));
  }

  setupCardObserver() {
    if (!this.scrollList || !this.cards.length) return;
    this.cardObserver?.disconnect();
    this.cardObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-scroll-active', entry.isIntersecting && entry.intersectionRatio >= 0.48);
      });
    }, {
      root: this.scrollList,
      threshold: [0.24, 0.48, 0.72],
    });
    this.cards.forEach((card) => this.cardObserver.observe(card));
  }

  applyProjectPalette() {
    this.cards.forEach((card, index) => {
      card.style.setProperty('--portfolio-card-accent', getProjectAccentColor(index, this.projects.length));
    });
  }

  updateCardMetrics() {
    if (!this.mount) return;
    this.mount.style.setProperty('--portfolio-project-count', String(this.projects.length));
  }

  handleCardKeydown(event, index) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openProjectByIndex(index);
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = clamp(index + direction, 0, this.cards.length - 1);
    this.cards[nextIndex]?.focus();
    this.cards[nextIndex]?.scrollIntoView({ block: 'nearest', behavior: shouldReducePortfolioMotion() ? 'auto' : 'smooth' });
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

  resumeVisibleVideos() {
    if (shouldReducePortfolioMotion()) return;
    this.mediaVideos.forEach((video) => {
      const rect = video.getBoundingClientRect();
      const rootRect = this.scrollList?.getBoundingClientRect();
      const visible = rootRect
        && rect.bottom > rootRect.top
        && rect.top < rootRect.bottom
        && rect.right > rootRect.left
        && rect.left < rootRect.right;
      if (visible) video.play().catch(() => {});
    });
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

  syncProjectHero(project, animate = true) {
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
      accentColor: getProjectAccentColor(this.selectedProjectIndex, this.projects.length),
      motionConfig: this.config.runtime.motion || {},
    });
    this.syncProjectButtonStates();
  }

  openProjectByIndex(index) {
    if (this.isProjectOpen) return;
    const projectIndex = clamp(index, 0, this.projects.length - 1);
    const project = this.projects[projectIndex];
    if (!project) return;
    const labelContent = resolvePortfolioLabelContent(project, project?.title || `Project ${projectIndex + 1}`);
    const spokenLabel = labelContent.eyebrow
      ? `${labelContent.eyebrow}: ${labelContent.title}`
      : labelContent.title;

    SoundEngine.playHoverSound?.();
    this.prefetchProjectAssets(project);
    this.pauseAllVideos();
    this.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.selectedProjectIndex = projectIndex;
    this.isProjectOpen = true;
    getGlobals().__portfolioDrawerOpen = true;
    this.disableBackgroundInteractivity();
    this.syncProjectHero(project, true);
    this.cards[projectIndex]?.classList.add('is-selected');
    announceToScreenReader(`Opened project: ${spokenLabel}`);
    document.addEventListener('keydown', this.boundProjectKeydown, true);

    const openDuration = shouldReducePortfolioMotion()
      ? clamp(toNumber(this.config.runtime.behavior?.reducedMotionDurationMs, 320), 120, 700)
      : clamp(toNumber(this.config.runtime.motion?.openDurationMs, 420), 200, 1200);
    this.projectOpenTimeouts.push(window.setTimeout(() => {
      this.projectClose?.focus();
    }, Math.min(900, openDuration + 80)));
  }

  finishProjectClose() {
    const restoredIndex = this.selectedProjectIndex;
    this.cards.forEach((card) => card.classList.remove('is-selected'));
    this.isProjectOpen = false;
    this.selectedProjectIndex = -1;
    getGlobals().__portfolioDrawerOpen = false;
    this.restoreBackgroundInteractivity();
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
    if (!this.projectView) {
      this.finishProjectClose();
      return;
    }
    if (this.projectView.classList.contains('is-closing')) return;
    this.clearProjectOpenTimeouts();
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
  }

  disableBackgroundInteractivity() {
    document.body.classList.add('portfolio-project-open');
    refreshCursor();
    if (this.appFrame) {
      this.appFrame.setAttribute('aria-hidden', 'true');
      this.appFrame.inert = true;
    }
  }

  restoreBackgroundInteractivity() {
    document.body.classList.remove('portfolio-project-open');
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
  const firstLabel = labelMount?.querySelector('.portfolio-project-label');
  const canvas = document.getElementById('c');

  const wallRect = wall?.getBoundingClientRect() || null;
  const heroRect = hero?.getBoundingClientRect() || null;
  const topbarRect = topbar?.getBoundingClientRect() || null;
  const firstLabelRect = firstLabel?.getBoundingClientRect() || null;
  const labelCount = labelMount?.querySelectorAll('.portfolio-project-label').length || 0;
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
  // Reveal the page shell but keep the canvas and label mount hidden until the
  // pit simulation is fully seeded — prevents a flash of un-positioned balls.
  const pitCanvas = document.getElementById('c');
  const pitMount = document.getElementById('portfolioProjectMount');
  if (pitCanvas) { pitCanvas.style.opacity = '0'; }
  if (pitMount) { pitMount.style.opacity = '0'; }
  if (!shellRouteTransitionActive) {
    forceBootVisible(['#abs-scene', '#app-frame']);
  }
  // Canvas + label mount stay invisible; revealed after startMainLoop.
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
  await app.init();
  installPortfolioAuditBridge(app);
  updateCursorSize();

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

  // Wait one frame so layout is stable before revealing.
  await new Promise((resolve) => requestAnimationFrame(resolve));
  settlePortfolioPresentation();
  if (pitCanvas) { pitCanvas.style.opacity = '1'; }
  if (pitMount) { pitMount.style.opacity = '1'; }
  if (shellRouteTransitionActive) {
    // Unblock shell route-in once the portfolio route landmarks exist; keep final settling in the background.
    signalRouteReady('portfolio');
  }
  const presentationSettled = await waitForStablePortfolioPresentation({
    timeoutMs: shellRouteTransitionActive ? 900 : 2000,
  });
  if (!presentationSettled && import.meta.env?.DEV) {
    console.warn('[portfolio] Presentation did not fully settle before reveal; using latest measured layout.');
  }

  // Reveal canvas + label mount; the parent wall-slot is still at opacity 0
  // (pre-enter phase) so this won't cause a flash. The enter transition
  // fades in already-settled content.
  if (pitCanvas) { pitCanvas.style.opacity = '1'; }
  if (pitMount) { pitMount.style.opacity = '1'; }

  const ABS_DEV = import.meta.env.DEV;
  if (ABS_DEV) {
    try {
      const { registerDevPanelRoute } = await import('../ui/panel-popup-manager.js');
      const { generatePanelSectionsHTML } = await import('./panel/control-registry.js');
      const { setupControls } = await import('./panel/controls.js');
      const { setupBuildControls } = await import('./panel/build-controls.js');

      registerDevPanelRoute({
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
      });
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
    try {
      disposeRendererListeners();
    } catch (e) {
      /* ignore */
    }
    window.removeEventListener('pageshow', handlePageShow);
    app.destroy();
  };
}
