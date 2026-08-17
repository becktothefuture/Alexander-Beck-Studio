import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  createSmoothScroll,
  createSmoothScrollMediaQueries,
  shouldUseNativeSmoothScroll,
} from '../../lib/smooth-scroll.js';
import { createScrollSoundController } from '../../legacy/modules/audio/scroll-sound-controller.js';
import {
  createEntranceSequence,
  measureBookendTitleGlyphLines,
  prepareBookendTitleGlyphs,
} from '../../lib/motion/entrance-sequence.js';
import {
  SCROLL_PROGRESS_INDICATOR_ACTIVE_TICK_COUNT,
  SCROLL_PROGRESS_INDICATOR_TICK_COUNT,
} from '../../lib/scroll-progress-indicator.js';
import { remapAboutNarrativeScrollTop } from './aboutNarrativeProfileResolver.js';
import {
  compileAboutNarrativeComposerPlan,
  createAboutNarrativeComposerContextSample,
  createAboutNarrativeComposerFrameSample,
  createAboutNarrativeComposerTitleSample,
  getAboutNarrativeComposerEditorialFocusOpacity,
  getAboutNarrativeComposerEditorialPhraseOpacity,
  getAboutNarrativeComposerEditorialReveal,
  getAboutNarrativeComposerEditorialViewportY,
  getAboutNarrativeComposerOpeningCueOpacity,
  getAboutNarrativeComposerPreparationRequest,
  sampleAboutNarrativeComposerContextInto,
  sampleAboutNarrativeComposerPlanInto,
  sampleAboutNarrativeComposerTitleInto,
} from './aboutNarrativeComposer.js';
import {
  getAboutNarrativeReadingOrderRevealMetrics,
} from './aboutNarrativeReveal.js';
import {
  advanceAboutNarrativeFinaleOrbitWU,
  getAboutNarrativeFinaleOverflowPixels,
  getAboutNarrativeFinaleScrollDeltaWU,
} from './aboutNarrativeFinaleOrbit.js';

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smoothstep = (value) => {
  const progress = clamp01(value);
  return progress * progress * (3 - (2 * progress));
};
const FINALE_EPSILON = 0.000001;
const ABOUT_TITLE_DRAW_SELECTOR = '[data-about-title-draw]';
const ABOUT_TITLE_DRAW_TARGET_DEFAULTS = Object.freeze({
  trigger: 'about-title',
  groupName: 'identity',
  order: 0,
  variant: 'bookend-title',
});

function applyAboutTitleLineExit(drawNode, field, storyWU, textMotion, reducedMotion) {
  if (!drawNode) return;
  const glyphs = Array.from(drawNode.querySelectorAll('[data-route-enter-glyph]'));
  if (glyphs.length === 0) return;
  if (field.preset === 'opener-v1') {
    // The opening lockup owns one shared exit through --fragment-opacity and
    // --fragment-* transforms. Keep its title glyphs solid so the title, rule,
    // and description never split into different exit gestures.
    glyphs.forEach((glyph) => { glyph.style.opacity = '1'; });
    return;
  }
  if (field.preset === 'finale-v1' || field.presentation?.layout === 'text-finale-cta') {
    glyphs.forEach((glyph) => { glyph.style.opacity = '1'; });
    return;
  }
  const durationWU = Math.max(0.000001, Number(field.endWU) - Number(field.startWU));
  const fieldProgress = clamp01((Number(storyWU) - Number(field.startWU)) / durationWU);
  const readableEnd = clamp01(Number(textMotion.titleExitStart ?? textMotion.readableEnd ?? 0.76));
  const exitProgress = reducedMotion
    ? 0
    : clamp01((fieldProgress - readableEnd) / Math.max(0.000001, 1 - readableEnd));
  const fadedOpacity = clamp01(Number(textMotion.titleExitOpacity ?? 0.2));
  const lineStagger = clamp01(Number(textMotion.titleExitLineStagger ?? 0.16));
  const lineCount = Math.max(1, Number(drawNode.dataset.routeEnterLineCount || 1));
  const staggeredSpan = 1 + (Math.max(0, lineCount - 1) * lineStagger);
  glyphs.forEach((glyph) => {
    const lineIndex = Math.max(0, Number(glyph.dataset.routeEnterLineIndex || 0));
    const lineProgress = smoothstep((exitProgress * staggeredSpan) - (lineIndex * lineStagger));
    glyph.style.opacity = String(1 + ((fadedOpacity - 1) * lineProgress));
  });
}
// Periodically restart only the audio distance clock. The visible phase is
// already wrapped per revolution; this keeps even an extremely long session
// away from floating-point growth without changing the orbit.
const FINALE_SOUND_WRAP_WU = 1_024;
const EMPTY_MEASUREMENTS = Object.freeze({
  dirty: true,
  viewportHeight: 0,
  editorialFields: [],
  editorialLines: [],
  editorialStacks: [],
  titleFields: [],
  contextFields: [],
});

export const ABOUT_SCROLL_INDICATOR_TICK_COUNT = SCROLL_PROGRESS_INDICATOR_TICK_COUNT;
export const ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT = SCROLL_PROGRESS_INDICATOR_ACTIVE_TICK_COUNT;
const ABOUT_SCROLL_INDICATOR_MAX_START_INDEX = Math.max(
  0,
  ABOUT_SCROLL_INDICATOR_TICK_COUNT - ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT,
);

