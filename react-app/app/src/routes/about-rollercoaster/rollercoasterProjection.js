import { ROLLERCOASTER_FIELD } from './rollercoasterField.js';

const DEGREES = 180 / Math.PI;
const SAMPLING_BUCKET_RATIO = 1.1;
// Half-size circles and ~sqrt(2) closer samples double the surface density,
// while leaving more open space between the full-colour gradients.
const CIRCLE_PITCH_RATIO = 0.55 / Math.SQRT2;
export const ROLLERCOASTER_PORTRAIT_MIN_CAP = 105;

/** One responsive lens for the entire rail. The optional cap supports measured
 * lens comparisons without adding beat-specific camera corrections. */
export function resolveRollercoasterProjection(source, width, height, {
  // Browser portrait framing may widen the source cap; the authored horizontal
  // lens and every camera pose remain intact. Wider source caps still apply.
  portraitVerticalFov = Math.max(source?.portraitVerticalFov, ROLLERCOASTER_PORTRAIT_MIN_CAP),
} = {}) {
  if (![width, height, source?.horizontalFov, portraitVerticalFov].every(Number.isFinite)
    || width <= 0 || height <= 0 || source.horizontalFov <= 0 || source.horizontalFov >= 180
    || portraitVerticalFov <= 0 || portraitVerticalFov >= 180) {
    throw new RangeError('About projection requires a positive viewport and a valid lens.');
  }
  const aspect = width / height;
  const verticalFov = Math.min(portraitVerticalFov,
    2 * Math.atan(Math.tan(source.horizontalFov / DEGREES / 2) / aspect) * DEGREES);
  return { aspect, verticalFov, focalLengthPx: height / (2 * Math.tan(verticalFov / DEGREES / 2)) };
}

/** Every surface uses this same pitch. Buckets avoid resampling for small
 * viewport changes; hysteresis keeps a settled bucket stable at its boundary. */
export function resolveRollercoasterSamplingSpacing(radiusWU, {
  baseSpacing = ROLLERCOASTER_FIELD.spacing, currentSpacing,
} = {}) {
  if (!Number.isFinite(radiusWU) || radiusWU < 0 || !Number.isFinite(baseSpacing) || baseSpacing <= 0) {
    throw new RangeError('About sampling requires a finite circle radius and positive base spacing.');
  }
  const diameter = radiusWU * 2;
  if (Number.isFinite(currentSpacing) && currentSpacing >= baseSpacing) {
    const ratio = diameter / currentSpacing;
    if ((currentSpacing === baseSpacing || ratio >= 0.365) && ratio <= 0.415) return currentSpacing;
  }
  const desired = Math.max(baseSpacing, diameter / CIRCLE_PITCH_RATIO);
  const bucket = Math.max(0, Math.round(Math.log(desired / baseSpacing) / Math.log(SAMPLING_BUCKET_RATIO)));
  return Number((baseSpacing * SAMPLING_BUCKET_RATIO ** bucket).toFixed(8));
}
