/* Alexander Beck Studio | 2026-01-18 */
import { l as loadRuntimeText, a as applyRuntimeTextToDOM, R as waitForFonts, g as getGlobals, d as loadRuntimeConfig, X as applyWallFrameFromConfig, h as initNoiseSystem, Y as applyWallFrameLayout, Z as initSharedChrome, x as rotatePaletteChapterOnReload, A as initializeDarkMode, _ as syncWallFrameColors, I as maybeAutoPickCursorColor, G as initTimeDisplay, F as upgradeSocialIcons, $ as navigateWithTransition, a0 as NAV_STATES, a1 as resetTransitionState, a2 as setupPrefetchOnHover } from './shared.js';
import { i as initPortfolioWallCanvas } from './wall-only-canvas.js';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           CV PHOTO SLIDESHOW                                 ║
// ║                                                                              ║
// ║  Scroll-driven: Photo changes as you scroll through CV text                 ║
// ║  Cycles through all images based on scroll progress (0% to 100%)            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const SLIDESHOW_CONFIG = {
  imageFolder: 'images/cv-images/',
  images: [
    'profile-image-01.jpg',
    'profile-image-02.jpg',
    'profile-image-03.jpg',
    'profile-image-04.jpg',
    'profile-image-05.jpg',
    'profile-image-06.jpg',
    'profile-image-07.jpg',
    'profile-image-08.jpg',
    'profile-image-09.jpg',
    'profile-image-10.jpg',
  ]};

// Static centered position (no jitter, no rotation)
const JITTER_POSITIONS = [
  { x: -50, y: -50, rotate: 0 },
];

function initCvPhotoSlideshow() {
  const photoContainer = document.querySelector('.cv-photo');
  const photoImg = document.querySelector('.cv-photo__image');
  const scrollContainer = document.querySelector('.cv-right');
  
  if (!photoContainer || !photoImg || !scrollContainer) {
    console.warn('[CV Photo Slideshow] Required elements not found');
    return null;
  }

  // Build full image URLs
  const imageUrls = SLIDESHOW_CONFIG.images.map(
    (img) => `${SLIDESHOW_CONFIG.imageFolder}${img}`
  );

  let currentImageIndex = 0;
  let currentPositionIndex = 0;

  // Apply a jitter position (abrupt jump, no transition)
  function applyJitterPosition() {
    const position = JITTER_POSITIONS[currentPositionIndex];
    photoImg.style.transform = `translate(${position.x}%, ${position.y}%) rotate(${position.rotate}deg)`;
    
    // Move to next position
    currentPositionIndex = (currentPositionIndex + 1) % JITTER_POSITIONS.length;
  }

  // Set image based on scroll progress
  function updateImageFromScroll() {
    const scrollTop = scrollContainer.scrollTop;
    const scrollHeight = scrollContainer.scrollHeight;
    const clientHeight = scrollContainer.clientHeight;
    const maxScroll = scrollHeight - clientHeight;
    
    // Calculate scroll progress (0 to 1)
    const scrollProgress = maxScroll > 0 ? scrollTop / maxScroll : 0;
    
    // Map scroll progress to image index (evenly distributed across all 10 images)
    // Each image gets an equal slice of the scroll range (0-10%, 10-20%, etc.)
    const targetIndex = Math.min(
      Math.floor(scrollProgress * imageUrls.length),
      imageUrls.length - 1
    );
    
    // Debug logging
    console.log(`[CV Scroll Debug] top:${scrollTop.toFixed(0)} max:${maxScroll.toFixed(0)} progress:${(scrollProgress * 100).toFixed(1)}% → img ${targetIndex + 1}/${imageUrls.length}`);
    
    // Update image (even if same index, to ensure it's set)
    if (targetIndex !== currentImageIndex) {
      currentImageIndex = targetIndex;
      photoImg.src = imageUrls[currentImageIndex];
      console.log(`[CV Photo] ✓ Changed to image ${targetIndex + 1}`);
    }
  }

  // Set initial image and position (static, no animation)
  photoImg.src = imageUrls[0];
  applyJitterPosition();

  // Jitter animation disabled - image stays centered
  // jitterIntervalId = setInterval(applyJitterPosition, SLIDESHOW_CONFIG.jitterInterval);

  // Listen to scroll events (immediate, no debounce for testing)
  scrollContainer.addEventListener('scroll', () => {
    updateImageFromScroll();
  }, { passive: true });
  
  // Also update on initial load
  setTimeout(() => {
    updateImageFromScroll();
  }, 500);

  // Click handler: advance to next image manually
  photoContainer.style.cursor = 'pointer';
  photoContainer.addEventListener('click', (event) => {
    event.preventDefault();
    if (imageUrls.length > 1) {
      currentImageIndex = (currentImageIndex + 1) % imageUrls.length;
      photoImg.src = imageUrls[currentImageIndex];
    }
  });

  console.log(`[CV Photo Slideshow] Initialized with ${imageUrls.length} image(s) - scroll-driven`);

  // Return cleanup function
  return {
    destroy() {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
        scrollTimeout = null;
      }
      photoContainer.style.cursor = '';
    },
  };
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           CV CONFIG PANEL                                    ║
// ║                   Control panel for CV page layout                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const STORAGE_KEY = 'cv_config';