export const getAboutNarrativeOpeningScrollCueOpacity = getAboutNarrativeComposerOpeningCueOpacity;

function getPreviewOptions(editorStore) {
  const previewState = editorStore?.getSnapshot?.()?.previewState;
  return {
    previewLayoutProfile: previewState?.layoutProfile,
    previewMotionProfile: previewState?.motionProfile,
  };
}

function createInitialPlan(document, editorStore) {
  const canReadViewport = typeof window !== 'undefined';
  return compileAboutNarrativeComposerPlan(document, {
    inlineSize: canReadViewport ? window.innerWidth : undefined,
    blockSize: canReadViewport ? window.innerHeight : undefined,
    ...getPreviewOptions(editorStore),
  });
}

function getTransport(editorStore) {
  return editorStore?.getSnapshot?.()?.transport || null;
}

function getPlaybackDocument(documentRef, editorStore) {
  return editorStore?.getSnapshot?.()?.document || documentRef.current;
}

function isFieldActive(field, storyWU, durationWU) {
  if (storyWU < Number(field.startWU)) return false;
  if (storyWU < Number(field.endWU)) return true;
  return Math.abs(storyWU - durationWU) <= 0.000001
    && Math.abs(Number(field.endWU) - durationWU) <= 0.000001;
}

export const getAboutNarrativeEditorialReveal = getAboutNarrativeComposerEditorialReveal;

