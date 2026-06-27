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
  button.title = active ? 'Close design panel window' : 'Open design panel window';
}

function ensureLauncherButton() {
  let button = getLauncherButton();
  if (!button) {
    button = document.createElement('button');
    button.className = 'panel-toggle-btn';
    button.type = 'button';
    button.innerHTML = '⚙';
    document.body.appendChild(button);
  }

  if (button.dataset.panelPopupBound !== 'true') {
    button.dataset.panelPopupBound = 'true';
    button.setAttribute('aria-label', 'Toggle design panel window');
    button.addEventListener('click', () => {
      toggleDevPanelSurface();
    });
  }

  setLauncherActive(isPopupOpen());
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
  const routeNode = uiDocument.getElementById('panel-host-preview-route');
  if (routeNode) routeNode.textContent = subtitle;
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
  } catch (error) {}
  setLauncherActive(true);
  return popupWindow;
}

export function registerDevPanelRoute(options = {}) {
  currentRouteOptions = { ...options };
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

export function toggleDevPanelSurface() {
  ensureLauncherButton();

  if (isPopupOpen()) {
    try {
      popupWindowRef.close();
    } catch (error) {}
    return;
  }

  const dock = getDock();
  if (dock && !dock.classList.contains('hidden')) {
    toggleDock();
    setLauncherActive(false);
    return;
  }

  const popupWindow = openDetachedPanelWindow();
  if (!popupWindow) {
    setLauncherActive(false);
  }
}

export function closeDetachedPanelWindow() {
  if (!isPopupOpen()) return;
  try {
    popupWindowRef.close();
  } catch (error) {}
}

if (typeof window !== 'undefined') {
  bindPopupReadyHandler();
  bindPopupCloseListener();
  bindPopupSyncListeners();
}
