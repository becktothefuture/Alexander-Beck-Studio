/** ID of the DOM node where the shared footer is mounted (SharedFrame footer slot). */
export const FOOTER_MOUNT_ID = 'footer-mount';

export function sanitizeTemplateHtml(rawHtml) {
  if (!rawHtml) return '';

  // Remove inline/module scripts from injected markup; runtime boot is controlled by React hooks.
  return String(rawHtml)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--\s*ABS_LIVE_RELOAD_START\s*-->[\s\S]*?<!--\s*ABS_LIVE_RELOAD_END\s*-->/gi, '');
}
