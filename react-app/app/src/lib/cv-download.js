import { hasGateAccess } from './access-gates.js';
import { withBasePath } from './base-path.js';

// CV and Work share one invite grant. Separate events keep a CV request from
// continuing a pending case study when routes change during the gate flow.
export const CV_ACCESS_EVENTS = Object.freeze({
  request: 'abs:cv:request-access',
  granted: 'abs:cv:access-granted',
  dismissed: 'abs:cv:access-dismissed',
});

export const CV_DOWNLOAD_FILENAME = 'Alexander-Beck-CV.pdf';

export function downloadCv() {
  if (!hasGateAccess('portfolio')) return false;

  // This is the same client-side invite boundary as Work, not secure file
  // authentication. The static PDF can also be retrieved by its direct URL.
  const link = document.createElement('a');
  link.href = withBasePath(`/downloads/${CV_DOWNLOAD_FILENAME}`);
  link.download = CV_DOWNLOAD_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}
