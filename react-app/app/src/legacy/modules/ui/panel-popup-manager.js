import { syncWallPanelTabsToTheme } from './control-registry.js';
import {
  createPanelDock,
  getDock,
  getRequestedPanelSectionKey,
  hideDock,
  mountDetachedPanel,
  syncPanelHostDocument,
  toggleDock,
} from './panel-dock.js';
import { unregisterPanelUiDocument } from './panel-ui-context.js';

const POPUP_NAME = 'AlexanderBeckConfigPanel';
const POPUP_URL = '/panel-host.html';
const DEFAULT_PRODUCT_LABEL = 'Alexander Beck Studio';
const CONFIG_ICON_SVG = `
  <svg class="panel-toggle-btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 8.25a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5Z" />
    <path d="M19.43 12.98c.04-.32.07-.65.07-.98s-.02-.66-.07-.98l2.08-1.62-2-3.46-2.45.98a7.54 7.54 0 0 0-1.7-.98L15 3.3h-4l-.36 2.64c-.6.24-1.17.57-1.7.98l-2.45-.98-2 3.46 2.08 1.62c-.04.32-.07.65-.07.98s.02.66.07.98L4.49 14.6l2 3.46 2.45-.98c.53.41 1.1.74 1.7.98L11 20.7h4l.36-2.64c.6-.24 1.17-.57 1.7-.98l2.45.98 2-3.46-2.08-1.62Z" />
  </svg>
`;

let currentRouteOptions = null;
let popupWindowRef = null;
let popupReady = false;
let popupClosedListenerBound = false;
let syncListenersBound = false;

function getProductLabel(options = {}) {
  return String(options?.productLabel || DEFAULT_PRODUCT_LABEL).trim() || DEFAULT_PRODUCT_LABEL;
}

function getPopupWindowTitle(options = {}) {
  return `Config Panel for ${getProductLabel(options)}`;
}

function getPopupWindowSubtitle(options = {}) {
  return String(options?.pageLabel || options?.pageSectionTitle || options?.page || 'Home').trim() || 'Home';
}

function isPopupOpen() {
  return Boolean(popupWindowRef && !popupWindowRef.closed);
}

function getPopupFeatures() {
  const width = 420;
  const height = 960;
  const left = Math.max(40, Math.round((window.screenX || 0) + ((window.outerWidth || width) - width) - 40));
  const top = Math.max(40, Math.round((window.screenY || 0) + 60));
  return [
    `popup=yes`,
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    `resizable=yes`,
    `scrollbars=yes`,
  ].join(',');
}

function getLauncherButton() {
  return document.querySelector('.panel-toggle-btn');
}

function setLauncherActive(active) {
  const button = getLauncherButton();
  if (!button) return;
  button.classList.toggle('active', !!active);
  button.setAttribute('aria-pressed', active ? 'true' : 'false');
  button.title = active ? 'Close design panel' : 'Open design panel';
}

function ensureLauncherButton() {
  let button = getLauncherButton();
  if (!button) {
    button = document.createElement('button');
    button.className = 'panel-toggle-btn';
    button.type = 'button';
    button.innerHTML = CONFIG_ICON_SVG;
    document.body.appendChild(button);
  } else if (!button.querySelector('.panel-toggle-btn__icon')) {
    button.innerHTML = CONFIG_ICON_SVG;
  }

  if (button.dataset.panelPopupBound !== 'true') {
    button.dataset.panelPopupBound = 'true';
    button.setAttribute('aria-label', 'Toggle design panel');
    button.dataset.panelDetachSupported = 'true';
    button.addEventListener('click', (event) => {
      if (event.shiftKey) {
        openDetachedPanelWindow();
        return;
      }
      toggleDevPanelSurface();
    });
  }

  const dock = getDock();
  setLauncherActive(Boolean(dock && !dock.classList.contains('hidden')));
}

function syncPopupHostAppearance() {
  if (!isPopupOpen() || !popupReady) return;
  try {
    syncPanelHostDocument(popupWindowRef.document);
    syncPopupWindowMetadata(popupWindowRef.document, currentRouteOptions);
    syncWallPanelTabsToTheme();
  } catch (error) {
    // If the popup is mid-reload, keep the main site usable.
  }
}

