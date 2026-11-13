import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import aboutContent from 'virtual:abs-content/about';
import homeContent from 'virtual:abs-content/home';
import { ActionButton } from '../../components/app/ActionButton.jsx';
import { CvDownloadAction } from '../../components/app/CvDownloadAction.jsx';
import { LinkedInAction } from '../../components/app/LinkedInAction.jsx';
import { useSimulationPalette } from '../../hooks/useSimulationPalette.js';
import { buildRouteHref } from '../../lib/routes.js';
import { trySpaNavigate } from '../../lib/spa-navigation.js';
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
import { ABOUT_PORTRAIT_CHANGE_EVENT, normalizeAboutPortrait } from '../../lib/aboutPortrait.js';
import { createPortraitMap, decodePortraitMask, portraitPaletteRoles, portraitRoleAssignments } from './boardPortraitMap.js';
import { createPortraitCapture } from './boardPortraitCapture.js';
import { createPortraitChute, installPortraitChute } from './boardPortraitChute.js';
import { createPortraitRenderer } from './boardPortraitRenderer.js';
import { portraitFieldGeometry } from './boardPortraitGeometry.js';
import { ballColliderRadius } from './boardDynamics.js';
import { createBoardLayout, remapBoardY } from './boardLayout.js';
import { installQuietIntervalGeometry } from './boardQuietIntervals.js';
import { createBoardInventory } from './boardInventory.js';
import { boardMechanismProgress } from './boardScrollMotion.js';
import { createBoardRenderer } from './boardRenderer.js';
import { prepareBoardFonts } from './boardOpeningReadiness.js';
import {
  createBoardFramePacer, boardOwnsMountedSurface, boardMachineIsVisible,
} from './boardSceneLifecycle.js';
import { findTextArchitectureOverlaps } from './boardTextSafety.js';
import {
  BOARD_WIDTH,
  decodeBalls,
  RESERVOIR_GATE_Y,
  resolveBoardBallRoleColours,
} from './boardScene.js';
import './about-game-board.css';

const ASSET_ROOT = '/models/about-game-board';
const BOARD_DIAGNOSTICS = import.meta.env.DEV || import.meta.env.MODE === 'certification';
const fieldById = new Map(aboutContent.tracks.text.fields.map(field => [field.id, field]));
const copy = id => fieldById.get(id);
const BALL_VIEWPORT_QUERY = [
  '(max-width: 600px)',
  '(max-width: 900px) and (max-height: 600px)',
  '(hover: none) and (pointer: coarse)',
].join(', ');

function compactClearanceRadius(presentation) {
  return 13 * resolveBoardBallRadiusScale(presentation, { isMobileDevice: true, boardWidth: 300 });
}

function navigateToContact(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey
    || event.ctrlKey || event.shiftKey) return;
  if (trySpaNavigate(event.currentTarget.href)) event.preventDefault();
}

function ScrollIndicator({ cueRef }) {
  return <div ref={cueRef} className="about-board-scroll-ui" role="progressbar"
    aria-label="About story progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
    <span className="about-board-scroll-indicator" aria-hidden="true">
      <span className="about-board-scroll-indicator__track" />
    </span>

  </div>;
}

