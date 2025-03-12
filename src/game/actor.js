import { Event } from '../core/events.js';
import { MAXVELOCITY, TERMINALVELOCITY, K } from '../constants.js';

/**
 * Creates a physics actor for game entities
 * 
 * @param {Object} pos - Initial position
 * @param {number} pos.x - X-coordinate
 * @param {number} pos.y - Y-coordinate
 * @param {Object} velocity - Initial velocity
 * @param {number} velocity.x - Horizontal velocity
 * @param {number} velocity.y - Vertical velocity
 * @param {number} radius - Collision radius (relative size)
 * @param {number} rightBoundary - Right boundary of movement area
 * @param {number} leftBoundary - Left boundary of movement area
 * @param {number} ground - Ground y-coordinate
 * @param {number} maxVelocity - Maximum velocity
 * @param {Object} resizeEvent - Event for handling game resize
 * @param {number} [team=0] - Team identifier (0=none, 1=left, 2=right)
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
  team = 0
) {
  /**
   * The actor's position
   * @type {Object}
   */
  const position = pos || { x: 0, y: 0 };

  /**
   * The actor's velocity
   * @type {Object}
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
  let actualRadius = (areaWidth / K) * radius;

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

  // Calculate net position (assuming net is at center)
  const netPosition = (rightLimit + leftLimit) / 2;

  // Boundaries adjusted based on team
  let effectiveLeftBoundary = leftLimit;
  let effectiveRightBoundary = rightLimit;

  // Set team-specific boundaries
  updateTeamBoundaries();

  /**
   * Ground y-coordinate
   * @type {number}
   */
  let groundLevel = ground;

  /**
   * Maximum movement velocity
   * @type {number}
   */
  let maximumVelocity = (areaWidth / K) * 0.1;

  /**
   * Flag indicating the actor is touching a wall
   * @type {boolean}
   */
  let isTouchingWall = false;

  /**
   * Movement deceleration (friction)
   * @type {number}
   */
  const movementDeceleration = (areaWidth / K) * 0.008;

  /**
   * Jump acceleration
   * @type {number}
   */
  const jumpAcceleration = 0.6;

  /**
   * Downward acceleration (gravity)
   * @type {number}
   */
  let downwardAcceleration = 0.9;

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
    handleGroundCollision(nextPos, wasGrounded);

    // Handle boundary collisions
    handleBoundaryCollisions(nextPos);

    // Update position
    position.x = nextPos.x;
    position.y = nextPos.y;
  }

  /**
   * Handle collision with the ground
   * @param {Object} nextPos - Next calculated position
   * @param {boolean} wasGrounded - Whether actor was on ground in previous frame
   */
  function handleGroundCollision(nextPos, wasGrounded) {
    if (nextPos.y > groundLevel) {
      nextPos.y = groundLevel;
      actorVelocity.y = 0;
      if (!wasGrounded) {
        // Only emit if just landed
        groundHitEvent.emit();
      }
    }
  }

  /**
   * Handle collisions with boundaries and walls
   * @param {Object} nextPos - Next calculated position
   */
  function handleBoundaryCollisions(nextPos) {
    // Left boundary collision
    if (nextPos.x - actualRadius < effectiveLeftBoundary) {
      nextPos.x = effectiveLeftBoundary + actualRadius;
      actorVelocity.x = 0;
      wallHitEvent.emit(-1);
      isTouchingWall = true;
    }
    // Right boundary collision
    else if (nextPos.x + actualRadius > effectiveRightBoundary) {
      nextPos.x = effectiveRightBoundary - actualRadius;
      actorVelocity.x = 0;

      // Determine if this is a net collision or wall collision
      if (teamId === 1 && Math.abs(effectiveRightBoundary - netPosition) < 1) {
        netHitEvent.emit(1);
      } else if (teamId === 2 && Math.abs(effectiveRightBoundary - rightLimit) < 1) {
        wallHitEvent.emit(1);
      } else {
        wallHitEvent.emit(1);
      }

      isTouchingWall = true;
    }
    // No longer touching a wall
    else if (isTouchingWall) {
      isTouchingWall = false;
      wallHitEvent.emit(0);
    }
  }

  /**
   * Update the actor's team and adjust boundaries
   * @param {number} newTeam - New team ID (0=none, 1=left, 2=right)
   */
  function updateTeam(newTeam) {
    teamId = newTeam;
    updateTeamBoundaries();
  }

  /**
   * Update boundaries based on the actor's team
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

  /**
   * Get the actor's current horizontal speed
   * @returns {number} Current horizontal speed
   */
  function getSpeed() {
    return actorVelocity.x;
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
   * Update velocity with physics rules (drag, gravity, limits)
   */
  function updateVelocity() {
    // Apply deceleration (drag)
    actorVelocity.x += movementDeceleration * -Math.sign(actorVelocity.x);

    // Cap horizontal velocity
    if (Math.abs(actorVelocity.x) > maximumVelocity) {
      actorVelocity.x = Math.sign(actorVelocity.x) * maximumVelocity;
    }

    // Stop completely if velocity is very small
    if (Math.abs(movementDeceleration) > Math.abs(actorVelocity.x)) {
      actorVelocity.x = 0;
    }

    // Apply gravity
    actorVelocity.y += downwardAcceleration;

    // Cap vertical velocity
    if (-actorVelocity.y > maximumVelocity) {
      actorVelocity.y = -maximumVelocity;
    }
    if (actorVelocity.y > TERMINALVELOCITY) {
      actorVelocity.y = TERMINALVELOCITY;
    }
  }

  /**
   * Set the maximum velocity for the actor
   * @param {number} velocity - New maximum velocity multiple
   */
  function setMaxVelocity(velocity) {
    maximumVelocity = (areaWidth / K) * velocity;
  }

  /**
   * Reset maximum velocity to default value
   */
  function resetMaxVelocity() {
    maximumVelocity = (areaWidth / K) * 0.1;
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
    _velocity: actorVelocity, // Keep for backward compatibility
    getSpeed,
    _downwardAcceleration: downwardAcceleration, // Keep for backward compatibility
    jumpAcceleration,
    ground: groundLevel,
    realRadius: actualRadius,
    team: teamId
  };
}
