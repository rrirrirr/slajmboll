import { Event } from '../core/events.js';
import Actor from './actor.js';
import { Animation, animationsEvent } from '../utils/animations.js';
import { physics } from '../../config.js';

/**
 * @typedef {Object} BallConstraints
 * @property {number} rightBoundry - Right boundary limit
 * @property {number} leftBoundry - Left boundary limit
 * @property {number} ground - Ground level y-coordinate
 * @property {number} maxVelocity - Maximum velocity
 */

/**
 * @typedef {Object} FieldDimensions
 * @property {number} width - Field width
 * @property {number} height - Field height
 */

/**
 * @typedef {Object} BallEvents
 * @property {Object} hitGroundEvent - Event for ground collision
 * @property {Object} hitNetEvent - Event for net collision
 * @property {Object} hitSlimeEvent - Event for slime collision
 * @property {Object} hitWallEvent - Event for wall collision
 * @property {Object} scoredEvent - Event for scoring
 */

/**
 * Creates a ball entity for the game
 * 
 * @param {Object} position - Initial position {x, y}
 * @param {Object} dimensions - Ball dimensions {radius}
 * @param {BallConstraints} constraints - Movement constraints
 * @param {FieldDimensions} field - Field dimensions
 * @param {Object} animationsEvent - Event for visual animations
 * @returns {Object} Ball object with physics and rendering methods
 */
