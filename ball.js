import { Event } from './events.js';
import { GRAVITY, TERMINALVELOCITY } from './constants.js';
import Actor from './actor.js';
import { Animation } from './Animations.js';

export function Ball(pos, dimensions, constraints, field, animationsEvent) {
  // Create events for ball collisions
  const hitGroundEvent = Event('ball hit ground');
  const hitNetEvent = Event('ball hit net');
  const hitSlimeEvent = Event('ball hit slime');
  const hitWallEvent = Event('ball hit wall');
  const scoredEvent = Event('ball scored');

  // Create ball actor for physics
  const ao = Actor(
    pos,
    { x: 0, y: 0 },
    dimensions.radius,
    constraints.rightBoundry,
    constraints.leftBoundry,
    constraints.ground,
    constraints.maxVelocity
  );

  // Override the actor's update position method to handle ball-specific collisions
  const originalUpdatePosition = ao.update;
  ao.update = () => {
    originalUpdatePosition();
    checkCollisions();
  };

  // Increase the ball's bounciness
  const bounceFactor = 0.8; // 80% energy retained on bounce

  // Reference to the ball DOM element
  let element = null;

  // Set the DOM element
  const setElement = (el) => {
    element = el;
  };

  // Create or get the ball DOM element
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

  // Check for collisions with game elements
  const checkCollisions = () => {
    // Ground collision with bounce
    if (ao.pos.y >= constraints.ground && ao._velocity.y > 0) {
      ao.pos.y = constraints.ground;

      // Apply bounce if the ball has enough velocity
      if (Math.abs(ao._velocity.y) > 0.5) {
        ao._velocity.y = -ao._velocity.y * bounceFactor;

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
        ao._velocity.y = 0;
      }

      hitGroundEvent.emit({ x: ao.pos.x, y: ao.pos.y });
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
    if (ao.pos.x - ao.realRadius <= constraints.leftBoundry) {
      ao.pos.x = constraints.leftBoundry + ao.realRadius;
      ao._velocity.x = -ao._velocity.x * bounceFactor;
      hitWallEvent.emit({ side: 'left' });
    } else if (ao.pos.x + ao.realRadius >= constraints.rightBoundry) {
      ao.pos.x = constraints.rightBoundry - ao.realRadius;
      ao._velocity.x = -ao._velocity.x * bounceFactor;
      hitWallEvent.emit({ side: 'right' });
    }

    // Check net collision
    const ballBottom = ao.pos.y + ao.realRadius;
    if (
      ao.pos.x + ao.realRadius >= netLeft &&
      ao.pos.x - ao.realRadius <= netRight &&
      ballBottom >= netTop
    ) {
      // Determine which side of the net the ball hit
      if (ao._velocity.x > 0 && ao.pos.x < netCenter) {
        // Ball moving right, hitting left side of net
        ao.pos.x = netLeft - ao.realRadius;
        ao._velocity.x = -ao._velocity.x * bounceFactor;
      } else if (ao._velocity.x < 0 && ao.pos.x > netCenter) {
        // Ball moving left, hitting right side of net
        ao.pos.x = netRight + ao.realRadius;
        ao._velocity.x = -ao._velocity.x * bounceFactor;
      } else if (ao._velocity.y > 0) {
        // Ball moving down, hitting top of net
        ao.pos.y = netTop - ao.realRadius;
        ao._velocity.y = -ao._velocity.y * bounceFactor;
      }

      hitNetEvent.emit({ x: ao.pos.x, y: ao.pos.y });

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

  // Check if a team scored
  const checkScoring = () => {
    // Ball must be on the ground
    if (ao.pos.y < constraints.ground - 5) return;

    // Determine which side scored
    const scoringSide = ao.pos.x < field.width / 2 ? 2 : 1;

    // Only score if the ball has very little vertical velocity
    if (Math.abs(ao._velocity.y) < 0.8) {
      scoredEvent.emit({
        scoringSide,
        position: { x: ao.pos.x, y: ao.pos.y }
      });
    }
  };

  // Check collision with a slime
  const checkSlimeCollision = (slime) => {
    if (!slime || !slime.ao) return false;

    // Get slime position and radius
    const slimeX = slime.ao.pos.x;
    const slimeY = slime.ao.pos.y - slime.ao.realRadius / 2; // Adjust for slime height
    const slimeRadius = slime.ao.realRadius;

    // Calculate distance between ball and slime
    const dx = ao.pos.x - slimeX;
    const dy = ao.pos.y - slimeY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if collision occurred
    if (distance < ao.realRadius + slimeRadius) {
      // Calculate collision normal
      const nx = dx / distance;
      const ny = dy / distance;

      // Adjust ball position to prevent overlap
      ao.pos.x = slimeX + nx * (ao.realRadius + slimeRadius);
      ao.pos.y = slimeY + ny * (ao.realRadius + slimeRadius);

      // Calculate relative velocity
      const vx = ao._velocity.x - (slime.ao._velocity ? slime.ao._velocity.x : 0);
      const vy = ao._velocity.y - (slime.ao._velocity ? slime.ao._velocity.y : 0);

      // Calculate velocity along the normal
      const vn = vx * nx + vy * ny;

      // Only respond if objects are moving toward each other
      if (vn < 0) {
        // Calculate bounce impulse
        const impulse = -(1 + bounceFactor) * vn;

        // Apply impulse to ball velocity
        ao._velocity.x += impulse * nx;
        ao._velocity.y += impulse * ny;

        // Apply additional "spin" based on slime's horizontal velocity
        if (slime.ao._velocity) {
          ao._velocity.x += slime.ao._velocity.x * 0.5;
        }

        // Emit collision event
        hitSlimeEvent.emit({
          slimeId: slime.slimeId,
          teamNumber: slime.teamNumber,
          velocity: { x: ao._velocity.x, y: ao._velocity.y },
          position: { x: ao.pos.x, y: ao.pos.y }
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

  // Reset the ball with specified position and velocity
  const reset = (position, velocity = { x: 0, y: 0 }) => {
    ao.pos.x = position.x;
    ao.pos.y = position.y;
    ao._velocity.x = velocity.x;
    ao._velocity.y = velocity.y;
  };

  // Start ball gravity
  const startGravity = () => {
    ao._downwardAcceleration = GRAVITY;
  };

  // Stop ball gravity and velocity
  const stopPhysics = () => {
    ao._downwardAcceleration = 0;
    ao._velocity.x = 0;
    ao._velocity.y = 0;
  };

  // Update ball position each frame
  const update = () => {
    ao.update();
  };

  // Render ball position to DOM
  const render = () => {
    if (element) {
      const ballSize = parseInt(element.style.width);
      element.style.left = `${ao.pos.x - ballSize / 2}px`;
      element.style.top = `${ao.pos.y - ballSize / 2}px`;
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
    ao,
    hitGroundEvent,
    hitNetEvent,
    hitSlimeEvent,
    hitWallEvent,
    scoredEvent
  };
}
