import { registerPanelUiDocument, resolvePanelUiDocument } from '../../ui/panel-ui-context.js';

const CONTROL_SECTIONS = {
  layout: {
    title: 'Layout',
    icon: 'LAY',
    defaultOpen: true,
    controls: [
      { id: 'portfolioNavTop', label: 'Header top (extra)', cssVar: '--portfolio-nav-top', type: 'range', min: 0, max: 48, step: 1, unit: 'px', default: 0 },
      { id: 'portfolioStagePad', label: 'Stage Padding', cssVar: '--portfolio-stage-pad', type: 'range', min: 8, max: 48, step: 1, unit: 'px', default: 24 },
      { id: 'spawnInsetViewport', label: 'Spawn Inset', configKey: 'runtime.layout.spawnInsetViewport', type: 'range', min: 0.04, max: 0.24, step: 0.01, unit: '', default: 0.1, refresh: true },
      { id: 'headerTopSpacing', label: 'Header Spacing', configKey: 'runtime.layout.headerTopSpacing', type: 'range', min: 8, max: 64, step: 1, unit: 'px', default: 24 },
    ],
  },
  bodies: {
    title: 'Bodies',
    icon: 'BOD',
    defaultOpen: true,
    controls: [
      {
        id: 'minDiameterViewport',
        label: 'Min Size',
        configKey: 'runtime.bodies.minDiameterViewport',
        type: 'range',
        min: 0.08,
        max: 1,
        step: 0.01,
        unit: '',
        default: 0.105,
        refresh: true,
        hint: 'Min diameter as a fraction of √(inner pit width×height). Same relative scale on mobile and desktop; clamped so bodies stay inside the wall.',
      },
      {
        id: 'maxDiameterViewport',
        label: 'Max Size',
        configKey: 'runtime.bodies.maxDiameterViewport',
        type: 'range',
        min: 0.1,
        max: 1,
        step: 0.01,
        unit: '',
        default: 0.22,
        refresh: true,
        hint: 'Max diameter as a fraction of √(inner pit area). Paired with Min Size and Diameter scale in pit-mode.',
      },
      {
        id: 'wallRestitution',
        label: 'Wall Bounce',
        configKey: 'runtime.motion.wallRestitution',
        type: 'range',
        min: 0,
        max: 0.6,
        step: 0.01,
        unit: '',
        default: 0.3,
        hint: 'How much bodies bounce off walls. 0 = dead stop, 0.3 = thick rubber, 0.6 = bouncy.',
      },
      {
        id: 'collisionRestitution',
        label: 'Body Bounce',
        configKey: 'runtime.motion.collisionRestitution',
        type: 'range',
        min: 0,
        max: 0.6,
        step: 0.01,
        unit: '',
        default: 0.35,
        hint: 'How much bodies bounce off each other. 0 = no bounce, 0.35 = thick rubber, 0.6 = bouncy.',
      },
    ],
  },
  labeling: {
    title: 'Titles',
    icon: 'TXT',
    defaultOpen: false,
    controls: [
      { id: 'fontDesktopPx', label: 'Desktop Size', configKey: 'runtime.labeling.fontDesktopPx', type: 'range', min: 16, max: 40, step: 1, unit: 'px', default: 28, refresh: true },
      { id: 'fontMobilePx', label: 'Mobile Size', configKey: 'runtime.labeling.fontMobilePx', type: 'range', min: 14, max: 30, step: 1, unit: 'px', default: 20, refresh: true },
      { id: 'lineHeight', label: 'Title Line Height', configKey: 'runtime.labeling.titleLineHeight', type: 'range', min: 0.6, max: 1, step: 0.01, unit: '', default: 0.84, refresh: true },
      { id: 'innerPaddingRatio', label: 'Inner Padding', configKey: 'runtime.labeling.innerPaddingRatio', type: 'range', min: 0.08, max: 0.28, step: 0.01, unit: '', default: 0.18, refresh: true },
      { id: 'blockRotationRangeDeg', label: 'Block Rotation', configKey: 'runtime.labeling.blockRotationRangeDeg', type: 'range', min: 0, max: 10, step: 0.5, unit: 'deg', default: 3.5, refresh: true },
    ],
  },
  motion: {
    title: 'Motion',
    icon: 'MOV',
    defaultOpen: false,
    controls: [
      { id: 'gravityScale', label: 'Gravity', configKey: 'runtime.motion.gravityScale', type: 'range', min: 0.15, max: 1.2, step: 0.01, unit: '', default: 0.82, refresh: true },
      { id: 'massMultiplier', label: 'Mass', configKey: 'runtime.motion.massMultiplier', type: 'range', min: 0.5, max: 2, step: 0.05, unit: '', default: 1, refresh: true },
      { id: 'neighborImpulse', label: 'Neighbor Impulse', configKey: 'runtime.motion.neighborImpulse', type: 'range', min: 0, max: 1200, step: 10, unit: '', default: 0 },
      { id: 'dragThrowMultiplier', label: 'Throw Multiplier', configKey: 'runtime.motion.dragThrowMultiplier', type: 'range', min: 0.2, max: 2, step: 0.05, unit: '', default: 1.05 },
      { id: 'openDurationMs', label: 'Open Handoff', configKey: 'runtime.motion.openDurationMs', type: 'range', min: 200, max: 1500, step: 10, unit: 'ms', default: 700 },
      { id: 'closeDurationMs', label: 'Close Handoff', configKey: 'runtime.motion.closeDurationMs', type: 'range', min: 160, max: 1000, step: 10, unit: 'ms', default: 520 },
      { id: 'colorFloodHoldMs', label: 'Color Hold', configKey: 'runtime.motion.colorFloodHoldMs', type: 'range', min: 0, max: 600, step: 10, unit: 'ms', default: 120 },
    ],
  },
  carousel: {
    title: 'Carousel',
    icon: 'CAR',
    defaultOpen: true,
    groups: [
      {
        key: 'card-size',
        title: 'Card Size',
        controls: [
          { id: 'carouselCardWidthPercent', label: 'Desktop width', configKey: 'runtime.carousel.cardWidthPercent', type: 'range', min: 16, max: 42, step: 0.5, unit: '%', default: 24, refresh: true },
          { id: 'carouselCardMaxWidthPx', label: 'Desktop max width', configKey: 'runtime.carousel.cardMaxWidthPx', type: 'range', min: 220, max: 620, step: 2, unit: 'px', default: 262, refresh: true },
          { id: 'carouselCardHeightCqh', label: 'Desktop height', configKey: 'runtime.carousel.cardHeightCqh', type: 'range', min: 36, max: 68, step: 0.5, unit: 'cqh', default: 58, refresh: true },
          { id: 'carouselCardMaxHeightPx', label: 'Desktop max height', configKey: 'runtime.carousel.cardMaxHeightPx', type: 'range', min: 340, max: 620, step: 2, unit: 'px', default: 378, refresh: true },
          { id: 'carouselMobileCardWidthPercent', label: 'Mobile width', configKey: 'runtime.carousel.mobileCardWidthPercent', type: 'range', min: 60, max: 92, step: 0.5, unit: '%', default: 64, refresh: true },
          { id: 'carouselMobileCardMaxWidthPx', label: 'Mobile max width', configKey: 'runtime.carousel.mobileCardMaxWidthPx', type: 'range', min: 240, max: 520, step: 2, unit: 'px', default: 300, refresh: true },
        ],
      },
      {
        key: 'orbit-layout',
        title: 'Orbit Layout',
        defaultOpen: true,
        controls: [
          {
            id: 'carouselSliderYOffsetDvh',
            label: 'Slider Y',
            configKey: 'runtime.carousel.sliderYOffsetDvh',
            type: 'range',
            min: -12,
            max: 12,
            step: 0.25,
            unit: 'dvh',
            default: 0,
            refresh: true,
            hint: 'Moves the complete card slider vertically after responsive layout and title-clearance calculations.',
          },
          {
            id: 'carouselIntroYOffsetDvh',
            label: 'Title group Y',
            configKey: 'runtime.carousel.introYOffsetDvh',
            type: 'range',
            min: -12,
            max: 12,
            step: 0.25,
            unit: 'dvh',
            default: 0,
            refresh: true,
            hint: 'Moves the Work title and description together without changing their internal spacing.',
          },
          { id: 'carouselCenterYPercent', label: 'Orbit Y', configKey: 'runtime.carousel.centerYPercent', type: 'range', min: 45, max: 74, step: 0.25, unit: '%', default: 50, refresh: true },
          { id: 'carouselMobileCenterYPercent', label: 'Mobile orbit Y', configKey: 'runtime.carousel.mobileCenterYPercent', type: 'range', min: 48, max: 72, step: 0.25, unit: '%', default: 58, refresh: true },
          { id: 'carouselPathRadiusPx', label: 'Desktop radius', configKey: 'runtime.carousel.pathRadiusPx', type: 'range', min: 900, max: 12000, step: 50, unit: 'px', default: 8000, refresh: true, hint: 'Controls the orbit curve directly. Card spacing widens automatically when needed to prevent overlap.' },
          { id: 'carouselMobilePathRadiusPx', label: 'Mobile radius', configKey: 'runtime.carousel.mobilePathRadiusPx', type: 'range', min: 420, max: 6000, step: 25, unit: 'px', default: 3200, refresh: true, hint: 'Controls the mobile orbit curve directly. Card spacing widens automatically when needed to prevent overlap.' },
          { id: 'carouselAngleStepDeg', label: 'Minimum desktop spacing', configKey: 'runtime.carousel.angleStepDeg', type: 'range', min: 1.5, max: 18, step: 0.05, unit: 'deg', default: 3.3, refresh: true, hint: 'Minimum angle between cards. The collision guard may use a larger effective angle.' },
          { id: 'carouselMobileAngleStepDeg', label: 'Minimum mobile spacing', configKey: 'runtime.carousel.mobileAngleStepDeg', type: 'range', min: 2, max: 24, step: 0.1, unit: 'deg', default: 4.5, refresh: true, hint: 'Minimum angle between cards on mobile. The collision guard may use a larger effective angle.' },
          { id: 'carouselMinCardGapPx', label: 'Minimum card gap', configKey: 'runtime.carousel.minCardGapPx', type: 'range', min: 8, max: 48, step: 1, unit: 'px', default: 18, refresh: true },
        ],
      },
      {
        key: 'depth-tilt',
        title: 'Depth & Tilt',
        controls: [
          { id: 'carouselSideRotationDeg', label: 'Side rotation', configKey: 'runtime.carousel.sideRotationDeg', type: 'range', min: 0, max: 24, step: 0.25, unit: 'deg', default: 10, refresh: true },
          { id: 'carouselFarRotationDeg', label: 'Far rotation', configKey: 'runtime.carousel.farRotationDeg', type: 'range', min: 10, max: 34, step: 0.25, unit: 'deg', default: 22, refresh: true },
          { id: 'carouselMobileSideScale', label: 'Mobile side scale', configKey: 'runtime.carousel.mobileSideScale', type: 'range', min: 0.62, max: 0.92, step: 0.01, unit: '', default: 0.78, refresh: true },
          { id: 'carouselContactShadowOpacity', label: 'Contact shadow', configKey: 'runtime.carousel.contactShadowOpacity', type: 'range', min: 0, max: 0.2, step: 0.005, unit: '', default: 0, refresh: true },
        ],
      },
      {
        key: 'dot-track',
        title: 'Line Track',
        controls: [
          { id: 'carouselDotDialRadiusPx', label: 'Desktop line spread', configKey: 'runtime.carousel.dotDialRadiusPx', type: 'range', min: 900, max: 3600, step: 10, unit: 'px', default: 2050, refresh: true, hint: 'Changes the width and curvature of the visible line track.' },
          { id: 'carouselMobileDotDialRadiusPx', label: 'Mobile line spread', configKey: 'runtime.carousel.mobileDotDialRadiusPx', type: 'range', min: 520, max: 1600, step: 10, unit: 'px', default: 900, refresh: true, hint: 'Changes the width and curvature of the line track on narrow viewports.' },
          { id: 'carouselDotDensity', label: 'Line count', configKey: 'runtime.carousel.dotDensity', type: 'range', min: 5, max: 48, step: 1, unit: '', default: 5, refresh: true, hint: 'Total lines in the repeating track. Updates immediately.' },
          { id: 'carouselDotParallaxRatio', label: 'Scroll ratio', configKey: 'runtime.carousel.dotParallaxRatio', type: 'range', min: -2, max: 2, step: 0.05, unit: '', default: 1, refresh: true, hint: 'How far and in which direction the lines travel while the carousel moves.' },
          { id: 'carouselDotArcSpanDeg', label: 'Arc width', configKey: 'runtime.carousel.dotArcSpanDeg', type: 'range', min: 8, max: 34, step: 0.5, unit: 'deg', default: 18, refresh: true, hint: 'Angular width occupied by the complete line track.' },
        ],
      },
      {
        key: 'gesture-input',
        title: 'Gesture Input',
        controls: [
          { id: 'carouselScrollSensitivity', label: 'Input sensitivity', configKey: 'runtime.carousel.scrollSensitivity', type: 'range', min: 0.25, max: 2, step: 0.05, unit: '', default: 1, refresh: true },
          { id: 'carouselScrollPixelsPerProject', label: 'Pixels per project', configKey: 'runtime.carousel.scrollPixelsPerProject', type: 'range', min: 220, max: 900, step: 10, unit: 'px', default: 520, refresh: true },
          { id: 'carouselInputCapProjects', label: 'Per-event input cap', configKey: 'runtime.carousel.inputCapProjects', type: 'range', min: 0.08, max: 0.8, step: 0.01, unit: '', default: 0.32, refresh: true },
          { id: 'carouselInputCommitThreshold', label: 'Commit threshold', configKey: 'runtime.carousel.inputCommitThresholdProjects', type: 'range', min: 0.08, max: 0.45, step: 0.01, unit: '', default: 0.18, refresh: true },
          { id: 'carouselInputIntentWindow', label: 'Intent window', configKey: 'runtime.carousel.inputIntentWindowMs', type: 'range', min: 80, max: 360, step: 10, unit: 'ms', default: 180, refresh: true },
          { id: 'carouselMaxLeadProjects', label: 'Maximum lead', configKey: 'runtime.carousel.maxLeadProjects', type: 'range', min: 0.5, max: 4, step: 0.1, unit: '', default: 2, refresh: true },
        ],
      },
      {
        key: 'settle-motion',
        title: 'Settle Motion',
        controls: [
          { id: 'carouselSettleStrength', label: 'Snap strength', configKey: 'runtime.carousel.settleStrength', type: 'range', min: 0.04, max: 0.32, step: 0.01, unit: '', default: 0.15, refresh: true },
          { id: 'carouselFollowSmoothing', label: 'Follow smoothness', configKey: 'runtime.carousel.followSmoothing', type: 'range', min: 0.04, max: 0.38, step: 0.01, unit: '', default: 0.18, refresh: true },
          { id: 'carouselSettleIdleMs', label: 'Idle before snap', configKey: 'runtime.carousel.settleIdleMs', type: 'range', min: 60, max: 520, step: 10, unit: 'ms', default: 150, refresh: true },
        ],
      },
      {
        key: 'particle-field',
        title: 'Particle Field',
        controls: [
          { id: 'carouselParticleIdleOpacity', label: 'Idle opacity', configKey: 'runtime.carousel.particleField.idleOpacity', type: 'range', min: 0, max: 1, step: 0.01, unit: '', default: 0, refresh: true, hint: 'Baseline particle visibility while the carousel is settled.' },
          { id: 'carouselParticleFastOpacity', label: 'Fast opacity', configKey: 'runtime.carousel.particleField.fastOpacity', type: 'range', min: 0.08, max: 1, step: 0.01, unit: '', default: 0.26, refresh: true, hint: 'Maximum particle visibility during very fast carousel movement.' },
          { id: 'carouselParticleQuietBandHeight', label: 'Quiet band height', configKey: 'runtime.carousel.particleField.quietBandHeight', type: 'range', min: 0.18, max: 0.72, step: 0.01, unit: '', default: 0.42, refresh: true, hint: 'Height of the softer horizontal corridor behind the project cards.' },
          { id: 'carouselParticleQuietBandOpacity', label: 'Quiet band opacity', configKey: 'runtime.carousel.particleField.quietBandOpacity', type: 'range', min: 0.05, max: 1, step: 0.01, unit: '', default: 0.3, refresh: true, hint: 'Particle opacity inside the card corridor, relative to the top and bottom.' },
          { id: 'carouselParticleDensity', label: 'Density', configKey: 'runtime.carousel.particleField.densityScale', type: 'range', min: 0.25, max: 2, step: 0.05, unit: '', default: 1, refresh: true, hint: 'Total number of deterministic particles across all three layers.' },
          { id: 'carouselParticleMinRadius', label: 'Far size', configKey: 'runtime.carousel.particleField.minRadiusPx', type: 'range', min: 0.75, max: 6, step: 0.05, unit: 'px', default: 1.8, refresh: true, hint: 'Smallest distant circles; lower values push the far plane deeper.' },
          { id: 'carouselParticleMaxRadius', label: 'Near size', configKey: 'runtime.carousel.particleField.maxRadiusPx', type: 'range', min: 6, max: 36, step: 0.5, unit: 'px', default: 18, refresh: true, hint: 'Largest foreground circles; higher values pull the near plane closer.' },
          { id: 'carouselParticleMotionResponse', label: 'Motion response', configKey: 'runtime.carousel.particleField.motionResponse', type: 'range', min: 0.25, max: 2.5, step: 0.05, unit: '', default: 1, refresh: true, hint: 'How strongly measured carousel speed drives particle travel.' },
          { id: 'carouselParticleParallaxDepth', label: 'Parallax depth', configKey: 'runtime.carousel.particleField.parallaxDepth', type: 'range', min: 0.25, max: 2, step: 0.05, unit: '', default: 1, refresh: true, hint: 'Speed separation between the far, middle, and near layers.' },
        ],
      },
    ],
  },
  hero: {
    title: 'Open Hero',
    icon: 'OPEN',
    defaultOpen: false,
    controls: [
      { id: 'portfolioHeroTitleMax', label: 'Title Max', cssVar: '--portfolio-hero-title-max', type: 'range', min: 8, max: 24, step: 1, unit: 'ch', default: 14 },
      { id: 'portfolioImageVeilOpacity', label: 'Image Veil', cssVar: '--portfolio-image-veil-opacity', type: 'range', min: 0, max: 0.6, step: 0.01, unit: '', default: 0.14 },
      {
        id: 'heroKenBurnsDurationMs',
        label: 'Ken Burns Duration',
        configKey: 'runtime.motion.heroKenBurnsDurationMs',
        type: 'range',
        min: 12000,
        max: 60000,
        step: 500,
        unit: 'ms',
        default: 28000,
        hint: 'Base duration for the open-hero camera move. Higher values feel more cinematic and deliberate.',
      },
      {
        id: 'heroKenBurnsPanPx',
        label: 'Ken Burns Drift',
        configKey: 'runtime.motion.heroKenBurnsPanPx',
        type: 'range',
        min: 6,
        max: 36,
        step: 1,
        unit: 'px',
        default: 18,
        hint: 'How far the hero image pans across the frame during the move.',
      },
      {
        id: 'heroKenBurnsZoomPct',
        label: 'Ken Burns Zoom',
        configKey: 'runtime.motion.heroKenBurnsZoomPct',
        type: 'range',
        min: 6,
        max: 30,
        step: 1,
        unit: '%',
        default: 18,
        hint: 'Total zoom added from the opening frame to the end of the move.',
      },
      { id: 'portfolioScrollHintOffset', label: 'Scroll Hint', cssVar: '--portfolio-scroll-hint-offset', type: 'range', min: 12, max: 120, step: 1, unit: 'px', default: 52 },
      { id: 'reducedMotionDurationMs', label: 'Reduced Motion', configKey: 'runtime.behavior.reducedMotionDurationMs', type: 'range', min: 120, max: 600, step: 10, unit: 'ms', default: 320 },
    ],
  },
  drawer: {
    title: 'Drawer',
    icon: 'DRV',
    defaultOpen: false,
    controls: [
      {
        id: 'portfolioDrawerInnerRadiusShrink',
        label: 'Corner radius shrink',
        cssVar: '--portfolio-drawer-inner-radius-shrink',
        type: 'range',
        min: 0,
        max: 4,
        step: 1,
        unit: 'px',
        default: 1,
        hint: 'Subtracts from the seat radius on the drawer + backdrop so the sheet surface sits slightly inside the host clip (stops hairline light at rounded corners).',
      },
      {
        id: 'portfolioDrawerSeatInset',
        label: 'Drawer inset',
        cssVar: '--portfolio-drawer-seat-inset',
        type: 'range',
        min: -20,
        max: 28,
        step: 1,
        unit: 'px',
        default: 3,
        hint: 'Positive: margin around the sheet so the real pit wall + rim lights show through. Negative: sheet extends toward the host edge (clipped). Drawer shading is insert-only; wall lights stay on the pit.',
      },
      {
        id: 'portfolioDrawerInsertContactOpacity',
        label: 'Insert contact shadow',
        cssVar: '--portfolio-drawer-insert-contact-opacity',
        type: 'range',
        min: 0,
        max: 0.55,
        step: 0.01,
        unit: '',
        default: 0.24,
        hint: 'Bottom + side occlusion where the sheet meets the pit (not wall rim lights).',
      },
      {
        id: 'portfolioDrawerInsertTopLightOpacity',
        label: 'Insert top light',
        cssVar: '--portfolio-drawer-insert-top-light-opacity',
        type: 'range',
        min: 0,
        max: 0.4,
        step: 0.01,
        unit: '',
        default: 0.14,
        hint: 'Subtle highlight on the top face of the sheet.',
      },
      {
        id: 'portfolioDrawerInsertLipOpacity',
        label: 'Insert lip shadow',
        cssVar: '--portfolio-drawer-insert-lip-opacity',
        type: 'range',
        min: 0,
        max: 0.45,
        step: 0.01,
        unit: '',
        default: 0.16,
        hint: 'Dark band under the opening edge (stacked on the top light).',
      },
      {
        id: 'portfolioDrawerOutlineWidth',
        label: 'Outline width',
        cssVar: '--portfolio-drawer-outline-width',
        type: 'range',
        min: 0,
        max: 4,
        step: 0.5,
        unit: 'px',
        default: 1,
        hint: 'Inset ring on the insert face (inner-wall shadow RGB). Set to 0 to disable.',
      },
      {
        id: 'portfolioDrawerOutlineOpacity',
        label: 'Outline strength',
        cssVar: '--portfolio-drawer-outline-opacity',
        type: 'range',
        min: 0,
        max: 0.65,
        step: 0.01,
        unit: '',
        default: 0.28,
        hint: 'Opacity of the drawer outline color (same RGB as inner-wall bottom shadow).',
      },
    ],
  },
};

