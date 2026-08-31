import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { hasGateAccess } from '../../lib/access-gates.js';
import { triggerHaptic } from '../../lib/haptics.js';
import { resolveRouteFromPathname } from '../../lib/routes.js';
import {
  createRouteMaterialEntranceController,
  getRouteCardMotionFrame,
} from '../../lib/motion/route-material-entrance.js';
import {
  ROUTE_ENTRANCE_START_EVENT,
} from '../../lib/motion/route-entrance-events.js';
import { registerRouteTransitionParticipant } from '../../lib/motion/route-transition-participants.js';
import {
  playInteractionSound,
  playScrollDetent,
} from '../../legacy/modules/audio/sound-engine.js';
import { createScrollSoundController } from '../../legacy/modules/audio/scroll-sound-controller.js';
import {
  registerSimulationAtmosphereSource,
  tickSimulationAtmosphere,
} from '../../legacy/modules/rendering/atmosphere/simulation-atmosphere.js';
import {
  derivePlaygroundConfig,
  loadDesignSystemConfig,
} from '../../legacy/modules/utils/design-config.js';
import { waitForFonts } from '../../legacy/modules/utils/font-loader.js';
import { useDailyFocusReducedMotion } from '../daily-focus/dailyFocusTheme.js';
import {
  getSimulationPaletteSnapshot,
  subscribeSimulationPalette,
} from '../../palette/simulationPaletteController.js';
import {
  WORK_ITEM_KINDS,
  loadWorkCatalog,
} from '../portfolio/work/workCatalog.js';
import { WorkCaseStudyPresenter } from '../portfolio/work/WorkCaseStudyPresenter.js';
import { WorkSnippetStage } from '../portfolio/work/WorkSnippetStage.jsx';
import {
  getPlaygroundConfigSnapshot,
  setPlaygroundConfig,
  subscribePlaygroundConfig,
} from './config/playgroundConfig.js';
import {
  registerPlaygroundPanelRoute,
  unregisterPlaygroundPanelRoute,
} from './config/playgroundPanel.js';
import {
  PlaygroundLightbox,
  PlaygroundMedia,
  PlaygroundPoster,
  clearPlaygroundWorkSelection,
  getPlaygroundItem,
  loadPlaygroundContent,
  parsePlaygroundWorkSelection,
  selectBoundedActiveWorldMediaIds,
  updatePlaygroundWorkSelection,
} from './media/index.js';
import {
  calculateContentWorld,
  calculateNeighbouringCopyCoverage,
  applyPlaygroundResponsiveProfile,
  createPlaygroundCameraController,
  createPlaygroundDotFieldRenderer,
  createPlaygroundResponsiveProfile,
  createPlaygroundSpatialDiagnostics,
  findDirectionalPlaygroundItem,
  forEachNeighbouringCopy,
  placePlaygroundItems,
  projectDepthCoordinate,
  resolveDepthSource,
} from './spatial/index.js';
import './playground.css';
import '../portfolio/work/workCanvas.css';

const INITIAL_POSTER_TIMEOUT_MS = 2200;
const TITLE_SAFE_PADDING_CELLS = 0;
const COPY_KEY_SEPARATOR = ':';
const PROJECT_NAVIGATION_DIRECTIONS = Object.freeze({
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
});

const LAYOUT_CONFIG_KEYS = Object.freeze([
  'layoutPreset',
  'layoutSeed',
  'gridSpacingPx',
  'minimumWorldColumns',
  'minimumWorldRows',
  'worldPaddingCells',
  'projectSpacing',
  'itemGapCells',
  'itemScale',
  'itemViewportScale',
  'sizeVariation',
  'labelGapPx',
  'maximumCaseStudyWidthPx',
  'snippetDepth',
  'projectClearanceCells',
  'viewportWidthCells',
  'viewportHeightCells',
]);

function getMediaTypeLabel(type) {
  if (type === 'video') return 'Video';
  if (type === 'code') return 'Code demo';
  return 'Image';
}

function isCaseStudy(item) {
  return item?.kind === WORK_ITEM_KINDS.caseStudy;
}

function CaseStudyCardContent({ item }) {
  return (
    <>
      <span className="portfolio-project-card__surface">
        <span className="portfolio-project-card__material">
          <span className="portfolio-project-card__media">
            <img
              className="portfolio-project-card__image"
              src={item.source}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </span>
        </span>
      </span>
      <span className="work-case-study-caption" aria-hidden="true">
        <span className="work-case-study-caption__title">{item.label}</span>
        <span className="work-case-study-caption__kind">
          {item.client ? `${item.client} · ` : ''}Case study
        </span>
      </span>
    </>
  );
}

function createLayoutKey(config) {
  return LAYOUT_CONFIG_KEYS.map((key) => `${key}:${config[key]}`).join('|');
}

function mapContentItemsForPlacement(items) {
  return items.map((item) => ({
    ...item,
    preferredWidthCells: item.preferredGridSpan.columns,
    preferredHeightCells: item.preferredGridSpan.rows,
  }));
}

function createTitleSafeArea(titleRect, gridSpacingPx) {
  const halfWidthCells = Math.max(4, Math.ceil(titleRect.width / gridSpacingPx / 2));
  const halfHeightCells = Math.max(3, Math.ceil(titleRect.height / gridSpacingPx / 2));
  return {
    left: -halfWidthCells,
    top: -halfHeightCells,
    right: halfWidthCells,
    bottom: halfHeightCells,
  };
}

function buildSpatialModel(content, config, titleRect) {
  const items = mapContentItemsForPlacement(content.items);
  const titleSafeAreaCells = createTitleSafeArea(titleRect, config.gridSpacingPx * config.worldScale);
  const placementResult = placePlaygroundItems(items, {
    ...config,
    includeTypeRow: false,
    titleSafeAreaCells,
    titleSafePaddingCells: TITLE_SAFE_PADDING_CELLS,
  });
  const world = calculateContentWorld(placementResult.placements, {
    ...config,
    titleSafeAreaCells: placementResult.titleSafeArea,
  });
  const placementById = new Map();
  placementResult.placements.forEach((placement) => {
    placementById.set(placement.id, placement);
  });
  return {
    items,
    placements: placementResult.placements,
    planes: [
      { id: 'case-studies', placements: placementResult.placements.filter((item) => item.kind !== WORK_ITEM_KINDS.snippet) },
      { id: 'snippets', placements: placementResult.placements.filter((item) => item.kind === WORK_ITEM_KINDS.snippet) },
    ].filter((plane) => plane.placements.length),
    placementById,
    placementDiagnostics: placementResult.diagnostics,
    titleSafeArea: placementResult.titleSafeArea,
    titleRect: {
      width: titleRect.width,
      height: titleRect.height,
    },
    world,
  };
}

function buildCopyList(coverage) {
  const copies = [];
  forEachNeighbouringCopy(coverage, (offsetX, offsetY, column, row) => {
    copies.push({
      key: `${column}${COPY_KEY_SEPARATOR}${row}`,
      column,
      row,
      offsetX,
      offsetY,
    });
  });
  return copies;
}

function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function waitForPlaygroundRouteReady(root, signal) {
  return new Promise((resolve) => {
    let observer = null;
    const finish = (ready) => {
      observer?.disconnect();
      signal?.removeEventListener('abort', handleAbort);
      resolve(ready);
    };
    const inspect = () => {
      if (signal?.aborted || !root?.isConnected) {
        finish(false);
        return;
      }
      if (root.dataset.playgroundReady === 'true') {
        finish(true);
        return;
      }
      if (root.dataset.playgroundError === 'true') finish(false);
    };
    const handleAbort = () => finish(false);
    signal?.addEventListener('abort', handleAbort, { once: true });
    observer = new MutationObserver(inspect);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-playground-ready', 'data-playground-error'],
    });
    inspect();
  });
}

async function waitForInitialPosters(root, timeoutMs = INITIAL_POSTER_TIMEOUT_MS) {
  await waitForPaint();
  if (!root) return;
  const viewportRect = root.getBoundingClientRect();
  const images = Array.from(root.querySelectorAll('[data-playground-item] img'))
    .filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.right > viewportRect.left
        && rect.left < viewportRect.right
        && rect.bottom > viewportRect.top
        && rect.top < viewportRect.bottom;
    });
  if (!images.length) return;

  const ready = Promise.allSettled(images.map(async (image) => {
    if (image.complete) {
      if (typeof image.decode === 'function') await image.decode().catch(() => {});
      return;
    }
    await new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    });
  }));
  await Promise.race([
    ready,
    new Promise((resolve) => window.setTimeout(resolve, timeoutMs)),
  ]);
}

