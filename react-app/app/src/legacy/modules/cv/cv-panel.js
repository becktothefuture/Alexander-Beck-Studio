import { createPanelDock } from '../ui/panel-dock.js';
import { deriveCvConfig, loadDesignSystemConfig } from '../utils/design-config.js';
import { performDesignSystemSave } from '../utils/design-system-save.js';

const DEFAULT_CONFIG = {
  leftWidth: 32,
  leftPaddingTop: 10,
  leftPaddingBottom: 10,
  leftGap: 2.5,
  photoAspectRatio: 0.75,
  photoSize: 115,
  photoBorderRadius: 1,
  rightPaddingTop: 20,
  rightPaddingBottom: 20,
  rightPaddingX: 2.5,
  rightMaxWidth: 42,
  nameSize: 2.2,
  titleSize: 0.9,
  sectionTitleSize: 0.75,
  bodySize: 0.9,
  sectionGap: 3.5,
  paragraphGap: 1.5,
  mutedOpacity: 0.6,
};

const SECTION_DEFS = [
  {
    key: 'layout',
    title: 'Layout',
    icon: '📐',
    defaultOpen: true,
    controls: [
      { id: 'leftWidth', label: 'Left Rail Width', min: 20, max: 45, step: 1, unit: 'vw' },
      { id: 'leftPaddingTop', label: 'Rail Padding Top', min: 0, max: 20, step: 1, unit: 'vh' },
      { id: 'leftPaddingBottom', label: 'Rail Padding Bottom', min: 0, max: 20, step: 1, unit: 'vh' },
      { id: 'leftGap', label: 'Rail Gap', min: 0.5, max: 5, step: 0.25, unit: 'rem' },
      { id: 'photoSize', label: 'Portrait Size', min: 10, max: 150, step: 1, unit: '%' },
      { id: 'photoAspectRatio', label: 'Portrait Aspect', min: 0.5, max: 1.5, step: 0.05, unit: '' },
      { id: 'photoBorderRadius', label: 'Portrait Radius', min: 0, max: 3, step: 0.1, unit: 'rem' },
      { id: 'rightPaddingTop', label: 'Content Top', min: 0, max: 30, step: 1, unit: 'vh' },
      { id: 'rightPaddingBottom', label: 'Content Bottom', min: 0, max: 30, step: 1, unit: 'vh' },
      { id: 'rightPaddingX', label: 'Content X', min: 0, max: 5, step: 0.25, unit: 'rem' },
      { id: 'rightMaxWidth', label: 'Content Max Width', min: 30, max: 60, step: 1, unit: 'rem' },
    ],
  },
  {
    key: 'type',
    title: 'Type',
    icon: '✍',
    defaultOpen: false,
    controls: [
      { id: 'nameSize', label: 'Name Size', min: 1, max: 4, step: 0.1, unit: 'rem' },
      { id: 'titleSize', label: 'Title Size', min: 0.5, max: 1.5, step: 0.05, unit: 'rem' },
      { id: 'sectionTitleSize', label: 'Section Label', min: 0.5, max: 1.2, step: 0.05, unit: 'rem' },
      { id: 'bodySize', label: 'Body Size', min: 0.6, max: 1.4, step: 0.05, unit: 'rem' },
      { id: 'mutedOpacity', label: 'Muted Opacity', min: 0.2, max: 1, step: 0.05, unit: '' },
    ],
  },
  {
    key: 'spacing',
    title: 'Spacing',
    icon: '↕',
    defaultOpen: false,
    controls: [
      { id: 'sectionGap', label: 'Section Gap', min: 1, max: 6, step: 0.25, unit: 'rem' },
      { id: 'paragraphGap', label: 'Paragraph Gap', min: 0.5, max: 3, step: 0.25, unit: 'rem' },
    ],
  },
];

function cloneConfig(config = DEFAULT_CONFIG) {
  return { ...DEFAULT_CONFIG, ...(config || {}) };
}

async function loadCvConfig() {
  try {
    const designSystem = await loadDesignSystemConfig();
    return cloneConfig(deriveCvConfig(designSystem));
  } catch (e) {
    return cloneConfig();
  }
}

function formatValue(control, value) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return String(value ?? '');
  if (!control.unit) return `${numeric}`;
  return `${numeric}${control.unit}`;
}

function setOutput(control, value) {
  const output = document.getElementById(`${control.id}Val`);
  if (output) output.textContent = formatValue(control, value);
}

