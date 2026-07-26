import { ContactRouteContent } from './ContactRouteContent.jsx';
import { ContactRippleSimulation } from './ContactRippleSimulation.jsx';
import {
  DAILY_FOCUS_DESIGN_SYSTEM_URL,
  prewarmDailyFocusJson,
} from '../daily-focus/dailyFocusTheme.js';

export const CONTACT_ROUTE_RUNTIME = {
  legacyRuntime: false,
  prewarm: ({ signal } = {}) => prewarmDailyFocusJson(
    DAILY_FOCUS_DESIGN_SYSTEM_URL,
    { signal },
  ),
};

export function getContactRouteView() {
  return {
    bodyClass: 'body contact-page',
    legacyRuntime: false,
    studioWindowClassName: 'contact-simulation route-page-window w-embed',
    simulationLayer: <ContactRippleSimulation />,
    uiLayer: {
      chrome: null,
      secondary: <ContactRouteContent />,
    },
  };
}