export function AboutGameBoardExperience({ routeContentId = 'about' }) {
  const [source, setSource] = useState(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [physicsReady, setPhysicsReady] = useState(false);
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
  const portraitStageRef = useRef(null);
  const portraitCanvasRef = useRef(null);
  const portraitPanRef = useRef(null);
  const portraitSurfaceRef = useRef(null);
  const portraitSessionRef = useRef(null);
  const cueRef = useRef(null);
  const physicsRef = useRef(null);
  const rendererRef = useRef(null);
  const portraitRef = useRef(null);
  const drawRef = useRef(() => {});
  const textSafetyRef = useRef([]);
  const userHasScrolledRef = useRef(false);
  const lastScrollAnchorRef = useRef(null);
  const pendingReaderAnchorRef = useRef(null);
  const portraitAnchorRef = useRef(null);
  const portraitReflowAnchorRef = useRef(null);
  const openingFontsReadyRef = useRef(false);

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
    if (portraitAnchorRef.current !== null) portraitReflowAnchorRef.current = portraitAnchorRef.current;
    if (scrollport && userHasScrolledRef.current && portraitAnchorRef.current === null
      && pendingReaderAnchorRef.current === null) {
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
        if (!scrollport || !anchor || portraitAnchorRef.current !== null) return;
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
    portraitRef.current?.setPalette(palette);
    physicsRef.current?.setPalette(palette);
    drawRef.current();
  }, [palette]);

  useEffect(() => {
    if (!import.meta.env.DEV || !source) return undefined;
    let cancelled = false, manager = null;
    Promise.all([
      import('../../legacy/modules/ui/panel-popup-manager.js'),
      import('../../legacy/modules/core/state.js'),
    ]).then(([panelManager, state]) => {
      if (cancelled) return;
      manager = panelManager;
      if (!Object.keys(state.getConfig() || {}).length) state.initState(source.runtimeConfig);
      Object.assign(state.getGlobals(), source.portraitSettings);
      manager.registerDevPanelRoute({ page: 'about', pageLabel: 'About',
        productLabel: 'Alexander Beck Studio', panelTitle: 'About Controls',
        masterGroupIds: ['palette', 'balls', 'physics', 'motion', 'audio'],
        footerHint: '<kbd>/</kbd> panel · live apply · save to design JSON',
        syncInitialControlSideEffects: false });
    }).catch(reason => console.warn('About controls could not load.', reason));
    return () => { cancelled = true; manager?.unregisterDevPanelRoute('about'); };
  }, [source]);

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
      fetch(`${ASSET_ROOT}/portrait-map.json`, { signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error(`Portrait request failed: ${response.status}`);
        return response.json();
      }),
      loadRuntimeConfig(),
      loadBoardRigidBodyBackend(),
    ]).then(([svg, rows, portraitMask, runtimeConfig]) => {
      const geometry = new DOMParser().parseFromString(svg, 'image/svg+xml');
      if (!geometry.querySelector('svg[viewBox="0 0 960 14140"] > #Geometry')) {
        throw new Error('Unexpected board geometry.');
      }
      setSource({ svg, balls: decodeBalls(rows), portraitMask: decodePortraitMask(portraitMask), runtimeConfig,
        portraitSettings: normalizeAboutPortrait(runtimeConfig),
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

  useEffect(() => {
    if (!source || !scrollRef.current) return undefined;
    let cancelled = false;
    openingFontsReadyRef.current = false;
    prepareBoardFonts(scrollRef.current).then(() => {
      if (cancelled) return;
      openingFontsReadyRef.current = true;
      drawRef.current();
    }).catch(reason => { if (!cancelled) setError(reason); });
    return () => { cancelled = true; };
  }, [source]);

  const radiusScale = useMemo(() => resolveBoardBallRadiusScale(
    source?.ballPresentation,
    { isMobileDevice: mobileBallViewport, boardWidth },
  ), [source?.ballPresentation, mobileBallViewport, boardWidth]);
  const inventory = useMemo(() => {
    const current = portraitSessionRef.current?.inventory;
    if (current || !source) return current || null;
    const next = createBoardInventory(source.balls, radiusScale, { reservoirTop: layout.reservoirTop });
    // Restored bodies retain their x positions and valve angles. Keep the
    // assembly clearance stable for the same inventory across breakpoints.
    next.assemblyRadius = mobile ? Math.max(next.radius, compactClearanceRadius(source.ballPresentation))
      : next.radius;
    return next;
  }, [source, radiusScale, layout.reservoirTop, mobile]);
  // Align the prepared pile's highest ball with the end of the 60vh intro.
  // Sample once per inventory; moving balls must never reposition the page.
  const openingLiftPx = inventory && settledOpening?.inventory === inventory
    ? (settledOpening.surfaceY - inventory.radius - layout.reservoirTop) * boardWidth / BOARD_WIDTH
    : 0;

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
      || !canvasRef.current || !portraitStageRef.current || !portraitCanvasRef.current) return;
    const scrollport = scrollRef.current;
    const world = worldRef.current;
    const stage = portraitStageRef.current;
    const portraitCanvas = portraitCanvasRef.current;
    delete world.dataset.machineCovered;
    const svg = artRef.current.querySelector('svg');
    if (!svg) return;
    setSceneReady(false);
    setPhysicsReady(false);
    layout.applyToSvg(svg);
    const restoreLineWeight = installBoardArchitectureLineWeight(svg);
    const clearanceRadius = Math.max(inventory.radius, compactClearanceRadius(source.ballPresentation));
    const assembly = layout.placement.modules.find(module => module.id === 'assembly');
    const drumArt = installBoardDrumArt(svg, { ballRadius: inventory.assemblyRadius, top: assembly.top });
    const handoffArt = installBoardHandoffArt(svg,
      { ballRadius: clearanceRadius, reservoirBallRadius: inventory.radius,
        compact: layout.compact, narrow: layout.narrow, mobile: layout.mobile });
    const restoreQuietGeometry = installQuietIntervalGeometry(svg, layout.placement, inventory.radius);
    const portraitChute = createPortraitChute(layout.portraitChuteTop, inventory.radius);
    const removePortraitChute = installPortraitChute(svg, portraitChute);
    let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollMediaQueries = createSmoothScrollMediaQueries();
    let session = portraitSessionRef.current;
    if (!session || session.inventory !== inventory || session.map.version !== 2) {
      const map = createPortraitMap(source.portraitMask, inventory.balls);
      session = { inventory, map, capture: createPortraitCapture(map, source.portraitSettings, reducedMotion),
        roles: [], colours: [], assignments: null, checkpoint: null, layout: null, pan: .5 };
      portraitSessionRef.current = session;
    }
    const capture = session.capture;
    const restoringPreparedView = Boolean(session.checkpoint) && userHasScrolledRef.current;
    const portraitPan = portraitPanRef.current;
    const portraitSurface = portraitSurfaceRef.current;
    capture.setReducedMotion(reducedMotion);
    const updatePalette = next => {
      session.roles = portraitPaletteRoles(next);
      const colours = resolveBoardBallRoleColours(next);
      session.colours = session.roles.map(role => colours[role]);
      session.assignments = portraitRoleAssignments(session.map, session.roles);
    };
    updatePalette(paletteRef.current);
    let physics;
    try {
      physics = createBoardPhysics(svg, source.balls, paletteRef.current,
        { compact: layout.compact, drumArt, ballDynamics: source.ballDynamics,
          portraitChute, portrait: capture, getRoleAssignments: () => session.assignments,
          initialCheckpoint: session.checkpoint, remapY: y => remapBoardY(y, session.layout, layout),
          radiusScale, inventory, handoffArt, originY: layout.reservoirTop,
          placement: layout.placement });
    } catch (reason) {
      removePortraitChute(); restoreQuietGeometry(); handoffArt.dispose(); drumArt.dispose(); restoreLineWeight();
      let cancelled = false;
      queueMicrotask(() => { if (!cancelled) setError(reason); });
      return () => { cancelled = true; };
    }
    const renderer = createBoardRenderer(canvasRef.current, {
      getBalls: () => inventory.balls, getBodies: () => physics.getBodies(), getGrid: () => null,
      getPalette: () => paletteRef.current, getRoleAssignments: () => session.assignments,
      getLayout: () => layout, getRadiusScale: () => radiusScale,
    });
    const portraitRenderer = createPortraitRenderer(portraitCanvas, capture,
      () => session.colours, () => requestFrame());
    physicsRef.current = physics;
    rendererRef.current = renderer;
    portraitRef.current = { setPalette: next => {
      updatePalette(next); portraitRenderer.invalidate();
    } };
    drawRef.current = () => { scrollDirty = true; requestFrame(); };
    let disposed = false, physicsFailed = false, openingPublished = false;
    let settledPhysicsPublished = false, frameId = 0, preparationTimer = 0;
    let framePacer = createBoardFramePacer(reducedMotion), lastFrameTime = 0;
    let smoothScroll = null, gateProgress = 0, boardVisible = true, portraitVisible = false;
    let scrollDirty = true, layoutDirty = true, handledScrollTop = Number.NaN;
    let restorePortraitAnchor = (portraitReflowAnchorRef.current ?? portraitAnchorRef.current) !== null;
    const metrics = { scrollTop: 0, worldTop: 0, worldWidth: 0, worldHeight: 0,
      viewportHeight: 0, scrollHeight: 0, stageTop: 0, stageHeight: 0,
      portraitScrollStart: 0, portraitScrollRange: 0 };
    const lifecycle = { state: 'machine-active', physicsSuspends: 0, physicsResumes: 0,
      layoutMeasurements: 0, pacedFrames: 0 };
    const timing = { frames: 0, meanPhysicsMs: 0, recentPhysicsMs: 0, meanDrawMs: 0, worstFrameMs: 0 };
    const textElements = [...scrollport.querySelectorAll('[data-about-scroll-text]')];
    const boardTextElements = [...world.querySelectorAll('[data-board-text-slot]')];
    let textMetrics = [];
    const ownsSurface = () => boardOwnsMountedSurface(scrollport, scrollRef.current, portraitCanvasRef.current);
    const diagnostics = BOARD_DIAGNOSTICS ? Object.freeze({
      getStats: () => ({ ...physics.getStats(), gateOpened: gateProgress > 0, radiusScale,
        openingFontsReady: openingFontsReadyRef.current,
        reservoir: { topY: layout.reservoirTop, shoulderY: 825,
          straightHeightPx: layout.mapY(825) * metrics.worldWidth / BOARD_WIDTH },
        portrait: capture.inspect(), portraitRenderer: portraitRenderer.inspect(),
        portraitChute: { top: layout.portraitChuteTop,
          left: portraitChute.left, right: portraitChute.right, outletY: portraitChute.outletY },
        portraitRoles: [...session.roles], portraitCounts: [...session.map.counts],
        portraitColours: [...session.colours],
        lifecycle: { ...lifecycle, nativeAllocated: !physics.isSuspended(),
          activeWebglContexts: 0, activeFallbacks: 0, machineSuspended: physics.isSuspended() },
        gridHandoff: null, boardRenderer: renderer.inspect(),
        smoothScroll: { active: Boolean(smoothScroll), state: smoothScroll?.isScrolling || 'native',
          target: smoothScroll?.targetScroll ?? scrollport.scrollTop },
        boardVisible, portraitVisible, scrollTop: scrollport.scrollTop, handledScrollTop,
        textArchitectureOverlaps: [...textSafetyRef.current], ...timing }),
      getBallMaterial: () => physics.getBallMaterial(),
      getOpeningSnapshot: () => ({
        published: openingPublished,
        preparationPublished: settledPhysicsPublished,
        ready: scrollport.closest('.about-game-board').dataset.aboutSceneReady,
        inert: scrollport.inert,
        width: boardWidth,
        expectedLift: (inventory.surfaceY - inventory.radius - layout.reservoirTop) * boardWidth / BOARD_WIDTH,
        appliedLift: -Number.parseFloat(world.style.marginTop || '0'),
        boardVisible, portraitVisible,
        visibleBalls: renderer.inspect().visibleBallCount,
        portraitAnchor: portraitAnchorRef.current,
        reflowAnchor: portraitReflowAnchorRef.current,
        text: boardTextElements.map(element => ({ slot: element.dataset.boardTextSlot,
          retained: quietHeights[element.dataset.boardTextSlot],
          measured: Math.ceil(element.getBoundingClientRect().height) })),
      }),
      getInventorySnapshot: () => physics.getInventorySnapshot(),
      getPortraitSnapshot: () => capture.snapshot().map(record => ({ ...record,
        colour: session.colours[record.pigment] })),
      getContactSnapshot: () => physics.getContactSnapshot(),
      getSupportSnapshot: () => physics.getSupportSnapshot(),
      getMotionSnapshot: () => physics.getBodies().bodies.map(body => ({
        id: body.plugin.boardId, x: body.position.x, y: body.position.y,
        radius: body.circleRadius, sleeping: body.isSleeping, colour: body.plugin.boardColour,
        captured: Boolean(body.isSensor || body.collisionFilter.mask === 0),
      })),
    }) : null;
    if (diagnostics) window.__ABS_ABOUT_GAME_BOARD__ = diagnostics;

    function advancePhysics(delta) {
      try { physics.update(delta, boardVisible); return true; }
      catch (reason) { physicsFailed = true; setError(reason); return false; }
    }
    function measureLayout() {
      const scrollRect = scrollport.getBoundingClientRect();
      const worldRect = world.getBoundingClientRect();
      const previousTop = metrics.stageTop, previousHeight = metrics.stageHeight;
      const previousRange = metrics.portraitScrollRange;
      metrics.scrollTop = scrollport.scrollTop;
      metrics.worldTop = worldRect.top - scrollRect.top + metrics.scrollTop;
      metrics.worldWidth = worldRect.width; metrics.worldHeight = worldRect.height;
      metrics.viewportHeight = scrollport.clientHeight;
      if (metrics.worldWidth <= 0 || metrics.viewportHeight <= 0) return false;
      const boardScale = metrics.worldWidth / BOARD_WIDTH;
      const field = portraitFieldGeometry(capture.map, metrics.worldWidth,
        ballColliderRadius(inventory.radius) * boardScale, capture.getSettings().aboutPortraitSpacing);
      const oldPanRange = portraitPan.scrollWidth - portraitPan.clientWidth;
      if (oldPanRange > 0) session.pan = portraitPan.scrollLeft / oldPanRange;
      const nextWidth = `${field.width}px`, nextHeight = `${field.height}px`;
      if (portraitSurface.style.width !== nextWidth) portraitSurface.style.width = nextWidth;
      if (stage.style.height !== nextHeight) stage.style.height = nextHeight;
      const { outlet, ledge } = field;
      stage.style.marginTop = `-${outlet}px`;
      stage.style.setProperty('--portrait-ledge-thickness', `${ledge.thickness}px`);
      const stageRect = stage.getBoundingClientRect();
      portraitPan.scrollLeft = Math.max(0, field.width - portraitPan.clientWidth) * session.pan;
      metrics.scrollHeight = scrollport.scrollHeight;
      metrics.stageTop = stageRect.top - scrollRect.top + metrics.scrollTop;
      metrics.stageHeight = stage.offsetHeight;
      metrics.portraitScrollStart = Math.ceil(metrics.worldTop + metrics.worldHeight);
      metrics.portraitScrollRange = Math.max(0,
        metrics.scrollHeight - metrics.viewportHeight - metrics.portraitScrollStart);
      const portraitAnchor = portraitReflowAnchorRef.current ?? portraitAnchorRef.current;
      if (portraitAnchor !== null && (restorePortraitAnchor
        || Math.abs(previousTop - metrics.stageTop) > .5 || Math.abs(previousHeight - metrics.stageHeight) > .5
        || Math.abs(previousRange - metrics.portraitScrollRange) > .5)) {
        scrollport.scrollTop = metrics.portraitScrollStart + portraitAnchor * metrics.portraitScrollRange;
        smoothScroll?.reset(); metrics.scrollTop = scrollport.scrollTop;
      }
      restorePortraitAnchor = false;
      textMetrics = textElements.map(element => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, slot: element.dataset.boardTextSlot,
          top: rect.top - scrollRect.top + metrics.scrollTop };
      });
      portraitRenderer.resize({ ...field, boardScale,
        outletTop: metrics.worldTop + layout.mapY(physics.getPortraitOutletY()) * boardScale - metrics.stageTop });
      lifecycle.layoutMeasurements += 1; layoutDirty = false;
      return metrics.worldWidth > 0 && metrics.viewportHeight > 0;
    }
    function applyScrollState() {
      const { scrollTop, viewportHeight, stageTop, stageHeight, worldTop, worldWidth,
        portraitScrollStart, portraitScrollRange } = metrics;
      boardVisible = boardMachineIsVisible(scrollTop, worldTop + metrics.worldHeight);
      const covered = String(!boardVisible);
      if (world.dataset.machineCovered !== covered) world.dataset.machineCovered = covered;
      portraitVisible = scrollTop + viewportHeight > stageTop && scrollTop < stageTop + stageHeight;
      if (physics.isReady() && !physics.isSuspended() && !physics.hasUncapturedBalls()) {
        physics.suspend(); lifecycle.physicsSuspends += 1;
      } else if (boardVisible && physics.isSuspended() && physics.hasUncapturedBalls()) {
        physics.resume(); lifecycle.physicsResumes += 1;
      }
      if (boardVisible) {
        const strip = renderer.updateViewport(metrics);
        physics.setVisibleRange(strip.boardTop, strip.boardBottom, strip.pixelsPerBoardUnit);
      } else renderer.shrink();
      lifecycle.state = portraitVisible ? 'portrait-active' : boardVisible ? 'machine-active' : 'resting';
      portraitAnchorRef.current = scrollTop >= portraitScrollStart - 1
        ? Math.max(0, Math.min(1, (scrollTop - portraitScrollStart)
          / Math.max(1, portraitScrollRange))) : null;
      const progress = Math.min(1, scrollTop / Math.max(1, metrics.scrollHeight - viewportHeight));
      let closest = null, distance = Infinity;
      for (const item of textMetrics) {
        const top = item.top - scrollTop;
        const nextDistance = Math.abs(top + item.height / 2 - viewportHeight / 2);
        if (item.slot && top + item.height > 0 && top < viewportHeight && nextDistance < distance) {
          closest = { slot: item.slot, offset: top }; distance = nextDistance;
        }
      }
      if (scrollTop > 1) {
        userHasScrolledRef.current = true;
        lastScrollAnchorRef.current = { slot: closest?.slot || null, offset: closest?.offset ?? null, progress };
      }
      cueRef.current?.style.setProperty('--about-board-progress', String(progress));
      cueRef.current?.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
      const gatePosition = worldTop + layout.mapY(RESERVOIR_GATE_Y) * worldWidth / BOARD_WIDTH;
      const meterPosition = worldTop + layout.mapY(drumArt.top + drumArt.geometry.gate.pivot[1]) * worldWidth / BOARD_WIDTH;
      gateProgress = boardMechanismProgress(gatePosition, scrollTop, viewportHeight);
      physics.setScrollProgress(gateProgress, boardMechanismProgress(meterPosition, scrollTop, viewportHeight));
      handledScrollTop = scrollTop; scrollDirty = false;
    }
    function frame(now) {
      frameId = 0;
      if (document.hidden || disposed || !ownsSurface()) { lastFrameTime = 0; framePacer.reset(); return; }
      if (!framePacer.takeFrame(now)) { lifecycle.pacedFrames += 1; requestFrame(); return; }
      const frameStarted = performance.now();
      smoothScroll?.raf(now);
      if (layoutDirty && !measureLayout()) return;
      metrics.scrollTop = scrollport.scrollTop;
      if (scrollDirty || handledScrollTop !== metrics.scrollTop) applyScrollState();
      const delta = lastFrameTime ? Math.min(50, now - lastFrameTime) : 1000 / 60;
      lastFrameTime = now;
      const start = performance.now();
      if (!physics.isSuspended() && !advancePhysics(delta)) return;
      const afterPhysics = performance.now();
      const visibleBalls = boardVisible ? renderer.draw() : 0;
      if (!settledPhysicsPublished && physics.isReady()) {
        if (!physics.isOpeningReady()) {
          physicsFailed = true;
          setError(new Error('The opening ball pile could not settle.'));
          return;
        }
        settledPhysicsPublished = true;
        setSettledOpening({ inventory, surfaceY: inventory.surfaceY });
        setPhysicsReady(true); scrollDirty = true;
      }
      if (portraitVisible) {
        // Establish framing before allocating this frame's incoming trajectories.
        portraitRenderer.updateViewport(metrics.worldWidth, metrics.viewportHeight,
          metrics.scrollTop - metrics.stageTop, portraitPan.scrollLeft);
        portraitRenderer.prepare();
        capture.advance(delta);
        portraitRenderer.draw();
        const complete = capture.settled.length === capture.map.count;
        stage.dataset.portraitComplete = String(complete);
      }
      if (!openingPublished && settledPhysicsPublished && openingFontsReadyRef.current) {
        // Match the width React used for marginTop. Canvas measurements can
        // retain a fractional CSS pixel that clientWidth rounds away.
        const lift = (inventory.surfaceY - inventory.radius - layout.reservoirTop) * boardWidth / BOARD_WIDTH;
        const liftCommitted = layout.readerMode || Math.abs(Number.parseFloat(world.style.marginTop || '0') + lift) < .5;
        // The offscreen machine deliberately reports zero text heights while
        // its portrait is visible. Retain its measured layout until it returns.
        const textMeasured = layout.readerMode || !boardVisible || boardTextElements.every(element =>
          quietHeights[element.dataset.boardTextSlot] === Math.ceil(element.getBoundingClientRect().height));
        // React must commit the prepared pile's offset and final font metrics,
        // then the viewport bitmap must be painted at those same coordinates.
        // A restored lower viewport can correctly be empty while the original
        // balls travel toward it. The cold opening still requires its pile.
        if (liftCommitted && textMeasured && (visibleBalls > 0 || !boardVisible || restoringPreparedView)) {
          openingPublished = true;
          setError(null);
          setSceneReady(true);
        }
      }
      if (BOARD_DIAGNOSTICS) {
        const afterDraw = performance.now();
        timing.frames += 1;
        timing.meanPhysicsMs += ((afterPhysics - start) - timing.meanPhysicsMs) / timing.frames;
        timing.recentPhysicsMs += ((afterPhysics - start) - timing.recentPhysicsMs) * .1;
        timing.meanDrawMs += ((afterDraw - afterPhysics) - timing.meanDrawMs) / timing.frames;
        timing.worstFrameMs = Math.max(timing.worstFrameMs, afterDraw - frameStarted);
      }
      if (physics.isReady() && !physics.hasUncapturedBalls() && !physics.isSuspended()) {
        physics.suspend(); lifecycle.physicsSuspends += 1;
      }
      if (!physics.isReady() || (!openingPublished && openingFontsReadyRef.current) || scrollDirty
        || ((boardVisible || physics.hasUncapturedBalls()) && physics.hasActivity())
        || (portraitVisible && capture.hasActivity()) || smoothScroll?.isScrolling === 'smooth') requestFrame();
      else { lastFrameTime = 0; framePacer.reset(); }
    }
    function requestFrame() {
      if (document.hidden || disposed || physicsFailed || !ownsSurface()) return;
      if (!physics.isReady() && !boardVisible) {
        if (!preparationTimer) preparationTimer = window.setTimeout(() => {
          preparationTimer = 0;
          if (disposed || !ownsSurface() || !advancePhysics(0)) return;
          scrollDirty = true;
          if (physics.isReady() && !frameId) frameId = requestAnimationFrame(frame);
          else requestFrame();
        }, 0);
      } else if (!frameId) frameId = requestAnimationFrame(frame);
    }
    function onScroll() { scrollDirty = true; requestFrame(); }
    // Resize can clamp native scroll before the text finishes reflowing. Keep
    // the last portrait anchor through those layout passes until new input.
    function rememberPortraitReflow() {
      if (portraitAnchorRef.current !== null) portraitReflowAnchorRef.current = portraitAnchorRef.current;
    }
    function clearPortraitReflow() { portraitReflowAnchorRef.current = null; }
    function onScrollKey(event) {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) clearPortraitReflow();
    }
    function onWheel(event) {
      if (event.deltaY) clearPortraitReflow();
      if (smoothScroll) requestFrame();
    }
    function rebuildSmoothScroll() {
      reducedMotion = scrollMediaQueries.reducedMotionQuery.matches;
      capture.setReducedMotion(reducedMotion);
      if (reducedMotion && stage.dataset.portraitSwing === 'swinging') stage.dataset.portraitSwing = 'settled';
      framePacer = createBoardFramePacer(reducedMotion);
      smoothScroll?.destroy(); smoothScroll = null;
      if (!shouldUseNativeSmoothScroll(scrollMediaQueries)) {
        smoothScroll = createSmoothScroll({ wrapper: scrollport, content: scrollport,
          autoResize: false, allowNestedScroll: true });
        smoothScroll?.resize();
      }
      onScroll();
    }
    function onVisibility() {
      lastFrameTime = 0; framePacer.reset();
      if (!document.hidden) { smoothScroll?.reset(); requestFrame(); }
    }
    const resizeObserver = new ResizeObserver(() => {
      smoothScroll?.resize(); layoutDirty = true; onScroll();
    });
    for (const element of [scrollport, stage, world, ...textElements]) resizeObserver.observe(element);
    const layoutObserver = new MutationObserver(() => { layoutDirty = true; onScroll(); });
    layoutObserver.observe(world, { attributes: true, attributeFilter: ['style'] });
    scrollport.addEventListener('scroll', onScroll, { passive: true });
    scrollport.addEventListener('wheel', onWheel, { passive: true });
    scrollport.addEventListener('pointerdown', clearPortraitReflow, { passive: true });
    scrollport.addEventListener('keydown', onScrollKey);
    window.addEventListener('resize', rememberPortraitReflow);
    portraitPan.addEventListener('scroll', requestFrame, { passive: true });
    scrollMediaQueries.reducedMotionQuery.addEventListener('change', rebuildSmoothScroll);
    scrollMediaQueries.nativeScrollQuery.addEventListener('change', rebuildSmoothScroll);
    function onThemeChange() { portraitRenderer.invalidate(); onScroll(); }
    function onBallDynamicsChange(event) { physics.setBallMaterial(event.detail); requestFrame(); }
    function onPortraitChange(event) { capture.setSettings(event.detail); layoutDirty = true; onScroll(); }
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    window.addEventListener(BALL_DYNAMICS_CHANGE_EVENT, onBallDynamicsChange);
    window.addEventListener(ABOUT_PORTRAIT_CHANGE_EVENT, onPortraitChange);
    document.addEventListener('visibilitychange', onVisibility);
    rebuildSmoothScroll();
    return () => {
      rememberPortraitReflow();
      disposed = true; cancelAnimationFrame(frameId); window.clearTimeout(preparationTimer);
      resizeObserver.disconnect(); layoutObserver.disconnect(); smoothScroll?.destroy();
      scrollMediaQueries.reducedMotionQuery.removeEventListener('change', rebuildSmoothScroll);
      scrollMediaQueries.nativeScrollQuery.removeEventListener('change', rebuildSmoothScroll);
      scrollport.removeEventListener('scroll', onScroll); scrollport.removeEventListener('wheel', onWheel);
      scrollport.removeEventListener('pointerdown', clearPortraitReflow);
      scrollport.removeEventListener('keydown', onScrollKey);
      window.removeEventListener('resize', rememberPortraitReflow);
      portraitPan.removeEventListener('scroll', requestFrame);
      window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
      window.removeEventListener(BALL_DYNAMICS_CHANGE_EVENT, onBallDynamicsChange);
      window.removeEventListener(ABOUT_PORTRAIT_CHANGE_EVENT, onPortraitChange);
      document.removeEventListener('visibilitychange', onVisibility);
      if (physics.isOpeningReady()) { session.checkpoint = physics.createCheckpoint(); session.layout = layout; }
      const panRange = portraitPan.scrollWidth - portraitPan.clientWidth;
      if (panRange > 0) session.pan = portraitPan.scrollLeft / panRange;
      portraitRenderer.dispose(); renderer.dispose(); physics.dispose();
      removePortraitChute(); restoreQuietGeometry(); drumArt.dispose(); handoffArt.dispose(); restoreLineWeight();
      if (diagnostics && window.__ABS_ABOUT_GAME_BOARD__ === diagnostics) delete window.__ABS_ABOUT_GAME_BOARD__;
      physicsRef.current = null; rendererRef.current = null; portraitRef.current = null;
      drawRef.current = () => {};
    };
  }, [source, layout, radiusScale, inventory, quietHeights, boardWidth]);

  useEffect(() => {
    if (!source || readerMode || !worldRef.current) return undefined;
    const elements = [...worldRef.current.querySelectorAll('[data-board-text-slot]')];
    let frameId = 0;
    const measure = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        // Hidden descendants can report zero size. Retain the last readable
        // layout until the machine is shown again, rather than collapsing it.
        if (worldRef.current?.dataset.machineCovered === 'true') return;
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
      if (disposed || worldRef.current?.dataset.machineCovered === 'true') return;
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
  return <section className="about-game-board" style={source?.architectureStyle}
    data-route-content={routeContentId} data-about-scene-ready={sceneReady || Boolean(error) ? 'true' : 'false'}
    data-about-physics-ready={physicsReady || Boolean(error) ? 'true' : 'false'}
    aria-busy={!sceneReady && !error}
    aria-labelledby="about-route-title">
    <div className="about-board-viewport-measure" ref={viewportMeasureRef} aria-hidden="true" />
    {error ? <div className="about-board-error" role="alert">
      <h1 id="about-route-title" data-route-focus-target tabIndex={-1}>About Me</h1>
      <p>{OPENING_COPY}</p>
      <p>The interactive drawing could not load. You can still get in touch below.</p>
      <a href={`mailto:${email}`}>{email}</a>
    </div> : null}
    <div className="about-board-scrollport" ref={scrollRef} inert={!sceneReady || Boolean(error)}
      aria-hidden={!sceneReady || error ? true : undefined}>
      <div className="about-board-content">
        <div className="about-board-intro">
          <div className="about-board-intro__copy route-title-lockup" data-about-scroll-text
            style={boardEditorialGridSlot('introduction', mobile)}>
            <h1
              id={error ? undefined : 'about-route-title'}
              className="route-centered-page__title route-bookend-title"
              data-route-enter={error ? undefined : 'identity'}
              data-route-enter-order="0"
              data-route-enter-variant="bookend-title"
              data-route-focus-target={error ? undefined : ''}
              tabIndex={-1}
            >
              About Me
            </h1>
            <span className="route-title-lockup__rule" aria-hidden="true" />
            <p
              className="about-board-intro__statement route-centered-page__description route-intro-description"
              data-route-enter={error ? undefined : 'context'}
              data-route-enter-variant="bookend-description"
            >
              {OPENING_COPY}
            </p>
          </div>
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
        {source ? <>
          <section className="about-board-portrait-stage" ref={portraitStageRef}
            aria-label="A portrait of Alex made from the original balls">
            <div className="about-board-portrait-viewport" ref={portraitPanRef} tabIndex={0}
              role="group" aria-label="Portrait canvas. Swipe sideways or use left and right arrow keys to explore."
              onKeyDown={event => {
                const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
                const viewport = event.currentTarget;
                if (!direction || viewport.scrollWidth <= viewport.clientWidth) return;
                event.preventDefault();
                viewport.scrollBy({ left: direction * 40 });
              }}>
              <div className="about-board-portrait-surface" ref={portraitSurfaceRef}>
                <div className="about-board-portrait-bitmap">
                  <canvas className="about-board-portrait-canvas" ref={portraitCanvasRef} aria-hidden="true" />
                </div>
                <div className="about-board-portrait-ledge" aria-hidden="true" />
              </div>
            </div>
          </section>
          <footer className="about-board-ending">
            <div className="about-board-ending__invitation">
              <h2 className="route-centered-page__title route-bookend-title">{copy('text-epilogue-invitation').text}</h2>
              <p>{copy('text-epilogue-invitation').description}</p>
              <div className="about-board-ending__actions">
                <ActionButton className="about-board-contact-action" href={buildRouteHref('contact')}
                  label="Contact Me" onClick={navigateToContact}
                  data-sound-action="press" data-sound-source="about-contact" />
                <CvDownloadAction soundSource="about-download-cv" showIcon={false} />
                <LinkedInAction href={linkedin} soundSource="about-linkedin" />
              </div>
            </div>
          </footer>
        </> : null}
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
