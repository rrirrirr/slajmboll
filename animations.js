import { Event } from './events.js';

// Animation event for global management
export const animationsEvent = Event('animations');

export function Animation(frames, update, killSignal) {
  let currentFrame = frames;

  return {
    next: () => {
      update(currentFrame);
      currentFrame--;
    },
    ended: () => killSignal(currentFrame)
  };
}

// Create a pulsating animation
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

// Create a color flash animation
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
