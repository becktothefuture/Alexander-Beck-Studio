// Portfolio carousel entry (shares chrome with the index layout; consumes config/portfolio-config.json and config/contents-portfolio.json)

import { loadRuntimeConfig } from '../utils/runtime-config.js';
import { applyWallFrameFromConfig, applyWallFrameLayout, syncWallFrameColors } from '../visual/wall-frame.js';
import { applyPortfolioConfig, loadPortfolioConfig, normalizePortfolioRuntime } from './portfolio-config.js';
import { initPortfolioWallCanvas } from './wall-only-canvas.js';
import { createSoundToggle } from '../ui/sound-toggle.js';
import { initializeDarkMode } from '../visual/dark-mode-v2.js';
import { maybeAutoPickCursorColor, rotatePaletteChapterOnReload } from '../visual/colors.js';
import { getGlobals } from '../core/state.js';
import { initNoiseSystem } from '../visual/noise-system.js';
import { initTimeDisplay } from '../ui/time-display.js';
import { upgradeSocialIcons } from '../ui/social-icons.js';
import { loadRuntimeText } from '../utils/text-loader.js';
import { applyRuntimeTextToDOM } from '../ui/apply-text.js';
import { waitForFonts } from '../utils/font-loader.js';
import { readTokenVar } from '../utils/tokens.js';
import * as SoundEngine from '../audio/sound-engine.js';
import { initSharedChrome } from '../ui/shared-chrome.js';
import { 
  navigateWithTransition, 
  resetTransitionState, 
  setupPrefetchOnHover,
  NAV_STATES 
} from '../utils/page-nav.js';

const BASE_PATH = (() => {
  try {
    const base = window.PORTFOLIO_BASE || '';
    return base && !base.endsWith('/') ? `${base}/` : base;
  } catch (e) {
    return '';
  }
})();
const CONFIG = {
  basePath: BASE_PATH,
  assetBasePath: `${BASE_PATH}images/portfolio/pages/`,
  dataPath: `${BASE_PATH}config/contents-portfolio.json`,
  coverFallback: `${BASE_PATH}images/portfolio/folio-cover/cover-default.webp`,
};

// Cache-busting: Use build timestamp in production, or generate session-based timestamp for dev
// Session timestamp persists per page load, preventing cache while allowing reasonable performance
let CACHE_BUST_VALUE = null;
function getCacheBustValue() {
  if (CACHE_BUST_VALUE !== null) return CACHE_BUST_VALUE;
  
  // Prefer build timestamp (production)
  if (typeof window !== 'undefined' && typeof window.__BUILD_TIMESTAMP__ !== 'undefined') {
    CACHE_BUST_VALUE = String(window.__BUILD_TIMESTAMP__);
  } else {
    // Dev mode: Use session-based timestamp (set once per page load)
    // This ensures images refresh on page reload but aren't re-fetched on every render
    CACHE_BUST_VALUE = String(Date.now());
  }
  return CACHE_BUST_VALUE;
}

async function fetchPortfolioData() {
  const paths = [
    CONFIG.dataPath,
    `${CONFIG.basePath}js/contents-portfolio.json`,
    '../dist/js/contents-portfolio.json',
  ];

  for (const path of paths) {
    try {
      const res = await fetch(path, { cache: 'no-cache' });
      if (!res.ok) continue;
      return await res.json();
    } catch (e) {
      // Try next path
    }
  }

  throw new Error('No portfolio data found');
}

class PortfolioApp {
  constructor({ runtimeConfig } = {}) {
    this.track = document.getElementById('track') || document.querySelector('.slider-track');
    this.viewport = document.getElementById('viewport') || document.querySelector('.portfolio-viewport');
    this.rig = null;
    this.projects = [];
    this.slides = [];
    this.wheelRotation = 0;
    this.wheelVelocity = 0;
    this.wheelFrame = null;
    this.wheelLastTime = 0;
    this.wheelSlotCount = 0;
    this.wheelStep = 0;
    this.wheelBaseStep = 0;
    this.wheelRadiusX = 0;
    this.wheelRadiusY = 0;
    this.wheelSpacing = 0;
    this.wheelTilt = 0;
    this.wheelDepth = 1;
    this.wheelCenterX = 0;
    this.wheelCenterY = 0;
    this.wheelRotateFactor = 0;
    this.wheelScaleMin = 0.8;
    this.wheelScaleMax = 1;
    this.wheelBlurMax = 0;
    this.wheelOpacityMin = 0.2;
    this.wheelOpacityMax = 1;
    this.wheelOpacityCurve = 1;
    this.wheelActiveLift = 0;
    this.wheelScrollSpeed = 0;
    this.wheelDragSpeed = 0;
    this.wheelFriction = 0;
    this.wheelSnapSpeed = 0;
    this.wheelSnapStrength = 0;
    this.wheelBounceStrength = 0;
    this.wheelBounceDamping = 0;
    this.wheelBounceImpulse = 0;
    this.pendingBounceImpulse = 0;
    this.cardBob = [];
    this.cardBobVel = [];
    this.prevWheelVelocity = 0;
    this.lastSnapSlot = -1;
    this.lastSnapSoundTime = 0;
    this.snapSoundDebounceMs = 300;
    this.snapSoundEnabled = false;
    this.continuousWheelEnabled = false;
    this.lastWheelSpeed = 0;
    this.centerClickEnabled = true;
    this.centerClickMinSpeed = 120;
    this.centerClickDebounceMs = 70;
    this.lastCenterClickTime = 0;
    this.lastAudioUpdate = 0;
    this.inputSurface = null;
    this.mouseTiltLeft = 0;
    this.mouseTiltRight = 0;
    this.mouseTiltUp = 0;
    this.mouseTiltDown = 0;
    this.mouseTiltEnabled = true;
    this.mouseTiltSensitivity = 1.0;
    this.mouseTiltEase = 0.15;
    this.mouseTiltCurrentX = 0;
    this.mouseTiltCurrentY = 0;
    this.mouseTiltTargetX = 0;
    this.mouseTiltTargetY = 0;
    this.cardHoverScale = 1.025; // Scale increase for hover feedback (2.5%)
    this.cardHoverLift = 8; // Z-axis movement on hover (move towards user in 3D space, in vmin)
    this.activeSlot = -1;
    this.lastWheelTime = 0;
    this.activeIndex = -1;
    this.detailOpen = false;
    this.isTransitioning = false; // Guard against rapid open/close
    this.detailOverlay = null;
    this.detailContent = null;
    this.detailScroller = null;
    this.detailClose = null;
    this.activeSlide = null;
    this.lastFocusedElement = null;
    this.preloadedProjects = new Set();
    this.preloadedAssets = new Set();
    this.detailVideoObserver = null;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.transitionHost = null;
    this.dragPointerId = null;
    this.dragPointerCaptured = false;
    this.dragThreshold = 6;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragLastX = 0;
    this.dragLastY = 0;
    this.dragLastTime = 0;
    this.dragMoved = false;
    this.dragSuppressClickUntil = 0;
    this.customCursor = null;
    this.metaContainer = null;
    this.metaClient = null;
    this.metaTitle = null;
    this.metaSummary = null;
    this.metaSwapTimer = null;
    this.applyRuntimeConfig(runtimeConfig);
    
    // Don't auto-init in constructor - let bootstrap call init() after entrance animation
    // this.init(); // REMOVED: Now called explicitly after entrance animation completes
  }

  applyRuntimeConfig(runtimeConfig) {
    this.runtimeConfig = normalizePortfolioRuntime(runtimeConfig);
    this.wheelConfig = this.runtimeConfig.wheel;
    this.wheelSensitivity = this.wheelConfig.sensitivity;
    this.wheelEase = this.prefersReducedMotion ? 1 : this.wheelConfig.ease;
    this.wheelLineHeight = this.getWheelLineHeight();
    
    // Apply sound config
    const soundConfig = this.runtimeConfig.sound;
    if (soundConfig) {
      this.snapSoundDebounceMs = soundConfig.snapDebounceMs;
      this.snapSoundEnabled = Boolean(soundConfig.snapEnabled);
      this.continuousWheelEnabled = Boolean(soundConfig.continuousWheelEnabled);
      this.centerClickEnabled = Boolean(soundConfig.centerClickEnabled);
      this.centerClickMinSpeed = Number(soundConfig.centerClickMinSpeed) || 0;
      this.centerClickDebounceMs = Number(soundConfig.centerClickDebounceMs) || 0;
      // Update wheel sound config (convert gain percentages to 0-1 range)
      SoundEngine.updateWheelSfxConfig({
        continuousEnabled: Boolean(soundConfig.continuousWheelEnabled),
        tickGainMul: (Number(soundConfig.continuousTickGainMul) || 100) / 100,
        swishGainMul: (Number(soundConfig.continuousSwishGainMul) || 100) / 100,
        centerGain: (Number(soundConfig.centerClickGain) || 0) / 100,
        centerFilterHz: Number(soundConfig.centerClickFilterHz) || 1600,
        snapGain: soundConfig.snapGain / 100,
        openGain: soundConfig.openGain / 100,
        openFilterHz: soundConfig.openFilterHz,
        closeGain: soundConfig.closeGain / 100,
        closeFilterHz: soundConfig.closeFilterHz,
        snapDebounceMs: soundConfig.snapDebounceMs,
      });
    }

    // Apply mouse tilt config
    const mouseTiltConfig = this.runtimeConfig.mouseTilt;
    if (mouseTiltConfig) {
      this.mouseTiltEnabled = !this.prefersReducedMotion && mouseTiltConfig.enabled;
      this.mouseTiltSensitivity = mouseTiltConfig.sensitivity || 1.0;
      this.mouseTiltEase = mouseTiltConfig.ease || 0.15;
      this.mouseTiltInvertX = Boolean(mouseTiltConfig.invertX);
      this.mouseTiltInvertY = Boolean(mouseTiltConfig.invertY);
    }

    // Cylinder background removed.

    // Apply Scroll FX config live (portfolio-only)
    // Scroll FX removed (per request).
  }

