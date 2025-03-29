import { Event } from '../core/events.js';
import Actor from './actor.js';
import {
  configPhysics as physics,
  resolveCircleCollision,
  circlesCollide,
  calculateDistance
} from '../core/physics.js';

// +++ Add Clamp Helper Function +++
// (If you don't have it imported or available elsewhere)
/**
 * Clamps a value between a minimum and maximum value.
 * @param {number} value The value to clamp.
 * @param {number} min The minimum allowed value.
 * @param {number} max The maximum allowed value.
 * @returns {number} The clamped value.
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}
// +++ End Clamp Helper Function +++


// +++ Add Circle-Segment Collision Helper +++
/**
 * Checks for collision between a circle (ball) and a line segment.
 * @param {number} p1x - Start X of segment.
 * @param {number} p1y - Start Y of segment.
 * @param {number} p2x - End X of segment.
 * @param {number} p2y - End Y of segment.
 * @param {object} ballGeom - The ball geometry {x, y, radius}.
 * @returns {boolean} True if collision, false otherwise.
 */
function checkCollisionCircleSegment(p1x, p1y, p2x, p2y, ballGeom) {
  // Find the closest point on the infinite line containing the segment
  const lineLenSq = (p2x - p1x) ** 2 + (p2y - p1y) ** 2;
  let t = 0; // Parameter along the line segment (0=p1, 1=p2)
  if (lineLenSq > 1e-6) { // Avoid division by zero if p1 and p2 are the same
    t = ((ballGeom.x - p1x) * (p2x - p1x) + (ballGeom.y - p1y) * (p2y - p1y)) / lineLenSq;
    t = clamp(t, 0, 1); // Clamp t to be within the segment [0, 1]
  }

  // Calculate coordinates of the closest point on the segment
  const closestX = p1x + t * (p2x - p1x);
  const closestY = p1y + t * (p2y - p1y);

  // Calculate distance squared from ball center to closest point
  const dx = ballGeom.x - closestX;
  const dy = ballGeom.y - closestY;
  const distanceSquared = dx * dx + dy * dy;

  // Check if the distance is less than the ball's radius squared
  return distanceSquared < ballGeom.radius * ballGeom.radius;
}
// +++ End Circle-Segment Collision Helper +++

/**
 * Creates a ball entity for the game
 * 
 * @param {Object} position - Initial position {x, y}
 * @param {Object} dimensions - Ball dimensions {radius}
 * @param {Object} constraints - Movement constraints
 * @param {Object} field - Field dimensions
 * @param {Object} [options={}] - Additional ball options
 * @param {number} [options.bounceFactor] - Custom bounce factor (0-1)
 * @param {boolean} [options.canBounceOnGround=true] - Whether ball can bounce on ground
 * @returns {Object} Ball object with physics and rendering methods
 */
