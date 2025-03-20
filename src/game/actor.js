import { Event } from '../core/events.js';
import { physics, dimensions } from '../../config.js';

/**
 * @typedef {Object} Position
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * @typedef {Object} Velocity
 * @property {number} x - Horizontal velocity
 * @property {number} y - Vertical velocity
 */

/**
 * @typedef {Object} ActorEvents
 * @property {Object} groundHit - Event emitted when actor hits ground
 * @property {Object} wallHit - Event emitted when actor hits wall
 * @property {Object} netHit - Event emitted when actor hits net
 */

/**
 * @typedef {Object} ActorObject
 * @property {Function} addMovement - Add a movement generator
 * @property {Function} removeMovement - Remove a movement generator
 * @property {Function} update - Update physics for one frame
 * @property {Object} groundHitEvent - Ground collision event
 * @property {Object} wallHitEvent - Wall collision event
 * @property {Object} netHitEvent - Net collision event
 * @property {Position} pos - Current position
 * @property {Function} setMaxVelocity - Set maximum velocity
 * @property {Function} resetMaxVelocity - Reset to default velocity
 * @property {Function} updateTeam - Update team and boundaries
 * @property {Velocity} _velocity - Current velocity
 * @property {Function} getSpeed - Get current horizontal speed
 * @property {number} _downwardAcceleration - Current gravity
 * @property {number} jumpAcceleration - Jump strength
 * @property {number} ground - Ground level
 * @property {number} realRadius - Actual collision radius
 * @property {number} team - Team identifier
 */

/**
 * Creates a physics actor for game entities
 * 
 * @param {Position} pos - Initial position
 * @param {Velocity} velocity - Initial velocity
 * @param {number} radius - Collision radius (relative size)
 * @param {number} rightBoundary - Right boundary of movement area
 * @param {number} leftBoundary - Left boundary of movement area
 * @param {number} ground - Ground y-coordinate
 * @param {number} maxVelocity - Maximum velocity
 * @param {Object} resizeEvent - Event for handling game resize
 * @param {number} [team=0] - Team identifier (0=none, 1=left, 2=right)
 * @param {boolean} [frictionless=false] - If true, entity will not decelerate naturally
 * @returns {ActorObject} Actor object with physics and movement methods
 */
