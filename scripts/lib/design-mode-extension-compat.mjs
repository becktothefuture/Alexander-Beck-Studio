// Pinned 2.2.1 excludes token-only edits from Copy/Send and the Changes badge.
// Transform only the build input, leaving every vendor source file untouched.
export function patchDesignModeSidepanel(source) {
  const replacements = [
    ['const hasChanges = styleChanges.length > 0 || textChanges.length > 0 || domChanges.length > 0 || comments.length > 0;',
      'const hasChanges = tokenChanges.length > 0 || styleChanges.length > 0 || textChanges.length > 0 || domChanges.length > 0 || comments.length > 0;'],
    ['badge: styleChanges.length + textChanges.length + domChanges.length + comments.length',
      'badge: tokenChanges.length + styleChanges.length + textChanges.length + domChanges.length + comments.length'],
  ];
  for (const [before, after] of replacements) {
    if (source.split(before).length !== 2) throw new Error('Pinned Design Mode token-action source changed. Revalidate the extension compatibility fix.');
    source = source.replace(before, after);
  }
  return source;
}
