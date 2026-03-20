import { loadRuntimeConfig } from '../utils/runtime-config.js';
import { applyWallFrameFromConfig, applyWallFrameLayout } from '../visual/wall-frame.js';
import { applyPortfolioConfig, loadPortfolioConfig, normalizePortfolioConfig } from './portfolio-config.js';
import {
  relayoutPortfolioProjectLabels,
  initializePortfolioPit,
  applyPortfolioAccentBallColor,
} from './pit-mode.js';
import { createSoundToggle } from '../ui/sound-toggle.js';
import { initializeDarkMode } from '../visual/dark-mode-v2.js';
import { getPortfolioProjectPaletteColor, maybeAutoPickCursorColor, rotatePaletteChapterOnReload } from '../visual/colors.js';
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
import { forcePageVisible, waitForPageReadyBarrier } from '../visual/page-orchestrator.js';
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
import { setupCustomCursor, updateCursorSize } from '../rendering/cursor.js';

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

/** Subtle translateY (px): positive = lower; eases toward 0 as media moves up through the drawer. */
function computeDrawerMediaScrollShiftY(mediaRect, scrollerRect) {
  const sh = scrollerRect.height;
  if (!(sh > 1)) return 0;
  const band = sh + mediaRect.height * 0.9;
  const raw = (scrollerRect.bottom - mediaRect.top) / band;
  const p = clamp(raw, 0, 1);
  const neutral = 0.4;
  return (neutral - p) * 20;
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

function hexToRgb(hex) {
  const value = String(hex || '#000000').replace('#', '').trim();
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
  return luminance > 0.42 ? '#111111' : '#f5f1ea';
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

function getContentBlocks(project) {
  if (Array.isArray(project.contentBlocks) && project.contentBlocks.length) {
    return project.contentBlocks;
  }
  if (Array.isArray(project.gallery) && project.gallery.length) {
    return project.gallery.map((src) => ({ type: 'image', src }));
  }
  return [];
}

function getVideoMimeType(src) {
  if (src.endsWith('.webm')) return 'video/webm';
  if (src.endsWith('.mp4')) return 'video/mp4';
  return '';
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
    this.isProjectOpen = false;
    this.projectOpenTimeouts = [];
    this.selectedBall = null;
    this.selectedProjectIndex = -1;
    this.focusedProjectIndex = -1;
    this.lastFocusedElement = null;
    this.projectNav = null;
    this.projectButtons = [];
    this.projectLabelLayer = null;
    this.projectLabels = [];
    this._projectCloseFallbackTimer = null;
    this._drawerMediaShiftRaf = null;
    this.boundScheduleDrawerMediaScrollShift = () => this.scheduleDrawerMediaScrollShift();
    this.boundProjectKeydown = (event) => this.handleProjectKeydown(event);
    this.boundProjectCloseClick = (event) => {
      event.stopPropagation();
      if (event.detail === 0) SoundEngine.playHoverSound?.();
      this.closeProject();
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
    this.boundSheetTransitionEnd = (event) => {
      if (event.target !== this.projectDrawer) return;
      if (event.propertyName !== 'transform') return;
      if (!this.projectView?.classList.contains('is-closing')) return;
      this.finishProjectClose();
    };
    this.boundBackdropPointerDown = (event) => {
      if (event.target === this.projectBackdrop) this.closeProject();
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
    window.addEventListener('resize', this.boundResize, { passive: true });
    window.addEventListener('bb:paletteChanged', this.boundPaletteChange);
  }

  destroy() {
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('bb:paletteChanged', this.boundPaletteChange);
    this.teardownDrawerMediaScrollShift();
    document.removeEventListener('keydown', this.boundProjectKeydown, true);
    this.clearProjectOpenTimeouts();
    if (this.projectClose) {
      this.projectClose.removeEventListener('click', this.boundProjectCloseClick);
    }
    if (this.projectBackdrop) {
      this.projectBackdrop.removeEventListener('pointerdown', this.boundBackdropPointerDown);
    }
    if (this.projectDrawer) {
      this.projectDrawer.removeEventListener('transitionend', this.boundSheetTransitionEnd);
    }
    if (this.projectNav) this.projectNav.remove();
    if (this.projectLabelLayer) this.projectLabelLayer.remove();
    if (this.projectView) this.projectView.remove();
    const globals = getGlobals();
    globals.ballBallSurfaceGapPx = 0;
    globals.collisionPairSlopPx = null;
    globals.portfolioDomLabels = false;
    globals.portfolioSyncLabelLayer = null;
    globals.portfolioRelayoutLabels = null;
    this.restoreBackgroundInteractivity();
  }

  applyRuntimeConfig(runtime) {
    this.config.runtime = normalizePortfolioConfig({ runtime }).runtime;
    const globals = getGlobals();
    globals.portfolioPitConfig = this.config.runtime;
  }

  refreshPitBodies() {
    const globals = getGlobals();
    globals.portfolioPitConfig = this.config.runtime;
    void setMode(MODES.PORTFOLIO_PIT).then(() => {
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
    globals.gravityMultiplier = baseGravity * gravityScale;
    globals.G = globals.GE * globals.gravityMultiplier;
    globals.physicsSkipSleepingSteps = false;
    // Ball–ball: flat surface gap (~2.5 CSS px) like a visible pit clearance, plus tight
    // solver slop so circles don’t visually intersect. ballSpacing stays 0 (ratio-only off).
    const dpr = globals.DPR || 1;
    globals.ballSpacing = 0;
    globals.ballBallSurfaceGapPx = 2.5 * dpr;
    globals.collisionPairSlopPx = 0.04 * dpr;
    globals.wallInset = 0;
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
    const existing = document.getElementById('portfolioProjectView');
    if (existing) existing.remove();
    host.insertAdjacentHTML('beforeend', `
      <section
        id="portfolioProjectView"
        class="portfolio-project-view"
        aria-hidden="true"
        role="dialog"
        aria-modal="true"
        aria-labelledby="portfolioProjectTitle"
      >
        <div class="portfolio-project-view__backdrop" aria-hidden="true"></div>
        <div class="portfolio-project-view__drawer">
          <button class="portfolio-project-view__close abs-icon-btn" type="button" aria-label="Close project">
            <svg class="portfolio-project-view__close-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M6.22 4.93 12 10.71l5.78-5.78 1.29 1.29L13.29 12l5.78 5.78-1.29 1.29L12 13.29l-5.78 5.78-1.29-1.29L10.71 12 4.93 6.22z"
              />
            </svg>
          </button>
          <div class="portfolio-project-view__scroll">
            <section class="portfolio-project-view__hero">
              <div class="portfolio-project-view__image-shell">
                <img class="portfolio-project-view__image" alt="" loading="eager" />
                <div class="portfolio-project-view__image-veil" aria-hidden="true"></div>
              </div>
              <div class="portfolio-project-view__hero-copy">
                <p class="portfolio-project-view__eyebrow"></p>
                <h1 id="portfolioProjectTitle" class="portfolio-project-view__title"></h1>
                <p class="portfolio-project-view__scroll-hint">(scroll please)</p>
              </div>
            </section>
            <section class="portfolio-project-view__body">
              <div class="portfolio-project-view__body-inner" id="portfolioProjectContent"></div>
            </section>
          </div>
        </div>
      </section>
    `);

    this.projectView = document.getElementById('portfolioProjectView');
    this.projectBackdrop = this.projectView?.querySelector('.portfolio-project-view__backdrop');
    this.projectDrawer = this.projectView?.querySelector('.portfolio-project-view__drawer');
    this.projectScroll = this.projectView?.querySelector('.portfolio-project-view__scroll');
    this.projectImage = this.projectView?.querySelector('.portfolio-project-view__image');
    this.projectEyebrow = this.projectView?.querySelector('.portfolio-project-view__eyebrow');
    this.projectTitle = this.projectView?.querySelector('.portfolio-project-view__title');
    this.projectContent = this.projectView?.querySelector('#portfolioProjectContent');
    this.projectClose = this.projectView?.querySelector('.portfolio-project-view__close');
  }

  bindProjectOverlay() {
    if (!this.projectClose) return;
    this.projectClose.addEventListener('click', this.boundProjectCloseClick);
    this.projectBackdrop?.addEventListener('pointerdown', this.boundBackdropPointerDown);
  }

  setupDrawerMediaScrollShift() {
    this.teardownDrawerMediaScrollShift();
    if (!this.projectScroll) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.projectScroll.addEventListener('scroll', this.boundScheduleDrawerMediaScrollShift, { passive: true });
  }

  teardownDrawerMediaScrollShift() {
    if (this._drawerMediaShiftRaf != null) {
      cancelAnimationFrame(this._drawerMediaShiftRaf);
      this._drawerMediaShiftRaf = null;
    }
    this.projectScroll?.removeEventListener('scroll', this.boundScheduleDrawerMediaScrollShift, { passive: true });
  }

  scheduleDrawerMediaScrollShift() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (this._drawerMediaShiftRaf != null) return;
    this._drawerMediaShiftRaf = window.requestAnimationFrame(() => {
      this._drawerMediaShiftRaf = null;
      this.updateDrawerMediaScrollShift();
    });
  }

  updateDrawerMediaScrollShift() {
    if (!this.isProjectOpen || !this.projectScroll) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cr = this.projectScroll.getBoundingClientRect();
    const nodes = this.projectScroll.querySelectorAll('img, video');
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const ir = el.getBoundingClientRect();
      const ty = computeDrawerMediaScrollShiftY(ir, cr);
      el.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0)`;
    }
  }

  resetDrawerMediaTransforms() {
    if (!this.projectScroll) return;
    const nodes = this.projectScroll.querySelectorAll('img, video');
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].style.transform = '';
    }
  }

  resetProjectScrollTop() {
    if (!this.projectScroll) return;
    this.projectScroll.scrollTop = 0;
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
      const projectLabel = String(project?.displayTitle || project?.title || `Project ${index + 1}`).trim();
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.projectIndex = String(index);
      button.setAttribute('aria-describedby', 'portfolioProjectNavHint');
      button.setAttribute('aria-controls', 'portfolioProjectView');
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', project?.title || projectLabel);
      button.textContent = projectLabel;
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
      label.appendChild(text);
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
      const ball = balls.find((entry) => entry?.projectIndex === index);

      if (!ball || ball.__portfolioHidden) {
        label.style.opacity = '0';
        continue;
      }

      const lines = Array.isArray(ball.label?.lines) ? ball.label.lines : [ball.projectTitle || 'Project'];
      const textKey = lines.join('\n');
      if (text && text.dataset.textKey !== textKey) {
        text.innerHTML = lines.map((line) => `<span>${escapeHtml(line)}</span>`).join('');
        text.dataset.textKey = textKey;
      }

      const diameter = ball.r * 2;
      const width = diameter / dpr;
      const height = diameter / dpr;
      const rotation = ball.theta || 0;
      const fontSize = (ball.label?.fontSize || 20) / dpr;
      const lineHeight = (ball.label?.lineHeight || (fontSize * 0.96)) / Math.max(fontSize, 1);
      const alpha = clamp(toNumber(ball.__portfolioDimAlpha, 1), 0, 1) * (ball.__portfolioSelected ? 0 : 1);

      label.style.width = `${width}px`;
      label.style.height = `${height}px`;
      label.style.transform = `translate(${ball.x / dpr}px, ${ball.y / dpr}px) translate(-50%, -50%) rotate(${rotation}rad)`;
      label.style.opacity = `${alpha}`;
      label.style.color = ball.labelColor || '#ffffff';

      if (text) {
        text.style.fontSize = `${fontSize}px`;
        text.style.lineHeight = `${lineHeight}`;
      }
    }
  }

  bindCanvasInteractions() {
    if (!this.canvas) return;
    this.canvas.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
    this.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event));
    this.canvas.addEventListener('pointerup', (event) => this.handlePointerUp(event));
    this.canvas.addEventListener('pointercancel', (event) => this.handlePointerUp(event));
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

  handlePointerDown(event) {
    if (this.isProjectOpen) return;
    const point = this.getCanvasPoint(event);
    const ball = this.hitTestBall(point);
    if (!ball) return;

    this.dragPointerId = event.pointerId;
    this.dragBall = ball;
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
      offsetX: point.x - ball.x,
      offsetY: point.y - ball.y,
      lastX: point.x,
      lastY: point.y,
      lastStamp: performance.now(),
    };
    this.dragVelocity = { vx: 0, vy: 0 };
    this.canvas.setPointerCapture?.(event.pointerId);
  }

  handlePointerMove(event) {
    if (this.dragPointerId !== event.pointerId || !this.dragBall || !this.dragStart) return;
    const point = this.getCanvasPoint(event);
    const dx = event.clientX - this.dragStart.clientX;
    const dy = event.clientY - this.dragStart.clientY;
    const distance = Math.hypot(dx, dy);
    if (distance > 8) this.dragMoved = true;

    const now = performance.now();
    const rawDt = now - this.dragStart.lastStamp;
    const deltaTime = Math.max(16, Math.min(rawDt, 45));
    const targetX = point.x - this.dragStart.offsetX;
    const targetY = point.y - this.dragStart.offsetY;

    this.dragVelocity = {
      vx: ((targetX - this.dragBall.x) / deltaTime) * 1000,
      vy: ((targetY - this.dragBall.y) / deltaTime) * 1000,
    };

    this.dragBall.x = targetX;
    this.dragBall.y = targetY;
    if (this.canvas) {
      clampBallPositionToWallInterior(this.dragBall, this.canvas.width, this.canvas.height);
    }
    relaxOverlapsWithKinematicBall(this.dragBall);
    this.dragStart.lastX = targetX;
    this.dragStart.lastY = targetY;
    this.dragStart.lastStamp = now;
    render();
  }

  handlePointerUp(event) {
    if (this.dragPointerId !== event.pointerId || !this.dragBall) return;
    this.canvas.releasePointerCapture?.(event.pointerId);

    const releasedBall = this.dragBall;
    const throwMultiplier = clamp(toNumber(this.config.runtime.motion?.dragThrowMultiplier, 1.05), 0.2, 2);
    releasedBall.isPointerLocked = false;

    if (this.dragMoved) {
      releasedBall.vx = this.dragVelocity.vx * throwMultiplier;
      releasedBall.vy = this.dragVelocity.vy * throwMultiplier;
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
  }

  clearProjectOpenTimeouts() {
    while (this.projectOpenTimeouts.length) {
      window.clearTimeout(this.projectOpenTimeouts.pop());
    }
  }

  prefetchProjectAssets(project) {
    if (!project) return;
    [project.image, ...getContentBlocks(project).map((block) => block.src)].forEach((src) => {
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

  buildProjectContent(project) {
    const blocks = getContentBlocks(project);
    const links = Array.isArray(project.links) ? project.links : [];
    const takeaways = Array.isArray(project.takeaways) ? project.takeaways : [];

    const linksHtml = links.length
      ? `
        <div class="portfolio-project-view__links">
          ${links.map((link) => `
            <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(link.label)}
              <i class="ti ti-external-link" aria-hidden="true"></i>
            </a>
          `).join('')}
        </div>`
      : '';

    const blocksHtml = blocks.map((block) => {
      if (block.type === 'video') {
        const src = resolveAsset(block.src);
        const type = getVideoMimeType(src);
        const autoplay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '' : 'autoplay';
        return `
          <figure class="portfolio-project-view__block portfolio-project-view__block--video">
            <video ${autoplay} muted loop playsinline preload="metadata" controls>
              <source src="${src}"${type ? ` type="${type}"` : ''}>
            </video>
            ${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}
          </figure>
        `;
      }
      if (block.type === 'text') {
        return `<div class="portfolio-project-view__block portfolio-project-view__block--text"><p>${escapeHtml(block.text)}</p></div>`;
      }
      return `
        <figure class="portfolio-project-view__block">
          <img src="${resolveAsset(block.src)}" alt="${escapeHtml(block.alt || project.title || 'Project image')}" loading="lazy">
          ${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}
        </figure>
      `;
    }).join('');

    const takeawayHtml = takeaways.length
      ? `
        <section class="portfolio-project-view__takeaways">
          <h2>Personal takeaways</h2>
          <ul>${takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </section>
      `
      : '';

    return `
      <div class="portfolio-project-view__summary">
        <p>${escapeHtml(project.summary || '')}</p>
      </div>
      ${project.overview ? `
        <section class="portfolio-project-view__overview">
          <h2>Overview</h2>
          <p>${escapeHtml(project.overview)}</p>
        </section>
      ` : ''}
      ${linksHtml}
      <section class="portfolio-project-view__stack">
        ${blocksHtml}
      </section>
      ${takeawayHtml}
    `;
  }

  syncProjectHero(project, animate = true) {
    if (!this.selectedBall || !this.projectView || !project) return;

    const openDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? clamp(toNumber(this.config.runtime.behavior?.reducedMotionDurationMs, 320), 120, 700)
      : clamp(toNumber(this.config.runtime.motion?.openDurationMs, 420), 200, 1200);
    const imageFadeMs = clamp(toNumber(this.config.runtime.motion?.imageFadeMs, 220), 0, 600);
    const titleDelay = clamp(toNumber(this.config.runtime.motion?.titleRevealDelayMs, 280), 0, 1200);

    this.projectView.style.setProperty('--portfolio-project-open-ms', `${openDuration}ms`);
    this.projectView.style.setProperty('--portfolio-project-image-fade-ms', `${imageFadeMs}ms`);
    this.projectView.style.setProperty('--portfolio-project-title-delay-ms', `${titleDelay}ms`);

    this.projectImage.src = resolveAsset(project.image || CONFIG.coverFallback);
    this.projectImage.addEventListener('load', () => {
      this.scheduleDrawerMediaScrollShift();
    }, { once: true });
    this.projectImage.alt = project.title || 'Project cover';
    this.projectEyebrow.textContent = project.client || '';
    this.projectTitle.textContent = project.title || '';
    this.projectContent.innerHTML = this.buildProjectContent(project);
    this.syncProjectButtonStates();
    this.scheduleDrawerMediaScrollShift();

    if (!animate) {
      this.projectView.classList.add('is-visible', 'is-open', 'is-title-visible');
      this.projectView.setAttribute('aria-hidden', 'false');
      document.body.classList.add('portfolio-project-open');
      this.resetProjectScrollTop();
      return;
    }

    this.projectView.classList.remove('is-open', 'is-title-visible', 'is-closing');
    this.projectView.classList.add('is-visible');
    this.projectView.setAttribute('aria-hidden', 'false');
    document.body.classList.add('portfolio-project-open');
    this.resetProjectScrollTop();

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      this.projectView.classList.add('is-open', 'is-title-visible');
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.projectView.classList.add('is-open');
      });
    });

    this.clearProjectOpenTimeouts();
    this.projectOpenTimeouts.push(window.setTimeout(() => {
      this.projectView.classList.add('is-title-visible');
    }, titleDelay));
  }

  openProject(ball) {
    if (!ball || this.isProjectOpen) return;
    const project = this.projects[ball.projectIndex];
    if (!project) return;

    SoundEngine.playHoverSound?.();
    this.prefetchProjectAssets(project);
    this.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.selectedBall = ball;
    this.selectedProjectIndex = ball.projectIndex;
    this.isProjectOpen = true;
    this.setFocusedProjectIndex(-1);
    ball.__portfolioSelected = true;
    ball.__portfolioHidden = true;
    ball.isPointerLocked = true;
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    this.applyNeighborImpulse(ball);
    this.disableBackgroundInteractivity();
    this.syncProjectHero(project, true);
    announceToScreenReader(`Opened project: ${project.title || 'Project'}`);
    document.addEventListener('keydown', this.boundProjectKeydown, true);

    const openDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? clamp(toNumber(this.config.runtime.behavior?.reducedMotionDurationMs, 320), 120, 700)
      : clamp(toNumber(this.config.runtime.motion?.openDurationMs, 420), 200, 1200);
    this.projectOpenTimeouts.push(window.setTimeout(() => {
      this.projectClose?.focus();
    }, Math.min(900, openDuration + 80)));
  }

  finishProjectClose() {
    if (!this.projectView) return;
    this.resetDrawerMediaTransforms();
    if (this._projectCloseFallbackTimer !== null) {
      window.clearTimeout(this._projectCloseFallbackTimer);
      this._projectCloseFallbackTimer = null;
    }
    this.projectDrawer?.removeEventListener('transitionend', this.boundSheetTransitionEnd);
    this.projectView.classList.remove('is-visible', 'is-closing', 'is-open', 'is-title-visible');
    this.projectView.setAttribute('aria-hidden', 'true');
    this.restoreBackgroundInteractivity();

    const globals = getGlobals();
    const balls = Array.isArray(globals.balls) ? globals.balls : [];
    for (let index = 0; index < balls.length; index += 1) {
      const ball = balls[index];
      if (!ball) continue;
      ball.__portfolioDimAlpha = 1;
    }
    if (this.selectedBall) {
      this.selectedBall.__portfolioHidden = false;
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
    if (!this.isProjectOpen || !this.projectView) return;
    if (this.projectView.classList.contains('is-closing')) return;
    this.clearProjectOpenTimeouts();
    this.projectView.classList.remove('is-title-visible');
    document.removeEventListener('keydown', this.boundProjectKeydown, true);

    const openDuration = clamp(toNumber(this.config.runtime.motion?.openDurationMs, 420), 200, 1200);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || !this.projectDrawer) {
      this.finishProjectClose();
      return;
    }

    this.projectDrawer.removeEventListener('transitionend', this.boundSheetTransitionEnd);
    this.projectDrawer.addEventListener('transitionend', this.boundSheetTransitionEnd);
    this.projectView.classList.add('is-closing');
    this.projectView.classList.remove('is-open');

    this._projectCloseFallbackTimer = window.setTimeout(() => {
      this._projectCloseFallbackTimer = null;
      if (this.projectView?.classList.contains('is-closing')) this.finishProjectClose();
    }, openDuration + 200);
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
    if (!this.projectView) return [];
    return Array.from(this.projectView.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
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
 * Wait until `#bravia-balls` has a real layout box (gate transitions / SPA can report 0×0
 * for several frames). Without this, `resize()` no-ops and the pit seeds against a default buffer.
 */
async function waitForPitSimulationHostReady(options = {}) {
  const minPx = Math.max(24, Number(options.minEdgePx) || 48);
  const timeoutMs = Math.max(250, Number(options.timeoutMs) || 8000);

  const measure = () => {
    const host = document.getElementById('bravia-balls');
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

    const host = document.getElementById('bravia-balls');
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

export async function bootstrapPortfolio() {
  destroyQuoteDisplay();

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
  getGlobals().performanceHudEnabled = false;
  syncShellToDocument({
    isDark: document.documentElement.classList.contains('dark-mode')
  });
  applyWallFrameLayout();

  setupRenderer();
  setCanvas(getCanvas(), getContext(), document.getElementById('bravia-balls'));
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
  forcePageVisible(['#abs-scene', '#app-frame']);
  // Canvas + label mount stay invisible; revealed after startMainLoop.
  const hostLaidOut = await waitForPitSimulationHostReady();
  try {
    if (!hostLaidOut && import.meta.env?.DEV) {
      console.warn(
        '[portfolio] #bravia-balls did not reach stable size in time; relying on follow-up resize.'
      );
    }
  } catch (_) {
    /* ignore */
  }
  // Gate / SPA transitions can leave #bravia-balls at 0×0 for the first resize(); sizing
  // must be correct before seeding balls or labels stay wrong until a full reload.
  detectOptimalDPR();
  resize();

  SoundEngine.initSoundEngine();
  SoundEngine.applySoundConfigFromRuntimeConfig(runtimeConfig);
  createSoundToggle();
  initNoiseSystem(getGlobals());

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

  rotatePaletteChapterOnReload();
  initializeDarkMode();
  maybeAutoPickCursorColor('startup');
  initTimeDisplay();
  upgradeSocialIcons();

  const portfolioConfig = applyPortfolioConfig(await loadPortfolioConfig());
  const data = await fetchPortfolioData();
  const projects = Array.isArray(data?.projects) ? data.projects : [];

  const app = new PortfolioPitApp({
    config: portfolioConfig,
    projects
  });
  await app.init();
  updateCursorSize();

  const settlePortfolioPresentation = () => {
    try {
      detectOptimalDPR();
      resize();

      // If the initial seed was skipped because the canvas buffer was still at
      // default 300×150 during the gate transition, re-seed now that the buffer
      // has been corrected by the resize above.
      const g = getGlobals();
      if (g.canvas && g.canvas.width > 2 && g.canvas.height > 2
          && (!g.balls || g.balls.length === 0)
          && Array.isArray(g.portfolioProjects) && g.portfolioProjects.length > 0) {
        setMode(MODES.PORTFOLIO_PIT);
      }

      relayoutPortfolioProjectLabels();
      app.syncProjectLabels();
      render();
    } catch (e) {
      /* ignore */
    }
  };
  settlePortfolioPresentation();

  startMainLoop(null, { getForcesFn: getForceApplicator });

  // Run several physics + render frames offscreen so balls drop from their
  // spawn positions above the viewport and settle into the pit before the
  // gate-success CSS transition fades the wall-slot in.
  // `bootstrapPortfolio` must not return until this is done, because
  // `dispatchRouteReady` fires immediately after return and triggers the
  // enter transition.
  const SETTLE_FRAMES = 6;
  for (let i = 0; i < SETTLE_FRAMES; i++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    settlePortfolioPresentation();
  }

  // Reveal canvas + label mount; the parent wall-slot is still at opacity 0
  // (pre-enter phase) so this won't cause a flash. The enter transition
  // fades in already-settled content.
  if (pitCanvas) { pitCanvas.style.opacity = '1'; }
  if (pitMount) { pitMount.style.opacity = '1'; }

  const ABS_DEV = (typeof __DEV__ !== 'undefined') ? __DEV__ : false;
  if (ABS_DEV) {
    try {
      const { createPanelDock } = await import('../ui/panel-dock.js');
      const { generatePanelSectionsHTML } = await import('./panel/control-registry.js');
      const { setupControls } = await import('./panel/controls.js');
      const { setupBuildControls } = await import('./panel/build-controls.js');

      createPanelDock({
        page: 'portfolio',
        pageLabel: 'Portfolio',
        portfolioPanelConfig: portfolioConfig,
        pageHTML: generatePanelSectionsHTML(portfolioConfig),
        includePageSaveButton: true,
        pageSaveButtonId: 'savePortfolioConfigBtn',
        panelTitle: 'Settings',
        modeLabel: 'DEV MODE',
        setupPageControls: () => {
          setupControls(portfolioConfig, {
            onMetricsChange: () => app.refreshPitBodies(),
            onRuntimeChange: (runtime) => app.applyRuntimeConfig(runtime),
          });
          setupBuildControls(portfolioConfig);
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

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      resetTransitionState();
      const appFrame = document.getElementById('app-frame');
      if (appFrame) appFrame.style.opacity = '1';
    }
  });

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
    app.destroy();
  };
}
