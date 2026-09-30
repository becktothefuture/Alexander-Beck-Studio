/** Physics advances the whole machine; the DOM only needs its visible pose.
 * Updating distant SVG transforms otherwise invalidates the very tall drawing
 * on every frame, even while the visitor is only looking at the reservoir. */
export function createBoardArtwork(svg, originY = 0) {
  const entries = new Map();
  let top = -Infinity;
  let bottom = Infinity;
  let viewportKey = '';
  let viewportUpdates = 0;
  let stripOriginCssPx = 0;
  let stripHeightCssPx = 0;
  const originalViewBox = svg.getAttribute?.('viewBox');
  const originalStyle = svg.getAttribute?.('style');
  return {
    setVisibleRange(nextTop, nextBottom, pixelsPerUnit) {
      if (!Number.isFinite(nextTop) || !Number.isFinite(nextBottom)
        || (pixelsPerUnit !== undefined && (!Number.isFinite(pixelsPerUnit) || pixelsPerUnit <= 0))) return;
      top = nextTop;
      bottom = nextBottom;
      if (Number.isFinite(pixelsPerUnit)) {
        // The caller passes the exact overscanned range returned by the ball
        // renderer. Both strips therefore keep one world/CSS origin and move
        // together through native scrolling, including compositor flings.
        const start = Math.max(originY, top);
        const height = Math.max(1, bottom - start);
        const nextOriginCssPx = (start - originY) * pixelsPerUnit;
        const nextHeightCssPx = height * pixelsPerUnit;
        const nextViewportKey = `${start}:${height}:${pixelsPerUnit}`;
        if (nextViewportKey === viewportKey) return;
        viewportKey = nextViewportKey;
        viewportUpdates += 1;
        stripOriginCssPx = nextOriginCssPx;
        stripHeightCssPx = nextHeightCssPx;
        svg.setAttribute('viewBox', `0 ${start} 960 ${height}`);
        svg.style.position = 'absolute';
        svg.style.top = `${nextOriginCssPx}px`;
        svg.style.height = `${nextHeightCssPx}px`;
        svg.style.overflow = 'hidden';
      }
    },
    // SVG pivots may be local to a translated group. Culling always uses the
    // mechanism's board-space centre, never that local transform coordinate.
    rotate(id, angle, pivot, reach = 400, worldY = pivot[1]) {
      if (worldY + reach < top || worldY - reach > bottom) return;
      let entry = entries.get(id);
      if (!entry) {
        const element = svg.querySelector(`#${id}`);
        if (!element) return;
        entry = { element, transform: undefined,
          offsetY: Number(element.closest?.('[data-quiet-offset]')?.dataset.quietOffset) || 0,
          original: element.getAttribute?.('transform') ?? null };
        entries.set(id, entry);
      }
      const transform = Math.abs(angle) < .0001 ? null
        : `rotate(${angle * 180 / Math.PI} ${pivot[0]} ${pivot[1] - entry.offsetY})`;
      if (entry.transform === transform) return;
      if (transform === null) entry.element.removeAttribute('transform');
      else entry.element.setAttribute('transform', transform);
      entry.transform = transform;
    },
    inspect() {
      return { top, bottom, stripOriginCssPx, stripHeightCssPx, viewportUpdates };
    },
    dispose() {
      for (const { element, original } of entries.values()) {
        if (original === null) element.removeAttribute('transform');
        else element.setAttribute('transform', original);
      }
      if (originalViewBox !== null) svg.setAttribute('viewBox', originalViewBox);
      if (originalStyle === null) svg.removeAttribute('style');
      else svg.setAttribute('style', originalStyle);
      entries.clear();
      viewportKey = '';
    },
  };
}