function syncPopupWindowMetadata(uiDocument, options = {}) {
  if (!uiDocument) return;
  const title = getPopupWindowTitle(options);
  const subtitle = getPopupWindowSubtitle(options);
  uiDocument.title = title;
  const titleNode = uiDocument.getElementById('panel-host-window-title');
  if (titleNode) titleNode.textContent = title;
  const subtitleNode = uiDocument.getElementById('panel-host-window-subtitle');
  if (subtitleNode) subtitleNode.textContent = subtitle;
}

function renderCurrentRoutePanelInPopup() {
  if (!isPopupOpen() || !popupReady || !currentRouteOptions) return;
  syncPopupHostAppearance();
  mountDetachedPanel({
    ...currentRouteOptions,
    targetWindow: popupWindowRef,
    targetDocument: popupWindowRef.document,
    mountRoot: popupWindowRef.document.getElementById('panel-host-root'),
  });
  hideDock();
  setLauncherActive(true);
}

function fallbackToDock() {
  if (currentRouteOptions) {
    createPanelDock({
      ...currentRouteOptions,
      preserveLauncherButton: true,
      skipToggleButton: true,
    });
    return;
  }

  toggleDock();
}

function bindPopupCloseListener() {
  if (popupClosedListenerBound) return;
  popupClosedListenerBound = true;
  window.__ABS_PANEL_POPUP_CLOSED__ = () => {
    if (popupWindowRef?.document) {
      unregisterPanelUiDocument(popupWindowRef.document);
    }
    popupWindowRef = null;
    popupReady = false;
    setLauncherActive(false);
  };
}

function bindPopupSyncListeners() {
  if (syncListenersBound) return;
  syncListenersBound = true;
  window.addEventListener('abs:theme-changed', syncPopupHostAppearance);
  window.addEventListener('bb:paletteChanged', syncPopupHostAppearance);
}

function bindPopupReadyHandler() {
  window.__ABS_PANEL_POPUP_READY__ = (popupWindow) => {
    if (!popupWindow || popupWindow.closed) return;
    popupWindowRef = popupWindow;
    popupReady = true;
    bindPopupCloseListener();
    bindPopupSyncListeners();
    ensureLauncherButton();
    renderCurrentRoutePanelInPopup();
  };
}

function openDetachedPanelWindow() {
  bindPopupReadyHandler();
  bindPopupCloseListener();
  bindPopupSyncListeners();

  const popupWindow = window.open(POPUP_URL, POPUP_NAME, getPopupFeatures());
  if (!popupWindow) {
    fallbackToDock();
    return null;
  }

  popupWindowRef = popupWindow;
  popupReady = false;
  try {
    popupWindow.focus();
  } catch (error) {
    // Popup focus can be denied by the browser.
  }
  setLauncherActive(true);
  return popupWindow;
}

export function registerDevPanelRoute(options = {}) {
  currentRouteOptions = { ...options };
  bindPopupReadyHandler();
  bindPopupCloseListener();
  bindPopupSyncListeners();
  ensureLauncherButton();

  const dock = getDock();
  if (dock || getRequestedPanelSectionKey()) {
    createPanelDock({
      ...currentRouteOptions,
      preserveLauncherButton: true,
      skipToggleButton: true,
    });
  }

  if (isPopupOpen() && popupReady) {
    renderCurrentRoutePanelInPopup();
  }
}

export function unregisterDevPanelRoute(page = '') {
  if (page && currentRouteOptions?.page !== page) return false;
  currentRouteOptions = null;
  hideDock();
  closeDetachedPanelWindow();
  setLauncherActive(false);
  return true;
}

export function toggleDevPanelSurface() {
  ensureLauncherButton();

  const dock = getDock();
  if (dock) {
    toggleDock();
    const updatedDock = getDock();
    setLauncherActive(Boolean(updatedDock && !updatedDock.classList.contains('hidden')));
    return;
  }

  if (currentRouteOptions) {
    createPanelDock({
      ...currentRouteOptions,
      preserveLauncherButton: true,
      skipToggleButton: true,
      initiallyVisible: true,
    });
  } else {
    createPanelDock({
      preserveLauncherButton: true,
      skipToggleButton: true,
      initiallyVisible: true,
    });
  }
  setLauncherActive(true);
}

export function openDetachedDevPanelSurface() {
  ensureLauncherButton();
  return openDetachedPanelWindow();
}

export function closeDetachedPanelWindow() {
  if (!isPopupOpen()) return;
  try {
    popupWindowRef.close();
  } catch (error) {
    // The browser may already have closed the popup.
  }
}

if (typeof window !== 'undefined') {
  bindPopupReadyHandler();
  bindPopupCloseListener();
  bindPopupSyncListeners();
}
