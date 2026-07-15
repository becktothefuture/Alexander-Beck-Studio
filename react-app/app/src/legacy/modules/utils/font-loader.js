const DEFAULT_FONT_FACES = [
  '1em "Instrument Serif"',
  '1em "tabler-icons"',
];

export async function waitForFonts({ timeoutMs = 4000, fontFaces = DEFAULT_FONT_FACES } = {}) {
  const root = document.documentElement;
  if (root) root.classList.add('fonts-loading');

  if (!document.fonts || !document.fonts.ready) {
    if (root) root.classList.remove('fonts-loading');
    return false;
  }

  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = window.setTimeout(() => resolve(false), timeoutMs);
  });

  const loadPromise = Promise.all(fontFaces.map(async (face) => {
    try {
      const matches = await document.fonts.load(face);
      return matches.length > 0 && document.fonts.check(face);
    } catch {
      return false;
    }
  }))
    .then(async (results) => {
      await document.fonts.ready;
      return results.every(Boolean) && fontFaces.every((face) => document.fonts.check(face));
    })
    .catch(() => false);

  const loaded = await Promise.race([loadPromise, timeoutPromise]);

  if (timeoutId) window.clearTimeout(timeoutId);
  if (root) root.classList.remove('fonts-loading');

  return loaded;
}
