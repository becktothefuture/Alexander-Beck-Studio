import {
  DEFAULT_PLAYGROUND_CONFIG,
  PLAYGROUND_CONFIG_BOUNDS,
  PLAYGROUND_LAYOUT_PRESETS,
  buildPlaygroundCanonicalSnapshot,
  generateAndApplyPlaygroundLayoutSeed,
  getPlaygroundConfigSnapshot,
  resetPlaygroundConfig,
  subscribePlaygroundConfig,
  updatePlaygroundConfig,
} from './playgroundConfig.js';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function numericControl(id, label, extra = {}) {
  return {
    id,
    label,
    type: 'range',
    defaultValue: DEFAULT_PLAYGROUND_CONFIG[id],
    ...PLAYGROUND_CONFIG_BOUNDS[id],
    ...extra,
  };
}

export const PLAYGROUND_PANEL_SCHEMA = deepFreeze([
  {
    id: 'composition',
    title: 'Composition',
    initiallyOpen: true,
    controls: [
      {
        id: 'layoutPreset',
        label: 'Layout preset',
        type: 'select',
        defaultValue: DEFAULT_PLAYGROUND_CONFIG.layoutPreset,
        options: PLAYGROUND_LAYOUT_PRESETS.map((value) => ({
          value,
          label: `${value.charAt(0).toUpperCase()}${value.slice(1)}`,
        })),
      },
      numericControl('projectSpacing', 'Project spacing', {
        unit: '×',
        hint: 'Higher spreads projects and grows the repeat area.',
      }),
      numericControl('itemScale', 'Item scale', { unit: '×' }),
      numericControl('sizeVariation', 'Size variation', { display: 'percent' }),
    ],
  },
  {
    id: 'grid',
    title: 'Dot field',
    controls: [
      numericControl('gridSpacingPx', 'Grid spacing', {
        unit: 'px',
        hint: 'Lower is denser.',
      }),
      numericControl('dotRadiusPx', 'Dot radius', { unit: 'px' }),
      numericControl('dotOpacity', 'Dot opacity', { display: 'percent' }),
      numericControl('colorWakeRadiusPx', 'Colour radius', {
        unit: 'px',
        hint: 'Area around the pointer that wakes the current ball palette.',
      }),
      numericControl('colorWakePersistenceMs', 'Colour persistence', {
        display: 'duration',
        hint: 'How long colour remains after the pointer moves away.',
      }),
      numericControl('colorWakeOpacity', 'Colour intensity', { display: 'percent' }),
      numericControl('colorWakeDensity', 'Colour density', {
        display: 'percent',
        hint: 'Share of dots that respond inside the influence area.',
      }),
      numericControl('colorWakeEdgeSoftness', 'Edge softness', {
        display: 'percent',
        hint: 'Controls how strongly colour concentrates near the pointer before fading outward.',
      }),
      numericControl('colorWakeDotScale', 'Colour dot size', { unit: '×' }),
    ],
  },
  {
    id: 'motion',
    title: 'Motion',
    controls: [
      numericControl('wheelSensitivity', 'Wheel sensitivity', { unit: '×' }),
      numericControl('dragMomentum', 'Drag momentum', { display: 'percent' }),
    ],
  },
  {
    id: 'actions',
    title: 'Actions',
    actions: [
      { id: 'recenter', label: 'Recenter on title' },
      { id: 'new-seed', label: 'Generate new seed' },
      { id: 'reset', label: 'Reset Lab values' },
    ],
  },
  {
    id: 'diagnostics',
    title: 'Diagnostics',
    diagnostics: [
      { id: 'projectCount', label: 'Project count', integer: true },
      { id: 'worldColumns', label: 'World columns', integer: true },
      { id: 'worldRows', label: 'World rows', integer: true },
      { id: 'occupiedCellPercentage', label: 'Occupied cells', unit: '%' },
      { id: 'activeVisibleCopyCount', label: 'Visible copies', integer: true },
    ],
  },
]);

const CONTROL_BY_ID = new Map(
  PLAYGROUND_PANEL_SCHEMA.flatMap((folder) => folder.controls || []).map((control) => [control.id, control]),
);

const DIAGNOSTIC_BY_ID = new Map(
  PLAYGROUND_PANEL_SCHEMA.flatMap((folder) => folder.diagnostics || []).map((diagnostic) => [diagnostic.id, diagnostic]),
);

function getDigits(control) {
  if (control.integer) return 0;
  const step = Number(control.step);
  if (step < 0.1) return 2;
  if (step < 1) return 1;
  return 0;
}

function formatControlValue(value, control) {
  if (control.display === 'percent') return `${Math.round(Number(value) * 100)}%`;
  if (control.display === 'duration') return `${(Number(value) / 1000).toFixed(1)}s`;
  const numeric = Number(value);
  const formatted = control.integer
    ? String(Math.round(numeric))
    : numeric.toFixed(getDigits(control));
  return `${formatted}${control.unit || ''}`;
}

