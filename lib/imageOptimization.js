/**
 * Image optimization utilities
 * This file contains functions to optimize image loading and rendering
 */

/**
 * Generate a blur data URL for image placeholders
 * @param {string} color - The color to use for the placeholder (hex or rgb)
 * @returns {string} - A base64 encoded data URL for the placeholder
 */
export function generateBlurPlaceholder(color = '#E2E8F0') {
  // Create a small SVG with the specified color
  const svg = `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="${color}" />
    </svg>
  `;
  
  // Convert to base64
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Get the optimal image size based on the device width
 * @param {number} deviceWidth - The width of the device
 * @returns {string} - The optimal image size (w300, w500, w780, original)
 */
export function getOptimalImageSize(deviceWidth) {
  if (deviceWidth <= 640) return 'w300';
  if (deviceWidth <= 1024) return 'w500';
  if (deviceWidth <= 1280) return 'w780';
  return 'original';
}

/**
 * Generate a responsive image URL for TMDB images
 * @param {string} path - The image path from TMDB
 * @param {string} size - The size to use (w300, w500, w780, original)
 * @returns {string} - The full image URL
 */
export function getTMDBImageUrl(path, size = 'w500') {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/**
 * Preload an image to improve perceived performance
 * @param {string} url - The URL of the image to preload
 */
export function preloadImage(url) {
  if (!url) return;
  
  const img = new Image();
  img.src = url;
}

/**
 * Lazy load images with Intersection Observer
 * @param {string} selector - The CSS selector for the images to lazy load
 */
export function lazyLoadImages(selector = 'img[data-src]') {
  if (typeof window === 'undefined') return;
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('data-src');
        
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
        }
        
        observer.unobserve(img);
      }
    });
  });
  
  document.querySelectorAll(selector).forEach(img => {
    imageObserver.observe(img);
  });
} 