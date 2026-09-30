import * as THREE from 'three';

const MAX_BATCH_POINTS = 1024;

/** Keep the authored field intact, but let Three reject unseen pieces before
 * running their vertex shaders. A single instanced mesh otherwise draws the
 * entire long Blender journey, even while only its final wall is on screen.
 * Bounds include the complete motion envelope, so moving parts never pop out. */
export function createRollercoasterSurfaceBatches(points, field, motionGroups, material, createGeometry) {
  const root = new THREE.Group();
  const batches = [];
  const point = new THREE.Vector3();
  for (const range of field.objectRanges) {
    const motion = motionGroups[range.motionGroup];
    for (let start = range.start; start < range.end; start += MAX_BATCH_POINTS) {
      const end = Math.min(range.end, start + MAX_BATCH_POINTS);
      const box = new THREE.Box3();
      for (let index = start; index < end; index += 1) {
        point.fromArray(points, index * 6);
        box.expandByPoint(point);
      }
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      if (motion?.kind === 'rotate') {
        sphere.center.fromArray(motion.pivot);
        sphere.radius = 0;
        for (let index = start; index < end; index += 1) {
          point.fromArray(points, index * 6);
          sphere.radius = Math.max(sphere.radius, point.distanceTo(sphere.center));
        }
      } else if (motion?.kind === 'wave') sphere.radius += Math.abs(motion.amplitude);
      const geometry = createGeometry(points.subarray(start * 6, end * 6));
      geometry.boundingSphere = sphere;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${range.id}:${start}`;
      root.add(mesh);
      batches.push({ geometry, baseRadius: sphere.radius });
    }
  }
  return {
    root,
    count: batches.length,
    setPadding(radius) {
      for (const batch of batches) batch.geometry.boundingSphere.radius = batch.baseRadius + radius;
    },
    dispose() {
      root.removeFromParent();
      for (const batch of batches) batch.geometry.dispose();
      root.clear();
    },
  };
}
