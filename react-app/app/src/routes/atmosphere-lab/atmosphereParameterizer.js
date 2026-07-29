import {
  ATMOSPHERE_LAB_VARIANTS,
  DEFAULT_ATMOSPHERE_LAB_CONFIG,
  DEFAULT_SIMULATION_ATMOSPHERE_CONFIG,
  getAtmosphereControlGroups,
  normalizeAtmosphereLabConfig,
  normalizeSimulationAtmosphereConfig,
} from './atmosphereLabControls.js';

const PANEL_POSITION_STORAGE_KEY = 'abs_atmosphere_panel_position_v1';
const PANEL_INSET_PX = 8;
const PANEL_KEYBOARD_STEP_PX = 16;
const PANEL_KEYBOARD_LARGE_STEP_PX = 48;
const PANEL_DRAG_EXCLUSION_SELECTOR = 'button, input, select, textarea, a, [role="button"]';

function formatValue(value, display) {
  if (display === 'percent') return `${Math.round(Number(value) * 100)}%`;
  if (display === 'integer') return String(Math.round(Number(value)));
  if (display === 'ms') return `${Math.round(Number(value))} ms`;
  if (display === 'px') return `${Math.round(Number(value))} px`;
  if (display === 'subpx') return `${Number(value).toFixed(2).replace(/\.?0+$/, '')} px`;
  if (display === 'pxs') return `${Number(value).toFixed(1)} px/s`;
  if (display === 'vh') return `${Number(value).toFixed(2)} vh`;
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return String(value);
}

function downloadConfig(config, filename = 'atmosphere-lab.json') {
  const blob = new Blob([`${JSON.stringify(config, null, 2)}\n`], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

function createElement(tagName, className, textContent = '') {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (textContent) element.textContent = textContent;
  return element;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function readStoredPanelPosition() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(PANEL_POSITION_STORAGE_KEY) || 'null');
    if (!Number.isFinite(parsed?.xRatio) || !Number.isFinite(parsed?.yRatio)) return null;
    return {
      xRatio: clamp(parsed.xRatio, 0, 1),
      yRatio: clamp(parsed.yRatio, 0, 1),
    };
  } catch {
    return null;
  }
}

function writeStoredPanelPosition(position) {
  try {
    sessionStorage.setItem(PANEL_POSITION_STORAGE_KEY, JSON.stringify(position));
  } catch {
    // Movement still works when storage is unavailable.
  }
}

function clearStoredPanelPosition() {
  try {
    sessionStorage.removeItem(PANEL_POSITION_STORAGE_KEY);
  } catch {
    // The panel can still reset visually when storage is unavailable.
  }
}

