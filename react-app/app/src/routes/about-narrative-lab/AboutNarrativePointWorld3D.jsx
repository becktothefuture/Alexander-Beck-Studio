import { useEffect, useRef } from 'react';
import { createBlenderPointScene } from './aboutBlenderPointScene.js';
import {
  registerSimulationAtmosphereSource,
  tickSimulationAtmosphere,
} from '../../legacy/modules/rendering/atmosphere/simulation-atmosphere.js';
import { createRouteMaterialEntranceController } from '../../lib/motion/route-material-entrance.js';
import { ROUTE_ENTRANCE_START_EVENT } from '../../lib/motion/route-entrance-events.js';
import { registerRouteTransitionParticipant } from '../../lib/motion/route-transition-participants.js';

let nextRuntimeInstanceId = 1;

function createEditorialFallback(root) {
  root.dataset.pointWorldState = 'unavailable';
  root.dataset.aboutSceneReady = 'true';
  const readyTimer = window.setTimeout(() => {
    root.dispatchEvent(new CustomEvent('about:world-runtime-ready'));
    window.dispatchEvent(new CustomEvent('abs:about-scene-ready'));
  }, 0);
  return () => {
    window.clearTimeout(readyTimer);
    delete root.dataset.pointWorldState;
    delete root.dataset.aboutSceneReady;
  };
}

