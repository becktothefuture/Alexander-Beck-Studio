/** Fit the complete invitation, measured once per layout rather than per frame.
 * Corners of each actual text/action box avoid inflating the circle to the width
 * of an otherwise empty support container. Coordinates are viewport-local CSS px. */
export function measureRollercoasterEndingCircle(boxes) {
  const visible = boxes.filter(box => box.right > box.left && box.bottom > box.top);
  if (!visible.length) return null;
  const left = Math.min(...visible.map(box => box.left));
  const right = Math.max(...visible.map(box => box.right));
  const top = Math.min(...visible.map(box => box.top));
  const bottom = Math.max(...visible.map(box => box.bottom));
  const x = (left + right) / 2, y = (top + bottom) / 2;
  let radius = 0;
  for (const box of visible) {
    radius = Math.max(radius, Math.hypot(Math.max(x - box.left, box.right - x),
      Math.max(y - box.top, box.bottom - y)));
  }
  return { x, y, radius };
}

/** Board-only reveal: shrink each circle at its existing anchor. The centre
 * clears first, with a bounded radial stagger; reversing scroll restores it. */
export function rollercoasterOpeningScale(normalizedDistance, reveal) {
  if (normalizedDistance >= 1 || reveal < 0) return 1;
  const delay = Math.max(0, normalizedDistance) * 0.4;
  const t = Math.max(0, Math.min(1, (reveal - delay) / (1 - delay)));
  return 1 - t * t * (3 - 2 * t);
}

/** Never make the organic opening smaller than the measured safe circle. */
export const ROLLERCOASTER_OPENING_GLSL = `
  float openingRadiusFactor(vec2 delta) {
    float angle = atan(delta.y, delta.x);
    return 1.045 + sin(angle * 3.0 + 0.4) * 0.026
      + sin(angle * 5.0 - 0.7) * 0.018;
  }
  float openingCircleScale(float normalizedDistance, float reveal) {
    if (normalizedDistance >= 1.0 || reveal < 0.0) return 1.0;
    float delay = max(0.0, normalizedDistance) * 0.4;
    float t = clamp((reveal - delay) / (1.0 - delay), 0.0, 1.0);
    return 1.0 - t * t * (3.0 - 2.0 * t);
  }
  float openingOrganicDistance(vec2 delta, vec2 halfSize, float seed) {
    vec2 normalized = abs(delta) / max(halfSize, vec2(0.001));
    float shape = pow(pow(normalized.x, 6.0) + pow(normalized.y, 6.0), 1.0 / 6.0);
    float angle = atan(delta.y, delta.x);
    float irregularity = 0.13 * sin(angle * 3.0 + 0.7)
      + 0.09 * sin(angle * 7.0 - 0.9) + 0.07 * sin(angle * 13.0 + seed * 6.28318);
    float edge = 1.27 + irregularity * smoothstep(0.72, 1.2, shape / 1.27);
    return shape / edge;
  }
  float openingOrganicScale(float distance, float reveal, float seed) {
    if (distance >= 1.0 || reveal < 0.0) return 1.0;
    float delay = 0.27 * distance + 0.1 * seed;
    float t = clamp((reveal - delay) / (1.0 - delay), 0.0, 1.0);
    if (seed > 0.68) {
      float swell = 1.0 + 0.7 * sin(3.14159 * min(1.0, t / 0.76));
      return swell * (1.0 - smoothstep(0.52, 1.0, t));
    }
    return 1.0 - smoothstep(0.0, 1.0, t);
  }
`;