/** All sections whose controls participate in bind + save snapshot. */
const ACTIVE_SECTION_KEYS = ['layout', 'bodies', 'labeling', 'motion', 'carousel', 'hero', 'drawer'];

/** Page master-group only: pit rim is injected under Simulation (see panel-dock). */
const PORTFOLIO_PAGE_SECTION_KEYS = ['carousel'];

function getControlInputId(control) {
  return `${control.id}Slider`;
}

function getControlValueId(control) {
  return `${control.id}Val`;
}

function getConfigValue(config, path) {
  if (!config || !path) return undefined;
  const parts = String(path).split('.');
  let cursor = config;
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = cursor[part];
  }
  return cursor;
}

function setConfigValue(config, path, value) {
  if (!config || !path) return;
  const parts = String(path).split('.');
  let cursor = config;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function parseNumeric(value, fallback) {
  const numeric = Number.parseFloat(value);
  if (Number.isFinite(numeric)) return numeric;
  const fallbackNumeric = Number.parseFloat(fallback);
  return Number.isFinite(fallbackNumeric) ? fallbackNumeric : 0;
}

function formatControlDisplay(control, value) {
  const numeric = parseNumeric(value, control.default);
  return control.unit ? `${numeric}${control.unit}` : String(numeric);
}

function formatCssValue(control, numericValue) {
  return control.unit ? `${numericValue}${control.unit}` : String(numericValue);
}

function getAllControls() {
  return ACTIVE_SECTION_KEYS.flatMap((sectionKey) => getSectionControls(CONTROL_SECTIONS[sectionKey]));
}

function getSectionControls(section) {
  if (!section) return [];
  const controls = Array.isArray(section.controls) ? section.controls : [];
  const groupedControls = Array.isArray(section.groups)
    ? section.groups.flatMap((group) => group?.controls || [])
    : [];
  return [...controls, ...groupedControls];
}

function resolveControlValue(control, config, computedRoot) {
  if (control.cssVar) {
    const configured = config?.cssVars?.[control.cssVar];
    if (configured !== undefined) return configured;
    const computed = computedRoot?.getPropertyValue(control.cssVar)?.trim();
    if (computed) return computed;
  }
  if (control.configKey) {
    const configured = getConfigValue(config, control.configKey);
    if (configured !== undefined) return configured;
  }
  return control.default;
}

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function generatePortfolioControlRow(control, config, computedRoot) {
  const rawValue = resolveControlValue(control, config, computedRoot);
  const numericValue = parseNumeric(rawValue, control.default);
  const sliderId = getControlInputId(control);
  const valId = getControlValueId(control);
  const hintTitleAttr = control.hint ? ` title="${escapeAttr(control.hint)}"` : '';
  const hintHtml = control.hint ? `<p class="control-hint">${escapeAttr(control.hint)}</p>` : '';
  const display = formatControlDisplay(control, numericValue);
  return `
      <label class="control-row" data-control-id="${escapeAttr(control.id)}">
        <div class="control-row-header">
          <span class="control-label"${hintTitleAttr}>${escapeAttr(control.label)}</span>
          <span class="control-value" id="${valId}">${escapeAttr(display)}</span>
        </div>
        <input type="range" id="${sliderId}" min="${control.min}" max="${control.max}" step="${control.step}" value="${numericValue}" aria-label="${escapeAttr(control.label)}">
      </label>
      ${hintHtml}`;
}

function generatePortfolioSubgroupHTML(group, config, computedRoot) {
  if (!group?.controls?.length) return '';
  const body = group.controls.map((control) => generatePortfolioControlRow(control, config, computedRoot)).join('');
  const openAttr = group.defaultOpen ? ' open' : '';
  return `
      <details class="panel-subgroup" data-panel-subgroup="${escapeAttr(group.key || group.title)}"${openAttr}>
        <summary>${escapeAttr(group.title)}</summary>
        <div class="group">${body}</div>
      </details>`;
}

function generatePortfolioSectionHTML(sectionKey, config, computedRoot) {
  const section = CONTROL_SECTIONS[sectionKey];
  if (!getSectionControls(section).length) return '';
  const directControls = (section.controls || [])
    .map((control) => generatePortfolioControlRow(control, config, computedRoot))
    .join('');
  const groupedControls = (section.groups || [])
    .map((group) => generatePortfolioSubgroupHTML(group, config, computedRoot))
    .join('');
  const body = `${directControls}${groupedControls}`;
  const openAttr = section.defaultOpen ? ' open' : '';
  const iconHtml = section.icon ? `<span class="section-icon">${section.icon}</span>` : '';
  return `
    <details class="panel-section-accordion"${openAttr}>
      <summary class="panel-section-header">
        ${iconHtml}
        <span class="section-label">${escapeAttr(section.title)}</span>
      </summary>
      <div class="panel-section-content">${body}</div>
    </details>`;
}

export function generatePortfolioPitChromePanelHTML() {
  return '';
}

export function generatePanelSectionsHTML(config, computedRoot = null) {
  const root = computedRoot
    || (typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null);
  return PORTFOLIO_PAGE_SECTION_KEYS.map((key) => generatePortfolioSectionHTML(key, config, root)).join('');
}

export function generatePanelHTML(config) {
  return `
    ${generatePanelSectionsHTML(config)}
    <div class="panel-section panel-section--action">
      <button id="savePortfolioConfigBtn" class="primary">Save Portfolio Config</button>
    </div>
    <div class="panel-footer"><kbd>/</kbd> panel</div>`;
}

export function bindRegisteredControls(config, options = {}) {
  if (!config || typeof config !== 'object') return;
  if (!config.cssVars || typeof config.cssVars !== 'object') config.cssVars = {};
  if (!config.runtime || typeof config.runtime !== 'object') config.runtime = {};
  const uiDocument = resolvePanelUiDocument(options.uiDocument);
  if (!uiDocument) return;
  registerPanelUiDocument(uiDocument);
  const root = document.documentElement;
  const computedRoot = getComputedStyle(root);
  const { onMetricsChange, onRuntimeChange } = options;

  for (const control of getAllControls()) {
    const input = uiDocument.getElementById(getControlInputId(control));
    const valueNode = uiDocument.getElementById(getControlValueId(control));
    if (!input) continue;

    const rawValue = resolveControlValue(control, config, computedRoot);
    input.value = String(parseNumeric(rawValue, control.default));
    if (valueNode) valueNode.textContent = formatControlDisplay(control, input.value);

    input.addEventListener('input', (event) => {
      const numericValue = parseNumeric(event.target.value, control.default);
      if (control.cssVar) {
        const cssValue = formatCssValue(control, numericValue);
        root.style.setProperty(control.cssVar, cssValue);
        config.cssVars[control.cssVar] = cssValue;
      }
      if (control.configKey) {
        setConfigValue(config, control.configKey, numericValue);
      }
      if (valueNode) valueNode.textContent = formatControlDisplay(control, numericValue);

      if (control.refresh && typeof onMetricsChange === 'function') onMetricsChange();
      if (control.configKey && typeof onRuntimeChange === 'function') onRuntimeChange(config.runtime);
    });
  }
}

export function buildConfigSnapshot(config, options = {}) {
  const snapshot = {
    cssVars: {},
    runtime: {
      layout: {},
      bodies: {},
      labeling: {},
      motion: {},
      carousel: {},
      openHero: {},
      behavior: {},
    },
  };
  const uiDocument = resolvePanelUiDocument(options.uiDocument);
  if (uiDocument) registerPanelUiDocument(uiDocument);
  const computedRoot = getComputedStyle(document.documentElement);

  for (const control of getAllControls()) {
    if (control.cssVar) {
      const value = computedRoot.getPropertyValue(control.cssVar).trim()
        || config?.cssVars?.[control.cssVar]
        || formatCssValue(control, control.default);
      snapshot.cssVars[control.cssVar] = String(value);
      continue;
    }
    if (control.configKey) {
      setConfigValue(snapshot, control.configKey, parseNumeric(getConfigValue(config, control.configKey), control.default));
    }
  }

  snapshot.runtime.openHero.imageVeilOpacity = parseNumeric(
    snapshot.cssVars['--portfolio-image-veil-opacity'],
    0.14
  );
  snapshot.runtime.openHero.titleMaxWidthCh = parseNumeric(
    snapshot.cssVars['--portfolio-hero-title-max'],
    14
  );
  snapshot.runtime.openHero.scrollHintOffsetVh = parseNumeric(
    snapshot.cssVars['--portfolio-scroll-hint-offset'],
    52
  );

  return snapshot;
}

export { CONTROL_SECTIONS };
