import { Event } from '../core/events.js';
import Actor from './actor.js'; // Uses refactored Actor
import {
  configPhysics, // Renamed import from physics.js
  resolveCircleCollision,
  checkCollisionCircleSegment,
  applySeparation,
  // Note: clamp is used internally by physics helpers now, no direct import needed here
} from '../core/physics.js'; // Uses refactored Physics
import {
  calculateBallSize,
  updateBallElementSize,
  renderBall,
  setBallColor
} from '../ui/ballGraphics.js'; // Uses new Graphics module
import { dimensions as configDimensions } from '../../config.js'; // Import dimensions config

/**
 * Creates a ball entity for the game.
 * Manages physics state and interactions, delegates rendering.
 *
 * @param {Object} position - Initial position {x, y}
 * @param {Object} ballConfigDims - Ball dimensions from config { radius } (e.g., configDimensions.BALL_RADIUS).
 * @param {Object} constraints - Movement constraints { rightBoundry, leftBoundry, ground, maxVelocity }
 * @param {Object} field - Field dimensions { width, height }
 * @param {Object} [options={}] - Additional ball options
 * @param {number} [options.bounceFactor] - Custom bounce factor (0-1). Defaults to configPhysics.BOUNCE_FACTOR.
 * @param {boolean} [options.canBounceOnGround=true] - Whether ball can bounce on ground (affects scoring).
 * @returns {Object} Ball object instance.
 */
