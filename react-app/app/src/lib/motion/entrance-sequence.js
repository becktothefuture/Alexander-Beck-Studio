import { getShellRouteTransitionConfig } from '../../legacy/modules/visual/site-shell.js';
import { resolvePairKerningEm } from './glyph-kerning.js';

const ENTRANCE_SELECTOR = '[data-route-enter]';
const ENTRANCE_GLYPH_SELECTOR = '[data-route-enter-glyph]';
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
const entranceManagedInertTargets = new WeakSet();
const BOOKEND_TITLE_MOTION = Object.freeze({
  blurPx: 10,
  durationMs: 560,
  stepMs: 26,
  driftEm: -0.12,
  subtitleGapMs: 140,
});
const SEQUENCED_GROUPS = Object.freeze(['legend', 'context', 'action', 'footer', 'control']);
const DIRECT_FLOW_GROUPS = Object.freeze(['legend', 'context', 'action', 'footer']);
const GROUP_GAP_MS = 40;
let glyphPreparationGeneration = 0;
let glyphKerningContext = null;

const PROFILES = Object.freeze({
  direct: Object.freeze({
    easing: 'cubic-bezier(0.22, 0, 0.16, 1)',
    blurPx: 1.5,
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
    blurPx: 1.5,
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

function readFinalOpacity(element) {
  const explicit = Number.parseFloat(element.dataset.routeEnterOpacity || '');
  if (Number.isFinite(explicit)) return explicit;
  const computed = Number.parseFloat(getComputedStyle(element).opacity || '');
  return Number.isFinite(computed) && computed > 0.02 ? computed : 1;
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
 * Converts one title into stable word groups and individually animatable glyphs.
 * The title keeps its accessible name while visual children remain aria-hidden.
 */
export function prepareBookendTitleGlyphs(element) {
  if (!element) return [];
  const existingGlyphs = Array.from(element.querySelectorAll(ENTRANCE_GLYPH_SELECTOR));
  if (existingGlyphs.length > 0) {
    existingGlyphs.forEach((glyph, index) => glyph.style.setProperty('--route-enter-glyph-index', index));
    applyBookendTitleKerning(element);
    return existingGlyphs;
  }

  const text = String(element.dataset.routeEnterText || element.textContent || '').replace(/\u00a0/g, ' ');
  if (!text) return [];
  element.dataset.routeEnterText = text;
  glyphPreparationGeneration += 1;
  const titleRoot = element.closest?.('#hero-title') || element;
  titleRoot.dataset.routeEnterGlyphRevision = String(glyphPreparationGeneration);
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
  return glyphs;
}

function resolveProfile(name, timingMode = 'repeat') {
  if (name !== 'route') return PROFILES[name] || PROFILES.route;
  const config = getShellRouteTransitionConfig();
  const reduced = timingMode === 'reduced';
  const timingScale = timingMode === 'repeat' ? config.repeatTimingScale : 1;
  const staggerScale = timingMode === 'repeat' ? config.repeatStaggerScale : 1;
  const duration = (value) => reduced ? 120 : Math.round(value * timingScale);
  const step = reduced ? 0 : Math.round(config.itemStepMs * staggerScale);
  return {
    ...PROFILES.route,
    compactFlow: true,
    identityLineStepMs: reduced ? 0 : Math.round(50 * staggerScale),
    contextGapMs: reduced ? 0 : Math.round(40 * timingScale),
    actionGapMs: reduced ? 0 : Math.round(60 * timingScale),
    footerStepMs: reduced ? 0 : Math.round(20 * staggerScale),
    blurPx: reduced ? 0 : PROFILES.route.blurPx,
    bookendTitle: {
      ...PROFILES.route.bookendTitle,
      blurPx: reduced ? 0 : config.routeBookendBlurPx,
      durationMs: reduced ? 120 : duration(config.routeBookendDurationMs),
      stepMs: reduced ? 0 : Math.round(config.routeBookendStepMs * staggerScale),
      driftEm: reduced ? 0 : config.routeBookendDriftEm,
    },
    groups: {
      identity: { ...PROFILES.route.groups.identity, stepMs: step, durationMs: duration(config.supportDurationMs) },
      legend: { ...PROFILES.route.groups.legend, stepMs: step, durationMs: duration(config.supportDurationMs) },
      context: { ...PROFILES.route.groups.context, stepMs: step, durationMs: duration(config.contextDurationMs) },
      action: { ...PROFILES.route.groups.action, stepMs: step, durationMs: duration(config.actionDurationMs) },
      footer: { ...PROFILES.route.groups.footer, stepMs: step, durationMs: duration(config.supportDurationMs) },
      control: { ...PROFILES.route.groups.control, stepMs: 0, durationMs: duration(config.supportDurationMs) },
    },
  };
}

function readGroup(profile, name) {
  return profile.groups[name] || profile.groups.context;
}

function getTargetEndMs(target) {
  if (target.variant !== 'bookend-title') return target.delayMs + target.durationMs;
  return target.delayMs
    + target.durationMs
    + (Math.max(0, target.glyphs.length - 1) * target.letterStepMs);
}

function sequenceTargets(targets, profile) {
  const identityTargets = targets
    .filter((target) => target.groupName === 'identity')
    .sort((left, right) => left.order - right.order);
  if (identityTargets.length === 0) return targets;

  const identityStartMs = readGroup(profile, 'identity').startMs;
  if (profile.compactFlow) {
    identityTargets.forEach((target, index) => {
      target.delayMs = identityStartMs + (index * profile.identityLineStepMs);
    });
    const identityEndMs = Math.max(...identityTargets.map(getTargetEndMs));
    const contextStartMs = identityEndMs + profile.contextGapMs;
    const starts = {
      legend: contextStartMs,
      context: contextStartMs,
      action: contextStartMs + profile.actionGapMs,
      footer: contextStartMs + profile.actionGapMs + profile.footerStepMs,
      control: contextStartMs + profile.actionGapMs + profile.footerStepMs + readGroup(profile, 'control').stepMs,
    };
    SEQUENCED_GROUPS.forEach((groupName) => {
      const group = readGroup(profile, groupName);
      const groupTargets = targets
        .filter((target) => target.groupName === groupName)
        .sort((left, right) => left.order - right.order);
      groupTargets.forEach((target) => {
        const groupStep = groupName === 'footer'
          ? profile.footerStepMs
          : group.stepMs;
        target.delayMs = starts[groupName] + (groupStep * target.order);
      });
    });
    return targets.sort((left, right) => (
      left.delayMs - right.delayMs
      || left.groupName.localeCompare(right.groupName)
      || left.order - right.order
    ));
  }

  const identityTitles = identityTargets.filter((target) => target.variant === 'bookend-title');
  if (identityTitles.length === 0) return targets;
  let glyphOffset = 0;
  identityTitles.forEach((target) => {
    target.delayMs = identityStartMs + (glyphOffset * target.letterStepMs);
    glyphOffset += target.glyphs.length;
  });

  let cursorMs = Math.max(...identityTitles.map(getTargetEndMs)) + profile.bookendTitle.subtitleGapMs;
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
      .filter((target) => target.groupName === groupName)
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

function collectTargets(scopes, profile) {
  const groupCounts = new Map();
  const seen = new Set();
  const targets = [];

  asScopeElements(scopes).forEach((scope) => {
    const elements = [
      ...(scope.matches?.(ENTRANCE_SELECTOR) ? [scope] : []),
      ...Array.from(scope.querySelectorAll?.(ENTRANCE_SELECTOR) || []),
    ];

    elements.forEach((element) => {
      if (seen.has(element)) return;
      seen.add(element);
      const groupName = element.dataset.routeEnter || 'context';
      const fallbackOrder = groupCounts.get(groupName) || 0;
      const order = readOrder(element, fallbackOrder);
      const variant = element.dataset.routeEnterVariant || 'default';
      const isBookendTitle = variant === 'bookend-title';
      const glyphs = isBookendTitle ? prepareBookendTitleGlyphs(element) : [];
      groupCounts.set(groupName, Math.max(fallbackOrder + 1, order + 1));
      const group = readGroup(profile, groupName);
      targets.push({
        element,
        groupName,
        order,
        delayMs: group.startMs + (group.stepMs * order),
        durationMs: isBookendTitle
          ? profile.bookendTitle.durationMs
          : group.durationMs,
        blurPx: isBookendTitle ? profile.bookendTitle.blurPx : profile.blurPx,
        letterStepMs: isBookendTitle ? profile.bookendTitle.stepMs : 0,
        driftEm: isBookendTitle ? profile.bookendTitle.driftEm : 0,
        glyphs,
        variant,
        finalOpacity: readFinalOpacity(element),
      });
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

function clearTargetStyles(target) {
  const { element } = target;
  const generation = (styleCleanupGeneration.get(element) || 0) + 1;
  styleCleanupGeneration.set(element, generation);
  // Keep transitions disabled through the first settled paint. Several targets
  // have hover transitions in their component CSS; removing the inline opacity
  // and `transition: none` together would accidentally animate that cleanup.
  element.style.transition = 'none';
  element.style.removeProperty('opacity');
  element.style.removeProperty('filter');
  element.style.removeProperty('pointer-events');
  element.style.removeProperty('will-change');
  target.glyphs.forEach((glyph) => {
    glyph.style.removeProperty('opacity');
    glyph.style.removeProperty('filter');
    glyph.style.removeProperty('transform');
    glyph.style.removeProperty('transition');
    glyph.style.removeProperty('will-change');
    settleGlyphEntranceState(glyph);
  });
  window.requestAnimationFrame(() => {
    if (styleCleanupGeneration.get(element) !== generation) return;
    element.style.removeProperty('transition');
    element.style.removeProperty('transition-delay');
  });
}

function restoreTargetInert(element) {
  if (!entranceManagedInertTargets.has(element)) return;
  element.inert = false;
  entranceManagedInertTargets.delete(element);
}

function settleTarget(target) {
  if (target.variant === 'bookend-title') {
    target.element.style.opacity = '1';
    target.element.style.filter = 'none';
    target.glyphs.forEach((glyph) => {
      glyph.style.opacity = String(target.finalOpacity);
      glyph.style.filter = 'blur(0)';
      glyph.style.transform = 'translate3d(0, 0, 0)';
      settleGlyphEntranceState(glyph);
    });
  } else {
    target.element.style.opacity = String(target.finalOpacity);
    target.element.style.filter = 'blur(0)';
  }
  target.element.style.pointerEvents = '';
  restoreTargetInert(target.element);
}

function stageTarget(target, blurPx) {
  styleCleanupGeneration.set(
    target.element,
    (styleCleanupGeneration.get(target.element) || 0) + 1,
  );
  target.element.style.transition = 'none';
  target.element.style.transitionDelay = `${target.delayMs}ms`;
  if (target.variant === 'bookend-title') {
    target.element.style.opacity = '1';
    target.element.style.filter = 'none';
    target.glyphs.forEach((glyph, glyphIndex) => {
      const rect = glyph.getBoundingClientRect();
      glyph.__absRouteEntranceState = {
        phase: 'staged',
        settled: false,
        startedAt: 0,
        delayMs: target.delayMs + (glyphIndex * target.letterStepMs),
        durationMs: target.durationMs,
        blurPx,
        driftEm: target.driftEm,
        finalOpacity: target.finalOpacity,
        finalRect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
      };
      glyph.style.transition = 'none';
      glyph.style.opacity = '0';
      glyph.style.filter = `blur(${blurPx}px)`;
      glyph.style.transform = `translate3d(${target.driftEm}em, 0, 0)`;
      glyph.style.willChange = 'opacity, filter, transform';
    });
  } else {
    target.element.style.opacity = '0';
    target.element.style.filter = `blur(${blurPx}px)`;
  }
  target.element.style.pointerEvents = 'none';
  target.element.style.willChange = target.variant === 'bookend-title'
    ? 'auto'
    : 'opacity, filter';
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
 * final geometry while this runner owns opacity and filter. Bookend titles use
 * the same non-clipping reveal so serif ascenders and descenders remain intact.
 * This separation prevents centering, responsive placement, and motion from
 * overwriting one another on WebKit and other composited browsers.
 */
export function createEntranceSequence({
  scopes = document,
  profile: profileName = 'route',
  timingMode = 'repeat',
  diagnosticRoot = null,
  reducedMotion = prefersReducedMotion(),
  onAnimation,
} = {}) {
  const profile = resolveProfile(profileName, timingMode);
  let targets = collectTargets(scopes, profile);
  let animations = [];
  let staged = false;
  let settled = false;

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

  const finish = ({ clearPhase = false } = {}) => {
    if (settled) return;
    settled = true;
    if (diagnosticRoot) setHomePhase(diagnosticRoot, clearPhase ? '' : 'complete');
    targets.forEach(settleTarget);
    animations.forEach((animation) => {
      try {
        animation.cancel();
      } catch {
        /* The animation may already have been detached with its route. */
      }
    });
    animations = [];
    targets.forEach(clearTargetStyles);
    // Commit every target at its CSS endpoint before component-level hover
    // transitions are restored on the next frame. One shared read avoids a
    // layout flush per target and prevents a cleanup fade in reduced motion.
    void document.documentElement.offsetWidth;
  };

  const play = async () => {
    if (settled) return false;
    if (!staged) stage();

    // Include controls or runtime-owned footer elements mounted while the cover
    // was still visible, then give the hidden state one paint before revealing.
    const known = new Set(targets.map((target) => target.element));
    collectTargets(scopes, profile).forEach((target) => {
      if (known.has(target.element)) return;
      targets.push(target);
      stageTarget(target, reducedMotion ? 0 : target.blurPx);
    });
    targets = sequenceTargets(targets, profile);

    if (reducedMotion || targets.length === 0 || typeof Element.prototype.animate !== 'function') {
      finish();
      return true;
    }

    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    if (settled) return false;
    if (diagnosticRoot) setHomePhase(diagnosticRoot, 'enter');

    animations = targets.flatMap((target) => {
      if (target.variant === 'bookend-title') {
        const startedAt = performance.now();
        return target.glyphs.map((glyph, glyphIndex) => {
          const delayMs = target.delayMs + (glyphIndex * target.letterStepMs);
          if (glyph.__absRouteEntranceState) {
            Object.assign(glyph.__absRouteEntranceState, {
              phase: 'playing',
              settled: false,
              startedAt,
              delayMs,
            });
          }
          const animation = glyph.animate(
            [
              {
                opacity: 0,
                filter: `blur(${target.blurPx}px)`,
                transform: `translate3d(${target.driftEm}em, 0, 0)`,
              },
              {
                opacity: target.finalOpacity,
                filter: 'blur(0)',
                transform: 'translate3d(0, 0, 0)',
              },
            ],
            {
              duration: target.durationMs,
              delay: delayMs,
              easing: profile.easing,
              fill: 'both',
            },
          );
          onAnimation?.(animation);
          return animation;
        });
      }
      const keyframes = [
        { opacity: 0, filter: `blur(${target.blurPx}px)` },
        { opacity: target.finalOpacity, filter: 'blur(0)' },
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

    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
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

export function resetEntranceTargets(scopes = document) {
  const targets = collectTargets(scopes, PROFILES.route);
  targets.forEach((target) => {
    restoreTargetInert(target.element);
    clearTargetStyles(target);
  });
  if (targets.length > 0) void document.documentElement.offsetWidth;
}

export function clearHomeEntrancePhase(root = document.documentElement) {
  setHomePhase(root, '');
}
