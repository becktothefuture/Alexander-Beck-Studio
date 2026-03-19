import { useEffect, useMemo } from 'react';
import { SiteFooter } from '../components/SiteFooter.jsx';
import { BodyClassManager } from '../components/layout/BodyClassManager.jsx';
import { SharedFrame } from '../components/layout/SharedFrame.jsx';
import { hasGateAccess, redirectToGateHome } from '../lib/access-gates.js';
import templateHtml from '../templates/portfolio-body.html?raw';

/**
 * Standalone portfolio page shell (not wired into `SiteApp` today — all entries use SiteApp).
 * Kept for parity with templates and possible future routing splits.
 * Legacy bootstrap runs only via `useLegacyRouteRuntime` + `bootstrapPortfolio` in SiteApp.
 */
export function PortfolioPage() {
  const hasAccess = useMemo(() => hasGateAccess('portfolio'), []);

  useEffect(() => {
    if (hasAccess) return;
    redirectToGateHome('portfolio');
  }, [hasAccess]);

  if (!hasAccess) return null;

  return (
    <>
      <BodyClassManager className="body portfolio-page" />
      <SharedFrame html={templateHtml} bodyClass="body portfolio-page" footer={<SiteFooter />} />
    </>
  );
}
