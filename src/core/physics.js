import { physics as configPhysics } from '../../config.js'; // Alias import to avoid name clash

// Re-export physics constants from config for convenience elsewhere
export { configPhysics };

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
 * @typedef {Object} Dimensions
 * @property {number} width - Width of the object
 * @property {number} height - Height of the object
 * @property {number} [radius] - Radius for circular objects
 */

/**
 * @typedef {Object} Boundaries
 * @property {number} left - Left boundary
 * @property {number} right - Right boundary
 * @property {number} ground - Ground level (bottom boundary)
 * @property {number} [top] - Top boundary (optional)
 */

/**
 * @typedef {Object} CollisionResult
 * @property {boolean} collided - Whether a collision occurred
 * @property {Position} position - Adjusted position after collision
 * @property {Velocity} velocity - Adjusted velocity after collision
 * @property {string} [type] - Type of collision ('ground', 'ceiling', 'left', 'right', 'net', etc.)
 * @property {number} [direction] - Direction of collision (-1 for left, 1 for right, 0 for none)
 */

/** A small constant to prevent division by zero errors. */
const EPSILON = 1e-6;

// --- General Math/Geometry Utilities ---

/**
 * Clamps a value between a minimum and maximum value.
 * @param {number} value The value to clamp.
 * @param {number} min The minimum allowed value.
 * @param {number} max The maximum allowed value.
 * @returns {number} The clamped value.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

/**
 * Calculates the distance between two points.
 * @param {Position} p1 - First position.
 * @param {Position} p2 - Second position.
 * @returns {number} Distance between the points.
 */
