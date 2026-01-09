// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           CV PHOTO SLIDESHOW                                 ║
// ║                                                                              ║
// ║  Scroll-driven: Photo changes as you scroll through CV text                 ║
// ║  Cycles through all images based on scroll progress (0% to 100%)            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const SLIDESHOW_CONFIG = {
  imageFolder: 'images/cv-images/',
  images: [
    'profile-photo.jpg',
    'profile-image-01.jpg',
    'profile-image-02.jpg',
    'profile-image-03.jpg',
    'profile-image-04.jpg',
    'profile-image-05.jpg',
    'profile-image-06.jpg',
    'profile-image-07.jpg',
    'profile-image-08.jpg',
    'profile-image-09.jpg',
    'profile-image-10.jpg',
  ],
  jitterInterval: 150, // milliseconds between position changes
};

// Predefined jitter positions for abrupt jumps (no smooth transitions)
const JITTER_POSITIONS = [
  { x: -50, y: -50, rotate: 0 },
  { x: -52, y: -48, rotate: 1.5 },
  { x: -48, y: -51, rotate: -1.2 },
  { x: -51, y: -49, rotate: 0.8 },
  { x: -49, y: -52, rotate: -1.8 },
  { x: -52, y: -50, rotate: 1.2 },
  { x: -48, y: -48, rotate: -0.5 },
  { x: -50, y: -51, rotate: 1.8 },
  { x: -51, y: -48, rotate: -1.5 },
  { x: -49, y: -50, rotate: 0.6 },
];

export function initCvPhotoSlideshow() {
  const photoContainer = document.querySelector('.cv-photo');
  const photoImg = document.querySelector('.cv-photo__image');
  const scrollContainer = document.querySelector('.cv-right');
  
  if (!photoContainer || !photoImg || !scrollContainer) {
    console.warn('[CV Photo Slideshow] Required elements not found');
    return null;
  }

  // Build full image URLs
  const imageUrls = SLIDESHOW_CONFIG.images.map(
    (img) => `${SLIDESHOW_CONFIG.imageFolder}${img}`
  );

  let currentImageIndex = 0;
  let currentPositionIndex = 0;
  let jitterIntervalId = null;

  // Apply a jitter position (abrupt jump, no transition)
  function applyJitterPosition() {
    const position = JITTER_POSITIONS[currentPositionIndex];
    photoImg.style.transform = `translate(${position.x}%, ${position.y}%) rotate(${position.rotate}deg)`;
    
    // Move to next position
    currentPositionIndex = (currentPositionIndex + 1) % JITTER_POSITIONS.length;
  }

  // Set image based on scroll progress
  function updateImageFromScroll() {
    const scrollTop = scrollContainer.scrollTop;
    const scrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    
    // Calculate scroll progress (0 to 1)
    const scrollProgress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    
    // Map scroll progress to image index
    const targetIndex = Math.floor(scrollProgress * (imageUrls.length - 1));
    const clampedIndex = Math.max(0, Math.min(imageUrls.length - 1, targetIndex));
    
    // Only update if image changed
    if (clampedIndex !== currentImageIndex) {
      currentImageIndex = clampedIndex;
      photoImg.src = imageUrls[currentImageIndex];
    }
  }

  // Set initial image and position
  photoImg.src = imageUrls[0];
  applyJitterPosition();

  // Start position jitter animation (runs continuously)
  jitterIntervalId = setInterval(applyJitterPosition, SLIDESHOW_CONFIG.jitterInterval);

  // Listen to scroll events
  let scrollTimeout = null;
  scrollContainer.addEventListener('scroll', () => {
    // Debounce scroll updates for performance
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      updateImageFromScroll();
    }, 50);
  }, { passive: true });

  // Click handler: advance to next image manually
  photoContainer.style.cursor = 'pointer';
  photoContainer.addEventListener('click', (event) => {
    event.preventDefault();
    if (imageUrls.length > 1) {
      currentImageIndex = (currentImageIndex + 1) % imageUrls.length;
      photoImg.src = imageUrls[currentImageIndex];
    }
  });

  console.log(`[CV Photo Slideshow] Initialized with ${imageUrls.length} image(s) - scroll-driven`);

  // Return cleanup function
  return {
    destroy() {
      if (jitterIntervalId) {
        clearInterval(jitterIntervalId);
        jitterIntervalId = null;
      }
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
        scrollTimeout = null;
      }
      photoContainer.style.cursor = '';
    },
  };
}

