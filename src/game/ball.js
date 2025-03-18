import { Event } from '../core/events.js';
import Actor from './actor.js';
import { physics } from '../../config.js';

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

  // Override the actor's update position method to handle ball-specific collisions
  const originalUpdatePosition = actorObject.update;
  actorObject.update = () => {
    originalUpdatePosition();
    checkCollisions();
  };

  // Increase the ball's bounciness
  const bounceFactor = physics.BOUNCE_FACTOR || 0.8; // 80% energy retained on bounce

  // Reference to the ball DOM element
  let element = null;

  // Ball size (diameter) in pixels
  let ballSize = 40; // Default size

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
   * Checks for collisions with game elements
   */
  const checkCollisions = () => {
    // Ground collision with bounce
    if (actorObject.pos.y + ballSize / 2 >= constraints.ground && actorObject._velocity.y > 0) {
      // Reset position to sit exactly on the ground
      actorObject.pos.y = constraints.ground - ballSize / 2;

      // Apply bounce if the ball has enough velocity
      if (Math.abs(actorObject._velocity.y) > 0.5) {
        actorObject._velocity.y = -actorObject._velocity.y * bounceFactor;
      } else {
        // Stop if the bounce would be too small
        actorObject._velocity.y = 0;
      }

      hitGroundEvent.emit({ x: actorObject.pos.x, y: actorObject.pos.y });
      checkScoring();
    }

    // Wall collisions with bounce
    const netWidth = field.width * 0.03; // Net width (3% of field width)
    const netCenter = field.width / 2;
    const netLeft = netCenter - (netWidth / 2);
    const netRight = netCenter + (netWidth / 2);
    const netHeight = field.height * 0.2; // Net height (20% of field height)
    const netTop = constraints.ground - netHeight;

    // Check if hitting sides of the field
    if (actorObject.pos.x - ballSize / 2 <= constraints.leftBoundry) {
      actorObject.pos.x = constraints.leftBoundry + ballSize / 2;
      actorObject._velocity.x = -actorObject._velocity.x * bounceFactor;
      hitWallEvent.emit({ side: 'left' });
    } else if (actorObject.pos.x + ballSize / 2 >= constraints.rightBoundry) {
      actorObject.pos.x = constraints.rightBoundry - ballSize / 2;
      actorObject._velocity.x = -actorObject._velocity.x * bounceFactor;
      hitWallEvent.emit({ side: 'right' });
    }

    // Check net collision
    const ballBottom = actorObject.pos.y + ballSize / 2;
    const ballTop = actorObject.pos.y - ballSize / 2;
    const ballLeft = actorObject.pos.x - ballSize / 2;
    const ballRight = actorObject.pos.x + ballSize / 2;

    if (
      ballRight >= netLeft &&
      ballLeft <= netRight &&
      ballBottom >= netTop
    ) {
      // Determine which side/part of the net the ball hit
      if (actorObject._velocity.x > 0 && actorObject.pos.x < netCenter) {
        // Ball moving right, hitting left side of net
        actorObject.pos.x = netLeft - ballSize / 2;
        actorObject._velocity.x = -actorObject._velocity.x * bounceFactor;
      } else if (actorObject._velocity.x < 0 && actorObject.pos.x > netCenter) {
        // Ball moving left, hitting right side of net
        actorObject.pos.x = netRight + ballSize / 2;
        actorObject._velocity.x = -actorObject._velocity.x * bounceFactor;
      } else if (actorObject._velocity.y > 0 && ballTop < netTop) {
        // Ball moving down, hitting top of net
        actorObject.pos.y = netTop - ballSize / 2;
        actorObject._velocity.y = -actorObject._velocity.y * bounceFactor;
      }

      hitNetEvent.emit({ x: actorObject.pos.x, y: actorObject.pos.y });
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

    const slimeWidth = slimeDimensions.width;
    const slimeHeight = slimeDimensions.height;

    // The slime's center X is at center bottom
    const slimeX = slime.ao.pos.x;

    // The slime's collision center Y is at the top middle of the half-circle
    const slimeY = slime.ao.pos.y;

    // For a half-circle, the collision radius equals its width/2
    const slimeRadius = slime.ao.realRadius;

    // Calculate distance between centers
    const dx = ballX - slimeX;
    const dy = ballY - slimeY;
    const distance = Math.sqrt(dx * dx + dy * dy);


    // Check for collision
    if (distance < ballRadius + slimeRadius) {
      console.log("COLLISION DETECTED");
      // Debug output
      console.log("Ball:", ballX, ballY, "radius:", ballRadius);
      console.log("Slime:", slimeX, slimeY, "radius:", slimeRadius);
      console.log(slime)
      console.log("Distance:", distance, "Sum of radii:", ballRadius + slimeRadius);

      // Calculate collision normal
      const nx = dx / distance;
      const ny = dy / distance;

      // Move ball outside slime
      actorObject.pos.x = slimeX + nx * (ballRadius + slimeRadius);
      actorObject.pos.y = slimeY + ny * (ballRadius + slimeRadius);

      // Calculate relative velocity
      const vx = actorObject._velocity.x - (slime.ao._velocity ? slime.ao._velocity.x : 0);
      const vy = actorObject._velocity.y - (slime.ao._velocity ? slime.ao._velocity.y : 0);

      // Calculate velocity along the normal
      const vn = vx * nx + vy * ny;

      // Only respond if objects are moving toward each other
      if (vn < 0) {
        // Calculate bounce impulse
        const slimeBounce = physics.SLIME_BOUNCE_FACTOR || 1.2;
        const impulse = -(1 + slimeBounce) * vn;

        // Apply impulse to ball velocity
        actorObject._velocity.x += impulse * nx;
        actorObject._velocity.y += impulse * ny;

        // Apply additional "spin" based on slime's horizontal velocity
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