function installPanelDragging(panel, handle, boundary) {
  let dragState = null;
  let dragFrame = 0;
  let restoreFrame = 0;

  handle.tabIndex = 0;
  handle.setAttribute('role', 'group');
  handle.setAttribute('aria-label', 'Move Atmosphere controls. Use arrow keys to move and Home to reset.');
  handle.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight Home');
  handle.title = 'Drag to move · Arrow keys to nudge · Home to reset';

  const getBounds = () => {
    const offsetParent = panel.offsetParent || panel.parentElement;
    const offsetParentRect = offsetParent?.getBoundingClientRect();
    const boundaryRect = boundary?.getBoundingClientRect() || offsetParentRect;
    const panelRect = panel.getBoundingClientRect();
    if (!offsetParentRect || !boundaryRect) return null;
    const minLeft = boundaryRect.left - offsetParentRect.left + PANEL_INSET_PX;
    const minTop = boundaryRect.top - offsetParentRect.top + PANEL_INSET_PX;
    const maxLeft = Math.max(minLeft, boundaryRect.right - offsetParentRect.left - panelRect.width - PANEL_INSET_PX);
    const maxTop = Math.max(minTop, boundaryRect.bottom - offsetParentRect.top - panelRect.height - PANEL_INSET_PX);
    return {
      offsetParentRect,
      panelRect,
      minLeft,
      minTop,
      maxLeft,
      maxTop,
    };
  };

  const persistPosition = (left, top, bounds) => {
    const widthRange = bounds.maxLeft - bounds.minLeft;
    const heightRange = bounds.maxTop - bounds.minTop;
    writeStoredPanelPosition({
      xRatio: widthRange > 0 ? (left - bounds.minLeft) / widthRange : 0,
      yRatio: heightRange > 0 ? (top - bounds.minTop) / heightRange : 0,
    });
  };

  const setPosition = (left, top, { persist = false } = {}) => {
    const bounds = getBounds();
    if (!bounds) return;
    const nextLeft = clamp(left, bounds.minLeft, bounds.maxLeft);
    const nextTop = clamp(top, bounds.minTop, bounds.maxTop);
    panel.style.left = `${nextLeft}px`;
    panel.style.top = `${nextTop}px`;
    panel.style.right = 'auto';
    panel.style.transform = '';
    if (persist) persistPosition(nextLeft, nextTop, bounds);
  };

  const restorePosition = () => {
    const stored = readStoredPanelPosition();
    const bounds = getBounds();
    if (!bounds) return;
    if (!stored) {
      setPosition(bounds.maxLeft, bounds.minTop);
      return;
    }
    setPosition(
      bounds.minLeft + (bounds.maxLeft - bounds.minLeft) * stored.xRatio,
      bounds.minTop + (bounds.maxTop - bounds.minTop) * stored.yRatio,
    );
  };

  const resetPosition = () => {
    clearStoredPanelPosition();
    const bounds = getBounds();
    if (bounds) setPosition(bounds.maxLeft, bounds.minTop);
  };

  const moveDragPreview = () => {
    dragFrame = 0;
    if (!dragState) return;
    panel.style.transform = `translate3d(${dragState.left - dragState.startLeft}px, ${dragState.top - dragState.startTop}px, 0)`;
  };

  const updateDragPosition = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    dragState.left = clamp(
      dragState.startLeft + event.clientX - dragState.startX,
      dragState.bounds.minLeft,
      dragState.bounds.maxLeft,
    );
    dragState.top = clamp(
      dragState.startTop + event.clientY - dragState.startY,
      dragState.bounds.minTop,
      dragState.bounds.maxTop,
    );
    if (!dragFrame) dragFrame = requestAnimationFrame(moveDragPreview);
  };

  const finishDrag = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    updateDragPosition(event);
    if (dragFrame) {
      cancelAnimationFrame(dragFrame);
      dragFrame = 0;
    }
    const { left, top, pointerId } = dragState;
    dragState = null;
    delete panel.dataset.dragging;
    if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
    setPosition(left, top, { persist: true });
  };

  const onPointerDown = (event) => {
    if (event.button !== 0 || event.target.closest(PANEL_DRAG_EXCLUSION_SELECTOR)) return;
    const bounds = getBounds();
    if (!bounds) return;
    const startLeft = bounds.panelRect.left - bounds.offsetParentRect.left;
    const startTop = bounds.panelRect.top - bounds.offsetParentRect.top;
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft,
      startTop,
      left: startLeft,
      top: startTop,
      bounds,
    };
    panel.style.left = `${startLeft}px`;
    panel.style.top = `${startTop}px`;
    panel.style.right = 'auto';
    panel.dataset.dragging = 'true';
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onKeyDown = (event) => {
    if (event.target !== handle) return;
    if (event.key === 'Home') {
      resetPosition();
      event.preventDefault();
      return;
    }
    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (!direction) return;
    const bounds = getBounds();
    if (!bounds) return;
    const step = event.shiftKey ? PANEL_KEYBOARD_LARGE_STEP_PX : PANEL_KEYBOARD_STEP_PX;
    const currentLeft = bounds.panelRect.left - bounds.offsetParentRect.left;
    const currentTop = bounds.panelRect.top - bounds.offsetParentRect.top;
    setPosition(currentLeft + direction[0] * step, currentTop + direction[1] * step, { persist: true });
    event.preventDefault();
  };

  const onDoubleClick = (event) => {
    if (event.target.closest(PANEL_DRAG_EXCLUSION_SELECTOR)) return;
    resetPosition();
  };

  const onViewportChange = () => {
    if (!dragState) restorePosition();
  };

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(onViewportChange)
    : null;
  resizeObserver?.observe(panel);
  if (boundary) resizeObserver?.observe(boundary);
  if (panel.offsetParent) resizeObserver?.observe(panel.offsetParent);

  handle.addEventListener('pointerdown', onPointerDown);
  handle.addEventListener('pointermove', updateDragPosition);
  handle.addEventListener('pointerup', finishDrag);
  handle.addEventListener('pointercancel', finishDrag);
  handle.addEventListener('keydown', onKeyDown);
  handle.addEventListener('dblclick', onDoubleClick);
  window.addEventListener('resize', onViewportChange, { passive: true });
  restoreFrame = requestAnimationFrame(restorePosition);

  return () => {
    if (dragFrame) cancelAnimationFrame(dragFrame);
    if (restoreFrame) cancelAnimationFrame(restoreFrame);
    resizeObserver?.disconnect();
    handle.removeEventListener('pointerdown', onPointerDown);
    handle.removeEventListener('pointermove', updateDragPosition);
    handle.removeEventListener('pointerup', finishDrag);
    handle.removeEventListener('pointercancel', finishDrag);
    handle.removeEventListener('keydown', onKeyDown);
    handle.removeEventListener('dblclick', onDoubleClick);
    window.removeEventListener('resize', onViewportChange);
  };
}

