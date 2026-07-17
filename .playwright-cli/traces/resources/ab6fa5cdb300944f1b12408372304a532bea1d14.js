// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    MODERN DARK MODE SYSTEM (Best Practices)                 ║
// ║          Native feel with prefers-color-scheme + manual override            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { applyLayoutCSSVars, getGlobals } from "/src/legacy/modules/core/state.js";
import { applyColorTemplate } from "/src/legacy/modules/visual/colors.js";
import { syncChromeColor } from "/src/legacy/modules/physics/engine.js";
import { log as devLog } from "/src/legacy/modules/utils/logger.js";
import { applyChromeHarmony } from "/src/legacy/modules/visual/chrome-harmony.js";
import { readTokenVar } from "/src/legacy/modules/utils/tokens.js";
import { applyShellLayoutVars, syncShellToDocument, syncThemeColorMeta } from "/src/legacy/modules/visual/site-shell.js";
import { forEachPanelUiDocument, resolvePanelUiDocument } from "/src/legacy/modules/ui/panel-ui-context.js";
import {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  applyThemeState,
  isDarkThemeDocument,
  normalizeThemePreference,
  readThemePreference,
  resolveThemeIsDark,
  writeThemePreference,
} from "/src/lib/theme-state.js";

// Theme states: 'auto', 'light', 'dark'
let currentTheme = 'auto';
let systemPreference = 'light';

let isDarkModeInitialized = false;

function syncWallPanelTabsToTheme() {
  const isDark = document.body.classList.contains('dark-mode');
  const theme = isDark ? 'dark' : 'light';
  forEachPanelUiDocument((uiDocument) => {
    uiDocument.querySelectorAll('.wall-section-with-tabs').forEach((container) => {
      const sectionKey = container.querySelector('.wall-theme-tab')?.getAttribute('data-wall-section');
      if (!sectionKey) return;
      const tab = container.querySelector(`.wall-theme-tab[data-theme="${theme}"]`);
      const panel = uiDocument.getElementById(sectionKey + (theme === 'light' ? 'LightPanel' : 'DarkPanel'));
      if (!tab || !panel) return;
      container.querySelectorAll('.wall-theme-tab').forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      container.querySelectorAll('.wall-tab-panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      panel.classList.add('active');
    });
  });
}

/**
 * Sync CSS variables from config values (called at init)
 * This ensures config-driven colors override CSS defaults
 */
function syncCssVarsFromConfig() {
  const g = getGlobals();
  const root = document.documentElement;
  applyShellLayoutVars();
  
  // Scene interior backgrounds (used only for #simulations container, not browser chrome)
  if (g?.bgLight) {
    root.style.setProperty('--bg-light', g.bgLight);
  }
  if (g?.bgDark) {
    root.style.setProperty('--bg-dark', g.bgDark);
  }
  syncShellToDocument({
    isDark: document.documentElement.classList.contains('dark-mode')
  });
  
  // Text colors
  if (g?.textColorLight) {
    root.style.setProperty('--text-color-light', g.textColorLight);
  }
  if (g?.textColorLightMuted) {
    root.style.setProperty('--text-color-light-muted', g.textColorLightMuted);
  }
  if (g?.textColorDark) {
    root.style.setProperty('--text-color-dark', g.textColorDark);
  }
  if (g?.textColorDarkMuted) {
    root.style.setProperty('--text-color-dark-muted', g.textColorDarkMuted);
  }

  // Edge labels (vertical chapter/copyright)
  if (Number.isFinite(g?.edgeLabelInsetAdjustPx)) {
    root.style.setProperty('--edge-label-inset-adjust', `${g.edgeLabelInsetAdjustPx}px`);
  }
  
  // Link colors
  if (g?.linkHoverColor) {
    root.style.setProperty('--link-hover-color', g.linkHoverColor);
  }
  
  // Logo + edge label colors are now derived from the core text tokens in CSS.
}

/**
 * Detect system color scheme preference
 */
function detectSystemPreference() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function refreshSystemPreference() {
  systemPreference = detectSystemPreference();
  if (currentTheme === 'auto' && resolveShouldBeDark('auto') !== isRenderedDarkMode()) {
    applyTheme('auto', { persist: false });
    return;
  }
  applyChromeHarmony();
  updateThemeColor(isRenderedDarkMode());
}

function resolveShouldBeDark(theme) {
  return resolveThemeIsDark(theme, systemPreference === 'dark');
}

function isRenderedDarkMode() {
  return isDarkThemeDocument();
}

/**
 * Update browser chrome/theme color tags from currently-active wall CSS vars.
 */
function updateThemeColor(isDark) {
  const g = getGlobals();
  const cssActive = readTokenVar('--frame-color', '');
  const cssLight = readTokenVar('--frame-color-light', '');
  const cssDark = readTokenVar('--frame-color-dark', '');
  const fallback = g?.frameColor || g?.frameColorLight || g?.frameColorDark || "var(--color-detected-242529)";
  const activeColor = cssActive || (isDark ? (cssDark || cssLight) : (cssLight || cssDark)) || fallback;
  const lightColor = cssLight || activeColor || fallback;
  const darkColor = cssDark || activeColor || fallback;
  
  syncThemeColorMeta({
    active: activeColor,
    light: lightColor,
    dark: darkColor
  });
}

/**
 * Apply dark mode to DOM
 */
function applyDarkModeToDOM(isDark) {
  const globals = getGlobals();
  const root = document.documentElement;
  globals.isDarkMode = isDark;
  
  applyThemeState(isDark, { container: globals.container });
  root.style.setProperty(
    '--abs-indicator-ink',
    isDark ? 'rgb(var(--abs-rgb-white))' : 'rgb(var(--abs-rgb-black))'
  );

  applyLayoutCSSVars();

  // Establish the authored palette before adapting frame chrome.
  applyColorTemplate(globals.currentTemplate);
  syncShellToDocument({ isDark });

  // 1) If the browser ignores theme-color (desktop Chrome tabs), adapt the frame to match the browser UI.
  // 2) Then update meta theme-color from the (possibly updated) CSS vars.
  applyChromeHarmony();
  updateThemeColor(isDark);
  
  // Sync chrome color for rubbery walls
  syncChromeColor();
  
  // Re-apply noise system so SVG noise can re-tint to the active theme.
  try {
    import("/src/legacy/modules/visual/noise-system.js").then(({ applyNoiseSystem }) => applyNoiseSystem({}));
  } catch (e) {}

  try {
    import("/src/legacy/modules/portfolio/pit-mode.js").then((m) => {
      if (typeof m.syncPortfolioAccentCircleColors === 'function') {
        m.syncPortfolioAccentCircleColors();
      }
    });
  } catch (e) { /* ignore */ }
  
  // Update UI
  updateSegmentControl();
  syncWallPanelTabsToTheme();
}

/**
 * Update segment control UI
 */
function updateSegmentControl() {
  const globals = getGlobals();
  const nextStatusText = currentTheme === 'auto'
    ? (globals.isDarkMode ? '🌙 Auto (Dark)' : '☀️ Auto (Light)')
    : (currentTheme === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode');

  forEachPanelUiDocument((uiDocument) => {
    const panelThemeToggle = uiDocument.querySelector('.panel-theme-toggle');
    if (panelThemeToggle) {
      panelThemeToggle.textContent = globals.isDarkMode ? '☀️' : '🌙';
      panelThemeToggle.dataset.state = globals.isDarkMode ? 'dark' : 'light';
    }

    const autoBtn = uiDocument.getElementById('themeAuto');
    const lightBtn = uiDocument.getElementById('themeLight');
    const darkBtn = uiDocument.getElementById('themeDark');
    if (!autoBtn || !lightBtn || !darkBtn) return;

    [autoBtn, lightBtn, darkBtn].forEach(btn => btn.classList.remove('active'));

    if (currentTheme === 'auto') {
      autoBtn.classList.add('active');
    } else if (currentTheme === 'light') {
      lightBtn.classList.add('active');
    } else {
      darkBtn.classList.add('active');
    }

    const status = uiDocument.getElementById('themeStatus');
    if (status) status.textContent = nextStatusText;
  });
}

export function bindThemeSegmentControls(uiDocument) {
  const panelDocument = resolvePanelUiDocument(uiDocument);
  if (!panelDocument) return;

  const autoBtn = panelDocument.getElementById('themeAuto');
  const lightBtn = panelDocument.getElementById('themeLight');
  const darkBtn = panelDocument.getElementById('themeDark');

  if (autoBtn && autoBtn.dataset.themeBound !== 'true') {
    autoBtn.dataset.themeBound = 'true';
    autoBtn.addEventListener('click', () => setTheme('auto'));
  }
  if (lightBtn && lightBtn.dataset.themeBound !== 'true') {
    lightBtn.dataset.themeBound = 'true';
    lightBtn.addEventListener('click', () => setTheme('light'));
  }
  if (darkBtn && darkBtn.dataset.themeBound !== 'true') {
    darkBtn.dataset.themeBound = 'true';
    darkBtn.addEventListener('click', () => setTheme('dark'));
  }

  updateSegmentControl();
}

/**
 * Set theme (auto, light, or dark)
 */
function applyTheme(theme, { persist = true } = {}) {
  currentTheme = normalizeThemePreference(theme);
  const shouldBeDark = resolveShouldBeDark(currentTheme);
  
  applyDarkModeToDOM(shouldBeDark);
  
  // Save preference
  if (persist) writeThemePreference(currentTheme);

  try {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
      detail: {
        theme: currentTheme,
        isDark: shouldBeDark,
      },
    }));
  } catch (e) {}
  
  devLog(`🎨 Theme set to: ${currentTheme} (rendering: ${shouldBeDark ? 'dark' : 'light'})`);
}

