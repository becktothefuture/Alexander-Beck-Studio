// Shared runtime config loader for pages that need studio-level parameters.
// Keeps the fetch/inlined-config logic in one place for consistency.

export async function loadRuntimeConfig() {
  try {
    // Production builds can inline config into HTML (hardcoded at build time).
    // This is the preferred path for production: no fetch, no runtime variability.
    try {
      if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__ && typeof window.__RUNTIME_CONFIG__ === 'object') {
        return window.__RUNTIME_CONFIG__;
      }
    } catch (e) {}

    const paths = [
      'config/default-config.json',
      '../config/default-config.json',
      'js/config.json',
      '../js/config.json',
      '../dist/js/config.json'
    ];
    for (const path of paths) {
      try {
        const res = await fetch(path, { cache: 'no-cache' });
        if (res.ok) return await res.json();
      } catch (e) {
        // Try next
      }
    }
    throw new Error('No config found');
  } catch (e) {
    console.warn('Config load failed, using defaults');
    return { gravityMultiplier: 1.05, ballMass: 91, maxBalls: 300 };
  }
}
