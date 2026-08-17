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
  pressFeedbackMs = 620,
  soundSource = 'copy-email',
  statusId = 'copy-email-status',
}) {
  const [copyState, setCopyState] = useState('idle');
  const [pressPulse, setPressPulse] = useState({ active: false, phase: 0 });
  const resetTimerRef = useRef(null);
  const pulseTimerRef = useRef(null);

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
    }, pressFeedbackMs);

    onActivate?.();
    const ok = await copyToClipboard(email);
    triggerHaptic(ok ? 'success' : 'error');
    setFeedback(ok ? 'copied' : 'error');
  }, [email, onActivate, pressFeedbackMs, setFeedback]);

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
    <>
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
        data-sound-source={soundSource}
        aria-label={copyText.buttonAriaLabel || 'Copy email address'}
        aria-describedby={statusId}
        style={{
          '--contact-copy-flash-animation': pressPulse.phase === 0
            ? 'contactCopyMaterialFlashA'
            : 'contactCopyMaterialFlashB',
          '--contact-copy-flash-duration': `${pressFeedbackMs}ms`,
        }}
        onClick={handleCopy}
      >
        <span className="contact-email-text">{email}</span>
        <span className={['contact-email-copy', copyState !== 'idle' ? 'is-active' : ''].filter(Boolean).join(' ')}>
          <i className={iconClass} aria-hidden="true" />
        </span>
      </button>
      <div id={statusId} className="contact-copy-status" data-copy-status aria-live="polite">
        {statusText}
      </div>
    </>
  );
}
