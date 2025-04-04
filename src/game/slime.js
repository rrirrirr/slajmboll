import { Event, events } from '../core/events.js';
import Actor from './actor.js'; // Imports the refactored Actor
import { createSlimeElement, renderSlime } from '../ui/slimeGraphics.js'; // Removed updateSlimeTeamAppearance as it's handled internally now
import { Animation } from '../utils/animations.js';
import { teams as configTeams, movement as configMovement, physics as configPhysics } from '../../config.js'; // Use aliased imports
import {
  startJump,
  startOppositeRun,
  startRun,
  startWallJump,
  startDirectionChangeJump
} from './movements.js';
import { createDelayedAction } from '../utils/delayedActions.js'; // Import the delay utility

/**
 * @typedef {Object} SlimeAppearance
 * @property {string} color - Color of the slime
 * @property {Object} [decorations] - Optional decorative elements
 */

/**
 * @typedef {Object} SlimeDimensions
 * @property {number} radius - Collision radius (relative size)
 */

/**
 * @typedef {Object} SlimeConstraints
 * @property {number} rightBoundry - Right boundary
 * @property {number} leftBoundry - Left boundary
 * @property {number} ground - Ground level
 * @property {number} maxVelocity - Maximum velocity limit for the actor
 */

/**
 * Creates a slime character entity.
 * Manages slime-specific logic, movement initiation, and state, using an Actor for physics.
 *
 * @param {number} initialTeam - Team number (1 or 2, or 0 if unassigned initially).
 * @param {number} playerIndex - Unique index identifying the player controlling this slime.
 * @param {Object} initialPos - Initial position {x, y}.
 * @param {SlimeAppearance} appearance - Visual appearance properties.
 * @param {SlimeDimensions} dimensions - Physical dimensions (relative radius).
 * @param {SlimeConstraints} constraints - Movement constraints.
 * @param {Object} gameController - Game controller object providing events and container access (e.g., WaitingGame instance).
 * @param {Object} keys - Input handlers mapped to player controls (e.g., from inputManager.setupPlayerKeys).
 * @returns {Object} Slime entity instance.
 */
