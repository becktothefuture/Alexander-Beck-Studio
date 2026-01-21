/* Alexander Beck Studio | 2026-01-21 */
// Portfolio control registry.
// Defines the panel controls and keeps config + CSS vars in sync.

const CONTROL_SECTIONS = {
  layout: {
    title: 'Stage',
    icon: '📐',
    defaultOpen: true,
    controls: [
      { id: 'topLogoWidthVw', label: 'Top Logo Size', type: 'range', min: 15, max: 45, step: 0.25, unit: 'vw', default: 35,
        onChange: (_config, val) => {
          document.documentElement.style.setProperty('--top-logo-width-vw', String(val));
        }
      },
      { id: 'portfolioLogoBlur', label: 'Logo Blur', cssVar: '--portfolio-logo-blur', type: 'range', min: 0, max: 30, step: 0.5, unit: 'px', default: 0,
        hint: 'Blur amount for the background logo (0 = sharp)'
      },
      { id: 'contentOffset', label: 'Content Offset', cssVar: '--content-offset', type: 'range', min: 0, max: 50, step: 0.1, unit: 'vh', default: 23.5 },
      { id: 'metaPadding', label: 'Meta Padding', cssVar: '--meta-padding', type: 'range', min: 0, max: 10, step: 0.1, unit: 'vmin', default: 0 },
      // Use dvh to match the shipped config + avoid silently converting 100dvh -> 100vh in snapshots.
      { id: 'sliderMaxHeight', label: 'Max Height', cssVar: '--slider-max-height', type: 'range', min: 40, max: 100, step: 1, unit: 'dvh', default: 100, refresh: true },
      { id: 'wheelRadiusX', label: 'Carousel Radius X', cssVar: '--wheel-radius-x', type: 'range', min: 10, max: 100, step: 1, unit: 'vw', default: 36, refresh: true },
      { id: 'wheelRadiusY', label: 'Carousel Radius Y', cssVar: '--wheel-radius-y', type: 'range', min: 2, max: 60, step: 1, unit: 'vh', default: 14, refresh: true },
      { id: 'wheelSpacingRatio', label: 'Card Spacing (Ratio)', cssVar: '--wheel-spacing-ratio', type: 'range', min: 0, max: 1, step: 0.01, unit: '', default: 0.22, refresh: true },
      { id: 'wheelCenterX', label: 'Carousel Offset X', cssVar: '--wheel-center-x', type: 'range', min: -50, max: 50, step: 0.5, unit: 'vw', default: 0, refresh: true },
      { id: 'wheelCenterY', label: 'Carousel Offset Y', cssVar: '--wheel-center-y', type: 'range', min: -50, max: 50, step: 0.5, unit: 'vh', default: -6, refresh: true },
      { id: 'wheelTilt', label: 'Tilt', cssVar: '--wheel-tilt', type: 'range', min: 0, max: 180, step: 1, unit: 'deg', default: 60, refresh: true },
      { id: 'wheelDepth', label: 'Depth', cssVar: '--wheel-depth', type: 'range', min: 0.1, max: 3, step: 0.05, unit: '', default: 1, refresh: true },
    ],
  },
  caption: {
    title: 'Page Caption',
    icon: '💬',
    defaultOpen: false,
    controls: [
      { id: 'edgeCaptionDistanceMin', label: 'Caption Distance Min', cssVar: '--edge-caption-distance-min', type: 'range', min: 0, max: 80, step: 2, unit: 'px', default: 8, hint: 'Minimum distance from bottom of content' },
      { id: 'edgeCaptionDistanceMax', label: 'Caption Distance Max', cssVar: '--edge-caption-distance-max', type: 'range', min: 16, max: 200, step: 2, unit: 'px', default: 48, hint: 'Maximum distance; applied at largest breakpoint, does not grow further' },
    ],
  },
  card: {
    title: 'Cards',
    icon: '🗂️',
    defaultOpen: false,
    controls: [
      { id: 'cardAspectW', label: 'Aspect W', cssVar: '--card-aspect-w', type: 'range', min: 1, max: 30, step: 1, unit: '', default: 5, refresh: true },
      { id: 'cardAspectH', label: 'Aspect H', cssVar: '--card-aspect-h', type: 'range', min: 1, max: 30, step: 1, unit: '', default: 4, refresh: true },
      { id: 'cardHeightMin', label: 'Height Min', cssVar: '--card-height-min', type: 'range', min: 10, max: 90, step: 1, unit: 'vh', default: 30, refresh: true },
      { id: 'cardHeightIdeal', label: 'Height Ideal', cssVar: '--card-height-ideal', type: 'range', min: 15, max: 95, step: 1, unit: 'vh', default: 45, refresh: true },
      { id: 'cardHeightMax', label: 'Height Max', cssVar: '--card-height-max', type: 'range', min: 20, max: 100, step: 1, unit: 'vh', default: 55, refresh: true },
      { id: 'cornerRadius', label: 'Corner Radius', cssVar: '--corner-radius', type: 'range', min: 0, max: 8, step: 0.1, unit: 'vmin', default: 1.9 },
      { id: 'borderWidth', label: 'Border Width', cssVar: '--border-width', type: 'range', min: 0, max: 2, step: 0.1, unit: 'vmin', default: 0.6 },
      { id: 'slideGradientIntensityLight', label: 'Gradient Intensity (Light)', cssVar: '--slide-gradient-intensity-light', type: 'range', min: 0, max: 1, step: 0.05, unit: '', default: 0.5, hint: 'Opacity of the white overlay at bottom in light mode' },
      { id: 'slideGradientIntensityDark', label: 'Gradient Intensity (Dark)', cssVar: '--slide-gradient-intensity-dark', type: 'range', min: 0, max: 1, step: 0.05, unit: '', default: 0.5, hint: 'Opacity of the black overlay at bottom in dark mode' },
    ],
  },
  appearance: {
    title: 'Depth & Atmosphere',
    icon: '🎨',
    defaultOpen: false,
    controls: [
      // These are consumed by `PortfolioApp.updateWheelConfig()`, so they must trigger a metrics refresh.
      { id: 'wheelScaleMin', label: 'Scale Min', cssVar: '--wheel-scale-min', type: 'range', min: 0.1, max: 2, step: 0.01, unit: '', default: 0.82, refresh: true },
      { id: 'wheelScaleMax', label: 'Scale Max', cssVar: '--wheel-scale-max', type: 'range', min: 0.5, max: 3, step: 0.01, unit: '', default: 1, refresh: true },
      { id: 'wheelBlurMax', label: 'Blur Max', cssVar: '--wheel-blur-max', type: 'range', min: 0, max: 20, step: 0.1, unit: 'vmin', default: 1.6, refresh: true },
      { id: 'wheelOpacityMax', label: 'Fog Near', cssVar: '--wheel-opacity-max', type: 'range', min: 0, max: 1, step: 0.05, unit: '', default: 1, refresh: true },
      { id: 'wheelOpacityMin', label: 'Fog Far', cssVar: '--wheel-opacity-min', type: 'range', min: 0, max: 1, step: 0.05, unit: '', default: 0.2, refresh: true },
      { id: 'wheelOpacityCurve', label: 'Fog Curve', cssVar: '--wheel-opacity-curve', type: 'range', min: 0.1, max: 10, step: 0.05, unit: '', default: 1.15, refresh: true },
      { id: 'wheelRotate', label: 'Card Rotate', cssVar: '--wheel-rotate', type: 'range', min: -90, max: 90, step: 1, unit: 'deg', default: 12, refresh: true },
      { id: 'wheelActiveLift', label: 'Active Lift', cssVar: '--wheel-active-lift', type: 'range', min: 0, max: 30, step: 0.5, unit: 'vh', default: 2.5, refresh: true },
      { id: 'activeShadow', label: 'Shadow', cssVar: '--active-shadow-intensity', type: 'range', min: 0, max: 2, step: 0.05, unit: '', default: 0.1 },
      { id: 'imgSaturation', label: 'Saturation', cssVar: '--img-saturation', type: 'range', min: 0, max: 500, step: 10, unit: '%', default: 100 },
      { id: 'borderColor', label: 'Border Color', cssVar: '--border-color', type: 'color', default: '#ffffff' },
      { id: 'accentColor', label: 'Accent Color', cssVar: '--accent-color', type: 'color', default: '#000000' },
    ],
  },
  cylinder: {
    title: 'Cylinder Background',
    icon: '🌀',
    defaultOpen: false,
    controls: [
      { id: 'cylinderEnabled', label: 'Enabled', configKey: 'runtime.cylinder.enabled', type: 'checkbox', default: true },
      { id: 'cylinderRingCount', label: 'Depth Layers', configKey: 'runtime.cylinder.ringCount', type: 'range', min: 4, max: 30, step: 1, default: 12, hint: 'Number of depth layers along Z-axis' },
      { id: 'cylinderDotsPerRing', label: 'Dots Per Ring', configKey: 'runtime.cylinder.dotsPerRing', type: 'range', min: 8, max: 60, step: 2, default: 24, hint: 'Dots around circumference of each ring' },
      { id: 'cylinderRadiusRings', label: 'Radial Rings', configKey: 'runtime.cylinder.radiusRings', type: 'range', min: 2, max: 12, step: 1, default: 5, hint: 'Number of concentric rings extending outward' },
      { id: 'cylinderRadiusMin', label: 'Radius Start', configKey: 'runtime.cylinder.radiusMin', type: 'range', min: 50, max: 400, step: 10, unit: 'px', default: 100, hint: 'Inner radius (closest to center)' },
      { id: 'cylinderRadiusStep', label: 'Radius Spacing', configKey: 'runtime.cylinder.radiusStep', type: 'range', min: 20, max: 200, step: 10, unit: 'px', default: 80, hint: 'Spacing between concentric rings' },
      { id: 'cylinderVerticalSpacing', label: 'Vertical Spacing', configKey: 'runtime.cylinder.verticalSpacing', type: 'range', min: 20, max: 150, step: 5, unit: 'px', default: 60, hint: 'Vertical spacing between rings' },
      { id: 'cylinderDepthRange', label: 'Depth Range', configKey: 'runtime.cylinder.depthRange', type: 'range', min: 300, max: 2500, step: 50, default: 1000, hint: 'How far back the grid extends' },
      { id: 'cylinderRandomness', label: 'Grid Randomness', configKey: 'runtime.cylinder.randomness', type: 'range', min: 0, max: 1, step: 0.05, default: 0.2, hint: 'Jitter amount (0 = perfect grid, 1 = chaotic)' },
      { id: 'cylinderDotSize', label: 'Dot Size', configKey: 'runtime.cylinder.dotSize', type: 'range', min: 1, max: 10, step: 0.5, unit: 'px', default: 3 },
      { id: 'cylinderOpacityMin', label: 'Opacity Far', configKey: 'runtime.cylinder.opacityMin', type: 'range', min: 0, max: 1, step: 0.05, default: 0.15 },
      { id: 'cylinderOpacityMax', label: 'Opacity Near', configKey: 'runtime.cylinder.opacityMax', type: 'range', min: 0, max: 1, step: 0.05, default: 0.9 },
      { id: 'cylinderRotationSync', label: 'Rotation Sync', configKey: 'runtime.cylinder.rotationSync', type: 'range', min: 0, max: 2, step: 0.1, default: 1, hint: 'How much cylinder rotates with carousel (1.0 = perfect sync)' },
    ],
  },
  wheelMotion: {
    title: 'Wheel Motion',
    icon: '🌀',
    defaultOpen: false,
    controls: [
      { id: 'wheelScrollSpeed', label: 'Scroll Speed', cssVar: '--wheel-scroll-speed', type: 'range', min: 0, max: 10, step: 0.05, unit: '', default: 0.65, refresh: true },
      { id: 'wheelDragSpeed', label: 'Drag Speed', cssVar: '--wheel-drag-speed', type: 'range', min: 0, max: 10, step: 0.05, unit: '', default: 0.9, refresh: true },
      { id: 'wheelFriction', label: 'Friction', cssVar: '--wheel-friction', type: 'range', min: 0, max: 30, step: 0.1, unit: '', default: 3, refresh: true },
      { id: 'wheelSnapSpeed', label: 'Snap Speed', cssVar: '--wheel-snap-speed', type: 'range', min: 0, max: 5, step: 0.02, unit: '', default: 0.14, refresh: true },
      { id: 'wheelSnapStrength', label: 'Snap Strength', cssVar: '--wheel-snap-strength', type: 'range', min: 0, max: 50, step: 0.5, unit: '', default: 4, refresh: true },
    ],
  },
  physics: {
    title: 'Dynamics',
    icon: '🧲',
    defaultOpen: false,
    controls: [
      { id: 'wheelBounceStrength', label: 'Bounce Strength', cssVar: '--wheel-bounce-strength', type: 'range', min: 0, max: 100, step: 1, unit: '', default: 16, refresh: true },
      { id: 'wheelBounceDamping', label: 'Bounce Damping', cssVar: '--wheel-bounce-damping', type: 'range', min: 0, max: 50, step: 0.5, unit: '', default: 10, refresh: true },
      { id: 'wheelBounceImpulse', label: 'Bounce Impulse', cssVar: '--wheel-bounce-impulse', type: 'range', min: 0, max: 20, step: 0.2, unit: 'vmin', default: 2.6, refresh: true },
    ],
  },
  detail: {
    title: 'Detail Layout',
    icon: '🔎',
    defaultOpen: false,
    controls: [
      { id: 'detailMaxWidth', label: 'Max Width', cssVar: '--detail-max-width', type: 'range', min: 200, max: 2000, step: 10, unit: 'px', default: 720 },
      { id: 'detailHeroWidth', label: 'Header Width', cssVar: '--detail-hero-width', type: 'range', min: 50, max: 200, step: 1, unit: '%', default: 100 },
      { id: 'detailHeroOffset', label: 'Header Offset', cssVar: '--detail-hero-offset', type: 'range', min: -100, max: 100, step: 1, unit: '%', default: 0 },
      { id: 'detailHeroTopPad', label: 'Header Top Pad', cssVar: '--detail-hero-top-pad', type: 'range', min: 0, max: 300, step: 2, unit: 'px', default: 52 },
    ],
  },
  closeButton: {
    title: 'Detail Close',
    icon: '✕',
    defaultOpen: false,
    controls: [
      { id: 'closeButtonTop', label: 'Top Position', cssVar: '--close-button-top', type: 'range', min: 0, max: 200, step: 1, unit: 'px', default: 0 },
      { id: 'closeButtonLeft', label: 'Left Position', cssVar: '--close-button-left', type: 'range', min: 0, max: 200, step: 1, unit: 'px', default: 0 },
      { id: 'closeButtonWidth', label: 'Width', cssVar: '--close-button-width', type: 'range', min: 50, max: 100, step: 1, unit: '%', default: 100 },
      { id: 'closeButtonHeight', label: 'Height', cssVar: '--close-button-height', type: 'range', min: 30, max: 120, step: 2, unit: 'px', default: 60 },
      { id: 'closeButtonIconSize', label: 'Icon Size', cssVar: '--close-button-icon-size', type: 'range', min: 8, max: 32, step: 0.5, unit: 'px', default: 15 },
    ],
  },
  transition: {
    title: 'Motion',
    icon: '✨',
    defaultOpen: false,
    controls: [
      {
        id: 'detailEase',
        label: 'Detail Ease',
        cssVar: '--detail-transition-ease',
        type: 'select',
        options: [
          { label: 'Rubber', value: 'var(--ease-gate)' },
          { label: 'Soft', value: 'var(--ease-settle)' },
          { label: 'Snappy', value: 'var(--ease-hesitant)' },
          { label: 'Linear', value: 'linear' },
        ],
        default: 'var(--ease-gate)',
      },
      { id: 'detailDuration', label: 'Detail Duration', cssVar: '--detail-transition-ms', type: 'range', min: 0, max: 5000, step: 20, unit: 'ms', default: 700 },
      { id: 'detailBlur', label: 'Image Blur', cssVar: '--detail-transition-blur', type: 'range', min: 0, max: 100, step: 1, unit: 'px', default: 8 },
      { id: 'detailShadow', label: 'Card Shadow', cssVar: '--detail-transition-shadow-opacity', type: 'range', min: 0, max: 2, step: 0.02, unit: '', default: 0.18 },
      { id: 'detailCrossBlur', label: 'Cross Blur', cssVar: '--detail-transition-cross-blur', type: 'range', min: 0, max: 5, step: 0.05, unit: 'vmin', default: 0.9 },
      { id: 'detailFadeMs', label: 'Fade Duration', cssVar: '--detail-transition-fade-ms', type: 'range', min: 0, max: 1200, step: 10, unit: 'ms', default: 240 },
      { id: 'detailFadeDelay', label: 'Fade Delay', cssVar: '--detail-transition-fade-delay', type: 'range', min: 0, max: 1200, step: 10, unit: 'ms', default: 60 },
      { id: 'detailContentPopDuration', label: 'Content Pop Duration', cssVar: '--detail-content-pop-duration', type: 'range', min: 0, max: 1500, step: 10, unit: 'ms', default: 420 },
      { id: 'detailContentPopOvershoot', label: 'Content Pop Overshoot', cssVar: '--detail-content-pop-overshoot-scale', type: 'range', min: 1.0, max: 1.08, step: 0.001, unit: '', default: 1.015 },
      { id: 'detailContentPopStartScale', label: 'Content Pop Start Scale', cssVar: '--detail-content-pop-start-scale', type: 'range', min: 0.94, max: 1.0, step: 0.001, unit: '', default: 0.985 },
      { id: 'detailContentPopDelayHero', label: 'Content Pop Delay (Hero)', cssVar: '--detail-content-pop-delay-hero', type: 'range', min: 0, max: 1000, step: 10, unit: 'ms', default: 120 },
      { id: 'detailContentPopDelayBody', label: 'Content Pop Delay (Body)', cssVar: '--detail-content-pop-delay-body', type: 'range', min: 0, max: 1200, step: 10, unit: 'ms', default: 160 },
      {
        id: 'detailContentPopEase',
        label: 'Content Pop Ease',
        cssVar: '--detail-content-pop-ease',
        type: 'select',
        options: [
          { label: 'Bouncy', value: 'var(--ease-bounce)' },
          { label: 'Soft', value: 'var(--ease-settle)' },
          { label: 'Snappy', value: 'var(--ease-organic)' },
          { label: 'Linear', value: 'linear' },
        ],
        default: 'var(--ease-bounce)',
      },
      { id: 'slideSpeed', label: 'Slide Speed', cssVar: '--transition-speed', type: 'range', min: 0, max: 5000, step: 50, unit: 'ms', default: 600 },
      { id: 'perspective', label: 'Perspective', cssVar: '--perspective', type: 'range', min: 0, max: 5000, step: 50, unit: 'px', default: 1000 },
    ],
  },
  navigation: {
    title: 'Scroll',
    icon: '🧭',
    defaultOpen: false,
    controls: [
      { id: 'wheelSensitivity', label: 'Wheel Sensitivity', configKey: 'runtime.wheel.sensitivity', type: 'range', min: 0, max: 20, step: 0.05, unit: '', default: 1.8 },
      { id: 'wheelEase', label: 'Wheel Ease', configKey: 'runtime.wheel.ease', type: 'range', min: 0, max: 2, step: 0.01, unit: '', default: 0.22 },
      { id: 'wheelLineHeight', label: 'Line Height Fallback', configKey: 'runtime.wheel.lineHeightFallback', type: 'range', min: 4, max: 100, step: 1, unit: 'px', default: 16 },
      { id: 'wheelPageScale', label: 'Page Scale', configKey: 'runtime.wheel.pageScale', type: 'range', min: 0, max: 5, step: 0.05, unit: '', default: 0.9 },
    ],
  },
  mouseTilt: {
    title: 'Tilt',
    icon: '🖱️',
    defaultOpen: false,
    controls: [
      {
        id: 'mouseTiltPreset',
        label: 'Preset',
        type: 'select',
        options: [
          { label: 'Subtle', value: 'subtle' },
          { label: 'Balanced', value: 'balanced' },
          { label: 'Cinematic', value: 'cinematic' },
          { label: 'Punchy', value: 'punchy' },
          { label: 'Snappy', value: 'snappy' },
          { label: 'Wild', value: 'wild' },
        ],
        // Intentionally does not persist; it's a convenience that drives the underlying controls.
        default: 'subtle',
        onChange: (config, presetKey) => {
          if (!config || typeof config !== 'object') return;
          const presets = {
            subtle:   { enabled: true, sensitivity: 0.55, ease: 0.12, left: 4,  right: 4,  up: 3,  down: 3,  pivotZ: 0 },
            balanced: { enabled: true, sensitivity: 0.80, ease: 0.14, left: 6,  right: 6,  up: 5,  down: 5,  pivotZ: 0 },
            cinematic:{ enabled: true, sensitivity: 0.70, ease: 0.08, left: 8,  right: 8,  up: 6,  down: 6,  pivotZ: 2 },
            punchy:   { enabled: true, sensitivity: 1.00, ease: 0.16, left: 10, right: 10, up: 8,  down: 8,  pivotZ: 0 },
            snappy:   { enabled: true, sensitivity: 0.85, ease: 0.22, left: 7,  right: 7,  up: 6,  down: 6,  pivotZ: 0 },
            wild:     { enabled: true, sensitivity: 1.25, ease: 0.14, left: 14, right: 14, up: 12, down: 12, pivotZ: 4 },
          };
          const preset = presets[String(presetKey)] || presets.subtle;
          // Stash for the binder to apply (so it can sync the UI inputs + value labels).
          config.__ui = config.__ui && typeof config.__ui === 'object' ? config.__ui : {};
          config.__ui.pendingMouseTiltPreset = preset;
        },
      },
      {
        id: 'mouseTiltEnabled',
        label: 'Enabled',
        configKey: 'runtime.mouseTilt.enabled',
        type: 'select',
        options: [
          { label: 'On', value: 'true' },
          { label: 'Off', value: 'false' },
        ],
        default: 'true',
      },
      { id: 'mouseTiltInvertX', label: 'Invert Horizontal', configKey: 'runtime.mouseTilt.invertX', type: 'checkbox', default: false },
      { id: 'mouseTiltInvertY', label: 'Invert Vertical', configKey: 'runtime.mouseTilt.invertY', type: 'checkbox', default: false },
      { id: 'mouseTiltSensitivity', label: 'Sensitivity', configKey: 'runtime.mouseTilt.sensitivity', type: 'range', min: 0, max: 3, step: 0.01, unit: '', default: 0.8 },
      { id: 'mouseTiltEase', label: 'Ease', configKey: 'runtime.mouseTilt.ease', type: 'range', min: 0, max: 0.5, step: 0.01, unit: '', default: 0.15 },
      { id: 'mouseTiltLeft', label: 'Tilt Left', cssVar: '--mouse-tilt-left', type: 'range', min: 0, max: 20, step: 0.5, unit: 'deg', default: 6, refresh: true },
      { id: 'mouseTiltRight', label: 'Tilt Right', cssVar: '--mouse-tilt-right', type: 'range', min: 0, max: 20, step: 0.5, unit: 'deg', default: 6, refresh: true },
      { id: 'mouseTiltUp', label: 'Tilt Up', cssVar: '--mouse-tilt-up', type: 'range', min: 0, max: 20, step: 0.5, unit: 'deg', default: 5, refresh: true },
      { id: 'mouseTiltDown', label: 'Tilt Down', cssVar: '--mouse-tilt-down', type: 'range', min: 0, max: 20, step: 0.5, unit: 'deg', default: 5, refresh: true },
      { id: 'mouseTiltPivotZ', label: 'NEW — Tilt Pivot Z', cssVar: '--mouse-tilt-pivot-z', type: 'range', min: -30, max: 30, step: 0.5, unit: 'vmin', default: 0 },
    ],
  },
  sound: {
    title: 'Sound',
    icon: '🔊',
    defaultOpen: false,
    controls: [
      {
        id: 'centerClickEnabled',
        label: 'Center Click (Per Project)',
        configKey: 'runtime.sound.centerClickEnabled',
        type: 'select',
        options: [
          { label: 'On', value: 'true' },
          { label: 'Off', value: 'false' },
        ],
        default: 'true',
      },
      { id: 'centerClickGain', label: 'Center Click Volume', configKey: 'runtime.sound.centerClickGain', type: 'range', min: 0, max: 100, step: 1, unit: '%', default: 8 },
      { id: 'centerClickFilterHz', label: 'Center Click Brightness', configKey: 'runtime.sound.centerClickFilterHz', type: 'range', min: 500, max: 5000, step: 50, unit: 'Hz', default: 1600 },
      { id: 'centerClickMinSpeed', label: 'Center Click Min Speed', configKey: 'runtime.sound.centerClickMinSpeed', type: 'range', min: 0, max: 5000, step: 10, unit: 'px/s', default: 120 },
      { id: 'centerClickDebounceMs', label: 'Center Click Debounce', configKey: 'runtime.sound.centerClickDebounceMs', type: 'range', min: 0, max: 500, step: 10, unit: 'ms', default: 70 },

      {
        id: 'continuousWheelEnabled',
        label: 'Continuous Wheel Ticks (Legacy)',
        configKey: 'runtime.sound.continuousWheelEnabled',
        type: 'select',
        options: [
          { label: 'On', value: 'true' },
          { label: 'Off', value: 'false' },
        ],
        default: 'false',
      },
      { id: 'continuousTickGainMul', label: 'Tick Volume Mul', configKey: 'runtime.sound.continuousTickGainMul', type: 'range', min: 0, max: 200, step: 1, unit: '%', default: 100 },
      { id: 'continuousSwishGainMul', label: 'Swish Volume Mul', configKey: 'runtime.sound.continuousSwishGainMul', type: 'range', min: 0, max: 200, step: 1, unit: '%', default: 100 },

      {
        id: 'snapEnabled',
        label: 'Snap Click (Settle)',
        configKey: 'runtime.sound.snapEnabled',
        type: 'select',
        options: [
          { label: 'On', value: 'true' },
          { label: 'Off', value: 'false' },
        ],
        default: 'false',
      },
      { id: 'snapGain', label: 'Snap Volume', configKey: 'runtime.sound.snapGain', type: 'range', min: 0, max: 100, step: 1, unit: '%', default: 12 },
      { id: 'openGain', label: 'Open Volume', configKey: 'runtime.sound.openGain', type: 'range', min: 0, max: 100, step: 1, unit: '%', default: 12 },
      { id: 'openFilterHz', label: 'Open Brightness', configKey: 'runtime.sound.openFilterHz', type: 'range', min: 500, max: 5000, step: 50, unit: 'Hz', default: 1800 },
      { id: 'closeGain', label: 'Close Volume', configKey: 'runtime.sound.closeGain', type: 'range', min: 0, max: 100, step: 1, unit: '%', default: 10 },
      { id: 'closeFilterHz', label: 'Close Brightness', configKey: 'runtime.sound.closeFilterHz', type: 'range', min: 500, max: 5000, step: 50, unit: 'Hz', default: 1600 },
      { id: 'snapDebounceMs', label: 'Rotation Debounce', configKey: 'runtime.sound.snapDebounceMs', type: 'range', min: 50, max: 2000, step: 50, unit: 'ms', default: 300 },
    ],
  },
};

