import { getShellRouteTransitionConfig } from '../../legacy/modules/visual/site-shell.js';
import { getSimulationPaletteSnapshot } from '../../palette/simulationPaletteController.js';
import { isDarkThemeDocument } from '../theme-state.js';
import { resolvePairKerningEm } from './glyph-kerning.js';
import { requestHomeTitlePlaneRender } from './route-transition-title-plane.js';

const ENTRANCE_SELECTOR = '[data-route-enter]';
const ENTRANCE_GLYPH_SELECTOR = '[data-route-enter-glyph]';
const LOCKUP_SELECTOR = '.route-title-lockup';
const LOCKUP_RULE_SELECTOR = '.route-title-lockup__rule';
const DESCRIPTION_LINE_SELECTOR = '[data-route-enter-description-line]';
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');
const HOME_PHASE_CLASSES = Object.freeze([
  'abs-home-post-boot-pending',
  'abs-home-post-boot-enter',
  'abs-home-post-boot-complete',
]);
const styleCleanupGeneration = new WeakMap();
const bookendEndpointByElement = new WeakMap();
const finalOpacityByElement = new WeakMap();
const entranceManagedInertTargets = new WeakSet();
const BOOKEND_TITLE_MOTION = Object.freeze({
  delayMs: 500,
  colorCount: 5,
  durationMs: 196,
  overlapPercent: 84,
  lineOverlapMs: 0,
  subtitleGapMs: 98,
  ruleDurationMs: 520,
  descriptionDelayMs: 260,
  descriptionDurationMs: 900,
  descriptionLineStaggerMs: 180,
  movementEnabled: true,
  travelPercent: 10,
});
const SEQUENCED_GROUPS = Object.freeze(['legend', 'context', 'action', 'footer', 'control']);
const DIRECT_FLOW_GROUPS = Object.freeze(['legend', 'context', 'action', 'footer']);
const GROUP_GAP_MS = 40;
let glyphPreparationGeneration = 0;
let entranceSequenceGeneration = 0;
let glyphKerningContext = null;

function notifyBookendTitlePresentationChanged(element) {
  if (!element) return;
  glyphPreparationGeneration += 1;
  const titleRoot = element.closest?.('#hero-title') || element;
  titleRoot.dataset.routeEnterGlyphRevision = String(glyphPreparationGeneration);
  if (titleRoot.dataset.canvasTitleSource === 'home') requestHomeTitlePlaneRender();
}

const BOOKEND_MOVEMENT_EASING = 'cubic-bezier(0.22, 0.6, 0.4, 0.9)';
const BOOKEND_RULE_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const BOOKEND_DESCRIPTION_MOVEMENT_EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
const BOOKEND_DESCRIPTION_FADE_EASING = 'cubic-bezier(0.37, 0, 0.63, 1)';

const PROFILES = Object.freeze({
  direct: Object.freeze({
    easing: 'cubic-bezier(0.22, 0, 0.16, 1)',
    blurPx: 0,
    bookendTitle: BOOKEND_TITLE_MOTION,
    groups: Object.freeze({
      identity: Object.freeze({ startMs: 0, stepMs: 90, durationMs: 420 }),
      legend: Object.freeze({ startMs: 900, stepMs: 90, durationMs: 480 }),
      context: Object.freeze({ startMs: 1650, stepMs: 110, durationMs: 480 }),
      action: Object.freeze({ startMs: 2000, stepMs: 110, durationMs: 480 }),
      footer: Object.freeze({ startMs: 2350, stepMs: 100, durationMs: 480 }),
      control: Object.freeze({ startMs: 0, stepMs: 0, durationMs: 480 }),
    }),
  }),
  route: Object.freeze({
    easing: 'cubic-bezier(0.22, 0, 0.16, 1)',
    blurPx: 0,
    bookendTitle: BOOKEND_TITLE_MOTION,
    groups: Object.freeze({
      identity: Object.freeze({ startMs: 0, stepMs: 58, durationMs: 420 }),
      legend: Object.freeze({ startMs: 90, stepMs: 36, durationMs: 460 }),
      context: Object.freeze({ startMs: 210, stepMs: 54, durationMs: 480 }),
      action: Object.freeze({ startMs: 300, stepMs: 54, durationMs: 440 }),
      footer: Object.freeze({ startMs: 360, stepMs: 48, durationMs: 420 }),
      control: Object.freeze({ startMs: 420, stepMs: 0, durationMs: 420 }),
    }),
  }),
});

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

function asScopeElements(scopes) {
  const values = Array.isArray(scopes) ? scopes : [scopes || document];
  return values
    .map((value) => value?.current || value)
    .filter(Boolean);
}

