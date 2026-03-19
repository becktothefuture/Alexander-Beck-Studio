import { useCallback } from 'react';
import { SiteFooter } from '../components/SiteFooter.jsx';
import { BodyClassManager } from '../components/layout/BodyClassManager.jsx';
import { SharedFrame } from '../components/layout/SharedFrame.jsx';
import { useLegacyBootstrap } from '../hooks/useLegacyBootstrap.js';
import { HomeRoute } from '../routes/home/HomeRoute.jsx';

export function HomePage() {
  const boot = useCallback(() => import('../legacy/main.js'), []);
  useLegacyBootstrap('home', boot);

  return (
    <>
      <BodyClassManager className="body" />
      <SharedFrame bodyClass="body" footer={<SiteFooter />}>
        <HomeRoute />
      </SharedFrame>
    </>
  );
}
