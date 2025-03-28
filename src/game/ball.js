import { Event } from '../core/events.js';
import Actor from './actor.js';
import {
  physics,
  resolveCircleCollision,
  circlesCollide,
  calculateDistance
} from '../core/physics.js';

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
     * Simple circle-to-circle collision detection with a slime using billiard physics
     *
     * @param {Object} slime - Slime object to check collision with
     * @returns {boolean} True if collision occurred
     */
  const checkSlimeCollision = (slime) => {
    if (!slime || !slime.ao) return false;

    // Get ball center and radius
    const ballX = actorObject.pos.x;
    const ballY = actorObject.pos.y;
    const ballRadius = ballSize / 2;

    // Get slime dimensions from cache or update if not available
    if (!slimeDimensionsCache.has(slime.slimeId)) {
      updateSlimeDimensions(slime.slimeId);
    }

    const slimeDimensions = slimeDimensionsCache.get(slime.slimeId);
    if (!slimeDimensions) return false;

    // Slime position and radius
    const slimeX = slime.ao.pos.x;
    const slimeY = slime.ao.pos.y;
    const slimeRadius = slime.ao.realRadius;

    // Use the physics module to check for collision
    if (circlesCollide(
      { x: ballX, y: ballY },
      ballRadius,
      { x: slimeX, y: slimeY },
      slimeRadius
    )) {
      // Get velocities
      const ballVelocity = { ...actorObject._velocity }; // Use copy
      const slimeVelocity = { ...(slime.ao._velocity || { x: 0, y: 0 }) }; // Use copy, provide default

      // Get masses
      const ballMass = 1;
      const slimeMass = 5; // Slime is 5x the ball's mass

      // Get positions
      const ballPos = { x: ballX, y: ballY };
      const slimePos = { x: slimeX, y: slimeY };

      // Calculate distance and normal vector (needed for separation)
      const distance = calculateDistance(ballPos, slimePos);
      const nx = (ballX - slimeX) / distance;
      const ny = (ballY - slimeY) / distance;

      // Calculate new velocities using billiard physics (conservation of momentum & energy)
      const newVelocities = billiardCollision(
        ballPos, ballVelocity, ballMass,
        slimePos, slimeVelocity, slimeMass,
        physics.SLIME_BOUNCE_FACTOR
      );

      // --- APPLY VELOCITIES TO BOTH OBJECTS ---
      // Apply to Ball
      actorObject._velocity.x = newVelocities.v1.x;
      actorObject._velocity.y = newVelocities.v1.y;

      // Apply to Slime (assuming slime.ao is the actor object for the slime)
      if (slime.ao && slime.ao._velocity) {
        slime.ao._velocity.x = newVelocities.v2.x;
        slime.ao._velocity.y = newVelocities.v2.y;
        // Also set collision flag for slime to prevent its own immediate capping
        if (typeof slime.ao.setCollisionFlag === 'function') {
          slime.ao.setCollisionFlag(true, 2);
        }
        console.log(`Applied velocity to Slime ${slime.slimeId}: { x: ${newVelocities.v2.x.toFixed(2)}, y: ${newVelocities.v2.y.toFixed(2)} }`); // Debug log
      } else {
        console.warn("Could not apply post-collision velocity to slime - slime.ao or slime.ao._velocity missing.");
      }
      // --- END APPLY VELOCITIES ---


      // Important: Properly separate the objects after collision to prevent multiple collision detections
      // Move ball away from slime along collision normal (with a small extra buffer)
      const overlap = (ballRadius + slimeRadius) - distance;
      const separationBuffer = 1; // Small buffer to prevent immediate re-collision
      if (overlap > 0) {
        const separationX = nx * (overlap + separationBuffer);
        const separationY = ny * (overlap + separationBuffer);

        // Move the ball by half the separation, and slime by the other half (weighted by inverse mass?)
        // Simpler: Just move the ball out fully for now.
        actorObject.pos.x += separationX;
        actorObject.pos.y += separationY;

        // Optionally, move the slime slightly too
        slime.ao.pos.x -= separationX * (ballMass / (ballMass + slimeMass));
        slime.ao.pos.y -= separationY * (ballMass / (ballMass + slimeMass));
      }


      // Set the collision flag for the ball
      if (typeof actorObject.setCollisionFlag === 'function') {
        actorObject.setCollisionFlag(true, 2);
      }

      // Emit collision event
      hitSlimeEvent.emit({
        slimeId: slime.slimeId,
        teamNumber: slime.teamNumber,
        velocity: { x: actorObject._velocity.x, y: actorObject._velocity.y },
        position: { x: actorObject.pos.x, y: actorObject.pos.y }
      });

      return true;
    }

    return false;
  };

  /**
     * Calculates collision response using billiard physics (conservation of momentum and energy)
     * * @param {Object} pos1 - Position of first object
     * @param {Object} vel1 - Velocity of first object
     * @param {number} mass1 - Mass of first object
     * @param {Object} pos2 - Position of second object
     * @param {Object} vel2 - Velocity of second object
     * @param {number} mass2 - Mass of second object
     * @param {number} [restitution=1] - Coefficient of restitution (1=elastic, <1=inelastic)
     * @returns {Object} New velocities for both objects
     */
  function billiardCollision(pos1, vel1, mass1, pos2, vel2, mass2, restitution = 1) {
    // --- START DEBUG LOG ---
    console.log('--- Slime-Ball Collision ---');
    console.log('Inputs:', {
      ballVel: { ...vel1 }, // Log a copy
      slimeVel: { ...vel2 }, // Log a copy
      ballMass: mass1,
      slimeMass: mass2,
      restitution: restitution
    });
    // --- END DEBUG LOG ---

    // Calculate distance and normal vector
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Normalize the collision normal
    const nx = dx / distance;
    const ny = dy / distance;

    // Calculate relative velocity
    const dvx = vel1.x - vel2.x;
    const dvy = vel1.y - vel2.y;

    // Calculate velocity along the normal
    const velocityAlongNormal = dvx * nx + dvy * ny;

    // Early exit if objects are moving away from each other
    if (velocityAlongNormal > 0) {
      // --- START DEBUG LOG ---
      console.log('Objects moving away, no collision resolution.');
      console.log('--- End Collision ---');
      // --- END DEBUG LOG ---
      return { v1: vel1, v2: vel2 };
    }

    // Calculate impulse scalar
    const impulseFactor = (-(1 + restitution) * velocityAlongNormal) /
      (1 / mass1 + 1 / mass2);

    // Apply impulse to velocities along normal
    const impulseX = impulseFactor * nx;
    const impulseY = impulseFactor * ny;

    // Calculate final velocities
    const finalVelocities = {
      v1: { // Ball
        x: vel1.x + (impulseX / mass1),
        y: vel1.y + (impulseY / mass1)
      },
      v2: { // Slime
        x: vel2.x - (impulseX / mass2),
        y: vel2.y - (impulseY / mass2)
      }
    };

    // --- START DEBUG LOG ---
    console.log('Calculation:', {
      normal: { x: nx, y: ny },
      relativeVelNormal: velocityAlongNormal,
      impulseFactor: impulseFactor,
      impulse: { x: impulseX, y: impulseY }
    });
    console.log('Outputs:', {
      newBallVel: { ...finalVelocities.v1 }, // Log a copy
      newSlimeVel: { ...finalVelocities.v2 }  // Log a copy
    });
    console.log('--- End Collision ---');
    // --- END DEBUG LOG ---

    return finalVelocities;
  }

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
