const panelUiDocuments = new Set();

function canUseDocument(doc) {
  return Boolean(doc && typeof doc.getElementById === 'function');
}

export function registerPanelUiDocument(doc) {
  if (!canUseDocument(doc)) return;
  panelUiDocuments.add(doc);
}

export function unregisterPanelUiDocument(doc) {
  if (!canUseDocument(doc)) return;
  panelUiDocuments.delete(doc);
}

export function getPanelUiDocuments({ includeMainDocument = true } = {}) {
  const docs = Array.from(panelUiDocuments).filter(canUseDocument);
  if (!docs.length && includeMainDocument && typeof document !== 'undefined') {
    return [document];
  }
  return docs;
}

export function resolvePanelUiDocument(doc, { includeMainDocument = true } = {}) {
  if (canUseDocument(doc)) return doc;
  const docs = getPanelUiDocuments({ includeMainDocument });
  return docs[0] || null;
}

export function forEachPanelUiDocument(callback, options = {}) {
  if (typeof callback !== 'function') return;
  getPanelUiDocuments(options).forEach((doc) => {
    try {
      callback(doc);
    } catch (error) {
      // Keep UI fan-out resilient; one broken host should not stop the rest.
    }
  });
}
