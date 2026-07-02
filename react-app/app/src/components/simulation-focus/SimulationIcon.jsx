const ICON_PROPS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  vectorEffect: 'non-scaling-stroke',
};

const DOT_PROPS = {
  fill: 'currentColor',
  stroke: 'none',
};

const ICONS = {
  pit: PitIcon,
  flies: FliesIcon,
  '3d-cube': CubeIcon,
  water: WaterIcon,
  'wall-repel': WallRepelIcon,
  '3d-sphere': SphereIcon,
  'napoleon-point-cloud': PointCloudIcon,
  'pressure-mosaic': PressureMosaicIcon,
  'flock-of-birds': FlockIcon,
  'flubber-blob': FlubberBlobIcon,
  'weave-field': WeaveFieldIcon,
  'mineral-growth': MineralGrowthIcon,
  'elastic-center': ElasticCenterIcon,
  'kaleidoscope-3': KaleidoscopeIcon,
  'beach-ball-room': BeachBallRoomIcon,
};

export function SimulationIcon({ id, className, title }) {
  const Icon = ICONS[id] || GenericSimulationIcon;
  const accessibilityProps = title
    ? { role: 'img', 'aria-label': title }
    : { 'aria-hidden': true };

  return (
    <svg
      {...accessibilityProps}
      className={className}
      viewBox="0 0 48 48"
      width="48"
      height="48"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <Icon />
    </svg>
  );
}

function PitIcon() {
  return (
    <g {...ICON_PROPS}>
      <path d="M10 15v18c0 3.2 2.6 5.8 5.8 5.8h16.4c3.2 0 5.8-2.6 5.8-5.8V15" />
      <path d="M14 15h20" />
      <circle cx="18" cy="27" r="3.2" />
      <circle cx="29.8" cy="31.5" r="4.2" />
      <path d="M17 36c4.8 1.6 10.2 1.6 15 0" />
    </g>
  );
}

function FliesIcon() {
  return (
    <g {...ICON_PROPS}>
      <path d="M14 17l4.5 3.5L14 24" />
      <path d="M30 13l4 3-4 3" />
      <path d="M27 30l5 3.5-5 3.5" />
      <path d="M11 33c4.8-2 8.8-1.7 12 .8" />
      <path d="M21 15c3.6 1.8 6.8 1.7 9.8-.4" />
      <path d="M23 25c3.6-2.2 7.8-2.2 12.8 0" />
    </g>
  );
}

function CubeIcon() {
  return (
    <g {...ICON_PROPS}>
      <path d="M14 17.5 24 12l10 5.5v13L24 36l-10-5.5z" />
      <path d="M14 17.5 24 23l10-5.5" />
      <path d="M24 23v13" />
      <path d="M17.5 13.8c4-2.6 9-2.6 13 0" />
      <path d="M16 35c4.8 3 11.2 3 16 0" />
    </g>
  );
}

function WaterIcon() {
  return (
    <g {...ICON_PROPS}>
      <path d="M8 21c4 0 4-3 8-3s4 3 8 3 4-3 8-3 4 3 8 3" />
      <path d="M8 29c4 0 4-3 8-3s4 3 8 3 4-3 8-3 4 3 8 3" />
      <path d="M12 36c4.2 1.8 8.2 1.8 12 0s7.8-1.8 12 0" />
    </g>
  );
}

function WallRepelIcon() {
  return (
    <g {...ICON_PROPS}>
      <path d="M10 12v24" />
      <path d="M16 15h5" />
      <path d="M16 24h10" />
      <path d="M16 33h5" />
      <circle cx="32" cy="24" r="5.5" />
      <path d="m26 18 4-4" />
      <path d="m26 30 4 4" />
      <path d="M24.5 24H19" />
    </g>
  );
}

function SphereIcon() {
  return (
    <g {...ICON_PROPS}>
      <circle cx="24" cy="24" r="13" />
      <ellipse cx="24" cy="24" rx="5.8" ry="13" />
      <path d="M12 24h24" />
      <path d="M15.5 15.5c5.2 3 11.8 3 17 0" />
      <path d="M15.5 32.5c5.2-3 11.8-3 17 0" />
    </g>
  );
}

function PointCloudIcon() {
  return (
    <g>
      <circle {...DOT_PROPS} cx="15" cy="19" r="1.7" />
      <circle {...DOT_PROPS} cx="23" cy="14" r="1.7" />
      <circle {...DOT_PROPS} cx="32" cy="18" r="1.7" />
      <circle {...DOT_PROPS} cx="19" cy="27" r="1.7" />
      <circle {...DOT_PROPS} cx="30" cy="29" r="1.7" />
      <circle {...DOT_PROPS} cx="24" cy="35" r="1.7" />
      <path {...ICON_PROPS} d="M16.5 20.5 23 14l9 4-2 11-6 6-5-8z" opacity="0.72" />
      <path {...ICON_PROPS} d="M19 27l11 2" opacity="0.72" />
    </g>
  );
}

