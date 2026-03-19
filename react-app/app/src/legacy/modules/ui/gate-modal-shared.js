import {
  forceHideOverlayModal,
  getModalCloseDurationMs,
  hideOverlay,
  mountModalIntoOverlay,
  showOverlay,
  unmountModalFromOverlay
} from './modal-overlay.js';
import { setStableTimeout } from '../../../lib/legacy-runtime-scope.js';

function setCvContainerObscured(obscured) {
  const cvContainer = document.querySelector('.cv-scroll-container');
  if (cvContainer) {
    cvContainer.classList.toggle('fade-out-up', obscured);
  }
}

function setCenterStageObscured(obscured) {
  document.querySelectorAll('main.ui-center, main.ui-center-spacer').forEach((el) => {
    el.classList.toggle('center-stage--modal-hidden', obscured);
  });
}

function setModalHidden(modal) {
  modal.classList.remove('active', 'closing');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  modal.dataset.modalState = 'hidden';
  unmountModalFromOverlay(modal);
}

export function isGateModalParticipating(modal) {
  return Boolean(modal && !modal.classList.contains('hidden'));
}

export function hideCompetingGateModals(modals = []) {
  modals.forEach((modal) => {
    if (isGateModalParticipating(modal)) {
      forceHideOverlayModal(modal);
    }
  });
}

export function showGateBackdrop({ hadActiveGate = false } = {}) {
  if (!hadActiveGate) {
    showOverlay();
  }

  setCenterStageObscured(true);
  setCvContainerObscured(true);
}

export function openGateModal(modal) {
  requestAnimationFrame(() => {
    mountModalIntoOverlay(modal);
    modal.classList.remove('closing', 'hidden');
    modal.setAttribute('aria-hidden', 'false');
    modal.dataset.modalState = 'open';
    void modal.offsetWidth;
    modal.classList.add('active');
  });
}

export function closeGateModal({
  modal,
  logo,
  instant = false,
  keepOverlayActive = false,
  shouldFinalize = () => true
}) {
  if (instant) {
    modal.style.transition = 'none';

    setModalHidden(modal);

    if (!keepOverlayActive) {
      setCenterStageObscured(false);
      setCvContainerObscured(false);
      hideOverlay();
    }

    requestAnimationFrame(() => {
      modal.style.removeProperty('transition');
    });
    return;
  }

  modal.classList.remove('active');
  modal.classList.add('closing');
  modal.setAttribute('aria-hidden', 'true');
  modal.dataset.modalState = 'closing';

  if (!keepOverlayActive) {
    setCenterStageObscured(false);
    setCvContainerObscured(false);
    hideOverlay();
  }

  setStableTimeout(() => {
    if (shouldFinalize()) {
      setModalHidden(modal);
    }
  }, getModalCloseDurationMs());
}
