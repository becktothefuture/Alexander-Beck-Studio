import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  createSmoothScroll,
  createSmoothScrollMediaQueries,
  shouldUseNativeSmoothScroll,
} from '../../lib/smooth-scroll.js';
import {
  compileAboutNarrativeDocument,
  createAboutNarrativeFrameSample,
  getAboutNarrativePreparationRequest,
  getAboutNarrativeCueMovement,
  sampleAboutNarrativeCue,
  sampleAboutNarrativePlanInto,
} from './aboutNarrativeCompiler.js';

const clamp01 = (value) => Math.min(1, Math.max(0, value));

export const ABOUT_SCROLL_INDICATOR_TICK_COUNT = 18;
export const ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT = 2;
const ABOUT_SCROLL_INDICATOR_MAX_START_INDEX = Math.max(
  0,
  ABOUT_SCROLL_INDICATOR_TICK_COUNT - ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT,
);

export function useAboutNarrativeTimeline({
  document,
  editorStore = null,
  rootRef,
  worldRuntimeRef,
  scrollportRef,
  contentRef,
  sectionRefs,
}) {
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [activeIndicatorStartIndex, setActiveIndicatorStartIndex] = useState(0);
  const activeSectionIndexRef = useRef(0);
  const activeIndicatorStartIndexRef = useRef(0);
  const documentRef = useRef(document);
  const planRef = useRef(compileAboutNarrativeDocument(document));
  const frameSampleRef = useRef(null);
  const frameSampleOptionsRef = useRef(null);
  if (frameSampleRef.current == null) frameSampleRef.current = createAboutNarrativeFrameSample();
  if (frameSampleOptionsRef.current == null) {
    frameSampleOptionsRef.current = {
      ambientSeconds: 0,
      reducedMotion: false,
      liveAmbient: true,
    };
  }
  const measurementsRef = useRef({ dirty: true, sections: [], editorialLines: [] });
  const requestMeasureRef = useRef(() => {});

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
    let lastTransportPublish = 0;
    let playbackWU = 0;
    let previousTransportOwner = 'scroll';
    let measureTimer = 0;
    let preparationTimer = 0;
    let lastPreparationIdentity = '';

    const getCurrentStoryWU = () => {
      const transport = editorStore?.getSnapshot().transport;
      if (transport && transport.owner !== 'scroll') return Number(transport.storyWU || 0);
      return scrollport.scrollTop / Math.max(1, scrollport.clientHeight);
    };

    const handoffPreparation = (storyWU, { force = false } = {}) => {
      const request = getAboutNarrativePreparationRequest(planRef.current, storyWU);
      const runtime = worldRuntimeRef.current;
      if (!request || typeof runtime?.preparePlan !== 'function') return false;
      const identity = `${request.sequenceKey}:${request.targetWorldId}`;
      if (!force && identity === lastPreparationIdentity) return false;
      runtime.preparePlan(request);
      lastPreparationIdentity = identity;
      return true;
    };

    const schedulePreparationHandoff = (storyWU = getCurrentStoryWU(), options) => {
      window.clearTimeout(preparationTimer);
      preparationTimer = window.setTimeout(() => {
        preparationTimer = 0;
        handoffPreparation(storyWU, options);
      }, 0);
    };

    const measure = () => {
      const viewportHeight = Math.max(1, scrollport.clientHeight);
      root.style.setProperty('--narrative-viewport-height', `${viewportHeight}px`);
      const scrollRect = scrollport.getBoundingClientRect();
      const scrollTop = scrollport.scrollTop;
      const sections = sectionRefs.current.map((node) => {
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return {
          top: rect.top - scrollRect.top + scrollTop,
          height: rect.height,
        };
      });
      const profile = window.matchMedia('(max-width: 600px), (pointer: coarse)').matches ? 'mobile' : 'desktop';
      const authored = documentRef.current;
      const hydrated = Object.fromEntries(authored.sections.map((section, index) => [
        section.id,
        {
          topWU: (sections[index]?.top || 0) / viewportHeight,
          extentWU: (sections[index]?.height || viewportHeight) / viewportHeight,
        },
      ]));
      const editorProfile = editorStore?.getSnapshot().previewProfile;
      planRef.current = compileAboutNarrativeDocument(authored, {
        profile: editorProfile === 'mobile' ? 'mobile' : profile,
        measurements: hydrated,
      });
      const editorialLines = Array.from(content.querySelectorAll('[data-editorial-line]')).map((node) => {
        const rect = node.getBoundingClientRect();
        return { node, top: rect.top - scrollRect.top + scrollTop };
      });
      measurementsRef.current = { dirty: false, sections, editorialLines };
      editorStore?.setRuntimePlan?.(planRef.current);
      schedulePreparationHandoff(getCurrentStoryWU(), { force: true });
    };

    const scheduleMeasure = () => {
      measurementsRef.current.dirty = true;
      window.clearTimeout(measureTimer);
      measureTimer = window.setTimeout(() => {
        measureTimer = 0;
        if (measurementsRef.current.dirty) measure();
      }, 0);
    };
    requestMeasureRef.current = scheduleMeasure;

    const updateTextCues = (frame, reducedMotion) => {
      documentRef.current.sections.forEach((section) => {
        const sectionNode = content.querySelector(`[data-narrative-section="${section.id}"]`);
        if (!sectionNode || !['spatial', 'finale'].includes(section.type)) return;
        const local = frame.section.id === section.id
          ? frame.localProgress
          : frame.storyWU < (planRef.current.sections.find((item) => item.id === section.id)?.startWU || 0) ? 0 : 1;
        const cues = (section.text.cues || []).filter((cue) => getAboutNarrativeCueMovement(cue) === 'spatial');
        let reducedIndex = 0;
        if (reducedMotion && cues.length > 1) {
          reducedIndex = cues.findIndex((cue) => local <= cue.exit);
          if (reducedIndex < 0) reducedIndex = cues.length - 1;
        }
        cues.forEach((cue, cueIndex) => {
          const node = sectionNode.querySelector(`[data-text-cue="${cue.id}"]`);
          if (!node) return;
          const state = sampleAboutNarrativeCue(
            cue,
            local,
            frame.globals.textMotion,
            reducedMotion,
          );
          const visible = reducedMotion ? cueIndex === reducedIndex : true;
          node.style.setProperty('--fragment-x', `${state.x.toFixed(2)}px`);
          node.style.setProperty('--fragment-y', `${state.y.toFixed(2)}px`);
          node.style.setProperty('--fragment-z', `${state.z.toFixed(2)}px`);
          node.style.setProperty('--fragment-blur', `${state.blur.toFixed(2)}px`);
          node.style.setProperty('--fragment-opacity', visible ? state.opacity.toFixed(4) : '0');
        });
        if (section.type === 'finale') {
          const contextStart = Number(section.interaction?.activationStart ?? 0.54);
          const contextProgress = reducedMotion
            ? 1
            : clamp01((local - contextStart) / 0.14);
          sectionNode.style.setProperty('--spatial-context-opacity', contextProgress.toFixed(4));
          sectionNode.style.setProperty('--spatial-context-y', `${((1 - contextProgress) * 16).toFixed(2)}px`);
        }
      });
    };

    const updateEditorialCopy = (scrollTop, viewportHeight, reducedMotion, target) => {
      const threshold = documentRef.current.globals.editorialRevealThreshold;
      let disciplineFocus = 0;
      let gridInfluence = 0;
      measurementsRef.current.editorialLines.forEach(({ node, top }) => {
        const progress = reducedMotion
          ? 1
          : clamp01(((viewportHeight * threshold) - (top - scrollTop)) / 96);
        node.style.setProperty('--editorial-reveal', progress.toFixed(4));
        node.style.setProperty('--editorial-blur', `${((1 - progress) * 3).toFixed(2)}px`);
        node.style.setProperty('--editorial-y', `${((1 - progress) * 12).toFixed(2)}px`);
        const group = Number(node.dataset.worldGroup || 0);
        if (group > 0 && progress >= 0.24) disciplineFocus = group;
        if (node.dataset.worldInfluence === 'true') gridInfluence = Math.max(gridInfluence, progress);
      });
      target.disciplineFocus = disciplineFocus;
      target.gridInfluence = gridInfluence;
      return target;
    };

    const readTransport = (deltaSeconds) => {
      const transport = editorStore?.getSnapshot().transport;
      if (!transport || transport.owner === 'scroll') {
        previousTransportOwner = 'scroll';
        return scrollport.scrollTop / Math.max(1, scrollport.clientHeight);
      }
      lenis?.stop?.();
      if (transport.owner === 'playback' && transport.playing) {
        if (previousTransportOwner !== 'playback') playbackWU = transport.storyWU;
        previousTransportOwner = 'playback';
        playbackWU += deltaSeconds * 0.42;
        if (transport.loop && playbackWU > transport.loop.endWU) playbackWU = transport.loop.startWU;
        else if (playbackWU >= planRef.current.maxStoryWU) {
          playbackWU = planRef.current.maxStoryWU;
          editorStore.setTransport({ playing: false, owner: 'timeline', storyWU: playbackWU });
        }
        scrollport.scrollTop = playbackWU * scrollport.clientHeight;
        return playbackWU;
      }
      previousTransportOwner = transport.owner;
      playbackWU = transport.storyWU;
      scrollport.scrollTop = playbackWU * scrollport.clientHeight;
      return playbackWU;
    };

    const renderFrame = (time) => {
      lenis?.raf(time);
      const deltaSeconds = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      const viewportHeight = Math.max(1, scrollport.clientHeight);
      const scrollRange = Math.max(0, scrollport.scrollHeight - viewportHeight);
      const scrollProgress = scrollRange > 0 ? clamp01(scrollport.scrollTop / scrollRange) : 0;
      const nextIndicatorStartIndex = Math.round(
        scrollProgress * ABOUT_SCROLL_INDICATOR_MAX_START_INDEX,
      );
      if (nextIndicatorStartIndex !== activeIndicatorStartIndexRef.current) {
        activeIndicatorStartIndexRef.current = nextIndicatorStartIndex;
        setActiveIndicatorStartIndex(nextIndicatorStartIndex);
      }
      const reducedMotion = reducedMotionQuery.matches
        || editorStore?.getSnapshot().previewProfile === 'reduced-motion';
      const storyWU = readTransport(deltaSeconds);
      const sampleOptions = frameSampleOptionsRef.current;
      sampleOptions.ambientSeconds = time / 1000;
      sampleOptions.reducedMotion = reducedMotion;
      sampleOptions.liveAmbient = editorStore?.getSnapshot().transport.liveAmbient !== false;
      const frame = sampleAboutNarrativePlanInto(
        planRef.current,
        storyWU,
        frameSampleRef.current,
        sampleOptions,
      );

      if (frame) {
        frame.deltaSeconds = deltaSeconds;
        if (frame.sectionIndex !== activeSectionIndexRef.current) {
          activeSectionIndexRef.current = frame.sectionIndex;
          setActiveSectionIndex(frame.sectionIndex);
        }
        root.dataset.activeNarrativeSection = frame.section.id;
        const openingScrollCueVisible = scrollport.scrollTop <= 16;
        root.dataset.openingScrollCue = openingScrollCueVisible ? 'visible' : 'hidden';
        root.style.setProperty('--opening-scroll-cue-opacity', openingScrollCueVisible ? '1' : '0');
        root.style.setProperty('--narrative-story-wu', frame.storyWU.toFixed(4));
        updateTextCues(frame, reducedMotion);
        updateEditorialCopy(
          scrollport.scrollTop,
          viewportHeight,
          reducedMotion,
          frame.editorialSignals,
        );
        worldRuntimeRef.current?.render(frame);
        if (editorStore && time - lastTransportPublish > 80) {
          const current = editorStore.getSnapshot().transport;
          if (current.owner === 'scroll') editorStore.setTransport({ storyWU: frame.storyWU });
          lastTransportPublish = time;
        }
      }
      raf = window.requestAnimationFrame(renderFrame);
    };

    const rebuildLenis = () => {
      lenis?.destroy();
      lenis = null;
      const transport = editorStore?.getSnapshot().transport;
      if (transport && transport.owner !== 'scroll') return;
      if (shouldUseNativeSmoothScroll({ reducedMotionQuery, nativeScrollQuery })) return;
      lenis = createSmoothScroll({
        wrapper: scrollport,
        content,
        smoothing: documentRef.current.globals.scrollSmoothing,
      });
    };
    const markDirty = () => { scheduleMeasure(); };
    const handleMediaChange = () => { rebuildLenis(); markDirty(); };
    const cancelPlayback = () => {
      const transport = editorStore?.getSnapshot().transport;
      if (!transport || transport.owner === 'scroll') return;
      editorStore.setTransport({
        owner: 'scroll',
        playing: false,
        storyWU: scrollport.scrollTop / Math.max(1, scrollport.clientHeight),
      });
      rebuildLenis();
    };
    const handleStoreChange = () => {
      const state = editorStore?.getSnapshot();
      if (!state) return;
      if (state.compiledPlan?.document !== planRef.current.document) markDirty();
      else schedulePreparationHandoff(state.transport.storyWU);
      if (state.transport.owner === 'scroll') {
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
    reducedMotionQuery.addEventListener('change', handleMediaChange);
    nativeScrollQuery.addEventListener('change', handleMediaChange);
    scrollport.addEventListener('wheel', cancelPlayback, { passive: true });
    scrollport.addEventListener('touchstart', cancelPlayback, { passive: true });
    scrollport.addEventListener('scroll', handleScrollPreparation, { passive: true });
    window.document.addEventListener('visibilitychange', handleVisibilityChange);
    root.addEventListener('about:world-runtime-ready', handleRuntimeReady);
    const unsubscribe = editorStore?.subscribe(handleStoreChange);
    window.document.fonts?.ready?.then(markDirty).catch(() => {});
    rebuildLenis();
    measure();
    raf = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(measureTimer);
      window.clearTimeout(preparationTimer);
      lenis?.destroy();
      resizeObserver.disconnect();
      unsubscribe?.();
      reducedMotionQuery.removeEventListener('change', handleMediaChange);
      nativeScrollQuery.removeEventListener('change', handleMediaChange);
      scrollport.removeEventListener('wheel', cancelPlayback);
      scrollport.removeEventListener('touchstart', cancelPlayback);
      scrollport.removeEventListener('scroll', handleScrollPreparation);
      window.document.removeEventListener('visibilitychange', handleVisibilityChange);
      root.removeEventListener('about:world-runtime-ready', handleRuntimeReady);
      requestMeasureRef.current = () => {};
      delete root.dataset.activeNarrativeSection;
      delete root.dataset.openingScrollCue;
      root.style.removeProperty('--opening-scroll-cue-opacity');
      root.style.removeProperty('--narrative-story-wu');
      root.style.removeProperty('--narrative-viewport-height');
    };
  }, [contentRef, editorStore, rootRef, scrollportRef, sectionRefs, worldRuntimeRef]);

  return { activeSectionIndex, activeIndicatorStartIndex };
}
