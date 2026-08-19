import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import homeContent from 'virtual:abs-content/home';
import {
  getGateCodeLength,
  getGateInviteCode,
  hasGateAccess,
  markGateAccess,
} from '../../lib/access-gates.js';
import { triggerHaptic } from '../../lib/haptics.js';
import { playInteractionSound } from '../../legacy/modules/audio/sound-engine.js';
import {
  dismissGateBackdrop,
  ensureGateModalOverlay,
  getGateModalCloseDurationMs,
  prepareGateModalOpen,
} from '../../legacy/modules/ui/gate-modal-shared.js';

const GATE_ID = 'portfolio';
const ACCEPT_CONFIRMATION_MS = 180;

function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
  )).filter((element) => !element.hasAttribute('hidden'));
}

function clampGateCloseDuration(durationMs) {
  return Math.max(180, Math.min(420, Number(durationMs) || 220));
}

export function PortfolioGateRoute() {
  const gateCopy = homeContent.gates?.portfolio || {};
  const title = gateCopy.title || 'View Portfolio';
  const description = gateCopy.description
    || 'Good work deserves good context. Many of my projects across finance, automotive, and digital innovation startups are NDA-protected, so access is code-gated.';
  const codeLength = getGateCodeLength(GATE_ID) || 6;
  const [phase, setPhase] = useState('hidden');
  const [digits, setDigits] = useState(() => Array.from({ length: codeLength }, () => ''));
  const [statusMessage, setStatusMessage] = useState('');
  const modalRef = useRef(null);
  const inputRefs = useRef([]);
  const phaseRef = useRef(phase);
  const timerRef = useRef(0);
  const requestRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (!timerRef.current) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = 0;
  }, []);

  const focusInput = useCallback((index = 0) => {
    const input = inputRefs.current[index];
    if (!input) return;
    input.focus({ preventScroll: true });
    input.select();
  }, []);

  const finishClose = useCallback((outcome) => {
    clearTimer();
    const request = requestRef.current;
    requestRef.current = null;
    document.documentElement.classList.remove(
      'portfolio-access-gate-open',
      'portfolio-access-gate-closing'
    );
    delete document.documentElement.dataset.absPortfolioAccessGatePhase;
    phaseRef.current = 'hidden';
    setPhase('hidden');
    setDigits(Array.from({ length: codeLength }, () => ''));
    setStatusMessage('');
    window.dispatchEvent(new CustomEvent(
      outcome === 'granted'
        ? 'abs:portfolio:access-granted'
        : 'abs:portfolio:access-dismissed',
      {
        detail: {
          gateId: GATE_ID,
          projectId: request?.projectId || '',
        },
      }
    ));
  }, [clearTimer, codeLength]);

  const beginClose = useCallback((outcome) => {
    if (phaseRef.current === 'hidden' || phaseRef.current === 'closing') return;
    if (outcome === 'dismissed') {
      playInteractionSound('close', { source: 'portfolio-gate-close' });
    }
    clearTimer();
    phaseRef.current = 'closing';
    setPhase('closing');
    // The legacy viewport layers are deliberately hidden while this in-window
    // gate paints. Clear them instantly so their longer fade cannot reappear
    // after the local 220ms close finishes.
    dismissGateBackdrop({ suppressReturnAnimation: true, instant: true });
    const closeDurationMs = clampGateCloseDuration(
      getGateModalCloseDurationMs({ keepBackdrop: true })
    );
    timerRef.current = window.setTimeout(() => finishClose(outcome), closeDurationMs);
  }, [clearTimer, finishClose]);

  const rejectCode = useCallback(() => {
    triggerHaptic('error');
    setStatusMessage('That code did not match. Try again.');
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setDigits(Array.from({ length: codeLength }, () => ''));
      focusInput(0);
    }, 150);
  }, [clearTimer, codeLength, focusInput]);

  const validateCode = useCallback((nextDigits) => {
    if (phaseRef.current !== 'open') return;
    const enteredCode = nextDigits.join('');
    if (enteredCode.length !== codeLength) return;
    if (enteredCode !== getGateInviteCode(GATE_ID)) {
      rejectCode();
      return;
    }

    markGateAccess(GATE_ID);
    if (!hasGateAccess(GATE_ID)) {
      setStatusMessage('Access could not be saved in this browser. Please try again.');
      triggerHaptic('error');
      return;
    }

    phaseRef.current = 'accepted';
    setPhase('accepted');
    setStatusMessage('Access accepted. Opening your project.');
    triggerHaptic('success');
    clearTimer();
    timerRef.current = window.setTimeout(() => beginClose('granted'), ACCEPT_CONFIRMATION_MS);
  }, [beginClose, clearTimer, codeLength, rejectCode]);

  useEffect(() => {
    // Consume supported invite-code URL parameters even though Portfolio itself
    // is now a public route.
    hasGateAccess(GATE_ID);

    const handleAccessRequest = (event) => {
      if ((event?.detail?.gateId || '') !== GATE_ID) return;
      if (phaseRef.current !== 'hidden') return;
      requestRef.current = {
        projectId: event?.detail?.projectId || '',
      };
      setDigits(Array.from({ length: codeLength }, () => ''));
      setStatusMessage('');
      phaseRef.current = 'opening';
      setPhase('opening');
    };

    window.addEventListener('abs:portfolio:request-access', handleAccessRequest);
    return () => window.removeEventListener('abs:portfolio:request-access', handleAccessRequest);
  }, [codeLength]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    phaseRef.current = phase;
    root.dataset.absPortfolioAccessGatePhase = phase;
    root.classList.toggle(
      'portfolio-access-gate-open',
      phase === 'opening' || phase === 'open' || phase === 'accepted'
    );
    root.classList.toggle('portfolio-access-gate-closing', phase === 'closing');
  }, [phase]);

  useEffect(() => {
    if (phase !== 'opening') return undefined;
    let cancelled = false;
    ensureGateModalOverlay();
    prepareGateModalOpen(modalRef.current, {
      mount: false,
      onReady: () => {
        if (cancelled) return;
        phaseRef.current = 'open';
        setPhase('open');
        window.requestAnimationFrame(() => focusInput(0));
      },
    });
    return () => {
      cancelled = true;
    };
  }, [focusInput, phase]);

  useEffect(() => {
    if (phase !== 'open') return undefined;
    const handleDismiss = () => beginClose('dismissed');
    document.addEventListener('modal-overlay-dismiss', handleDismiss);
    return () => document.removeEventListener('modal-overlay-dismiss', handleDismiss);
  }, [beginClose, phase]);

  useEffect(() => () => {
    clearTimer();
    document.documentElement.classList.remove(
      'portfolio-access-gate-open',
      'portfolio-access-gate-closing'
    );
    delete document.documentElement.dataset.absPortfolioAccessGatePhase;
    dismissGateBackdrop({ suppressReturnAnimation: true, instant: true });
  }, [clearTimer]);

  const handleDigitChange = (index, rawValue) => {
    if (phaseRef.current !== 'open') return;
    const value = String(rawValue || '').replace(/\D/g, '').slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = value;
    setDigits(nextDigits);
    setStatusMessage('');
    if (value && index < codeLength - 1) {
      triggerHaptic('tap');
      focusInput(index + 1);
    }
    validateCode(nextDigits);
  };

  const handlePaste = (event, startIndex) => {
    if (phaseRef.current !== 'open') return;
    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, codeLength);
    if (!pastedDigits) return;
    event.preventDefault();
    const nextDigits = [...digits];
    pastedDigits.split('').forEach((digit, offset) => {
      if (startIndex + offset < codeLength) nextDigits[startIndex + offset] = digit;
    });
    setDigits(nextDigits);
    setStatusMessage('');
    focusInput(Math.min(startIndex + pastedDigits.length, codeLength - 1));
    validateCode(nextDigits);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && phaseRef.current === 'open') {
      event.preventDefault();
      beginClose('dismissed');
      return;
    }

    if (event.key === 'Backspace') {
      const index = Number(event.target?.dataset?.index || 0);
      if (!digits[index] && index > 0) focusInput(index - 1);
    }

    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements(modalRef.current);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (phase === 'hidden') return null;

  const accepted = phase === 'accepted';
  const active = phase === 'open' || accepted;
  const className = [
    'portfolio-access-gate route-centered-page',
    active ? 'is-open' : '',
    accepted ? 'is-accepted' : '',
    phase === 'closing' ? 'is-closing' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={modalRef}
      className={className}
      data-portfolio-access-gate
      data-phase={phase}
      role="dialog"
      aria-modal="true"
      aria-labelledby="portfolio-access-gate-title"
      aria-describedby="portfolio-access-gate-description"
      aria-busy={accepted ? 'true' : 'false'}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className="portfolio-access-gate__close abs-icon-btn abs-circular-utility"
        aria-label="Close portfolio access prompt"
        data-sound-action="manual"
        data-sound-source="portfolio-gate-close"
        disabled={accepted || phase === 'closing'}
        onClick={() => beginClose('dismissed')}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M6.22 4.93 12 10.71l5.78-5.78 1.29 1.29L13.29 12l5.78 5.78-1.29 1.29L12 13.29l-5.78 5.78-1.29-1.29L10.71 12 4.93 6.22z"
          />
        </svg>
      </button>

      <section className="route-centered-page__inner portfolio-access-gate__inner">
        <p className="route-kicker">Private project</p>
        <h1 id="portfolio-access-gate-title" className="route-centered-page__title">{title}</h1>
        <p id="portfolio-access-gate-description" className="route-centered-page__description">{description}</p>
        <div
          className={`portfolio-gate-inputs portfolio-access-gate__inputs${statusMessage && !accepted ? ' is-error' : ''}${accepted ? ' pulse-energy' : ''}`}
          role="group"
          aria-label="Portfolio invite code"
        >
          {digits.map((digit, index) => (
            <input
              key={`portfolio-access-digit-${index}`}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              type="text"
              maxLength="1"
              className="portfolio-digit"
              inputMode="numeric"
              pattern="[0-9]"
              data-index={index}
              aria-label={`Portfolio invite code digit ${index + 1} of ${codeLength}`}
              autoComplete="off"
              value={digit}
              disabled={accepted || phase === 'closing'}
              onChange={(event) => handleDigitChange(index, event.currentTarget.value)}
              onPaste={(event) => handlePaste(event, index)}
            />
          ))}
        </div>
        <p className="portfolio-access-gate__status" role="status" aria-live="polite">
          {statusMessage}
        </p>
      </section>
    </div>
  );
}
