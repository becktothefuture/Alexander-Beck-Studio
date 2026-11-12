export const BUTTON_STYLE_GROUPS = [
  { label: 'Shape and type', controls: [
    { id: 'radius', label: 'Corner radius', min: 0, max: 60, step: 1, start: 16, unit: 'px' },
    { id: 'edge', label: 'Border width', min: 0, max: 3, step: .5, start: 1, unit: 'px' },
    { id: 'fontSize', label: 'Label size', min: 10, max: 20, step: .5, start: 14, unit: 'px' },
    { id: 'fontWeight', label: 'Label weight', min: 300, max: 700, step: 50, start: 500 },
  ] },
  { label: 'Material', controls: [
    { id: 'blur', label: 'Backdrop blur', min: 0, max: 40, step: 1, start: 16, unit: 'px' },
    { id: 'flat', label: 'Flat finish', start: true },
  ] },
  { label: 'Light theme', controls: [
    { id: 'lightFill', label: 'Light fill', start: '#e8e8e8' },
    { id: 'lightHover', label: 'Light hover fill', start: '#d5d5d5' },
    { id: 'lightInk', label: 'Light label colour', start: '#161616' },
  ] },
  { label: 'Dark theme', controls: [
    { id: 'darkFill', label: 'Dark fill', start: '#242424' },
    { id: 'darkHover', label: 'Dark hover fill', start: '#363636' },
    { id: 'darkInk', label: 'Dark label colour', start: '#f1f1f1' },
  ] },
  { label: 'Utility Rail', controls: [
    { id: 'shellFill', label: 'Shell fill', start: '#262626' },
    { id: 'shellHover', label: 'Shell hover fill', start: '#393939' },
    { id: 'shellInk', label: 'Shell label colour', start: '#eeeeee' },
  ] },
];

const controls = BUTTON_STYLE_GROUPS.flatMap(group => group.controls);
const cssName = id => id.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

export function normalizeButtonStyles(source) {
  const styles = {};
  for (const { id, start, min, max, step } of controls) {
    const value = source?.[id];
    if (typeof start === 'number' && typeof value === 'number' && Number.isFinite(value)) {
      const bounded = Math.min(max, Math.max(min, value));
      styles[id] = min + Math.round((bounded - min) / step) * step;
    } else if (typeof start === 'string' && typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) {
      styles[id] = value.toLowerCase();
    } else if (start === true && value === true) {
      styles[id] = true;
    }
  }
  return styles;
}

export function applyButtonStyles(root, source) {
  const styles = normalizeButtonStyles(source);
  const enabled = [];
  for (const { id, unit = '' } of controls) {
    const name = cssName(id);
    if (Object.hasOwn(styles, id)) {
      enabled.push(name);
      root.style.setProperty(`--abs-button-${name}`, `${styles[id]}${unit}`);
    } else {
      root.style.removeProperty(`--abs-button-${name}`);
    }
  }
  if (enabled.length) root.dataset.absButtonStyles = enabled.join(' ');
  else delete root.dataset.absButtonStyles;
}

export function openButtonStylePreview() {
  return typeof BroadcastChannel === 'function' ? new BroadcastChannel('abs-button-style-preview') : null;
}

/** The shared shell lives for one document, including its client-side route changes. */
export function previewButtonStylesInApp(root, authoredStyles) {
  const channel = openButtonStylePreview();
  let saved = authoredStyles;
  let owner = null;
  channel?.addEventListener('message', ({ data }) => {
    if (data?.type === 'preview') {
      owner = data.owner;
      applyButtonStyles(root, data.styles);
    } else if (data?.type === 'saved') {
      saved = data.styles;
      owner = null;
      applyButtonStyles(root, saved);
    } else if (data?.type === 'close' && owner === data.owner) {
      owner = null;
      applyButtonStyles(root, saved);
    }
  });
  channel?.postMessage({ type: 'ready' });
}