export function Slime(
  initialTeam,
  playerIndex, // Renamed teamNumber to playerIndex for clarity
  initialPos,
  appearance,
  dimensions,
  constraints,
  gameController, // Renamed game to gameController for clarity
  keys
) {
  // --- State and Configuration ---
  const slimeId = `slime_${playerIndex}_${Date.now()}`; // Unique ID
  const slimeAppearance = { ...appearance }; // Local copy of appearance
  let currentTeam = initialTeam;

  // Physics constants derived from constraints and config
  let areaWidth, radius, slimeWidth, slimeHeight, runAcceleration, bonusStartAcceleration, dashAcceleration, bonusThreshold;

  // Movement state variables
  let bonusAcceleration = 1; // Multiplier? Seems unused, maybe remove?
  let jumpAcceleration = configMovement.JUMP_ACCELERATION; // Base jump strength multiplier
  let bonusJumpAcceleration = jumpAcceleration * configMovement.DIRECTION_CHANGE_BONUS; // Bonus multiplier

  // Active movement generators
  let activeRunMovement = null;
  let activeJumpMovement = null;

  // State flags
  let isRunning = false;
  let isRunningLeft = false;
  let isRunningRight = false;
  let runningDirection = 0; // -1 left, 0 none, 1 right
  let isJumping = false;    // Flag if jump key is currently held
  let isMidAir = false;     // True if not grounded (based on groundHit)
  let isDucking = false;
  let hasDirectionChangeBonus = false; // Flag for bonus run speed
  let isHuggingWall = 0;    // -1 left, 0 none, 1 right (wall contact)
  let canWallJump = true;   // Cooldown flag for wall jump
  let directionChangeFrames = 0; // Counter for direction change bonus window
  let jumpBufferActive = false; // Flag for buffered jump input
  let jumpBufferTimeoutId = null; // To store the ID of the buffer timer

  // Get global events (optional, consider passing them in or using a service)
  const delayedActionsEvent = events.get('delayed actions');
  const animationsEvent = events.get('animations');

  /** Sets up slime physics constants based on current constraints */
  const setupConstants = (currentConstraints) => {
    areaWidth = currentConstraints.rightBoundry - currentConstraints.leftBoundry;
    radius = dimensions.radius; // Relative radius
    // Calculate pixel dimensions based on scaling factor K
    slimeWidth = (areaWidth / configPhysics.K) * radius;
    slimeHeight = slimeWidth / 2; // Assuming half-circle

    // Calculate accelerations based on scaling factor K
    runAcceleration = (areaWidth / configPhysics.K) * configMovement.RUN_ACCELERATION;
    bonusStartAcceleration = runAcceleration * 2; // Consider config value?
    dashAcceleration = (areaWidth / configPhysics.K) * 0.052; // TODO: Move magic number to config?
    bonusThreshold = runAcceleration * 5; // Speed threshold for bonus run
  };

  // Initialize physics constants
  setupConstants(constraints);

  // --- Create Actor ---
  // IMPORTANT: Actor must be fully initialized here before render can be called.
  const actorObject = Actor(
    initialPos,
    { x: 0, y: 0 }, // Initial velocity
    dimensions.radius, // Relative radius
    constraints.rightBoundry,
    constraints.leftBoundry,
    constraints.ground,
    constraints.maxVelocity,
    gameController.sizeChange, // Pass resize event if needed by Actor
    currentTeam, // Pass initial team
    false // Slimes are NOT frictionless
  );

  // --- Create Graphics ---
  const slimeElement = createSlimeElement(slimeAppearance); // Creates the div
  slimeElement.setAttribute('data-slime-id', slimeId);      // Set unique ID
  slimeElement.classList.add(`slime-player-${playerIndex}`); // Class for player index
  slimeElement.style.width = `${slimeWidth}px`;             // Set initial size
  slimeElement.style.height = `${slimeHeight}px`;
  // Add the element to the container provided by the gameController
  if (gameController?.go?.appendChild) {
    gameController.go.appendChild(slimeElement);
  } else {
    console.error(`Slime ${slimeId}: Invalid gameController container! Cannot add slime element.`);
    // Handle error case - maybe return null or throw?
  }

  // --- Internal Helper Functions ---

  /** Initiates a standard run movement generator */
  const initRun = (direction) => {
    if (activeRunMovement) actorObject.removeMovement(activeRunMovement); // Remove old one
    const killSignal = direction === -1 ? () => !isRunningLeft : () => !isRunningRight;
    activeRunMovement = startRun(runAcceleration, direction, killSignal);
    actorObject.addMovement(activeRunMovement);
  };

  /** Initiates a bonus run movement generator (after direction change) */
  const initBonusRun = (direction) => {
    console.log(`Slime ${playerIndex}: Init bonus run ${direction}`);
    if (activeRunMovement) actorObject.removeMovement(activeRunMovement);

    hasDirectionChangeBonus = true; // Set bonus flag
    const killSignal = direction === -1 ? () => !isRunningLeft : () => !isRunningRight;

    // Start the bonus run movement (which handles tapering to normal speed)
    activeRunMovement = startOppositeRun(
      bonusStartAcceleration,
      direction,
      killSignal,
      runAcceleration // Normal acceleration after bonus
    );
    actorObject.addMovement(activeRunMovement);

    // Reset the bonus flag after a short duration (e.g., 20 frames)
    // TODO: Consider making bonus duration configurable
    delayedActionsEvent?.emit({ // Use optional chaining for safety
      slimeId: slimeId, // Associate with this slime
      delay: 20,
      execute: () => { hasDirectionChangeBonus = false; }
    });
  };

  /** Initiates a jump movement generator */
  const initJump = (jumpForceMultiplier = 1, customEndCallback = null) => {
    if (activeJumpMovement) actorObject.removeMovement(activeJumpMovement); // Clear existing jump

    const baseJumpForce = actorObject.jumpAcceleration * jumpForceMultiplier; // Use jump value from Actor

    activeJumpMovement = startJump(
      baseJumpForce, // Use base jump force from actor, potentially scaled
      () => !isJumping, // Kill signal: stop when jump key released
      () => { // End callback
        console.log(`Slime ${playerIndex}: Jump movement ended.`);
        activeJumpMovement = null; // Clear the reference
        if (customEndCallback) customEndCallback();
      }
    );
    actorObject.addMovement(activeJumpMovement);
    isJumping = true; // Mark as jumping (key held down)
    isMidAir = true;  // Definitely in the air now
  };

  /** Initiates a wall jump movement generator */
  const initWallJump = (wallDirection) => {
    if (activeJumpMovement) actorObject.removeMovement(activeJumpMovement);

    const baseJumpForce = actorObject.jumpAcceleration; // Base force
    const jumpDirection = -wallDirection; // Jump away from the wall

    canWallJump = false; // Disable wall jump temporarily
    isMidAir = true;
    isJumping = true; // Treat as jumping

    // Visual feedback for wall jump (optional)
    animationsEvent?.emit( // Use optional chaining
      Animation(
        6, // Short duration flash
        (frame) => {
          slimeElement.style.background = `linear-gradient(${jumpDirection * 90}deg, ${slimeAppearance.color} ${frame * 15}%, white ${frame * 20}%)`;
        },
        (frame) => frame < 1, // End condition
        () => { slimeElement.style.background = ''; } // Cleanup
      )
    );

    // Temporarily boost max velocity for wall jump burst
    actorObject.setMaxVelocity(constraints.maxVelocity * 1.2);

    activeJumpMovement = startWallJump(
      baseJumpForce,
      jumpDirection,
      () => !isJumping, // Stop when jump key released (or maybe after fixed duration?)
      () => { // End callback
        console.log(`Slime ${playerIndex}: Wall jump ended.`);
        actorObject.resetMaxVelocity(); // Restore normal max velocity
        activeJumpMovement = null;
        // Re-enable wall jump after cooldown (handled by groundHit or timer)
      }
    );
    actorObject.addMovement(activeJumpMovement);

    // Delayed action to re-enable wall jump
    delayedActionsEvent?.emit({ // Use optional chaining
      slimeId: slimeId,
      delay: configMovement.WALL_JUMP_COOLDOWN,
      execute: () => { canWallJump = true; }
    });
  };

  /** Initiates a direction change jump movement generator */
  const initDirectionChangeJump = () => {
    if (activeJumpMovement) actorObject.removeMovement(activeJumpMovement);

    const baseJumpForce = actorObject.jumpAcceleration * 1.2; // Slightly higher jump

    isMidAir = true;
    isJumping = true;
    directionChangeFrames = 0; // Reset bonus window

    activeJumpMovement = startDirectionChangeJump(
      actorObject, // Pass the actor itself
      baseJumpForce,
      () => { },//!isJumping,
      () => { // End callback
        console.log(`Slime ${playerIndex}: Direction change jump ended.`);
        activeJumpMovement = null;
      }
    );
    actorObject.addMovement(activeJumpMovement);
  };


  // --- Input Event Handlers ---

  const onJumpPressed = () => {
    // Prevent starting a new jump if already holding jump key
    if (isJumping) return;

    // --- Ground Jump Logic (includes buffering) ---
    if (!isMidAir) {
      // (Keep existing ground jump and direction change jump logic here)
      if (directionChangeFrames > 0) {
        initDirectionChangeJump();
      } else {
        initJump(1.0);
      }
      return; // Don't check for wall jump if grounded
    }

    // --- Mid-Air Jump Logic (Wall Jump Leniency & Buffering) ---
    if (isMidAir) {
      let wallToCheck = 0; // -1 for left, 1 for right
      let distanceToWall = Infinity;
      const slimeEdgeLeft = actorObject.pos.x - actorObject.realRadius;
      const slimeEdgeRight = actorObject.pos.x + actorObject.realRadius;

      // --- Calculate distance ONLY to side walls ---
      const distToLeftWall = slimeEdgeLeft - constraints.leftBoundry;
      const distToRightWall = constraints.rightBoundry - slimeEdgeRight;

      // Determine the closest SIDE wall within leniency range
      if (distToLeftWall <= configMovement.WALL_JUMP_LENIENCY_PIXELS) {
        distanceToWall = distToLeftWall;
        wallToCheck = -1; // Potential jump off left wall
      }
      // Check right wall only if left wall wasn't closer or within range
      if (distToRightWall <= configMovement.WALL_JUMP_LENIENCY_PIXELS && distToRightWall < distanceToWall) {
        distanceToWall = distToRightWall;
        wallToCheck = 1; // Potential jump off right wall
      }

      // --- Check for Leniency Wall Jump (off side walls ONLY) ---
      if (wallToCheck !== 0 && canWallJump) { // distanceToWall check is implicitly done above
        // console.log(`Slime ${playerIndex}: Leniency Wall Jump! Dist: ${distanceToWall.toFixed(1)}, Wall: ${wallToCheck}`); // Optional logging
        initWallJump(wallToCheck); // Pass the direction OF the wall (-1 left, 1 right)
      }
      // --- Buffer Jump if no wall jump performed ---
      else {
        // Buffer the jump if airborne and not wall jumping
        if (jumpBufferTimeoutId) { /* Maybe cancel old timer */ }
        jumpBufferActive = true;
        jumpBufferTimeoutId = createDelayedAction(configMovement.JUMP_BUFFER_FRAMES, () => {
          jumpBufferActive = false;
          jumpBufferTimeoutId = null;
        });
      }
    }
  };

  const onJumpReleased = () => {
    console.log(`Slime ${playerIndex}: Jump released.`);
    isJumping = false; // Key is no longer held
    // The activeJumpMovement's kill signal will handle stopping the upward force
    if (jumpBufferActive) {
      // console.log(`Slime ${playerIndex}: Cancelling jump buffer due to key release.`); // Optional logging
      jumpBufferActive = false; // Clear the buffer flag immediately

      // If a timer was set to clear the buffer, cancel it now.
      // This requires the cancelDelayedAction function and access to the active actions list.
      if (jumpBufferTimeoutId) {
        // Assuming cancelDelayedAction is available and works:
        // cancelDelayedAction(jumpBufferTimeoutId, activeDelayedActions); // Replace activeDelayedActions with the actual list
        // OR emit an event:
        // cancelDelayedActionEvent.emit({ id: jumpBufferTimeoutId });

        jumpBufferTimeoutId = null; // Clear the stored ID
      }
    }
  };

  const onMovementPress = (direction) => {
    if ((direction === -1 && isRunningLeft) || (direction === 1 && isRunningRight)) {
      return; // Do nothing if already running in the pressed direction
    }
    // Check if this press constitutes a direction change while running
    if (isRunning && runningDirection !== 0 && runningDirection !== direction) {
      // Start or reset the direction change bonus window timer
      directionChangeFrames = configMovement.DIRECTION_CHANGE_WINDOW;
      console.log(`Slime ${playerIndex}: Direction change detected, bonus window started.`);
    } else {
      // If not a direction change, ensure the bonus window isn't active
      // directionChangeFrames = 0; // Reset if moving same direction or starting from stop? Maybe only reset on jump?
    }

    // Update running state flags
    runningDirection = direction;
    isRunning = true;
    if (direction === -1) { isRunningLeft = true; isRunningRight = false; }
    else { isRunningRight = true; isRunningLeft = false; }

    // Determine if bonus run conditions are met:
    // Must be on ground, currently moving, changing direction, and above speed threshold.
    const currentSpeed = actorObject.getSpeed();
    if (!isMidAir &&
      Math.sign(currentSpeed) !== 0 &&
      Math.sign(currentSpeed) !== direction &&
      Math.abs(currentSpeed) > bonusThreshold) {
      initBonusRun(direction);
    } else {
      initRun(direction); // Initiate standard run
    }
  };

  const onMovementRelease = (direction) => {
    console.log(`Slime ${playerIndex}: Movement released: ${direction}`);
    if (direction === -1) { isRunningLeft = false; }
    else { isRunningRight = false; }

    // Update overall running state only if the released direction was the active one
    if (runningDirection === direction) {
      isRunning = false;
      runningDirection = 0;
      // Note: The activeRunMovement's kill signal handles stopping the force.
    }
  };

  const onDuckPress = () => { isDucking = true; };
  const onDuckRelease = () => { isDucking = false; };

  // --- Physics Event Handlers (from Actor) ---

  const onGroundHit = () => {
    console.log(`Slime ${playerIndex}: Ground hit.`);
    if (jumpBufferActive) {
      console.log(`Slime ${playerIndex}: Executing buffered jump!`); // Optional logging
      // Need to ensure it's not a direction change jump unless intended
      initJump(1.0); // Execute a standard ground jump
      jumpBufferActive = false; // Clear the buffer flag
      if (jumpBufferTimeoutId) {
        // Cancel the timer if it exists (requires cancel functionality)
        jumpBufferTimeoutId = null;
      }
      // Note: initJump sets isMidAir = true, which is correct
    } else {
      if (isMidAir) { // Only trigger landing logic if previously in air
        isMidAir = false;
        canWallJump = true; // Reset wall jump ability on landing
        // Optional: Reset jump state if needed, though key release handles stopping force
        // isJumping = false;
      }
    }
  };

  const onWallHit = (direction) => { // Direction: -1 left, 1 right, 0 none
    console.log(`Slime ${playerIndex}: Wall hit event: ${direction}`);
    isHuggingWall = direction; // Update wall contact state
    // If hitting a wall, potentially cancel opposite run bonus?
    // hasDirectionChangeBonus = false;
    // if (slimeElement) {
    //   slimeElement.classList.remove('hugging-wall-left', 'hugging-wall-right'); // Remove old classes first
    //   if (direction === -1) {
    //     slimeElement.classList.add('hugging-wall-left');
    //   } else if (direction === 1) {
    //     slimeElement.classList.add('hugging-wall-right');
    //   }
    // }
  };

  const onNetHit = (direction) => {
    console.log(`Slime ${playerIndex}: Net hit event: ${direction}`);
    isHuggingWall = direction; // Treat net contact similar to wall contact
  };

  // --- Game State/Controller Event Handlers ---

  const onTeamSwitch = (newTeam) => {
    console.log(`Slime ${playerIndex}: Switching to team ${newTeam}`);
    currentTeam = newTeam;
    // Update visual appearance
    slimeAppearance.color = newTeam === 1 ? configTeams.TEAM_1_COLOR : configTeams.TEAM_2_COLOR;
    slimeElement.style.backgroundColor = slimeAppearance.color;
    // Update physics boundaries via Actor
    actorObject.updateTeam(currentTeam);
  };

  const onResize = (newSizeConstraints) => {
    console.log(`Slime ${playerIndex}: Resize detected.`);
    // Recalculate size-dependent constants
    setupConstants(newSizeConstraints); // Pass the new constraints object
    // Update graphics element size
    slimeElement.style.width = `${slimeWidth}px`;
    slimeElement.style.height = `${slimeHeight}px`;
    // TODO: Actor might also need constraint updates if boundaries change absolutely
    // actorObject.updateConstraints(newRight, newLeft, newGround);
  };

  // --- Subscriptions ---
  // Subscribe to input keys
  const keyListeners = [
    keys.jumpPress.subscribe(onJumpPressed),
    keys.jumpRelease.subscribe(onJumpReleased),
    keys.movementPress.subscribe(onMovementPress),
    keys.movementRelease.subscribe(onMovementRelease),
    keys.duckPress.subscribe(onDuckPress),
    keys.duckRelease.subscribe(onDuckRelease),
  ];
  // Subscribe to actor physics events
  const actorListeners = [
    actorObject.groundHitEvent.subscribe(onGroundHit),
    actorObject.wallHitEvent.subscribe(onWallHit),
    actorObject.netHitEvent.subscribe(onNetHit),
  ];
  // Subscribe to game controller events (if available)
  const gameListeners = [
    gameController?.sizeChange?.subscribe(onResize),
    gameController?.teamSwitchEvent?.subscribe(onTeamSwitch),
    // Add gameStart, gameEnd etc. if needed
  ].filter(Boolean); // Filter out null/undefined listeners if gameController events don't exist

  const allListeners = [...keyListeners, ...actorListeners, ...gameListeners];

  // Initialize appearance and team state
  onTeamSwitch(currentTeam);

  // --- Public Methods ---

  /** Updates the slime's state (primarily by updating its actor) */
  const update = () => {
    // Decrement direction change bonus window timer
    if (directionChangeFrames > 0) {
      directionChangeFrames--;
    }
    // Update the physics actor
    actorObject.update();
    // Update mid-air status (redundant if only set on jump/ground hit?)
    // isMidAir = actorObject.pos.y < actorObject.ground;
  };

  /** Renders the slime using the graphics module */
  const render = () => {
    // Ensure actorObject and its properties are valid before rendering
    if (actorObject && actorObject.pos && actorObject.velocity) {
      renderSlime(
        slimeElement,
        actorObject.pos,
        actorObject.velocity, // Pass the renamed 'velocity' property
        slimeWidth,
        slimeHeight,
        isHuggingWall
      );
    } else {
      console.error(`Slime ${slimeId}: Cannot render, invalid actor state.`);
    }
  };

  /** Cleans up resources (DOM element, event listeners) */
  const destroy = () => {
    console.log(`Destroying slime ${slimeId}`);
    slimeElement?.remove(); // Remove element from DOM
    // Unsubscribe all listeners
    allListeners.forEach(listener => listener?.unsubscribe?.());
    // Remove any active movements? Actor might handle this if needed.
    if (activeRunMovement) actorObject.removeMovement(activeRunMovement);
    if (activeJumpMovement) actorObject.removeMovement(activeJumpMovement);
  };

  // --- Return Public Slime Object ---
  return {
    slimeId,      // Unique identifier
    playerIndex,  // Identifier for the controlling player
    get team() { return currentTeam; }, // Read-only team access
    actorObject,  // Expose the actor object for interactions (e.g., collision checks)

    // Core methods
    update,
    render,
    destroy,
  };
}
