const MODULE_DEFAULTS = Object.freeze({
  prose: Object.freeze({ kind: 'prose', text: 'New editorial paragraph.' }),
  'logo-grid': Object.freeze({
    kind: 'logo-grid',
    label: 'Logo collection',
    items: Object.freeze([Object.freeze({
      id: 'logo',
      label: 'New logo',
      src: '/images/about/client-logos/yoti.png',
      alt: 'New logo',
    })]),
  }),
  'media-deck': Object.freeze({ kind: 'media-deck', label: 'Media collection', items: Object.freeze([]) }),
  'interactive-stack': Object.freeze({
    kind: 'interactive-stack',
    label: 'Project impressions',
    parameters: Object.freeze({
      seed: 1,
      stagePaddingPct: 10,
      cardWidthPct: 77.5,
      spreadXPct: 12,
      spreadYPct: 9,
      rotationDeg: 6,
      scaleJitter: 0.12,
      transitionMs: 420,
    }),
    items: Object.freeze([Object.freeze({
      id: 'impression',
      type: 'image',
      src: '/images/about/interactive-stack/preview-01.webp',
      alt: 'New project impression',
      width: 640,
      height: 480,
      aspectRatio: 4 / 3,
      fit: 'cover',
    })]),
  }),
});

function clone(value) {
  return value == null ? value : structuredClone(value);
}

export function slugifyDirectorId(value, fallback = 'item') {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return slug || fallback;
}

export function createUniqueDirectorId(seed, existingIds, fallback = 'item') {
  const used = new Set(existingIds || []);
  const base = slugifyDirectorId(seed, fallback);
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function createEditorialModule(kind, existingModules = []) {
  const template = MODULE_DEFAULTS[kind] || MODULE_DEFAULTS.prose;
  const id = createUniqueDirectorId(
    kind === 'prose' ? 'paragraph' : kind,
    existingModules.map((module) => module?.id),
    'module',
  );
  return { id, ...clone(template) };
}

export function createEditorialItem(module, existingItems = []) {
  const interactive = module?.kind === 'interactive-stack';
  const logo = module?.kind === 'logo-grid';
  const id = createUniqueDirectorId(
    interactive ? 'impression' : logo ? 'logo' : 'media',
    existingItems.map((item) => item?.id),
    'item',
  );
  if (interactive) {
    return {
      id,
      type: 'image',
      src: '/images/about/interactive-stack/preview-01.webp',
      alt: 'New project impression',
      width: 640,
      height: 480,
      aspectRatio: 4 / 3,
      fit: 'cover',
    };
  }
  return logo
    ? { id, label: 'New logo', src: '/images/about/client-logos/yoti.png', alt: 'New logo' }
    : { id, src: '/images/about/interactive-stack/preview-01.webp', alt: 'New media', caption: '' };
}

export function createEmphasisEntry() {
  return { text: 'New highlight', tone: 'blue' };
}

export function updateDirectorArrayItem(items, index, updater) {
  return (items || []).map((item, itemIndex) => (
    itemIndex === index ? updater(clone(item)) : clone(item)
  ));
}

export function moveDirectorArrayItem(items, index, direction) {
  const next = clone(items || []);
  const destination = index + direction;
  if (index < 0 || index >= next.length || destination < 0 || destination >= next.length) return next;
  [next[index], next[destination]] = [next[destination], next[index]];
  return next;
}

export function duplicateDirectorArrayItem(items, index, { idKey = 'id', fallback = 'item' } = {}) {
  const next = clone(items || []);
  const source = next[index];
  if (source == null) return next;
  const duplicate = clone(source);
  if (idKey && typeof duplicate === 'object' && !Array.isArray(duplicate)) {
    duplicate[idKey] = createUniqueDirectorId(
      `${source[idKey] || fallback}-copy`,
      next.map((item) => item?.[idKey]),
      fallback,
    );
  }
  next.splice(index + 1, 0, duplicate);
  return next;
}

export function removeDirectorArrayItem(items, index) {
  return clone(items || []).filter((_, itemIndex) => itemIndex !== index);
}

export function parseDirectorSource(source, { expected = 'object' } = {}) {
  let value;
  try {
    value = JSON.parse(source);
  } catch (error) {
    return { valid: false, value: null, error: `Invalid JSON: ${error.message}` };
  }
  const matches = expected === 'array'
    ? Array.isArray(value)
    : Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  if (!matches) {
    return {
      valid: false,
      value: null,
      error: expected === 'array' ? 'Source must contain a JSON array.' : 'Source must contain a JSON object.',
    };
  }
  return { valid: true, value, error: '' };
}

export function getDirectorFieldError(diagnostics, path) {
  return (diagnostics || []).find((item) => (
    item.level === 'error'
    && (item.path === path || item.path?.startsWith(`${path}.`))
  ))?.message || '';
}