export function Ball(position, ballConfigDims, constraints, field, options = {}) {
  // --- Configuration & State ---
  const ballOptions = {
    bounceFactor: configPhysics.BOUNCE_FACTOR, // Default bounce factor from config
    canBounceOnGround: true,
    ...options // Merge provided options
  };

  let currentField = { ...field }; // Local copy of field dimensions
  // Calculate initial size using the graphics helper
  let currentBallSize = calculateBallSize(currentField, ballConfigDims); // Initial diameter
  let graphicsElement = null; // Reference to the DOM element

  // --- Events ---
  const hitGroundEvent = Event('ball_hit_ground');
  const hitNetEvent = Event('ball_hit_net');
  const hitSlimeEvent = Event('ball_hit_slime');
  const hitWallEvent = Event('ball_hit_wall');
  const scoredEvent = Event('ball_scored'); // Event emitted when scoring occurs

  // --- Physics Actor ---
  // Creates Actor instance using refactored Actor.js
  const actorObject = Actor(
    position,
    { x: 0, y: 0 },
    ballConfigDims.radius,
    constraints.rightBoundry,
    constraints.leftBoundry,
    constraints.ground,
    constraints.maxVelocity,
    null, // No resize event needed directly for Actor
    0,    // Team (0 for ball)
    true  // frictionless = true
  );

  // --- Private Helper Functions ---

  /**
   * Determines scoring side and emits the scored event.
   * Called ONLY when a non-bouncing ball hits the ground.
   * @private
   */
  const _triggerScore = () => {
    // Determine which side scored based on net position (center)
    // Team 2 scores if ball on left, Team 1 if on right
    const scoringSide = actorObject.pos.x < currentField.width / 2 ? 2 : 1;
    console.log(`Ball: Ground hit score triggered for team ${scoringSide}`); // Added log
    scoredEvent.emit({
      scoringSide,
      position: { ...actorObject.pos }
    });
  };

  /**
   * Checks for collision with the flat base segment of a slime.
   * @param {Object} slimeActor - The slime's actor object.
   * @param {Object} ballGeom - Ball geometry { x, y, radius }.
   * @returns {boolean} True if collision detected.
   * @private
   */
  const _checkCollisionWithSlimeBase = (slimeActor, ballGeom) => {
    const slimeX = slimeActor.pos.x;
    const slimeY = slimeActor.pos.y; // Bottom baseline Y
    const slimeRadius = slimeActor.realRadius; // Half-width of the base

    // Quick AABB pre-check
    if (Math.abs(ballGeom.y - slimeY) >= ballGeom.radius ||
      Math.abs(ballGeom.x - slimeX) >= slimeRadius + ballGeom.radius) {
      return false;
    }

    const segmentP1x = slimeX - slimeRadius;
    const segmentP2x = slimeX + slimeRadius;

    // Use the helper from physics.js
    return checkCollisionCircleSegment(
      segmentP1x, slimeY, segmentP2x, slimeY,
      ballGeom
    );
  };

  /**
   * Checks for collision with the upper arc segment of a slime.
   * @param {Object} slimeActor - The slime's actor object.
   * @param {Object} ballGeom - Ball geometry { x, y, radius }.
   * @param {number} distSq - Pre-calculated squared distance between ball center and slime base center.
   * @returns {boolean} True if collision detected.
   * @private
   */
  const _checkCollisionWithSlimeArc = (slimeActor, ballGeom, distSq) => {
    const slimeCollisionRadius = slimeActor.realRadius; // Arc radius is same as base half-width
    const sumRadii = slimeCollisionRadius + ballGeom.radius;
    const sumRadiiSq = sumRadii * sumRadii;

    // Check overlap with the full circle representing the arc
    // AND filter: ball's center must be above the slime's base to hit the arc
    return distSq < sumRadiiSq && ballGeom.y <= slimeActor.pos.y;
  };

  /**
   * Resolves the physics response after a ball-slime collision is detected.
   * @param {Object} slimeActor - The slime's actor object.
   * @param {Object} ballGeom - Ball geometry { x, y, radius }.
   * @param {number} distSq - Squared distance between centers.
   * @private
   */
  const _resolveSlimeHit = (slimeActor, ballGeom, distSq) => {
    const slimePos = { x: slimeActor.pos.x, y: slimeActor.pos.y };
    // Use current velocities from the actor objects
    const ballVelocity = { ...actorObject.velocity }; // Use renamed property
    const slimeVelocity = { ...(slimeActor.velocity || { x: 0, y: 0 }) }; // Use renamed property

    // Calculate collision normal (vector from slime center to ball center)
    const distance = Math.max(Math.sqrt(distSq), 1e-6); // Use inline epsilon
    const nx = (ballGeom.x - slimePos.x) / distance;
    const ny = (ballGeom.y - slimePos.y) / distance;

    // Resolve using billiard physics from physics.js
    const newVelocities = resolveCircleCollision(
      ballGeom, ballVelocity, configPhysics.BALL_MASS,
      slimePos, slimeVelocity, configPhysics.SLIME_MASS,
      configPhysics.SLIME_BOUNCE_FACTOR,
      nx, ny // Pass pre-calculated normal
    );

    // Apply new velocities back to the actor objects
    actorObject.velocity.x = newVelocities.v1.x; // Use renamed property
    actorObject.velocity.y = newVelocities.v1.y; // Use renamed property
    if (slimeActor.velocity) {
      slimeActor.velocity.x = newVelocities.v2.x; // Use renamed property
      slimeActor.velocity.y = newVelocities.v2.y; // Use renamed property
      slimeActor.setCollisionFlag?.(true, 2); // Notify slime actor
    }

    // Apply separation force to prevent sticking (using physics.js helper)
    applySeparation(actorObject.pos, actorObject.realRadius, slimeActor.pos, slimeActor.realRadius);

    // Set ball's own collision flag
    actorObject.setCollisionFlag?.(true, 2);
  };

  // --- Event Listeners ---
  // Listen to the ground hit event from the internal Actor
  actorObject.groundHitEvent.subscribe(() => {
    // First, emit the general ground hit event for anyone listening
    hitGroundEvent.emit({ position: { ...actorObject.pos } });

    // Then, check if this specific ball type should trigger a score on ground hit
    if (!ballOptions.canBounceOnGround) {
      _triggerScore(); // Call the simplified scoring logic
      // Ensure vertical velocity is zeroed *after* triggering score if needed
      // (Actor might already do this depending on bounce factor, but belt-and-suspenders)
      actorObject.velocity.y = 0;
    }
    // If it *can* bounce, the Actor's physics already handled the bounce.
  });

  // Listen to wall hit event from the internal Actor
  actorObject.wallHitEvent.subscribe(direction => {
    if (direction !== 0) {
      hitWallEvent.emit({ side: direction === -1 ? 'left' : 'right' });
    }
  });

  // Listen to net hit event from the internal Actor
  actorObject.netHitEvent.subscribe(direction => {
    // The Actor handles the physics, just relay the event
    hitNetEvent.emit({
      direction,
      position: { ...actorObject.pos },
      velocity: { ...actorObject.velocity } // Use renamed property
    });
  });

  // --- Public Methods ---

  /**
   * Sets the DOM element used for rendering this ball.
   * @param {HTMLElement} el - The ball's DOM element.
   */
  const setElement = (el) => {
    graphicsElement = el;
    if (graphicsElement) {
      // Ensure size is correct initially using the graphics helper
      updateBallElementSize(graphicsElement, currentBallSize);
    } else {
      console.warn("Ball.setElement: Received null or invalid element.");
    }
  };

  /**
   * Checks and resolves collision between the ball and a single slime.
   * @param {Object} slime - Slime object, containing the actor object `slime.actorObject`.
   * @returns {boolean} True if a collision occurred and was resolved.
   */
  const checkSlimeCollision = (slime) => {
    // Validate slime input
    if (!slime?.actorObject?.realRadius) {
      // console.warn("checkSlimeCollision: Invalid slime object provided."); // Reduced logging noise
      return false;
    }

    const slimeActor = slime.actorObject;
    // Use current ball geometry for checks
    const ballGeom = { x: actorObject.pos.x, y: actorObject.pos.y, radius: actorObject.realRadius };

    // Calculate squared distance between ball center and slime *base* center
    const dx = ballGeom.x - slimeActor.pos.x;
    const dy = ballGeom.y - slimeActor.pos.y;
    const distSq = dx * dx + dy * dy;

    let collisionDetected = false;
    let collisionType = 'none';

    // Check collision types using private helpers
    if (_checkCollisionWithSlimeBase(slimeActor, ballGeom)) {
      collisionDetected = true;
      collisionType = 'bottom';
    } else if (_checkCollisionWithSlimeArc(slimeActor, ballGeom, distSq)) {
      collisionDetected = true;
      collisionType = 'arc';
    }

    // Resolve if detected
    if (collisionDetected) {
      _resolveSlimeHit(slimeActor, ballGeom, distSq); // Use private helper

      // Emit collision event with relevant data
      hitSlimeEvent.emit({
        slimeId: slime.slimeId,
        teamNumber: slime.team,
        collisionType: collisionType,
        position: { ...ballGeom }, // Ball's position at collision
        velocity: { ...actorObject.velocity } // Ball's velocity *after* resolution
      });
      return true;
    }
    return false;
  };


  /**
   * Resets the ball to a specified position and velocity. Also stops physics (gravity).
   * @param {Object} newPosition - New position {x, y}.
   * @param {Object} [newVelocity={ x: 0, y: 0 }] - New velocity.
   */
  const reset = (newPosition, newVelocity = { x: 0, y: 0 }) => {
    actorObject.pos.x = newPosition.x;
    actorObject.pos.y = newPosition.y;
    actorObject.velocity.x = newVelocity.x; // Use renamed property
    actorObject.velocity.y = newVelocity.y; // Use renamed property
    stopPhysics(); // Ensure physics (like gravity) is stopped on reset
  };

  /** Starts applying gravity to the ball. */
  const startGravity = () => {
    // Use the property on the actor object directly
    actorObject.downwardAcceleration = configPhysics.GRAVITY; // Use renamed property
  };

  /** Stops the ball's movement and physics updates (sets gravity to 0). */
  const stopPhysics = () => {
    actorObject.downwardAcceleration = 0; // Use renamed property
    actorObject.velocity.x = 0;        // Use renamed property
    actorObject.velocity.y = 0;        // Use renamed property
  };

  /** Updates the ball's physics state for one frame by calling the Actor's update. */
  const update = () => {
    actorObject.update();
    // Ball-Slime collision checks are performed externally (e.g., in ballManager)
  };

  /** Renders the ball's current position using the graphics module. */
  const render = () => {
    // Delegate rendering to the graphics module function
    renderBall(graphicsElement, actorObject.pos, currentBallSize);
  };

  /** Sets the color of the ball via the graphics module. */
  const setColor = (color) => {
    // Delegate color setting to the graphics module function
    setBallColor(graphicsElement, color);
  };

  /** Handles field resize. Recalculates size and updates graphics. */
  const handleResize = (newFieldDimensions) => {
    currentField = { ...newFieldDimensions }; // Update local field reference
    // Recalculate size using the graphics module helper
    currentBallSize = calculateBallSize(currentField, ballConfigDims);
    // Update DOM element size using the graphics module function
    updateBallElementSize(graphicsElement, currentBallSize);

    // TODO: IMPORTANT! The Actor's internal constraints might need updating too.
    // This requires adding an `updateConstraints` method to Actor.js
    // Example: actorObject.updateConstraints(currentField.width, 0, newGroundLevel);
    console.warn("Ball.handleResize: Actor constraints may need updating!");
  };

  // --- Return Public Interface ---
  return {
    actorObject, // Expose actor for advanced interactions or debug
    get element() { return graphicsElement; }, // Read-only access to DOM element

    // Core Methods
    update,
    render,
    reset,
    setElement, // Link DOM element

    // Control & Config
    startGravity,
    stopPhysics,
    setColor,
    handleResize, // Handle screen resizing

    // Collision Method (called externally)
    checkSlimeCollision,

    // Events
    hitGroundEvent,
    hitNetEvent,
    hitSlimeEvent,
    hitWallEvent,
    scoredEvent, // Emitted on score
  };
}
