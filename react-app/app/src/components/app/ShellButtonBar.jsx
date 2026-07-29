import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  SOUND_STATE_EVENT,
  getSoundState,
  initSoundEngine,
  playButtonPressSound,
  playSoundEnabledMotif,
  toggleSound,
  unlockAudio,
} from '../../legacy/modules/audio/sound-engine.js';
import { getCurrentTheme, setTheme } from '../../legacy/modules/visual/dark-mode-v2.js';
import { SHELL_ROUTE_TABS } from '../../lib/routes.js';
import { useRenderedThemeIsDark } from '../../hooks/useRenderedTheme.js';
import { THEME_CHANGE_EVENT } from '../../lib/theme-state.js';
import './shell-button-bar-dominant.css';

function readSoundButtonState() {
  try {
    const soundState = getSoundState();
    return {
      isUnlocked: Boolean(soundState?.isUnlocked),
      isEnabled: Boolean(soundState?.isUnlocked && soundState?.isEnabled),
    };
  } catch {
    return {
      isUnlocked: false,
      isEnabled: false,
    };
  }
}

function getNormalizedActiveRouteId(activeRouteId) {
  return activeRouteId;
}

function getRouteTabById(routeId) {
  return SHELL_ROUTE_TABS.find((tab) => tab.routeId === routeId);
}

function syncActivePillGeometry(primaryNav, activeRouteId) {
  const activeTab = [...primaryNav.querySelectorAll('[data-route-tab]')]
    .find((tab) => tab.dataset.routeTab === activeRouteId);
  const activePill = primaryNav.querySelector('.button-bar__active-pill');
  if (!activeTab || !activePill) return;

  const primaryNavRect = primaryNav.getBoundingClientRect();
  const activeTabRect = activeTab.getBoundingClientRect();
  if (!primaryNavRect.width || !activeTabRect.width) return;

  const width = activeTabRect.width;
  const x = activeTabRect.left - primaryNavRect.left;

  primaryNav.style.setProperty('--button-bar-active-pill-x', `${x.toFixed(3)}px`);
  primaryNav.style.setProperty('--button-bar-active-pill-width', `${width.toFixed(3)}px`);
}

function useActivePillGeometry(primaryNavRef, activeRouteId, enabled) {
  useLayoutEffect(() => {
    const primaryNav = primaryNavRef.current;
    if (!enabled || !primaryNav || !activeRouteId) return undefined;

    let frameId = 0;
    let disposed = false;
    const update = () => {
      if (disposed) return;
      frameId = 0;
      syncActivePillGeometry(primaryNav, activeRouteId);
    };
    const scheduleUpdate = () => {
      if (disposed || frameId) return;
      frameId = requestAnimationFrame(update);
    };

    update();

    const activeTab = [...primaryNav.querySelectorAll('[data-route-tab]')]
      .find((tab) => tab.dataset.routeTab === activeRouteId);
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleUpdate);
    resizeObserver?.observe(primaryNav);
    if (activeTab) resizeObserver?.observe(activeTab);
    window.addEventListener('resize', scheduleUpdate);
    document.fonts?.ready?.then(scheduleUpdate);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', scheduleUpdate);
      resizeObserver?.disconnect();
      // Keep the previous geometry on the persistent nav so the next route has a transition origin.
    };
  }, [activeRouteId, enabled, primaryNavRef]);
}

function playButtonBarPressSound() {
  playButtonPressSound();
}

function isPrimaryPointerPress(event) {
  return event.pointerType === 'touch' || event.pointerType === 'pen' || event.button === 0;
}

function beginCapturedPointerPress(event) {
  if (!isPrimaryPointerPress(event)) return false;
  event.currentTarget.dataset.buttonBarPointerPress = 'true';
  event.currentTarget.setPointerCapture?.(event.pointerId);
  return true;
}

function completeCapturedPointerPress(event) {
  if (!isPrimaryPointerPress(event)) return false;
  const didBeginOnControl = event.currentTarget.dataset.buttonBarPointerPress === 'true';
  delete event.currentTarget.dataset.buttonBarPointerPress;
  event.currentTarget.releasePointerCapture?.(event.pointerId);
  return didBeginOnControl;
}

function markPointerActivated(event) {
  event.currentTarget.dataset.buttonBarPointerActivated = 'true';
}

