import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FOOTER_MOUNT_ID, sanitizeTemplateHtml } from '../../lib/template.js';

export function SharedFrame({ html, bodyClass = 'body', footer = null }) {
  const safeHtml = useMemo(() => sanitizeTemplateHtml(html), [html]);
  const frameRef = useRef(null);
  const [footerMountNode, setFooterMountNode] = useState(null);
  const htmlSetRef = useRef(false);

  useLayoutEffect(() => {
    const container = frameRef.current;
    if (!container) return;

    // Set innerHTML only once; re-applying on re-render would destroy #footer-mount
    // and detach the node we portal into, making the footer invisible.
    if (!htmlSetRef.current) {
      container.innerHTML = safeHtml;
      htmlSetRef.current = true;
    }

    const node = container.querySelector(`#${FOOTER_MOUNT_ID}`) ?? null;
    setFooterMountNode(node);
  }, [safeHtml]);

  return (
    <>
      <div ref={frameRef} className={bodyClass} />
      {footerMountNode && footer != null && createPortal(footer, footerMountNode)}
    </>
  );
}
