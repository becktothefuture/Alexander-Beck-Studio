import { getGlobals } from '../core/state.js';

const QUALITY_HIGH = 'high';
const QUALITY_BALANCED = 'balanced';
const QUALITY_LOW = 'low';
const QUALITY_AUTO = 'auto';

function normalizeQualityTier(tier) {
  const value = String(tier || QUALITY_AUTO).toLowerCase();
  if (value === QUALITY_HIGH) return QUALITY_HIGH;
  if (value === QUALITY_BALANCED || value === 'medium') return QUALITY_BALANCED;
  if (value === QUALITY_LOW) return QUALITY_LOW;
  return QUALITY_AUTO;
}

function getAutoQualityTier(globals) {
  const throttleLevel = Math.max(0, Number(globals?.adaptiveThrottleLevel) || 0);
  const perfMode = globals?.performanceModeEnabled === true;
  const mobile = globals?.isMobile || globals?.isMobileViewport;

  if (throttleLevel >= 2) return QUALITY_LOW;
  if (throttleLevel >= 1) return QUALITY_BALANCED;
  if (perfMode && mobile) return QUALITY_BALANCED;
  return QUALITY_HIGH;
}

export function getRenderQualityProfile(globals = getGlobals()) {
  const qualityFeatureEnabled = globals?.featureQualityTieringEnabled !== false;
  const configuredTier = normalizeQualityTier(globals?.renderQualityTier);

  let tier = QUALITY_HIGH;
  if (qualityFeatureEnabled) {
    tier = configuredTier === QUALITY_AUTO ? getAutoQualityTier(globals) : configuredTier;
  }

  if (tier === QUALITY_LOW) {
    return {
      tier,
      depthWashOpacityScale: 0.55,
      wallGradientStrokeEnabled: false,
      drawMouseTrail: false,
      drawCursorExplosion: false
    };
  }

  if (tier === QUALITY_BALANCED) {
    return {
      tier,
      depthWashOpacityScale: 0.85,
      wallGradientStrokeEnabled: true,
      drawMouseTrail: true,
      drawCursorExplosion: true
    };
  }

  return {
    tier: QUALITY_HIGH,
    depthWashOpacityScale: 1,
    wallGradientStrokeEnabled: true,
    drawMouseTrail: true,
    drawCursorExplosion: true
  };
}