// Default configuration
const DEFAULT_CONFIG = {
  // Left column (photo + intro)
  leftWidth: 32, // vw
  leftPaddingTop: 10, // vh
  leftPaddingBottom: 10, // vh
  leftGap: 2.5, // rem
  
  // Photo
  photoAspectRatio: 0.75, // 3:4 ratio
  photoSize: 115, // % (fills container with slight overflow for jitter effect)
  photoBorderRadius: 1, // rem
  
  // Right column (scrollable content)
  rightPaddingTop: 20, // vh
  rightPaddingBottom: 20, // vh
  rightPaddingX: 2.5, // rem
  rightMaxWidth: 42, // rem
  
  // Typography
  nameSize: 2.2, // rem
  titleSize: 0.9, // rem
  sectionTitleSize: 0.75, // rem
  bodySize: 0.9, // rem
  
  // Spacing
  sectionGap: 3.5, // rem
  paragraphGap: 1.5, // rem
  
  // Colors
  mutedOpacity: 0.6, // for section titles
};

// Load configuration from localStorage
function loadConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (e) {
    return { ...DEFAULT_CONFIG };
  }
}

// Save configuration to localStorage
function saveConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('[CV Panel] Could not save config:', e);
  }
}

// Apply configuration to CSS variables
function applyConfig(config) {
  const root = document.documentElement;
  
  // Left column
  root.style.setProperty('--cv-left-width', `${config.leftWidth}vw`);
  root.style.setProperty('--cv-left-padding-top', `${config.leftPaddingTop}vh`);
  root.style.setProperty('--cv-left-padding-bottom', `${config.leftPaddingBottom}vh`);
  root.style.setProperty('--cv-left-gap', `${config.leftGap}rem`);
  
  // Photo
  root.style.setProperty('--cv-photo-aspect-ratio', config.photoAspectRatio);
  root.style.setProperty('--cv-photo-size', `${config.photoSize}%`);
  root.style.setProperty('--cv-photo-border-radius', `${config.photoBorderRadius}rem`);
  
  // Right column
  root.style.setProperty('--cv-right-padding-top', `${config.rightPaddingTop}vh`);
  root.style.setProperty('--cv-right-padding-bottom', `${config.rightPaddingBottom}vh`);
  root.style.setProperty('--cv-right-padding-x', `${config.rightPaddingX}rem`);
  root.style.setProperty('--cv-right-max-width', `${config.rightMaxWidth}rem`);
  
  // Typography
  root.style.setProperty('--cv-name-size', `${config.nameSize}rem`);
  root.style.setProperty('--cv-title-size', `${config.titleSize}rem`);
  root.style.setProperty('--cv-section-title-size', `${config.sectionTitleSize}rem`);
  root.style.setProperty('--cv-body-size', `${config.bodySize}rem`);
  
  // Spacing
  root.style.setProperty('--cv-section-gap', `${config.sectionGap}rem`);
  root.style.setProperty('--cv-paragraph-gap', `${config.paragraphGap}rem`);
  
  // Colors
  root.style.setProperty('--cv-muted-opacity', config.mutedOpacity);
}

