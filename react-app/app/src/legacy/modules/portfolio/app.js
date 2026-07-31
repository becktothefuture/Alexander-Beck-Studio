import { loadRuntimeConfig } from '../utils/runtime-config.js';
import {
  applyPortfolioConfig,
  createNormalizedPortfolioRuntimeListener,
} from './portfolio-config.js';
import { getProjectContentBlocks, resolvePortfolioLabelContent } from './portfolio-content.js';
import {
  getPortfolioCoverFallback,
  getPortfolioVideoMimeType,
  getProjectAccessMode,
  getProjectImageSrc,
  getProjectTags,
  getProjectVideoSrc,
  loadPortfolioData,
  loadPortfolioRuntimeConfig,
  resolvePortfolioAsset as resolveAsset,
} from './portfolio-data.js';
import {
  PORTFOLIO_THUMBNAIL_READY_TIMEOUT_MS,
  warmPortfolioThumbnail,
} from './portfolio-prewarm.js';
import {
  waitForPitSimulationHostReady,
  waitForStablePortfolioPresentation,
} from './portfolio-presentation-readiness.js';
export { preloadPortfolioRoute } from './portfolio-prewarm.js';
import { getPortfolioProjectPaletteColor, maybeAutoPickCursorColor } from '../visual/colors.js';
import { getGlobals } from '../core/state.js';
import { loadRuntimeText } from '../utils/text-loader.js';
import { applyRuntimeTextToDOM } from '../ui/apply-text.js';
import { waitForFonts } from '../utils/font-loader.js';
import * as SoundEngine from '../audio/sound-engine.js';
import { triggerDetent } from '../audio/simulation-audio-adapter.js';
import { completeDirectBoot, waitForPageReadyBarrier } from '../visual/page-orchestrator.js';
import { resetTransitionState, setupPrefetchOnHover, setupTransitionNavigationLinks } from '../utils/page-nav.js';
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
import { setCanvas } from '../core/state.js';
import { announceToScreenReader } from '../utils/accessibility.js';
import { destroyQuoteDisplay } from '../ui/quote-display.js';
import { setupPointer } from '../input/pointer.js';
import { setupOverscrollLock } from '../input/overscroll-lock.js';
import { refreshCursor, setupCustomCursor, updateCursorSize } from '../rendering/cursor.js';
import { PortfolioProjectDrawer } from './project-drawer.js';
import { PortfolioProjectHandoff } from './project-handoff.js';
import { PortfolioParticleField } from './portfolio-speed-field.js';
import { registerSimulationAtmosphereSource } from '../rendering/atmosphere/simulation-atmosphere.js';
import { hasGateAccess } from '../../../lib/access-gates.js';
import { triggerHaptic } from '../../../lib/haptics.js';
import { getTransitionPhase, isRouteTransitionPhase } from '../../../lib/transition-phase.js';
import {
  applyBookendTitleKerning,
  createEntranceSequence,
  prepareBookendTitleGlyphs,
} from '../../../lib/motion/entrance-sequence.js';
import { getShellRouteTransitionConfig } from '../visual/site-shell.js';
import { registerRouteTransitionParticipant } from '../../../lib/motion/route-transition-participants.js';

let activePortfolioBootstrapRunId = 0;

const PORTFOLIO_CLICK_DRAG_THRESHOLD_PX = 12;
const PORTFOLIO_ACTION_SOUND_MIN_INTERVAL_MS = 90;
const PORTFOLIO_CENTER_SOUND_MIN_INTERVAL_MS = 120;
const PORTFOLIO_CAROUSEL_DETENT_STEP = 1;
const PORTFOLIO_CAROUSEL_DETENT_MIN_VELOCITY = 0.18;
const PORTFOLIO_CAROUSEL_DETENT_GAIN = 0.032;
const PORTFOLIO_CAROUSEL_DETENT_FILTER_HZ = 3300;
const PORTFOLIO_RING_MAX_VISIBLE_OFFSET = 3;
const PORTFOLIO_RING_GUARD_SLOTS = 2;
const PORTFOLIO_CARD_ENTRANCE_FALLBACK_DELAY_MS = 300;
const PORTFOLIO_BOOKEND_FALLBACK_REVEAL_DELAY_MS = 300;

// The shared entrance executor owns title, rule, and description timings.
// Portfolio only needs the resolved endpoint so cards do not compete with the
// readable lockup. Keep that endpoint mirrored as one local CSS value for the
// existing card reveal system. The shell config read is only a fallback.
function resolvePortfolioTitleTiming(sequence) {
  const totalMs = Number(sequence?.totalMs);
  if (Number.isFinite(totalMs) && totalMs >= 0) return totalMs;
  const routeMotion = getShellRouteTransitionConfig();
  return Math.max(
    PORTFOLIO_BOOKEND_FALLBACK_REVEAL_DELAY_MS,
    routeMotion.routeBookendDurationMs,
  );
}

function applyPortfolioTitleTiming(mount, sequence) {
  const revealDelayMs = resolvePortfolioTitleTiming(sequence);
  mount?.style.setProperty(
    '--portfolio-content-reveal-delay',
    `${revealDelayMs}ms`,
  );
  return revealDelayMs;
}
const PORTFOLIO_CARD_EDGE_MIN_OPACITY = 0.8;
const PORTFOLIO_INDICATOR_REST_OPACITY = 0.22;
const PORTFOLIO_INDICATOR_ACTIVE_RADIUS = 2;

const PORTFOLIO_DECK_DEFAULTS = Object.freeze({
  reducedMotionDurationMs: 1,
  scrollSensitivity: 1,
  scrollPixelsPerProject: 520,
  inputCapProjects: 0.32,
  inputCommitThresholdProjects: 0.18,
  inputIntentWindowMs: 180,
  maxLeadProjects: 2,
  followSmoothing: 0.18,
  settleIdleMs: 150,
  settleStrength: 0.15,
  cardWidthPercent: 24,
  cardMaxWidthPx: 316,
  cardHeightCqh: 58,
  cardMaxHeightPx: 461,
  largeViewportWidthStartPx: 1440,
  largeViewportWidthEndPx: 2560,
  largeViewportHeightStartPx: 900,
  largeViewportHeightEndPx: 1440,
  largeViewportCardScaleMax: 1.75,
  largeViewportContentScaleMax: 1.45,
  mobileCardWidthPercent: 64,
  mobileCardMaxWidthPx: 300,
  mobileCardHeightCqh: 58,
  mobileCardMaxHeightPx: 500,
  centerYPercent: 50,
  mobileCenterYPercent: 58,
  sliderYOffsetDvh: 0,
  introYOffsetDvh: 0,
  desktopViewportYOffsetDvh: 3,
  largeViewportOrbitCapStartProgress: 0.6,
  largeViewportTitleCardGapDvh: 8,
  largeViewportGroupOffsetHeightEndPx: 1800,
  largeViewportGroupOffsetMaxDvh: 6,
  perspectivePx: 1600,
  pathRadiusPx: 2600,
  mobilePathRadiusPx: 820,
  angleStepDeg: 10.25,
  mobileAngleStepDeg: 13.5,
  sideRotationDeg: 10,
  farRotationDeg: 22,
  sideScale: 0.985,
  mobileSideScale: 0.78,
  farScale: 0.9,
  minCardGapPx: 18,
  dotDialRadiusPx: 2050,
  mobileDotDialRadiusPx: 900,
  dotDensity: 5,
  dotActiveScale: 1,
  dotParallaxRatio: 1,
  dotArcSpanDeg: 18,
  dotArcOffsetDeg: 0,
  depthGap1Px: 0,
  depthZ1Px: -18,
  depthScale1: 0.985,
  depthBlur1Px: 0,
  rotateXStepDeg: 0,
  exitTravelPx: 220,
  exitFadeStart: 0.28,
  exitFadeEnd: 0.58,
  wrapDepthPx: 120,
  reappearStart: 0.84,
  reappearFade: 0.12,
  exitScale: 1.045,
  exitBlurPx: 3.2,
  contactShadowOpacity: 0.12,
  particleField: Object.freeze({
    idleOpacity: 0,
    fastOpacity: 0.26,
    quietBandHeight: 0.42,
    quietBandOpacity: 0.3,
    densityScale: 1,
    minRadiusPx: 1.8,
    maxRadiusPx: 18,
    motionResponse: 1,
    parallaxDepth: 1,
  }),
});

const PORTFOLIO_DECK_INTRO_FALLBACK = Object.freeze({
  title: 'Selected Work',
  body: 'Projects from early concepts to shipped websites, apps, tools, and platforms.',
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

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - (2 * t));
}

function toNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeWheelDelta(event) {
  const multiplier = event?.deltaMode === 1
    ? 16
    : (event?.deltaMode === 2 ? (window.innerHeight || 900) : 1);
  const deltaX = (Number(event?.deltaX) || 0) * multiplier;
  const deltaY = (Number(event?.deltaY) || 0) * multiplier;
  if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return 0;
  return Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
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

function getProjectCardTheme(project, projectIndex, projectCount) {
  const accent = resolveThumbnailAccent(project, projectIndex, projectCount);
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

function resolveThumbnailAccent(project, projectIndex, projectCount) {
  const authored = String(
    project?.thumbnailAccent
      || project?.thumbnailAccentColor
      || project?.accent
      || ''
  ).trim();
  if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(authored) || /^rgba?\(/i.test(authored)) return authored;
  return getProjectAccentColor(projectIndex, projectCount);
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

function getProjectAccentColor(projectIndex, projectCount) {
  return getPortfolioProjectPaletteColor(projectIndex, Math.max(1, projectCount || 1));
}

function shouldReducePortfolioMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

function waitForAnimationFrame(signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }
    let settled = false;
    let fallback = 0;
    const finish = (painted) => {
      if (settled) return;
      settled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
      signal?.removeEventListener?.('abort', cancel);
      resolve(painted);
    };
    const frame = window.requestAnimationFrame(() => finish(true));
    const cancel = () => {
      finish(false);
    };
    signal?.addEventListener?.('abort', cancel, { once: true });
    fallback = window.setTimeout(() => finish(true), 96);
  });
}

function waitForBoundedPromise(promise, timeoutMs, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      signal?.removeEventListener?.('abort', abort);
      resolve(value);
    };
    const abort = () => finish(false);
    const timeout = window.setTimeout(() => finish(false), timeoutMs);
    signal?.addEventListener?.('abort', abort, { once: true });
    Promise.resolve(promise).then(
      () => finish(true),
      () => finish(false),
    );
  });
}

class PortfolioScrollApp {
  constructor({ config, projects }) {
    this.config = config;
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
    this.deckMeasuredVelocity = 0;
    this.deckRebaseCount = 0;
    this.deckIsSettling = false;
    this.deckSettleTimer = 0;
    this.deckInputState = 'idle';
    this.wheelGesture = null;
    this.deckMotionDirection = -1;
    this.deckContentRevealDelayMs = PORTFOLIO_CARD_ENTRANCE_FALLBACK_DELAY_MS;
    this.deckIntroEntrance = null;
    this.deckIntroEntranceMode = '';
    this.deckOptions = { ...PORTFOLIO_DECK_DEFAULTS };
    this.particleField = null;
    this.atmosphereSourceCleanup = null;
    this.atmosphereRouteExiting = false;
    this.ringCopyRadius = 1;
    this.deckStage = null;
    this.deckPin = null;
    this.deckViewport = null;
    this.deckMetrics = {
      stageWidth: 0,
      stageHeight: 0,
      pathRadius: PORTFOLIO_DECK_DEFAULTS.pathRadiusPx,
      angleStepDeg: PORTFOLIO_DECK_DEFAULTS.angleStepDeg,
      sideRotationDeg: PORTFOLIO_DECK_DEFAULTS.sideRotationDeg,
      farRotationDeg: PORTFOLIO_DECK_DEFAULTS.farRotationDeg,
      sideScale: PORTFOLIO_DECK_DEFAULTS.sideScale,
      farScale: PORTFOLIO_DECK_DEFAULTS.farScale,
      cardWidth: PORTFOLIO_DECK_DEFAULTS.cardMaxWidthPx,
      cardHeight: PORTFOLIO_DECK_DEFAULTS.cardMaxHeightPx,
      minCardGap: PORTFOLIO_DECK_DEFAULTS.minCardGapPx,
      maxVisibleOffset: 5,
    };
    this.dotDial = null;
    this.dotDialDots = [];
    this.deckStatus = null;
    this.pendingDeckFocusIndex = -1;
    this.pendingDeckAnnounce = false;
    this.suppressNextCardClick = false;
    this.pressedCardState = null;
    this.pressOpenTimer = 0;
    this.projectHandoff = null;
    this.projectOpenPhase = 'closed';
    this.projectOpenDebug = null;
    this.pendingProjectIntent = null;
    this.destroyed = false;
    this.pointerState = null;
    this.isProjectOpen = false;
    this.selectedProjectIndex = -1;
    this.lastFocusedElement = null;
    this.projectDrawerView = null;
    this.projectFocusTimeouts = [];
    this.videoObserver = null;
    this.cardObserver = null;
    this.portfolioWheelSfxPreviousConfig = null;
    this.portfolioWheelSfxConfigured = false;
    this.portfolioSfxLastFrameAt = 0;
    this.portfolioSfxLastPosition = 0;
    this.portfolioSfxLastCenterPosition = 0;
    this.lastPortfolioActionSoundAt = -Infinity;
    this.lastPortfolioCenterSoundAt = -Infinity;
    this.unregisterRouteTransitionParticipant = null;
    this.thumbnailReadinessPromise = null;
    this.entrancePromise = null;
    this.entranceAbortController = null;
    this.entranceRankedCards = [];
    this.routeCompletionObserver = null;
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
    this.boundAccessGranted = (event) => this.handleProjectAccessGranted(event);
    this.boundAccessDismissed = (event) => this.handleProjectAccessDismissed(event);
    this.boundResize = () => {
      if (this.projectHandoff?.state === 'opening' || this.projectHandoff?.state === 'preparing') {
        this.projectHandoff.abort({ settle: 'open', reason: 'resize-settle-open' });
      } else if (this.projectHandoff?.state === 'closing') {
        this.projectHandoff.abort({ settle: 'closed', reason: 'resize-settle-closed' });
      }
      this.updateCardMetrics();
      this.particleField?.resize();
    };
    this.boundPaletteChange = () => {
      this.applyProjectPalette();
      this.particleField?.refreshPalette();
    };
  }

