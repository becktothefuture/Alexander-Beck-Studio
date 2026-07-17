import { cloneAboutNarrativeDocument } from './aboutNarrativeSchema.js';

/**
 * Returns an isolated copy of the most recent authored World before a Section.
 *
 * Continuing Sections deliberately share their predecessor's World so the point
 * field can remain materially continuous. The editor uses this helper when an
 * author decides that one of those passages needs its own Shape, modifier stack,
 * or transition controls. The source document is never mutated here.
 */
export function createAboutNarrativeIndependentWorldClip(document, sectionId) {
  const sectionIndex = document?.sections?.findIndex((section) => section.id === sectionId) ?? -1;
  if (sectionIndex < 0) return null;
  const source = document.sections
    .slice(0, sectionIndex)
    .reverse()
    .find((section) => section.world?.mode === 'set');
  return source?.world ? cloneAboutNarrativeDocument(source.world) : null;
}

export function getAboutNarrativeInheritedWorldSource(document, sectionId) {
  const sectionIndex = document?.sections?.findIndex((section) => section.id === sectionId) ?? -1;
  if (sectionIndex < 0) return null;
  return document.sections
    .slice(0, sectionIndex)
    .reverse()
    .find((section) => section.world?.mode === 'set') || null;
}
