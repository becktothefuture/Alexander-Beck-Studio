import { syncCornerShapeSquircleClass } from '../../legacy/modules/core/state.js';
import { initSharedChrome } from '../../legacy/modules/ui/shared-chrome.js';
import {
  NAV_STATES,
  navigateWithTransition,
  resetTransitionState,
  setupPrefetchOnHover,
} from '../../legacy/modules/utils/page-nav.js';
import { loadRuntimeConfig } from '../../legacy/modules/utils/runtime-config.js';
import { forceBootVisible } from '../../legacy/modules/visual/page-orchestrator.js';
import { loadShellConfig, syncShellToDocument } from '../../legacy/modules/visual/site-shell.js';
import { applyWallFrameFromConfig, applyWallFrameLayout } from '../../legacy/modules/visual/wall-frame.js';
import { stampCursorContrastFromTheme } from '../../legacy/modules/visual/colors.js';
import { initNoiseSystem } from '../../legacy/modules/visual/noise-system.js';
import { createScrollPresence } from '../../legacy/modules/utils/scroll-presence.js';

function getCvScrollContainer() {
  return document.getElementById('cv-scroll-container');
}

function setCvContentVisible() {
  const scroller = getCvScrollContainer();
  if (!scroller) return;
  scroller.style.opacity = '1';
  scroller.style.visibility = 'visible';
}

export async function bootstrapCvRoute() {
  const ABS_DEV = import.meta.env.DEV;
  forceBootVisible(['#abs-scene', '#app-frame', '#cv-scroll-container']);
  setCvContentVisible();

  let runtimeConfig = null;

  try {
    runtimeConfig = await loadRuntimeConfig();
    syncCornerShapeSquircleClass(runtimeConfig?.cornerShapeSquircleEnabled !== false);
    applyWallFrameFromConfig(runtimeConfig);
  } catch {
    syncCornerShapeSquircleClass(true);
  }

  try {
    const shellConfig = await loadShellConfig();
    syncShellToDocument({
      config: shellConfig,
      isDark: document.documentElement.classList.contains('dark-mode'),
    });
  } catch {
    syncShellToDocument({
      isDark: document.documentElement.classList.contains('dark-mode'),
    });
  }

  try {
    initNoiseSystem(runtimeConfig || {});
  } catch {
    // Keep the route usable even if the decorative layer fails.
  }

  initSharedChrome({
    contactModal: true,
    cvModal: false,
    portfolioModal: true,
    cursorHiding: true,
    modalOverlayConfig: runtimeConfig || {},
  });

  stampCursorContrastFromTheme();
  requestAnimationFrame(() => stampCursorContrastFromTheme());

  const handleLayoutResize = () => {
    applyWallFrameLayout();
  };

  window.addEventListener('resize', handleLayoutResize, { passive: true });
  window.visualViewport?.addEventListener('resize', handleLayoutResize, { passive: true });

  const transitionLinks = Array.from(document.querySelectorAll('[data-nav-transition]'));
  const handleTransitionClick = (event) => {
    event.preventDefault();
    navigateWithTransition(event.currentTarget.href, NAV_STATES.INTERNAL);
  };

  transitionLinks.forEach((link) => {
    link.addEventListener('click', handleTransitionClick);
  });

  const handlePageShow = (event) => {
    if (!event.persisted) return;
    resetTransitionState();
    const appFrame = document.getElementById('app-frame');
    if (appFrame) appFrame.style.opacity = '1';
    setCvContentVisible();
  };

  window.addEventListener('pageshow', handlePageShow);

  const backLink = document.querySelector('[data-nav-transition][href*="index"]');
  if (backLink) {
    setupPrefetchOnHover(backLink, 'index.html');
  }

  if (ABS_DEV) {
    try {
      const { registerDevPanelRoute } = await import('../../legacy/modules/ui/panel-popup-manager.js');
      registerDevPanelRoute({
        page: 'cv',
        pageLabel: 'CV',
        productLabel: 'Alexander Beck Studio',
        pageSectionTitle: 'CV',
      });
    } catch (error) {
      console.warn('CV panel init failed', error);
    }
  }

  const scrollContainer = getCvScrollContainer();
  const scrollPresence = scrollContainer
    ? createScrollPresence(scrollContainer, {
        defaultSpanRatio: 0.2,
        minSpanPx: 92,
        maxSpanPx: 220,
      })
    : null;
  if (scrollContainer) {
    scrollContainer.scrollTop = 0;
  }

  return () => {
    scrollPresence?.destroy();
    window.removeEventListener('resize', handleLayoutResize);
    window.visualViewport?.removeEventListener('resize', handleLayoutResize);
    window.removeEventListener('pageshow', handlePageShow);
    transitionLinks.forEach((link) => {
      link.removeEventListener('click', handleTransitionClick);
    });
  };
}
