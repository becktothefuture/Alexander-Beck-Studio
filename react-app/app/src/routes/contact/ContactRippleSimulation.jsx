import { useEffect, useRef, useState } from 'react';
import {
  DAILY_FOCUS_DESIGN_SYSTEM_URL,
  loadDailyFocusJson,
  useDailyFocusReducedMotion,
  useDailyFocusTheme,
} from '../daily-focus/dailyFocusTheme.js';
import { createContactRippleRenderer } from './contactRippleRenderer.js';
import './contact-route.css';

export function ContactRippleSimulation({ burstToken, contentRef }) {
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
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return undefined;

    const renderer = createContactRippleRenderer({
      canvas,
      stage,
      reducedMotion,
      getTheme: () => themeRef.current,
      getQuietZoneElement: () => contentRef.current,
    });
    rendererRef.current = renderer;
    renderer.start();

    return () => {
      renderer.destroy();
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
  }, [contentRef, reducedMotion]);

  useEffect(() => {
    if (burstToken > 0) rendererRef.current?.burst();
  }, [burstToken]);

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