function readOrder(element, fallback) {
  const raw = element.dataset.routeEnterOrder ?? element.style.getPropertyValue('--i') ?? '';
  const parsed = Number.parseInt(String(raw), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readFinalOpacity(element, sequenceSeed) {
  const explicit = Number.parseFloat(element.dataset.routeEnterOpacity || '');
  if (Number.isFinite(explicit)) return explicit;

  // `play()` recollects live targets after `stage()` has set their inline
  // opacity to zero. Keep the authored endpoint for this transaction so a
  // quiet target such as the Home edge caption never briefly reaches full
  // opacity before its inline styles are released.
  const cached = finalOpacityByElement.get(element);
  if (cached?.sequenceSeed === sequenceSeed) return cached.value;

  const computed = Number.parseFloat(getComputedStyle(element).opacity || '');
  const value = Number.isFinite(computed) && computed > 0.02 ? computed : 1;
  finalOpacityByElement.set(element, { sequenceSeed, value });
  return value;
}

function readBookendEndpoint(element, sequenceSeed) {
  const cached = bookendEndpointByElement.get(element);
  if (cached?.sequenceSeed === sequenceSeed) return cached;
  const endpoint = {
    sequenceSeed,
    finalColor: getComputedStyle(element).color,
    finalOpacity: readFinalOpacity(element, sequenceSeed),
  };
  bookendEndpointByElement.set(element, endpoint);
  return endpoint;
}

function getRelativeLuminance(color) {
  const normalized = String(color || '').replace('#', '');
  if (!/^[\da-f]{6}$/i.test(normalized)) return 0;
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return (channels[0] * 0.2126) + (channels[1] * 0.7152) + (channels[2] * 0.0722);
}

function getSeededSample(seed) {
  return Math.abs(Math.sin((seed + 1) * 12.9898) * 43758.5453) % 1;
}

function createRandomOrderedFlashColors(colors, count, isDark, seed) {
  const selected = colors
    .map((color, index) => ({ color, rank: getSeededSample(seed + (index * 47)) }))
    .sort((left, right) => left.rank - right.rank)
    .slice(0, Math.min(count, colors.length))
    .map((entry) => entry.color)
    .sort((left, right) => getRelativeLuminance(left) - getRelativeLuminance(right));
  return isDark ? selected : selected.reverse();
}

function createSteppedColorKeyframes(flashColors, finalColor, finalOpacity = 1) {
  const count = Math.max(1, flashColors.length);
  const keyframes = flashColors.map((color, index) => ({
    color,
    opacity: 1,
    offset: index / count,
    easing: 'steps(1, end)',
  }));
  keyframes.push({ color: finalColor, opacity: finalOpacity, offset: 1 });
  return keyframes;
}

function restoreBookendDescription(target) {
  if (target.variant !== 'bookend-description' || !target.descriptionText) return;
  target.element.replaceChildren(target.descriptionText);
}

export function prepareBookendDescriptionLines(element) {
  if (!element) return [];
  const existingLines = Array.from(element.querySelectorAll(DESCRIPTION_LINE_SELECTOR));
  if (existingLines.length > 0) return existingLines;

  const text = String(
    element.dataset.routeEnterDescriptionText || element.textContent || '',
  ).replace(/\s+/g, ' ').trim();
  if (!text) return [];
  element.dataset.routeEnterDescriptionText = text;
  if (!element.getAttribute('aria-label')) element.setAttribute('aria-label', text);

  const tokens = text.match(/\S+\s*/g) || [];
  const tokenNodes = tokens.map((token) => {
    const span = document.createElement('span');
    span.textContent = token;
    span.setAttribute('aria-hidden', 'true');
    return span;
  });
  element.replaceChildren(...tokenNodes);

  const groupedLines = [];
  tokenNodes.forEach((tokenNode) => {
    const top = tokenNode.getBoundingClientRect().top;
    const activeLine = groupedLines[groupedLines.length - 1];
    if (!activeLine || Math.abs(activeLine.top - top) > 1) {
      groupedLines.push({ top, text: tokenNode.textContent || '' });
      return;
    }
    activeLine.text += tokenNode.textContent || '';
  });

  const lineNodes = groupedLines.map((line) => {
    const span = document.createElement('span');
    span.className = 'route-entrance-description-line';
    span.dataset.routeEnterDescriptionLine = '';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = line.text.trim();
    return span;
  });
  element.replaceChildren(...lineNodes);
  return lineNodes;
}

function createGlyph(character) {
  const glyph = document.createElement('span');
  glyph.className = 'route-entrance-glyph';
  glyph.dataset.routeEnterGlyph = '';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = character;
  return glyph;
}

function getGlyphKerningContext() {
  if (glyphKerningContext) return glyphKerningContext;
  if (typeof document === 'undefined') return null;
  glyphKerningContext = document.createElement('canvas').getContext('2d');
  return glyphKerningContext;
}

function buildCanvasFont(style, fontSizePx) {
  const fontStyle = style.fontStyle && style.fontStyle !== 'normal' ? `${style.fontStyle} ` : '';
  const fontWeight = style.fontWeight || '400';
  return `${fontStyle}${fontWeight} ${fontSizePx}px ${style.fontFamily || 'sans-serif'}`;
}

export function applyBookendTitleKerning(element) {
  if (!element?.isConnected || typeof getComputedStyle !== 'function') return false;
  const context = getGlyphKerningContext();
  if (!context) return false;

  const words = element.querySelectorAll('.route-entrance-word');
  let applied = false;
  words.forEach((word) => {
    const glyphs = Array.from(word.querySelectorAll(ENTRANCE_GLYPH_SELECTOR));
    if (glyphs.length === 0) return;

    const style = getComputedStyle(word);
    const fontSizePx = Number.parseFloat(style.fontSize);
    if (!Number.isFinite(fontSizePx) || fontSizePx <= 0) return;

    context.font = buildCanvasFont(style, fontSizePx);
    if ('fontKerning' in context) context.fontKerning = 'normal';
    if ('letterSpacing' in context) context.letterSpacing = '0px';
    const measureText = (text) => context.measureText(text);

    glyphs.forEach((glyph, index) => {
      const kerningEm = index === 0
        ? 0
        : resolvePairKerningEm({
          measureText,
          previousGlyph: glyphs[index - 1].textContent || '',
          currentGlyph: glyph.textContent || '',
          fontSizePx,
        });
      glyph.style.setProperty('--route-entrance-glyph-kern', `${kerningEm.toFixed(6)}em`);
    });
    applied = true;
  });

  return applied;
}

/**
 * Record visual title lines without changing the accessible or inline word
 * structure. About uses these indices to stagger both colour drawing and the
 * later quiet fade, while one-line route titles keep their existing rhythm.
 */
export function measureBookendTitleGlyphLines(element) {
  if (!element?.isConnected) return [];
  const words = Array.from(element.querySelectorAll('.route-entrance-word'));
  const lines = [];
  words.forEach((word) => {
    const top = word.getBoundingClientRect().top;
    let lineIndex = lines.findIndex((lineTop) => Math.abs(lineTop - top) <= 1.5);
    if (lineIndex < 0) {
      lineIndex = lines.length;
      lines.push(top);
    }
    const glyphs = Array.from(word.querySelectorAll(ENTRANCE_GLYPH_SELECTOR));
    const priorGlyphCount = Array.from(element.querySelectorAll(
      `${ENTRANCE_GLYPH_SELECTOR}[data-route-enter-line-index="${lineIndex}"]`,
    )).length;
    glyphs.forEach((glyph, glyphIndex) => {
      glyph.dataset.routeEnterLineIndex = String(lineIndex);
      glyph.dataset.routeEnterLineGlyphIndex = String(priorGlyphCount + glyphIndex);
    });
  });
  element.dataset.routeEnterLineCount = String(Math.max(1, lines.length));
  return Array.from(element.querySelectorAll(ENTRANCE_GLYPH_SELECTOR));
}

/**
 * Converts one title into stable word groups and individually animatable glyphs.
 * The title keeps its accessible name while visual children remain aria-hidden.
 */
export function prepareBookendTitleGlyphs(element) {
  if (!element) return [];
  const existingGlyphs = Array.from(element.querySelectorAll(ENTRANCE_GLYPH_SELECTOR));
  if (existingGlyphs.length > 0) {
    existingGlyphs.forEach((glyph, index) => glyph.style.setProperty('--route-enter-glyph-index', index));
    applyBookendTitleKerning(element);
    measureBookendTitleGlyphLines(element);
    return existingGlyphs;
  }

  const text = String(element.dataset.routeEnterText || element.textContent || '').replace(/\u00a0/g, ' ');
  if (!text) return [];
  element.dataset.routeEnterText = text;
  notifyBookendTitlePresentationChanged(element);
  const labelledHeadingAncestor = element.parentElement?.closest?.(
    'h1[aria-label], h2[aria-label], h3[aria-label], h4[aria-label], h5[aria-label], h6[aria-label], [role="heading"][aria-label]',
  );
  if (!element.getAttribute('aria-label') && !labelledHeadingAncestor) {
    element.setAttribute('aria-label', text);
  }
  element.replaceChildren();

  const fragment = document.createDocumentFragment();
  const tokens = text.match(/\s+|\S+/g) || [];
  tokens.forEach((token) => {
    if (/^\s+$/.test(token)) {
      const space = document.createElement('span');
      space.className = 'route-entrance-space';
      space.setAttribute('aria-hidden', 'true');
      space.textContent = '\u00a0'.repeat(token.length);
      fragment.append(space);
      return;
    }

    const word = document.createElement('span');
    word.className = 'route-entrance-word';
    word.setAttribute('aria-hidden', 'true');
    Array.from(token).forEach((character) => word.append(createGlyph(character)));
    fragment.append(word);
  });
  element.append(fragment);
  const glyphs = Array.from(element.querySelectorAll(ENTRANCE_GLYPH_SELECTOR));
  glyphs.forEach((glyph, index) => glyph.style.setProperty('--route-enter-glyph-index', index));
  applyBookendTitleKerning(element);
  measureBookendTitleGlyphLines(element);
  return glyphs;
}

function resolveProfile(name, timingMode = 'repeat', {
  bookendDelayMs = null,
  bookendDurationMs = null,
  bookendOverlapPercent = null,
  compactFlow = null,
  compactStartMs = null,
} = {}) {
  const baseProfile = PROFILES[name] || PROFILES.route;
  const config = getShellRouteTransitionConfig();
  const reduced = timingMode === 'reduced';
  // Every route visit replays the same authored choreography. Compressing
  // repeat visits made material and typography drift out of phase.
  const duration = (value) => reduced ? 120 : Math.round(value);
  const step = reduced ? 0 : Math.round(config.itemStepMs);
  const routeTypographyOffsetMs = reduced || name !== 'route'
    ? 0
    : config.typographyDelayMs;
  const resolvedBookendDelayMs = Number.isFinite(Number(bookendDelayMs))
    ? Math.max(0, Number(bookendDelayMs))
    : config.typographyDelayMs;
  const resolvedBookendDurationMs = bookendDurationMs !== null
    && Number.isFinite(Number(bookendDurationMs))
    ? Math.max(0, Number(bookendDurationMs))
    : config.routeBookendDurationMs;
  const resolvedBookendOverlapPercent = bookendOverlapPercent !== null
    && Number.isFinite(Number(bookendOverlapPercent))
    ? Math.min(99, Math.max(0, Number(bookendOverlapPercent)))
    : config.routeBookendOverlapPercent;
  const group = (groupName, durationMs, stepMs = step) => ({
    ...baseProfile.groups[groupName],
    startMs: reduced ? 0 : baseProfile.groups[groupName].startMs + routeTypographyOffsetMs,
    stepMs,
    durationMs: duration(durationMs),
  });
  return {
    ...baseProfile,
    compactFlow: typeof compactFlow === 'boolean' ? compactFlow : name === 'route',
    compactStartMs: compactStartMs !== null && Number.isFinite(Number(compactStartMs))
      ? Math.max(0, Number(compactStartMs))
      : null,
    identityLineStepMs: reduced ? 0 : 50,
    contextGapMs: reduced ? 0 : 40,
    actionGapMs: reduced ? 0 : 60,
    footerStepMs: reduced ? 0 : 20,
    blurPx: reduced ? 0 : baseProfile.blurPx,
    bookendTitle: {
      ...baseProfile.bookendTitle,
      delayMs: reduced ? 0 : resolvedBookendDelayMs,
      colorCount: config.routeBookendColorCount,
      durationMs: reduced ? 0 : resolvedBookendDurationMs,
      overlapPercent: resolvedBookendOverlapPercent,
      lineOverlapMs: reduced ? 0 : config.routeBookendLineOverlapMs,
      ruleDurationMs: reduced ? 0 : config.routeBookendLineDurationMs,
      descriptionDelayMs: reduced ? 0 : config.routeBookendDescriptionDelayMs,
      descriptionDurationMs: reduced ? 0 : config.routeBookendDescriptionDurationMs,
      descriptionLineStaggerMs: reduced ? 0 : config.routeBookendDescriptionLineStaggerMs,
      movementEnabled: !reduced && config.routeBookendMovementEnabled,
      travelPercent: reduced ? 0 : config.routeBookendTravelPercent,
    },
    groups: {
      identity: group('identity', config.supportDurationMs),
      legend: group('legend', config.supportDurationMs),
      context: group('context', config.contextDurationMs),
      action: group('action', config.actionDurationMs),
      footer: group('footer', config.supportDurationMs),
      control: group('control', config.supportDurationMs, 0),
    },
  };
}

function readGroup(profile, name) {
  return profile.groups[name] || profile.groups.context;
}

function getTitleGlyphDelayOffset(target, glyphIndex) {
  const glyph = target.glyphs[glyphIndex];
  const lineIndex = Number(glyph?.dataset.routeEnterLineIndex || 0);
  const lineGlyphIndex = Number(glyph?.dataset.routeEnterLineGlyphIndex ?? glyphIndex);
  return (lineIndex * Number(target.titleLineStepMs || 0))
    + (lineGlyphIndex * target.letterStepMs);
}

function getLastTitleGlyphDelayOffset(target) {
  return target.glyphs.reduce((maximum, _glyph, glyphIndex) => (
    Math.max(maximum, getTitleGlyphDelayOffset(target, glyphIndex))
  ), 0);
}

function getTargetEndMs(target) {
  if (target.variant === 'bookend-title') {
    return target.delayMs
      + target.durationMs
      + getLastTitleGlyphDelayOffset(target);
  }
  if (target.variant === 'bookend-description') {
    return target.delayMs
      + target.durationMs
      + (Math.max(0, target.descriptionLines.length - 1) * target.lineStepMs);
  }
  return target.delayMs + target.durationMs;
}

function sequenceTargets(targets, profile) {
  const identityTargets = targets
    .filter((target) => target.groupName === 'identity')
    .sort((left, right) => left.order - right.order);
  if (identityTargets.length === 0) return targets;

  const identityStartMs = profile.bookendTitle.delayMs;
  const identityTitles = identityTargets.filter((target) => target.variant === 'bookend-title');
  const lockupRuleTargets = targets.filter((target) => target.variant === 'lockup-rule');
  if (identityTitles.length === 0) return targets;
  let glyphOffset = 0;
  identityTitles.forEach((target) => {
    target.delayMs = identityStartMs + (glyphOffset * target.letterStepMs);
    glyphOffset += target.glyphs.length;
  });

  const identityEndMs = Math.max(...identityTitles.map(getTargetEndMs));
  if (lockupRuleTargets.length > 0) {
    lockupRuleTargets.forEach((target) => {
      const owningTitle = identityTitles.find((title) => title.lockup === target.lockup);
      const titleEndMs = owningTitle ? getTargetEndMs(owningTitle) : identityEndMs;
      target.delayMs = Math.max(0, titleEndMs - profile.bookendTitle.lineOverlapMs);
    });
  }

  const descriptionTargets = targets.filter((target) => target.variant === 'bookend-description');
  descriptionTargets.forEach((target) => {
    const owningRule = lockupRuleTargets.find((rule) => rule.lockup === target.lockup);
    const owningTitle = identityTitles.find((title) => title.lockup === target.lockup);
    const titleEndMs = owningTitle ? getTargetEndMs(owningTitle) : identityEndMs;
    const lockupStartMs = owningRule?.delayMs ?? titleEndMs;
    target.delayMs = lockupStartMs + profile.bookendTitle.descriptionDelayMs;
  });

  let cursorMs = Math.max(
    identityEndMs,
    ...lockupRuleTargets.map(getTargetEndMs),
    ...descriptionTargets.map(getTargetEndMs),
  );
  if (lockupRuleTargets.length === 0 && descriptionTargets.length === 0) {
    cursorMs += profile.bookendTitle.subtitleGapMs;
  }

  if (profile.compactFlow) {
    const compactStartMs = Number.isFinite(profile.compactStartMs)
      ? profile.compactStartMs
      : cursorMs;
    const starts = {
      legend: compactStartMs,
      context: compactStartMs,
      action: compactStartMs + profile.actionGapMs,
      footer: compactStartMs + profile.actionGapMs + profile.footerStepMs,
      control: compactStartMs + profile.actionGapMs + profile.footerStepMs + readGroup(profile, 'control').stepMs,
    };
    SEQUENCED_GROUPS.forEach((groupName) => {
      const group = readGroup(profile, groupName);
      const groupTargets = targets
        .filter((target) => target.groupName === groupName && target.variant !== 'bookend-description')
        .sort((left, right) => left.order - right.order);
      groupTargets.forEach((target) => {
        const groupStep = groupName === 'footer' ? profile.footerStepMs : group.stepMs;
        target.delayMs = starts[groupName] + (groupStep * target.order);
      });
    });
    return targets.sort((left, right) => (
      left.delayMs - right.delayMs
      || left.groupName.localeCompare(right.groupName)
      || left.order - right.order
    ));
  }

  // The Home simulation switcher is the identity's primary control. Reveal it
  // as soon as the identity resolves, in parallel with the first supporting
  // content, instead of holding it behind the complete footer sequence.
  const controlGroup = readGroup(profile, 'control');
  targets
    .filter((target) => target.groupName === 'control')
    .sort((left, right) => left.order - right.order)
    .forEach((target) => {
      target.delayMs = Math.max(cursorMs, controlGroup.startMs)
        + (controlGroup.stepMs * target.order);
    });

  DIRECT_FLOW_GROUPS.forEach((groupName) => {
    const groupTargets = targets
      .filter((target) => target.groupName === groupName && target.variant !== 'bookend-description')
      .sort((left, right) => left.order - right.order);
    if (groupTargets.length === 0) return;
    const group = readGroup(profile, groupName);
    const groupStartMs = Math.max(cursorMs, group.startMs);
    groupTargets.forEach((target) => {
      target.delayMs = groupStartMs + (group.stepMs * target.order);
    });
    cursorMs = Math.max(...groupTargets.map(getTargetEndMs)) + GROUP_GAP_MS;
  });

  return targets.sort((left, right) => (
    left.delayMs - right.delayMs
    || left.groupName.localeCompare(right.groupName)
    || left.order - right.order
  ));
}

function collectTargets(scopes, profile, {
  trigger = 'route',
  sequenceSeed = 0,
  targetSelector = ENTRANCE_SELECTOR,
  targetDefaults = null,
} = {}) {
  const groupCounts = new Map();
  const seen = new Set();
  const targets = [];
  const paletteColors = getSimulationPaletteSnapshot()?.colors || [];
  const isDark = isDarkThemeDocument();

  asScopeElements(scopes).forEach((scope) => {
    const elements = [
      ...(scope.matches?.(targetSelector) ? [scope] : []),
      ...Array.from(scope.querySelectorAll?.(targetSelector) || []),
    ];

    elements.forEach((element) => {
      const elementTrigger = targetDefaults?.trigger
        || element.dataset.routeEnterTrigger
        || 'route';
      if (elementTrigger !== trigger) return;
      if (seen.has(element)) return;
      seen.add(element);
      const groupName = targetDefaults?.groupName
        || element.dataset.routeEnter
        || 'context';
      const fallbackOrder = groupCounts.get(groupName) || 0;
      const order = Number.isFinite(Number(targetDefaults?.order))
        ? Number(targetDefaults.order)
        : readOrder(element, fallbackOrder);
      const variant = targetDefaults?.variant
        || element.dataset.routeEnterVariant
        || 'default';
      const isBookendTitle = variant === 'bookend-title';
      const isBookendDescription = variant === 'bookend-description';
      const glyphs = isBookendTitle ? prepareBookendTitleGlyphs(element) : [];
      const bookendEndpoint = isBookendTitle
        ? readBookendEndpoint(element, sequenceSeed)
        : null;
      const descriptionLines = isBookendDescription
        ? prepareBookendDescriptionLines(element)
        : [];
      groupCounts.set(groupName, Math.max(fallbackOrder + 1, order + 1));
      const group = readGroup(profile, groupName);
      const finalColor = bookendEndpoint?.finalColor || '';
      const targetIndex = targets.length;
      targets.push({
        element,
        groupName,
        order,
        delayMs: group.startMs + (group.stepMs * order),
        durationMs: isBookendTitle
          ? Number.isFinite(Number(targetDefaults?.durationMs))
            ? Math.max(0, Number(targetDefaults.durationMs))
            : profile.bookendTitle.durationMs
          : isBookendDescription
            ? profile.bookendTitle.descriptionDurationMs
            : group.durationMs,
        blurPx: isBookendTitle || isBookendDescription ? 0 : profile.blurPx,
        letterStepMs: isBookendTitle
          ? Number.isFinite(Number(targetDefaults?.letterStepMs))
            ? Math.max(0, Number(targetDefaults.letterStepMs))
            : (
                Number.isFinite(Number(targetDefaults?.durationMs))
                  ? Math.max(0, Number(targetDefaults.durationMs))
                  : profile.bookendTitle.durationMs
              ) * (1 - (profile.bookendTitle.overlapPercent / 100))
          : 0,
        titleLineStepMs: isBookendTitle
          ? Math.max(0, Number(targetDefaults?.titleLineStepMs || 0))
          : 0,
        lineStepMs: isBookendDescription
          ? profile.bookendTitle.descriptionLineStaggerMs
          : 0,
        travelPercent: isBookendTitle && profile.bookendTitle.movementEnabled
          ? Number.isFinite(Number(targetDefaults?.travelPercent))
            ? Number(targetDefaults.travelPercent)
            : profile.bookendTitle.travelPercent
          : 0,
        glyphs,
        descriptionLines,
        descriptionText: isBookendDescription
          ? element.dataset.routeEnterDescriptionText
          : '',
        variant,
        finalOpacity: bookendEndpoint?.finalOpacity ?? readFinalOpacity(element, sequenceSeed),
        finalColor,
        flashColors: isBookendTitle
          ? glyphs.map((glyph, glyphIndex) => createRandomOrderedFlashColors(
            paletteColors,
            Number.isFinite(Number(targetDefaults?.colorCount))
              ? Math.max(1, Math.round(Number(targetDefaults.colorCount)))
              : profile.bookendTitle.colorCount,
            isDark,
            (sequenceSeed * 97) + (targetIndex * 131) + (glyphIndex * 19),
          ))
          : [],
        lockup: element.closest?.(LOCKUP_SELECTOR) || null,
      });
    });
  });

  targets
    .filter((target) => target.variant === 'bookend-title')
    .forEach((titleTarget) => {
      const lockup = titleTarget.element.closest?.(LOCKUP_SELECTOR);
      const rule = lockup?.querySelector?.(`:scope > ${LOCKUP_RULE_SELECTOR}`);
      if (!rule || seen.has(rule)) return;
      seen.add(rule);
      targets.push({
        element: rule,
        groupName: 'lockup-rule',
        order: titleTarget.order,
        delayMs: 0,
        durationMs: profile.bookendTitle.ruleDurationMs,
        blurPx: 0,
        letterStepMs: 0,
        titleLineStepMs: 0,
        lineStepMs: 0,
        travelPercent: 0,
        glyphs: [],
        descriptionLines: [],
        variant: 'lockup-rule',
        finalOpacity: 1,
        lockup,
      });
    });

  return sequenceTargets(targets.sort((a, b) => (
    a.delayMs - b.delayMs
    || a.groupName.localeCompare(b.groupName)
    || a.order - b.order
  )), profile);
}

function setHomePhase(root, phase) {
  if (!root) return;
  root.classList.remove(...HOME_PHASE_CLASSES);
  if (phase) root.classList.add(`abs-home-post-boot-${phase}`);
  if (phase) root.dataset.absIntroPhase = phase;
  else delete root.dataset.absIntroPhase;
}

function settleGlyphEntranceState(glyph) {
  const state = glyph.__absRouteEntranceState;
  if (!state) return;
  state.settled = true;
  state.finalRect = null;
}

function refreshBookendTitleEndpoint(target) {
  if (target.variant !== 'bookend-title' || !target.element?.isConnected) return;
  const finalColor = getComputedStyle(target.element).color;
  if (!finalColor) return;
  target.finalColor = finalColor;
  target.glyphs.forEach((glyph) => {
    if (glyph.__absRouteEntranceState) {
      glyph.__absRouteEntranceState.finalColor = finalColor;
    }
  });
}

function settleFinishedGlyphColor(glyph, animation, finalColor, entranceState) {
  void animation.finished.then(() => {
    if (glyph.__absRouteEntranceState !== entranceState || entranceState?.settled) return;
    glyph.style.color = finalColor;
    animation.cancel();
  }, () => undefined);
}

function clearTargetStyles(target, { deferEndpointCleanup = false } = {}) {
  const { element } = target;
  const generation = (styleCleanupGeneration.get(element) || 0) + 1;
  styleCleanupGeneration.set(element, generation);
  // Keep transitions disabled through the first settled paint. Several targets
  // have hover transitions in their component CSS; removing the inline opacity
  // and `transition: none` together would accidentally animate that cleanup.
  element.style.transition = 'none';
  const removeEndpointStyles = () => {
    if (styleCleanupGeneration.get(element) !== generation) return;
    element.style.removeProperty('opacity');
    element.style.removeProperty('filter');
    element.style.removeProperty('pointer-events');
    element.style.removeProperty('will-change');
    if (target.variant === 'lockup-rule') {
      element.style.removeProperty('transform');
      element.style.removeProperty('transform-origin');
    } else if (target.variant === 'bookend-description') {
      element.style.removeProperty('transform');
    }
    target.glyphs.forEach((glyph) => {
      glyph.style.removeProperty('opacity');
      glyph.style.removeProperty('color');
      glyph.style.removeProperty('filter');
      glyph.style.removeProperty('transform');
      glyph.style.removeProperty('transition');
      glyph.style.removeProperty('will-change');
      settleGlyphEntranceState(glyph);
    });
    target.descriptionLines.forEach((line) => {
      line.style.removeProperty('opacity');
      line.style.removeProperty('transform');
      line.style.removeProperty('will-change');
    });
    restoreBookendDescription(target);
    window.requestAnimationFrame(() => {
      if (styleCleanupGeneration.get(element) !== generation) return;
      element.style.removeProperty('transition');
      element.style.removeProperty('transition-delay');
    });
  };
  if (deferEndpointCleanup) window.requestAnimationFrame(removeEndpointStyles);
  else removeEndpointStyles();
}

function restoreTargetInert(element) {
  if (!entranceManagedInertTargets.has(element)) return;
  element.inert = false;
  entranceManagedInertTargets.delete(element);
}

function settleTarget(target) {
  if (target.variant === 'lockup-rule') {
    target.element.style.transform = 'scaleX(1)';
  } else if (target.variant === 'bookend-title') {
    target.element.style.opacity = '1';
    target.element.style.filter = 'none';
    target.glyphs.forEach((glyph) => {
      glyph.style.opacity = String(target.finalOpacity);
      glyph.style.color = target.finalColor;
      glyph.style.transform = 'translate3d(0, 0, 0)';
      settleGlyphEntranceState(glyph);
    });
    notifyBookendTitlePresentationChanged(target.element);
  } else if (target.variant === 'bookend-description') {
    target.element.style.opacity = String(target.finalOpacity);
    target.element.style.filter = 'none';
    target.element.style.transform = 'translate3d(0, 0, 0)';
    target.descriptionLines.forEach((line) => {
      line.style.opacity = '1';
    });
  } else {
    target.element.style.opacity = String(target.finalOpacity);
    target.element.style.filter = 'blur(0)';
  }
  target.element.style.pointerEvents = '';
  restoreTargetInert(target.element);
}

function stageTarget(target, blurPx) {
  const usesBlur = blurPx > 0.01;
  styleCleanupGeneration.set(
    target.element,
    (styleCleanupGeneration.get(target.element) || 0) + 1,
  );
  target.element.style.transition = 'none';
  target.element.style.transitionDelay = `${target.delayMs}ms`;
  if (target.variant === 'lockup-rule') {
    target.element.style.transform = 'scaleX(0)';
    target.element.style.transformOrigin = '50% 50%';
  } else if (target.variant === 'bookend-title') {
    target.element.style.opacity = '1';
    target.element.style.filter = 'none';
    // `stage()` can run more than once before playback when React refreshes a
    // prepared route. Measure the settled endpoint, never the previous staged
    // translate, so every route keeps one stable title composition.
    target.glyphs.forEach((glyph) => {
      glyph.style.transform = 'translate3d(0, 0, 0)';
    });
    const titleRoot = target.element.closest?.('#hero-title') || target.element;
    const canvasOwnsMovement = Boolean(titleRoot.dataset.canvasTitleSource);
    target.glyphs.forEach((glyph, glyphIndex) => {
      const rect = glyph.getBoundingClientRect();
      glyph.__absRouteEntranceState = {
        phase: 'staged',
        settled: false,
        startedAt: 0,
        delayMs: target.delayMs + getTitleGlyphDelayOffset(target, glyphIndex),
        durationMs: target.durationMs,
        flashColors: target.flashColors[glyphIndex] || [],
        finalColor: target.finalColor,
        travelPercent: target.travelPercent,
        finalOpacity: target.finalOpacity,
        finalRect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
        canvasOwnsMovement,
      };
      glyph.style.transition = 'none';
      glyph.style.opacity = String(target.finalOpacity);
      glyph.style.color = 'transparent';
      glyph.style.filter = 'none';
      glyph.style.transform = canvasOwnsMovement
        ? 'translate3d(0, 0, 0)'
        : `translate3d(-${target.travelPercent}%, 0, 0)`;
      glyph.style.willChange = 'color, transform';
    });
    notifyBookendTitlePresentationChanged(target.element);
  } else if (target.variant === 'bookend-description') {
    target.element.style.opacity = String(target.finalOpacity);
    target.element.style.filter = 'none';
    target.element.style.transform = 'translate3d(0, 0.35em, 0)';
    target.descriptionLines.forEach((line) => {
      line.style.opacity = '0';
      line.style.willChange = 'opacity';
    });
  } else {
    target.element.style.opacity = '0';
    if (usesBlur) target.element.style.filter = `blur(${blurPx}px)`;
    else target.element.style.removeProperty('filter');
  }
  target.element.style.pointerEvents = 'none';
  target.element.style.willChange = target.variant === 'bookend-title'
    ? 'auto'
    : target.variant === 'bookend-description'
      ? 'transform'
      : target.variant === 'lockup-rule'
      ? 'transform'
      : usesBlur
        ? 'opacity, filter'
        : 'opacity';
  // Opacity and pointer-events do not remove delayed controls from sequential
  // keyboard navigation. Scope inert to targets that actually contain controls,
  // then restore their original state on completion or cancellation.
  if (
    'inert' in target.element
    && !target.element.inert
    && !entranceManagedInertTargets.has(target.element)
    && (
      target.element.matches?.(FOCUSABLE_SELECTOR)
      || target.element.querySelector?.(FOCUSABLE_SELECTOR)
    )
  ) {
    target.element.inert = true;
    entranceManagedInertTargets.add(target.element);
  }
}

/**
 * Creates one cancellable entrance transaction.
 *
 * Layout transforms are deliberately out of scope: anchored elements keep their
 * final geometry while this runner owns paint and per-glyph movement. Bookend
 * titles use a non-clipping colour reveal so serif ink remains intact.
 * This separation prevents centering, responsive placement, and motion from
 * overwriting one another on WebKit and other composited browsers.
 */
export function createEntranceSequence({
  scopes = document,
  profile: profileName = 'route',
  timingMode = 'repeat',
  diagnosticRoot = null,
  reducedMotion = prefersReducedMotion(),
  trigger = 'route',
  targetSelector = ENTRANCE_SELECTOR,
  targetDefaults = null,
  bookendDelayMs = null,
  bookendDurationMs = null,
  bookendOverlapPercent = null,
  compactFlow = null,
  compactStartMs = null,
  onAnimation,
} = {}) {
  const profile = resolveProfile(profileName, timingMode, {
    bookendDelayMs,
    bookendDurationMs,
    bookendOverlapPercent,
    compactFlow,
    compactStartMs,
  });
  entranceSequenceGeneration += 1;
  const sequenceSeed = entranceSequenceGeneration;
  const targetOptions = {
    trigger,
    sequenceSeed,
    targetSelector,
    targetDefaults,
  };
  let targets = collectTargets(scopes, profile, targetOptions);
  let animations = [];
  let animationGroupsByTarget = new Map();
  let staged = false;
  let settled = false;
  const settledTargets = new Set();

  const totalMs = () => reducedMotion ? 0 : Math.max(
    0,
    ...targets.map(getTargetEndMs),
  );

  const stage = () => {
    if (settled) return false;
    targets.forEach((target) => stageTarget(target, reducedMotion ? 0 : target.blurPx));
    staged = true;
    if (diagnosticRoot) setHomePhase(diagnosticRoot, 'pending');
    return true;
  };

  const cancelAnimation = (animation) => {
    try {
      animation.cancel();
    } catch {
      /* The animation may already have been detached with its route. */
    }
  };

  const settleAndClearTarget = (target, options) => {
    if (settledTargets.has(target)) return;
    settledTargets.add(target);
    settleTarget(target);
    clearTargetStyles(target, options);
    (animationGroupsByTarget.get(target) || []).forEach(cancelAnimation);
  };

  const finish = ({ clearPhase = false } = {}) => {
    if (settled) return;
    const hasPendingTargets = targets.some((target) => !settledTargets.has(target));
    settled = true;
    if (diagnosticRoot) setHomePhase(diagnosticRoot, clearPhase ? '' : 'complete');
    targets.forEach(settleAndClearTarget);
    animations.forEach(cancelAnimation);
    animations = [];
    animationGroupsByTarget.clear();
    if (hasPendingTargets) void document.documentElement.offsetWidth;
  };

  const play = async () => {
    if (settled) return false;
    if (!staged) stage();

    // React may re-render measured copy while the cover is visible, replacing
    // staged glyph/line children without replacing their known parent element.
    // Recollect and restage every live target so playback never holds detached
    // child references or exposes newly mounted text at its CSS endpoint.
    targets = collectTargets(scopes, profile, targetOptions);
    targets.forEach((target) => stageTarget(target, reducedMotion ? 0 : target.blurPx));
    targets.forEach(refreshBookendTitleEndpoint);

    if (reducedMotion || targets.length === 0 || typeof Element.prototype.animate !== 'function') {
      finish();
      return true;
    }

    // A single RAF callback can still run before the browser presents the
    // staged opacity-zero state. Hold typography for a full painted frame so
    // route material always gets the first visible movement, even under load.
    await new Promise((resolve) => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
    });
    if (settled) return false;
    if (diagnosticRoot) setHomePhase(diagnosticRoot, 'enter');

    const targetAnimationGroups = targets.map((target) => {
      if (target.variant === 'lockup-rule') {
        const animation = target.element.animate(
          [
            { transform: 'scaleX(0)' },
            { transform: 'scaleX(1)' },
          ],
          {
            duration: target.durationMs,
            delay: target.delayMs,
            easing: BOOKEND_RULE_EASING,
            fill: 'both',
          },
        );
        onAnimation?.(animation);
        return [animation];
      }
      if (target.variant === 'bookend-title') {
        const startedAt = performance.now();
        target.glyphs.forEach((glyph, glyphIndex) => {
          const delayMs = target.delayMs + getTitleGlyphDelayOffset(target, glyphIndex);
          if (glyph.__absRouteEntranceState) {
            Object.assign(glyph.__absRouteEntranceState, {
              phase: 'playing',
              settled: false,
              startedAt,
              delayMs,
            });
          }
        });
        notifyBookendTitlePresentationChanged(target.element);

        const canvasOwnsMovement = target.glyphs.length > 0
          && target.glyphs.every((glyph) => glyph.__absRouteEntranceState?.canvasOwnsMovement);
        if (canvasOwnsMovement) {
          const lastGlyphDelayMs = target.delayMs + getLastTitleGlyphDelayOffset(target);
          const timingAnimation = target.element.animate(
            [
              { opacity: target.finalOpacity },
              { opacity: target.finalOpacity },
            ],
            {
              duration: target.durationMs,
              delay: lastGlyphDelayMs,
              fill: 'none',
            },
          );
          onAnimation?.(timingAnimation);
          return [timingAnimation];
        }

        return target.glyphs.flatMap((glyph, glyphIndex) => {
          const entranceState = glyph.__absRouteEntranceState;
          const delayMs = entranceState?.delayMs ?? target.delayMs;
          const flashColors = target.flashColors[glyphIndex]?.length
            ? target.flashColors[glyphIndex]
            : [target.finalColor];
          const colorAnimation = glyph.animate(
            createSteppedColorKeyframes(flashColors, target.finalColor, target.finalOpacity),
            {
              duration: target.durationMs,
              delay: delayMs,
              fill: 'forwards',
            },
          );
          settleFinishedGlyphColor(
            glyph,
            colorAnimation,
            target.finalColor,
            glyph.__absRouteEntranceState,
          );
          const movementAnimation = glyph.animate(
            [
              {
                transform: glyph.__absRouteEntranceState?.canvasOwnsMovement
                  ? 'translate3d(0, 0, 0)'
                  : `translate3d(-${target.travelPercent}%, 0, 0)`,
              },
              {
                transform: 'translate3d(0, 0, 0)',
              },
            ],
            {
              duration: target.durationMs,
              delay: delayMs,
              easing: BOOKEND_MOVEMENT_EASING,
              fill: 'forwards',
            },
          );
          onAnimation?.(colorAnimation);
          onAnimation?.(movementAnimation);
          return [colorAnimation, movementAnimation];
        });
      }
      if (target.variant === 'bookend-description') {
        const motionDurationMs = target.durationMs
          + (Math.max(0, target.descriptionLines.length - 1) * target.lineStepMs);
        const movementAnimation = target.element.animate(
          [
            { transform: 'translate3d(0, 0.35em, 0)' },
            { transform: 'translate3d(0, 0, 0)' },
          ],
          {
            duration: motionDurationMs,
            delay: target.delayMs,
            easing: BOOKEND_DESCRIPTION_MOVEMENT_EASING,
            fill: 'forwards',
          },
        );
        onAnimation?.(movementAnimation);
        const lineAnimations = target.descriptionLines.map((line, lineIndex) => {
          const animation = line.animate(
            [
              { opacity: 0 },
              { opacity: 1 },
            ],
            {
              duration: target.durationMs,
              delay: target.delayMs + (lineIndex * target.lineStepMs),
              easing: BOOKEND_DESCRIPTION_FADE_EASING,
              fill: 'forwards',
            },
          );
          onAnimation?.(animation);
          return animation;
        });
        return [movementAnimation, ...lineAnimations];
      }
      const keyframes = target.blurPx > 0.01
        ? [
            { opacity: 0, filter: `blur(${target.blurPx}px)` },
            { opacity: target.finalOpacity, filter: 'blur(0)' },
          ]
        : [
            { opacity: 0 },
            { opacity: target.finalOpacity },
          ];
      const animation = target.element.animate(
        keyframes,
        {
          duration: target.durationMs,
          delay: target.delayMs,
          easing: profile.easing,
          fill: 'both',
        },
      );
      onAnimation?.(animation);
      return [animation];
    });

    animationGroupsByTarget = new Map(targets.map((target, index) => (
      [target, targetAnimationGroups[index]]
    )));
    animations = targetAnimationGroups.flat();
    // Release each target's fill layer at its own authored endpoint. Waiting
    // for the final footer target kept every completed animation alive and
    // forced one large style/compositor cleanup at transaction completion.
    await Promise.all(targetAnimationGroups.map(async (targetAnimations, index) => {
      await Promise.all(targetAnimations.map((animation) => (
        animation.finished.catch(() => undefined)
      )));
      if (!settled) {
        settleAndClearTarget(targets[index], { deferEndpointCleanup: true });
      }
    }));
    if (!settled) finish();
    return true;
  };

  return {
    stage,
    play,
    cancel: (options) => finish(options),
    get targets() {
      return targets;
    },
    get totalMs() {
      return totalMs();
    },
  };
}

function collectExitElements(scopes) {
  const seen = new Set();
  const elements = [];
  asScopeElements(scopes).forEach((scope) => {
    const candidates = [
      ...(scope.matches?.(ENTRANCE_SELECTOR) ? [scope] : []),
      ...Array.from(scope.querySelectorAll?.(ENTRANCE_SELECTOR) || []),
    ];
    candidates.forEach((element) => {
      if (!element || seen.has(element)) return;
      seen.add(element);
      elements.push(element);
      const rule = element.dataset.routeEnterVariant === 'bookend-title'
        ? element.closest?.(LOCKUP_SELECTOR)?.querySelector?.(`:scope > ${LOCKUP_RULE_SELECTOR}`)
        : null;
      if (!rule || seen.has(rule)) return;
      seen.add(rule);
      elements.push(rule);
    });
  });
  return elements;
}

/**
 * Creates the shared, deliberately quiet route-out typography motion.
 * Material exits are owned by route participants; this function only removes
 * marked copy and controls so wall content never jumps beneath the cover.
 */
export function createExitSequence({
  scopes = document,
  reducedMotion = prefersReducedMotion(),
  onAnimation,
} = {}) {
  const config = getShellRouteTransitionConfig();
  const durationMs = reducedMotion ? 0 : config.typographyExitDurationMs;
  const totalStaggerMs = reducedMotion ? 0 : config.typographyExitStaggerMs;
  const elements = collectExitElements(scopes).reverse();
  let cancelled = false;
  let animations = [];

  const clearFallbackStyles = () => {
    elements.forEach((element) => {
      element.style.removeProperty('opacity');
      element.style.removeProperty('filter');
      element.style.removeProperty('transform');
    });
  };

  const cancel = ({ restore = true } = {}) => {
    cancelled = true;
    animations.forEach((animation) => {
      try {
        animation.cancel();
      } catch {
        /* The outgoing route may already be detached. */
      }
    });
    animations = [];
    if (restore) clearFallbackStyles();
  };

  const play = () => {
    if (cancelled || elements.length === 0) return Promise.resolve(false);
    const hasWaapi = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
    if (durationMs <= 0 || !hasWaapi) {
      elements.forEach((element) => {
        if (element.matches?.(LOCKUP_RULE_SELECTOR)) element.style.transform = 'scaleX(0)';
        else element.style.opacity = '0';
      });
      return Promise.resolve(true);
    }

    animations = elements.map((element, index) => {
      const delay = elements.length > 1
        ? (index / (elements.length - 1)) * totalStaggerMs
        : 0;
      const isRule = element.matches?.(LOCKUP_RULE_SELECTOR);
      const resolvedOpacity = Number.parseFloat(getComputedStyle(element).opacity);
      const startOpacity = Number.isFinite(resolvedOpacity) ? resolvedOpacity : 1;
      const keyframes = isRule
        ? [{ transform: 'scaleX(1)', opacity: 1 }, { transform: 'scaleX(0)', opacity: 0.6 }]
        : [
            { opacity: startOpacity, transform: 'translate3d(0, 0, 0)', filter: 'blur(0)' },
            { opacity: 0, transform: 'translate3d(0, -4px, 0)', filter: 'blur(0.75px)' },
          ];
      const animation = element.animate(keyframes, {
        duration: durationMs,
        delay,
        easing: 'cubic-bezier(0.4, 0, 1, 1)',
        fill: 'forwards',
      });
      onAnimation?.(animation);
      return animation;
    });
    return Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)))
      .then(() => !cancelled);
  };

  return Object.freeze({
    play,
    cancel,
    totalMs: durationMs + totalStaggerMs,
  });
}

export function resetEntranceTargets(scopes = document) {
  const targets = collectTargets(scopes, resolveProfile('route'), {
    trigger: 'route',
    sequenceSeed: 0,
  });
  targets.forEach((target) => {
    restoreTargetInert(target.element);
    clearTargetStyles(target);
  });
  if (targets.length > 0) void document.documentElement.offsetWidth;
}

export function clearHomeEntrancePhase(root = document.documentElement) {
  setHomePhase(root, '');
}