const DecorativeWorldCopy = memo(function DecorativeWorldCopy({ copy, content, placements, parallax, config, worldScale, onOpen }) {
  return (
    <div
      className="playground-world-copy"
      data-playground-copy={`${copy.column},${copy.row}`}
      aria-hidden="true"
      style={{
        '--playground-copy-x-px': `${copy.offsetX * worldScale * parallax}px`,
        '--playground-copy-y-px': `${copy.offsetY * worldScale * parallax}px`,
      }}
    >
      <div className="playground-collection" role="presentation">
        {placements.map((placement) => {
          const item = getPlaygroundItem(content, placement.id);
          const caseStudy = isCaseStudy(item);
          return (
            <div
              key={placement.id}
              className={[
                'playground-item',
                'playground-item--decorative',
                caseStudy ? 'playground-item--case-study' : 'playground-item--snippet',
              ].join(' ')}
              data-playground-decorative-item={placement.id}
              data-work-item-kind={item?.kind || WORK_ITEM_KINDS.snippet}
              data-playground-copy-column={copy.column}
              data-playground-copy-row={copy.row}
              style={{
                '--playground-item-x-px': `${projectDepthCoordinate(placement.xCell, placement.footprintWidthCells, parallax) * config.gridSpacingPx}px`,
                '--playground-item-y-px': `${projectDepthCoordinate(placement.yCell, placement.footprintHeightCells, parallax) * config.gridSpacingPx}px`,
                '--playground-item-width-px': `${placement.mediaWidthCells * config.gridSpacingPx}px`,
                '--playground-item-height-px': `${placement.mediaHeightCells * config.gridSpacingPx}px`,
              }}
            >
              <div className="playground-item__route-surface">
                <button
                  type="button"
                  tabIndex={-1}
                  data-work-repeat-action
                  data-sound-action="manual"
                  aria-label={item.label}
                  className={caseStudy ? 'work-canvas-card portfolio-project-card' : undefined}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={(event) => onOpen(item.id, event)}
                >
                {caseStudy ? <CaseStudyCardContent item={item} /> : (
                  <>
                    <PlaygroundPoster item={item} decorative />
                    <div className="playground-item__label" aria-hidden="true">
                      <p className="playground-item__title">{item.label}</p>
                    </div>
                  </>
                )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export function PlaygroundExperience({ experience = 'work' }) {
  const isWorkExperience = experience === 'work';
  const routeId = isWorkExperience ? 'portfolio' : 'playground';
  const routeLabel = isWorkExperience ? 'Work' : 'Lab';
  const participantId = `${routeId}-spatial-view-material`;
  const atmosphereSourceId = `${routeId}:dot-field`;
  const diagnosticGlobalKey = isWorkExperience ? '__ABS_WORK__' : '__ABS_PLAYGROUND__';
  const routeRef = useRef(null);
  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const snippetPlaneRef = useRef(null);
  const titleRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const dotRendererRef = useRef(null);
  const modelRef = useRef(null);
  const configRef = useRef(getPlaygroundConfigSnapshot());
  const contentRef = useRef(null);
  const selectedIdRef = useRef(null);
  const presentedIdRef = useRef(null);
  const semanticItemNodesRef = useRef(new Map());
  const focusItemNodesRef = useRef(new Map());
  const decorativeInstancesRef = useRef([]);
  const copySignatureRef = useRef('');
  const cameraFrameRef = useRef(null);
  const lastLogicalCameraRef = useRef({ x: 0, y: 0 });
  const scrollSoundControllerRef = useRef(null);
  const draggingRef = useRef(false);
  const spatialCleanupRef = useRef(null);
  const diagnosticsRef = useRef({});
  const diagnosticsSubscribersRef = useRef(new Set());
  const activeVideoOwnersRef = useRef(new Set());
  const activeIframeOwnersRef = useRef(new Set());
  const applyCameraFrameRef = useRef(() => {});
  const returnFocusIdRef = useRef(null);
  const requestCloseHandlerRef = useRef(() => {});
  const workPresenterRef = useRef(null);
  const workPresentationTokenRef = useRef(0);
  const workPendingAccessIdRef = useRef(null);
  const workSourceRef = useRef(null);
  const materialEntranceRef = useRef(null);
  const dotMaterialTargetRef = useRef(Object.freeze({ kind: 'dot-field' }));
  const dotMaterialScaleRef = useRef(0);

  const [content, setContent] = useState(null);
  const [config, setConfigState] = useState(() => getPlaygroundConfigSnapshot());
  const [configLoaded, setConfigLoaded] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [model, setModel] = useState(null);
  const [copies, setCopies] = useState([]);
  const [viewportNode, setViewportNodeState] = useState(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [presentedId, setPresentedId] = useState(null);
  const [keyboardItemId, setKeyboardItemId] = useState(null);
  const [activeWorldMediaIds, setActiveWorldMediaIds] = useState(() => new Set());
  const [readyWorldMediaIds, setReadyWorldMediaIds] = useState(() => new Set());
  const [loadError, setLoadError] = useState('');
  const [interactiveModel, setInteractiveModel] = useState(null);
  const [readyModel, setReadyModel] = useState(null);
  const reducedMotion = useDailyFocusReducedMotion();
  const responsiveProfile = useMemo(
    () => createPlaygroundResponsiveProfile(viewportSize.width, viewportSize.height),
    [viewportSize],
  );
  const runtimeConfig = useMemo(
    () => applyPlaygroundResponsiveProfile(config, responsiveProfile),
    [config, responsiveProfile],
  );
  const layoutKey = useMemo(() => createLayoutKey(runtimeConfig), [runtimeConfig]);
  const selectedItem = useMemo(
    () => getPlaygroundItem(content, selectedId),
    [content, selectedId],
  );
  const presentedItem = useMemo(
    () => getPlaygroundItem(content, presentedId),
    [content, presentedId],
  );
  const ready = Boolean(model && readyModel === model && !loadError);
  const interactive = Boolean(model && interactiveModel === model && !loadError);
  const defaultKeyboardItemId = useMemo(() => {
    const placements = model?.placements || [];
    const primaryPlacements = isWorkExperience
      ? placements.filter((placement) => isCaseStudy(getPlaygroundItem(content, placement.id)))
      : placements;
    const keyboardPlacements = primaryPlacements.length > 0 ? primaryPlacements : placements;
    return keyboardPlacements.reduce((nearest, placement) => {
      const centreX = placement.xCell + (placement.footprintWidthCells / 2);
      const centreY = placement.yCell + (placement.footprintHeightCells / 2);
      const distance = Math.hypot(centreX, centreY);
      return !nearest || distance < nearest.distance
        ? { id: placement.id, distance }
        : nearest;
    }, null)?.id || null;
  }, [content, isWorkExperience, model]);
  const rovingKeyboardItemId = keyboardItemId && model?.placementById.has(keyboardItemId)
    ? keyboardItemId
    : defaultKeyboardItemId;

  useLayoutEffect(() => {
    configRef.current = runtimeConfig;
    contentRef.current = content;
    modelRef.current = model;
    selectedIdRef.current = selectedId;
    presentedIdRef.current = presentedId;
  }, [content, model, presentedId, runtimeConfig, selectedId]);

  useLayoutEffect(() => {
    const route = routeRef.current;
    if (!route) return undefined;
    let materialLayoutSnapshot = null;
    const invalidateMaterialLayoutSnapshot = () => {
      materialLayoutSnapshot = null;
    };
    const getMaterialLayoutSnapshot = () => {
      const items = [...route.querySelectorAll('.playground-item')];
      const reusable = materialLayoutSnapshot
        && materialLayoutSnapshot.items.length === items.length
        && items.every((item, index) => materialLayoutSnapshot.items[index] === item)
        && items.every((item) => item.isConnected);
      if (reusable) return materialLayoutSnapshot;

      const viewport = route.querySelector('[data-playground-viewport]');
      const viewportRect = viewport?.getBoundingClientRect();
      if (!viewportRect?.width || !viewportRect?.height) {
        materialLayoutSnapshot = {
          items,
          targets: [dotMaterialTargetRef.current],
          delayRatios: new WeakMap(),
        };
        return materialLayoutSnapshot;
      }
      const margin = 80;
      const visibleItems = [];
      const delayRatios = new WeakMap();
      const viewportCenterX = viewportRect.left + (viewportRect.width / 2);
      const viewportCenterY = viewportRect.top + (viewportRect.height / 2);
      const radius = Math.max(1, Math.hypot(viewportRect.width, viewportRect.height) * 0.5);
      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const visible = rect.right >= viewportRect.left - margin
          && rect.left <= viewportRect.right + margin
          && rect.bottom >= viewportRect.top - margin
          && rect.top <= viewportRect.bottom + margin;
        if (!visible) return;
        visibleItems.push(item);
        const dx = (rect.left + (rect.width / 2)) - viewportCenterX;
        const dy = (rect.top + (rect.height / 2)) - viewportCenterY;
        delayRatios.set(
          item,
          0.35 + (Math.min(1, Math.hypot(dx, dy) / radius) * 0.65),
        );
      });
      materialLayoutSnapshot = {
        items,
        targets: [dotMaterialTargetRef.current, ...visibleItems],
        delayRatios,
      };
      return materialLayoutSnapshot;
    };
    const cardMotionFrame = {};
    const controller = createRouteMaterialEntranceController({
      id: participantId,
      routeId,
      diagnosticRoot: route,
      getTargets: () => getMaterialLayoutSnapshot().targets,
      setTargetScale: (target, progress, index, detail) => {
        if (target === dotMaterialTargetRef.current) {
          dotMaterialScaleRef.current = progress;
          dotRendererRef.current?.setRouteVisualScale(progress, { immediate: true });
          return;
        }
        const frame = getRouteCardMotionFrame(progress, {
          direction: index % 2 === 0 ? -1 : 1,
          timing: detail?.timing,
        }, cardMotionFrame);
        target.style.setProperty('--playground-route-card-scale', String(frame.scale));
        target.style.setProperty('--playground-route-card-y', `${frame.translateY}px`);
      },
      getDelayRatio: (item, index, targets, direction) => {
        if (item === dotMaterialTargetRef.current) return direction === 'out' ? 1 : 0;
        if (direction === 'out') return 0;
        return materialLayoutSnapshot?.delayRatios.get(item) ?? 0.35;
      },
      requestRender: () => dotRendererRef.current?.drawImmediately(),
      getReducedMotion: () => reducedMotion,
    });
    materialEntranceRef.current = controller;
    controller.prepare({ reducedMotion });
    const unregisterParticipant = registerRouteTransitionParticipant({
      id: participantId,
      routeId,
      prepare: ({ signal }) => {
        invalidateMaterialLayoutSnapshot();
        return controller.prepare({ signal, reducedMotion });
      },
      exit: ({ signal }) => {
        invalidateMaterialLayoutSnapshot();
        return controller.exit({ signal, reducedMotion });
      },
      waitUntilReady: ({ signal }) => waitForPlaygroundRouteReady(route, signal),
      enter: async ({ signal }) => {
        const readyForMaterial = await waitForPlaygroundRouteReady(route, signal);
        if (!readyForMaterial) return false;
        return controller.enter({ signal, reducedMotion });
      },
      restore: () => controller.settle('route-restored'),
      cancel: ({ reason }) => controller.cancel(reason),
    });
    const handleDirectRouteEntrance = (event) => {
      if (event.detail?.routeId !== routeId || event.detail?.mode !== 'direct') return;
      invalidateMaterialLayoutSnapshot();
      void controller.enter({ reducedMotion });
    };
    window.addEventListener(ROUTE_ENTRANCE_START_EVENT, handleDirectRouteEntrance);

    return () => {
      window.removeEventListener(ROUTE_ENTRANCE_START_EVENT, handleDirectRouteEntrance);
      unregisterParticipant();
      controller.destroy({ settleTargets: false });
      materialLayoutSnapshot = null;
      if (materialEntranceRef.current === controller) materialEntranceRef.current = null;
    };
  }, [participantId, reducedMotion, routeId]);

  const publishDiagnostics = useCallback((patch = {}) => {
    diagnosticsRef.current = Object.freeze({
      ...diagnosticsRef.current,
      ...patch,
    });
    diagnosticsSubscribersRef.current.forEach((listener) => {
      listener(diagnosticsRef.current);
    });
  }, []);

  const handleMediaRuntimeStateChange = useCallback(({
    type,
    ownerId,
    active,
    ready: runtimeReady = false,
  }) => {
    const owners = type === 'video'
      ? activeVideoOwnersRef.current
      : activeIframeOwnersRef.current;
    if (active) owners.add(ownerId);
    else owners.delete(ownerId);
    if (ownerId?.startsWith('world:')) {
      const itemId = ownerId.slice('world:'.length);
      setReadyWorldMediaIds((current) => {
        const shouldBeReady = active && runtimeReady;
        if (current.has(itemId) === shouldBeReady) return current;
        const next = new Set(current);
        if (shouldBeReady) next.add(itemId);
        else next.delete(itemId);
        return next;
      });
    }
    publishDiagnostics({
      activeVideoCount: activeVideoOwnersRef.current.size,
      activeIframeCount: activeIframeOwnersRef.current.size,
    });
  }, [publishDiagnostics]);

  const subscribeDiagnostics = useCallback((listener) => {
    diagnosticsSubscribersRef.current.add(listener);
    listener(diagnosticsRef.current);
    return () => diagnosticsSubscribersRef.current.delete(listener);
  }, []);

  const recenter = useCallback(() => {
    cameraRef.current?.setCamera(0, 0, { immediate: true });
    triggerHaptic('step');
  }, []);

  const bindViewportNode = useCallback((node) => {
    if (viewportRef.current && viewportRef.current !== node) {
      spatialCleanupRef.current?.();
    }
    viewportRef.current = node;
    setViewportNodeState(node);
    const rect = node?.getBoundingClientRect();
    setViewportSize({ width: Math.round(rect?.width || 0), height: Math.round(rect?.height || 0) });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const unsubscribe = subscribePlaygroundConfig((nextConfig) => {
      if (!cancelled) setConfigState(nextConfig);
    }, { emitInitial: true });

    Promise.all([
      isWorkExperience
        ? loadWorkCatalog({ signal: controller.signal })
        : loadPlaygroundContent({ signal: controller.signal }),
      loadDesignSystemConfig(),
      waitForFonts(),
    ]).then(([nextContent, designSystem]) => {
      if (cancelled) return;
      setPlaygroundConfig(derivePlaygroundConfig(designSystem), {
        reason: 'canonical-load',
      });
      setContent(nextContent);
      setConfigLoaded(true);
      setFontsReady(true);
      const directSelection = parsePlaygroundWorkSelection(window.location, nextContent.items);
      if (directSelection) {
        returnFocusIdRef.current = directSelection;
        setSelectedId(directSelection);
      }
    }).catch((error) => {
      if (cancelled || error?.name === 'AbortError') return;
      setLoadError(error?.message || `${routeLabel} could not be prepared.`);
      window.dispatchEvent(new CustomEvent('abs:route-failed', {
        detail: { routeId, reason: 'content-or-config' },
      }));
    });

    return () => {
      cancelled = true;
      controller.abort();
      unsubscribe();
    };
  }, [isWorkExperience, routeId, routeLabel]);

  useLayoutEffect(() => {
    if (!content || !fontsReady || !configLoaded || !titleRef.current) return;
    // The safe area describes settled layout, not a temporary route entrance
    // scale on an ancestor. Camera transforms must not affect packing either.
    const titleRect = { width: titleRef.current.offsetWidth, height: titleRef.current.offsetHeight };
    if (titleRect.width <= 0 || titleRect.height <= 0) return;
    try {
      setModel(buildSpatialModel(content, configRef.current, titleRect));
      setLoadError('');
    } catch (error) {
      setModel(null);
      setLoadError(error?.message || `${routeLabel} layout could not be calculated.`);
    }
  }, [content, configLoaded, fontsReady, layoutKey, routeLabel]);

  useEffect(() => {
    const handlePopState = () => {
      const remainsOnRoute = isWorkExperience
        ? resolveRouteFromPathname(window.location.pathname)?.id === routeId
        : ['/playground', '/playground.html'].includes(window.location.pathname);
      if (!remainsOnRoute) {
        spatialCleanupRef.current?.();
        return;
      }
      const nextId = parsePlaygroundWorkSelection(window.location, contentRef.current?.items);
      if (selectedIdRef.current && !nextId) {
        playInteractionSound('close', { source: `${routeId}-project-close` });
        triggerHaptic('close');
      }
      if (isWorkExperience && !nextId) {
        const currentPresentedItem = getPlaygroundItem(
          contentRef.current,
          presentedIdRef.current,
        );
        if (isCaseStudy(currentPresentedItem)) setPresentedId(null);
      }
      setSelectedId(nextId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isWorkExperience, routeId]);

  const openItem = useCallback((itemId, event) => {
    const activeContent = contentRef.current;
    const item = getPlaygroundItem(activeContent, itemId);
    if (!item) return;
    returnFocusIdRef.current = itemId;
    const camera = cameraRef.current;
    const snapshot = camera?.getSnapshot();
    const rect = event?.currentTarget?.getBoundingClientRect();
    const viewportRect = viewportRef.current?.getBoundingClientRect();
    const placement = modelRef.current?.placementById.get(itemId);
    if (isWorkExperience && placement && snapshot && rect && viewportRect) {
      const spacing = configRef.current.gridSpacingPx;
      workSourceRef.current = {
        itemId,
        ...resolveDepthSource({
          rect, viewportRect, camera: snapshot, worldScale: responsiveProfile.worldScale,
          parallax: reducedMotion ? 1 : placement.parallax,
          width: placement.footprintWidthCells * spacing,
          height: placement.footprintHeightCells * spacing,
        }),
      };
      // Keep the persistent semantic item on this exact visible repeat. The
      // swap has identical geometry and cannot change media runtime ownership.
      camera.setCamera(snapshot.logicalX, snapshot.logicalY, { immediate: true });
    }
    if (isWorkExperience && presentedIdRef.current !== itemId) setPresentedId(null);
    updatePlaygroundWorkSelection(itemId, { itemsOrIds: activeContent.items });
    setSelectedId(itemId);
    setSelectionRevision((revision) => revision + 1);
    if (isWorkExperience && ready && workSourceRef.current && camera
      && (item.access !== 'protected' || hasGateAccess('portfolio'))) {
      const target = workSourceRef.current;
      const travel = Math.hypot(target.targetX - snapshot.logicalX, target.targetY - snapshot.logicalY);
      const durationMs = reducedMotion || travel < 4
        ? 0 : Math.min(340, Math.max(220, 180 + travel * 0.12));
      if (routeRef.current) routeRef.current.dataset.workOpenPhase = 'centering';
      camera.setEnabled(true);
      void camera.animateTo(target.targetX, target.targetY, { durationMs });
      // A direct activation already has a measured source. Mount its stage in
      // this same update, without paying for another render and animation frame.
      setPresentedId(itemId);
    }
    playInteractionSound('project-open', { source: `${routeId}-project-${itemId}` });
    triggerHaptic('open', { event });
  }, [isWorkExperience, ready, reducedMotion, responsiveProfile.worldScale, routeId]);

  const requestClose = useCallback(({ reason } = {}) => {
    const result = clearPlaygroundWorkSelection({ preferBack: true });
    if (isWorkExperience || result !== 'back') {
      playInteractionSound('close', { source: `${routeId}-project-close` });
      triggerHaptic('close');
      if (isWorkExperience) {
        const currentPresentedItem = getPlaygroundItem(
          contentRef.current,
          presentedIdRef.current,
        );
        if (isCaseStudy(currentPresentedItem)) setPresentedId(null);
      }
      setSelectedId(null);
    }
    if (reason === 'programmatic') return;
  }, [isWorkExperience, routeId]);

  useLayoutEffect(() => {
    requestCloseHandlerRef.current = requestClose;
  }, [requestClose]);

  const setWorldInert = useCallback((isInert) => {
    const world = worldRef.current;
    if (world) {
      world.inert = isInert;
      if (isInert) world.setAttribute('aria-hidden', 'true');
      else world.removeAttribute('aria-hidden');
    }
    cameraRef.current?.setEnabled(!isInert, { preserveAnimation: isInert });
    if (isInert) scrollSoundControllerRef.current?.reset();
  }, []);

  const restoreItemFocus = useCallback((itemId) => {
    workSourceRef.current = null;
    cameraRef.current?.requestUpdate();
    setKeyboardItemId(itemId);
    focusItemNodesRef.current.get(itemId)?.focus({ preventScroll: true });
  }, []);

  const handleWorkSnippetExited = useCallback((itemId) => {
    setPresentedId((currentId) => (currentId === itemId ? null : currentId));
    if (routeRef.current) routeRef.current.dataset.workOpenPhase = 'idle';
  }, []);

  const handleWorkSnippetPhaseChange = useCallback((phase) => {
    if (routeRef.current) routeRef.current.dataset.workOpenPhase = phase;
  }, []);

  const getWorkSourceElement = useCallback(
    (itemId) => focusItemNodesRef.current.get(itemId) || null,
    [],
  );

  const getItemCameraTarget = useCallback((itemId) => {
    const placement = modelRef.current?.placementById.get(itemId);
    const camera = cameraRef.current;
    if (!placement || !camera) return null;
    const snapshot = camera.getSnapshot();
    const spacing = configRef.current.gridSpacingPx;
    const worldScale = responsiveProfile.worldScale;
    const cameraScale = worldScale * (reducedMotion ? 1 : placement.parallax);
    const itemCenterX = (placement.xCell + (placement.footprintWidthCells / 2)) * spacing;
    const itemCenterY = (placement.yCell + (placement.footprintHeightCells / 2)) * spacing;
    const nearestColumn = Math.round((snapshot.logicalX - itemCenterX) / snapshot.worldWidthPx);
    const nearestRow = Math.round((snapshot.logicalY - itemCenterY) / snapshot.worldHeightPx);
    const pinned = workSourceRef.current?.itemId === itemId ? workSourceRef.current : null;
    let targetX = pinned?.targetX ?? itemCenterX + (nearestColumn * snapshot.worldWidthPx);
    let targetY = pinned?.targetY ?? itemCenterY + (nearestRow * snapshot.worldHeightPx);
    const sourceRect = focusItemNodesRef.current.get(itemId)?.getBoundingClientRect();
    const viewportRect = viewportRef.current?.getBoundingClientRect();
    if (!pinned && sourceRect?.width && viewportRect) {
      targetX = snapshot.logicalX
        + (sourceRect.left + sourceRect.width / 2 - viewportRect.left - snapshot.viewportCenterX) / cameraScale;
      targetY = snapshot.logicalY
        + (sourceRect.top + sourceRect.height / 2 - viewportRect.top - snapshot.viewportCenterY) / cameraScale;
    }
    const screenX = snapshot.viewportCenterX + ((targetX - snapshot.logicalX) * cameraScale);
    const screenY = snapshot.viewportCenterY + ((targetY - snapshot.logicalY) * cameraScale);
    const itemWidth = placement.footprintWidthCells * spacing * worldScale;
    const itemHeight = placement.footprintHeightCells * spacing * worldScale;
    const margin = Math.max(16, Math.min(40,
      (snapshot.viewportWidthPx - itemWidth) / 2,
      (snapshot.viewportHeightPx - itemHeight) / 2));
    const clipped = screenX - (itemWidth / 2) < margin
      || screenX + (itemWidth / 2) > snapshot.viewportWidthPx - margin
      || screenY - (itemHeight / 2) < margin
      || screenY + (itemHeight / 2) > snapshot.viewportHeightPx - margin;
    return { camera, snapshot, targetX, targetY, clipped };
  }, [reducedMotion, responsiveProfile.worldScale]);

  const focusLogicalItem = useCallback((itemId, { forceCenter = false } = {}) => {
    if (selectedIdRef.current || presentedIdRef.current) return;
    const target = getItemCameraTarget(itemId);
    if (!target) return;
    if (forceCenter || target.clipped) {
      if (isWorkExperience) {
        const travel = Math.hypot(
          target.targetX - target.snapshot.logicalX,
          target.targetY - target.snapshot.logicalY,
        );
        const durationMs = reducedMotion || travel < 4
          ? 0
          : Math.min(380, Math.max(220, 180 + (travel * 0.12)));
        void target.camera.animateTo(target.targetX, target.targetY, { durationMs });
      } else {
        target.camera.setCamera(target.targetX, target.targetY, { immediate: true });
      }
    }
    const resetViewportScroll = () => {
      if (!viewportRef.current) return;
      viewportRef.current.scrollLeft = 0;
      viewportRef.current.scrollTop = 0;
    };
    resetViewportScroll();
    requestAnimationFrame(resetViewportScroll);
  }, [getItemCameraTarget, isWorkExperience, reducedMotion]);

  useLayoutEffect(() => {
    if (!isWorkExperience) return undefined;
    const host = document.getElementById('portfolio-sheet-host');
    if (!host) return undefined;
    const presenter = new WorkCaseStudyPresenter({
      host,
      getCanvasStage: () => worldRef.current,
      shouldReduceMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      onRequestClose: (detail) => requestCloseHandlerRef.current(detail),
      onBackgroundInertChange: setWorldInert,
      onRestoreFocus: restoreItemFocus,
      onPhaseChange: (phase) => {
        if (routeRef.current) routeRef.current.dataset.workOpenPhase = phase;
      },
    });
    presenter.mount();
    workPresenterRef.current = presenter;
    return () => {
      presenter.destroy();
      if (workPresenterRef.current === presenter) workPresenterRef.current = null;
    };
  }, [isWorkExperience, restoreItemFocus, setWorldInert]);

  useEffect(() => {
    if (!isWorkExperience) return undefined;
    const handleAccessGranted = (event) => {
      if (event?.detail?.gateId !== 'portfolio') return;
      const pendingId = workPendingAccessIdRef.current;
      if (!pendingId || pendingId !== selectedIdRef.current || !hasGateAccess('portfolio')) return;
      workPendingAccessIdRef.current = null;
      if (routeRef.current) routeRef.current.dataset.workOpenPhase = 'expanding';
      setPresentedId(pendingId);
    };
    const handleAccessDismissed = (event) => {
      if (event?.detail?.gateId !== 'portfolio' || !workPendingAccessIdRef.current) return;
      const pendingId = workPendingAccessIdRef.current;
      workPendingAccessIdRef.current = null;
      setWorldInert(false);
      requestCloseHandlerRef.current({ reason: 'access-dismissed' });
      restoreItemFocus(pendingId);
      if (routeRef.current) routeRef.current.dataset.workOpenPhase = 'idle';
    };
    window.addEventListener('abs:portfolio:access-granted', handleAccessGranted);
    window.addEventListener('abs:portfolio:access-dismissed', handleAccessDismissed);
    return () => {
      window.removeEventListener('abs:portfolio:access-granted', handleAccessGranted);
      window.removeEventListener('abs:portfolio:access-dismissed', handleAccessDismissed);
    };
  }, [isWorkExperience, restoreItemFocus, setWorldInert]);

  useEffect(() => {
    if (!isWorkExperience || !ready) return undefined;
    if (!selectedItem) {
      workPresentationTokenRef.current += 1;
      workPendingAccessIdRef.current = null;
      const camera = cameraRef.current;
      const snapshot = camera?.getSnapshot();
      if (camera && snapshot?.cameraAnimationActive) {
        camera.setCamera(snapshot.logicalX, snapshot.logicalY, { immediate: true });
      }
      return undefined;
    }
    if (presentedId === selectedItem.id || workPendingAccessIdRef.current === selectedItem.id) {
      return undefined;
    }

    const target = getItemCameraTarget(selectedItem.id);
    if (!target) return undefined;
    const token = workPresentationTokenRef.current + 1;
    workPresentationTokenRef.current = token;
    target.camera.setEnabled(true);
    if (routeRef.current) routeRef.current.dataset.workOpenPhase = 'centering';
    const travel = Math.hypot(
      target.targetX - target.snapshot.logicalX,
      target.targetY - target.snapshot.logicalY,
    );
    const durationMs = reducedMotion || travel < 4
      ? 0
      : Math.min(340, Math.max(220, 180 + (travel * 0.12)));
    let cancelled = false;
    const needsAccess = selectedItem.access === 'protected' && !hasGateAccess('portfolio');
    const centering = target.camera.animateTo(target.targetX, target.targetY, { durationMs });
    // Public media and unlocked studies expand while the camera settles. Only
    // the protected gate waits for centering; protected content stays unmounted.
    const presentationFrame = needsAccess ? 0 : requestAnimationFrame(() => {
      if (!cancelled && token === workPresentationTokenRef.current
        && selectedIdRef.current === selectedItem.id) setPresentedId(selectedItem.id);
    });
    centering.then((centred) => {
      if (cancelled || token !== workPresentationTokenRef.current) return;
      if (!centred) {
        if (!presentedIdRef.current) {
          cancelAnimationFrame(presentationFrame);
          workSourceRef.current = null;
          clearPlaygroundWorkSelection({ preferBack: false });
          setSelectedId(null);
          if (routeRef.current) routeRef.current.dataset.workOpenPhase = 'idle';
        }
        return;
      }
      if (selectedIdRef.current !== selectedItem.id) return;
      if (needsAccess) {
        workPendingAccessIdRef.current = selectedItem.id;
        if (routeRef.current) routeRef.current.dataset.workOpenPhase = 'access-pending';
        setWorldInert(true);
        window.dispatchEvent(new CustomEvent('abs:portfolio:request-access', {
          detail: {
            gateId: 'portfolio',
            projectId: selectedItem.projectId || selectedItem.id,
          },
        }));
        return;
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(presentationFrame);
    };
  }, [
    getItemCameraTarget,
    isWorkExperience,
    presentedId,
    ready,
    reducedMotion,
    selectedItem,
    selectionRevision,
    setWorldInert,
  ]);

  useEffect(() => {
    if (!isWorkExperience) return;
    const presenter = workPresenterRef.current;
    if (!isCaseStudy(presentedItem)) {
      if (presenter?.activeItemId) presenter.close();
      return;
    }
    const sourceCard = getWorkSourceElement(presentedItem.id);
    if (!sourceCard || !presenter) return;
    setWorldInert(true);
    void presenter.open(presentedItem, sourceCard);
  }, [getWorkSourceElement, isWorkExperience, presentedItem, setWorldInert]);

  const handleItemKeyDown = useCallback((event, itemId) => {
    const direction = PROJECT_NAVIGATION_DIRECTIONS[event.key];
    const activeModel = modelRef.current;
    if (!direction || !activeModel) return;
    const camera = cameraRef.current?.getSnapshot();
    const spacing = configRef.current.gridSpacingPx;
    const nextPlacement = findDirectionalPlaygroundItem(
      activeModel.placements,
      itemId,
      direction,
      { ...activeModel.world, cameraXCells: camera?.logicalX / spacing,
        cameraYCells: camera?.logicalY / spacing, reducedMotion },
    );
    if (!nextPlacement) return;
    event.preventDefault();
    event.stopPropagation();
    setKeyboardItemId(nextPlacement.id);
    focusLogicalItem(nextPlacement.id, { forceCenter: true });
    requestAnimationFrame(() => {
      focusItemNodesRef.current.get(nextPlacement.id)?.focus({ preventScroll: true });
    });
  }, [focusLogicalItem, reducedMotion]);

  useLayoutEffect(() => {
    if (!model || !content || !viewportNode || !canvasRef.current || !routeRef.current) {
      return undefined;
    }
    const viewport = viewportNode;
    const route = routeRef.current;
    const canvas = canvasRef.current;
    let cleaned = false;
    const viewportRect = viewport.getBoundingClientRect();
    const initialX = lastLogicalCameraRef.current.x;
    const initialY = lastLogicalCameraRef.current.y;
    const worldScale = responsiveProfile.worldScale;
    const snippetParallax = reducedMotion ? 1
      : model.planes.find((plane) => plane.id === 'snippets')?.placements[0].parallax || 1;
    const coverageScale = worldScale * snippetParallax;

    const dotRenderer = createPlaygroundDotFieldRenderer(canvas, {
      resizeTarget: viewport,
      cameraX: initialX,
      cameraY: initialY,
      viewportCenterX: viewportRect.width / 2,
      viewportCenterY: viewportRect.height / 2,
      gridSpacingPx: configRef.current.gridSpacingPx,
      worldScale,
      worldColumns: model.world.columns,
      worldRows: model.world.rows,
      routeVisualScale: dotMaterialScaleRef.current,
      dotRadiusPx: configRef.current.dotRadiusPx,
      dotOpacity: configRef.current.dotOpacity,
      dotDensity: configRef.current.dotDensity,
      dotRandomness: configRef.current.dotRandomness,
      colors: getSimulationPaletteSnapshot().colors,
      reducedMotion,
      neutralColor: getComputedStyle(route).getPropertyValue('--text-muted').trim() || '#777777',
      fieldMode: isWorkExperience ? 'depth' : 'grid',
      maximumVisibleDots: isWorkExperience ? 1800 : undefined,
      requestRenderFrame: () => cameraRef.current?.requestUpdate() || false,
      onDraw: () => tickSimulationAtmosphere(performance.now(), atmosphereSourceId),
    });
    dotRendererRef.current = dotRenderer;

    const syncCopies = (cameraState, force = false) => {
      const coverage = calculateNeighbouringCopyCoverage({
        viewportWidthPx: cameraState.viewportWidthPx / coverageScale,
        viewportHeightPx: cameraState.viewportHeightPx / coverageScale,
        worldWidthPx: model.world.widthPx,
        worldHeightPx: model.world.heightPx,
        cameraX: cameraState.renderedX,
        cameraY: cameraState.renderedY,
        largestItemWidthPx: model.world.largestItemWidthPx / snippetParallax,
        largestItemHeightPx: model.world.largestItemHeightPx / snippetParallax,
      });
      const signature = `${coverage.minimumColumn}:${coverage.maximumColumn}:${coverage.minimumRow}:${coverage.maximumRow}`;
      if (force || signature !== copySignatureRef.current) {
        copySignatureRef.current = signature;
        setCopies(buildCopyList(coverage));
        publishDiagnostics({ activeVisibleCopyCount: coverage.copyCount });
      }
      return coverage;
    };

    const scrollSoundController = createScrollSoundController({
      playDetent: playScrollDetent,
      source: `${routeId}-camera`,
    });
    scrollSoundControllerRef.current = scrollSoundController;
    const updateSound = (cameraState) => {
      scrollSoundController.samplePosition(
        cameraState.logicalX,
        cameraState.logicalY,
        performance.now(),
      );
    };

    let lastRenderedCameraX = Number.NaN;
    let lastRenderedCameraY = Number.NaN;
    let lastViewportCenterX = Number.NaN;
    let lastViewportCenterY = Number.NaN;
    let lastPinnedSource = null;
    let lastTitleColumn = Number.NaN;
    let lastTitleRow = Number.NaN;

    applyCameraFrameRef.current = (cameraState) => {
      const cameraGeometryChanged = cameraState.renderedX !== lastRenderedCameraX
        || cameraState.renderedY !== lastRenderedCameraY
        || cameraState.viewportCenterX !== lastViewportCenterX
        || cameraState.viewportCenterY !== lastViewportCenterY
        || workSourceRef.current !== lastPinnedSource;
      cameraFrameRef.current = cameraState;
      lastLogicalCameraRef.current.x = cameraState.logicalX;
      lastLogicalCameraRef.current.y = cameraState.logicalY;
      dotRenderer.setCamera(
        isWorkExperience ? cameraState.logicalX : cameraState.renderedX,
        isWorkExperience ? cameraState.logicalY : cameraState.renderedY,
        cameraState.viewportCenterX,
        cameraState.viewportCenterY,
        true,
      );
      if (!cameraGeometryChanged) return;
      const firstGeometryFrame = Number.isNaN(lastRenderedCameraX);
      lastRenderedCameraX = cameraState.renderedX;
      lastRenderedCameraY = cameraState.renderedY;
      lastViewportCenterX = cameraState.viewportCenterX;
      lastViewportCenterY = cameraState.viewportCenterY;
      lastPinnedSource = workSourceRef.current;
      // Two compositor translations share one camera sample. No inherited
      // per-frame variables or per-tile transforms invalidate all the captions.
      if (worldRef.current) {
        const x = cameraState.viewportCenterX - cameraState.renderedX * worldScale;
        const y = cameraState.viewportCenterY - cameraState.renderedY * worldScale;
        worldRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      if (snippetPlaneRef.current) {
        const x = cameraState.renderedX * worldScale * (1 - snippetParallax);
        const y = cameraState.renderedY * worldScale * (1 - snippetParallax);
        snippetPlaneRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      if (viewport.scrollLeft || viewport.scrollTop) {
        viewport.scrollLeft = 0;
        viewport.scrollTop = 0;
      }

      const titleColumn = Math.round(cameraState.renderedX / model.world.widthPx);
      const titleRow = Math.round(cameraState.renderedY / model.world.heightPx);
      if (titleRef.current && (titleColumn !== lastTitleColumn || titleRow !== lastTitleRow)) {
        titleRef.current.style.left = `${titleColumn * model.world.widthPx * worldScale}px`;
        titleRef.current.style.top = `${titleRow * model.world.heightPx * worldScale}px`;
        lastTitleColumn = titleColumn;
        lastTitleRow = titleRow;
      }

      const spacing = configRef.current.gridSpacingPx;
      let wrappedItemChanged = firstGeometryFrame;
      for (let index = 0; index < model.placements.length; index += 1) {
        const placement = model.placements[index];
        const x = placement.xCell * spacing;
        const y = placement.yCell * spacing;
        const pinned = workSourceRef.current?.itemId === placement.id ? workSourceRef.current : null;
        const nearestColumn = pinned
          ? Math.round((pinned.x - x - (cameraState.logicalX - cameraState.renderedX)) / model.world.widthPx)
          : Math.round((cameraState.renderedX - x - placement.footprintWidthCells * spacing / 2) / model.world.widthPx);
        const nearestRow = pinned
          ? Math.round((pinned.y - y - (cameraState.logicalY - cameraState.renderedY)) / model.world.heightPx)
          : Math.round((cameraState.renderedY - y - placement.footprintHeightCells * spacing / 2) / model.world.heightPx);
        if (firstGeometryFrame || nearestColumn !== placement.nearestColumn
          || nearestRow !== placement.nearestRow) {
          wrappedItemChanged = true;
          placement.nearestColumn = nearestColumn;
          placement.nearestRow = nearestRow;
          const parallax = reducedMotion ? 1 : placement.parallax;
          const worldX = projectDepthCoordinate(x + nearestColumn * model.world.widthPx,
            placement.footprintWidthCells * spacing, parallax) * worldScale;
          const worldY = projectDepthCoordinate(y + nearestRow * model.world.heightPx,
            placement.footprintHeightCells * spacing, parallax) * worldScale;
          const node = semanticItemNodesRef.current.get(placement.id);
          if (node) {
            node.style.transform = `translate3d(${worldX}px, ${worldY}px, 0) scale(${worldScale})`;
          }
        }
      }

      const decorativeInstances = decorativeInstancesRef.current;
      for (let index = 0; wrappedItemChanged && index < decorativeInstances.length; index += 1) {
        const instance = decorativeInstances[index];
        const placement = model.placementById.get(instance.itemId);
        const hidden = Boolean(placement
          && placement.nearestColumn === instance.column
          && placement.nearestRow === instance.row);
        if (hidden !== instance.hidden) {
          instance.hidden = hidden;
          instance.node.style.visibility = hidden ? 'hidden' : 'visible';
        }
      }

      syncCopies(cameraState);
      updateSound(cameraState);
    };

    const camera = createPlaygroundCameraController({
      target: viewport,
      keyboardTarget: window,
      initialX,
      initialY,
      worldWidthPx: model.world.widthPx,
      worldHeightPx: model.world.heightPx,
      viewportWidthPx: viewportRect.width,
      viewportHeightPx: viewportRect.height,
      viewportCenterX: viewportRect.width / 2,
      viewportCenterY: viewportRect.height / 2,
      wheelSensitivity: configRef.current.wheelSensitivity,
      dragMomentum: configRef.current.dragMomentum,
      worldScale,
      onUpdate: (cameraState) => applyCameraFrameRef.current(cameraState),
      onDragStateChange: (isDragging) => {
        draggingRef.current = isDragging;
        route.dataset.playgroundDragging = isDragging ? 'true' : 'false';
      },
    });
    cameraRef.current = camera;
    camera.setEnabled(!worldRef.current?.inert && (isWorkExperience || !selectedIdRef.current));
    setInteractiveModel(model);
    const firstFrame = camera.getSnapshot();
    syncCopies(firstFrame, true);
    applyCameraFrameRef.current(firstFrame);
    dotRenderer.start();

    const unregisterAtmosphere = registerSimulationAtmosphereSource({
      id: atmosphereSourceId,
      routeId,
      kind: 'canvas',
      canvas,
      scheduler: 'renderer-coupled',
      opacityElement: canvas,
    });
    tickSimulationAtmosphere(performance.now(), atmosphereSourceId);

    const resizeObserver = new ResizeObserver(() => {
      const rect = viewport.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      setViewportSize((current) => {
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        return current.width === width && current.height === height ? current : { width, height };
      });
      publishDiagnostics({ viewportDiagonalPx: Math.hypot(rect.width, rect.height) });
      camera.resizeViewport(rect.width, rect.height, rect.width / 2, rect.height / 2);
      dotRenderer.resize(true);
    });
    resizeObserver.observe(viewport);

    const syncTheme = () => {
      dotRenderer.configure({
        neutralColor: getComputedStyle(route).getPropertyValue('--text-muted').trim() || '#777777',
      });
    };
    window.addEventListener('abs:theme-changed', syncTheme);
    const unsubscribePalette = subscribeSimulationPalette((snapshot) => {
      dotRenderer.configure({ colors: snapshot.colors });
    });

    const spatialDiagnostics = createPlaygroundSpatialDiagnostics({
      items: model.items,
      placements: model.placements,
      world: model.world,
      coverage: calculateNeighbouringCopyCoverage({
        viewportWidthPx: viewportRect.width / coverageScale,
        viewportHeightPx: viewportRect.height / coverageScale,
        worldWidthPx: model.world.widthPx,
        worldHeightPx: model.world.heightPx,
        cameraX: firstFrame.renderedX,
        cameraY: firstFrame.renderedY,
        largestItemWidthPx: model.world.largestItemWidthPx / snippetParallax,
        largestItemHeightPx: model.world.largestItemHeightPx / snippetParallax,
      }),
      placementDiagnostics: model.placementDiagnostics,
    });
    publishDiagnostics({
      projectCount: spatialDiagnostics.itemCount,
      viewportDiagonalPx: Math.hypot(viewportRect.width, viewportRect.height),
      itemDiagonalPx: configRef.current.itemDiagonalPx,
      projectClearancePx: configRef.current.projectClearanceCells * configRef.current.gridSpacingPx * worldScale,
      worldColumns: spatialDiagnostics.worldColumns,
      worldRows: spatialDiagnostics.worldRows,
      worldWidthPx: spatialDiagnostics.worldWidthPx,
      worldHeightPx: spatialDiagnostics.worldHeightPx,
      occupiedCellPercentage: spatialDiagnostics.occupancy * 100,
      activeVisibleCopyCount: spatialDiagnostics.copyCount,
      activeVideoCount: 0,
      activeIframeCount: 0,
    });

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      resizeObserver.disconnect();
      window.removeEventListener('abs:theme-changed', syncTheme);
      unsubscribePalette();
      unregisterAtmosphere();
      camera.destroy();
      dotRenderer.destroy();
      cameraRef.current = null;
      dotRendererRef.current = null;
      applyCameraFrameRef.current = () => {};
      scrollSoundController.reset();
      if (scrollSoundControllerRef.current === scrollSoundController) {
        scrollSoundControllerRef.current = null;
      }
    };
    spatialCleanupRef.current = cleanup;
    return () => {
      cleanup();
      if (spatialCleanupRef.current === cleanup) spatialCleanupRef.current = null;
    };
  }, [atmosphereSourceId, content, isWorkExperience, model, publishDiagnostics, reducedMotion, responsiveProfile.worldScale, routeId, viewportNode]);

  useEffect(() => {
    cameraRef.current?.configure({
      wheelSensitivity: config.wheelSensitivity,
      dragMomentum: reducedMotion ? 0 : config.dragMomentum,
      worldScale: responsiveProfile.worldScale,
    });
    dotRendererRef.current?.configure({
      dotRadiusPx: runtimeConfig.dotRadiusPx,
      dotOpacity: config.dotOpacity,
      dotDensity: config.dotDensity,
      dotRandomness: config.dotRandomness,
      reducedMotion,
      worldScale: responsiveProfile.worldScale,
    });
  }, [
    config.dotOpacity,
    config.dotDensity,
    config.dotRandomness,
    config.dragMomentum,
    config.wheelSensitivity,
    reducedMotion,
    responsiveProfile.worldScale,
    runtimeConfig.dotRadiusPx,
  ]);

  useLayoutEffect(() => {
    if (!routeRef.current || !model) return;
    decorativeInstancesRef.current = Array.from(
      routeRef.current.querySelectorAll('[data-playground-decorative-item]'),
      (node) => ({
        node,
        itemId: node.dataset.playgroundDecorativeItem,
        column: Number(node.dataset.playgroundCopyColumn),
        row: Number(node.dataset.playgroundCopyRow),
        hidden: null,
      }),
    );
    decorativeInstancesRef.current.forEach((instance) => {
      const placement = model.placementById.get(instance.itemId);
      const hidden = Boolean(placement
        && placement.nearestColumn === instance.column
        && placement.nearestRow === instance.row);
      instance.hidden = hidden;
      instance.node.style.visibility = hidden ? 'hidden' : 'visible';
    });
  }, [copies, model]);

  useEffect(() => {
    if (!viewportNode || !model || typeof IntersectionObserver !== 'function') {
      const frameId = window.requestAnimationFrame(() => {
        setActiveWorldMediaIds((current) => (current.size ? new Set() : current));
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    const visibleIds = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const itemId = entry.target.dataset.playgroundItem;
        if (!itemId) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.2) visibleIds.add(itemId);
        else visibleIds.delete(itemId);
      });
      const activeIds = selectBoundedActiveWorldMediaIds(model.items, visibleIds);
      setActiveWorldMediaIds((current) => {
        if (current.size === activeIds.size
          && [...activeIds].every((itemId) => current.has(itemId))) return current;
        return activeIds;
      });
    }, {
      root: viewportNode,
      threshold: [0, 0.2],
    });

    model.items.forEach((item) => {
      if (item.type !== 'video' && item.type !== 'code') return;
      const node = semanticItemNodesRef.current.get(item.id);
      if (node) observer.observe(node);
    });

    return () => {
      observer.disconnect();
      setActiveWorldMediaIds((current) => (current.size ? new Set() : current));
    };
  }, [model, viewportNode]);

  useEffect(() => {
    if (!import.meta.env.DEV || !configLoaded) return undefined;
    let cancelled = false;
    registerPlaygroundPanelRoute({
      onRecenter: recenter,
      getDiagnostics: () => diagnosticsRef.current,
      subscribeDiagnostics,
    }).catch((error) => {
      if (!cancelled) console.warn('Playground panel init failed', error);
    });
    return () => {
      cancelled = true;
      void unregisterPlaygroundPanelRoute();
    };
  }, [configLoaded, recenter, subscribeDiagnostics]);

  useEffect(() => {
    const route = routeRef.current;
    const canvas = canvasRef.current;
    if (!route || !model || !content || !canvas || loadError) return undefined;
    let cancelled = false;
    waitForInitialPosters(route).then(() => {
      if (cancelled || canvas.width < 1 || canvas.height < 1 || !cameraRef.current) return;
      setReadyModel(model);
    });
    return () => {
      cancelled = true;
    };
  }, [content, loadError, model]);

  useLayoutEffect(() => {
    if (!ready || !routeRef.current || !model) return undefined;
    const isLocalAuditHost = import.meta.env.DEV
      || window.location.hostname === 'localhost'
      || window.location.hostname === '127.0.0.1';
    if (!isLocalAuditHost) return undefined;
    const route = routeRef.current;
    const diagnosticApi = Object.freeze({
      getSnapshot: () => ({
        camera: cameraRef.current?.getSnapshot() || null,
        dotField: dotRendererRef.current?.getSnapshot() || null,
        diagnostics: diagnosticsRef.current,
        selectedId: selectedIdRef.current,
        placements: modelRef.current?.placements.map((placement) => ({
          id: placement.id,
          xCell: placement.xCell,
          yCell: placement.yCell,
          widthCells: placement.mediaWidthCells,
          heightCells: placement.mediaHeightCells,
          footprintWidthCells: placement.footprintWidthCells,
          footprintHeightCells: placement.footprintHeightCells,
          parallax: reducedMotion ? 1 : placement.parallax,
        })) || [],
        ready: route.dataset.playgroundReady === 'true',
      }),
      recenter,
      setCamera: (x, y) => cameraRef.current?.setCamera(x, y, { immediate: true }),
    });
    Object.defineProperty(window, diagnosticGlobalKey, {
      configurable: true,
      enumerable: false,
      value: diagnosticApi,
    });
    return () => {
      if (window[diagnosticGlobalKey] === diagnosticApi) delete window[diagnosticGlobalKey];
    };
  }, [diagnosticGlobalKey, model, ready, recenter, reducedMotion]);

  useLayoutEffect(() => {
    if (!ready) return;
    window.dispatchEvent(new CustomEvent('abs:route-ready', {
      detail: { routeId },
    }));
  }, [ready, routeId]);

  useEffect(() => {
    const route = routeRef.current;
    if (!route) return;
    const openItem = isWorkExperience ? presentedItem : selectedItem;
    route.dataset.playgroundLightboxOpen = openItem ? 'true' : 'false';
  }, [isWorkExperience, presentedItem, selectedItem]);

  useEffect(() => () => {
    activeVideoOwnersRef.current.clear();
    activeIframeOwnersRef.current.clear();
    scrollSoundControllerRef.current?.reset();
  }, []);

  const routeStyle = model ? {
    '--playground-grid-spacing-px': `${runtimeConfig.gridSpacingPx}px`,
    '--playground-label-gap-px': `${runtimeConfig.labelGapPx}px`,
    '--playground-world-width-px': `${model.world.widthPx}px`,
    '--playground-world-height-px': `${model.world.heightPx}px`,
    '--playground-world-scale': String(responsiveProfile.worldScale),
    '--playground-title-scale': String(responsiveProfile.titleScale),
    '--playground-item-min-target-px': `${responsiveProfile.minimumItemTargetPx}px`,
    '--playground-caption-title-min-px': `${responsiveProfile.captionTitleMinimumPx}px`,
    '--playground-caption-description-min-px': `${responsiveProfile.captionDescriptionMinimumPx}px`,
  } : undefined;

  return (
    <div
      ref={routeRef}
      className={isWorkExperience ? 'playground-route work-canvas-route' : 'playground-route'}
      data-playground-experience
      data-work-experience={isWorkExperience ? 'true' : undefined}
      data-playground-ready={ready ? 'true' : 'false'}
      data-playground-interactive={interactive ? 'true' : 'false'}
      data-playground-error={loadError ? 'true' : 'false'}
      data-playground-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-playground-project-count={content?.items.length || 0}
      data-playground-world-columns={model?.world.columns || 0}
      data-playground-world-rows={model?.world.rows || 0}
      data-playground-world-width={model?.world.widthPx || 0}
      data-playground-world-height={model?.world.heightPx || 0}
      data-playground-world-scale={responsiveProfile.worldScale}
      style={routeStyle}
    >
      <div
        ref={bindViewportNode}
        className="playground-world-viewport"
        data-playground-viewport
        data-cursor-default-surface
        tabIndex={0}
        role="group"
        aria-label={`${routeLabel} spatial collection. Drag or use W, A, S, and D to explore. Tab into the projects, then use the arrow keys to move between them. Press Home to return to the title.`}
        aria-describedby="playground-spatial-instructions"
      >
        <canvas
          ref={canvasRef}
          className="playground-dot-field"
          data-playground-dot-field
          aria-hidden="true"
          style={{ pointerEvents: 'none' }}
        />
        <span
          className="playground-viewport-focus-proxy"
          data-focus-indicator-proxy
          aria-hidden="true"
        >
          {isWorkExperience ? 'W A S D' : null}
        </span>

        <div ref={worldRef} className="playground-world" data-playground-world>
          <section
            ref={titleRef}
            className="playground-title-anchor"
            aria-labelledby="playground-route-title"
            aria-describedby="playground-route-description playground-spatial-instructions"
          >
            <div className="playground-title-lockup route-title-lockup">
              <h1
                id="playground-route-title"
                className="route-centered-page__title route-bookend-title"
                data-route-enter="identity"
                data-route-enter-order="0"
                data-route-enter-variant="bookend-title"
                data-route-focus-target
                tabIndex={-1}
              >
                {content?.title || routeLabel}
              </h1>
              <span
                className="route-title-lockup__rule"
                aria-hidden="true"
              />
              <p
                id="playground-route-description"
                className="route-centered-page__description route-intro-description"
                data-route-enter="context"
                data-route-enter-variant="bookend-description"
              >
                {content?.description
                  || 'Small projects, experiments, aesthetic studies, and miscellaneous experience work.'}
              </p>
              <div className="playground-drag-instruction" data-route-enter="action">
                <span
                  className="playground-drag-instruction__label"
                  aria-hidden="true"
                >
                  Drag
                </span>
                <span className="playground-sr-instructions">Drag to explore.</span>
              </div>
            </div>
          </section>

          {model && content ? (
            <ol
              className="playground-collection playground-semantic-collection"
              role="list"
              aria-label={`${routeLabel} projects`}
            >
              {model.planes.map((plane) => (
                <li
                  key={plane.id}
                  role="presentation"
                  className="playground-depth-plane"
                  data-work-plane={plane.id}
                  data-work-parallax={reducedMotion ? 1 : plane.placements[0].parallax}
                  ref={plane.id === 'snippets' ? snippetPlaneRef : undefined}
                >
                  {copies.map((copy) => (
                    <DecorativeWorldCopy
                      key={copy.key}
                      copy={copy}
                      content={content}
                      placements={plane.placements}
                      parallax={reducedMotion ? 1 : plane.placements[0].parallax}
                      config={runtimeConfig}
                      worldScale={responsiveProfile.worldScale}
                      onOpen={openItem}
                    />
                  ))}
                  {plane.placements.map((placement) => {
                    const item = getPlaygroundItem(content, placement.id);
                    const worldMediaActive = activeWorldMediaIds.has(item.id);
                    // The selected stage owns playback. Keep poster geometry in
                    // the field without running hidden videos or duplicate demos.
                    const worldRuntimeActive = worldMediaActive && !selectedId && !presentedId
                      && (item.type === 'video' || item.type === 'code');
                    const worldRuntimeReady = worldRuntimeActive && readyWorldMediaIds.has(item.id);
                    const caseStudy = isCaseStudy(item);
                    const accessibleName = caseStudy
                      ? `${item.label}, case study. ${item.accessibilityText}`
                      : `${item.label}, ${getMediaTypeLabel(item.type)}. ${item.accessibilityText}`;
                    return (
                      <div
                        key={item.id}
                        role="listitem"
                        className={[
                          'playground-item',
                          'playground-item--semantic',
                          caseStudy ? 'playground-item--case-study' : 'playground-item--snippet',
                        ].join(' ')}
                        data-playground-item={item.id}
                        data-playground-item-type={item.type}
                        data-work-item-kind={item.kind || WORK_ITEM_KINDS.snippet}
                        data-playground-media-active={worldMediaActive ? 'true' : 'false'}
                        data-playground-media-ready={worldRuntimeReady ? 'true' : 'false'}
                        ref={(node) => {
                          if (node) semanticItemNodesRef.current.set(item.id, node);
                          else semanticItemNodesRef.current.delete(item.id);
                        }}
                        style={{
                          '--playground-item-width-px': `${placement.mediaWidthCells * runtimeConfig.gridSpacingPx}px`,
                          '--playground-item-height-px': `${placement.mediaHeightCells * runtimeConfig.gridSpacingPx}px`,
                        }}
                      >
                        <div className="playground-item__route-surface">
                          {worldRuntimeActive ? (
                            <div className="playground-item__runtime" aria-hidden="true">
                              <PlaygroundMedia
                                item={item}
                                renderMode="active"
                                active
                                visible
                                motionAllowed={!reducedMotion}
                                decorative
                                runtimeOwnerId={`world:${item.id}`}
                                onRuntimeStateChange={handleMediaRuntimeStateChange}
                              />
                            </div>
                          ) : null}
                          <button
                            ref={(node) => {
                              if (node) focusItemNodesRef.current.set(item.id, node);
                              else focusItemNodesRef.current.delete(item.id);
                            }}
                            type="button"
                            className={caseStudy ? 'work-canvas-card portfolio-project-card' : undefined}
                            tabIndex={rovingKeyboardItemId === item.id ? 0 : -1}
                            aria-label={accessibleName}
                            aria-haspopup="dialog"
                            aria-controls={caseStudy ? 'portfolio-sheet-host' : 'work-snippet-stage'}
                            aria-expanded={presentedId === item.id}
                            data-sound-action="manual"
                            data-sound-source={`${routeId}-project-${item.id}`}
                            onFocus={(event) => {
                              setKeyboardItemId(item.id);
                              if (event.currentTarget.matches(':focus-visible')) focusLogicalItem(item.id);
                            }}
                            onKeyDown={(event) => handleItemKeyDown(event, item.id)}
                            onClick={(event) => openItem(item.id, event)}
                          >
                            {caseStudy ? <CaseStudyCardContent item={item} /> : (
                              <>
                                <PlaygroundMedia
                                  item={item}
                                  renderMode={item.type === 'image' && worldMediaActive ? 'active' : 'poster'}
                                  active={item.type === 'image' && worldMediaActive}
                                  visible
                                  decorative
                                />
                                <span className="playground-item__label" aria-hidden="true">
                                  <span className="playground-item__title">{item.label}</span>
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </li>
              ))}
            </ol>
          ) : null}
        </div>

        <p id="playground-spatial-instructions" className="playground-sr-instructions">
          Drag or use W, A, S, and D to move in two dimensions. Tab into the project field,
          then use the arrow keys to move to the nearest project in that direction.
          Press Home to return to the {routeLabel} title. Select any project to open it.
        </p>

        {loadError ? (
          <div className="playground-load-error" role="alert">
            <p>{routeLabel} is temporarily unavailable.</p>
            <p>{loadError}</p>
          </div>
        ) : null}

        {content?.validationIssues?.length ? (
          <p className="playground-sr-instructions" role="status">
            {content.validationIssues.length} invalid {routeLabel} content field
            {content.validationIssues.length === 1 ? ' was' : 's were'} omitted.
          </p>
        ) : null}

        {isWorkExperience && presentedItem?.kind === WORK_ITEM_KINDS.snippet ? (
          <WorkSnippetStage
            item={presentedItem}
            open={selectedId === presentedItem.id}
            getSourceElement={getWorkSourceElement}
            motionAllowed={!reducedMotion}
            onRequestClose={requestClose}
            onBackgroundInertChange={setWorldInert}
            onRestoreFocus={restoreItemFocus}
            onExited={handleWorkSnippetExited}
            onPhaseChange={handleWorkSnippetPhaseChange}
            onRuntimeStateChange={handleMediaRuntimeStateChange}
          />
        ) : null}

        {!isWorkExperience ? (
          <PlaygroundLightbox
            item={selectedItem}
            returnFocusId={selectedId}
            onRequestClose={requestClose}
            onBackgroundInertChange={setWorldInert}
            onRestoreFocus={restoreItemFocus}
            closeOnMediaShell
            motionAllowed={!reducedMotion}
            onRuntimeStateChange={handleMediaRuntimeStateChange}
          />
        ) : null}
      </div>
    </div>
  );
}
