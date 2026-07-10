import { useEffect } from 'react';
import { triggerHaptic } from '../lib/haptics.js';

const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'input',
  '[role="button"]',
  '.footer_link',
  '.abs-icon-btn',
  '.simulation-focus-pill',
  '.simulation-focus-row',
].join(',');

const OPEN_SELECTOR = [
  '[aria-haspopup="dialog"]',
  '.simulation-focus-switcher',
].join(',');

const CLOSE_SELECTOR = [
  '[data-modal-back]',
  '.portfolio-project-view__close',
].join(',');

function getHapticTarget(target) {
  if (!(target instanceof Element)) return null;
  const element = target.closest(INTERACTIVE_SELECTOR);
  if (!(element instanceof HTMLElement)) return null;
  if (element.matches('[disabled], [aria-disabled="true"]')) return null;
  return element;
}

function getActivationType(element) {
  if (element.matches(CLOSE_SELECTOR)) return 'close';
  if (element.matches('.simulation-focus-row')) return 'step';
  if (element.matches(OPEN_SELECTOR)) return 'open';
  return 'tap';
}

export function useSiteHaptics({ routeId } = {}) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handlePointerDown = (event) => {
      const element = getHapticTarget(event.target);
      if (!element) return;
      triggerHaptic(getActivationType(element), { event });
    };

    const handlePointerOver = (event) => {
      if (routeId !== 'home') return;
      const element = getHapticTarget(event.target);
      if (!element) return;
      if (element.contains(event.relatedTarget)) return;
      triggerHaptic('hover', { event });
    };

    const handleFocusIn = (event) => {
      if (routeId !== 'home') return;
      const element = getHapticTarget(event.target);
      if (!element) return;
      triggerHaptic('hover', { event, minIntervalMs: 240 });
    };

    document.addEventListener('pointerdown', handlePointerDown, { passive: true });
    document.addEventListener('pointerover', handlePointerOver, { passive: true });
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [routeId]);
}
