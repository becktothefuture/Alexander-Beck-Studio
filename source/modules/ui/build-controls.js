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
      contentPadding: g.contentPadding,
      containerInnerShadowOpacity: g.containerInnerShadowOpacity,
      containerInnerShadowBlur: g.containerInnerShadowBlur,
      containerInnerShadowSpread: g.containerInnerShadowSpread,
      containerInnerShadowOffsetY: g.containerInnerShadowOffsetY,
      wallThickness: g.wallThickness,
      wallRadius: g.wallRadius,
      wallWobbleMaxDeform: g.wallWobbleMaxDeform,
      wallWobbleStiffness: g.wallWobbleStiffness,
      wallWobbleDamping: g.wallWobbleDamping,
      wallWobbleSigma: g.wallWobbleSigma,
      wallWobbleCornerClamp: g.wallWobbleCornerClamp,
      
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



