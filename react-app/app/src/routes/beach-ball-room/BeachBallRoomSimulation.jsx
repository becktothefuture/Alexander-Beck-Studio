import { useEffect, useMemo, useState } from 'react';
import { BEACH_BALL_ROOM_SIMULATION_REGISTRY_ENTRY } from './beachBallRoomRegistry.js';
import {
  BEACH_BALL_ROOM_DEFAULT_SETTINGS,
  clampBeachBallRoomInteger,
  clampBeachBallRoomNumber,
  sanitizeBeachBallRoomSettings,
} from './beachBallRoomSettings.js';
import { BeachBallRoomRuntime } from './BeachBallRoomRuntime.jsx';
import './beach-ball-room.css';

const BEACH_BALL_ROOM_CONTROL_GROUPS = [
  {
    title: 'Room',
    controls: [
      { key: 'showRoomLines', label: 'Room lines', type: 'checkbox' },
      { key: 'ballDiameterViewportRatio', label: 'Ball size', min: 0.15, max: 0.9, step: 0.01 },
      { key: 'roomLineOpacity', label: 'Line opacity', min: 0, max: 1, step: 0.01 },
      { key: 'roomLineThickness', label: 'Line thickness', min: 0, max: 0.25, step: 0.005 },
      { key: 'roomInset', label: 'Room inset', min: 0, max: 0.75, step: 0.01 },
      { key: 'roomDepth', label: 'Room depth', min: 1, max: 12, step: 0.1 },
      { key: 'foregroundLimit', label: 'Foreground limit', min: 0.3, max: 3, step: 0.05 },
    ],
  },
  {
    title: 'Strips',
    controls: [
      { key: 'colourStripCount', label: 'Colour strips', min: 1, max: 24, step: 1, integer: true },
      { key: 'colourStripColumns', label: 'Colour columns', min: 1, max: 24, step: 1, integer: true },
      { key: 'whiteStripColumns', label: 'White columns', min: 1, max: 24, step: 1, integer: true },
      { key: 'stripPhase', label: 'Strip phase deg', min: 0, max: 360, step: 1, integer: true },
      { key: 'topCapAngleDeg', label: 'Top cap deg', min: 0, max: 90, step: 1, integer: true },
      { key: 'bottomCapAngleDeg', label: 'Bottom cap deg', min: 0, max: 90, step: 1, integer: true },
    ],
  },
  {
    title: 'Dots',
    controls: [
      { key: 'latitudeRows', label: 'Latitude rows', min: 1, max: 80, step: 1, integer: true },
      { key: 'beadRadiusScale', label: 'Bead size', min: 0, max: 6, step: 0.05 },
      { key: 'beadSurfaceOffset', label: 'Surface offset', min: 0, max: 2, step: 0.01 },
      { key: 'mobileDensityScale', label: 'Mobile density', min: 0, max: 4, step: 0.05 },
    ],
  },
  {
    title: 'Physics',
    controls: [
      { key: 'gravity', label: 'Gravity', min: 0, max: 40, step: 0.1 },
      { key: 'restitution', label: 'Restitution', min: 0, max: 2, step: 0.01 },
      { key: 'bounceBoost', label: 'Bounce boost', min: 1, max: 5, step: 0.01 },
      { key: 'backWallBounceBoost', label: 'Back wall bounce', min: 1, max: 5, step: 0.05 },
      { key: 'bounceMinVelocity', label: 'Min rebound', min: 0, max: 10, step: 0.1 },
      { key: 'linearDamping', label: 'Linear damping', min: 0, max: 5, step: 0.01 },
      { key: 'angularDamping', label: 'Angular damping', min: 0, max: 5, step: 0.01 },
      { key: 'wallFriction', label: 'Wall friction', min: 0, max: 1, step: 0.01 },
      { key: 'collisionSpinBoost', label: 'Wall spin', min: 0, max: 8, step: 0.05 },
      { key: 'maxLinearSpeed', label: 'Speed cap', min: 1, max: 60, step: 0.5 },
      { key: 'maxAngularSpeed', label: 'Spin cap', min: 1, max: 60, step: 0.5 },
    ],
  },
  {
    title: 'Mouse',
    controls: [
      { key: 'pointerInfluenceRadius', label: 'Influence radius', min: 1, max: 5, step: 0.05 },
      { key: 'tapPushStrength', label: 'Tap push', min: 0, max: 20, step: 0.1 },
      { key: 'dragFlickStrength', label: 'Drag flick', min: 0, max: 80, step: 0.5 },
      { key: 'dragDepthPush', label: 'Depth push', min: 0, max: 5, step: 0.05 },
      { key: 'pointerSpinStrength', label: 'Spin transfer', min: 0, max: 10, step: 0.05 },
    ],
  },
];

