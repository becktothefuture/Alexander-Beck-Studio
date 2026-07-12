import { SoundPlayground } from './SoundPlayground.jsx';

export const SOUND_PLAYGROUND_ROUTE_RUNTIME = {};

export function getSoundPlaygroundRouteView() {
  return {
    layout: 'standalone',
    htmlClassName: 'sound-playground-document',
    bodyClass: 'body sound-playground-page',
    mainContent: <SoundPlayground />,
  };
}