function consumePointerActivated(event) {
  if (event.currentTarget.dataset.buttonBarPointerActivated !== 'true') return false;
  delete event.currentTarget.dataset.buttonBarPointerActivated;
  return true;
}

function isKeyboardPress(event) {
  return !event.repeat && (event.key === 'Enter' || event.key === ' ');
}

function isModifiedRouteEvent(event) {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

function getRouteButtonClassName(tab) {
  return [
    'button-bar__button',
    'shell-tab',
    tab.iconOnly ? 'button-bar__button--icon-only shell-tab--icon-only' : '',
  ].filter(Boolean).join(' ');
}

function ButtonBarIcon({ tab, className = 'button-bar__icon shell-tab__icon' }) {
  return <i className={`ti ${tab.icon} ${className}`} aria-hidden="true" />;
}

function RouteButtonContent({ tab, decoration }) {
  return (
    <>
      {decoration}
      {tab.iconOnly ? (
        <>
          <ButtonBarIcon tab={tab} />
          <span className="screen-reader">{tab.label}</span>
          <span className="button-bar__label button-bar__label--mobile-only shell-tab__label" aria-hidden="true">{tab.label}</span>
        </>
      ) : (
        <span className="button-bar__label shell-tab__label">{tab.label}</span>
      )}
    </>
  );
}

function SunIcon() {
  return (
    <svg className="button-bar__secondary-svg" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="button-bar__secondary-svg" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.35 14.64A8.7 8.7 0 0 1 9.36 3.65a8.7 8.7 0 1 0 10.99 10.99Z" />
    </svg>
  );
}

function useCurrentThemePreference() {
  const [preference, setPreference] = useState(() => getCurrentTheme());
  useEffect(() => {
    const syncPreference = (event) => {
      setPreference(event?.detail?.theme || getCurrentTheme());
    };
    window.addEventListener(THEME_CHANGE_EVENT, syncPreference);
    syncPreference();
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncPreference);
  }, []);
  return preference;
}

function BottomThemeToggle({ decoration, previewTheme, onPreviewThemeChange }) {
  const renderedThemeIsDark = useRenderedThemeIsDark();
  const isDark = previewTheme ? previewTheme === 'dark' : renderedThemeIsDark;

  const nextTheme = isDark ? 'light' : 'dark';
  const activateTheme = () => {
    if (onPreviewThemeChange) {
      onPreviewThemeChange(nextTheme);
      return;
    }
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      className="button-bar__secondary-button button-bar__theme-toggle shell-tab shell-tab--icon-only"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark ? 'true' : 'false'}
      data-state={isDark ? 'dark' : 'light'}
      onPointerDown={(event) => {
        if (beginCapturedPointerPress(event)) playButtonBarPressSound();
      }}
      onPointerUp={(event) => {
        if (!completeCapturedPointerPress(event)) return;
        markPointerActivated(event);
        activateTheme();
      }}
      onKeyDown={(event) => {
        if (isKeyboardPress(event)) playButtonBarPressSound();
      }}
      onClick={(event) => {
        if (consumePointerActivated(event)) return;
        activateTheme();
      }}
    >
      {decoration}
      <span className="button-bar__theme-thumb" aria-hidden="true">
        {isDark ? <MoonIcon /> : <SunIcon />}
      </span>
      <span className="screen-reader">{isDark ? 'Switch to light mode' : 'Switch to dark mode'}</span>
    </button>
  );
}