export function setTheme(theme) {
  applyTheme(theme);
}

/**
 * Clear color-related localStorage cache
 * Called when wall color system changes to prevent stale color values
 */
function clearColorCache() {
  try {
    // Keep the explicit theme choice; only clear derived palette caches.
    localStorage.removeItem('abs_palette_chapter');
    devLog('🗑️ Cleared color-related localStorage cache');
  } catch (e) {
    // localStorage unavailable or error
  }
}

/**
 * Initialize dark mode system
 */
export function initializeDarkMode() {
  if (isDarkModeInitialized) {
    // Other route runtimes may restamp shell variables after the shared shell has
    // initialized. Re-project the canonical preference without binding listeners
    // a second time so theme and browser-frame state cannot drift during boot.
    systemPreference = detectSystemPreference();
    applyTheme(readThemePreference(), { persist: false });
    bindThemeSegmentControls(document);
    return;
  }
  isDarkModeInitialized = true;

  // Clear color cache to prevent stale wall color values
  clearColorCache();

  // Sync CSS variables from config FIRST (before theme application)
  syncCssVarsFromConfig();

  // Detect system preference (for auto mode later)
  systemPreference = detectSystemPreference();
  devLog(`🖥️ System prefers: ${systemPreference}`);
  
  // Restore the same preference at every viewport width.
  applyTheme(readThemePreference(), { persist: false });
  
  bindThemeSegmentControls(document);
  
  // Listen for system preference changes
  if (window.matchMedia) {
    const colorSchemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    const handleColorSchemeChange = (e) => {
      systemPreference = e.matches ? 'dark' : 'light';
      devLog(`🖥️ System preference changed to: ${systemPreference}`);
      
      // If in auto mode, update
      if (currentTheme === 'auto' && resolveShouldBeDark('auto') !== isRenderedDarkMode()) {
        applyTheme('auto', { persist: false });
      } else {
        applyChromeHarmony();
        updateThemeColor(isRenderedDarkMode());
      }
    };
    if (typeof colorSchemeMedia.addEventListener === 'function') {
      colorSchemeMedia.addEventListener('change', handleColorSchemeChange);
    } else {
      colorSchemeMedia.addListener?.(handleColorSchemeChange);
    }
  }

  // localStorage events fire in the other tab, keeping all open tabs in sync.
  window.addEventListener('storage', (event) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    const nextTheme = readThemePreference();
    if (nextTheme === currentTheme && resolveShouldBeDark(nextTheme) === isRenderedDarkMode()) return;
    applyTheme(nextTheme, { persist: false });
  });

  // Re-check restored BFCache tabs before they become visible again.
  window.addEventListener('pageshow', () => {
    currentTheme = readThemePreference();
    refreshSystemPreference();
  });

  // iOS Safari can resume a backgrounded tab without replaying the media-query
  // event. Reconcile Auto whenever the document becomes visible again.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    currentTheme = readThemePreference();
    refreshSystemPreference();
  });

  devLog('✓ Modern dark mode initialized');
}

