import { useEffect, useLayoutEffect, useRef } from 'react';
import { playInteractionSound } from '../../legacy/modules/audio/sound-engine.js';
import {
  getWrappedAdjacentItem,
  shouldIgnoreGlobalKeyboardShortcut,
} from '../../lib/global-keyboard-shortcuts.js';
import { SHELL_ROUTE_TABS } from '../../lib/routes.js';
import { ShellUtilityControls } from './ShellUtilityControls.jsx';
import './shell-button-bar-dominant.css';

function getNormalizedActiveRouteId(activeRouteId) {
  return activeRouteId;
}

function getRouteTabById(routeId) {
  return SHELL_ROUTE_TABS.find((tab) => tab.routeId === routeId);
}

function keepActiveTabVisible(primaryNav, activeTab) {
  const maxScrollLeft = primaryNav.scrollWidth - primaryNav.clientWidth;
  if (maxScrollLeft <= 0) return;

  const primaryNavRect = primaryNav.getBoundingClientRect();
  const activeTabRect = activeTab.getBoundingClientRect();
  const tabStart = activeTabRect.left - primaryNavRect.left + primaryNav.scrollLeft;
  const tabEnd = tabStart + activeTabRect.width;
  const visibleStart = primaryNav.scrollLeft;
  const visibleEnd = visibleStart + primaryNav.clientWidth;
  const edgeGap = 2;

  if (tabStart < visibleStart) {
    primaryNav.scrollLeft = Math.max(0, tabStart - edgeGap);
  } else if (tabEnd > visibleEnd) {
    primaryNav.scrollLeft = Math.min(maxScrollLeft, tabEnd - primaryNav.clientWidth + edgeGap);
  }
}

function syncActivePillGeometry(primaryNav, activeRouteId) {
  const activeTab = [...primaryNav.querySelectorAll('[data-route-tab]')]
    .find((tab) => tab.dataset.routeTab === activeRouteId);
  const activePill = primaryNav.querySelector('.button-bar__active-pill');
  if (!activeTab || !activePill) return;

  keepActiveTabVisible(primaryNav, activeTab);

  const primaryNavRect = primaryNav.getBoundingClientRect();
  const activeTabRect = activeTab.getBoundingClientRect();
  if (!primaryNavRect.width || !activeTabRect.width) return;

  const x = activeTabRect.left
    - primaryNavRect.left
    + primaryNav.scrollLeft;

  primaryNav.style.setProperty('--button-bar-active-pill-x', `${x.toFixed(3)}px`);
  primaryNav.style.setProperty('--button-bar-active-pill-width', `${activeTabRect.width.toFixed(3)}px`);
  primaryNav.dataset.activePillReady = 'true';
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
    primaryNav.addEventListener('scroll', scheduleUpdate, { passive: true });
    document.fonts?.ready?.then(scheduleUpdate);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', scheduleUpdate);
      primaryNav.removeEventListener('scroll', scheduleUpdate);
      resizeObserver?.disconnect();
      // Keep the previous geometry on the persistent nav so the next route has a transition origin.
    };
  }, [activeRouteId, enabled, primaryNavRef]);
}

function playButtonBarPressSound(source = 'button-bar') {
  playInteractionSound('press', { source });
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
    tab.icon ? 'button-bar__button--route-icon shell-tab--route-icon' : '',
  ].filter(Boolean).join(' ');
}

function ButtonBarIcon({ tab, className = 'button-bar__icon shell-tab__icon' }) {
  const iconGlyph = tab.icon === 'ti-flask' ? '\uebd2' : '';
  return (
    <i className={`ti ${iconGlyph ? '' : tab.icon} ${className}`} aria-hidden="true">
      {iconGlyph}
    </i>
  );
}

function RouteButtonContent({ tab, decoration }) {
  return (
    <>
      {decoration}
      {tab.icon ? <ButtonBarIcon tab={tab} /> : null}
      <span className="button-bar__label shell-tab__label">{tab.label}</span>
    </>
  );
}

