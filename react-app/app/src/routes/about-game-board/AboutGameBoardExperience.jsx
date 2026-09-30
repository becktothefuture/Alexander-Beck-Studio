import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import aboutContent from 'virtual:abs-content/about';
import homeContent from 'virtual:abs-content/home';
import { CopyEmailAction } from '../../components/app/CopyEmailAction.jsx';
import { CvDownloadAction } from '../../components/app/CvDownloadAction.jsx';
import { LinkedInAction } from '../../components/app/LinkedInAction.jsx';
import { useSimulationPalette } from '../../hooks/useSimulationPalette.js';
import { THEME_CHANGE_EVENT } from '../../lib/theme-state.js';
import {
  createSmoothScroll, createSmoothScrollMediaQueries, shouldUseNativeSmoothScroll,
} from '../../lib/smooth-scroll.js';
import {
  BALL_DYNAMICS_CHANGE_EVENT,
  ballDynamicsFromRuntimeConfig,
} from '../../lib/ballDynamics.js';
import { loadRuntimeConfig } from '../../legacy/modules/utils/runtime-config.js';
import {
  boardArchitectureCssVariables,
  boardArchitecturePaletteFromRuntimeConfig,
} from './boardArchitecturePalette.js';
import {
  boardBallPresentationFromRuntimeConfig,
  resolveBoardBallRadiusScale,
} from './boardBallPresentation.js';
import { OPENING_COPY } from './boardCopy.js';
import { boardEditorialGridSlot, boardTextGridSlot } from './boardTextGrid.js';
import { BoardEditorial } from './BoardEditorial.jsx';
import { createBoardPhysics } from './boardPhysics.js';
import { loadBoardRigidBodyBackend } from './boardRigidBodyWorld.js';
import { installBoardDrumArt } from './boardDrums.js';
import { installBoardHandoffArt } from './boardHandoffs.js';
import { installBoardArchitectureLineWeight } from './boardArchitectureWeight.js';
import { createBoardGrid, gridHandoffProgress } from './boardGrid.js';
import {
  BOARD_HANDOFF_PHASES,
  boardHandoffPhaseState,
  createBoardGridHandoffScene,
} from './boardGridHandoffScene.js';
import {
  createBoardAuthoredEndingScene,
  measureBoardEndingOpening,
} from './boardAuthoredEnding.js';
import { BOARD_BAND_JOURNEY } from './boardBandJourney.js';
import { createBoardLayout } from './boardLayout.js';
import { installQuietIntervalGeometry } from './boardQuietIntervals.js';
import { createBoardInventory } from './boardInventory.js';
import { boardMechanismProgress } from './boardScrollMotion.js';
import { createBoardRenderer } from './boardRenderer.js';
import {
  createBoardFramePacer, boardOwnsMountedSurface, boardSceneActivity, boardShouldKeepMachineWarm,
} from './boardSceneLifecycle.js';
import { findTextArchitectureOverlaps } from './boardTextSafety.js';
import {
  boardScrollCueOpacity,
} from './boardTextPresentation.js';
import {
  BOARD_2D_END_Y,
  BOARD_WIDTH,
  decodeBalls,
  GRID_START_Y,
  MECHANISM,
  RESERVOIR_GATE_Y,
} from './boardScene.js';
import './about-game-board.css';

const ASSET_ROOT = '/models/about-game-board';
const fieldById = new Map(aboutContent.tracks.text.fields.map(field => [field.id, field]));
const copy = id => fieldById.get(id);
const BALL_VIEWPORT_QUERY = [
  '(max-width: 600px)',
  '(max-width: 900px) and (max-height: 600px)',
  '(hover: none) and (pointer: coarse)',
].join(', ');

function ScrollIndicator({ cueRef }) {
  return <div ref={cueRef} className="about-board-scroll-ui" role="progressbar"
    aria-label="About story progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
    <span className="about-board-scroll-indicator" aria-hidden="true">
      <span className="about-board-scroll-indicator__track" />
      <span className="about-board-scroll-indicator__ball" />
    </span>

  </div>;
}

