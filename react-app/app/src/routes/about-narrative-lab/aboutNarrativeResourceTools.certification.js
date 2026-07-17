import {
  createAboutNarrativeResourceLedger,
  instrumentAboutNarrativeWebGLContext,
} from './aboutNarrativeResourceLedger.js';

export function createAboutNarrativeRuntimeResources({ canvas, rendererAttributes }) {
  const resourceLedger = createAboutNarrativeResourceLedger({
    strict: false,
    owners: [
      { id: 'webgl-context', kind: 'gpu' },
      { id: 'fixed-attributes', kind: 'runtime' },
      { id: 'shape-cache', kind: 'cache' },
      { id: 'sequence-cache', kind: 'cache' },
      { id: 'installed-pair', kind: 'runtime' },
      { id: 'pending-publication', kind: 'worker' },
    ],
  });
  const context = canvas.getContext('webgl2', rendererAttributes);
  if (!context) throw new Error('WebGL2 is unavailable for About narrative certification.');
  const webglTracker = instrumentAboutNarrativeWebGLContext({
    context,
    ledger: resourceLedger,
    ownerId: 'webgl-context',
    idPrefix: 'about-point-world',
  });
  return Object.freeze({ context, resourceLedger, webglTracker });
}
