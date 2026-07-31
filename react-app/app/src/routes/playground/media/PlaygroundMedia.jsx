import { PlaygroundCodePreview } from './PlaygroundCodePreview.jsx';
import { PlaygroundImagePreview } from './PlaygroundImagePreview.jsx';
import { PlaygroundMediaFallback } from './PlaygroundMediaFallback.jsx';
import { PlaygroundVideoPreview } from './PlaygroundVideoPreview.jsx';

export function PlaygroundMedia({
  item,
  renderMode = 'poster',
  active = false,
  visible = true,
  motionAllowed = true,
  interactive = false,
  decorative = true,
  className = '',
  runtimeOwnerId,
  onRuntimeStateChange,
  onEscapeRequest,
}) {
  const posterOnly = renderMode !== 'active';

  if (!item) {
    return (
      <div
        className={['playground-media', className].filter(Boolean).join(' ')}
        data-media-type="unknown"
        data-render-mode={renderMode}
        data-media-state="fallback"
      >
        <PlaygroundMediaFallback item={null} decorative={decorative} />
      </div>
    );
  }

  if (item.type === 'image') {
    return (
      <PlaygroundImagePreview
        item={item}
        decorative={decorative}
        posterOnly={posterOnly}
        className={className}
      />
    );
  }

  if (item.type === 'video') {
    return (
      <PlaygroundVideoPreview
        item={item}
        active={active}
        visible={visible}
        motionAllowed={motionAllowed}
        controls={interactive}
        decorative={decorative}
        posterOnly={posterOnly}
        className={className}
        runtimeOwnerId={runtimeOwnerId}
        onRuntimeStateChange={onRuntimeStateChange}
      />
    );
  }

  if (item.type === 'code') {
    return (
      <PlaygroundCodePreview
        item={item}
        active={active}
        visible={visible}
        pointerInteractive={interactive}
        decorative={decorative}
        posterOnly={posterOnly}
        className={className}
        runtimeOwnerId={runtimeOwnerId}
        onRuntimeStateChange={onRuntimeStateChange}
        onEscapeRequest={onEscapeRequest}
      />
    );
  }

  return (
    <div
      className={['playground-media', className].filter(Boolean).join(' ')}
      data-media-type={item.type || 'unknown'}
      data-render-mode={renderMode}
      data-media-state="fallback"
    >
      <PlaygroundMediaFallback item={item} decorative={decorative} />
    </div>
  );
}