  async init(signal, { routeTransition = false } = {}) {
    this.destroyed = false;
    if (signal?.aborted) return false;
    this.ensureAnnouncer();
    this.configurePortfolioSfx();
    this.createProjectView();
    this.renderProjectDeck();
    this.registerRouteParticipant();
    this.particleField = new PortfolioParticleField(
      document.querySelector('.portfolio-speed-field-canvas'),
      {
        ...this.deckOptions.particleField,
        onSuspensionChange: (suspended) => this.syncAtmosphereSource(suspended),
      }
    );
    this.syncAtmosphereSource(true);
    this.thumbnailReadinessPromise = this.prepareProjectThumbnails();
    await this.thumbnailReadinessPromise;
    if (signal?.aborted) return false;
    this.setupDeckEvents();
    this.applyProjectPalette();
    if (!routeTransition) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (signal?.aborted) return false;
    }
    this.updateCardMetrics();
    this.particleField.start();
    this.syncAtmosphereSource(false);
    this.setActiveProject(0, { immediate: true });
    this.setupVideoObserver();
    document.addEventListener('abs:portfolio:open-project', this.boundAuditOpenProject);
    window.addEventListener('abs:portfolio:access-granted', this.boundAccessGranted);
    window.addEventListener('abs:portfolio:access-dismissed', this.boundAccessDismissed);
    window.addEventListener('resize', this.boundResize, { passive: true });
    window.addEventListener('bb:paletteChanged', this.boundPaletteChange);

