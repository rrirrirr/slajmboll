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
 * @returns {Object} Ball object with physics and rendering methods
 */
export function Ball(position, dimensions, constraints, field) {
  // Create events for ball collisions
  const hitGroundEvent = Event('ball hit ground');
  const hitNetEvent = Event('ball hit net');
  const hitSlimeEvent = Event('ball hit slime');
  const hitWallEvent = Event('ball hit wall');
  const scoredEvent = Event('ball scored');

  // Create ball actor for physics
  const actorObject = Actor(
    position,
    { x: 0, y: 0 },
    dimensions.radius,
    constraints.rightBoundry,
    constraints.leftBoundry,
    constraints.ground,
    constraints.maxVelocity
  );

  // Subscribe to actor's collision events
  actorObject.groundHitEvent.subscribe(data => {
    hitGroundEvent.emit({ x: actorObject.pos.x, y: actorObject.pos.y });
    checkScoring();
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
  let ballSize = 40; // Default size

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
      const width = parseInt(element.style.width);
      if (width) {
        ballSize = width;
      }
    }
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

    // The slime's collision center Y is at the top middle of the half-circle
    const slimeY = slime.ao.pos.y;

    // For a half-circle, the collision radius equals its width/2
    const slimeRadius = slime.ao.realRadius;

    // Use the physics module to check for collision
    if (circlesCollide(
      { x: ballX, y: ballY },
      ballRadius,
      { x: slimeX, y: slimeY },
      slimeRadius
    )) {
      // Debug output
      // console.log("COLLISION DETECTED");
      // console.log("Ball:", ballX, ballY, "radius:", ballRadius);
      // console.log("Slime:", slimeX, slimeY, "radius:", slimeRadius);
      // console.log(slime);

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

      // Get velocities
      const ballVelocity = {
        x: actorObject._velocity.x,
        y: actorObject._velocity.y
      };

      const slimeVelocity = {
        x: slime.ao._velocity ? slime.ao._velocity.x : 0,
        y: slime.ao._velocity ? slime.ao._velocity.y : 0
      };

      // Use physics module to resolve collision
      const slimeBounce = physics.SLIME_BOUNCE_FACTOR || 1.2;
      const result = resolveCircleCollision(
        { x: ballX, y: ballY },
        ballVelocity,
        1, // Ball mass
        { x: slimeX, y: slimeY },
        slimeVelocity,
        5, // Slime mass (heavier than ball)
        slimeBounce
      );

      // Apply resulting velocity to ball
      actorObject._velocity.x = result.v1.x;
      actorObject._velocity.y = result.v1.y;

      // Add additional "spin" based on slime's horizontal velocity
      if (slime.ao._velocity) {
        actorObject._velocity.x += slime.ao._velocity.x * 0.8;
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
    element,
    ao: actorObject,
    hitGroundEvent,
    hitNetEvent,
    hitSlimeEvent,
    hitWallEvent,
    scoredEvent
  };
}
