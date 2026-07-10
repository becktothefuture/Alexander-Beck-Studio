import { ContactRouteContent } from './ContactRouteContent.jsx';

export const CONTACT_ROUTE_RUNTIME = {
  legacyRuntime: false,
};

export function getContactRouteView() {
  return {
    bodyClass: 'body contact-page',
    legacyRuntime: false,
    studioWindowClassName: 'contact-simulation route-page-window w-embed',
    simulationLayer: <ContactRouteContent />,
    uiLayer: {
      chrome: null,
      secondary: null,
    },
  };
}
