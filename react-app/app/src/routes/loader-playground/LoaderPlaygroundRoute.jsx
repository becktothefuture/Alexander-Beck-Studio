import { LoaderPlayground } from './LoaderPlayground.jsx';

export const LOADER_PLAYGROUND_ROUTE_RUNTIME = {};

export function getLoaderPlaygroundRouteView() {
  return {
    layout: 'standalone',
    htmlClassName: 'loader-playground-document',
    bodyClass: 'body loader-playground-page',
    mainContent: <LoaderPlayground />,
  };
}
