import { getShellConfig, getSimulationWarmupMs } from './site-shell.js';

export function setPageBootState(state) {
  try {
    document.documentElement.dataset.absBootState = String(state || '');
  } catch {
    return;
  }
}

export function clearFadeBlocking() {
  const blocker = document.getElementById('fade-blocking');
  if (blocker) blocker.remove();
}

export function forcePageVisible(selectors = ['#abs-scene', '#app-frame']) {
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.style.opacity = '1';
      element.style.visibility = 'visible';
      element.style.transform = 'translateZ(0)';
    });
  });

  clearFadeBlocking();
  document.documentElement.classList.remove('entrance-pre-transition', 'entrance-transitioning');
  document.documentElement.classList.add('entrance-complete', 'ui-entered');
  setPageBootState('entered');
}

export async function waitForPageReadyBarrier(options = {}) {
  const waitForFonts = options.waitForFonts;
  const minimumMs = Math.max(0, Number(options.minimumMs) || 0);
  const extraMs = Math.max(0, Number(options.extraMs) || 0);

  setPageBootState('booting');

  const tasks = [];
  if (typeof waitForFonts === 'function') {
    tasks.push(
      Promise.resolve()
        .then(() => waitForFonts())
        .catch(() => false)
        .then(() => {
          setPageBootState('fonts-ready');
        })
    );
  } else {
    setPageBootState('fonts-ready');
  }

  setPageBootState('layout-reserved');

  if (minimumMs > 0) {
    tasks.push(new Promise((resolve) => window.setTimeout(resolve, minimumMs)));
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  if (extraMs > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, extraMs));
  }

  setPageBootState('content-ready');
}

export function getPageWarmupMs(options = {}) {
  const config = options.config || getShellConfig();
  return getSimulationWarmupMs(config);
}