function PressureMosaicIcon() {
  return (
    <g {...ICON_PROPS}>
      <path d="M11 13h11v10H11z" />
      <path d="M26 13h11v10H26z" />
      <path d="M11 27h11v8H11z" />
      <path d="M26 27h11v8H26z" />
      <path d="M16.5 18h0.1" />
      <path d="M31.5 18h0.1" />
      <path d="M16.5 31h0.1" />
      <path d="M31.5 31h0.1" />
      <path d="M7 24h34" />
    </g>
  );
}

function FlockIcon() {
  return (
    <g {...ICON_PROPS}>
      <path d="M9 31c3.2-4.8 7-4.8 10.2 0" />
      <path d="M19 22c3.2-4.8 7-4.8 10.2 0" />
      <path d="M29 31c3.2-4.8 7-4.8 10.2 0" />
      <path d="M13 16c2.6-3.2 5.6-3.2 8.2 0" />
      <path d="M27 14c2.6-3.2 5.6-3.2 8.2 0" />
    </g>
  );
}

function FlubberBlobIcon() {
  return (
    <g {...ICON_PROPS}>
      <path d="M13 25c0-7 5.4-11.5 12.4-10.8 6 .6 10.1 5.2 9.6 11.2-.5 6.4-5.4 10-12 9.4-6.4-.6-10-3.8-10-9.8z" />
      <path d="M17 20c3.6 2.6 8.8 2.8 14.5.6" />
      <path d="M16.5 30c4 2.4 9.4 2.4 15 0" />
      <path d="M12 25H8" />
      <path d="M40 25h-4" />
    </g>
  );
}

function WeaveFieldIcon() {
  return (
    <g {...ICON_PROPS}>
      <path d="M10 16c7.5-5.2 20.5 5.2 28 0" />
      <path d="M10 24c7.5-5.2 20.5 5.2 28 0" />
      <path d="M10 32c7.5-5.2 20.5 5.2 28 0" />
      <path d="M16 10c-4.8 7.5 4.8 20.5 0 28" />
      <path d="M24 10c-4.8 7.5 4.8 20.5 0 28" />
      <path d="M32 10c-4.8 7.5 4.8 20.5 0 28" />
    </g>
  );
}

function MineralGrowthIcon() {
  return (
    <g {...ICON_PROPS}>
      <path d="M24 38V12" />
      <path d="M24 23 15 15" />
      <path d="M24 23 33 15" />
      <path d="M24 30 14 24" />
      <path d="M24 30 34 24" />
      <path d="M18 36h12" />
      <path d="m15 15 5-2" />
      <path d="m33 15-5-2" />
      <path d="m14 24 4-4" />
      <path d="m34 24-4-4" />
    </g>
  );
}

function ElasticCenterIcon() {
  return (
    <g {...ICON_PROPS}>
      <circle cx="24" cy="24" r="5" />
      <path d="M24 7v12" />
      <path d="M24 29v12" />
      <path d="M7 24h12" />
      <path d="M29 24h12" />
      <path d="m12 12 8.5 8.5" />
      <path d="m27.5 27.5 8.5 8.5" />
      <path d="m36 12-8.5 8.5" />
      <path d="m20.5 27.5-8.5 8.5" />
    </g>
  );
}

function KaleidoscopeIcon() {
  return (
    <g {...ICON_PROPS}>
      <path d="M24 8v32" />
      <path d="m10 16 28 16" />
      <path d="m38 16-28 16" />
      <path d="m24 8 8 16-8 16-8-16z" />
      <path d="M16 24h16" />
    </g>
  );
}

function BeachBallRoomIcon() {
  return (
    <g {...ICON_PROPS}>
      <path d="M11 13h26v22H11z" />
      <circle cx="25" cy="25" r="8" />
      <path d="M25 17c3.2 2.4 3.2 13.6 0 16" />
      <path d="M17 25h16" />
      <path d="M20 19.5c3.4 3 6.6 3 10 0" />
      <path d="M14 35c5-2.4 12.5-2.4 20 0" />
    </g>
  );
}

function GenericSimulationIcon() {
  return (
    <g {...ICON_PROPS}>
      <circle cx="24" cy="24" r="11" />
      <path d="M13 24h22" />
      <path d="M24 13v22" />
      <path d="M16.5 16.5 31.5 31.5" />
      <path d="M31.5 16.5 16.5 31.5" />
    </g>
  );
}
