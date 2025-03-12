import { physics } from '.../config.js';

/**
 * @typedef {Object} Position
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * @typedef {Object} Velocity
 * @property {number} x - Horizontal velocity component
 * @property {number} y - Vertical velocity component
 */

/**
 * Calculates the next position based on current position and velocity
 * 
 * @param {Position} position - Current position
 * @param {Velocity} velocity - Current velocity
 * @returns {Position} Next position
 */
export const calculateNextPosition = (position, velocity) => {
  return {
    x: position.x + velocity.x,
    y: position.y + velocity.y
  };
};

/**
 * Applies gravity to a velocity vector
 * 
 * @param {Velocity} velocity - Current velocity
 * @param {number} [gravity=physics.GRAVITY] - Gravity strength
 * @returns {Velocity} Updated velocity with gravity applied
 */
export const applyGravity = (velocity, gravity = physics.GRAVITY) => {
  return {
    x: velocity.x,
    y: velocity.y + gravity
  };
};

/**
 * Applies deceleration (friction) to horizontal movement
 * 
 * @param {Velocity} velocity - Current velocity
 * @param {number} deceleration - Deceleration amount
 * @returns {Velocity} Updated velocity with deceleration applied
 */
export const applyDeceleration = (velocity, deceleration) => {
  let newVelocityX = velocity.x;

  // Apply deceleration in opposite direction of movement
  newVelocityX += deceleration * -Math.sign(newVelocityX);

  // Stop completely if velocity is very small
  if (Math.abs(deceleration) > Math.abs(newVelocityX)) {
    newVelocityX = 0;
  }

  return {
    x: newVelocityX,
    y: velocity.y
  };
};

/**
 * Caps velocity within maximum bounds
 * 
 * @param {Velocity} velocity - Current velocity
 * @param {number} maxHorizontal - Maximum horizontal velocity
 * @param {number} [maxUpward=maxHorizontal] - Maximum upward velocity
 * @returns {Velocity} Capped velocity
 */
export const capVelocity = (velocity, maxHorizontal, maxUpward = maxHorizontal) => {
  let vx = velocity.x;
  let vy = velocity.y;

  // Cap horizontal velocity
  if (Math.abs(vx) > maxHorizontal) {
    vx = Math.sign(vx) * maxHorizontal;
  }

  // Cap vertical velocity
  if (-vy > maxUpward) {
    vy = -maxUpward;
  }
  if (vy > physics.TERMINAL_VELOCITY) {
    vy = physics.TERMINAL_VELOCITY;
  }

  return { x: vx, y: vy };
};

/**
 * Calculates bounce velocity after collision
 * 
 * @param {Velocity} velocity - Current velocity
 * @param {number} bounceFactor - Energy preservation factor (0-1)
 * @param {string} direction - Bounce direction ('horizontal' or 'vertical')
 * @returns {Velocity} Post-bounce velocity
 */
export const calculateBounce = (velocity, bounceFactor, direction) => {
  // direction can be 'horizontal' or 'vertical'
  if (direction === 'horizontal') {
    return {
      x: -velocity.x * bounceFactor,
      y: velocity.y
    };
  } else {
    return {
      x: velocity.x,
      y: -velocity.y * bounceFactor
    };
  }
};

/**
 * Calculates distance between two points
 * 
 * @param {Position} p1 - First position
 * @param {Position} p2 - Second position
 * @returns {number} Distance between points
 */
export const calculateDistance = (p1, p2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Checks for collision between two circles
 * 
 * @param {Position} p1 - Center of first circle
 * @param {number} r1 - Radius of first circle
 * @param {Position} p2 - Center of second circle
 * @param {number} r2 - Radius of second circle
 * @returns {boolean} True if circles are colliding
 */
export const circlesCollide = (p1, r1, p2, r2) => {
  const distance = calculateDistance(p1, p2);
  return distance < (r1 + r2);
};

/**
 * Calculates collision response between two entities
 * 
 * @param {Position} p1 - Position of first entity
 * @param {Velocity} v1 - Velocity of first entity
 * @param {number} m1 - Mass of first entity
 * @param {Position} p2 - Position of second entity
 * @param {Velocity} v2 - Velocity of second entity
 * @param {number} m2 - Mass of second entity
 * @param {number} restitution - Elasticity of collision (0-1)
 * @returns {Object} New velocities for both entities
 */
export const resolveCollision = (p1, v1, m1, p2, v2, m2, restitution) => {
  // Calculate collision normal
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Normalize the collision normal
  const nx = dx / distance;
  const ny = dy / distance;

  // Calculate relative velocity along normal
  const vx = v1.x - v2.x;
  const vy = v1.y - v2.y;
  const vn = vx * nx + vy * ny;

  // Don't resolve if objects are moving away from each other
  if (vn > 0) return { v1, v2 };

  // Calculate impulse scalar
  const impulseScalar = -(1 + restitution) * vn / (1 / m1 + 1 / m2);

  // Apply impulse
  const impulseX = impulseScalar * nx;
  const impulseY = impulseScalar * ny;

  // Calculate new velocities
  return {
    v1: {
      x: v1.x + impulseX / m1,
      y: v1.y + impulseY / m1
    },
    v2: {
      x: v2.x - impulseX / m2,
      y: v2.y - impulseY / m2
    }
  };
};

/**
 * Reflects a velocity vector off a surface with normal
 * 
 * @param {Velocity} velocity - Incoming velocity
 * @param {Object} normal - Surface normal vector {x, y}
 * @param {number} restitution - Energy preservation factor (0-1)
 * @returns {Velocity} Reflected velocity
 */
export const reflectVelocity = (velocity, normal, restitution) => {
  // Calculate dot product
  const dot = velocity.x * normal.x + velocity.y * normal.y;

  // Calculate reflection
  return {
    x: velocity.x - (2 * dot * normal.x) * restitution,
    y: velocity.y - (2 * dot * normal.y) * restitution
  };
};
