import { Ball } from './ball.js';
// Import necessary functions from the new graphics module
import { createBallElement } from '../ui/ballGraphics.js';
// Import config details needed here
import { physics as configPhysics, dimensions as configDimensions } from '../../config.js';
import { gameObjects } from '../core/objectRegistry.js'; // Used for ground level detection

/**
 * Ball manager module for handling multiple balls in the game.
 * @module ballManager
 */

// Module-level variables to store state
let balls = [];
let mainBall = null;
let gameContainer = null;
let fieldDimensions = null; // Store reference to field dimensions object

/**
 * Initializes the ball manager with the game container and initial field dimensions.
 * Should be called once when the game environment is set up.
 * @param {HTMLElement} container - The main DOM element for the game area.
 * @param {Object} field - An object containing initial field dimensions { width, height }.
 */
export const initBallManager = (container, field) => {
  if (!container || !field) {
    console.error("BallManager init failed: Invalid container or field dimensions provided.");
    return;
  }
  gameContainer = container;
  fieldDimensions = field; // Keep the reference
  balls = []; // Reset balls array
  mainBall = null;
  console.log("Ball manager initialized.");
};

/**
 * Adds a new ball (either main game ball or extra ball) to the game.
 * Handles creation of both the graphics element and the physics logic object.
 * @param {boolean} [isBouncingBall=true] - Determines if the ball has physics enabling it to bounce indefinitely. Typically true for extra balls, false for the main scoring ball.
 * @param {Object} [initialPos=null] - Optional initial position {x, y}. If null, uses random position.
 * @param {Object} [initialVel=null] - Optional initial velocity {x, y}. Defaults to small random velocity.
 * @returns {Object|null} The created Ball instance (logic object) or null if creation failed.
 */
