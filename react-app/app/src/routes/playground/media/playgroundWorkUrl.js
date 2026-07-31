export const PLAYGROUND_WORK_QUERY_PARAM = 'work';
export const PLAYGROUND_WORK_HISTORY_KEY = '__absPlaygroundWork';

function toKnownIdSet(itemsOrIds) {
  if (itemsOrIds instanceof Set) return itemsOrIds;
  if (!itemsOrIds) return null;
  return new Set(Array.from(itemsOrIds, (item) => (
    typeof item === 'string' ? item : item?.id
  )).filter(Boolean));
}

function readSearch(value) {
  if (typeof value === 'string') {
    if (value.startsWith('?')) return value;
    if (value.includes('://')) return new URL(value).search;
    const queryIndex = value.indexOf('?');
    return queryIndex >= 0 ? value.slice(queryIndex) : value;
  }
  return value?.search || '';
}

function toUrl(locationLike) {
  const href = typeof locationLike === 'string'
    ? locationLike
    : locationLike?.href;
  return new URL(href || '/', 'https://playground.local');
}

export function parsePlaygroundWorkSelection(searchOrLocation, itemsOrIds) {
  const rawId = new URLSearchParams(readSearch(searchOrLocation)).get(PLAYGROUND_WORK_QUERY_PARAM);
  if (!rawId) return null;
  const knownIds = toKnownIdSet(itemsOrIds);
  return !knownIds || knownIds.has(rawId) ? rawId : null;
}

export function buildPlaygroundWorkUrl(itemId, {
  locationLike = globalThis.location,
  itemsOrIds,
} = {}) {
  const url = toUrl(locationLike);
  const knownIds = toKnownIdSet(itemsOrIds);
  if (itemId && (!knownIds || knownIds.has(itemId))) {
    url.searchParams.set(PLAYGROUND_WORK_QUERY_PARAM, itemId);
  } else {
    url.searchParams.delete(PLAYGROUND_WORK_QUERY_PARAM);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function updatePlaygroundWorkSelection(itemId, {
  historyLike = globalThis.history,
  locationLike = globalThis.location,
  itemsOrIds,
  replace = false,
} = {}) {
  const knownIds = toKnownIdSet(itemsOrIds);
  if (!itemId || (knownIds && !knownIds.has(itemId))) return false;
  const method = replace ? 'replaceState' : 'pushState';
  if (typeof historyLike?.[method] !== 'function') return false;

  const nextState = {
    ...(historyLike.state || {}),
    [PLAYGROUND_WORK_HISTORY_KEY]: itemId,
  };
  historyLike[method](
    nextState,
    '',
    buildPlaygroundWorkUrl(itemId, { locationLike, itemsOrIds: knownIds })
  );
  return true;
}

export function clearPlaygroundWorkSelection({
  historyLike = globalThis.history,
  locationLike = globalThis.location,
  preferBack = true,
} = {}) {
  const selectedId = parsePlaygroundWorkSelection(locationLike);
  if (!selectedId) return 'unchanged';

  if (
    preferBack
    && historyLike?.state?.[PLAYGROUND_WORK_HISTORY_KEY] === selectedId
    && typeof historyLike.back === 'function'
  ) {
    historyLike.back();
    return 'back';
  }

  if (typeof historyLike?.replaceState !== 'function') return 'unchanged';
  const nextState = { ...(historyLike.state || {}) };
  delete nextState[PLAYGROUND_WORK_HISTORY_KEY];
  historyLike.replaceState(
    nextState,
    '',
    buildPlaygroundWorkUrl(null, { locationLike })
  );
  return 'replace';
}
