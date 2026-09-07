import { useEffect } from 'react';

export const ACTION_BUTTON_SELECTOR = '.abs-labelled-action, .abs-circular-utility.abs-icon-btn';

// Delegation also covers legacy drawer controls and controls mounted after a route change.
export function attachButtonInteractions(root = document) {
  let active = null;
  let pointerId = null;
  let key = null;
  const release = () => {
    active?.removeAttribute('data-action-pressed');
    active = null;
    pointerId = null;
    key = null;
  };
  const controlFor = (target) => {
    const control = target?.closest?.(ACTION_BUTTON_SELECTOR);
    return control && control.matches('button, a[href]')
      && !control.disabled && control.getAttribute('aria-disabled') !== 'true'
      ? control : null;
  };
  const pointerDown = (event) => {
    if (event.button !== 0) return;
    const control = controlFor(event.target);
    if (!control) return;
    release();
    active = control;
    pointerId = event.pointerId;
    active.setAttribute('data-action-pressed', 'true');
  };
  const pointerUp = (event) => { if (event.pointerId === pointerId) release(); };
  const pointerOut = (event) => {
    if (event.pointerId === pointerId && !active?.contains(event.relatedTarget)) release();
  };
  const keyDown = (event) => {
    if (event.repeat) return;
    const control = controlFor(event.target);
    if (!control || (event.key !== 'Enter' && !(event.key === ' ' && control.tagName === 'BUTTON'))) return;
    release();
    active = control;
    key = event.key;
    active.setAttribute('data-action-pressed', 'true');
  };
  const keyUp = (event) => { if (event.key === key) release(); };
  // Safari blurs a focused button on mouse-down. Only keyboard pressure belongs
  // to focus; pointer pressure lasts until pointer release/cancel or window blur.
  const focusOut = (event) => { if (key !== null && active?.contains(event.target)) release(); };
  const listeners = {
    pointerdown: pointerDown, pointerup: pointerUp, pointercancel: pointerUp,
    pointerout: pointerOut, keydown: keyDown, keyup: keyUp,
    focusout: focusOut, dragstart: release,
  };
  for (const [event, listener] of Object.entries(listeners)) root.addEventListener(event, listener, true);
  const view = root.defaultView;
  view?.addEventListener('blur', release);
  return () => {
    release();
    for (const [event, listener] of Object.entries(listeners)) root.removeEventListener(event, listener, true);
    view?.removeEventListener('blur', release);
  };
}

export function useButtonInteractions() {
  useEffect(() => attachButtonInteractions(), []);
}
