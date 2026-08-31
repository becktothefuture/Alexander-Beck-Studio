import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { getViewportCoverMode } from './viewportGuard.js';
import './viewport-cover.css';

function readViewport() {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0, mode: null };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  return {
    width,
    height,
    mode: getViewportCoverMode(width, height),
    finePointer: window.matchMedia('(pointer: fine)').matches,
  };
}

function useViewportGuard() {
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    let frameId = 0;
    const update = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        setViewport(readViewport());
      });
    };

    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    const pointerQuery = window.matchMedia('(pointer: fine)');
    pointerQuery.addEventListener('change', update);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      pointerQuery.removeEventListener('change', update);
    };
  }, []);

  return viewport;
}

export function ViewportCover({ allowFinePointer = false }) {
  const viewport = useViewportGuard();
  const headingRef = useRef(null);
  // About supports desktop text reflow at small CSS viewport sizes. Keep the
  // existing short-landscape cover on touch devices and on every other route.
  // DPR cannot distinguish browser zoom from a retina display.
  const supportsTextReflow = allowFinePointer && viewport.finePointer
    && ['short', 'mobile-landscape'].includes(viewport.mode);
  const isActive = Boolean(viewport.mode) && !supportsTextReflow;

  useLayoutEffect(() => {
    if (!isActive) return undefined;

    const root = document.getElementById('root');
    document.documentElement.dataset.absViewportCover = 'active';

    let rootObserver;
    if (root) {
      const enforceCoveredRoot = () => {
        root.dataset.absViewportCoverInert = 'true';
        if (!root.hasAttribute('inert')) root.setAttribute('inert', '');
        if (root.getAttribute('aria-hidden') !== 'true') root.setAttribute('aria-hidden', 'true');
      };
      enforceCoveredRoot();
      rootObserver = new MutationObserver(enforceCoveredRoot);
      rootObserver.observe(root, {
        attributes: true,
        attributeFilter: ['inert', 'aria-hidden'],
      });
    }

    if (root?.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    headingRef.current?.focus({ preventScroll: true });

    return () => {
      rootObserver?.disconnect();
      delete document.documentElement.dataset.absViewportCover;
      if (!root) return;
      delete root.dataset.absViewportCoverInert;
      if (document.documentElement.dataset.absBootState === 'booting') {
        root.setAttribute('inert', '');
        root.setAttribute('aria-hidden', 'true');
      } else {
        root.removeAttribute('inert');
        root.removeAttribute('aria-hidden');
      }
    };
  }, [isActive]);

  if (!isActive || typeof document === 'undefined') return null;

  return createPortal(
    <section
      className="viewport-cover"
      data-viewport-mode={viewport.mode}
      role="dialog"
      aria-modal="true"
      aria-labelledby="viewport-cover-title"
      aria-describedby="viewport-cover-description"
    >
      <main className="viewport-cover__message">
        <h1
          id="viewport-cover-title"
          ref={headingRef}
          className="viewport-cover__title"
          tabIndex="-1"
        >
          Bit of a Squeeze.
        </h1>
        <p id="viewport-cover-description" className="viewport-cover__instruction">
          Resize this window or rotate your device to continue.
        </p>
      </main>
    </section>,
    document.body,
  );
}
