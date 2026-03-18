import { useCallback, useEffect, useMemo } from 'react';
import { SiteFooter } from '../components/SiteFooter.jsx';
import { BodyClassManager } from '../components/layout/BodyClassManager.jsx';
import { SharedFrame } from '../components/layout/SharedFrame.jsx';
import { useLegacyBootstrap } from '../hooks/useLegacyBootstrap.js';
import { hasGateAccess, redirectToGateHome } from '../lib/access-gates.js';
import templateHtml from '../templates/portfolio-body.html?raw';

export function PortfolioPage() {
  const hasAccess = useMemo(() => hasGateAccess('portfolio'), []);

  useEffect(() => {
    if (hasAccess) return;
    redirectToGateHome('portfolio');
  }, [hasAccess]);

  const boot = useCallback(() => import('../legacy/modules/portfolio/app.js'), []);
  useLegacyBootstrap(hasAccess ? 'portfolio' : null, boot);

  if (!hasAccess) return null;

  return (
    <>
      <BodyClassManager className="body portfolio-page" />
      <SharedFrame html={templateHtml} bodyClass="body portfolio-page" footer={<SiteFooter />} />
    </>
  );
}
