import { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FOOTER_MOUNT_ID, sanitizeTemplateHtml } from '../../lib/template.js';

export function SharedFrame({ html, children = null, bodyClass = 'body', footer = null }) {
  const safeHtml = useMemo(() => sanitizeTemplateHtml(html), [html]);
  const [footerMountNode, setFooterMountNode] = useState(null);
  const htmlSetRef = useRef(false);

  const handleFrameRef = useCallback((container) => {
    if (!container) return;

    if (html != null) {
      // Set innerHTML only once; re-applying on re-render would destroy #footer-mount
      // and detach the node we portal into, making the footer invisible.
      if (!htmlSetRef.current) {
        container.innerHTML = safeHtml;
        htmlSetRef.current = true;
      }

      const node = container.querySelector(`#${FOOTER_MOUNT_ID}`) ?? null;
      setFooterMountNode(node);
      return;
    }

    setFooterMountNode(container.querySelector(`#${FOOTER_MOUNT_ID}`) ?? null);
  }, [html, safeHtml]);

  return (
    <>
      <div ref={handleFrameRef} className={bodyClass}>
        {html == null ? children : null}
        {html == null ? <div id={FOOTER_MOUNT_ID} /> : null}
      </div>
      {footerMountNode && footer != null && createPortal(footer, footerMountNode)}
    </>
  );
}
