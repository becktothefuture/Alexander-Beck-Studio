import { getPanelUiDocuments, resolvePanelUiDocument } from './panel-ui-context.js';

const modeNames = {
  'critters': 'Critter Swarm',
  'pit': 'Foundation',
  'flies': 'Attention',
  'weightless': 'Weightless Drift',
  'water': 'Flow',
  'magnetic': 'Magnetic Field',
  'bubbles': 'Emergence',
  'kaleidoscope-3': 'Refraction',
  'kaleidoscope-rift': 'Multiplicity',
  'rift-rings': 'Depth',
  'parallax-float': 'Parallax Drift',
  '3d-sphere': 'Continuity',
  '3d-cube': 'Scaffold',
  'starfield-3d': 'Perspective',
  'elastic-center': 'Elastic Loom',
  'flock-of-birds': 'Convergence',
  'repel-room': 'Tension',
  'wall-repel': 'Tension',
  'aperture-bloom': 'Aperture Bloom',
  'flubber-blob': 'Cohesion',
  'weave-field': 'Juxtaposition',
  'pressure-crucible': 'Pressure Field',
  'particle-fountain': 'Fountain A',
  'particle-fountain-b': 'Fountain B',
  'napoleon-point-cloud': 'Impression'
};

function applyModeUi(activeMode, uiDocument) {
  const buttons = uiDocument.querySelectorAll('.mode-button');
  for (const button of buttons) {
    const isActive = button.getAttribute('data-mode') === activeMode;
    button.classList.toggle('active', isActive);
  }

  const controlPanels = uiDocument.querySelectorAll('.mode-controls');
  for (const controlPanel of controlPanels) {
    controlPanel.classList.remove('active');
  }
  const activeControls = uiDocument.getElementById(`${activeMode}Controls`);
  if (activeControls) activeControls.classList.add('active');

  const announcer = uiDocument.getElementById('announcer');
  if (announcer) {
    announcer.textContent = `Switched to ${modeNames[activeMode] || activeMode} mode`;
  }
}

/**
 * Update mode-button presentation across the active panel documents.
 */
export function updateModeButtonsUI(activeMode, options) {
  if (options?.uiDocument) {
    const explicitDocument = resolvePanelUiDocument(options.uiDocument);
    if (explicitDocument) {
      applyModeUi(activeMode, explicitDocument);
      return;
    }
  }

  const uiDocuments = getPanelUiDocuments();
  for (const uiDocument of uiDocuments) {
    try {
      applyModeUi(activeMode, uiDocument);
    } catch {
      // Keep UI fan-out resilient; one broken host should not stop the rest.
    }
  }
}
