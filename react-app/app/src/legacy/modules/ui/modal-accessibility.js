const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

let activeModalController = null;

function isVisible(element) {
  if (!(element instanceof HTMLElement)) return false;
  if (element.hidden) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  return element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0;
}

function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => isVisible(element));
}

function isolateBackground(modalElement) {
  const records = [];

  Array.from(document.body.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    if (child.id === 'modal-blur-layer' || child.id === 'modal-content-layer') return;
    if (child.contains(modalElement)) return;

    records.push({
      element: child,
      inert: child.inert,
      ariaHidden: child.getAttribute('aria-hidden')
    });

    child.inert = true;
    child.setAttribute('aria-hidden', 'true');
  });

  return () => {
    records.forEach(({ element, inert, ariaHidden }) => {
      element.inert = inert;
      if (ariaHidden === null) {
        element.removeAttribute('aria-hidden');
      } else {
        element.setAttribute('aria-hidden', ariaHidden);
      }
    });
  };
}

function resolveFocusTarget(modalElement, initialFocus) {
  if (typeof initialFocus === 'function') {
    return initialFocus();
  }

  if (initialFocus instanceof HTMLElement) {
    return initialFocus;
  }

  return getFocusableElements(modalElement)[0] || modalElement;
}

export function activateModalAccessibility(modalElement, options = {}) {
  if (!(modalElement instanceof HTMLElement)) {
    return () => {};
  }

  if (activeModalController && activeModalController.modalElement !== modalElement) {
    activeModalController.deactivate({ restoreFocus: false });
  }

  const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const restoreBackground = isolateBackground(modalElement);

  modalElement.setAttribute('role', 'dialog');
  modalElement.setAttribute('aria-modal', 'true');
  modalElement.tabIndex = -1;

  const handleKeydown = (event) => {
    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements(modalElement);
    if (focusable.length === 0) {
      event.preventDefault();
      modalElement.focus({ preventScroll: true });
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    const focusIsInside = modalElement.contains(active);

    if (!focusIsInside) {
      event.preventDefault();
      if (event.shiftKey) {
        last.focus({ preventScroll: true });
      } else {
        first.focus({ preventScroll: true });
      }
      return;
    }

    if (event.shiftKey) {
      if (active === first || active === modalElement) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      }
      return;
    }

    if (active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  };

  document.addEventListener('keydown', handleKeydown, true);

  const focusInitialTarget = () => {
    const target = resolveFocusTarget(modalElement, options.initialFocus);
    target?.focus?.({ preventScroll: true });
  };

  focusInitialTarget();

  requestAnimationFrame(() => {
    if (!modalElement.contains(document.activeElement)) {
      focusInitialTarget();
    }
  });

  window.setTimeout(() => {
    if (active && !modalElement.contains(document.activeElement)) {
      focusInitialTarget();
    }
  }, 80);

  let active = true;

  const deactivate = ({ restoreFocus = true } = {}) => {
    if (!active) return;
    active = false;

    document.removeEventListener('keydown', handleKeydown, true);
    restoreBackground();

    if (activeModalController?.modalElement === modalElement) {
      activeModalController = null;
    }

    if (!restoreFocus) {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && modalElement.contains(activeElement)) {
        activeElement.blur();
      }
      return;
    }

    const fallbackTarget = options.restoreFocusTarget;
    const target =
      (fallbackTarget instanceof HTMLElement && fallbackTarget.isConnected && isVisible(fallbackTarget) && fallbackTarget) ||
      (previouslyFocused && previouslyFocused.isConnected && isVisible(previouslyFocused) && previouslyFocused) ||
      null;

    target?.focus?.({ preventScroll: true });
  };

  activeModalController = {
    modalElement,
    deactivate
  };

  return deactivate;
}
