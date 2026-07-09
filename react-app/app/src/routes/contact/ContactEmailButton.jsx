import { useState } from 'react';

async function copyText(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to legacy fallback.
  }

  try {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', 'true');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.top = '0';
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand?.('copy') === true;
    document.body.removeChild(input);
    return ok;
  } catch {
    return false;
  }
}

export function ContactEmailButton({ email, copyAriaLabel, copiedText, errorText }) {
  const [status, setStatus] = useState('');
  const statusText = status === 'copied' ? copiedText : (status === 'error' ? errorText : '');

  const handleCopy = async () => {
    const ok = await copyText(email);
    setStatus(ok ? 'copied' : 'error');
    window.setTimeout(() => setStatus(''), 3000);
  };

  return (
    <div className="contact-route-email">
      <button
        type="button"
        className={`contact-email-row contact-route-email__button${status ? ` is-${status}` : ''}`}
        aria-label={copyAriaLabel}
        onClick={handleCopy}
      >
        <span className="contact-email-text">{email}</span>
        <span className={`contact-email-copy${status === 'copied' ? ' is-active' : ''}`} aria-hidden="true">
          <i className={`ti ${status === 'copied' ? 'ti-check' : (status === 'error' ? 'ti-alert-triangle' : 'ti-copy')}`} />
        </span>
      </button>
      <div className="contact-copy-status" aria-live="polite">
        {statusText}
      </div>
    </div>
  );
}