export default function Actor(
  pos,
  velocity,
  radius,
  rightBoundary,
  leftBoundary,
  ground,
  maxVelocity,
  resizeEvent,
  team = 0,
  frictionless = false
) {
  /**
   * The actor's position
   * @type {Position}
   */
  const position = pos || { x: 0, y: 0 };

  /**
   * The actor's velocity
   * @type {Velocity}
   */
  const actorVelocity = velocity || { x: 0, y: 0 };

  /**
   * Width of the play area
   * @type {number}
   */
  let areaWidth = rightBoundary - leftBoundary;

  /**
   * Relative collision radius
   * @type {number}
   */
  let collisionRadius = radius;

  /**
   * Actual collision radius in pixels
   * @type {number}
   */
  let actualRadius = (areaWidth / physics.K) * radius / 2;

  /**
   * Right movement boundary
   * @type {number}
   */
  let rightLimit = rightBoundary;

  /**
   * Left movement boundary
   * @type {number}
   */
  let leftLimit = leftBoundary;

  /**
   * Team identifier (0=none, 1=left, 2=right)
   * @type {number}
   */
  let teamId = team;

  /**
   * Flag to indicate if a collision occurred this frame
   * @type {boolean}
   */
  let hasCollided = false;

  /**
   * Flag indicating if the entity has no friction
   * @type {boolean}
   */
  let hasFriction = !frictionless;

  // Calculate net position (assuming net is at center)
  const netPosition = (rightLimit + leftLimit) / 2;

  // Boundaries adjusted based on team
  let effectiveLeftBoundary = leftLimit;
  let effectiveRightBoundary = rightLimit;

  /**
   * Ground y-coordinate
   * @type {number}
   */
  let groundLevel = ground;

  /**
   * Maximum movement velocity
   * @type {number}
   */
  let maximumVelocity = (areaWidth / physics.K) * 0.1;

  /**
   * Flag indicating the actor is touching a wall
   * @type {boolean}
   */
  let isTouchingWall = false;

  /**
   * Movement deceleration (friction)
   * @type {number}
   */
  const movementDeceleration = (areaWidth / physics.K) * 0.008;

  /**
   * Jump acceleration
   * @type {number}
   */
  const jumpAcceleration = 0.6;

  /**
   * Downward acceleration (gravity)
   * @type {number}
   */
  let downwardAcceleration = physics.GRAVITY;

  /**
   * Active movement generators
   * @type {Array}
   */
  let movements = [];

  // Create events
  const groundHitEvent = Event('ground hit');
  const wallHitEvent = Event('wall hit');
  const netHitEvent = Event('net hit');

  /**
   * Update actor's position based on velocity and handle collisions
   */
  function updatePosition() {
    // Calculate next position
    let nextPos = {
      x: position.x + actorVelocity.x,
      y: position.y + actorVelocity.y
    };

    let wasGrounded = position.y >= groundLevel;

    // Handle ground collision
    if (nextPos.y > groundLevel) {
      nextPos.y = groundLevel;
      actorVelocity.y = 0;
      if (!wasGrounded) {
        // Only emit if just landed
        groundHitEvent.emit();
      }
    }

    // Net collision - use the configuration value
    const netWidth = (rightLimit - leftLimit) * dimensions.NET_WIDTH_PERCENT;
    const netHalfWidth = netWidth / 2;

    // Use NET_HEIGHT_PERCENT from config
    const fieldHeight = groundLevel; // Assuming ground is at the bottom
    const netHeight = fieldHeight * dimensions.NET_HEIGHT_PERCENT;
    const netTopY = groundLevel - netHeight;

    // Check for net collision or boundary
    const distanceToNet = Math.abs(nextPos.x - netPosition);

    // For slimes, enforce team boundary at the net, regardless of height
    if (!frictionless && teamId > 0) {
      // Team 1 (left side) cannot go right of the net
      if (teamId === 1 && nextPos.x > netPosition - netHalfWidth - actualRadius) {
        nextPos.x = netPosition - netHalfWidth - actualRadius;
        actorVelocity.x = 0;
        netHitEvent.emit(-1);
      }
      // Team 2 (right side) cannot go left of the net
      else if (teamId === 2 && nextPos.x < netPosition + netHalfWidth + actualRadius) {
        nextPos.x = netPosition + netHalfWidth + actualRadius;
        actorVelocity.x = 0;
        netHitEvent.emit(1);
      }
    }
    // For the ball (frictionless=true), handle normal net collision physics
    else if (distanceToNet < (actualRadius + netHalfWidth)) {
      // Check if hitting the vertical part of the net
      if (nextPos.y >= netTopY) {
        // Handle collision with the vertical part of the net
        if (position.x < netPosition) {
          // Coming from left side
          nextPos.x = netPosition - netHalfWidth - actualRadius;

          // Apply bouncing effect for the ball
          actorVelocity.x = -Math.abs(actorVelocity.x) * physics.BOUNCE_FACTOR;
          // Add slight upward boost for the ball
          actorVelocity.y -= Math.abs(actorVelocity.x) * 0.15;

          netHitEvent.emit(-1);
        } else {
          // Coming from right side
          nextPos.x = netPosition + netHalfWidth + actualRadius;

          // Apply bouncing effect for the ball
          actorVelocity.x = Math.abs(actorVelocity.x) * physics.BOUNCE_FACTOR;
          // Add slight upward boost for the ball
          actorVelocity.y -= Math.abs(actorVelocity.x) * 0.15;

          netHitEvent.emit(1);
        }
      }
      // Check if hitting the top of the net
      else if (Math.abs(nextPos.y - netTopY) < actualRadius) {
        // Position outside of net
        nextPos.y = netTopY - actualRadius;

        // Bounce for the ball
        actorVelocity.y = -Math.abs(actorVelocity.y) * physics.BOUNCE_FACTOR;
        actorVelocity.x *= 0.8; // Reduce horizontal speed slightly

        netHitEvent.emit(position.x < netPosition ? -1 : 1);
      }
    }

    // Handle wall collisions
    if (nextPos.x - actualRadius < effectiveLeftBoundary) {
      nextPos.x = effectiveLeftBoundary + actualRadius;

      // Only apply bouncing effect for the ball (frictionless=true)
      if (frictionless) {
        actorVelocity.x = Math.abs(actorVelocity.x) * physics.BOUNCE_FACTOR;
      } else {
        // For slimes, just stop horizontal movement
        actorVelocity.x = 0;
      }

      wallHitEvent.emit(-1);
      isTouchingWall = true;
    } else if (nextPos.x + actualRadius > effectiveRightBoundary) {
      nextPos.x = effectiveRightBoundary - actualRadius;

      // Only apply bouncing effect for the ball (frictionless=true)
      if (frictionless) {
        actorVelocity.x = -Math.abs(actorVelocity.x) * physics.BOUNCE_FACTOR;
      } else {
        // For slimes, just stop horizontal movement
        actorVelocity.x = 0;
      }

      wallHitEvent.emit(1);
      isTouchingWall = true;
    } else if (isTouchingWall) {
      isTouchingWall = false;
      wallHitEvent.emit(0);
    }

    // Update position
    position.x = nextPos.x;
    position.y = nextPos.y;
  }

  /**
   * Update velocity with physics rules (drag, gravity, limits)
   */
  function updateVelocity() {
    // Only apply deceleration (drag) if the entity has friction
    if (hasFriction) {
      // Apply deceleration (drag)
      actorVelocity.x += movementDeceleration * -Math.sign(actorVelocity.x);

      // Stop completely if velocity is very small (only for entities with friction)
      if (Math.abs(movementDeceleration) > Math.abs(actorVelocity.x)) {
        actorVelocity.x = 0;
      }
    }

    // Cap horizontal velocity ONLY if no collision this frame
    if (!hasCollided && Math.abs(actorVelocity.x) > maximumVelocity) {
      actorVelocity.x = Math.sign(actorVelocity.x) * maximumVelocity;
    }

    // Apply gravity
    actorVelocity.y += downwardAcceleration;

    // Cap vertical velocity ONLY if no collision this frame
    if (!hasCollided) {
      if (-actorVelocity.y > maximumVelocity) {
        actorVelocity.y = -maximumVelocity;
      }
      if (actorVelocity.y > physics.TERMINAL_VELOCITY) {
        actorVelocity.y = physics.TERMINAL_VELOCITY;
      }
    }

    // Reset collision flag for next frame
    hasCollided = false;
  }

  /**
   * Update team boundaries based on the actor's team
   */
  function updateTeamBoundaries() {
    if (teamId === 1) { // Team 1 (left side)
      effectiveLeftBoundary = leftLimit;
      effectiveRightBoundary = netPosition;
    } else if (teamId === 2) { // Team 2 (right side)
      effectiveLeftBoundary = netPosition;
      effectiveRightBoundary = rightLimit;
    } else {
      // No team, use full boundaries
      effectiveLeftBoundary = leftLimit;
      effectiveRightBoundary = rightLimit;
    }
  }

  // Initialize team boundaries
  updateTeamBoundaries();

  /**
   * Update the actor's team and adjust boundaries
   * @param {number} newTeam - New team ID (0=none, 1=left, 2=right)
   */
  function updateTeam(newTeam) {
    teamId = newTeam;
    updateTeamBoundaries();
  }

  /**
   * Get the actor's current horizontal speed
   * @returns {number} Current horizontal speed
   */
  function getSpeed() {
    return actorVelocity.x;
  }

  /**
   * Set whether this entity has friction
   * @param {boolean} hasFrictionValue - Whether entity has friction
   */
  function setFriction(hasFrictionValue) {
    hasFriction = hasFrictionValue;
  }

  /**
   * Add a movement generator to the actor
   * @param {Object} movement - Movement generator object
   */
  function addMovement(movement) {
    if (movement && typeof movement.next === 'function') {
      movements.push(movement);
    }
  }

  /**
   * Remove a movement generator from the actor
   * @param {Object} movement - Movement generator to remove
   */
  function removeMovement(movement) {
    if (movement) {
      const index = movements.indexOf(movement);
      if (index !== -1) {
        movements.splice(index, 1);
      }
    }
  }

  /**
   * Process all active movement generators
   */
  function updateMovements() {
    movements = movements.filter((movement) => {
      if (!movement || typeof movement.next !== 'function') {
        return false;
      }

      try {
        const update = movement.next();

        if (update) {
          if (update.x !== undefined && !isNaN(update.x)) {
            actorVelocity.x += update.x;
          }
          if (update.y !== undefined && !isNaN(update.y)) {
            actorVelocity.y += update.y;
          }
        }

        // Keep movement if it hasn't ended
        return movement.ended ? !movement.ended() : true;
      } catch (error) {
        return false;
      }
    });
  }

  /**
   * Set the maximum velocity for the actor
   * @param {number} velocity - New maximum velocity multiple
   */
  function setMaxVelocity(velocity) {
    maximumVelocity = (areaWidth / physics.K) * velocity;
  }

  /**
   * Reset maximum velocity to default value
   */
  function resetMaxVelocity() {
    maximumVelocity = (areaWidth / physics.K) * 0.1;
  }

  /**
   * Set collision flag for this frame
   * 
   * @param {boolean} value - Whether a collision occurred
   */
  function setCollisionFlag(value = true) {
    hasCollided = value;
  }

  /**
   * Handle net collision with accurate height
   * 
   * @param {Object} nextPos - Next calculated position
   * @returns {boolean} True if a net collision occurred
   */
  function handleNetCollision(nextPos) {
    // Net properties
    const netWidth = 10; // Width of the net in pixels
    const netHalfWidth = netWidth / 2;

    // Get actual net height from DOM if possible, otherwise use a reasonable default
    // This ensures the collision height matches the visual height
    let netHeight = 120; // Default height
    const netElement = document.getElementById('wall');
    if (netElement) {
      const netStyle = getComputedStyle(netElement);
      netHeight = parseInt(netStyle.height) || netHeight;
    }

    // Calculate net top position - this is where the net starts from the ground
    const netTopY = groundLevel - netHeight;

    // Distance of ball center to net center
    const horizontalDist = Math.abs(nextPos.x - netPosition);

    // Quick early exit if too far horizontally
    if (horizontalDist > (actualRadius + netHalfWidth) * 1.2) {
      return false;
    }

    // Collision with any part of the net
    if (nextPos.y >= netTopY && horizontalDist < (actualRadius + netHalfWidth)) {
      // Handle side collision
      if (position.x < netPosition) {
        // Coming from left
        nextPos.x = netPosition - netHalfWidth - actualRadius;
        actorVelocity.x = -Math.abs(actorVelocity.x) * physics.BOUNCE_FACTOR;
        netHitEvent.emit(-1);
      } else {
        // Coming from right
        nextPos.x = netPosition + netHalfWidth + actualRadius;
        actorVelocity.x = Math.abs(actorVelocity.x) * physics.BOUNCE_FACTOR;
        netHitEvent.emit(1);
      }

      // Add upward boost for the ball
      if (frictionless) {
        actorVelocity.y -= Math.abs(actorVelocity.x) * (physics.NET_BOUNCE_BOOST || 0.15);
      }

      return true;
    }

    // Check for collision with the top of the net (simplified to horizontal line for now)
    const distance = Math.sqrt(
      Math.pow(nextPos.x - netPosition, 2) +
      Math.pow(nextPos.y - netTopY, 2)
    );

    if (distance < actualRadius && nextPos.y < netTopY + actualRadius) {
      // Calculate normal vector (simplified to mostly upward)
      const nx = (nextPos.x - netPosition) / distance;
      const ny = -0.9; // Mostly upward bounce

      // Normalize the normal vector
      const normalLength = Math.sqrt(nx * nx + ny * ny);
      const normalizedNx = nx / normalLength;
      const normalizedNy = ny / normalLength;

      // Calculate dot product of velocity and normal
      const dotProduct = actorVelocity.x * normalizedNx + actorVelocity.y * normalizedNy;

      // Reflect velocity across the normal
      actorVelocity.x = actorVelocity.x - 2 * dotProduct * normalizedNx * physics.BOUNCE_FACTOR;
      actorVelocity.y = actorVelocity.y - 2 * dotProduct * normalizedNy * physics.BOUNCE_FACTOR;

      // Position ball outside the net
      nextPos.y = netTopY - actualRadius;

      // Emit event
      netHitEvent.emit(nextPos.x < netPosition ? -1 : 1);

      return true;
    }

    return false;
  }

  /**
   * Update the actor's physics for one frame
   */
  function update() {
    updateMovements();
    updateVelocity();
    updatePosition();
  }

  // Return the actor interface
  return {
    addMovement,
    removeMovement,
    update,
    groundHitEvent,
    wallHitEvent,
    netHitEvent,
    pos: position,
    setMaxVelocity,
    resetMaxVelocity,
    updateTeam,
    setCollisionFlag,
    setFriction,
    _velocity: actorVelocity, // Keep for backward compatibility
    getSpeed,
    _downwardAcceleration: downwardAcceleration, // Keep for backward compatibility
    jumpAcceleration,
    ground: groundLevel,
    realRadius: actualRadius,
    team: teamId,
    hasCollided: hasCollided,
    frictionless: frictionless
  };
}
