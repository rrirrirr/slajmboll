// Import specific movement config values
import { movement as configMovement } from '../../config.js';

/**
 * @fileoverview Defines movement generator functions for game actors.
 * These generators produce movement vectors ({x, y}) over time,
 * often controlled by duration, termination signals (like key releases),
 * and configuration parameters. They are consumed by the Actor's update loop.
 * @module movements
 */

/**
 * Represents the output of a movement generator for a single frame.
 * @typedef {Object} MovementResult
 * @property {number} x - Horizontal movement contribution this frame.
 * @property {number} y - Vertical movement contribution this frame.
 */

/**
 * Base generator for frame-based movements.
 * Yields the result of the callback for a specified number of frames or until terminated.
 *
 * @generator
 * @function frameMovement
 * @param {number} totalFrames - Maximum number of frames the movement should last.
 * @param {(remainingFrames: number) => MovementResult | number | boolean} callback
 * Function called each frame. It receives the number of frames *remaining* (counts down from totalFrames).
 * Should return a `MovementResult` object {x, y}, a number (interpreted as y-only movement),
 * or `false` to terminate the movement early.
 * @param {() => boolean} shouldTerminate
 * A function that returns `true` if the movement should terminate immediately (e.g., key released).
 * @param {Function} [onEnd=() => {}]
 * An optional callback function executed when the generator finishes,
 * either by completing all frames or by being terminated early.
 * @yields {MovementResult | number | boolean} The result from the callback function for the current frame.
 */
function* frameMovement(totalFrames, callback, shouldTerminate, onEnd = () => { }) {
  let frame = totalFrames; // Represents remaining frames
  // console.log(`frameMovement started: totalFrames=${totalFrames}, typeof shouldTerminate = ${typeof shouldTerminate}`);
  try {
    while (frame > 0) {
      // Check termination signal first
      if (typeof shouldTerminate !== 'function') {
        console.error("frameMovement FATAL: shouldTerminate is not a function!", shouldTerminate);
        break; // Stop if signal is invalid
      }
      if (shouldTerminate()) {
        // console.log("frameMovement: Terminated early by signal.");
        break;
      }

      // Execute callback, passing remaining frames
      const result = callback(frame);
      if (result === false) {
        // console.log("frameMovement: Terminated early by callback.");
        break;
      }

      yield result;
      frame--;
    }
  } finally {
    // console.log("frameMovement: Finished/Ended.");
    // console.log(`frameMovement finally block: typeof onEnd = ${typeof onEnd}`, onEnd);
    // Safety check still useful here
    if (typeof onEnd === 'function') {
      onEnd();
    } else {
      // console.warn("frameMovement finally block: onEnd was not a function!");
    }
  }
}

/**
 * Creates a standard jumping movement generator. Applies upward force while active,
 * ensuring a minimum duration even if the key is released early.
 *
 * @param {number} baseAcceleration - Base upward acceleration (should be positive, applied negatively).
 * @param {() => boolean} keyReleaseSignal - Function returning true when jump key is released.
 * @param {() => void} [onEnd] - Callback when jump finishes.
 * @returns {Generator<MovementResult, void, unknown>} Jumping movement generator.
 */
export const startJump = (baseAcceleration, keyReleaseSignal, onEnd) => {
  // console.log("Creating startJump generator with min duration..."); // Optional logging
  const maxFrames = configMovement.JUMP_MAX_FRAMES;
  const minFrames = configMovement.JUMP_MIN_DURATION_FRAMES; // Get min duration from config
  let framesElapsed = 0; // Counter for elapsed frames

  // Define the actual termination logic
  const actualShouldTerminate = () => {
    // Terminate only if:
    // 1. The minimum duration has passed AND
    // 2. The jump key has been released
    return framesElapsed >= minFrames && keyReleaseSignal();
  };

  // Define the callback for frameMovement
  const jumpCallback = (frame) => {
    framesElapsed++; // Increment elapsed frames count
    return { x: 0, y: -baseAcceleration }; // Apply upward force
  };

  // Pass the modified callback and termination logic to frameMovement
  return frameMovement(
    maxFrames,
    jumpCallback, // Use the callback that increments the counter
    actualShouldTerminate, // Use the termination logic with min duration check
    onEnd // Pass the original onEnd callback
  );
};

/**
 * Creates a wall jumping movement generator. Applies force up and away from wall.
 *
 * @param {number} baseAcceleration - Base upward acceleration.
 * @param {number} direction - Direction *away* from the wall (-1 for pushing right, 1 for pushing left).
 * @param {() => boolean} shouldTerminate - Function returning true when jump should stop.
 * @param {() => void} [onEnd] - Callback when jump finishes.
 * @returns {Generator<MovementResult, void, unknown>} Wall jump movement generator.
 */
