import { ContactRouteContent } from './ContactRouteContent.jsx';
import { ContactRippleSimulation } from './ContactRippleSimulation.jsx';

export const CONTACT_ROUTE_RUNTIME = {
  legacyRuntime: false,
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
