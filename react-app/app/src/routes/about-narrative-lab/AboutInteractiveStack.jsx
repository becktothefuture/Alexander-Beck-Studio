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

const DRAG_LOCK_DISTANCE_PX = 6;

function getDragCommitDistance(rect) {
  return Math.max(28.8, Math.min(51.2, Math.min(rect.width, rect.height) * 0.104));
}

function createInitialState(items, seed) {
  return {
    order: createAboutInteractiveStackOrder(items, seed),
    phase: 'idle',
    motionId: 0,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'reset':
      return { ...state, order: action.order, phase: 'idle', motionId: state.motionId + 1 };
    case 'reconcile':
      return { ...state, order: action.order };
    case 'pointer-pending':
      return state.phase === 'idle' ? { ...state, phase: 'pending-pointer' } : state;
    case 'dragging':
      return state.phase === 'pending-pointer' ? { ...state, phase: 'dragging' } : state;
    case 'settling':
      return { ...state, phase: 'settling', motionId: state.motionId + 1 };
    case 'navigate':
      if (state.order.length <= 1) return state;
      return {
        ...state,
        order: action.direction > 0
          ? advanceAboutInteractiveStackOrder(state.order)
          : retreatAboutInteractiveStackOrder(state.order),
        phase: 'idle',
        motionId: state.motionId + 1,
      };
    case 'finish-settle':
      return action.motionId === state.motionId ? { ...state, phase: 'idle' } : state;
    case 'cancel':
      return { ...state, phase: 'idle', motionId: state.motionId + 1 };
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

  const dispatchAction = useCallback((action) => {
    stateRef.current = reducer(stateRef.current, action);
    dispatch(action);
  }, []);

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
    stage.style.setProperty('--stack-drag-y', '0px');
    stage.style.setProperty('--stack-drag-rotation', '0deg');
    stage.style.setProperty('--stack-drag-progress', '0');
    stage.style.setProperty('--stack-drag-opacity', '1');
    stage.style.setProperty('--stack-drag-blur', '0px');
    stage.style.setProperty('--stack-drag-scale', '1');
  }, []);

  const beginNavigation = useCallback((direction, { preserveDragVisual = false } = {}) => {
    if (stateRef.current.order.length <= 1) return;
    clearScheduledWork();
    dispatchAction({ type: 'navigate', direction });
    if (preserveDragVisual) {
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        resetDragVariables();
      });
    } else {
      resetDragVariables();
    }
  }, [clearScheduledWork, dispatchAction, resetDragVariables]);

  useEffect(() => {
    if (state.phase !== 'settling') return undefined;
    const stage = stageRef.current;
    const card = stage?.querySelector('[data-stack-depth="0"]');
    if (!stage || !card) {
      dispatchAction({ type: 'finish-settle', motionId: state.motionId });
      return undefined;
    }
    const duration = fullMotion ? Math.min(180, parameters.transitionMs * 0.5) : 0;
    stage.style.setProperty('--stack-active-duration', `${duration}ms`);
    let finished = false;
    const finish = (event) => {
      if (finished || (event && (event.target !== card || event.propertyName !== 'transform'))) return;
      finished = true;
      clearScheduledWork();
      resetDragVariables();
      dispatchAction({ type: 'finish-settle', motionId: state.motionId });
    };
    card.addEventListener('transitionend', finish);
    timeoutRef.current = window.setTimeout(() => finish(), duration + 50);
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      resetDragVariables();
    });
    return () => card.removeEventListener('transitionend', finish);
  }, [clearScheduledWork, dispatchAction, fullMotion, parameters.transitionMs, resetDragVariables, state.motionId, state.phase]);

  useEffect(() => {
    const phase = stateRef.current.phase;
    if (phase !== 'idle') {
      clearScheduledWork();
      releasePointer();
      resetDragVariables();
      dispatchAction({ type: 'cancel' });
    }
  }, [clearScheduledWork, dispatchAction, fullMotion, releasePointer, resetDragVariables]);

  useEffect(() => {
    const nextSeed = parameters.seed;
    if (previousSeedRef.current !== nextSeed) {
      clearScheduledWork();
      releasePointer();
      resetDragVariables();
      previousSeedRef.current = nextSeed;
      dispatchAction({ type: 'reset', order: createAboutInteractiveStackOrder(items, nextSeed) });
      return;
    }
    dispatchAction({
      type: 'reconcile',
      order: reconcileAboutInteractiveStackOrder(stateRef.current.order, items, nextSeed),
    });
  }, [clearScheduledWork, dispatchAction, items, parameters.seed, releasePointer, resetDragVariables]);

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
      if (phase === 'idle') return;
      if (gestureRef.current.locked || phase === 'dragging') {
        suppressClickRef.current = true;
      }
      clearScheduledWork();
      releasePointer();
      resetDragVariables();
      dispatchAction({ type: 'cancel' });
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
  }, [clearScheduledWork, dispatchAction, releasePointer, resetDragVariables]);

  useEffect(() => () => {
    clearScheduledWork();
    releasePointer();
    resetDragVariables();
  }, [clearScheduledWork, releasePointer, resetDragVariables]);

  const writeDragFrame = useCallback(() => {
    frameRef.current = 0;
    const stage = stageRef.current;
    if (!stage) return;
    const { dx, dy } = gestureRef.current;
    const rect = stage.getBoundingClientRect();
    const distance = Math.hypot(dx, dy);
    const commitDistance = getDragCommitDistance(rect);
    const rotation = Math.max(-8, Math.min(8, ((dx - dy * 0.15) / Math.max(1, rect.width)) * 14));
    const exitProgress = Math.max(0, Math.min(
      1,
      (distance - DRAG_LOCK_DISTANCE_PX) / Math.max(1, commitDistance - DRAG_LOCK_DISTANCE_PX),
    ));
    stage.style.setProperty('--stack-drag-x', `${dx}px`);
    stage.style.setProperty('--stack-drag-y', `${dy}px`);
    stage.style.setProperty('--stack-drag-rotation', `${rotation}deg`);
    stage.style.setProperty('--stack-drag-progress', exitProgress.toFixed(4));
    stage.style.setProperty('--stack-drag-opacity', (1 - exitProgress).toFixed(4));
    stage.style.setProperty('--stack-drag-blur', `${(exitProgress * 14).toFixed(2)}px`);
    stage.style.setProperty('--stack-drag-scale', (1 - exitProgress * 0.025).toFixed(4));
  }, []);

  const onPointerDown = (event) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (stateRef.current.phase === 'settling') {
      clearScheduledWork();
      resetDragVariables();
      dispatchAction({ type: 'cancel' });
    } else if (stateRef.current.phase !== 'idle') {
      return;
    }
    suppressClickRef.current = false;
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      locked: false,
      samples: [{ x: event.clientX, y: event.clientY, time: event.timeStamp }],
    };
    dispatchAction({ type: 'pointer-pending' });
  };

  const onPointerMove = (event) => {
    const gesture = gestureRef.current;
    if (gesture.pointerId !== event.pointerId) return;
    gesture.dx = event.clientX - gesture.startX;
    gesture.dy = event.clientY - gesture.startY;
    if (stateRef.current.phase === 'pending-pointer') {
      const distance = Math.hypot(gesture.dx, gesture.dy);
      if (distance < DRAG_LOCK_DISTANCE_PX) return;
      if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
      gesture.locked = true;
      dispatchAction({ type: 'dragging' });
    }
    if (gesture.locked) {
      event.preventDefault();
      gesture.samples.push({ x: event.clientX, y: event.clientY, time: event.timeStamp });
      gesture.samples = gesture.samples.filter((sample) => event.timeStamp - sample.time <= 100);
      if (!frameRef.current) frameRef.current = requestAnimationFrame(writeDragFrame);
    }
  };

  const finishPointer = useCallback((event, cancelled = false) => {
    const gesture = gestureRef.current;
    if (gesture.pointerId !== event.pointerId) return;
    const phase = stateRef.current.phase;
    gesture.dx = event.clientX - gesture.startX;
    gesture.dy = event.clientY - gesture.startY;
    gesture.samples.push({ x: event.clientX, y: event.clientY, time: event.timeStamp });
    const samples = gesture.samples.filter((sample) => event.timeStamp - sample.time <= 100);
    const oldest = samples[0];
    const newest = samples.at(-1);
    const velocity = oldest && newest && newest.time > oldest.time
      ? Math.hypot(newest.x - oldest.x, newest.y - oldest.y) / (newest.time - oldest.time)
      : 0;
    const stageRect = stageRef.current?.getBoundingClientRect() || { width: 1, height: 1 };
    const commitDistance = getDragCommitDistance(stageRect);
    const distance = Math.hypot(gesture.dx, gesture.dy);
    const wasDragging = gesture.locked || phase === 'dragging';
    const committed = !cancelled && wasDragging && (
      distance >= commitDistance
      || (distance >= Math.max(12, commitDistance * 0.5) && velocity >= 0.35)
    );
    releasePointer();
    if (wasDragging) suppressClickRef.current = true;
    if (committed) {
      beginNavigation(1, { preserveDragVisual: true });
    } else if (wasDragging) {
      dispatchAction({ type: 'settling' });
    } else {
      dispatchAction({ type: 'cancel' });
    }
  }, [beginNavigation, dispatchAction, releasePointer]);

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
        Activate to advance. Use the left and right arrow keys to move backward or forward. Drag the top image in any direction to dismiss it.
      </span>
      <span id={statusId} className="about-narrative-visually-hidden" aria-live="polite" aria-atomic="true">
        Project impression {activePosition} of {items.length}: {activeItem?.alt || module.label || 'Project impression'}.
      </span>
    </figure>
  );
}
