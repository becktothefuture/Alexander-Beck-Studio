const PREVIEW_INITIAL_DELAY_MS = 1000;
const PREVIEW_INTERVAL_MS = 3000;

function getPreviewNodes() {
  return {
    frame: document.getElementById('panel-host-preview-frame'),
    canvas: document.getElementById('panel-host-preview-canvas'),
    viewport: document.getElementById('panel-host-preview-viewport'),
    empty: document.getElementById('panel-host-preview-empty'),
    status: document.getElementById('panel-host-preview-status'),
    address: document.getElementById('panel-host-preview-address'),
    size: document.getElementById('panel-host-preview-size'),
  };
}

function getOpenerWindow() {
  try {
    if (!window.opener || window.opener.closed) return null;
    return window.opener;
  } catch {
    return null;
  }
}

function setPreviewState({
  linked = false,
  canvasActive = false,
  address = 'Waiting for host…',
  size = '--',
  emptyText = 'Live pairing active',
  statusText = null,
} = {}) {
  const nodes = getPreviewNodes();
  if (nodes.address) nodes.address.textContent = address;
  if (nodes.size) nodes.size.textContent = size;
  if (nodes.status) {
    nodes.status.textContent = statusText || (canvasActive ? 'Live canvas' : linked ? 'Linked' : 'Offline');
  }
  if (nodes.empty) {
    nodes.empty.textContent = emptyText;
    nodes.empty.classList.toggle('is-hidden', !!canvasActive);
  }
}

function setPreviewSurfaceMode({ frameActive = false, canvasActive = false } = {}) {
  const nodes = getPreviewNodes();
  nodes.frame?.classList.toggle('is-hidden', !frameActive);
  nodes.canvas?.classList.toggle('is-hidden', !canvasActive);
}

function serializeComputedStyle(style) {
  if (!style) return '';
  if (typeof style.cssText === 'string' && style.cssText.trim()) {
    return style.cssText;
  }

  let cssText = '';
  for (let index = 0; index < style.length; index += 1) {
    const propertyName = style[index];
    const propertyValue = style.getPropertyValue(propertyName);
    if (!propertyValue) continue;
    const priority = style.getPropertyPriority(propertyName);
    cssText += `${propertyName}:${propertyValue}${priority ? ' !important' : ''};`;
  }
  return cssText;
}

function syncFormControlState(sourceElement, snapshotElement) {
  if (!sourceElement || !snapshotElement) return;

  const tagName = sourceElement.tagName;
  if (tagName === 'TEXTAREA') {
    snapshotElement.textContent = sourceElement.value;
    return;
  }

  if (tagName === 'SELECT') {
    const sourceOptions = Array.from(sourceElement.options || []);
    const snapshotOptions = Array.from(snapshotElement.options || []);
    sourceOptions.forEach((sourceOption, index) => {
      const snapshotOption = snapshotOptions[index];
      if (!snapshotOption) return;
      snapshotOption.selected = sourceOption.selected;
    });
    return;
  }

  if (tagName !== 'INPUT') return;

  const inputType = String(sourceElement.getAttribute('type') || '').toLowerCase();
  if (inputType === 'checkbox' || inputType === 'radio') {
    snapshotElement.checked = sourceElement.checked;
    if (sourceElement.checked) {
      snapshotElement.setAttribute('checked', '');
    } else {
      snapshotElement.removeAttribute('checked');
    }
    return;
  }

  snapshotElement.setAttribute('value', sourceElement.value || '');
}

function inlineSnapshotStyles({
  openerWindow,
  openerDocument,
  snapshotRoot,
  sourceWidth,
  sourceHeight,
}) {
  if (!openerWindow || !openerDocument || !snapshotRoot) return false;

  const sourceElements = [openerDocument.documentElement, ...openerDocument.documentElement.querySelectorAll('*')]
    .filter((element) => element.tagName !== 'SCRIPT');
  const snapshotElements = [snapshotRoot, ...snapshotRoot.querySelectorAll('*')]
    .filter((element) => element.tagName !== 'SCRIPT');

  if (!sourceElements.length || sourceElements.length !== snapshotElements.length) {
    return false;
  }

  sourceElements.forEach((sourceElement, index) => {
    const snapshotElement = snapshotElements[index];
    if (!snapshotElement) return;

    const computedStyle = openerWindow.getComputedStyle(sourceElement);
    snapshotElement.setAttribute('style', serializeComputedStyle(computedStyle));
    syncFormControlState(sourceElement, snapshotElement);

    if (sourceElement.tagName === 'CANVAS') {
      snapshotElement.width = sourceElement.width;
      snapshotElement.height = sourceElement.height;
    }
  });

  snapshotRoot.style.width = `${sourceWidth}px`;
  snapshotRoot.style.minHeight = `${sourceHeight}px`;
  snapshotRoot.style.overflow = 'hidden';

  const snapshotBody = snapshotRoot.querySelector('body');
  if (snapshotBody) {
    snapshotBody.style.width = `${sourceWidth}px`;
    snapshotBody.style.minHeight = `${sourceHeight}px`;
    snapshotBody.style.overflow = 'hidden';
  }

  return true;
}

