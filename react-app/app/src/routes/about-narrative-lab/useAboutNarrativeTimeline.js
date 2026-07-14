import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { compileAboutNarrativeStageSequence } from './aboutNarrativeStages.js';

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const mix = (from, to, progress) => from + ((to - from) * progress);
const ease = (value) => 1 - ((1 - clamp01(value)) ** 3);

function readNativeTouchScroll() {
  return window.matchMedia('(max-width: 600px), (hover: none), (pointer: coarse)').matches;
}

export function useAboutNarrativeTimeline({
  settings,
  sectionData,
  rootRef,
  worldRuntimeRef,
  scrollportRef,
  contentRef,
  sectionRefs,
}) {
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const activeSectionIndexRef = useRef(0);
  const settingsRef = useRef(settings);
  const measurementsRef = useRef({ dirty: true, sections: [], editorialLines: [] });
  const stageSequenceRef = useRef(compileAboutNarrativeStageSequence(sectionData));

  useLayoutEffect(() => {
    settingsRef.current = settings;
    measurementsRef.current.dirty = true;
  }, [settings]);

  useEffect(() => {
    const root = rootRef.current;
    const scrollport = scrollportRef.current;
    const content = contentRef.current;
    if (!root || !scrollport || !content) return undefined;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const touchQuery = window.matchMedia('(max-width: 600px), (hover: none), (pointer: coarse)');
    let lenis = null;
    let frame = 0;
    let previousTime = performance.now();

    const measure = () => {
      const scrollRect = scrollport.getBoundingClientRect();
      const scrollTop = scrollport.scrollTop;
      const sections = sectionRefs.current.map((node) => {
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return {
          top: rect.top - scrollRect.top + scrollTop,
          height: rect.height,
          fragments: Array.from(node.querySelectorAll('[data-spatial-fragment]')),
        };
      });
      const editorialLines = Array.from(content.querySelectorAll('[data-editorial-line]')).map((node) => {
        const rect = node.getBoundingClientRect();
        return { node, top: rect.top - scrollRect.top + scrollTop };
      });
      measurementsRef.current = { dirty: false, sections, editorialLines };
    };

    const updateSpatialCopy = (scrollTop, viewportHeight, reducedMotion, currentSettings) => {
      measurementsRef.current.sections.forEach((measurement, index) => {
        const node = sectionRefs.current[index];
        const data = sectionData[index];
        if (!node || !measurement || !['spatial', 'finale'].includes(data?.mode)) return;
        const fragments = measurement.fragments;
        if (reducedMotion) {
          fragments.forEach((fragment) => {
            fragment.style.setProperty('--fragment-x', '0px');
            fragment.style.setProperty('--fragment-y', '0px');
            fragment.style.setProperty('--fragment-z', '0px');
            fragment.style.setProperty('--fragment-scale', '1');
            fragment.style.setProperty('--fragment-blur', '0px');
            fragment.style.setProperty('--fragment-opacity', '1');
          });
          node.style.setProperty('--spatial-context-opacity', '1');
          node.style.setProperty('--spatial-context-y', '0px');
          return;
        }

        const travel = Math.max(1, measurement.height - viewportHeight);
        const progress = clamp01((scrollTop - measurement.top) / travel);
        const fragmentWindow = Math.min(0.2, Math.max(0.14, 0.12 + (currentSettings.fadeWindow * 0.25)));
        let contextOpacity = 0;
        let contextY = 16;

        fragments.forEach((fragment, fragmentIndex) => {
          const fragmentRatio = fragments.length > 1 ? fragmentIndex / (fragments.length - 1) : 0.5;
          const isInitialFragment = index === 0 && fragmentIndex === 0;
          const center = isInitialFragment ? 0 : 0.5 + ((fragmentRatio - 0.5) * currentSettings.fragmentSpread);
          const relativeProgress = (progress - center) / fragmentWindow;
          const entryStart = fragmentIndex === 0 ? 0 : center - fragmentWindow;
          const direction = fragmentIndex % 2 === 0 ? -1 : 1;
          const holdsAtEnd = data.mode === 'finale' && fragmentIndex === fragments.length - 1;
          let scale = 1;
          let blur = 0;
          let opacity = 1;
          let x = 0;
          let y = 0;
          let z = 0;

          if (relativeProgress < 0) {
            const phase = ease(clamp01((progress - entryStart) / Math.max(0.001, center - entryStart)));
            scale = mix(currentSettings.farScale, 1, phase);
            blur = mix(currentSettings.maxBlur * 0.85, 0, phase);
            opacity = phase;
            z = mix(-currentSettings.entryDepth, 0, phase);
          } else if (!holdsAtEnd) {
            const phase = ease(clamp01(relativeProgress));
            scale = mix(1, currentSettings.nearScale, phase);
            blur = mix(0, currentSettings.maxBlur, phase);
            opacity = 1 - phase;
            x = mix(0, direction * currentSettings.exitDrift * -0.875, phase);
            y = mix(0, -currentSettings.exitDrift, phase);
            z = mix(0, currentSettings.exitDepth, phase);
          }

          fragment.style.setProperty('--fragment-x', `${x.toFixed(2)}px`);
          fragment.style.setProperty('--fragment-y', `${y.toFixed(2)}px`);
          fragment.style.setProperty('--fragment-z', `${z.toFixed(2)}px`);
          fragment.style.setProperty('--fragment-scale', scale.toFixed(4));
          fragment.style.setProperty('--fragment-blur', `${blur.toFixed(2)}px`);
          fragment.style.setProperty('--fragment-opacity', opacity.toFixed(4));
          if (fragmentIndex === fragments.length - 1) {
            contextOpacity = opacity;
            contextY = y * -0.35;
          }
        });
        node.style.setProperty('--spatial-context-opacity', contextOpacity.toFixed(4));
        node.style.setProperty('--spatial-context-y', `${contextY.toFixed(2)}px`);
      });
    };

    const updateEditorialCopy = (scrollTop, viewportHeight, reducedMotion, currentSettings) => {
      measurementsRef.current.editorialLines.forEach(({ node, top }) => {
        const progress = reducedMotion
          ? 1
          : clamp01(((viewportHeight * currentSettings.editorialRevealThreshold) - (top - scrollTop)) / 96);
        node.style.setProperty('--editorial-reveal', progress.toFixed(4));
        node.style.setProperty('--editorial-blur', `${((1 - progress) * 3).toFixed(2)}px`);
        node.style.setProperty('--editorial-y', `${((1 - progress) * 12).toFixed(2)}px`);
      });
    };

    const renderFrame = (time) => {
      lenis?.raf(time);
      if (measurementsRef.current.dirty) measure();
      const { sections } = measurementsRef.current;
      const viewportHeight = Math.max(1, scrollport.clientHeight);
      const scrollTop = scrollport.scrollTop;
      const currentSettings = settingsRef.current;
      const reducedMotion = reducedMotionQuery.matches;
      const focusLine = scrollTop + (viewportHeight * 0.46);
      let indicatorIndex = 0;
      let timelineIndex = 0;
      sections.forEach((section, index) => {
        if (section && focusLine >= section.top) indicatorIndex = index;
        if (section && scrollTop >= section.top) timelineIndex = index;
      });

      if (indicatorIndex !== activeSectionIndexRef.current) {
        activeSectionIndexRef.current = indicatorIndex;
        setActiveSectionIndex(indicatorIndex);
      }

      updateSpatialCopy(scrollTop, viewportHeight, reducedMotion, currentSettings);
      updateEditorialCopy(scrollTop, viewportHeight, reducedMotion, currentSettings);

      const currentMeasurement = sections[timelineIndex];
      const currentSequence = stageSequenceRef.current[timelineIndex];
      const sectionTravel = Math.max(1, currentMeasurement.height - viewportHeight);
      const sectionProgress = clamp01((scrollTop - currentMeasurement.top) / sectionTravel);
      const stageMorph = currentSequence.changesStage
        ? clamp01((sectionProgress - 0.08) / 0.6)
        : 1;
      const storyPositionWU = scrollTop / viewportHeight;
      const cameraPositionWU = storyPositionWU * currentSettings.cameraSpeed;
      const deltaSeconds = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      const stageStartWU = (sections[currentSequence.stageStartIndex]?.top || 0) / viewportHeight;
      const fromStageStartWU = (sections[currentSequence.fromStageStartIndex]?.top || 0) / viewportHeight;

      root.dataset.activeNarrativeSection = sectionData[indicatorIndex].id;
      root.style.setProperty('--narrative-story-wu', storyPositionWU.toFixed(4));
      worldRuntimeRef.current?.render({
        stageId: currentSequence.stageId,
        fromStageId: currentSequence.fromStageId,
        stageStartWU,
        fromStageStartWU,
        stageChanges: currentSequence.changesStage,
        stageMorph,
        sectionProgress,
        storyPositionWU,
        cameraPositionWU,
        elapsedSeconds: time / 1000,
        deltaSeconds,
        reducedMotion,
        settings: currentSettings,
      });
      frame = window.requestAnimationFrame(renderFrame);
    };

    const rebuildLenis = () => {
      lenis?.destroy();
      lenis = null;
      if (reducedMotionQuery.matches || readNativeTouchScroll()) return;
      lenis = new Lenis({
        wrapper: scrollport,
        content,
        lerp: 0.22 - (settingsRef.current.scrollSmoothing * 0.18),
        smoothWheel: true,
        syncTouch: false,
        autoRaf: false,
      });
    };
    const markDirty = () => { measurementsRef.current.dirty = true; };
    const handleMediaChange = () => {
      rebuildLenis();
      markDirty();
    };
    const resizeObserver = new ResizeObserver(markDirty);
    resizeObserver.observe(scrollport);
    resizeObserver.observe(content);
    reducedMotionQuery.addEventListener('change', handleMediaChange);
    touchQuery.addEventListener('change', handleMediaChange);
    document.fonts?.ready?.then(markDirty).catch(() => {});
    rebuildLenis();
    measure();
    frame = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(frame);
      lenis?.destroy();
      resizeObserver.disconnect();
      reducedMotionQuery.removeEventListener('change', handleMediaChange);
      touchQuery.removeEventListener('change', handleMediaChange);
      delete root.dataset.activeNarrativeSection;
      root.style.removeProperty('--narrative-story-wu');
    };
  }, [contentRef, rootRef, scrollportRef, sectionData, sectionRefs, settings.scrollSmoothing, worldRuntimeRef]);

  return activeSectionIndex;
}