export function Ball(position, dimensions, constraints, field, animationsEvent) {
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

  /**
   * Sets the DOM element for the ball
   * 
   * @param {HTMLElement} el - Ball DOM element
   */
  const setElement = (el) => {
    element = el;
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
    const ballSize = (field.width / 20) * dimensions.radius;
    element.style.width = `${ballSize}px`;
    element.style.height = `${ballSize}px`;

    return element;
  };

  /**
   * Checks for collisions with game elements
   */
  const checkCollisions = () => {
    // Ground collision with bounce
    if (actorObject.pos.y >= constraints.ground - actorObject.realRadius && actorObject._velocity.y > 0) {
      // Reset position to sit exactly on the ground (accounting for radius)
      actorObject.pos.y = constraints.ground - actorObject.realRadius;

      // Apply bounce if the ball has enough velocity
      if (Math.abs(actorObject._velocity.y) > 0.5) {
        actorObject._velocity.y = -actorObject._velocity.y * bounceFactor;

        // Visual feedback for ground hit
        if (animationsEvent) {
          animationsEvent.emit(
            Animation(
              5,
              (frame) => {
                if (element) {
                  element.style.boxShadow = `0 0 ${frame * 2}px rgba(0, 0, 0, 0.3)`;
                }
                if (frame < 2) element.style.boxShadow = '';
              },
              (frame) => frame < 1
            )
          );
        }
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
    if (actorObject.pos.x - actorObject.realRadius <= constraints.leftBoundry) {
      actorObject.pos.x = constraints.leftBoundry + actorObject.realRadius;
      actorObject._velocity.x = -actorObject._velocity.x * bounceFactor;
      hitWallEvent.emit({ side: 'left' });
    } else if (actorObject.pos.x + actorObject.realRadius >= constraints.rightBoundry) {
      actorObject.pos.x = constraints.rightBoundry - actorObject.realRadius;
      actorObject._velocity.x = -actorObject._velocity.x * bounceFactor;
      hitWallEvent.emit({ side: 'right' });
    }

    // Check net collision
    const ballBottom = actorObject.pos.y + actorObject.realRadius;
    const ballTop = actorObject.pos.y - actorObject.realRadius;
    const ballLeft = actorObject.pos.x - actorObject.realRadius;
    const ballRight = actorObject.pos.x + actorObject.realRadius;

    if (
      ballRight >= netLeft &&
      ballLeft <= netRight &&
      ballBottom >= netTop
    ) {
      // Determine which side/part of the net the ball hit
      if (actorObject._velocity.x > 0 && actorObject.pos.x < netCenter) {
        // Ball moving right, hitting left side of net
        actorObject.pos.x = netLeft - actorObject.realRadius;
        actorObject._velocity.x = -actorObject._velocity.x * bounceFactor;
      } else if (actorObject._velocity.x < 0 && actorObject.pos.x > netCenter) {
        // Ball moving left, hitting right side of net
        actorObject.pos.x = netRight + actorObject.realRadius;
        actorObject._velocity.x = -actorObject._velocity.x * bounceFactor;
      } else if (actorObject._velocity.y > 0 && ballTop < netTop) {
        // Ball moving down, hitting top of net
        actorObject.pos.y = netTop - actorObject.realRadius;
        actorObject._velocity.y = -actorObject._velocity.y * bounceFactor;
      }

      hitNetEvent.emit({ x: actorObject.pos.x, y: actorObject.pos.y });

      // Visual feedback for net hit
      if (animationsEvent) {
        animationsEvent.emit(
          Animation(
            5,
            (frame) => {
              if (element) {
                element.style.backgroundColor = `rgba(128, 0, 128, ${0.5 + frame * 0.1})`;
              }
              if (frame < 2) element.style.backgroundColor = '';
            },
            (frame) => frame < 1
          )
        );
      }
    }
  };

  /**
   * Checks if a team scored
   */
  const checkScoring = () => {
    // Ball must be on or very near the ground
    if (actorObject.pos.y < constraints.ground - actorObject.realRadius * 1.2) return;

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
   * Checks collision with a slime
   * 
   * @param {Object} slime - Slime object to check collision with
   * @returns {boolean} True if collision occurred
   */
  const checkSlimeCollision = (slime) => {
    if (!slime || !slime.ao) return false;

    // Get slime position and radius
    const slimeX = slime.ao.pos.x;
    const slimeY = slime.ao.pos.y - slime.ao.realRadius / 2; // Adjust for slime height
    const slimeRadius = slime.ao.realRadius;

    // Calculate distance between ball and slime
    const dx = actorObject.pos.x - slimeX;
    const dy = actorObject.pos.y - slimeY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if collision occurred
    if (distance < actorObject.realRadius + slimeRadius) {
      // Calculate collision normal
      const nx = dx / distance;
      const ny = dy / distance;

      // Adjust ball position to prevent overlap
      actorObject.pos.x = slimeX + nx * (actorObject.realRadius + slimeRadius);
      actorObject.pos.y = slimeY + ny * (actorObject.realRadius + slimeRadius);

      // Calculate relative velocity
      const vx = actorObject._velocity.x - (slime.ao._velocity ? slime.ao._velocity.x : 0);
      const vy = actorObject._velocity.y - (slime.ao._velocity ? slime.ao._velocity.y : 0);

      // Calculate velocity along the normal
      const vn = vx * nx + vy * ny;

      // Only respond if objects are moving toward each other
      if (vn < 0) {
        // Calculate bounce impulse
        const impulse = -(1 + bounceFactor) * vn;

        // Apply impulse to ball velocity
        actorObject._velocity.x += impulse * nx;
        actorObject._velocity.y += impulse * ny;

        // Apply additional "spin" based on slime's horizontal velocity
        if (slime.ao._velocity) {
          actorObject._velocity.x += slime.ao._velocity.x * 0.5;
        }

        // Emit collision event
        hitSlimeEvent.emit({
          slimeId: slime.slimeId,
          teamNumber: slime.teamNumber,
          velocity: { x: actorObject._velocity.x, y: actorObject._velocity.y },
          position: { x: actorObject.pos.x, y: actorObject.pos.y }
        });

        // Visual feedback for slime hit
        if (animationsEvent) {
          animationsEvent.emit(
            Animation(
              5,
              (frame) => {
                if (element) {
                  element.style.transform = `scale(${1 + frame * 0.05})`;
                }
                if (frame < 2) element.style.transform = '';
              },
              (frame) => frame < 1
            )
          );
        }

        return true;
      }
    }

    return false;
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
      const ballSize = parseInt(element.style.width);
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
    element,
    ao: actorObject,
    hitGroundEvent,
    hitNetEvent,
    hitSlimeEvent,
    hitWallEvent,
    scoredEvent
  };
}