function injectSnapshotStabilizers(snapshotRoot, openerWindow) {
  if (!snapshotRoot) return;

  snapshotRoot.querySelectorAll('script').forEach((node) => node.remove());

  const head = snapshotRoot.querySelector('head');
  if (!head) return;

  if (!head.querySelector('base[data-panel-host-preview="true"]')) {
    const base = openerWindow.document.createElement('base');
    base.setAttribute('data-panel-host-preview', 'true');
    base.href = openerWindow.location.href;
    head.prepend(base);
  }

  if (!head.querySelector('style[data-panel-host-preview="freeze"]')) {
    const style = openerWindow.document.createElement('style');
    style.setAttribute('data-panel-host-preview', 'freeze');
    style.textContent = `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
      html, body {
        overflow: hidden !important;
      }
    `;
    head.append(style);
  }
}

function syncPreviewCanvases(sourceDocument, targetDocument) {
  if (!sourceDocument || !targetDocument) return;

  const sourceCanvases = Array.from(sourceDocument.querySelectorAll('canvas'));
  if (!sourceCanvases.length) return;

  const targetCanvases = Array.from(targetDocument.querySelectorAll('canvas'));
  if (!targetCanvases.length) return;

  const targetById = new Map(targetCanvases.filter((canvas) => canvas.id).map((canvas) => [canvas.id, canvas]));

  sourceCanvases.forEach((sourceCanvas, index) => {
    const targetCanvas = sourceCanvas.id ? targetById.get(sourceCanvas.id) : targetCanvases[index];
    if (!targetCanvas) return;

    try {
      targetCanvas.width = sourceCanvas.width;
      targetCanvas.height = sourceCanvas.height;
      const targetCtx = targetCanvas.getContext('2d');
      if (!targetCtx) return;
      targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      targetCtx.drawImage(sourceCanvas, 0, 0);
    } catch {
      // Keep preview rendering resilient; canvases are best-effort.
    }
  });
}

function getPreviewContentSize(previewViewport) {
  if (!previewViewport) {
    return { width: 1, height: 1 };
  }

  const computed = window.getComputedStyle(previewViewport);
  const paddingX = (parseFloat(computed.paddingLeft) || 0) + (parseFloat(computed.paddingRight) || 0);
  const paddingY = (parseFloat(computed.paddingTop) || 0) + (parseFloat(computed.paddingBottom) || 0);

  return {
    width: Math.max(1, previewViewport.clientWidth - paddingX),
    height: Math.max(1, previewViewport.clientHeight - paddingY),
  };
}

function syncDocumentPreviewFrame(openerWindow, openerDocument, nodes, address, size) {
  const previewFrame = nodes.frame;
  const previewViewport = nodes.viewport;
  if (!previewFrame || !previewViewport || !openerDocument?.documentElement) return false;

  try {
    const sourceWidth = Math.max(1, Math.round(openerWindow.innerWidth || openerDocument.documentElement.clientWidth || 1));
    const sourceHeight = Math.max(1, Math.round(openerWindow.innerHeight || openerDocument.documentElement.clientHeight || 1));
    const previewSize = getPreviewContentSize(previewViewport);
    const scale = Math.min(previewSize.width / sourceWidth, previewSize.height / sourceHeight);

    const docClone = openerDocument.documentElement.cloneNode(true);
    if (!inlineSnapshotStyles({
      openerWindow,
      openerDocument,
      snapshotRoot: docClone,
      sourceWidth,
      sourceHeight,
    })) {
      return false;
    }
    injectSnapshotStabilizers(docClone, openerWindow);

    previewFrame.style.width = `${sourceWidth}px`;
    previewFrame.style.height = `${sourceHeight}px`;
    previewFrame.style.transform = `scale(${scale})`;

    const frameDocument = previewFrame.contentDocument;
    if (!frameDocument) return false;

    frameDocument.open();
    frameDocument.write(`<!doctype html>${docClone.outerHTML}`);
    frameDocument.close();

    window.setTimeout(() => {
      try {
        syncPreviewCanvases(openerDocument, previewFrame.contentDocument);
      } catch {
        // Best-effort sync only.
      }
    }, 0);

    setPreviewSurfaceMode({ frameActive: true, canvasActive: false });
    setPreviewState({
      linked: true,
      canvasActive: true,
      address,
      size,
      emptyText: 'Live pairing active',
      statusText: 'Live thumbnail',
    });
    return true;
  } catch {
    return false;
  }
}

