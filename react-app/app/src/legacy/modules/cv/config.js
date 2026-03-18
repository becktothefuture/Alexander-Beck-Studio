import {
  DEFAULT_CV_CONFIG,
  deriveCvConfig,
  loadDesignSystemConfig,
  loadLegacyCvConfig,
  shouldUseCanonicalDesignConfig,
} from '../utils/design-config.js';

function toNumber(value, fallback) {
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function normalizeCvConfig(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};

  return {
    leftWidth: toNumber(source.leftWidth, DEFAULT_CV_CONFIG.leftWidth),
    leftPaddingTop: toNumber(source.leftPaddingTop, DEFAULT_CV_CONFIG.leftPaddingTop),
    leftPaddingBottom: toNumber(source.leftPaddingBottom, DEFAULT_CV_CONFIG.leftPaddingBottom),
    leftGap: toNumber(source.leftGap, DEFAULT_CV_CONFIG.leftGap),
    photoAspectRatio: toNumber(source.photoAspectRatio, DEFAULT_CV_CONFIG.photoAspectRatio),
    photoSize: toNumber(source.photoSize, DEFAULT_CV_CONFIG.photoSize),
    photoBorderRadius: toNumber(source.photoBorderRadius, DEFAULT_CV_CONFIG.photoBorderRadius),
    rightPaddingTop: toNumber(source.rightPaddingTop, DEFAULT_CV_CONFIG.rightPaddingTop),
    rightPaddingBottom: toNumber(source.rightPaddingBottom, DEFAULT_CV_CONFIG.rightPaddingBottom),
    rightPaddingX: toNumber(source.rightPaddingX, DEFAULT_CV_CONFIG.rightPaddingX),
    rightMaxWidth: toNumber(source.rightMaxWidth, DEFAULT_CV_CONFIG.rightMaxWidth),
    nameSize: toNumber(source.nameSize, DEFAULT_CV_CONFIG.nameSize),
    titleSize: toNumber(source.titleSize, DEFAULT_CV_CONFIG.titleSize),
    sectionTitleSize: toNumber(source.sectionTitleSize, DEFAULT_CV_CONFIG.sectionTitleSize),
    bodySize: toNumber(source.bodySize, DEFAULT_CV_CONFIG.bodySize),
    sectionGap: toNumber(source.sectionGap, DEFAULT_CV_CONFIG.sectionGap),
    paragraphGap: toNumber(source.paragraphGap, DEFAULT_CV_CONFIG.paragraphGap),
    mutedOpacity: toNumber(source.mutedOpacity, DEFAULT_CV_CONFIG.mutedOpacity),
  };
}

export function cloneCvConfig(config = DEFAULT_CV_CONFIG) {
  return normalizeCvConfig(config);
}

export function applyCvConfig(config = DEFAULT_CV_CONFIG) {
  const resolved = normalizeCvConfig(config);
  const root = document.documentElement;

  root.style.setProperty('--cv-left-width', `${resolved.leftWidth}vw`);
  root.style.setProperty('--cv-left-padding-top', `${resolved.leftPaddingTop}vh`);
  root.style.setProperty('--cv-left-padding-bottom', `${resolved.leftPaddingBottom}vh`);
  root.style.setProperty('--cv-left-gap', `${resolved.leftGap}rem`);
  root.style.setProperty('--cv-photo-aspect-ratio', `${resolved.photoAspectRatio}`);
  root.style.setProperty('--cv-photo-size', `${resolved.photoSize}%`);
  root.style.setProperty('--cv-photo-border-radius', `${resolved.photoBorderRadius}rem`);
  root.style.setProperty('--cv-right-padding-top', `${resolved.rightPaddingTop}vh`);
  root.style.setProperty('--cv-right-padding-bottom', `${resolved.rightPaddingBottom}vh`);
  root.style.setProperty('--cv-right-padding-x', `${resolved.rightPaddingX}rem`);
  root.style.setProperty('--cv-right-max-width', `${resolved.rightMaxWidth}rem`);
  root.style.setProperty('--cv-name-size', `${resolved.nameSize}rem`);
  root.style.setProperty('--cv-title-size', `${resolved.titleSize}rem`);
  root.style.setProperty('--cv-section-title-size', `${resolved.sectionTitleSize}rem`);
  root.style.setProperty('--cv-body-size', `${resolved.bodySize}rem`);
  root.style.setProperty('--cv-section-gap', `${resolved.sectionGap}rem`);
  root.style.setProperty('--cv-paragraph-gap', `${resolved.paragraphGap}rem`);
  root.style.setProperty('--cv-muted-opacity', `${resolved.mutedOpacity}`);

  return resolved;
}

export async function loadCvRuntimeConfig() {
  try {
    if (shouldUseCanonicalDesignConfig()) {
      const designSystem = await loadDesignSystemConfig();
      return normalizeCvConfig(deriveCvConfig(designSystem));
    }

    const legacyConfig = await loadLegacyCvConfig();
    if (legacyConfig && typeof legacyConfig === 'object') {
      return normalizeCvConfig(legacyConfig);
    }

    const designSystem = await loadDesignSystemConfig();
    return normalizeCvConfig(deriveCvConfig(designSystem));
  } catch (error) {
    return cloneCvConfig();
  }
}