function BottomSoundToggle({ decoration }) {
  const [soundState, setSoundState] = useState(readSoundButtonState);
  const isEnabled = soundState.isUnlocked && soundState.isEnabled;

  useEffect(() => {
    initSoundEngine();

    const syncSoundState = (event) => {
      if (event?.detail) {
        setSoundState({
          isUnlocked: Boolean(event.detail.isUnlocked),
          isEnabled: Boolean(event.detail.isUnlocked && event.detail.isEnabled),
        });
        return;
      }

      setSoundState(readSoundButtonState());
    };

    syncSoundState();
    window.addEventListener(SOUND_STATE_EVENT, syncSoundState);
    return () => {
      window.removeEventListener(SOUND_STATE_EVENT, syncSoundState);
    };
  }, []);

  const handleClick = async () => {
    const currentState = readSoundButtonState();

    if (!currentState.isUnlocked) {
      const didUnlock = await unlockAudio();
      setSoundState(readSoundButtonState());
      if (didUnlock && readSoundButtonState().isEnabled) {
        playSoundEnabledMotif();
      }
      return;
    }

    const isNowEnabled = toggleSound();
    setSoundState(readSoundButtonState());
    if (isNowEnabled) {
      playSoundEnabledMotif();
    }
  };

  return (
    <button
      type="button"
      className="button-bar__secondary-button button-bar__sound-toggle shell-tab shell-tab--icon-only"
      aria-label={isEnabled ? 'Sound on' : 'Sound off'}
      aria-pressed={isEnabled ? 'true' : 'false'}
      data-state={isEnabled ? 'active' : 'idle'}
      data-enabled={isEnabled ? 'true' : 'false'}
      onPointerDown={(event) => {
        if (beginCapturedPointerPress(event)) playButtonBarPressSound();
      }}
      onPointerUp={(event) => {
        if (!completeCapturedPointerPress(event)) return;
        markPointerActivated(event);
        handleClick();
      }}
      onKeyDown={(event) => {
        if (isKeyboardPress(event)) playButtonBarPressSound();
      }}
      onClick={(event) => {
        if (consumePointerActivated(event)) return;
        handleClick();
      }}
    >
      {decoration}
      <i className={`ti ${isEnabled ? 'ti-volume-2' : 'ti-volume-off'} button-bar__secondary-icon shell-tab__icon`} aria-hidden="true" />
      <span className="screen-reader">{isEnabled ? 'Sound on' : 'Sound off'}</span>
    </button>
  );
}

function BottomMobileThemeReset() {
  const preference = useCurrentThemePreference();
  const isDark = useRenderedThemeIsDark();
  if (preference === 'auto') return null;

  return (
    <button
      type="button"
      className="button-bar__secondary-button button-bar__mobile-theme-reset shell-tab shell-tab--icon-only"
      aria-label={`Use device theme instead of manual ${preference} mode`}
      data-state={isDark ? 'dark' : 'light'}
      onClick={() => setTheme('auto')}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
      <span className="screen-reader">Use device theme</span>
    </button>
  );
}

function SecondaryButtons({
  preview,
  previewTheme,
  onPreviewThemeChange,
  renderDecoration,
}) {
  return (
    <div className="button-bar__secondary-buttons" role="group" aria-label="Secondary buttons" data-button-group="secondary-buttons">
      <BottomSoundToggle decoration={renderDecoration?.({ controlId: 'sound' })} />
      <BottomThemeToggle
        decoration={renderDecoration?.({ controlId: 'theme' })}
        previewTheme={previewTheme}
        onPreviewThemeChange={onPreviewThemeChange}
      />
      {!preview ? <BottomMobileThemeReset /> : null}
    </div>
  );
}

