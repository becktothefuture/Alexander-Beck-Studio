import { useCallback, useEffect, useRef, useState } from 'react';
import homeContent from 'virtual:abs-content/home';
import { triggerHaptic } from '../../lib/haptics.js';
import { playContactRippleMotif } from '../../legacy/modules/audio/sound-engine.js';
import {
  CONTACT_RIPPLE_PRESS_FEEDBACK_MS,
  requestContactRippleBurst,
} from './contactRippleEvents.js';

const COPY_FEEDBACK_MS = 3000;

async function copyToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy fallback.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand?.('copy') === true;
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function ContactRouteContent() {
  const contact = homeContent.contact || {};
  const [copyState, setCopyState] = useState('idle');
  const [pressPulse, setPressPulse] = useState({ active: false, phase: 0 });
  const resetTimerRef = useRef(null);
  const pulseTimerRef = useRef(null);
  const email = contact.email || 'alexander@beck.fyi';
  const copyText = contact.copy || {};
  const title = contact.title || "Let's talk";
  const description = contact.description
    || "Hit me up for collaborations and job opportunities. If you need innovative thinking and a creative mind to tackle complex aesthetic, visual, and system problems, get in touch.";

  const setFeedback = useCallback((state) => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setCopyState(state);
    if (state !== 'idle') {
      resetTimerRef.current = window.setTimeout(() => setCopyState('idle'), COPY_FEEDBACK_MS);
    }
  }, []);

  useEffect(() => () => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
  }, []);

  const handleCopy = useCallback(async () => {
    if (pulseTimerRef.current) {
      window.clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = null;
    }
    setPressPulse((current) => ({ active: true, phase: current.phase === 0 ? 1 : 0 }));
    pulseTimerRef.current = window.setTimeout(() => {
      setPressPulse((current) => ({ ...current, active: false }));
      pulseTimerRef.current = null;
    }, CONTACT_RIPPLE_PRESS_FEEDBACK_MS);

    requestContactRippleBurst();
    void playContactRippleMotif({ unlockIfNeeded: false });
    const ok = await copyToClipboard(email);
    triggerHaptic(ok ? 'success' : 'error');
    setFeedback(ok ? 'copied' : 'error');
  }, [email, setFeedback]);

  const statusText = copyState === 'copied'
    ? (copyText.statusCopied || 'Copied')
    : copyState === 'error'
      ? (copyText.statusError || 'Copy failed')
      : '';
  const iconClass = copyState === 'copied'
    ? 'ti ti-check'
    : copyState === 'error'
      ? 'ti ti-alert-triangle'
      : 'ti ti-copy';

  return (
    <div className="route-centered-page contact-route">
      <section id="contact-route-content" className="route-centered-page__inner route-title-lockup contact-route__inner" aria-labelledby="contact-route-title">
        <h1
          id="contact-route-title"
          className="route-centered-page__title route-bookend-title"
          data-route-enter="identity"
          data-route-enter-order="0"
          data-route-enter-variant="bookend-title"
          data-route-focus-target
          tabIndex={-1}
        >
          {title}
        </h1>
        <span className="route-title-lockup__rule" aria-hidden="true" />
        <p id="contact-route-description" className="route-centered-page__description route-intro-description" data-route-enter="context" data-route-enter-variant="bookend-description">
          {description}
        </p>
        <div className="contact-route__copy" data-route-enter="action">
          <button
            type="button"
            className={[
              'contact-email-row',
              pressPulse.active ? 'pulse-energy' : '',
              copyState === 'copied' ? 'is-copied' : '',
              copyState === 'error' ? 'is-error' : '',
            ].filter(Boolean).join(' ')}
            data-copy-email
            data-sound-action="manual"
            data-sound-source="contact-copy-email"
            aria-label={copyText.buttonAriaLabel || 'Copy email address'}
            aria-describedby="contact-copy-status"
            style={{
              '--contact-copy-flash-animation': pressPulse.phase === 0
                ? 'contactCopyMaterialFlashA'
                : 'contactCopyMaterialFlashB',
              '--contact-copy-flash-duration': `${CONTACT_RIPPLE_PRESS_FEEDBACK_MS}ms`,
            }}
            onClick={handleCopy}
          >
            <span className="contact-email-text">{email}</span>
            <span className={['contact-email-copy', copyState !== 'idle' ? 'is-active' : ''].filter(Boolean).join(' ')}>
              <i className={iconClass} aria-hidden="true" />
            </span>
          </button>
          <div id="contact-copy-status" className="contact-copy-status" data-copy-status aria-live="polite">
            {statusText}
          </div>
        </div>
      </section>
    </div>
  );
}
