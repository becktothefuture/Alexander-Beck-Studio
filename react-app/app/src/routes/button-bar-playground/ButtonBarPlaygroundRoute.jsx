import { ButtonBarPlayground } from './ButtonBarPlayground.jsx';

export const BUTTON_BAR_PLAYGROUND_ROUTE_RUNTIME = {};

export function getButtonBarPlaygroundRouteView() {
  return {
    layout: 'standalone',
    htmlClassName: 'button-bar-playground-document',
    bodyClass: 'body button-bar-playground-page',
    mainContent: <ButtonBarPlayground />,
  };
}
