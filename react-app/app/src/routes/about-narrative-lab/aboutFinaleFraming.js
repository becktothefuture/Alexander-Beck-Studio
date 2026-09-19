import * as THREE from 'three';

// The responsive lens is fixed for the entire flight. The invitation uses
// naturally open sky in the Blender composition; text measurement cannot zoom
// or shift that composition. Retain the snapshot for framing diagnostics.
export function createAboutFinaleFraming() {
  const projection = new THREE.Matrix4();
  let available = false;
  let revision = 0;
  let landmarkObject = null;
  return {
    configure(camera, track, metadata) {
      projection.copy(camera.projectionMatrix);
      available = Boolean(track?.samples?.length);
      landmarkObject = metadata?.source?.cinematicJourney?.finale?.landmarkObject || null;
      revision += 1;
    },
    apply(camera) {
      camera.projectionMatrix.copy(projection);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      return 1;
    },
    snapshot: () => ({
      available, mode: 'fixed-authored-lens', landmarkObject,
      scale: 1, offsetX: 0, offsetY: 0, fitRevision: revision,
    }),
  };
}