export const calculateDistance = (p1, p2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// --- Core Physics Calculations ---

/**
 * Calculates the next position based on current position and velocity.
 * @param {Position} position - Current position.
 * @param {Velocity} velocity - Current velocity.
 * @returns {Position} Next potential position.
 */
export const calculateNextPosition = (position, velocity) => {
  return {
    x: position.x + velocity.x,
    y: position.y + velocity.y
  };
};

/**
 * Applies gravity to a velocity vector (returns a new vector).
 * @param {Velocity} velocity - Current velocity.
 * @param {number} [gravity=configPhysics.GRAVITY] - Gravity strength.
 * @returns {Velocity} Velocity vector with gravity applied for one step.
 */
export const applyGravity = (velocity, gravity = configPhysics.GRAVITY) => {
  // Modifies Y component only
  return {
    x: velocity.x,
    y: velocity.y + gravity
  };
};

/**
 * Applies deceleration (friction) to horizontal movement IN-PLACE.
 * @param {Velocity} velocity - Velocity object to modify.
 * @param {number} frictionFactor - Friction factor (e.g., 0.85 means 15% slowdown).
 */
export const applyDeceleration = (velocity, frictionFactor) => {
  let newVelocityX = velocity.x * frictionFactor;
  // Stop completely if velocity is very small to prevent creep
  if (Math.abs(newVelocityX) < 0.1) {
    newVelocityX = 0;
  }
  // Modify the original object's x property directly
  velocity.x = newVelocityX;
};

/**
 * Caps velocity within maximum bounds (returns a new vector).
 * @param {Velocity} velocity - Current velocity.
 * @param {number} maxHorizontal - Maximum horizontal velocity.
 * @param {number} [maxUpward=maxHorizontal] - Maximum upward velocity (absolute value).
 * @param {number} [maxDownward=configPhysics.TERMINAL_VELOCITY] - Maximum downward velocity.
 * @returns {Velocity} Velocity vector capped within limits.
 */
export const capVelocity = (
  velocity,
  maxHorizontal,
  maxUpward = maxHorizontal, // Use provided maxHorizontal as default for upward cap
  maxDownward = configPhysics.TERMINAL_VELOCITY
) => {
  let vx = velocity.x;
  let vy = velocity.y;

  // Cap horizontal (positive and negative)
  if (Math.abs(vx) > maxHorizontal) {
    vx = Math.sign(vx) * maxHorizontal;
  }

  // Cap vertical upward (negative y)
  if (vy < 0 && Math.abs(vy) > maxUpward) {
    vy = -maxUpward;
  }

  // Cap vertical downward (positive y)
  if (vy > maxDownward) {
    vy = maxDownward;
  }

  return { x: vx, y: vy };
};

/**
 * Calculates bounce velocity after collision (returns a new vector).
 * @param {Velocity} velocity - Velocity just before impact.
 * @param {number} bounceFactor - Energy preservation factor (0-1).
 * @param {string} direction - Axis of bounce ('horizontal' or 'vertical').
 * @returns {Velocity} Velocity vector after the bounce.
 */
export const calculateBounce = (velocity, bounceFactor, direction) => {
  if (direction === 'horizontal') {
    return { x: -velocity.x * bounceFactor, y: velocity.y };
  } else { // Assume 'vertical'
    return { x: velocity.x, y: -velocity.y * bounceFactor };
  }
};

// --- Collision Detection Helpers ---

/**
 * Checks for collision between two circles.
 * @param {Position} p1 - Center of first circle.
 * @param {number} r1 - Radius of first circle.
 * @param {Position} p2 - Center of second circle.
 * @param {number} r2 - Radius of second circle.
 * @returns {boolean} True if circles are overlapping.
 */
export const circlesCollide = (p1, r1, p2, r2) => {
  const distance = calculateDistance(p1, p2);
  return distance < (r1 + r2);
};

/**
 * Checks for collision between a circle and a line segment.
 * @param {number} p1x - Start X of segment.
 * @param {number} p1y - Start Y of segment.
 * @param {number} p2x - End X of segment.
 * @param {number} p2y - End Y of segment.
 * @param {object} circleGeom - Circle geometry {x, y, radius}.
 * @returns {boolean} True if collision occurs.
 */
export function checkCollisionCircleSegment(p1x, p1y, p2x, p2y, circleGeom) {
  // Find the closest point on the infinite line containing the segment
  const lineLenSq = (p2x - p1x) ** 2 + (p2y - p1y) ** 2;
  let t = 0; // Parameter along the line segment (0=p1, 1=p2)
  if (lineLenSq > EPSILON) { // Avoid division by zero
    t = ((circleGeom.x - p1x) * (p2x - p1x) + (circleGeom.y - p1y) * (p2y - p1y)) / lineLenSq;
    t = clamp(t, 0, 1); // Clamp t to be within the segment [0, 1]
  }

  // Calculate coordinates of the closest point on the segment
  const closestX = p1x + t * (p2x - p1x);
  const closestY = p1y + t * (p2y - p1y);

  // Calculate distance squared from circle center to closest point
  const dx = circleGeom.x - closestX;
  const dy = circleGeom.y - closestY;
  const distanceSquared = dx * dx + dy * dy;

  // Check if the distance is less than the circle's radius squared
  return distanceSquared < circleGeom.radius * circleGeom.radius;
}

/**
 * Detects collision between a rectangle and a circle.
 * @param {Position} rectPos - Center position of the rectangle.
 * @param {number} rectWidth - Width of the rectangle.
 * @param {number} rectHeight - Height of the rectangle.
 * @param {Position} circlePos - Position of the circle's center.
 * @param {number} circleRadius - Radius of the circle.
 * @returns {boolean} True if collision detected.
 */
export const rectCircleCollide = (rectPos, rectWidth, rectHeight, circlePos, circleRadius) => {
  const halfWidth = rectWidth / 2;
  const halfHeight = rectHeight / 2;
  const rectLeft = rectPos.x - halfWidth;
  const rectRight = rectPos.x + halfWidth;
  const rectTop = rectPos.y - halfHeight; // Assuming Y increases downwards
  const rectBottom = rectPos.y + halfHeight;

  // Find the closest point on the rectangle to the circle's center
  const closestX = clamp(circlePos.x, rectLeft, rectRight);
  const closestY = clamp(circlePos.y, rectTop, rectBottom);

  // Calculate the distance squared between the circle's center and this closest point
  const distanceSquared = (circlePos.x - closestX) ** 2 + (circlePos.y - closestY) ** 2;

  // If the distance is less than the square of the circle's radius, an overlap occurs
  return distanceSquared < (circleRadius * circleRadius);
};


// --- Collision Response Helpers ---

/**
 * Calculates collision response between two circular entities using billiard physics.
 * Can optionally accept pre-calculated collision normal.
 * @param {Position} p1 - Position of first entity.
 * @param {Velocity} v1 - Velocity of first entity.
 * @param {number} m1 - Mass of first entity.
 * @param {Position} p2 - Position of second entity.
 * @param {Velocity} v2 - Velocity of second entity.
 * @param {number} m2 - Mass of second entity.
 * @param {number} [restitution=configPhysics.SLIME_BOUNCE_FACTOR] - Elasticity (0=inelastic, 1=perfectly elastic).
 * @param {number|null} [nx_in=null] - Pre-calculated collision normal x component.
 * @param {number|null} [ny_in=null] - Pre-calculated collision normal y component.
 * @returns {{v1: Velocity, v2: Velocity}} New velocities for both entities.
 */
export const resolveCircleCollision = (
  p1, v1, m1,
  p2, v2, m2,
  restitution = configPhysics.SLIME_BOUNCE_FACTOR, // Use config default
  nx_in = null, ny_in = null
) => {
  let nx = nx_in;
  let ny = ny_in;

  // Recalculate normal if not provided
  if (nx === null || ny === null) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.max(Math.sqrt(dx * dx + dy * dy), EPSILON); // Use local EPSILON
    nx = dx / distance;
    ny = dy / distance;
  }

  // Calculate relative velocity
  const dvx = v1.x - v2.x;
  const dvy = v1.y - v2.y;

  // Calculate velocity along the normal (dot product)
  const velocityAlongNormal = dvx * nx + dvy * ny;

  // Early exit if objects are moving away (velocityAlongNormal > 0)
  if (velocityAlongNormal > 0) {
    return { v1, v2 };
  }

  // Calculate impulse scalar (j)
  const impulseFactor = (-(1 + restitution) * velocityAlongNormal) / (1 / m1 + 1 / m2);

  // Calculate impulse vector components
  const impulseX = impulseFactor * nx;
  const impulseY = impulseFactor * ny;

  // Apply impulse to calculate new velocities
  // v1_new = v1 + impulse / m1
  // v2_new = v2 - impulse / m2
  return {
    v1: {
      x: v1.x + (impulseX / m1),
      y: v1.y + (impulseY / m1)
    },
    v2: {
      x: v2.x - (impulseX / m2),
      y: v2.y - (impulseY / m2)
    }
  };
};