  async init() {
    // Wall-frame visibility is controlled by entrance animation system
    // portfolio-stage and portfolio-meta visibility controlled by entrance animation
    // (staggered reveal after brand logo)

    await this.loadData();
    this.renderSlides();
    
    // Verify slides were rendered
    if (this.slides.length === 0) {
      console.error('⚠️ No slides rendered - check portfolio data');
    } else {
      console.log(`✓ Rendered ${this.slides.length} slides`);
    }

    this.setupMeta();
    this.setupDetailOverlay();
    this.inputSurface = document.body;
    this.bindEvents();
    this.setupCustomCursor();
    this.setupSoundToggle();
    // CV modal is now initialized via shared chrome bundle
    // Setup card hover after slides are rendered
    this.setupCardHover();

    this.updateWheelConfig();
    this.startWheel();

    // Check URL hash for deep linking to a project
    this.checkUrlHash();
    window.addEventListener('hashchange', () => this.checkUrlHash());

    // Cylinder background removed.

    window.addEventListener('resize', () => {
        this.updateWheelConfig();
    });
  }

  async loadData() {
    try {
      const data = await fetchPortfolioData();
      this.projects = Array.isArray(data?.projects) ? data.projects : [];
    } catch (e) {
      console.error('Failed to load portfolio data', e);
      // Fallback data
      this.projects = Array(7).fill(0).map((_, i) => ({
        id: `p${i}`,
        client: 'Client Name',
        title: 'Project Title',
        tags: ['#tag1', '#tag2'],
        image: '' // Will handle missing image in render
      }));
    }
  }

  renderSlides() {
    this.track.innerHTML = '';
    this.slides = [];
    this.rig = document.createElement('div');
    this.rig.className = 'slider-rig';
    this.track.appendChild(this.rig);

    const projectCount = this.projects.length || 0;
    const slotCount = projectCount ? projectCount * 2 : 0;
    this.wheelSlotCount = slotCount;
    this.wheelBaseStep = slotCount ? (Math.PI * 2) / slotCount : 0;
    this.wheelStep = this.wheelBaseStep;
    this.cardBob = new Array(slotCount).fill(0);
    this.cardBobVel = new Array(slotCount).fill(0);
    this.lastSnapSlot = -1;

    // Get current color scheme colors for gradient
    const globals = getGlobals();
    const currentColors = globals?.currentColors || [
      '#b7bcb7', '#d0d0d0', '#ffffff', '#00695c', 
      '#000000', '#ff4013', '#0d5cb6', '#ffa000'
    ];
    
    // Filter out neutral/background colors, keep vibrant ones for gradient
    // Typically indices 3, 5, 6, 7 are the accent colors
    const gradientColors = [
      currentColors[3] || '#00695c',  // teal/emerald
      currentColors[5] || '#ff4013',  // orange/primary
      currentColors[6] || '#0d5cb6',  // blue
      currentColors[7] || '#ffa000'   // gold/amber
    ].filter(Boolean);

    for (let slot = 0; slot < slotCount; slot += 1) {
      const projectIndex = slot % projectCount;
      const project = this.projects[projectIndex];
      const slide = document.createElement('div');
      slide.className = 'slide';
      slide.dataset.slotIndex = String(slot);
      slide.dataset.projectIndex = String(projectIndex);
      slide.dataset.projectId = project?.id || `p${projectIndex}`;
      slide.setAttribute('role', 'button');
      slide.tabIndex = 0;
      slide.setAttribute('aria-label', `Open project: ${project?.title || 'Project'}`);
      
      // Create gradient string with hard stops for animated border
      // Each color appears twice to create hard stops: color1 0%, color1 25%, color2 25%, color2 50%, etc.
      const gradientStops = [];
      const numColors = gradientColors.length;
      for (let i = 0; i < numColors; i++) {
        const startPercent = (i / numColors) * 100;
        const endPercent = ((i + 1) / numColors) * 100;
        gradientStops.push(`${gradientColors[i]} ${startPercent}%`);
        gradientStops.push(`${gradientColors[i]} ${endPercent}%`);
      }
      const gradientString = `linear-gradient(90deg, ${gradientStops.join(', ')})`;
      slide.style.setProperty('--slide-gradient', gradientString);

      const imgContainer = document.createElement('div');
      imgContainer.className = 'slide-image-container';

      const img = document.createElement('img');
      img.className = 'slide-image';
      img.alt = project?.title ? `${project.title} preview` : 'Project preview';
      let imgSrc = project?.image
        ? `${CONFIG.assetBasePath}${project.image}`
        : CONFIG.coverFallback;
      // Add cache-busting query parameter (works in both dev and production)
      const separator = imgSrc.includes('?') ? '&' : '?';
      imgSrc = `${imgSrc}${separator}v=${getCacheBustValue()}`;
      img.src = imgSrc;
      img.loading = 'lazy';
      img.draggable = false;

      imgContainer.appendChild(img);
      slide.appendChild(imgContainer);
      this.rig.appendChild(slide);
      this.slides.push(slide);
    }
  }

  setupMeta() {
    this.metaContainer = document.getElementById('portfolioMeta');
    if (!this.metaContainer) return;
    this.metaClient = this.metaContainer.querySelector('[data-meta="client"]');
    this.metaTitle = this.metaContainer.querySelector('[data-meta="title"]');
    this.metaSummary = this.metaContainer.querySelector('[data-meta="summary"]');
  }

  parseValue(val) {
    const trimmed = String(val).trim();
    if (trimmed.endsWith('vw')) {
      return (parseFloat(trimmed) / 100) * window.innerWidth;
    }
    if (trimmed.endsWith('vh')) {
      return (parseFloat(trimmed) / 100) * window.innerHeight;
    }
    if (trimmed.endsWith('vmin')) {
      const minSide = Math.min(window.innerWidth, window.innerHeight);
      return (parseFloat(trimmed) / 100) * minSide;
    }
    if (trimmed.endsWith('vmax')) {
      const maxSide = Math.max(window.innerWidth, window.innerHeight);
      return (parseFloat(trimmed) / 100) * maxSide;
    }
    if (trimmed.endsWith('rem')) {
      const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      return parseFloat(trimmed) * fontSize;
    }
    return parseFloat(trimmed);
  }

  getWheelLineHeight() {
    const styles = getComputedStyle(document.body);
    const lineHeight = parseFloat(styles.lineHeight);
    if (Number.isFinite(lineHeight)) return lineHeight;
    const fontSize = parseFloat(styles.fontSize);
    if (Number.isFinite(fontSize)) return fontSize * 1.4;
    return this.wheelConfig?.lineHeightFallback ?? 16;
  }

  getWheelDelta(event) {
    const absX = Math.abs(event.deltaX);
    const absY = Math.abs(event.deltaY);
    let delta = 0;

    if (event.shiftKey && absY > absX) {
      delta = event.deltaY;
    } else {
      delta = absX >= absY ? event.deltaX : event.deltaY;
    }

    if (delta === 0) return 0;

    if (event.deltaMode === 1) {
      delta *= this.wheelLineHeight;
    } else if (event.deltaMode === 2) {
      const pageWidth = this.viewport ? this.viewport.clientWidth : window.innerWidth;
      const pageScale = this.wheelConfig?.pageScale ?? 1;
      delta *= pageWidth * pageScale;
    }

    return delta;
  }

  isInteractiveTarget(target) {
    if (!target || typeof target.closest !== 'function') return false;
    return !!target.closest(
      'a, button, input, select, textarea, .panel-dock, .portfolio-header, .portfolio-footer, .project-detail, .sound-toggle'
    );
  }

