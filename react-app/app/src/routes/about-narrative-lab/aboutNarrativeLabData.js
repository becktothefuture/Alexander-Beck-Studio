import aboutContent from 'virtual:abs-content/about';
import homeContent from 'virtual:abs-content/home';
import {
  loadAboutNarrativePointFieldPersistenceSource,
  preflightAboutNarrativePointFieldRuntimePlans,
} from './aboutNarrativePointFieldPersistence.js';

export const ABOUT_NARRATIVE_LEGACY_SETTINGS_KEY = 'abs:about-narrative-lab:settings:v7';
export const ABOUT_NARRATIVE_RECOVERY_KEY = 'abs:about-narrative:recovery:v2';
export const ABOUT_NARRATIVE_CHECKPOINTS_KEY = 'abs:about-narrative:checkpoints:v2';

function loadBundledAboutNarrativeDocument(source, label) {
  const loaded = loadAboutNarrativePointFieldPersistenceSource(source, {
    preflight: preflightAboutNarrativePointFieldRuntimePlans,
  });
  if (loaded.valid) return loaded.document;
  const error = new Error(loaded.message || `The ${label} About Narrative source is not playable.`);
  error.name = 'AboutNarrativeValidationError';
  error.diagnostics = loaded.diagnostics;
  error.original = loaded.original;
  throw error;
}

export const ABOUT_NARRATIVE_DOCUMENT = loadBundledAboutNarrativeDocument(
  aboutContent,
  'canonical',
);

export const ABOUT_NARRATIVE_CONTACT = Object.freeze({
  email: homeContent.contact?.email || 'alexander@beck.fyi',
  linkedin: homeContent.socials?.items?.linkedin?.url || 'https://www.linkedin.com/in/thisisbeck/',
});
