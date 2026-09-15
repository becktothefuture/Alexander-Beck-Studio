import { getSimulationPresentation } from '../legacy/modules/rendering/simulation-presentation.js';

const SPA_NAVIGATE_KEY = '__ABS_SPA_NAVIGATE__';

export function installSpaNavigationBridge(navigate) {
  if (typeof window === 'undefined') return () => {};

  window[SPA_NAVIGATE_KEY] = navigate;

  return () => {
    if (window[SPA_NAVIGATE_KEY] === navigate) {
      delete window[SPA_NAVIGATE_KEY];
    }
  };
}

export function trySpaNavigate(href, options = {}) {
  if (typeof window === 'undefined') return false;

  const navigate = window[SPA_NAVIGATE_KEY];
  if (typeof navigate !== 'function') return false;

  const presentation = getSimulationPresentation(true);
  return navigate(presentation?.resolveNavigationHref?.(href) || href, options);
}
