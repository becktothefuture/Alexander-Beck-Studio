export function getPlaygroundMediaStyle(item) {
  const width = Number(item?.intrinsicDimensions?.width) || 1;
  const height = Number(item?.intrinsicDimensions?.height) || 1;
  return {
    '--playground-media-width': String(width),
    '--playground-media-height': String(height),
    '--playground-media-aspect': String(width / height),
    aspectRatio: `${width} / ${height}`,
  };
}

export function getPlaygroundVideoMimeType(source = '') {
  const path = String(source).toLowerCase().split(/[?#]/, 1)[0];
  if (path.endsWith('.webm')) return 'video/webm';
  if (path.endsWith('.mp4')) return 'video/mp4';
  if (path.endsWith('.ogv') || path.endsWith('.ogg')) return 'video/ogg';
  return '';
}