/**
 * Reflects a velocity vector off a surface with a given normal.
 * @param {Velocity} velocity - Incoming velocity.
 * @param {{x: number, y: number}} normal - Surface normal vector (should be normalized).
 * @param {number} restitution - Bounce energy preservation factor (0-1).
 * @returns {Velocity} Reflected velocity vector.
 */
export const reflectVelocity = (velocity, normal, restitution) => {
  // Calculate dot product: v . n
  const dot = velocity.x * normal.x + velocity.y * normal.y;

  // Calculate reflected velocity: v' = v - 2 * (v . n) * n * restitution
  // Note: Using (1 + restitution) might be more physically accurate for bouncing,
  // but 2*dot is common in simple reflection examples. Let's stick to the formula provided previously.
  // Adjusted formula for typical physics engine bounce: v' = v - (1 + e)(v . n)n
  const impulseFactor = -(1 + restitution) * dot; // Factor applied along normal

  return {
    x: velocity.x + impulseFactor * normal.x,
    y: velocity.y + impulseFactor * normal.y,
    // Original simpler (less accurate bounce) reflection:
    // x: velocity.x - (2 * dot * normal.x) * restitution,
    // y: velocity.y - (2 * dot * normal.y) * restitution
  };
};

/**
 * Applies separation force to prevent objects from sticking after collision.
 * Modifies positions IN-PLACE.
 * @param {Position} pos1 - Position of first object (e.g., ball).
 * @param {number} radius1 - Radius of first object.
 * @param {Position} pos2 - Position of second object (e.g., slime center/base).
 * @param {number} radius2 - Radius of second object.
 * @param {number} [separationShare=0.5] - How much separation to apply to pos1 (0 to 1). pos2 gets (1-separationShare).
 */