/**
 * Get current theme
 */
export function getCurrentTheme() {
  return currentTheme;
}

/**
 * Toggle between light and dark mode manually
 */
export function toggleDarkMode() {
  const isCurrentlyDark = isRenderedDarkMode();
  const newTheme = isCurrentlyDark ? 'light' : 'dark';
  setTheme(newTheme);
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRhcmstbW9kZS12Mi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyDilZTilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZdcbi8vIOKVkSAgICAgICAgICAgICAgICAgICAgTU9ERVJOIERBUksgTU9ERSBTWVNURU0gKEJlc3QgUHJhY3RpY2VzKSAgICAgICAgICAgICAgICAg4pWRXG4vLyDilZEgICAgICAgICAgTmF0aXZlIGZlZWwgd2l0aCBwcmVmZXJzLWNvbG9yLXNjaGVtZSArIG1hbnVhbCBvdmVycmlkZSAgICAgICAgICAgIOKVkVxuLy8g4pWa4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWdXG5cbmltcG9ydCB7IGFwcGx5TGF5b3V0Q1NTVmFycywgZ2V0R2xvYmFscyB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL2NvcmUvc3RhdGUuanNcIjtcbmltcG9ydCB7IGFwcGx5Q29sb3JUZW1wbGF0ZSB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3Zpc3VhbC9jb2xvcnMuanNcIjtcbmltcG9ydCB7IHN5bmNDaHJvbWVDb2xvciB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3BoeXNpY3MvZW5naW5lLmpzXCI7XG5pbXBvcnQgeyBsb2cgYXMgZGV2TG9nIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvdXRpbHMvbG9nZ2VyLmpzXCI7XG5pbXBvcnQgeyBhcHBseUNocm9tZUhhcm1vbnkgfSBmcm9tIFwiL3NyYy9sZWdhY3kvbW9kdWxlcy92aXN1YWwvY2hyb21lLWhhcm1vbnkuanNcIjtcbmltcG9ydCB7IHJlYWRUb2tlblZhciB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3V0aWxzL3Rva2Vucy5qc1wiO1xuaW1wb3J0IHsgYXBwbHlTaGVsbExheW91dFZhcnMsIHN5bmNTaGVsbFRvRG9jdW1lbnQsIHN5bmNUaGVtZUNvbG9yTWV0YSB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3Zpc3VhbC9zaXRlLXNoZWxsLmpzXCI7XG5pbXBvcnQgeyBmb3JFYWNoUGFuZWxVaURvY3VtZW50LCByZXNvbHZlUGFuZWxVaURvY3VtZW50IH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvdWkvcGFuZWwtdWktY29udGV4dC5qc1wiO1xuaW1wb3J0IHtcbiAgVEhFTUVfQ0hBTkdFX0VWRU5ULFxuICBUSEVNRV9TVE9SQUdFX0tFWSxcbiAgYXBwbHlUaGVtZVN0YXRlLFxuICBpc0RhcmtUaGVtZURvY3VtZW50LFxuICBub3JtYWxpemVUaGVtZVByZWZlcmVuY2UsXG4gIHJlYWRUaGVtZVByZWZlcmVuY2UsXG4gIHJlc29sdmVUaGVtZUlzRGFyayxcbiAgd3JpdGVUaGVtZVByZWZlcmVuY2UsXG59IGZyb20gXCIvc3JjL2xpYi90aGVtZS1zdGF0ZS5qc1wiO1xuXG4vLyBUaGVtZSBzdGF0ZXM6ICdhdXRvJywgJ2xpZ2h0JywgJ2RhcmsnXG5sZXQgY3VycmVudFRoZW1lID0gJ2F1dG8nO1xubGV0IHN5c3RlbVByZWZlcmVuY2UgPSAnbGlnaHQnO1xuXG5sZXQgaXNEYXJrTW9kZUluaXRpYWxpemVkID0gZmFsc2U7XG5cbmZ1bmN0aW9uIHN5bmNXYWxsUGFuZWxUYWJzVG9UaGVtZSgpIHtcbiAgY29uc3QgaXNEYXJrID0gZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuY29udGFpbnMoJ2RhcmstbW9kZScpO1xuICBjb25zdCB0aGVtZSA9IGlzRGFyayA/ICdkYXJrJyA6ICdsaWdodCc7XG4gIGZvckVhY2hQYW5lbFVpRG9jdW1lbnQoKHVpRG9jdW1lbnQpID0+IHtcbiAgICB1aURvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy53YWxsLXNlY3Rpb24td2l0aC10YWJzJykuZm9yRWFjaCgoY29udGFpbmVyKSA9PiB7XG4gICAgICBjb25zdCBzZWN0aW9uS2V5ID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy53YWxsLXRoZW1lLXRhYicpPy5nZXRBdHRyaWJ1dGUoJ2RhdGEtd2FsbC1zZWN0aW9uJyk7XG4gICAgICBpZiAoIXNlY3Rpb25LZXkpIHJldHVybjtcbiAgICAgIGNvbnN0IHRhYiA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKGAud2FsbC10aGVtZS10YWJbZGF0YS10aGVtZT1cIiR7dGhlbWV9XCJdYCk7XG4gICAgICBjb25zdCBwYW5lbCA9IHVpRG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2VjdGlvbktleSArICh0aGVtZSA9PT0gJ2xpZ2h0JyA/ICdMaWdodFBhbmVsJyA6ICdEYXJrUGFuZWwnKSk7XG4gICAgICBpZiAoIXRhYiB8fCAhcGFuZWwpIHJldHVybjtcbiAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcud2FsbC10aGVtZS10YWInKS5mb3JFYWNoKCh0KSA9PiB7XG4gICAgICAgIHQuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgICAgIHQuc2V0QXR0cmlidXRlKCdhcmlhLXNlbGVjdGVkJywgJ2ZhbHNlJyk7XG4gICAgICB9KTtcbiAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcud2FsbC10YWItcGFuZWwnKS5mb3JFYWNoKChwKSA9PiBwLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpKTtcbiAgICAgIHRhYi5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcbiAgICAgIHRhYi5zZXRBdHRyaWJ1dGUoJ2FyaWEtc2VsZWN0ZWQnLCAndHJ1ZScpO1xuICAgICAgcGFuZWwuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFN5bmMgQ1NTIHZhcmlhYmxlcyBmcm9tIGNvbmZpZyB2YWx1ZXMgKGNhbGxlZCBhdCBpbml0KVxuICogVGhpcyBlbnN1cmVzIGNvbmZpZy1kcml2ZW4gY29sb3JzIG92ZXJyaWRlIENTUyBkZWZhdWx0c1xuICovXG5mdW5jdGlvbiBzeW5jQ3NzVmFyc0Zyb21Db25maWcoKSB7XG4gIGNvbnN0IGcgPSBnZXRHbG9iYWxzKCk7XG4gIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIGFwcGx5U2hlbGxMYXlvdXRWYXJzKCk7XG4gIFxuICAvLyBTY2VuZSBpbnRlcmlvciBiYWNrZ3JvdW5kcyAodXNlZCBvbmx5IGZvciAjc2ltdWxhdGlvbnMgY29udGFpbmVyLCBub3QgYnJvd3NlciBjaHJvbWUpXG4gIGlmIChnPy5iZ0xpZ2h0KSB7XG4gICAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1iZy1saWdodCcsIGcuYmdMaWdodCk7XG4gIH1cbiAgaWYgKGc/LmJnRGFyaykge1xuICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYmctZGFyaycsIGcuYmdEYXJrKTtcbiAgfVxuICBzeW5jU2hlbGxUb0RvY3VtZW50KHtcbiAgICBpc0Rhcms6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoJ2RhcmstbW9kZScpXG4gIH0pO1xuICBcbiAgLy8gVGV4dCBjb2xvcnNcbiAgaWYgKGc/LnRleHRDb2xvckxpZ2h0KSB7XG4gICAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS10ZXh0LWNvbG9yLWxpZ2h0JywgZy50ZXh0Q29sb3JMaWdodCk7XG4gIH1cbiAgaWYgKGc/LnRleHRDb2xvckxpZ2h0TXV0ZWQpIHtcbiAgICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLXRleHQtY29sb3ItbGlnaHQtbXV0ZWQnLCBnLnRleHRDb2xvckxpZ2h0TXV0ZWQpO1xuICB9XG4gIGlmIChnPy50ZXh0Q29sb3JEYXJrKSB7XG4gICAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS10ZXh0LWNvbG9yLWRhcmsnLCBnLnRleHRDb2xvckRhcmspO1xuICB9XG4gIGlmIChnPy50ZXh0Q29sb3JEYXJrTXV0ZWQpIHtcbiAgICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLXRleHQtY29sb3ItZGFyay1tdXRlZCcsIGcudGV4dENvbG9yRGFya011dGVkKTtcbiAgfVxuXG4gIC8vIEVkZ2UgbGFiZWxzICh2ZXJ0aWNhbCBjaGFwdGVyL2NvcHlyaWdodClcbiAgaWYgKE51bWJlci5pc0Zpbml0ZShnPy5lZGdlTGFiZWxJbnNldEFkanVzdFB4KSkge1xuICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tZWRnZS1sYWJlbC1pbnNldC1hZGp1c3QnLCBgJHtnLmVkZ2VMYWJlbEluc2V0QWRqdXN0UHh9cHhgKTtcbiAgfVxuICBcbiAgLy8gTGluayBjb2xvcnNcbiAgaWYgKGc/LmxpbmtIb3ZlckNvbG9yKSB7XG4gICAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1saW5rLWhvdmVyLWNvbG9yJywgZy5saW5rSG92ZXJDb2xvcik7XG4gIH1cbiAgXG4gIC8vIExvZ28gKyBlZGdlIGxhYmVsIGNvbG9ycyBhcmUgbm93IGRlcml2ZWQgZnJvbSB0aGUgY29yZSB0ZXh0IHRva2VucyBpbiBDU1MuXG59XG5cbi8qKlxuICogRGV0ZWN0IHN5c3RlbSBjb2xvciBzY2hlbWUgcHJlZmVyZW5jZVxuICovXG5mdW5jdGlvbiBkZXRlY3RTeXN0ZW1QcmVmZXJlbmNlKCkge1xuICBpZiAod2luZG93Lm1hdGNoTWVkaWEgJiYgd2luZG93Lm1hdGNoTWVkaWEoJyhwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyayknKS5tYXRjaGVzKSB7XG4gICAgcmV0dXJuICdkYXJrJztcbiAgfVxuICByZXR1cm4gJ2xpZ2h0Jztcbn1cblxuZnVuY3Rpb24gcmVmcmVzaFN5c3RlbVByZWZlcmVuY2UoKSB7XG4gIHN5c3RlbVByZWZlcmVuY2UgPSBkZXRlY3RTeXN0ZW1QcmVmZXJlbmNlKCk7XG4gIGlmIChjdXJyZW50VGhlbWUgPT09ICdhdXRvJyAmJiByZXNvbHZlU2hvdWxkQmVEYXJrKCdhdXRvJykgIT09IGlzUmVuZGVyZWREYXJrTW9kZSgpKSB7XG4gICAgYXBwbHlUaGVtZSgnYXV0bycsIHsgcGVyc2lzdDogZmFsc2UgfSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGFwcGx5Q2hyb21lSGFybW9ueSgpO1xuICB1cGRhdGVUaGVtZUNvbG9yKGlzUmVuZGVyZWREYXJrTW9kZSgpKTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZVNob3VsZEJlRGFyayh0aGVtZSkge1xuICByZXR1cm4gcmVzb2x2ZVRoZW1lSXNEYXJrKHRoZW1lLCBzeXN0ZW1QcmVmZXJlbmNlID09PSAnZGFyaycpO1xufVxuXG5mdW5jdGlvbiBpc1JlbmRlcmVkRGFya01vZGUoKSB7XG4gIHJldHVybiBpc0RhcmtUaGVtZURvY3VtZW50KCk7XG59XG5cbi8qKlxuICogVXBkYXRlIGJyb3dzZXIgY2hyb21lL3RoZW1lIGNvbG9yIHRhZ3MgZnJvbSBjdXJyZW50bHktYWN0aXZlIHdhbGwgQ1NTIHZhcnMuXG4gKi9cbmZ1bmN0aW9uIHVwZGF0ZVRoZW1lQ29sb3IoaXNEYXJrKSB7XG4gIGNvbnN0IGcgPSBnZXRHbG9iYWxzKCk7XG4gIGNvbnN0IGNzc0FjdGl2ZSA9IHJlYWRUb2tlblZhcignLS1mcmFtZS1jb2xvcicsICcnKTtcbiAgY29uc3QgY3NzTGlnaHQgPSByZWFkVG9rZW5WYXIoJy0tZnJhbWUtY29sb3ItbGlnaHQnLCAnJyk7XG4gIGNvbnN0IGNzc0RhcmsgPSByZWFkVG9rZW5WYXIoJy0tZnJhbWUtY29sb3ItZGFyaycsICcnKTtcbiAgY29uc3QgZmFsbGJhY2sgPSBnPy5mcmFtZUNvbG9yIHx8IGc/LmZyYW1lQ29sb3JMaWdodCB8fCBnPy5mcmFtZUNvbG9yRGFyayB8fCBcInZhcigtLWNvbG9yLWRldGVjdGVkLTI0MjUyOSlcIjtcbiAgY29uc3QgYWN0aXZlQ29sb3IgPSBjc3NBY3RpdmUgfHwgKGlzRGFyayA/IChjc3NEYXJrIHx8IGNzc0xpZ2h0KSA6IChjc3NMaWdodCB8fCBjc3NEYXJrKSkgfHwgZmFsbGJhY2s7XG4gIGNvbnN0IGxpZ2h0Q29sb3IgPSBjc3NMaWdodCB8fCBhY3RpdmVDb2xvciB8fCBmYWxsYmFjaztcbiAgY29uc3QgZGFya0NvbG9yID0gY3NzRGFyayB8fCBhY3RpdmVDb2xvciB8fCBmYWxsYmFjaztcbiAgXG4gIHN5bmNUaGVtZUNvbG9yTWV0YSh7XG4gICAgYWN0aXZlOiBhY3RpdmVDb2xvcixcbiAgICBsaWdodDogbGlnaHRDb2xvcixcbiAgICBkYXJrOiBkYXJrQ29sb3JcbiAgfSk7XG59XG5cbi8qKlxuICogQXBwbHkgZGFyayBtb2RlIHRvIERPTVxuICovXG5mdW5jdGlvbiBhcHBseURhcmtNb2RlVG9ET00oaXNEYXJrKSB7XG4gIGNvbnN0IGdsb2JhbHMgPSBnZXRHbG9iYWxzKCk7XG4gIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIGdsb2JhbHMuaXNEYXJrTW9kZSA9IGlzRGFyaztcbiAgXG4gIGFwcGx5VGhlbWVTdGF0ZShpc0RhcmssIHsgY29udGFpbmVyOiBnbG9iYWxzLmNvbnRhaW5lciB9KTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eShcbiAgICAnLS1hYnMtaW5kaWNhdG9yLWluaycsXG4gICAgaXNEYXJrID8gJ3JnYih2YXIoLS1hYnMtcmdiLXdoaXRlKSknIDogJ3JnYih2YXIoLS1hYnMtcmdiLWJsYWNrKSknXG4gICk7XG5cbiAgYXBwbHlMYXlvdXRDU1NWYXJzKCk7XG5cbiAgLy8gRXN0YWJsaXNoIHRoZSBhdXRob3JlZCBwYWxldHRlIGJlZm9yZSBhZGFwdGluZyBmcmFtZSBjaHJvbWUuXG4gIGFwcGx5Q29sb3JUZW1wbGF0ZShnbG9iYWxzLmN1cnJlbnRUZW1wbGF0ZSk7XG4gIHN5bmNTaGVsbFRvRG9jdW1lbnQoeyBpc0RhcmsgfSk7XG5cbiAgLy8gMSkgSWYgdGhlIGJyb3dzZXIgaWdub3JlcyB0aGVtZS1jb2xvciAoZGVza3RvcCBDaHJvbWUgdGFicyksIGFkYXB0IHRoZSBmcmFtZSB0byBtYXRjaCB0aGUgYnJvd3NlciBVSS5cbiAgLy8gMikgVGhlbiB1cGRhdGUgbWV0YSB0aGVtZS1jb2xvciBmcm9tIHRoZSAocG9zc2libHkgdXBkYXRlZCkgQ1NTIHZhcnMuXG4gIGFwcGx5Q2hyb21lSGFybW9ueSgpO1xuICB1cGRhdGVUaGVtZUNvbG9yKGlzRGFyayk7XG4gIFxuICAvLyBTeW5jIGNocm9tZSBjb2xvciBmb3IgcnViYmVyeSB3YWxsc1xuICBzeW5jQ2hyb21lQ29sb3IoKTtcbiAgXG4gIC8vIFJlLWFwcGx5IG5vaXNlIHN5c3RlbSBzbyBTVkcgbm9pc2UgY2FuIHJlLXRpbnQgdG8gdGhlIGFjdGl2ZSB0aGVtZS5cbiAgdHJ5IHtcbiAgICBpbXBvcnQoXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3Zpc3VhbC9ub2lzZS1zeXN0ZW0uanNcIikudGhlbigoeyBhcHBseU5vaXNlU3lzdGVtIH0pID0+IGFwcGx5Tm9pc2VTeXN0ZW0oe30pKTtcbiAgfSBjYXRjaCAoZSkge31cblxuICB0cnkge1xuICAgIGltcG9ydChcIi9zcmMvbGVnYWN5L21vZHVsZXMvcG9ydGZvbGlvL3BpdC1tb2RlLmpzXCIpLnRoZW4oKG0pID0+IHtcbiAgICAgIGlmICh0eXBlb2YgbS5zeW5jUG9ydGZvbGlvQWNjZW50Q2lyY2xlQ29sb3JzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG0uc3luY1BvcnRmb2xpb0FjY2VudENpcmNsZUNvbG9ycygpO1xuICAgICAgfVxuICAgIH0pO1xuICB9IGNhdGNoIChlKSB7IC8qIGlnbm9yZSAqLyB9XG4gIFxuICAvLyBVcGRhdGUgVUlcbiAgdXBkYXRlU2VnbWVudENvbnRyb2woKTtcbiAgc3luY1dhbGxQYW5lbFRhYnNUb1RoZW1lKCk7XG59XG5cbi8qKlxuICogVXBkYXRlIHNlZ21lbnQgY29udHJvbCBVSVxuICovXG5mdW5jdGlvbiB1cGRhdGVTZWdtZW50Q29udHJvbCgpIHtcbiAgY29uc3QgZ2xvYmFscyA9IGdldEdsb2JhbHMoKTtcbiAgY29uc3QgbmV4dFN0YXR1c1RleHQgPSBjdXJyZW50VGhlbWUgPT09ICdhdXRvJ1xuICAgID8gKGdsb2JhbHMuaXNEYXJrTW9kZSA/ICfwn4yZIEF1dG8gKERhcmspJyA6ICfimIDvuI8gQXV0byAoTGlnaHQpJylcbiAgICA6IChjdXJyZW50VGhlbWUgPT09ICdsaWdodCcgPyAn4piA77iPIExpZ2h0IE1vZGUnIDogJ/CfjJkgRGFyayBNb2RlJyk7XG5cbiAgZm9yRWFjaFBhbmVsVWlEb2N1bWVudCgodWlEb2N1bWVudCkgPT4ge1xuICAgIGNvbnN0IHBhbmVsVGhlbWVUb2dnbGUgPSB1aURvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wYW5lbC10aGVtZS10b2dnbGUnKTtcbiAgICBpZiAocGFuZWxUaGVtZVRvZ2dsZSkge1xuICAgICAgcGFuZWxUaGVtZVRvZ2dsZS50ZXh0Q29udGVudCA9IGdsb2JhbHMuaXNEYXJrTW9kZSA/ICfimIDvuI8nIDogJ/CfjJknO1xuICAgICAgcGFuZWxUaGVtZVRvZ2dsZS5kYXRhc2V0LnN0YXRlID0gZ2xvYmFscy5pc0RhcmtNb2RlID8gJ2RhcmsnIDogJ2xpZ2h0JztcbiAgICB9XG5cbiAgICBjb25zdCBhdXRvQnRuID0gdWlEb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGhlbWVBdXRvJyk7XG4gICAgY29uc3QgbGlnaHRCdG4gPSB1aURvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0aGVtZUxpZ2h0Jyk7XG4gICAgY29uc3QgZGFya0J0biA9IHVpRG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RoZW1lRGFyaycpO1xuICAgIGlmICghYXV0b0J0biB8fCAhbGlnaHRCdG4gfHwgIWRhcmtCdG4pIHJldHVybjtcblxuICAgIFthdXRvQnRuLCBsaWdodEJ0biwgZGFya0J0bl0uZm9yRWFjaChidG4gPT4gYnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpKTtcblxuICAgIGlmIChjdXJyZW50VGhlbWUgPT09ICdhdXRvJykge1xuICAgICAgYXV0b0J0bi5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcbiAgICB9IGVsc2UgaWYgKGN1cnJlbnRUaGVtZSA9PT0gJ2xpZ2h0Jykge1xuICAgICAgbGlnaHRCdG4uY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRhcmtCdG4uY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhdHVzID0gdWlEb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGhlbWVTdGF0dXMnKTtcbiAgICBpZiAoc3RhdHVzKSBzdGF0dXMudGV4dENvbnRlbnQgPSBuZXh0U3RhdHVzVGV4dDtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiaW5kVGhlbWVTZWdtZW50Q29udHJvbHModWlEb2N1bWVudCkge1xuICBjb25zdCBwYW5lbERvY3VtZW50ID0gcmVzb2x2ZVBhbmVsVWlEb2N1bWVudCh1aURvY3VtZW50KTtcbiAgaWYgKCFwYW5lbERvY3VtZW50KSByZXR1cm47XG5cbiAgY29uc3QgYXV0b0J0biA9IHBhbmVsRG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RoZW1lQXV0bycpO1xuICBjb25zdCBsaWdodEJ0biA9IHBhbmVsRG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RoZW1lTGlnaHQnKTtcbiAgY29uc3QgZGFya0J0biA9IHBhbmVsRG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RoZW1lRGFyaycpO1xuXG4gIGlmIChhdXRvQnRuICYmIGF1dG9CdG4uZGF0YXNldC50aGVtZUJvdW5kICE9PSAndHJ1ZScpIHtcbiAgICBhdXRvQnRuLmRhdGFzZXQudGhlbWVCb3VuZCA9ICd0cnVlJztcbiAgICBhdXRvQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gc2V0VGhlbWUoJ2F1dG8nKSk7XG4gIH1cbiAgaWYgKGxpZ2h0QnRuICYmIGxpZ2h0QnRuLmRhdGFzZXQudGhlbWVCb3VuZCAhPT0gJ3RydWUnKSB7XG4gICAgbGlnaHRCdG4uZGF0YXNldC50aGVtZUJvdW5kID0gJ3RydWUnO1xuICAgIGxpZ2h0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gc2V0VGhlbWUoJ2xpZ2h0JykpO1xuICB9XG4gIGlmIChkYXJrQnRuICYmIGRhcmtCdG4uZGF0YXNldC50aGVtZUJvdW5kICE9PSAndHJ1ZScpIHtcbiAgICBkYXJrQnRuLmRhdGFzZXQudGhlbWVCb3VuZCA9ICd0cnVlJztcbiAgICBkYXJrQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gc2V0VGhlbWUoJ2RhcmsnKSk7XG4gIH1cblxuICB1cGRhdGVTZWdtZW50Q29udHJvbCgpO1xufVxuXG4vKipcbiAqIFNldCB0aGVtZSAoYXV0bywgbGlnaHQsIG9yIGRhcmspXG4gKi9cbmZ1bmN0aW9uIGFwcGx5VGhlbWUodGhlbWUsIHsgcGVyc2lzdCA9IHRydWUgfSA9IHt9KSB7XG4gIGN1cnJlbnRUaGVtZSA9IG5vcm1hbGl6ZVRoZW1lUHJlZmVyZW5jZSh0aGVtZSk7XG4gIGNvbnN0IHNob3VsZEJlRGFyayA9IHJlc29sdmVTaG91bGRCZURhcmsoY3VycmVudFRoZW1lKTtcbiAgXG4gIGFwcGx5RGFya01vZGVUb0RPTShzaG91bGRCZURhcmspO1xuICBcbiAgLy8gU2F2ZSBwcmVmZXJlbmNlXG4gIGlmIChwZXJzaXN0KSB3cml0ZVRoZW1lUHJlZmVyZW5jZShjdXJyZW50VGhlbWUpO1xuXG4gIHRyeSB7XG4gICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KFRIRU1FX0NIQU5HRV9FVkVOVCwge1xuICAgICAgZGV0YWlsOiB7XG4gICAgICAgIHRoZW1lOiBjdXJyZW50VGhlbWUsXG4gICAgICAgIGlzRGFyazogc2hvdWxkQmVEYXJrLFxuICAgICAgfSxcbiAgICB9KSk7XG4gIH0gY2F0Y2ggKGUpIHt9XG4gIFxuICBkZXZMb2coYPCfjqggVGhlbWUgc2V0IHRvOiAke2N1cnJlbnRUaGVtZX0gKHJlbmRlcmluZzogJHtzaG91bGRCZURhcmsgPyAnZGFyaycgOiAnbGlnaHQnfSlgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldFRoZW1lKHRoZW1lKSB7XG4gIGFwcGx5VGhlbWUodGhlbWUpO1xufVxuXG4vKipcbiAqIENsZWFyIGNvbG9yLXJlbGF0ZWQgbG9jYWxTdG9yYWdlIGNhY2hlXG4gKiBDYWxsZWQgd2hlbiB3YWxsIGNvbG9yIHN5c3RlbSBjaGFuZ2VzIHRvIHByZXZlbnQgc3RhbGUgY29sb3IgdmFsdWVzXG4gKi9cbmZ1bmN0aW9uIGNsZWFyQ29sb3JDYWNoZSgpIHtcbiAgdHJ5IHtcbiAgICAvLyBLZWVwIHRoZSBleHBsaWNpdCB0aGVtZSBjaG9pY2U7IG9ubHkgY2xlYXIgZGVyaXZlZCBwYWxldHRlIGNhY2hlcy5cbiAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnYWJzX3BhbGV0dGVfY2hhcHRlcicpO1xuICAgIGRldkxvZygn8J+Xke+4jyBDbGVhcmVkIGNvbG9yLXJlbGF0ZWQgbG9jYWxTdG9yYWdlIGNhY2hlJyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBsb2NhbFN0b3JhZ2UgdW5hdmFpbGFibGUgb3IgZXJyb3JcbiAgfVxufVxuXG4vKipcbiAqIEluaXRpYWxpemUgZGFyayBtb2RlIHN5c3RlbVxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdGlhbGl6ZURhcmtNb2RlKCkge1xuICBpZiAoaXNEYXJrTW9kZUluaXRpYWxpemVkKSB7XG4gICAgLy8gT3RoZXIgcm91dGUgcnVudGltZXMgbWF5IHJlc3RhbXAgc2hlbGwgdmFyaWFibGVzIGFmdGVyIHRoZSBzaGFyZWQgc2hlbGwgaGFzXG4gICAgLy8gaW5pdGlhbGl6ZWQuIFJlLXByb2plY3QgdGhlIGNhbm9uaWNhbCBwcmVmZXJlbmNlIHdpdGhvdXQgYmluZGluZyBsaXN0ZW5lcnNcbiAgICAvLyBhIHNlY29uZCB0aW1lIHNvIHRoZW1lIGFuZCBicm93c2VyLWZyYW1lIHN0YXRlIGNhbm5vdCBkcmlmdCBkdXJpbmcgYm9vdC5cbiAgICBzeXN0ZW1QcmVmZXJlbmNlID0gZGV0ZWN0U3lzdGVtUHJlZmVyZW5jZSgpO1xuICAgIGFwcGx5VGhlbWUocmVhZFRoZW1lUHJlZmVyZW5jZSgpLCB7IHBlcnNpc3Q6IGZhbHNlIH0pO1xuICAgIGJpbmRUaGVtZVNlZ21lbnRDb250cm9scyhkb2N1bWVudCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlzRGFya01vZGVJbml0aWFsaXplZCA9IHRydWU7XG5cbiAgLy8gQ2xlYXIgY29sb3IgY2FjaGUgdG8gcHJldmVudCBzdGFsZSB3YWxsIGNvbG9yIHZhbHVlc1xuICBjbGVhckNvbG9yQ2FjaGUoKTtcblxuICAvLyBTeW5jIENTUyB2YXJpYWJsZXMgZnJvbSBjb25maWcgRklSU1QgKGJlZm9yZSB0aGVtZSBhcHBsaWNhdGlvbilcbiAgc3luY0Nzc1ZhcnNGcm9tQ29uZmlnKCk7XG5cbiAgLy8gRGV0ZWN0IHN5c3RlbSBwcmVmZXJlbmNlIChmb3IgYXV0byBtb2RlIGxhdGVyKVxuICBzeXN0ZW1QcmVmZXJlbmNlID0gZGV0ZWN0U3lzdGVtUHJlZmVyZW5jZSgpO1xuICBkZXZMb2coYPCflqXvuI8gU3lzdGVtIHByZWZlcnM6ICR7c3lzdGVtUHJlZmVyZW5jZX1gKTtcbiAgXG4gIC8vIFJlc3RvcmUgdGhlIHNhbWUgcHJlZmVyZW5jZSBhdCBldmVyeSB2aWV3cG9ydCB3aWR0aC5cbiAgYXBwbHlUaGVtZShyZWFkVGhlbWVQcmVmZXJlbmNlKCksIHsgcGVyc2lzdDogZmFsc2UgfSk7XG4gIFxuICBiaW5kVGhlbWVTZWdtZW50Q29udHJvbHMoZG9jdW1lbnQpO1xuICBcbiAgLy8gTGlzdGVuIGZvciBzeXN0ZW0gcHJlZmVyZW5jZSBjaGFuZ2VzXG4gIGlmICh3aW5kb3cubWF0Y2hNZWRpYSkge1xuICAgIGNvbnN0IGNvbG9yU2NoZW1lTWVkaWEgPSB3aW5kb3cubWF0Y2hNZWRpYSgnKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKScpO1xuICAgIGNvbnN0IGhhbmRsZUNvbG9yU2NoZW1lQ2hhbmdlID0gKGUpID0+IHtcbiAgICAgIHN5c3RlbVByZWZlcmVuY2UgPSBlLm1hdGNoZXMgPyAnZGFyaycgOiAnbGlnaHQnO1xuICAgICAgZGV2TG9nKGDwn5al77iPIFN5c3RlbSBwcmVmZXJlbmNlIGNoYW5nZWQgdG86ICR7c3lzdGVtUHJlZmVyZW5jZX1gKTtcbiAgICAgIFxuICAgICAgLy8gSWYgaW4gYXV0byBtb2RlLCB1cGRhdGVcbiAgICAgIGlmIChjdXJyZW50VGhlbWUgPT09ICdhdXRvJyAmJiByZXNvbHZlU2hvdWxkQmVEYXJrKCdhdXRvJykgIT09IGlzUmVuZGVyZWREYXJrTW9kZSgpKSB7XG4gICAgICAgIGFwcGx5VGhlbWUoJ2F1dG8nLCB7IHBlcnNpc3Q6IGZhbHNlIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXBwbHlDaHJvbWVIYXJtb255KCk7XG4gICAgICAgIHVwZGF0ZVRoZW1lQ29sb3IoaXNSZW5kZXJlZERhcmtNb2RlKCkpO1xuICAgICAgfVxuICAgIH07XG4gICAgaWYgKHR5cGVvZiBjb2xvclNjaGVtZU1lZGlhLmFkZEV2ZW50TGlzdGVuZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbG9yU2NoZW1lTWVkaWEuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgaGFuZGxlQ29sb3JTY2hlbWVDaGFuZ2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb2xvclNjaGVtZU1lZGlhLmFkZExpc3RlbmVyPy4oaGFuZGxlQ29sb3JTY2hlbWVDaGFuZ2UpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGxvY2FsU3RvcmFnZSBldmVudHMgZmlyZSBpbiB0aGUgb3RoZXIgdGFiLCBrZWVwaW5nIGFsbCBvcGVuIHRhYnMgaW4gc3luYy5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3N0b3JhZ2UnLCAoZXZlbnQpID0+IHtcbiAgICBpZiAoZXZlbnQua2V5ICE9PSBUSEVNRV9TVE9SQUdFX0tFWSAmJiBldmVudC5rZXkgIT09IG51bGwpIHJldHVybjtcbiAgICBjb25zdCBuZXh0VGhlbWUgPSByZWFkVGhlbWVQcmVmZXJlbmNlKCk7XG4gICAgaWYgKG5leHRUaGVtZSA9PT0gY3VycmVudFRoZW1lICYmIHJlc29sdmVTaG91bGRCZURhcmsobmV4dFRoZW1lKSA9PT0gaXNSZW5kZXJlZERhcmtNb2RlKCkpIHJldHVybjtcbiAgICBhcHBseVRoZW1lKG5leHRUaGVtZSwgeyBwZXJzaXN0OiBmYWxzZSB9KTtcbiAgfSk7XG5cbiAgLy8gUmUtY2hlY2sgcmVzdG9yZWQgQkZDYWNoZSB0YWJzIGJlZm9yZSB0aGV5IGJlY29tZSB2aXNpYmxlIGFnYWluLlxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncGFnZXNob3cnLCAoKSA9PiB7XG4gICAgY3VycmVudFRoZW1lID0gcmVhZFRoZW1lUHJlZmVyZW5jZSgpO1xuICAgIHJlZnJlc2hTeXN0ZW1QcmVmZXJlbmNlKCk7XG4gIH0pO1xuXG4gIC8vIGlPUyBTYWZhcmkgY2FuIHJlc3VtZSBhIGJhY2tncm91bmRlZCB0YWIgd2l0aG91dCByZXBsYXlpbmcgdGhlIG1lZGlhLXF1ZXJ5XG4gIC8vIGV2ZW50LiBSZWNvbmNpbGUgQXV0byB3aGVuZXZlciB0aGUgZG9jdW1lbnQgYmVjb21lcyB2aXNpYmxlIGFnYWluLlxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5Y2hhbmdlJywgKCkgPT4ge1xuICAgIGlmIChkb2N1bWVudC52aXNpYmlsaXR5U3RhdGUgIT09ICd2aXNpYmxlJykgcmV0dXJuO1xuICAgIGN1cnJlbnRUaGVtZSA9IHJlYWRUaGVtZVByZWZlcmVuY2UoKTtcbiAgICByZWZyZXNoU3lzdGVtUHJlZmVyZW5jZSgpO1xuICB9KTtcblxuICBkZXZMb2coJ+KckyBNb2Rlcm4gZGFyayBtb2RlIGluaXRpYWxpemVkJyk7XG59XG5cbi8qKlxuICogR2V0IGN1cnJlbnQgdGhlbWVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEN1cnJlbnRUaGVtZSgpIHtcbiAgcmV0dXJuIGN1cnJlbnRUaGVtZTtcbn1cblxuLyoqXG4gKiBUb2dnbGUgYmV0d2VlbiBsaWdodCBhbmQgZGFyayBtb2RlIG1hbnVhbGx5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b2dnbGVEYXJrTW9kZSgpIHtcbiAgY29uc3QgaXNDdXJyZW50bHlEYXJrID0gaXNSZW5kZXJlZERhcmtNb2RlKCk7XG4gIGNvbnN0IG5ld1RoZW1lID0gaXNDdXJyZW50bHlEYXJrID8gJ2xpZ2h0JyA6ICdkYXJrJztcbiAgc2V0VGhlbWUobmV3VGhlbWUpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVsRixNQUFNLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMs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Q0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDekMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN0RyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU07QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUss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SyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyRCxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxRCxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RCxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0csQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUN2RyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENB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Q0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3QixDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNaLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0FBQzVCOztBQUVBLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBQzFCLENBQUMsQ0FBQztBQUNGLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDaEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxD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LENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUM3RCxDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzFELENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQy9ELENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDN0QsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQ3hCOztBQUVBLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSTtBQUNsQyxDQUFDLENBQUM7QUFDRixRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEQsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDO0FBQ2hELENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUM7QUFDeEQsQ0FBQztBQUNELENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUM7QUFDbEMsQ0FBQztBQUNELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDVixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFDOztBQUVqRCxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUM3RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2YsQ0FBQztBQUNELENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUY7O0FBRUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7QUFDbkI7O0FBRUEsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztBQUNoRSxDQUFDLENBQUM7QUFDRixRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU07QUFDeEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZ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QyxDQUFDLENBQUM7QUFDckUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0FBQ2pFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQztBQUMxRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDO0FBQzdELENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSTtBQUM3RSxDQUFDLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hELENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNO0FBQ3JFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDckcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDN0MsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSztBQUNwRSxDQUFDLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztBQUMxRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUs7QUFDdEUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUN0RCxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzFDOztBQUVBLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUM7QUFDZixDQUFDLENBQUM7QUFDRixNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZO0FBQ3JCOztBQUVBLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQ3RDLENBQUMsQ0FBQztBQUNGLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztBQUNqQyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNyRCxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztBQUNwQjsifQ==