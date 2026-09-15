import { SCENE_LIGHT_CONTROLS, MATERIAL_CONTROLS, SCENE_MATERIALS, normalizeSceneLighting } from '../../../lib/scene-lighting.js';
import { isDarkThemeDocument, THEME_CHANGE_EVENT } from '../../../lib/theme-state.js';
import { getShellConfig, patchShellSurface, syncShellToDocument } from '../visual/site-shell.js';
import { setTheme } from '../visual/dark-mode-v2.js';
import { forEachPanelUiDocument } from './panel-ui-context.js';

let selectedMaterial = 'window';
let themeListenerBound = false;
const currentTheme = () => isDarkThemeDocument() ? 'dark' : 'light';
const currentLighting = () => {
  const surface = getShellConfig()?.surface || {};
  return normalizeSceneLighting(surface.lighting, surface);
};
const materialControls = () => MATERIAL_CONTROLS.filter(c => c.id !== 'shadow' || SCENE_MATERIALS.find(m => m.id === selectedMaterial).shadow !== false);

function row(control, scope) {
  const id = `sceneLighting_${scope}_${control.id}`;
  if (control.options) return `<label class="control-row" for="${id}">
    <span class="control-label">${control.label}</span>
    <select class="control-select" aria-label="${control.label}" id="${id}" data-lighting-scope="${scope}" data-lighting-key="${control.id}">
    ${control.options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label>`;
  return `<label class="control-row" for="${id}">
    <span class="control-row-header"><span class="control-label">${control.label}</span><output class="control-value" data-lighting-value="${scope}.${control.id}" for="${id}"></output></span>
    <input type="range" id="${id}" min="${control.min}" max="${control.max}" step="${control.step}" data-lighting-scope="${scope}" data-lighting-key="${control.id}" aria-label="${control.label}">
  </label>`;
}

export function generateSceneLightingControls() {
  return `<details class="panel-section-accordion" data-section-key="surfaceFinish" data-studio-surface-section="surfaceFinish" open>
    <summary class="panel-section-header"><span class="section-icon">✦</span><span class="section-label">Scene light & materials</span></summary>
    <div class="panel-section-content" data-scene-lighting>
      <label class="control-row" for="sceneLighting_theme"><span class="control-label">Edit & preview mode</span>
        <select class="control-select" id="sceneLighting_theme" aria-label="Edit & preview mode" data-lighting-theme><option value="light">Light mode</option><option value="dark">Dark mode</option></select>
      </label>
      ${SCENE_LIGHT_CONTROLS.map(c => row(c, 'scene')).join('')}
      <label class="control-row" for="sceneLighting_material"><span class="control-label">Material</span>
        <select class="control-select" id="sceneLighting_material" aria-label="Material" data-lighting-material>${SCENE_MATERIALS.map(m => `<option value="${m.id}">${m.label}</option>`).join('')}</select>
      </label>
      <p class="control-hint" data-lighting-description></p>
      <div data-lighting-material-controls></div>
      <p class="control-hint">100% keeps the current finish. Materials respond to the scene light. Each mode saves separately.</p>
      <button type="button" class="panel-action-btn" data-lighting-reset>Reset this mode</button>
    </div>
  </details>`;
}

function syncDocument(doc) {
  const host = doc.querySelector('[data-scene-lighting]');
  if (!host) return;
  const theme = currentTheme();
  const profile = currentLighting()[theme];
  host.querySelector('[data-lighting-theme]').value = theme;
  host.querySelector('[data-lighting-material]').value = selectedMaterial;
  host.querySelector('[data-lighting-description]').textContent = SCENE_MATERIALS.find(m => m.id === selectedMaterial).description;
  const rows = host.querySelector('[data-lighting-material-controls]');
  if (rows.dataset.material !== selectedMaterial) {
    rows.innerHTML = materialControls().map(c => row(c, 'material')).join('');
    rows.dataset.material = selectedMaterial;
  }
  for (const input of host.querySelectorAll('[data-lighting-key]')) {
    const scope = input.dataset.lightingScope;
    const key = input.dataset.lightingKey;
    const value = (scope === 'scene' ? profile : profile.materials[selectedMaterial])[key];
    input.value = String(value);
    const output = host.querySelector(`[data-lighting-value="${scope}.${key}"]`);
    if (output) output.textContent = `${Math.round(value * 100)}%`;
  }
  host.querySelector('[data-lighting-reset]').textContent = `Reset ${theme} mode`;
}
const syncHosts = () => forEachPanelUiDocument(syncDocument);

function applyLighting(lighting) {
  patchShellSurface({ lighting: normalizeSceneLighting(lighting) });
  syncShellToDocument({ config: getShellConfig(), isDark: isDarkThemeDocument() });
  syncHosts();
}

export function bindSceneLightingControls(doc) {
  const host = doc.querySelector('[data-scene-lighting]');
  if (!host) return;
  syncDocument(doc);
  if (host.dataset.boundLighting === 'true') return;
  host.dataset.boundLighting = 'true';
  host.addEventListener('input', event => {
    const input = event.target.closest('[data-lighting-key]');
    if (!input) return;
    const lighting = currentLighting();
    const profile = lighting[currentTheme()];
    const target = input.dataset.lightingScope === 'scene' ? profile : profile.materials[selectedMaterial];
    target[input.dataset.lightingKey] = Number(input.value);
    applyLighting(lighting);
  });
  host.addEventListener('change', event => {
    if (event.target.matches('[data-lighting-theme]')) setTheme(event.target.value);
    if (event.target.matches('[data-lighting-material]')) {
      selectedMaterial = event.target.value;
      syncHosts();
    }
  });
  host.querySelector('[data-lighting-reset]').addEventListener('click', () => {
    const lighting = currentLighting();
    lighting[currentTheme()] = normalizeSceneLighting()[currentTheme()];
    applyLighting(lighting);
  });
  if (!themeListenerBound) {
    window.addEventListener(THEME_CHANGE_EVENT, syncHosts);
    themeListenerBound = true;
  }
}
if (import.meta.hot) import.meta.hot.dispose(() => window.removeEventListener(THEME_CHANGE_EVENT, syncHosts));
