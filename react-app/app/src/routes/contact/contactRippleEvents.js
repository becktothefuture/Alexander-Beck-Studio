export const CONTACT_RIPPLE_BURST_EVENT = 'abs:contact-ripple-burst';

export function requestContactRippleBurst() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CONTACT_RIPPLE_BURST_EVENT));
}
