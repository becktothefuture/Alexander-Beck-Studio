// Shared runtime config loader for pages that need studio-level parameters.
// Dev uses the canonical design-system file; production prefers flattened legacy config.

import {
  deriveRuntimeConfig,
  loadDesignSystemConfig,
  loadLegacyRuntimeConfig,
  shouldUseCanonicalDesignConfig,
} from './design-config.js';

export async function loadRuntimeConfig() {
  try {
    if (shouldUseCanonicalDesignConfig()) {
      const designSystem = await loadDesignSystemConfig();
      const runtimeConfig = deriveRuntimeConfig(designSystem);
      if (runtimeConfig && typeof runtimeConfig === 'object' && Object.keys(runtimeConfig).length > 0) {
        return runtimeConfig;
      }
    }

    const legacyConfig = await loadLegacyRuntimeConfig();
    if (legacyConfig && typeof legacyConfig === 'object' && Object.keys(legacyConfig).length > 0) {
      return legacyConfig;
    }

    if (!shouldUseCanonicalDesignConfig()) {
      const designSystem = await loadDesignSystemConfig();
      const runtimeConfig = deriveRuntimeConfig(designSystem);
      if (runtimeConfig && typeof runtimeConfig === 'object' && Object.keys(runtimeConfig).length > 0) {
        return runtimeConfig;
      }
    }

    throw new Error('No runtime config found');
  } catch (e) {
    console.warn('Config load failed, using defaults');
    return { gravityMultiplier: 1.05, ballMass: 91, maxBalls: 300 };
  }
}
