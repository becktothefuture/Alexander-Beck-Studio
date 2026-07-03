const ICON_PROPS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
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
    <g>
      <path {...ICON_PROPS} d="M12 16h24v16c0 4-3 7-7 7H19c-4 0-7-3-7-7z" />
      <path {...ICON_PROPS} d="M18 16h12" />
      <circle {...DOT_PROPS} cx="18" cy="32" r="3" />
      <circle {...DOT_PROPS} cx="24" cy="28" r="3.2" />
      <circle {...DOT_PROPS} cx="31" cy="31" r="3.6" />
      <circle {...DOT_PROPS} cx="22" cy="36" r="2.3" />
      <circle {...DOT_PROPS} cx="28" cy="36" r="2.1" />
    </g>
  );
}

function FliesIcon() {
  return (
    <g>
      <circle {...ICON_PROPS} cx="34" cy="17" r="4.6" />
      <circle {...DOT_PROPS} cx="34" cy="17" r="2.2" />
      <path {...ICON_PROPS} d="M34 8v3M25 17h3M40 17h3M29 23l-2 2" />
      <circle {...DOT_PROPS} cx="20" cy="29" r="2.2" />
      <circle {...DOT_PROPS} cx="15" cy="34" r="1.9" />
      <circle {...DOT_PROPS} cx="25" cy="25" r="1.8" />
      <circle {...DOT_PROPS} cx="18" cy="20" r="1.6" />
    </g>
  );
}

function CubeIcon() {
  return (
    <g>
      <path {...ICON_PROPS} d="M14 18l10-6 10 6v12l-10 6-10-6z" />
      <path {...ICON_PROPS} d="M14 18l10 6 10-6M24 24v12" />
      <circle {...DOT_PROPS} cx="14" cy="18" r="2" />
      <circle {...DOT_PROPS} cx="24" cy="12" r="2" />
      <circle {...DOT_PROPS} cx="34" cy="18" r="2" />
      <circle {...DOT_PROPS} cx="14" cy="30" r="2" />
      <circle {...DOT_PROPS} cx="24" cy="36" r="2" />
      <circle {...DOT_PROPS} cx="34" cy="30" r="2" />
    </g>
  );
}

function WaterIcon() {
  return (
    <g>
      <path {...ICON_PROPS} d="M9 19c4 0 4-3 8-3s4 3 8 3 4-3 8-3 4 3 8 3" />
      <path {...ICON_PROPS} d="M9 28c5 0 5-3 10-3s5 3 10 3 5-3 10-3" />
      <circle {...DOT_PROPS} cx="15" cy="35" r="2" />
      <circle {...DOT_PROPS} cx="24" cy="36" r="2.4" />
      <circle {...DOT_PROPS} cx="33" cy="34" r="2" />
    </g>
  );
}

function WallRepelIcon() {
  return (
    <g>
      <path {...ICON_PROPS} d="M11 11v26" />
      <circle {...DOT_PROPS} cx="34" cy="24" r="5.2" />
      <circle {...DOT_PROPS} cx="18" cy="17" r="2" />
      <circle {...DOT_PROPS} cx="18" cy="31" r="2" />
      <path {...ICON_PROPS} d="M26 17c-5 1-8 4-8 7s3 6 8 7" />
      <path {...ICON_PROPS} d="M16 24h4" />
    </g>
  );
}

function SphereIcon() {
  return (
    <g>
      <circle {...ICON_PROPS} cx="24" cy="24" r="13" />
      <ellipse {...ICON_PROPS} cx="24" cy="24" rx="5.6" ry="13" />
      <path {...ICON_PROPS} d="M12 24h24" />
      <path {...ICON_PROPS} d="M16 17c5 2 11 2 16 0M16 31c5-2 11-2 16 0" />
    </g>
  );
}

function PointCloudIcon() {
  return (
    <g>
      <path {...ICON_PROPS} d="M21 13c6 1 10 5 10 10 0 2-2 3-4 3 2 3 1 6-2 8M21 35c-4 0-8 1-11 3" />
      <circle {...DOT_PROPS} cx="22" cy="12" r="2.2" />
      <circle {...DOT_PROPS} cx="28" cy="15" r="1.9" />
      <circle {...DOT_PROPS} cx="32" cy="21" r="2.1" />
      <circle {...DOT_PROPS} cx="29" cy="26" r="1.8" />
      <circle {...DOT_PROPS} cx="25" cy="31" r="2.1" />
      <circle {...DOT_PROPS} cx="21" cy="36" r="2.3" />
      <circle {...DOT_PROPS} cx="14" cy="37" r="1.9" />
      <circle {...DOT_PROPS} cx="17" cy="28" r="2" />
      <circle {...DOT_PROPS} cx="17" cy="20" r="1.9" />
      <circle {...DOT_PROPS} cx="23" cy="21" r="1.8" />
      <circle {...DOT_PROPS} cx="29" cy="36" r="1.7" />
    </g>
  );
}

