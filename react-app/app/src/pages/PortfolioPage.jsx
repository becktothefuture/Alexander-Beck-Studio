import { useCallback, useEffect, useMemo } from 'react';
import { BodyClassManager } from '../components/layout/BodyClassManager.jsx';
import { SharedFrame } from '../components/layout/SharedFrame.jsx';
import { useLegacyBootstrap } from '../hooks/useLegacyBootstrap.js';
import templateHtml from '../templates/portfolio-body.html?raw';

export function PortfolioPage() {
  const hasAccess = useMemo(() => {
    try {
      return Boolean(window.sessionStorage.getItem('abs_portfolio_ok'));
    } catch {
      // Match source behavior only when sessionStorage is available.
      return true;
    }
  }, []);

  useEffect(() => {
    if (hasAccess) return;
    try {
      window.sessionStorage.setItem('abs_open_portfolio_gate', '1');
    } catch (error) {
      void error;
    }
    window.location.replace('index.html');
  }, [hasAccess]);

  const boot = useCallback(() => import('../legacy/modules/portfolio/app.js'), []);
  useLegacyBootstrap(hasAccess ? 'portfolio' : null, boot);

  if (!hasAccess) return null;

  return (
    <>
      <BodyClassManager className="body portfolio-page" />
      <SharedFrame html={templateHtml} bodyClass="body portfolio-page" />
    </>
  );
}
