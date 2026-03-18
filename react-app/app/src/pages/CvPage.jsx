import { useCallback, useEffect, useMemo } from 'react';
import { SiteFooter } from '../components/SiteFooter.jsx';
import { BodyClassManager } from '../components/layout/BodyClassManager.jsx';
import { SharedFrame } from '../components/layout/SharedFrame.jsx';
import { useLegacyBootstrap } from '../hooks/useLegacyBootstrap.js';
import { hasGateAccess, redirectToGateHome } from '../lib/access-gates.js';
import templateHtml from '../templates/cv-body.html?raw';

export function CvPage() {
  const hasAccess = useMemo(() => hasGateAccess('cv'), []);

  useEffect(() => {
    if (hasAccess) return;
    redirectToGateHome('cv');
  }, [hasAccess]);

  const boot = useCallback(() => import('../legacy/modules/cv-init.js'), []);
  useLegacyBootstrap(hasAccess ? 'cv' : null, boot);

  if (!hasAccess) return null;

  return (
    <>
      <BodyClassManager className="body cv-page" />
      <SharedFrame html={templateHtml} bodyClass="body cv-page" footer={<SiteFooter />} />
    </>
  );
}
