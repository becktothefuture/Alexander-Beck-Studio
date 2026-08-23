const AUTHORED_STORY_DURATION_WU = 22;

const clamp = (value, minimum, maximum, fallback = minimum) => {
  const number = Number(value);
  return Math.max(minimum, Math.min(maximum, Number.isFinite(number) ? number : fallback));
};

const smoothstep = (start, end, value) => {
  const progress = clamp(
    (Number(value) - Number(start)) / Math.max(0.000001, Number(end) - Number(start)),
    0,
    1,
    0,
  );
  return progress * progress * (3 - (2 * progress));
};

/**
 * Resolve the complete browser-authored look for the Blender surfel scene.
 * Camera pose and geometry remain outside this module and stay Blender-owned.
 * The caller supplies one reusable target so the hot path stays allocation-free.
 */
export function writeAboutSceneLook(target, frame, entranceScale = 1) {
  const output = target || {};
  const shape = frame?.world?.to?.shapeParameters || {};
  const camera = frame?.globals?.camera || {};
  const material = frame?.globals?.pointMaterial || {};
  const storyWU = Number(frame?.storyWU) || 0;
  const runtimeDurationWU = Number(frame?.durationWU);
  const durationScale = Number.isFinite(runtimeDurationWU) && runtimeDurationWU > 0
    ? runtimeDurationWU / AUTHORED_STORY_DURATION_WU
    : 1;
  const clearStart = Number(shape.finaleFogClearStartWU) * durationScale;
  const clearEnd = Number(shape.finaleFogClearEndWU) * durationScale;
  const clearProgress = Number.isFinite(clearStart) && Number.isFinite(clearEnd)
    ? smoothstep(clearStart, clearEnd, storyWU)
    : 0;
  const normalFogStart = Number(camera.distanceFogStartWU ?? 7);
  const normalFogEnd = Number(camera.distanceFogEndWU ?? 18);

  output.detailBias = clamp(shape.density, 0.2, 2, 1);
  output.surfelCoverage = clamp(material.surfelCoverage, 0.6, 1.2, 0.7);
  output.backfaceRetention = clamp(material.backfaceRetention, 0, 1, 0);
  output.minPointSizePx = clamp(material.minPointSize, 0.75, 4, 1.15);
  output.maxPointSizePx = clamp(material.pointSize, 4, 18, 6);
  output.perspectiveResponse = clamp(material.perspectiveResponse, 0.6, 1.2, 1);
  output.edgeSoftness = clamp(material.edgeSoftness, 0.65, 2.4, 1.35);
  output.atmosphereStrength = clamp(material.atmosphereStrength, 0, 2, 1);
  output.opacity = clamp(material.opacity, 0, 1, 1);
  output.fogCurve = clamp(camera.distanceFogCurve, 0.45, 2.5, 1);
  output.fogStartWU = normalFogStart + (
    (Number(shape.finaleFogStartWU ?? normalFogStart) - normalFogStart) * clearProgress
  );
  output.fogEndWU = normalFogEnd + (
    (Number(shape.finaleFogEndWU ?? normalFogEnd) - normalFogEnd) * clearProgress
  );
  output.finaleProgress = clearProgress;
  output.motionAmountWU = frame?.reducedMotion
    ? 0
    : clamp(shape.structureAmbientAmount, 0, 0.3, 0.05)
      * (1 + ((clamp(shape.finaleMotionGain, 0, 2, 1) - 1) * clearProgress));
  output.motionSpeed = clamp(shape.structureAmbientSpeed, 0, 1.5, 0.36);
  output.motionCoherence = clamp(shape.structureMotionCoherence, 0, 1, 0.72);
  output.sceneVisibility = clamp(frame?.simulation?.visibility, 0, 1, 1);
  output.entranceScale = clamp(entranceScale, 0, 1, 1);
  return output;
}