function getControlInputId(control) {
  return `${control.id}Slider`;
}

function getControlValueId(control) {
  return `${control.id}Val`;
}

function getControlPickerId(control) {
  return `${control.id}Picker`;
}

function getAllControls() {
  const all = [];
  for (const section of Object.values(CONTROL_SECTIONS)) {
    for (const control of section.controls) {
      all.push({ ...control, section: section.title });
    }
  }
  return all;
}

function getConfigValue(config, path) {
  if (!config || !path) return undefined;
  const parts = path.split('.');
  let cursor = config;
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = cursor[part];
  }
  return cursor;
}

function setConfigValue(config, path, value) {
  if (!config || !path) return;
  const parts = path.split('.');
  let cursor = config;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function parseNumeric(value, fallback) {
  const num = Number.parseFloat(value);
  if (Number.isFinite(num)) return num;
  const fb = Number.parseFloat(fallback);
  return Number.isFinite(fb) ? fb : 0;
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'on' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'off' || lower === 'no') return false;
  }
  return Boolean(fallback);
}

function resolveControlValue(control, config, computedRoot) {
  if (control.cssVar) {
    const fromConfig = config?.cssVars?.[control.cssVar];
    if (fromConfig !== undefined) return fromConfig;
    if (computedRoot) {
      const raw = computedRoot.getPropertyValue(control.cssVar).trim();
      if (raw) return raw;
    }
  }

  if (control.configKey) {
    const fromConfig = getConfigValue(config, control.configKey);
    if (fromConfig !== undefined) return fromConfig;
  }

  return control.default;
}

