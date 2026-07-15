import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  createSmoothScroll,
  createSmoothScrollMediaQueries,
  shouldUseNativeSmoothScroll,
} from '../../lib/smooth-scroll.js';
import {
  compileAboutNarrativeDocument,
  sampleAboutNarrativeCue,
  sampleAboutNarrativePlan,
} from './aboutNarrativeCompiler.js';

const clamp01 = (value) => Math.min(1, Math.max(0, value));

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
  const activeSectionIndexRef = useRef(0);
  const documentRef = useRef(document);
  const planRef = useRef(compileAboutNarrativeDocument(document));
  const measurementsRef = useRef({ dirty: true, sections: [], editorialLines: [] });

  useLayoutEffect(() => {
    documentRef.current = document;
    measurementsRef.current.dirty = true;
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
    };

    const updateTextCues = (frame, reducedMotion) => {
      documentRef.current.sections.forEach((section) => {
        const sectionNode = content.querySelector(`[data-narrative-section="${section.id}"]`);
        if (!sectionNode || !['spatial', 'finale'].includes(section.type)) return;
        const local = frame.section.id === section.id
          ? frame.localProgress
          : frame.storyWU < (planRef.current.sections.find((item) => item.id === section.id)?.startWU || 0) ? 0 : 1;
        const cues = section.text.cues || [];
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
          node.style.setProperty('--fragment-scale', state.scale.toFixed(4));
          node.style.setProperty('--fragment-blur', `${state.blur.toFixed(2)}px`);
          node.style.setProperty('--fragment-opacity', visible ? state.opacity.toFixed(4) : '0');
        });
      });
    };

    const updateEditorialCopy = (scrollTop, viewportHeight, reducedMotion) => {
      const threshold = documentRef.current.globals.editorialRevealThreshold;
      measurementsRef.current.editorialLines.forEach(({ node, top }) => {
        const progress = reducedMotion
          ? 1
          : clamp01(((viewportHeight * threshold) - (top - scrollTop)) / 96);
        node.style.setProperty('--editorial-reveal', progress.toFixed(4));
        node.style.setProperty('--editorial-blur', `${((1 - progress) * 3).toFixed(2)}px`);
        node.style.setProperty('--editorial-y', `${((1 - progress) * 12).toFixed(2)}px`);
      });
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
      if (measurementsRef.current.dirty) measure();
      const deltaSeconds = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      const viewportHeight = Math.max(1, scrollport.clientHeight);
      const reducedMotion = reducedMotionQuery.matches
        || editorStore?.getSnapshot().previewProfile === 'reduced-motion';
      const storyWU = readTransport(deltaSeconds);
      const frame = sampleAboutNarrativePlan(planRef.current, storyWU, {
        ambientSeconds: time / 1000,
        reducedMotion,
        liveAmbient: editorStore?.getSnapshot().transport.liveAmbient !== false,
      });

      if (frame) {
        frame.deltaSeconds = deltaSeconds;
        if (frame.sectionIndex !== activeSectionIndexRef.current) {
          activeSectionIndexRef.current = frame.sectionIndex;
          setActiveSectionIndex(frame.sectionIndex);
        }
        root.dataset.activeNarrativeSection = frame.section.id;
        root.style.setProperty('--narrative-story-wu', frame.storyWU.toFixed(4));
        updateTextCues(frame, reducedMotion);
        updateEditorialCopy(scrollport.scrollTop, viewportHeight, reducedMotion);
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
    const markDirty = () => { measurementsRef.current.dirty = true; };
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
      if (state.transport.owner === 'scroll') {
        if (lenis) lenis.start?.();
        else rebuildLenis();
      }
    };

    const resizeObserver = new ResizeObserver(markDirty);
    resizeObserver.observe(scrollport);
    resizeObserver.observe(content);
    reducedMotionQuery.addEventListener('change', handleMediaChange);
    nativeScrollQuery.addEventListener('change', handleMediaChange);
    scrollport.addEventListener('wheel', cancelPlayback, { passive: true });
    scrollport.addEventListener('touchstart', cancelPlayback, { passive: true });
    const unsubscribe = editorStore?.subscribe(handleStoreChange);
    window.document.fonts?.ready?.then(markDirty).catch(() => {});
    rebuildLenis();
    measure();
    raf = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(raf);
      lenis?.destroy();
      resizeObserver.disconnect();
      unsubscribe?.();
      reducedMotionQuery.removeEventListener('change', handleMediaChange);
      nativeScrollQuery.removeEventListener('change', handleMediaChange);
      scrollport.removeEventListener('wheel', cancelPlayback);
      scrollport.removeEventListener('touchstart', cancelPlayback);
      delete root.dataset.activeNarrativeSection;
      root.style.removeProperty('--narrative-story-wu');
      root.style.removeProperty('--narrative-viewport-height');
    };
  }, [contentRef, editorStore, rootRef, scrollportRef, sectionRefs, worldRuntimeRef]);

  return activeSectionIndex;
}
