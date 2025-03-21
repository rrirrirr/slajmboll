import { Event, events } from '../core/events.js';
import Actor from './actor.js';
import { createSlimeElement, updateSlimeTeamAppearance, renderSlime } from '../ui/slimeGraphics.js';
import { Animation } from '../utils/animations.js';
import { movement, physics } from '../../config.js';
import {
  startJump,
  startOppositeRun,
  startRun,
  startWallJump,
  startDirectionChangeJump
} from './movements.js';

/**
 * @typedef {Object} SlimeAppearance
 * @property {string} color - Color of the slime
 * @property {Object} [decorations] - Optional decorative elements
 */

/**
 * @typedef {Object} SlimeDimensions
 * @property {number} radius - Collision radius
 */

/**
 * @typedef {Object} SlimeConstraints
 * @property {number} rightBoundry - Right boundary
 * @property {number} leftBoundry - Left boundary
 * @property {number} ground - Ground level
 * @property {number} maxVelocity - Maximum velocity
 */

/**
 * Creates a slime character entity
 * 
 * @param {number} team - Team number (1 or 2)
 * @param {number} teamNumber - Player index
 * @param {Object} pos - Initial position {x, y}
 * @param {SlimeAppearance} appearance - Visual appearance
 * @param {SlimeDimensions} dimensions - Physical dimensions
 * @param {SlimeConstraints} constraints - Movement constraints
 * @param {Object} game - Game controller
 * @param {Object} keys - Input handlers
 * @returns {Object} Slime entity
 */
