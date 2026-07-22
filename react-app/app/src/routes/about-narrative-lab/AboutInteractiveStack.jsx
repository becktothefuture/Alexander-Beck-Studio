import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  ABOUT_INTERACTIVE_STACK_VISIBLE_COUNT,
  resolveAboutInteractiveStackParameters,
} from './aboutInteractiveStackContract.js';
import {
  advanceAboutInteractiveStackOrder,
  createAboutInteractiveStackOrder,
  createAboutInteractiveStackSlots,
  reconcileAboutInteractiveStackOrder,
  retreatAboutInteractiveStackOrder,
} from './aboutInteractiveStackModel.js';

const INITIAL_GESTURE = Object.freeze({
  pointerId: null,
  startX: 0,
  startY: 0,
  dx: 0,
  dy: 0,
  locked: false,
  samples: [],
});

function createInitialState(items, seed) {
  return {
    order: createAboutInteractiveStackOrder(items, seed),
    phase: 'idle',
    direction: 0,
    queuedDirection: 0,
    durationMs: 0,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'reset':
      return { ...state, order: action.order, phase: 'idle', direction: 0, queuedDirection: 0, durationMs: 0 };
    case 'reconcile':
      return { ...state, order: action.order };
    case 'pointer-pending':
      return state.phase === 'idle' ? { ...state, phase: 'pending-pointer' } : state;
    case 'dragging':
      return state.phase === 'pending-pointer' ? { ...state, phase: 'dragging' } : state;
    case 'settling':
      return { ...state, phase: 'settling' };
    case 'navigate':
      if (state.order.length <= 1) return state;
      if (state.phase !== 'idle' && !(
        action.fromGesture
        && (state.phase === 'pending-pointer' || state.phase === 'dragging')
      )) {
        return { ...state, queuedDirection: action.direction };
      }
      if (action.immediate) {
        return {
          ...state,
          order: action.direction > 0
            ? advanceAboutInteractiveStackOrder(state.order)
            : retreatAboutInteractiveStackOrder(state.order),
        };
      }
      return {
        ...state,
        phase: 'departing',
        direction: action.direction,
        durationMs: action.durationMs || 0,
      };
    case 'finish-settle':
      return { ...state, phase: 'idle', direction: 0, queuedDirection: 0, durationMs: 0 };
    case 'finish-departure':
      return {
        ...state,
        order: state.direction > 0
          ? advanceAboutInteractiveStackOrder(state.order)
          : retreatAboutInteractiveStackOrder(state.order),
        phase: 'idle',
        direction: 0,
        queuedDirection: 0,
        durationMs: 0,
      };
    case 'cancel':
      return { ...state, phase: 'idle', direction: 0, queuedDirection: 0, durationMs: 0 };
    default:
      return state;
  }
}