export const addBall = (isBouncingBall = true, initialPos = null, initialVel = null) => {
  if (!gameContainer || !fieldDimensions) {
    console.error("Cannot add ball: Ball manager not initialized.");
    return null;
  }

  // Refresh field dimensions from the container's current state
  // This helps if the container was resized since init
  const containerRect = gameContainer.getBoundingClientRect();
  fieldDimensions.width = containerRect.width;
  fieldDimensions.height = containerRect.height;

  // Determine starting position
  let startPos = initialPos;
  if (!startPos) {
    // Calculate a random position if none provided
    const padding = 80; // Padding from edges
    const randomX = padding + Math.random() * (fieldDimensions.width - 2 * padding);
    // Start in the upper half of the field for better visibility
    const randomY = padding + Math.random() * (fieldDimensions.height / 2 - padding);
    startPos = { x: randomX, y: randomY };
  }
  console.log(`BallManager: Creating ball at position (${startPos.x.toFixed(1)}, ${startPos.y.toFixed(1)})`);

  // Ball dimensions from config
  const ballConfigDims = { radius: configDimensions.BALL_RADIUS };

  // --- Create Graphics Element ---
  // Use the dedicated graphics function
  const { element: ballElement, initialSize: ballSizePx } = createBallElement(fieldDimensions, ballConfigDims);
  // Apply a random color for visual distinction (optional)
  const randomColor = `hsl(${Math.random() * 360}, 70%, 55%)`;
  ballElement.style.backgroundColor = randomColor;
  // Set initial DOM position (visual only, physics takes over)
  ballElement.style.left = `${startPos.x - ballSizePx / 2}px`;
  ballElement.style.top = `${startPos.y - ballSizePx / 2}px`;
  gameContainer.appendChild(ballElement); // Add element to the game world
  // --- End Graphics Element Creation ---

  // --- Create Physics/Logic Object ---
  // Determine ground level using registry or fallback calculation
  let groundLevel = fieldDimensions.height - (document.getElementById('ground')?.offsetHeight || 40);
  if (gameObjects.ground && typeof gameObjects.ground.height === 'number') {
    groundLevel = gameObjects.ground.height;
  } else {
    console.warn("BallManager: Ground object not found in registry, using calculated fallback.");
  }

  // Define physics constraints for the ball
  const ballConstraints = {
    rightBoundry: fieldDimensions.width,
    leftBoundry: 0,
    ground: groundLevel,
    maxVelocity: 105 // TODO: Consider moving to config if this varies
  };

  // --- Instantiate Ball and Add Diagnostics ---
  console.log("BallManager: Calling Ball() constructor...");
  let newBall;
  try {
    newBall = Ball(
      startPos, ballConfigDims, ballConstraints, fieldDimensions,
      { canBounceOnGround: isBouncingBall }
    );
    console.log("BallManager: Ball() constructor returned:", newBall); // Log the returned object
  } catch (error) {
    console.error("BallManager: Error during Ball() constructor!", error);
    ballElement?.remove(); // Clean up graphics if constructor failed
    return null;
  }


  // --- DIAGNOSTIC CHECKS ---
  if (!newBall) {
    console.error("BallManager FATAL: Ball() constructor returned undefined or null!");
    ballElement?.remove(); // Clean up graphics
    return null;
  }
  if (!newBall.actorObject) {
    console.error("BallManager FATAL: newBall.actorObject is undefined! Check Ball() constructor return value.");
    ballElement?.remove();
    return null;
  }
  // Check specifically for the velocity property after Actor refactor
  if (typeof newBall.actorObject.velocity === 'undefined') {
    console.error("BallManager FATAL: newBall.actorObject.velocity is undefined! Check Actor() constructor return value.");
    ballElement?.remove();
    return null;
  }
  if (newBall.actorObject.velocity === null) {
    console.error("BallManager FATAL: newBall.actorObject.velocity is NULL! Check Actor() constructor initialization.");
    ballElement?.remove();
    return null;
  }
  console.log("BallManager: Diagnostics passed. actorObject and actorObject.velocity seem defined.");
  console.log("BallManager: actorObject.velocity value:", JSON.stringify(newBall.actorObject.velocity));
  // --- END DIAGNOSTIC CHECKS ---


  // --- Link Graphics Element ---
  newBall.setElement(ballElement);

  // --- Set Initial Velocity (Where the error likely occurs) ---
  console.log("BallManager: Attempting to set initial velocity...");
  try {
    if (initialVel && typeof initialVel.x === 'number' && typeof initialVel.y === 'number') {
      newBall.actorObject.velocity.x = initialVel.x;
      newBall.actorObject.velocity.y = initialVel.y;
      console.log(`BallManager: Set initial velocity from parameter: {x: ${initialVel.x}, y: ${initialVel.y}}`);
    } else {
      // Default small random velocity
      const randomVelX = (Math.random() * 4) - 2;
      const randomVelY = (Math.random() * 3) - 2;
      // ** This is the area around the original error line **
      newBall.actorObject.velocity.x = randomVelX;
      newBall.actorObject.velocity.y = randomVelY;
      console.log(`BallManager: Set initial random velocity: {x: ${randomVelX.toFixed(2)}, y: ${randomVelY.toFixed(2)}}`);
    }
    // Log the velocity *after* setting it
    console.log("BallManager: Velocity after setting:", JSON.stringify(newBall.actorObject.velocity));

  } catch (error) {
    console.error("BallManager: Error occurred while setting initial velocity!", error);
    console.error(">>> State at error: newBall:", newBall); // Log the ball object
    if (newBall) console.error(">>> State at error: newBall.actorObject:", newBall.actorObject); // Log the actor object
    ballElement?.remove(); // Clean up graphics
    balls = balls.filter(b => b !== newBall); // Remove potentially broken ball from list
    return null; // Prevent adding broken ball
  }


  // Start gravity if applicable
  if (isBouncingBall) {
    newBall.startGravity();
  }

  // Add the new ball logic object to the manager's list
  balls.push(newBall);
  console.log(`BallManager: Ball added successfully. Total balls: ${balls.length}`);
  return newBall; // Return the created Ball instance
};

/**
 * Designates a specific ball instance as the main game ball.
 * @param {Object} ball - The Ball instance to set as the main ball.
 */
