import { CHAPTERS } from './chapters.js';
import { portfolioUrl } from './basePath.js';

// Constants for tab styling
const TAB_HEIGHT_PERCENT = 8; // percentage of page height
const TAB_SPACING_PERCENT = 2; // percentage spacing between tabs

// Global state for chapter navigation
let currentChapterIndex = 0;
let isInitialized = false;
let scrollEngineInstance = null;

/**
 * Get the CSS variable value for tab safe area horizontal padding
 * @returns {number} Safe area padding in pixels
 */
function getTabSafeAreaHorizontal() {
  const rootStyle = getComputedStyle(document.documentElement);
  const safeAreaValue = rootStyle.getPropertyValue('--tab-safe-area-horizontal').trim();
  return parseInt(safeAreaValue, 10) || 8;
}

/**
 * Navigate to next chapter (TAB key)
 */
function navigateToNextChapter() {
  if (CHAPTERS.length === 0) return;
  
  currentChapterIndex = (currentChapterIndex + 1) % CHAPTERS.length;
  const targetChapter = CHAPTERS[currentChapterIndex];
  
  if (scrollEngineInstance?.jumpToPage) {
    scrollEngineInstance.jumpToPage(targetChapter.page);
  }
}

/**
 * Navigate to previous chapter (Shift+TAB)
 */
function navigateToPreviousChapter() {
  if (CHAPTERS.length === 0) return;
  
  currentChapterIndex = (currentChapterIndex - 1 + CHAPTERS.length) % CHAPTERS.length;
  const targetChapter = CHAPTERS[currentChapterIndex];
  
  if (scrollEngineInstance?.jumpToPage) {
    scrollEngineInstance.jumpToPage(targetChapter.page);
  }
}

/**
 * Handle global keyboard navigation for chapter cycling
 * @param {Event} event - Keyboard event
 */
function handleGlobalKeydown(event) {
  if (window.isPortfolioLocked) return;
  if (!isInitialized || CHAPTERS.length === 0 || event.key !== 'Tab') return;
  
  const activeElement = document.activeElement;
  const isOnTab = activeElement?.closest('.page-tab');
  
  if (!isOnTab) {
    event.preventDefault();
    
    if (event.shiftKey) {
      navigateToPreviousChapter();
    } else {
      navigateToNextChapter();
    }
  }
}

/**
 * Handle tab click events for chapter navigation
 * @param {Event} event - Click event
 */
function handleTabClick(event) {
  if (window.isPortfolioLocked) return; // Disable navigation while locked
  const tab = event.target.closest('.page-tab');
  if (!tab) return;

  const chapterIndex = parseInt(tab.dataset.chapterIndex, 10);
  if (isNaN(chapterIndex) || chapterIndex < 0 || chapterIndex >= CHAPTERS.length) {
    return;
  }

  currentChapterIndex = chapterIndex;
  const targetChapter = CHAPTERS[chapterIndex];

  if (scrollEngineInstance?.jumpToPage) {
    scrollEngineInstance.jumpToPage(targetChapter.page);
  }

  event.preventDefault();
  event.stopPropagation();
}

/**
 * Handle tab keyboard events for accessibility
 * @param {Event} event - Keyboard event
 */
function handleTabKeydown(event) {
  if (window.isPortfolioLocked) return;
  const tab = event.target.closest('.page-tab');
  if (!tab || !['Enter', ' '].includes(event.key)) return;

  event.preventDefault();
  event.stopPropagation();
  
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  tab.dispatchEvent(clickEvent);
}

/**
 * Initialize tab click handlers and global keyboard navigation
 * @param {HTMLElement} notebook - The main notebook container element
 */
function initTabClickHandlers(notebook) {
  notebook.addEventListener('click', handleTabClick, true);
  notebook.addEventListener('keydown', handleTabKeydown, true);
  document.addEventListener('keydown', handleGlobalKeydown, true);
}

/**
 * Create a fallback SVG icon for tabs without images
 * @returns {SVGElement} SVG element
 */
