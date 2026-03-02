const DEFAULT_FONT_FACES = [
  '1em "Geist"',
  '1em "Geist Mono"',
  '1em "Sarina"',
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

  const loadPromise = Promise.all(
    fontFaces.map((face) => document.fonts.load(face).catch(() => null))
  )
    .then(() => document.fonts.ready)
    .then(() => true)
    .catch(() => false);

  const loaded = await Promise.race([loadPromise, timeoutPromise]);

  if (timeoutId) window.clearTimeout(timeoutId);
  if (root) root.classList.remove('fonts-loading');

  return loaded;
}
