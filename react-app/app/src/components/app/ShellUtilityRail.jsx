import { useId, useLayoutEffect, useRef } from 'react';
import { ShellUtilityControls } from './ShellUtilityControls.jsx';
import { observeShellWindowContour } from './shell-window-contour.js';
import './shell-utility-rail.css';

export function ShellUtilityRail() {
  const railRef = useRef(null);
  const contourRef = useRef(null);
  const lightFilterId = useId();

  useLayoutEffect(() => {
    const rail = railRef.current;
    const scene = rail.closest('.app-scene');
    return observeShellWindowContour({
      rail,
      contour: contourRef.current,
      scene,
      surface: scene.querySelector('#simulations'),
      menu: document.querySelector('.button-bar'),
    });
  }, []);

  return (
    <>
      <svg ref={contourRef} className="shell-window-contour" aria-hidden="true" focusable="false">
        <defs>
          {[0, 1, 2].map(index => (
            <filter key={index} id={`${lightFilterId}-${index}`} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feMorphology in="SourceAlpha" operator="dilate" radius="0" />
              <feGaussianBlur stdDeviation="0" />
              <feOffset result="shadow" />
              <feFlood />
              <feComposite in2="shadow" operator="in" />
            </filter>
          ))}
        </defs>
        <path className="shell-window-contour__surface" />
        {[2, 1, 0].map(index => <path key={index} className="shell-window-contour__light" filter={`url(#${lightFilterId}-${index})`} />)}
      </svg>
      <div
        ref={railRef}
        className="shell-utility-rail"
        data-shell-utility-rail
      >
        <ShellUtilityControls />
        <div id="shell-route-utility-slot" className="shell-route-utility-slot" />
      </div>
    </>
  );
}
