import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSimulationPalette } from '../../hooks/useSimulationPalette.js';
import { triggerHaptic } from '../../lib/haptics.js';
import {
  playButtonPressSound,
  playWheelClose,
  playWheelOpen,
  updateWheelSfx,
} from '../../legacy/modules/audio/sound-engine.js';
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
} from './spatial/index.js';
import './playground.css';

const INITIAL_POSTER_TIMEOUT_MS = 2200;
const SOUND_STOP_DELAY_MS = 90;
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
  'sizeVariation',
  'labelGapPx',
]);

function getMediaTypeLabel(type) {
  if (type === 'video') return 'Video';
  if (type === 'code') return 'Code demo';
  return 'Image';
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
  const titleSafeAreaCells = createTitleSafeArea(titleRect, config.gridSpacingPx);
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

async function waitForInitialPosters(root, timeoutMs = INITIAL_POSTER_TIMEOUT_MS) {
  await waitForPaint();
  if (!root) return;
  const viewportRect = root.getBoundingClientRect();
  const images = Array.from(root.querySelectorAll('.playground-semantic-collection img'))
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

function DecorativeWorldCopy({ copy, content, model, config, worldScale }) {
  return (
    <div
      className="playground-world-copy"
      data-playground-copy={`${copy.column},${copy.row}`}
      aria-hidden="true"
      style={{
        '--playground-copy-x-px': `${copy.offsetX * worldScale}px`,
        '--playground-copy-y-px': `${copy.offsetY * worldScale}px`,
      }}
    >
      <div className="playground-collection" role="presentation">
        {model.placements.map((placement) => {
          const item = getPlaygroundItem(content, placement.id);
          return (
            <div
              key={placement.id}
              className="playground-item playground-item--decorative"
              data-playground-decorative-item={placement.id}
              data-playground-copy-column={copy.column}
              data-playground-copy-row={copy.row}
              style={{
                '--playground-item-x-px': `${placement.xCell * config.gridSpacingPx}px`,
                '--playground-item-y-px': `${placement.yCell * config.gridSpacingPx}px`,
                '--playground-item-width-px': `${placement.mediaWidthCells * config.gridSpacingPx}px`,
                '--playground-item-height-px': `${placement.mediaHeightCells * config.gridSpacingPx}px`,
              }}
            >
              <PlaygroundPoster item={item} decorative />
              <div className="playground-item__label" aria-hidden="true">
                <p className="playground-item__title">{item.label}</p>
                <p className="playground-item__description">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PlaygroundExperience() {
  const routeRef = useRef(null);
  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const titleRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const dotRendererRef = useRef(null);
  const modelRef = useRef(null);
  const configRef = useRef(getPlaygroundConfigSnapshot());
  const contentRef = useRef(null);
  const selectedIdRef = useRef(null);
  const semanticItemNodesRef = useRef(new Map());
  const focusItemNodesRef = useRef(new Map());
  const decorativeInstancesRef = useRef([]);
  const copySignatureRef = useRef('');
  const cameraFrameRef = useRef(null);
  const lastLogicalCameraRef = useRef({ x: 0, y: 0 });
  const lastSoundFrameRef = useRef({ x: 0, y: 0, at: 0 });
  const soundStopTimerRef = useRef(0);
  const draggingRef = useRef(false);
  const spatialCleanupRef = useRef(null);
  const diagnosticsRef = useRef({});
  const diagnosticsSubscribersRef = useRef(new Set());
  const activeVideoOwnersRef = useRef(new Set());
  const activeIframeOwnersRef = useRef(new Set());
  const applyCameraFrameRef = useRef(() => {});
  const returnFocusIdRef = useRef(null);
  const paletteRef = useRef(null);

  const [content, setContent] = useState(null);
  const [config, setConfigState] = useState(() => getPlaygroundConfigSnapshot());
  const [configLoaded, setConfigLoaded] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [model, setModel] = useState(null);
  const [copies, setCopies] = useState([]);
  const [viewportNode, setViewportNodeState] = useState(null);
  const [viewportWidthPx, setViewportWidthPx] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [keyboardItemId, setKeyboardItemId] = useState(null);
  const [activeWorldMediaIds, setActiveWorldMediaIds] = useState(() => new Set());
  const [readyWorldMediaIds, setReadyWorldMediaIds] = useState(() => new Set());
  const [loadError, setLoadError] = useState('');
  const [readyModel, setReadyModel] = useState(null);
  const palette = useSimulationPalette();
  const reducedMotion = useDailyFocusReducedMotion();
  const responsiveProfile = useMemo(
    () => createPlaygroundResponsiveProfile(viewportWidthPx),
    [viewportWidthPx],
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
  const ready = Boolean(model && readyModel === model && !loadError);
  const defaultKeyboardItemId = useMemo(() => model?.placements.reduce((nearest, placement) => {
    const centreX = placement.xCell + (placement.footprintWidthCells / 2);
    const centreY = placement.yCell + (placement.footprintHeightCells / 2);
    const distance = Math.hypot(centreX, centreY);
    return !nearest || distance < nearest.distance
      ? { id: placement.id, distance }
      : nearest;
  }, null)?.id || null, [model]);
  const rovingKeyboardItemId = keyboardItemId && model?.placementById.has(keyboardItemId)
    ? keyboardItemId
    : defaultKeyboardItemId;

  useLayoutEffect(() => {
    configRef.current = runtimeConfig;
    contentRef.current = content;
    modelRef.current = model;
    selectedIdRef.current = selectedId;
    paletteRef.current = palette;
  }, [content, model, palette, runtimeConfig, selectedId]);

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
    setViewportWidthPx(node ? Math.round(node.getBoundingClientRect().width) : 0);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const unsubscribe = subscribePlaygroundConfig((nextConfig) => {
      if (!cancelled) setConfigState(nextConfig);
    }, { emitInitial: true });

    Promise.all([
      loadPlaygroundContent({ signal: controller.signal }),
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
      setLoadError(error?.message || 'Lab could not be prepared.');
      window.dispatchEvent(new CustomEvent('abs:route-failed', {
        detail: { routeId: 'playground', reason: 'content-or-config' },
      }));
    });

    return () => {
      cancelled = true;
      controller.abort();
      unsubscribe();
    };
  }, []);

  useLayoutEffect(() => {
    if (!content || !fontsReady || !configLoaded || !titleRef.current) return;
    const titleRect = titleRef.current.getBoundingClientRect();
    if (titleRect.width <= 0 || titleRect.height <= 0) return;
    try {
      setModel(buildSpatialModel(content, runtimeConfig, titleRect));
      setLoadError('');
    } catch (error) {
      setModel(null);
      setLoadError(error?.message || 'Lab layout could not be calculated.');
    }
  }, [content, configLoaded, fontsReady, layoutKey, runtimeConfig]);

  useEffect(() => {
    const handlePopState = () => {
      const isPlaygroundLocation = window.location.pathname === '/playground'
        || window.location.pathname === '/playground.html';
      if (!isPlaygroundLocation) {
        spatialCleanupRef.current?.();
        return;
      }
      const nextId = parsePlaygroundWorkSelection(window.location, contentRef.current?.items);
      if (selectedIdRef.current && !nextId) {
        playWheelClose();
        triggerHaptic('close');
      }
      setSelectedId(nextId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openItem = useCallback((itemId, event) => {
    const activeContent = contentRef.current;
    if (!getPlaygroundItem(activeContent, itemId)) return;
    returnFocusIdRef.current = itemId;
    updatePlaygroundWorkSelection(itemId, { itemsOrIds: activeContent.items });
    setSelectedId(itemId);
    playButtonPressSound();
    playWheelOpen();
    triggerHaptic('open', { event });
  }, []);

  const requestClose = useCallback(({ reason } = {}) => {
    const result = clearPlaygroundWorkSelection({ preferBack: true });
    playWheelClose();
    triggerHaptic('close');
    if (result !== 'back') setSelectedId(null);
    if (reason === 'programmatic') return;
  }, []);

  const setWorldInert = useCallback((isInert) => {
    const world = worldRef.current;
    if (world) {
      world.inert = isInert;
      if (isInert) world.setAttribute('aria-hidden', 'true');
      else world.removeAttribute('aria-hidden');
    }
    cameraRef.current?.setEnabled(!isInert);
    if (isInert) updateWheelSfx(0);
  }, []);

  const restoreItemFocus = useCallback((itemId) => {
    setKeyboardItemId(itemId);
    focusItemNodesRef.current.get(itemId)?.focus({ preventScroll: true });
  }, []);

  const focusLogicalItem = useCallback((itemId, { forceCenter = false } = {}) => {
    const placement = modelRef.current?.placementById.get(itemId);
    const camera = cameraRef.current;
    if (!placement || !camera) return;
    const snapshot = camera.getSnapshot();
    const spacing = configRef.current.gridSpacingPx;
    const worldScale = responsiveProfile.worldScale;
    const itemCenterX = (placement.xCell + (placement.footprintWidthCells / 2)) * spacing;
    const itemCenterY = (placement.yCell + (placement.footprintHeightCells / 2)) * spacing;
    const nearestColumn = Math.round((snapshot.renderedX - itemCenterX) / snapshot.worldWidthPx);
    const nearestRow = Math.round((snapshot.renderedY - itemCenterY) / snapshot.worldHeightPx);
    const targetX = itemCenterX + (nearestColumn * snapshot.worldWidthPx);
    const targetY = itemCenterY + (nearestRow * snapshot.worldHeightPx);
    const screenX = snapshot.viewportCenterX + ((targetX - snapshot.renderedX) * worldScale);
    const screenY = snapshot.viewportCenterY + ((targetY - snapshot.renderedY) * worldScale);
    const itemWidth = placement.footprintWidthCells * spacing * worldScale;
    const itemHeight = placement.footprintHeightCells * spacing * worldScale;
    const margin = Math.max(16, Math.min(40,
      (snapshot.viewportWidthPx - itemWidth) / 2,
      (snapshot.viewportHeightPx - itemHeight) / 2));
    const clipped = screenX - (itemWidth / 2) < margin
      || screenX + (itemWidth / 2) > snapshot.viewportWidthPx - margin
      || screenY - (itemHeight / 2) < margin
      || screenY + (itemHeight / 2) > snapshot.viewportHeightPx - margin;
    if (forceCenter || clipped) {
      camera.setCamera(targetX, targetY, { immediate: true });
    }
    const resetViewportScroll = () => {
      if (!viewportRef.current) return;
      viewportRef.current.scrollLeft = 0;
      viewportRef.current.scrollTop = 0;
    };
    resetViewportScroll();
    requestAnimationFrame(resetViewportScroll);
  }, [responsiveProfile.worldScale]);

  const handleItemKeyDown = useCallback((event, itemId) => {
    const direction = PROJECT_NAVIGATION_DIRECTIONS[event.key];
    const activeModel = modelRef.current;
    if (!direction || !activeModel) return;
    const nextPlacement = findDirectionalPlaygroundItem(
      activeModel.placements,
      itemId,
      direction,
      activeModel.world,
    );
    if (!nextPlacement) return;
    event.preventDefault();
    event.stopPropagation();
    setKeyboardItemId(nextPlacement.id);
    focusLogicalItem(nextPlacement.id, { forceCenter: true });
    requestAnimationFrame(() => {
      focusItemNodesRef.current.get(nextPlacement.id)?.focus({ preventScroll: true });
    });
  }, [focusLogicalItem]);

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
      dotRadiusPx: configRef.current.dotRadiusPx,
      dotOpacity: configRef.current.dotOpacity,
      colorWakeRadiusPx: configRef.current.colorWakeRadiusPx,
      colorWakePersistenceMs: configRef.current.colorWakePersistenceMs,
      colorWakeFadeMs: configRef.current.colorWakeFadeMs,
      colorWakeOpacity: configRef.current.colorWakeOpacity,
      colorWakeDensity: configRef.current.colorWakeDensity,
      colorWakeEdgeSoftness: configRef.current.colorWakeEdgeSoftness,
      colorWakeDotScale: configRef.current.colorWakeDotScale,
      layoutSeed: configRef.current.layoutSeed,
      neutralColor: getComputedStyle(route).getPropertyValue('--text-muted').trim() || '#777777',
      palette: paletteRef.current,
      requestRenderFrame: () => cameraRef.current?.requestUpdate() || false,
      onDraw: () => tickSimulationAtmosphere(performance.now(), 'playground:dot-field'),
    });
    dotRendererRef.current = dotRenderer;

    let pointerRect = viewportRect;
    const handlePointerMove = (event) => {
      if (event.pointerType !== 'mouse') return;
      dotRenderer.setPointer(
        event.clientX - pointerRect.left,
        event.clientY - pointerRect.top,
        true,
      );
    };
    const handlePointerLeave = (event) => {
      if (event.pointerType !== 'mouse') return;
      dotRenderer.setPointer(0, 0, false);
    };
    viewport.addEventListener('pointermove', handlePointerMove, { passive: true });
    viewport.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    viewport.addEventListener('pointercancel', handlePointerLeave, { passive: true });

    const syncCopies = (cameraState, force = false) => {
      const coverage = calculateNeighbouringCopyCoverage({
        viewportWidthPx: cameraState.viewportWidthPx / worldScale,
        viewportHeightPx: cameraState.viewportHeightPx / worldScale,
        worldWidthPx: model.world.widthPx,
        worldHeightPx: model.world.heightPx,
        cameraX: cameraState.renderedX,
        cameraY: cameraState.renderedY,
        largestItemWidthPx: model.world.largestItemWidthPx,
        largestItemHeightPx: model.world.largestItemHeightPx,
      });
      const signature = `${coverage.minimumColumn}:${coverage.maximumColumn}:${coverage.minimumRow}:${coverage.maximumRow}`;
      if (force || signature !== copySignatureRef.current) {
        copySignatureRef.current = signature;
        setCopies(buildCopyList(coverage));
        publishDiagnostics({ activeVisibleCopyCount: coverage.copyCount });
      }
      return coverage;
    };

    const stopSoundAfterIdle = () => {
      soundStopTimerRef.current = 0;
      const remainingMs = SOUND_STOP_DELAY_MS
        - (performance.now() - lastSoundFrameRef.current.at);
      if (remainingMs > 0) {
        soundStopTimerRef.current = window.setTimeout(stopSoundAfterIdle, remainingMs);
        return;
      }
      updateWheelSfx(0);
    };

    const updateSound = (cameraState) => {
      const now = performance.now();
      const previous = lastSoundFrameRef.current;
      const elapsed = Math.max(1, now - previous.at);
      if (previous.at > 0) {
        const deltaX = cameraState.logicalX - previous.x;
        const deltaY = cameraState.logicalY - previous.y;
        const speed = Math.min(3600, Math.hypot(deltaX, deltaY) * (1000 / elapsed));
        updateWheelSfx(speed >= 50 ? speed : 0);
      }
      previous.x = cameraState.logicalX;
      previous.y = cameraState.logicalY;
      previous.at = now;
      if (!soundStopTimerRef.current) {
        soundStopTimerRef.current = window.setTimeout(stopSoundAfterIdle, SOUND_STOP_DELAY_MS);
      }
    };

    let lastRenderedCameraX = Number.NaN;
    let lastRenderedCameraY = Number.NaN;
    let lastViewportCenterX = Number.NaN;
    let lastViewportCenterY = Number.NaN;

    applyCameraFrameRef.current = (cameraState) => {
      const cameraGeometryChanged = cameraState.renderedX !== lastRenderedCameraX
        || cameraState.renderedY !== lastRenderedCameraY
        || cameraState.viewportCenterX !== lastViewportCenterX
        || cameraState.viewportCenterY !== lastViewportCenterY;
      cameraFrameRef.current = cameraState;
      lastLogicalCameraRef.current.x = cameraState.logicalX;
      lastLogicalCameraRef.current.y = cameraState.logicalY;
      dotRenderer.setCamera(
        cameraState.renderedX,
        cameraState.renderedY,
        cameraState.viewportCenterX,
        cameraState.viewportCenterY,
        true,
      );
      if (!cameraGeometryChanged) return;
      lastRenderedCameraX = cameraState.renderedX;
      lastRenderedCameraY = cameraState.renderedY;
      lastViewportCenterX = cameraState.viewportCenterX;
      lastViewportCenterY = cameraState.viewportCenterY;
      route.style.setProperty(
        '--playground-render-camera-x-px',
        `${cameraState.renderedX * worldScale}px`,
      );
      route.style.setProperty(
        '--playground-render-camera-y-px',
        `${cameraState.renderedY * worldScale}px`,
      );
      route.style.setProperty('--playground-viewport-center-x-px', `${cameraState.viewportCenterX}px`);
      route.style.setProperty('--playground-viewport-center-y-px', `${cameraState.viewportCenterY}px`);
      if (viewport.scrollLeft || viewport.scrollTop) {
        viewport.scrollLeft = 0;
        viewport.scrollTop = 0;
      }

      const titleColumn = Math.round(cameraState.renderedX / model.world.widthPx);
      const titleRow = Math.round(cameraState.renderedY / model.world.heightPx);
      if (titleRef.current) {
        titleRef.current.style.left = `${cameraState.viewportCenterX
          + ((titleColumn * model.world.widthPx) - cameraState.renderedX) * worldScale}px`;
        titleRef.current.style.top = `${cameraState.viewportCenterY
          + ((titleRow * model.world.heightPx) - cameraState.renderedY) * worldScale}px`;
      }

      const spacing = configRef.current.gridSpacingPx;
      for (let index = 0; index < model.placements.length; index += 1) {
        const placement = model.placements[index];
        const x = placement.xCell * spacing;
        const y = placement.yCell * spacing;
        const nearestColumn = Math.round((cameraState.renderedX - x) / model.world.widthPx);
        const nearestRow = Math.round((cameraState.renderedY - y) / model.world.heightPx);
        placement.nearestColumn = nearestColumn;
        placement.nearestRow = nearestRow;
        const screenX = cameraState.viewportCenterX + ((x
          + (nearestColumn * model.world.widthPx) - cameraState.renderedX) * worldScale);
        const screenY = cameraState.viewportCenterY + ((y
          + (nearestRow * model.world.heightPx) - cameraState.renderedY) * worldScale);
        const node = semanticItemNodesRef.current.get(placement.id);
        if (node) {
          node.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) scale(${worldScale})`;
        }
      }

      const decorativeInstances = decorativeInstancesRef.current;
      for (let index = 0; index < decorativeInstances.length; index += 1) {
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
    camera.setEnabled(!selectedIdRef.current);
    const firstFrame = camera.getSnapshot();
    syncCopies(firstFrame, true);
    applyCameraFrameRef.current(firstFrame);
    dotRenderer.start();

    const unregisterAtmosphere = registerSimulationAtmosphereSource({
      id: 'playground:dot-field',
      routeId: 'playground',
      kind: 'canvas',
      canvas,
      scheduler: 'renderer-coupled',
      opacityElement: canvas,
    });
    tickSimulationAtmosphere(performance.now(), 'playground:dot-field');

    const resizeObserver = new ResizeObserver(() => {
      const rect = viewport.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerRect = rect;
      setViewportWidthPx((current) => {
        const next = Math.round(rect.width);
        return current === next ? current : next;
      });
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

    const spatialDiagnostics = createPlaygroundSpatialDiagnostics({
      items: model.items,
      placements: model.placements,
      world: model.world,
      coverage: calculateNeighbouringCopyCoverage({
        viewportWidthPx: viewportRect.width / worldScale,
        viewportHeightPx: viewportRect.height / worldScale,
        worldWidthPx: model.world.widthPx,
        worldHeightPx: model.world.heightPx,
        cameraX: firstFrame.renderedX,
        cameraY: firstFrame.renderedY,
        largestItemWidthPx: model.world.largestItemWidthPx,
        largestItemHeightPx: model.world.largestItemHeightPx,
      }),
      placementDiagnostics: model.placementDiagnostics,
    });
    publishDiagnostics({
      projectCount: spatialDiagnostics.itemCount,
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
      viewport.removeEventListener('pointermove', handlePointerMove);
      viewport.removeEventListener('pointerleave', handlePointerLeave);
      viewport.removeEventListener('pointercancel', handlePointerLeave);
      window.removeEventListener('abs:theme-changed', syncTheme);
      unregisterAtmosphere();
      camera.destroy();
      dotRenderer.destroy();
      cameraRef.current = null;
      dotRendererRef.current = null;
      applyCameraFrameRef.current = () => {};
      updateWheelSfx(0);
      if (soundStopTimerRef.current) window.clearTimeout(soundStopTimerRef.current);
      soundStopTimerRef.current = 0;
    };
    spatialCleanupRef.current = cleanup;
    return () => {
      cleanup();
      if (spatialCleanupRef.current === cleanup) spatialCleanupRef.current = null;
    };
  }, [content, model, publishDiagnostics, responsiveProfile.worldScale, viewportNode]);

  useEffect(() => {
    dotRendererRef.current?.setPalette(palette);
  }, [palette]);

  useEffect(() => {
    cameraRef.current?.configure({
      wheelSensitivity: config.wheelSensitivity,
      dragMomentum: reducedMotion ? 0 : config.dragMomentum,
      worldScale: responsiveProfile.worldScale,
    });
    dotRendererRef.current?.configure({
      dotRadiusPx: runtimeConfig.dotRadiusPx,
      dotOpacity: config.dotOpacity,
      colorWakeRadiusPx: config.colorWakeRadiusPx,
      colorWakePersistenceMs: config.colorWakePersistenceMs,
      colorWakeFadeMs: config.colorWakeFadeMs,
      colorWakeOpacity: config.colorWakeOpacity,
      colorWakeDensity: config.colorWakeDensity,
      colorWakeEdgeSoftness: config.colorWakeEdgeSoftness,
      colorWakeDotScale: config.colorWakeDotScale,
      layoutSeed: config.layoutSeed,
      worldScale: responsiveProfile.worldScale,
    });
  }, [
    config.colorWakePersistenceMs,
    config.colorWakeFadeMs,
    config.colorWakeRadiusPx,
    config.colorWakeOpacity,
    config.colorWakeDensity,
    config.colorWakeEdgeSoftness,
    config.colorWakeDotScale,
    config.dotOpacity,
    config.dragMomentum,
    config.layoutSeed,
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
      setActiveWorldMediaIds((current) => {
        if (current.size === visibleIds.size
          && [...visibleIds].every((itemId) => current.has(itemId))) return current;
        return new Set(visibleIds);
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

  useEffect(() => {
    if (!ready) return;
    window.dispatchEvent(new CustomEvent('abs:route-ready', {
      detail: { routeId: 'playground' },
    }));
  }, [ready]);

  useEffect(() => {
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
        })) || [],
        ready: route.dataset.playgroundReady === 'true',
      }),
      recenter,
      setCamera: (x, y) => cameraRef.current?.setCamera(x, y, { immediate: true }),
    });
    Object.defineProperty(window, '__ABS_PLAYGROUND__', {
      configurable: true,
      enumerable: false,
      value: diagnosticApi,
    });
    return () => {
      if (window.__ABS_PLAYGROUND__ === diagnosticApi) delete window.__ABS_PLAYGROUND__;
    };
  }, [model, ready, recenter]);

  useEffect(() => {
    const route = routeRef.current;
    if (!route) return;
    route.dataset.playgroundLightboxOpen = selectedItem ? 'true' : 'false';
  }, [selectedItem]);

  useEffect(() => () => {
    activeVideoOwnersRef.current.clear();
    activeIframeOwnersRef.current.clear();
    updateWheelSfx(0);
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
      className="playground-route"
      data-playground-experience
      data-playground-ready={ready ? 'true' : 'false'}
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
        aria-label="Lab spatial collection. Drag or use W, A, S, and D to explore. Tab into the projects, then use the arrow keys to move between them. Press Home to return to the title."
        aria-describedby="playground-spatial-instructions"
      >
        <canvas
          ref={canvasRef}
          className="playground-dot-field"
          data-playground-dot-field
          aria-hidden="true"
          style={{ pointerEvents: 'none' }}
        />

        <div ref={worldRef} className="playground-world" data-playground-world>
          {model && content ? copies.map((copy) => (
            <DecorativeWorldCopy
              key={copy.key}
              copy={copy}
              content={content}
              model={model}
              config={runtimeConfig}
              worldScale={responsiveProfile.worldScale}
            />
          )) : null}

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
                {content?.title || 'Lab'}
              </h1>
              <span
                className="playground-title-lockup__rule route-title-lockup__rule"
                data-playground-title-rule
                aria-hidden="true"
              />
              <p
                id="playground-route-description"
                className="playground-title-lockup__description route-centered-page__description route-intro-description"
                data-playground-description
                data-route-enter="context"
                data-route-enter-variant="bookend-description"
              >
                {content?.description
                  || 'Small projects, experiments, aesthetic studies, and miscellaneous experience work.'}
              </p>
              <div className="playground-drag-instruction" data-route-enter="action">
                <svg
                  className="playground-drag-instruction__icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M18 9l3 3-3 3M15 12h6M6 9l-3 3 3 3M3 12h6M9 18l3 3 3-3M12 15v6M15 6l-3-3-3 3M12 3v6" />
                </svg>
                <span className="playground-sr-instructions">Drag to explore.</span>
              </div>
            </div>
          </section>

          {model && content ? (
            <ol
              className="playground-collection playground-semantic-collection"
              aria-label="Lab work"
            >
              {model.placements.map((placement) => {
                const item = getPlaygroundItem(content, placement.id);
                const worldMediaActive = activeWorldMediaIds.has(item.id);
                const worldRuntimeActive = worldMediaActive
                  && (item.type === 'video' || item.type === 'code');
                const worldRuntimeReady = worldRuntimeActive && readyWorldMediaIds.has(item.id);
                const accessibleName = `${item.label}, ${getMediaTypeLabel(item.type)}. ${item.accessibilityText}`;
                return (
                  <li
                    key={item.id}
                    className="playground-item playground-item--semantic"
                    data-playground-item={item.id}
                    data-playground-item-type={item.type}
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
                      tabIndex={rovingKeyboardItemId === item.id ? 0 : -1}
                      aria-label={accessibleName}
                      aria-haspopup="dialog"
                      onFocus={() => {
                        setKeyboardItemId(item.id);
                        focusLogicalItem(item.id);
                      }}
                      onKeyDown={(event) => handleItemKeyDown(event, item.id)}
                      onClick={(event) => openItem(item.id, event)}
                    >
                      <PlaygroundMedia
                        item={item}
                        renderMode={item.type === 'image' && worldMediaActive ? 'active' : 'poster'}
                        active={item.type === 'image' && worldMediaActive}
                        visible
                        decorative
                      />
                      <span className="playground-item__label" aria-hidden="true">
                        <span className="playground-item__title">{item.label}</span>
                        <span className="playground-item__description">{item.description}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>

        <p id="playground-spatial-instructions" className="playground-sr-instructions">
          Drag or use W, A, S, and D to move in two dimensions. Tab into the project field,
          then use the arrow keys to move to the nearest project in that direction.
          Press Home to return to the Lab title. Select any project to open it in a dialog.
        </p>

        {loadError ? (
          <div className="playground-load-error" role="alert">
            <p>Lab is temporarily unavailable.</p>
            <p>{loadError}</p>
          </div>
        ) : null}

        {content?.validationIssues?.length ? (
          <p className="playground-sr-instructions" role="status">
            {content.validationIssues.length} invalid Lab content field
            {content.validationIssues.length === 1 ? ' was' : 's were'} omitted.
          </p>
        ) : null}

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
      </div>
    </div>
  );
}
