const VARIANT_BY_PATH = Object.freeze({
  '/lab/atmosphere-webgl-post.html': 'webglPost',
  '/lab/atmosphere-webgl-post': 'webglPost',
  '/lab/atmosphere-density.html': 'density',
  '/lab/atmosphere-density': 'density',
  '/lab/atmosphere-feedback.html': 'canvasFeedback',
  '/lab/atmosphere-feedback': 'canvasFeedback',
  '/lab/atmosphere-crisp-glow.html': 'crispGlow',
  '/lab/atmosphere-crisp-glow': 'crispGlow',
  '/lab/atmosphere-hybrid-glow.html': 'hybridGlow',
  '/lab/atmosphere-hybrid-glow': 'hybridGlow',
});

export const ATMOSPHERE_LAB_VARIANTS = Object.freeze({
  webglPost: Object.freeze({
    id: 'webglPost',
    label: 'WebGL Post',
    shortLabel: 'Post',
    path: '/lab/atmosphere-webgl-post.html',
    title: 'Atmosphere Lab — WebGL Post',
  }),
  density: Object.freeze({
    id: 'density',
    label: 'Instanced Density',
    shortLabel: 'Density',
    path: '/lab/atmosphere-density.html',
    title: 'Atmosphere Lab — Instanced Density',
  }),
  canvasFeedback: Object.freeze({
    id: 'canvasFeedback',
    label: 'Canvas Feedback',
    shortLabel: 'Feedback',
    path: '/lab/atmosphere-feedback.html',
    title: 'Atmosphere Lab — Canvas Feedback',
  }),
  crispGlow: Object.freeze({
    id: 'crispGlow',
    label: 'Crisp + Glow',
    shortLabel: 'Glow',
    path: '/lab/atmosphere-crisp-glow.html',
    title: 'Atmosphere Lab — Crisp + Glow',
  }),
  hybridGlow: Object.freeze({
    id: 'hybridGlow',
    label: 'Hybrid Glow',
    shortLabel: 'Hybrid',
    path: '/lab/atmosphere-hybrid-glow.html',
    title: 'Atmosphere Lab — Hybrid Glow',
  }),
});

export function getAtmosphereLabVariant(pathname = globalThis.location?.pathname || '') {
  const normalized = String(pathname || '').toLowerCase().replace(/\/+$/, '') || '/';
  return VARIANT_BY_PATH[normalized] || null;
}

export function isAtmosphereLabPath(pathname = globalThis.location?.pathname || '') {
  return getAtmosphereLabVariant(pathname) !== null;
}
