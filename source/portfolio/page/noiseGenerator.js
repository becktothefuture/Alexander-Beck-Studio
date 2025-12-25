/**
 * SVG NOISE GENERATOR
 * 
 * Generates configurable SVG noise textures for background effects.
 * Uses CSS custom properties for real-time control over noise parameters.
 */

/**
 * Generate SVG noise texture with configurable parameters
 * @param {Object} config - Noise configuration
 * @returns {string} - Data URL encoded SVG
 */
export function generateNoiseSVG(config = {}) {
  const {
    baseFrequency = 0.112,
    octaves = 4,
    seed = 15,
    surfaceScale = 12,
    specularConstant = 0.8,
    specularExponent = 20,
    lightingColor = '#7957A8',
    azimuth = 3,
    elevation = 84,
    size = 700
  } = config;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" 
         xmlns:xlink="http://www.w3.org/1999/xlink" 
         xmlns:svgjs="http://svgjs.dev/svgjs" 
         viewBox="0 0 ${size} ${size}" 
         width="${size}" height="${size}">
      <defs>
        <filter id="nnnoise-filter" x="-20%" y="-20%" width="140%" height="140%" 
                filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" 
                color-interpolation-filters="linearRGB">
          <feTurbulence type="turbulence" 
                        baseFrequency="${baseFrequency}" 
                        numOctaves="${octaves}" 
                        seed="${seed}" 
                        stitchTiles="stitch" 
                        x="0%" y="0%" width="100%" height="100%" 
                        result="turbulence">
          </feTurbulence>
          <feSpecularLighting surfaceScale="${surfaceScale}" 
                              specularConstant="${specularConstant}" 
                              specularExponent="${specularExponent}" 
                              lighting-color="${lightingColor}" 
                              x="0%" y="0%" width="100%" height="100%" 
                              in="turbulence" result="specularLighting">
            <feDistantLight azimuth="${azimuth}" elevation="${elevation}"></feDistantLight>
          </feSpecularLighting>
          <feColorMatrix type="saturate" values="0" 
                         x="0%" y="0%" width="100%" height="100%" 
                         in="specularLighting" result="colormatrix">
          </feColorMatrix>
        </filter>
      </defs>
      <rect width="${size}" height="${size}" fill="transparent"></rect>
      <rect width="${size}" height="${size}" fill="${lightingColor}" filter="url(#nnnoise-filter)"></rect>
    </svg>
  `;

  // Encode SVG for use in CSS data URL
  const encodedSVG = encodeURIComponent(svg.trim());
  return `data:image/svg+xml,${encodedSVG}`;
}

/**
 * Apply noise texture to element using CSS custom properties
 * @param {HTMLElement} element - Target element
 * @param {Object} config - Noise configuration
 */
export function applyNoiseTexture(element, config = {}) {
  const noiseURL = generateNoiseSVG(config);
  element.style.backgroundImage = `url("${noiseURL}")`;
}

/**
 * Update noise texture based on CSS custom properties
 * @param {HTMLElement} element - Element with CSS custom properties
 */
export function updateNoiseFromCSS(element = document.documentElement) {
  const computedStyle = getComputedStyle(element);
  
  const config = {
    baseFrequency: parseFloat(computedStyle.getPropertyValue('--noise-base-frequency')) || 0.112,
    octaves: parseInt(computedStyle.getPropertyValue('--noise-octaves')) || 4,
    seed: parseInt(computedStyle.getPropertyValue('--noise-seed')) || 15,
    surfaceScale: parseFloat(computedStyle.getPropertyValue('--noise-surface-scale')) || 12,
    specularConstant: parseFloat(computedStyle.getPropertyValue('--noise-specular-constant')) || 0.8,
    specularExponent: parseFloat(computedStyle.getPropertyValue('--noise-specular-exponent')) || 20,
    lightingColor: computedStyle.getPropertyValue('--noise-lighting-color').trim() || '#7957A8',
    azimuth: parseFloat(computedStyle.getPropertyValue('--noise-azimuth')) || 3,
    elevation: parseFloat(computedStyle.getPropertyValue('--noise-elevation')) || 84,
    size: 700
  };

  return generateNoiseSVG(config);
}

/**
 * Initialize dynamic noise system
 * Updates noise texture when CSS variables change
 */
export function initializeDynamicNoise() {
  // Generate initial noise texture
  const noiseURL = updateNoiseFromCSS();
  
  // Apply to body::before via CSS custom property
  document.documentElement.style.setProperty('--noise-svg-url', `url("${noiseURL}")`);
  
  console.log('🎨 Dynamic SVG noise system initialized');
  console.log('🔧 Control via CSS variables: --noise-* properties');
  console.log('👁️ Noise should be VERY OBVIOUS with 60% opacity and multiply blend mode');
  console.log('🎬 Grain moves every 0.5s in 20-25px jumps');
}

/**
 * Create noise texture variants for different themes
 */
export const NoisePresets = {
  default: {
    baseFrequency: 0.134,
    octaves: 4,
    seed: 15,
    surfaceScale: 7,
    specularConstant: 0.8,
    specularExponent: 20,
    lightingColor: '#5a657e',
    azimuth: 3,
    elevation: 62
  },
  
  fine: {
    baseFrequency: 0.18,
    octaves: 6,
    seed: 42,
    surfaceScale: 8,
    specularConstant: 0.6,
    specularExponent: 15,
    lightingColor: '#5a4f8a',
    azimuth: 10,
    elevation: 75
  },
  
  coarse: {
    baseFrequency: 0.08,
    octaves: 3,
    seed: 7,
    surfaceScale: 16,
    specularConstant: 1.0,
    specularExponent: 25,
    lightingColor: '#8b6bb1',
    azimuth: -5,
    elevation: 90
  },
  
  subtle: {
    baseFrequency: 0.15,
    octaves: 2,
    seed: 28,
    surfaceScale: 6,
    specularConstant: 0.4,
    specularExponent: 10,
    lightingColor: '#6d5a9c',
    azimuth: 15,
    elevation: 60
  }
}; 