export function applySeparation(pos1, radius1, pos2, radius2, separationShare = 0.5) {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const distance = Math.max(Math.sqrt(dx * dx + dy * dy), EPSILON); // Use local EPSILON
  const combinedRadii = radius1 + radius2;
  const overlap = combinedRadii - distance;

  if (overlap > 0) {
    // Calculate separation vector along the collision normal
    const separationX = (dx / distance) * overlap;
    const separationY = (dy / distance) * overlap;

    // Apply separation proportionally (modify objects directly)
    pos1.x += separationX * separationShare;
    pos1.y += separationY * separationShare;
    pos2.x -= separationX * (1 - separationShare);
    pos2.y -= separationY * (1 - separationShare);
  }
}


// --- Potentially Deprecated / Actor-Handled Logic ---
// These functions handle combinations of physics effects that are now
// likely handled within the Actor object's update method. Keep for reference or remove.

/**
 * Checks for collision with ground and adjusts position and velocity.
 * DEPRECATED: Actor handles ground collision internally.
 * @param {Position} position Current position.
 * @param {Velocity} velocity Current velocity.
 * @param {number} radius Object radius.
 * @param {number} ground Ground level.
 * @param {number} [bounceFactor=configPhysics.BOUNCE_FACTOR] Bounce factor.
 * @returns {CollisionResult} Collision result.
 */
// export const handleGroundCollision = (...) => { ... };

/**
 * Checks for collision with walls (left/right boundaries) and adjusts position and velocity.
 * DEPRECATED: Actor handles wall collision internally.
 * @param {Position} position Current position.
 * @param {Velocity} velocity Current velocity.
 * @param {number} radius Object radius.
 * @param {number} leftBoundary Left boundary.
 * @param {number} rightBoundary Right boundary.
 * @param {number} [bounceFactor=configPhysics.BOUNCE_FACTOR] Bounce factor.
 * @returns {CollisionResult} Collision result.
 */
// export const handleWallCollision = (...) => { ... };

/**
 * Checks for collision with a vertical line (net) and adjusts position and velocity.
 * DEPRECATED: Actor handles net collision internally.
 * @param {Position} position Current position.
 * @param {Velocity} velocity Current velocity.
 * @param {number} radius Object radius.
 * @param {number} netX X position of the net.
 * @param {number} netTop Top position of the net.
 * @param {number} netWidth Width of the net.
 * @param {number} [bounceFactor=configPhysics.BOUNCE_FACTOR] Bounce factor.
 * @returns {CollisionResult} Collision result.
 */
// export const handleNetCollision = (...) => { ... };

/**
 * Calculates the scaling factor based on field width.
 * DEPRECATED? Physics scale seems baked into K now.
 * @param {number} fieldWidth Width of the playing field.
 * @returns {number} Scaling factor (fieldWidth / K).
 */
// export const calculatePhysicsScale = (fieldWidth) => fieldWidth / configPhysics.K;

/**
 * Applies all physics calculations for a complete update cycle.
 * DEPRECATED: Actor's update method should handle this sequence.
 */
// export const updatePhysics = (...) => { ... };
