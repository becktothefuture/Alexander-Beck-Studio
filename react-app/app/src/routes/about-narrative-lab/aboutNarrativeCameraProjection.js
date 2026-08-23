const MIN_ASPECT_RATIO = 0.1;
const MAX_PERSPECTIVE_FOV_DEGREES = 179;

export function resolveVerticalFovFromHorizontalFov(horizontalFovDegrees, aspectRatio) {
  const horizontalFov = Number(horizontalFovDegrees);
  const aspect = Math.max(MIN_ASPECT_RATIO, Number(aspectRatio) || 1);
  if (!Number.isFinite(horizontalFov) || horizontalFov <= 0 || horizontalFov >= 180) {
    throw new RangeError('Horizontal field of view must be between 0 and 180 degrees.');
  }
  const horizontalRadians = horizontalFov * (Math.PI / 180);
  const verticalRadians = 2 * Math.atan(Math.tan(horizontalRadians * 0.5) / aspect);
  return Math.min(MAX_PERSPECTIVE_FOV_DEGREES, verticalRadians * (180 / Math.PI));
}

export function resolveResponsiveVerticalFovFromHorizontalFov(
  horizontalFovDegrees,
  aspectRatio,
  maximumVerticalFovDegrees,
) {
  const maximumVerticalFov = Number(maximumVerticalFovDegrees);
  if (!Number.isFinite(maximumVerticalFov)
    || maximumVerticalFov <= 0
    || maximumVerticalFov >= 180) {
    throw new RangeError('Maximum vertical field of view must be between 0 and 180 degrees.');
  }
  return Math.min(
    maximumVerticalFov,
    resolveVerticalFovFromHorizontalFov(horizontalFovDegrees, aspectRatio),
  );
}

export function resolveHorizontalFovFromVerticalFov(verticalFovDegrees, aspectRatio) {
  const verticalFov = Number(verticalFovDegrees);
  const aspect = Math.max(MIN_ASPECT_RATIO, Number(aspectRatio) || 1);
  if (!Number.isFinite(verticalFov) || verticalFov <= 0 || verticalFov >= 180) {
    throw new RangeError('Vertical field of view must be between 0 and 180 degrees.');
  }
  const verticalRadians = verticalFov * (Math.PI / 180);
  return 2 * Math.atan(Math.tan(verticalRadians * 0.5) * aspect) * (180 / Math.PI);
}
