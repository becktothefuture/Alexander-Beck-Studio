const LOCAL_KEYBOARD_TARGET_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[data-keyboard-shortcuts="local"]',
  '[role="button"]',
  '[role="combobox"]',
  '[role="link"]',
  '[role="listbox"]',
  '[role="menu"]',
  '[role="menubar"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="tablist"]',
  '[role="tree"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const OPEN_MODAL_SELECTOR = '[role="dialog"][aria-modal="true"]:not([aria-hidden="true"])';

function closestMatch(target, selector) {
  return typeof target?.closest === 'function' ? target.closest(selector) : null;
}

export function shouldIgnoreGlobalKeyboardShortcut(event, options = {}) {
  if (
    !event
    || event.defaultPrevented
    || event.repeat
    || event.isComposing
    || event.metaKey
    || event.altKey
    || event.ctrlKey
    || event.shiftKey
  ) {
    return true;
  }

  const documentObject = options.documentObject
    || event.target?.ownerDocument
    || globalThis.document;
  if (documentObject?.querySelector?.(OPEN_MODAL_SELECTOR)) return true;

  if (options.allowRouteTab && closestMatch(event.target, '[data-route-tab]')) {
    return false;
  }

  return Boolean(closestMatch(event.target, LOCAL_KEYBOARD_TARGET_SELECTOR));
}

export function getWrappedAdjacentItem(items, activeId, direction, getId = (item) => item?.id) {
  if (!Array.isArray(items) || items.length === 0 || direction === 0) return null;

  const normalizedDirection = direction > 0 ? 1 : -1;
  const activeIndex = items.findIndex((item) => getId(item) === activeId);
  if (activeIndex < 0) {
    return normalizedDirection > 0 ? items[0] : items[items.length - 1];
  }

  return items[(activeIndex + normalizedDirection + items.length) % items.length];
}
