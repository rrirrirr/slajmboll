import { responsive } from '.../../config.js';

/**
 * Current responsive breakpoint
 * @type {string}
 */
let currentBreakpoint = 'MEDIUM';

/**
 * Check if window matches a media query
 * @param {string} query - Media query to check
 * @returns {boolean} True if the media query matches
 */
function matchesMedia(query) {
  return window.matchMedia(query).matches;
}

/**
 * Determine current breakpoint based on window width
 * @returns {string} Current breakpoint ('SMALL', 'MEDIUM', or 'LARGE')
 */
export function getCurrentBreakpoint() {
  if (matchesMedia(`(max-width: ${responsive.SMALL}px)`)) {
    return 'SMALL';
  } else if (matchesMedia(`(max-width: ${responsive.MEDIUM}px)`)) {
    return 'MEDIUM';
  } else {
    return 'LARGE';
  }
}

/**
 * Scale game elements based on screen size
 * @param {number} baseSize - Base size in pixels
 * @returns {number} Scaled size based on current breakpoint
 */
export function scaleToScreen(baseSize) {
  const breakpoint = getCurrentBreakpoint();

  switch (breakpoint) {
    case 'SMALL':
      return baseSize * 0.7;
    case 'MEDIUM':
      return baseSize * 0.85;
    case 'LARGE':
    default:
      return baseSize;
  }
}

/**
 * Add resize event listener with debounce
 * @param {Function} callback - Function to call on resize
 * @param {number} [delay=250] - Debounce delay in milliseconds
 * @returns {Function} Function to remove the event listener
 */
export function addResponsiveListener(callback, delay = 250) {
  let timeoutId;

  const handleResize = () => {
    const newBreakpoint = getCurrentBreakpoint();

    // Only trigger if breakpoint changed
    if (newBreakpoint !== currentBreakpoint) {
      currentBreakpoint = newBreakpoint;
      callback(currentBreakpoint);
    }
  };

  const debouncedResize = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(handleResize, delay);
  };

  window.addEventListener('resize', debouncedResize);

  // Initial check
  handleResize();

  // Return cleanup function
  return () => {
    clearTimeout(timeoutId);
    window.addEventListener('resize', debouncedResize);
  };
}

/**
 * Apply responsive adjustments to game elements
 * @param {Object} game - Game object to adjust
 */
export function makeGameResponsive(game) {
  const updateGameForBreakpoint = (breakpoint) => {
    const container = document.querySelector('#main');
    if (!container) return;

    // Adjust field dimensions
    const rect = container.getBoundingClientRect();
    if (game.setFieldDimensions) {
      game.setFieldDimensions({
        width: rect.width,
        height: rect.height
      });
    }

    // Scale players and ball
    if (game.scaleGameElements) {
      game.scaleGameElements(breakpoint);
    }
  };

  // Add listener for screen size changes
  return addResponsiveListener(updateGameForBreakpoint);
}
