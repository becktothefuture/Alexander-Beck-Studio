import { useCallback, useEffect, useRef, useState } from 'react';
import { triggerHaptic } from '../../lib/haptics.js';

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

export function CopyEmailAction({
  copyText = {},
  email = 'alexander@beck.fyi',
  onActivate = null,
  soundSource = 'copy-email',
  statusId = 'copy-email-status',
}) {
  const [copyState, setCopyState] = useState('idle');
  const resetTimerRef = useRef(null);

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
  }, []);

  const handleCopy = useCallback(async () => {
    onActivate?.();
    const ok = await copyToClipboard(email);
    triggerHaptic(ok ? 'success' : 'error');
    setFeedback(ok ? 'copied' : 'error');
  }, [email, onActivate, setFeedback]);

  const statusText = copyState === 'copied'
    ? (copyText.statusCopied || 'Copied')
    : copyState === 'error'
      ? (copyText.statusError || 'Copy failed')
      : '';
  return (
    <>
      <button
        type="button"
        className={[
          'abs-labelled-action',
          'contact-email-row',
          copyState === 'copied' ? 'is-copied' : '',
          copyState === 'error' ? 'is-error' : '',
        ].filter(Boolean).join(' ')}
        data-copy-email
        data-copy-presentation="label"
        data-sound-action="manual"
        data-sound-source={soundSource}
        aria-label={copyText.buttonAriaLabel || 'Copy email address'}
        aria-describedby={statusId}
        onClick={handleCopy}
      >
        <span className="contact-email-label-window" aria-hidden="true">
          <span className="contact-email-label contact-email-label--idle">
            <span className="contact-email-text">{email}</span>
            <span className="contact-email-copy">
              <i className="ti ti-copy" aria-hidden="true" />
            </span>
          </span>
          <span className="contact-email-label contact-email-label--copied">
            <span className="contact-email-feedback-text">
              {copyText.statusCopied || 'Copied'}
            </span>
            <span className="contact-email-copy contact-email-feedback-icon">
              <i className="ti ti-check" aria-hidden="true" />
            </span>
          </span>
          <span className="contact-email-label contact-email-label--error">
            <span className="contact-email-feedback-text">
              {copyText.statusError || 'Copy failed'}
            </span>
            <span className="contact-email-copy contact-email-feedback-icon">
              <i className="ti ti-alert-triangle" aria-hidden="true" />
            </span>
          </span>
        </span>
      </button>
      <div id={statusId} className="contact-copy-status" data-copy-status aria-live="polite">
        {statusText}
      </div>
    </>
  );
}
