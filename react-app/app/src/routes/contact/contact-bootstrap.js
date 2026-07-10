import { syncCornerShapeSquircleClass } from '../../legacy/modules/core/state.js';
import { initSharedChrome } from '../../legacy/modules/ui/shared-chrome.js';
import {
  resetTransitionState,
  setupPrefetchOnHover,
  setupTransitionNavigationLinks,
} from '../../legacy/modules/utils/page-nav.js';
import { loadRuntimeConfig } from '../../legacy/modules/utils/runtime-config.js';
import { waitForFonts } from '../../legacy/modules/utils/font-loader.js';
import {
  completeDirectBoot,
  waitForFrames,
  waitForPageReadyBarrier,
  waitForUsableRects,
} from '../../legacy/modules/visual/page-orchestrator.js';
import { loadShellConfig, syncShellToDocument } from '../../legacy/modules/visual/site-shell.js';
import { applyWallFrameFromConfig, applyWallFrameLayout } from '../../legacy/modules/visual/wall-frame.js';
import { stampCursorContrastFromTheme } from '../../legacy/modules/visual/colors.js';
import { initNoiseSystem } from '../../legacy/modules/visual/noise-system.js';

function setContactContentVisible() {
  const content = document.getElementById('contact-route-main');
  if (!content) return;
  content.style.opacity = '1';
  content.style.visibility = 'visible';
}

export async function bootstrapContactRoute() {
  const ABS_DEV = import.meta.env.DEV;
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
    // Decorative noise must not block the contact route.
  }

  initSharedChrome({
    contactModal: false,
    cvModal: true,
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

  const cleanupTransitionNavigationLinks = setupTransitionNavigationLinks();

  const handlePageShow = (event) => {
    if (!event.persisted) return;
    resetTransitionState();
    const appFrame = document.getElementById('app-frame');
    if (appFrame) appFrame.style.opacity = '1';
    setContactContentVisible();
  };

  window.addEventListener('pageshow', handlePageShow);

  const backLink = document.querySelector('[data-nav-transition][href*="index"]');
  const cvTrigger = document.getElementById('cv-modal-trigger');
  const portfolioTrigger = document.getElementById('portfolio-modal-trigger');
  if (backLink) setupPrefetchOnHover(backLink, 'index.html');
  if (cvTrigger) setupPrefetchOnHover(cvTrigger, 'cv.html');
  if (portfolioTrigger) setupPrefetchOnHover(portfolioTrigger, 'portfolio.html');

  if (ABS_DEV) {
    try {
      const { registerDevPanelRoute } = await import('../../legacy/modules/ui/panel-popup-manager.js');
      registerDevPanelRoute({
        page: 'contact',
        pageLabel: 'Contact',
        productLabel: 'Alexander Beck Studio',
        pageSectionTitle: 'Contact',
      });
    } catch (error) {
      console.warn('Contact panel init failed', error);
    }
  }

  handleLayoutResize();
  setContactContentVisible();
  await waitForPageReadyBarrier({
    waitForFonts: async () => {
      try {
        await waitForFonts();
        return true;
      } catch {
        return false;
      }
    },
    minimumMs: 80,
  });
  await waitForUsableRects(['#abs-scene', '#app-frame', '#contact-route-main', '.route-topbar'], {
    timeoutMs: 2600,
  });
  await waitForFrames(2);
  await completeDirectBoot({
    selectors: ['#abs-scene', '#app-frame', '#contact-route-main'],
    detail: 'contact-ready',
  });

  return () => {
    window.removeEventListener('resize', handleLayoutResize);
    window.visualViewport?.removeEventListener('resize', handleLayoutResize);
    window.removeEventListener('pageshow', handlePageShow);
    cleanupTransitionNavigationLinks();
  };
}
