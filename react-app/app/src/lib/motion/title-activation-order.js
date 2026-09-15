const STORAGE_KEY = 'abs-title-activation-orders-v1';
const HISTORY_LIMIT = 32;
const previousOrders = new Map();
let historyLoaded = false;

function readHistory() {
  if (historyLoaded) return previousOrders;
  historyLoaded = true;
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '[]');
    saved.slice(-HISTORY_LIMIT).forEach(([key, order]) => {
      if (typeof key === 'string' && Array.isArray(order)) previousOrders.set(key, order);
    });
  } catch {
    // Animation still works when storage is unavailable.
  }
  return previousOrders;
}

function rememberHistory(history) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...history]));
  } catch {
    // The in-memory history still prevents repeats within this document.
  }
}

/** Assign existing activation times to letters once per entrance, without
 * changing text order, colour recipes, overlap or the overall time window. */
export function createTitleActivationSequence({
  random = Math.random,
  history = readHistory(),
  remember = rememberHistory,
} = {}) {
  const entrances = new Map();
  return {
    delaysFor(key, slots) {
      const cached = entrances.get(key);
      if (cached?.length === slots.length) return cached;
      const ranks = Array.from({ length: slots.length }, (_, index) => index);
      for (let index = ranks.length - 1; index > 0; index -= 1) {
        const other = Math.floor(random() * (index + 1));
        [ranks[index], ranks[other]] = [ranks[other], ranks[index]];
      }
      const previous = history.get(key);
      if (ranks.length > 1 && ranks.every((rank, index) => rank === previous?.[index])) {
        [ranks[0], ranks[1]] = [ranks[1], ranks[0]];
      }
      history.delete(key);
      history.set(key, ranks);
      if (history.size > HISTORY_LIMIT) history.delete(history.keys().next().value);
      remember(history);
      const delays = Object.freeze(ranks.map((rank) => slots[rank]));
      entrances.set(key, delays);
      return delays;
    },
  };
}