function getSelectLabel(control, value) {
  if (!control.options) return String(value ?? '');
  const needle = String(value ?? '');
  const match = control.options.find((option) => String(option.value) === needle);
  return match ? match.label : String(value ?? '');
}

function formatControlDisplay(control, rawValue) {
  if (control.type === 'select') return getSelectLabel(control, rawValue);
  if (control.type === 'checkbox') return parseBoolean(rawValue, control.default) ? 'On' : 'Off';
  if (control.type === 'color') return String(rawValue ?? control.default ?? '');

  const numeric = parseNumeric(rawValue, control.default);
  const display = Number.isFinite(numeric) ? numeric : rawValue;
  return control.unit ? `${display}${control.unit}` : String(display);
}

function formatCssValue(control, numericValue) {
  return control.unit ? `${numericValue}${control.unit}` : String(numericValue);
}

function generateControlHTML(control, config, computedRoot) {
  const inputId = getControlInputId(control);
  const valId = getControlValueId(control);
  const pickerId = getControlPickerId(control);
  const rawValue = resolveControlValue(control, config, computedRoot);
  const displayValue = formatControlDisplay(control, rawValue);

  if (control.type === 'select') {
    const options = (control.options || [])
      .map((option) => {
        const selected = String(option.value) === String(rawValue ?? '') ? 'selected' : '';
        return `<option value="${option.value}" ${selected}>${option.label}</option>`;
      })
      .join('');

    return `
      <label class="control-row" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label">${control.label}</span>
          <span class="control-value" id="${valId}">${displayValue}</span>
        </div>
        <select id="${inputId}" class="control-select" aria-label="${control.label}">
          ${options}
        </select>
      </label>`;
  }

  if (control.type === 'checkbox') {
    const checked = parseBoolean(rawValue, control.default) ? 'checked' : '';
    return `
      <label class="control-row" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label">${control.label}</span>
          <span class="control-value" id="${valId}">${displayValue}</span>
        </div>
        <input type="checkbox" id="${inputId}" ${checked} aria-label="${control.label}">
      </label>`;
  }

  if (control.type === 'color') {
    const value = rawValue || control.default || '#000000';
    return `
      <label class="control-row" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label">${control.label}</span>
          <span class="control-value" id="${valId}">${displayValue}</span>
        </div>
        <input type="color" id="${pickerId}" value="${value}" aria-label="${control.label}" />
      </label>`;
  }

  const numericValue = parseNumeric(rawValue, control.default);
  return `
    <label class="control-row" data-control-id="${control.id}">
      <div class="control-row-header">
        <span class="control-label">${control.label}</span>
        <span class="control-value" id="${valId}">${displayValue}</span>
      </div>
      <input type="range" id="${inputId}" min="${control.min}" max="${control.max}" step="${control.step}" value="${numericValue}" aria-label="${control.label}">
    </label>`;
}

