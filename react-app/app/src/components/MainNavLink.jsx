/**
 * MainNavLink — shared implementation for route-local `.ui-main-nav` text buttons.
 * Keeps `footer_link` + `footer-link-nowrap` structure for shared chrome styling.
 */

export function MainNavLink({ id, children, className = '', ...rest }) {
  const { className: restClass, type: _t, ...buttonRest } = rest;
  const mergedClass = ['footer_link', className, restClass].filter(Boolean).join(' ');
  return (
    <button {...buttonRest} id={id} type="button" className={mergedClass}>
      <span className="footer-link-nowrap">{children}</span>
    </button>
  );
}
