import {
  CONTACT_RIPPLE_CONFIG_EVENT,
  CONTACT_RIPPLE_CONTROL_GROUPS,
  getContactRippleConfig,
  setContactRippleConfig,
} from './contactRippleConfig.js';

function formatControlValue(value, control) {
  if (control.display === 'percent') return `${Math.round(value * 100)}%`;
  if (control.integer) return `${Math.round(value)}${control.unit || ''}`;
  const digits = Number.isInteger(control.digits)
    ? control.digits
    : (control.step < 0.01 ? 3 : control.step < 1 ? 2 : 0);
  return `${Number(value).toFixed(digits)}${control.unit || ''}`;
}

function generateControlHTML(control, config) {
  const value = config[control.id];
  return `
    <label class="control-row" data-contact-ripple-control="${control.id}">
      <span class="control-label">${control.label}</span>
      <input
        type="range"
        min="${control.min}"
        max="${control.max}"
        step="${control.step}"
        value="${value}"
        aria-label="${control.label}"
      />
      <span class="val" data-contact-ripple-value>${formatControlValue(value, control)}</span>
    </label>
  `;
}

export function generateContactRipplePanelHTML(config = getContactRippleConfig()) {
  return CONTACT_RIPPLE_CONTROL_GROUPS.map((group, index) => `
    <details class="panel-section-accordion" ${group.initiallyOpen || index === 0 ? 'open' : ''}>
      <summary class="panel-section-header">
        <span class="section-label">${group.title}</span>
      </summary>
      <div class="panel-section-content">
        ${group.controls.map((control) => generateControlHTML(control, config)).join('')}
      </div>
    </details>
  `).join('');
}

export function bindContactRipplePanel(panel) {
  if (!panel) return undefined;
  const controlMap = new Map();

  for (const group of CONTACT_RIPPLE_CONTROL_GROUPS) {
    for (const control of group.controls) controlMap.set(control.id, control);
  }

  const syncControls = (config = getContactRippleConfig()) => {
    panel.querySelectorAll('[data-contact-ripple-control]').forEach((row) => {
      const control = controlMap.get(row.dataset.contactRippleControl);
      if (!control) return;
      const input = row.querySelector('input[type="range"]');
      const valueNode = row.querySelector('[data-contact-ripple-value]');
      const value = config[control.id];
      if (input) input.value = String(value);
      if (valueNode) valueNode.textContent = formatControlValue(value, control);
    });
  };

  const handleInput = (event) => {
    const input = event.target.closest('input[type="range"]');
    const row = input?.closest('[data-contact-ripple-control]');
    const control = row ? controlMap.get(row.dataset.contactRippleControl) : null;
    if (!control) return;
    setContactRippleConfig({
      ...getContactRippleConfig(),
      [control.id]: Number(input.value),
    });
  };

  const handleConfigChange = (event) => {
    syncControls(event.detail?.config || getContactRippleConfig());
  };

  panel.addEventListener('input', handleInput);
  window.addEventListener(CONTACT_RIPPLE_CONFIG_EVENT, handleConfigChange);
  syncControls();

  return () => {
    panel.removeEventListener('input', handleInput);
    window.removeEventListener(CONTACT_RIPPLE_CONFIG_EVENT, handleConfigChange);
  };
}