function createFallbackTabIcon() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.style.display = 'block';

  const rect = document.createElementNS(svgNS, 'rect');
  rect.setAttribute('x', '10');
  rect.setAttribute('y', '25');
  rect.setAttribute('width', '80');
  rect.setAttribute('height', '50');
  rect.setAttribute('rx', '8');
  rect.setAttribute('fill', '#fff8');
  rect.setAttribute('stroke', '#333');
  rect.setAttribute('stroke-width', '3');
  
  svg.appendChild(rect);
  return svg;
}

/**
 * Calculate tab dimensions and positioning
 * @param {number} totalTabs - Total number of tabs
 * @param {number} pageWidth - Width of page element
 * @returns {Object} Tab dimensions and positioning data
 */
function calculateTabLayout(totalTabs, pageWidth) {
  const safeAreaPx = getTabSafeAreaHorizontal();
  const safeAreaPercent = (safeAreaPx / pageWidth) * 100;
  
  const totalGaps = totalTabs - 1;
  const totalSpacingPercent = totalGaps * TAB_SPACING_PERCENT;
  const totalSafeAreaPercent = safeAreaPercent * 2;
  const availableWidthPercent = 100 - totalSpacingPercent - totalSafeAreaPercent;
  const tabWidthPercent = availableWidthPercent / totalTabs;

  return {
    tabWidthPercent,
    safeAreaPercent,
    totalSafeAreaPercent
  };
}

/**
 * Create and style a single tab element
 * @param {Object} chapter - Chapter data
 * @param {number} index - Chapter index
 * @param {Object} layout - Tab layout data
 * @returns {HTMLElement} Tab element
 */
function createTabElement(chapter, index, layout) {
  const tab = document.createElement('div');
  tab.className = 'page-tab';
  tab.textContent = chapter.title;
  
  // Store chapter index and accessibility attributes
  tab.dataset.chapterIndex = index;
  tab.setAttribute('aria-label', `Jump to ${chapter.title}`);
  tab.setAttribute('role', 'button');
  tab.setAttribute('tabindex', '0');

  // Apply styling
  tab.style.backgroundColor = chapter.color;
  tab.style.width = `${layout.tabWidthPercent}%`;
  tab.style.height = `${TAB_HEIGHT_PERCENT}%`;
  tab.style.bottom = `-${TAB_HEIGHT_PERCENT * 0.75}%`;

  // Position tab
  const leftPositionPercent = layout.safeAreaPercent + index * (layout.tabWidthPercent + TAB_SPACING_PERCENT);
  tab.style.left = `${leftPositionPercent}%`;

  // Set background image or fallback icon
  if (chapter.tabImage) {
    // Use portfolioUrl to correctly resolve tab images from the subfolder
    tab.style.backgroundImage = `url('${portfolioUrl(`assets/portfolio-pages/chapter-tabs/${chapter.tabImage}`)}')`;
    tab.classList.add('tab-with-image');
  } else {
    tab.appendChild(createFallbackTabIcon());
  }

  // Set CSS variables for proper stacking
  tab.style.setProperty('--tab-index', CHAPTERS.length - index);
  tab.style.setProperty('--shadow-overlay', '0');
  tab.style.setProperty('--shadow-blur', '0');
  tab.style.setProperty('--shadow-color', 'transparent');

  return tab;
}

/**
 * Initializes the chapter navigation system.
 * Creates tabs and attaches them to the corresponding pages.
 * @param {HTMLElement[]} pages - Array of all page DOM elements.
 * @param {HTMLElement} notebook - The main notebook container element.
 * @param {VirtualScrollEngine} scrollEngine - Scroll engine instance.
 */
export function initChapters(pages, notebook, scrollEngine) {
  scrollEngineInstance = scrollEngine;
  
  const totalTabs = CHAPTERS.length;
  if (totalTabs === 0) return;
  
  // Calculate tab layout
  const pageElement = pages[0];
  const pageWidth = pageElement?.offsetWidth || 800;
  const layout = calculateTabLayout(totalTabs, pageWidth);

  // Create tabs for each chapter
  CHAPTERS.forEach((chapter, index) => {
    if (chapter.page < pages.length) {
      const pageElement = pages[chapter.page];
      const tab = createTabElement(chapter, index, layout);
      pageElement.appendChild(tab);
    }
  });

  // Initialize event handlers
  initTabClickHandlers(notebook);
  
  // Mark as initialized
  isInitialized = true;
  currentChapterIndex = 0;
}