function applyConfig(config) {
  const root = document.documentElement;

  root.style.setProperty('--cv-left-width', `${config.leftWidth}vw`);
  root.style.setProperty('--cv-left-padding-top', `${config.leftPaddingTop}vh`);
  root.style.setProperty('--cv-left-padding-bottom', `${config.leftPaddingBottom}vh`);
  root.style.setProperty('--cv-left-gap', `${config.leftGap}rem`);
  root.style.setProperty('--cv-photo-aspect-ratio', `${config.photoAspectRatio}`);
  root.style.setProperty('--cv-photo-size', `${config.photoSize}%`);
  root.style.setProperty('--cv-photo-border-radius', `${config.photoBorderRadius}rem`);
  root.style.setProperty('--cv-right-padding-top', `${config.rightPaddingTop}vh`);
  root.style.setProperty('--cv-right-padding-bottom', `${config.rightPaddingBottom}vh`);
  root.style.setProperty('--cv-right-padding-x', `${config.rightPaddingX}rem`);
  root.style.setProperty('--cv-right-max-width', `${config.rightMaxWidth}rem`);
  root.style.setProperty('--cv-name-size', `${config.nameSize}rem`);
  root.style.setProperty('--cv-title-size', `${config.titleSize}rem`);
  root.style.setProperty('--cv-section-title-size', `${config.sectionTitleSize}rem`);
  root.style.setProperty('--cv-body-size', `${config.bodySize}rem`);
  root.style.setProperty('--cv-section-gap', `${config.sectionGap}rem`);
  root.style.setProperty('--cv-paragraph-gap', `${config.paragraphGap}rem`);
  root.style.setProperty('--cv-muted-opacity', `${config.mutedOpacity}`);
}

function generateControlHTML(control, config) {
  const value = config[control.id] ?? DEFAULT_CONFIG[control.id] ?? 0;
  return `
    <label class="control-row" data-control-id="${control.id}">
      <div class="control-row-header">
        <span class="control-label">${control.label}</span>
        <span class="control-value" id="${control.id}Val">${formatValue(control, value)}</span>
      </div>
      <input
        type="range"
        id="${control.id}Slider"
        min="${control.min}"
        max="${control.max}"
        step="${control.step}"
        value="${value}"
        aria-label="${control.label}"
      />
    </label>
  `;
}

export function generateCvPanelSectionsHTML(config = DEFAULT_CONFIG) {
  return SECTION_DEFS.map((section) => {
    const controlsHTML = section.controls.map((control) => generateControlHTML(control, config)).join('');
    const openAttr = section.defaultOpen ? 'open' : '';
    return `
      <details class="panel-section-accordion" data-cv-section="${section.key}" ${openAttr}>
        <summary class="panel-section-header">
          <span class="section-icon">${section.icon}</span>
          <span class="section-label">${section.title}</span>
        </summary>
        <div class="panel-section-content">
          ${controlsHTML}
        </div>
      </details>
    `;
  }).join('');
}

function syncInputs(config) {
  for (const section of SECTION_DEFS) {
    for (const control of section.controls) {
      const input = document.getElementById(`${control.id}Slider`);
      if (!input) continue;
      const value = config[control.id] ?? DEFAULT_CONFIG[control.id];
      input.value = String(value);
      setOutput(control, value);
    }
  }
}

export function setupCvPanelControls(initialConfig = DEFAULT_CONFIG) {
  const resetConfig = cloneConfig(initialConfig);
  let currentConfig = cloneConfig(initialConfig);

  applyConfig(currentConfig);
  syncInputs(currentConfig);

  for (const section of SECTION_DEFS) {
    for (const control of section.controls) {
      const input = document.getElementById(`${control.id}Slider`);
      if (!input || input.dataset.cvBound === 'true') continue;
      input.dataset.cvBound = 'true';
      input.addEventListener('input', () => {
        const value = Number.parseFloat(input.value);
        currentConfig[control.id] = Number.isFinite(value) ? value : DEFAULT_CONFIG[control.id];
        setOutput(control, currentConfig[control.id]);
        applyConfig(currentConfig);
      });
    }
  }

  const saveBtn = document.getElementById('saveCvConfigBtn');
  if (saveBtn && saveBtn.dataset.cvBound !== 'true') {
    saveBtn.dataset.cvBound = 'true';
    saveBtn.addEventListener('click', async () => {
      const originalLabel = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving Design JSON…';

      try {
        const result = await performDesignSystemSave({ cvSnapshot: currentConfig });
        saveBtn.textContent = result.saved ? 'Saved Design JSON' : 'Downloaded Design JSON';
      } catch (e) {
        saveBtn.textContent = 'Design Save Failed';
      } finally {
        window.setTimeout(() => {
          saveBtn.disabled = false;
          saveBtn.textContent = originalLabel;
        }, 1400);
      }
    });
  }

  const resetBtn = document.getElementById('resetCvConfigBtn');
  if (resetBtn && resetBtn.dataset.cvBound !== 'true') {
    resetBtn.dataset.cvBound = 'true';
    resetBtn.addEventListener('click', () => {
      currentConfig = cloneConfig(resetConfig);
      applyConfig(currentConfig);
      syncInputs(currentConfig);
    });
  }
}

export async function initCvPanel() {
  const initialConfig = await loadCvConfig();
  const pageHTML = `
    ${generateCvPanelSectionsHTML(initialConfig)}
    <div class="panel-section panel-section--action">
      <button id="resetCvConfigBtn">Reset CV Layout</button>
    </div>
  `;

  createPanelDock({
    page: 'cv',
    pageLabel: 'CV',
    pageHTML,
    pageSectionTitle: 'CV',
    pageSectionIcon: '📄',
    includePageSaveButton: true,
    pageSaveButtonId: 'saveCvConfigBtn',
    bindShortcut: true,
    panelTitle: 'Settings',
    modeLabel: 'DEV MODE',
    setupPageControls: () => {
      setupCvPanelControls(initialConfig);
    },
  });
}
