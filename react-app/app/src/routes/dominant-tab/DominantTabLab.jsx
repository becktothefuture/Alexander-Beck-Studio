import { useEffect, useMemo, useState } from 'react';
import { ShellButtonBar } from '../../components/app/ShellButtonBar.jsx';
import { SHELL_ROUTE_TABS } from '../../lib/routes.js';
import { getSimulationPaletteSnapshot } from '../../palette/simulationPaletteController.js';
import './dominant-tab-lab.css';
import '../../components/app/shell-button-bar-dominant.css';

const THEME_STORAGE_KEY = 'dominant-tab-lab-theme-v1';
const FALLBACK_COLORS = ['#b5b7b6', '#bbbdbd', '#ffffff', '#00695c', '#000000', '#d7ff2f', '#0d5cb6', '#ffa000'];

function getContrastInk(hex) {
  const normalized = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return '#ffffff';

  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = (channels[0] * 0.2126) + (channels[1] * 0.7152) + (channels[2] * 0.0722);
  return luminance > 0.179 ? '#101113' : '#ffffff';
}

function getInitialTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function DominantTabLab() {
  const [activeRouteId, setActiveRouteId] = useState('about');
  const [theme, setTheme] = useState(getInitialTheme);

  const paletteStyle = useMemo(() => {
    const palette = getSimulationPaletteSnapshot();
    const colors = Array.isArray(palette?.colors) ? palette.colors : FALLBACK_COLORS;
    const style = colors.reduce((nextStyle, color, index) => {
      nextStyle[`--ball-${index + 1}`] = color;
      return nextStyle;
    }, {});
    const routeColors = {
      home: colors[3],
      portfolio: colors[5],
      about: colors[6],
      contact: colors[7],
    };

    Object.entries(routeColors).forEach(([routeId, color]) => {
      style[`--button-bar-accent-${routeId}`] = color;
      style[`--button-bar-accent-${routeId}-ink`] = getContrastInk(color);
    });
    style['--button-bar-accent-sound'] = routeColors.home;
    style['--button-bar-accent-sound-ink'] = getContrastInk(routeColors.home);

    return style;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.dominantTabLabTheme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The lab remains usable when storage is unavailable.
    }
  }, [theme]);

  const activeRoute = SHELL_ROUTE_TABS.find((route) => route.routeId === activeRouteId);

  return (
    <main className="dominant-tab-lab" data-theme={theme} style={paletteStyle}>
      <header className="dominant-tab-lab__header">
        <a className="dominant-tab-lab__back" href="/lab/button-bar-playground.html">
          Full playground
        </a>
        <div className="dominant-tab-lab__heading">
          <p className="dominant-tab-lab__eyebrow">Production validation</p>
          <h1>Button Bar</h1>
          <p>The production capsule, shared route dot, and fixed utility slots.</p>
        </div>
      </header>

      <section className="dominant-tab-lab__validation" aria-labelledby="dominant-tab-specimen-title">
        <div className="dominant-tab-lab__specimen-heading">
          <h2 id="dominant-tab-specimen-title">Live specimen</h2>
          <p><span aria-hidden="true" /> Shared production material</p>
        </div>

        <div className="dominant-tab-lab__wall">
          <div className="dominant-tab-lab__groove-bank" aria-hidden="true" />
          <ShellButtonBar
            activeRouteId={activeRouteId}
            className="dominant-tab-lab__bar"
            materialVariant="dominant-tab"
            navClassName="dominant-tab-lab__tabs"
            onRouteSelect={setActiveRouteId}
            preview
            previewTheme={theme}
            onPreviewThemeChange={setTheme}
          />
          <div className="dominant-tab-lab__groove-bank" aria-hidden="true" />
        </div>

        <div className="dominant-tab-lab__readout" aria-live="polite">
          <span>Active route</span>
          <strong>{activeRoute?.label || 'Home'}</strong>
          <span>Interaction</span>
          <strong>Shared dot travel</strong>
          <span>Theme</span>
          <strong>{theme}</strong>
        </div>
      </section>
    </main>
  );
}
