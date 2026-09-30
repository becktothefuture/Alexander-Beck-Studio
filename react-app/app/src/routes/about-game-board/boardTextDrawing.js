import { boardTextDrawProgressAtViewportRatio } from './boardTextPresentation.js';

const round = value => Math.round(value * 100) / 100;

function measureLines(source, scrollRect, scrollTop, endingShift) {
  const sourceRect = source.getBoundingClientRect();
  const range = source.ownerDocument.createRange();
  range.selectNodeContents(source);
  const fragments = [...range.getClientRects()]
    .filter(rect => rect.width > 0.5 && rect.height > 0.5)
    .sort((a, b) => a.top - b.top || a.left - b.left);
  range.detach();
  const lines = [];
  for (const rect of fragments) {
    const previous = lines.at(-1);
    if (previous && Math.abs(previous.screenTop - rect.top) < 2) {
      previous.left = Math.min(previous.left, rect.left - sourceRect.left);
      previous.right = Math.max(previous.right, rect.right - sourceRect.left);
      previous.bottom = Math.max(previous.bottom, rect.bottom - sourceRect.top);
      continue;
    }
    lines.push({
      screenTop: rect.top,
      left: rect.left - sourceRect.left,
      right: rect.right - sourceRect.left,
      top: rect.top - sourceRect.top,
      bottom: rect.bottom - sourceRect.top,
      scrollTop: rect.top - scrollRect.top + scrollTop - endingShift,
    });
  }
  return { sourceRect, lines };
}

function clipPath(lines, scrollTop, viewportHeight, endingShift, presentation, reducedMotion) {
  const paths = [];
  for (const line of lines) {
    const ratio = (line.scrollTop + endingShift - scrollTop) / viewportHeight;
    const sampled = boardTextDrawProgressAtViewportRatio(ratio, presentation);
    const progress = reducedMotion ? Number(sampled >= 1) : sampled;
    if (progress <= 0) continue;
    const left = round(line.left - 1);
    const right = round(line.left + (line.right - line.left + 2) * progress);
    const top = round(line.top - 2);
    const bottom = round(line.bottom + 2);
    paths.push(`M${left} ${top}H${right}V${bottom}H${left}Z`);
  }
  return `path("${paths.join(' ') || 'M0 0H0V0Z'}")`;
}

/** The faint, accessible React text stays in flow. Exact visual copies are
 * clipped per measured line, so wrapping and type changes remain in sync. */
export function createBoardTextDrawLayers(groups, ending) {
  const records = [];
  for (const group of groups) {
    if (group.closest('.about-board-reader')) continue;
    const isEnding = ending.contains(group);
    for (const source of group.querySelectorAll(':scope > h1, :scope > h2, :scope > p, :scope > small')) {
      const overlay = source.cloneNode(true);
      overlay.removeAttribute('id');
      overlay.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      overlay.dataset.aboutDrawOverlay = '';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.inert = true;
      overlay.style.position = 'absolute';
      overlay.style.margin = '0';
      overlay.style.opacity = 'var(--about-board-text-focus-opacity, 1)';
      overlay.style.pointerEvents = 'none';
      overlay.style.userSelect = 'none';
      overlay.style.clipPath = 'path("M0 0H0V0Z")';
      group.append(overlay);
      records.push({ group, source, overlay, isEnding, lines: [], path: '' });
    }
  }
  return {
    measure(scrollRect, scrollTop, endingShift) {
      const measurements = records.map(record => {
        const { sourceRect, lines } = measureLines(record.source, scrollRect, scrollTop,
          record.isEnding ? endingShift : 0);
        const groupRect = record.group.getBoundingClientRect();
        return { record, sourceRect, lines, groupRect };
      });
      for (const { record, sourceRect, lines, groupRect } of measurements) {
        const { overlay } = record;
        overlay.style.left = `${sourceRect.left - groupRect.left}px`;
        overlay.style.top = `${sourceRect.top - groupRect.top}px`;
        overlay.style.width = `${sourceRect.width}px`;
        overlay.style.height = `${sourceRect.height}px`;
        record.lines = lines;
        record.path = '';
      }
    },
    draw(scrollTop, viewportHeight, endingShift, presentation, reducedMotion) {
      for (const record of records) {
        const path = clipPath(record.lines, scrollTop, viewportHeight,
          record.isEnding ? endingShift : 0, presentation, reducedMotion);
        if (path === record.path) continue;
        record.overlay.style.clipPath = path;
        record.path = path;
      }
    },
    dispose() {
      for (const { overlay } of records) overlay.remove();
    },
  };
}
