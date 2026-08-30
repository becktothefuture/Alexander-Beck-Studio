import { useEffect, useLayoutEffect, useRef } from 'react';
import { PlaygroundMedia } from '../../playground/media/PlaygroundMedia.jsx';

const STAGE_EASING = 'cubic-bezier(0.22, 0, 0.16, 1)';
const OPEN_DURATION_MS = 520;
const CLOSE_DURATION_MS = 420;
const REDUCED_DURATION_MS = 120;

function getFocusableElements(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(
    'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  )).filter((element) => !element.hidden);
}

function usableRect(rect) {
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

function getSourceRect(sourceElement) {
  const media = sourceElement?.querySelector?.('.playground-media') || sourceElement;
  const rect = media?.getBoundingClientRect?.();
  return usableRect(rect) ? rect : null;
}

function getSourceBorderRadius(sourceElement) {
  const media = sourceElement?.querySelector?.('.playground-media') || sourceElement;
  if (!media || typeof getComputedStyle !== 'function') {
    return 'var(--work-media-radius, var(--abs-radius-9))';
  }
  return getComputedStyle(media).borderRadius
    || 'var(--work-media-radius, var(--abs-radius-9))';
}

function createSourceTransform(sourceRect, targetRect) {
  if (!usableRect(sourceRect) || !usableRect(targetRect)) return 'translate3d(0, 8px, 0) scale(0.98)';
  const deltaX = sourceRect.left - targetRect.left;
  const deltaY = sourceRect.top - targetRect.top;
  const scaleX = sourceRect.width / targetRect.width;
  const scaleY = sourceRect.height / targetRect.height;
  return `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`;
}

function cancelAnimations(animations) {
  animations.forEach((animation) => animation.cancel());
}

export function WorkSnippetStage({
  item,
  open,
  getSourceElement,
  motionAllowed,
  onRequestClose,
  onBackgroundInertChange,
  onRestoreFocus,
  onExited,
  onPhaseChange,
  onRuntimeStateChange,
}) {
  const rootRef = useRef(null);
  const surfaceRef = useRef(null);
  const backdropRef = useRef(null);
  const copyRef = useRef(null);
  const closeButtonRef = useRef(null);
  const sourceElementRef = useRef(null);
  const animationsRef = useRef([]);
  const phaseRef = useRef('idle');
  const exitStartedRef = useRef(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const surface = surfaceRef.current;
    const backdrop = backdropRef.current;
    const copy = copyRef.current;
    if (!root || !surface || !backdrop || !copy || !item) return undefined;
    const sourceElement = getSourceElement?.(item.id) || null;
    sourceElementRef.current = sourceElement;
    cancelAnimations(animationsRef.current);
    animationsRef.current = [];
    exitStartedRef.current = false;
    phaseRef.current = 'opening';
    root.dataset.phase = 'opening';
    onPhaseChange?.('opening');
    sourceElement?.classList.add('is-work-snippet-source-hidden');
    onBackgroundInertChange?.(true);

    const duration = motionAllowed ? OPEN_DURATION_MS : REDUCED_DURATION_MS;
    const targetRect = surface.getBoundingClientRect();
    const sourceRect = getSourceRect(sourceElement);
    const sourceBorderRadius = getSourceBorderRadius(sourceElement);
    const transform = motionAllowed
      ? createSourceTransform(sourceRect, targetRect)
      : 'translate3d(0, 0, 0) scale(1)';
    const animations = [
      surface.animate([
        { transform, borderRadius: sourceRect ? sourceBorderRadius : 'var(--work-stage-radius)', opacity: motionAllowed ? 1 : 0 },
        { transform: 'translate3d(0, 0, 0) scale(1)', borderRadius: 'var(--work-stage-radius)', opacity: 1 },
      ], { duration, easing: STAGE_EASING, fill: 'both' }),
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: Math.min(duration, 300),
        easing: 'ease-out',
        fill: 'both',
      }),
      copy.animate([
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 0, transform: 'translateY(6px)', offset: 0.58 },
        { opacity: 1, transform: 'translateY(0)', offset: 1 },
      ], { duration, easing: STAGE_EASING, fill: 'both' }),
    ];
    animationsRef.current = animations;
    Promise.all(animations.map((animation) => animation.finished.catch(() => {}))).then(() => {
      if (phaseRef.current !== 'opening') return;
      phaseRef.current = 'open';
      root.dataset.phase = 'open';
      onPhaseChange?.('open');
      closeButtonRef.current?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimations(animationsRef.current);
      animationsRef.current = [];
      sourceElement?.classList.remove('is-work-snippet-source-hidden');
      sourceElementRef.current = null;
    };
  }, [getSourceElement, item, motionAllowed, onBackgroundInertChange, onPhaseChange]);

  useLayoutEffect(() => {
    if (open || exitStartedRef.current || !item) return;
    const root = rootRef.current;
    const surface = surfaceRef.current;
    const backdrop = backdropRef.current;
    const copy = copyRef.current;
    if (!root || !surface || !backdrop || !copy) return;
    exitStartedRef.current = true;
    phaseRef.current = 'closing';
    root.dataset.phase = 'closing';
    onPhaseChange?.('closing');
    cancelAnimations(animationsRef.current);

    const duration = motionAllowed ? CLOSE_DURATION_MS : REDUCED_DURATION_MS;
    const sourceElement = sourceElementRef.current;
    const sourceRect = getSourceRect(sourceElement);
    const sourceBorderRadius = getSourceBorderRadius(sourceElement);
    const targetRect = surface.getBoundingClientRect();
    const targetBorderRadius = getComputedStyle(surface).borderRadius
      || 'var(--work-stage-radius)';
    const transform = motionAllowed
      ? createSourceTransform(sourceRect, targetRect)
      : 'translate3d(0, 0, 0) scale(1)';
    const animations = [
      surface.animate([
        { transform: 'translate3d(0, 0, 0) scale(1)', borderRadius: targetBorderRadius, opacity: 1 },
        { transform, borderRadius: sourceBorderRadius, opacity: motionAllowed ? 1 : 0 },
      ], { duration, easing: STAGE_EASING, fill: 'both' }),
      backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: Math.min(duration, 260),
        easing: 'ease-in',
        fill: 'both',
      }),
      copy.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: Math.min(duration, 220),
        easing: 'ease-in',
        fill: 'both',
      }),
    ];
    animationsRef.current = animations;
    Promise.all(animations.map((animation) => animation.finished.catch(() => {}))).then(() => {
      if (phaseRef.current !== 'closing') return;
      phaseRef.current = 'closed';
      root.dataset.phase = 'closed';
      onPhaseChange?.('closed');
      sourceElement?.classList.remove('is-work-snippet-source-hidden');
      onBackgroundInertChange?.(false);
      onRestoreFocus?.(item.id);
      onExited?.(item.id);
    });
  }, [
    item,
    motionAllowed,
    onBackgroundInertChange,
    onExited,
    onPhaseChange,
    onRestoreFocus,
    open,
  ]);

  useEffect(() => {
    const handleKeydown = (event) => {
      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onRequestClose?.({ reason: 'escape' });
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = getFocusableElements(rootRef.current);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeydown, true);
    return () => document.removeEventListener('keydown', handleKeydown, true);
  }, [onRequestClose, open]);

  useEffect(() => () => {
    const sourceElement = sourceElementRef.current;
    sourceElement?.classList.remove('is-work-snippet-source-hidden');
    sourceElementRef.current = null;
    onBackgroundInertChange?.(false);
  }, [onBackgroundInertChange]);

  return (
    <section
      ref={rootRef}
      id="work-snippet-stage"
      className="work-snippet-stage"
      data-work-snippet-stage
      data-phase="idle"
      role="dialog"
      aria-modal="true"
      aria-labelledby="work-snippet-stage-title"
      aria-describedby="work-snippet-stage-description"
    >
      <button
        ref={backdropRef}
        type="button"
        className="work-snippet-stage__backdrop"
        aria-label="Close project"
        tabIndex={-1}
        onClick={() => onRequestClose?.({ reason: 'backdrop' })}
      />
      <div ref={surfaceRef} className="work-snippet-stage__surface">
        <div className="work-snippet-stage__media">
          <PlaygroundMedia
            item={item}
            renderMode="active"
            active
            visible
            motionAllowed={motionAllowed}
            interactive
            decorative={false}
            runtimeOwnerId={`work-stage:${item.id}`}
            onRuntimeStateChange={onRuntimeStateChange}
            onEscapeRequest={() => onRequestClose?.({ reason: 'media-escape' })}
          />
        </div>
        <div ref={copyRef} className="work-snippet-stage__copy">
          <div>
            <p className="work-snippet-stage__kind">Exploration</p>
            <h2 id="work-snippet-stage-title">{item.label}</h2>
            <p id="work-snippet-stage-description">{item.description}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="work-snippet-stage__close"
            data-playground-pan-disabled
            onClick={() => onRequestClose?.({ reason: 'button' })}
          >
            Close
          </button>
        </div>
      </div>
    </section>
  );
}
