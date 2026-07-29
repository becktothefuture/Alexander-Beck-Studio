import { useEffect, useRef, useState } from 'react';
import {
  DAILY_FOCUS_DESIGN_SYSTEM_URL,
  loadDailyFocusJson,
  useDailyFocusReducedMotion,
  useDailyFocusTheme,
} from '../daily-focus/dailyFocusTheme.js';
import {
  CONTACT_RIPPLE_CONFIG_EVENT,
  getContactRippleConfig,
  setContactRippleConfig,
} from './contactRippleConfig.js';
import { CONTACT_RIPPLE_BURST_EVENT } from './contactRippleEvents.js';
import { createContactRippleRenderer } from './contactRippleRenderer.js';
import { registerSimulationAtmosphereSource } from '../../legacy/modules/rendering/atmosphere/simulation-atmosphere.js';
import './contact-route.css';

export function ContactRippleSimulation() {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const [designSystem, setDesignSystem] = useState(null);
  const theme = useDailyFocusTheme(designSystem);
  const themeRef = useRef(theme);
  const reducedMotion = useDailyFocusReducedMotion();

  useEffect(() => {
    themeRef.current = theme;
    rendererRef.current?.start();
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    loadDailyFocusJson(DAILY_FOCUS_DESIGN_SYSTEM_URL, null).then((nextDesignSystem) => {
      if (!cancelled) setDesignSystem(nextDesignSystem);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!designSystem?.contact) return;
    setContactRippleConfig(designSystem.contact);
  }, [designSystem]);

  useEffect(() => {
    if (!import.meta.env.DEV || !designSystem) return undefined;
    let cancelled = false;

    Promise.all([
      import('../../legacy/modules/ui/panel-popup-manager.js'),
      import('./contactRipplePanel.js'),
    ]).then(([panelManager, contactPanel]) => {
      if (cancelled) return;
      panelManager.registerDevPanelRoute({
        page: 'contact',
        pageLabel: 'Contact Us',
        productLabel: 'Alexander Beck Studio',
        panelTitle: 'Contact Controls',
        pageSectionTitle: 'Contact Us View',
        pageSectionIcon: '✉',
        pageHTML: contactPanel.generateContactRipplePanelHTML(),
        setupPageControls: contactPanel.bindContactRipplePanel,
        masterGroupIds: ['audio'],
        footerHint: '<kbd>/</kbd> panel · live apply · save to design JSON',
        syncInitialControlSideEffects: false,
      });
    }).catch((error) => {
      console.warn('Contact panel init failed', error);
    });

    return () => {
      cancelled = true;
    };
  }, [designSystem]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return undefined;
    const sourceContextAvailable = Boolean(canvas.getContext('2d', { alpha: true }));

    const renderer = createContactRippleRenderer({
      canvas,
      stage,
      reducedMotion,
      getTheme: () => themeRef.current,
      getQuietZoneElement: () => document.getElementById('contact-route-content'),
      getConfig: getContactRippleConfig,
    });
    rendererRef.current = renderer;
    renderer.start();
    const unregisterAtmosphereSource = registerSimulationAtmosphereSource({
      id: sourceContextAvailable ? 'contact:ripple' : 'contact:ambient',
      routeId: 'contact',
      kind: sourceContextAvailable ? 'canvas' : 'ambient',
      canvas: sourceContextAvailable ? canvas : null,
      scheduler: 'internal',
      opacityElement: sourceContextAvailable ? canvas : null,
    });

    const handleConfigChange = (event) => {
      renderer.updateConfig?.(event.detail?.config || getContactRippleConfig());
    };
    const handleBurstRequest = () => renderer.burst();
    window.addEventListener(CONTACT_RIPPLE_CONFIG_EVENT, handleConfigChange);
    window.addEventListener(CONTACT_RIPPLE_BURST_EVENT, handleBurstRequest);

    return () => {
      window.removeEventListener(CONTACT_RIPPLE_CONFIG_EVENT, handleConfigChange);
      window.removeEventListener(CONTACT_RIPPLE_BURST_EVENT, handleBurstRequest);
      unregisterAtmosphereSource();
      renderer.destroy();
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
  }, [reducedMotion]);

  return (
    <div
      ref={stageRef}
      className="contact-ripple-stage"
      data-contact-ripple-stage
      data-contact-ripple-state="loading"
      data-contact-ripple-burst-count="0"
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="contact-ripple-canvas"
        data-contact-ripple-canvas
        aria-hidden="true"
      />
    </div>
  );
}
