import { useMemo } from 'react';
import { sanitizeTemplateHtml } from '../../lib/template.js';

export function SharedFrame({ html, bodyClass = 'body' }) {
  const safeHtml = useMemo(() => sanitizeTemplateHtml(html), [html]);

  return (
    <div className={bodyClass} dangerouslySetInnerHTML={{ __html: safeHtml }} />
  );
}