function generateSectionHTML(section, config, computedRoot) {
  const controlsHtml = section.controls
    .map((control) => generateControlHTML(control, config, computedRoot))
    .join('');

  const openAttr = section.defaultOpen ? 'open' : '';
  return `
    <details class="panel-section-accordion" ${openAttr}>
      <summary class="panel-section-header">
        ${section.icon ? `<span class="section-icon">${section.icon}</span>` : ''}
        <span class="section-label">${section.title}</span>
      </summary>
      <div class="panel-section-content">${controlsHtml}</div>
    </details>`;
}

function generatePanelSectionsHTML(config, computedRoot = null) {
  const rootStyle = computedRoot || ((typeof window !== 'undefined' && document?.documentElement)
    ? getComputedStyle(document.documentElement)
    : null);

  let html = '';
  for (const section of Object.values(CONTROL_SECTIONS)) {
    html += generateSectionHTML(section, config, rootStyle);
  }
  return html;
}

function bindRegisteredControls(config, options = {}) {
  if (!config || typeof config !== 'object') return;
  if (!config.cssVars || typeof config.cssVars !== 'object') config.cssVars = {};
  if (!config.runtime || typeof config.runtime !== 'object') config.runtime = {};
  if (!config.runtime.wheel || typeof config.runtime.wheel !== 'object') config.runtime.wheel = {};
  if (!config.runtime.mouseTilt || typeof config.runtime.mouseTilt !== 'object') config.runtime.mouseTilt = {};
  // Scroll FX removed (per request).

  const root = document.documentElement;
  const computedRoot = getComputedStyle(root);
  const { onMetricsChange, onRuntimeChange } = options;

  const getControlById = (id) => getAllControls().find((c) => c.id === id);

  const setControlUiAndState = (control, rawValue) => {
    if (!control) return;
    const inputId = getControlInputId(control);
    const valId = getControlValueId(control);
    const pickerId = getControlPickerId(control);
    const input = document.getElementById(control.type === 'color' ? pickerId : inputId);
    const valEl = document.getElementById(valId);
    if (!input) return;

    if (control.type === 'select') {
      input.value = String(rawValue);
      if (control.cssVar) {
        root.style.setProperty(control.cssVar, String(rawValue));
        config.cssVars[control.cssVar] = String(rawValue);
      }
      if (control.configKey) setConfigValue(config, control.configKey, rawValue);
      if (valEl) valEl.textContent = formatControlDisplay(control, rawValue);
      return;
    }

    if (control.type === 'checkbox') {
      const checked = parseBoolean(rawValue, control.default);
      input.checked = checked;
      if (control.configKey) setConfigValue(config, control.configKey, checked);
      if (valEl) valEl.textContent = formatControlDisplay(control, checked);
      return;
    }

    if (control.type === 'color') {
      input.value = String(rawValue);
      if (control.cssVar) {
        root.style.setProperty(control.cssVar, String(rawValue));
        config.cssVars[control.cssVar] = String(rawValue);
      }
      if (valEl) valEl.textContent = formatControlDisplay(control, rawValue);
      return;
    }

    const numericValue = parseNumeric(rawValue, control.default);
    const cssValue = formatCssValue(control, numericValue);
    input.value = String(numericValue);
    if (control.cssVar) {
      root.style.setProperty(control.cssVar, cssValue);
      config.cssVars[control.cssVar] = cssValue;
    }
    if (control.configKey) setConfigValue(config, control.configKey, numericValue);
    if (valEl) valEl.textContent = formatControlDisplay(control, numericValue);
  };

  const applyPendingMouseTiltPreset = () => {
    const preset = config?.__ui?.pendingMouseTiltPreset;
    if (!preset) return false;
    // Consume it immediately (one-shot).
    try { delete config.__ui.pendingMouseTiltPreset; } catch (e) {}

    // Apply to the underlying controls (this updates both state + the UI inputs).
    setControlUiAndState(getControlById('mouseTiltEnabled'), preset.enabled ? 'true' : 'false');
    setControlUiAndState(getControlById('mouseTiltSensitivity'), preset.sensitivity);
    setControlUiAndState(getControlById('mouseTiltEase'), preset.ease);
    setControlUiAndState(getControlById('mouseTiltLeft'), preset.left);
    setControlUiAndState(getControlById('mouseTiltRight'), preset.right);
    setControlUiAndState(getControlById('mouseTiltUp'), preset.up);
    setControlUiAndState(getControlById('mouseTiltDown'), preset.down);
    setControlUiAndState(getControlById('mouseTiltPivotZ'), preset.pivotZ);

    if (typeof onMetricsChange === 'function') onMetricsChange();
    if (typeof onRuntimeChange === 'function') onRuntimeChange(config.runtime);
    return true;
  };

  for (const control of getAllControls()) {
    const inputId = getControlInputId(control);
    const valId = getControlValueId(control);
    const pickerId = getControlPickerId(control);
    const input = document.getElementById(control.type === 'color' ? pickerId : inputId);
    const valEl = document.getElementById(valId);
    if (!input) continue;

    const rawValue = resolveControlValue(control, config, computedRoot);

    if (control.type === 'select') {
      input.value = rawValue;
      if (valEl) valEl.textContent = formatControlDisplay(control, rawValue);
    } else if (control.type === 'checkbox') {
      const checked = parseBoolean(rawValue, control.default);
      input.checked = checked;
      if (valEl) valEl.textContent = formatControlDisplay(control, checked);
    } else if (control.type === 'color') {
      const value = rawValue || control.default || '#000000';
      input.value = value;
      if (valEl) valEl.textContent = formatControlDisplay(control, value);
    } else {
      const numericValue = parseNumeric(rawValue, control.default);
      input.value = numericValue;
      if (valEl) valEl.textContent = formatControlDisplay(control, numericValue);
    }

    input.addEventListener('input', (event) => {
      const nextValue = control.type === 'checkbox'
        ? Boolean(event.target.checked)
        : event.target.value;

      if (control.type === 'select') {
        if (control.cssVar) {
          root.style.setProperty(control.cssVar, nextValue);
          config.cssVars[control.cssVar] = nextValue;
        }
        if (control.configKey) setConfigValue(config, control.configKey, nextValue);
        if (valEl) valEl.textContent = formatControlDisplay(control, nextValue);
      } else if (control.type === 'checkbox') {
        if (control.configKey) setConfigValue(config, control.configKey, nextValue);
        if (valEl) valEl.textContent = formatControlDisplay(control, nextValue);
      } else if (control.type === 'color') {
        if (control.cssVar) {
          root.style.setProperty(control.cssVar, nextValue);
          config.cssVars[control.cssVar] = nextValue;
        }
        if (valEl) valEl.textContent = formatControlDisplay(control, nextValue);
      } else {
        const numericValue = parseNumeric(nextValue, control.default);
        const cssValue = formatCssValue(control, numericValue);
        if (control.cssVar) {
          root.style.setProperty(control.cssVar, cssValue);
          config.cssVars[control.cssVar] = cssValue;
        }
        if (control.configKey) setConfigValue(config, control.configKey, numericValue);
        if (valEl) valEl.textContent = formatControlDisplay(control, numericValue);
      }

      if (typeof control.onChange === 'function') {
        try {
          control.onChange(config, nextValue);
        } catch (e) {}
        // If the control enqueued a preset, apply it now (drives the other controls).
        applyPendingMouseTiltPreset();
      }

      if (control.refresh && typeof onMetricsChange === 'function') onMetricsChange();
      if (control.configKey && control.configKey.startsWith('runtime.') && typeof onRuntimeChange === 'function') {
        onRuntimeChange(config.runtime);
      }

      // Sync to source config file (dev mode only)
      if (control.configKey) {
        // Use the actual value that was set in config (not raw input)
        let syncValue;
        if (control.type === 'select') {
          syncValue = nextValue;
        } else if (control.type === 'checkbox') {
          syncValue = Boolean(nextValue);
        } else {
          // For range inputs, use the numeric value that was set
          syncValue = parseNumeric(nextValue, control.default);
        }
        
        console.log('[portfolio-control-registry] Triggering sync:', { configKey: control.configKey, value: syncValue, type: control.type });
        import('./shared.js').then(function (n) { return n.aN; }).then(({ syncConfigToFile }) => {
          syncConfigToFile('portfolio', control.configKey, syncValue);
        }).catch((e) => {
          console.error('[portfolio-control-registry] Failed to import config-sync:', e);
        });
      }
    });
  }
}

