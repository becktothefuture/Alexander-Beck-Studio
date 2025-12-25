// Portfolio panel control binding.

import { bindRegisteredControls } from './control-registry.js';

export function setupControls(config, options = {}) {
  bindRegisteredControls(config, options);
}
