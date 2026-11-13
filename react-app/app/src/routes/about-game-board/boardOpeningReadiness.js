import { collectAboutNarrativeFontRequests } from '../about-narrative-lab/aboutNarrativeFontReadiness.js';

/** Load the actual authored faces before their metrics position the board.
 * A failed face is an explicit load error, not a late fallback-font swap. */
export async function prepareBoardFonts(content) {
  const fonts = content.ownerDocument.fonts;
  if (!fonts) throw new Error('The About fonts could not load.');
  const requests = collectAboutNarrativeFontRequests(content);
  const faces = await Promise.all(requests.map(request => fonts.load(request.font, request.text)));
  if (faces.some(matches => !matches.length || matches.some(face => face.status !== 'loaded'))) {
    throw new Error('The About fonts could not load.');
  }
}