function createRuntimeAdapter({
  canvas,
  root,
  runtimeRef,
  pointProfile,
  layoutProfile,
}) {
  const runtimeInstanceId = nextRuntimeInstanceId;
  nextRuntimeInstanceId += 1;
  const entranceAlreadyComplete = root.dataset.aboutEntranceState === 'complete'
    || Number(root.dataset.aboutEntranceScale) >= 0.999;
  root.dataset.aboutEntranceState = entranceAlreadyComplete ? 'complete' : 'staged';
  root.dataset.aboutEntranceScale = entranceAlreadyComplete ? '1.0000' : '0.0000';
  delete root.dataset.aboutSceneReady;

  const scene = createBlenderPointScene({
    canvas,
    root,
    pointProfile,
    layoutProfile,
  });
  let routeMaterialOnly = false;
  let latestFrame = null;
  let atmosphereCleanup = null;
  const atmosphereProfileOverrides = {
    intensityScale: 1,
    colourStrengthScale: 1,
  };
  const atmosphereCanvas = document.getElementById('simulation-atmosphere-glow-canvas');
  if (atmosphereCanvas) {
    atmosphereCleanup = registerSimulationAtmosphereSource({
      id: `about:blender-surfel:${runtimeInstanceId}`,
      routeId: 'about',
      kind: 'canvas',
      canvas,
      viewportElement: canvas,
      scheduler: 'renderer-coupled',
      opacityElement: canvas,
      getRenderProfileOverrides: () => atmosphereProfileOverrides,
    });
  }

  const paint = (frame = latestFrame) => {
    if (frame) latestFrame = frame;
    if (routeMaterialOnly) return false;
    const atmosphereStrength = Number(latestFrame?.globals?.pointMaterial?.atmosphereStrength);
    atmosphereProfileOverrides.intensityScale = Number.isFinite(atmosphereStrength)
      ? Math.min(2, Math.max(0, atmosphereStrength))
      : 1;
    const rendered = scene.render(latestFrame);
    if (rendered && atmosphereCleanup) {
      tickSimulationAtmosphere(performance.now(), `about:blender-surfel:${runtimeInstanceId}`);
    }
    return rendered;
  };

  const routeMaterialTarget = Object.freeze({ kind: 'about-blender-surfel-scene' });
  const routeMaterial = createRouteMaterialEntranceController({
    id: `about-blender-surfel-material-${runtimeInstanceId}`,
    routeId: 'about',
    diagnosticRoot: root,
    getTargets: () => [routeMaterialTarget],
    setTargetScale: (target, scale, index, detail) => {
      scene.setEntranceScale(scale);
      root.dataset.aboutEntranceScale = scale.toFixed(4);
      root.dataset.aboutEntranceState = detail?.phase === 'exiting'
        ? 'exiting'
        : (scale >= 0.999 ? 'complete' : detail?.phase || 'staged');
    },
    requestRender: () => paint(),
    getReducedMotion: () => Boolean(latestFrame?.reducedMotion),
  });
  if (entranceAlreadyComplete) routeMaterial.settle('adapter-restored');
  else routeMaterial.prepare();

  const unregisterRouteMaterialParticipant = registerRouteTransitionParticipant({
    id: `about-blender-surfel-material-${runtimeInstanceId}`,
    routeId: 'about',
    prepare: ({ signal }) => {
      routeMaterialOnly = false;
      return routeMaterial.prepare({ signal, reducedMotion: Boolean(latestFrame?.reducedMotion) });
    },
    exit: ({ signal }) => {
      routeMaterialOnly = true;
      return routeMaterial.exit({ signal, reducedMotion: Boolean(latestFrame?.reducedMotion) });
    },
    enter: ({ signal }) => {
      routeMaterialOnly = false;
      return routeMaterial.enter({ signal, reducedMotion: Boolean(latestFrame?.reducedMotion) });
    },
    restore: () => {
      routeMaterialOnly = false;
      return routeMaterial.settle('route-restored');
    },
    cancel: ({ reason }) => {
      routeMaterialOnly = false;
      return routeMaterial.cancel(reason);
    },
  });

  if (!entranceAlreadyComplete) {
    void routeMaterial.enter({ reducedMotion: false });
  }
  const handleRouteEntranceStart = (event) => {
    if (event?.detail?.routeId !== 'about' || event?.detail?.mode !== 'direct') return;
    routeMaterialOnly = false;
    void routeMaterial.enter({ reducedMotion: Boolean(latestFrame?.reducedMotion) });
  };
  const handleVisibilityChange = () => scene.setVisible(!document.hidden);
  window.addEventListener(ROUTE_ENTRANCE_START_EVENT, handleRouteEntranceStart);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  const runtimeApi = Object.freeze({
    adapterId: scene.adapterId,
    destroy: scene.destroy,
    getDiagnosticsSnapshot: scene.getDiagnosticsSnapshot,
    getMetrics: scene.getMetrics,
    getPointerPressureSnapshot: scene.getPointerPressureSnapshot,
    preparePlan: scene.preparePlan,
    render: paint,
    resetHotFrameMetrics: scene.resetHotFrameMetrics,
    resetPerformanceMetrics: scene.resetPerformanceMetrics,
    retryPreparation: scene.retryPreparation,
    setVisible: scene.setVisible,
    subscribeDiagnostics: scene.subscribeDiagnostics,
  });
  runtimeRef.current = runtimeApi;
  if (import.meta.env.DEV || __CERTIFY__) window.__aboutNarrativeRuntime = runtimeApi;

  return () => {
    runtimeRef.current = null;
    if (window.__aboutNarrativeRuntime === runtimeApi) delete window.__aboutNarrativeRuntime;
    window.removeEventListener(ROUTE_ENTRANCE_START_EVENT, handleRouteEntranceStart);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    unregisterRouteMaterialParticipant();
    routeMaterial.destroy({ settleTargets: false });
    atmosphereCleanup?.();
    scene.destroy();
    delete root.dataset.aboutEntranceScale;
    delete root.dataset.aboutEntranceState;
    delete root.dataset.aboutSceneReady;
  };
}

export function AboutNarrativePointWorld3D({
  rootRef,
  interactionRef,
  runtimeRef,
  pointProfile = '',
  layoutProfile = '',
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return undefined;
    // The Blender scene owns no direct-manipulation mode, but retain the prop
    // seam so the About experience can evolve without remounting its shell.
    void interactionRef;
    let active = true;
    let disposeAdapter = null;
    // React Strict Mode probes effects twice. Defer WebGL allocation by one
    // task so the probe cancels before a duplicate context is created.
    const setupTimer = window.setTimeout(() => {
      if (!active) return;
      try {
        disposeAdapter = createRuntimeAdapter({
          canvas,
          root,
          runtimeRef,
          pointProfile,
          layoutProfile,
        });
      } catch (error) {
        console.warn('[About narrative] WebGL is unavailable; editorial content remains visible.', error);
        disposeAdapter = createEditorialFallback(root);
      }
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(setupTimer);
      disposeAdapter?.();
    };
  }, [interactionRef, layoutProfile, pointProfile, rootRef, runtimeRef]);

  return <canvas ref={canvasRef} className="about-narrative-world__canvas" aria-hidden="true" />;
}
