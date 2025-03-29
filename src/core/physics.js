import { physics } from '../../config.js';

// Re-export physics constants for easy access
export { physics };

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
 * Applies deceleration (friction) to horizontal movement IN-PLACE.
 *
 * @param {Velocity} velocity - Velocity object to modify.
 * @param {number} frictionFactor - Friction factor (e.g., 0.85).
 */
export const applyDeceleration = (velocity, frictionFactor) => {
  let newVelocityX = velocity.x * frictionFactor;

  // Stop completely if velocity is very small
  if (Math.abs(newVelocityX) < 0.1) {
    newVelocityX = 0;
  }
  // Modify the original object's x property
  velocity.x = newVelocityX;
  // No return needed
};

/**
 * Caps velocity within maximum bounds
 * 
 * @param {Velocity} velocity - Current velocity
 * @param {number} maxHorizontal - Maximum horizontal velocity
 * @param {number} [maxUpward=maxHorizontal] - Maximum upward velocity
 * @param {number} [maxDownward=physics.TERMINAL_VELOCITY] - Maximum downward velocity
 * @returns {Velocity} Capped velocity
 */
export const capVelocity = (
  velocity,
  maxHorizontal,
  maxUpward = maxHorizontal,
  maxDownward = physics.TERMINAL_VELOCITY
) => {
  let vx = velocity.x;
  let vy = velocity.y;

  // Cap horizontal velocity
  if (Math.abs(vx) > maxHorizontal) {
    vx = Math.sign(vx) * maxHorizontal;
  }

  // Cap vertical velocity (upward)
  if (-vy > maxUpward) {
    vy = -maxUpward;
  }

  // Cap vertical velocity (downward)
  if (vy > maxDownward) {
    vy = maxDownward;
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
 * Checks for collision with ground and adjusts position and velocity
 * 
 * @param {Position} position - Current position
 * @param {Velocity} velocity - Current velocity
 * @param {number} radius - Object radius
 * @param {number} ground - Ground level
 * @param {number} [bounceFactor=physics.BOUNCE_FACTOR] - Bounce energy preservation factor
 * @returns {CollisionResult} Collision result with adjusted position and velocity
 */
export const handleGroundCollision = (
  position,
  velocity,
  radius,
  ground,
  bounceFactor = physics.BOUNCE_FACTOR
) => {
  const result = {
    collided: false,
    position: { ...position },
    velocity: { ...velocity },
    type: null
  };

  // Check if object is colliding with ground
  if (position.y + radius >= ground) {
    result.collided = true;
    result.type = 'ground';

    // Adjust position to sit exactly on the ground
    result.position.y = ground - radius;

    // If moving downward with sufficient velocity, bounce
    if (velocity.y > 0.5) {
      result.velocity.y = -velocity.y * bounceFactor;
    } else {
      // Stop vertical movement if velocity is too small
      result.velocity.y = 0;
    }
  }

  return result;
};

/**
 * Checks for collision with walls (left/right boundaries) and adjusts position and velocity
 * 
 * @param {Position} position - Current position
 * @param {Velocity} velocity - Current velocity
 * @param {number} radius - Object radius
 * @param {number} leftBoundary - Left boundary
 * @param {number} rightBoundary - Right boundary
 * @param {number} [bounceFactor=physics.BOUNCE_FACTOR] - Bounce energy preservation factor
 * @returns {CollisionResult} Collision result with adjusted position and velocity
 */
export const handleWallCollision = (
  position,
  velocity,
  radius,
  leftBoundary,
  rightBoundary,
  bounceFactor = physics.BOUNCE_FACTOR
) => {
  const result = {
    collided: false,
    position: { ...position },
    velocity: { ...velocity },
    type: null,
    direction: 0
  };

  // Check left boundary collision
  if (position.x - radius <= leftBoundary) {
    result.collided = true;
    result.type = 'left';
    result.direction = -1;

    // Adjust position to sit exactly at the boundary
    result.position.x = leftBoundary + radius;

    // Bounce if moving with sufficient velocity
    if (Math.abs(velocity.x) > 0.1) {
      result.velocity.x = -velocity.x * bounceFactor;
    } else {
      result.velocity.x = 0;
    }
  }
  // Check right boundary collision
  else if (position.x + radius >= rightBoundary) {
    result.collided = true;
    result.type = 'right';
    result.direction = 1;

    // Adjust position to sit exactly at the boundary
    result.position.x = rightBoundary - radius;

    // Bounce if moving with sufficient velocity
    if (Math.abs(velocity.x) > 0.1) {
      result.velocity.x = -velocity.x * bounceFactor;
    } else {
      result.velocity.x = 0;
    }
  }

  return result;
};

/**
 * Checks for collision with a vertical line (net) and adjusts position and velocity
 * 
 * @param {Position} position - Current position
 * @param {Velocity} velocity - Current velocity
 * @param {number} radius - Object radius
 * @param {number} netX - X position of the net
 * @param {number} netTop - Top position of the net
 * @param {number} netWidth - Width of the net
 * @param {number} [bounceFactor=physics.BOUNCE_FACTOR] - Bounce energy preservation factor
 * @returns {CollisionResult} Collision result with adjusted position and velocity
 */
export const handleNetCollision = (
  position,
  velocity,
  radius,
  netX,
  netTop,
  netWidth = 10,
  bounceFactor = physics.BOUNCE_FACTOR
) => {
  const result = {
    collided: false,
    position: { ...position },
    velocity: { ...velocity },
    type: null,
    direction: 0
  };

  const netLeft = netX - (netWidth / 2);
  const netRight = netX + (netWidth / 2);

  // Check if object's bounding box overlaps with net
  const objLeft = position.x - radius;
  const objRight = position.x + radius;
  const objBottom = position.y + radius;

  if (objRight >= netLeft && objLeft <= netRight && objBottom >= netTop) {
    result.collided = true;
    result.type = 'net';

    // Determine which side of the net was hit based on velocity and position
    if (velocity.x > 0 && position.x < netX) {
      // Moving right, hitting left side of net
      result.direction = -1;
      result.position.x = netLeft - radius;
      result.velocity.x = -velocity.x * bounceFactor;
    }
    else if (velocity.x < 0 && position.x > netX) {
      // Moving left, hitting right side of net
      result.direction = 1;
      result.position.x = netRight + radius;
      result.velocity.x = -velocity.x * bounceFactor;
    }
    else if (velocity.y > 0 && position.y - radius < netTop) {
      // Moving down, hitting top of net
      result.position.y = netTop - radius;
      result.velocity.y = -velocity.y * bounceFactor;
    }
  }

  return result;
};

/**
 * Calculates collision response between two circular entities (like slime and ball)
 * 
 * @param {Position} p1 - Position of first entity
 * @param {Velocity} v1 - Velocity of first entity
 * @param {number} m1 - Mass of first entity
 * @param {Position} p2 - Position of second entity
 * @param {Velocity} v2 - Velocity of second entity
 * @param {number} m2 - Mass of second entity
 * @param {number} [restitution=physics.SLIME_BOUNCE_FACTOR] - Elasticity of collision (0-1)
 * @returns {Object} New velocities for both entities
 */
export const resolveCircleCollision = (
  p1,
  v1,
  m1,
  p2,
  v2,
  m2,
  restitution = physics.SLIME_BOUNCE_FACTOR
) => {
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

/**
 * Detects collision between a rectangle and a circle
 * 
 * @param {Position} rectPos - Center position of the rectangle
 * @param {number} rectWidth - Width of the rectangle
 * @param {number} rectHeight - Height of the rectangle
 * @param {Position} circlePos - Position of the circle
 * @param {number} circleRadius - Radius of the circle
 * @returns {boolean} True if collision detected
 */
export const rectCircleCollide = (rectPos, rectWidth, rectHeight, circlePos, circleRadius) => {
  // Calculate rectangle edges
  const halfWidth = rectWidth / 2;
  const halfHeight = rectHeight / 2;

  const rectLeft = rectPos.x - halfWidth;
  const rectRight = rectPos.x + halfWidth;
  const rectTop = rectPos.y - halfHeight;
  const rectBottom = rectPos.y + halfHeight;

  // Find closest point on rectangle to circle
  const closestX = Math.max(rectLeft, Math.min(circlePos.x, rectRight));
  const closestY = Math.max(rectTop, Math.min(circlePos.y, rectBottom));

  // Calculate distance from closest point to circle center
  const dx = closestX - circlePos.x;
  const dy = closestY - circlePos.y;

  const distanceSquared = dx * dx + dy * dy;

  return distanceSquared <= (circleRadius * circleRadius);
};

/**
 * Calculates the scaling factor for object sizes and physics based on field size
 * 
 * @param {number} fieldWidth - Width of the playing field
 * @returns {number} Scaling factor for physics calculations
 */
export const calculatePhysicsScale = (fieldWidth) => {
  return fieldWidth / physics.K;
};

/**
 * Applies all physics calculations for a complete update cycle
 * 
 * @param {Position} position - Current position
 * @param {Velocity} velocity - Current velocity
 * @param {number} radius - Object radius
 * @param {Boundaries} boundaries - Movement boundaries
 * @param {number} maxVelocity - Maximum velocity
 * @param {number} [gravity=physics.GRAVITY] - Gravity constant
 * @param {number} [deceleration=0] - Horizontal deceleration
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.checkGround=true] - Whether to check ground collisions
 * @param {boolean} [options.checkWalls=true] - Whether to check wall collisions
 * @param {Object} [options.net] - Net configuration for collision
 * @returns {Object} Updated position and velocity with collision info
 */
export const updatePhysics = (
  position,
  velocity,
  radius,
  boundaries,
  maxVelocity,
  gravity = physics.GRAVITY,
  deceleration = 0,
  options = {}
) => {
  const defaultOptions = {
    checkGround: true,
    checkWalls: true,
    net: null
  };

  const opts = { ...defaultOptions, ...options };

  // Apply gravity
  let updatedVelocity = applyGravity(velocity, gravity);

  // Apply deceleration if specified
  if (deceleration > 0) {
    updatedVelocity = applyDeceleration(updatedVelocity, deceleration);
  }

  // Cap velocity
  updatedVelocity = capVelocity(updatedVelocity, maxVelocity);

  // Calculate next position
  let updatedPosition = calculateNextPosition(position, updatedVelocity);

  // Track collisions
  const collisions = {
    ground: false,
    leftWall: false,
    rightWall: false,
    net: false,
    direction: 0
  };

  // Check ground collision
  if (opts.checkGround) {
    const groundResult = handleGroundCollision(
      updatedPosition,
      updatedVelocity,
      radius,
      boundaries.ground
    );

    if (groundResult.collided) {
      updatedPosition = groundResult.position;
      updatedVelocity = groundResult.velocity;
      collisions.ground = true;
    }
  }

  // Check wall collisions
  if (opts.checkWalls) {
    const wallResult = handleWallCollision(
      updatedPosition,
      updatedVelocity,
      radius,
      boundaries.left,
      boundaries.right
    );

    if (wallResult.collided) {
      updatedPosition = wallResult.position;
      updatedVelocity = wallResult.velocity;

      if (wallResult.type === 'left') {
        collisions.leftWall = true;
      } else {
        collisions.rightWall = true;
      }

      collisions.direction = wallResult.direction;
    }
  }

  // Check net collision if specified
  if (opts.net) {
    const { x, top, width } = opts.net;

    const netResult = handleNetCollision(
      updatedPosition,
      updatedVelocity,
      radius,
      x,
      top,
      width
    );

    if (netResult.collided) {
      updatedPosition = netResult.position;
      updatedVelocity = netResult.velocity;
      collisions.net = true;
      collisions.direction = netResult.direction;
    }
  }

  return {
    position: updatedPosition,
    velocity: updatedVelocity,
    collisions
  };
};
