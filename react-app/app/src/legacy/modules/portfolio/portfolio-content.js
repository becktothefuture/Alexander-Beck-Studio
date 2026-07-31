export function resolvePortfolioLabelContent(project, fallbackTitle = 'Untitled Project') {
  const eyebrow = String(project?.eyebrow || project?.labelEyebrow || project?.client || '').trim();
  const title = String(
    project?.shapeTitle
      || project?.shapeTitleLong
      || project?.bodyTitle
      || project?.displayTitle
      || project?.title
      || fallbackTitle
  ).trim() || String(fallbackTitle || 'Untitled Project').trim();

  return { eyebrow, title };
}

export function getProjectContentBlocks(project) {
  if (Array.isArray(project?.contentBlocks) && project.contentBlocks.length) {
    return project.contentBlocks;
  }
  if (Array.isArray(project?.gallery) && project.gallery.length) {
    return project.gallery.map((src) => ({ type: 'image', src }));
  }
  return [];
}
