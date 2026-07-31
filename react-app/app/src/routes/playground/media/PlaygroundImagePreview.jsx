import { useState } from 'react';
import { getPlaygroundMediaStyle } from './mediaPresentation.js';
import { PlaygroundMediaFallback } from './PlaygroundMediaFallback.jsx';

export function PlaygroundImagePreview({
  item,
  decorative = true,
  posterOnly = false,
  className = '',
}) {
  const [state, setState] = useState('loading');
  const source = posterOnly ? (item?.preview || item?.poster) : item?.source;
  const classes = ['playground-media', 'playground-media--image', className].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      data-media-type="image"
      data-render-mode={posterOnly ? 'poster' : 'active'}
      data-media-state={state}
      style={getPlaygroundMediaStyle(item)}
    >
      {state === 'fallback' ? (
        <PlaygroundMediaFallback item={item} decorative={decorative} />
      ) : (
        <img
          className="playground-media__asset"
          src={source}
          alt={decorative ? '' : (item?.accessibilityText || item?.label || '')}
          aria-hidden={decorative ? 'true' : undefined}
          loading="lazy"
          decoding="async"
          draggable="false"
          onLoad={() => setState('ready')}
          onError={() => setState('fallback')}
        />
      )}
    </div>
  );
}
