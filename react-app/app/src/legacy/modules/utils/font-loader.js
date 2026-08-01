const DEFAULT_FONT_FACES = [
  '1em "Instrument Serif"',
  '1em "tabler-icons"',
];

export async function waitForFonts({ timeoutMs = 5000, fontFaces = DEFAULT_FONT_FACES } = {}) {
  const root = document.documentElement;
  if (root) root.classList.add('fonts-loading');

  if (!document.fonts || !document.fonts.ready) {
    if (root) root.classList.remove('fonts-loading');
    return false;
  }

  let timeoutId;
  const startedAt = performance.now();
  const facesAreReady = () => fontFaces.every((face) => document.fonts.check(face));
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = window.setTimeout(() => resolve(facesAreReady()), timeoutMs);
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
      if (results.every(Boolean) && facesAreReady()) return true;

      while ((performance.now() - startedAt) < timeoutMs) {
        await new Promise((resolve) => window.setTimeout(resolve, 50));
        if (facesAreReady()) return true;
      }
      return false;
    })
    .catch(() => false);

  const loaded = await Promise.race([loadPromise, timeoutPromise]);

  if (timeoutId) window.clearTimeout(timeoutId);
  if (root) root.classList.remove('fonts-loading');

  return loaded;
}
