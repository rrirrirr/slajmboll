/**
 * @typedef {Object} MovementResult
 * @property {number} x - Horizontal movement contribution
 * @property {number} y - Vertical movement contribution
 */

/**
 * @typedef {Object} MovementObject
 * @property {Function} next - Get next movement update
 * @property {Function} ended - Check if movement has ended
 */

/**
 * Creates a movement object with next and ended methods
 * 
 * @param {Function} movementFn - Generator function that produces movement
 * @returns {MovementObject} Movement object
 */
function Movement(movementFn) {
  let hasEnded = false;

  /**
   * Get the next movement update
   * @returns {MovementResult|boolean} Movement values or false if ended
   */
  const next = () => {
    try {
      const result = movementFn();
      if (result === false || result.x === false || result.y === false) {
        hasEnded = true;
        return { x: 0, y: 0 };
      }
      return result;
    } catch (error) {
      console.error("Error in movement:", error);
      hasEnded = true;
      return { x: 0, y: 0 };
    }
  };

  /**
   * Check if the movement has ended
   * @returns {boolean} True if movement has ended
   */
  const ended = () => hasEnded;

  return { next, ended };
}

/**
 * Create a jumping movement
 * 
 * @param {number} acceleration - Jump acceleration
 * @param {Function} killSignal - Function that returns true when jump should end
 * @param {Function} [end] - Callback when jump ends
 * @returns {MovementObject} Jumping movement
 */
export const startJump = (acceleration, killSignal, end) => {
  const jumpPower = acceleration * 10;

  let frameCount = 0;
  const maxFrames = 20;
  const minFrames = 6;

  const jumpMovement = frameMovement(
    maxFrames,
    (frame) => {
      frameCount++;

      // Upward force that decreases linearly
      const strength = -jumpPower * (1 - (frameCount / maxFrames) * 0.6);
      return strength;
    },
    () => {
      return killSignal() && frameCount >= minFrames;
    },
    end
  );

  return Movement(() => {
    const yValue = jumpMovement.next().value;
    return { x: 0, y: yValue };
  });
};

/**
 * Create a wall jumping movement
 * 
 * @param {number} acceleration - Jump acceleration
 * @param {number} direction - Direction (-1 for left, 1 for right)
 * @param {Function} killSignal - Function that returns true when jump should end
 * @param {Function} [end] - Callback when jump ends
 * @returns {MovementObject} Wall jump movement
 */
export const startWallJump = (
  acceleration,
  direction,
  killSignal,
  end = () => { }
) => {
  const jumpPower = acceleration * 8;
  const horizontalFactor = 0.2;

  const fm = frameMovement(
    20,
    (frame) => {
      const framePercent = frame / 20;
      // Minimal horizontal force, normal vertical
      const horizontalForce = direction * jumpPower * horizontalFactor * framePercent;
      const verticalForce = -jumpPower * framePercent;

      return {
        x: horizontalForce,
        y: verticalForce
      };
    },
    killSignal,
    end
  );

  return Movement(() => {
    return fm.next().value;
  });
};

/**
 * Create a direction change jump movement
 * 
 * @param {number} acceleration - Jump acceleration
 * @param {number} direction - Direction (-1 for left, 1 for right)
 * @param {Function} killSignal - Function that returns true when jump should end
 * @param {Function} [end] - Callback when jump ends
 * @returns {MovementObject} Direction change jump movement
 */
export const startDirectionChangeJump = (acceleration, direction, killSignal, end = () => { }) => {
  const jumpPower = acceleration * 9.6;

  const fm = frameMovement(
    25,
    (frame) => {
      const framePercent = frame / 25;

      return {
        x: 0,
        y: -jumpPower * framePercent
      };
    },
    killSignal,
    end
  );

  return Movement(() => {
    return fm.next().value;
  });
};

/**
 * Create a standard run movement
 * 
 * @param {number} acceleration - Run acceleration
 * @param {number} direction - Direction (-1 for left, 1 for right)
 * @param {Function} killSignal - Function that returns true when run should end
 * @returns {MovementObject} Running movement
 */
export const startRun = (acceleration, direction, killSignal) => {
  return Movement(() => {
    if (killSignal()) {
      return false;
    }
    return { x: direction * acceleration, y: 0 };
  });
};

/**
 * Create a run movement in the opposite direction (for bonus acceleration)
 * 
 * @param {number} acceleration - Run acceleration
 * @param {number} direction - Direction (-1 for left, 1 for right)
 * @param {Function} killSignal - Function that returns true when run should end
 * @param {Function} end - Callback when run ends
 * @returns {MovementObject} Opposite direction run movement
 */
export const startOppositeRun = (acceleration, direction, killSignal, end) => {
  let framesLeft = 20;

  return Movement(() => {
    if (killSignal() || framesLeft <= 0) {
      end();
      return false;
    }

    framesLeft--;
    return { x: direction * acceleration, y: 0 };
  });
};

/**
 * Create a frame-by-frame movement generator
 * 
 * @param {number} frames - Number of frames to run
 * @param {Function} callback - Function that returns movement values for each frame
 * @param {Function} termination - Function that returns true when movement should end
 * @param {Function} [end] - Callback when movement ends
 * @returns {Generator} Movement generator
 */
function* frameMovement(frames, callback, termination, end = () => { }) {
  let currentFrame = frames;

  try {
    while (currentFrame > 0 && !termination()) {
      yield callback(currentFrame);
      currentFrame--;
    }
  } finally {
    if (typeof end === 'function') {
      end(currentFrame);
    }
  }

  return false;
}

/**
 * Create a direction change bonus movement
 * 
 * @param {Object} unit - Unit to apply bonus to
 * @param {number} direction - Direction (-1 for left, 1 for right)
 * @param {number} frames - Number of frames to apply bonus
 * @param {number} bonus - Bonus amount
 * @param {number} decrease - How much to decrease bonus each frame
 * @returns {Generator} Bonus movement generator
 */
function* directionChangeBonus(unit, direction, frames, bonus, decrease) {
  let inc = bonus;
  yield true;
  unit.bonusAcceleration = unit.bonusAcceleration || 0;
  unit.bonusAcceleration += bonus;
  while (frames-- > 0 && unit.runningDirection === direction) {
    unit.bonusAcceleration -= decrease;
    inc -= decrease;
    yield true;
  }
  unit.bonusAcceleration -= inc;
  return false;
}
