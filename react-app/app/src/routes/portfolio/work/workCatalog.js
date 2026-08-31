import {
  getProjectAccessMode,
  getProjectImageSrc,
  loadPortfolioData,
  resolvePortfolioAsset,
} from '../../../legacy/modules/portfolio/portfolio-data.js';
import { validatePlaygroundContentForRuntime } from '../../playground/media/playgroundContent.js';

const CASE_STUDY_LAYOUTS = Object.freeze([
  Object.freeze({
    preferredGridSpan: Object.freeze({ columns: 11, rows: 14 }),
    preferredAnchorCells: Object.freeze({ x: -27, y: -17 }),
  }),
  Object.freeze({
    preferredGridSpan: Object.freeze({ columns: 11, rows: 14 }),
    preferredAnchorCells: Object.freeze({ x: 17, y: -21 }),
  }),
  Object.freeze({
    preferredGridSpan: Object.freeze({ columns: 11, rows: 14 }),
    preferredAnchorCells: Object.freeze({ x: 8, y: 12 }),
  }),
  Object.freeze({
    preferredGridSpan: Object.freeze({ columns: 11, rows: 14 }),
    preferredAnchorCells: Object.freeze({ x: -26, y: 12 }),
  }),
  Object.freeze({
    preferredGridSpan: Object.freeze({ columns: 11, rows: 14 }),
    preferredAnchorCells: Object.freeze({ x: 32, y: 6 }),
  }),
  Object.freeze({
    preferredGridSpan: Object.freeze({ columns: 11, rows: 14 }),
    preferredAnchorCells: Object.freeze({ x: -8, y: -31 }),
  }),
]);

export const WORK_ITEM_KINDS = Object.freeze({
  caseStudy: 'case-study',
  snippet: 'snippet',
});

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function getCaseStudyLayout(index) {
  const layout = CASE_STUDY_LAYOUTS[index % CASE_STUDY_LAYOUTS.length];
  const orbit = Math.floor(index / CASE_STUDY_LAYOUTS.length);
  if (!orbit) return layout;
  const direction = index % 2 === 0 ? 1 : -1;
  return {
    preferredGridSpan: { ...layout.preferredGridSpan },
    preferredAnchorCells: {
      x: layout.preferredAnchorCells.x + (direction * orbit * 24),
      y: layout.preferredAnchorCells.y + (orbit * 18),
    },
  };
}

export function normalizeWorkCaseStudy(project, index, {
  resolveAsset = resolvePortfolioAsset,
} = {}) {
  if (!project || typeof project !== 'object') return null;
  const projectId = String(project.id || '').trim();
  const label = String(project.displayTitle || project.title || '').trim();
  const summary = String(project.summary || '').trim();
  const imageSource = getProjectImageSrc(project);
  if (!projectId || !label || !summary || !imageSource) return null;

  const layout = getCaseStudyLayout(index);
  const client = String(project.client || '').trim();
  const resolvedImage = resolveAsset(imageSource);
  return {
    id: `case-study-${projectId}`,
    projectId,
    placementOrder: index + 1,
    kind: WORK_ITEM_KINDS.caseStudy,
    hierarchy: 'primary',
    type: 'image',
    label,
    description: summary,
    accessibilityText: `${client ? `${client}. ` : ''}${label}. Full case study.`,
    poster: resolvedImage,
    preview: resolvedImage,
    source: resolvedImage,
    intrinsicDimensions: { width: 1600, height: 1000 },
    preferredGridSpan: { ...layout.preferredGridSpan },
    preferredAnchorCells: { ...layout.preferredAnchorCells },
    presentationVariant: 'case-study',
    previewAspectRatio: 4 / 5,
    access: getProjectAccessMode(project),
    client,
    project,
  };
}

export function normalizeWorkSnippet(item, index, caseStudyCount) {
  if (!item || typeof item !== 'object' || !isNonEmptyString(item.id)) return null;
  return {
    ...item,
    placementOrder: caseStudyCount + index + 1,
    kind: WORK_ITEM_KINDS.snippet,
    hierarchy: 'secondary',
    access: 'public',
  };
}

export function createWorkCatalog({
  portfolioContent,
  snippetContent,
  resolveAsset = resolvePortfolioAsset,
} = {}) {
  const projects = Array.isArray(portfolioContent?.projects) ? portfolioContent.projects : [];
  const snippets = Array.isArray(snippetContent?.items) ? snippetContent.items : [];
  const validationIssues = Array.isArray(snippetContent?.validationIssues)
    ? [...snippetContent.validationIssues]
    : [];

  const caseStudies = projects
    .map((project, index) => {
      const item = normalizeWorkCaseStudy(project, index, { resolveAsset });
      if (!item) validationIssues.push(`projects[${index}] could not become a Work case study.`);
      return item;
    })
    .filter(Boolean);

  const normalizedSnippets = snippets
    .map((item, index) => normalizeWorkSnippet(item, index, caseStudies.length))
    .filter(Boolean);

  if (!caseStudies.length) {
    throw new Error('Work needs at least one valid case study.');
  }
  if (!normalizedSnippets.length) {
    throw new Error('Work needs at least one valid snippet.');
  }

  return {
    version: Number.isInteger(portfolioContent?.version) ? portfolioContent.version : 1,
    title: String(portfolioContent?.title || 'Work').trim(),
    description: String(
      portfolioContent?.description
        || 'Case studies and smaller experiments arranged as one field of work.',
    ).trim(),
    items: [...caseStudies, ...normalizedSnippets],
    caseStudies,
    snippets: normalizedSnippets,
    validationIssues,
  };
}

export async function loadWorkCatalog({
  signal,
  portfolioLoader = loadPortfolioData,
  snippetValidator = validatePlaygroundContentForRuntime,
  resolveAsset = resolvePortfolioAsset,
} = {}) {
  const portfolioContent = await portfolioLoader(signal);
  const snippetContent = snippetValidator({
    version: portfolioContent?.version,
    title: portfolioContent?.title,
    description: portfolioContent?.description,
    items: portfolioContent?.snippets,
  });
  return createWorkCatalog({ portfolioContent, snippetContent, resolveAsset });
}
