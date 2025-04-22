/**
 * Performance optimization utilities
 * This file contains functions to improve application performance
 */

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - The function to debounce
 * @param {number} wait - The time to wait in milliseconds
 * @returns {Function} - The debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit how often a function can be called
 * @param {Function} func - The function to throttle
 * @param {number} limit - The time limit in milliseconds
 * @returns {Function} - The throttled function
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoize function to cache results
 * @param {Function} func - The function to memoize
 * @returns {Function} - The memoized function
 */
export function memoize(func) {
  const cache = new Map();
  return function executedFunction(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = func(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Optimize database connection with connection pooling
 * @param {Function} connectDB - The database connection function
 * @returns {Function} - The optimized connection function
 */
export function optimizeDBConnection(connectDB) {
  let connectionPromise = null;
  
  return async function optimizedConnect() {
    if (connectionPromise) {
      return connectionPromise;
    }
    
    connectionPromise = connectDB();
    return connectionPromise;
  };
}

/**
 * Preload critical resources
 */
export function preloadCriticalResources() {
  if (typeof window === 'undefined') return;
  
  // Preload critical fonts
  const fontLinks = [
    { rel: 'preload', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', as: 'style' },
    { rel: 'preload', href: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' }
  ];
  
  fontLinks.forEach(link => {
    const linkElement = document.createElement('link');
    Object.entries(link).forEach(([key, value]) => {
      linkElement.setAttribute(key, value);
    });
    document.head.appendChild(linkElement);
  });
  
  // Preload critical images
  const imageUrls = [
    '/logo.png',
    '/favicon.ico'
  ];
  
  imageUrls.forEach(url => {
    const linkElement = document.createElement('link');
    linkElement.rel = 'preload';
    linkElement.href = url;
    linkElement.as = 'image';
    document.head.appendChild(linkElement);
  });
}

/**
 * Optimize React rendering with useMemo and useCallback
 * This is a helper function to create optimized components
 */
export function createOptimizedComponent(Component) {
  return function OptimizedComponent(props) {
    // This is just a placeholder - actual optimization would be done in the component
    return <Component {...props} />;
  };
}

/**
 * Implement progressive loading for images
 * @param {string} selector - The CSS selector for images to optimize
 */
export function implementProgressiveLoading(selector = 'img[data-src]') {
  if (typeof window === 'undefined') return;
  
  const imageObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.getAttribute('data-src');
          
          if (src) {
            // Load low quality image first
            const lowQualitySrc = img.getAttribute('data-low-quality-src') || src;
            img.src = lowQualitySrc;
            
            // Then load high quality image
            const highQualityImg = new Image();
            highQualityImg.src = src;
            highQualityImg.onload = () => {
              img.src = src;
              img.classList.add('loaded');
            };
            
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    },
    { rootMargin: '50px 0px' }
  );
  
  document.querySelectorAll(selector).forEach(img => {
    imageObserver.observe(img);
  });
} 