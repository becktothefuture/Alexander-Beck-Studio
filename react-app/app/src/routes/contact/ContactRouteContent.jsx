import { useCallback, useEffect, useRef, useState } from 'react';
import homeContent from 'virtual:abs-content/home';
import { triggerHaptic } from '../../lib/haptics.js';
import { playContactRippleMotif } from '../../legacy/modules/audio/sound-engine.js';
import { ContactRippleSimulation } from './ContactRippleSimulation.jsx';

const COPY_FEEDBACK_MS = 3000;
const TYPOGRAPHY_IMPACT_MS = 1200;

function KineticText({ text, variant }) {
  let glyphIndex = 0;

  return (
    <span className={`contact-kinetic-text contact-kinetic-text--${variant}`} aria-hidden="true">
      {text.split(/(\s+)/).map((token, tokenIndex) => {
        if (/^\s+$/.test(token)) return token;

        return (
          <span className="contact-kinetic-word" key={`${token}-${tokenIndex}`}>
            {Array.from(token).map((glyph) => {
              const index = glyphIndex;
              glyphIndex += 1;
              return (
                <span
                  className="contact-kinetic-glyph"
                  data-contact-typography-glyph
                  data-contact-typography-variant={variant}
                  data-contact-typography-index={index}
                  key={`${glyph}-${index}`}
                >
                  {glyph}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}

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
  const [burstToken, setBurstToken] = useState(0);
  const resetTimerRef = useRef(null);
  const pulseTimerRef = useRef(null);
  const typographyTimerRef = useRef(null);
  const contentRef = useRef(null);
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

  const clearTypographyImpact = useCallback(() => {
    if (typographyTimerRef.current) {
      window.clearTimeout(typographyTimerRef.current);
      typographyTimerRef.current = null;
    }

    const content = contentRef.current;
    if (!content) return;
    content.classList.remove('is-typography-scattering');
    content.dataset.contactTypographyImpact = 'idle';
    content.querySelectorAll('[data-contact-typography-glyph]').forEach((glyph) => {
      glyph.style.removeProperty('--contact-scatter-x');
      glyph.style.removeProperty('--contact-scatter-y');
      glyph.style.removeProperty('--contact-scatter-in-x');
      glyph.style.removeProperty('--contact-scatter-in-y');
      glyph.style.removeProperty('--contact-scatter-return-x');
      glyph.style.removeProperty('--contact-scatter-return-y');
      glyph.style.removeProperty('--contact-scatter-rotate');
      glyph.style.removeProperty('--contact-scatter-delay');
    });
  }, []);

  const triggerTypographyImpact = useCallback((button) => {
    const content = contentRef.current;
    if (!content || !button) return;

    clearTypographyImpact();
    const glyphs = Array.from(content.querySelectorAll('[data-contact-typography-glyph]'));
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    content.dataset.contactTypographyReducedMotion = String(reducedMotion);

    if (!reducedMotion && glyphs.length > 0) {
      const buttonRect = button.getBoundingClientRect();
      const sourceX = buttonRect.left + (buttonRect.width * 0.5);
      const sourceY = buttonRect.top + (buttonRect.height * 0.5);
      const glyphMetrics = glyphs.map((glyph) => {
        const rect = glyph.getBoundingClientRect();
        const deltaX = rect.left + (rect.width * 0.5) - sourceX;
        const deltaY = rect.top + (rect.height * 0.5) - sourceY;
        return { glyph, deltaX, deltaY, distance: Math.max(1, Math.hypot(deltaX, deltaY)) };
      });
      const maxDistance = Math.max(...glyphMetrics.map(({ distance }) => distance));

      glyphMetrics.forEach(({ glyph, deltaX, deltaY, distance }) => {
        const index = Number(glyph.dataset.contactTypographyIndex || 0);
        const isDescription = glyph.dataset.contactTypographyVariant === 'description';
        const directionX = deltaX / distance;
        const directionY = deltaY / distance;
        const proximity = 1 - Math.min(1, distance / maxDistance);
        const strength = (18 + (proximity * 24)) * (isDescription ? 1 : 0.72);
        const lateralJitter = ((((index * 17) % 11) - 5) / 5) * (isDescription ? 6 : 4);
        const outX = (directionX * strength) + lateralJitter;
        const outY = (directionY * strength) - (isDescription ? 8 : 4);
        const rotation = ((((index * 13) % 9) - 4) / 4) * (isDescription ? 5 : 3.5);
        const delay = (isDescription ? 0 : 70) + Math.min(70, Math.max(0, (distance - 70) * 0.18));

        glyph.style.setProperty('--contact-scatter-x', `${outX.toFixed(2)}px`);
        glyph.style.setProperty('--contact-scatter-y', `${outY.toFixed(2)}px`);
        glyph.style.setProperty('--contact-scatter-in-x', `${(-outX * 0.13).toFixed(2)}px`);
        glyph.style.setProperty('--contact-scatter-in-y', `${(-outY * 0.13).toFixed(2)}px`);
        glyph.style.setProperty('--contact-scatter-return-x', `${(-outX * 0.09).toFixed(2)}px`);
        glyph.style.setProperty('--contact-scatter-return-y', `${(-outY * 0.09).toFixed(2)}px`);
        glyph.style.setProperty('--contact-scatter-rotate', `${rotation.toFixed(2)}deg`);
        glyph.style.setProperty('--contact-scatter-delay', `${Math.round(delay)}ms`);
      });
    }

    void content.offsetWidth;
    content.classList.add('is-typography-scattering');
    content.dataset.contactTypographyImpact = 'active';
    typographyTimerRef.current = window.setTimeout(clearTypographyImpact, TYPOGRAPHY_IMPACT_MS);
  }, [clearTypographyImpact]);

  useEffect(() => () => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    clearTypographyImpact();
  }, [clearTypographyImpact]);

  const handleCopy = useCallback(async (event) => {
    const button = event.currentTarget;
    setBurstToken((current) => current + 1);
    triggerTypographyImpact(button);
    void playContactRippleMotif({ unlockIfNeeded: true });
    const ok = await copyToClipboard(email);
    triggerHaptic(ok ? 'success' : 'error');
    button.classList.remove('pulse-energy');
    if (pulseTimerRef.current) {
      window.clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = null;
    }
    if (ok) {
      void button.offsetWidth;
      button.classList.add('pulse-energy');
      pulseTimerRef.current = window.setTimeout(() => {
        button.classList.remove('pulse-energy');
        pulseTimerRef.current = null;
      }, 800);
    }
    setFeedback(ok ? 'copied' : 'error');
  }, [email, setFeedback, triggerTypographyImpact]);

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
    <div className="route-centered-page contact-route" data-route-content="contact">
      <ContactRippleSimulation burstToken={burstToken} contentRef={contentRef} />
      <section
        ref={contentRef}
        className="route-centered-page__inner contact-route__inner"
        aria-labelledby="contact-route-title"
        data-contact-typography-impact="idle"
      >
        <h1
          id="contact-route-title"
          className="route-centered-page__title"
          data-route-enter="identity"
          data-route-enter-order="0"
          aria-label={title}
        >
          <KineticText text={title} variant="title" />
        </h1>
        <p
          id="contact-route-description"
          className="route-centered-page__description"
          data-route-enter="context"
          aria-label={description}
        >
          <KineticText text={description} variant="description" />
        </p>
        <div className="contact-route__copy" data-route-enter="action">
          <button
            type="button"
            className={[
              'contact-email-row',
              copyState === 'copied' ? 'is-copied' : '',
              copyState === 'error' ? 'is-error' : '',
            ].filter(Boolean).join(' ')}
            data-copy-email
            aria-label={copyText.buttonAriaLabel || 'Copy email address'}
            aria-describedby="contact-copy-status"
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
