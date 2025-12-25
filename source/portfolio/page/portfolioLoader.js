// src/portfolioLoader.js
// Dynamically builds notebook pages from portfolio.json data
// This is the dist version minus the unsupported JSON-module import.

import { GLOBAL_CONFIG } from './config.js';
import { CHAPTERS } from './chapters.js';
import { portfolioUrl } from './basePath.js';

// ---------------------------------------------------------------------------
// 1. SCHEMA (unchanged – trimmed for brevity)
// ---------------------------------------------------------------------------
export const PORTFOLIO_SCHEMA = {
  type: 'object',
  required: ['projects'],
  properties: {
    projects: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'pages'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          pages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['asset', 'type', 'commentary'],
              properties: {
                asset: { type: 'string' },
                type: { type: 'string', enum: ['image', 'video'] },
                commentary: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

// Very light runtime validator – just checks array shapes
export function validatePortfolioSchema(data) {
  return {
    isValid: !!data && Array.isArray(data.projects),
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// 2. HELPERS
// ---------------------------------------------------------------------------
export function resolveAssetPath(_, asset) {
  return portfolioUrl(`assets/portfolio-pages/pages/${asset}`);
}

function addPageHoles(front, back) {
  const f = document.createElement('div');
  f.className = 'page-holes page-holes--styled';
  front.appendChild(f);
  const b = document.createElement('div');
  b.className = 'page-holes page-holes--styled page-holes--back';
  back.appendChild(b);
}

function createMediaElement(type, src, alt, size) {
  if (type === 'video') {
    const v = document.createElement('video');
    v.dataset.src = src;
    if (size) v.dataset.size = size;
    v.loop = v.muted = v.autoplay = true;
    v.playsInline = true;
    v.preload = 'none';
    v.className = 'page-content__inner page-content__media--video';
    return v;
  }
  const img = document.createElement('img');
  img.dataset.src = src;
  img.alt = alt;
  if (size) img.dataset.size = size;
  img.loading = 'lazy';
  img.className = 'page-content__inner page-content__media';
  return img;
}

function createPageElement(data, chapterId, pageIndexInChapter, globalIndex, size) {
  const page = document.createElement('div');
  page.className = `page page--positioned gpu-accelerated${data.type === 'video' ? ' page--video-page' : ''}`;
  page.dataset.commentary = data.commentary;
  page.dataset.chapterId = chapterId;
  page.dataset.pageIndex = pageIndexInChapter;

  const front = document.createElement('div');
  front.className = 'page-front';
  const back = document.createElement('div');
  back.className = 'page-back';
  addPageHoles(front, back);

  const frontContent = document.createElement('div');
  frontContent.className = 'page-content page-content--front';

  const media = createMediaElement(data.type, `assets/portfolio-pages/pages/${data.asset}`, data.commentary, size);
  frontContent.appendChild(media);

  const commentary = document.createElement('div');
  commentary.className = 'page-content__commentary';
  commentary.textContent = data.commentary;
  frontContent.appendChild(commentary);

  front.appendChild(frontContent);
  page.appendChild(front);
  page.appendChild(back);

  // === Dynamic shadow overlay for skewing effect ===
  const shadowWrapper = document.createElement('div');
  shadowWrapper.className = 'page-shadow-wrapper';
  const shadowEl = document.createElement('div');
  shadowEl.className = 'page-shadow';
  shadowWrapper.appendChild(shadowEl);
  page.appendChild(shadowWrapper);
  return page;
}

function createCoverPage(kind, commentary, idx) {
  const cover = document.createElement('div');
  cover.className = `page cover cover--${kind} gpu-accelerated`;
  cover.dataset.commentary = commentary;
  cover.dataset.deckNumber = kind === 'front' ? 'front' : String(idx + 1).padStart(2, '0');
  const front = document.createElement('div');
  front.className = 'page-front';
  const back = document.createElement('div');
  back.className = 'page-back';
  front.classList.add('cover', `cover--${kind}`);
  addPageHoles(front, back);

  // Lock/band system removed - portfolio is always unlocked

  cover.appendChild(front);
  cover.appendChild(back);

  // Add shadow overlay (kept invisible for covers)
  const shadowWrapper = document.createElement('div');
  shadowWrapper.className = 'page-shadow-wrapper';
  const shadowEl = document.createElement('div');
  shadowEl.className = 'page-shadow';
  shadowWrapper.appendChild(shadowEl);
  cover.appendChild(shadowWrapper);
  return cover;
}

export function createPagesFromPortfolioData(container, data) {
  const valid = validatePortfolioSchema(data);
  if (!valid.isValid) throw new Error('Invalid portfolio schema');

  const stack = container.classList.contains('page-stack') ? container : container.querySelector('.page-stack');
  stack.innerHTML = '';
  CHAPTERS.length = 0;

  const pages = [];
  let globalIdx = 0;
  
  // Create front cover
  const front = createCoverPage('front', 'Welcome!', globalIdx++);
  stack.appendChild(front);
  pages.push(front);

  // Build chapters from WebP file data
  const chapters = buildChaptersFromWebP(data);
  
  // Create pages for each chapter
  chapters.forEach((chapter, chapterIdx) => {
    // Create regular pages for this chapter
    chapter.pages.forEach((pageData, pageIdx) => {
      const el = createPageElement(pageData, chapter.id, pageIdx, globalIdx++, pageData.size);
      
      // If this is the first page of the chapter, mark it as chapter cover and add tab
      if (pageIdx === 0) {
        el.classList.add('chapter-cover');
        el.dataset.isChapterCover = 'true';
        
        // Add chapter to CHAPTERS array with first page index
        CHAPTERS.push({
          id: chapter.id,
          title: chapter.title,
          color: chapter.color,
          page: pages.length, // Index of the first page (about to be added)
          tabImage: chapter.tabImage || null
        });
      }
      
      // Apply chapter background color to first 3 pages and last page
      // Skip coloring for chapter 0 (it uses default paper color)
      const isFirstThreePages = pageIdx < 3;
      const isLastPage = pageIdx === chapter.pages.length - 1;
      const isChapterZero = chapter.id === 'chapter-0';
      
      if ((isFirstThreePages || isLastPage) && !isChapterZero) {
        el.classList.add('chapter-page-colored');
        el.dataset.chapterColor = chapter.color; // Use tab color
        el.style.setProperty('--chapter-color', chapter.color);
      }
      
      stack.appendChild(el);
      pages.push(el);
      globalIdx++;
    });
  });

  // Create back cover
  const back = createCoverPage('back', 'Thank you!', globalIdx++);
  stack.appendChild(back);
  pages.push(back);
  
  return pages;
}

// Build chapters from WebP files in the manifest
function buildChaptersFromWebP(data) {
  // Color palette for chapters (same colors for tabs and pages)
  const colors = [
    GLOBAL_CONFIG.COLORS.palette.coral,
    GLOBAL_CONFIG.COLORS.palette.peach,
    GLOBAL_CONFIG.COLORS.palette.lavender,
    GLOBAL_CONFIG.COLORS.palette.mint,
    GLOBAL_CONFIG.COLORS.palette.lemon,
    GLOBAL_CONFIG.COLORS.palette.rose,
    GLOBAL_CONFIG.COLORS.palette.sky
  ];
  
  // Tab image names for chapters
  const tabImages = [
    'chapter-0-tab.webp', // Chapter 0 - placeholder
    'chapter-1-tab.webp',
    'chapter-2-tab.webp', 
    'chapter-3-tab.webp',
    'chapter-4-tab.webp',
    'chapter-5-tab.webp',
    'chapter-6-tab.webp'
  ];
  
  const chapters = [];
  
  // Group pages by chapter based on filename patterns
  const chapterGroups = {};
  
  // Process portfolio data to group by chapters
  data.projects.forEach(project => {
    project.pages.forEach(page => {
      const match = page.asset.match(/^chapter-(\d+)-(\d+)\.webp$/);
      if (match) {
        const chapterNum = parseInt(match[1]);
        const pageNum = parseInt(match[2]);
        
        if (!chapterGroups[chapterNum]) {
          chapterGroups[chapterNum] = [];
        }
        
        chapterGroups[chapterNum].push({
          ...page,
          pageNum,
        });
      }
    });
  });
  
  // Create chapter objects
  Object.keys(chapterGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach((chapterNum, idx) => {
    const chapterIndex = parseInt(chapterNum);
    const chapterPages = chapterGroups[chapterNum].sort((a, b) => a.pageNumber - b.pageNumber);
    
    // Chapter 0 uses default paper color, other chapters use shifted palette colors
    let chapterColor;
    if (chapterIndex === 0) {
      chapterColor = GLOBAL_CONFIG.COLORS.default; // Default paper color
    } else {
      // Shift colors: chapter 1 gets colors[0], chapter 2 gets colors[1], etc.
      chapterColor = colors[(chapterIndex - 1) % colors.length];
    }
    
    chapters.push({
      id: `chapter-${chapterIndex}`,
      title: `Chapter ${chapterIndex}`,
      color: chapterColor,
      pages: chapterPages,
      tabImage: tabImages[chapterIndex] || null
    });
  });
  
  return chapters;
}


// ---------------------------------------------------------------------------
// 3. PortfolioLoader – runtime fetch (preview or default)
// ---------------------------------------------------------------------------
export class PortfolioLoader {
  async load() {
    const res = await fetch(portfolioUrl('data/portfolio.json'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json;
  }
} 