function StackVideo({ item, active, canPlay, fit, onError }) {
  const videoRef = useRef(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    if (canPlay) {
      video.src = item.src;
      video.play().catch(() => {});
    } else {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [canPlay, item.src]);
  return (
    <video
      ref={videoRef}
      aria-label={active ? item.alt : undefined}
      muted
      loop
      playsInline
      preload="none"
      poster={item.poster}
      style={{ objectFit: fit }}
      onError={onError}
    />
  );
}

function StackMedia({ item, active, nearby, intersecting, documentVisible, fullMotion, failed, onError }) {
  if (failed || !nearby) return <span className="about-interactive-stack__placeholder" aria-hidden="true" />;
  const fit = item.fit || 'cover';
  if (item.type === 'video') {
    const saveData = typeof navigator !== 'undefined' && navigator.connection?.saveData === true;
    const canPlay = active && intersecting && documentVisible && fullMotion && !saveData;
    return <StackVideo item={item} active={active} canPlay={canPlay} fit={fit} onError={onError} />;
  }
  return (
    <img
      src={item.src}
      alt={active ? item.alt : ''}
      width={item.width}
      height={item.height}
      loading={active ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={active ? 'auto' : 'low'}
      draggable="false"
      style={{ objectFit: fit }}
      onError={onError}
    />
  );
}

export function AboutInteractiveStack({ module, motionProfile = 'full', scrollportRef }) {
  const items = useMemo(() => module.items || [], [module.items]);
  const parameters = useMemo(
    () => resolveAboutInteractiveStackParameters(module.parameters),
    [module.parameters],
  );
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const [state, dispatch] = useReducer(reducer, items, (initialItems) => (
    createInitialState(initialItems, parameters.seed)
  ));
  const stateRef = useRef(state);
  const stageRef = useRef(null);
  const figureRef = useRef(null);
  const gestureRef = useRef({ ...INITIAL_GESTURE });
  const frameRef = useRef(0);
  const timeoutRef = useRef(0);
  const suppressClickRef = useRef(false);
  const previousSeedRef = useRef(parameters.seed);
  const [nearby, setNearby] = useState(false);
  const [intersecting, setIntersecting] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(() => (
    typeof document === 'undefined' || document.visibilityState === 'visible'
  ));
  const [failedIds, setFailedIds] = useState(() => new Set());
  const fullMotion = motionProfile !== 'reduced';
  const visibleIds = state.order.slice(0, ABOUT_INTERACTIVE_STACK_VISIBLE_COUNT);
  const slots = useMemo(
    () => createAboutInteractiveStackSlots(visibleIds.length, parameters),
    [parameters, visibleIds.length],
  );

  useLayoutEffect(() => { stateRef.current = state; }, [state]);

  const clearScheduledWork = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    frameRef.current = 0;
    timeoutRef.current = 0;
  }, []);

  const releasePointer = useCallback(() => {
    const stage = stageRef.current;
    const pointerId = gestureRef.current.pointerId;
    gestureRef.current = { ...INITIAL_GESTURE };
    if (stage && pointerId != null && stage.hasPointerCapture?.(pointerId)) {
      stage.releasePointerCapture(pointerId);
    }
  }, []);

  const resetDragVariables = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.style.setProperty('--stack-drag-x', '0px');
    stage.style.setProperty('--stack-drag-rotation', '0deg');
    stage.style.setProperty('--stack-drag-progress', '0');
    stage.style.setProperty('--stack-drag-opacity', '1');
    stage.style.setProperty('--stack-drag-blur', '0px');
    stage.style.setProperty('--stack-drag-scale', '1');
  }, []);

  const finishPhase = useCallback((phase) => {
    clearScheduledWork();
    resetDragVariables();
    const current = stateRef.current;
    const queuedDirection = current.queuedDirection;
    dispatch({ type: phase === 'departing' ? 'finish-departure' : 'finish-settle' });
    if (phase === 'departing' && queuedDirection) {
      frameRef.current = requestAnimationFrame(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const rect = stage.getBoundingClientRect();
        stage.style.setProperty('--stack-depart-x', `${queuedDirection > 0 ? -(rect.width + 32) : rect.width + 32}px`);
        stage.style.setProperty('--stack-active-duration', `${parameters.transitionMs}ms`);
        dispatch({ type: 'navigate', direction: queuedDirection, immediate: !fullMotion });
      });
    }
  }, [clearScheduledWork, fullMotion, parameters.transitionMs, resetDragVariables]);

  const beginNavigation = useCallback((direction, { fromGesture = false, velocity = 0 } = {}) => {
    const current = stateRef.current;
    if (current.order.length <= 1) return;
    const gestureCanCommit = fromGesture
      && (current.phase === 'pending-pointer' || current.phase === 'dragging');
    if (current.phase !== 'idle' && !gestureCanCommit) {
      dispatch({ type: 'navigate', direction, immediate: false });
      return;
    }
    if (!fullMotion) {
      dispatch({ type: 'navigate', direction, immediate: true });
      return;
    }
    const stage = stageRef.current;
    const card = stage?.querySelector('[data-stack-depth="0"]');
    if (stage && card) {
      const stageRect = stage.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const distance = direction > 0
        ? -(cardRect.right - stageRect.left + 24)
        : stageRect.right - cardRect.left + 24;
      stage.style.setProperty('--stack-depart-x', `${distance}px`);
      stage.style.setProperty('--stack-transition-ms', `${parameters.transitionMs}ms`);
    }
    const durationMs = Math.max(
      180,
      Math.min(parameters.transitionMs, parameters.transitionMs / (1 + Math.max(0, velocity))),
    );
    stage?.style.setProperty('--stack-active-duration', `${durationMs}ms`);
    dispatch({ type: 'navigate', direction, immediate: false, fromGesture, durationMs });
  }, [fullMotion, parameters.transitionMs]);

  useEffect(() => {
    if (state.phase !== 'departing' && state.phase !== 'settling') return undefined;
    const stage = stageRef.current;
    const card = stage?.querySelector('[data-stack-depth="0"]');
    if (!stage || !card) {
      finishPhase(state.phase);
      return undefined;
    }
    const duration = state.phase === 'settling'
      ? Math.min(240, parameters.transitionMs * 0.65)
      : state.durationMs || parameters.transitionMs;
    stage.style.setProperty('--stack-active-duration', `${duration}ms`);
    let finished = false;
    const finish = (event) => {
      if (finished || (event && (event.target !== card || event.propertyName !== 'transform'))) return;
      finished = true;
      finishPhase(state.phase);
    };
    card.addEventListener('transitionend', finish);
    timeoutRef.current = window.setTimeout(() => finish(), duration + 90);
    if (state.phase === 'settling') {
      frameRef.current = requestAnimationFrame(resetDragVariables);
    }
    return () => card.removeEventListener('transitionend', finish);
  }, [finishPhase, parameters.transitionMs, resetDragVariables, state.durationMs, state.phase]);

  useEffect(() => {
    const phase = stateRef.current.phase;
    if (phase === 'departing') {
      finishPhase('departing');
    } else if (phase !== 'idle') {
      clearScheduledWork();
      releasePointer();
      resetDragVariables();
      dispatch({ type: 'cancel' });
    }
  }, [clearScheduledWork, finishPhase, fullMotion, releasePointer, resetDragVariables]);

  useEffect(() => {
    const nextSeed = parameters.seed;
    if (previousSeedRef.current !== nextSeed) {
      clearScheduledWork();
      releasePointer();
      resetDragVariables();
      previousSeedRef.current = nextSeed;
      dispatch({ type: 'reset', order: createAboutInteractiveStackOrder(items, nextSeed) });
      return;
    }
    dispatch({
      type: 'reconcile',
      order: reconcileAboutInteractiveStackOrder(stateRef.current.order, items, nextSeed),
    });
  }, [clearScheduledWork, items, parameters.seed, releasePointer, resetDragVariables]);

  useEffect(() => {
    const target = figureRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') {
      const fallbackFrame = requestAnimationFrame(() => {
        setNearby(true);
        setIntersecting(true);
      });
      return () => cancelAnimationFrame(fallbackFrame);
    }
    const root = scrollportRef?.current || null;
    const prefetchObserver = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setNearby(true); },
      { root, rootMargin: '100% 0px' },
    );
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => setIntersecting(entry.isIntersecting),
      { root, threshold: 0.01 },
    );
    prefetchObserver.observe(target);
    visibilityObserver.observe(target);
    return () => {
      prefetchObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, [scrollportRef]);

  useEffect(() => {
    const cancelTransientInteraction = () => {
      const phase = stateRef.current.phase;
      if (phase === 'departing') {
        finishPhase('departing');
        return;
      }
      if (phase === 'idle') return;
      if (gestureRef.current.locked || phase === 'dragging') {
        suppressClickRef.current = true;
      }
      clearScheduledWork();
      releasePointer();
      resetDragVariables();
      dispatch({ type: 'cancel' });
    };
    const onVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setDocumentVisible(visible);
      if (!visible) cancelTransientInteraction();
    };
    const onResize = () => {
      if (!['pending-pointer', 'dragging', 'settling'].includes(stateRef.current.phase)) return;
      cancelTransientInteraction();
    };
    const onWindowBlur = () => cancelTransientInteraction();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('blur', onWindowBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [clearScheduledWork, finishPhase, releasePointer, resetDragVariables]);

  useEffect(() => () => {
    clearScheduledWork();
    releasePointer();
    resetDragVariables();
  }, [clearScheduledWork, releasePointer, resetDragVariables]);

  const writeDragFrame = useCallback(() => {
    frameRef.current = 0;
    const stage = stageRef.current;
    if (!stage) return;
    const { dx } = gestureRef.current;
    const width = Math.max(1, stage.getBoundingClientRect().width);
    const rotation = Math.max(-8, Math.min(8, (dx / width) * 12));
    const distanceRatio = Math.abs(dx) / width;
    const exitProgress = Math.max(0, Math.min(1, (distanceRatio - 0.05) / 0.16));
    stage.style.setProperty('--stack-drag-x', `${dx}px`);
    stage.style.setProperty('--stack-drag-rotation', `${rotation}deg`);
    stage.style.setProperty('--stack-drag-progress', exitProgress.toFixed(4));
    stage.style.setProperty('--stack-drag-opacity', (1 - exitProgress * 0.94).toFixed(4));
    stage.style.setProperty('--stack-drag-blur', `${(exitProgress * 12).toFixed(2)}px`);
    stage.style.setProperty('--stack-drag-scale', (1 + exitProgress * 0.035).toFixed(4));
  }, []);

  const onPointerDown = (event) => {
    if (stateRef.current.phase !== 'idle' || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    suppressClickRef.current = false;
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      locked: false,
      samples: [{ x: event.clientX, time: event.timeStamp }],
    };
    dispatch({ type: 'pointer-pending' });
  };

  const onPointerMove = (event) => {
    const gesture = gestureRef.current;
    if (gesture.pointerId !== event.pointerId) return;
    gesture.dx = event.clientX - gesture.startX;
    gesture.dy = event.clientY - gesture.startY;
    if (stateRef.current.phase === 'pending-pointer') {
      const distance = Math.hypot(gesture.dx, gesture.dy);
      if (distance < 8) return;
      if (Math.abs(gesture.dx) < 1.25 * Math.abs(gesture.dy)) {
        gestureRef.current = { ...INITIAL_GESTURE };
        dispatch({ type: 'cancel' });
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      gesture.locked = true;
      dispatch({ type: 'dragging' });
    }
    if (stateRef.current.phase === 'dragging' || Math.abs(gesture.dx) >= 8) {
      event.preventDefault();
      gesture.samples.push({ x: event.clientX, time: event.timeStamp });
      gesture.samples = gesture.samples.filter((sample) => event.timeStamp - sample.time <= 100);
      if (!frameRef.current) frameRef.current = requestAnimationFrame(writeDragFrame);
    }
  };

  const finishPointer = useCallback((event, cancelled = false) => {
    const gesture = gestureRef.current;
    if (gesture.pointerId !== event.pointerId) return;
    const phase = stateRef.current.phase;
    const samples = gesture.samples.filter((sample) => event.timeStamp - sample.time <= 100);
    const oldest = samples[0];
    const newest = samples.at(-1);
    const velocity = oldest && newest && newest.time > oldest.time
      ? Math.abs((newest.x - oldest.x) / (newest.time - oldest.time))
      : 0;
    const stageWidth = Math.max(1, stageRef.current?.getBoundingClientRect().width || 1);
    const wasDragging = gesture.locked || phase === 'dragging';
    const committed = !cancelled && wasDragging && (
      Math.abs(gesture.dx) >= stageWidth * 0.22
      || (Math.abs(gesture.dx) >= 32 && velocity >= 0.45)
    );
    releasePointer();
    if (wasDragging) suppressClickRef.current = true;
    if (committed) {
      beginNavigation(gesture.dx < 0 ? 1 : -1, { fromGesture: true, velocity });
    } else if (wasDragging) {
      dispatch({ type: 'settling' });
    } else {
      dispatch({ type: 'cancel' });
    }
  }, [beginNavigation, releasePointer]);

  useEffect(() => {
    const finishGlobalPointer = (event) => finishPointer(event);
    const cancelGlobalPointer = (event) => finishPointer(event, true);
    window.addEventListener('pointerup', finishGlobalPointer, true);
    window.addEventListener('pointercancel', cancelGlobalPointer, true);
    return () => {
      window.removeEventListener('pointerup', finishGlobalPointer, true);
      window.removeEventListener('pointercancel', cancelGlobalPointer, true);
    };
  }, [finishPointer]);

  const activeItem = itemMap.get(state.order[0]);
  const activePosition = Math.max(0, items.findIndex((item) => item.id === activeItem?.id)) + 1;
  const instructionsId = `${module.id}-instructions`;
  const statusId = `${module.id}-status`;
  const enabled = state.order.length > 1;

  return (
    <figure
      ref={figureRef}
      className="about-interactive-stack"
      aria-label={module.label || 'Project impressions'}
      data-editorial-line
    >
      <button
        ref={stageRef}
        type="button"
        className="about-interactive-stack__stage"
        data-stack-phase={state.phase}
        aria-disabled={enabled ? undefined : 'true'}
        aria-label={enabled ? 'Show another project impression' : module.label || 'Project impression'}
        aria-describedby={`${instructionsId} ${statusId}`}
        style={{
          '--stack-padding-pct': parameters.stagePaddingPct,
          '--stack-card-width-pct': parameters.cardWidthPct,
        }}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          beginNavigation(1);
        }}
        onKeyDown={(event) => {
          if (event.repeat) return;
          suppressClickRef.current = false;
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            beginNavigation(-1);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            beginNavigation(1);
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => finishPointer(event)}
        onPointerCancel={(event) => finishPointer(event, true)}
        onLostPointerCapture={(event) => {
          if (gestureRef.current.pointerId === event.pointerId) finishPointer(event, true);
        }}
      >
        <span className="about-interactive-stack__plane">
          {visibleIds.map((id, depth) => {
            const item = itemMap.get(id);
            const slot = slots[depth];
            if (!item || !slot) return null;
            const failed = failedIds.has(id);
            return (
              <span
                className="about-interactive-stack__card"
                data-stack-depth={depth}
                data-stack-item-id={id}
                aria-hidden={depth === 0 ? undefined : 'true'}
                key={id}
                style={{
                  '--stack-depth': depth,
                  '--stack-slot-x': `${slot.xPct}%`,
                  '--stack-slot-y': `${slot.yPct}%`,
                  '--stack-slot-rotation': `${slot.rotationDeg}deg`,
                  '--stack-slot-scale': slot.scale,
                }}
              >
                <StackMedia
                  item={item}
                  active={depth === 0}
                  nearby={nearby}
                  intersecting={intersecting}
                  documentVisible={documentVisible}
                  fullMotion={fullMotion}
                  failed={failed}
                  onError={() => setFailedIds((current) => new Set(current).add(id))}
                />
              </span>
            );
          })}
        </span>
      </button>
      <span id={instructionsId} className="about-narrative-visually-hidden">
        Activate to advance. Use the left and right arrow keys to move backward or forward. Drag horizontally to throw the top image.
      </span>
      <span id={statusId} className="about-narrative-visually-hidden" aria-live="polite" aria-atomic="true">
        Project impression {activePosition} of {items.length}: {activeItem?.alt || module.label || 'Project impression'}.
      </span>
    </figure>
  );
}