const STORAGE_KEY = 'abs_beach_ball_room_controls_v3';
const CONTROL_GROUPS = BEACH_BALL_ROOM_CONTROL_GROUPS;
const DEFAULT_SETTINGS = BEACH_BALL_ROOM_DEFAULT_SETTINGS;
const clamp = clampBeachBallRoomNumber;
const clampInt = clampBeachBallRoomInteger;
const sanitizeSettings = sanitizeBeachBallRoomSettings;

function readInitialSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function shouldShowControls() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('controls') === '1';
}

function formatControlValue(value) {
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (!Number.isFinite(Number(value))) return String(value);
  return Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 2);
}

function BeachBallRoomControls({ settings, onChange, onReset }) {
  const [copiedConfig, setCopiedConfig] = useState('');

  const updateControl = (control, rawValue) => {
    const value = control.type === 'checkbox'
      ? Boolean(rawValue)
      : (control.integer
        ? clampInt(rawValue, control.min, control.max)
        : clamp(rawValue, control.min, control.max));
    onChange({ ...settings, [control.key]: value });
  };

  const copyConfig = async () => {
    const payload = JSON.stringify({
      simulation: BEACH_BALL_ROOM_SIMULATION_REGISTRY_ENTRY.id,
      enabledInRotation: BEACH_BALL_ROOM_SIMULATION_REGISTRY_ENTRY.enabledInRotation,
      visualSettings: settings,
    }, null, 2);
    setCopiedConfig(payload);
    try {
      await navigator.clipboard?.writeText(payload);
    } catch {
      // Textarea fallback remains visible.
    }
  };

  return (
    <aside className="beach-ball-room-controls" aria-label="Beach Ball Room design controls">
      <div className="beach-ball-room-controls__header">
        <div>
          <p className="beach-ball-room-controls__eyebrow">Lab controls</p>
          <h2>Beach Ball Room</h2>
        </div>
        <button type="button" onClick={onReset}>Reset</button>
      </div>

      {CONTROL_GROUPS.map((group) => (
        <details key={group.title} open className="beach-ball-room-controls__group">
          <summary>{group.title}</summary>
          <div className="beach-ball-room-controls__rows">
            {group.controls.map((control) => {
              const value = settings[control.key];
              if (control.type === 'checkbox') {
                return (
                  <label key={control.key} className="beach-ball-room-controls__row beach-ball-room-controls__row--toggle">
                    <span>{control.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) => updateControl(control, event.target.checked)}
                    />
                  </label>
                );
              }

              return (
                <label key={control.key} className="beach-ball-room-controls__row">
                  <span>{control.label}</span>
                  <input
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={value}
                    onChange={(event) => updateControl(control, event.target.value)}
                  />
                  <output>{formatControlValue(value)}</output>
                </label>
              );
            })}
          </div>
        </details>
      ))}

      <button type="button" className="beach-ball-room-controls__copy" onClick={copyConfig}>
        Copy config
      </button>
      {copiedConfig ? (
        <textarea
          className="beach-ball-room-controls__output"
          value={copiedConfig}
          readOnly
          aria-label="Copied beach ball room config"
        />
      ) : null}
    </aside>
  );
}


export function BeachBallRoomSimulation() {
  const showControls = useMemo(() => shouldShowControls(), []);
  const [settings, setSettings] = useState(readInitialSettings);
  const [engineError, setEngineError] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Local persistence is a staging convenience only.
    }
  }, [settings]);

  return (
    <div className="beach-ball-room-lab-shell">
      <BeachBallRoomRuntime
        settings={settings}
        className="beach-ball-room-simulation--lab"
        onLoadStateChange={(state, message = '') => {
          setEngineError(state === 'error' ? message : '');
        }}
      />
      {engineError ? (
        <p className="beach-ball-room-fallback" role="alert">
          WebGL is unavailable in this browser context.
        </p>
      ) : null}
      {showControls ? (
        <BeachBallRoomControls
          settings={settings}
          onChange={setSettings}
          onReset={() => setSettings({ ...DEFAULT_SETTINGS })}
        />
      ) : null}
    </div>
  );
}
