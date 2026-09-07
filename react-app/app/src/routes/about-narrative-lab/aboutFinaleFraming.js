import * as THREE from 'three';

const FINALE_MODEL_KEYS = new Set(['about.05', 'about.06']);
const SILHOUETTE_STRIDE = 4;
const ANGULAR_STEP = Math.PI / 45;

// Responsive projection of the authored camera into the measured image slot.
// Neither the rail nor the sculpture moves when text wraps or the window changes.
export function createAboutFinaleFraming() {
  const terminalCamera = new THREE.PerspectiveCamera();
  const baseProjection = new THREE.Matrix4();
  const point = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  let parts = [];
  let positions = null;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let available = false;
  let turnScale = NaN;
  let slotLeft = 0, slotRight = 0, slotTop = 0, slotBottom = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let sampleCount = 0;
  let fitRevision = 0;

  const measureSilhouette = (nextTurnScale) => {
    turnScale = nextTurnScale;
    scale = 1; offsetX = 0; offsetY = 0;
    minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity;
    sampleCount = 0;
    if (!positions || !parts.length) { available = false; return; }
    for (const part of parts) {
      const motion = part.motion;
      const amplitude = motion ? Math.abs(motion.amplitudeRadians * turnScale) : 0;
      // Include rest and both turn extrema; intermediate samples protect the
      // perspective silhouette when a shoulder passes nearer to the camera.
      const halfSteps = amplitude > 0 ? Math.max(1, Math.ceil(amplitude / ANGULAR_STEP)) : 0;
      for (let step = -halfSteps; step <= halfSteps; step += 1) {
        if (motion) {
          axis.fromArray(motion.axis).normalize();
          rotation.setFromAxisAngle(axis, halfSteps ? amplitude * step / halfSteps : 0);
        }
        const end = part.start + part.count;
        // Mobile prefixes contain isolated silhouette anchors. Include every
        // anchor at rest/extrema; only intermediate turn phases use a stride.
        const stride = step === 0 || Math.abs(step) === halfSteps ? 1 : SILHOUETTE_STRIDE;
        for (let index = part.start; index < end; index += stride) {
          point.fromArray(positions, index * 3);
          if (motion) {
            point.x -= motion.pivotWU[0];
            point.y -= motion.pivotWU[1];
            point.z -= motion.pivotWU[2];
            point.applyQuaternion(rotation);
            point.x += motion.pivotWU[0];
            point.y += motion.pivotWU[1];
            point.z += motion.pivotWU[2];
          }
          point.applyMatrix4(terminalCamera.matrixWorldInverse);
          // A point behind the near plane cannot define a useful final image.
          if (point.z >= -terminalCamera.near) continue;
          point.applyMatrix4(baseProjection);
          if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
          minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
          minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
          sampleCount += 1;
        }
      }
    }
    available = sampleCount > 0 && maxX > minX && maxY > minY;
    if (!available) return;
    scale = Math.min((slotRight - slotLeft) * 0.9 / (maxX - minX),
      (slotTop - slotBottom) * 0.9 / (maxY - minY));
    offsetX = (slotLeft + slotRight) * 0.5 - (minX + maxX) * 0.5 * scale;
    offsetY = (slotTop + slotBottom) * 0.5 - (minY + maxY) * 0.5 * scale;
    fitRevision += 1;
  };

  const configure = (camera, track, metadata, canvasRect, sceneRect, decoded) => {
    baseProjection.copy(camera.projectionMatrix);
    scale = 1; offsetX = 0; offsetY = 0;
    available = false;
    sampleCount = 0;
    positions = decoded?.positions || null;
    parts = [];
    if (!track?.samples?.length || !positions || !(canvasRect?.height > 1)
      || !(canvasRect?.width > 1) || !(sceneRect?.height > 1)
      || !(sceneRect.right > sceneRect.left)) return;
    terminalCamera.copy(camera, false);
    const sample = track.samples.at(-1);
    terminalCamera.position.fromArray(sample);
    terminalCamera.quaternion.fromArray(sample, 3).normalize();
    terminalCamera.updateMatrixWorld(true);
    for (let index = 0; index < (metadata?.models?.length || 0); index += 1) {
      const model = metadata.models[index];
      if (!FINALE_MODEL_KEYS.has(model.key)) continue;
      const range = decoded.modelRanges?.[index];
      if (!(range?.count > 0)) continue;
      const authored = metadata.motionGroups?.find((group) => group.key === model.motionKey)?.motion;
      const motion = authored?.behavior === 'bounded-rotation'
        && authored.pivotWU?.length === 3 && authored.axis?.length === 3
        ? authored : null;
      parts.push({ start: range.start, count: range.count, motion });
    }
    slotLeft = (sceneRect.left - canvasRect.left) / canvasRect.width * 2 - 1;
    slotRight = (sceneRect.right - canvasRect.left) / canvasRect.width * 2 - 1;
    slotTop = 1 - (sceneRect.top - canvasRect.top) / canvasRect.height * 2;
    slotBottom = 1 - (sceneRect.bottom - canvasRect.top) / canvasRect.height * 2;
    measureSilhouette(Number.isFinite(turnScale) ? turnScale : 1);
  };

  const apply = (camera, progress, bustTurnScale = 1) => {
    const nextTurnScale = Math.max(0, Math.min(6, Number(bustTurnScale) || 0));
    if (positions && parts.length && nextTurnScale !== turnScale) measureSilhouette(nextTurnScale);
    const t = available ? Math.max(0, Math.min(1, Number(progress) || 0)) : 0;
    const zoom = 1 + (scale - 1) * t;
    camera.projectionMatrix.copy(baseProjection);
    const elements = camera.projectionMatrix.elements;
    elements[0] *= zoom;
    elements[5] *= zoom;
    elements[8] = elements[8] * zoom - offsetX * t;
    elements[9] = elements[9] * zoom - offsetY * t;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    return zoom;
  };
  return {
    configure,
    apply,
    snapshot: () => ({
      available, scale, offsetX, offsetY, turnScale, sampleCount, fitRevision,
      silhouette: { minX, minY, maxX, maxY },
    }),
  };
}
