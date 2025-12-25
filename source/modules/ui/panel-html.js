// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         CONTROL PANEL HTML TEMPLATE                          ║
// ║           Generated from centralized control-registry.js                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { generatePanelHTML } from './control-registry.js';

// For backwards compatibility, also export PANEL_HTML constant
// Note: This won't update if visibility changes at runtime
export const PANEL_HTML = generatePanelHTML();
