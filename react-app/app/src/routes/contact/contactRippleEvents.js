export const CONTACT_RIPPLE_BURST_EVENT = 'abs:contact-ripple-burst';
export const CONTACT_RIPPLE_PRESS_FEEDBACK_MS = 620;

export function requestContactRippleBurst() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CONTACT_RIPPLE_BURST_EVENT));
}
