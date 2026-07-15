import aboutContent from 'virtual:abs-content/about';
import homeContent from 'virtual:abs-content/home';
import {
  assertValidAboutNarrativeDocument,
  normalizeAboutNarrativeDocument,
} from './aboutNarrativeSchema.js';

export const ABOUT_NARRATIVE_LEGACY_SETTINGS_KEY = 'abs:about-narrative-lab:settings:v7';
export const ABOUT_NARRATIVE_RECOVERY_KEY = 'abs:about-narrative:recovery:v1';
export const ABOUT_NARRATIVE_CHECKPOINTS_KEY = 'abs:about-narrative:checkpoints:v1';

const normalizedAboutNarrativeDocument = normalizeAboutNarrativeDocument(aboutContent);
assertValidAboutNarrativeDocument(normalizedAboutNarrativeDocument);
export const ABOUT_NARRATIVE_DOCUMENT = normalizedAboutNarrativeDocument;

export const ABOUT_NARRATIVE_CONTACT = Object.freeze({
  email: homeContent.contact?.email || 'alexander@beck.fyi',
  linkedin: homeContent.socials?.items?.linkedin?.url || 'https://www.linkedin.com/in/thisisbeck/',
});
