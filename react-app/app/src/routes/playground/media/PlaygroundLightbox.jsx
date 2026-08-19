import { useCallback, useEffect, useId, useRef } from 'react';
import { getPlaygroundMediaStyle } from './mediaPresentation.js';
import { PlaygroundMedia } from './PlaygroundMedia.jsx';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe:not([tabindex="-1"])',
  'video[controls]:not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

function getFocusableElements(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => (
    !element.hasAttribute('hidden')
    && element.getAttribute('aria-hidden') !== 'true'
    && !element.closest('[inert]')
  ));
}

/**
 * Controlled, route-scoped dialog contract:
 * - onRequestClose({ itemId, returnFocusId, reason }) asks the route to clear selection.
 * - onBackgroundInertChange(isInert, { itemId }) lets the route own world inert state.
 * - onRestoreFocus(returnFocusId, { itemId, reason }) restores the exact logical item.
 */
export function PlaygroundLightbox({
  item,
  returnFocusId,
  onRequestClose,
  onBackgroundInertChange,
  onRestoreFocus,
  closeOnMediaShell = true,
  motionAllowed = true,
  onRuntimeStateChange,
}) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const closeReasonRef = useRef('programmatic');
  const restoreFrameRef = useRef(0);
  const requestCloseRef = useRef(onRequestClose);
  const inertChangeRef = useRef(onBackgroundInertChange);
  const restoreFocusRef = useRef(onRestoreFocus);
  const reactId = useId();
  const closeInstructionId = `playground-lightbox-close-instruction-${reactId}`;
  const selectedItemId = item?.id;

  useEffect(() => {
    requestCloseRef.current = onRequestClose;
    inertChangeRef.current = onBackgroundInertChange;
    restoreFocusRef.current = onRestoreFocus;
  }, [onBackgroundInertChange, onRequestClose, onRestoreFocus]);

  const requestClose = useCallback((reason) => {
    if (!item) return;
    closeReasonRef.current = reason;
    requestCloseRef.current?.({
      itemId: item.id,
      returnFocusId: returnFocusId || item.id,
      reason,
    });
  }, [item, returnFocusId]);

  useEffect(() => {
    if (!selectedItemId) return undefined;
    const itemId = selectedItemId;
    const exactReturnFocusId = returnFocusId || itemId;
    closeReasonRef.current = 'programmatic';
    if (restoreFrameRef.current) cancelAnimationFrame(restoreFrameRef.current);
    inertChangeRef.current?.(true, { itemId });

    const focusFrame = requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(focusFrame);
      inertChangeRef.current?.(false, { itemId });
      const reason = closeReasonRef.current;
      restoreFrameRef.current = requestAnimationFrame(() => {
        restoreFrameRef.current = 0;
        restoreFocusRef.current?.(exactReturnFocusId, { itemId, reason });
      });
    };
  }, [selectedItemId, returnFocusId]);

  useEffect(() => () => {
    if (restoreFrameRef.current) cancelAnimationFrame(restoreFrameRef.current);
  }, []);

  useEffect(() => {
    if (!item) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose('escape');
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      const focusable = getFocusableElements(dialog);
      if (!focusable.length) {
        event.preventDefault();
        dialog?.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || !dialog?.contains(activeElement))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (activeElement === last || !dialog?.contains(activeElement))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    const handleFocusIn = (event) => {
      if (dialogRef.current?.contains(event.target)) return;
      closeButtonRef.current?.focus({ preventScroll: true });
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, [item, requestClose]);

  if (!item) return null;

  return (
    <div
      ref={dialogRef}
      className="playground-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.label} preview`}
      aria-describedby={closeInstructionId}
      data-media-type={item.type}
      data-phase="open"
      tabIndex={-1}
    >
      <div
        className="playground-lightbox__backdrop"
        onClick={(event) => {
          if (event.target === event.currentTarget) requestClose('backdrop');
        }}
      >
        <section className="playground-lightbox__surface playground-lightbox__dialog">
          <button
            ref={closeButtonRef}
            type="button"
            className="playground-lightbox__close abs-icon-btn abs-circular-utility"
            aria-label={`Close ${item.label}`}
            data-sound-action="manual"
            data-sound-source="lab-project-close"
            onClick={() => requestClose('close-control')}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M6.22 4.93 12 10.71l5.78-5.78 1.29 1.29L13.29 12l5.78 5.78-1.29 1.29L12 13.29l-5.78 5.78-1.29-1.29L10.71 12 4.93 6.22z"
              />
            </svg>
          </button>

          <div
            className="playground-lightbox__media-shell"
            style={getPlaygroundMediaStyle(item)}
            onClick={(event) => {
              const closeFromMedia = item.type === 'image'
                || event.target === event.currentTarget;
              if (closeOnMediaShell && closeFromMedia) {
                requestClose('media-shell');
              }
            }}
          >
            <PlaygroundMedia
              item={item}
              renderMode="active"
              active
              visible
              motionAllowed={motionAllowed}
              interactive
              decorative={false}
              className="playground-lightbox__media"
              runtimeOwnerId={`lightbox:${item.id}`}
              onRuntimeStateChange={onRuntimeStateChange}
              onEscapeRequest={() => requestClose('escape')}
            />
          </div>

          <p id={closeInstructionId} className="playground-sr-instructions">
            Press Escape or use Close to return to the selected item.
          </p>
        </section>
      </div>
    </div>
  );
}