// Create panel HTML
function createPanelHTML() {
  return `
    <div id="cv-config-panel" class="cv-config-panel">
      <div class="cv-panel-header">
        <h3>CV Layout Config</h3>
        <button id="cv-panel-close" class="cv-panel-close" aria-label="Close panel">×</button>
      </div>
      <div class="cv-panel-content">
        
        <details class="cv-panel-section" open>
          <summary>Left Column</summary>
          <div class="cv-panel-controls">
            <label>
              <span>Width (vw)</span>
              <input type="range" id="leftWidth" min="20" max="45" step="1" />
              <output></output>
            </label>
            <label>
              <span>Padding Top (vh)</span>
              <input type="range" id="leftPaddingTop" min="0" max="20" step="1" />
              <output></output>
            </label>
            <label>
              <span>Padding Bottom (vh)</span>
              <input type="range" id="leftPaddingBottom" min="0" max="20" step="1" />
              <output></output>
            </label>
            <label>
              <span>Gap (rem)</span>
              <input type="range" id="leftGap" min="0.5" max="5" step="0.25" />
              <output></output>
            </label>
          </div>
        </details>
        
        <details class="cv-panel-section" open>
          <summary>Photo</summary>
          <div class="cv-panel-controls">
            <label>
              <span>Size (%)</span>
              <input type="range" id="photoSize" min="10" max="150" step="1" />
              <output></output>
            </label>
            <label>
              <span>Aspect Ratio</span>
              <input type="range" id="photoAspectRatio" min="0.5" max="1.5" step="0.05" />
              <output></output>
            </label>
            <label>
              <span>Border Radius (rem)</span>
              <input type="range" id="photoBorderRadius" min="0" max="3" step="0.1" />
              <output></output>
            </label>
          </div>
        </details>
        
        <details class="cv-panel-section">
          <summary>Right Column</summary>
          <div class="cv-panel-controls">
            <label>
              <span>Padding Top (vh)</span>
              <input type="range" id="rightPaddingTop" min="0" max="30" step="1" />
              <output></output>
            </label>
            <label>
              <span>Padding Bottom (vh)</span>
              <input type="range" id="rightPaddingBottom" min="0" max="30" step="1" />
              <output></output>
            </label>
            <label>
              <span>Padding X (rem)</span>
              <input type="range" id="rightPaddingX" min="0" max="5" step="0.25" />
              <output></output>
            </label>
            <label>
              <span>Max Width (rem)</span>
              <input type="range" id="rightMaxWidth" min="30" max="60" step="1" />
              <output></output>
            </label>
          </div>
        </details>
        
        <details class="cv-panel-section">
          <summary>Typography</summary>
          <div class="cv-panel-controls">
            <label>
              <span>Name Size (rem)</span>
              <input type="range" id="nameSize" min="1" max="4" step="0.1" />
              <output></output>
            </label>
            <label>
              <span>Title Size (rem)</span>
              <input type="range" id="titleSize" min="0.5" max="1.5" step="0.05" />
              <output></output>
            </label>
            <label>
              <span>Section Title (rem)</span>
              <input type="range" id="sectionTitleSize" min="0.5" max="1.2" step="0.05" />
              <output></output>
            </label>
            <label>
              <span>Body Size (rem)</span>
              <input type="range" id="bodySize" min="0.6" max="1.4" step="0.05" />
              <output></output>
            </label>
          </div>
        </details>
        
        <details class="cv-panel-section">
          <summary>Spacing</summary>
          <div class="cv-panel-controls">
            <label>
              <span>Section Gap (rem)</span>
              <input type="range" id="sectionGap" min="1" max="6" step="0.25" />
              <output></output>
            </label>
            <label>
              <span>Paragraph Gap (rem)</span>
              <input type="range" id="paragraphGap" min="0.5" max="3" step="0.25" />
              <output></output>
            </label>
          </div>
        </details>
        
        <div class="cv-panel-actions">
          <button id="cv-panel-reset" class="cv-panel-btn cv-panel-btn--secondary">Reset to Defaults</button>
        </div>
      </div>
    </div>
  `;
}

