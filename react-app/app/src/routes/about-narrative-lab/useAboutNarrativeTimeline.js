import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  createSmoothScroll,
  createSmoothScrollMediaQueries,
  shouldUseNativeSmoothScroll,
} from '../../lib/smooth-scroll.js';
import { remapAboutNarrativeScrollTop } from './aboutNarrativeProfileResolver.js';
import {
  compileAboutNarrativeRuntimePlan,
  createAboutNarrativeRuntimeFrameSample,
  createAboutNarrativeTitleFieldSample,
  getAboutNarrativeRuntimePreparationRequest,
  sampleAboutNarrativeRuntimePlanInto,
  sampleAboutNarrativeTitleFieldInto,
} from './aboutNarrativeRuntimePlan.js';

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const EMPTY_MEASUREMENTS = Object.freeze({
  dirty: true,
  viewportHeight: 0,
  editorialLines: [],
  titleFields: [],
  contextFields: [],
});

export const ABOUT_SCROLL_INDICATOR_TICK_COUNT = 18;
export const ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT = 2;
const ABOUT_SCROLL_INDICATOR_MAX_START_INDEX = Math.max(
  0,
  ABOUT_SCROLL_INDICATOR_TICK_COUNT - ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT,
);

function getPreviewOptions(editorStore) {
  const previewState = editorStore?.getSnapshot?.()?.previewState;
  return {
    previewLayoutProfile: previewState?.layoutProfile,
    previewMotionProfile: previewState?.motionProfile,
  };
}

