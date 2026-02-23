import { useCallback } from 'react';
import { BodyClassManager } from '../components/layout/BodyClassManager.jsx';
import { SharedFrame } from '../components/layout/SharedFrame.jsx';
import { useLegacyBootstrap } from '../hooks/useLegacyBootstrap.js';
import templateHtml from '../templates/index-body.html?raw';

export function HomePage() {
  const boot = useCallback(() => import('../legacy/main.js'), []);
  useLegacyBootstrap('home', boot);

  return (
    <>
      <BodyClassManager className="body" />
      <SharedFrame html={templateHtml} bodyClass="body" />
    </>
  );
}
