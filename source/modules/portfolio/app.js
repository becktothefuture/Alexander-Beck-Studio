// Portfolio carousel entry (shares chrome with the index layout; consumes config/portfolio-config.json and config/contents-portfolio.json)

import { loadRuntimeConfig } from '../utils/runtime-config.js';
import { applyWallFrameFromConfig, applyWallFrameLayout } from '../visual/wall-frame.js';
import { applyPortfolioConfig, loadPortfolioConfig, normalizePortfolioRuntime } from './portfolio-config.js';
import { createSoundToggle } from '../ui/sound-toggle.js';
import { initializeDarkMode } from '../visual/dark-mode-v2.js';
import { initTimeDisplay } from '../ui/time-display.js';
import { upgradeSocialIcons } from '../ui/social-icons.js';
import { loadRuntimeText } from '../utils/text-loader.js';
import { applyRuntimeTextToDOM } from '../ui/apply-text.js';
import * as SoundEngine from '../audio/sound-engine.js';
import { initGateOverlay } from '../ui/gate-overlay.js';
import { initContactGate } from '../ui/contact-gate.js';

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
const DEFAULT_DETAIL_TRANSITION_MS = 700;
const DETAIL_FADE_MS = 240;

async function fetchPortfolioData() {
  const paths = [
    CONFIG.dataPath,
    `${CONFIG.basePath}js/contents-portfolio.json`,
    '../public/js/contents-portfolio.json',
    `${CONFIG.basePath}config/portfolio-data.json`,
    `${CONFIG.basePath}js/portfolio-data.json`,
    '../public/js/portfolio-data.json',
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
    this.activeSlot = -1;
    this.lastWheelTime = 0;
    this.activeIndex = -1;
    this.detailOpen = false;
    this.isTransitioning = false; // Guard against rapid open/close
    this.detailOverlay = null;
    this.detailContent = null;
    this.detailAnimations = [];
    this.detailScroller = null;
    this.detailClose = null;
    this.activeSlide = null;
    this.lastFocusedElement = null;
    this.lastCrossfadeParams = null;
    this.detailTransitionEndTimer = null;
    this.detailCloseWatchdogTimer = null;
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
    
    this.init();
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

    // Apply Scroll FX config live (portfolio-only)
    // Scroll FX removed (per request).
  }

  async init() {
    await this.loadData();
    this.renderSlides();
    this.setupMeta();
    this.setupDetailOverlay();
    this.inputSurface = document.body;
    this.bindEvents();
    this.setupCustomCursor();
    this.setupSoundToggle();
    this.setupPortfolioCVLink();

    this.updateWheelConfig();
    this.startWheel();

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

      const imgContainer = document.createElement('div');
      imgContainer.className = 'slide-image-container';

      const img = document.createElement('img');
      img.className = 'slide-image';
      img.alt = project?.title ? `${project.title} preview` : 'Project preview';
      const imgSrc = project?.image
        ? `${CONFIG.assetBasePath}${project.image}`
        : CONFIG.coverFallback;
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
        if (!document.body.classList.contains('detail-open') && !document.body.classList.contains('detail-transitioning')) return;

        document.body.classList.remove('detail-open');
        document.body.classList.remove('detail-transitioning');

        if (this.detailOverlay) {
            this.detailOverlay.classList.remove('is-open', 'is-closing', 'is-collapsing', 'is-animating', 'is-expanding');
            this.detailOverlay.style.removeProperty('opacity');
            this.detailOverlay.style.removeProperty('transform');
            this.detailOverlay.style.removeProperty('filter');
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

    const update = (event) => {
      if (event.pointerType === 'touch') return;
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

  setupSoundToggle() {
    try {
      createSoundToggle();
    } catch (e) {}
  }

  setupPortfolioCVLink() {
    const cv = document.getElementById('portfolio-cv-trigger');
    if (!cv) return;

    // Route through index so CV remains protected behind the gate.
    // We set a session flag so index auto-opens the CV gate.
    cv.addEventListener(
      'click',
      (e) => {
        e?.preventDefault?.();
        try {
          sessionStorage.setItem('abs_open_cv_gate', '1');
        } catch (err) {}
        window.location.href = 'index.html';
      },
      { capture: true }
    );
  }

  // Contact gate is initialized in-place on the portfolio page (index parity),
  // so no redirect wiring is needed here.

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

      const xVw = viewportWidth ? (x / viewportWidth) * 100 : 0;
      const yVh = viewportHeight ? (y / viewportHeight) * 100 : 0;

      slide.style.setProperty('--slide-x', `${xVw}vw`);
      slide.style.setProperty('--slide-y', `${yVh}vh`);
      // True 3D geometry: give the wheel depth along Z so perspective doesn't look flat.
      // Symmetric around the rig origin: front cards move toward camera, back cards recede.
      const zSpreadVmin = this.wheelDepth * 10; // reuse existing depth control as the overall 3D amplitude
      const zVmin = (0.5 - depthFactor) * zSpreadVmin;
      slide.style.setProperty('--slide-z', `${zVmin.toFixed(2)}vmin`);
      slide.style.setProperty('--slide-scale', scale.toFixed(3));
      slide.style.setProperty('--slide-blur', `${blurVmin}vmin`);
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
    this.closeLetters = this.detailOverlay ? Array.from(this.detailOverlay.querySelectorAll('.close-letter')) : [];

    if (this.detailClose) {
        this.detailClose.addEventListener('click', () => this.closeProjectDetail());
    }

    this.setupCloseButtonScrollAnimation();
  }

  setupCloseButtonScrollAnimation() {
    if (!this.detailScroller || !this.closeLetters.length || this.prefersReducedMotion) return;

    let rafId = null;
    let lastScrollTop = 0;
    let scrollVelocity = 0;
    const velocityDecay = 0.85;

    const animate = () => {
      if (!this.detailOpen || !this.detailScroller) {
        rafId = null;
        return;
      }

      const scrollTop = this.detailScroller.scrollTop;
      const scrollDelta = scrollTop - lastScrollTop;
      scrollVelocity = scrollVelocity * velocityDecay + (scrollDelta * 0.3);
      const maxScroll = this.detailScroller.scrollHeight - this.detailScroller.clientHeight;
      const scrollProgress = maxScroll > 0 ? Math.min(scrollTop / maxScroll, 1) : 0;

      // Subtle, playful animation - each letter responds differently to scroll
      // INVERTED: scrolling down moves letters up, scrolling up moves letters down
      this.closeLetters.forEach((letter, index) => {
        const letterIndex = index;
        const delay = letterIndex * 0.08;
        const direction = scrollDelta > 0 ? -1 : 1; // INVERTED: positive scrollDelta (down) = negative direction (up)
        
        // Gentle wave effect based on scroll position
        const wavePhase = scrollProgress * Math.PI * 3 + delay;
        const waveOffset = Math.sin(wavePhase) * 1.2;
        
        // Subtle vertical movement based on scroll velocity (INVERTED)
        const velocityOffset = Math.min(Math.abs(scrollVelocity) * 0.15, 4) * direction;
        
        // Very subtle rotation - playful but not intrusive
        const rotate = Math.sin(wavePhase * 0.7) * 2;
        
        // Gentle scale pulse
        const scale = 1 + Math.sin(wavePhase * 1.3) * 0.03;

        letter.style.transform = `translateY(${waveOffset + velocityOffset}px) rotate(${rotate}deg) scale(${scale})`;
        letter.style.opacity = String(0.85 + Math.sin(wavePhase * 0.5) * 0.15);
      });
      
      // Animate the arrow icon as well
      const closeIcon = this.detailOverlay.querySelector('.close-icon');
      if (closeIcon) {
        const iconDelay = 0.04;
        const iconWavePhase = scrollProgress * Math.PI * 3 + iconDelay;
        const iconWaveOffset = Math.sin(iconWavePhase) * 1.2;
        const iconDirection = scrollDelta > 0 ? -1 : 1;
        const iconVelocityOffset = Math.min(Math.abs(scrollVelocity) * 0.15, 4) * iconDirection;
        const iconRotate = Math.sin(iconWavePhase * 0.7) * 2;
        const iconScale = 1 + Math.sin(iconWavePhase * 1.3) * 0.03;
        
        closeIcon.style.transform = `translateY(${iconWaveOffset + iconVelocityOffset}px) rotate(${iconRotate}deg) scale(${iconScale})`;
        closeIcon.style.opacity = String(0.85 + Math.sin(iconWavePhase * 0.5) * 0.15);
      }

      lastScrollTop = scrollTop;
      rafId = requestAnimationFrame(animate);
    };

    const handleScroll = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(animate);
      }
    };

    this.detailScroller.addEventListener('scroll', handleScroll, { passive: true });
    
    // Store cleanup function
    this.closeButtonScrollCleanup = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (this.detailScroller) {
        this.detailScroller.removeEventListener('scroll', handleScroll);
      }
      // Reset letter and icon transforms
      this.closeLetters.forEach(letter => {
        letter.style.transform = '';
        letter.style.opacity = '';
      });
      const closeIcon = this.detailOverlay?.querySelector('.close-icon');
      if (closeIcon) {
        closeIcon.style.transform = '';
        closeIcon.style.opacity = '';
      }
    };
  }

  createDetailOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'projectDetail';
    overlay.className = 'project-detail';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="project-detail__card" role="dialog" aria-modal="true" aria-label="Project detail">
        <button class="project-detail__close" type="button" aria-label="Close project detail" data-detail-close>
          <i class="ti ti-arrow-left close-icon" aria-hidden="true"></i>
          <span class="close-letter" data-letter="B">B</span>
          <span class="close-letter" data-letter="A">A</span>
          <span class="close-letter" data-letter="C">C</span>
          <span class="close-letter" data-letter="K">K</span>
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
    return `${CONFIG.basePath}${trimmed}`;
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

    const headerSrc = project.image
        ? `${CONFIG.assetBasePath}${project.image}`
        : CONFIG.coverFallback;
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
            return `
              <figure class="project-detail__block">
                <video class="project-detail__video" autoplay muted loop playsinline preload="auto">
                  <source src="${videoSrc}"${videoType ? ` type="${videoType}"` : ''}>
                </video>
                ${block.caption ? `<figcaption class="project-detail__caption">${block.caption}</figcaption>` : ''}
              </figure>
            `;
        }

        const imageSrc = this.resolveDetailAsset(block.src);
        const alt = block.alt || project.title || 'Project image';
        return `
          <figure class="project-detail__block">
            <img class="project-detail__media-block" src="${imageSrc}" alt="${alt}" loading="lazy">
            ${block.caption ? `<figcaption class="project-detail__caption">${block.caption}</figcaption>` : ''}
          </figure>
        `;
    }).join('');

    const linksHtml = links.length ? `
      <div class="project-detail__links">
        ${links.map((link) => `
          <a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.label}</a>
        `).join('')}
      </div>
    ` : '';

    this.detailContent.innerHTML = `
      <section class="project-detail__hero">
        <div class="project-detail__media">
          <img class="project-detail__image" src="${headerSrc}" alt="${project.title || 'Project'}" loading="eager">
        </div>
        <div class="project-detail__content project-detail__content--hero">
          <div class="project-detail__intro">
            ${project.client ? `<div class="project-detail__eyebrow">${project.client}</div>` : ''}
            <h1 class="project-detail__title">${project.title || ''}</h1>
            ${project.summary ? `<p class="project-detail__summary">${project.summary}</p>` : ''}
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
        </div>
      </section>
    `;

    this.syncDetailVideos();
    if (this.detailScroller) this.detailScroller.scrollTop = 0;
  }

  /**
   * Calculate crossfade animation parameters from a slide element.
   * Returns transform-origin (slide center) and scale (slide size / viewport).
   */
  getCrossfadeParams(slideEl) {
    const slideRect = slideEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Transform-origin: slide center relative to viewport (in pixels)
    const originX = slideRect.left + slideRect.width / 2;
    const originY = slideRect.top + slideRect.height / 2;
    
    // Scale: how much smaller is the slide compared to viewport
    // Use height as the primary dimension for aspect-ratio preservation
    const scale = Math.min(slideRect.width / viewportWidth, slideRect.height / viewportHeight);
    
    return {
      originX,
      originY,
      scale,
      transformOrigin: `${originX}px ${originY}px`,
    };
  }

  getCssNumber(varName, fallback) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    const value = parseFloat(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  getCssString(varName, fallback) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(varName);
    if (!raw) return fallback;
    const trimmed = raw.trim();
    return trimmed || fallback;
  }

  getDetailTransitionMs() {
    return this.getCssNumber('--detail-transition-ms', DEFAULT_DETAIL_TRANSITION_MS);
  }

  getDetailEase() {
    return this.getCssString('--detail-transition-ease', 'cubic-bezier(0.16, 1, 0.3, 1)');
  }

  getDetailFadeMs() {
    return this.getCssNumber('--detail-transition-fade-ms', DETAIL_FADE_MS);
  }

  getDetailFadeDelay() {
    return this.getCssNumber('--detail-transition-fade-delay', 0);
  }

  getDetailContentDuration() {
    return this.getCssNumber('--detail-content-pop-duration', this.getDetailFadeMs());
  }

  getDetailContentStartScale() {
    return this.getCssNumber('--detail-content-pop-start-scale', 0.96);
  }

  getDetailContentEase() {
    return this.getCssString('--detail-content-pop-ease', this.getDetailEase());
  }

  getDetailCardSwingDeg() {
    return this.getCssNumber('--detail-card-swing-deg', -6);
  }

  getDetailCardSwingScale() {
    return this.getCssNumber('--detail-card-swing-scale', 1.05);
  }

  getDetailCardPopScale() {
    return this.getCssNumber('--detail-card-pop-scale', 1.12);
  }

  cancelDetailAnimations() {
    if (!this.detailAnimations || !this.detailAnimations.length) return;
    this.detailAnimations.forEach((anim) => {
      try {
        anim?.cancel?.();
      } catch (e) {}
    });
    this.detailAnimations = [];
  }

  beginDetailTransition() {
    if (this.detailTransitionEndTimer) {
        window.clearTimeout(this.detailTransitionEndTimer);
        this.detailTransitionEndTimer = null;
    }
    document.body.classList.add('detail-transitioning');
  }

  endDetailTransition(delay = 0) {
    if (this.detailTransitionEndTimer) {
        window.clearTimeout(this.detailTransitionEndTimer);
        this.detailTransitionEndTimer = null;
    }
    if (delay > 0) {
        this.detailTransitionEndTimer = window.setTimeout(() => {
            this.detailTransitionEndTimer = null;
            document.body.classList.remove('detail-transitioning');
        }, delay);
        return;
    }
    document.body.classList.remove('detail-transitioning');
  }


  openProjectDetail(index, slide) {
    // Guard: prevent opening if already open or transitioning
    if (this.detailOpen || this.isTransitioning || !slide) return;
    const project = this.projects[index];
    if (!project) return;

    // Cancel any ongoing animations
    this.cancelDetailAnimations();

    this.isTransitioning = true;
    this.detailOpen = true;
    this.activeSlide = slide;
    this.lastFocusedElement = document.activeElement;

    this.prefetchProjectAssets(project);
    this.renderDetailContent(project);

    // Re-initialize close button letters and scroll animation
    this.closeLetters = Array.from(this.detailOverlay.querySelectorAll('.close-letter'));
    if (this.detailOverlay) {
      const closeIcon = this.detailOverlay.querySelector('.close-icon');
      if (closeIcon) {
        closeIcon.style.transform = '';
        closeIcon.style.opacity = '';
      }
    }
    this.setupCloseButtonScrollAnimation();

    const slideMedia = slide.querySelector('.slide-image-container');
    
    // Calculate crossfade parameters from clicked slide
    const crossfadeParams = slideMedia ? this.getCrossfadeParams(slideMedia) : null;
    this.lastCrossfadeParams = crossfadeParams; // Store for close animation
    
    this.detailOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('detail-open');
    SoundEngine.playWheelOpen();
    this.beginDetailTransition();

    if (!this.prefersReducedMotion) {
      const duration = this.getDetailTransitionMs();
      const easing = this.getDetailEase();
      const contentDuration = this.getDetailContentDuration();
      const contentDelay = this.getDetailFadeDelay();
      const contentEase = this.getDetailContentEase();
      const contentStartScale = this.getDetailContentStartScale();
      const overlayStartScale = crossfadeParams?.scale ?? 0.92;
      const swingDeg = this.getDetailCardSwingDeg();
      const swingScale = this.getDetailCardSwingScale();
      const popScale = this.getDetailCardPopScale();

      // Setup initial state
      this.detailOverlay.classList.remove('is-closing', 'is-collapsing');
      this.detailOverlay.classList.add('is-open', 'is-animating', 'is-expanding');
      this.detailOverlay.style.transformOrigin = crossfadeParams?.transformOrigin || '50% 50%';

      const overlayAnimation = this.detailOverlay.animate([
        { opacity: '0', transform: `scale(${overlayStartScale})` },
        { opacity: '1', transform: 'scale(1)' }
      ], {
        duration,
        easing,
        fill: 'both'
      });

      const contentAnimation = this.detailContent?.animate([
        { opacity: '0', transform: `scale(${contentStartScale})` },
        { opacity: '1', transform: 'scale(1)' }
      ], {
        duration: contentDuration,
        delay: contentDelay,
        easing: contentEase,
        fill: 'both'
      });

      let slideAnimation = null;
      if (slideMedia) {
        slideMedia.style.opacity = '1';
        slideMedia.style.transform = 'rotate(0deg) scale(1)';
        slideAnimation = slideMedia.animate([
          { transform: 'rotate(0deg) scale(1)', opacity: 1 },
          { transform: `rotate(${swingDeg}deg) scale(${swingScale})`, opacity: 1, offset: 0.35 },
          { transform: `rotate(0deg) scale(${popScale})`, opacity: 0 }
        ], {
          duration,
          easing,
          fill: 'both'
        });

        slideAnimation.finished.then(() => {
          slideMedia.style.opacity = '0';
          slideMedia.style.transform = `scale(${popScale})`;
        }).catch(() => {});
      }

      this.detailAnimations = [overlayAnimation, contentAnimation, slideAnimation].filter(Boolean);

      const finalizeOpen = () => {
        if (!this.detailOpen) {
          this.detailOverlay.classList.remove('is-open');
          this.isTransitioning = false;
          return;
        }

        this.detailOverlay.classList.remove('is-animating', 'is-expanding');
        this.detailOverlay.style.removeProperty('opacity');
        this.detailOverlay.style.removeProperty('transform');
        this.detailOverlay.style.removeProperty('transformOrigin');
        if (this.detailContent) {
          this.detailContent.style.removeProperty('opacity');
          this.detailContent.style.removeProperty('transform');
        }
        this.detailAnimations = [];
        this.isTransitioning = false;
        this.endDetailTransition();
      };

      overlayAnimation.finished.then(finalizeOpen).catch((err) => {
        console.warn('Open animation interrupted:', err);
        this.detailOverlay.classList.remove('is-animating', 'is-expanding');
        if (this.detailOpen) {
          this.detailOverlay.style.removeProperty('opacity');
          this.detailOverlay.style.removeProperty('transform');
          this.detailOverlay.style.removeProperty('transformOrigin');
          if (this.detailContent) {
            this.detailContent.style.removeProperty('opacity');
            this.detailContent.style.removeProperty('transform');
          }
          if (slideMedia) {
            slideMedia.style.removeProperty('opacity');
            slideMedia.style.removeProperty('transform');
          }
        }
        this.detailAnimations = [];
        this.isTransitioning = false;
        this.endDetailTransition();
      });
    } else {
      // Reduced motion: instant open
      this.detailOverlay.classList.remove('is-closing', 'is-collapsing');
      this.detailOverlay.classList.add('is-open');
      if (slideMedia) {
        slideMedia.style.removeProperty('opacity');
        slideMedia.style.removeProperty('transform');
      }
      if (this.detailContent) {
        this.detailContent.style.removeProperty('opacity');
        this.detailContent.style.removeProperty('transform');
      }
      this.isTransitioning = false;
      this.endDetailTransition();
    }

    if (this.detailClose) this.detailClose.focus();
  }

  closeProjectDetail() {
    // Guard: prevent closing if already closed or transitioning
    if (!this.detailOpen || this.isTransitioning) return;
    
    SoundEngine.playWheelClose();
    
    // Cancel any ongoing animations
    this.cancelDetailAnimations();
    
    if (this.openTransitionTimer) {
        window.clearTimeout(this.openTransitionTimer);
        this.openTransitionTimer = null;
    }
    
    this.isTransitioning = true;
    this.detailOpen = false;
    
    // Clean up scroll animation
    if (this.closeButtonScrollCleanup) {
        this.closeButtonScrollCleanup();
        this.closeButtonScrollCleanup = null;
    }
    this.stopDetailVideos();

    // Recalculate crossfade params in case slide position changed (e.g. resize)
    const slideMedia = this.activeSlide?.querySelector('.slide-image-container');
    const crossfadeParams = slideMedia ? this.getCrossfadeParams(slideMedia) : this.lastCrossfadeParams;

    const finalizeClose = () => {
        if (this.detailCloseWatchdogTimer) {
            window.clearTimeout(this.detailCloseWatchdogTimer);
            this.detailCloseWatchdogTimer = null;
        }
        this.endDetailTransition();
        document.body.classList.remove('detail-open');
        this.detailOverlay.classList.remove('is-open', 'is-closing', 'is-collapsing', 'is-animating', 'is-expanding');
        this.detailOverlay.style.removeProperty('transform');
        this.detailOverlay.style.removeProperty('opacity');
        this.detailOverlay.style.removeProperty('transformOrigin');
        if (this.detailContent) {
          this.detailContent.style.removeProperty('opacity');
          this.detailContent.style.removeProperty('transform');
        }
        if (slideMedia) {
          slideMedia.style.removeProperty('opacity');
          slideMedia.style.removeProperty('transform');
        }
        this.detailAnimations = [];
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

    this.beginDetailTransition();
    // Watchdog: guarantee we leave `detail-open` even if a transition is interrupted.
    if (this.detailCloseWatchdogTimer) {
        window.clearTimeout(this.detailCloseWatchdogTimer);
        this.detailCloseWatchdogTimer = null;
    }

    if (!this.prefersReducedMotion) {
      const duration = this.getDetailTransitionMs();
      const easing = this.getDetailEase();
      const contentDuration = this.getDetailContentDuration();
      const contentDelay = this.getDetailFadeDelay();
      const contentEase = this.getDetailContentEase();
      const contentStartScale = this.getDetailContentStartScale();
      const overlayStartScale = crossfadeParams?.scale ?? 0.92;
      const swingDeg = this.getDetailCardSwingDeg();
      const swingScale = this.getDetailCardSwingScale();
      const popScale = this.getDetailCardPopScale();
      const closeDelay = Math.max(0, duration - contentDelay - contentDuration);

      // Setup initial state
      this.detailOverlay.classList.remove('is-expanding');
      this.detailOverlay.classList.add('is-animating', 'is-collapsing');
      this.detailOverlay.style.transformOrigin = crossfadeParams?.transformOrigin || '50% 50%';

      const overlayAnimation = this.detailOverlay.animate([
        { opacity: '0', transform: `scale(${overlayStartScale})` },
        { opacity: '1', transform: 'scale(1)' }
      ], {
        duration,
        easing,
        fill: 'both',
        direction: 'reverse'
      });

      const contentAnimation = this.detailContent?.animate([
        { opacity: '0', transform: `scale(${contentStartScale})` },
        { opacity: '1', transform: 'scale(1)' }
      ], {
        duration: contentDuration,
        delay: closeDelay,
        easing: contentEase,
        fill: 'both',
        direction: 'reverse'
      });

      let slideAnimation = null;
      if (slideMedia) {
        slideMedia.style.opacity = '0';
        slideMedia.style.transform = `scale(${popScale})`;
        slideAnimation = slideMedia.animate([
          { transform: 'rotate(0deg) scale(1)', opacity: 1 },
          { transform: `rotate(${swingDeg}deg) scale(${swingScale})`, opacity: 1, offset: 0.35 },
          { transform: `rotate(0deg) scale(${popScale})`, opacity: 0 }
        ], {
          duration,
          easing,
          fill: 'both',
          direction: 'reverse'
        });
      }

      this.detailAnimations = [overlayAnimation, contentAnimation, slideAnimation].filter(Boolean);
      
      // Watchdog: guarantee cleanup even if animation fails (fallback only)
      this.detailCloseWatchdogTimer = window.setTimeout(() => {
        console.warn('Close animation watchdog triggered - forcing cleanup');
        finalizeClose();
      }, duration + 500);
      
      // Clean up after animation completes
      overlayAnimation.finished.then(() => {
        // Clear watchdog since we completed successfully
        if (this.detailCloseWatchdogTimer) {
          window.clearTimeout(this.detailCloseWatchdogTimer);
          this.detailCloseWatchdogTimer = null;
        }
        
        // Clean up classes
        this.detailOverlay.classList.remove('is-animating', 'is-collapsing');
        
        finalizeClose();
      }).catch((err) => {
        // Animation was cancelled or errored - clean up safely
        console.warn('Close animation interrupted:', err);
        if (this.detailCloseWatchdogTimer) {
          window.clearTimeout(this.detailCloseWatchdogTimer);
          this.detailCloseWatchdogTimer = null;
        }
        this.detailOverlay.classList.remove('is-animating', 'is-collapsing');
        finalizeClose();
      });
    } else {
      // Reduced motion: instant close
      finalizeClose();
    }
  }

  syncDetailVideos() {
    if (this.detailVideoObserver) {
        this.detailVideoObserver.disconnect();
        this.detailVideoObserver = null;
    }
    if (!this.detailOverlay || !this.detailScroller) return;

    const videos = Array.from(this.detailOverlay.querySelectorAll('.project-detail__video'));
    if (!videos.length) return;

    if ('IntersectionObserver' in window) {
        this.detailVideoObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const video = entry.target;
                if (entry.isIntersecting) {
                    video.play().catch(() => {});
                } else {
                    video.pause();
                }
            });
        }, { root: this.detailScroller, threshold: 0.6 });

        videos.forEach((video) => this.detailVideoObserver.observe(video));
    } else {
        videos.forEach((video) => video.play().catch(() => {}));
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

    const assets = this.collectProjectAssets(project);
    if (!assets.length) return;

    this.preloadedProjects.add(project.id);
    const shouldPreloadVideo = !navigator.connection || !navigator.connection.saveData;

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
  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                             PAGE FADE-IN (INDEX PARITY)                     ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  // Match the index page fade-in behavior: #fade-content starts at opacity:0
  // (via <style id="fade-blocking">) and is animated to 1 with WAAPI + failsafes.
  //
  // Keep this early so reveal timing matches index even while async work continues.
  try {
    const FADE_DELAY_MS = 400;
    const FADE_DURATION_MS = 3000;
    const FADE_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const FADE_FAILSAFE_MS = FADE_DELAY_MS + FADE_DURATION_MS + 750;

    const forceFadeVisible = (fadeEl, reason) => {
      fadeEl.style.opacity = '1';
      console.warn(`⚠️ Fade failsafe: forcing #fade-content visible (${reason})`);
    };

    window.setTimeout(() => {
      const fadeContent = document.getElementById('fade-content');
      if (!fadeContent) {
        console.warn('⚠️ #fade-content not found (fade skipped)');
        return;
      }

      // Accessibility: respect reduced motion by skipping animation entirely.
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
        fadeContent.style.opacity = '1';
        console.log('✓ Page fade-in skipped (prefers-reduced-motion)');
        return;
      }

      // If WAAPI is missing, fall back to inline style.
      if (typeof fadeContent.animate !== 'function') {
        forceFadeVisible(fadeContent, 'WAAPI unsupported');
        return;
      }

      const anim = fadeContent.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: FADE_DURATION_MS, easing: FADE_EASING, fill: 'forwards' }
      );

      // Stamp final opacity so it can't get stuck hidden.
      anim?.addEventListener?.('finish', () => {
        fadeContent.style.opacity = '1';
        console.log('✓ Page fade-in finished');
      });

      anim?.addEventListener?.('cancel', () => {
        forceFadeVisible(fadeContent, 'animation canceled');
      });

      console.log('✓ Page fade-in started (WAAPI)');

      // Ultimate failsafe: never allow permanent hidden UI.
      window.setTimeout(() => {
        const opacity = window.getComputedStyle(fadeContent).opacity;
        if (opacity === '0') forceFadeVisible(fadeContent, 'opacity still 0 after failsafe window');
      }, FADE_FAILSAFE_MS);
    }, FADE_DELAY_MS);
  } catch (e) {}

  try {
    await loadRuntimeText();
    applyRuntimeTextToDOM();
  } catch (e) {
    // Text is non-fatal; continue.
  }

  let runtimeConfig = null;
  try {
    runtimeConfig = await loadRuntimeConfig();
    applyWallFrameFromConfig(runtimeConfig);
    SoundEngine.initSoundEngine();
    SoundEngine.applySoundConfigFromRuntimeConfig(runtimeConfig);
    // Keep the frame responsive to viewport changes (same behavior as index).
    window.addEventListener('resize', applyWallFrameLayout);
  } catch (e) {
    // Safe fallback: run without the studio frame if config fails.
  }

  // Gates should work even if runtime config fails to load (use defaults).
  try {
    initGateOverlay(runtimeConfig || {});
    initContactGate();
  } catch (e) {}

  initializeDarkMode();
  initTimeDisplay();
  upgradeSocialIcons();

  let portfolioConfig = null;
  try {
    portfolioConfig = await loadPortfolioConfig();
  } catch (e) {}

  // Portfolio config is carousel-only; wall tuning stays in default-config.json.
  const normalizedPortfolioConfig = applyPortfolioConfig(portfolioConfig);
  const app = new PortfolioApp({ runtimeConfig: normalizedPortfolioConfig.runtime });

  // Index parity: the config panel exists in all builds, starts hidden, and is summoned with `/`.
  try {
    const panelDock = await import('./panel/panel-dock.js');
    panelDock.createPanelDock({
      config: normalizedPortfolioConfig,
      onMetricsChange: () => app.updateWheelConfig(),
      onRuntimeChange: (runtime) => app.applyRuntimeConfig(runtime),
      panelTitle: 'Settings',
      modeLabel: isPortfolioDev() ? 'DEV MODE' : 'BUILD MODE',
    });
  } catch (e) {}
}

// Start
document.addEventListener('DOMContentLoaded', () => {
  bootstrapPortfolio();
});
