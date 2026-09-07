import { useLayoutEffect, useRef } from 'react';

let measurementContext;

// Reserve resting width while tracking changes; center the painted letters,
// including descenders, rather than the font's invisible line-box padding.
export function ActionLabel({ children }) {
  const labelRef = useRef(null);

  useLayoutEffect(() => {
    const label = labelRef.current;
    const text = label.firstElementChild;
    const trimsCapHeight = CSS.supports('text-box-trim', 'trim-both');
    let disposed = false;
    const alignInk = () => {
      if (disposed) return;
      measurementContext ||= document.createElement('canvas').getContext('2d');
      if (!measurementContext) return;
      const style = getComputedStyle(text);
      measurementContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const value = style.textTransform === 'uppercase'
        ? text.textContent.toUpperCase() : text.textContent;
      const metrics = measurementContext.measureText(value);
      // Computed height is unscaled, including when a font finishes loading
      // while the button is held down.
      const height = Number.parseFloat(style.height);
      const baseline = trimsCapHeight
        ? height
        : (height + metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2;
      const inkCenter = baseline - (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
      const offset = height / 2 - inkCenter;
      if (Number.isFinite(offset)) label.style.setProperty('--abs-action-label-optical-y', `${offset}px`);
    };
    alignInk();
    document.fonts.ready.then(alignInk);
    document.fonts.addEventListener('loadingdone', alignInk);
    const observer = new ResizeObserver(alignInk);
    observer.observe(label);
    return () => {
      disposed = true;
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', alignInk);
    };
  }, [children]);

  return (
    <span ref={labelRef} className="abs-action-label" data-label={children}>
      <span>{children}</span>
    </span>
  );
}