function syncHostPreviewFrame() {
  const nodes = getPreviewNodes();
  const openerWindow = getOpenerWindow();
  if (!openerWindow) {
    setPreviewSurfaceMode({ frameActive: false, canvasActive: false });
    setPreviewState({
      linked: false,
      canvasActive: false,
      address: 'Host unavailable',
      size: '--',
      emptyText: 'Waiting for host window',
    });
    return;
  }

  let address = 'Host window';
  let size = '--';
  let openerDocument = null;

  try {
    openerDocument = openerWindow.document;
    const path = openerWindow.location?.pathname || '/';
    const host = openerWindow.location?.host || '';
    address = host ? `${host}${path}` : path;
    size = `${Math.round(openerWindow.innerWidth || 0)}×${Math.round(openerWindow.innerHeight || 0)}`;
  } catch {
    setPreviewSurfaceMode({ frameActive: false, canvasActive: false });
    setPreviewState({
      linked: false,
      canvasActive: false,
      address: 'Host unavailable',
      size: '--',
      emptyText: 'Waiting for host window',
    });
    return;
  }

  if (syncDocumentPreviewFrame(openerWindow, openerDocument, nodes, address, size)) {
    return;
  }

  const sourceCanvas = openerDocument?.getElementById('c');
  const previewCanvas = nodes.canvas;
  const previewViewport = nodes.viewport;

  if (!sourceCanvas || !previewCanvas || !previewViewport || !sourceCanvas.width || !sourceCanvas.height) {
    setPreviewSurfaceMode({ frameActive: false, canvasActive: false });
    setPreviewState({
      linked: true,
      canvasActive: false,
      address,
      size,
      emptyText: 'Live pairing active',
    });
    return;
  }

  const previewSize = getPreviewContentSize(previewViewport);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetWidth = Math.max(1, Math.round(previewSize.width * dpr));
  const targetHeight = Math.max(1, Math.round(previewSize.height * dpr));

  if (previewCanvas.width !== targetWidth || previewCanvas.height !== targetHeight) {
    previewCanvas.width = targetWidth;
    previewCanvas.height = targetHeight;
  }

  const ctx = previewCanvas.getContext('2d');
  if (!ctx) {
    setPreviewState({
      linked: true,
      canvasActive: false,
      address,
      size,
      emptyText: 'Live pairing active',
    });
    return;
  }

  try {
    const sourceRatio = sourceCanvas.width / sourceCanvas.height;
    const targetRatio = targetWidth / targetHeight;
    let drawWidth = targetWidth;
    let drawHeight = targetHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (sourceRatio > targetRatio) {
      drawHeight = targetWidth / sourceRatio;
      offsetY = (targetHeight - drawHeight) / 2;
    } else {
      drawWidth = targetHeight * sourceRatio;
      offsetX = (targetWidth - drawWidth) / 2;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.fillStyle = 'rgba(12, 12, 16, 0.92)';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(sourceCanvas, offsetX, offsetY, drawWidth, drawHeight);

    setPreviewSurfaceMode({ frameActive: false, canvasActive: true });
    setPreviewState({
      linked: true,
      canvasActive: true,
      address,
      size,
      emptyText: 'Live pairing active',
    });
  } catch {
    setPreviewSurfaceMode({ frameActive: false, canvasActive: false });
    setPreviewState({
      linked: true,
      canvasActive: false,
      address,
      size,
      emptyText: 'Live pairing active',
    });
  }
}

let previewTimer = 0;
let previewStartTimer = window.setTimeout(() => {
  syncHostPreviewFrame();
  previewTimer = window.setInterval(syncHostPreviewFrame, PREVIEW_INTERVAL_MS);
}, PREVIEW_INITIAL_DELAY_MS);

function connectToOpener() {
  try {
    const ready = window.opener?.__ABS_PANEL_POPUP_READY__;
    if (typeof ready === 'function') {
      ready(window);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

const retryTimer = window.setInterval(() => {
  if (connectToOpener()) {
    window.clearInterval(retryTimer);
  }
}, 500);

connectToOpener();
window.addEventListener('resize', syncHostPreviewFrame);

window.addEventListener('beforeunload', () => {
  window.clearInterval(retryTimer);
  window.clearTimeout(previewStartTimer);
  window.clearInterval(previewTimer);
  try {
    const closed = window.opener?.__ABS_PANEL_POPUP_CLOSED__;
    if (typeof closed === 'function') {
      closed();
    }
  } catch {
    // Ignore opener access errors during shutdown.
  }
});
