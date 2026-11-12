const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
export const TITLE_DIFFUSION_LIMITS = Object.freeze({ softness: 100, edgeGrain: 4, fillGrain: 45 });

export function normalizeTitleDiffusionSettings(settings) {
  return Object.fromEntries(Object.entries(TITLE_DIFFUSION_LIMITS).map(([key, max]) => {
    const value = Number(settings?.[key]);
    return [key, Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0];
  }));
}

export function getTitleDiffusionOpticalScale(fontSize) {
  return Math.min(1.25, Math.max(0, fontSize) / 100);
}

export function getTitleDiffusionPassNodes(filter) {
  return {
    blur: filter.querySelector('[result="blurred"]'),
    softMix: filter.querySelector('[result="soft"]'),
    edge: filter.querySelector('[result="edge"]'),
    fill: filter.querySelector('feFuncA'),
  };
}

export function setFilterAttribute(element, name, value) {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

export function updateTitleDiffusionPass(nodes, settings, blur, displacement, minimumRadius = 0.8) {
  // Blending the soft pass gives a continuous control on engines that round blur radii.
  const radius = Math.max(minimumRadius, blur);
  const mix = (settings.softness / 100) * (blur / radius);
  setFilterAttribute(nodes.blur, 'stdDeviation', radius.toFixed(3));
  setFilterAttribute(nodes.softMix, 'k2', mix.toFixed(3));
  setFilterAttribute(nodes.softMix, 'k3', (1 - mix).toFixed(3));
  setFilterAttribute(nodes.edge, 'scale', (settings.edgeGrain * displacement).toFixed(3));
  setFilterAttribute(nodes.fill, 'tableValues', `${1 - settings.fillGrain / 100} 1 1`);
}

export function updateTitleDiffusion(nodes, settings, fontSize) {
  const scale = getTitleDiffusionOpticalScale(fontSize);
  updateTitleDiffusionPass(nodes, settings, 1.45 * scale, scale);
}

// The approved "Current" treatment uses the same recipe in the site and the lab.
export function createTitleDiffusionFilter(defs, id) {
  const filter = defs.ownerDocument.createElementNS(SVG_NAMESPACE, 'filter');
  filter.id = id;
  filter.setAttribute('x', '-8%');
  filter.setAttribute('y', '-18%');
  filter.setAttribute('width', '116%');
  filter.setAttribute('height', '136%');
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  filter.innerHTML = `
    <feGaussianBlur in="SourceGraphic" stdDeviation="0" result="blurred" />
    <feComposite in="blurred" in2="SourceGraphic" operator="arithmetic" k2="0" k3="1" result="soft" />
    <feTurbulence type="fractalNoise" baseFrequency="0.57" numOctaves="2" seed="37" result="grain" />
    <feDisplacementMap in="soft" in2="grain" scale="0" xChannelSelector="R" yChannelSelector="G" result="edge" />
    <feComponentTransfer in="grain" result="coverage">
      <feFuncA type="table" tableValues="1 1 1" />
    </feComponentTransfer>
    <feComposite in="edge" in2="coverage" operator="in" />
  `;
  defs.append(filter);
  return { filter, ...getTitleDiffusionPassNodes(filter) };
}