// Initialize panel
function initCvPanel() {
  // Create panel toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'cv-panel-toggle';
  toggleBtn.className = 'cv-panel-toggle';
  toggleBtn.setAttribute('aria-label', 'Toggle CV config panel');
  toggleBtn.textContent = '⚙';
  document.body.appendChild(toggleBtn);
  
  // Create panel
  const panelContainer = document.createElement('div');
  panelContainer.innerHTML = createPanelHTML();
  document.body.appendChild(panelContainer.firstElementChild);
  
  const panel = document.getElementById('cv-config-panel');
  const closeBtn = document.getElementById('cv-panel-close');
  const resetBtn = document.getElementById('cv-panel-reset');
  
  let currentConfig = loadConfig();
  applyConfig(currentConfig);
  
  // Bind all controls
  Object.keys(currentConfig).forEach(key => {
    const input = document.getElementById(key);
    if (!input) return;
    
    const output = input.nextElementSibling;
    
    // Set initial value
    input.value = currentConfig[key];
    if (output) output.textContent = currentConfig[key];
    
    // Handle changes
    input.addEventListener('input', () => {
      const value = parseFloat(input.value);
      currentConfig[key] = value;
      if (output) output.textContent = value;
      applyConfig(currentConfig);
      saveConfig(currentConfig);
    });
  });
  
  // Toggle panel (starts hidden)
  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('cv-panel--visible');
  });
  
  // Keyboard shortcut: / key to toggle
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Don't trigger if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      panel.classList.toggle('cv-panel--visible');
    }
  });
  
  // Close panel
  closeBtn.addEventListener('click', () => {
    panel.classList.remove('cv-panel--visible');
  });
  
  // Reset to defaults
  resetBtn.addEventListener('click', () => {
    if (!confirm('Reset all CV layout settings to defaults?')) return;
    
    currentConfig = { ...DEFAULT_CONFIG };
    applyConfig(currentConfig);
    saveConfig(currentConfig);
    
    // Update all inputs
    Object.keys(currentConfig).forEach(key => {
      const input = document.getElementById(key);
      if (!input) return;
      const output = input.nextElementSibling;
      input.value = currentConfig[key];
      if (output) output.textContent = currentConfig[key];
    });
  });
  
  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('cv-panel--visible')) {
      panel.classList.remove('cv-panel--visible');
    }
  });
  
  console.log('[CV Panel] Initialized');
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               CV PAGE BOOTSTRAP                               ║
// ║     Loads runtime text + shared chrome (dark mode, time, socials, sound)      ║
// ║                     PORTFOLIO PARITY: Matching bootstrap sequence             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


