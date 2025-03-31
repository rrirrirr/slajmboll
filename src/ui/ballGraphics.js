import { physics as configPhysics, dimensions as configDimensions } from '../../config.js';

/**
 * Graphics handler for the Ball entity.
 * Manages the DOM element creation, updates, and styling.
 * @module ballGraphics
 */

/**
 * Calculates the ball's diameter based on field dimensions and config.
 * @param {Object} field - Field dimensions { width }. Requires width property.
 * @param {Object} ballDims - Ball dimensions from config { radius }. Requires radius property.
 * @returns {number} The calculated ball diameter in pixels.
 */
export function calculateBallSize(field, ballDims) {
  // Provide a fallback size if field width is unavailable
  const fallbackSize = 40;
  if (!field || !field.width) {
    console.warn("calculateBallSize: Field dimensions unavailable, using fallback size.");
    return fallbackSize;
  }
  if (!ballDims || typeof ballDims.radius !== 'number') {
    console.warn("calculateBallSize: Ball dimensions unavailable, using fallback size.");
    return fallbackSize;
  }
  if (!configPhysics || typeof configPhysics.K !== 'number') {
    console.warn("calculateBallSize: Physics config (K) unavailable, using fallback size.");
    return fallbackSize;
  }

  // Calculate size based on field width, scaling constant K, and ball's relative radius
  const areaWidth = field.width;
  const scaledRadius = (areaWidth / configPhysics.K) * ballDims.radius;

  // Return diameter (radius * 2), ensuring it's a positive number
  return Math.max(1, scaledRadius * 2);
}

/**
 * Creates the DOM element for the ball.
 * @param {Object} field - Field dimensions for initial size calculation.
 * @param {Object} ballConfigDims - Ball dimensions from config (e.g., configDimensions.BALL_RADIUS).
 * @returns {{element: HTMLElement, initialSize: number}} An object containing the new DOM element and its initial calculated size (diameter).
 */
export function createBallElement(field, ballConfigDims) {
  const element = document.createElement('div');
  element.classList.add('ball'); // Ensure 'ball' class is added for CSS styling

  // Calculate initial size based on provided field and config dimensions
  const initialSize = calculateBallSize(field, ballConfigDims);
  element.style.width = `${initialSize}px`;
  element.style.height = `${initialSize}px`;

  // Set a default visual style (can be overridden by CSS or setColor)
  element.style.backgroundColor = 'rebeccapurple'; // Default color
  element.style.borderRadius = '50%';
  element.style.position = 'absolute'; // Essential for positioning
  element.style.zIndex = '60'; // Ensure it's typically above slimes/net

  return { element, initialSize };
}

/**
 * Updates the size of the ball's DOM element.
 * @param {HTMLElement} element - The ball DOM element.
 * @param {number} newSize - The new diameter in pixels.
 */
export function updateBallElementSize(element, newSize) {
  if (element && typeof newSize === 'number' && newSize > 0) {
    element.style.width = `${newSize}px`;
    element.style.height = `${newSize}px`;
  } else if (element) {
    console.warn("updateBallElementSize: Invalid size provided.", newSize);
  }
}

/**
 * Renders the ball's position by updating the DOM element's style.
 * @param {HTMLElement} element - The ball DOM element.
 * @param {Object} position - The ball's physics position { x, y }.
 * @param {number} currentSize - The ball's current diameter (needed for centering).
 */
export function renderBall(element, position, currentSize) {
  if (element && position && typeof currentSize === 'number') {
    // Position the element based on its center
    element.style.left = `${position.x - currentSize / 2}px`;
    element.style.top = `${position.y - currentSize / 2}px`;
  }
}

/**
 * Sets the background color of the ball element.
 * @param {HTMLElement} element - The ball DOM element.
 * @param {string} color - A valid CSS color string.
 */
export function setBallColor(element, color) {
  if (element && typeof color === 'string') {
    element.style.backgroundColor = color;
  }
}