function buildConfigSnapshot(config) {
  const snapshot = {
    cssVars: {},
    runtime: {
      wheel: {},
    },
  };

  const computedRoot = getComputedStyle(document.documentElement);
  for (const control of getAllControls()) {
    if (control.cssVar) {
      // Source-of-truth for export is the *live* CSS variable value.
      // This avoids init-time coercion (e.g. 100dvh -> 100vh) and reflects the actual state.
      const computed = computedRoot.getPropertyValue(control.cssVar).trim();
      let value = computed;
      if (!value) {
        const fromConfig = config?.cssVars?.[control.cssVar];
        value = (fromConfig !== undefined && fromConfig !== null && fromConfig !== '')
          ? String(fromConfig)
          : String(control.default ?? '');
      }
      // If we fell back to a numeric default, re-attach unit for CSS vars that expect it.
      if (typeof value === 'number') value = formatCssValue(control, value);
      snapshot.cssVars[control.cssVar] = String(value);
      continue;
    }

    if (control.configKey) {
      const rawValue = resolveControlValue(control, config, computedRoot);
      if (control.type === 'select') {
        setConfigValue(snapshot, control.configKey, rawValue);
      } else if (control.type === 'checkbox') {
        setConfigValue(snapshot, control.configKey, parseBoolean(rawValue, control.default));
      } else {
        const value = parseNumeric(rawValue, control.default);
        setConfigValue(snapshot, control.configKey, value);
      }
    }
  }

  return snapshot;
}

export { CONTROL_SECTIONS, bindRegisteredControls, buildConfigSnapshot, generatePanelSectionsHTML, getAllControls, getConfigValue, setConfigValue };
//# sourceMappingURL=control-registry.js.map