function generateSelectHTML(control, value) {
  const options = control.options.map((option) => `
    <option value="${option.value}" ${option.value === value ? 'selected' : ''}>${option.label}</option>
  `).join('');

  return `
    <label class="control-row" data-playground-control="${control.id}">
      <span class="control-label">${control.label}</span>
      <select class="control-select" aria-label="${control.label}">${options}</select>
    </label>
  `;
}

function generateNumberHTML(control, value) {
  return `
    <label class="control-row" data-playground-control="${control.id}">
      <span class="control-label">${control.label}</span>
      <input
        type="number"
        min="${control.min}"
        max="${control.max}"
        step="${control.step}"
        value="${value}"
        inputmode="numeric"
        aria-label="${control.label}"
      />
    </label>
  `;
}

function generateRangeHTML(control, value) {
  return `
    <label class="control-row" data-playground-control="${control.id}">
      <span class="control-label">${control.label}</span>
      <input
        type="range"
        min="${control.min}"
        max="${control.max}"
        step="${control.step}"
        value="${value}"
        aria-label="${control.label}"
      />
      <span class="val" data-playground-value>${formatControlValue(value, control)}</span>
    </label>
    ${control.hint ? `<p class="control-hint">${control.hint}</p>` : ''}
  `;
}

function generateControlHTML(control, config) {
  const value = config[control.id];
  if (control.type === 'select') return generateSelectHTML(control, value);
  if (control.type === 'number') return generateNumberHTML(control, value);
  return generateRangeHTML(control, value);
}

function generateActionHTML(action) {
  return `
    <button
      type="button"
      class="${action.primary ? 'primary' : ''}"
      data-playground-action="${action.id}"
    >${action.label}</button>
  `;
}

function generateDiagnosticHTML(diagnostic) {
  return `
    <div class="control-row" data-playground-diagnostic="${diagnostic.id}">
      <span class="control-label">${diagnostic.label}</span>
      <output class="val">—</output>
    </div>
  `;
}

function generateFolderContent(folder, config) {
  if (folder.controls) return folder.controls.map((control) => generateControlHTML(control, config)).join('');
  if (folder.actions) {
    return `
      <div class="panel-section playground-panel-actions">
        ${folder.actions.map(generateActionHTML).join('')}
        <p class="control-hint" data-playground-action-status aria-live="polite"></p>
      </div>
    `;
  }
  return folder.diagnostics.map(generateDiagnosticHTML).join('');
}

export function generatePlaygroundPanelHTML(config = getPlaygroundConfigSnapshot()) {
  const normalizedConfig = buildPlaygroundCanonicalSnapshot(config);
  return PLAYGROUND_PANEL_SCHEMA.map((folder) => `
    <details
      class="panel-section-accordion"
      data-playground-folder="${folder.id}"
      ${folder.initiallyOpen ? 'open' : ''}
    >
      <summary class="panel-section-header">
        <span class="section-label">${folder.title}</span>
      </summary>
      <div class="panel-section-content">
        ${generateFolderContent(folder, normalizedConfig)}
      </div>
    </details>
  `).join('');
}

function formatDiagnosticValue(value, diagnostic) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  const formatted = diagnostic.integer
    ? String(Math.round(numeric))
    : numeric.toFixed(Number.isInteger(numeric) ? 0 : 1);
  return `${formatted}${diagnostic.unit || ''}`;
}

export function syncPlaygroundPanelDiagnostics(panel, diagnostics = {}) {
  if (!panel) return;
  const source = diagnostics && typeof diagnostics === 'object' ? diagnostics : {};
  panel.querySelectorAll('[data-playground-diagnostic]').forEach((row) => {
    const diagnostic = DIAGNOSTIC_BY_ID.get(row.dataset.playgroundDiagnostic);
    const output = row.querySelector('output');
    if (!diagnostic || !output) return;
    output.textContent = formatDiagnosticValue(source[diagnostic.id], diagnostic);
  });
}

export async function savePlaygroundDesignConfiguration() {
  const { performDesignSystemSave } = await import('../../../legacy/modules/utils/design-system-save.js');
  return performDesignSystemSave({
    playgroundSnapshot: buildPlaygroundCanonicalSnapshot(),
  });
}