export function Ball(position, dimensions, constraints, field, options = {}) {
  // Set default options
  const ballOptions = {
    bounceFactor: physics.BOUNCE_FACTOR,
    canBounceOnGround: true,
    ...options
  };

  const fieldDimensions = field;

  /**
   * Track recent collisions to prevent ball from getting stuck to slimes
   * @type {Map<string, number>}
   */
  const recentCollisions = new Map();

  // Create events for ball collisions
  const hitGroundEvent = Event('ball hit ground');
  const hitNetEvent = Event('ball hit net');
  const hitSlimeEvent = Event('ball hit slime');
  const hitWallEvent = Event('ball hit wall');
  const scoredEvent = Event('ball scored');

  // Create ball actor for physics, with frictionless=true to prevent horizontal slowdown
  const actorObject = Actor(
    position,
    { x: 0, y: 0 },
    dimensions.radius,
    constraints.rightBoundry,
    constraints.leftBoundry,
    constraints.ground,
    constraints.maxVelocity,
    null, // No resize event needed for ball
    0,    // No team
    true  // Set to frictionless so ball doesn't slow down
  );

  let ballSize = calculateBallSize();

  /**
    * Calculates the ball size based on field dimensions
    * 
    * @returns {number} The calculated ball size in pixels
    */
  function calculateBallSize() {
    if (!fieldDimensions || !fieldDimensions.width) return 40; // fallback

    // Use same scaling logic as slimes, based on field width
    const areaWidth = fieldDimensions.width;
    const scaledSize = (areaWidth / physics.K) * dimensions.radius;

    // Return diameter (radius * 2)
    return scaledSize * 2;
  }

  // Subscribe to actor's collision events
  actorObject.groundHitEvent.subscribe(data => {
    hitGroundEvent.emit({ x: actorObject.pos.x, y: actorObject.pos.y });

    // Only check scoring for gameplay balls that can't bounce on ground
    if (!ballOptions.canBounceOnGround) {
      checkScoring();
    }

    // If this ball can't bounce on ground, stop it from bouncing
    if (!ballOptions.canBounceOnGround) {
      actorObject._velocity.y = 0;
    }
  });

  actorObject.wallHitEvent.subscribe(direction => {
    if (direction !== 0) {
      hitWallEvent.emit({ side: direction === -1 ? 'left' : 'right' });
    }
  });

  actorObject.netHitEvent.subscribe(direction => {
    hitNetEvent.emit({ x: actorObject.pos.x, y: actorObject.pos.y });
  });

  // Ball size (diameter) in pixels
  // let ballSize = 40; // Default size

  /**
   * Reference to the ball DOM element
   * @type {HTMLElement}
   */
  let element = null;

  /**
   * Sets the DOM element for the ball
   * 
   * @param {HTMLElement} el - Ball DOM element
   */
  const setElement = (el) => {
    element = el;
    if (element) {
      updateBallSize(fieldDimensions);
    }
  };

  /**
   * Handles field resize events
   * 
   * @param {Object} newFieldDimensions - New field dimensions
   */
  const handleResize = (newFieldDimensions) => {
    // Update field dimensions reference
    if (newFieldDimensions) {
      fieldDimensions = newFieldDimensions;
    }

    // Update ball size
    updateBallSize(fieldDimensions);
  };

  /**
   * Creates a DOM element for the ball
   * 
   * @returns {HTMLElement} Ball DOM element
   */
  const createElement = () => {
    // Create ball element if it doesn't exist
    element = document.createElement('div');
    element.classList.add('ball');

    // Set size based on dimensions
    const calculatedSize = (field.width / 20) * dimensions.radius;
    element.style.width = `${calculatedSize}px`;
    element.style.height = `${calculatedSize}px`;

    ballSize = calculatedSize;
    return element;
  };

  /**
   * Cache of slime dimensions to avoid DOM queries every frame
   * @type {Map<string, Object>}
   */
  const slimeDimensionsCache = new Map();

  /**
   * Updates the dimensions cache for a slime
   * 
   * @param {string} slimeId - Unique ID of the slime
   */
  const updateSlimeDimensions = (slimeId) => {
    const slimeElement = document.querySelector(`[data-slime-id="${slimeId}"]`);
    if (slimeElement) {
      const width = parseInt(slimeElement.style.width);
      const height = parseInt(slimeElement.style.height);

      if (width && height) {
        slimeDimensionsCache.set(slimeId, { width, height });
      }
    }
  };


  /**
   * Updates the ball size based on field dimensions
   * 
   * @param {Object} fieldDimensions - Current field dimensions
   */
  const updateBallSize = (fieldDimensions) => {
    if (!fieldDimensions || !fieldDimensions.width) return;

    // Use same scaling logic as slimes, based on field width
    const areaWidth = fieldDimensions.width;
    const scaledSize = (areaWidth / physics.K) * dimensions.radius;

    // Update ball size
    ballSize = scaledSize * 2; // Diameter = radius * 2

    // Update DOM element if it exists
    if (element) {
      element.style.width = `${ballSize}px`;
      element.style.height = `${ballSize}px`;
    }

    // Return new size for reference
    return ballSize;
  };

  /**
   * Checks if a team scored
   */
  const checkScoring = () => {
    // Ball must be on or very near the ground
    if (actorObject.pos.y + ballSize / 2 < constraints.ground - 5) return;

    // Determine which side scored
    const scoringSide = actorObject.pos.x < field.width / 2 ? 2 : 1;

    // Only score if the ball has very little vertical velocity
    if (Math.abs(actorObject._velocity.y) < 0.8) {
      scoredEvent.emit({
        scoringSide,
        position: { x: actorObject.pos.x, y: actorObject.pos.y }
      });
    }
  };

  /**
       * Optimized collision check for accurate half-circle shape.
       * V4: Reduced redundant calculations.
       * @param {Object} slime - Slime object. Contains slime.ao (actor) with .realRadius
       * @returns {boolean} True if collision occurred
       */
  const checkSlimeCollision = (slime) => {
    // --- Check for valid slime object ---
    if (!slime || !slime.ao || typeof slime.ao.realRadius !== 'number') {
      return false;
    }

    // --- Calculate Common Values ---
    const ballX = actorObject.pos.x;
    const ballY = actorObject.pos.y;
    const ballRadius = ballSize / 2;

    const slimeX = slime.ao.pos.x;
    const slimeY = slime.ao.pos.y; // Bottom baseline Y
    const slimeCollisionRadius = slime.ao.realRadius; // Height/Arc Radius

    // Vector from slime center to ball center
    const dx = ballX - slimeX; // Renamed from dx_arc for broader use
    const dy = ballY - slimeY; // Renamed from dy_arc for broader use

    // Squared distance between centers
    const distSq = dx * dx + dy * dy; // Renamed from distSq_arc

    // Combined radii squared (for arc check)
    const sumRadii = slimeCollisionRadius + ballRadius;
    const sumRadiiSq = sumRadii * sumRadii;

    let collisionDetected = false;
    let collisionType = 'none';

    // --- Part 1: Check Collision with Flat Bottom Segment ---
    // Check if ball is potentially close enough to the segment vertically and horizontally first
    // This is a quick AABB-like pre-check
    if (Math.abs(dy) < ballRadius && Math.abs(dx) < slimeCollisionRadius + ballRadius) {
      const segmentP1x = slimeX - slimeCollisionRadius;
      const segmentP2x = slimeX + slimeCollisionRadius;
      const segmentY = slimeY;

      if (checkCollisionCircleSegment(
        segmentP1x, segmentY, segmentP2x, segmentY,
        { x: ballX, y: ballY, radius: ballRadius }
      )) {
        collisionDetected = true;
        collisionType = 'bottom';
      }
    }

    // --- Part 2: Check Collision with Arc (only if bottom didn't hit) ---
    if (!collisionDetected) {
      // Check overlap with the full circle AND position filter
      if (distSq < sumRadiiSq && ballY <= slimeY + ballRadius) {
        collisionDetected = true;
        collisionType = 'arc';
      }
    }

    // --- Part 3: Resolve Collision if Detected ---
    if (collisionDetected) {
      // --- Optimized Collision Resolution ---
      const ballVelocity = { ...actorObject._velocity };
      const slimeVelocity = { ...(slime.ao._velocity || { x: 0, y: 0 }) };
      const ballMass = 1;
      const slimeMass = 5;
      const ballPos = { x: ballX, y: ballY };
      const slimePos = { x: slimeX, y: slimeY };

      // Calculate distance ONLY if needed (for normalization and separation)
      // Reuse dx, dy calculated earlier
      const distance = Math.sqrt(distSq); // Perform sqrt only now
      const nx = (distance > 1e-6) ? dx / distance : 1; // Normalize X (handle zero dist)
      const ny = (distance > 1e-6) ? dy / distance : 0; // Normalize Y

      // Calculate new velocities
      const newVelocities = billiardCollision( // Assumes billiardCollision uses normal vector if available or recomputes
        ballPos, ballVelocity, ballMass,
        slimePos, slimeVelocity, slimeMass,
        physics.SLIME_BOUNCE_FACTOR,
        nx, ny // Pass the calculated normal vector to potentially optimize billiardCollision
      );

      // Apply velocities
      actorObject._velocity.x = newVelocities.v1.x;
      actorObject._velocity.y = newVelocities.v1.y;
      if (slime.ao?._velocity) {
        slime.ao._velocity.x = newVelocities.v2.x;
        slime.ao._velocity.y = newVelocities.v2.y;
        slime.ao.setCollisionFlag?.(true, 2);
      }

      // Separation logic using pre-calculated distance and normal
      const overlap = (ballRadius + slimeCollisionRadius) - distance;
      const separationBuffer = 1;
      if (overlap > 0) {
        const separationX = nx * (overlap + separationBuffer);
        const separationY = ny * (overlap + separationBuffer);
        actorObject.pos.x += separationX;
        actorObject.pos.y += separationY;
      }

      // Set ball collision flag
      actorObject.setCollisionFlag?.(true, 2);

      // Emit event
      hitSlimeEvent.emit({ /* ... event data ... */ collisionType: collisionType });
      // --- End Optimized Collision Resolution ---

      return true;
    }

    return false; // No collision detected
  }; // End of checkSlimeCollision

  /**
   * Calculates collision response using billiard physics.
   * Can optionally accept pre-calculated collision normal.
   * @param {Object} pos1 - Position of first object {x, y}
   * @param {Object} vel1 - Velocity of first object {x, y}
   * @param {number} mass1 - Mass of first object
   * @param {Object} pos2 - Position of second object {x, y}
   * @param {Object} vel2 - Velocity of second object {x, y}
   * @param {number} mass2 - Mass of second object
   * @param {number} [restitution=1] - Coefficient of restitution
   * @param {number|null} [nx_in=null] - Pre-calculated collision normal x component
   * @param {number|null} [ny_in=null] - Pre-calculated collision normal y component
   * @returns {Object} New velocities { v1: {x, y}, v2: {x, y} }
   */
  function billiardCollision(pos1, vel1, mass1, pos2, vel2, mass2, restitution = 1, nx_in = null, ny_in = null) {
    let nx = nx_in;
    let ny = ny_in;

    // Recalculate normal if not provided
    if (nx === null || ny === null) {
      const dx = pos1.x - pos2.x;
      const dy = pos1.y - pos2.y;
      // Ensure distance is non-zero for normalization
      const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1e-6);
      nx = dx / distance;
      ny = dy / distance;
    }

    // Calculate relative velocity
    const dvx = vel1.x - vel2.x;
    const dvy = vel1.y - vel2.y;

    // Calculate velocity along the normal
    const velocityAlongNormal = dvx * nx + dvy * ny;

    // Early exit if objects are moving away from each other along the normal
    if (velocityAlongNormal > 0) {
      // console.log('Objects moving away, no collision resolution needed.');
      return { v1: vel1, v2: vel2 };
    }

    // Calculate impulse scalar using masses and restitution
    const impulseFactor = (-(1 + restitution) * velocityAlongNormal) / (1 / mass1 + 1 / mass2);

    // Calculate impulse vector components
    const impulseX = impulseFactor * nx;
    const impulseY = impulseFactor * ny;

    // Calculate and return final velocities after applying impulse
    // v1 = v1 + impulse / mass1
    // v2 = v2 - impulse / mass2
    return {
      v1: { // Ball's new velocity
        x: vel1.x + (impulseX / mass1),
        y: vel1.y + (impulseY / mass1)
      },
      v2: { // Slime's new velocity
        x: vel2.x - (impulseX / mass2),
        y: vel2.y - (impulseY / mass2)
      }
    };
  } // End billiardCollision

  /**
   * Forces an update of the slime dimensions cache
   * Should be called when the screen is resized
   */
  const updateAllSlimeDimensions = () => {
    const slimeElements = document.querySelectorAll('[data-slime-id]');
    slimeElements.forEach(element => {
      const slimeId = element.getAttribute('data-slime-id');
      updateSlimeDimensions(slimeId);
    });
  };

  /**
   * Resets the ball with specified position and velocity
   * 
   * @param {Object} newPosition - New position {x, y}
   * @param {Object} [newVelocity={ x: 0, y: 0 }] - New velocity
   */
  const reset = (newPosition, newVelocity = { x: 0, y: 0 }) => {
    actorObject.pos.x = newPosition.x;
    actorObject.pos.y = newPosition.y;
    actorObject._velocity.x = newVelocity.x;
    actorObject._velocity.y = newVelocity.y;
  };

  /**
   * Starts ball gravity
   */
  const startGravity = () => {
    actorObject._downwardAcceleration = physics.GRAVITY;
  };

  /**
   * Stops ball physics and velocity
   */
  const stopPhysics = () => {
    actorObject._downwardAcceleration = 0;
    actorObject._velocity.x = 0;
    actorObject._velocity.y = 0;
  };

  /**
   * Updates ball position each frame
   */
  const update = () => {
    actorObject.update();
  };

  actorObject.netHitEvent.subscribe(direction => {
    if (direction !== 0) {
      // Log the event for debugging
      console.log(`Ball hit net with direction ${direction}`);

      hitNetEvent.emit({
        direction,
        position: { x: actorObject.pos.x, y: actorObject.pos.y },
        velocity: { x: actorObject._velocity.x, y: actorObject._velocity.y }
      });
    }
  });

  /**
   * Renders ball position to DOM
   */
  const render = () => {
    if (element) {
      // Center the ball on its position
      element.style.left = `${actorObject.pos.x - ballSize / 2}px`;
      element.style.top = `${actorObject.pos.y - ballSize / 2}px`;
    }
  };

  /**
   * Set the ball color
   * 
   * @param {string} color - CSS color string
   */
  const setColor = (color) => {
    if (element) {
      element.style.backgroundColor = color;
    }
  };

  return {
    update,
    render,
    reset,
    startGravity,
    stopPhysics,
    checkSlimeCollision,
    createElement,
    setElement,
    updateAllSlimeDimensions,
    handleResize,
    setColor,
    element,
    ao: actorObject,
    hitGroundEvent,
    hitNetEvent,
    hitSlimeEvent,
    hitWallEvent,
    scoredEvent
  };
}