  bindEvents() {
    const surface = this.inputSurface || document.body;
    const dragSurface = surface;
    // Map wheel input (vertical or horizontal) into wheel rotation.
    surface.addEventListener('wheel', (e) => {
        if (this.detailOpen || e.target.closest('.project-detail')) return;
        if (this.isInteractiveTarget(e.target)) return;
        if (e.ctrlKey || e.metaKey) return;
        if (this.dragPointerId !== null) return;
        const delta = this.getWheelDelta(e);
        if (!delta) return;
        e.preventDefault();
        this.applyWheelImpulse(delta);

        // Feed Scroll FX: strictly left/right based on delta sign
        // (Both directions are “burning”; the trail reflects direction + speed.)
        // Scroll FX removed (per request).
    }, { passive: false });

    // Drag to spin
    surface.addEventListener('pointerdown', (e) => {
        if (this.detailOpen) return;
        if (e.button !== 0) return;
        if (this.isInteractiveTarget(e.target)) return;
        this.dragPointerId = e.pointerId;
        this.dragPointerCaptured = false;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragLastX = e.clientX;
        this.dragLastY = e.clientY;
        this.dragLastTime = performance.now();
        this.dragMoved = false;
    });

    surface.addEventListener('pointermove', (e) => {
        if (this.dragPointerId === null || e.pointerId !== this.dragPointerId) return;
        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;
        if (!this.dragMoved) {
            if (Math.abs(deltaX) < this.dragThreshold && Math.abs(deltaY) < this.dragThreshold) return;
            this.dragMoved = true;
            if (dragSurface.setPointerCapture) {
                dragSurface.setPointerCapture(e.pointerId);
                this.dragPointerCaptured = true;
            }
            this.viewport.classList.add('is-dragging');
        }
        const now = performance.now();
        const elapsed = Math.max(0.016, (now - this.dragLastTime) / 1000);
        const frameDeltaX = e.clientX - this.dragLastX;
        const frameDeltaY = e.clientY - this.dragLastY;
        const dominantX = Math.abs(frameDeltaX) >= Math.abs(frameDeltaY);
        const movement = dominantX ? frameDeltaX : frameDeltaY;
        const viewportWidth = this.viewport?.clientWidth || window.innerWidth;
        const viewportHeight = this.viewport?.clientHeight || window.innerHeight;
        const base = dominantX ? viewportWidth : viewportHeight;
        const ratio = base ? movement / base : 0;
        const rotations = ratio * this.wheelDragSpeed;
        const radians = rotations * Math.PI * 2;
        this.wheelRotation += radians;
        const inputVelocity = radians / elapsed;
        const ease = Number.isFinite(this.wheelEase) ? this.wheelEase : 0.2;
        this.wheelVelocity = (this.wheelVelocity * (1 - ease)) + (inputVelocity * ease);
        this.dragLastX = e.clientX;
        this.dragLastY = e.clientY;
        this.dragLastTime = now;
        e.preventDefault();
    });

    const stopDrag = (e) => {
        if (this.dragPointerId === null) return;
        if (e && e.pointerId !== this.dragPointerId) return;
        if (this.dragPointerCaptured && dragSurface.releasePointerCapture) {
            try {
                dragSurface.releasePointerCapture(this.dragPointerId);
            } catch (err) {}
        }
        this.dragPointerCaptured = false;
        this.dragPointerId = null;
        this.viewport.classList.remove('is-dragging');
        if (this.dragMoved) {
            this.dragSuppressClickUntil = performance.now() + 200;
        }
        this.dragMoved = false;
    };

    surface.addEventListener('pointerup', stopDrag);
    surface.addEventListener('pointercancel', stopDrag);
    surface.addEventListener('pointerleave', stopDrag);

    // Slide to detail view (delegate from document so overlays/stacking contexts can't block hit-testing)
    const getSlideFromPoint = (clientX, clientY) => {
        if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
        const elements = document.elementsFromPoint(clientX, clientY);
        for (const el of elements) {
            const slide = el?.closest?.('.slide');
            if (slide) return slide;
        }
        return null;
    };

    const repairDetailStateIfStuck = () => {
        // If CSS/DOM gets out of sync (e.g., interrupted close), the carousel can become unclickable
        // due to `body.detail-open .portfolio-viewport { pointer-events:none; }`.
        if (this.detailOpen) return;
        if (!document.body.classList.contains('detail-open')) return;

        document.body.classList.remove('detail-open');

        if (this.detailOverlay) {
            this.detailOverlay.classList.remove('is-open');
            this.detailOverlay.style.removeProperty('opacity');
            this.detailOverlay.style.removeProperty('transform');
            this.detailOverlay.setAttribute('aria-hidden', 'true');
        }
    };

    document.addEventListener('click', (e) => {
        if (!this.viewport) return;
        if (this.dragSuppressClickUntil && performance.now() < this.dragSuppressClickUntil) return;

        // If the detail overlay is open, don't open another slide.
        if (this.detailOpen) return;

        // Critical: never allow UI interactions (panel/controls/header/footer) to open slides.
        if (this.isInteractiveTarget(e.target)) return;

        // Fix rare stuck states that block input.
        repairDetailStateIfStuck();

        // Ignore clicks not originating within the portfolio viewport.
        // We use a coordinate-based hit test so it still works if any overlay temporarily
        // affects pointer-events / event targeting.
        const viewportRect = this.viewport.getBoundingClientRect();
        const inViewport =
            e.clientX >= viewportRect.left &&
            e.clientX <= viewportRect.right &&
            e.clientY >= viewportRect.top &&
            e.clientY <= viewportRect.bottom;
        if (!inViewport) return;

        // If click is inside an actually-open detail overlay, ignore it.
        const detailEl = e.target.closest?.('.project-detail');
        if (detailEl && detailEl.getAttribute('aria-hidden') === 'false') return;

        const slide = e.target.closest?.('.slide') || getSlideFromPoint(e.clientX, e.clientY);
        if (!slide) return;
        const index = Number(slide.dataset.projectIndex ?? slide.dataset.index);
        if (Number.isNaN(index)) return;
        this.openProjectDetail(index, slide);
    }, { capture: true });

    document.addEventListener('keydown', (e) => {
        if (this.detailOpen) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const slide = e.target.closest?.('.slide');
        if (!slide) return;
        e.preventDefault();
        const index = Number(slide.dataset.projectIndex ?? slide.dataset.index);
        if (Number.isNaN(index)) return;
        this.openProjectDetail(index, slide);
    });

    // Close detail view with Escape.
    document.addEventListener('keydown', (e) => {
        if (this.detailOpen && e.key === 'Escape') this.closeProjectDetail();
    });

    // Mouse tilt tracking (horizontal and vertical) - INVERTED, mouse only (not touch/drag)
    if (this.mouseTiltEnabled && this.track) {
      const handleMouseMove = (e) => {
        // Only apply to real mouse pointer (ignore touch/pen + synthetic events).
        if (e && e.pointerType && e.pointerType !== 'mouse') return;

        // Only apply to mouse, not touch/drag interactions
        if (this.detailOpen || this.dragPointerId !== null) {
          this.mouseTiltTargetX = 0;
          this.mouseTiltTargetY = 0;
          return;
        }
        if (this.isInteractiveTarget(e.target)) {
          this.mouseTiltTargetX = 0;
          this.mouseTiltTargetY = 0;
          return;
        }
        if (!this.track) return;
        
        const viewportWidth = this.viewport?.clientWidth || window.innerWidth;
        const viewportHeight = this.viewport?.clientHeight || window.innerHeight;
        const centerX = viewportWidth / 2;
        const centerY = viewportHeight / 2;
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const normalizedX = (mouseX - centerX) / centerX; // -1 (left) to 1 (right)
        const normalizedY = (mouseY - centerY) / centerY; // -1 (top) to 1 (bottom)
        const clampedX = Math.max(-1, Math.min(1, normalizedX));
        const clampedY = Math.max(-1, Math.min(1, normalizedY));
        
        // Calculate horizontal tilt: INVERTED - mouse left tilts right, mouse right tilts left
        // This creates the "holding" effect where the carousel tilts away from the cursor
        let targetTiltX = 0;
        if (clampedX < 0) {
          // Mouse on left side: tilt RIGHT (positive, inverted)
          targetTiltX = this.mouseTiltRight * Math.abs(clampedX) * this.mouseTiltSensitivity;
        } else {
          // Mouse on right side: tilt LEFT (negative, inverted)
          targetTiltX = -this.mouseTiltLeft * clampedX * this.mouseTiltSensitivity;
        }
        
        // Calculate vertical tilt: INVERTED - mouse up tilts down, mouse down tilts up
        let targetTiltY = 0;
        if (clampedY < 0) {
          // Mouse on top side: tilt DOWN (positive, inverted)
          targetTiltY = this.mouseTiltDown * Math.abs(clampedY) * this.mouseTiltSensitivity;
        } else {
          // Mouse on bottom side: tilt UP (negative, inverted)
          targetTiltY = -this.mouseTiltUp * clampedY * this.mouseTiltSensitivity;
        }
        
        if (this.mouseTiltInvertX) targetTiltX = -targetTiltX;
        if (this.mouseTiltInvertY) targetTiltY = -targetTiltY;

        this.mouseTiltTargetX = targetTiltX;
        this.mouseTiltTargetY = targetTiltY;
      };

      // Listen on `document` so stacking contexts / overlays can't block tilt updates.
      // We explicitly ignore interactive UI targets above.
      document.addEventListener('pointermove', handleMouseMove, { passive: true });

      const resetTilt = () => {
        this.mouseTiltTargetX = 0;
        this.mouseTiltTargetY = 0;
      };

      // Reset tilt when pointer leaves the window / app loses focus.
      window.addEventListener('blur', resetTilt, { passive: true });
      window.addEventListener('mouseout', (event) => {
        if (!event.relatedTarget && !event.toElement) resetTilt();
      }, { passive: true });

      // Reset tilt when drag starts (to prevent interference with drag interaction)
      surface.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button === 0) {
          this.mouseTiltTargetX = 0;
          this.mouseTiltTargetY = 0;
        }
      });
    }

  }

  setupCustomCursor() {
    if (this.customCursor) return;
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

    const cursor = document.createElement('div');
    cursor.id = 'custom-cursor';
    cursor.classList.add('gate-active');
    cursor.setAttribute('aria-hidden', 'true');
    cursor.style.display = 'none';
    document.body.appendChild(cursor);
    this.customCursor = cursor;

    // Helper to check if hovering over a link
    const isOverLink = (target) => {
      if (!target || !target.closest) return false;
      const link = target.closest('a, button, [role="button"]');
      if (!link) return false;
      // Exclude portfolio carousel slides
      if (link.classList?.contains?.('slide')) return false;
      if (link.closest?.('.slide')) return false;
      return true;
    };

    const update = (event) => {
      if (event.pointerType === 'touch') return;
      
      // Rapidly hide cursor when hovering over links
      if (isOverLink(event.target)) {
        cursor.style.display = 'none';
        return;
      }
      
      cursor.style.display = 'block';
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    };

    const hide = () => {
      cursor.style.display = 'none';
    };

    document.addEventListener('pointermove', update);
    document.addEventListener('pointerdown', update);
    window.addEventListener('blur', hide);
    window.addEventListener('mouseout', (event) => {
      if (!event.relatedTarget && !event.toElement) hide();
    });
  }

  setupCardHover() {
    // Add hover listeners to all slides for cursor color change
    const handleSlideEnter = (e) => {
      if (e.pointerType === 'touch') return;
      document.body.classList.add('portfolio-card-hovering');
    };

    const handleSlideLeave = (e) => {
      if (e.pointerType === 'touch') return;
      // Only remove if we're not moving to another slide
      const relatedSlide = e.relatedTarget?.closest('.slide');
      if (!relatedSlide) {
        document.body.classList.remove('portfolio-card-hovering');
      }
    };

    // Use event delegation on the rig for dynamic slides (works even if slides are re-rendered)
    if (this.rig) {
      this.rig.addEventListener('mouseenter', (e) => {
        if (e.target.closest('.slide')) {
          handleSlideEnter(e);
        }
      }, true);
      this.rig.addEventListener('mouseleave', handleSlideLeave, true);
    }

    // Also attach listeners to individual slides for more precise control
    if (this.slides && this.slides.length > 0) {
      this.slides.forEach(slide => {
        slide.addEventListener('mouseenter', handleSlideEnter);
        slide.addEventListener('mouseleave', handleSlideLeave);
      });
    }
  }

  setupSoundToggle() {
    try {
      createSoundToggle();
    } catch (e) {}
  }

  // Bio/CV and Contact modals are now initialized via shared chrome bundle
  // Modal triggers are handled automatically by initCVModal() and initContactModal()

  getCssLength(varName, fallback) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!raw) return fallback;
    const value = this.parseValue(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  updateWheelConfig() {
    this.wheelRadiusX = this.getCssLength('--wheel-radius-x', window.innerWidth * 0.35);
    this.wheelRadiusY = this.getCssLength('--wheel-radius-y', window.innerHeight * 0.18);
    this.wheelSpacing = this.getCssLength('--wheel-spacing', 0);
    // Enforce a minimum spacing derived from actual card width and angular step
    const baseSpacing = this.wheelSpacing;
    const firstSlide = this.slides?.[0];
    const cardWidthPx = firstSlide?.getBoundingClientRect?.()?.width || 0;
    const step = this.wheelStep || this.wheelBaseStep || 0;
    if (cardWidthPx > 0 && step > 0) {
      const minRadius = (cardWidthPx * 1.1) / (2 * Math.max(Math.sin(step / 2), 0.001));
      const requiredSpacing = Math.max(0, minRadius - this.wheelRadiusX);
      this.wheelSpacing = Math.max(baseSpacing, requiredSpacing);
    }
    this.wheelCenterX = this.getCssLength('--wheel-center-x', 0);
    this.wheelCenterY = this.getCssLength('--wheel-center-y', 0);
    const tiltDeg = this.getCssNumber('--wheel-tilt', 60);
    this.wheelTilt = (tiltDeg * Math.PI) / 180;
    this.wheelDepth = this.getCssNumber('--wheel-depth', 1);
    this.wheelRotateFactor = this.getCssNumber('--wheel-rotate', 12);
    this.wheelScaleMin = this.getCssNumber('--wheel-scale-min', 0.8);
    this.wheelScaleMax = this.getCssNumber('--wheel-scale-max', 1);
    this.wheelBlurMax = this.getCssLength('--wheel-blur-max', 0);
    this.wheelOpacityMin = this.getCssNumber('--wheel-opacity-min', 0.2);
    this.wheelOpacityMax = this.getCssNumber('--wheel-opacity-max', 1);
    this.wheelOpacityCurve = this.getCssNumber('--wheel-opacity-curve', 1);
    this.wheelActiveLift = this.getCssLength('--wheel-active-lift', 0);
    this.wheelScrollSpeed = this.getCssNumber('--wheel-scroll-speed', 0.7);
    this.wheelDragSpeed = this.getCssNumber('--wheel-drag-speed', 1);
    this.wheelFriction = this.getCssNumber('--wheel-friction', 4);
    
    // Read hover effect values from CSS
    this.cardHoverScale = this.getCssNumber('--card-hover-scale', 1.025);
    this.cardHoverLift = this.getCssLength('--card-hover-lift', 0.6); // Z-axis movement towards user on hover (vmin, reduced by 92.5% total)
    this.wheelSnapSpeed = this.getCssNumber('--wheel-snap-speed', 0.2);
    this.wheelSnapStrength = this.getCssNumber('--wheel-snap-strength', 6);
    this.wheelBounceStrength = this.getCssNumber('--wheel-bounce-strength', 14);
    this.wheelBounceDamping = this.getCssNumber('--wheel-bounce-damping', 8);
    this.wheelBounceImpulse = this.getCssLength('--wheel-bounce-impulse', 0);
    this.mouseTiltLeft = this.getCssNumber('--mouse-tilt-left', 3);
    this.mouseTiltRight = this.getCssNumber('--mouse-tilt-right', 3);
    this.mouseTiltUp = this.getCssNumber('--mouse-tilt-up', 3);
    this.mouseTiltDown = this.getCssNumber('--mouse-tilt-down', 3);
    this.updateWheelPositions(0, true);
  }

  startWheel() {
    if (this.wheelFrame) return;
    this.wheelLastTime = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - this.wheelLastTime) / 1000));
      this.wheelLastTime = now;
      this.updateWheelPhysics(dt);

      // Drive Scroll FX intensity from the carousel wheel velocity (“slider speed”).
      // Scroll FX removed (per request).

      this.updateWheelPositions(dt);
      this.wheelFrame = window.requestAnimationFrame(tick);
    };
    this.wheelFrame = window.requestAnimationFrame(tick);
  }

  updateWheelPhysics(dt) {
    if (this.detailOpen) {
      this.wheelVelocity = 0;
      this.pendingBounceImpulse = 0;
      this.updateWheelAudio(0);
      return;
    }
    if (this.prefersReducedMotion) {
      this.wheelVelocity = 0;
      this.wheelRotation = this.getNearestSnapRotation(this.wheelRotation);
      this.updateWheelAudio(0);
      return;
    }

    const prevVelocity = this.prevWheelVelocity;
    if (this.dragPointerId === null) {
      this.wheelRotation += this.wheelVelocity * dt;
      const friction = Math.max(0, this.wheelFriction);
      const decay = Math.exp(-friction * dt);
      this.wheelVelocity *= decay;

      const snapSpeed = this.wheelSnapSpeed * Math.PI * 2;
      if (Math.abs(this.wheelVelocity) < snapSpeed && this.wheelStep) {
        const target = this.getNearestSnapRotation(this.wheelRotation);
        const diff = target - this.wheelRotation;
        this.wheelVelocity += diff * this.wheelSnapStrength * dt;
      }

      if (Math.abs(prevVelocity) >= snapSpeed && Math.abs(this.wheelVelocity) < snapSpeed && this.wheelBounceImpulse > 0) {
        const impulseScale = Math.min(1, Math.abs(prevVelocity) / (snapSpeed * 6));
        this.pendingBounceImpulse = this.wheelBounceImpulse * impulseScale * (prevVelocity >= 0 ? -1 : 1);
      }
    }

    this.prevWheelVelocity = this.wheelVelocity;
    this.updateWheelAudio();

    if (Math.abs(this.wheelRotation) > Math.PI * 8) {
      this.wheelRotation = this.wrapAngle(this.wheelRotation);
    }

    // Update mouse tilt with smooth easing + apply the group tilt on the track rig.
    // IMPORTANT: We do NOT transform the whole track (that makes the entire scene feel like it tilts).
    // Instead, we transform a tiny centered track "rig" (see `.slider-track` CSS), so it reads as
    // the carousel object tilting in space (not a full-screen plane).
    if (this.mouseTiltEnabled && this.rig) {
      if (!this.detailOpen && !this.prefersReducedMotion && this.dragPointerId === null) {
        const ease = this.mouseTiltEase;
        this.mouseTiltCurrentX = this.mouseTiltCurrentX + (this.mouseTiltTargetX - this.mouseTiltCurrentX) * ease;
        this.mouseTiltCurrentY = this.mouseTiltCurrentY + (this.mouseTiltTargetY - this.mouseTiltCurrentY) * ease;
        if (Math.abs(this.mouseTiltCurrentX) > 0.01 || Math.abs(this.mouseTiltCurrentY) > 0.01) {
          // Z-pivot: translate to pivot, rotate, translate back.
          // Applied on the track "rig" so the whole carousel tilts as a group.
          this.rig.style.transform = [
            'translateZ(var(--mouse-tilt-pivot-z))',
            `rotateY(${this.mouseTiltCurrentX.toFixed(2)}deg)`,
            `rotateX(${this.mouseTiltCurrentY.toFixed(2)}deg)`,
            'translateZ(calc(var(--mouse-tilt-pivot-z) * -1))',
          ].join(' ');
        } else {
          this.rig.style.transform = '';
        }
      } else {
        this.mouseTiltCurrentX = 0;
        this.mouseTiltCurrentY = 0;
        this.mouseTiltTargetX = 0;
        this.mouseTiltTargetY = 0;
        this.rig.style.transform = '';
      }
    }
  }

  getNearestSnapRotation(rotation) {
    if (!this.wheelStep) return rotation;
    return Math.round(rotation / this.wheelStep) * this.wheelStep;
  }

  updateWheelPositions(dt = 0, forceActive = false) {
    if (!this.slides.length || !this.viewport || !this.wheelStep) return;
    const viewportWidth = this.viewport.clientWidth || window.innerWidth;
    const viewportHeight = this.viewport.clientHeight || window.innerHeight;
    const vmin = Math.min(viewportWidth, viewportHeight);
    const activeSlot = this.getActiveSlotIndex();
    const tiltFactor = Math.sin(this.wheelTilt);
    const radiusX = this.wheelRadiusX + this.wheelSpacing;
    const radiusY = this.wheelRadiusY + this.wheelSpacing;
    const dtSec = Math.max(0.001, dt || 0.001);
    const bounceImpulse = this.pendingBounceImpulse;
    if (bounceImpulse) this.pendingBounceImpulse = 0;

    this.slides.forEach((slide, index) => {
      const angle = (index * this.wheelStep) + this.wheelRotation;
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      const depth = (1 - cos) * 0.5;
      const depthScaled = depth * this.wheelDepth;
      const depthFactor = Math.min(1, Math.max(0, depthScaled));
      const lift = (1 - depthFactor) * this.wheelActiveLift;
      const x = (sin * radiusX) + this.wheelCenterX;
      let y = (depthScaled * radiusY * tiltFactor) - lift + this.wheelCenterY;
      const scale = this.wheelScaleMin + ((1 - depthFactor) * (this.wheelScaleMax - this.wheelScaleMin));
      const blurPx = this.wheelBlurMax * depthFactor;
      const blurVmin = vmin > 0 ? (blurPx / vmin) * 100 : 0;
      const fogDepth = Math.pow(depthFactor, Math.max(0.2, this.wheelOpacityCurve));
      const opacityMin = Math.max(0, Math.min(1, this.wheelOpacityMin));
      const opacityMax = Math.max(opacityMin, Math.min(1, this.wheelOpacityMax));
      const opacity = opacityMin + ((opacityMax - opacityMin) * (1 - fogDepth));
      const rotate = sin * this.wheelRotateFactor;

      if (this.cardBob[index] === undefined) {
        this.cardBob[index] = 0;
        this.cardBobVel[index] = 0;
      }

      if (this.wheelBounceStrength > 0) {
        if (bounceImpulse) {
          const depthWeight = 1 - depthFactor;
          this.cardBobVel[index] += bounceImpulse * depthWeight;
        }
        const bob = this.cardBob[index];
        let bobVel = this.cardBobVel[index];
        bobVel += (-bob) * this.wheelBounceStrength * dtSec;
        bobVel *= Math.exp(-this.wheelBounceDamping * dtSec);
        const nextBob = bob + (bobVel * dtSec);
        this.cardBob[index] = nextBob;
        this.cardBobVel[index] = bobVel;
        y += nextBob;
      }

      // Don't update X/Y for expanding cards (they're frozen in place)
      if (!slide.classList.contains('is-expanding')) {
        const xVw = viewportWidth ? (x / viewportWidth) * 100 : 0;
        const yVh = viewportHeight ? (y / viewportHeight) * 100 : 0;
        slide.style.setProperty('--slide-x', `${xVw}vw`);
        slide.style.setProperty('--slide-y', `${yVh}vh`);
      } else {
        // Restore frozen X/Y position for expanding cards
        if (slide.dataset.frozenX) {
          slide.style.setProperty('--slide-x', slide.dataset.frozenX);
        }
        if (slide.dataset.frozenY) {
          slide.style.setProperty('--slide-y', slide.dataset.frozenY);
        }
      }
      // True 3D geometry: give the wheel depth along Z so perspective doesn't look flat.
      // Symmetric around the rig origin: front cards move toward camera, back cards recede.
      const zSpreadVmin = this.wheelDepth * 10; // reuse existing depth control as the overall 3D amplitude
      const zVmin = (0.5 - depthFactor) * zSpreadVmin;
      
      // Don't update Z/scale for expanding cards (they're already positioned)
      if (!slide.classList.contains('is-expanding')) {
        // Hover effect: Move forward on Z-axis (towards user) and scale up
        const isHovered = slide.matches(':hover');
        // Apply scale increase on hover
        const finalScale = isHovered ? scale * this.cardHoverScale : scale;
        // Move forward on Z-axis on hover (towards camera in 3D space)
        // Positive Z moves towards viewer, anchored in 3D perspective viewport
        const finalZ = isHovered ? zVmin + this.cardHoverLift : zVmin;
        
        slide.style.setProperty('--slide-z', `${finalZ.toFixed(2)}vmin`);
        slide.style.setProperty('--slide-scale', finalScale.toFixed(4)); // 4 decimal precision
      }
      // Remove blur on hover - CSS will override with !important, but set it here too for consistency
      const isHovered = slide.matches(':hover');
      const finalBlur = isHovered ? 0 : blurVmin;
      slide.style.setProperty('--slide-blur', `${finalBlur}vmin`);
      slide.style.setProperty('--slide-opacity', Math.max(0, Math.min(1, opacity)).toFixed(3));
      slide.style.setProperty('--slide-rotate', `${rotate.toFixed(2)}deg`);
      slide.style.zIndex = String(Math.round((1 - depthFactor) * 1000));

      if (forceActive) {
        slide.classList.toggle('active', index === activeSlot);
      }
    });

    this.updateActiveFromRotation(activeSlot, forceActive);
  }

  getActiveSlotIndex() {
    if (!this.wheelStep || !this.wheelSlotCount) return 0;
    const rawIndex = -this.wheelRotation / this.wheelStep;
    const snapped = Math.round(rawIndex);
    const mod = ((snapped % this.wheelSlotCount) + this.wheelSlotCount) % this.wheelSlotCount;
    return mod;
  }

  updateActiveFromRotation(activeSlot, force = false) {
    if (!this.slides.length) return;
    const slotIndex = Number.isFinite(activeSlot) ? activeSlot : this.getActiveSlotIndex();
    if (slotIndex !== this.activeSlot || force) {
      this.activeSlot = slotIndex;
      this.slides.forEach((slide, index) => {
        slide.classList.toggle('active', index === slotIndex);
      });

      const activeSlide = this.slides[slotIndex];
      const projectIndex = Number(activeSlide?.dataset.projectIndex ?? slotIndex);
      if (Number.isFinite(projectIndex) && projectIndex !== this.activeIndex) {
        this.activeIndex = projectIndex;
        this.prefetchProjectAssets(this.projects[projectIndex]);
        this.updateFixedMeta(this.projects[projectIndex]);
        this.maybePlayCenterClick();
        
        // Preload ±2 adjacent projects (cover images only)
        [-2, -1, 1, 2].forEach(offset => {
          const adjIndex = (projectIndex + offset + this.projects.length) % this.projects.length;
          const adjProject = this.projects[adjIndex];
          if (adjProject && !this.preloadedProjects.has(adjProject.id)) {
            // Only preload cover image, not full detail
            const coverSrc = adjProject.image ? `${CONFIG.assetBasePath}${adjProject.image}` : null;
            if (coverSrc && !this.preloadedAssets.has(coverSrc)) {
              this.preloadedAssets.add(coverSrc);
              this.preloadImage(coverSrc);
            }
          }
        });
      }

      const snapSpeed = this.wheelSnapSpeed * Math.PI * 2;
      if (this.snapSoundEnabled && !this.detailOpen && slotIndex !== this.lastSnapSlot && Math.abs(this.wheelVelocity) < snapSpeed) {
        const now = performance.now();
        const debounceMs = this.snapSoundDebounceMs || 300;
        if (now - this.lastSnapSoundTime > debounceMs) {
          SoundEngine.playWheelSnap();
          this.lastSnapSoundTime = now;
          this.lastSnapSlot = slotIndex;
        }
      }
    }
  }

  maybePlayCenterClick() {
    if (!this.centerClickEnabled) return;
    if (this.detailOpen) return;
    if (this.prefersReducedMotion) return;
    if (!Number.isFinite(this.lastWheelSpeed) || this.lastWheelSpeed < this.centerClickMinSpeed) return;

    const now = performance.now();
    const debounceMs = Math.max(0, this.centerClickDebounceMs || 0);
    if (debounceMs && (now - this.lastCenterClickTime) < debounceMs) return;

    SoundEngine.playWheelCenterClick();
    this.lastCenterClickTime = now;
  }

  wrapAngle(angle) {
    const twoPi = Math.PI * 2;
    let wrapped = angle % twoPi;
    if (wrapped > Math.PI) wrapped -= twoPi;
    if (wrapped < -Math.PI) wrapped += twoPi;
    return wrapped;
  }

  applyWheelImpulse(delta) {
    if (!this.viewport) return;
    const viewportWidth = this.viewport.clientWidth || window.innerWidth;
    const viewportHeight = this.viewport.clientHeight || window.innerHeight;
    const viewportSize = Math.min(viewportWidth, viewportHeight) || viewportWidth || 1;
    const ratio = viewportSize ? delta / viewportSize : 0;
    const rotations = ratio * this.wheelScrollSpeed * (Number.isFinite(this.wheelSensitivity) ? this.wheelSensitivity : 1);
    const radians = rotations * Math.PI * 2;
    const now = performance.now();
    const dt = this.lastWheelTime ? Math.max(0.016, (now - this.lastWheelTime) / 1000) : 0.016;
    this.lastWheelTime = now;
    const inputVelocity = radians / dt;
    const ease = Number.isFinite(this.wheelEase) ? this.wheelEase : 0.2;
    this.wheelVelocity = (this.wheelVelocity * (1 - ease)) + (inputVelocity * ease);
  }

  updateWheelAudio(speedOverride) {
    const now = performance.now();
    if (now - this.lastAudioUpdate < 40) return;
    this.lastAudioUpdate = now;
    const baseRadius = (this.wheelRadiusX || window.innerWidth * 0.3) + (this.wheelSpacing || 0);
    const speed = Number.isFinite(speedOverride)
      ? speedOverride
      : Math.abs(this.wheelVelocity) * baseRadius;
    this.lastWheelSpeed = Number.isFinite(speed) ? speed : 0;
    if (this.continuousWheelEnabled) {
      SoundEngine.updateWheelSfx(speed);
      return;
    }
    // Ensure any legacy loops stop promptly when disabled.
    SoundEngine.updateWheelSfx(0);
  }

  updateFixedMeta(project) {
    if (!this.metaContainer || !project) return;
    const nextKey = project.id || project.title || '';
    if (this.metaContainer.dataset.projectId === nextKey) return;

    const setField = (element, value) => {
      if (!element) return;
      const text = value ? String(value) : '';
      element.textContent = text;
      element.style.display = text ? 'block' : 'none';
    };

    const summary = project.summary || (Array.isArray(project.tags) ? project.tags.join(' ') : '');
    const swapDelay = this.prefersReducedMotion
      ? 0
      : Math.round(this.getCssNumber('--meta-transition-speed', 360) * 0.45);

    if (this.metaSwapTimer) {
      window.clearTimeout(this.metaSwapTimer);
      this.metaSwapTimer = null;
    }

    this.metaContainer.classList.add('is-switching');

    const applyUpdate = () => {
      this.metaContainer.dataset.projectId = nextKey;
      setField(this.metaClient, project.client);
      setField(this.metaTitle, project.title);
      setField(this.metaSummary, summary);
      requestAnimationFrame(() => this.metaContainer.classList.remove('is-switching'));
    };

    if (swapDelay === 0) {
      applyUpdate();
      return;
    }

    this.metaSwapTimer = window.setTimeout(() => {
      this.metaSwapTimer = null;
      applyUpdate();
    }, swapDelay);
  }

  setupDetailOverlay() {
    this.detailOverlay = document.getElementById('projectDetail');
    if (!this.detailOverlay) {
        this.detailOverlay = this.createDetailOverlay();
    }
    this.transitionHost = document.querySelector('.wall-frame') || document.body;
    this.detailContent = this.detailOverlay.querySelector('#projectDetailContent');
    this.detailScroller = this.detailOverlay.querySelector('.project-detail__scroller');
    this.detailClose = this.detailOverlay.querySelector('[data-detail-close]');
    if (this.detailClose) {
        this.detailClose.addEventListener('click', () => this.closeProjectDetail());
    }

    // Listen for inline close button clicks (delegated)
    this.detailOverlay.addEventListener('click', (e) => {
      if (e.target.closest('[data-detail-close-inline]')) {
        this.closeProjectDetail();
      }
    });

    this.setupCloseButtonScrollAnimation();
  }

  setupCloseButtonScrollAnimation() {
    // Scroll animation removed - button is now static
  }

  createDetailOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'projectDetail';
    overlay.className = 'project-detail';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="project-detail__progress" aria-hidden="true"></div>
      <div class="project-detail__noise project-detail__noise--back" aria-hidden="true"></div>
      <div class="project-detail__card" role="dialog" aria-modal="true" aria-label="Project detail">
        <button class="project-detail__close gate-back abs-icon-btn" type="button" aria-label="Close project detail" data-detail-close>
          <i class="ti ti-x" aria-hidden="true"></i>
        </button>
        <div class="project-detail__scroller">
          <div class="project-detail__inner" id="projectDetailContent"></div>
        </div>
      </div>
    `;
    const mountTarget = document.querySelector('.wall-frame') || document.body;
    this.transitionHost = mountTarget;
    mountTarget.appendChild(overlay);
    return overlay;
  }


  resolveDetailAsset(src) {
    if (!src) return '';
    if (/^https?:\/\//.test(src)) return src;
    const trimmed = src.replace(/^\/+/, '');
    const baseUrl = `${CONFIG.basePath}${trimmed}`;
    // Add cache-busting query parameter (works in both dev and production)
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}v=${getCacheBustValue()}`;
  }

  getContentBlocks(project) {
    if (Array.isArray(project.contentBlocks) && project.contentBlocks.length) {
        return project.contentBlocks;
    }
    if (Array.isArray(project.gallery) && project.gallery.length) {
        return project.gallery.map((src) => ({ type: 'image', src }));
    }
    return [];
  }

  getVideoMimeType(src) {
    if (!src) return '';
    if (src.endsWith('.webm')) return 'video/webm';
    if (src.endsWith('.mp4')) return 'video/mp4';
    return '';
  }

  renderDetailContent(project) {
    if (!this.detailContent || !project) return;

    let headerSrc = project.image
        ? `${CONFIG.assetBasePath}${project.image}`
        : CONFIG.coverFallback;
    // Add cache-busting query parameter (works in both dev and production)
    const separator = headerSrc.includes('?') ? '&' : '?';
    headerSrc = `${headerSrc}${separator}v=${getCacheBustValue()}`;
    const blocks = this.getContentBlocks(project);
    const links = Array.isArray(project.links) ? project.links : [];
    const takeaways = Array.isArray(project.takeaways) && project.takeaways.length
        ? project.takeaways
        : ['More takeaways coming soon.'];

    const metaItems = [
        { label: 'Focus', value: project.client },
        { label: 'Role', value: project.role },
        { label: 'Year', value: project.year },
    ].filter((item) => item.value);

    const metaHtml = metaItems.map((item) => `
      <div class="project-detail__meta-item">
        <dt>${item.label}</dt>
        <dd>${item.value}</dd>
      </div>
    `).join('');

    const blocksHtml = blocks.map((block) => {
        if (block.type === 'text') {
            return `
              <div class="project-detail__block project-detail__text-block">
                <p>${block.text || ''}</p>
              </div>
            `;
        }

        if (block.type === 'video') {
            const videoSrc = this.resolveDetailAsset(block.src);
            const videoType = this.getVideoMimeType(videoSrc);
            const shouldAutoplay = !this.prefersReducedMotion;
            return `
              <figure class="project-detail__block project-detail__video-wrapper">
                <video class="project-detail__video" ${shouldAutoplay ? 'autoplay' : ''} muted loop playsinline preload="metadata" data-src="${videoSrc}">
                  <source src="${videoSrc}"${videoType ? ` type="${videoType}"` : ''}>
                </video>
                <button class="project-detail__video-toggle" type="button" aria-label="Play/Pause video">
                  <i class="ti ti-player-${shouldAutoplay ? 'pause' : 'play'}" aria-hidden="true"></i>
                </button>
                ${block.caption ? `<figcaption class="project-detail__caption">${block.caption}</figcaption>` : ''}
              </figure>
            `;
        }

        const imageSrc = this.resolveDetailAsset(block.src);
        const alt = block.alt || project.title || 'Project image';
        return `
          <figure class="project-detail__block">
            <div class="project-detail__media-skeleton" style="aspect-ratio: 16/9;">
              <img class="project-detail__media-block" src="${imageSrc}" alt="${alt}" loading="lazy" onload="this.classList.add('loaded');this.parentElement.classList.remove('project-detail__media-skeleton')" onerror="this.classList.add('error');this.parentElement.classList.add('project-detail__media-error')">
            </div>
            ${block.caption ? `<figcaption class="project-detail__caption">${block.caption}</figcaption>` : ''}
          </figure>
        `;
    }).join('');

    const linksHtml = links.length ? `
      <div class="project-detail__links">
        ${links.map((link) => `
          <a href="${link.url}" target="_blank" rel="noopener noreferrer">
            ${link.label}
            <i class="ti ti-external-link project-detail__external-icon" aria-hidden="true"></i>
          </a>
        `).join('')}
      </div>
    ` : '';

    this.detailContent.innerHTML = `
      <section class="project-detail__hero">
        <div class="project-detail__media project-detail__media-skeleton">
          <img class="project-detail__image" src="${headerSrc}" alt="${project.title || 'Project'}" loading="eager" onload="this.classList.add('loaded');this.parentElement.classList.remove('project-detail__media-skeleton')" onerror="this.classList.add('error');this.parentElement.classList.add('project-detail__media-error')">
        </div>
        <div class="project-detail__content project-detail__content--hero">
          <div class="project-detail__intro">
            ${project.client ? `<div class="project-detail__eyebrow">${project.client}</div>` : ''}
            <h1 class="project-detail__title">${project.title || ''}</h1>
            ${metaItems.length ? `<dl class="project-detail__meta">${metaHtml}</dl>` : ''}
          </div>
        </div>
      </section>
      <section class="project-detail__body">
        <div class="project-detail__content project-detail__content--body">
          ${project.overview ? `
            <section class="project-detail__overview">
              <h2>Overview</h2>
              <p>${project.overview}</p>
            </section>
          ` : ''}
          ${linksHtml}
          ${blocksHtml ? `<section class="project-detail__stack">${blocksHtml}</section>` : ''}
          <section class="project-detail__takeaways">
            <h2>Personal takeaways</h2>
            <ul>
              ${takeaways.map((item) => `<li>${item}</li>`).join('')}
            </ul>
          </section>
          <div class="project-detail__close-footer">
            <button class="project-detail__close-inline gate-back abs-icon-btn" type="button" aria-label="Close project detail" data-detail-close-inline>
              <i class="ti ti-x" aria-hidden="true"></i>
              <span>Close</span>
            </button>
          </div>
        </div>
      </section>
    `;

    this.syncDetailVideos();
    if (this.detailScroller) this.detailScroller.scrollTop = 0;
  }

  getCssNumber(varName, fallback) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    const value = parseFloat(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  hasDetailTransition() {
    if (!this.detailOverlay || this.prefersReducedMotion) return false;
    const raw = getComputedStyle(this.detailOverlay).transitionDuration || '';
    const parts = raw.split(',').map((value) => parseFloat(value));
    return parts.some((value) => Number.isFinite(value) && value > 0);
  }

  waitForDetailTransition(callback) {
    if (!this.detailOverlay) {
      this.isTransitioning = false;
      this.detailOpen = false;
      return;
    }
    const overlay = this.detailOverlay;
    const handler = (event) => {
      if (event.target !== overlay) return;
      if (event.propertyName !== 'opacity') return;
      overlay.removeEventListener('transitionend', handler);
      callback?.();
    };
    overlay.addEventListener('transitionend', handler);
  }


  openProjectDetail(index, slide) {
    // Guard: prevent opening if already open or transitioning
    if (this.detailOpen || this.isTransitioning || !slide) return;
    const project = this.projects[index];
    if (!project) return;

    this.isTransitioning = true;
    this.detailOpen = true;
    this.activeSlide = slide;
    this.lastFocusedElement = document.activeElement;

    // Freeze the clicked card's X/Y position to prevent lateral movement
    // Only animate forward on Z-axis (towards user)
    const currentX = getComputedStyle(slide).getPropertyValue('--slide-x').trim();
    const currentY = getComputedStyle(slide).getPropertyValue('--slide-y').trim();
    slide.dataset.frozenX = currentX;
    slide.dataset.frozenY = currentY;
    
    // Get current Z and scale before adding expanding class
    const currentZStr = getComputedStyle(slide).getPropertyValue('--slide-z').trim();
    const currentZ = parseFloat(currentZStr.replace('vmin', '')) || 0;
    const currentScale = parseFloat(getComputedStyle(slide).getPropertyValue('--slide-scale').trim()) || 1;
    
    // Add expanding class first, then set new values to trigger smooth transition
    slide.classList.add('is-expanding');
    
    // Request animation frame to ensure class is applied before setting new values
    requestAnimationFrame(() => {
      // Subtle forward movement on Z-axis (only 3vmin) - enough for visual feedback but keeps card accessible
      const expandLift = 3;
      slide.style.setProperty('--slide-z', `${currentZ + expandLift}vmin`);
      
      // Minimal scale increase for subtle visual feedback
      slide.style.setProperty('--slide-scale', (currentScale * 1.015).toFixed(3));
    });

    this.prefetchProjectAssets(project);
    this.renderDetailContent(project);

    // Reset close button icon styles (cleanup from any previous state)
    if (this.detailOverlay) {
      this.closeLetters = Array.from(this.detailOverlay.querySelectorAll('.close-letter'));
      const closeIcon = this.detailOverlay.querySelector('.close-icon');
      if (closeIcon) {
        closeIcon.style.transform = '';
        closeIcon.style.opacity = '';
      }
    }

    this.setupCloseButtonScrollAnimation();

    if (!this.detailOverlay) {
      this.isTransitioning = false;
      this.detailOpen = false;
      return;
    }
    this.detailOverlay.setAttribute('aria-hidden', 'false');
    this.detailOverlay.classList.add('is-open');
    document.body.classList.add('detail-open');
    SoundEngine.playWheelOpen();

    const finalizeOpen = () => {
      if (!this.detailOpen) return;
      this.isTransitioning = false;
    };

    if (this.hasDetailTransition()) {
      this.waitForDetailTransition(finalizeOpen);
    } else {
      finalizeOpen();
    }

    if (this.detailClose) this.detailClose.focus();
    
    // Setup focus trap for accessibility
    this.setupFocusTrap();
    
    // Setup arrow key navigation between projects
    this.detailKeyHandler = (e) => {
      if (!this.detailOpen) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.navigateToProject(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.navigateToProject(1);
      }
    };
    document.addEventListener('keydown', this.detailKeyHandler);
    
    // Setup scroll progress indicator
    this.progressBar = this.detailOverlay.querySelector('.project-detail__progress');
    this.scrollProgressHandler = () => {
      if (!this.detailScroller || !this.progressBar) return;
      const { scrollTop, scrollHeight, clientHeight } = this.detailScroller;
      const progress = scrollTop / (scrollHeight - clientHeight) * 100;
      this.progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    };
    this.detailScroller.addEventListener('scroll', this.scrollProgressHandler, { passive: true });
    
    // Setup swipe gestures for mobile
    this.setupSwipeGestures();
    
    // Update URL hash for deep linking (replaceState to avoid polluting history)
    if (project.id) {
      const slug = project.id.toLowerCase().replace(/\s+/g, '-');
      history.replaceState({ projectIndex: index }, '', `#project-${slug}`);
    }
  }

  setupFocusTrap() {
    if (!this.detailOverlay) return;
    
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    
    this.focusTrapHandler = (e) => {
      if (e.key !== 'Tab' || !this.detailOpen) return;
      
      const focusableElements = Array.from(
        this.detailOverlay.querySelectorAll(focusableSelector)
      ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
      
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };
    
    document.addEventListener('keydown', this.focusTrapHandler);
  }

  removeFocusTrap() {
    if (this.focusTrapHandler) {
      document.removeEventListener('keydown', this.focusTrapHandler);
      this.focusTrapHandler = null;
    }
  }

  setupSwipeGestures() {
    if (!this.detailScroller) return;
    
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let currentX = 0;
    let currentY = 0;
    
    const threshold = 50;
    const verticalThreshold = 100;
    
    this.swipeTouchStart = (e) => {
      if (!this.detailOpen) return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      currentX = startX;
      currentY = startY;
      startTime = Date.now();
    };
    
    this.swipeTouchMove = (e) => {
      if (!this.detailOpen) return;
      const touch = e.touches[0];
      currentX = touch.clientX;
      currentY = touch.clientY;
    };
    
    this.swipeTouchEnd = (e) => {
      if (!this.detailOpen) return;
      
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      const deltaTime = Date.now() - startTime;
      
      // Only process quick swipes (under 500ms) to avoid interfering with scrolling
      if (deltaTime > 500) return;
      
      // Swipe down to close (only at scroll top, requires significant movement)
      if (deltaY > verticalThreshold && this.detailScroller.scrollTop < 10 && Math.abs(deltaX) < threshold) {
        this.closeProjectDetail();
        return;
      }
      
      // Swipe left/right for navigation (requires clear horizontal intent)
      if (Math.abs(deltaX) > threshold && Math.abs(deltaY) < Math.abs(deltaX) * 0.5) {
        if (deltaX > 0) {
          // Swipe right = previous
          this.navigateToProject(-1);
        } else {
          // Swipe left = next
          this.navigateToProject(1);
        }
      }
    };
    
    this.detailScroller.addEventListener('touchstart', this.swipeTouchStart, { passive: true });
    this.detailScroller.addEventListener('touchmove', this.swipeTouchMove, { passive: true });
    this.detailScroller.addEventListener('touchend', this.swipeTouchEnd, { passive: true });
  }

  removeSwipeGestures() {
    if (!this.detailScroller) return;
    if (this.swipeTouchStart) {
      this.detailScroller.removeEventListener('touchstart', this.swipeTouchStart);
      this.detailScroller.removeEventListener('touchmove', this.swipeTouchMove);
      this.detailScroller.removeEventListener('touchend', this.swipeTouchEnd);
      this.swipeTouchStart = null;
      this.swipeTouchMove = null;
      this.swipeTouchEnd = null;
    }
  }

  /**
   * Check URL hash for deep linking to a project
   * Allows sharing direct links like portfolio.html#project-design-systems
   */
  checkUrlHash() {
    const hash = location.hash;
    if (!hash.startsWith('#project-')) return;
    
    const slug = hash.replace('#project-', '');
    const projectIndex = this.projects.findIndex(p => {
      const projectSlug = (p.id || '').toLowerCase().replace(/\s+/g, '-');
      return projectSlug === slug;
    });
    
    if (projectIndex === -1) return;
    
    // Wait for carousel to be ready, then open the project
    requestAnimationFrame(() => {
      // Navigate carousel to the project first
      this.currentRotation = projectIndex * this.angleStep;
      this.updateWheelPositions(0, true);
      
      // Open the detail view after a brief delay
      setTimeout(() => {
        const slide = this.slides[projectIndex];
        if (slide) this.openProjectDetail(projectIndex, slide);
      }, 100);
    });
  }

  navigateToProject(direction) {
    if (!this.detailOpen || this.isTransitioning) return;
    
    const newIndex = (this.activeIndex + direction + this.projects.length) % this.projects.length;
    const project = this.projects[newIndex];
    if (!project) return;
    
    // Quick fade transition
    this.isTransitioning = true;
    const inner = this.detailOverlay.querySelector('.project-detail__inner');
    if (inner) {
      inner.style.opacity = '0';
      inner.style.transform = 'scale(0.98)';
    }
    
    setTimeout(() => {
      this.activeIndex = newIndex;
      this.renderDetailContent(project);
      
      // Announce to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.className = 'sr-only';
      announcement.textContent = `Project ${newIndex + 1} of ${this.projects.length}: ${project.title}`;
      this.detailOverlay.appendChild(announcement);
      setTimeout(() => announcement.remove(), 1000);
      
      if (inner) {
        inner.style.opacity = '';
        inner.style.transform = '';
      }
      this.isTransitioning = false;
    }, 200);
  }

  closeProjectDetail() {
    // Guard: prevent closing if already closed or transitioning
    if (!this.detailOpen || this.isTransitioning) return;
    
    // Clear URL hash
    if (location.hash.startsWith('#project-')) {
      history.replaceState(null, '', location.pathname + location.search);
    }
    
    SoundEngine.playWheelClose();
    
    // Remove focus trap and keyboard handlers
    this.removeFocusTrap();
    if (this.detailKeyHandler) {
      document.removeEventListener('keydown', this.detailKeyHandler);
      this.detailKeyHandler = null;
    }
    
    // Remove scroll progress handler
    if (this.scrollProgressHandler && this.detailScroller) {
      this.detailScroller.removeEventListener('scroll', this.scrollProgressHandler);
      this.scrollProgressHandler = null;
    }
    
    // Remove swipe gestures
    this.removeSwipeGestures();

    this.isTransitioning = true;
    this.detailOpen = false;
    
    // Remove expanding state and restore normal positioning
    if (this.activeSlide) {
      this.activeSlide.classList.remove('is-expanding');
      this.activeSlide.classList.add('is-collapsing');
      // Clear frozen position after a brief delay to allow collapse animation
      setTimeout(() => {
        if (this.activeSlide) {
          this.activeSlide.classList.remove('is-collapsing');
          delete this.activeSlide.dataset.frozenX;
          delete this.activeSlide.dataset.frozenY;
          // Force immediate position update
          this.updateWheelPositions(0, true);
        }
      }, 400);
    }
    
    // Clean up scroll animation
    if (this.closeButtonScrollCleanup) {
        this.closeButtonScrollCleanup();
        this.closeButtonScrollCleanup = null;
    }
    this.stopDetailVideos();

    const finalizeClose = () => {
        document.body.classList.remove('detail-open');
        this.detailOverlay.setAttribute('aria-hidden', 'true');
        // Snap wheel immediately so the active card returns sharp (no depth blur settling).
        this.wheelVelocity = 0;
        this.wheelRotation = this.getNearestSnapRotation(this.wheelRotation);
        this.updateWheelPositions(0, true);
        if (this.lastFocusedElement && this.lastFocusedElement.focus) {
            this.lastFocusedElement.focus();
        }
        this.isTransitioning = false;
    };

    document.body.classList.remove('detail-open');
    const hasTransition = this.hasDetailTransition();
    if (hasTransition) {
      this.waitForDetailTransition(finalizeClose);
    }
    this.detailOverlay.classList.remove('is-open');
    if (!hasTransition) finalizeClose();
  }

  syncDetailVideos() {
    if (this.detailVideoObserver) {
        this.detailVideoObserver.disconnect();
        this.detailVideoObserver = null;
    }
    if (!this.detailOverlay || !this.detailScroller) return;

    const videos = Array.from(this.detailOverlay.querySelectorAll('.project-detail__video'));
    if (!videos.length) return;

    // Add click handlers for play/pause toggles
    this.detailOverlay.querySelectorAll('.project-detail__video-toggle').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const video = videos[i];
        if (!video) return;
        if (video.paused) {
          video.play().catch(() => {});
          btn.querySelector('i').className = 'ti ti-player-pause';
        } else {
          video.pause();
          btn.querySelector('i').className = 'ti ti-player-play';
        }
      });
    });

    if ('IntersectionObserver' in window) {
        this.detailVideoObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const video = entry.target;
                if (entry.isIntersecting) {
                    // Upgrade preload when near viewport
                    if (video.preload === 'metadata') {
                      video.preload = 'auto';
                    }
                    if (!this.prefersReducedMotion) {
                      video.play().catch(() => {});
                      // Update toggle button icon
                      const wrapper = video.closest('.project-detail__video-wrapper');
                      const btn = wrapper?.querySelector('.project-detail__video-toggle i');
                      if (btn) btn.className = 'ti ti-player-pause';
                    }
                } else {
                    video.pause();
                    // Update toggle button icon
                    const wrapper = video.closest('.project-detail__video-wrapper');
                    const btn = wrapper?.querySelector('.project-detail__video-toggle i');
                    if (btn) btn.className = 'ti ti-player-play';
                }
            });
        }, { root: this.detailScroller, threshold: 0.3, rootMargin: '200px' });

        videos.forEach((video) => this.detailVideoObserver.observe(video));
    } else {
        if (!this.prefersReducedMotion) {
          videos.forEach((video) => video.play().catch(() => {}));
        }
    }
  }

  stopDetailVideos() {
    if (this.detailVideoObserver) {
        this.detailVideoObserver.disconnect();
        this.detailVideoObserver = null;
    }
    if (!this.detailOverlay) return;
    this.detailOverlay.querySelectorAll('.project-detail__video').forEach((video) => {
        video.pause();
    });
  }

  collectProjectAssets(project) {
    const assets = [];
    if (project.image) {
        assets.push({ type: 'image', src: `${CONFIG.assetBasePath}${project.image}` });
    }

    const blocks = this.getContentBlocks(project);
    blocks.forEach((block) => {
        if (block.type !== 'image' && block.type !== 'video') return;
        const src = this.resolveDetailAsset(block.src);
        if (src) assets.push({ type: block.type, src });
    });

    if (Array.isArray(project.gallery)) {
        project.gallery.forEach((src) => {
            const resolved = this.resolveDetailAsset(src);
            if (resolved) assets.push({ type: 'image', src: resolved });
        });
    }

    return assets;
  }

  preloadImage(src) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  }

  preloadVideo(src) {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.src = src;
    video.load();
  }

  prefetchProjectAssets(project) {
    if (!project || !project.id) return;
    if (this.preloadedProjects.has(project.id)) return;

    // Check connection quality
    const connection = navigator.connection;
    const saveData = connection?.saveData;
    const effectiveType = connection?.effectiveType;
    const shouldPreloadVideo = !saveData && effectiveType !== '2g' && effectiveType !== 'slow-2g';

    const assets = this.collectProjectAssets(project);
    if (!assets.length) return;

    this.preloadedProjects.add(project.id);

    const run = () => {
        assets.forEach((asset) => {
            if (!asset.src || this.preloadedAssets.has(asset.src)) return;
            if (asset.type === 'video' && !shouldPreloadVideo) return;
            this.preloadedAssets.add(asset.src);
            if (asset.type === 'image') this.preloadImage(asset.src);
            if (asset.type === 'video') this.preloadVideo(asset.src);
        });
    };

    if ('requestIdleCallback' in window) {
        requestIdleCallback(run, { timeout: 1200 });
    } else {
        setTimeout(run, 32);
    }
  }

}

