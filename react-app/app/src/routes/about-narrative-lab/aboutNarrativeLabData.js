import aboutContent from 'virtual:abs-content/about';
import homeContent from 'virtual:abs-content/home';
import {
  loadAboutNarrativePointFieldPersistenceSource,
  preflightAboutNarrativePointFieldRuntimePlans,
} from './aboutNarrativePointFieldPersistence.js';

export const ABOUT_NARRATIVE_LEGACY_SETTINGS_KEY = 'abs:about-narrative-lab:settings:v7';
export const ABOUT_NARRATIVE_RECOVERY_KEY = 'abs:about-narrative:recovery:v1';
export const ABOUT_NARRATIVE_CHECKPOINTS_KEY = 'abs:about-narrative:checkpoints:v1';

const loadedAboutNarrativeDocument = loadAboutNarrativePointFieldPersistenceSource(aboutContent, {
  preflight: preflightAboutNarrativePointFieldRuntimePlans,
});
if (!loadedAboutNarrativeDocument.valid) {
  const error = new Error(loadedAboutNarrativeDocument.message || 'The About Narrative source is not playable.');
  error.name = 'AboutNarrativeValidationError';
  error.diagnostics = loadedAboutNarrativeDocument.diagnostics;
  error.original = loadedAboutNarrativeDocument.original;
  throw error;
}
export const ABOUT_NARRATIVE_DOCUMENT = loadedAboutNarrativeDocument.document;

export const ABOUT_NARRATIVE_CONTACT = Object.freeze({
  email: homeContent.contact?.email || 'alexander@beck.fyi',
  linkedin: homeContent.socials?.items?.linkedin?.url || 'https://www.linkedin.com/in/thisisbeck/',
});
