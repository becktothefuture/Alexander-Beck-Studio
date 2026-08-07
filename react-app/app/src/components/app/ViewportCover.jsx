import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { getExtremeViewportMode } from './viewportGuard.js';
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
    mode: getExtremeViewportMode(width, height),
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
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return viewport;
}

export function ViewportCover() {
  const viewport = useViewportGuard();
  const headingRef = useRef(null);
  const isActive = Boolean(viewport.mode);

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
          Give the canvas<br />a little more room.
        </h1>
        <p id="viewport-cover-description" className="viewport-cover__instruction">
          Resize this window or rotate your device to continue.
        </p>
      </main>
    </section>,
    document.body,
  );
}
