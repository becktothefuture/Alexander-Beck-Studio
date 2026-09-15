import { useId, useLayoutEffect, useRef } from 'react';
import { ShellUtilityControls } from './ShellUtilityControls.jsx';
import './shell-utility-rail.css';

// Use the window's resolved shadow values, including theme interpolation and
// fine tuning, so the curved segment cannot develop a separate material.
function readShadows(value) {
  return value.split(/,(?![^()]*\))/).flatMap(shadow => {
    const dimensions = shadow.match(/(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(-?[\d.]+)px/);
    return dimensions ? [{
      x: Number(dimensions[1]), y: Number(dimensions[2]),
      blur: Number(dimensions[3]) / 2, spread: Math.max(0, Number(dimensions[4])),
      color: shadow.replace(dimensions[0], '').replace('inset', '').trim(),
    }] : [];
  });
}

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
    const contour = contourRef.current;
    const filters = [...contour.querySelectorAll('filter')];

    const updateFinish = () => {
      const shadows = readShadows(getComputedStyle(scene, '::before').boxShadow);
      filters.forEach((filter, index) => {
        const shadow = shadows[index];
        if (!shadow) return;
        filter.querySelector('feMorphology').setAttribute('radius', shadow.spread);
        filter.querySelector('feGaussianBlur').setAttribute('stdDeviation', shadow.blur);
        filter.querySelector('feOffset').setAttribute('dx', shadow.x);
        filter.querySelector('feOffset').setAttribute('dy', shadow.y);
        filter.querySelector('feFlood').setAttribute('flood-color', shadow.color);
      });
      return shadows;
    };

    const updateContour = () => {
      frame = 0;
      const shadows = updateFinish();
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
      const clearance = Math.min(radius + cornerRadius, Math.max(0, (height - railRect.height) / 2));
      const top = Math.max(clearance, Math.min(requestedTop, height - clearance - railRect.height));
      railShift = top - requestedTop;
      rail.style.setProperty('--utility-rail-contour-shift', `${railShift}px`);
      const bottom = top + railRect.height;
      const shoulder = Math.max(0, Math.min(cornerRadius, railRect.height / 2, top, height - bottom));
      const start = top - shoulder;
      const end = bottom + shoulder;
      const fadeStart = Math.max(0, start - 32);
      const fadeEnd = Math.min(height, end + 32);
      filters.forEach((filter, index) => {
        const shadow = shadows[index];
        if (!shadow) return;
        const reach = shadow.spread + shadow.blur * 3 + Math.max(Math.abs(shadow.x), Math.abs(shadow.y));
        filter.setAttribute('x', left - reach);
        filter.setAttribute('y', fadeStart - reach);
        filter.setAttribute('width', depth + reach * 2);
        filter.setAttribute('height', fadeEnd - fadeStart + reach * 2);
      });
      const curve = `C ${width} ${start + shoulder * 0.8} ${middle + depth * 0.3} ${top} ${middle} ${top}
        C ${middle - depth * 0.3} ${top} ${left} ${top + shoulder * 0.2} ${left} ${top + shoulder}
        V ${bottom - shoulder}
        C ${left} ${bottom - shoulder * 0.2} ${middle - depth * 0.3} ${bottom} ${middle} ${bottom}
        C ${middle + depth * 0.3} ${bottom} ${width} ${end - shoulder * 0.8} ${width} ${end}`;
      const path = `M 0 0 H ${width} V ${start} ${curve} V ${height} H 0 Z`;
      if (path !== previousPath) {
        scene.style.setProperty('--utility-window-clip', `path('${path.replace(/\s+/g, ' ')}')`);
        const outerRight = width + windowRect.left;
        contour.setAttribute('viewBox', `0 0 ${outerRight} ${height}`);
        contour.style.cssText = `left:${windowRect.left}px;top:${windowRect.top}px;width:${outerRight}px;height:${height}px;--contour-fade-start:${fadeStart}px;--contour-start:${start}px;--contour-end:${end}px;--contour-fade-end:${fadeEnd}px`;
        contour.querySelector('.shell-window-contour__surface').setAttribute('d',
          `M ${width} ${fadeStart} V ${start} ${curve} V ${fadeEnd} H ${outerRight} V ${fadeStart} Z`);
        // A filled half-plane produces the same soft falloff as a box shadow;
        // blurring a thin stroke instead creates an unrelated bright seam.
        contour.querySelectorAll('.shell-window-contour__light').forEach(light => {
          light.setAttribute('d', `M -1024 -1024 H ${width} V ${start} ${curve} V ${height + 1024} H -1024 Z`);
        });
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