function PressureMosaicIcon() {
  return (
    <g>
      <circle {...DOT_PROPS} cx="17" cy="17" r="3.3" />
      <circle {...DOT_PROPS} cx="26" cy="16" r="3.4" />
      <circle {...DOT_PROPS} cx="35" cy="22" r="3" />
      <circle {...DOT_PROPS} cx="13" cy="27" r="2.8" />
      <circle {...DOT_PROPS} cx="22" cy="32" r="3.6" />
      <circle {...DOT_PROPS} cx="33" cy="33" r="3.2" />
      <circle {...DOT_PROPS} cx="39" cy="28" r="2.1" />
    </g>
  );
}

function FlockIcon() {
  return (
    <g>
      <circle {...DOT_PROPS} cx="36" cy="24" r="2.3" />
      <circle {...DOT_PROPS} cx="29" cy="19" r="2.1" />
      <circle {...DOT_PROPS} cx="29" cy="29" r="2.1" />
      <circle {...DOT_PROPS} cx="21" cy="16" r="1.9" />
      <circle {...DOT_PROPS} cx="21" cy="32" r="1.9" />
      <circle {...DOT_PROPS} cx="14" cy="21" r="1.8" />
      <circle {...DOT_PROPS} cx="14" cy="27" r="1.8" />
    </g>
  );
}

function FlubberBlobIcon() {
  return (
    <g>
      <path {...ICON_PROPS} d="M12 27c0-7 4-11 10-11 3-4 8-3 10 1 4 1 6 4 5 9-1 7-7 10-14 10-6 0-11-3-11-9z" />
    </g>
  );
}

function WeaveFieldIcon() {
  return (
    <g>
      <path {...ICON_PROPS} d="M10 18c5-4 11-1 17 1 4 1 8 1 11-1" />
      <path {...ICON_PROPS} d="M10 30c5-4 11-1 17 1 4 1 8 1 11-1" />
      <path {...ICON_PROPS} d="M17 10c-4 6 0 12 1 18 1 4 0 7-1 10" />
      <path {...ICON_PROPS} d="M31 10c-4 6 0 12 1 18 1 4 0 7-1 10" />
      <circle {...DOT_PROPS} cx="17" cy="18" r="1.7" />
      <circle {...DOT_PROPS} cx="31" cy="30" r="1.7" />
    </g>
  );
}

function MineralGrowthIcon() {
  return (
    <g>
      <path {...ICON_PROPS} d="M14 34l6-16 8-5 8 14-6 9H18z" />
      <path {...ICON_PROPS} d="M20 18l4 18M28 13l-4 23M36 27l-12 9" />
      <circle {...DOT_PROPS} cx="20" cy="19" r="2" />
      <circle {...DOT_PROPS} cx="28" cy="14" r="2.2" />
      <circle {...DOT_PROPS} cx="36" cy="27" r="2" />
      <circle {...DOT_PROPS} cx="18" cy="36" r="2.2" />
    </g>
  );
}

function ElasticCenterIcon() {
  return (
    <g>
      <path {...ICON_PROPS} d="M13 13h22v22H13z" />
      <path {...ICON_PROPS} d="M24 24V13M24 24h11M24 24v11M24 24H13" />
      <path {...ICON_PROPS} d="M24 24l8-8M24 24l-8 8" />
      <circle {...DOT_PROPS} cx="24" cy="24" r="4.8" />
      <circle {...DOT_PROPS} cx="24" cy="13" r="1.8" />
      <circle {...DOT_PROPS} cx="35" cy="24" r="1.8" />
      <circle {...DOT_PROPS} cx="24" cy="35" r="1.8" />
      <circle {...DOT_PROPS} cx="13" cy="24" r="1.8" />
    </g>
  );
}

function KaleidoscopeIcon() {
  return (
    <g>
      <path {...ICON_PROPS} d="M24 10l7 14-7 14-7-14z" />
      <path {...ICON_PROPS} d="M10 24l14-7 14 7-14 7z" />
      <circle {...DOT_PROPS} cx="24" cy="24" r="3" />
      <circle {...DOT_PROPS} cx="24" cy="10" r="1.9" />
      <circle {...DOT_PROPS} cx="38" cy="24" r="1.9" />
      <circle {...DOT_PROPS} cx="24" cy="38" r="1.9" />
      <circle {...DOT_PROPS} cx="10" cy="24" r="1.9" />
    </g>
  );
}

function BeachBallRoomIcon() {
  return (
    <g>
      <rect {...ICON_PROPS} x="11" y="13" width="26" height="22" rx="2" />
      <circle {...ICON_PROPS} cx="24" cy="24" r="8.5" />
      <path {...ICON_PROPS} d="M23 15.5c4 3 5 11 2 17M16 25c5 3 11 3 16 0M18.5 19c4 2 7 2 11 0" />
    </g>
  );
}

function GenericSimulationIcon() {
  return (
    <g>
      <circle {...ICON_PROPS} cx="24" cy="24" r="12" />
      <circle {...DOT_PROPS} cx="24" cy="14" r="2" />
      <circle {...DOT_PROPS} cx="32" cy="24" r="2.4" />
      <circle {...DOT_PROPS} cx="24" cy="34" r="2" />
      <circle {...DOT_PROPS} cx="16" cy="24" r="2.4" />
      <path {...ICON_PROPS} d="M18 18c4 4 8 4 12 0" />
      <path {...ICON_PROPS} d="M18 30c4-4 8-4 12 0" />
    </g>
  );
}
