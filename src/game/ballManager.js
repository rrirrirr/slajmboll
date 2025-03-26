import { Ball } from './ball.js';
import { physics } from '../../config.js';

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

  // Calculate a random position within the field
  const randomX = Math.random() * fieldDimensions.width;
  const randomY = Math.random() * (fieldDimensions.height / 3); // Start in top third

  // Ground level (default to 40px from bottom)
  const groundLevel = fieldDimensions.height - 40;

  // Create dimensions and constraints for the ball
  const ballDimensions = { radius: size };
  const ballConstraints = {
    rightBoundry: fieldDimensions.width,
    leftBoundry: 0,
    ground: groundLevel,
    maxVelocity: 15
  };

  // Calculate ball size in pixels based on relative size
  const ballSizePx = Math.round((fieldDimensions.width / 20) * size);

  // Create ball DOM element
  const ballElement = document.createElement('div');
  ballElement.classList.add('ball');

  // Generate a random color for the ball
  const randomColor = `hsl(${Math.random() * 360}, 80%, 60%)`;
  ballElement.style.backgroundColor = randomColor;

  // Set ball size
  ballElement.style.width = `${ballSizePx}px`;
  ballElement.style.height = `${ballSizePx}px`;

  // Add to DOM
  gameContainer.appendChild(ballElement);

  // Create the ball using the Ball factory with bouncing option
  const newBall = Ball(
    { x: randomX, y: randomY },
    ballDimensions,
    ballConstraints,
    fieldDimensions,
    {
      canBounceOnGround: isBouncingBall, // Enable continuous bouncing
      bounceFactor: physics.BOUNCE_FACTOR * 0.9 // Slightly reduced bounce
    }
  );

  // Set the DOM element
  newBall.setElement(ballElement);

  // Give the ball a random initial velocity
  newBall.ao._velocity.x = (Math.random() * 10) - 5; // -5 to 5
  newBall.ao._velocity.y = (Math.random() * 4) - 4; // -4 to 0 (mostly downward)

  // Add to the balls array
  balls.push(newBall);

  console.log(`Added new ball. Total balls: ${balls.length}`);
  return newBall;
};

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
