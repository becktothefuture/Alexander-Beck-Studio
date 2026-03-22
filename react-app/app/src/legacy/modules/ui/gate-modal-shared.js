import {
  forceHideOverlayModal,
  getGateHandoffDurationMs,
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
  keepBackdrop = false,
  shouldFinalize = () => true
}) {
  const closeDurationMs = keepBackdrop
    ? getGateHandoffDurationMs()
    : getModalCloseDurationMs();

  if (instant) {
    modal.style.transition = 'none';

    setModalHidden(modal);

    if (!keepOverlayActive && !keepBackdrop) {
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
  modal.style.transitionDuration = `${closeDurationMs}ms`;

  if (!keepOverlayActive && !keepBackdrop) {
    setCenterStageObscured(false);
    setCvContainerObscured(false);
    hideOverlay();
  }

  setStableTimeout(() => {
    if (shouldFinalize()) {
      setModalHidden(modal);
    }
    modal.style.removeProperty('transition-duration');
  }, closeDurationMs);
}

export function dismissGateBackdrop({ suppressReturnAnimation = false } = {}) {
  setCenterStageObscured(false);
  setCvContainerObscured(false);
  hideOverlay({ suppressReturnAnimation });
}
