import { Ball } from './ball.js';
import { physics } from '../../config.js';
import { gameObjects } from '../core/objectRegistry.js';

/**
 * Ball manager module for handling multiple balls
 * @module ballManager
 */

/**
 * Array to track all balls in the game
 * @type {Array<Object>}
 */
let balls = [];

/**
 * Reference to the main game ball
 * @type {Object}
 */
let mainBall = null;

/**
 * Reference to the game container element
 * @type {HTMLElement}
 */
let gameContainer = null;

/**
 * Field dimensions reference
 * @type {Object}
 */
let fieldDimensions = null;

/**
 * Initializes the ball manager
 * 
 * @param {HTMLElement} container - Game container element
 * @param {Object} field - Field dimensions
 */
export const initBallManager = (container, field) => {
  gameContainer = container;
  fieldDimensions = field;
  balls = [];
  mainBall = null;
};

/**
 * Adds a new ball to the game
 * 
 * @param {boolean} isBouncingBall - Whether the ball should continuously bounce
 * @param {number} [size=0.5] - Relative size of the ball
 * @returns {Object|null} The created ball object or null if creation failed
 */
export const addBall = (isBouncingBall = true, size = 0.5) => {
  if (!gameContainer || !fieldDimensions) {
    console.error("Ball manager not initialized");
    return null;
  }

  // Update field dimensions based on current container size
  const containerRect = gameContainer.getBoundingClientRect();
  fieldDimensions.width = containerRect.width;
  fieldDimensions.height = containerRect.height;

  // Calculate a random position WITHIN the visible field area with more padding
  const padding = 80; // Increased padding to ensure visibility
  const randomX = padding + Math.random() * (fieldDimensions.width - 2 * padding);
  const randomY = padding + Math.random() * (fieldDimensions.height / 2 - padding);

  console.log(`Creating ball at position (${randomX}, ${randomY})`);

  // Fixed ball size
  const ballSizePx = Math.round((fieldDimensions.width / physics.K) * size * 2);

  // Create ball DOM element
  const ballElement = document.createElement('div');
  ballElement.classList.add('ball');

  // Generate a random color for the ball
  const randomColor = `hsl(${Math.random() * 360}, 80%, 60%)`;
  ballElement.style.backgroundColor = randomColor;

  // Set fixed ball size
  ballElement.style.width = `${ballSizePx}px`;
  ballElement.style.height = `${ballSizePx}px`;

  // Set initial position directly on the DOM element
  ballElement.style.left = `${randomX - ballSizePx / 2}px`;
  ballElement.style.top = `${randomY - ballSizePx / 2}px`;

  // Add to DOM
  gameContainer.appendChild(ballElement);

  // Use ground level from registry if available
  let groundLevel = fieldDimensions.height - 40; // Default fallback
  console.log(gameObjects)
  if (gameObjects.ground && gameObjects.ground.height !== undefined) {
    groundLevel = gameObjects.ground.height;
  }

  // Create dimensions and constraints for the ball
  const ballDimensions = { radius: size };
  const ballConstraints = {
    rightBoundry: fieldDimensions.width,
    leftBoundry: 0,
    ground: groundLevel,
    maxVelocity: 15
  };

  // Create the ball with the proper physics
  const newBall = Ball(
    { x: randomX, y: randomY }, // Initial position
    ballDimensions,
    ballConstraints,
    fieldDimensions,
    {
      canBounceOnGround: isBouncingBall,
      bounceFactor: physics.BOUNCE_FACTOR * 0.9
    }
  );

  // Set the DOM element
  newBall.setElement(ballElement);

  // Give the ball a random initial velocity - gentler for visibility
  newBall.ao._velocity.x = (Math.random() * 4) - 2; // -2 to 2
  newBall.ao._velocity.y = Math.random() * -2; // 0 to -2 (upward)

  // Ensure gravity is applied (if needed)
  if (isBouncingBall) {
    newBall.ao._downwardAcceleration = physics.GRAVITY;
  }

  // Add to the balls array
  balls.push(newBall);

  return newBall;
}

/**
 * Sets the main game ball
 * 
 * @param {Object} ball - Main ball object
 */
export const setMainBall = (ball) => {
  mainBall = ball;

  // Make sure main ball is in the balls array
  if (ball && !balls.includes(ball)) {
    balls.push(ball);
  }
};

/**
 * Gets the main game ball
 * 
 * @returns {Object|null} Main ball object or null
 */
export const getMainBall = () => {
  return mainBall;
};

/**
 * Updates all balls physics
 * 
 * @param {Array<Object>} slimes - Array of slime objects for collision detection
 */
export const updateBalls = (slimes) => {
  balls.forEach((ballObj) => {
    if (ballObj && typeof ballObj.update === 'function') {
      ballObj.update();

      // Check for ball-slime collisions
      slimes.forEach((slime) => {
        if (slime && typeof ballObj.checkSlimeCollision === 'function') {
          ballObj.checkSlimeCollision(slime);
        }
      });
    }
  });
};

/**
 * Renders all balls
 */
export const renderBalls = () => {
  balls.forEach((ballObj) => {
    if (ballObj && typeof ballObj.render === 'function') {
      ballObj.render();
    }
  });
};

/**
 * Cleans up all balls except the main game ball
 */
export const cleanupExtraBalls = () => {
  // Remove all balls from DOM except main game ball
  balls.forEach(ballObj => {
    if (ballObj !== mainBall && ballObj && ballObj.element) {
      ballObj.element.remove();
    }
  });

  // Reset to just the main game ball if it exists
  balls = mainBall ? [mainBall] : [];
};

/**
 * Cleans up all balls including the main game ball
 */
export const cleanupAllBalls = () => {
  // Remove all balls from DOM
  balls.forEach(ballObj => {
    if (ballObj && ballObj.element) {
      ballObj.element.remove();
    }
  });

  // Clear arrays and references
  balls = [];
  mainBall = null;
};

/**
 * Gets all balls
 * 
 * @returns {Array<Object>} Array of all ball objects
 */
export const getAllBalls = () => {
  return balls;
};
