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
   * Simple circle-to-circle collision detection with a slime
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

    // The slime's center X is at center bottom
    const slimeX = slime.ao.pos.x;

    // The slime's collision center Y should be at the geometric center of the half-circle
    const slimeY = slime.ao.pos.y;

    const slimeRadius = slime.ao.realRadius;

    // Use the physics module to check for collision
    if (circlesCollide(
      { x: ballX, y: ballY },
      ballRadius,
      { x: slimeX, y: slimeY },
      slimeRadius
    )) {
      // Calculate distance for collision response
      const distance = calculateDistance(
        { x: ballX, y: ballY },
        { x: slimeX, y: slimeY }
      );

      // Calculate collision normal
      const nx = (ballX - slimeX) / distance;
      const ny = (ballY - slimeY) / distance;

      // Move ball outside slime
      actorObject.pos.x = slimeX + nx * (ballRadius + slimeRadius);
      actorObject.pos.y = slimeY + ny * (ballRadius + slimeRadius);

      // Get ball velocity
      const ballVelocity = {
        x: actorObject._velocity.x,
        y: actorObject._velocity.y
      };

      // Get slime velocity
      const slimeVelocity = {
        x: slime.ao._velocity ? slime.ao._velocity.x : 0,
        y: slime.ao._velocity ? slime.ao._velocity.y : 0
      };

      // Calculate bounce response using proper vector reflection
      const slimeBounce = ballOptions.bounceFactor || physics.SLIME_BOUNCE_FACTOR;

      // Calculate dot product of velocity and normal
      const dotProduct = ballVelocity.x * nx + ballVelocity.y * ny;

      // Only bounce if ball is moving toward slime
      if (dotProduct < 0) {
        // Properly reflect the velocity vector to preserve horizontal speed
        // Use the reflection formula: v' = v - 2(v·n)n, then multiply by bounce factor
        actorObject._velocity.x = ballVelocity.x - 2 * dotProduct * nx * slimeBounce;
        actorObject._velocity.y = ballVelocity.y - 2 * dotProduct * ny * slimeBounce;

        // Add additional "spin" based on slime's horizontal velocity
        if (slime.ao._velocity) {
          actorObject._velocity.x += slime.ao._velocity.x * 0.8;
        }

        // Set the collision flag to bypass velocity capping for this frame
        if (typeof actorObject.setCollisionFlag === 'function') {
          actorObject.setCollisionFlag(true);
        }

        // Emit collision event
        hitSlimeEvent.emit({
          slimeId: slime.slimeId,
          teamNumber: slime.teamNumber,
          velocity: { x: actorObject._velocity.x, y: actorObject._velocity.y },
          position: { x: actorObject.pos.x, y: actorObject.pos.y }
        });
      }

      return true;
    }

    return false;
  };

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