async function bootstrapCvPage() {
  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    STEP 1: LOAD RUNTIME TEXT                                 ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    await loadRuntimeText();
    applyRuntimeTextToDOM();
  } catch (e) {
    // Non-fatal: continue with defaults.
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    STEP 2: WAIT FOR FONTS (Portfolio parity)                 ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    await waitForFonts();
  } catch (e) {}

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    STEP 3: DRAMATIC ENTRANCE (Portfolio parity)              ║
  // ║        Runs BEFORE config/dark mode - matches Portfolio bootstrap order      ║
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
      // Also reveal central content elements
      const cvContainer = document.querySelector('.cv-scroll-container');
      if (cvContainer) {
        cvContainer.style.opacity = '1';
        cvContainer.style.visibility = 'visible';
      }
      console.warn(`⚠️ CV entrance fallback (${reason})`);
    };

    if (!g.entranceEnabled || reduceMotion) {
      if (fadeContent) {
        fadeContent.style.opacity = '1';
        fadeContent.style.transform = 'translateZ(0)';
      }
      // Also reveal central content elements
      const cvContainer = document.querySelector('.cv-scroll-container');
      if (cvContainer) {
        cvContainer.style.opacity = '1';
        cvContainer.style.visibility = 'visible';
      }
      removeBlocker();
      console.log('✓ CV entrance animation skipped (disabled or reduced motion)');
    } else {
      const { orchestrateEntrance } = await import('./shared.js').then(function (n) { return n.aP; });
      await orchestrateEntrance({
        waitForFonts: async () => {
          try { await waitForFonts(); } catch (e) {}
        },
        skipWallAnimation: true,
        centralContent: [
          '.cv-scroll-container'
        ]
      });
      removeBlocker();
      console.log('✓ Dramatic entrance animation orchestrated (CV)');
    }

    // Failsafe watchdog: never allow a stuck hidden page (Portfolio parity)
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
    // Failsafe: reveal CV content
    const cvContainer = document.querySelector('.cv-scroll-container');
    if (cvContainer) {
      cvContainer.style.opacity = '1';
      cvContainer.style.visibility = 'visible';
    }
    console.warn('⚠️ CV entrance animation failed, forcing content visible', e);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    STEP 4: LOAD CONFIG + WALL FRAME                          ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  let runtimeConfig = null;
  try {
    runtimeConfig = await loadRuntimeConfig();
    // Initialize state with runtime config so all global parameters are available
    applyWallFrameFromConfig(runtimeConfig);
    // CV needs the same visible rubber wall as index, but without running the balls simulation.
    // Draw the wall ring onto a dedicated canvas layered above the content.
    try { initPortfolioWallCanvas({ canvasSelector: '.cv-wall-canvas' }); } catch (e) {}
    // Procedural noise texture (no GIF): generates a small texture once and animates via CSS only.
    try { initNoiseSystem(getGlobals()); } catch (e) {}
    // Keep the frame responsive to viewport changes (same behavior as index).
    window.addEventListener('resize', applyWallFrameLayout, { passive: true });
  } catch (e) {
    // Safe fallback: keep the page readable if config loading fails.
    // Still try to initialize noise with defaults
    try { initNoiseSystem(); } catch (e2) {}
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    STEP 5: MODAL/GATE SYSTEM (Portfolio parity)              ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  // Initialize shared chrome (modals + cursor hiding) with CV-specific config
  initSharedChrome({
    contactModal: true,
    cvModal: false, // Already on CV page
    portfolioModal: true,
    cursorHiding: true,
    modalOverlayConfig: runtimeConfig || {}
  });

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    STEP 6: PALETTE + DARK MODE                               ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
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

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                    STEP 7: SHARED UI CHROME                                  ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  maybeAutoPickCursorColor?.('startup');
  initTimeDisplay();
  upgradeSocialIcons();
  // Sound toggle removed from CV page - no sound on this page
  // createSoundToggle();

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                       CV-SPECIFIC: SCROLL TYPOGRAPHY                         ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    // Ensure fonts are settled so line breaking is stable.
    try { await waitForFonts(); } catch (e) {}
  } catch (e) {}

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                       CV-SPECIFIC: PHOTO SLIDESHOW                           ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    initCvPhotoSlideshow();
  } catch (e) {
    console.warn('CV photo slideshow failed to initialize', e);
  }

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║                       CV-SPECIFIC: CONFIG PANEL (DEV ONLY)                   ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  try {
    // Production builds intentionally ship with baked-in config (no tuning UI).
    {
      initCvPanel();
    }
  } catch (e) {
    console.warn('CV config panel failed to initialize', e);
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

document.addEventListener('DOMContentLoaded', () => {
  bootstrapCvPage();
});
//# sourceMappingURL=cv.js.map
