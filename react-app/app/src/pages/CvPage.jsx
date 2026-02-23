import { useCallback } from 'react';
import { BodyClassManager } from '../components/layout/BodyClassManager.jsx';
import { SharedFrame } from '../components/layout/SharedFrame.jsx';
import { useLegacyBootstrap } from '../hooks/useLegacyBootstrap.js';
import templateHtml from '../templates/cv-body.html?raw';

export function CvPage() {
  const boot = useCallback(() => import('../legacy/modules/cv-init.js'), []);
  useLegacyBootstrap('cv', boot);

  return (
    <>
      <BodyClassManager className="body cv-page" />
      <SharedFrame html={templateHtml} bodyClass="body cv-page" />
    </>
  );
}
