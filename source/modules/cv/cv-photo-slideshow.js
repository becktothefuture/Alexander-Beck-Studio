// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           CV PHOTO SLIDESHOW                                 ║
// ║                                                                              ║
// ║  Scroll-driven: Photo changes as you scroll through CV text                 ║
// ║  Cycles through all images based on scroll progress (0% to 100%)            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const SLIDESHOW_CONFIG = {
  imageFolder: 'images/cv-images/',
  images: [
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

// Static centered position (no jitter, no rotation)
const JITTER_POSITIONS = [
  { x: -50, y: -50, rotate: 0 },
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
    const scrollHeight = scrollContainer.scrollHeight;
    const clientHeight = scrollContainer.clientHeight;
    const maxScroll = scrollHeight - clientHeight;
    
    // Calculate scroll progress (0 to 1)
    const scrollProgress = maxScroll > 0 ? scrollTop / maxScroll : 0;
    
    // Map scroll progress to image index (evenly distributed across all 10 images)
    // Each image gets an equal slice of the scroll range (0-10%, 10-20%, etc.)
    const targetIndex = Math.min(
      Math.floor(scrollProgress * imageUrls.length),
      imageUrls.length - 1
    );
    
    // Debug logging
    console.log(`[CV Scroll Debug] top:${scrollTop.toFixed(0)} max:${maxScroll.toFixed(0)} progress:${(scrollProgress * 100).toFixed(1)}% → img ${targetIndex + 1}/${imageUrls.length}`);
    
    // Update image (even if same index, to ensure it's set)
    if (targetIndex !== currentImageIndex) {
      currentImageIndex = targetIndex;
      photoImg.src = imageUrls[currentImageIndex];
      console.log(`[CV Photo] ✓ Changed to image ${targetIndex + 1}`);
    }
  }

  // Set initial image and position (static, no animation)
  photoImg.src = imageUrls[0];
  applyJitterPosition();

  // Jitter animation disabled - image stays centered
  // jitterIntervalId = setInterval(applyJitterPosition, SLIDESHOW_CONFIG.jitterInterval);

  // Listen to scroll events (immediate, no debounce for testing)
  scrollContainer.addEventListener('scroll', () => {
    updateImageFromScroll();
  }, { passive: true });
  
  // Also update on initial load
  setTimeout(() => {
    updateImageFromScroll();
  }, 500);

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

