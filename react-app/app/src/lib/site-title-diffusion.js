import { loadRuntimeConfig } from '../legacy/modules/utils/runtime-config.js';
import {
  createTitleDiffusionFilter,
  normalizeTitleDiffusionSettings,
  setFilterAttribute,
  updateTitleDiffusion,
} from './title-diffusion.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const ROUTE_TITLE_SELECTOR = '.route-centered-page__title';
const FILTER_PROPERTY = '--route-title-diffusion-filter';
let filterSequence = 0;

function bindFilter(element, filter) {
  element.style.setProperty(FILTER_PROPERTY, `url("#${filter.id}")`);
}

function updateCanvasFilter(nodes, settings, fontSize, titleRect, canvasRect) {
  // Bound the filter to the existing title geometry instead of filtering the
  // full window. The region includes overscan for letter travel and diffusion.
  const x = titleRect.left - canvasRect.left;
  const y = titleRect.top - canvasRect.top;
  const padX = Math.max(8, titleRect.width * 0.08);
  const padY = Math.max(8, titleRect.height * 0.18);
  const left = Math.max(0, Math.floor(x - padX));
  const top = Math.max(0, Math.floor(y - padY));
  const right = Math.min(canvasRect.width, Math.ceil(x + titleRect.width + padX));
  const bottom = Math.min(canvasRect.height, Math.ceil(y + titleRect.height + padY));
  setFilterAttribute(nodes.filter, 'x', String(left));
  setFilterAttribute(nodes.filter, 'y', String(top));
  setFilterAttribute(nodes.filter, 'width', String(Math.max(1, right - left)));
  setFilterAttribute(nodes.filter, 'height', String(Math.max(1, bottom - top)));
  updateTitleDiffusion(nodes, settings, fontSize);
}

function attachDomTitleFilters(scene, defs, settings) {
  const titles = new Map();
  const refresh = (title) => {
    const nodes = titles.get(title);
    if (!nodes) return;
    const fontSize = Number.parseFloat(getComputedStyle(title).fontSize);
    if (fontSize > 0) updateTitleDiffusion(nodes, settings, fontSize);
  };
  const resizeObserver = new ResizeObserver((entries) => {
    for (const { target } of entries) refresh(target);
  });
  const add = (title) => {
    if (titles.has(title) || !scene.contains(title)) return;
    const nodes = createTitleDiffusionFilter(defs, `abs-route-title-diffusion-${++filterSequence}`);
    titles.set(title, nodes);
    refresh(title);
    bindFilter(title, nodes.filter);
    resizeObserver.observe(title);
  };
  const remove = (title, nodes) => {
    resizeObserver.unobserve(title);
    title.style.removeProperty(FILTER_PROPERTY);
    nodes.filter.remove();
    titles.delete(title);
  };
  const mutationObserver = new MutationObserver((records) => {
    for (const [title, nodes] of titles) {
      if (!scene.contains(title)) remove(title, nodes);
    }
    for (const record of records) {
      // Glyph preparation replaces descendants of headings that are already bound.
      if (record.target.closest?.(ROUTE_TITLE_SELECTOR)) continue;
      for (const node of record.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches(ROUTE_TITLE_SELECTOR)) add(node);
        node.querySelectorAll(ROUTE_TITLE_SELECTOR).forEach(add);
      }
    }
  });
  scene.querySelectorAll(ROUTE_TITLE_SELECTOR).forEach(add);
  mutationObserver.observe(scene, { childList: true, subtree: true });
  return () => {
    mutationObserver.disconnect();
    resizeObserver.disconnect();
    for (const [title, nodes] of titles) remove(title, nodes);
  };
}

export function attachSiteTitleDiffusion(canvas) {
  // Include the in-window access gate, which is mounted beside #simulations.
  const scene = canvas.closest('#abs-scene');
  const doc = canvas.ownerDocument;
  let disposed = false;
  let updateFilter = null;
  let pendingGeometry = null;
  let cleanup = null;

  void loadRuntimeConfig().then((runtime) => {
    if (disposed) return;
    const settings = normalizeTitleDiffusionSettings(runtime.titleDiffusion);
    if (!Object.values(settings).some(Boolean)) return;

    const svg = doc.createElementNS(SVG_NAMESPACE, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.style.position = 'absolute';
    const defs = doc.createElementNS(SVG_NAMESPACE, 'defs');
    svg.append(defs);
    doc.body.append(svg);

    const nodes = createTitleDiffusionFilter(defs, `abs-canvas-title-diffusion-${++filterSequence}`);
    nodes.filter.setAttribute('filterUnits', 'userSpaceOnUse');
    updateFilter = (fontSize, titleRect, canvasRect) => {
      updateCanvasFilter(nodes, settings, fontSize, titleRect, canvasRect);
      if (!canvas.style.getPropertyValue(FILTER_PROPERTY)) bindFilter(canvas, nodes.filter);
    };
    if (pendingGeometry) updateFilter(...pendingGeometry);
    pendingGeometry = null;
    const detachDom = attachDomTitleFilters(scene, defs, settings);
    cleanup = () => {
      detachDom();
      canvas.style.removeProperty(FILTER_PROPERTY);
      svg.remove();
    };
  });

  return {
    updateCanvas(fontSize, titleRect, canvasRect) {
      if (updateFilter) updateFilter(fontSize, titleRect, canvasRect);
      else pendingGeometry = [fontSize, titleRect, canvasRect];
    },
    dispose() {
      disposed = true;
      pendingGeometry = null;
      cleanup?.();
    },
  };
}