export function createAtmosphereParameterizer({
  variant,
  initialConfig,
  simulationMode,
  simulationOptions = [],
  themeMode = 'light',
  onChange,
  onReset,
  onSimulationChange,
  onThemeChange,
  onSave,
} = {}) {
  const usesProductionConfig = variant === 'crispGlow';
  const normalizeConfig = (nextConfig) => {
    if (!usesProductionConfig) return normalizeAtmosphereLabConfig(nextConfig);
    return normalizeSimulationAtmosphereConfig(nextConfig);
  };
  const defaultConfig = usesProductionConfig
    ? DEFAULT_SIMULATION_ATMOSPHERE_CONFIG
    : DEFAULT_ATMOSPHERE_LAB_CONFIG;
  let config = normalizeConfig(initialConfig);
  let activeSimulationMode = String(simulationMode || '');
  let activeThemeMode = themeMode === 'dark' ? 'dark' : 'light';
  const definition = ATMOSPHERE_LAB_VARIANTS[variant] || ATMOSPHERE_LAB_VARIANTS.webglPost;
  const panel = createElement('aside', 'parameterizer-panel atmosphere-parameterizer');
  panel.setAttribute('aria-label', `${definition.label} atmosphere controls`);
  panel.dataset.variant = variant;

  const header = createElement('header', 'parameterizer-header');
  const heading = createElement('span', 'atmosphere-parameterizer__heading', 'Atmosphere');
  const headerTools = createElement('span', 'atmosphere-parameterizer__header-tools');
  const metrics = createElement('output', 'atmosphere-parameterizer__metrics', 'starting…');
  const collapseButton = createElement('button', 'atmosphere-parameterizer__collapse', 'Hide');
  collapseButton.type = 'button';
  collapseButton.setAttribute('aria-label', 'Hide Atmosphere controls');
  collapseButton.setAttribute('aria-expanded', 'true');
  collapseButton.addEventListener('click', () => {
    const collapsed = panel.dataset.collapsed !== 'true';
    panel.dataset.collapsed = String(collapsed);
    collapseButton.textContent = collapsed ? 'Show' : 'Hide';
    collapseButton.setAttribute('aria-label', `${collapsed ? 'Show' : 'Hide'} Atmosphere controls`);
    collapseButton.setAttribute('aria-expanded', String(!collapsed));
  });
  const exitButton = createElement('button', 'atmosphere-parameterizer__exit', 'Exit');
  exitButton.type = 'button';
  exitButton.setAttribute('aria-label', 'Exit Atmosphere Lab');
  exitButton.addEventListener('click', () => window.location.assign('/index.html'));
  headerTools.append(metrics, collapseButton, exitButton);
  header.append(heading, headerTools);
  panel.append(header);

  const approachRow = createElement('div', 'atmosphere-parameterizer__approach');
  const approachLabel = createElement('label', '', 'Approach');
  const approachSelect = document.createElement('select');
  approachSelect.setAttribute('aria-label', 'Atmosphere approach');
  Object.values(ATMOSPHERE_LAB_VARIANTS).forEach((item) => {
    const option = document.createElement('option');
    option.value = item.path;
    option.textContent = item.label;
    option.selected = item.id === variant;
    approachSelect.append(option);
  });
  approachSelect.addEventListener('change', () => {
    window.location.assign(`${approachSelect.value}${window.location.search}`);
  });
  approachLabel.append(approachSelect);
  approachRow.append(approachLabel);

  const availableSimulationOptions = simulationOptions.filter((option) => (
    option
    && typeof option.id === 'string'
    && typeof option.label === 'string'
  ));
  let simulationSelect = null;
  if (availableSimulationOptions.length > 0) {
    const simulationLabel = createElement('label', '', 'Simulation');
    simulationSelect = document.createElement('select');
    simulationSelect.setAttribute('aria-label', 'Simulation');
    availableSimulationOptions.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.label;
      simulationSelect.append(option);
    });
    if (!availableSimulationOptions.some((item) => item.id === activeSimulationMode)) {
      activeSimulationMode = availableSimulationOptions[0].id;
    }
    simulationSelect.value = activeSimulationMode;
    simulationSelect.addEventListener('change', async () => {
      const previousMode = activeSimulationMode;
      const requestedMode = simulationSelect.value;
      simulationSelect.disabled = true;
      metrics.textContent = 'switching…';
      try {
        const resolvedMode = await onSimulationChange?.(requestedMode);
        activeSimulationMode = availableSimulationOptions.some((item) => item.id === resolvedMode)
          ? resolvedMode
          : previousMode;
      } catch {
        activeSimulationMode = previousMode;
      }
      simulationSelect.value = activeSimulationMode;
      simulationSelect.disabled = false;
    });
    simulationLabel.append(simulationSelect);
    approachRow.append(simulationLabel);
  }
  let themeSelect = null;
  if (variant === 'crispGlow') {
    const themeLabel = createElement('label', '', 'Values for');
    themeSelect = document.createElement('select');
    themeSelect.setAttribute('aria-label', 'Theme values to edit and preview');
    ['light', 'dark'].forEach((theme) => {
      const option = document.createElement('option');
      option.value = theme;
      option.textContent = theme[0].toUpperCase() + theme.slice(1);
      themeSelect.append(option);
    });
    themeSelect.value = activeThemeMode;
    themeSelect.addEventListener('change', () => {
      activeThemeMode = themeSelect.value === 'dark' ? 'dark' : 'light';
      controlBindings.forEach((sync) => sync());
      onThemeChange?.(activeThemeMode);
    });
    themeLabel.append(themeSelect);
    approachRow.append(themeLabel);
  }
  panel.append(approachRow);

  const scroll = createElement('div', 'parameterizer-scroll');
  const controlBindings = [];

  const resolveScope = (group, control) => control.scope || group.scope || 'common';

  const readValue = (group, control) => {
    const scope = resolveScope(group, control);
    if (usesProductionConfig) {
      if (scope === 'themeProfile') return config[activeThemeMode][control.id];
      return config[control.id];
    }
    if (scope === 'themeProfile') return config.profiles[variant][activeThemeMode][control.id];
    if (scope === 'profile') return config.profiles[variant][control.id];
    return config.common[control.id];
  };

  const writeValue = (group, control, nextValue) => {
    const scope = resolveScope(group, control);
    const target = usesProductionConfig
      ? (scope === 'themeProfile' ? config[activeThemeMode] : config)
      : scope === 'themeProfile'
        ? config.profiles[variant][activeThemeMode]
        : scope === 'profile' ? config.profiles[variant] : config.common;
    if (control.type === 'checkbox') target[control.id] = Boolean(nextValue);
    else if (control.type === 'range') target[control.id] = Number(nextValue);
    else target[control.id] = String(nextValue);
    config = normalizeConfig(config);
    onChange?.(config);
  };

  getAtmosphereControlGroups(variant).forEach((group) => {
    const folder = document.createElement('details');
    folder.className = 'parameterizer-folder';
    folder.open = group.initiallyOpen !== false;
    const summary = createElement('summary', 'parameterizer-folder-title', group.title);
    const rows = createElement('div', 'atmosphere-parameterizer__rows');
    folder.append(summary, rows);

    group.controls.forEach((control) => {
      const row = createElement('label', 'parameterizer-row');
      const label = createElement('span', 'parameterizer-label', control.label);
      const controlWrap = createElement('span', `parameterizer-control parameterizer-control--${control.type}`);
      const valueOutput = createElement('output', 'parameterizer-value');
      const input = document.createElement(control.type === 'select' ? 'select' : 'input');
      input.dataset.parameterId = control.id;

      if (control.type === 'select') {
        control.options.forEach((choice) => {
          const option = document.createElement('option');
          option.value = choice;
          option.textContent = choice;
          input.append(option);
        });
      } else {
        input.type = control.type;
        if (control.type === 'range') {
          input.min = String(control.min);
          input.max = String(control.max);
          input.step = String(control.step);
        }
      }

      const sync = () => {
        const value = readValue(group, control);
        if (control.type === 'checkbox') input.checked = Boolean(value);
        else input.value = String(value);
        valueOutput.textContent = control.type === 'checkbox' ? (value ? 'on' : 'off') : formatValue(value, control.display);
      };
      sync();
      input.addEventListener('input', () => {
        const value = control.type === 'checkbox' ? input.checked : input.value;
        writeValue(group, control, value);
        sync();
      });
      input.addEventListener('change', sync);
      controlBindings.push(sync);
      controlWrap.append(input);
      row.append(label, controlWrap, valueOutput);
      rows.append(row);
    });

    scroll.append(folder);
  });
  panel.append(scroll);

  const actions = createElement('footer', 'parameterizer-actions');
  const resetButton = createElement('button', '', 'Reset');
  resetButton.type = 'button';
  resetButton.addEventListener('click', () => {
    config = normalizeConfig(defaultConfig);
    controlBindings.forEach((sync) => sync());
    onReset?.(config);
    onChange?.(config);
    metrics.textContent = 'reset';
  });
  const saveButton = createElement('button', '', 'Save JSON');
  saveButton.type = 'button';
  saveButton.addEventListener('click', async () => {
    metrics.textContent = 'saving…';
    try {
      if (onSave) {
        const result = await onSave(config);
        metrics.textContent = result?.downloaded ? 'downloaded' : 'saved';
        return;
      }
      const response = await fetch('/api/atmosphere-lab/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (!response.ok) throw new Error(`Save failed (${response.status})`);
      metrics.textContent = 'saved';
    } catch {
      downloadConfig(config);
      metrics.textContent = 'downloaded';
    }
  });
  actions.append(resetButton, saveButton);
  panel.append(actions);

  const simulations = document.getElementById('simulations');
  const panelHost = document.getElementById('abs-scene') || simulations;
  panelHost?.append(panel);
  const removePanelDragging = installPanelDragging(panel, header, simulations || panelHost);

  return {
    destroy() {
      removePanelDragging();
      panel.remove();
    },
    getConfig() {
      return config;
    },
    setSimulationMode(nextMode) {
      if (!simulationSelect || !availableSimulationOptions.some((item) => item.id === nextMode)) return;
      activeSimulationMode = nextMode;
      simulationSelect.value = nextMode;
    },
    setThemeMode(nextTheme) {
      if (!themeSelect) return;
      activeThemeMode = nextTheme === 'dark' ? 'dark' : 'light';
      themeSelect.value = activeThemeMode;
      controlBindings.forEach((sync) => sync());
    },
    setMetrics({ fps = 0, costMs = 0, quality = '', fallback = false } = {}) {
      metrics.textContent = `${fallback ? 'fallback · ' : ''}${Math.round(fps)} fps · ${costMs.toFixed(1)} ms · ${quality}`;
    },
  };
}
