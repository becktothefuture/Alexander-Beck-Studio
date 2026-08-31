import { useEffect, useLayoutEffect, useRef } from 'react';
import { fitMediaSize, getMediaExpansionFrame } from '../../../lib/motion/media-expansion.js';
import { PlaygroundMedia } from '../../playground/media/PlaygroundMedia.jsx';

const STAGE_EASING = 'cubic-bezier(0.22, 0, 0.16, 1)';
const OPEN_DURATION_MS = 460;
const CLOSE_DURATION_MS = 340;
const REDUCED_DURATION_MS = 120;

function sourceMedia(element) {
  return element?.querySelector?.('.playground-media') || element;
}

function getFocusableElements(root) {
  return Array.from(root?.querySelectorAll(
    'button:not([disabled]), [href], video[controls], iframe, [tabindex]:not([tabindex="-1"])',
  ) || []).filter((element) => !element.hidden && element.tabIndex !== -1);
}

function cancelAnimations(animations) {
  animations.forEach((animation) => animation.cancel());
}

export function WorkSnippetStage({
  item, open, getSourceElement, motionAllowed, onRequestClose,
  onBackgroundInertChange, onRestoreFocus, onExited, onPhaseChange, onRuntimeStateChange,
}) {
  const rootRef = useRef(null);
  const surfaceRef = useRef(null);
  const mediaRef = useRef(null);
  const backdropRef = useRef(null);
  const copyRef = useRef(null);
  const closeButtonRef = useRef(null);
  const sourceElementRef = useRef(null);
  const animationsRef = useRef([]);
  const phaseRef = useRef('idle');
  const generationRef = useRef(0);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const surface = surfaceRef.current;
    const media = mediaRef.current;
    const backdrop = backdropRef.current;
    const copy = copyRef.current;
    if (!root || !surface || !media || !backdrop || !copy || !item) return undefined;
    const generation = ++generationRef.current;
    const sourceElement = getSourceElement?.(item.id);
    const source = sourceMedia(sourceElement);
    sourceElementRef.current = sourceElement;
    const ratio = item.intrinsicDimensions.width / item.intrinsicDimensions.height;
    const layout = () => {
      copy.style.maxInlineSize = `${Math.min(surface.clientWidth, 480)}px`;
      const gap = Number.parseFloat(getComputedStyle(surface).rowGap) || 16;
      const size = fitMediaSize(surface.clientWidth,
        surface.clientHeight - copy.getBoundingClientRect().height - gap, ratio);
      media.style.inlineSize = `${size.width}px`;
      media.style.blockSize = `${size.height}px`;
    };
    layout();
    const targetRect = media.getBoundingClientRect();
    const sourceRect = source?.getBoundingClientRect();
    const sourceRadius = source ? Number.parseFloat(getComputedStyle(source).borderRadius) : 0;
    const targetRadius = Number.parseFloat(getComputedStyle(media).borderRadius) || 0;
    const from = getMediaExpansionFrame(sourceRect, targetRect, sourceRadius);
    const duration = motionAllowed ? OPEN_DURATION_MS : REDUCED_DURATION_MS;
    const options = { duration, easing: STAGE_EASING, fill: 'both' };
    phaseRef.current = 'opening';
    root.dataset.phase = 'opening';
    onPhaseChange?.('opening');
    sourceElement?.classList.add('is-work-snippet-source-hidden');
    closeButtonRef.current?.focus({ preventScroll: true });
    onBackgroundInertChange?.(true);
    animationsRef.current = [
      media.animate([
        motionAllowed ? { transform: from.transform, clipPath: from.clipPath, opacity: 1 }
          : { opacity: 0 },
        { transform: 'none', clipPath: `inset(0px round ${targetRadius}px)`, opacity: 1 },
      ], options),
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { ...options, duration: Math.min(220, duration) }),
      copy.animate([{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }], options),
    ];
    const finishOpen = () => {
      if (generation !== generationRef.current || phaseRef.current !== 'opening') return;
      cancelAnimations(animationsRef.current);
      animationsRef.current = [];
      phaseRef.current = 'open';
      root.dataset.phase = 'open';
      onPhaseChange?.('open');
    };
    Promise.all(animationsRef.current.map((animation) => animation.finished.catch(() => {})))
      .then(finishOpen);
    let measuredWidth = surface.clientWidth;
    let measuredHeight = surface.clientHeight;
    const observer = new ResizeObserver(() => {
      if (surface.clientWidth === measuredWidth && surface.clientHeight === measuredHeight) return;
      measuredWidth = surface.clientWidth;
      measuredHeight = surface.clientHeight;
      // Resizing is a layout event, never a second opening transaction.
      finishOpen();
      layout();
    });
    observer.observe(surface);
    return () => {
      generationRef.current += 1;
      observer.disconnect();
      cancelAnimations(animationsRef.current);
      animationsRef.current = [];
      sourceElement?.classList.remove('is-work-snippet-source-hidden');
    };
  }, [getSourceElement, item, motionAllowed, onBackgroundInertChange, onPhaseChange]);

  useLayoutEffect(() => {
    if (open || phaseRef.current === 'closing' || !item) return;
    const root = rootRef.current;
    const media = mediaRef.current;
    const backdrop = backdropRef.current;
    const copy = copyRef.current;
    if (!root || !media || !backdrop || !copy) return;
    const generation = ++generationRef.current;
    const style = getComputedStyle(media);
    const from = { transform: style.transform, clipPath: style.clipPath, opacity: style.opacity };
    const backdropOpacity = getComputedStyle(backdrop).opacity;
    const copyOpacity = getComputedStyle(copy).opacity;
    phaseRef.current = 'closing';
    root.dataset.phase = 'closing';
    onPhaseChange?.('closing');
    cancelAnimations(animationsRef.current);
    const sourceElement = sourceElementRef.current;
    const source = sourceMedia(sourceElement);
    const radius = source ? Number.parseFloat(getComputedStyle(source).borderRadius) : 0;
    const to = getMediaExpansionFrame(source?.getBoundingClientRect(), media.getBoundingClientRect(), radius);
    const duration = motionAllowed ? CLOSE_DURATION_MS : REDUCED_DURATION_MS;
    const options = { duration, easing: STAGE_EASING, fill: 'both' };
    animationsRef.current = [
      media.animate([from, motionAllowed
        ? { transform: to.transform, clipPath: to.clipPath, opacity: 1 }
        : { ...from, opacity: 0 }], options),
      backdrop.animate([{ opacity: backdropOpacity }, { opacity: 0 }], options),
      copy.animate([{ opacity: copyOpacity }, { opacity: 0 }], { ...options, duration: Math.min(160, duration) }),
    ];
    Promise.all(animationsRef.current.map((animation) => animation.finished.catch(() => {})))
      .then(() => {
        if (generation !== generationRef.current || phaseRef.current !== 'closing') return;
        phaseRef.current = 'closed';
        root.dataset.phase = 'closed';
        onPhaseChange?.('closed');
        sourceElement?.classList.remove('is-work-snippet-source-hidden');
        onBackgroundInertChange?.(false);
        onRestoreFocus?.(item.id);
        onExited?.(item.id);
      });
  }, [item, motionAllowed, onBackgroundInertChange, onExited, onPhaseChange, onRestoreFocus, open]);

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
      const first = focusables[0];
      const last = focusables.at(-1);
      if (!first) return;
      if (event.shiftKey && (document.activeElement === first || !rootRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !rootRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeydown, true);
    return () => document.removeEventListener('keydown', handleKeydown, true);
  }, [onRequestClose, open]);

  useEffect(() => () => {
    sourceElementRef.current?.classList.remove('is-work-snippet-source-hidden');
    onBackgroundInertChange?.(false);
  }, [onBackgroundInertChange]);

  return (
    <section ref={rootRef} id="work-snippet-stage" className="work-snippet-stage"
      data-work-snippet-stage data-phase="idle" role="dialog" aria-modal="true"
      aria-labelledby="work-snippet-stage-title" aria-describedby="work-snippet-stage-description"
      data-playground-pan-disabled>
      <button ref={backdropRef} type="button" className="work-snippet-stage__backdrop"
        aria-label="Close project" tabIndex={-1}
        onClick={() => onRequestClose?.({ reason: 'backdrop' })} />
      <button ref={closeButtonRef} type="button" className="work-snippet-stage__close abs-circular-utility abs-icon-btn"
        aria-label="Close project" onClick={() => onRequestClose?.({ reason: 'button' })}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
      </button>
      <div ref={surfaceRef} className="work-snippet-stage__surface">
        <div ref={mediaRef} className="work-snippet-stage__media">
          <PlaygroundMedia item={item} renderMode="active" active visible motionAllowed={motionAllowed}
            interactive decorative={false} runtimeOwnerId={`work-stage:${item.id}`}
            onRuntimeStateChange={onRuntimeStateChange}
            onEscapeRequest={() => onRequestClose?.({ reason: 'media-escape' })} />
        </div>
        <div ref={copyRef} className="work-snippet-stage__copy">
          <h2 id="work-snippet-stage-title" className="playground-sr-instructions">{item.label}</h2>
          <p id="work-snippet-stage-description">{item.description}</p>
        </div>
      </div>
    </section>
  );
}
