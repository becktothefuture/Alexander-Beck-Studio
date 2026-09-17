import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { playNavigationSound } from '../../legacy/modules/audio/sound-engine.js';
import { hexToRgb } from '../../legacy/modules/visual/wall-shadow.js';
import { getWrappedAdjacentItem, shouldIgnoreGlobalKeyboardShortcut } from '../../lib/global-keyboard-shortcuts.js';
import { SHELL_ROUTE_TABS } from '../../lib/routes.js';
import { subscribeSimulationPalette } from '../../palette/simulationPaletteController.js';
import { ShellUtilityControls } from './ShellUtilityControls.jsx';
import './shell-button-bar-dominant.css';

// References into the same eight slots as the balls. Reuse an accent when a
// scheme has no equivalent hue; never introduce another scheme's colour.
const PALETTE_SLOTS = {
  bowWornSignal: [7, 5, 1, 6],
  silvertownCobaltVoltage: [6, 3, 5, 7],
  ryeAfterClosing: [3, 7, 5, 6],
  ryeAfterClosingTurmeric: [3, 7, 5, 6],
};
const modified = event => event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
const setting = (element, name) => Number.parseFloat(getComputedStyle(element).getPropertyValue(`--tactile-nav-${name}`)) || 0;

function usePressure(navRef, selected) {
  const gesture = useRef(null);
  const pendingRelease = useRef(null);
  const clearRelease = useCallback(() => {
    const pending = pendingRelease.current;
    if (!pending) return;
    clearTimeout(pending.timeout);
    pending.button.removeAttribute('data-release-pending');
    pendingRelease.current = null;
  }, []);
  // React's selected state must own the colour before the release bridge clears.
  useLayoutEffect(() => {
    if (pendingRelease.current?.button.dataset.routeTab === selected) clearRelease();
  }, [selected, clearRelease]);
  useEffect(() => {
    const nav = navRef.current;
    const release = (cancel = false, bridge = false) => {
      const press = gesture.current;
      if (!press) return;
      press.cancelled ||= cancel;
      if (cancel) clearRelease();
      if (press.button.hasAttribute('data-pressure')) {
        if (bridge && !press.cancelled) {
          clearRelease();
          press.button.setAttribute('data-release-pending', 'true');
          // Native click normally follows pointerup. Bound cleanup if a browser
          // suppresses the click after a long press or an interrupted gesture.
          pendingRelease.current = { button: press.button, timeout: setTimeout(clearRelease, 500) };
        }
        press.button.removeAttribute('data-pressure');
      }
    };
    const down = event => {
      if (!event.isPrimary) { release(true); return; }
      if (event.button !== 0 || modified(event)) return;
      const button = event.target.closest('[data-route-tab]');
      if (!button || !nav.contains(button)) return;
      release(true);
      gesture.current = { button, id: event.pointerId, cancelled: false };
      button.setAttribute('data-pressure', 'true');
    };
    const move = event => {
      const press = gesture.current;
      if (!press || press.id !== event.pointerId) return;
      const r = press.button.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) release(true);
    };
    const up = event => {
      if (gesture.current?.id !== event.pointerId) return;
      move(event);
      release(event.type === 'pointercancel' || modified(event), event.type === 'pointerup');
    };
    const keydown = event => {
      const button = event.target.closest('[data-route-tab]');
      if (modified(event) || !button || (event.key !== 'Enter' && !(event.key === ' ' && button.tagName === 'BUTTON'))) return;
      if (event.repeat) { event.preventDefault(); return; }
      release(true);
      gesture.current = { button, key: event.key, cancelled: false };
      button.setAttribute('data-pressure', 'true');
    };
    const keyup = event => { if (event.key === gesture.current?.key) release(); };
    const cancel = () => release(true);
    const focusout = () => { if (gesture.current?.key) cancel(); };
    const visibility = () => { if (document.hidden) cancel(); };
    nav.addEventListener('pointerdown', down);
    nav.addEventListener('keydown', keydown);
    nav.addEventListener('focusout', focusout);
    for (const [type, handler] of Object.entries({ pointermove: move, pointerup: up, pointercancel: up, keyup, dragstart: cancel })) document.addEventListener(type, handler, true);
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancel();
      nav.removeEventListener('pointerdown', down);
      nav.removeEventListener('keydown', keydown);
      nav.removeEventListener('focusout', focusout);
      for (const [type, handler] of Object.entries({ pointermove: move, pointerup: up, pointercancel: up, keyup, dragstart: cancel })) document.removeEventListener(type, handler, true);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [navRef, clearRelease]);
  return { gesture, clearRelease };
}