export function bindPlaygroundPanel(panel, options = {}) {
  if (!panel) return undefined;

  const syncControls = (config = getPlaygroundConfigSnapshot()) => {
    panel.querySelectorAll('[data-playground-control]').forEach((row) => {
      const control = CONTROL_BY_ID.get(row.dataset.playgroundControl);
      if (!control) return;
      const input = row.querySelector('input, select');
      if (input) input.value = String(config[control.id]);
      const value = row.querySelector('[data-playground-value]');
      if (value) value.textContent = formatControlValue(config[control.id], control);
    });
  };

  const applyControl = (event, expectedType) => {
    const input = event.target.closest('input, select');
    const row = input?.closest('[data-playground-control]');
    const control = row ? CONTROL_BY_ID.get(row.dataset.playgroundControl) : null;
    if (!control || control.type !== expectedType) return;
    const value = control.type === 'select' ? input.value : Number(input.value);
    if (control.type !== 'select' && !Number.isFinite(value)) return;
    updatePlaygroundConfig({ [control.id]: value }, { reason: `panel:${control.id}` });
  };

  const handleInput = (event) => applyControl(event, 'range');
  const handleChange = (event) => {
    const type = event.target.matches('select') ? 'select' : 'number';
    applyControl(event, type);
  };

  const setActionStatus = (message) => {
    const status = panel.querySelector('[data-playground-action-status]');
    if (status) status.textContent = message;
  };

  const handleAction = async (event) => {
    const button = event.target.closest('[data-playground-action], #savePlaygroundConfigBtn');
    if (!button || !panel.contains(button)) return;

    const action = button.id === 'savePlaygroundConfigBtn'
      ? 'save'
      : button.dataset.playgroundAction;
    if (action === 'recenter') {
      options.onRecenter?.();
      setActionStatus('Recentred on title.');
      return;
    }

    if (action === 'new-seed') {
      const config = generateAndApplyPlaygroundLayoutSeed(options.randomSource);
      options.onGenerateSeed?.(config.layoutSeed, config);
      setActionStatus(`Generated seed ${config.layoutSeed}.`);
      return;
    }

    if (action === 'reset') {
      const config = resetPlaygroundConfig();
      options.onReset?.(config);
      setActionStatus('Lab values reset.');
      return;
    }

    if (action !== 'save') return;

    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving…';
    setActionStatus('Saving design configuration.');
    try {
      const result = await savePlaygroundDesignConfiguration();
      button.textContent = result.saved ? 'Saved' : 'Downloaded JSON';
      setActionStatus(result.saved
        ? 'Design configuration saved.'
        : 'The design configuration was downloaded.');
      options.onSave?.(result);
    } catch (error) {
      button.textContent = 'Save failed';
      setActionStatus('Design configuration save failed.');
      options.onSaveError?.(error);
    } finally {
      window.setTimeout(() => {
        button.disabled = false;
        button.textContent = originalLabel;
      }, 1400);
    }
  };

  panel.addEventListener('input', handleInput);
  panel.addEventListener('change', handleChange);
  panel.addEventListener('click', handleAction);
  const unsubscribeConfig = subscribePlaygroundConfig(syncControls, { emitInitial: true });

  const getDiagnostics = typeof options.getDiagnostics === 'function'
    ? options.getDiagnostics
    : () => ({});
  syncPlaygroundPanelDiagnostics(panel, getDiagnostics());
  const unsubscribeDiagnostics = typeof options.subscribeDiagnostics === 'function'
    ? options.subscribeDiagnostics((diagnostics) => syncPlaygroundPanelDiagnostics(panel, diagnostics))
    : null;

  return () => {
    panel.removeEventListener('input', handleInput);
    panel.removeEventListener('change', handleChange);
    panel.removeEventListener('click', handleAction);
    unsubscribeConfig();
    if (typeof unsubscribeDiagnostics === 'function') unsubscribeDiagnostics();
  };
}

export function createPlaygroundPanelRouteOptions(options = {}) {
  return {
    page: 'playground',
    pageLabel: 'Lab',
    productLabel: 'Alexander Beck Studio',
    panelTitle: 'Lab Controls',
    pageSectionTitle: 'Lab',
    pageSectionIcon: '◉',
    pageHTML: generatePlaygroundPanelHTML(),
    includePageSaveButton: true,
    pageSaveButtonId: 'savePlaygroundConfigBtn',
    pageSaveButtonLabel: '💾 Save Design JSON',
    masterGroupIds: ['audio'],
    footerHint: '<kbd>/</kbd> panel · <kbd>Shift</kbd> + settings opens detached · canonical save',
    syncInitialControlSideEffects: false,
    setupPageControls: (panel) => bindPlaygroundPanel(panel, options),
  };
}

export async function registerPlaygroundPanelRoute(options = {}) {
  const { registerDevPanelRoute } = await import('../../../legacy/modules/ui/panel-popup-manager.js');
  const panelOptions = createPlaygroundPanelRouteOptions(options);
  registerDevPanelRoute(panelOptions);
  return panelOptions;
}

export async function unregisterPlaygroundPanelRoute() {
  const { unregisterDevPanelRoute } = await import('../../../legacy/modules/ui/panel-popup-manager.js');
  return unregisterDevPanelRoute('playground');
}

export async function mountDetachedPlaygroundPanel({
  targetDocument,
  targetWindow,
  mountRoot = null,
  ...options
} = {}) {
  const { mountDetachedPanel } = await import('../../../legacy/modules/ui/panel-dock.js');
  return mountDetachedPanel({
    ...createPlaygroundPanelRouteOptions(options),
    targetDocument,
    targetWindow,
    mountRoot,
  });
}