export function AboutGameBoardExperience({ routeContentId = 'about' }) {
  const [source, setSource] = useState(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [settledOpening, setSettledOpening] = useState(null);
  // The machine installs live mechanism layers into this SVG. Keep React's
  // HTML prop stable across palette/layout renders, so it cannot replace those
  // layers with the original storyboard while their physics is still running.
  const svgMarkup = useMemo(() => ({ __html: source?.svg || '' }), [source?.svg]);
  const [error, setError] = useState(null);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [mobileBallViewport, setMobileBallViewport] = useState(
    () => window.matchMedia(BALL_VIEWPORT_QUERY).matches,
  );
  const [readerMode, setReaderMode] = useState(false);
  const [quietHeights, setQuietHeights] = useState({});
  const [boardWidth, setBoardWidth] = useState(() => Math.max(1, window.innerWidth - 20));
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
  const [authoredCanvasGeneration, setAuthoredCanvasGeneration] = useState(0);
  const narrow = compact && boardWidth <= 340;
  const layout = useMemo(() => ({ ...createBoardLayout(compact,
    { viewportHeight, boardWidth, quietHeights }), readerMode, narrow, mobile }),
    [compact, readerMode, narrow, mobile, viewportHeight, boardWidth, quietHeights]);
  const palette = useSimulationPalette();
  const paletteRef = useRef(palette);
  const scrollRef = useRef(null);
  const viewportMeasureRef = useRef(null);
  const worldRef = useRef(null);
  const artRef = useRef(null);
  const canvasRef = useRef(null);
  const threeStageRef = useRef(null);
  const threeCanvasRef = useRef(null);
  const authoredCanvasRef = useRef(null);
  const endingRef = useRef(null);
  const cueRef = useRef(null);
  const physicsRef = useRef(null);
  const rendererRef = useRef(null);
  const threeRef = useRef(null);
  const drawRef = useRef(() => {});
  const textSafetyRef = useRef([]);
  const userHasScrolledRef = useRef(false);
  const lastScrollAnchorRef = useRef(null);
  const pendingReaderAnchorRef = useRef(null);

  // Publish after React commits the readiness attribute. Direct loads and
  // Button Bar transitions use this same contract, including readable errors.
  useEffect(() => {
    if (sceneReady || error) window.dispatchEvent(new CustomEvent('abs:about-scene-ready'));
  }, [sceneReady, error]);

  const rememberScrollAnchor = useCallback(() => {
    const scrollport = scrollRef.current;
    if (!scrollport) return;
    const viewport = scrollport.getBoundingClientRect();
    const viewportCentre = viewport.top + viewport.height / 2;
    let closest = null;
    let closestDistance = Infinity;
    for (const element of scrollport.querySelectorAll('[data-board-text-slot]')) {
      const rect = element.getBoundingClientRect();
      if (rect.bottom <= viewport.top || rect.top >= viewport.bottom) continue;
      const distance = Math.abs((rect.top + rect.bottom) / 2 - viewportCentre);
      if (distance >= closestDistance) continue;
      closest = element;
      closestDistance = distance;
    }
    const range = scrollport.scrollHeight - scrollport.clientHeight;
    lastScrollAnchorRef.current = {
      slot: closest?.dataset.boardTextSlot || null,
      offset: closest ? closest.getBoundingClientRect().top - viewport.top : null,
      progress: range > 0 ? scrollport.scrollTop / range : 0,
    };
  }, []);

  const enableReaderMode = useCallback(() => {
    const scrollport = scrollRef.current;
    if (scrollport && userHasScrolledRef.current && pendingReaderAnchorRef.current === null) {
      if (!lastScrollAnchorRef.current) rememberScrollAnchor();
      pendingReaderAnchorRef.current = lastScrollAnchorRef.current
        ? { ...lastScrollAnchorRef.current }
        : null;
    }
    setReaderMode(true);
  }, [rememberScrollAnchor]);

  useEffect(() => {
    if (!readerMode || pendingReaderAnchorRef.current === null) return undefined;
    let frameId = requestAnimationFrame(() => {
      frameId = requestAnimationFrame(() => {
        const scrollport = scrollRef.current;
        const anchor = pendingReaderAnchorRef.current;
        pendingReaderAnchorRef.current = null;
        if (!scrollport || !anchor) return;
        const target = [...scrollport.querySelectorAll('[data-board-text-slot]')]
          .find(element => element.dataset.boardTextSlot === anchor.slot);
        if (target && anchor.offset !== null) {
          const viewport = scrollport.getBoundingClientRect();
          scrollport.scrollTop += target.getBoundingClientRect().top - viewport.top - anchor.offset;
          return;
        }
        const range = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
        scrollport.scrollTop = anchor.progress * range;
      });
    });
    return () => cancelAnimationFrame(frameId);
  }, [readerMode]);

  useEffect(() => {
    const compactQuery = window.matchMedia('(max-width: 900px)');
    const mobileQuery = window.matchMedia('(max-width: 760px)');
    const ballQuery = window.matchMedia(BALL_VIEWPORT_QUERY);
    const onCompactChange = event => setCompact(event.matches);
    const onMobileChange = event => setMobile(event.matches);
    const onBallViewportChange = event => setMobileBallViewport(event.matches);
    compactQuery.addEventListener('change', onCompactChange);
    mobileQuery.addEventListener('change', onMobileChange);
    ballQuery.addEventListener('change', onBallViewportChange);
    return () => {
      compactQuery.removeEventListener('change', onCompactChange);
      mobileQuery.removeEventListener('change', onMobileChange);
      ballQuery.removeEventListener('change', onBallViewportChange);
    };
  }, []);

  useEffect(() => {
    const checkTextSpace = () => {
      const width = scrollRef.current?.clientWidth || window.innerWidth;
      const textSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      const needsReader = textSize / width > 0.07;
      if (needsReader) enableReaderMode();
      else if (!userHasScrolledRef.current) setReaderMode(false);
    };
    const sizeObserver = new ResizeObserver(checkTextSpace);
    const styleObserver = new MutationObserver(checkTextSpace);
    if (scrollRef.current) sizeObserver.observe(scrollRef.current);
    styleObserver.observe(document.documentElement,
      { attributes: true, attributeFilter: ['style', 'class'] });
    checkTextSpace();
    window.addEventListener('resize', checkTextSpace);
    return () => {
      sizeObserver.disconnect();
      styleObserver.disconnect();
      window.removeEventListener('resize', checkTextSpace);
    };
  }, [enableReaderMode]);

  useEffect(() => {
    paletteRef.current = palette;
    physicsRef.current?.setPalette(palette);
    threeRef.current?.setPalette(palette);
    drawRef.current();
  }, [palette]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(`${ASSET_ROOT}/geometry.svg`, { signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error(`Geometry request failed: ${response.status}`);
        return response.text();
      }),
      fetch(`${ASSET_ROOT}/balls.json`, { signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error(`Ball request failed: ${response.status}`);
        return response.json();
      }),
      loadRuntimeConfig(),
      loadBoardRigidBodyBackend(),
    ]).then(([svg, rows, runtimeConfig]) => {
      if (!svg.includes('viewBox="0 0 960 14140"')) throw new Error('Unexpected board geometry.');
      setSource({ svg, balls: decodeBalls(rows),
        ballDynamics: ballDynamicsFromRuntimeConfig(runtimeConfig),
        ballPresentation: boardBallPresentationFromRuntimeConfig(runtimeConfig),
        architectureStyle: boardArchitectureCssVariables(
          boardArchitecturePaletteFromRuntimeConfig(runtimeConfig),
        ) });
    }).catch(reason => {
      if (reason.name !== 'AbortError') setError(reason);
    });
    return () => controller.abort();
  }, []);

  const radiusScale = useMemo(() => resolveBoardBallRadiusScale(
    source?.ballPresentation,
    { isMobileDevice: mobileBallViewport, boardWidth },
  ), [source?.ballPresentation, mobileBallViewport, boardWidth]);
  const inventory = useMemo(() => source
    ? createBoardInventory(source.balls, radiusScale, { reservoirTop: layout.reservoirTop }) : null,
  [source, radiusScale, layout.reservoirTop]);
  // Figma's opening supplies the preferred visible depth above the funnel.
  const reservoirReadingHeight = Math.min(viewportHeight / 2, mobile ? 420.177094 : 322.635406);
  // Tall windows hold more Home-sized balls. Limit the overlap using the
  // settled pile so the full inventory cannot cover the introduction.
  const pileClearancePx = inventory && settledOpening?.inventory === inventory
    ? (settledOpening.surfaceY - inventory.radius - layout.reservoirTop) * boardWidth / BOARD_WIDTH
    : Infinity;
  const openingLiftPx = Math.max(0, Math.min(pileClearancePx,
    (800 - layout.reservoirTop) * boardWidth / BOARD_WIDTH - reservoirReadingHeight));

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return undefined;
    const measure = () => {
      // A route being detached can briefly report zero. Keep its last real
      // scale instead of rebuilding Home-sized balls against a one-pixel board.
      const measuredWidth = world.clientWidth;
      if (measuredWidth > 0) setBoardWidth(width => Math.abs(width - measuredWidth) > .5
        ? measuredWidth : width);
      // Small viewport units stay stable while mobile browser chrome hides.
      // Its animation must not rebuild the physical inventory during a scroll.
      const stableHeight = viewportMeasureRef.current?.clientHeight;
      if (stableHeight > 0) setViewportHeight(stableHeight);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(world);
    if (scrollRef.current) observer.observe(scrollRef.current);
    if (viewportMeasureRef.current) observer.observe(viewportMeasureRef.current);
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!source || !scrollRef.current || !worldRef.current || !artRef.current
      || !canvasRef.current || !threeStageRef.current || !threeCanvasRef.current
      || !authoredCanvasRef.current || !endingRef.current) return;
    const scrollport = scrollRef.current;
    const world = worldRef.current;
    const threeStage = threeStageRef.current;
    const ending = endingRef.current;
    let authoredCanvas = authoredCanvasRef.current;
    const svg = artRef.current.querySelector('svg');
    const canvas = canvasRef.current;
    if (!svg) return;
    setSceneReady(false);
    let firstPaintReady = false;
    layout.applyToSvg(svg);
    // Authored SVG rails feed both drawing and collision import. Keep their
    // reduced weight identical before runtime fixtures and physics are built.
    const restoreLineWeight = installBoardArchitectureLineWeight(svg);
    // One architecture in code and Figma. Size its openings for the narrowest
    // supported 320px viewport (300px inner window), rather than redrawing
    // each mechanism at every breakpoint. Balls keep Home's screen size.
    const clearanceRadius = Math.max(inventory.radius, 13 * resolveBoardBallRadiusScale(
      source.ballPresentation, { isMobileDevice: true, boardWidth: 300 },
    ));
    const drumArt = installBoardDrumArt(svg, { ballRadius: clearanceRadius });
    const handoffArt = installBoardHandoffArt(svg,
      { ballRadius: clearanceRadius, reservoirBallRadius: inventory.radius, drums: drumArt.specs,
        compact: layout.compact, narrow: layout.narrow, mobile: layout.mobile });
    const grid = createBoardGrid(svg, source.balls);
    const restoreQuietGeometry = installQuietIntervalGeometry(svg, layout.placement, inventory.radius);
    const gridState = { ...grid, entries: grid.entries.map(entry => ({ ...entry,
      flatY: layout.placeY(entry.flatY), bentY: layout.placeY(entry.bentY) })), progress: 0, socketShadowOpacity: 1,
      occupied: new Map([[grid.entries[0].id, { sourceId: grid.entries[0].id }]]),
      capturing: new Set() };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollMediaQueries = createSmoothScrollMediaQueries();
    let smoothScroll = null;
    let physicsWorld;
    try {
      physicsWorld = createBoardPhysics(svg, source.balls, paletteRef.current,
        { compact: layout.compact, drumArt, ballDynamics: source.ballDynamics,
          grid: gridState, radiusScale, inventory, handoffArt, originY: layout.reservoirTop,
          placement: layout.placement });
    } catch (reason) {
      // A failed graphics/physics setup must release the boot screen and keep
      // the existing readable contact fallback available.
      restoreQuietGeometry();
      handoffArt.dispose();
      drumArt.dispose();
      restoreLineWeight();
      let cancelled = false;
      queueMicrotask(() => { if (!cancelled) setError(reason); });
      if (import.meta.env.DEV) console.error('About physics could not start.', reason);
      return () => { cancelled = true; };
    }
    // Reduced Motion retains gravity; the handoff below uses discrete states.
    const physics = physicsWorld;
    let threeScene = null;
    let authoredScene = null;
    let authoredLoadError = null;
    let authoredController = null;
    let authoredReady = false;
    let authoredGeneration = 0;
    let disposed = false;
    function ownsSceneSurface(surface = authoredCanvasRef.current) {
      return boardOwnsMountedSurface(scrollport, scrollRef.current, surface);
    }
    delete threeStage.dataset.authoredEndingFailed;
    authoredCanvas.dataset.authoredEndingReady = 'false';
    threeStage.dataset.handoffReady = 'false';
    function prepareGridHandoff() {
      if (threeScene || authoredReady) return;
      try {
        threeScene = createBoardGridHandoffScene(threeCanvasRef.current,
          grid.entries, paletteRef.current, { radiusScale, sourceBalls: source.balls,
            getGridState: () => gridState, preferCanvas: true });
        lifecycle.fallbackCreates += 1;
        threeRef.current = threeScene;
        threeStage.dataset.handoffReady = 'true';
        const seam = threeScene.inspect();
        threeStage.dataset.handoffCells = String(seam.cells);
        threeStage.dataset.handoffCentreError = seam.maximumCentreErrorPx.toFixed(4);
        threeStage.dataset.handoffRadiusError = seam.maximumRadiusErrorPx.toFixed(4);
      } catch (reason) {
        if (import.meta.env.DEV) console.error('About grid handoff failed.', reason);
      }
    }
    let authoredLoadStarted = false;
    function loadAuthoredEnding() {
      if (authoredLoadStarted || disposed) return;
      authoredCanvas = authoredCanvasRef.current;
      if (!authoredCanvas?.isConnected) return;
      authoredLoadStarted = true;
      authoredController = new AbortController();
      const controller = authoredController;
      const generation = ++authoredGeneration;
      const started = performance.now();
      lifecycle.authoredLoads += 1;
      void createBoardAuthoredEndingScene({
        canvas: authoredCanvas,
        entries: grid.entries, radiusScale, sourceBalls: source.balls,
        getGridState: () => gridState,
        signal: controller.signal,
        onReady: scene => {
          if (disposed || controller.signal.aborted || generation !== authoredGeneration
            || !ownsSceneSurface()) {
            // Layout effects can reuse this attached canvas. Only the explicit
            // keyed-surface retirement below may permanently lose its context.
            scene.dispose();
            return;
          }
          authoredScene = scene;
          authoredReady = true;
          lifecycle.lastAuthoredLoadMs = performance.now() - started;
          authoredLoadError = null;
          delete threeStage.dataset.authoredEndingFailed;
          authoredCanvas.dataset.authoredEndingReady = 'true';
          scrollDirty = true;
          requestFrame();
        },
        onError: reason => {
          if (disposed || controller.signal.aborted || generation !== authoredGeneration
            || !ownsSceneSurface()) return;
          authoredReady = false;
          authoredLoadError = reason;
          authoredCanvas.dataset.authoredEndingReady = 'false';
          // Keep scroll geometry stable while Three restores its resources or
          // the readable Canvas fallback takes over after a failed load.
          if (!reason.recoverable) threeStage.dataset.authoredEndingFailed = 'true';
          scrollDirty = true;
          requestFrame();
          if (import.meta.env.DEV) console.error('About authored ending failed.', reason);
        },
      }).catch(reason => {
        if (reason.name !== 'AbortError' && !disposed && generation === authoredGeneration
          && ownsSceneSurface()) {
          authoredLoadError = reason;
          threeStage.dataset.authoredEndingFailed = 'true';
          scrollDirty = true;
          requestFrame();
        }
      });
    }
    const renderer = createBoardRenderer(canvas, {
      getBalls: () => source.balls,
      getBodies: () => physicsWorld.getBodies(),
      getGrid: () => gridState,
      getPalette: () => paletteRef.current,
      getLayout: () => layout,
      getRadiusScale: () => radiusScale,
    });
    physicsRef.current = physicsWorld;
    rendererRef.current = renderer;
    threeRef.current = threeScene;
    drawRef.current = () => { scrollDirty = true; requestFrame(); };
    let frameId = 0;
    let preparationTimer = 0;
    const framePacer = createBoardFramePacer(reducedMotion);
    let lastPhysicsFrameTime = 0;
    let gateProgress = 0;
    let boardVisible = true;
    let handoffVisible = false;
    let authoredProgress = 0;
    let authoredOpening = null;
    let handledScrollTop = Number.NaN;
    let scrollDirty = true;
    let layoutDirty = true;
    // The ending stays in the sticky viewport and never borrows scroll offset.
    const endingShift = 0;
    let pendingSurfaceReplacement = false;
    let machinePrewarmed = false;
    let previousOccupiedCount = -1;
    const metrics = { scrollTop: 0, worldTop: 0, worldWidth: 0, worldHeight: 0,
      viewportHeight: 0, scrollHeight: 0, stageTop: 0, stageHeight: 0 };
    const lifecycle = { state: 'machine-active', transitions: 0, physicsSuspends: 0,
      physicsResumes: 0, prewarmRestores: 0, authoredLoads: 0, authoredDisposals: 0, authoredCancellations: 0, fallbackCreates: 0,
      fallbackDisposals: 0, layoutMeasurements: 0, pacedFrames: 0,
      lastSuspendMs: 0, lastResumeMs: 0, lastAuthoredLoadMs: 0 };
    const timing = { frames: 0, meanPhysicsMs: 0, recentPhysicsMs: 0,
      meanDrawMs: 0, worstFrameMs: 0 };
    const textElements = [...scrollport.querySelectorAll('[data-about-scroll-text]')];
    let textMetrics = [];

    const diagnostics = Object.freeze({
      getStats: () => ({ ...physicsWorld.getStats(), gridCells: grid.entries.length,
        smoothScroll: { active: Boolean(smoothScroll), state: smoothScroll?.isScrolling || 'native',
          target: smoothScroll?.targetScroll ?? scrollport.scrollTop },
        gridBend: gridState.progress, gridOccupied: gridState.occupied.size,
        socketShadowOpacity: gridState.socketShadowOpacity,
        gateOpened: gateProgress > 0, radiusScale,
        reservoir: { topY: layout.reservoirTop, shoulderY: 825,
          straightHeightPx: layout.mapY(825) * world.clientWidth / BOARD_WIDTH },
        gridHandoff: threeScene?.inspect() || null,
        authoredEnding: authoredScene?.inspect({ pointIndices: [] }) || null,
        authoredEndingError: authoredLoadError?.message || null,
        lifecycle: { ...lifecycle, authoredReady,
          authoredLoading: authoredLoadStarted && !authoredScene && !authoredLoadError,
          authoredGeneration, activeWebglContexts: authoredScene ? 1 : 0,
          activeFallbacks: threeScene ? 1 : 0,
          nativeAllocated: !physics.isSuspended(), threeAllocated: Boolean(authoredScene),
          restores: lifecycle.physicsResumes, suspensions: lifecycle.physicsSuspends,
          machineSuspended: physics.isSuspended(), machinePrewarmed,
          retainedPhysics: 'render-proxies-and-checkpoint' },
        boardRenderer: renderer.inspect(),
        boardVisible, handoffVisible, scrollTop: scrollport.scrollTop, handledScrollTop,
        textArchitectureOverlaps: [...textSafetyRef.current], ...timing }),
      getBallMaterial: () => physicsWorld.getBallMaterial(),
      getInventorySnapshot: () => physicsWorld.getInventorySnapshot(),
      getContactSnapshot: () => physicsWorld.getContactSnapshot(),
      getSupportSnapshot: () => physicsWorld.getSupportSnapshot(),
      getMotionSnapshot: () => physicsWorld.getBodies().bodies.map(body => ({
        id: body.plugin.boardId, x: body.position.x, y: body.position.y,
        radius: body.circleRadius, sleeping: body.isSleeping,
        colour: body.plugin.boardColour,
        captured: Boolean(body.isSensor || body.collisionFilter.mask === 0),
      })),
    });
    window.__ABS_ABOUT_GAME_BOARD__ = diagnostics;

    let physicsFailed = false;
    function advancePhysics(delta) {
      if (physicsFailed) return false;
      try {
        physics.update(delta);
        return true;
      } catch (reason) {
        physicsFailed = true;
        setError(reason);
        if (import.meta.env.DEV) console.error('About physics could not continue.', reason);
        return false;
      }
    }

    function disposeFallback() {
      if (!threeScene) return;
      threeScene.dispose();
      threeScene = null;
      threeRef.current = null;
      lifecycle.fallbackDisposals += 1;
    }

    function retireSpatialScene() {
      if (!authoredLoadStarted && !threeScene) return;
      authoredGeneration += 1;
      // Retire this canvas before cancelling the factory so its context can be
      // released explicitly. A new React key supplies a clean canvas on return.
      authoredScene?.dispose({ retireSurface: true });
      if (authoredScene) lifecycle.authoredDisposals += 1;
      else if (authoredController) lifecycle.authoredCancellations += 1;
      authoredController?.abort();
      authoredController = null;
      authoredScene = null;
      authoredReady = false;
      authoredLoadStarted = false;
      authoredLoadError = null;
      authoredCanvas.dataset.authoredEndingReady = 'false';
      authoredCanvas.style.setProperty('--about-board-layer-opacity', '0');
      disposeFallback();
      pendingSurfaceReplacement = true;
      setAuthoredCanvasGeneration(value => value + 1);
    }

    function setLifecycleState(next) {
      if (lifecycle.state === next) return;
      lifecycle.state = next;
      lifecycle.transitions += 1;
    }

    function measureLayout() {
      const scrollRect = scrollport.getBoundingClientRect();
      const stageRect = threeStage.getBoundingClientRect();
      metrics.scrollTop = scrollport.scrollTop;
      metrics.worldTop = world.offsetTop;
      metrics.worldWidth = world.clientWidth;
      metrics.worldHeight = world.offsetHeight;
      metrics.viewportHeight = scrollport.clientHeight;
      metrics.scrollHeight = scrollport.scrollHeight;
      metrics.stageTop = stageRect.top - scrollRect.top + metrics.scrollTop;
      metrics.stageHeight = threeStage.offsetHeight;
      textMetrics = textElements.map(element => {
        const rect = element.getBoundingClientRect();
        const isEnding = ending.contains(element);
        return { element, isEnding, height: rect.height, slot: element.dataset.boardTextSlot,
          top: rect.top - scrollRect.top + metrics.scrollTop - (isEnding ? endingShift : 0) };
      });
      const opening = measureBoardEndingOpening(authoredCanvas, ending);
      authoredOpening = opening ? { ...opening } : null;
      // All geometry reads above precede backing-store and SVG writes.
      threeScene?.resize();
      authoredScene?.resize(metrics.worldWidth, metrics.viewportHeight);
      lifecycle.layoutMeasurements += 1;
      layoutDirty = false;
      return metrics.worldWidth > 0 && metrics.viewportHeight > 0;
    }

    function applyScrollState() {
      const { scrollTop, viewportHeight, stageTop, stageHeight, worldWidth, worldTop } = metrics;
      const visibility = boardSceneActivity({ scrollTop, viewportHeight,
        worldBottom: worldTop + metrics.worldHeight, stageTop, stageHeight,
        spatialReady: authoredReady || Boolean(threeScene) });
      if (visibility.shouldRelease) retireSpatialScene();
      else if (visibility.shouldPrepare && !pendingSurfaceReplacement) loadAuthoredEnding();
      handoffVisible = visibility.spatialVisible;
      if (handoffVisible && !authoredReady) prepareGridHandoff();
      // The opaque sticky stage owns the viewport at this boundary. The source
      // world's overlapped grid below it must not keep solving invisibly.
      const covered = scrollTop >= stageTop && (authoredReady || Boolean(threeScene));
      // The spatial canvas contains settled cells only. Until it owns the
      // viewport, keep its opaque paint out of the 2D arrivals' stacking path.
      const spatialCover = covered ? 'true' : 'false';
      if (threeStage.dataset.spatialCover !== spatialCover) threeStage.dataset.spatialCover = spatialCover;
      boardVisible = scrollTop < worldTop + metrics.worldHeight && !covered;
      machinePrewarmed = boardShouldKeepMachineWarm({ scrollTop,
        previousScrollTop: handledScrollTop, stageTop, viewportHeight,
        suspended: physics.isSuspended(), prewarmed: machinePrewarmed });
      if (covered && !machinePrewarmed && physics.isReady() && !physics.isSuspended()) {
        const result = physics.suspend();
        lifecycle.physicsSuspends += 1;
        lifecycle.lastSuspendMs = result.durationMs;
      } else if ((boardVisible || machinePrewarmed) && physics.isSuspended()) {
        setLifecycleState('machine-restoring');
        const result = physics.resume();
        lifecycle.physicsResumes += 1;
        if (covered) lifecycle.prewarmRestores += 1;
        lifecycle.lastResumeMs = result.durationMs;
        lastPhysicsFrameTime = 0;
      }
      if (covered) renderer.shrink();
      setLifecycleState(covered ? (machinePrewarmed ? 'machine-approaching' : 'spatial-active')
        : handoffVisible ? 'seam-overlap'
        : visibility.shouldPrepare ? 'spatial-preparing' : 'machine-active');
      if (boardVisible) {
        const strip = renderer.updateViewport(metrics);
        physics.setVisibleRange(strip.boardTop, strip.boardBottom, strip.pixelsPerBoardUnit);
      }
      const handoffProgress = gridHandoffProgress(scrollTop, stageTop, stageHeight, viewportHeight);
      const handoffPhase = boardHandoffPhaseState(handoffProgress);
      authoredProgress = reducedMotion
        ? (handoffProgress >= BOARD_HANDOFF_PHASES.endingStart ? 1
          : handoffProgress >= BOARD_HANDOFF_PHASES.authoredStart ? .66
            : handoffProgress >= .2 ? .25 : 0)
        : handoffProgress;
      const endingVisibility = reducedMotion
        ? Number(handoffProgress >= BOARD_HANDOFF_PHASES.endingStart) : handoffPhase.endingVisibility;
      const progress = Math.min(1, scrollTop / Math.max(1, metrics.scrollHeight - viewportHeight));
      let closest = null, closestDistance = Infinity;
      for (const item of textMetrics) {
        const top = item.top + (item.isEnding ? endingShift : 0) - scrollTop;
        const centre = top + item.height / 2;
        const distance = Math.abs(centre - viewportHeight / 2);
        if (item.slot && top + item.height > 0 && top < viewportHeight && distance < closestDistance) {
          closest = { slot: item.slot, offset: top };
          closestDistance = distance;
        }
      }
      if (scrollTop > 1) {
        userHasScrolledRef.current = true;
        lastScrollAnchorRef.current = { slot: closest?.slot || null, offset: closest?.offset ?? null, progress };
      }
      cueRef.current?.style.setProperty('--about-board-progress', String(progress));
      cueRef.current?.style.setProperty('--about-board-cue-opacity', boardScrollCueOpacity(progress).toFixed(4));
      cueRef.current?.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
      gridState.progress = 0;
      gridState.socketShadowOpacity = Math.max(0, Math.min(1,
        (stageTop - scrollTop) / (viewportHeight * .5)));
      threeCanvasRef.current?.style.setProperty('--about-board-layer-opacity', String(authoredReady ? 0 : 1));
      authoredCanvas.style.setProperty('--about-board-layer-opacity', String(authoredReady ? 1 : 0));
      ending.style.setProperty('--about-board-ending-reveal', endingVisibility.toFixed(4));
      ending.style.visibility = endingVisibility > 0.001 ? 'visible' : 'hidden';
      ending.inert = endingVisibility < 0.5;
      const gatePosition = worldTop + layout.mapY(RESERVOIR_GATE_Y) * worldWidth / BOARD_WIDTH;
      const meterPosition = worldTop + layout.mapY(layout.placeY(MECHANISM.meterGate.pivot[1])) * worldWidth / BOARD_WIDTH;
      // Each valve opens only as its own pivot crosses the scroll band.
      // Reading-block height must not release the downstream inventory early.
      gateProgress = boardMechanismProgress(gatePosition, scrollTop, viewportHeight);
      physics.setScrollProgress(gateProgress, boardMechanismProgress(meterPosition, scrollTop, viewportHeight));
      handledScrollTop = scrollTop;
      scrollDirty = false;
    }

    function frame(now) {
      frameId = 0;
      const currentCanvas = authoredCanvasRef.current;
      if (document.hidden || disposed || !ownsSceneSurface(currentCanvas)) {
        lastPhysicsFrameTime = 0;
        framePacer.reset();
        return;
      }
      if (!framePacer.takeFrame(now)) {
        lifecycle.pacedFrames += 1;
        requestFrame();
        return;
      }
      // The shared wheel easing updates the real scrollport before the board,
      // physics fixtures and camera sample it in this same paced frame.
      smoothScroll?.raf(now);
      if (authoredCanvas !== currentCanvas) {
        authoredCanvas = currentCanvas;
        pendingSurfaceReplacement = false;
        layoutDirty = true;
      }
      const measured = layoutDirty;
      if (measured && !measureLayout()) return;
      metrics.scrollTop = scrollport.scrollTop;
      const presentationChanged = measured || scrollDirty || handledScrollTop !== metrics.scrollTop;
      if (presentationChanged) applyScrollState();
      const delta = lastPhysicsFrameTime ? Math.min(50, now - lastPhysicsFrameTime) : 1000 / 60;
      lastPhysicsFrameTime = now;
      const start = import.meta.env.DEV ? performance.now() : 0;
      // The retained world advances only while it can be seen. Suspension
      // preserves its last physical state without accumulating hidden time.
      if (boardVisible && !physics.isSuspended() && !advancePhysics(delta)) return;
      const afterPhysics = import.meta.env.DEV ? performance.now() : 0;
      if (boardVisible) renderer.draw();
      if (!firstPaintReady && physics.isReady()) {
        firstPaintReady = true;
        // Publish a settled snapshot, not the mutable airborne packing seed.
        // Live ball motion never changes this opening clearance.
        setSettledOpening({ inventory, surfaceY: inventory.surfaceY });
        setError(null);
        setSceneReady(true);
      }
      if (handoffVisible && authoredReady && authoredScene) {
        const rendered = authoredScene.render({
          progress: authoredProgress,
          ambientSeconds: now / 1000,
          reducedMotion,
          cameraTimeSeconds: now / 1000,
          endingOpening: authoredProgress >= BOARD_BAND_JOURNEY.endingRevealStart
            ? authoredOpening : null,
          endingTitleActive: authoredProgress >= BOARD_HANDOFF_PHASES.endingStart,
        });
        // The replacement has actually painted. Now discard the loading
        // surface, rather than retaining a second invisible renderer.
        if (rendered) disposeFallback();
      } else if (handoffVisible && threeScene
        && (presentationChanged || previousOccupiedCount !== gridState.occupied.size)) {
        threeScene.render(Math.min(authoredProgress, BOARD_HANDOFF_PHASES.bendEnd));
      }
      previousOccupiedCount = gridState.occupied.size;
      if (import.meta.env.DEV) {
        const afterDraw = performance.now();
        timing.frames += 1;
        timing.meanPhysicsMs += ((afterPhysics - start) - timing.meanPhysicsMs) / timing.frames;
        // A lifetime mean hides a slow release after a long resting opening.
        // Keep a bounded recent sample for development performance checks.
        timing.recentPhysicsMs += ((afterPhysics - start) - timing.recentPhysicsMs) * .1;
        timing.meanDrawMs += ((afterDraw - afterPhysics) - timing.meanDrawMs) / timing.frames;
        timing.worstFrameMs = Math.max(timing.worstFrameMs, afterDraw - start);
      }
      if (!physics.isReady() || (boardVisible && physics.hasActivity())
        || (handoffVisible && authoredReady) || pendingSurfaceReplacement
        || smoothScroll?.isScrolling === 'smooth') {
        requestFrame();
      } else {
        lastPhysicsFrameTime = 0;
        framePacer.reset();
      }
    }
    function requestFrame() {
      if (document.hidden || disposed || physicsFailed || !ownsSceneSurface()) return;
      if (!physics.isReady()) {
        // A hidden incoming route may receive very few animation frames.
        // Settle only its unshown seed in bounded tasks between paints, so
        // preparation does not depend on compositor cadence or time out.
        // Once ready, all live movement returns to the normal frame clock.
        if (!preparationTimer) preparationTimer = window.setTimeout(() => {
          preparationTimer = 0;
          if (document.hidden || disposed || !ownsSceneSurface()) return;
          if (!advancePhysics(0)) return;
          requestFrame();
        }, 0);
        return;
      }
      if (!frameId) frameId = requestAnimationFrame(frame);
    }
    function onScroll() {
      // Native and smoothed input both move the real scrollport. Coalesce
      // events into the next paced frame; never solve or measure here.
      scrollDirty = true;
      requestFrame();
    }
    function onWheel() {
      // Lenis can consume a wheel event before native scroll emits anything.
      // Start the shared frame clock; it stops when the easing settles.
      if (smoothScroll) requestFrame();
    }
    function rebuildSmoothScroll() {
      smoothScroll?.destroy();
      smoothScroll = null;
      if (!shouldUseNativeSmoothScroll(scrollMediaQueries)) {
        smoothScroll = createSmoothScroll({ wrapper: scrollport, content: scrollport,
          autoResize: false, allowNestedScroll: true });
        smoothScroll?.resize();
      }
      scrollDirty = true;
      requestFrame();
    }
    function onVisibility() {
      lastPhysicsFrameTime = 0;
      framePacer.reset();
      if (!document.hidden) {
        smoothScroll?.reset();
        requestFrame();
      }
    }
    const resizeObserver = new ResizeObserver(() => {
      smoothScroll?.resize();
      layoutDirty = true;
      scrollDirty = true;
      requestFrame();
    });
    resizeObserver.observe(scrollport);
    resizeObserver.observe(threeStage);
    resizeObserver.observe(world);
    resizeObserver.observe(ending);
    for (const element of textElements) resizeObserver.observe(element);
    const layoutObserver = new MutationObserver(() => {
      layoutDirty = true;
      scrollDirty = true;
      requestFrame();
    });
    layoutObserver.observe(ending, { childList: true, characterData: true, subtree: true });
    // Settling changes the opening margin, not the world's size. ResizeObserver
    // cannot see that position change; refresh the valve/camera coordinates
    // after React commits it without adding layout reads to every scroll frame.
    layoutObserver.observe(world, { attributes: true, attributeFilter: ['style'] });
    scrollport.addEventListener('scroll', onScroll, { passive: true });
    scrollport.addEventListener('wheel', onWheel, { passive: true });
    scrollMediaQueries.reducedMotionQuery.addEventListener('change', rebuildSmoothScroll);
    scrollMediaQueries.nativeScrollQuery.addEventListener('change', rebuildSmoothScroll);
    rebuildSmoothScroll();
    function onThemeChange() {
      physics?.setPalette(paletteRef.current);
      threeScene?.setPalette(paletteRef.current);
      scrollDirty = true;
      requestFrame();
    }
    function onBallDynamicsChange(event) {
      physics?.setBallMaterial(event.detail);
      requestFrame();
    }
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    window.addEventListener(BALL_DYNAMICS_CHANGE_EVENT, onBallDynamicsChange);
    document.addEventListener('visibilitychange', onVisibility);
    onScroll();
    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(preparationTimer);
      resizeObserver.disconnect();
      layoutObserver.disconnect();
      smoothScroll?.destroy();
      scrollMediaQueries.reducedMotionQuery.removeEventListener('change', rebuildSmoothScroll);
      scrollMediaQueries.nativeScrollQuery.removeEventListener('change', rebuildSmoothScroll);
      scrollport.removeEventListener('scroll', onScroll);
      scrollport.removeEventListener('wheel', onWheel);
      window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
      window.removeEventListener(BALL_DYNAMICS_CHANGE_EVENT, onBallDynamicsChange);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.dispose();
      physicsWorld.dispose();
      threeScene?.dispose();
      // React can rerun this effect for responsive layout changes while the
      // canvas remains attached. Preserve that reusable context on teardown.
      authoredScene?.dispose();
      authoredController?.abort();
      restoreQuietGeometry();
      drumArt.dispose();
      handoffArt.dispose();
      restoreLineWeight();
      if (window.__ABS_ABOUT_GAME_BOARD__ === diagnostics) {
        delete window.__ABS_ABOUT_GAME_BOARD__;
      }
      physicsRef.current = null;
      rendererRef.current = null;
      threeRef.current = null;
      drawRef.current = () => {};
    };
  }, [source, layout, radiusScale, inventory, rememberScrollAnchor]);

  useEffect(() => {
    if (!source || readerMode || !worldRef.current) return undefined;
    const elements = [...worldRef.current.querySelectorAll('[data-board-text-slot]')];
    let frameId = 0;
    const measure = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const next = Object.fromEntries(elements.map(element => [element.dataset.boardTextSlot,
          Math.ceil(element.getBoundingClientRect().height)]));
        setQuietHeights(previous => Object.entries(next).every(([key, value]) => previous[key] === value)
          ? previous : next);
      });
    };
    const observer = new ResizeObserver(measure);
    elements.forEach(element => observer.observe(element));
    measure();
    return () => { cancelAnimationFrame(frameId); observer.disconnect(); };
  }, [source, readerMode]);

  useEffect(() => {
    if (!source || !sceneReady || readerMode || !scrollRef.current) return undefined;
    const scope = scrollRef.current;
    let frameId = 0;
    let settleTimer = 0;
    let disposed = false;
    const inspect = () => {
      if (disposed) return;
      // A font or responsive text change is measured on the next frame. Do
      // not permanently switch to reader mode against the previous spacing.
      if (document.fonts?.status === 'loading') return;
      for (const element of scope.querySelectorAll('.about-board-world [data-board-text-slot]')) {
        const measuredHeight = quietHeights[element.dataset.boardTextSlot];
        if (!Number.isFinite(measuredHeight)
          || Math.abs(Math.ceil(element.getBoundingClientRect().height) - measuredHeight) > 1) return;
      }
      const overlaps = findTextArchitectureOverlaps(scope);
      textSafetyRef.current = overlaps;
      if (overlaps.length) enableReaderMode();
    };
    const schedule = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => { frameId = requestAnimationFrame(inspect); });
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(scope);
    const textElements = scope.querySelectorAll('.about-board-world .about-board-text');
    textElements.forEach(element => observer.observe(element));
    const mutationObserver = new MutationObserver(schedule);
    textElements.forEach(element => mutationObserver.observe(element, {
      attributes: true,
      attributeFilter: ['class'],
      characterData: true,
      childList: true,
      subtree: true,
    }));
    const beginAfterLayoutSettles = () => {
      settleTimer = window.setTimeout(() => {
        schedule();
      }, 800);
    };
    schedule();
    if (document.fonts?.ready) document.fonts.ready.then(beginAfterLayoutSettles);
    else beginAfterLayoutSettles();
    return () => {
      disposed = true;
      clearTimeout(settleTimer);
      cancelAnimationFrame(frameId);
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [source, layout, quietHeights, sceneReady, readerMode, enableReaderMode]);

  const email = homeContent.contact?.email || 'alexander@beck.fyi';
  const linkedin = homeContent.socials?.items?.linkedin?.url;
  const gridOverlap = (layout.mapY(layout.placeY(BOARD_2D_END_Y)) - layout.mapY(layout.placeY(GRID_START_Y)))
    / BOARD_WIDTH * 100;
  return <section className="about-game-board" style={source?.architectureStyle}
    data-route-content={routeContentId} data-about-scene-ready={sceneReady || Boolean(error) ? 'true' : 'false'}
    aria-labelledby="about-route-title">
    <div className="about-board-viewport-measure" ref={viewportMeasureRef} aria-hidden="true" />
    {error ? <div className="about-board-error" role="alert">
      <h1 id="about-route-title">About Me</h1>
      <p>{copy('text-promise-main').description}</p>
      <p>The interactive drawing could not load. You can still get in touch below.</p>
      <a href={`mailto:${email}`}>{email}</a>
    </div> : null}
    <div className="about-board-scrollport" ref={scrollRef} inert={Boolean(error)}
      aria-hidden={error ? true : undefined}>
      <div className="about-board-content">
        <div className="about-board-intro">
          <div className="about-board-intro__copy" data-about-scroll-text
            style={boardEditorialGridSlot('introduction', mobile)}>
            <h1 id={error ? undefined : 'about-route-title'}>About Me</h1>
            <p className="about-board-intro__statement">{OPENING_COPY}</p>
          </div>
          <span className="about-board-entry-cue" aria-hidden="true">Follow me <span>↓</span></span>
        </div>
        <div className={readerMode ? 'about-board-reader' : 'about-board-reader is-hidden'}>
          {readerMode ? <BoardEditorial layout={layout} /> : null}
        </div>
        <div className="about-board-world" ref={worldRef}
          style={{ aspectRatio: `${BOARD_WIDTH} / ${layout.sceneHeight}`,
            marginTop: readerMode ? undefined : `${-openingLiftPx}px` }}>
          {source ? <>
            <div ref={artRef} className="about-board-art" aria-hidden="true"
              dangerouslySetInnerHTML={svgMarkup} />
            {readerMode ? null : <BoardEditorial layout={layout} />}
          </> : null}
          {source ? <canvas className="about-board-balls" ref={canvasRef} aria-hidden="true" /> : null}
        </div>
        {source ? <div className="about-board-three-stage" ref={threeStageRef}
          style={{ '--about-board-grid-overlap': `${gridOverlap}cqw` }}>
          <div className="about-board-three-viewport">
            <canvas className="about-board-three-canvas about-board-three-canvas--handoff"
              ref={threeCanvasRef} aria-hidden="true" />
            <canvas className="about-board-three-canvas about-board-three-canvas--authored"
              ref={authoredCanvasRef} key={authoredCanvasGeneration}
              style={{ '--about-board-layer-opacity': 0 }} aria-hidden="true" />
            <footer className="about-board-ending" ref={endingRef} inert>
              <div>
                <h2>{copy('text-epilogue-invitation').text}</h2>
                <p>{copy('text-epilogue-invitation').description}</p>
                <div className="about-board-ending__actions">
                  <CvDownloadAction soundSource="about-download-cv" />
                  <CopyEmailAction email={email} label={email} statusId="about-board-copy-status"
                    soundSource="about-copy-email" />
                  <LinkedInAction href={linkedin} soundSource="about-linkedin" iconPosition="trailing" />
                </div>
              </div>
            </footer>
          </div>
        </div> : null}
      </div>
    </div>
    {import.meta.env.DEV && new URLSearchParams(window.location.search).get('grid') === '1'
      ? <div className="about-board-grid-guide" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => <span key={index}
          style={boardTextGridSlot(index + 1, 1)} />)}
      </div> : null}
    {error ? null : <ScrollIndicator cueRef={cueRef} />}
  </section>;
}