function isPortfolioDev() {
  try {
    if (typeof __DEV__ === 'boolean') return __DEV__;
  } catch (e) {}

  try {
    const port = String(globalThis?.location?.port ?? '');
    if (port === '8001') return true;
  } catch (e) {}

  try {
    const scripts = Array.from(document.scripts || []);
    return scripts.some((s) => {
      const type = (s.getAttribute('type') || '').toLowerCase();
      if (type !== 'module') return false;
      const src = s.getAttribute('src') || '';
      return /portfolio\/page\/app\.js(\?|#|$)/.test(src);
    });
  } catch (e) {}

  return false;
}

async function bootstrapPortfolio() {
  // Index parity: keep the centered brand logo inside the frame stacking context so it
  // can sit "behind" the portfolio content instead of overlaying it as a separate layer.
  try {
    const wallFrame = document.querySelector('.wall-frame');
    const logo = document.getElementById('brand-logo');
    if (wallFrame && logo && logo.parentElement !== wallFrame) {
      wallFrame.prepend(logo);
    }
  } catch (e) {}

  try {
    await loadRuntimeText();
    applyRuntimeTextToDOM();
  } catch (e) {
    // Text is non-fatal; continue.
  }

  try {
    await waitForFonts();
  } catch (e) {}

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    DRAMATIC ENTRANCE (INDEX PARITY)                          ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    const g = getGlobals();
    const fadeContent = document.getElementById('app-frame');
    const reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const removeBlocker = () => {
      try {
        const blocker = document.getElementById('fade-blocking');
        if (blocker) blocker.remove();
      } catch (e) {}
    };
    const forceVisible = (reason) => {
      if (!fadeContent) return;
      fadeContent.style.opacity = '1';
      fadeContent.style.transform = 'translateZ(0)';
      removeBlocker();
      console.warn(`⚠️ Portfolio entrance fallback (${reason})`);
    };

    // Check if View Transition just handled the animation (skip entrance entirely)
    const { didViewTransitionRun } = await import('../utils/page-nav.js');
    const viewTransitionHandled = didViewTransitionRun();
    
    if (viewTransitionHandled) {
      // View Transition handled animation - just reveal elements instantly
      if (fadeContent) {
        fadeContent.style.opacity = '1';
        fadeContent.style.visibility = 'visible';
        fadeContent.style.transform = 'translateZ(0)';
      }
      const portfolioMeta = document.querySelector('.portfolio-meta');
      const portfolioStage = document.querySelector('.portfolio-stage');
      if (portfolioMeta) {
        portfolioMeta.style.opacity = '1';
        portfolioMeta.style.visibility = 'visible';
      }
      if (portfolioStage) {
        portfolioStage.style.opacity = '1';
        portfolioStage.style.visibility = 'visible';
      }
      removeBlocker();
      console.log('✓ Portfolio entrance skipped (View Transition handled it)');
    } else if (!g.entranceEnabled || reduceMotion) {
      if (fadeContent) {
        fadeContent.style.opacity = '1';
        fadeContent.style.transform = 'translateZ(0)';
      }
      // Also reveal central content elements
      const portfolioMeta = document.querySelector('.portfolio-meta');
      const portfolioStage = document.querySelector('.portfolio-stage');
      if (portfolioMeta) {
        portfolioMeta.style.opacity = '1';
        portfolioMeta.style.visibility = 'visible';
      }
      if (portfolioStage) {
        portfolioStage.style.opacity = '1';
        portfolioStage.style.visibility = 'visible';
      }
      removeBlocker();
      console.log('✓ Entrance animation skipped (disabled or reduced motion)');
    } else {
      const { orchestrateEntrance } = await import('../visual/entrance-animation.js');
      await orchestrateEntrance({
        waitForFonts: async () => {
          try { await waitForFonts(); } catch (e) {}
        },
        skipWallAnimation: true,
        centralContent: [
          '.portfolio-stage',
          '.portfolio-meta'
        ]
      });
      removeBlocker();
      console.log('✓ Dramatic entrance animation orchestrated (portfolio)');
    }

    // Failsafe watchdog: never allow a stuck hidden page.
    window.setTimeout(() => {
      if (!fadeContent) return;
      const opacity = window.getComputedStyle(fadeContent).opacity;
      if (opacity === '0') forceVisible('watchdog');
    }, 2500);
  } catch (e) {
    const fadeContent = document.getElementById('app-frame');
    if (fadeContent) {
      fadeContent.style.opacity = '1';
      fadeContent.style.transform = 'translateZ(0)';
    }
    console.warn('⚠️ Portfolio entrance animation failed, forcing content visible', e);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║         ENTRANCE ANIMATION COMPLETE - NOW INITIALIZE CAROUSEL                ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  // Logo, stage, and meta are now visible via staggered entrance animation
  // Safe to initialize carousel app (which manipulates stage elements)

  let runtimeConfig = null;
  try {
    runtimeConfig = await loadRuntimeConfig();
    // Initialize state with runtime config so all global parameters are available
    applyWallFrameFromConfig(runtimeConfig);
    requestAnimationFrame(() => {
      applyWallFrameLayout();
    });
    // Portfolio needs the same visible rubber wall as index, but without running the balls simulation.
    // Draw the wall ring onto a dedicated canvas layered above the carousel.
    try { initPortfolioWallCanvas(); } catch (e) {}
    SoundEngine.initSoundEngine();
    SoundEngine.applySoundConfigFromRuntimeConfig(runtimeConfig);
    // Procedural noise texture (no GIF): generates a small texture once and animates via CSS only.
    // Initialize with globals (same as index page) so noise settings match index page
    // getGlobals() contains all processed config values from initState()
    try { 
      initNoiseSystem(getGlobals());
    } catch (e) {}
    
    // Keep the frame responsive to viewport changes (same behavior as index).
    window.addEventListener('resize', applyWallFrameLayout);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', applyWallFrameLayout, { passive: true });
    }
  } catch (e) {
    // Safe fallback: run without the studio frame if config fails.
    // Still try to initialize noise with defaults
    try { initNoiseSystem(); } catch (e2) {}
  }

  // Initialize shared chrome (modals + cursor hiding) with portfolio-specific config
  initSharedChrome({
    contactModal: true,
    cvModal: true,
    portfolioModal: false, // Already on portfolio page
    cursorHiding: true,
    modalOverlayConfig: runtimeConfig || {}
  });

  // Palette chapters: rotate on each reload (applies only to cursor + palette-driven dots).
  rotatePaletteChapterOnReload();

  initializeDarkMode();
  
  // Ensure wall colors are applied after dark mode initialization
  // (dark mode syncCssVarsFromConfig might override them, so re-apply from config/globals)
  const g = getGlobals();
  const root = document.documentElement;
  
  if (runtimeConfig) {
    // Re-apply wall colors to ensure they match index page
    syncWallFrameColors(runtimeConfig);
  } else {
    // Fallback: use globals if config not available
    const frameLight = g?.frameColorLight || g?.frameColor;
    const frameDark = g?.frameColorDark || g?.frameColor;
    if (frameLight) root.style.setProperty('--frame-color-light', frameLight);
    if (frameDark) root.style.setProperty('--frame-color-dark', frameDark);
  }
  
  // Force update from globals to ensure values are correct (globals have processed values from initState)
  const frameLight = g?.frameColorLight || g?.frameColor;
  const frameDark = g?.frameColorDark || g?.frameColor;
  if (frameLight) {
    root.style.setProperty('--frame-color-light', frameLight);
  }
  if (frameDark) {
    root.style.setProperty('--frame-color-dark', frameDark);
  }
  
  // Also update theme-color meta tag with the correct wall color for browser chrome
  const currentWallColor = g.isDarkMode ? frameDark : frameLight;
  if (currentWallColor) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = currentWallColor;
    root.style.setProperty('--chrome-bg', currentWallColor);
  }
  maybeAutoPickCursorColor?.('startup');
  initTimeDisplay();
  upgradeSocialIcons();

  let portfolioConfig = null;
  try {
    portfolioConfig = await loadPortfolioConfig();
  } catch (e) {}

  // Portfolio config is carousel-only; wall tuning stays in default-config.json.
  const normalizedPortfolioConfig = applyPortfolioConfig(portfolioConfig);
  const app = new PortfolioApp({ runtimeConfig: normalizedPortfolioConfig.runtime });
  
  // Initialize carousel AFTER entrance animation has revealed the elements
  // This prevents the carousel from forcing visibility before animations complete
  await app.init();

  // DEV-ONLY: config/debug panel dock. Never ship this UI in production.
  // (Production site must not show panel icons/handles on mobile.)
  const ABS_DEV = (typeof __DEV__ !== 'undefined') ? __DEV__ : isPortfolioDev();
  if (ABS_DEV) {
    try {
      const { createPanelDock } = await import('../ui/panel-dock.js');
      const { generatePanelSectionsHTML } = await import('./panel/control-registry.js');
      const { setupControls } = await import('./panel/controls.js');
      const { setupBuildControls } = await import('./panel/build-controls.js');

      const pageHTML = generatePanelSectionsHTML(normalizedPortfolioConfig);

      createPanelDock({
        page: 'portfolio',
        pageLabel: 'Portfolio',
        pageHTML,
        includePageSaveButton: true,
        pageSaveButtonId: 'savePortfolioConfigBtn',
        bindShortcut: true,
        panelTitle: 'Settings',
        modeLabel: 'DEV MODE',
        setupPageControls: () => {
          setupControls(normalizedPortfolioConfig, {
            onMetricsChange: () => app.updateWheelConfig(),
            onRuntimeChange: (runtime) => app.applyRuntimeConfig(runtime),
          });
          setupBuildControls(normalizedPortfolioConfig);
        },
      });
    } catch (e) {}
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║              SMOOTH PAGE TRANSITIONS (Unified Navigation System)             ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  
  // Handle back navigation with smooth transition
  document.querySelectorAll('[data-nav-transition]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateWithTransition(link.href, NAV_STATES.INTERNAL);
    });
  });
  
  // Handle bfcache restore (browser back/forward with cached page)
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      resetTransitionState();
      const appFrame = document.getElementById('app-frame');
      if (appFrame) appFrame.style.opacity = '1';
    }
  });
  
  // Prefetch index on back link hover
  const backLink = document.querySelector('[data-nav-transition][href*="index"]');
  if (backLink) {
    setupPrefetchOnHover(backLink, 'index.html');
  }
  
}

// Start
document.addEventListener('DOMContentLoaded', () => {
  bootstrapPortfolio();
});
