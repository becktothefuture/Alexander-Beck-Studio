/**
 * MainNavLink — single implementation for home `#main-links` and portfolio/CV `.ui-main-nav` strips.
 * Preserves `footer_link` + stable ids for legacy modal/prefetch code.
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
