// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             BUILD / SAVE CONFIG                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

export function setupBuildControls() {
  const btn = document.getElementById('saveConfigBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const g = getGlobals();
    const config = {
      gravityMultiplier: g.gravityMultiplierPit,
      ballMass: g.ballMassKg,
      sizeScale: g.sizeScale,
      sizeVariation: g.sizeVariation,
      restitution: g.REST,
      friction: g.FRICTION,
      repelRadius: g.repelRadius,
      repelPower: g.repelPower,
      repelSoftness: g.repelSoft,
      
      // Frame & Walls
      frameColor: g.frameColor,
      containerBorder: g.containerBorder,
      simulationPadding: g.simulationPadding,
      wallThickness: g.wallThickness,
      wallSoftness: g.wallSoftness,
      wallRadius: g.wallRadius,
      wallBounceHighlightMax: g.wallBounceHighlightMax,
      wallWobbleMaxDeform: g.wallWobbleMaxDeform,
      wallWobbleStiffness: g.wallWobbleStiffness,
      wallWobbleDamping: g.wallWobbleDamping,
      wallWobbleSigma: g.wallWobbleSigma,
      wallWobbleImpactThreshold: g.wallWobbleImpactThreshold,
      wallWobbleCornerClamp: g.wallWobbleCornerClamp,
      wallBounceHighlightDecay: g.wallBounceHighlightDecay,
      
      // Visual Effects
      vignetteX: g.vignetteX,
      vignetteY: g.vignetteY,
      vignetteBlurOuter: g.vignetteBlurOuter,
      vignetteBlurMid: g.vignetteBlurMid,
      vignetteBlurInner: g.vignetteBlurInner,
      vignetteSpread: g.vignetteSpread,
      vignetteLightIntensity: g.vignetteLightIntensity,
      vignetteDarkIntensity: g.vignetteDarkIntensity,
      vignetteTransition: g.vignetteTransition,
      
      cursorColorIndex: 5,
      enableLOD: false
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'current-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}



