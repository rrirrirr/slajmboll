import { Event } from '../core/events.js';

/**
 * Animation event for global management
 * @type {Object}
 */
export const animationsEvent = Event('animations');

/**
 * @typedef {Object} AnimationObject
 * @property {Function} next - Advances animation to next frame
 * @property {Function} ended - Checks if animation has completed
 */

/**
 * Creates a simple animation object that runs for a specified number of frames
 * 
 * @param {number} frames - Total frames the animation should run
 * @param {Function} update - Function called each frame with the current frame count
 * @param {Function} killSignal - Function that returns true when animation should end
 * @returns {AnimationObject} Animation object with next/ended methods
 */
export function Animation(frames, update, killSignal) {
  let currentFrame = frames;

  return {
    /**
     * Advances animation to next frame
     */
    next: () => {
      update(currentFrame);
      currentFrame--;
    },
    /**
     * Checks if animation has completed
     * @returns {boolean} True if animation has ended
     */
    ended: () => killSignal(currentFrame)
  };
}

/**
 * Creates a pulsating animation on an element property
 * 
 * @param {HTMLElement} element - DOM element to animate
 * @param {string} property - CSS property to animate
 * @param {number|string} baseValue - Base value of the property
 * @param {number} amplitude - Maximum change amount
 * @param {number} duration - Duration in frames
 * @param {boolean} [cleanup=true] - Whether to reset property when done
 * @returns {AnimationObject} Animation object
 */
export function createPulseAnimation(element, property, baseValue, amplitude, duration, cleanup = true) {
  return Animation(
    duration,
    (frame) => {
      const progress = frame / duration;
      const pulseValue = baseValue + (amplitude * Math.sin(progress * Math.PI));
      element.style[property] = `${pulseValue}${typeof baseValue === 'number' ? 'px' : ''}`;

      if (frame < 2 && cleanup) {
        element.style[property] = '';
      }
    },
    (frame) => frame < 1
  );
}

/**
 * Creates an animation that flashes between two colors
 * 
 * @param {HTMLElement} element - DOM element to animate
 * @param {string} property - CSS property to animate (e.g., 'backgroundColor')
 * @param {string} startColor - Starting color (any valid CSS color)
 * @param {string} endColor - Ending color (any valid CSS color)
 * @param {number} duration - Duration in frames
 * @param {boolean} [cleanup=true] - Whether to reset property when done
 * @returns {AnimationObject} Animation object
 */
export function createColorAnimation(element, property, startColor, endColor, duration, cleanup = true) {
  return Animation(
    duration,
    (frame) => {
      const progress = 1 - (frame / duration);
      element.style[property] = progress < 0.5 ? startColor : endColor;

      if (frame < 2 && cleanup) {
        element.style[property] = '';
      }
    },
    (frame) => frame < 1
  );
}

/**
 * Creates a scaling animation
 * 
 * @param {HTMLElement} element - DOM element to animate
 * @param {number} startScale - Starting scale factor
 * @param {number} endScale - Ending scale factor
 * @param {number} duration - Duration in frames
 * @param {boolean} [cleanup=true] - Whether to reset transform when done
 * @returns {AnimationObject} Animation object
 */
export function createScaleAnimation(element, startScale, endScale, duration, cleanup = true) {
  return Animation(
    duration,
    (frame) => {
      const progress = 1 - (frame / duration);
      const scale = startScale + (endScale - startScale) * progress;
      element.style.transform = `scale(${scale})`;

      if (frame < 2 && cleanup) {
        element.style.transform = '';
      }
    },
    (frame) => frame < 1
  );
}
