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
      maxBalls: g.maxBalls,
      gravityMultiplier: g.gravityMultiplierPit,
      ballMass: g.ballMassKg,
      ballSpacing: g.ballSpacing,
      // Size scale: export both keys for compatibility.
      // Runtime reads either `ballScale` or `sizeScale`.
      ballScale: g.sizeScale,
      sizeScale: g.sizeScale,
      sizeVariation: g.sizeVariation,
      restitution: g.REST,
      friction: g.FRICTION,
      repelRadius: g.repelRadius,
      repelPower: g.repelPower,
      // Repel softness: export both keys for compatibility.
      repelSoft: g.repelSoft,
      repelSoftness: g.repelSoft,
      
      // Frame & Walls
      frameColor: g.frameColor,
      containerBorder: g.containerBorder,
      simulationPadding: g.simulationPadding,
      contentPadding: g.contentPadding,
      containerInnerShadowOpacity: g.containerInnerShadowOpacity,
      containerInnerShadowBlur: g.containerInnerShadowBlur,
      containerInnerShadowSpread: g.containerInnerShadowSpread,
      containerInnerShadowOffsetY: g.containerInnerShadowOffsetY,
      
      // Noise
      noiseSizeBase: g.noiseSizeBase,
      noiseSizeTop: g.noiseSizeTop,
      noiseBackOpacity: g.noiseBackOpacity,
      noiseFrontOpacity: g.noiseFrontOpacity,
      noiseBackOpacityDark: g.noiseBackOpacityDark,
      noiseFrontOpacityDark: g.noiseFrontOpacityDark,

      wallThickness: g.wallThickness,
      wallRadius: g.wallRadius,
      wallInset: g.wallInset,
      wallWobbleMaxDeform: g.wallWobbleMaxDeform,
      wallWobbleStiffness: g.wallWobbleStiffness,
      wallWobbleDamping: g.wallWobbleDamping,
      wallWobbleSigma: g.wallWobbleSigma,
      wallWobbleCornerClamp: g.wallWobbleCornerClamp,

      // Worms (Simulation 11)
      wormPopulation: g.wormPopulation,
      wormSingleChance: g.wormSingleChance,
      wormDotSpeedMul: g.wormDotSpeedMul,
      wormBaseSpeed: g.wormBaseSpeed,
      wormDamping: g.wormDamping,
      wormStepHz: g.wormStepHz,
      wormTurnNoise: g.wormTurnNoise,
      wormTurnDamp: g.wormTurnDamp,
      wormTurnSeek: g.wormTurnSeek,
      wormFleeRadius: g.wormFleeRadius,
      wormFleeForce: g.wormFleeForce,
      wormPanicBoost: g.wormPanicBoost,
      wormSenseRadius: g.wormSenseRadius,
      wormAvoidForce: g.wormAvoidForce,
      wormAvoidSwirl: g.wormAvoidSwirl,
      wormCrowdBoost: g.wormCrowdBoost,
      
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