export function useAboutNarrativeTimeline({
  document,
  editorStore = null,
  finaleContinuation = false,
  solidTitles = false,
  rootRef,
  worldRuntimeRef,
  scrollportRef,
  contentRef,
  playScrollDetent = null,
}) {
  const [initialPlan] = useState(() => createInitialPlan(document, editorStore));
  const [runtimePlan, setRuntimePlan] = useState(initialPlan);
  const [storyWU, setStoryWU] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [activeIndicatorStartIndex, setActiveIndicatorStartIndex] = useState(0);
  const storyWURef = useRef(0);
  const storyProgressRef = useRef(0);
  const activeIndicatorStartIndexRef = useRef(0);
  const documentRef = useRef(document);
  const planRef = useRef(initialPlan);
  const frameSampleRef = useRef(null);
  const frameSampleOptionsRef = useRef(null);
  const titleSampleByIdRef = useRef(new Map());
  const measurementsRef = useRef({ ...EMPTY_MEASUREMENTS });
  const requestMeasureRef = useRef(() => {});
  if (frameSampleRef.current == null) frameSampleRef.current = createAboutNarrativeComposerFrameSample();
  if (frameSampleOptionsRef.current == null) {
    frameSampleOptionsRef.current = {};
  }

  useLayoutEffect(() => {
    documentRef.current = document;
    measurementsRef.current.dirty = true;
    requestMeasureRef.current();
  }, [document]);

  useEffect(() => {
    const root = rootRef.current;
    const scrollport = scrollportRef.current;
    const content = contentRef.current;
    if (!root || !scrollport || !content) return undefined;

    const { reducedMotionQuery, nativeScrollQuery } = createSmoothScrollMediaQueries();
    let lenis = null;
    let raf = 0;
    let previousTime = performance.now();
    let lastReactPublish = 0;
    let lastTransportPublish = 0;
    let playbackWU = 0;
    let previousTransportOwner = 'scroll';
    let measureTimer = 0;
    let preparationTimer = 0;
    let preparationRetryCount = 0;
    let lastPreparationIdentity = '';
    let installedDocument = null;
    let installedProfileKey = '';
    let installedStoryLayoutSignature = '';
    let lastDiagnosticKey = '';
    let lastOpeningScrollCueOpacity = -1;
    let lastOpeningScrollCueState = '';
    let finaleOrbitWU = 0;
    let finaleOrbitSoundWU = 0;
    let previousTouchY = null;
    let activeTitleEntrance = null;
    let activeTitleEntranceKey = '';
    let activeTitleEntranceNode = null;
    let activeTitleEntranceReduced = false;
    let disposed = false;
    const scrollSoundController = createScrollSoundController({
      playDetent: playScrollDetent,
      source: 'about-scroll',
    });
    let lastStoreDocument = editorStore?.getSnapshot?.()?.document || null;
    let lastStorePreviewKey = JSON.stringify(editorStore?.getSnapshot?.()?.previewState || null);

    const getCurrentStoryWU = () => {
      const transport = getTransport(editorStore);
      if (transport && transport.owner !== 'scroll') return Number(transport.storyWU) || 0;
      const viewportHeight = Math.max(1, measurementsRef.current.viewportHeight || scrollport.clientHeight);
      const scrollWU = scrollport.scrollTop / viewportHeight;
      return planRef.current?.resolver?.storyWUFromScrollWU(scrollWU) || 0;
    };

    const setScrollFromStoryWU = (nextStoryWU, viewportHeight = scrollport.clientHeight) => {
      const resolver = planRef.current?.resolver;
      if (!resolver) return;
      scrollport.scrollTop = resolver.scrollWUFromStoryWU(nextStoryWU) * Math.max(1, viewportHeight);
    };

    const publishFinaleOrbitWU = (nextWU) => {
      finaleOrbitWU = Number(nextWU) || 0;
      frameSampleOptionsRef.current.finaleOrbitWU = finaleOrbitWU;
      root.dataset.finaleOrbitWu = finaleOrbitWU.toFixed(6);
      root.dataset.finaleOrbitActive = Math.abs(finaleOrbitWU) > FINALE_EPSILON
        ? 'true'
        : 'false';
    };

    const getFinaleContinuation = (plan = planRef.current) => {
      if (plan?.camera?.orbit) return plan.camera.orbit;
      if (!finaleContinuation || !plan) return null;
      // V2 continues its outgoing material current after the physical page
      // ends. Reusing the bounded finale accumulator keeps trackpad, wheel,
      // touch, and keyboard input fluid without reintroducing camera orbit.
      return {
        startWU: Math.max(0, Number(plan.durationWU) - 1),
        endWU: Number(plan.durationWU),
        arcDegrees: 360,
      };
    };

    const resetFinaleOrbit = () => {
      const hadSoundTravel = finaleOrbitSoundWU > FINALE_EPSILON;
      if (Math.abs(finaleOrbitWU) <= FINALE_EPSILON
        && !hadSoundTravel) return;
      finaleOrbitSoundWU = 0;
      if (hadSoundTravel) scrollSoundController.reset();
      publishFinaleOrbitWU(0);
    };

    const advanceFinaleOrbitFromScroll = (
      deltaY,
      deltaMode = 0,
      targetScrollTop = scrollport.scrollTop,
    ) => {
      // Upward input remains ordinary page navigation. The retained angular
      // offset fades out through the authored orbit as the visitor scrolls
      // back, so leaving the finale never requires unwinding every turn.
      const plan = planRef.current;
      const continuation = getFinaleContinuation(plan);
      if (!(Number(deltaY) > 0) || !continuation || plan.reducedMotion) return 0;
      const maximumScrollTop = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
      const overflowPixels = getAboutNarrativeFinaleOverflowPixels({
        deltaY,
        deltaMode,
        viewportHeight: scrollport.clientHeight,
        scrollTop: scrollport.scrollTop,
        targetScrollTop,
        maximumScrollTop,
      });
      if (overflowPixels <= FINALE_EPSILON) return 0;
      const deltaWU = getAboutNarrativeFinaleScrollDeltaWU({
        deltaY: overflowPixels,
        deltaMode: 0,
        viewportHeight: scrollport.clientHeight,
        storyPerScrollWU: plan.resolver.storyPerScrollWU,
      });
      finaleOrbitSoundWU += deltaWU;
      if (finaleOrbitSoundWU >= FINALE_SOUND_WRAP_WU) {
        finaleOrbitSoundWU = 0;
        scrollSoundController.reset();
      }
      publishFinaleOrbitWU(advanceAboutNarrativeFinaleOrbitWU(
        finaleOrbitWU,
        deltaWU,
        continuation,
      ));
      const virtualScrollTop = maximumScrollTop
        + (finaleOrbitSoundWU * Math.max(1, scrollport.clientHeight));
      scrollSoundController.samplePosition(0, virtualScrollTop, performance.now());
      return overflowPixels;
    };

    const handoffPreparation = (nextStoryWU, { force = false } = {}) => {
      const request = getAboutNarrativeComposerPreparationRequest(planRef.current, nextStoryWU);
      const runtime = worldRuntimeRef.current;
      if (!request || typeof runtime?.preparePlan !== 'function') return false;
      const identity = `${request.sequenceKey}:${request.targetWorldId}`;
      if (!force && identity === lastPreparationIdentity) return false;
      runtime.preparePlan(request);
      lastPreparationIdentity = identity;
      return true;
    };

    const schedulePreparationHandoff = (nextStoryWU = getCurrentStoryWU(), options) => {
      window.clearTimeout(preparationTimer);
      preparationTimer = window.setTimeout(() => {
        preparationTimer = 0;
        if (handoffPreparation(nextStoryWU, options)) {
          preparationRetryCount = 0;
          return;
        }
        if (!disposed && preparationRetryCount < 20 && !lastPreparationIdentity) {
          preparationRetryCount += 1;
          schedulePreparationHandoff(nextStoryWU, options);
        }
      }, preparationRetryCount ? 50 : 0);
    };

    const rebuildLenis = () => {
      lenis?.destroy();
      lenis = null;
      const transport = getTransport(editorStore);
      if (transport && transport.owner !== 'scroll') return;
      if (planRef.current?.motionProfile === 'reduced') return;
      if (shouldUseNativeSmoothScroll({ reducedMotionQuery, nativeScrollQuery })) return;
      lenis = createSmoothScroll({
        wrapper: scrollport,
        content,
        smoothing: planRef.current?.model?.globals?.scrollSmoothing
          ?? documentRef.current.globals.scrollSmoothing,
        virtualScroll: (input) => {
          // Lenis exposes the destination before the rendered scroll catches
          // up. Split the same uninterrupted gesture at that destination so
          // its remainder drives the bust instead of being lost at the clamp.
          const overflowPixels = advanceFinaleOrbitFromScroll(
            input.deltaY,
            0,
            lenis?.targetScroll,
          );
          if (overflowPixels <= FINALE_EPSILON) return true;
          input.deltaY = Math.max(0, input.deltaY - overflowPixels);
          input.event.preventDefault();
          return input.deltaY > FINALE_EPSILON;
        },
      });
    };

    const collectContentPressure = (viewportHeight) => {
      const pressure = {};
      const editorialFieldHeights = new Map();
      const editorialRevealMetrics = new Map();
      content.querySelectorAll('[data-text-field-id]').forEach((node) => {
        const fieldId = node.dataset.textFieldId;
        if (!fieldId) return;
        const measuredHeightPx = Math.max(node.scrollHeight, node.getBoundingClientRect().height);
        const previous = pressure[fieldId]?.measuredHeightPx || 0;
        pressure[fieldId] = {
          measuredHeightPx: Math.max(previous, measuredHeightPx),
          viewportHeightPx: viewportHeight,
        };
        if (node.closest('.about-narrative-render-span--editorial')) {
          editorialFieldHeights.set(fieldId, measuredHeightPx);
        }
        const editorialNodes = node.matches('[data-editorial-reveal]')
          ? [node]
          : Array.from(node.querySelectorAll('[data-editorial-reveal]'));
        const fieldRect = node.getBoundingClientRect();
        const revealMetrics = getAboutNarrativeReadingOrderRevealMetrics(editorialNodes.map((editorialNode) => {
          const rect = editorialNode.getBoundingClientRect();
          return {
            atomic: editorialNode.dataset.editorialAtomicRow === 'true',
            top: rect.top - fieldRect.top,
            height: rect.height,
          };
        }));
        editorialNodes.forEach((editorialNode, index) => {
          editorialRevealMetrics.set(editorialNode, revealMetrics[index]);
        });
      });
      measurementsRef.current.editorialFieldHeights = editorialFieldHeights;
      measurementsRef.current.editorialRevealMetrics = editorialRevealMetrics;
      return pressure;
    };

    const cacheSemanticNodes = (plan) => {
      const fieldsById = new Map(plan.textFields.map((field) => [field.id, field]));
      const spansByFieldId = new Map(plan.renderSpans.flatMap((span) => (
        span.fieldIds.map((fieldId) => [fieldId, span])
      )));
      const editorialNodes = Array.from(content.querySelectorAll('[data-editorial-reveal]'));
      const editorialFields = plan.textFields.flatMap((field) => {
        if (field.kind !== 'scroll-block') return [];
        const span = spansByFieldId.get(field.id);
        if (!span) return [];
        return [{
          startScrollWU: Number(span.scrollBounds.startWU),
          measuredHeightPx: Number(
            measurementsRef.current.editorialFieldHeights?.get(field.id) || 0,
          ),
        }];
      });
      const editorialLines = editorialNodes.flatMap((node) => {
        const fieldId = node.closest('[data-text-field-id]')?.dataset.textFieldId;
        const field = fieldsById.get(fieldId);
        const span = spansByFieldId.get(fieldId);
        const isEditorialField = field?.kind === 'scroll-block'
          || (field?.kind === 'title' && field.movement === 'vertical');
        if (!isEditorialField || !span) return [];
        const revealMetrics = measurementsRef.current.editorialRevealMetrics?.get(node);
        return [{
          node,
          editorialMotion: plan.model.globals.editorialMotion,
          startScrollWU: Number(span.scrollBounds.startWU),
          revealOffsetPx: Number(revealMetrics?.revealOffsetPx) || 0,
          revealSoftnessPx: Number(revealMetrics?.revealSoftnessPx) || 0,
          progress: 0,
          viewportY: 0,
        }];
      });
      const titleFields = [];
      const contextFields = [];
      content.querySelectorAll('[data-text-field-id]').forEach((node) => {
        const field = fieldsById.get(node.dataset.textFieldId);
        if (!field) return;
        if (field.kind === 'title' && field.movement === 'spatial') {
          let sample = titleSampleByIdRef.current.get(field.id);
          if (!sample) {
            sample = createAboutNarrativeComposerTitleSample();
            titleSampleByIdRef.current.set(field.id, sample);
          }
          const drawNode = solidTitles
            ? node.querySelector(ABOUT_TITLE_DRAW_SELECTOR)
            : null;
          if (drawNode) measureBookendTitleGlyphLines(drawNode);
          titleFields.push({
            node,
            field,
            sample,
            drawNode,
            drawKey: drawNode ? `${field.id}:${field.text}` : '',
          });
        }
        if (field.presentation?.layout === 'text-finale-cta'
          || field.presentation?.layout === 'text-bust-cta') {
          contextFields.push({ node, field, visible: null, sample: createAboutNarrativeComposerContextSample() });
        }
      });
      measurementsRef.current = {
        ...measurementsRef.current,
        dirty: false,
        editorialFields,
        editorialLines,
        titleFields,
        contextFields,
      };
    };

    const measure = () => {
      const viewportHeight = Math.max(1, scrollport.clientHeight);
      const viewportWidth = Math.max(1, scrollport.clientWidth);
      const previousViewportHeight = Math.max(
        1,
        measurementsRef.current.viewportHeight || viewportHeight,
      );
      const previousPlan = planRef.current;
      const transport = getTransport(editorStore);
      const sourceDocument = getPlaybackDocument(documentRef, editorStore);
      const contentPressure = collectContentPressure(viewportHeight);
      const candidate = compileAboutNarrativeComposerPlan(sourceDocument, {
        inlineSize: viewportWidth,
        blockSize: viewportHeight,
        prefersReducedMotion: reducedMotionQuery.matches,
        ...getPreviewOptions(editorStore),
        contentPressure,
      });

      root.style.setProperty('--narrative-viewport-height', `${viewportHeight}px`);
      measurementsRef.current = { ...measurementsRef.current, viewportHeight };
      if (!candidate.valid) {
        editorStore?.setRuntimePlan?.(candidate);
        measurementsRef.current.dirty = false;
        return;
      }

      const profileKey = `${candidate.layoutProfile}:${candidate.motionProfile}`;
      const storyLayoutSignature = String(candidate.storyLayout?.signature || '');
      const modelOrProfileChanged = sourceDocument !== installedDocument
        || profileKey !== installedProfileKey
        || storyLayoutSignature !== installedStoryLayoutSignature;
      const preservedStoryWU = transport && transport.owner !== 'scroll'
        ? Number(transport.storyWU) || 0
        : previousPlan?.resolver ? remapAboutNarrativeScrollTop({
          scrollTop: scrollport.scrollTop,
          previousViewportHeight,
          nextViewportHeight: viewportHeight,
          previousResolver: previousPlan.resolver,
          nextResolver: candidate.resolver,
        }).storyWU : candidate.resolver.storyWUFromScrollWU(
          scrollport.scrollTop / viewportHeight,
        );

      planRef.current = candidate;
      root.style.setProperty('--narrative-content-extent-wu', candidate.resolver.contentExtentWU);
      setScrollFromStoryWU(preservedStoryWU, viewportHeight);
      cacheSemanticNodes(candidate);

      const diagnosticKey = JSON.stringify(candidate.diagnostics);
      if (modelOrProfileChanged) {
        installedDocument = sourceDocument;
        installedProfileKey = profileKey;
        installedStoryLayoutSignature = storyLayoutSignature;
        setRuntimePlan(candidate);
        editorStore?.setRuntimePlan?.(candidate);
        schedulePreparationHandoff(preservedStoryWU, { force: true });
        rebuildLenis();
      } else if (diagnosticKey !== lastDiagnosticKey) {
        editorStore?.setRuntimePlan?.(candidate);
      }
      lastDiagnosticKey = diagnosticKey;
    };

    const scheduleMeasure = () => {
      if (disposed) return;
      measurementsRef.current.dirty = true;
      window.clearTimeout(measureTimer);
      measureTimer = window.setTimeout(() => {
        measureTimer = 0;
        if (measurementsRef.current.dirty) measure();
      }, 0);
    };
    requestMeasureRef.current = scheduleMeasure;

    const syncTitleEntrance = (titleField, reducedMotion, textMotion) => {
      const nextNode = titleField?.drawNode || null;
      const drawDurationMs = Math.max(0, Number(textMotion?.titleDrawDurationMs ?? 220));
      const drawColorCount = Math.max(1, Math.round(Number(textMotion?.titleColorCount ?? 5)));
      const drawLineStaggerMs = Math.max(0, Number(textMotion?.titleLineStaggerMs ?? 140));
      const nextKey = titleField?.drawKey
        ? `${titleField.drawKey}:${drawDurationMs}:${drawColorCount}:${drawLineStaggerMs}`
        : '';
      if (
        nextNode === activeTitleEntranceNode
        && nextKey === activeTitleEntranceKey
        && reducedMotion === activeTitleEntranceReduced
      ) return;

      activeTitleEntrance?.cancel();
      activeTitleEntrance = null;
      activeTitleEntranceNode = nextNode;
      activeTitleEntranceKey = nextKey;
      activeTitleEntranceReduced = reducedMotion;
      if (!nextNode) return;

      prepareBookendTitleGlyphs(nextNode);
      const drawLineCount = Math.max(
        1,
        Number(nextNode.dataset.routeEnterLineCount || 1),
      );
      const drawLineStepMs = drawLineCount > 1
        ? drawLineStaggerMs / Math.max(1, drawLineCount - 1)
        : 0;
      activeTitleEntrance = createEntranceSequence({
        scopes: nextNode,
        profile: 'route',
        timingMode: 'repeat',
        reducedMotion,
        trigger: 'about-title',
        targetSelector: ABOUT_TITLE_DRAW_SELECTOR,
        targetDefaults: {
          ...ABOUT_TITLE_DRAW_TARGET_DEFAULTS,
          durationMs: drawDurationMs,
          colorCount: drawColorCount,
          // About titles read as two quick line events, not a slow character
          // sweep. The shared route-title entrance keeps its authored glyph
          // stagger everywhere else. Treat the configured line value as one
          // total draw window so additional mobile wraps do not animate more
          // slowly than the same title on desktop.
          letterStepMs: 0,
          titleLineStepMs: drawLineStepMs,
        },
        bookendDelayMs: 0,
      });
      activeTitleEntrance.stage();
      void activeTitleEntrance.play();
    };

    const updateSemanticText = (frame) => {
      const reducedMotion = frame.reducedMotion;
      const textMotion = frame.globals.textMotion;
      let activeTitleField = null;
      for (const titleField of measurementsRef.current.titleFields) {
        const {
          node,
          field,
          sample,
          drawNode,
        } = titleField;
        sampleAboutNarrativeComposerTitleInto(field, frame.storyWU, textMotion, reducedMotion, sample);
        const fieldActive = isFieldActive(field, frame.storyWU, frame.durationWU);
        const usesUnitExit = field.preset === 'opener-v1';
        if (fieldActive && drawNode) activeTitleField = titleField;
        // V2 titles stay present for their Text moment. Their glyph lines own
        // the colour entrance and the controlled fade to the authored floor;
        // this parent gate prevents adjacent sticky moments from overlapping.
        const visible = solidTitles ? fieldActive : !reducedMotion || fieldActive;
        node.style.setProperty('--fragment-x', `${sample.x.toFixed(2)}px`);
        node.style.setProperty('--fragment-y', `${sample.y.toFixed(2)}px`);
        node.style.setProperty('--fragment-z', `${sample.z.toFixed(2)}px`);
        node.style.setProperty('--fragment-blur', `${sample.blur.toFixed(2)}px`);
        node.style.setProperty(
          '--fragment-opacity',
          visible
            ? ((solidTitles && !usesUnitExit) ? '1' : sample.opacity.toFixed(4))
            : '0',
        );
      }
      syncTitleEntrance(activeTitleField, reducedMotion, textMotion);
      for (const titleField of measurementsRef.current.titleFields) {
        if (!titleField.drawNode) continue;
        applyAboutTitleLineExit(
          titleField.drawNode,
          titleField.field,
          frame.storyWU,
          textMotion,
          reducedMotion,
        );
      }

      const viewportThreshold = frame.globals.editorialRevealThreshold;
      const viewportHeight = Math.max(1, measurementsRef.current.viewportHeight);
      const scrollWU = planRef.current.resolver.scrollWUFromStoryWU(frame.storyWU);
      const editorialInView = measurementsRef.current.editorialFields.some((record) => {
        const fieldTopWU = record.startScrollWU + viewportThreshold;
        const fieldBottomWU = fieldTopWU
          + (record.measuredHeightPx / viewportHeight);
        return fieldBottomWU > scrollWU && fieldTopWU < scrollWU + 1;
      });
      root.dataset.editorialInView = editorialInView ? 'true' : 'false';
      const editorialLines = measurementsRef.current.editorialLines;
      for (const record of editorialLines) {
        record.viewportY = getAboutNarrativeComposerEditorialViewportY(
          record,
          scrollWU,
          viewportHeight,
          viewportThreshold,
        );
        record.progress = getAboutNarrativeComposerEditorialReveal(
          record,
          scrollWU,
          viewportHeight,
          viewportThreshold,
          reducedMotion,
        );
      }
      for (const record of editorialLines) {
        const { node, progress, viewportY } = record;
        const focusOpacity = getAboutNarrativeComposerEditorialFocusOpacity(
          progress,
          viewportY,
          reducedMotion,
          textMotion.titleExitOpacity,
        );
        const phraseOpacity = getAboutNarrativeComposerEditorialPhraseOpacity(
          progress,
          reducedMotion,
        );
        node.style.setProperty('--editorial-reveal', progress.toFixed(4));
        node.style.setProperty('--editorial-focus-opacity', focusOpacity.toFixed(4));
        node.style.setProperty('--editorial-emphasis-opacity', phraseOpacity.toFixed(4));
      }

      for (const contextField of measurementsRef.current.contextFields) {
        const { node, field, sample } = contextField;
        sampleAboutNarrativeComposerContextInto(field, frame.storyWU, reducedMotion, sample);
        const contextVisible = sample.visible;
        if (contextField.visible !== contextVisible) {
          contextField.visible = contextVisible;
          node.dataset.contextVisible = contextVisible ? 'true' : 'false';
        }
        node.style.setProperty('--spatial-context-opacity', sample.titleOpacity.toFixed(4));
        node.style.setProperty('--route-title-rule-scale', sample.ruleScale.toFixed(4));
        node.style.setProperty('--spatial-description-opacity', sample.descriptionOpacity.toFixed(4));
        node.style.setProperty('--spatial-action-opacity', sample.actionOpacity.toFixed(4));
        node.style.setProperty('--spatial-context-y', `${sample.y.toFixed(2)}px`);
      }
    };

    const readTransport = (deltaSeconds) => {
      const transport = getTransport(editorStore);
      if (!transport || transport.owner === 'scroll') {
        previousTransportOwner = 'scroll';
        return getCurrentStoryWU();
      }
      lenis?.stop?.();
      if (transport.owner === 'playback' && transport.playing) {
        if (previousTransportOwner !== 'playback') playbackWU = Number(transport.storyWU) || 0;
        previousTransportOwner = 'playback';
        playbackWU += deltaSeconds * 0.42;
        if (transport.loop && playbackWU > transport.loop.endWU) playbackWU = transport.loop.startWU;
        else if (playbackWU >= planRef.current.durationWU) {
          playbackWU = planRef.current.durationWU;
          editorStore.setTransport({ playing: false, owner: 'timeline', storyWU: playbackWU });
        }
        setScrollFromStoryWU(playbackWU);
        return playbackWU;
      }
      previousTransportOwner = transport.owner;
      playbackWU = Number(transport.storyWU) || 0;
      setScrollFromStoryWU(playbackWU);
      return playbackWU;
    };

    const renderFrame = (time) => {
      lenis?.raf(time);
      const deltaSeconds = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      const nextStoryWU = readTransport(deltaSeconds);
      const continuation = getFinaleContinuation(planRef.current);
      // The smooth-scroll target can cross the physical page end before the
      // painted scroll position catches up. Preserve that gesture overflow
      // throughout the final authored screen; otherwise the frame loop clears
      // it and the visitor has to pause, then scroll again, to move the current.
      const continuationStartWU = Number(continuation?.startWU);
      const maximumScrollTop = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
      const smoothingTargetReachedEnd = Number(lenis?.targetScroll) >= maximumScrollTop - 1;
      const continuationGestureCommitted = finaleOrbitSoundWU > FINALE_EPSILON
        && (scrollport.scrollTop >= maximumScrollTop - 1 || smoothingTargetReachedEnd);
      if (!continuation || planRef.current.reducedMotion
        || (nextStoryWU < continuationStartWU - FINALE_EPSILON
          && !continuationGestureCommitted)) {
        resetFinaleOrbit();
      }
      const sampleOptions = frameSampleOptionsRef.current;
      const frame = sampleAboutNarrativeComposerPlanInto(
        planRef.current,
        nextStoryWU,
        frameSampleRef.current,
        sampleOptions,
      );

      if (frame) {
        const openingScrollCueOpacity = getAboutNarrativeOpeningScrollCueOpacity(
          scrollport.scrollTop,
          measurementsRef.current.viewportHeight || scrollport.clientHeight,
        );
        if (Math.abs(openingScrollCueOpacity - lastOpeningScrollCueOpacity) >= 0.001) {
          lastOpeningScrollCueOpacity = openingScrollCueOpacity;
          root.style.setProperty(
            '--about-opening-scroll-cue-opacity',
            openingScrollCueOpacity.toFixed(4),
          );
        }
        const openingScrollCueState = scrollport.scrollTop <= 0.5 ? 'visible' : 'hidden';
        if (openingScrollCueState !== lastOpeningScrollCueState) {
          lastOpeningScrollCueState = openingScrollCueState;
          root.dataset.openingScrollCue = openingScrollCueState;
        }
        const nextStoryProgress = frame.durationWU > 0
          ? clamp01(frame.storyWU / frame.durationWU)
          : 0;
        const nextIndicatorStartIndex = Math.round(
          nextStoryProgress * ABOUT_SCROLL_INDICATOR_MAX_START_INDEX,
        );
        if (nextIndicatorStartIndex !== activeIndicatorStartIndexRef.current) {
          activeIndicatorStartIndexRef.current = nextIndicatorStartIndex;
          setActiveIndicatorStartIndex(nextIndicatorStartIndex);
        }
        if (time - lastReactPublish >= 80
          || Math.abs(frame.storyWU - storyWURef.current) >= frame.durationWU) {
          storyWURef.current = frame.storyWU;
          storyProgressRef.current = nextStoryProgress;
          setStoryWU(frame.storyWU);
          setStoryProgress(nextStoryProgress);
          lastReactPublish = time;
        }
        root.dataset.activeNarrativeWorld = frame.world.to?.id || '';
        root.style.setProperty('--narrative-story-wu', frame.storyWU.toFixed(4));
        updateSemanticText(frame);
        worldRuntimeRef.current?.render(frame);
        if (editorStore && time - lastTransportPublish > 80) {
          const current = getTransport(editorStore);
          if (current?.owner === 'scroll') editorStore.setTransport({ storyWU: frame.storyWU });
          lastTransportPublish = time;
        }
      }
      raf = window.requestAnimationFrame(renderFrame);
    };

    const markDirty = () => { scheduleMeasure(); };
    const handleReducedMotionChange = () => { rebuildLenis(); markDirty(); };
    const handleNativeScrollChange = () => { rebuildLenis(); };
    const cancelPlayback = () => {
      const transport = getTransport(editorStore);
      if (!transport || transport.owner === 'scroll') return;
      const nextStoryWU = Number(transport.storyWU) || getCurrentStoryWU();
      setScrollFromStoryWU(nextStoryWU);
      editorStore.setTransport({ owner: 'scroll', playing: false, storyWU: nextStoryWU });
      rebuildLenis();
    };
    const handleWheel = (event) => {
      cancelPlayback();
      // Desktop wheel input is split inside Lenis, where its smoothed target
      // is available. Native-scroll profiles use the painted position here.
      if (lenis) return;
      const overflowPixels = advanceFinaleOrbitFromScroll(event.deltaY, event.deltaMode);
      if (overflowPixels <= FINALE_EPSILON) return;
      scrollport.scrollTop = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
      event.preventDefault();
    };
    const handleTouchStart = (event) => {
      cancelPlayback();
      previousTouchY = Number(event.touches?.[0]?.clientY);
    };
    const handleTouchMove = (event) => {
      const currentTouchY = Number(event.touches?.[0]?.clientY);
      if (!Number.isFinite(currentTouchY) || !Number.isFinite(previousTouchY)) return;
      const deltaY = previousTouchY - currentTouchY;
      previousTouchY = currentTouchY;
      const overflowPixels = advanceFinaleOrbitFromScroll(deltaY);
      if (overflowPixels <= FINALE_EPSILON) return;
      scrollport.scrollTop = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
      event.preventDefault();
    };
    const handleTouchEnd = () => { previousTouchY = null; };
    const handleFinaleKeyDown = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target !== scrollport) return;
      const keyDeltaPixels = {
        ArrowDown: 48,
        PageDown: scrollport.clientHeight * 0.9,
        ' ': scrollport.clientHeight * 0.9,
      }[event.key];
      if (keyDeltaPixels && advanceFinaleOrbitFromScroll(keyDeltaPixels) > FINALE_EPSILON) {
        scrollport.scrollTop = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
        event.preventDefault();
      }
    };
    const handleStoreChange = () => {
      const state = editorStore?.getSnapshot?.();
      if (!state) return;
      const nextPreviewKey = JSON.stringify(state.previewState || null);
      if (state.document !== lastStoreDocument || nextPreviewKey !== lastStorePreviewKey) {
        lastStoreDocument = state.document;
        lastStorePreviewKey = nextPreviewKey;
        markDirty();
      } else {
        schedulePreparationHandoff(Number(state.transport?.storyWU) || 0);
      }
      if (state.transport?.owner === 'scroll') {
        if (lenis) lenis.start?.();
        else rebuildLenis();
      }
    };
    const handleScrollPreparation = () => {
      schedulePreparationHandoff();
      const transport = getTransport(editorStore);
      if (transport && transport.owner !== 'scroll') {
        scrollSoundController.reset();
        return;
      }
      const maximumScrollTop = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
      const smoothingTargetReachedEnd = Number(lenis?.targetScroll) >= maximumScrollTop - 1;
      if (finaleOrbitSoundWU > FINALE_EPSILON
        && scrollport.scrollTop < maximumScrollTop - 1
        && !smoothingTargetReachedEnd) {
        // Rebase the synthetic finale sound coordinate before ordinary reverse
        // scrolling resumes. A forward smoothing target at the page end is
        // still the same uninterrupted gesture and must retain its overflow.
        finaleOrbitSoundWU = 0;
        scrollSoundController.reset();
      }
      scrollSoundController.samplePosition(0, scrollport.scrollTop, performance.now());
    };
    const handleEditorialLinesChange = () => scheduleMeasure();
    const handleVisibilityChange = () => {
      worldRuntimeRef.current?.setVisible?.(!window.document.hidden);
      if (!window.document.hidden) schedulePreparationHandoff(getCurrentStoryWU(), { force: true });
    };
    const handleRuntimeReady = () => schedulePreparationHandoff(getCurrentStoryWU(), { force: true });

    const resizeObserver = new ResizeObserver(markDirty);
    resizeObserver.observe(scrollport);
    resizeObserver.observe(content);
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    nativeScrollQuery.addEventListener('change', handleNativeScrollChange);
    scrollport.addEventListener('wheel', handleWheel, { passive: false });
    scrollport.addEventListener('touchstart', handleTouchStart, { passive: true });
    scrollport.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollport.addEventListener('touchend', handleTouchEnd, { passive: true });
    scrollport.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    scrollport.addEventListener('keydown', handleFinaleKeyDown);
    scrollport.addEventListener('scroll', handleScrollPreparation, { passive: true });
    content.addEventListener('about:editorial-lines-change', handleEditorialLinesChange);
    window.document.addEventListener('visibilitychange', handleVisibilityChange);
    root.addEventListener('about:world-runtime-ready', handleRuntimeReady);
    const unsubscribe = editorStore?.subscribe?.(handleStoreChange);
    window.document.fonts?.ready?.then(markDirty).catch(() => {});
    measure();
    rebuildLenis();
    raf = window.requestAnimationFrame(renderFrame);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(measureTimer);
      window.clearTimeout(preparationTimer);
      lenis?.destroy();
      scrollSoundController.reset();
      activeTitleEntrance?.cancel();
      resizeObserver.disconnect();
      unsubscribe?.();
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      nativeScrollQuery.removeEventListener('change', handleNativeScrollChange);
      scrollport.removeEventListener('wheel', handleWheel);
      scrollport.removeEventListener('touchstart', handleTouchStart);
      scrollport.removeEventListener('touchmove', handleTouchMove);
      scrollport.removeEventListener('touchend', handleTouchEnd);
      scrollport.removeEventListener('touchcancel', handleTouchEnd);
      scrollport.removeEventListener('keydown', handleFinaleKeyDown);
      scrollport.removeEventListener('scroll', handleScrollPreparation);
      content.removeEventListener('about:editorial-lines-change', handleEditorialLinesChange);
      window.document.removeEventListener('visibilitychange', handleVisibilityChange);
      root.removeEventListener('about:world-runtime-ready', handleRuntimeReady);
      requestMeasureRef.current = () => {};
      delete root.dataset.activeNarrativeWorld;
      delete root.dataset.editorialInView;
      delete root.dataset.finaleOrbitActive;
      delete root.dataset.finaleOrbitWu;
      delete root.dataset.openingScrollCue;
      root.style.removeProperty('--about-opening-scroll-cue-opacity');
      root.style.removeProperty('--narrative-story-wu');
      root.style.removeProperty('--narrative-viewport-height');
      root.style.removeProperty('--narrative-content-extent-wu');
    };
  }, [contentRef, editorStore, finaleContinuation, playScrollDetent, rootRef, scrollportRef, solidTitles, worldRuntimeRef]);

  return { runtimePlan, storyWU, storyProgress, activeIndicatorStartIndex };
}
