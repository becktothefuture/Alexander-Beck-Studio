/** One line weight for the authored SVG, runtime fixtures and Canvas sockets. */
export const BOARD_ARCHITECTURE_LINE_SCALE = 1 / 3;

export function installBoardArchitectureLineWeight(svg) {
  const originals = [];
  for (const element of svg.querySelectorAll('#Geometry [stroke-width]')) {
    const value = Number(element.getAttribute('stroke-width'));
    if (!Number.isFinite(value) || value <= 0) continue;
    originals.push([element, element.getAttribute('stroke-width')]);
    element.setAttribute('stroke-width', String(value * BOARD_ARCHITECTURE_LINE_SCALE));
  }
  return () => {
    for (const [element, value] of originals) element.setAttribute('stroke-width', value);
  };
}
