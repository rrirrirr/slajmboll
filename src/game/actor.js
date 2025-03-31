import { Event } from '../core/events.js';
import { movement as configMovement, physics as configPhysics, dimensions as configDimensions } from '../../config.js';
import { gameObjects } from '../core/objectRegistry.js';
import { applyGravity, capVelocity, applyDeceleration } from '../core/physics.js';

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
 * @property {Function} updateTeam - Update team and boundaries
 * @property {Function} setMaxVelocity - Set maximum velocity limit
 * @property {Function} resetMaxVelocity - Reset to default velocity limit
 * @property {Function} setCollisionFlag - Indicate a collision occurred this frame
 * @property {Function} setFriction - Enable/disable friction
 * @property {Function} getSpeed - Get current horizontal speed
 * @property {Position} pos - Current position { x, y } (mutable)
 * @property {Velocity} velocity - Current velocity { x, y } (mutable)
 * @property {number} downwardAcceleration - Current gravitational acceleration affecting the actor
 * @property {number} jumpAcceleration - Base jump strength (may be modified by movements)
 * @property {number} ground - Y-coordinate of the ground level for this actor
 * @property {number} realRadius - Actual collision radius in pixels
 * @property {number} team - Team identifier (0=none, 1=left, 2=right)
 * @property {boolean} frictionless - Whether the actor ignores friction
 * @property {boolean} hasCollided - Flag indicating a recent collision (read-only externally)
 * @property {Object} groundHitEvent - Ground collision event emitter
 * @property {Object} wallHitEvent - Wall collision event emitter
 * @property {Object} netHitEvent - Net collision event emitter
 */

/**
 * Creates a physics actor for game entities (Slimes, Ball).
 * Handles position, velocity, gravity, friction, and boundary collisions.
 *
 * @param {Position} initialPos - Initial position {x, y}.
 * @param {Velocity} initialVelocity - Initial velocity {x, y}.
 * @param {number} relativeRadius - Collision radius relative to field scale (e.g., dimensions.SLIME_RADIUS).
 * @param {number} rightBoundary - Right boundary of movement area (pixels).
 * @param {number} leftBoundary - Left boundary of movement area (pixels).
 * @param {number} groundLevelY - Ground y-coordinate (pixels).
 * @param {number} maxVelocityLimit - Base maximum velocity limit (pixels/frame).
 * @param {Object} [resizeEvent] - Optional event emitter for handling game resize (not fully used internally yet).
 * @param {number} [teamId=0] - Team identifier (0=none, 1=left, 2=right). Affects net collision behavior.
 * @param {boolean} [isFrictionless=false] - If true, entity ignores air/ground friction (used for Ball).
 * @returns {ActorObject} Actor object instance with physics state and methods.
 */
