import { hasPlaygroundCodeDemo } from './codeDemos.js';

export const PLAYGROUND_CONTENT_URL = '/config/contents-portfolio.json';

const PLAYGROUND_ITEM_TYPES = new Set(['image', 'video', 'code']);
const STABLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_INTRINSIC_DIMENSION = 8192;
const MAX_GRID_SPAN = 32;

export class PlaygroundContentValidationError extends Error {
  constructor(issues) {
    super(`Invalid Playground content: ${issues.join('; ')}`);
    this.name = 'PlaygroundContentValidationError';
    this.issues = [...issues];
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isBoundedPositiveInteger(value, maximum) {
  return Number.isInteger(value) && value > 0 && value <= maximum;
}

export function isSafeLocalPlaygroundUrl(value) {
  if (!isNonEmptyString(value) || !value.startsWith('/') || value.startsWith('//')) return false;
  if (value.includes('\\')) return false;

  const path = value.split(/[?#]/, 1)[0];
  try {
    return !path
      .split('/')
      .some((segment) => decodeURIComponent(segment).trim() === '..');
  } catch {
    return false;
  }
}

function validateDimensions(value, path, issues) {
  if (!isPlainObject(value)) {
    issues.push(`${path} must be an object`);
    return;
  }
  if (!isBoundedPositiveInteger(value.width, MAX_INTRINSIC_DIMENSION)) {
    issues.push(`${path}.width must be a positive integer no larger than ${MAX_INTRINSIC_DIMENSION}`);
  }
  if (!isBoundedPositiveInteger(value.height, MAX_INTRINSIC_DIMENSION)) {
    issues.push(`${path}.height must be a positive integer no larger than ${MAX_INTRINSIC_DIMENSION}`);
  }
}

function validateGridSpan(value, path, issues) {
  if (!isPlainObject(value)) {
    issues.push(`${path} must be an object`);
    return;
  }
  if (!isBoundedPositiveInteger(value.columns, MAX_GRID_SPAN)) {
    issues.push(`${path}.columns must be a positive integer no larger than ${MAX_GRID_SPAN}`);
  }
  if (!isBoundedPositiveInteger(value.rows, MAX_GRID_SPAN)) {
    issues.push(`${path}.rows must be a positive integer no larger than ${MAX_GRID_SPAN}`);
  }
}

function validateItem(item, index, ids, placementOrders, issues) {
  const path = `items[${index}]`;
  if (!isPlainObject(item)) {
    issues.push(`${path} must be an object`);
    return;
  }

  if (!isNonEmptyString(item.id) || !STABLE_ID_PATTERN.test(item.id)) {
    issues.push(`${path}.id must be a stable lower-kebab-case ID`);
  } else if (ids.has(item.id)) {
    issues.push(`${path}.id duplicates ${item.id}`);
  } else {
    ids.add(item.id);
  }

  if (!Number.isInteger(item.placementOrder) || item.placementOrder < 1) {
    issues.push(`${path}.placementOrder must be a positive integer`);
  } else if (placementOrders.has(item.placementOrder)) {
    issues.push(`${path}.placementOrder duplicates ${item.placementOrder}`);
  } else {
    placementOrders.add(item.placementOrder);
  }

  if (!PLAYGROUND_ITEM_TYPES.has(item.type)) {
    issues.push(`${path}.type must be image, video, or code`);
  }

  ['label', 'description', 'accessibilityText'].forEach((field) => {
    if (!isNonEmptyString(item[field])) issues.push(`${path}.${field} must be a non-empty string`);
  });

  ['poster', 'preview'].forEach((field) => {
    if (!isSafeLocalPlaygroundUrl(item[field])) {
      issues.push(`${path}.${field} must be a safe root-relative URL`);
    }
  });

  if (item.type === 'code') {
    if (!isNonEmptyString(item.demoId) || !STABLE_ID_PATTERN.test(item.demoId)) {
      issues.push(`${path}.demoId must be a stable lower-kebab-case ID for code items`);
    } else if (!hasPlaygroundCodeDemo(item.demoId)) {
      issues.push(`${path}.demoId must name a registered local code demo`);
    }
    if (Object.hasOwn(item, 'source')) {
      issues.push(`${path}.source must be omitted for code items`);
    }
  } else {
    if (!isSafeLocalPlaygroundUrl(item.source)) {
      issues.push(`${path}.source must be a safe root-relative URL for ${item.type} items`);
    }
    if (Object.hasOwn(item, 'demoId')) {
      issues.push(`${path}.demoId must be omitted for ${item.type} items`);
    }
  }

  validateDimensions(item.intrinsicDimensions, `${path}.intrinsicDimensions`, issues);
  validateGridSpan(item.preferredGridSpan, `${path}.preferredGridSpan`, issues);

  if (
    Object.hasOwn(item, 'presentationVariant')
    && (!isNonEmptyString(item.presentationVariant) || !STABLE_ID_PATTERN.test(item.presentationVariant))
  ) {
    issues.push(`${path}.presentationVariant must be a lower-kebab-case string when present`);
  }
}

export function validatePlaygroundContent(value) {
  const issues = [];
  if (!isPlainObject(value)) {
    throw new PlaygroundContentValidationError(['document must be an object']);
  }

  if (!Number.isInteger(value.version) || value.version < 1) {
    issues.push('version must be a positive integer');
  }
  if (!isNonEmptyString(value.title)) issues.push('title must be a non-empty string');
  if (!isNonEmptyString(value.description)) issues.push('description must be a non-empty string');
  if (!Array.isArray(value.items)) {
    issues.push('items must be an array');
  } else {
    const ids = new Set();
    const placementOrders = new Set();
    value.items.forEach((item, index) => {
      validateItem(item, index, ids, placementOrders, issues);
    });
  }

  if (issues.length) throw new PlaygroundContentValidationError(issues);

  return {
    version: value.version,
    title: value.title.trim(),
    description: value.description.trim(),
    items: value.items
      .map((item) => ({
        ...item,
        label: item.label.trim(),
        description: item.description.trim(),
        accessibilityText: item.accessibilityText.trim(),
        intrinsicDimensions: { ...item.intrinsicDimensions },
        preferredGridSpan: { ...item.preferredGridSpan },
      }))
      .sort((left, right) => left.placementOrder - right.placementOrder),
  };
}

function normalizePlaygroundItem(item) {
  return {
    ...item,
    label: item.label.trim(),
    description: item.description.trim(),
    accessibilityText: item.accessibilityText.trim(),
    intrinsicDimensions: { ...item.intrinsicDimensions },
    preferredGridSpan: { ...item.preferredGridSpan },
  };
}

/**
 * Runtime content is tolerant at the item boundary. One malformed project is
 * omitted so the remaining collection stays available, while document-level
 * failures still surface as a fatal route error.
 */
export function validatePlaygroundContentForRuntime(value) {
  const documentIssues = [];
  if (!isPlainObject(value)) {
    throw new PlaygroundContentValidationError(['document must be an object']);
  }
  if (!Number.isInteger(value.version) || value.version < 1) {
    documentIssues.push('version must be a positive integer');
  }
  if (!isNonEmptyString(value.title)) documentIssues.push('title must be a non-empty string');
  if (!isNonEmptyString(value.description)) {
    documentIssues.push('description must be a non-empty string');
  }
  if (!Array.isArray(value.items)) documentIssues.push('items must be an array');
  if (documentIssues.length) throw new PlaygroundContentValidationError(documentIssues);

  const ids = new Set();
  const placementOrders = new Set();
  const validationIssues = [];
  const items = [];

  value.items.forEach((item, index) => {
    const itemIssues = [];
    const nextIds = new Set(ids);
    const nextPlacementOrders = new Set(placementOrders);
    validateItem(item, index, nextIds, nextPlacementOrders, itemIssues);
    if (itemIssues.length) {
      validationIssues.push(...itemIssues);
      return;
    }
    ids.clear();
    nextIds.forEach((id) => ids.add(id));
    placementOrders.clear();
    nextPlacementOrders.forEach((order) => placementOrders.add(order));
    items.push(normalizePlaygroundItem(item));
  });

  if (!items.length) {
    throw new PlaygroundContentValidationError([
      'items must contain at least one valid Playground item',
      ...validationIssues,
    ]);
  }

  return {
    version: value.version,
    title: value.title.trim(),
    description: value.description.trim(),
    items: items.sort((left, right) => left.placementOrder - right.placementOrder),
    validationIssues,
  };
}

export function createPlaygroundItemIndex(items = []) {
  return new Map(items.map((item) => [item.id, item]));
}

export function getPlaygroundItem(content, itemId) {
  if (!itemId || !Array.isArray(content?.items)) return null;
  return content.items.find((item) => item.id === itemId) || null;
}

export async function loadPlaygroundContent({
  signal,
  fetchImpl = globalThis.fetch,
  url = PLAYGROUND_CONTENT_URL,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('A fetch implementation is required to load Playground content.');
  }

  const response = await fetchImpl(url, {
    signal,
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Could not load Playground content (${response.status}).`);
  }
  const source = await response.json();
  const contentDocument = Array.isArray(source?.snippets)
    ? {
      version: source.version,
      title: source.title,
      description: source.description,
      items: source.snippets,
    }
    : source;
  return validatePlaygroundContentForRuntime(contentDocument);
}