export const startWallJump = (baseAcceleration, direction, shouldTerminate, onEnd = () => { }) => {
  // console.log("Creating startWallJump generator...");
  const jumpPower = baseAcceleration; // Base force magnitude
  const horizontalFactor = configMovement.WALL_JUMP_H_FACTOR;
  const duration = configMovement.WALL_JUMP_DURATION;
  // Pass onEnd through to frameMovement
  return frameMovement(
    duration,
    (frame) => { // Calculate force based on remaining frames
      const framePercent = frame / duration; // 1.0 down to near 0.0
      const verticalForce = -jumpPower * framePercent;
      const horizontalForce = direction * jumpPower * horizontalFactor * framePercent;
      return { x: horizontalForce, y: verticalForce };
    },
    shouldTerminate,
    onEnd
  );
};

/**
 * Creates a direction change jump generator. Higher jump with initial horizontal damping.
 *
 * @param {Object} actor - Actor object (used to dampen velocity directly).
 * @param {number} baseAcceleration - Base upward acceleration.
 * @param {() => boolean} shouldTerminate - Function returning true when jump should stop.
 * @param {() => void} [onEnd] - Callback when jump finishes.
 * @returns {Generator<MovementResult, void, unknown>} Direction change jump generator.
 */
export const startDirectionChangeJump = (actor, baseAcceleration, shouldTerminate, onEnd = () => { }) => {
  // console.log("Creating startDirectionChangeJump generator...");
  const jumpMultiplier = configMovement.DIR_CHANGE_JUMP_ACCEL_BONUS;
  const lockFrames = configMovement.DIR_CHANGE_JUMP_LOCK_FRAMES;
  const totalFrames = configMovement.DIR_CHANGE_JUMP_TOTAL_FRAMES;
  let frameCount = 0; // Internal counter for lock phase, counts up

  // Define the callback function separately
  const directionJumpCallback = (frame) => { // frame counts down
    frameCount++;
    // Calculate jump strength (example: strong initial burst decaying)
    const strength = -(baseAcceleration * jumpMultiplier) * (frame / totalFrames);

    // Dampen horizontal velocity during initial frames (direct modification - use with care)
    if (frameCount <= lockFrames && actor.velocity) {
      actor.velocity.x *= 0.15; // Apply strong damping factor
      if (Math.abs(actor.velocity.x) < 0.1) actor.velocity.x = 0;
    }

    return { x: 0, y: strength }; // Yield vertical force
  };

  // Pass arguments explicitly to frameMovement
  return frameMovement(
    totalFrames,
    directionJumpCallback,
    shouldTerminate,
    onEnd
  );
};

/**
 * Creates a standard run movement generator. Applies constant horizontal force.
 * Runs indefinitely until terminated by the signal.
 *
 * @param {number} acceleration - Horizontal acceleration per frame.
 * @param {number} direction - Direction (-1 left, 1 right).
 * @param {() => boolean} shouldTerminate - Function returning true when run should stop (e.g., key release).
 * @returns {Generator<MovementResult, void, unknown>} Running movement generator.
 */
export const startRun = (acceleration, direction, shouldTerminate) => {
  // console.log("Creating startRun generator...");
  // Immediately invoked generator function expression (IIFE returning generator)
  return (function*() {
    try {
      // console.log(`startRun executing loop (shouldTerminate=${shouldTerminate()})`);
      while (!shouldTerminate()) {
        yield { x: direction * acceleration, y: 0 };
      }
      // console.log("startRun loop finished (shouldTerminate became true).");
    } finally {
      // console.log("startRun generator ended.");
    }
  })();
};

/**
 * Creates a run movement generator with initial bonus acceleration when changing direction.
 * Runs indefinitely until terminated by the signal.
 *
 * @param {number} bonusAcceleration - Initial bonus horizontal acceleration.
 * @param {number} direction - Direction (-1 left, 1 right).
 * @param {() => boolean} shouldTerminate - Function returning true when run should stop.
 * @param {number} normalAcceleration - Acceleration to use after bonus period ends.
 * @returns {Generator<MovementResult, void, unknown>} Bonus run movement generator.
 */
export const startOppositeRun = (bonusAcceleration, direction, shouldTerminate, normalAcceleration) => {
  // console.log("Creating startOppositeRun generator...");
  const bonusFrames = configMovement.OPPOSITE_RUN_BONUS_FRAMES;
  let framesLeft = bonusFrames; // Internal state for bonus duration

  // Immediately invoked generator function expression
  return (function*() {
    try {
      // console.log(`startOppositeRun executing loop (shouldTerminate=${shouldTerminate()})`);
      while (!shouldTerminate()) {
        let currentAcceleration = (framesLeft > 0) ? bonusAcceleration : normalAcceleration;
        if (framesLeft > 0) framesLeft--; // Decrement bonus frame counter
        yield { x: direction * currentAcceleration, y: 0 };
      }
      // console.log("startOppositeRun loop finished (shouldTerminate became true).");
    } finally {
      // console.log("startOppositeRun generator ended.");
    }
  })();
};
