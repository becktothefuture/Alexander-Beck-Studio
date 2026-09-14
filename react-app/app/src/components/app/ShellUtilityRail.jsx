import { useId, useLayoutEffect, useRef } from 'react';
import { ShellUtilityControls } from './ShellUtilityControls.jsx';
import './shell-utility-rail.css';

export function ShellUtilityRail() {
  const railRef = useRef(null);
  const contourRef = useRef(null);
  const lightFilterId = useId();

  useLayoutEffect(() => {
    const rail = railRef.current;
    const scene = rail.closest('.app-scene');
    const surface = scene.querySelector('#simulations');
    let frame = 0;
    let previousPath = '';
    let railShift = 0;

    const updateContour = () => {
      frame = 0;
      const windowRect = surface.getBoundingClientRect();
      const railRect = rail.getBoundingClientRect();
      const { width, height } = windowRect;
      if (!width || !height) return;

      // Two tangent cubic curves form each shoulder. The middle tangent is
      // horizontal; the ends meet the vertical window/rail without a kink.
      const depth = Math.max(0, windowRect.right - railRect.left);
      const left = width - depth;
      const middle = width - depth / 2;
      const radius = Math.min(parseFloat(getComputedStyle(surface).borderTopRightRadius) || 0, height / 2);
      const requestedTop = railRect.top - windowRect.top - railShift;
      const railStyle = getComputedStyle(rail);
      const cornerRadius = Math.max(0, parseFloat(railStyle.getPropertyValue('--utility-rail-effective-corner-radius')) || 0);
      const softness = parseFloat(railStyle.getPropertyValue('--surface-edge-softness'));
      contourRef.current.querySelector('feGaussianBlur').setAttribute('stdDeviation',
        2 * (Number.isFinite(softness) ? Math.max(0, softness) : 1));
      const clearance = Math.min(radius + cornerRadius, Math.max(0, (height - railRect.height) / 2));
      const top = Math.max(clearance, Math.min(requestedTop, height - clearance - railRect.height));
      railShift = top - requestedTop;
      rail.style.setProperty('--utility-rail-contour-shift', `${railShift}px`);
      const bottom = top + railRect.height;
      const shoulder = Math.max(0, Math.min(cornerRadius, railRect.height / 2, top, height - bottom));
      const start = top - shoulder;
      const end = bottom + shoulder;
      const curve = `C ${width} ${start + shoulder * 0.8} ${middle + depth * 0.3} ${top} ${middle} ${top}
        C ${middle - depth * 0.3} ${top} ${left} ${top + shoulder * 0.2} ${left} ${top + shoulder}
        V ${bottom - shoulder}
        C ${left} ${bottom - shoulder * 0.2} ${middle - depth * 0.3} ${bottom} ${middle} ${bottom}
        C ${middle + depth * 0.3} ${bottom} ${width} ${end - shoulder * 0.8} ${width} ${end}`;
      const path = `M 0 0 H ${width} V ${start} ${curve} V ${height} H 0 Z`;
      if (path !== previousPath) {
        scene.style.setProperty('--utility-window-clip', `path('${path.replace(/\s+/g, ' ')}')`);
        const contour = contourRef.current;
        const fadeStart = Math.max(0, start - 32);
        const fadeEnd = Math.min(height, end + 32);
        const outerRight = width + windowRect.left;
        contour.setAttribute('viewBox', `0 0 ${outerRight} ${height}`);
        contour.style.cssText = `left:${windowRect.left}px;top:${windowRect.top}px;width:${outerRight}px;height:${height}px;--contour-fade-start:${fadeStart}px;--contour-start:${start}px;--contour-end:${end}px;--contour-fade-end:${fadeEnd}px`;
        contour.querySelector('.shell-window-contour__surface').setAttribute('d',
          `M ${width} ${fadeStart} V ${start} ${curve} V ${fadeEnd} H ${outerRight} V ${fadeStart} Z`);
        contour.querySelector('.shell-window-contour__light').setAttribute('d',
          `M ${width} ${fadeStart} V ${start} ${curve} V ${fadeEnd}`);
        previousPath = path;
      }
      scene.dataset.utilityContour = 'ready';
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(updateContour);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(surface);
    resize.observe(rail);
    // Authored rail/frame controls update root tokens without always resizing.
    const tokens = new MutationObserver(schedule);
    tokens.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
    window.addEventListener('resize', schedule);
    updateContour();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      tokens.disconnect();
      window.removeEventListener('resize', schedule);
      rail.style.removeProperty('--utility-rail-contour-shift');
      scene.style.removeProperty('--utility-window-clip');
      delete scene.dataset.utilityContour;
    };
  }, []);

  return (
    <>
      <svg ref={contourRef} className="shell-window-contour" aria-hidden="true" focusable="false">
        <defs>
          <filter id={lightFilterId} x="-50%" y="-20%" width="200%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>
        <path className="shell-window-contour__surface" />
        <path className="shell-window-contour__light" filter={`url(#${lightFilterId})`} />
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