function createInitialPlan(document, editorStore) {
  const canReadViewport = typeof window !== 'undefined';
  return compileAboutNarrativeRuntimePlan(document, {
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

export function getAboutNarrativeEditorialReveal(
  record,
  scrollWU,
  viewportHeight,
  viewportThreshold,
  reducedMotion,
) {
  const threshold = Math.min(0.95, Math.max(0.05, Number(viewportThreshold) || 0.8));
  const triggerY = viewportHeight * threshold;
  const lineTop = (
    (Number(record.startScrollWU) + threshold - scrollWU) * viewportHeight
  ) + record.layoutOffsetPx;
  if (reducedMotion) return lineTop <= triggerY ? 1 : 0;
  const revealTravel = Math.max(48, viewportHeight * 0.08);
  return clamp01((triggerY - lineTop) / revealTravel);
}

export function useAboutNarrativeTimeline({
  document,
  editorStore = null,
  rootRef,
  worldRuntimeRef,
  scrollportRef,
  contentRef,
}) {
  const initialPlanRef = useRef(null);
  if (initialPlanRef.current == null) {
    initialPlanRef.current = createInitialPlan(document, editorStore);
  }
  const [runtimePlan, setRuntimePlan] = useState(initialPlanRef.current);
  const [storyWU, setStoryWU] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [activeIndicatorStartIndex, setActiveIndicatorStartIndex] = useState(0);
  const storyWURef = useRef(0);
  const storyProgressRef = useRef(0);
  const activeIndicatorStartIndexRef = useRef(0);
  const documentRef = useRef(document);
  const planRef = useRef(initialPlanRef.current);
  const frameSampleRef = useRef(null);
  const frameSampleOptionsRef = useRef(null);
  const titleSampleByIdRef = useRef(new Map());
  const measurementsRef = useRef({ ...EMPTY_MEASUREMENTS });
  const requestMeasureRef = useRef(() => {});
  if (frameSampleRef.current == null) frameSampleRef.current = createAboutNarrativeRuntimeFrameSample();
  if (frameSampleOptionsRef.current == null) {
    frameSampleOptionsRef.current = { ambientSeconds: 0, deltaSeconds: 0, liveAmbient: true };
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
    let lastDiagnosticKey = '';
    let disposed = false;
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

    const handoffPreparation = (nextStoryWU, { force = false } = {}) => {
      const request = getAboutNarrativeRuntimePreparationRequest(planRef.current, nextStoryWU);
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
      });
    };

    const collectContentPressure = (viewportHeight) => {
      const pressure = {};
      const editorialOffsets = new Map();
      content.querySelectorAll('[data-text-field-id]').forEach((node) => {
        const fieldId = node.dataset.textFieldId;
        if (!fieldId) return;
        const measuredHeightPx = Math.max(node.scrollHeight, node.getBoundingClientRect().height);
        const previous = pressure[fieldId]?.measuredHeightPx || 0;
        pressure[fieldId] = {
          measuredHeightPx: Math.max(previous, measuredHeightPx),
          viewportHeightPx: viewportHeight,
        };
        const editorialNodes = node.matches('[data-editorial-line]')
          ? [node]
          : Array.from(node.querySelectorAll('[data-editorial-line]'));
        editorialNodes.forEach((editorialNode) => {
          editorialOffsets.set(
            editorialNode,
            editorialNode === node ? 0 : Math.max(0, editorialNode.offsetTop - node.offsetTop),
          );
        });
      });
      measurementsRef.current.editorialOffsets = editorialOffsets;
      return pressure;
    };

    const cacheSemanticNodes = (plan) => {
      const fieldsById = new Map(plan.textFields.map((field) => [field.id, field]));
      const spansByFieldId = new Map(plan.renderSpans.flatMap((span) => (
        span.fieldIds.map((fieldId) => [fieldId, span])
      )));
      const editorialNodes = Array.from(content.querySelectorAll('[data-editorial-line]'));
      const editorialLines = editorialNodes.flatMap((node) => {
        const fieldId = node.closest('[data-text-field-id]')?.dataset.textFieldId;
        const field = fieldsById.get(fieldId);
        const span = spansByFieldId.get(fieldId);
        const isEditorialField = field?.kind === 'scroll-block'
          || (field?.kind === 'title' && field.movement === 'vertical');
        if (!isEditorialField || !span) return [];
        return [{
          node,
          field,
          startScrollWU: Number(span.scrollBounds.startWU),
          layoutOffsetPx: measurementsRef.current.editorialOffsets?.get(node) || 0,
          progress: 0,
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
            sample = createAboutNarrativeTitleFieldSample();
            titleSampleByIdRef.current.set(field.id, sample);
          }
          titleFields.push({ node, field, sample });
        }
        if (field.presentation?.layout === 'text-finale-cta'
          || field.presentation?.layout === 'text-bust-cta') contextFields.push({ node, field });
      });
      measurementsRef.current = {
        ...measurementsRef.current,
        dirty: false,
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
      const candidate = compileAboutNarrativeRuntimePlan(sourceDocument, {
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
      const modelOrProfileChanged = sourceDocument !== installedDocument
        || profileKey !== installedProfileKey;
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

    const updateSemanticText = (frame) => {
      const reducedMotion = frame.reducedMotion;
      const textMotion = frame.globals.textMotion;
      for (const { node, field, sample } of measurementsRef.current.titleFields) {
        sampleAboutNarrativeTitleFieldInto(field, frame.storyWU, textMotion, reducedMotion, sample);
        const visible = !reducedMotion
          || isFieldActive(field, frame.storyWU, frame.durationWU);
        node.style.setProperty('--fragment-x', `${sample.x.toFixed(2)}px`);
        node.style.setProperty('--fragment-y', `${sample.y.toFixed(2)}px`);
        node.style.setProperty('--fragment-z', `${sample.z.toFixed(2)}px`);
        node.style.setProperty('--fragment-blur', `${sample.blur.toFixed(2)}px`);
        node.style.setProperty('--fragment-opacity', visible ? sample.opacity.toFixed(4) : '0');
      }

      let disciplineFocus = 0;
      let gridInfluence = 0;
      const editorialLines = measurementsRef.current.editorialLines;
      const viewportThreshold = frame.globals.editorialRevealThreshold;
      const viewportHeight = Math.max(1, measurementsRef.current.viewportHeight);
      const scrollWU = planRef.current.resolver.scrollWUFromStoryWU(frame.storyWU);
      for (const record of editorialLines) {
        record.progress = getAboutNarrativeEditorialReveal(
          record,
          scrollWU,
          viewportHeight,
          viewportThreshold,
          reducedMotion,
        );
      }
      for (const { node, progress } of editorialLines) {
        node.style.setProperty('--editorial-reveal', progress.toFixed(4));
        node.style.setProperty('--editorial-blur', `${((1 - progress) * 3).toFixed(2)}px`);
        node.style.setProperty('--editorial-y', `${((1 - progress) * 12).toFixed(2)}px`);
        const group = Number(node.dataset.worldGroup) || 0;
        if (group > 0 && progress >= 0.24) disciplineFocus = group;
        if (node.dataset.worldInfluence === 'true') gridInfluence = Math.max(gridInfluence, progress);
      }
      frame.editorialSignals.disciplineFocus = disciplineFocus;
      frame.editorialSignals.gridInfluence = gridInfluence;

      for (const { node, field } of measurementsRef.current.contextFields) {
        const contextProgress = reducedMotion
          ? (frame.storyWU >= field.startWU ? 1 : 0)
          : clamp01(
            (frame.storyWU - field.startWU)
            / Math.max(0.000001, field.focusWU - field.startWU),
          );
        node.style.setProperty('--spatial-context-opacity', contextProgress.toFixed(4));
        node.style.setProperty('--spatial-context-y', `${((1 - contextProgress) * 16).toFixed(2)}px`);
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
      const sampleOptions = frameSampleOptionsRef.current;
      sampleOptions.ambientSeconds = time / 1000;
      sampleOptions.deltaSeconds = deltaSeconds;
      sampleOptions.liveAmbient = getTransport(editorStore)?.liveAmbient !== false;
      const frame = sampleAboutNarrativeRuntimePlanInto(
        planRef.current,
        nextStoryWU,
        frameSampleRef.current,
        sampleOptions,
      );

      if (frame) {
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
        const openingScrollCueVisible = scrollport.scrollTop <= 16;
        root.dataset.openingScrollCue = openingScrollCueVisible ? 'visible' : 'hidden';
        root.style.setProperty('--opening-scroll-cue-opacity', openingScrollCueVisible ? '1' : '0');
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
    const handleScrollPreparation = () => schedulePreparationHandoff();
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
    scrollport.addEventListener('wheel', cancelPlayback, { passive: true });
    scrollport.addEventListener('touchstart', cancelPlayback, { passive: true });
    scrollport.addEventListener('scroll', handleScrollPreparation, { passive: true });
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
      resizeObserver.disconnect();
      unsubscribe?.();
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      nativeScrollQuery.removeEventListener('change', handleNativeScrollChange);
      scrollport.removeEventListener('wheel', cancelPlayback);
      scrollport.removeEventListener('touchstart', cancelPlayback);
      scrollport.removeEventListener('scroll', handleScrollPreparation);
      window.document.removeEventListener('visibilitychange', handleVisibilityChange);
      root.removeEventListener('about:world-runtime-ready', handleRuntimeReady);
      requestMeasureRef.current = () => {};
      delete root.dataset.activeNarrativeWorld;
      delete root.dataset.openingScrollCue;
      root.style.removeProperty('--opening-scroll-cue-opacity');
      root.style.removeProperty('--narrative-story-wu');
      root.style.removeProperty('--narrative-viewport-height');
      root.style.removeProperty('--narrative-content-extent-wu');
    };
  }, [contentRef, editorStore, rootRef, scrollportRef, worldRuntimeRef]);

  return { runtimePlan, storyWU, storyProgress, activeIndicatorStartIndex };
}
