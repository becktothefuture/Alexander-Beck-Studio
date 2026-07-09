import { hasGateAccess } from '../lib/access-gates.js';
import { trySpaNavigate } from '../lib/spa-navigation.js';
import { dispatchShellGateEvent, SHELL_ROUTE_TABS } from '../lib/shell-route-tabs.js';

function tabMatchesRoute(tab, routeId) {
  if (tab.routeId === routeId) return true;
  return tab.routeId === 'home' && !['contact', 'portfolio', 'cv'].includes(routeId);
}

function getDisplayRouteId(routeId, pendingGateId) {
  if (pendingGateId === 'portfolio') return 'portfolio';
  if (pendingGateId === 'cv') return 'cv';
  return routeId || 'home';
}

function navigateToHref(href) {
  if (trySpaNavigate(href)) return;
  window.location.assign(href);
}

export function ShellRouteDock({
  routeId,
  pendingGateId = null,
  onPendingGateChange,
}) {
  const displayRouteId = getDisplayRouteId(routeId, pendingGateId);

  const handleTabClick = (event, tab) => {
    const href = tab.href();
    event.preventDefault();

    if (tab.gated && !hasGateAccess(tab.gateId)) {
      onPendingGateChange?.(tab.gateId);
      dispatchShellGateEvent('request', tab.gateId);
      return;
    }

    onPendingGateChange?.(null);
    navigateToHref(href);
  };

  return (
    <nav className="shell-route-dock" aria-label="Primary site navigation">
      <div className="shell-route-dock__track">
        {SHELL_ROUTE_TABS.map((tab) => {
          const href = tab.href();
          const isPending = pendingGateId === tab.gateId;
          const isCurrent = !isPending && tabMatchesRoute(tab, displayRouteId);
          const stateText = isPending ? 'Access gate open' : (isCurrent ? 'Current page' : '');
          const className = [
            'footer_link',
            'shell-route-tab',
            tab.iconOnly ? 'shell-route-tab--icon-only' : '',
            isCurrent ? 'is-active' : '',
            isPending ? 'is-pending' : '',
          ].filter(Boolean).join(' ');

          /*
           * Active-state matrix:
           * - resolved Home/Contact/Portfolio/About route => that route gets aria-current.
           * - pending Portfolio/About gate => requested gated tab is visually selected,
           *   but aria-current stays off until the route actually resolves.
           * - gate dismiss, route settle, and popstate clear pendingGateId upstream.
           */
          return (
            <a
              key={tab.id}
              href={href}
              className={className}
              aria-label={tab.iconOnly ? tab.label : undefined}
              aria-current={isCurrent ? 'page' : undefined}
              data-route-tab={tab.routeId}
              data-gate-id={tab.gateId || undefined}
              data-pending={isPending ? 'true' : undefined}
              onClick={(event) => handleTabClick(event, tab)}
            >
              {tab.icon ? <i className={`ti ${tab.icon}`} aria-hidden="true" /> : null}
              {tab.iconOnly ? (
                <span className="screen-reader">{tab.label}</span>
              ) : (
                <span className="shell-route-tab__label">{tab.label}</span>
              )}
              {stateText ? <span className="screen-reader">{stateText}</span> : null}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
