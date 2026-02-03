// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       TACTILE LAYER (UNICORN STUDIO)                         ║
// ║        Top-level WebGL visual layer for interactive fluid/particles          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

let unicornInstance = null;
let container = null;
let scriptLoaded = false;
let isInitializing = false;
let currentProjectId = null;

/**
 * Initialize the tactile layer container and load the SDK if needed.
 * @param {Object} config - Runtime configuration
 */
export async function initTactileLayer(config) {
  // Find the simulation container
  const parent = document.getElementById('bravia-balls');
  if (!parent) {
    console.warn('Tactile Layer: #bravia-balls container not found.');
    return;
  }

  // Create container if it doesn't exist
  if (!container) {
    container = document.createElement('div');
    container.id = 'tactile-layer';
    
    // Position inside #bravia-balls
    // Match the geometry of the inner wall exactly
    container.style.position = 'absolute';
    container.style.inset = 'var(--wall-thickness, 9px)';
    container.style.borderRadius = 'var(--wall-radius, 24px)';
    container.style.overflow = 'hidden'; // Clip content to rounded corners
    
    // Layering: Canvas (0) < Tactile (20) < Outer Wall (25) < Inner Wall (30)
    container.style.zIndex = '20';
    
    container.style.pointerEvents = 'none'; // Default to pass-through
    
    // Insert into parent (order doesn't matter much due to explicit z-index)
    parent.appendChild(container);
  }

  // Initial update
  updateTactileLayer(config);
}

/**
 * Update the tactile layer based on configuration.
 * Handles enabling/disabling, loading SDK, and updating visual properties.
 * @param {Object} config - Runtime configuration
 */
export function updateTactileLayer(config) {
  if (!container) return;

  const enabled = config.tactileEnabled ?? false;
  const projectId = config.tactileProjectId || 'qBFxB3kkFBqgLxFNFleF';

  // Visibility
  container.style.display = enabled ? 'block' : 'none';

  if (!enabled) {
    if (unicornInstance) {
      unicornInstance.destroy();
      unicornInstance = null;
      currentProjectId = null;
    }
    return;
  }

  // Check if Project ID changed
  if (unicornInstance && currentProjectId !== projectId) {
    unicornInstance.destroy();
    unicornInstance = null;
    currentProjectId = null;
  }

  // DOM Properties
  container.style.opacity = config.tactileOpacity ?? 1;
  container.style.mixBlendMode = config.tactileBlendMode || 'overlay';
  
  // If user wants interaction, we might need pointer-events: auto,
  // but that blocks the site. Usually these FX listen to window.
  // We'll expose it just in case.
  container.style.pointerEvents = config.tactilePointerEvents ? 'auto' : 'none';

  // Load SDK and Initialize if needed
  if (!scriptLoaded && !isInitializing) {
    isInitializing = true;
    loadScript('https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.4/dist/unicornStudio.umd.js')
      .then(() => {
        scriptLoaded = true;
        isInitializing = false;
        createScene(config);
      })
      .catch(err => {
        console.error('Failed to load Unicorn Studio SDK:', err);
        isInitializing = false;
      });
  } else if (scriptLoaded && !unicornInstance && !isInitializing) {
    createScene(config);
  }
}

/**
 * Create the Unicorn Studio scene.
 * @param {Object} config 
 */
function createScene(config) {
  if (!window.UnicornStudio || unicornInstance) return;

  const projectId = config.tactileProjectId || 'qBFxB3kkFBqgLxFNFleF';
  const scale = config.tactileScale || 1.0;
  const dpi = config.tactileDpi || 1.0;

  UnicornStudio.addScene({
    elementId: container.id,
    projectId: projectId,
    scale: scale,
    dpi: dpi,
    fps: 60,
    lazyLoad: true,
  }).then(scene => {
    unicornInstance = scene;
    currentProjectId = projectId;
    console.log('🦄 Unicorn Studio Scene Initialized');
  }).catch(err => {
    console.error('Failed to init Unicorn Studio scene:', err);
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