export const setMainBall = (ball) => {
  if (ball && typeof ball.actorObject === 'object') { // Basic validation
    mainBall = ball;
    // Ensure the main ball is actually in the managed list
    if (!balls.includes(ball)) {
      balls.push(ball);
      console.warn("setMainBall: Provided ball was not in the managed list, added it.");
    }
    console.log("Main game ball set.");
  } else {
    console.error("setMainBall failed: Invalid ball object provided.");
  }
};

/** Gets the instance designated as the main game ball. */
export const getMainBall = () => mainBall;

/**
 * Updates the physics state for all managed balls.
 * It then iterates through balls and slimes to check for collisions between them.
 * @param {Array<Object>} [slimes=[]] - An array of active slime instances in the game.
 */
export const updateBalls = (slimes = []) => {
  if (!Array.isArray(slimes)) {
    console.error("updateBalls: Invalid slimes array provided.");
    slimes = [];
  }

  // 1. Update physics for each ball
  balls.forEach((ballObj) => {
    // Check if ballObj and its update method exist
    if (ballObj?.update) {
      ballObj.update(); // Updates position based on velocity, handles world collisions (walls, ground, net) via its Actor
    } else {
      // Avoid excessive logging, maybe only log once per invalid object?
      // console.warn("updateBalls: Found invalid ball object in array during update.");
    }
  });

  // 2. Check for Ball-Slime collisions *after* all positions are updated
  balls.forEach((ballObj) => {
    // Check ball is valid and has collision method + valid actor + valid velocity
    // Ensure actorObject and velocity exist before attempting collision check
    if (ballObj?.checkSlimeCollision && ballObj.actorObject?.velocity) {
      slimes.forEach((slime) => {
        // Check slime is valid and has valid actor + valid velocity
        // Slime velocity check might be optional depending on collision physics needs
        if (slime?.actorObject?.velocity) {
          ballObj.checkSlimeCollision(slime); // Ball checks against the slime
        } else {
          // Slime might be invalid or missing properties, log sparingly
          // console.warn("updateBalls: Found invalid slime object in array during collision check.");
        }
      });
    } else if (ballObj && !ballObj.actorObject?.velocity) {
      // Log if a ball is missing actor/velocity during collision phase
      console.warn("updateBalls: Ball object missing valid actor/velocity during collision check.", ballObj);
    }
  });
};


/** Renders all managed balls by calling their individual render methods. */
export const renderBalls = () => {
  balls.forEach((ballObj) => {
    // Check if ballObj, its render method, actorObject, and actorObject.pos exist
    if (ballObj?.render && ballObj.actorObject?.pos) {
      ballObj.render();
    } else if (ballObj) {
      // Log sparingly if ball object is invalid for rendering
      // console.warn("renderBalls: Ball object missing required properties for rendering.", ballObj);
    }
  });
};

/**
 * Removes all ball instances EXCEPT the one designated as the main game ball.
 * Also removes their corresponding DOM elements.
 */
export const cleanupExtraBalls = () => {
  console.log(`Cleaning up extra balls. Current count: ${balls.length}, Main ball set: ${!!mainBall}`);
  balls = balls.filter(ballObj => {
    // Keep the main ball
    if (ballObj === mainBall) {
      return true;
    }
    // Remove others and their elements
    if (ballObj?.element) {
      ballObj.element.remove();
    }
    return false; // Remove from array
  });
  console.log(`Cleanup complete. Remaining balls: ${balls.length}`);
};

/**
 * Removes ALL ball instances, including the main game ball and their DOM elements.
 * Resets the manager state.
 */
export const cleanupAllBalls = () => {
  console.log(`Cleaning up ALL balls. Current count: ${balls.length}`);
  balls.forEach(ballObj => {
    if (ballObj?.element) {
      ballObj.element.remove();
    }
  });
  // Reset state
  balls = [];
  mainBall = null;
  console.log("All balls cleaned up.");
};

/** Gets the current array of all managed ball instances. */
export const getAllBalls = () => balls;
