import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ActionButton } from './ActionButton.jsx';
import { hasGateAccess } from '../../lib/access-gates.js';
import { CV_ACCESS_EVENTS, downloadCv } from '../../lib/cv-download.js';

/** Reuse the Work invite gate without changing route or duplicating its modal. */
export function CvDownloadAction({ soundSource = 'download-cv' }) {
  const requestId = useId();
  const pendingRef = useRef(null);
  const [pending, setPending] = useState(false);

  const releaseRequest = useCallback((restoreFocus = true) => {
    const request = pendingRef.current;
    pendingRef.current = null;
    if (!request) return;
    if (request.content?.isConnected) request.content.inert = request.wasInert;
    if (restoreFocus && request.trigger?.isConnected) {
      request.trigger.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    const finish = (event) => {
      if (!pendingRef.current || event.detail?.requestId !== requestId) return;
      const granted = event.type === CV_ACCESS_EVENTS.granted;
      releaseRequest();
      setPending(false);
      if (granted) downloadCv();
    };
    window.addEventListener(CV_ACCESS_EVENTS.granted, finish);
    window.addEventListener(CV_ACCESS_EVENTS.dismissed, finish);
    return () => {
      window.removeEventListener(CV_ACCESS_EVENTS.granted, finish);
      window.removeEventListener(CV_ACCESS_EVENTS.dismissed, finish);
      // Route navigation must not leave the departing page inert or download
      // later in response to a gate request that the visitor has abandoned.
      releaseRequest(false);
    };
  }, [releaseRequest, requestId]);

  const handleActivate = (event) => {
    if (pendingRef.current) return;
    if (hasGateAccess('portfolio')) {
      downloadCv();
      return;
    }

    const trigger = event.currentTarget;
    const content = trigger.closest('[data-route-content]');
    pendingRef.current = { trigger, content, wasInert: Boolean(content?.inert) };
    if (content) content.inert = true;
    setPending(true);
    window.dispatchEvent(new CustomEvent(CV_ACCESS_EVENTS.request, {
      detail: { gateId: 'portfolio', requestId },
    }));
  };

  return (
    <ActionButton
      className="contact-cv-action"
      data-download-cv
      data-sound-action="press"
      data-sound-source={soundSource}
      aria-haspopup="dialog"
      aria-expanded={pending}
      onClick={handleActivate}
      icon={<i className="ti ti-download" aria-hidden="true" />}
      iconPosition="trailing"
      label="Download CV"
    />
  );
}
