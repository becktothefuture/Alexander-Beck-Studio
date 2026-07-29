// Scaffold keeps its historical mode id for saved-state compatibility while
// deliberately sharing Assembly's rigid-body runtime. Only its silhouettes differ.

import {
  cleanupScaffoldShapes,
  initializeScaffoldShapes,
  stepScaffoldShapes,
} from './shapes.js';

export function initialize3DCube() {
  initializeScaffoldShapes();
}

export function cleanup3DCube() {
  cleanupScaffoldShapes();
}

export function step3DCube(dt) {
  stepScaffoldShapes(dt);
}