export default function Actor(
  initialPos,
  initialVelocity,
  relativeRadius,
  rightBoundary,
  leftBoundary,
  groundLevelY,
  maxVelocityLimit,
  resizeEvent, // Note: resizeEvent is passed but not directly used for constraint updates here yet
  teamId = 0,
  isFrictionless = false // Added default to false
) {
  // --- State ---
  const position = { ...(initialPos || { x: 0, y: 0 }) };
  const velocity = { ...(initialVelocity || { x: 0, y: 0 }) }; // Use 'velocity'
  let currentTeamId = teamId;
  let hasFriction = !isFrictionless; // Friction flag derived from isFrictionless
  let downwardAcceleration = configPhysics.GRAVITY; // Use 'downwardAcceleration'
  let movements = []; // Active movement generators

  // --- Calculated Properties (based on initial constraints) ---
  let areaWidth = rightBoundary - leftBoundary;
  // Calculate actual radius based on field scale (K) and relative radius
  let actualRadius = (areaWidth / configPhysics.K) * relativeRadius;

  const baseSizeUnit = areaWidth / configPhysics.K;

  // Calculate the scaled size based on the relative radius from config
  const scaledSize = baseSizeUnit * relativeRadius;

  if (isFrictionless) {
    // For the Ball (frictionless), relativeRadius (0.5) * baseSizeUnit gives the actual radius.
    actualRadius = scaledSize;
  } else {
    // For the Slime (not frictionless), relativeRadius (1) * baseSizeUnit gives the visual *width*.
    // The collision radius should be half of that.
    actualRadius = scaledSize / 2;
  }

  let currentRightLimit = rightBoundary;
  let currentLeftLimit = leftBoundary;
  let effectiveRightBoundary = currentRightLimit;
  let effectiveLeftBoundary = currentLeftLimit;
  let currentGroundLevel = groundLevelY;
  let currentMaxVelocity = maxVelocityLimit;

  // --- Flags ---
  let hasCollidedThisFrame = false;
  let collisionGracePeriodFrames = 0;
  let isTouchingWall = false; // Includes net contact for simplicity here

  // --- Events ---
  // Generate unique event names per actor instance to prevent crosstalk
  const instanceId = `actor_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const groundHitEvent = Event(`${instanceId}_ground_hit`);
  const wallHitEvent = Event(`${instanceId}_wall_hit`);
  const netHitEvent = Event(`${instanceId}_net_hit`);


  // --- Internal Helper Functions ---

  /** Updates effective boundaries based on team and net presence */
  const updateTeamBoundaries = () => {
    if (gameObjects.net && currentTeamId > 0) {
      const netPosition = gameObjects.net.position;
      if (currentTeamId === 1) { // Team 1 (left)
        effectiveLeftBoundary = currentLeftLimit;
        effectiveRightBoundary = netPosition;
      } else if (currentTeamId === 2) { // Team 2 (right)
        effectiveLeftBoundary = netPosition;
        effectiveRightBoundary = currentRightLimit;
      }
    } else { // No team or no net
      effectiveLeftBoundary = currentLeftLimit;
      effectiveRightBoundary = currentRightLimit;
    }
  };

  /** Updates position based on velocity and handles collisions */
  const updatePosition = () => {
    let nextPos = {
      x: position.x + velocity.x,
      y: position.y + velocity.y
    };

    let collidedWall = false;
    let collidedNet = false;

    let groundCheckPassed = false;
    if (isFrictionless) {
      // Ball: Check bottom edge (center + radius)
      groundCheckPassed = nextPos.y + actualRadius > currentGroundLevel;
    } else {
      // Slime: Check bottom position directly (pos.y represents bottom)
      groundCheckPassed = nextPos.y > currentGroundLevel;
    }

    if (groundCheckPassed) {
      const wasGrounded = isFrictionless
        ? (position.y + actualRadius >= currentGroundLevel - 0.1)
        : (position.y >= currentGroundLevel - 0.1);

      // Correct position
      if (isFrictionless) {
        // Ball: Correct to center being radius above ground
        nextPos.y = currentGroundLevel - actualRadius;
      } else {
        // Slime: Correct position to be exactly on ground
        nextPos.y = currentGroundLevel;
      }

      // Apply bounce or stop vertical velocity
      if (velocity.y > 0.1) { // Check if moving downward
        if (isFrictionless) {
          // Ball: Apply bounce ONLY if frictionless
          velocity.y = -velocity.y * configPhysics.BOUNCE_FACTOR;
        } else {
          // Slime: Just stop vertical velocity
          velocity.y = 0;
        }
      } else {
        velocity.y = 0; // Stop small velocities anyway
      }

      if (!wasGrounded) { // Emit event only on first contact
        groundHitEvent.emit();
        hasCollidedThisFrame = true;
      }
    }

    // --- Net Collision ---
    if (gameObjects.net) {
      const net = gameObjects.net;
      const netX = net.position;
      const netHalfWidth = net.width / 2;
      const netTopY = currentGroundLevel - net.height;

      if (Math.abs(nextPos.x - netX) < actualRadius + netHalfWidth && nextPos.y + actualRadius > netTopY) {
        collidedNet = true;
        hasCollidedThisFrame = true;
        const comingFromLeft = position.x < netX;

        // Team-Specific Net Interaction (Slimes stop at net)
        if (!isFrictionless && currentTeamId > 0) {
          if (currentTeamId === 1 && nextPos.x + actualRadius > netX - netHalfWidth && comingFromLeft) {
            nextPos.x = netX - netHalfWidth - actualRadius; velocity.x = 0; netHitEvent.emit(-1);
          } else if (currentTeamId === 2 && nextPos.x - actualRadius < netX + netHalfWidth && !comingFromLeft) {
            nextPos.x = netX + netHalfWidth + actualRadius; velocity.x = 0; netHitEvent.emit(1);
          }
        }
        // Generic Net Interaction (Ball bounces)
        else if (isFrictionless) {
          if (comingFromLeft) {
            nextPos.x = netX - netHalfWidth - actualRadius;
            velocity.x = -Math.abs(velocity.x) * configPhysics.BOUNCE_FACTOR;
            velocity.y -= Math.abs(velocity.x) * configPhysics.NET_BOUNCE_BOOST; // Apply boost
            netHitEvent.emit(-1);
          } else {
            nextPos.x = netX + netHalfWidth + actualRadius;
            velocity.x = Math.abs(velocity.x) * configPhysics.BOUNCE_FACTOR;
            velocity.y -= Math.abs(velocity.x) * configPhysics.NET_BOUNCE_BOOST; // Apply boost
            netHitEvent.emit(1);
          }
        }
        // Simplified Top of Net Collision (Ball primarily)
        else if (isFrictionless && Math.abs(nextPos.y - netTopY) < actualRadius) {
          nextPos.y = netTopY - actualRadius; // Place on top
          velocity.y = -Math.abs(velocity.y) * configPhysics.BOUNCE_FACTOR; // Bounce up
          velocity.x *= 0.8; // Dampen horizontal
          netHitEvent.emit(comingFromLeft ? -1 : 1);
        }
      }
    }

    // --- Wall Collisions ---
    if (!collidedNet) { // Prevent double collision resolution if hit net
      if (nextPos.x - actualRadius < effectiveLeftBoundary) {
        nextPos.x = effectiveLeftBoundary + actualRadius;
        if (Math.abs(velocity.x) > 0.1) { velocity.x = -velocity.x * configPhysics.BOUNCE_FACTOR; } else { velocity.x = 0; }
        collidedWall = true; hasCollidedThisFrame = true; wallHitEvent.emit(-1);
      } else if (nextPos.x + actualRadius > effectiveRightBoundary) {
        nextPos.x = effectiveRightBoundary - actualRadius;
        if (Math.abs(velocity.x) > 0.1) { velocity.x = -velocity.x * configPhysics.BOUNCE_FACTOR; } else { velocity.x = 0; }
        collidedWall = true; hasCollidedThisFrame = true; wallHitEvent.emit(1);
      }
    }

    // Update wall hugging state
    if (collidedWall || collidedNet) { isTouchingWall = true; }
    else if (isTouchingWall) { isTouchingWall = false; wallHitEvent.emit(0); }

    // --- Final Position Update ---
    position.x = nextPos.x;
    position.y = nextPos.y;
  };

  /** Applies gravity, friction, movements, and velocity capping */
  const updateVelocity = () => {
    // --- Apply Movement Generators ---
    const activeMovements = [];
    let netMovementX = 0; // Accumulate changes for logging
    let netMovementY = 0;

    movements.forEach((movementGenerator, index) => {
      let keepMovement = true;

      if (!movementGenerator?.next) {
        console.warn(`Actor ${instanceId}: Invalid movement object found at index ${index}. Removing.`, movementGenerator);
        keepMovement = false;
      } else {
        const result = movementGenerator.next();

        if (result.done) {
          // console.log(`Actor ${instanceId}: Movement generator ${index} finished. Removing.`);
          keepMovement = false;
        } else {
          const updateValue = result.value;

          // --- Simplified Update Application ---
          // Assume updateValue might have x or y, add if they are numbers
          if (updateValue && typeof updateValue === 'object') {
            if (typeof updateValue.x === 'number' && !isNaN(updateValue.x)) {
              velocity.x += updateValue.x;
              netMovementX += updateValue.x; // Accumulate change
            }
            if (typeof updateValue.y === 'number' && !isNaN(updateValue.y)) {
              velocity.y += updateValue.y;
              netMovementY += updateValue.y; // Accumulate change
            }
          } else if (typeof updateValue === 'number' && !isNaN(updateValue)) {
            // Handle case where only a number (for y) is yielded
            velocity.y += updateValue;
            netMovementY += updateValue; // Accumulate change
          }
          // --- End Simplified Update ---
        }
      }
      if (keepMovement) {
        activeMovements.push(movementGenerator);
      }
    });
    movements = activeMovements; // Update the list of active movements

    // --- Apply Friction ---
    if (hasFriction) {
      const isOnGround = isFrictionless ? (position.y + actualRadius >= currentGroundLevel - 0.1) : (position.y >= currentGroundLevel - 0.1);
      const frictionFactor = isOnGround ? configPhysics.GROUND_FRICTION : configPhysics.AIR_FRICTION;
      const preFrictionX = velocity.x; // Log friction effect
      applyDeceleration(velocity, frictionFactor); // Modifies velocity.x in-place
      // if (velocity.x !== preFrictionX) console.log(`Actor ${instanceId}: Friction applied. Velocity.x changed from ${preFrictionX.toFixed(2)} to ${velocity.x.toFixed(2)}`);
    }

    // --- Apply Gravity ---
    const preGravityY = velocity.y; // Log gravity effect
    velocity.y += downwardAcceleration;
    // if (velocity.y !== preGravityY) console.log(`Actor ${instanceId}: Gravity applied. Velocity.y changed from ${preGravityY.toFixed(2)} to ${velocity.y.toFixed(2)}`);

    // --- Cap Velocity ---
    const preCapX = velocity.x; // Log capping effect
    const preCapY = velocity.y;
    const capped = capVelocity(velocity, currentMaxVelocity);
    velocity.x = capped.x;
    velocity.y = capped.y;
    // if (velocity.x !== preCapX || velocity.y !== preCapY) console.log(`Actor ${instanceId}: Velocity capped. V changed from (${preCapX.toFixed(2)}, ${preCapY.toFixed(2)}) to (${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)})`);

  };

  // --- Initialization ---
  updateTeamBoundaries();

  // --- Public Methods ---

  /** Adds a movement generator */
  const addMovement = (movement) => {
    if (movement?.next) { movements.push(movement); }
    else { console.warn("Actor: Attempted to add invalid movement object."); }
  };

  /** Removes a movement generator */
  const removeMovement = (movement) => {
    movements = movements.filter(m => m !== movement);
  };

  /** Updates physics state for one frame */
  const update = () => {
    hasCollidedThisFrame = false; // Reset flag
    updateVelocity();
    updatePosition();
    if (collisionGracePeriodFrames > 0) { collisionGracePeriodFrames--; }
  };

  /** Updates team and boundaries */
  const updateTeam = (newTeamId) => {
    currentTeamId = newTeamId;
    updateTeamBoundaries();
  };

  /** Sets temporary max velocity */
  const setMaxVelocity = (newMax) => { currentMaxVelocity = newMax; };

  /** Resets max velocity to default */
  const resetMaxVelocity = () => { currentMaxVelocity = maxVelocityLimit; };

  /** Sets collision flag and grace period */
  const setCollisionFlag = (collided = true, graceFrames = 2) => {
    hasCollidedThisFrame = collided;
    if (collided) { collisionGracePeriodFrames = graceFrames; }
  };

  /** Enables/disables friction */
  const setFriction = (frictionEnabled) => {
    hasFriction = frictionEnabled;
    isFrictionless = !frictionEnabled;
  };

  /** Gets current horizontal speed */
  const getSpeed = () => velocity.x;

  // Return the public interface
  return {
    pos: position,
    velocity: velocity, // Use 'velocity'
    downwardAcceleration: downwardAcceleration, // Use 'downwardAcceleration'
    realRadius: actualRadius,
    team: currentTeamId,
    frictionless: isFrictionless,
    get hasCollided() { return hasCollidedThisFrame || collisionGracePeriodFrames > 0; },
    updateTeam,
    setMaxVelocity,
    resetMaxVelocity,
    setCollisionFlag,
    setFriction,
    addMovement,
    removeMovement,
    getSpeed,
    update,
    groundHitEvent,
    wallHitEvent,
    netHitEvent,
    ground: currentGroundLevel,
    // Ensure base jump value is accessible if needed by Slime/Movements
    // Use value from config directly? Or pass as param? Let's expose base value from config.
    get jumpAcceleration() { return configMovement.JUMP_ACCELERATION; },
  };
}