function RouteButton({
  tab,
  isCurrent,
  isPending,
  isVisualActive,
  onRouteNavigate,
  onRouteSelect,
  onRouteIntent,
  renderDecoration,
}) {
  const signalIntent = (reason) => {
    if (isVisualActive) return;
    onRouteIntent?.(tab.routeId, tab, reason);
  };
  const selectRoute = () => {
    if (isVisualActive) return;
    onRouteSelect?.(tab.routeId, tab);
  };

  const navigateRoute = (activation = 'keyboard') => {
    if (isVisualActive) return;
    if (!onRouteNavigate?.(tab.href, tab, {
      source: 'button-bar',
      activation,
      preemptTransition: true,
    })) {
      window.location.assign(tab.href);
    }
  };

  const commonProps = {
    className: getRouteButtonClassName(tab),
    'data-button-bar-item': tab.routeId,
    'data-route-tab': tab.routeId,
    'data-state': isPending ? 'pending' : (isCurrent ? 'active' : 'idle'),
    'data-route-pending': isPending ? 'true' : undefined,
    'aria-label': tab.ariaLabel,
    'aria-current': isCurrent ? 'page' : undefined,
    onPointerEnter: () => signalIntent('pointer-hover'),
    onFocus: () => signalIntent('keyboard-focus'),
    onPointerDown: (event) => {
      if (isVisualActive) return;
      if (isModifiedRouteEvent(event)) return;
      signalIntent(event.pointerType === 'touch' ? 'touch-intent' : 'pointer-intent');
      if (beginCapturedPointerPress(event)) {
        playButtonBarPressSound();
        markPointerActivated(event);
        if (!onRouteSelect) {
          event.preventDefault();
          navigateRoute('pointer');
        }
      }
    },
    onPointerUp: (event) => {
      if (isVisualActive) return;
      if (!completeCapturedPointerPress(event)) return;
      if (onRouteSelect) selectRoute();
    },
    onKeyDown: (event) => {
      if (!isVisualActive && isKeyboardPress(event)) playButtonBarPressSound();
    },
  };
  const decoration = renderDecoration?.(tab);

  if (onRouteSelect) {
    return (
      <button
        key={tab.routeId}
        type="button"
        {...commonProps}
        onClick={(event) => {
          if (consumePointerActivated(event)) return;
          selectRoute();
        }}
      >
        <RouteButtonContent tab={tab} decoration={decoration} />
      </button>
    );
  }

  const handleClick = (event) => {
    if (consumePointerActivated(event)) {
      event.preventDefault();
      return;
    }

    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.altKey
      || event.ctrlKey
      || event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    navigateRoute(event.detail === 0 ? 'keyboard' : 'pointer');
  };

  return (
    <a
      key={tab.routeId}
      href={tab.href}
      {...commonProps}
      onClick={handleClick}
    >
      <RouteButtonContent tab={tab} decoration={decoration} />
    </a>
  );
}

export function ShellButtonBar({
  activeRouteId,
  pendingRouteId = null,
  className = 'shell-bottom-band',
  materialVariant,
  navClassName = '',
  onRouteNavigate,
  onRouteSelect,
  onRouteIntent,
  preview = false,
  previewTheme,
  onPreviewThemeChange,
  renderRouteButtonDecoration,
  renderSecondaryButtonDecoration,
}) {
  const normalizedActiveRouteId = getNormalizedActiveRouteId(activeRouteId);
  const normalizedPendingRouteId = getNormalizedActiveRouteId(pendingRouteId);
  const visualActiveRouteId = normalizedPendingRouteId || normalizedActiveRouteId;
  const activeRouteTab = getRouteTabById(visualActiveRouteId);
  const primaryNavRef = useRef(null);
  useActivePillGeometry(
    primaryNavRef,
    visualActiveRouteId,
    materialVariant === 'dominant-tab',
  );
  const barClassName = ['button-bar', className].filter(Boolean).join(' ');
  const primaryNavClassName = [
    'button-bar__primary-buttons',
    'button-bar__nav',
    'shell-tab-nav',
    navClassName,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={barClassName}
      data-button-bar
      data-shell-bottom-band={!preview ? '' : undefined}
      data-button-bar-preview={preview ? '' : undefined}
      data-button-bar-material={materialVariant || undefined}
    >
      <nav
        ref={primaryNavRef}
        className={primaryNavClassName}
        aria-label={preview ? 'Playground route buttons' : 'Primary buttons'}
        data-button-group="primary-buttons"
        data-button-bar-nav
        data-route-tabs
        data-active-route={activeRouteTab?.routeId}
        data-pending-route={normalizedPendingRouteId || undefined}
      >
        <span className="button-bar__active-pill" aria-hidden="true" />
        {SHELL_ROUTE_TABS.map((tab) => (
          <RouteButton
            key={tab.routeId}
            tab={tab}
            isCurrent={tab.routeId === normalizedActiveRouteId}
            isPending={Boolean(normalizedPendingRouteId && tab.routeId === normalizedPendingRouteId)}
            isVisualActive={tab.routeId === visualActiveRouteId || Boolean(
              normalizedPendingRouteId && tab.routeId === normalizedActiveRouteId
            )}
            onRouteNavigate={onRouteNavigate}
            onRouteSelect={onRouteSelect}
            onRouteIntent={onRouteIntent}
            renderDecoration={renderRouteButtonDecoration}
          />
        ))}
      </nav>
      <div className="button-bar__divider" aria-hidden="true" />
      <SecondaryButtons
        preview={preview}
        previewTheme={previewTheme}
        onPreviewThemeChange={onPreviewThemeChange}
        renderDecoration={renderSecondaryButtonDecoration}
      />
    </div>
  );
}
