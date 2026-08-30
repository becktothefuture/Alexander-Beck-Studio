import { useEffect, useRef, useState } from 'react';
import { getPlaygroundCodeDemoSrcDoc } from './codeDemos.js';
import { getPlaygroundMediaStyle } from './mediaPresentation.js';
import { PlaygroundMediaFallback } from './PlaygroundMediaFallback.jsx';
import { PlaygroundPoster } from './PlaygroundPoster.jsx';

export function PlaygroundCodePreview({
  item,
  active = false,
  visible = true,
  pointerInteractive = false,
  decorative = true,
  posterOnly = false,
  className = '',
  runtimeOwnerId,
  onRuntimeStateChange,
  onEscapeRequest,
}) {
  const iframeRef = useRef(null);
  const [state, setState] = useState('loading');
  const shouldMountDemo = !posterOnly && active && visible;
  const srcDoc = shouldMountDemo ? getPlaygroundCodeDemoSrcDoc(item?.demoId) : null;
  const classes = [
    'playground-media',
    'playground-media--code',
    'playground-code-preview',
    className,
  ].filter(Boolean).join(' ');

  useEffect(() => {
    if (!runtimeOwnerId || typeof onRuntimeStateChange !== 'function') return undefined;
    if (!shouldMountDemo || !srcDoc) return undefined;
    onRuntimeStateChange({
      type: 'code',
      ownerId: runtimeOwnerId,
      active: true,
      ready: false,
    });
    return () => {
      onRuntimeStateChange({
        type: 'code',
        ownerId: runtimeOwnerId,
        active: false,
        ready: false,
      });
    };
  }, [onRuntimeStateChange, runtimeOwnerId, shouldMountDemo, srcDoc]);

  useEffect(() => {
    if (!shouldMountDemo || !srcDoc || typeof onEscapeRequest !== 'function') return undefined;
    const handleMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type !== 'abs:playground-code-escape') return;
      if (event.data?.demoId !== item?.demoId) return;
      onEscapeRequest();
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [item?.demoId, onEscapeRequest, shouldMountDemo, srcDoc]);

  if (!shouldMountDemo) {
    return (
      <PlaygroundPoster
        item={item}
        decorative={decorative}
        className={['playground-code-preview', className].filter(Boolean).join(' ')}
        renderMode="poster"
      />
    );
  }

  return (
    <div
      className={classes}
      data-media-type="code"
      data-render-mode="active"
      data-media-state={srcDoc ? state : 'fallback'}
      data-pointer-inert={pointerInteractive ? 'false' : 'true'}
      style={getPlaygroundMediaStyle(item)}
    >
      {!srcDoc ? (
        <PlaygroundMediaFallback item={item} decorative={decorative} message="Code preview unavailable" />
      ) : (
        <iframe
          ref={iframeRef}
          className="playground-media__asset"
          srcDoc={srcDoc}
          title={`${item?.label || 'Work'} code demonstration`}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          tabIndex={pointerInteractive ? 0 : -1}
          aria-hidden={decorative ? 'true' : undefined}
          onLoad={() => {
            setState('ready');
            if (runtimeOwnerId && typeof onRuntimeStateChange === 'function') {
              onRuntimeStateChange({
                type: 'code',
                ownerId: runtimeOwnerId,
                active: true,
                ready: true,
              });
            }
          }}
        />
      )}
    </div>
  );
}