    const globals = getGlobals();
    globals.portfolioProjects = this.projects;
    globals.portfolioDomLabels = true;
    globals.portfolioSyncLabelLayer = () => this.updateCardMetrics();
    globals.portfolioRelayoutLabels = () => this.updateCardMetrics();
    installPortfolioAuditBridge(this);
    return true;
  }

  syncAtmosphereSource(suspended = this.particleField?.suspended === true) {
    if (this.atmosphereRouteExiting) return;
    this.atmosphereSourceCleanup?.();
    this.atmosphereSourceCleanup = null;
    if (this.destroyed) return;

    const canvas = this.particleField?.canvas || null;
    const useAmbientFallback = suspended || !canvas;
    this.atmosphereSourceCleanup = registerSimulationAtmosphereSource({
      id: useAmbientFallback ? 'portfolio:ambient' : 'portfolio:speed-field',
      routeId: 'portfolio',
      kind: useAmbientFallback ? 'ambient' : 'canvas',
      canvas: useAmbientFallback ? null : canvas,
      scheduler: 'internal',
      opacityElement: useAmbientFallback ? null : canvas,
      requestRealFrame: useAmbientFallback
        ? null
        : () => this.particleField?.primeAtmosphereSource(),
    });
  }

  registerRouteParticipant() {
    this.unregisterRouteTransitionParticipant?.();
    this.unregisterRouteTransitionParticipant = registerRouteTransitionParticipant({
      id: 'portfolio-orbital-deck',
      routeId: 'portfolio',
      prepare: ({ signal }) => this.prepareRouteEntrance({ signal }),
      exit: ({ signal }) => this.prepareRouteExit({ signal }),
      restore: () => this.restoreRouteAfterFailedExit(),
      waitUntilReady: ({ signal }) => this.waitUntilRouteReady({ signal }),
      enter: ({ signal }) => this.enterRoute({ signal, reason: 'route-in' }),
      cancel: ({ reason }) => this.cancelRouteTransition(reason),
      complete: () => this.completeRouteTransition(),
    });
  }

  getEntranceOptions() {
    return this.config?.runtime?.entrance || {};
  }

  prepareDeckIntroEntrance({ routeTransition = false, force = false } = {}) {
    const intro = this.mount?.querySelector('.portfolio-deck-intro');
    if (!intro) return null;
    const mode = routeTransition ? 'route' : 'direct';
    if (!force && this.deckIntroEntrance && this.deckIntroEntranceMode === mode) {
      return this.deckIntroEntrance;
    }
    this.deckIntroEntrance?.cancel();
    this.deckIntroEntrance = createEntranceSequence({
      scopes: intro,
      profile: routeTransition ? 'route' : 'direct',
      timingMode: routeTransition ? 'repeat' : 'first',
      reducedMotion: shouldReducePortfolioMotion(),
    });
    this.deckIntroEntranceMode = mode;
    this.deckIntroEntrance.stage();
    this.deckContentRevealDelayMs = applyPortfolioTitleTiming(
      this.mount,
      this.deckIntroEntrance,
    );
    return this.deckIntroEntrance;
  }

  applyEntranceConfiguration({ routeTransition = false } = {}) {
    if (!this.mount) return [];
    const entrance = this.getEntranceOptions();
    const baseDelayMs = routeTransition
      ? Math.max(entrance.cardStartDelayMs, this.deckContentRevealDelayMs)
      : this.deckContentRevealDelayMs;
    const stepMs = routeTransition ? entrance.cardStepMs : 40;
    if (routeTransition) {
      this.mount.style.setProperty('--portfolio-card-reveal-opacity-duration', `${entrance.cardOpacityDurationMs}ms`);
      this.mount.style.setProperty('--portfolio-card-reveal-media-duration', `${entrance.mediaBlurDurationMs}ms`);
      this.mount.style.setProperty('--portfolio-card-entrance-blur', `${entrance.mediaBlurPx}px`);
      this.mount.style.setProperty('--portfolio-indicator-reveal-duration', `${entrance.indicatorDurationMs}ms`);
      this.mount.style.setProperty('--portfolio-indicator-reveal-delay', `${entrance.indicatorDelayMs}ms`);
    } else {
      [
        '--portfolio-card-reveal-opacity-duration',
        '--portfolio-card-reveal-media-duration',
        '--portfolio-card-entrance-blur',
        '--portfolio-indicator-reveal-duration',
        '--portfolio-indicator-reveal-delay',
      ].forEach((property) => this.mount.style.removeProperty(property));
    }

    const candidates = this.cards
      .filter((card) => (
        card.dataset.ringNearest === 'true'
        && card.style.visibility !== 'hidden'
        && Number(card.dataset.orbitOffset) >= -2.51
        && Number(card.dataset.orbitOffset) <= 2.51
      ))
      .sort((cardA, cardB) => {
        const offsetA = Number(cardA.dataset.orbitOffset) || 0;
        const offsetB = Number(cardB.dataset.orbitOffset) || 0;
        const depthDifference = Math.abs(offsetA) - Math.abs(offsetB);
        if (Math.abs(depthDifference) > 0.001) return depthDifference;
        if (offsetA === offsetB) return 0;
        return offsetA > offsetB ? -1 : 1;
      })
      .slice(0, 5);

    this.cards.forEach((card) => {
      delete card.dataset.portfolioRevealRank;
      delete card.dataset.portfolioRevealSide;
      card.style.removeProperty('--portfolio-card-reveal-delay');
    });
    candidates.forEach((card, rank) => {
      const offset = Number(card.dataset.orbitOffset) || 0;
      card.dataset.portfolioRevealRank = String(rank);
      card.dataset.portfolioRevealSide = Math.abs(offset) < 0.5
        ? 'center'
        : (offset > 0 ? 'right' : 'left');
      card.style.setProperty(
        '--portfolio-card-reveal-delay',
        `${baseDelayMs + (rank * stepMs)}ms`
      );
    });
    this.entranceRankedCards = candidates;
    return candidates;
  }

  prepareRouteEntrance({ signal } = {}) {
    if (this.destroyed || signal?.aborted || !this.mount) return;
    this.cancelEntrancePromise({ preservePreparedState: true });
    this.stopDeckAnimation();
    this.pauseAllVideos();
    this.particleField?.setSuspended(true);
    this.updateCardMetrics();
    this.prepareDeckIntroEntrance({ routeTransition: true, force: true });
    this.applyEntranceConfiguration({ routeTransition: true });
    this.mount.classList.add('is-portfolio-boot-preparing', 'is-portfolio-route-transition-entrance');
    this.mount.classList.remove('is-portfolio-deck-visible', 'is-portfolio-deck-revealing');
    this.mount.dataset.portfolioEntrancePhase = 'preparing';
    this.mount.dataset.portfolioEntranceReason = 'route-in';
    this.mount.inert = true;
    this.mount.setAttribute('aria-busy', 'true');
  }

  async waitUntilRouteReady({ signal } = {}) {
    if (signal?.aborted || this.destroyed) return;
    await waitForBoundedPromise(
      this.thumbnailReadinessPromise,
      PORTFOLIO_THUMBNAIL_READY_TIMEOUT_MS + 180,
      signal,
    );
    if (signal?.aborted || this.destroyed) return;
    this.updateCardMetrics();
    this.applyEntranceConfiguration({ routeTransition: true });
    const firstFrame = await waitForAnimationFrame(signal);
    if (!firstFrame) return;
    await waitForAnimationFrame(signal);
  }

  prepareRouteExit({ signal } = {}) {
    if (signal?.aborted || this.destroyed) return;
    this.atmosphereRouteExiting = true;
    this.stopDeckAnimation();
    this.clearDeckSettleTimer();
    this.pauseAllVideos();
    this.particleField?.setSuspended(true);
    if (this.pendingProjectIntent) {
      this.clearPendingProjectIntent({ restoreFocus: false, resume: false });
    }
    if (this.projectHandoff?.state === 'preparing' || this.projectHandoff?.state === 'opening') {
      this.projectHandoff.abort({ settle: 'open', reason: 'route-exit-covered' });
    } else if (this.projectHandoff?.state === 'closing') {
      this.projectHandoff.abort({ settle: 'closed', reason: 'route-exit-covered' });
    }
    this.setDeckInputState('route-exit');
  }

  restoreRouteAfterFailedExit() {
    if (this.destroyed || !this.mount) return;
    this.atmosphereRouteExiting = false;
    this.cancelEntrancePromise();
    this.mount.classList.remove(
      'is-portfolio-boot-preparing',
      'is-portfolio-deck-revealing',
      'is-portfolio-route-transition-entrance'
    );
    this.mount.classList.add('is-portfolio-deck-visible');
    this.mount.dataset.portfolioEntrancePhase = 'complete';
    this.mount.dataset.portfolioEntranceReason = 'route-exit-restored';
    this.mount.inert = false;
    this.mount.removeAttribute('aria-busy');
    this.setDeckInputState(this.isProjectOpen ? 'drawer-open' : 'idle');
    const shouldSuspend = this.isProjectOpen || Boolean(this.pendingProjectIntent);
    const suspensionChanged = this.particleField?.suspended !== shouldSuspend;
    this.particleField?.setSuspended(shouldSuspend);
    if (!suspensionChanged) this.syncAtmosphereSource(shouldSuspend);
  }

  enterRoute({ signal, reason = 'route-in' } = {}) {
    return this.beginEntrance({ signal, reason, routeTransition: true });
  }

  cancelEntrancePromise({ preservePreparedState = false } = {}) {
    this.entranceAbortController?.abort();
    this.entranceAbortController = null;
    this.entrancePromise = null;
    this.deckIntroEntrance?.cancel();
    this.deckIntroEntrance = null;
    this.deckIntroEntranceMode = '';
    this.entranceRankedCards.forEach((card) => {
      card.getAnimations?.({ subtree: true }).forEach((animation) => animation.cancel());
    });
    this.dotDial?.getAnimations?.({ subtree: true }).forEach((animation) => animation.cancel());
    if (!preservePreparedState) this.entranceRankedCards = [];
  }

  async waitForEssentialEntranceAnimations(signal) {
    if (!(await waitForAnimationFrame(signal))) return;
    if (!(await waitForAnimationFrame(signal))) return;
    const animations = [
      ...this.entranceRankedCards.flatMap((card) => card.getAnimations?.({ subtree: true }) || []),
      ...(this.dotDial?.getAnimations?.({ subtree: true }) || []),
    ];
    if (!animations.length) return;
    const completion = Promise.allSettled(animations.map((animation) => animation.finished));
    const timeoutMs = this.getEntranceOptions().completionTimeoutMs;
    await Promise.race([
      completion,
      new Promise((resolve) => {
        const timeout = window.setTimeout(resolve, timeoutMs);
        signal?.addEventListener?.('abort', () => {
          window.clearTimeout(timeout);
          resolve();
        }, { once: true });
      }),
    ]);
  }

  beginEntrance({ signal, reason = 'runtime', routeTransition = false } = {}) {
    if (this.destroyed || signal?.aborted || !this.mount) return Promise.resolve(false);
    if (this.entrancePromise) return this.entrancePromise;
    if (
      this.mount.dataset.portfolioEntrancePhase === 'complete'
      && this.mount.classList.contains('is-portfolio-deck-visible')
    ) {
      return Promise.resolve(true);
    }
    const root = document.documentElement;
    root.classList.remove('portfolio-booting');
    root.classList.add('portfolio-loaded');
    if (document.body) document.body.dataset.portfolioLoadState = 'loaded';
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener?.('abort', abort, { once: true });
    this.entranceAbortController = controller;
    const deckIntroEntrance = this.prepareDeckIntroEntrance({ routeTransition });
    this.applyEntranceConfiguration({ routeTransition });
    this.mount.classList.toggle('is-portfolio-route-transition-entrance', routeTransition);
    this.mount.classList.remove('is-portfolio-boot-preparing');
    this.mount.classList.add('is-portfolio-deck-visible', 'is-portfolio-deck-revealing');
    this.mount.dataset.portfolioEntrancePhase = 'entering';
    this.mount.dataset.portfolioEntranceReason = reason;

    const finish = () => {
      if (controller.signal.aborted || this.destroyed || !this.mount) return false;
      this.mount.classList.remove('is-portfolio-deck-revealing', 'is-portfolio-route-transition-entrance');
      this.mount.dataset.portfolioEntrancePhase = 'complete';
      this.mount.inert = false;
      this.mount.removeAttribute('aria-busy');
      this.setDeckInputState(this.isProjectOpen ? 'drawer-open' : 'idle');
      this.entrancePromise = null;
      this.entranceAbortController = null;
      this.deckIntroEntrance = null;
      this.deckIntroEntranceMode = '';
      signal?.removeEventListener?.('abort', abort);
      return true;
    };

    if (shouldReducePortfolioMotion()) {
      void deckIntroEntrance?.play();
      finish();
      return Promise.resolve(true);
    }

    this.entrancePromise = Promise.all([
      deckIntroEntrance?.play(),
      this.waitForEssentialEntranceAnimations(controller.signal),
    ]).then(finish);
    return this.entrancePromise;
  }

  cancelRouteTransition(reason = 'cancelled') {
    this.routeCompletionObserver?.disconnect();
    this.routeCompletionObserver = null;
    this.cancelEntrancePromise({ preservePreparedState: true });
    this.pauseAllVideos();
    this.particleField?.setSuspended(true);
    if (!this.mount || this.destroyed) return;
    this.mount.classList.add('is-portfolio-boot-preparing');
    this.mount.classList.remove('is-portfolio-deck-visible', 'is-portfolio-deck-revealing');
    this.mount.dataset.portfolioEntrancePhase = 'cancelled';
    this.mount.dataset.portfolioEntranceReason = reason;
    this.mount.inert = true;
    this.mount.setAttribute('aria-busy', 'true');
  }

  completeRouteTransition() {
    this.routeCompletionObserver?.disconnect();
    this.routeCompletionObserver = null;
    const settleWhenIdle = () => {
      if (this.destroyed || getTransitionPhase() !== 'idle') return false;
      this.atmosphereRouteExiting = false;
      this.routeCompletionObserver?.disconnect();
      this.routeCompletionObserver = null;
      this.particleField?.setSuspended(this.isProjectOpen || Boolean(this.pendingProjectIntent));
      if (!this.isProjectOpen && !this.pendingProjectIntent) this.resumeVisibleVideos();
      return true;
    };
    if (settleWhenIdle()) return;
    this.routeCompletionObserver = new MutationObserver(settleWhenIdle);
    this.routeCompletionObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-abs-transition-phase'],
    });
    window.requestAnimationFrame(settleWhenIdle);
  }

  destroy() {
    this.destroyed = true;
    this.atmosphereSourceCleanup?.();
    this.atmosphereSourceCleanup = null;
    removePortfolioAuditBridge(this);
    document.removeEventListener('abs:portfolio:open-project', this.boundAuditOpenProject);
    window.removeEventListener('abs:portfolio:access-granted', this.boundAccessGranted);
    window.removeEventListener('abs:portfolio:access-dismissed', this.boundAccessDismissed);
    document.removeEventListener('keydown', this.boundProjectKeydown, true);
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('bb:paletteChanged', this.boundPaletteChange);
    this.teardownDeckEvents();
    this.stopDeckAnimation();
    this.clearDeckSettleTimer();
    this.clearPressedCard();
    this.clearProjectFocusTimeouts();
    this.projectHandoff?.destroy();
    this.restorePortfolioSfxConfig();
    this.videoObserver?.disconnect();
    this.cardObserver?.disconnect();
    this.pauseAllVideos();
    this.cancelRouteTransition('destroy');
    this.unregisterRouteTransitionParticipant?.();
    this.unregisterRouteTransitionParticipant = null;
    this.particleField?.destroy();
    this.particleField = null;
    this.projectDrawerView?.destroy();
    this.restoreBackgroundInteractivity();
    this.clearPendingProjectIntent({ restoreFocus: false, resume: false });
    if (this.mount) {
      delete this.mount.dataset.portfolioMediaReady;
      this.mount.classList.remove('is-ring-rebasing');
    }

    const globals = getGlobals();
    globals.portfolioDomLabels = false;
    globals.portfolioSyncLabelLayer = null;
    globals.portfolioRelayoutLabels = null;
    globals.__portfolioDrawerOpen = false;
  }

  applyRuntimeConfig(normalizedRuntime) {
    this.config.runtime = normalizedRuntime;
    this.applyDeckTuning();
    this.updateDeckSlots({ force: true });
    if (this.isProjectOpen && this.selectedProjectIndex >= 0 && this.projectHandoff?.state === 'open') {
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

  configurePortfolioSfx() {
    if (this.portfolioWheelSfxConfigured) return;
    this.portfolioWheelSfxPreviousConfig = typeof SoundEngine.getWheelSfxConfig === 'function'
      ? SoundEngine.getWheelSfxConfig()
      : null;
    SoundEngine.updateWheelSfxConfig?.({
      continuousEnabled: false,
      tickGainMul: 0.28,
      swishGainMul: 0,
    });
    this.portfolioWheelSfxConfigured = true;
  }

  restorePortfolioSfxConfig() {
    this.stopPortfolioCarouselSfx();
    if (this.portfolioWheelSfxConfigured && this.portfolioWheelSfxPreviousConfig) {
      SoundEngine.updateWheelSfxConfig?.(this.portfolioWheelSfxPreviousConfig);
    }
    this.portfolioWheelSfxPreviousConfig = null;
    this.portfolioWheelSfxConfigured = false;
  }

  resetPortfolioCarouselSfxSample() {
    this.portfolioSfxLastFrameAt = 0;
    this.portfolioSfxLastPosition = this.deckDisplayPosition;
    this.portfolioSfxLastCenterPosition = Math.round(this.deckDisplayPosition);
  }

  stopPortfolioCarouselSfx() {
    this.resetPortfolioCarouselSfxSample();
    SoundEngine.updateWheelSfx?.(0);
  }

  updatePortfolioCarouselSfx(timestamp) {
    if (this.isProjectOpen || shouldReducePortfolioMotion()) {
      this.stopPortfolioCarouselSfx();
      return;
    }

    const now = Number.isFinite(timestamp) ? timestamp : performance.now();
    if (!this.portfolioSfxLastFrameAt) {
      this.portfolioSfxLastFrameAt = now;
      this.portfolioSfxLastPosition = this.deckDisplayPosition;
      return;
    }

    const elapsedSeconds = Math.max(0.001, (now - this.portfolioSfxLastFrameAt) / 1000);
    const projectDelta = this.deckDisplayPosition - this.portfolioSfxLastPosition;
    const projectVelocity = projectDelta / elapsedSeconds;
    this.portfolioSfxLastFrameAt = now;
    this.portfolioSfxLastPosition = this.deckDisplayPosition;
    SoundEngine.updateWheelSfx?.(0);
    triggerDetent({
      id: 'portfolio-carousel-scroll',
      value: this.deckDisplayPosition,
      step: PORTFOLIO_CAROUSEL_DETENT_STEP,
      velocity: projectVelocity,
      minVelocity: PORTFOLIO_CAROUSEL_DETENT_MIN_VELOCITY,
      minIntervalMs: 64,
      gain: PORTFOLIO_CAROUSEL_DETENT_GAIN,
      filterHz: PORTFOLIO_CAROUSEL_DETENT_FILTER_HZ,
    });
  }

  playPortfolioActionSound() {
    const now = performance.now();
    if (now - this.lastPortfolioActionSoundAt < PORTFOLIO_ACTION_SOUND_MIN_INTERVAL_MS) return;
    this.lastPortfolioActionSoundAt = now;
    SoundEngine.playButtonPressSound?.();
  }

  playPortfolioCenterSound() {
    const now = performance.now();
    if (now - this.lastPortfolioCenterSoundAt < PORTFOLIO_CENTER_SOUND_MIN_INTERVAL_MS) return;
    this.lastPortfolioCenterSoundAt = now;
    if (typeof SoundEngine.playWheelCenterClick === 'function') {
      SoundEngine.playWheelCenterClick();
      return;
    }
    SoundEngine.playDetentClick?.({
      gain: PORTFOLIO_CAROUSEL_DETENT_GAIN,
      filterHz: PORTFOLIO_CAROUSEL_DETENT_FILTER_HZ,
    });
  }

  triggerPortfolioCenterCrossingFeedback(previousPosition, currentPosition = this.deckDisplayPosition) {
    const nextCenterPosition = Math.round(currentPosition);
    if (nextCenterPosition === this.portfolioSfxLastCenterPosition) return;
    this.portfolioSfxLastCenterPosition = nextCenterPosition;

    if (
      this.isProjectOpen
      || shouldReducePortfolioMotion()
      || !this.projects.length
      || Math.abs(currentPosition - previousPosition) < 0.0001
    ) {
      return;
    }

    triggerHaptic('step', { minIntervalMs: 180 });
    this.playPortfolioCenterSound();
  }

  createProjectView() {
    const sheetHost = document.getElementById('portfolio-sheet-host');
    const host = sheetHost || this.mount || this.canvas?.parentElement;
    if (!host) return;
    this.projectDrawerView?.destroy();
    this.projectDrawerView = new PortfolioProjectDrawer({
      host,
      resolveAsset,
      coverFallback: getPortfolioCoverFallback(),
      onRequestClose: () => {
        this.closeProject();
      },
    });
    this.projectView = this.projectDrawerView.mount();
    this.projectBack = this.projectDrawerView.backButton;
    this.projectHandoff?.destroy();
    this.projectHandoff = new PortfolioProjectHandoff({
      host,
      drawerView: this.projectDrawerView,
      getDeckStage: () => this.deckStage,
      shouldReduceMotion: shouldReducePortfolioMotion,
      onStateChange: (snapshot) => {
        this.projectOpenPhase = snapshot.state;
        this.projectOpenDebug = snapshot;
      },
      onOpened: () => {
        if (!this.isProjectOpen) return;
        this.projectOpenPhase = 'open';
        this.focusProjectBackButton();
      },
      onClosed: () => {
        if (this.isProjectOpen) this.finishProjectClose();
      },
    });
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
    intro.className = 'portfolio-deck-intro route-title-lockup';
    intro.setAttribute('aria-labelledby', 'portfolioDeckIntroTitle');

    const heading = document.createElement('h2');
    heading.id = 'portfolioDeckIntroTitle';
    heading.className = 'portfolio-deck-intro__title route-centered-page__title route-bookend-title';
    heading.dataset.routeEnter = 'identity';
    heading.dataset.routeEnterOrder = '0';
    heading.dataset.routeEnterVariant = 'bookend-title';
    heading.dataset.routeFocusTarget = '';
    heading.tabIndex = -1;
    heading.textContent = title;
    prepareBookendTitleGlyphs(heading);

    const rule = document.createElement('span');
    rule.className = 'route-title-lockup__rule';
    rule.setAttribute('aria-hidden', 'true');

    const copy = document.createElement('p');
    copy.className = 'portfolio-deck-intro__body route-centered-page__description route-intro-description';
    copy.dataset.routeEnter = 'context';
    copy.dataset.routeEnterVariant = 'bookend-description';
    copy.textContent = body;

    intro.append(heading, rule, copy);
    return intro;
  }

  renderProjectDeck() {
    if (!this.mount) return;
    this.mount.replaceChildren();
    this.mount.classList.add('is-deck-ready');
    this.applyDeckTuning();
    this.ringCopyRadius = this.getRingCopyRadius();

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

    this.cards = [];
    let instanceIndex = 0;
    for (let cycleIndex = -this.ringCopyRadius; cycleIndex <= this.ringCopyRadius; cycleIndex += 1) {
      for (let projectIndex = 0; projectIndex < this.projects.length; projectIndex += 1) {
        const continuousIndex = (cycleIndex * this.projects.length) + projectIndex;
        const card = this.createProjectCard(projectIndex, {
          instanceIndex,
          cycleIndex,
          continuousIndex,
        });
        viewport.appendChild(card);
        this.cards.push(card);
        instanceIndex += 1;
      }
    }

    const dotDial = this.createDotDial();

    const status = document.createElement('div');
    status.className = 'screen-reader portfolio-deck-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');

    pin.append(intro, viewport, dotDial, mist, status);
    stage.append(pin);
    this.mount.appendChild(stage);
    applyBookendTitleKerning(intro.querySelector('[data-route-enter-variant="bookend-title"]'));
    this.deckStage = stage;
    this.deckPin = pin;
    this.deckViewport = viewport;
    this.dotDial = dotDial;
    this.deckStatus = status;
  }

  createProjectCard(projectIndex, { instanceIndex, cycleIndex, continuousIndex }) {
    const project = this.projects[projectIndex];
    const labelContent = resolvePortfolioLabelContent(project, project?.title || `Project ${projectIndex + 1}`);
    const spokenLabel = labelContent.eyebrow
      ? `${labelContent.eyebrow}: ${labelContent.title}`
      : labelContent.title;
    const card = document.createElement('article');
    card.className = 'portfolio-project-card portfolio-deck-card portfolio-project-label';
    card.dataset.cardInstanceKey = `${String(project?.id || `project-${projectIndex + 1}`)}:${cycleIndex}`;
    card.dataset.instanceIndex = String(instanceIndex);
    card.dataset.ringCycle = String(cycleIndex);
    card.dataset.continuousIndex = String(continuousIndex);
    card.dataset.projectIndex = String(projectIndex);
    card.dataset.projectId = String(project?.id || `project-${projectIndex + 1}`);
    card.dataset.projectAccess = getProjectAccessMode(project);
    applyProjectCardTheme(card, project, projectIndex, this.projects.length);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '-1');
    card.setAttribute('aria-haspopup', 'dialog');
    card.setAttribute('aria-controls', 'portfolioProjectView');
    card.setAttribute('aria-expanded', 'false');
    card.setAttribute('aria-label', `Open project ${projectIndex + 1}: ${spokenLabel}`);
    card.draggable = false;

    const copy = document.createElement('div');
    copy.className = 'portfolio-project-card__copy';

    const client = document.createElement('p');
    client.className = 'portfolio-project-card__client';
    client.textContent = project?.client || project?.eyebrow || `Project ${projectIndex + 1}`;

    const title = document.createElement('h3');
    title.className = 'portfolio-project-card__title portfolio-project-label__text';
    const titleText = document.createElement('span');
    titleText.className = 'portfolio-project-card__title-text';
    titleText.textContent = project?.displayTitle || project?.title || labelContent.title;
    title.append(titleText);

    const tags = document.createElement('ul');
    tags.className = 'portfolio-project-card__tags';
    tags.setAttribute('aria-label', 'Project tags');
    tags.hidden = true;
    getProjectTags(project).forEach((tag) => {
      const item = document.createElement('li');
      item.textContent = tag;
      tags.appendChild(item);
    });

    copy.append(client, title);
    if (tags.childElementCount) copy.appendChild(tags);

    const media = this.createProjectCardMedia(project, projectIndex, {
      attachVideo: Boolean(getProjectVideoSrc(project) && !shouldReducePortfolioMotion()),
      eager: true,
    });
    const material = document.createElement('div');
    material.className = 'portfolio-project-card__material';
    material.setAttribute('aria-hidden', 'true');
    material.appendChild(media);

    const surface = document.createElement('div');
    surface.className = 'portfolio-project-card__surface';
    surface.append(material, copy);

    card.appendChild(surface);
    card.addEventListener('click', (event) => this.handleCardClick(event, card));
    card.addEventListener('keydown', (event) => this.handleCardKeydown(event, card));
    card.addEventListener('pointerenter', () => {
      const currentProject = this.projects[this.getCardProjectIndex(card)];
      this.prefetchProjectAssets(currentProject);
    });
    card.addEventListener('focus', () => {
      card.classList.add('is-keyboard-focused');
    });
    card.addEventListener('blur', () => card.classList.remove('is-keyboard-focused'));
    return card;
  }

  createDotDial() {
    const dotDial = document.createElement('div');
    dotDial.className = 'portfolio-carousel-dot-dial';
    dotDial.setAttribute('aria-hidden', 'true');
    const dotCount = Math.max(1, Math.round(toNumber(this.deckOptions.dotDensity, PORTFOLIO_DECK_DEFAULTS.dotDensity)));
    this.dotDialDots = Array.from({ length: dotCount }, (_, index) => {
      const dot = document.createElement('span');
      dot.className = 'portfolio-carousel-dot';
      dot.dataset.dotIndex = String(index);
      dotDial.appendChild(dot);
      return dot;
    });
    return dotDial;
  }

  syncDotDialDensity(dotCount) {
    if (!this.dotDial) return;
    const nextCount = Math.max(1, Math.round(dotCount));
    while (this.dotDialDots.length > nextCount) {
      this.dotDialDots.pop()?.remove();
    }
    while (this.dotDialDots.length < nextCount) {
      const dot = document.createElement('span');
      dot.className = 'portfolio-carousel-dot';
      this.dotDial.appendChild(dot);
      this.dotDialDots.push(dot);
    }
    this.dotDialDots.forEach((dot, index) => {
      dot.dataset.dotIndex = String(index);
    });
  }

  createProjectCardMedia(project, index, options = {}) {
    const frame = document.createElement('figure');
    frame.className = 'portfolio-project-card__media';
    frame.setAttribute('aria-hidden', 'true');
    const usesColourPlaceholder = project?.mediaMode === 'colour';
    if (usesColourPlaceholder) {
      frame.dataset.mediaMode = 'colour';
      frame.style.setProperty(
        '--portfolio-card-placeholder-colour',
        String(project?.thumbnailColor || project?.heroColor || project?.thumbnailAccent || '#c8102e')
      );
    }
    const imageSrc = getProjectImageSrc(project);
    const videoSrc = options.attachVideo ? getProjectVideoSrc(project) : '';
    const reduceMotion = shouldReducePortfolioMotion();
    if (imageSrc) frame.dataset.mediaSrc = resolveAsset(imageSrc);

    if (videoSrc && !reduceMotion) {
      const video = document.createElement('video');
      video.className = 'portfolio-project-card__video';
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = false;
      video.preload = 'metadata';
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
      image.draggable = false;
      image.loading = 'eager';
      image.decoding = 'async';
      const thumbnailPosition = project?.thumbnailPosition || project?.thumbnailFocalPoint || '';
      if (thumbnailPosition) image.style.objectPosition = String(thumbnailPosition);
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

  getRingCopyRadius() {
    const projectCount = Math.max(1, this.projects.length);
    const requiredRadius = PORTFOLIO_RING_MAX_VISIBLE_OFFSET + PORTFOLIO_RING_GUARD_SLOTS;
    return Math.max(1, Math.ceil(requiredRadius / projectCount));
  }

  waitForThumbnailSource(src) {
    return warmPortfolioThumbnail(src);
  }

  replaceFailedThumbnail(frame) {
    if (!frame || frame.querySelector('video')) return;
    const image = frame.querySelector('.portfolio-project-card__image');
    if (!image) return;
    const fallback = document.createElement('div');
    fallback.className = 'portfolio-project-card__media-fallback';
    image.replaceWith(fallback);
  }

  async prepareProjectThumbnails() {
    if (!this.mount) return;
    const criticalProjectIndexes = [0, 1, -1, 2, -2]
      .map((offset) => this.wrapProjectIndex(this.activeProjectIndex + offset));
    const sources = Array.from(new Set(
      criticalProjectIndexes
        .map((index) => this.projects[index])
        .map((project) => getProjectImageSrc(project))
        .filter(Boolean)
        .map((src) => resolveAsset(src))
    ));
    const results = await Promise.all(sources.map((src) => this.waitForThumbnailSource(src)));
    const failedSources = new Set(results.filter((result) => !result.ready).map((result) => result.src));
    if (failedSources.size) {
      this.cards.forEach((card) => {
        const frame = card.querySelector('.portfolio-project-card__media');
        if (frame && failedSources.has(frame.dataset.mediaSrc || '')) this.replaceFailedThumbnail(frame);
      });
    }
    this.mount.dataset.portfolioMediaReady = 'true';
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
    this.cards.forEach((card) => {
      const index = this.getCardProjectIndex(card);
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
    const deck = runtime.carousel || runtime.deck || {};
    const motionDeck = runtime.motion?.deck || {};
    return {
      ...PORTFOLIO_DECK_DEFAULTS,
      ...deck,
      ...motionDeck,
      particleField: {
        ...PORTFOLIO_DECK_DEFAULTS.particleField,
        ...(deck.speedField || {}),
        ...(deck.particleField || {}),
        ...(motionDeck.speedField || {}),
        ...(motionDeck.particleField || {}),
      },
    };
  }

  getCardProjectIndex(card) {
    const index = Number(card?.dataset?.projectIndex);
    return Number.isInteger(index) ? this.wrapProjectIndex(index) : 0;
  }

  getCardContinuousIndex(card) {
    const index = Number(card?.dataset?.continuousIndex);
    return Number.isFinite(index) ? index : 0;
  }

  getActiveProjectCard(projectIndex = this.activeProjectIndex) {
    return this.cards.find((card) => {
      return this.getCardProjectIndex(card) === this.wrapProjectIndex(projectIndex)
        && card.classList.contains('is-active');
    }) || null;
  }

  getTitleClearanceCenterYPercent({
    stageHeight,
    cardHeight,
    clearancePx = null,
    viewportOffsetPx = 0,
  }) {
    const stage = this.deckStage || this.mount;
    const intro = stage?.querySelector?.('.portfolio-deck-intro');
    if (!intro || !stage || !(stageHeight > 0) || !(cardHeight > 0)) return 0;

    const introRect = intro.getBoundingClientRect?.();
    const stageRect = stage.getBoundingClientRect?.();
    if (
      !introRect ||
      !stageRect ||
      introRect.width <= 0 ||
      introRect.height <= 0 ||
      stageRect.height <= 0
    ) {
      return 0;
    }

    // Keep every responsive orbit seat below the complete intro block. The
    // configured seat still wins whenever it already provides more breathing room.
    const resolvedClearancePx = Number.isFinite(clearancePx)
      ? clearancePx
      : clamp(stageHeight * 0.02, 12, 24);
    const introBottom = introRect.bottom - stageRect.top;
    return (
      (
        introBottom
        + resolvedClearancePx
        + (cardHeight * 0.5)
        - viewportOffsetPx
      )
      / stageHeight
    ) * 100;
  }

  applyDeckTuning() {
    if (!this.mount) return;
    this.deckOptions = this.resolveDeckOptions();
    const stageWidth = this.deckStage?.clientWidth || this.mount.clientWidth || window.innerWidth || 1440;
    const stageHeight = this.deckStage?.clientHeight || this.mount.clientHeight || window.innerHeight || 900;
    const responsiveT = clamp((stageWidth - 390) / (1180 - 390), 0, 1);
    const desktopCardWidthPercent = clamp(toNumber(this.deckOptions.cardWidthPercent, PORTFOLIO_DECK_DEFAULTS.cardWidthPercent), 16, 42);
    const mobileCardWidthPercent = clamp(toNumber(this.deckOptions.mobileCardWidthPercent, PORTFOLIO_DECK_DEFAULTS.mobileCardWidthPercent), 60, 92);
    const cardWidthPercent = lerp(mobileCardWidthPercent, desktopCardWidthPercent, responsiveT);
    const largeViewportWidthStartPx = clamp(
      toNumber(this.deckOptions.largeViewportWidthStartPx, PORTFOLIO_DECK_DEFAULTS.largeViewportWidthStartPx),
      900,
      2200
    );
    const largeViewportWidthEndPx = clamp(
      toNumber(this.deckOptions.largeViewportWidthEndPx, PORTFOLIO_DECK_DEFAULTS.largeViewportWidthEndPx),
      largeViewportWidthStartPx + 1,
      3840
    );
    const largeViewportHeightStartPx = clamp(
      toNumber(this.deckOptions.largeViewportHeightStartPx, PORTFOLIO_DECK_DEFAULTS.largeViewportHeightStartPx),
      600,
      1200
    );
    const largeViewportHeightEndPx = clamp(
      toNumber(this.deckOptions.largeViewportHeightEndPx, PORTFOLIO_DECK_DEFAULTS.largeViewportHeightEndPx),
      largeViewportHeightStartPx + 1,
      2160
    );
    const largeViewportCardScaleMax = clamp(
      toNumber(this.deckOptions.largeViewportCardScaleMax, PORTFOLIO_DECK_DEFAULTS.largeViewportCardScaleMax),
      1,
      2.4
    );
    const largeViewportContentScaleMax = clamp(
      toNumber(this.deckOptions.largeViewportContentScaleMax, PORTFOLIO_DECK_DEFAULTS.largeViewportContentScaleMax),
      1,
      1.8
    );
    const largeViewportWidthProgress = clamp(
      (stageWidth - largeViewportWidthStartPx)
        / (largeViewportWidthEndPx - largeViewportWidthStartPx),
      0,
      1
    );
    const largeViewportHeightProgress = clamp(
      ((window.innerHeight || stageHeight) - largeViewportHeightStartPx)
        / (largeViewportHeightEndPx - largeViewportHeightStartPx),
      0,
      1
    );
    const largeViewportProgress = Math.min(
      largeViewportWidthProgress,
      largeViewportHeightProgress
    );
    const largeViewportCardScale = lerp(1, largeViewportCardScaleMax, largeViewportProgress);
    const largeViewportContentScale = lerp(1, largeViewportContentScaleMax, largeViewportProgress);
    const desktopCardMaxWidthPx = clamp(toNumber(this.deckOptions.cardMaxWidthPx, PORTFOLIO_DECK_DEFAULTS.cardMaxWidthPx), 220, 620)
      * largeViewportCardScale;
    const mobileCardMaxWidthPx = clamp(toNumber(this.deckOptions.mobileCardMaxWidthPx, PORTFOLIO_DECK_DEFAULTS.mobileCardMaxWidthPx), 240, 520);
    const cardMaxWidthPx = lerp(mobileCardMaxWidthPx, desktopCardMaxWidthPx, responsiveT);
    const desktopCardHeightCqh = clamp(toNumber(this.deckOptions.cardHeightCqh, PORTFOLIO_DECK_DEFAULTS.cardHeightCqh), 36, 68);
    const mobileCardHeightCqh = clamp(toNumber(this.deckOptions.mobileCardHeightCqh, PORTFOLIO_DECK_DEFAULTS.mobileCardHeightCqh), 42, 72);
    const cardHeightCqh = lerp(mobileCardHeightCqh, desktopCardHeightCqh, responsiveT);
    const desktopCardMaxHeightPx = clamp(toNumber(this.deckOptions.cardMaxHeightPx, PORTFOLIO_DECK_DEFAULTS.cardMaxHeightPx), 340, 620)
      * largeViewportCardScale;
    const mobileCardMaxHeightPx = clamp(toNumber(this.deckOptions.mobileCardMaxHeightPx, PORTFOLIO_DECK_DEFAULTS.mobileCardMaxHeightPx), 380, 620);
    const cardMaxHeightPx = lerp(mobileCardMaxHeightPx, desktopCardMaxHeightPx, responsiveT);
    const desktopCenterYPercent = clamp(toNumber(this.deckOptions.centerYPercent, PORTFOLIO_DECK_DEFAULTS.centerYPercent), 45, 85);
    const mobileCenterYPercent = clamp(toNumber(this.deckOptions.mobileCenterYPercent, PORTFOLIO_DECK_DEFAULTS.mobileCenterYPercent), 48, 78);
    const configuredCenterYPercent = lerp(mobileCenterYPercent, desktopCenterYPercent, responsiveT);
    const viewportHeight = window.innerHeight || stageHeight;
    const desktopViewportYOffsetDvh = clamp(
      toNumber(this.deckOptions.desktopViewportYOffsetDvh, PORTFOLIO_DECK_DEFAULTS.desktopViewportYOffsetDvh),
      0,
      8
    );
    const viewportYOffsetDvh = stageWidth > 900 ? desktopViewportYOffsetDvh : 0;
    const viewportYOffsetPx = viewportHeight * viewportYOffsetDvh / 100;
    const largeViewportOrbitCapStartProgress = clamp(
      toNumber(
        this.deckOptions.largeViewportOrbitCapStartProgress,
        PORTFOLIO_DECK_DEFAULTS.largeViewportOrbitCapStartProgress
      ),
      0,
      0.95
    );
    const largeViewportOrbitCapProgress = stageWidth > 900
      ? smoothstep(largeViewportOrbitCapStartProgress, 1, largeViewportProgress)
      : 0;
    const largeViewportTitleCardGapDvh = clamp(
      toNumber(
        this.deckOptions.largeViewportTitleCardGapDvh,
        PORTFOLIO_DECK_DEFAULTS.largeViewportTitleCardGapDvh
      ),
      4,
      12
    );
    const largeViewportGroupOffsetHeightEndPx = clamp(
      toNumber(
        this.deckOptions.largeViewportGroupOffsetHeightEndPx,
        PORTFOLIO_DECK_DEFAULTS.largeViewportGroupOffsetHeightEndPx
      ),
      largeViewportHeightEndPx + 1,
      2400
    );
    const largeViewportGroupOffsetMaxDvh = clamp(
      toNumber(
        this.deckOptions.largeViewportGroupOffsetMaxDvh,
        PORTFOLIO_DECK_DEFAULTS.largeViewportGroupOffsetMaxDvh
      ),
      0,
      12
    );
    const largeViewportGroupOffsetProgress = smoothstep(
      largeViewportHeightEndPx,
      largeViewportGroupOffsetHeightEndPx,
      viewportHeight
    ) * smoothstep(0.85, 1, largeViewportWidthProgress);
    const largeViewportGroupOffsetDvh = stageWidth > 900
      ? largeViewportGroupOffsetMaxDvh * largeViewportGroupOffsetProgress
      : 0;
    const introYOffsetDvh = clamp(
      toNumber(this.deckOptions.introYOffsetDvh, PORTFOLIO_DECK_DEFAULTS.introYOffsetDvh),
      -12,
      12
    );
    const resolvedIntroYOffsetDvh = largeViewportGroupOffsetDvh + introYOffsetDvh;
    this.mount.style.setProperty(
      '--portfolio-deck-intro-y-offset',
      `${resolvedIntroYOffsetDvh.toFixed(4)}dvh`
    );
    const perspectivePx = clamp(toNumber(this.deckOptions.perspectivePx, PORTFOLIO_DECK_DEFAULTS.perspectivePx), 500, 2600);
    const configuredPathRadius = lerp(
      clamp(toNumber(this.deckOptions.mobilePathRadiusPx, PORTFOLIO_DECK_DEFAULTS.mobilePathRadiusPx), 420, 1400),
      clamp(toNumber(this.deckOptions.pathRadiusPx, PORTFOLIO_DECK_DEFAULTS.pathRadiusPx), 900, 3200),
      responsiveT
    );
    const configuredAngleStepDeg = lerp(
      clamp(toNumber(this.deckOptions.mobileAngleStepDeg, PORTFOLIO_DECK_DEFAULTS.mobileAngleStepDeg), 7, 24),
      clamp(toNumber(this.deckOptions.angleStepDeg, PORTFOLIO_DECK_DEFAULTS.angleStepDeg), 6, 18),
      responsiveT
    );
    const sideRotationDeg = clamp(toNumber(this.deckOptions.sideRotationDeg, PORTFOLIO_DECK_DEFAULTS.sideRotationDeg), 0, 24);
    const farRotationDeg = clamp(toNumber(this.deckOptions.farRotationDeg, PORTFOLIO_DECK_DEFAULTS.farRotationDeg), sideRotationDeg, 34);
    const desktopSideScale = clamp(toNumber(this.deckOptions.sideScale, PORTFOLIO_DECK_DEFAULTS.sideScale), 0.82, 1.08);
    const mobileSideScale = clamp(toNumber(this.deckOptions.mobileSideScale, PORTFOLIO_DECK_DEFAULTS.mobileSideScale), 0.62, 0.92);
    const sideScale = lerp(mobileSideScale, desktopSideScale, responsiveT);
    const farScale = Math.min(
      sideScale,
      clamp(toNumber(this.deckOptions.farScale, PORTFOLIO_DECK_DEFAULTS.farScale), 0.68, 1)
    );
    const minCardGap = lerp(
      12,
      clamp(toNumber(this.deckOptions.minCardGapPx, PORTFOLIO_DECK_DEFAULTS.minCardGapPx), 8, 48),
      responsiveT
    );
    const dotDialRadius = lerp(
      clamp(toNumber(this.deckOptions.mobileDotDialRadiusPx, PORTFOLIO_DECK_DEFAULTS.mobileDotDialRadiusPx), 520, 1600),
      clamp(toNumber(this.deckOptions.dotDialRadiusPx, PORTFOLIO_DECK_DEFAULTS.dotDialRadiusPx), 900, 3600),
      responsiveT
    );
    const contactShadowOpacity = clamp(
      toNumber(this.deckOptions.contactShadowOpacity, PORTFOLIO_DECK_DEFAULTS.contactShadowOpacity),
      0,
      0.18
    );
    let maxVisibleOffset = Math.min(
      PORTFOLIO_RING_MAX_VISIBLE_OFFSET,
      stageWidth >= 1700 ? 3 : (stageWidth >= 1180 ? 2 : 1)
    );
    const cardWidth = Math.min(stageWidth * cardWidthPercent / 100, cardMaxWidthPx);
    const cardHeight = stageWidth <= 900
      ? cardWidth * (461 / 316)
      : clamp(stageHeight * cardHeightCqh / 100, 260, cardMaxHeightPx);
    const titleClearanceCenterYPercent = this.getTitleClearanceCenterYPercent({ stageHeight, cardHeight });
    const uncappedCenterYPercent = clamp(
      Math.max(configuredCenterYPercent, titleClearanceCenterYPercent),
      45,
      stageWidth <= 900 ? 82 : 85
    );
    const largeViewportCappedCenterYPercent = this.getTitleClearanceCenterYPercent({
      stageHeight,
      cardHeight,
      clearancePx: viewportHeight * largeViewportTitleCardGapDvh / 100,
      viewportOffsetPx: viewportYOffsetPx,
    });
    const centerYPercent = lerp(
      uncappedCenterYPercent,
      Math.min(uncappedCenterYPercent, largeViewportCappedCenterYPercent),
      largeViewportOrbitCapProgress
    );
    const sliderYOffsetDvh = clamp(
      toNumber(this.deckOptions.sliderYOffsetDvh, PORTFOLIO_DECK_DEFAULTS.sliderYOffsetDvh),
      -12,
      12
    );
    const resolvedViewportYOffsetDvh = viewportYOffsetDvh + sliderYOffsetDvh;
    const resolvedCenterYRatio = clamp(
      (
        (stageHeight * centerYPercent / 100)
        + (viewportHeight * resolvedViewportYOffsetDvh / 100)
      ) / stageHeight,
      0,
      1
    );
    this.particleField?.configure({
      ...this.deckOptions.particleField,
      quietBandCenterY: resolvedCenterYRatio,
    });
    const getScaleAtOffset = (offset) => {
      const absOffset = Math.abs(offset);
      if (absOffset <= 1) return lerp(1, sideScale, absOffset);
      return lerp(
        sideScale,
        farScale,
        clamp((absOffset - 1) / Math.max(1, maxVisibleOffset - 1), 0, 1)
      );
    };
    const getRotationAtOffset = (offset) => lerp(
      sideRotationDeg,
      farRotationDeg,
      clamp((Math.abs(offset) - 1) / Math.max(1, maxVisibleOffset - 1), 0, 1)
    ) * Math.min(1, Math.abs(offset));
    const getProjectedCardWidth = (offset) => {
      const rotationRad = (getRotationAtOffset(offset) * Math.PI) / 180;
      return getScaleAtOffset(offset) * (
        (cardWidth * Math.abs(Math.cos(rotationRad)))
        + (cardHeight * Math.abs(Math.sin(rotationRad)))
      );
    };
    const orbitFits = (angleStepRad) => {
      const halfStepSeparation = 2 * configuredPathRadius * Math.sin(angleStepRad * 0.5);
      if (halfStepSeparation < getProjectedCardWidth(0.5) + minCardGap) return false;
      for (let offset = 1; offset <= maxVisibleOffset; offset += 1) {
        const orbitStep = Math.sin(offset * angleStepRad) - Math.sin((offset - 1) * angleStepRad);
        if (orbitStep <= 0.001) return false;
        const requiredGap = (
          (getProjectedCardWidth(offset - 1) + getProjectedCardWidth(offset)) * 0.5
        ) + minCardGap;
        if ((configuredPathRadius * orbitStep) < requiredGap) return false;
      }
      return true;
    };
    const configuredAngleStepRad = (configuredAngleStepDeg * Math.PI) / 180;
    let angleStepRad = configuredAngleStepRad;
    while (maxVisibleOffset > 1) {
      const maxAngleStepRad = (Math.min(34, 80 / maxVisibleOffset) * Math.PI) / 180;
      if (orbitFits(maxAngleStepRad)) break;
      maxVisibleOffset -= 1;
    }
    if (!orbitFits(angleStepRad)) {
      let low = angleStepRad;
      let high = (Math.min(34, 80 / maxVisibleOffset) * Math.PI) / 180;
      for (let iteration = 0; iteration < 18; iteration += 1) {
        const candidate = (low + high) * 0.5;
        if (orbitFits(candidate)) high = candidate;
        else low = candidate;
      }
      angleStepRad = high;
    }
    const angleStepDeg = (angleStepRad * 180) / Math.PI;
    const pathRadius = configuredPathRadius;
    this.deckMetrics = {
      stageWidth,
      stageHeight,
      configuredPathRadius,
      pathRadius,
      configuredAngleStepDeg,
      angleStepDeg,
      sideRotationDeg,
      farRotationDeg,
      sideScale,
      farScale,
      cardWidth,
      cardHeight,
      minCardGap,
      dotDialRadius,
      centerYPercent,
      sliderYOffsetDvh,
      introYOffsetDvh,
      resolvedViewportYOffsetDvh,
      resolvedIntroYOffsetDvh,
      dotArcOffsetDeg: clamp(toNumber(this.deckOptions.dotArcOffsetDeg, PORTFOLIO_DECK_DEFAULTS.dotArcOffsetDeg), -60, 60),
      maxVisibleOffset,
    };

    this.mount.style.setProperty('--portfolio-deck-card-width-fluid', `${cardWidthPercent}%`);
    this.mount.style.setProperty('--portfolio-deck-card-width-max', `${cardMaxWidthPx}px`);
    this.mount.style.setProperty('--portfolio-deck-card-height-fluid', `${cardHeightCqh}cqh`);
    this.mount.style.setProperty('--portfolio-deck-card-height-max', `${cardMaxHeightPx}px`);
    this.mount.style.setProperty('--portfolio-deck-center-y', `${centerYPercent}%`);
    this.mount.style.setProperty('--portfolio-deck-viewport-y-offset', `${resolvedViewportYOffsetDvh}dvh`);
    this.mount.style.setProperty('--portfolio-deck-perspective', `${perspectivePx}px`);
    this.mount.style.setProperty('--portfolio-card-content-scale', largeViewportContentScale.toFixed(4));
    this.mount.style.setProperty('--portfolio-carousel-path-radius', `${pathRadius}px`);
    this.mount.style.setProperty('--portfolio-carousel-dot-radius', `${dotDialRadius}px`);
    const dotCount = Math.round(toNumber(this.deckOptions.dotDensity, PORTFOLIO_DECK_DEFAULTS.dotDensity));
    this.mount.style.setProperty('--portfolio-carousel-dot-count', String(dotCount));
    this.syncDotDialDensity(dotCount);
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
      && !this.deckIsSettling
      && this.deckInputState === 'idle';
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
    if (!count) return this.getDeckPoseForOffset(0);
    const continuousIndex = this.getNearestContinuousPositionForIndex(index, position);
    return this.getDeckPoseForOffset(continuousIndex - position);
  }

  getDeckPoseForOffset(offset) {
    const metrics = this.deckMetrics || {};
    const maxVisibleOffset = Math.max(1, metrics.maxVisibleOffset || 1);
    const rawAbsOffset = Math.abs(offset);
    const orbitOffset = clamp(offset, -(maxVisibleOffset + 1), maxVisibleOffset + 1);
    const absOffset = Math.abs(orbitOffset);
    const sideProgress = clamp(absOffset / maxVisibleOffset, 0, 1);
    const angleDeg = orbitOffset * (metrics.angleStepDeg || PORTFOLIO_DECK_DEFAULTS.angleStepDeg);
    const angleRad = (angleDeg * Math.PI) / 180;
    const radius = metrics.pathRadius || PORTFOLIO_DECK_DEFAULTS.pathRadiusPx;
    const x = Math.sin(angleRad) * radius;
    const y = radius * (1 - Math.cos(angleRad)) * 0.88;
    const rotateZ = Math.sign(orbitOffset)
      * lerp(
        metrics.sideRotationDeg || PORTFOLIO_DECK_DEFAULTS.sideRotationDeg,
        metrics.farRotationDeg || PORTFOLIO_DECK_DEFAULTS.farRotationDeg,
        clamp((absOffset - 1) / Math.max(1, maxVisibleOffset - 1), 0, 1)
      )
      * Math.min(1, absOffset);
    const scale = absOffset <= 1
      ? lerp(1, metrics.sideScale || PORTFOLIO_DECK_DEFAULTS.sideScale, absOffset)
      : lerp(
        metrics.sideScale || PORTFOLIO_DECK_DEFAULTS.sideScale,
        metrics.farScale || PORTFOLIO_DECK_DEFAULTS.farScale,
        clamp((absOffset - 1) / Math.max(1, maxVisibleOffset - 1), 0, 1)
      );
    const fadeStart = maxVisibleOffset + 0.1;
    const fadeEnd = maxVisibleOffset + 0.9;
    const orbitOpacity = 1 - smoothstep(fadeStart, fadeEnd, rawAbsOffset);
    const rotationRad = (rotateZ * Math.PI) / 180;
    const projectedCardWidth = scale * (
      ((metrics.cardWidth || PORTFOLIO_DECK_DEFAULTS.cardMaxWidthPx) * Math.abs(Math.cos(rotationRad)))
      + ((metrics.cardHeight || PORTFOLIO_DECK_DEFAULTS.cardMaxHeightPx) * Math.abs(Math.sin(rotationRad)))
    );
    const stageHalfWidth = Math.max(1, (metrics.stageWidth || window.innerWidth || 1440) * 0.5);
    const edgePenetration = stageHalfWidth - (Math.abs(x) - (projectedCardWidth * 0.5));
    const entryFadeDistance = clamp(projectedCardWidth * 0.42, 48, 180);
    const edgeOpacity = smoothstep(0, entryFadeDistance, edgePenetration);
    const edgePresence = lerp(PORTFOLIO_CARD_EDGE_MIN_OPACITY, 1, edgeOpacity);
    const opacity = orbitOpacity * edgePresence;
    const activeAmount = clamp(1 - absOffset, 0, 1);
    const slot = Math.abs(orbitOffset) < 0.52 ? '0' : String(Math.round(orbitOffset));
    return {
      slot,
      visualSlot: activeAmount > 0.48 ? 'front' : (orbitOffset < 0 ? 'left' : 'right'),
      zone: activeAmount > 0.48 ? 'active-orbit' : 'side-orbit',
      depth: rawAbsOffset,
      depthLabel: String(Math.round(rawAbsOffset)),
      zIndex: Math.max(1, Math.round(700 - (rawAbsOffset * 22))),
      x,
      y,
      z: -rawAbsOffset * 18,
      rotateX: 0,
      rotateZ,
      scale,
      blur: rawAbsOffset > maxVisibleOffset ? 0.25 : 0,
      saturate: lerp(1, 0.88, sideProgress),
      opacity,
      visibility: rawAbsOffset > fadeEnd + 0.05 ? 'hidden' : 'visible',
      pointerEvents: this.isProjectOpen || rawAbsOffset > maxVisibleOffset + 0.01 || opacity <= 0.15 ? 'none' : 'auto',
    };
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
    card.style.setProperty('--portfolio-card-rotate-z', `${(pose.rotateZ || 0).toFixed(2)}deg`);
    card.style.setProperty('--portfolio-card-scale', pose.scale.toFixed(4));
    card.style.setProperty('--portfolio-card-pose-blur', `${pose.blur.toFixed(2)}px`);
    card.style.setProperty('--portfolio-card-pose-saturate', pose.saturate.toFixed(3));
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

    const nearestPosition = Math.round(this.deckDisplayPosition);
    this.cards.forEach((card) => {
      const continuousIndex = this.getCardContinuousIndex(card);
      const projectIndex = this.getCardProjectIndex(card);
      const offset = continuousIndex - this.deckDisplayPosition;
      const isActive = continuousIndex === nearestPosition && projectIndex === this.activeProjectIndex;
      const nearestProjectPosition = this.getNearestContinuousPositionForIndex(projectIndex, this.deckDisplayPosition);
      const isNearestProjectInstance = continuousIndex === nearestProjectPosition;
      const pose = this.getDeckPoseForOffset(offset);
      if (!isNearestProjectInstance) pose.pointerEvents = 'none';
      this.applyDeckCardPose(card, pose);
      card.dataset.orbitOffset = offset.toFixed(4);
      card.dataset.ringNearest = isNearestProjectInstance ? 'true' : 'false';
      card.classList.toggle('is-active', isActive);
      card.classList.toggle('is-depth-card', !isActive);
      card.classList.toggle('is-depth-1', Math.round(Math.abs(offset)) === 1);
      card.classList.toggle('is-depth-2', Math.round(Math.abs(offset)) === 2);
      card.classList.toggle('is-left-card', offset < -0.5);
      card.classList.toggle('is-right-card', offset > 0.5);
      card.setAttribute('tabindex', isActive && !this.isProjectOpen && this.isDeckPositionSettled() ? '0' : '-1');
      card.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      card.setAttribute('aria-expanded', this.isProjectOpen && isActive && projectIndex === this.selectedProjectIndex ? 'true' : 'false');
    });
    this.mount?.style.setProperty('--portfolio-deck-active-index', String(this.activeProjectIndex));
    this.mount?.style.setProperty('--portfolio-deck-scroll-progress', String(this.deckDisplayPosition));
    this.updateDotDial();
    if (activeChanged || options.activeChanged || options.force) {
      this.updateDeckStatus();
      this.updateVideoPlayback();
    }
    if (activeChanged && !this.isProjectOpen && shouldReducePortfolioMotion()) {
      triggerHaptic('step', { minIntervalMs: 180 });
      this.playPortfolioCenterSound();
    }

    if (this.pendingDeckFocusIndex === this.activeProjectIndex) {
      this.getActiveProjectCard(this.activeProjectIndex)?.focus({ preventScroll: true });
      this.pendingDeckFocusIndex = -1;
    }

    if (this.pendingDeckAnnounce) {
      const project = this.projects[this.activeProjectIndex];
      const label = project?.displayTitle || project?.title || `Project ${this.activeProjectIndex + 1}`;
      announceToScreenReader(`Selected project ${this.activeProjectIndex + 1} of ${this.projects.length}: ${label}`);
      this.pendingDeckAnnounce = false;
    }
  }

  updateDotDial() {
    if (!this.dotDial || !this.dotDialDots.length) return;
    const dotCount = this.dotDialDots.length;
    const radius = this.deckMetrics?.dotDialRadius || PORTFOLIO_DECK_DEFAULTS.dotDialRadiusPx;
    const projectCount = Math.max(1, this.projects.length);
    const parallaxRatio = clamp(
      toNumber(this.deckOptions.dotParallaxRatio, PORTFOLIO_DECK_DEFAULTS.dotParallaxRatio),
      -2,
      2
    );
    const progress = this.deckDisplayPosition * parallaxRatio;
    const phaseDots = (progress / projectCount) * dotCount;
    const arcSpanDeg = clamp(
      toNumber(this.deckOptions.dotArcSpanDeg, PORTFOLIO_DECK_DEFAULTS.dotArcSpanDeg),
      8,
      34
    );
    this.dotDial.style.setProperty('--portfolio-carousel-dot-progress', String(progress));
    this.dotDialDots.forEach((dot, index) => {
      const rawPhase = (index - phaseDots) / dotCount;
      const normalized = ((((rawPhase + 0.5) % 1) + 1) % 1) - 0.5;
      const angleDeg = (normalized * arcSpanDeg) + (this.deckMetrics?.dotArcOffsetDeg || 0);
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = Math.sin(angleRad) * radius;
      const y = radius * (1 - Math.cos(angleRad));
      const wrappedDistance = Math.abs(normalized) * dotCount;
      const activeAmount = clamp(1 - (wrappedDistance / PORTFOLIO_INDICATOR_ACTIVE_RADIUS), 0, 1);
      const edgeOpacity = lerp(PORTFOLIO_INDICATOR_REST_OPACITY, 1, activeAmount);
      dot.style.setProperty('--portfolio-dot-x', `${x.toFixed(2)}px`);
      dot.style.setProperty('--portfolio-dot-y', `${y.toFixed(2)}px`);
      dot.style.setProperty('--portfolio-dot-opacity', edgeOpacity.toFixed(3));
    });
  }

  getDeckDebugSnapshot() {
    const state = this.getDeckTransitionState(this.deckDisplayPosition);
    const drawer = this.projectDrawerView?.drawer || null;
    const drawerStyles = drawer ? getComputedStyle(drawer) : null;
    const deckStageStyles = this.deckStage ? getComputedStyle(this.deckStage) : null;
    const handoffSnapshot = this.projectHandoff?.getSnapshot?.() || null;
    const targetLead = this.deckTargetPosition - this.deckDisplayPosition;
    return {
      targetPosition: this.deckTargetPosition,
      displayPosition: this.deckDisplayPosition,
      targetLead,
      maxLeadProjects: this.getDeckMaxLeadProjects(),
      measuredVelocity: this.deckMeasuredVelocity,
      rebaseCount: this.deckRebaseCount,
      particleField: this.particleField?.getSnapshot?.() || null,
      speedField: this.particleField?.getSnapshot?.() || null,
      layout: {
        configuredPathRadius: this.deckMetrics?.configuredPathRadius,
        effectivePathRadius: this.deckMetrics?.pathRadius,
        configuredAngleStepDeg: this.deckMetrics?.configuredAngleStepDeg,
        effectiveAngleStepDeg: this.deckMetrics?.angleStepDeg,
        dotDialRadius: this.deckMetrics?.dotDialRadius,
        dotCount: this.dotDialDots.length,
        centerYPercent: this.deckMetrics?.centerYPercent,
        sliderYOffsetDvh: this.deckMetrics?.sliderYOffsetDvh,
        introYOffsetDvh: this.deckMetrics?.introYOffsetDvh,
        resolvedViewportYOffsetDvh: this.deckMetrics?.resolvedViewportYOffsetDvh,
        resolvedIntroYOffsetDvh: this.deckMetrics?.resolvedIntroYOffsetDvh,
      },
      activeIndex: this.activeProjectIndex,
      intendedIndex: this.getDeckIntentIndex(),
      settledIndex: this.wrapProjectIndex(Math.round(this.deckDisplayPosition)),
      direction: this.deckMotionDirection,
      transitionProgress: state?.progress ?? 0,
      settled: this.isDeckPositionSettled(),
      isSettled: this.isDeckPositionSettled(),
      inputState: this.deckInputState,
      entrance: {
        phase: this.mount?.dataset?.portfolioEntrancePhase || 'unknown',
        reason: this.mount?.dataset?.portfolioEntranceReason || '',
      },
      access: {
        pending: Boolean(this.pendingProjectIntent),
        projectId: this.pendingProjectIntent?.projectId || '',
        projectIndex: this.pendingProjectIntent?.projectIndex ?? -1,
        hasPortfolioAccess: hasGateAccess('portfolio'),
      },
      open: {
        phase: this.projectOpenPhase,
        isProjectOpen: this.isProjectOpen,
        selectedIndex: this.selectedProjectIndex,
        pressed: Boolean(this.pressedCardState),
        hasGhost: Boolean(handoffSnapshot?.mediaNodeCount),
        handoffState: handoffSnapshot?.state || this.projectOpenPhase,
        handoffProgress: handoffSnapshot?.progress ?? 0,
        handoffReason: handoffSnapshot?.reason || '',
        handoffMediaNodeCount: handoffSnapshot?.mediaNodeCount || 0,
        originRect: handoffSnapshot?.sourceRect || this.projectOpenDebug?.sourceRect || null,
        heroRect: handoffSnapshot?.targetRect || this.projectOpenDebug?.targetRect || null,
        ghostRect: handoffSnapshot?.bridgeRect || null,
        drawerRect: serializeRect(drawer?.getBoundingClientRect?.()) || this.projectOpenDebug?.drawerRect || null,
        drawerTransform: drawerStyles?.transform || '',
        drawerOpacity: drawerStyles?.opacity || '',
        deckOpacity: deckStageStyles?.opacity || '',
        deckVisibility: deckStageStyles?.visibility || '',
      },
      cards: this.cards.map((card, index) => {
        const projectIndex = this.getCardProjectIndex(card);
        const offset = Number(card.dataset.orbitOffset) || 0;
        const pose = this.getDeckPoseForOffset(offset);
        return {
          index: projectIndex,
          instanceIndex: index,
          instanceKey: card.dataset.cardInstanceKey || '',
          ringCycle: Number(card.dataset.ringCycle) || 0,
          continuousIndex: this.getCardContinuousIndex(card),
          nearestProjectInstance: card.dataset.ringNearest === 'true',
          revealRank: card.dataset.portfolioRevealRank === undefined
            ? null
            : Number(card.dataset.portfolioRevealRank),
          revealSide: card.dataset.portfolioRevealSide || '',
          revealDelay: card.style.getPropertyValue('--portfolio-card-reveal-delay'),
          isActive: projectIndex === this.activeProjectIndex && card.classList.contains('is-active'),
          slot: pose.slot,
          visualSlot: pose.visualSlot || pose.slot,
          zone: pose.zone || pose.visualSlot || pose.slot,
          phase: this.getDeckConveyorPhase(projectIndex, this.deckDisplayPosition),
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

  getDeckInputCommitThreshold() {
    return clamp(
      toNumber(
        this.deckOptions.inputCommitThresholdProjects,
        PORTFOLIO_DECK_DEFAULTS.inputCommitThresholdProjects
      ),
      0.08,
      0.45
    );
  }

  getDeckInputIntentWindowMs() {
    return clamp(
      toNumber(this.deckOptions.inputIntentWindowMs, PORTFOLIO_DECK_DEFAULTS.inputIntentWindowMs),
      80,
      360
    );
  }

  getDeckMaxLeadProjects() {
    return clamp(
      toNumber(this.deckOptions.maxLeadProjects, PORTFOLIO_DECK_DEFAULTS.maxLeadProjects),
      0.5,
      4
    );
  }

  setDeckInputState(state) {
    this.deckInputState = state;
    if (this.mount) this.mount.dataset.carouselInputState = state;
  }

  rebaseDeckPosition({ allowInFlight = false } = {}) {
    const projectCount = this.projects.length;
    if (!projectCount) return false;
    let shift;
    if (allowInFlight) {
      const referencePosition = Number.isFinite(this.deckTargetPosition)
        ? this.deckTargetPosition
        : this.deckDisplayPosition;
      shift = Math.round(referencePosition / projectCount) * projectCount;
    } else {
      if (Math.abs(this.deckDisplayPosition - Math.round(this.deckDisplayPosition)) >= 0.003) return false;
      if (Math.abs(this.deckTargetPosition - this.deckDisplayPosition) >= 0.003) return false;
      const settledPosition = Math.round(this.deckDisplayPosition);
      const normalizedPosition = this.wrapDeckPosition(settledPosition);
      shift = settledPosition - normalizedPosition;
    }
    if (!shift) return false;
    this.deckDisplayPosition -= shift;
    this.deckTargetPosition -= shift;
    this.portfolioSfxLastCenterPosition -= shift;
    if (this.wheelGesture) this.wheelGesture.origin -= shift;
    if (this.pointerState) this.pointerState.startTargetPosition -= shift;
    this.deckRebaseCount += 1;
    this.mount?.classList.add('is-ring-rebasing');
    window.requestAnimationFrame(() => {
      this.mount?.getBoundingClientRect();
      window.requestAnimationFrame(() => this.mount?.classList.remove('is-ring-rebasing'));
    });
    return true;
  }

  startDeckAnimation() {
    if (this.deckAnimationFrame || !this.cards.length) return;
    this.deckLastFrameAt = 0;
    this.resetPortfolioCarouselSfxSample();
    this.deckAnimationFrame = window.requestAnimationFrame((timestamp) => this.stepDeckAnimation(timestamp));
  }

  stopDeckAnimation() {
    if (this.deckAnimationFrame) {
      window.cancelAnimationFrame(this.deckAnimationFrame);
    }
    this.deckAnimationFrame = 0;
    this.deckLastFrameAt = 0;
    this.deckMeasuredVelocity = 0;
    this.particleField?.setVelocity(0);
    this.stopPortfolioCarouselSfx();
  }

  clearDeckSettleTimer() {
    if (!this.deckSettleTimer) return;
    window.clearTimeout(this.deckSettleTimer);
    this.deckSettleTimer = 0;
  }

  beginDeckSettle(targetPosition = Math.round(this.deckTargetPosition)) {
    this.clearDeckSettleTimer();
    this.wheelGesture = null;
    if (this.isProjectOpen || !this.projects.length) return;
    const target = Math.round(targetPosition);
    const targetDelta = target - this.deckTargetPosition;
    this.deckTargetPosition = target;
    if (Math.abs(targetDelta) > 0.0001) this.deckMotionDirection = targetDelta > 0 ? 1 : -1;
    this.deckIsSettling = true;
    this.setDeckInputState('settling');
    if (shouldReducePortfolioMotion()) {
      this.deckDisplayPosition = target;
      this.deckIsSettling = false;
      this.setDeckInputState('idle');
      this.rebaseDeckPosition();
      this.updateDeckSlots({ activeChanged: true, force: true });
      this.stopPortfolioCarouselSfx();
      return;
    }
    this.startDeckAnimation();
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
      this.beginDeckSettle();
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
    this.rebaseDeckPosition({ allowInFlight: true });
    this.deckIsSettling = false;
    if (options.immediate || reducedMotion) {
      this.deckDisplayPosition = this.deckTargetPosition;
      this.setDeckInputState(
        this.isProjectOpen ? 'drawer-open' : (this.wheelGesture ? 'wheel-active' : 'idle')
      );
      this.rebaseDeckPosition();
      this.updateDeckSlots({ activeChanged: true, force: true });
      this.stopPortfolioCarouselSfx();
      return;
    }
    this.startDeckAnimation();
    if (options.settle !== false) this.scheduleDeckSettle();
  }

  stepDeckAnimation(timestamp) {
    this.deckAnimationFrame = 0;
    if (!this.cards.length) return;

    const previousTimestamp = this.deckLastFrameAt || timestamp;
    const elapsedMs = this.deckLastFrameAt
      ? clamp(timestamp - previousTimestamp, 1, 50)
      : 16.67;
    const frameFactor = clamp(elapsedMs / 16.67, 0.5, 2.5);
    const previousDisplayPosition = this.deckDisplayPosition;
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

    this.deckMeasuredVelocity = (this.deckDisplayPosition - previousDisplayPosition) / (elapsedMs / 1000);
    this.particleField?.setVelocity(this.deckMeasuredVelocity);

    this.triggerPortfolioCenterCrossingFeedback(previousDisplayPosition, this.deckDisplayPosition);
    this.updateDeckFromScroll();
    this.updatePortfolioCarouselSfx(timestamp);

    if (this.deckIsSettling || Math.abs(this.deckTargetPosition - this.deckDisplayPosition) > 0.0015) {
      this.deckAnimationFrame = window.requestAnimationFrame((nextTimestamp) => this.stepDeckAnimation(nextTimestamp));
    } else {
      this.deckLastFrameAt = 0;
      this.setDeckInputState(
        this.isProjectOpen ? 'drawer-open' : (this.wheelGesture ? 'wheel-active' : 'idle')
      );
      this.rebaseDeckPosition();
      this.updateDeckFromScroll({ activeChanged: true });
      this.deckMeasuredVelocity = 0;
      this.particleField?.setVelocity(0);
      this.stopPortfolioCarouselSfx();
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
      if (changed && !this.isProjectOpen && (options.focus || options.announce)) {
        this.playPortfolioCenterSound();
      }
    }
  }

  advanceActiveProject(direction, options = {}) {
    if (!direction || !this.projects.length) return;
    this.setActiveProject(this.getDeckIntentIndex() + direction, options);
  }

  handleDeckWheel(event) {
    if (this.isProjectOpen || this.deckInputState === 'drag-active' || !this.projects.length) return;
    const normalizedDelta = normalizeWheelDelta(event);
    if (Math.abs(normalizedDelta) < 1) return;
    event.preventDefault();

    const pixelsPerProject = this.getDeckScrollPixelsPerProject();
    const sensitivity = this.getDeckScrollSensitivity();
    const inputCap = this.getDeckInputCapProjects();
    const projectDelta = clamp((normalizedDelta / pixelsPerProject) * sensitivity, -inputCap, inputCap);
    if (Math.abs(projectDelta) < 0.0001) return;
    const now = performance.now();
    const intentWindowMs = this.getDeckInputIntentWindowMs();
    const startsNewGesture = !this.wheelGesture
      || now - this.wheelGesture.lastAt > intentWindowMs;
    if (startsNewGesture) {
      this.wheelGesture = {
        origin: Math.round(this.deckTargetPosition),
        accumulated: 0,
        committed: false,
        direction: 0,
        lastAt: now,
      };
    }
    const gesture = this.wheelGesture;
    gesture.lastAt = now;
    const commitThreshold = this.getDeckInputCommitThreshold();
    if (!gesture.committed) {
      gesture.accumulated = clamp(
        gesture.accumulated + projectDelta,
        -commitThreshold,
        commitThreshold
      );
    }
    if (!gesture.committed && Math.abs(gesture.accumulated) >= commitThreshold) {
      gesture.committed = true;
      gesture.direction = Math.sign(gesture.accumulated);
    }
    const eventDirection = Math.sign(projectDelta);
    const meaningfulReversal = gesture.committed
      && gesture.direction
      && eventDirection !== gesture.direction
      && Math.abs(projectDelta) >= Math.min(0.06, commitThreshold * 0.35);
    if (meaningfulReversal) {
      this.deckTargetPosition = this.deckDisplayPosition;
      gesture.origin = this.deckDisplayPosition;
      gesture.direction = eventDirection;
      gesture.accumulated = eventDirection * commitThreshold;
    }

    let nextTargetPosition;
    if (gesture.committed) {
      const requestedTarget = this.deckTargetPosition + projectDelta;
      const maxLead = this.getDeckMaxLeadProjects();
      nextTargetPosition = this.deckDisplayPosition + clamp(
        requestedTarget - this.deckDisplayPosition,
        -maxLead,
        maxLead
      );
      gesture.accumulated = gesture.direction * commitThreshold;
    } else {
      const previewDelta = clamp(
        gesture.accumulated,
        -commitThreshold * 0.92,
        commitThreshold * 0.92
      );
      nextTargetPosition = gesture.origin + previewDelta;
    }
    this.setDeckInputState('wheel-active');
    this.setDeckPosition(nextTargetPosition, {
      settle: false,
      allowFractionalReducedMotion: true,
    });
    this.clearDeckSettleTimer();
    const settleDelay = clamp(
      toNumber(this.deckOptions.settleIdleMs, PORTFOLIO_DECK_DEFAULTS.settleIdleMs),
      60,
      520
    );
    this.deckSettleTimer = window.setTimeout(() => {
      const currentGesture = this.wheelGesture;
      if (!currentGesture) return;
      const committedDistance = this.deckTargetPosition - currentGesture.origin;
      const target = currentGesture.committed
        ? (
            Math.abs(committedDistance) < 0.5
              ? Math.round(currentGesture.origin) + (currentGesture.direction || Math.sign(committedDistance))
              : Math.round(this.deckTargetPosition)
          )
        : Math.round(currentGesture.origin);
      this.beginDeckSettle(target);
    }, settleDelay);
  }

  handleDeckPointerDown(event) {
    if (this.isProjectOpen || !event.isPrimary || !this.projects.length) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const now = performance.now();
    this.clearDeckSettleTimer();
    this.wheelGesture = null;
    this.deckIsSettling = false;
    const pressedCard = event.target?.closest?.('.portfolio-project-card') || null;
    if (pressedCard && this.canPressCard(pressedCard, event)) {
      this.clearPressedCard();
      this.pressedCardState = {
        index: this.getCardProjectIndex(pressedCard),
        card: pressedCard,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        cancelled: false,
      };
      this.projectOpenPhase = 'pressing';
      pressedCard.classList.add('is-pressing');
    }
    this.pointerState = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: now,
      startTime: now,
      startTargetPosition: this.deckTargetPosition,
      projectDelta: 0,
      dragged: false,
    };
    if (event.pointerType !== 'mouse') {
      this.deckStage?.setPointerCapture?.(event.pointerId);
    }
  }

  handleDeckPointerMove(event) {
    if (!this.pointerState || event.pointerId !== this.pointerState.pointerId) return;
    const now = performance.now();
    const deltaX = event.clientX - this.pointerState.startX;
    const deltaY = event.clientY - this.pointerState.startY;
    const primaryDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
    if (Math.hypot(deltaX, deltaY) > PORTFOLIO_CLICK_DRAG_THRESHOLD_PX) {
      this.pointerState.dragged = true;
      this.suppressNextCardClick = true;
      this.clearPressedCard();
      this.setDeckInputState('drag-active');
      event.preventDefault();
    }
    if (this.pointerState.dragged) {
      const targetPosition = this.pointerState.startTargetPosition
        - ((primaryDelta / this.getDeckScrollPixelsPerProject()) * this.getDeckScrollSensitivity());
      this.pointerState.projectDelta = targetPosition - this.pointerState.startTargetPosition;
      this.setDeckPosition(targetPosition, { settle: false });
    }
    this.pointerState.lastX = event.clientX;
    this.pointerState.lastY = event.clientY;
    this.pointerState.lastTime = now;
  }

  finishDeckPointer(event, cancelled = false) {
    if (!this.pointerState || event.pointerId !== this.pointerState.pointerId) return;
    const pointerState = this.pointerState;
    this.pointerState = null;
    try {
      if (this.deckStage?.hasPointerCapture?.(event.pointerId)) {
        this.deckStage.releasePointerCapture(event.pointerId);
      }
    } catch (error) {
      /* ignore */
    }
    this.clearPressedCard();
    if (!pointerState.dragged) {
      this.setDeckInputState(this.isProjectOpen ? 'drawer-open' : 'idle');
      this.stopPortfolioCarouselSfx();
      return;
    }

    const projectDelta = pointerState.projectDelta || 0;
    const commitThreshold = this.getDeckInputCommitThreshold();
    const target = !cancelled && Math.abs(projectDelta) >= commitThreshold
      ? Math.round(pointerState.startTargetPosition) + Math.sign(projectDelta)
      : Math.round(pointerState.startTargetPosition);
    this.beginDeckSettle(target);
    window.setTimeout(() => {
      this.suppressNextCardClick = false;
    }, 0);
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
    const { pointerId } = this.pressedCardState;
    const card = this.pressedCardState.card || this.getActiveProjectCard(this.pressedCardState.index);
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

  canPressCard(card, event) {
    if (this.isProjectOpen || !event?.isPrimary) return false;
    if (event.pointerType === 'mouse' && event.button !== 0) return false;
    const index = this.getCardProjectIndex(card);
    return card?.dataset?.deckVisualSlot === 'front'
      && index === this.getDeckIntentIndex()
      && this.isDeckPositionSettled();
  }

  handleCardClick(event, card) {
    if (this.suppressNextCardClick) {
      this.suppressNextCardClick = false;
      event.preventDefault();
      return;
    }
    const index = this.getCardProjectIndex(card);
    const intentIndex = this.getDeckIntentIndex();
    const isFrontCard = card?.dataset?.deckVisualSlot === 'front';
    if (!isFrontCard || index !== intentIndex || !this.isDeckPositionSettled()) {
      event.preventDefault();
      this.setActiveProject(index, { focus: true, announce: true });
      return;
    }
    event.preventDefault();
    const originRect = card?.getBoundingClientRect() || null;
    this.openProjectByIndex(index, { originRect, inputType: 'synthetic-click' });
  }

  handleCardKeydown(event, card) {
    const index = this.getCardProjectIndex(card);
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const intentIndex = this.getDeckIntentIndex();
      if (index !== intentIndex || !this.isDeckPositionSettled()) {
        this.setActiveProject(index, { focus: true, announce: true });
        return;
      }
      this.openProjectByIndex(index, { inputType: 'keyboard' });
      return;
    }

    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
    this.advanceActiveProject(direction, { focus: true, announce: true });
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
    this.mediaVideos = this.mediaVideos.filter((video) => video?.isConnected);
    if (
      shouldReducePortfolioMotion()
      || this.isProjectOpen
      || getTransitionPhase() !== 'idle'
      || this.mount?.dataset?.portfolioEntrancePhase !== 'complete'
    ) {
      this.pauseAllVideos();
      return;
    }
    this.mediaVideos.forEach((video) => {
      const index = Number(video.dataset.projectIndex);
      const card = video.closest('.portfolio-project-card');
      const isActive = Number.isInteger(index)
        && index === this.activeProjectIndex
        && card?.classList.contains('is-active');
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
      : clamp(toNumber(this.config.runtime.motion?.openDurationMs, 700), 200, 1500);

    this.projectDrawerView.syncProject(project, {
      animate,
      openDurationMs: openDuration,
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
        : clamp(toNumber(this.config.runtime.motion?.openDurationMs, 700), 200, 1500),
      closeDuration: clamp(toNumber(this.config.runtime.motion?.closeDurationMs, 520), 160, 1000),
    };
  }

  focusProjectBackButton() {
    this.clearProjectFocusTimeouts();
    const focusBack = () => {
      if (!this.isProjectOpen) return;
      const root = this.projectView || this.projectDrawerView?.root || null;
      if (!root || root.getAttribute('aria-hidden') === 'true') return;
      if (root.contains(document.activeElement) && document.activeElement !== document.body) return;
      const backButton = this.projectDrawerView?.backButton
        || this.projectBack
        || root.querySelector?.('.portfolio-project-view__back--top');
      if (!(backButton instanceof HTMLElement) || !backButton.isConnected) return;
      backButton.focus({ preventScroll: true });
    };

    focusBack();
    window.requestAnimationFrame(focusBack);
    [80, 220].forEach((delay) => {
      this.projectFocusTimeouts.push(window.setTimeout(focusBack, delay));
    });
  }

  clearProjectFocusTimeouts() {
    while (this.projectFocusTimeouts.length) {
      window.clearTimeout(this.projectFocusTimeouts.pop());
    }
  }

  requestProjectAccess(projectIndex, project, options = {}, originCard = null) {
    if (this.pendingProjectIntent || this.isProjectOpen || !project) return false;
    this.clearPressedCard();
    this.clearDeckSettleTimer();
    this.stopDeckAnimation();
    this.deckIsSettling = false;
    this.deckTargetPosition = this.deckDisplayPosition;
    this.pendingDeckFocusIndex = -1;
    this.pendingDeckAnnounce = false;
    this.stopPortfolioCarouselSfx();
    this.pauseAllVideos();
    this.particleField?.setSuspended(true);
    this.setDeckInputState('access-pending');
    this.pendingProjectIntent = {
      projectId: String(project.id || ''),
      projectIndex,
      inputType: options.inputType || 'pointer',
      focusSource: originCard || (document.activeElement instanceof HTMLElement ? document.activeElement : null),
    };
    if (this.deckStage) {
      this.deckStage.inert = true;
      this.deckStage.setAttribute('aria-hidden', 'true');
    }
    if (this.mount) this.mount.dataset.portfolioAccessPending = 'true';
    announceToScreenReader('This project requires a portfolio invite code.');
    window.dispatchEvent(new CustomEvent('abs:portfolio:request-access', {
      detail: {
        gateId: 'portfolio',
        projectId: this.pendingProjectIntent.projectId,
        projectIndex,
      },
    }));
    return true;
  }

  clearPendingProjectIntent({ restoreFocus = false, resume = true } = {}) {
    const intent = this.pendingProjectIntent;
    this.pendingProjectIntent = null;
    if (this.mount) delete this.mount.dataset.portfolioAccessPending;
    if (!this.isProjectOpen) {
      this.deckStage?.removeAttribute('aria-hidden');
      if (this.deckStage) this.deckStage.inert = false;
      this.setDeckInputState('idle');
    }
    if (resume) {
      this.particleField?.setSuspended(false);
      this.resumeVisibleVideos();
    }
    if (restoreFocus && intent?.focusSource?.isConnected) {
      window.requestAnimationFrame(() => intent.focusSource?.focus?.({ preventScroll: true }));
    }
    return intent;
  }

  handleProjectAccessDismissed(event) {
    if ((event?.detail?.gateId || '') !== 'portfolio') return;
    if (!this.pendingProjectIntent) return;
    this.clearPendingProjectIntent({ restoreFocus: true, resume: true });
  }

  handleProjectAccessGranted(event) {
    if ((event?.detail?.gateId || '') !== 'portfolio') return;
    const pendingIntent = this.pendingProjectIntent;
    if (!pendingIntent) return;
    if (!hasGateAccess('portfolio')) {
      this.handleProjectAccessDismissed(event);
      return;
    }

    const projectIndex = this.projects.findIndex((project) => (
      String(project?.id || '') === pendingIntent.projectId
    ));
    if (projectIndex < 0) {
      this.handleProjectAccessDismissed(event);
      return;
    }

    const intent = this.clearPendingProjectIntent({ restoreFocus: false, resume: false });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (this.destroyed || !hasGateAccess('portfolio')) {
          this.particleField?.setSuspended(false);
          this.resumeVisibleVideos();
          return;
        }
        const opened = this.openProjectByIndex(projectIndex, {
          inputType: intent?.inputType || 'access-granted',
        });
        if (!opened) {
          this.particleField?.setSuspended(false);
          this.resumeVisibleVideos();
        }
      });
    });
  }

  openProjectByIndex(index, options = {}) {
    if (this.isProjectOpen) return false;
    const projectIndex = clamp(index, 0, this.projects.length - 1);
    const project = this.projects[projectIndex];
    if (!project) return false;
    const originCard = this.getActiveProjectCard(projectIndex);
    if (getProjectAccessMode(project) === 'protected' && !hasGateAccess('portfolio')) {
      return this.requestProjectAccess(projectIndex, project, options, originCard);
    }
    const originRect = options?.originRect || originCard?.getBoundingClientRect() || null;
    const timings = this.getProjectOpenTimings();
    this.clearPressedCard();
    const labelContent = resolvePortfolioLabelContent(project, project?.title || `Project ${projectIndex + 1}`);
    const spokenLabel = labelContent.eyebrow
      ? `${labelContent.eyebrow}: ${labelContent.title}`
      : labelContent.title;

    this.playPortfolioActionSound();
    this.clearDeckSettleTimer();
    this.stopDeckAnimation();
    this.particleField?.setSuspended(true);
    this.deckIsSettling = false;
    this.deckTargetPosition = this.deckDisplayPosition;
    this.pendingDeckFocusIndex = -1;
    this.pendingDeckAnnounce = false;
    this.stopPortfolioCarouselSfx();
    SoundEngine.playWheelOpen?.();
    triggerHaptic('open');
    this.prefetchProjectAssets(project);
    this.pauseAllVideos();
    this.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.selectedProjectIndex = projectIndex;
    this.isProjectOpen = true;
    this.setDeckInputState('drawer-open');
    getGlobals().__portfolioDrawerOpen = true;
    this.disableBackgroundInteractivity();
    this.syncProjectHero(project, true, originRect, { deferReveal: true });
    originCard?.classList.add('is-selected');
    this.updateDeckSlots();
    announceToScreenReader(`Opened project: ${spokenLabel}`);
    document.addEventListener('keydown', this.boundProjectKeydown, true);

    this.projectHandoff?.open({
      sourceCard: originCard,
      project,
      openDurationMs: timings.openDuration,
      closeDurationMs: timings.closeDuration,
    }).then((started) => {
      if (started || !this.isProjectOpen) return;
      this.projectDrawerView?.commitSharedOpen?.(this.projectDrawerView?.imageMotion, {
        activateHeroMotion: !shouldReducePortfolioMotion(),
      });
      this.projectOpenPhase = 'open';
      this.focusProjectBackButton();
    });
    return true;
  }

  finishProjectClose() {
    const restoredIndex = this.selectedProjectIndex;
    this.cards.forEach((card) => card.classList.remove('is-selected', 'is-handoff-source-hidden'));
    this.isProjectOpen = false;
    this.selectedProjectIndex = -1;
    this.projectOpenPhase = 'closed';
    this.setDeckInputState('idle');
    this.particleField?.setSuspended(false);
    this.projectOpenDebug = null;
    getGlobals().__portfolioDrawerOpen = false;
    this.restoreBackgroundInteractivity();
    if (restoredIndex >= 0) this.setActiveProject(restoredIndex, { focus: false, announce: false, immediate: true });
    this.syncProjectButtonStates();
    this.resumeVisibleVideos();
    announceToScreenReader('Closed project view');
    if (
      this.lastFocusedElement?.isConnected
      && this.lastFocusedElement !== document.body
      && this.lastFocusedElement?.focus
    ) {
      this.lastFocusedElement.focus();
    } else if (restoredIndex >= 0) {
      this.getActiveProjectCard(restoredIndex)?.focus();
    }
  }

  closeProject() {
    if (!this.isProjectOpen) return;
    if (!this.projectView) {
      SoundEngine.playWheelClose?.();
      this.finishProjectClose();
      return;
    }
    if (this.projectHandoff?.state === 'closing') return;
    this.projectOpenPhase = 'closing';
    this.clearProjectFocusTimeouts();
    document.body.classList.add('portfolio-project-closing');
    SoundEngine.playWheelClose?.();
    triggerHaptic('close');
    document.removeEventListener('keydown', this.boundProjectKeydown, true);
    const sourceCard = this.getActiveProjectCard(this.selectedProjectIndex)
      || this.cards.find((card) => this.getCardProjectIndex(card) === this.selectedProjectIndex);
    const closeDuration = clamp(toNumber(this.config.runtime.motion?.closeDurationMs, 520), 160, 1000);
    const started = this.projectHandoff?.close({ sourceCard, closeDurationMs: closeDuration });
    if (!started) {
      this.projectDrawerView?.commitSharedClosed?.(this.projectDrawerView?.imageMotion);
      this.finishProjectClose();
    }
  }

  syncProjectButtonStates() {
    this.cards.forEach((card) => {
      const expanded = this.isProjectOpen && this.getCardProjectIndex(card) === this.selectedProjectIndex;
      card.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
    this.updateDeckSlots();
  }

  disableBackgroundInteractivity() {
    document.body.classList.add('portfolio-project-open');
    setPortfolioSheetHostHidden(false);
    refreshCursor();
    this.deckStage?.setAttribute('aria-hidden', 'true');
    if (this.deckStage) this.deckStage.inert = true;
  }

  restoreBackgroundInteractivity() {
    document.body.classList.remove('portfolio-project-open', 'portfolio-project-closing');
    setPortfolioSheetHostHidden(true);
    refreshCursor();
    this.deckStage?.removeAttribute('aria-hidden');
    if (this.deckStage) this.deckStage.inert = false;
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

export async function bootstrapPortfolio(runtimeContext = {}) {
  const {
    signal,
    isCurrent: isRuntimeCurrent,
    registerCleanup,
    markReady,
    generation,
  } = runtimeContext;
  const shellRouteTransitionActive = isRouteTransitionPhase(getTransitionPhase());
  const bootstrapStartedAt = performance.now();
  const bootstrapDiagnostics = {
    generation: Number(generation || 0),
    routeTransition: shellRouteTransitionActive,
    stages: [{ name: 'start', elapsedMs: 0 }],
  };
  const markBootstrapStage = (name) => {
    bootstrapDiagnostics.stages.push({
      name,
      elapsedMs: Math.round((performance.now() - bootstrapStartedAt) * 100) / 100,
    });
    window.__ABS_PORTFOLIO_BOOTSTRAP__ = bootstrapDiagnostics;
  };
  window.__ABS_PORTFOLIO_BOOTSTRAP__ = bootstrapDiagnostics;
  const bootstrapRunId = activePortfolioBootstrapRunId + 1;
  activePortfolioBootstrapRunId = bootstrapRunId;
  const root = document.documentElement;
  const waitForShellRelease = shellRouteTransitionActive;
  let disposed = false;
  let rendererOwner = null;
  let pitCanvas = null;
  let pitMount = null;
  let hardRevealTimer = 0;
  let app = null;
  let appDestroyed = false;
  let cleanupTransitionNavigationLinks = null;
  let handlePageShow = null;
  let removeGateRevealListener = null;
  const isCurrentBootstrapRun = () => (
    !disposed
    && !signal?.aborted
    && bootstrapRunId === activePortfolioBootstrapRunId
    && (typeof isRuntimeCurrent !== 'function' || isRuntimeCurrent())
  );
  const destroyApp = () => {
    if (!app || appDestroyed) return;
    appDestroyed = true;
    app.destroy();
  };
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    if (activePortfolioBootstrapRunId === bootstrapRunId) {
      activePortfolioBootstrapRunId += 1;
    }
    window.clearTimeout(hardRevealTimer);
    root.classList.remove('portfolio-booting', 'portfolio-loaded');
    delete document.body.dataset.portfolioLoadState;
    if (pitMount) {
      delete pitMount.dataset.portfolioMediaReady;
      delete pitMount.dataset.portfolioEntrancePhase;
      delete pitMount.dataset.portfolioEntranceReason;
      pitMount.inert = false;
      pitMount.removeAttribute('aria-busy');
      pitMount.classList.remove(
        'is-portfolio-boot-preparing',
        'is-portfolio-deck-visible',
        'is-portfolio-deck-revealing'
      );
    }
    if (rendererOwner !== null) {
      disposeRendererListeners(rendererOwner);
    }
    cleanupTransitionNavigationLinks?.();
    if (handlePageShow) window.removeEventListener('pageshow', handlePageShow);
    removeGateRevealListener?.();
    destroyApp();
  };
  registerCleanup?.(cleanup);
  if (!isCurrentBootstrapRun()) return cleanup;

  destroyQuoteDisplay();
  root.classList.add('portfolio-booting');
  root.classList.remove('portfolio-loaded');
  document.body.dataset.portfolioLoadState = 'booting';

  try {
    await loadRuntimeText();
    if (!isCurrentBootstrapRun()) return cleanup;
    applyRuntimeTextToDOM();
  } catch (error) {
    if (isCurrentBootstrapRun()) console.warn('Portfolio text load failed', error);
  }
  if (!isCurrentBootstrapRun()) return cleanup;
  markBootstrapStage('content-ready');

  const runtimeConfig = await loadRuntimeConfig();
  if (!isCurrentBootstrapRun()) return cleanup;
  markBootstrapStage('runtime-config-ready');
  const globals = getGlobals();
  globals.performanceHudEnabled = false;
  globals.portfolioPerformancePriority = true;

  rendererOwner = setupRenderer();
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
    minimumMs: shellRouteTransitionActive ? 0 : 120
  });
  if (!isCurrentBootstrapRun()) return cleanup;
  markBootstrapStage('page-barrier-ready');
  // Keep the wall frame visible while preparing the DOM deck. The deck mount
  // stays transparent until its first measured pose is stable, avoiding a
  // blank-page flash without exposing unpositioned cards.
  pitCanvas = document.getElementById('c');
  pitMount = document.getElementById('portfolioProjectMount');
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
      pitMount.dataset.portfolioEntrancePhase = 'preparing';
      delete pitMount.dataset.portfolioEntranceReason;
      pitMount.inert = true;
      pitMount.setAttribute('aria-busy', 'true');
      pitMount.style.opacity = '1';
    }
  };
  const revealPortfolioLayers = (reason = 'runtime') => {
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
      pitMount.style.opacity = '1';
      app?.beginEntrance({
        reason,
        routeTransition: waitForShellRelease,
      }).then(() => {
        if (!isCurrentBootstrapRun()) return;
        app?.completeRouteTransition();
      });
    }
  };
  const scheduleHardReveal = (timeoutMs = 1200, { waitForTimeout = false } = {}) => {
    window.clearTimeout(hardRevealTimer);
    const startedAt = performance.now();
    const tick = () => {
      if (!isCurrentBootstrapRun()) return;
      if (portfolioLayersRevealed) return;
      const deckMediaReady = pitMount?.dataset.portfolioMediaReady === 'true';
      const timedOut = (performance.now() - startedAt) >= timeoutMs;
      if ((!waitForTimeout && deckMediaReady) || timedOut) {
        revealPortfolioLayers('fallback');
        return;
      }
      hardRevealTimer = window.setTimeout(tick, 80);
    };
    hardRevealTimer = window.setTimeout(tick, 180);
  };
  preparePortfolioLayers();
  // Deck mount stays invisible; revealed after the first stable presentation.
  const hostLaidOut = await waitForPitSimulationHostReady();
  if (!isCurrentBootstrapRun()) return cleanup;
  markBootstrapStage('host-ready');
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
  const globalsForPointer = getGlobals();
  globalsForPointer.mouseInCanvas = false;
  if (typeof window !== 'undefined') window.mouseInCanvas = false;
  setupPointer();
  setupOverscrollLock();
  setupCustomCursor();

  maybeAutoPickCursorColor('startup');

  const loadedPortfolioConfig = await loadPortfolioRuntimeConfig();
  if (!isCurrentBootstrapRun()) return cleanup;
  const portfolioConfig = applyPortfolioConfig(loadedPortfolioConfig);
  const data = await loadPortfolioData(signal);
  if (!isCurrentBootstrapRun()) return cleanup;
  const projects = Array.isArray(data?.projects) ? data.projects : [];

  app = new PortfolioScrollApp({
    config: portfolioConfig,
    projects
  });
  try {
    await app.init(signal, { routeTransition: shellRouteTransitionActive });
    if (!isCurrentBootstrapRun()) return cleanup;
    markBootstrapStage('app-ready');
  } catch (error) {
    if (!isCurrentBootstrapRun()) return cleanup;
    console.error('Portfolio deck initialization failed', error);
    document.body.classList.add('portfolio-deck-failed');
    root.classList.remove('portfolio-booting');
    document.body.dataset.portfolioLoadState = 'loaded';
    revealPortfolioLayers('failed');
    if (!shellRouteTransitionActive) {
      await completeDirectBoot({
        selectors: ['#abs-scene', '#app-frame'],
        detail: 'portfolio-deck-failed',
      });
    }
    return cleanup;
  }
  installPortfolioAuditBridge(app);
  updateCursorSize();
  if (waitForShellRelease) scheduleHardReveal(2400, { waitForTimeout: true });

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

  // A route transition can publish its first valid measured geometry here: the
  // route participant owns the following two painted-frame confirmation. Direct
  // loads retain the self-contained two-pass stability check.
  const presentationPrepared = await waitForStablePortfolioPresentation({
    timeoutMs: shellRouteTransitionActive ? 700 : 900,
    requiredReadyPasses: shellRouteTransitionActive ? 1 : 2,
  });
  if (!isCurrentBootstrapRun()) return cleanup;
  bootstrapDiagnostics.presentation = {
    ready: Boolean(window.__ABS_PORTFOLIO_PRESENTATION__?.ready),
    canvasReady: Boolean(window.__ABS_PORTFOLIO_PRESENTATION__?.canvasReady),
    heroReady: Boolean(window.__ABS_PORTFOLIO_PRESENTATION__?.heroReady),
    firstLabelReady: Boolean(window.__ABS_PORTFOLIO_PRESENTATION__?.firstLabelReady),
    topbarReady: Boolean(window.__ABS_PORTFOLIO_PRESENTATION__?.topbarReady),
    labelCount: Number(window.__ABS_PORTFOLIO_PRESENTATION__?.labelCount || 0),
    stablePasses: Number(window.__ABS_PORTFOLIO_PRESENTATION__?.stablePasses || 0),
    elapsedMs: Number(window.__ABS_PORTFOLIO_PRESENTATION__?.elapsedMs || 0),
  };
  markBootstrapStage('presentation-ready');

  if (waitForShellRelease) {
    markReady?.();
    markBootstrapStage('route-ready');
    const releaseReason = await new Promise((resolve) => {
      let settled = false;
      const release = (event) => {
        const eventGeneration = Number(
          event?.detail?.generation || root.dataset.absPortfolioRevealGeneration || 0
        );
        if (eventGeneration && eventGeneration !== Number(generation || 0)) return;
        if (settled) return;
        settled = true;
        window.removeEventListener('abs:portfolio:reveal', release);
        removeGateRevealListener = null;
        const reason = event?.detail?.reason || root.dataset.absPortfolioReveal || 'route-in';
        delete root.dataset.absPortfolioReveal;
        delete root.dataset.absPortfolioRevealGeneration;
        resolve(reason);
      };
      removeGateRevealListener = () => window.removeEventListener('abs:portfolio:reveal', release);
      window.addEventListener('abs:portfolio:reveal', release);
      if (root.dataset.absPortfolioReveal) release();
    });
    if (!isCurrentBootstrapRun()) return cleanup;
    revealPortfolioLayers(releaseReason);
  } else {
    await completeDirectBoot({
      selectors: ['#abs-scene', '#app-frame'],
      detail: presentationPrepared ? 'portfolio-ready' : 'portfolio-ready-timeout',
      onOverlayHidden: () => revealPortfolioLayers('direct'),
    });
    if (!isCurrentBootstrapRun()) return cleanup;
  }

  const presentationSettled = await waitForStablePortfolioPresentation({
    timeoutMs: shellRouteTransitionActive ? 700 : 520,
  });
  if (!isCurrentBootstrapRun()) return cleanup;
  if (!presentationSettled && import.meta.env?.DEV) {
    console.warn('[portfolio] Presentation did not fully settle after reveal; using latest measured layout.');
  }

  // Route readiness is emitted from prepared final geometry; the shell then
  // releases Portfolio-owned material from its route-in preparation boundary.
  const ABS_DEV = import.meta.env.DEV;
  if (ABS_DEV) {
    try {
      const { registerDevPanelRoute } = await import('../ui/panel-popup-manager.js');
      const { generatePanelSectionsHTML } = await import('./panel/control-registry.js');
      const { setupControls } = await import('./panel/controls.js');
      const { setupBuildControls } = await import('./panel/build-controls.js');
      if (!isCurrentBootstrapRun()) return cleanup;
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
        setupPageControls: (_panel, panelOptions = {}) => {
          setupControls(portfolioConfig, {
            onMetricsChange: () => app.refreshPitBodies(),
            onRuntimeChange: createNormalizedPortfolioRuntimeListener(
              (normalizedRuntime) => app.applyRuntimeConfig(normalizedRuntime)
            ),
            uiDocument: panelOptions.uiDocument,
          });
          setupBuildControls(portfolioConfig, panelOptions);
        },
      };
      registerDevPanelRoute(panelOptions);
      if (panelRequested) {
        const { createPanelDock } = await import('../ui/panel-dock.js');
        if (!isCurrentBootstrapRun()) return cleanup;
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

  cleanupTransitionNavigationLinks = setupTransitionNavigationLinks();

  handlePageShow = (event) => {
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

  return cleanup;
}
