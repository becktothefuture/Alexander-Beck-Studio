export function PlaygroundMediaFallback({ item, message = 'Preview unavailable', decorative = true }) {
  return (
    <div
      className="playground-media__fallback playground-media-fallback"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : `${item?.label || 'Playground item'}: ${message}`}
    >
      <span className="playground-media__fallback-label">{message}</span>
    </div>
  );
}
