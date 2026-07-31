import { useState } from 'react';
import { getPlaygroundMediaStyle } from './mediaPresentation.js';
import { PlaygroundMediaFallback } from './PlaygroundMediaFallback.jsx';

export function PlaygroundPoster({
  item,
  decorative = true,
  className = '',
  renderMode = 'poster',
}) {
  const [state, setState] = useState('loading');
  const source = item?.preview || item?.poster || '';
  const classes = ['playground-media', 'playground-media--poster', className].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      data-media-type={item?.type || 'unknown'}
      data-render-mode={renderMode}
      data-media-state={state}
      style={getPlaygroundMediaStyle(item)}
    >
      {state === 'fallback' ? (
        <PlaygroundMediaFallback item={item} decorative={decorative} />
      ) : (
        <img
          className="playground-media__asset playground-media__poster"
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
