import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Lenis from 'lenis';

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const mix = (from, to, progress) => from + ((to - from) * progress);
const ease = (value) => 1 - ((1 - clamp01(value)) ** 3);

function readReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readNativeTouchScroll() {
  return window.matchMedia('(max-width: 600px), (hover: none), (pointer: coarse)').matches;
}

export function useAboutNarrativeScroll({
  settings,
  sectionData,
  scrollportRef,
  contentRef,
  sectionRefs,
}) {
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const activeSectionIndexRef = useRef(0);
  const settingsRef = useRef(settings);
  const measurementsRef = useRef({ sections: [], editorialLines: [] });
  const frameRef = useRef(0);
  const reducedMotionRef = useRef(readReducedMotion());

  useLayoutEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const measure = useCallback(() => {
    const scrollport = scrollportRef.current;
    if (!scrollport) return;

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
    const editorialLines = Array.from(contentRef.current?.querySelectorAll('[data-editorial-line]') || [])
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          node,
          top: rect.top - scrollRect.top + scrollTop,
        };
      });

    measurementsRef.current = { sections, editorialLines };
  }, [contentRef, scrollportRef, sectionRefs]);

  const updateFrame = useCallback(() => {
    frameRef.current = 0;
    const scrollport = scrollportRef.current;
    if (!scrollport) return;

    const { sections, editorialLines } = measurementsRef.current;
    if (!sections.length) return;

    const scrollTop = scrollport.scrollTop;
    const viewportHeight = scrollport.clientHeight;
    const focusLine = scrollTop + (viewportHeight * 0.46);
    const reduceMotion = reducedMotionRef.current;
    const currentSettings = settingsRef.current;

    let nextActiveIndex = 0;
    sections.forEach((measurement, index) => {
      if (measurement && focusLine >= measurement.top) nextActiveIndex = index;
    });

    if (nextActiveIndex !== activeSectionIndexRef.current) {
      activeSectionIndexRef.current = nextActiveIndex;
      setActiveSectionIndex(nextActiveIndex);
    }

    sectionRefs.current.forEach((node, index) => {
      if (!node) return;
      const measurement = sections[index];
      const data = sectionData[index];
      const isSpatialMovement = ['spatial', 'constellation', 'finale'].includes(data?.type);
      if (!measurement || !isSpatialMovement) return;
      const fragments = measurement.fragments || [];

      if (reduceMotion) {
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
        const center = isInitialFragment
          ? 0
          : 0.5 + ((fragmentRatio - 0.5) * currentSettings.fragmentSpread);
        const relativeProgress = (progress - center) / fragmentWindow;
        const entryStart = fragmentIndex === 0 ? 0 : center - fragmentWindow;
        const direction = fragmentIndex % 2 === 0 ? -1 : 1;
        const holdsAtEnd = data?.type === 'finale' && fragmentIndex === fragments.length - 1;
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
          x = 0;
          y = 0;
          z = mix(-currentSettings.entryDepth, 0, phase);
        } else if (holdsAtEnd) {
          scale = 1;
          blur = 0;
          opacity = 1;
          x = 0;
          y = 0;
          z = 0;
        } else {
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

    editorialLines.forEach(({ node, top }) => {
      const progress = reduceMotion
        ? 1
        : clamp01(((viewportHeight * currentSettings.editorialRevealThreshold) - (top - scrollTop)) / 96);
      node.style.setProperty('--editorial-reveal', progress.toFixed(4));
      node.style.setProperty('--editorial-blur', `${((1 - progress) * 3).toFixed(2)}px`);
      node.style.setProperty('--editorial-y', `${((1 - progress) * 12).toFixed(2)}px`);
    });

  }, [scrollportRef, sectionData, sectionRefs]);

  const scheduleFrame = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = window.requestAnimationFrame(updateFrame);
  }, [updateFrame]);

  useEffect(() => {
    const scrollport = scrollportRef.current;
    const content = contentRef.current;
    if (!scrollport || !content) return undefined;

    let resizeObserver = null;
    let lenis = null;
    let lenisFrame = 0;
    const mediaQueries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(max-width: 600px), (hover: none), (pointer: coarse)'),
    ];
    reducedMotionRef.current = mediaQueries[0].matches;

    const refresh = () => {
      measure();
      scheduleFrame();
    };

    const createLenis = () => {
      if (lenis) {
        lenis.destroy();
        lenis = null;
      }
      if (lenisFrame) {
        window.cancelAnimationFrame(lenisFrame);
        lenisFrame = 0;
      }
      if (reducedMotionRef.current || readNativeTouchScroll()) return;

      const lerp = 0.22 - (settings.scrollSmoothing * 0.18);
      lenis = new Lenis({
        wrapper: scrollport,
        content,
        lerp,
        smoothWheel: true,
        syncTouch: false,
        autoRaf: false,
      });
      lenis.on('scroll', scheduleFrame);
      const tick = (time) => {
        lenis?.raf(time);
        lenisFrame = window.requestAnimationFrame(tick);
      };
      lenisFrame = window.requestAnimationFrame(tick);
    };

    const handleMediaChange = () => {
      reducedMotionRef.current = mediaQueries[0].matches;
      createLenis();
      refresh();
    };

    scrollport.addEventListener('scroll', scheduleFrame, { passive: true });
    resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(scrollport);
    resizeObserver.observe(content);
    mediaQueries.forEach((query) => query.addEventListener('change', handleMediaChange));
    document.fonts?.ready?.then(refresh).catch(() => {});
    createLenis();
    refresh();

    return () => {
      scrollport.removeEventListener('scroll', scheduleFrame);
      resizeObserver?.disconnect();
      mediaQueries.forEach((query) => query.removeEventListener('change', handleMediaChange));
      lenis?.destroy();
      if (lenisFrame) window.cancelAnimationFrame(lenisFrame);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [contentRef, measure, scheduleFrame, scrollportRef, settings.scrollSmoothing]);

  useLayoutEffect(() => {
    measure();
    scheduleFrame();
  }, [measure, scheduleFrame, settings]);

  return activeSectionIndex;
}
