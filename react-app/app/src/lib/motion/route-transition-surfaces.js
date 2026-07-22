export const ROUTE_SURFACE_DESCRIPTORS = Object.freeze([
  Object.freeze({ key: 'wall', selector: '#shell-wall-slot', slide: false }),
  Object.freeze({ key: 'hero', selector: '#shell-hero-slot', slide: true }),
  Object.freeze({ key: 'chrome', selector: '.shell-transition-surface--chrome', slide: true }),
  Object.freeze({ key: 'secondary', selector: '.shell-transition-surface--secondary', slide: true }),
  Object.freeze({ key: 'footer', selector: '.shell-transition-surface--footer', slide: true }),
  Object.freeze({ key: 'controls', selector: '.shell-transition-surface--controls', slide: true }),
]);

function getSurfaceNode(surfaceRef, fallbackSelector) {
  if (surfaceRef?.current) return surfaceRef.current;
  if (!fallbackSelector) return null;
  if (fallbackSelector.startsWith('#')) {
    return document.getElementById(fallbackSelector.slice(1));
  }
  return document.querySelector(fallbackSelector);
}

export function getRouteContentLayers(surfaceRefs) {
  const layers = {
    ui: getSurfaceNode(surfaceRefs?.ui, '.fade-content'),
  };
  ROUTE_SURFACE_DESCRIPTORS.forEach(({ key, selector }) => {
    layers[key] = getSurfaceNode(surfaceRefs?.[key], selector);
  });
  return layers;
}

export function getOwnedRouteSurfaceNodes(surfaceRefs) {
  const layers = getRouteContentLayers(surfaceRefs);
  return ROUTE_SURFACE_DESCRIPTORS
    .map(({ key }) => layers[key])
    .filter(Boolean);
}

export function createRouteSurfaceInertRegistry() {
  const states = new Map();
  return {
    activate(elements) {
      elements.forEach((element) => {
        if (!element || states.has(element)) return;
        states.set(element, {
          hadAttribute: element.hasAttribute('inert'),
          attributeValue: element.getAttribute('inert'),
          propertyValue: 'inert' in element ? element.inert : false,
        });
        element.setAttribute('inert', '');
        if ('inert' in element) element.inert = true;
      });
    },
    restore() {
      states.forEach((state, element) => {
        if (state.hadAttribute) {
          element.setAttribute('inert', state.attributeValue ?? '');
        } else {
          element.removeAttribute('inert');
        }
        if ('inert' in element) element.inert = state.propertyValue;
      });
      states.clear();
    },
  };
}

export function setRouteSurfaceVisibility(visible, surfaceRefs) {
  const hidden = !visible;

  getOwnedRouteSurfaceNodes(surfaceRefs).forEach((element) => {
    if (hidden) {
      element.style.opacity = '0';
      element.style.visibility = 'hidden';
      element.style.pointerEvents = 'none';
    } else {
      element.style.removeProperty('opacity');
      element.style.removeProperty('visibility');
      element.style.removeProperty('pointer-events');
    }
  });
}

export function pinRouteSurfacesForCommit(surfaceRefs, animationRegistry) {
  getOwnedRouteSurfaceNodes(surfaceRefs).forEach((element) => {
    element.style.opacity = '0';
    element.style.removeProperty('visibility');
    element.style.pointerEvents = 'none';
    element.style.willChange = 'opacity, transform, filter';
  });
  animationRegistry.cancel();
}

export function restoreRouteSurfaces(surfaceRefs) {
  const layers = getRouteContentLayers(surfaceRefs);
  const registeredSurfaces = ROUTE_SURFACE_DESCRIPTORS
    .map(({ key }) => layers[key])
    .filter(Boolean);

  [...registeredSurfaces, layers.ui].forEach((element) => {
    if (!element) return;
    element.style.opacity = '1';
    element.style.willChange = 'auto';
    element.style.removeProperty('visibility');
    element.style.removeProperty('pointer-events');
    element.style.removeProperty('transform');
    element.style.removeProperty('filter');
  });
}