function RouteButton({
  tab,
  isCurrent,
  isPending,
  isVisualActive,
  isVisualDestination,
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
    'data-visual-active': isVisualDestination ? 'true' : undefined,
    'aria-label': tab.ariaLabel,
    'aria-current': isCurrent ? 'page' : undefined,
    'data-sound-action': 'manual',
    'data-sound-source': `route-${tab.routeId}`,
    onPointerEnter: () => signalIntent('pointer-hover'),
    onFocus: () => signalIntent('keyboard-focus'),
    onPointerDown: (event) => {
      if (isVisualActive) return;
      if (isModifiedRouteEvent(event)) return;
      signalIntent(event.pointerType === 'touch' ? 'touch-intent' : 'pointer-intent');
      if (beginCapturedPointerPress(event)) {
        playButtonBarPressSound(`route-${tab.routeId}`);
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
      if (!isVisualActive && isKeyboardPress(event)) playButtonBarPressSound(`route-${tab.routeId}`);
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
    const wasPointerActivated = consumePointerActivated(event);
    if (isVisualActive || wasPointerActivated) {
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
      onAuxClick={(event) => {
        if (isVisualActive) event.preventDefault();
      }}
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
  useEffect(() => {
    if (preview || !visualActiveRouteId) return undefined;

    const handleGlobalRouteKeyDown = (event) => {
      const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!direction || shouldIgnoreGlobalKeyboardShortcut(event, { allowRouteTab: true })) return;

      const nextTab = getWrappedAdjacentItem(
        SHELL_ROUTE_TABS,
        visualActiveRouteId,
        direction,
        (tab) => tab.routeId,
      );
      if (!nextTab || nextTab.routeId === visualActiveRouteId) return;

      event.preventDefault();
      event.stopPropagation();
      onRouteIntent?.(nextTab.routeId, nextTab, 'keyboard-arrow');
      playButtonBarPressSound(`route-${nextTab.routeId}`);

      if (!onRouteNavigate?.(nextTab.href, nextTab, {
        source: 'button-bar',
        activation: 'keyboard',
        preemptTransition: true,
      })) {
        window.location.assign(nextTab.href);
      }
    };

    window.addEventListener('keydown', handleGlobalRouteKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalRouteKeyDown, true);
    };
  }, [onRouteIntent, onRouteNavigate, preview, visualActiveRouteId]);
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
        aria-keyshortcuts={!preview ? 'ArrowLeft ArrowRight' : undefined}
        data-button-group="primary-buttons"
        data-button-bar-nav
        data-route-tabs
        data-active-route={activeRouteTab?.routeId}
        data-pending-route={normalizedPendingRouteId || undefined}
      >
        <span className="button-bar__active-pill" aria-hidden="true" />
        <div className="button-bar__route-cluster">
          {SHELL_ROUTE_TABS.map((tab) => (
            <RouteButton
              key={tab.routeId}
              tab={tab}
              isCurrent={tab.routeId === normalizedActiveRouteId}
              isPending={Boolean(normalizedPendingRouteId && tab.routeId === normalizedPendingRouteId)}
              isVisualActive={tab.routeId === visualActiveRouteId || Boolean(
                normalizedPendingRouteId && tab.routeId === normalizedActiveRouteId
              )}
              isVisualDestination={tab.routeId === visualActiveRouteId}
              onRouteNavigate={onRouteNavigate}
              onRouteSelect={onRouteSelect}
              onRouteIntent={onRouteIntent}
              renderDecoration={renderRouteButtonDecoration}
            />
          ))}
        </div>
      </nav>
      {preview ? (
        <ShellUtilityControls
          inButtonBar
          previewTheme={previewTheme}
          onPreviewThemeChange={onPreviewThemeChange}
          renderDecoration={renderSecondaryButtonDecoration}
        />
      ) : null}
    </div>
  );
}