export function Slime(
  team,
  teamNumber,
  pos,
  appearance,
  dimensions,
  constraints,
  game,
  keys
) {
  // Get global events
  const delayedActionsEvent = events.get('delayed actions');
  const animationsEvent = events.get('animations');

  // Setup instance variables
  let currentTeam = team;
  const slimeAppearance = appearance;
  const gameController = game;

  // Create unique identifier for this slime
  const slimeId = `slime_${teamNumber}_${Date.now()}`;

  // Physics constants and dimensions
  let areaWidth;
  let radius;
  let slimeWidth;
  let slimeHeight;
  let runAcceleration;
  let bonusStartAcceleration;
  let dashAcceleration;
  let bonusThreshold;
  let runDeceleration;

  /**
   * Sets up slime constants based on constraints
   * 
   * @param {SlimeConstraints} slimeConstraints - Movement constraints
   */
  const setupConstants = (slimeConstraints) => {
    areaWidth = slimeConstraints.rightBoundry - slimeConstraints.leftBoundry;
    radius = dimensions.radius;
    slimeWidth = (areaWidth / physics.K) * radius;
    slimeHeight = slimeWidth / 2;
    runAcceleration = (areaWidth / physics.K) * movement.RUN_ACCELERATION;
    bonusStartAcceleration = runAcceleration * 2;
    dashAcceleration = (areaWidth / physics.K) * 0.052;
    bonusThreshold = runAcceleration * 5;
  };

  // Initialize constants
  setupConstants(constraints);

  // Movement state
  let bonusAcceleration = 1;
  let jumpAcceleration = movement.JUMP_ACCELERATION;
  let bonusJumpAcceleration = jumpAcceleration * movement.DIRECTION_CHANGE_BONUS;

  // Active movements
  let activeRunMovement = null;
  let activeJumpMovement = null;

  // State flags
  const bonuses = [];
  let isRunning = false;
  let isRunningLeft = false;
  let isRunningRight = false;
  let runningDirection = 0;
  let isJumping = false;
  let isDucking = false;
  let isGrounded = true;
  let hasDirectionChangeBonus = false;
  let isHuggingWall = 0;
  let hasWallJump = true;
  let lastDirectionChangeTime = 0;
  const directionChangeWindow = movement.DIRECTION_CHANGE_WINDOW;

  // Create actor with unique id, passing team information
  let actorObject = Actor(
    pos,
    { x: 0, y: 0 },
    dimensions.radius,
    constraints.rightBoundry,
    constraints.leftBoundry,
    constraints.ground,
    constraints.maxVelocity,
    game.sizeChange,
    currentTeam // Pass team to Actor
  );

  // Create DOM element with unique identifier
  const slimeElement = createSlimeElement(appearance);
  slimeElement.setAttribute('data-slime-id', slimeId);
  slimeElement.classList.add(`slime-${teamNumber}`);
  slimeElement.style.width = `${slimeWidth}px`;
  slimeElement.style.height = `${slimeHeight}px`;
  gameController.go.appendChild(slimeElement);

  /**
   * Handles jump button press
   */
  const onJumpPressed = () => {
    console.log(`Jump pressed for slime ${teamNumber}`);
    if (isJumping) {
      return;
    }

    if (isGrounded) {
      isJumping = true;
      isGrounded = false;

      // Direction change high jump
      if (lastDirectionChangeTime > 0) {
        console.log('Direction change jump!');
        lastDirectionChangeTime = 0;

        // Clear any existing jump movement
        if (activeJumpMovement) {
          actorObject.removeMovement(activeJumpMovement);
          activeJumpMovement = null;
        }

        // Temporarily increase max velocity to allow for a much higher jump
        actorObject.setMaxVelocity(5.0);

        activeJumpMovement = startDirectionChangeJump(
          actorObject,
          jumpAcceleration * 20.0,
          12, // Lock frames
          24, // total frames
          () => false, // no kill signal
          () => {
            // Callback when jump completes
            console.log('has run', isRunning, isRunningLeft, isRunningRight)
            console.log(activeRunMovement)
            console.log("Direction change jump complete");

            // Restore original jump release handler
            // onJumpReleased = originalJumpRelease;

            // Reset states
            isJumping = false;
            actorObject.resetMaxVelocity();
            activeJumpMovement = null;
          }
        );

        actorObject.addMovement(activeJumpMovement);

      }
      // else if (hasDirectionChangeBonus) {
      //   console.log('bonus jump');

      //   // Clear any existing jump movement
      //   if (activeJumpMovement) {
      //     actorObject.removeMovement(activeJumpMovement);
      //   }

      //   actorObject.setMaxVelocity(2.2);
      //   activeJumpMovement = startJump(
      //     bonusJumpAcceleration,
      //     () => !isJumping,
      //     () => {
      //       actorObject.resetMaxVelocity();
      //       activeJumpMovement = null;
      //     }
      //   );
      //   actorObject.addMovement(activeJumpMovement);
      // }
      else {
        console.log('standard jump');

        // Clear any existing jump movement
        if (activeJumpMovement) {
          actorObject.removeMovement(activeJumpMovement);
        }

        activeJumpMovement = startJump(
          jumpAcceleration,
          () => !isJumping,
          () => {
            console.log('Jump complete');
            activeJumpMovement = null;
          }
        );
        actorObject.addMovement(activeJumpMovement);
      }
    }
    else if (isHuggingWall !== 0 && hasWallJump) {
      console.log("Executing wall jump, direction:", -isHuggingWall);
      isJumping = true;
      hasWallJump = false;
      delayedActionsEvent.emit({
        slimeId: slimeId,
        delay: movement.WALL_JUMP_COOLDOWN,
        execute: () => {
          hasWallJump = true;
        }
      });

      // Visual feedback for wall jump
      animationsEvent.emit(
        Animation(
          6,
          (frame) => {
            slimeElement.style.background = `linear-gradient(${-isHuggingWall * 90}deg, ${slimeAppearance.color} ${frame * 15}%, white ${frame * 20}%)`;
            if (frame < 2) slimeElement.style.background = '';
          },
          (frame) => frame < 1
        )
      );

      // Clear any existing jump movement
      if (activeJumpMovement) {
        actorObject.removeMovement(activeJumpMovement);
      }

      actorObject.setMaxVelocity(1.2);
      activeJumpMovement = startWallJump(
        jumpAcceleration,
        -isHuggingWall,
        () => !isJumping,
        () => {
          actorObject.resetMaxVelocity();
          activeJumpMovement = null;
        }
      );
      actorObject.addMovement(activeJumpMovement);
    }
  };

  /**
   * Handles jump button release
   */
  const onJumpReleased = () => {
    console.log(`Jump released for slime ${teamNumber}`);
    isJumping = false;
  };

  /**
   * Initializes a standard run movement
   * 
   * @param {number} direction - Direction (-1 for left, 1 for right)
   */
  const initRun = (direction) => {
    // Remove existing run movement if any
    if (activeRunMovement) {
      actorObject.removeMovement(activeRunMovement);
      activeRunMovement = null;
    }

    // Create proper kill signal
    const killSignal = direction === -1
      ? () => !isRunningLeft
      : () => !isRunningRight;

    // Create and add new run movement
    activeRunMovement = startRun(runAcceleration, direction, killSignal);
    actorObject.addMovement(activeRunMovement);
  };

  /**
   * Initializes a bonus run (after direction change)
   * 
   * @param {number} direction - Direction (-1 for left, 1 for right)
   */
  const initBonusRun = (direction) => {
    console.log('Init bonus run ' + direction);

    // Remove existing run movement if any
    if (activeRunMovement) {
      actorObject.removeMovement(activeRunMovement);
      activeRunMovement = null;
    }

    hasDirectionChangeBonus = true;

    // Create proper kill signal
    const killSignal = direction === -1
      ? () => !isRunningLeft
      : () => !isRunningRight;

    actorObject.setMaxVelocity(0.15);
    activeRunMovement = startOppositeRun(
      bonusStartAcceleration,
      direction,
      killSignal,
      () => {
        hasDirectionChangeBonus = false;
        actorObject.resetMaxVelocity();
        activeRunMovement = null;
      }
    );
    actorObject.addMovement(activeRunMovement);
  };

  /**
   * Handles movement button press
   * 
   * @param {number} direction - Direction (-1 for left, 1 for right)
   */
  const onMovementPress = (direction) => {
    // Check if this is a direction change
    if (runningDirection !== 0 && runningDirection !== direction) {
      lastDirectionChangeTime = directionChangeWindow;
    }

    if (direction === -1) {
      isRunningLeft = true;
      isRunningRight = false;
    } else {
      isRunningRight = true;
      isRunningLeft = false;
    }

    runningDirection = direction;
    isRunning = true;

    // Check for bonus run condition
    if (isGrounded &&
      Math.sign(actorObject.getSpeed()) !== 0 &&
      Math.sign(actorObject.getSpeed()) !== direction &&
      Math.abs(actorObject.getSpeed()) > bonusThreshold) {
      initBonusRun(direction);
    } else {
      initRun(direction);
    }
  };

  /**
   * Handles movement button release
   * 
   * @param {number} direction - Direction (-1 for left, 1 for right)
   */
  const onMovementRelease = (direction) => {
    if (direction === -1) {
      isRunningLeft = false;
      if (runningDirection === -1) {
        runningDirection = 0;
        isRunning = false;
      }
    } else {
      isRunningRight = false;
      if (runningDirection === 1) {
        runningDirection = 0;
        isRunning = false;
      }
    }
  };

  /**
   * Handles duck button press
   */
  const onDuckPress = () => {
    isDucking = true;
  };

  /**
   * Handles duck button release
   */
  const onDuckRelease = () => {
    isDucking = false;
  };

  // Game event handlers
  const onGameStart = (data) => { };
  const onGameEnd = (data) => { };
  const onRoundStart = (data) => { };
  const onRoundEnd = (data) => { };

  /**
   * Handles ground collision
   */
  const onGroundHit = () => {
    console.log(`Ground hit for slime ${teamNumber}`);
    isGrounded = true;
    hasWallJump = true;
  };

  /**
   * Handles wall collision
   * 
   * @param {number} event - Wall direction (-1 for left, 1 for right, 0 for none)
   */
  const onWallHit = (event) => {
    console.log(`Wall hit ${event} for slime ${teamNumber}`);
    if (event !== 0) {
      isHuggingWall = event;
    } else {
      delayedActionsEvent.emit({
        slimeId: slimeId,
        delay: 10,
        execute: () => {
          isHuggingWall = 0;
        },
      });
    }
  };

  /**
   * Handles window resize
   * 
   * @param {Object} newSize - New size constraints
   */
  const onResize = (newSize) => {
    setupConstants(newSize);
    slimeElement.style.width = `${slimeWidth}px`;
    slimeElement.style.height = `${slimeHeight}px`;
  };

  /**
   * Handles team switching
   * 
   * @param {number} switchTeam - New team (1 or 2)
   */
  const onTeamSwitch = (switchTeam) => {
    currentTeam = switchTeam;

    if (switchTeam === 1) {
      slimeElement.classList.add('teamColorOne');
      slimeElement.classList.remove('teamColorTwo');
      slimeAppearance.color = 'gold';
    } else {
      slimeElement.classList.add('teamColorTwo');
      slimeElement.classList.remove('teamColorOne');
      slimeAppearance.color = 'crimson';
    }

    // Update Actor's team boundary constraints
    if (actorObject && typeof actorObject.updateTeam === 'function') {
      actorObject.updateTeam(currentTeam);
    }
  };

  // Initialize team appearance
  onTeamSwitch(team);

  /**
   * Handles net collision
   * 
   * @param {number} direction - Direction (-1 for left, 1 for right)
   */
  const onNetHit = (direction) => {
    console.log(`Net hit for slime ${teamNumber}, direction: ${direction}`);
    // Handle net collisions
    if (direction !== 0) {
      isHuggingWall = direction;
    } else {
      delayedActionsEvent.emit({
        slimeId: slimeId,
        delay: 10,
        execute: () => {
          isHuggingWall = 0;
        },
      });
    }
  };

  /**
   * Filters delayed actions to only process those for this slime
   * 
   * @param {Object} action - Delayed action
   * @returns {boolean} True if action should be processed
   */
  const filterDelayedActions = (action) => {
    if (!action.slimeId || action.slimeId === slimeId) {
      return true;
    }
    return false;
  };

  // Set up delayed actions filtering
  if (delayedActionsEvent && delayedActionsEvent.originalEmit) {
    // Already set up
  } else if (delayedActionsEvent) {
    delayedActionsEvent.originalEmit = delayedActionsEvent.emit;
    delayedActionsEvent.emit = (action) => {
      if (!action.slimeId) {
        action.slimeId = slimeId;
      }
      delayedActionsEvent.originalEmit(action);
    };
  }

  // Subscribe to events
  const listeners = [
    keys.jumpPress.subscribe(onJumpPressed),
    keys.jumpRelease.subscribe(onJumpReleased),
    keys.movementPress.subscribe(onMovementPress),
    keys.movementRelease.subscribe(onMovementRelease),
    keys.duckPress.subscribe(onDuckPress),
    keys.duckRelease.subscribe(onDuckRelease),

    game.gameStart.subscribe(onGameStart),
    game.gameEnd.subscribe(onGameEnd),
    game.roundStart.subscribe(onRoundStart),
    game.roundEnd.subscribe(onRoundEnd),
    game.sizeChange.subscribe(onResize),
    game.teamSwitchEvent.subscribe(onTeamSwitch),

    actorObject.groundHitEvent.subscribe(onGroundHit),
    actorObject.wallHitEvent.subscribe(onWallHit),
    actorObject.netHitEvent?.subscribe(onNetHit), // Only subscribe if the event exists
  ].filter(Boolean); // Filter out any undefined listeners (if netHitEvent doesn't exist)

  /**
   * Reset slime position and state
   * 
   * @param {Object} pos - New position {x, y}
   */
  const reset = (pos) => {
    // Reset position
    actorObject.pos.x = pos.x;
    actorObject.pos.y = pos.y;

    // Reset velocity
    actorObject._velocity.x = 0;
    actorObject._velocity.y = 0;

    // Reset state flags
    isJumping = false;
  };

  /**
   * Destroys the slime and cleans up resources
   */
  const destroy = () => {
    slimeElement.remove();
    listeners.forEach((listener) => {
      if (listener && typeof listener.unsubscribe === 'function') {
        listener.unsubscribe();
      }
    });
  };

  /**
   * Updates slime physics
   */
  const update = () => {
    if (actorObject && typeof actorObject.update === 'function') {
      actorObject.update();
    }

    if (lastDirectionChangeTime > 0) {
      lastDirectionChangeTime--;
    }
  };

  /**
   * Renders slime to the DOM
   */
  const render = () => {
    renderSlime(
      slimeElement,
      actorObject.pos,
      actorObject._velocity,
      slimeWidth,
      slimeHeight
    );
  };

  return {
    update,
    render,
    destroy,
    slimeId,
    teamNumber,
    team: currentTeam,
    ao: actorObject
  };
}