export function ShellButtonBar({
  activeRouteId, pendingRouteId = null, className = 'shell-bottom-band',
  navClassName = '', onRouteNavigate, onRouteSelect, onRouteIntent,
  preview = false, previewTheme, onPreviewThemeChange,
  renderRouteButtonDecoration, renderSecondaryButtonDecoration,
}) {
  const navRef = useRef(null);
  const selected = pendingRouteId || activeRouteId;
  const { gesture, clearRelease } = usePressure(navRef, selected);
  useEffect(() => subscribeSimulationPalette(snapshot => {
    const slots = PALETTE_SLOTS[snapshot.paletteId] || [3, 5, 6, 7];
    navRef.current?.querySelectorAll('[data-route-tab]').forEach((button, index) => {
      const slot = slots[index] % snapshot.colors.length;
      const accent = hexToRgb(snapshot.colors[slot]);
      const neutral = hexToRgb(snapshot.colors[0]);
      // Match the fixed CSS colour mix, then choose the stronger contrast.
      const luminance = ['r', 'g', 'b'].reduce((sum, key, i) => {
        const c = (accent[key] * 0.82 + neutral[key] * 0.18) / 255;
        return sum + (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i];
      }, 0);
      button.style.setProperty('--tactile-nav-accent', `var(--ball-${slot + 1}, ${snapshot.colors[slot]})`);
      button.style.setProperty('--tactile-nav-ink', luminance > 0.179 ? '#000' : '#fff');
    });
  }), []);
  useEffect(() => {
    if (preview) return undefined;
    const keydown = event => {
      const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!direction || event.repeat || shouldIgnoreGlobalKeyboardShortcut(event, { allowRouteTab: true })) return;
      const next = getWrappedAdjacentItem(SHELL_ROUTE_TABS, selected, direction, tab => tab.routeId);
      if (!next) return;
      event.preventDefault();
      event.stopPropagation();
      navRef.current?.querySelector(`[data-route-tab='${next.routeId}']`)?.click();
    };
    window.addEventListener('keydown', keydown, true);
    return () => window.removeEventListener('keydown', keydown, true);
  }, [preview, selected]);

  const activate = (event, tab) => {
    if (event.defaultPrevented || event.button !== 0 || modified(event)) return;
    const press = gesture.current;
    if (event.detail > 0 && (press?.cancelled || (event.pointerId != null && press?.id != null && event.pointerId !== press.id))) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const volume = setting(event.currentTarget, 'sound-volume');
    playNavigationSound({ release: tab.routeId !== selected, volume });
    if (tab.routeId === selected) { clearRelease(); return; }
    if (onRouteSelect) onRouteSelect(tab.routeId, tab);
    else if (!onRouteNavigate?.(tab.href, tab, { source: 'button-bar', activation: event.detail === 0 ? 'keyboard' : 'pointer', preemptTransition: true })) window.location.assign(tab.href);
  };
  return (
    <div className={`button-bar ${className}`} data-button-bar data-shell-bottom-band={!preview ? '' : undefined}
      data-button-bar-preview={preview ? '' : undefined} data-button-bar-material="tactile">
      <nav ref={navRef} className={`button-bar__primary-buttons button-bar__nav shell-tab-nav ${navClassName}`}
        aria-label={preview ? 'Preview route buttons' : 'Primary buttons'} aria-keyshortcuts={!preview ? 'ArrowLeft ArrowRight' : undefined}
        data-button-group="primary-buttons" data-button-bar-nav data-route-tabs data-active-route={selected}
        data-pending-route={pendingRouteId || undefined}>
        <div className="button-bar__route-cluster">
          {SHELL_ROUTE_TABS.map(tab => {
            const Tag = onRouteSelect ? 'button' : 'a';
            return <Tag key={tab.routeId} draggable={false} href={onRouteSelect ? undefined : tab.href} type={onRouteSelect ? 'button' : undefined}
              className="button-bar__button shell-tab" data-button-bar-item={tab.routeId} data-route-tab={tab.routeId}
              data-state={selected === tab.routeId ? 'active' : 'idle'} data-visual-active={selected === tab.routeId ? 'true' : undefined}
              aria-current={activeRouteId === tab.routeId ? 'page' : undefined} aria-label={tab.ariaLabel}
              data-sound-action="manual" data-sound-source={`route-${tab.routeId}`}
              onPointerEnter={() => onRouteIntent?.(tab.routeId, tab, 'pointer-hover')}
              onFocus={() => onRouteIntent?.(tab.routeId, tab, 'keyboard-focus')}
              onClick={event => activate(event, tab)}>
              {renderRouteButtonDecoration?.(tab)}
              <span className="tactile-nav__face">
                <span className="tactile-nav__active" aria-hidden="true" />
                <i className={`ti ${tab.icon} button-bar__icon shell-tab__icon`} aria-hidden="true" />
              </span>
              <span className="button-bar__label shell-tab__label">{tab.label}</span>
            </Tag>;
          })}
        </div>
      </nav>
      {preview ? <ShellUtilityControls inButtonBar previewTheme={previewTheme} onPreviewThemeChange={onPreviewThemeChange} renderDecoration={renderSecondaryButtonDecoration} /> : null}
    </div>
  );
}
