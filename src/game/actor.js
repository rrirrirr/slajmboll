// slajmboll/src/game/actor.js

// --- Ensure configPhysics is imported ---
import { movement as configMovement, physics as configPhysics, dimensions as configDimensions } from '../../config.js';
import { Event } from '../core/events.js';
import { gameObjects } from '../core/objectRegistry.js';
import { applyGravity, capVelocity, applyDeceleration } from '../core/physics.js';

export default function Actor(
  initialPos,
  initialVelocity,
  relativeRadius,
  rightBoundary,
  leftBoundary,
  groundLevelY,
  maxVelocityLimit,
  resizeEvent,
  teamId = 0,
  isFrictionless = false
) {
  // --- State ---
  const position = { ...(initialPos || { x: 0, y: 0 }) };
  const velocity = { ...(initialVelocity || { x: 0, y: 0 }) };
  let currentTeamId = teamId;
  let hasFriction = !isFrictionless;
  let downwardAcceleration = configPhysics.GRAVITY;
  let movements = [];
  let areaWidth = rightBoundary - leftBoundary;
  let actualRadius = (areaWidth / configPhysics.K) * relativeRadius;
  const baseSizeUnit = areaWidth / configPhysics.K;
  const scaledSize = baseSizeUnit * relativeRadius;
  if (isFrictionless) {
    actualRadius = scaledSize;
  } else {
    actualRadius = scaledSize / 2;
  }
  let currentRightLimit = rightBoundary;
  let currentLeftLimit = leftBoundary;
  let effectiveRightBoundary = currentRightLimit;
  let effectiveLeftBoundary = currentLeftLimit;
  let currentGroundLevel = groundLevelY;
  let currentMaxVelocity = maxVelocityLimit;
  let hasCollidedThisFrame = false;
  let collisionGracePeriodFrames = 0;
  let isTouchingWall = false; // Maintained by updatePosition

  // --- Grounded State ---
  const groundedTolerance = 0.1; // Define tolerance once
  let actorIsGrounded = isFrictionless // Initialize state based on start pos
    ? (position.y + actualRadius >= currentGroundLevel - groundedTolerance)
    : (position.y >= currentGroundLevel - groundedTolerance);
  let wasGroundedLastFrame = actorIsGrounded; // To track transitions

  // --- Events ---
  const instanceId = `actor_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const groundHitEvent = Event(`${instanceId}_ground_hit`);
  const wallHitEvent = Event(`${instanceId}_wall_hit`);
  const netHitEvent = Event(`${instanceId}_net_hit`);

  // --- Internal Helper Functions ---

  const updateTeamBoundaries = () => {
    // ... (keep existing implementation)
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

  /** Updates team and boundaries */
  const updateTeam = (newTeamId) => {
    // console.log(`Actor ${instanceId}: Updating team from ${currentTeamId} to ${newTeamId}`); // Optional log
    currentTeamId = newTeamId; // Update internal state
    updateTeamBoundaries(); // Recalculate movement boundaries
  };

  const updateVelocity = () => {

    movements = movements.filter(movementGenerator => {
      if (!movementGenerator?.next) return false;
      const result = movementGenerator.next();
      if (result.done) return false;
      const updateValue = result.value;
      if (updateValue && typeof updateValue === 'object') {
        if (typeof updateValue.x === 'number') velocity.x += updateValue.x;
        if (typeof updateValue.y === 'number') velocity.y += updateValue.y;
      } else if (typeof updateValue === 'number') {
        velocity.y += updateValue;
      }
      return true;
    });


    // --- Friction application (Horizontal) ---
    if (hasFriction) {
      const frictionFactor = wasGroundedLastFrame ? configPhysics.GROUND_FRICTION : configPhysics.AIR_FRICTION;
      applyDeceleration(velocity, frictionFactor); // This only affects velocity.x
    }

    // --- Apply Gravity (Always Normal) ---
    // REMOVE the conditional logic for gravityToApply
    velocity.y += downwardAcceleration; // Apply normal gravity

    if (isTouchingWall && !wasGroundedLastFrame) {
      if (velocity.y < 0) {
        // Moving UP: Apply UPWARD friction factor
        velocity.y *= configPhysics.WALL_SLIDE_FRICTION_UP;
        // console.log(`Wall Sliding UP - Applied friction ${configPhysics.WALL_SLIDE_FRICTION_UP}. New vy: ${velocity.y.toFixed(2)}`); // Optional Log
      } else if (velocity.y > 0) {
        // Moving DOWN: Apply DOWNWARD friction factor
        velocity.y *= configPhysics.WALL_SLIDE_FRICTION_DOWN;
        // console.log(`Wall Sliding DOWN - Applied friction ${configPhysics.WALL_SLIDE_FRICTION_DOWN}. New vy: ${velocity.y.toFixed(2)}`); // Optional Log
      }
      // Note: If velocity.y is exactly 0, no friction is applied.

      // Optional: Stop sliding completely if speed is very low
      if (Math.abs(velocity.y) < 0.1) {
        velocity.y = 0;
      }
    }

    // --- Cap Velocity ---
    const capped = capVelocity(velocity, currentMaxVelocity);
    velocity.x = capped.x;
    velocity.y = capped.y;
  };

  const updatePosition = () => {
    // ... (calculate nextPos) ...
    let nextPos = {
      x: position.x + velocity.x,
      y: position.y + velocity.y
    };

    let collidedNet = false; // Local flag for this frame's net collision status
    let frameCollidedWall = false; // Reset wall touch status for this frame

    // --- Ground Collision (Correction only, state update moved to 'update') ---
    const checkIsCurrentlyGrounded = isFrictionless
      ? (nextPos.y + actualRadius >= currentGroundLevel - groundedTolerance)
      : (nextPos.y >= currentGroundLevel - groundedTolerance);

    if (checkIsCurrentlyGrounded) {
      // Correct position
      if (isFrictionless) {
        nextPos.y = currentGroundLevel - actualRadius;
      } else {
        nextPos.y = currentGroundLevel;
      }
      // Adjust velocity (stop or bounce)
      if (velocity.y > 0.1) {
        if (isFrictionless) {
          velocity.y = -velocity.y * configPhysics.BOUNCE_FACTOR;
        } else {
          velocity.y = 0;
        }
      } else {
        velocity.y = 0;
      }
      // Note: groundHitEvent emission moved to main update function
      hasCollidedThisFrame = true; // Still mark collision occurred
    }

    // --- Net Collision ---
    if (gameObjects.net) {
      // ... net collision detection ...
      const net = gameObjects.net;
      const netX = net.position;
      const netHalfWidth = net.width / 2;
      const netTopY = currentGroundLevel - net.height;

      if (Math.abs(nextPos.x - netX) < actualRadius + netHalfWidth && nextPos.y + actualRadius > netTopY) {
        collidedNet = true; // Net was hit this frame
        frameCollidedWall = true; // Treat net contact as wall contact
        hasCollidedThisFrame = true;
        const comingFromLeft = position.x < netX;
        // ... (Rest of net collision response logic: slime stop, ball bounce) ...
        if (!isFrictionless && currentTeamId > 0) { /* Slime stop */
          if (currentTeamId === 1 && nextPos.x + actualRadius > netX - netHalfWidth && comingFromLeft) { nextPos.x = netX - netHalfWidth - actualRadius; velocity.x = 0; netHitEvent.emit(-1); }
          else if (currentTeamId === 2 && nextPos.x - actualRadius < netX + netHalfWidth && !comingFromLeft) { nextPos.x = netX + netHalfWidth + actualRadius; velocity.x = 0; netHitEvent.emit(1); }
        } else if (isFrictionless) { /* Ball bounce */
          if (comingFromLeft) { nextPos.x = netX - netHalfWidth - actualRadius; velocity.x = -Math.abs(velocity.x) * configPhysics.BOUNCE_FACTOR; velocity.y -= Math.abs(velocity.x) * configPhysics.NET_BOUNCE_BOOST; netHitEvent.emit(-1); }
          else { nextPos.x = netX + netHalfWidth + actualRadius; velocity.x = Math.abs(velocity.x) * configPhysics.BOUNCE_FACTOR; velocity.y -= Math.abs(velocity.x) * configPhysics.NET_BOUNCE_BOOST; netHitEvent.emit(1); }
        } else if (isFrictionless && Math.abs(nextPos.y - netTopY) < actualRadius) { /* Ball top of net */
          nextPos.y = netTopY - actualRadius; velocity.y = -Math.abs(velocity.y) * configPhysics.BOUNCE_FACTOR; velocity.x *= 0.8; netHitEvent.emit(comingFromLeft ? -1 : 1);
        }
      }
    }
    // --- Wall Collisions ---
    if (!collidedNet) {
      if (nextPos.x - actualRadius < effectiveLeftBoundary) {
        nextPos.x = effectiveLeftBoundary + actualRadius;
        // --- Allow Ball to bounce, Slime to stop ---
        if (isFrictionless) { // Ball bounces
          if (Math.abs(velocity.x) > 0.1) velocity.x = -velocity.x * configPhysics.BOUNCE_FACTOR; else velocity.x = 0;
        } else { // Slime stops
          velocity.x = 0;
        }
        // --- End Bounce/Stop Logic ---
        frameCollidedWall = true;
        hasCollidedThisFrame = true;
      } else if (nextPos.x + actualRadius > effectiveRightBoundary) {
        nextPos.x = effectiveRightBoundary - actualRadius;
        // --- Allow Ball to bounce, Slime to stop ---
        if (isFrictionless) { // Ball bounces
          if (Math.abs(velocity.x) > 0.1) velocity.x = -velocity.x * configPhysics.BOUNCE_FACTOR; else velocity.x = 0;
        } else { // Slime stops
          velocity.x = 0;
        }
        // --- End Bounce/Stop Logic ---
        frameCollidedWall = true;
        hasCollidedThisFrame = true;
      }
    }

    // --- Update persistent isTouchingWall state ---
    if (frameCollidedWall) {
      // Emit event only when state *changes* to touching
      if (!isTouchingWall) {
        const wallDirection = (nextPos.x < areaWidth / 2) ? -1 : 1; // Determine which side
        wallHitEvent.emit(wallDirection);
      }
      isTouchingWall = true;
    } else {
      // Emit event only when state *changes* to not touching
      if (isTouchingWall) {
        wallHitEvent.emit(0);
      }
      isTouchingWall = false;
    }

    // --- Final Position Update ---
    position.x = nextPos.x;
    position.y = nextPos.y;
  };

  // --- NEW: Ground Check Function ---
  /**
   * Checks if the actor is currently grounded based on its position.
   * @returns {boolean} True if grounded, false otherwise.
   */
  const checkIsGrounded = () => {
    return isFrictionless
      ? (position.y + actualRadius >= currentGroundLevel - groundedTolerance)
      : (position.y >= currentGroundLevel - groundedTolerance);
  };

  // --- REFACTORED: Main Update Function ---
  /** Updates physics state for one frame */
  const update = () => {
    // Store previous grounded state to detect transitions
    wasGroundedLastFrame = actorIsGrounded;

    // Reset collision flag for this frame
    hasCollidedThisFrame = false;
    // Note: isTouchingWall state persists until explicitly changed by updatePosition

    // Run physics updates (order can matter)
    updateVelocity(); // Calculates velocity changes based on forces and previous state
    updatePosition(); // Calculates new position, handles collisions/corrections, updates isTouchingWall

    // --- Single Ground Check using Helper Function ---
    actorIsGrounded = checkIsGrounded(); // Update state based on final position

    // --- Emit Event on State Change ---
    if (actorIsGrounded && !wasGroundedLastFrame) {
      // console.log("Actor: Ground hit transition detected"); // Optional Log
      groundHitEvent.emit(); // Emit event only when landing
    }

    // --- Decrement Collision Grace Period ---
    if (collisionGracePeriodFrames > 0) {
      collisionGracePeriodFrames--;
    }
  };


  // --- Public Methods ---
  /** Adds a movement generator to the active list */
  const addMovement = (movement) => {
    // Basic validation: check if it looks like a generator/iterator
    if (movement && typeof movement.next === 'function') {
      // console.log(`Actor ${instanceId}: Adding movement generator`); // Optional Log
      movements.push(movement);
    } else {
      console.warn("Actor: Attempted to add invalid movement object.", movement);
    }
  };

  /** Removes a specific movement generator instance from the active list */
  const removeMovement = (movement) => {
    // console.log(`Actor ${instanceId}: Attempting to remove movement generator`); // Optional Log
    movements = movements.filter(m => m !== movement);
  };

  const setMaxVelocity = (newMax) => { currentMaxVelocity = newMax; };
  const resetMaxVelocity = () => { currentMaxVelocity = maxVelocityLimit; };
  const setCollisionFlag = (collided = true, graceFrames = 2) => {
    hasCollidedThisFrame = collided;
    if (collided) { collisionGracePeriodFrames = graceFrames; }
  };
  const setFriction = (frictionEnabled) => {
    hasFriction = frictionEnabled;
    isFrictionless = !frictionEnabled; // Ensure inverse is also set
  };
  const getSpeed = () => velocity.x;

  // Return the public interface
  return {
    pos: position,
    velocity: velocity,
    downwardAcceleration: downwardAcceleration,
    realRadius: actualRadius,
    team: currentTeamId, // Changed from get team()
    frictionless: isFrictionless, // Changed from get frictionless()
    get hasCollided() { return hasCollidedThisFrame || collisionGracePeriodFrames > 0; },
    get isGrounded() { return actorIsGrounded; }, // Expose new state
    get isTouchingWall() { return isTouchingWall; }, // Expose wall touch state if needed
    updateTeam,
    setMaxVelocity,
    resetMaxVelocity,
    setCollisionFlag,
    setFriction,
    addMovement,
    removeMovement,
    getSpeed,
    update,

    // Events
    groundHitEvent,
    wallHitEvent,
    netHitEvent,

    // Expose ground level if needed externally
    ground: currentGroundLevel,
    // Expose jump acceleration if needed externally
    get jumpAcceleration() { return configMovement.JUMP_ACCELERATION; },
  };
} 
