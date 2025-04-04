import { Event, events } from '../core/events.js';
import Actor from './actor.js'; // Imports the refactored Actor
import { createSlimeElement, renderSlime } from '../ui/slimeGraphics.js';
import { Animation } from '../utils/animations.js';
import { teams as configTeams, movement as configMovement, physics as configPhysics } from '../../config.js'; // Use aliased imports
import {
  startJump,
  startOppositeRun,
  startRun,
  startWallJump,
  startDirectionChangeJump
} from './movements.js';
// Make sure createDelayedAction (and potentially cancelDelayedAction) are correctly imported and handled
import { createDelayedAction /*, cancelDelayedAction */ } from '../utils/delayedActions.js';

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
  playerIndex,
  initialPos,
  appearance,
  dimensions,
  constraints,
  gameController,
  keys
) {
  // --- State and Configuration ---
  const slimeId = `slime_${playerIndex}_${Date.now()}`;
  const slimeAppearance = { ...appearance };
  let currentTeam = initialTeam;

  // Physics constants derived from constraints and config
  let areaWidth, radius, slimeWidth, slimeHeight, runAcceleration, bonusStartAcceleration, dashAcceleration, bonusThreshold;

  // Movement state variables
  // let bonusAcceleration = 1; // Seems unused
  let jumpAcceleration = configMovement.JUMP_ACCELERATION; // Base jump strength multiplier
  // let bonusJumpAcceleration = jumpAcceleration * configMovement.DIRECTION_CHANGE_BONUS; // Used in initDirectionChangeJump

  // Active movement generators
  let activeRunMovement = null;
  let activeJumpMovement = null;

  // State flags
  let isRunning = false;
  let isRunningLeft = false;
  let isRunningRight = false;
  let runningDirection = 0; // -1 left, 0 none, 1 right
  let isJumping = false;    // Flag if jump key is currently held
  // --- isMidAir is now primarily controlled by Actor's state ---
  let isMidAir = !Actor(initialPos, {}, dimensions.radius, constraints.rightBoundry, constraints.leftBoundry, constraints.ground, constraints.maxVelocity).isGrounded; // Initialize based on actor's initial state check
  let isDucking = false;
  let hasDirectionChangeBonus = false; // Flag for bonus run speed
  let isHuggingWall = 0;    // -1 left, 0 none, 1 right (Slime's tracking for visuals/logic)
  let canWallJump = true;   // Cooldown flag for wall jump
  let directionChangeFrames = 0; // Counter for direction change bonus window
  let jumpBufferActive = false; // Flag for buffered jump input
  let jumpBufferTimeoutId = null; // To store the ID of the buffer timer

  // Get global events (optional)
  const delayedActionsEvent = events.get('delayed actions'); // Assuming this is handled elsewhere now
  const animationsEvent = events.get('animations'); // Assuming this is handled elsewhere now

  /** Sets up slime physics constants based on current constraints */
  const setupConstants = (currentConstraints) => {
    areaWidth = currentConstraints.rightBoundry - currentConstraints.leftBoundry;
    radius = dimensions.radius;
    slimeWidth = (areaWidth / configPhysics.K) * radius;
    slimeHeight = slimeWidth / 2;
    runAcceleration = (areaWidth / configPhysics.K) * configMovement.RUN_ACCELERATION;
    bonusStartAcceleration = runAcceleration * 2;
    dashAcceleration = (areaWidth / configPhysics.K) * 0.052; // Consider config
    bonusThreshold = runAcceleration * 5;
  };

  // Initialize physics constants
  setupConstants(constraints);

  // --- Create Actor ---
  const actorObject = Actor(
    initialPos,
    { x: 0, y: 0 },
    dimensions.radius,
    constraints.rightBoundry,
    constraints.leftBoundry,
    constraints.ground,
    constraints.maxVelocity,
    gameController.sizeChange, // Assuming gameController provides this
    currentTeam,
    false // Slimes are NOT frictionless
  );

  // Initialize Slime's isMidAir state based on the newly created Actor's state
  isMidAir = !actorObject.isGrounded;

  // --- Create Graphics ---
  const slimeElement = createSlimeElement(slimeAppearance);
  slimeElement.setAttribute('data-slime-id', slimeId);
  slimeElement.classList.add(`slime-player-${playerIndex}`);
  slimeElement.style.width = `${slimeWidth}px`;
  slimeElement.style.height = `${slimeHeight}px`;
  if (gameController?.go?.appendChild) {
    gameController.go.appendChild(slimeElement);
  } else {
    console.error(`Slime ${slimeId}: Invalid gameController container! Cannot add slime element.`);
  }

  // --- Internal Helper Functions ---

  const initRun = (direction) => {
    if (activeRunMovement) actorObject.removeMovement(activeRunMovement);
    const killSignal = direction === -1 ? () => !isRunningLeft : () => !isRunningRight;
    activeRunMovement = startRun(runAcceleration, direction, killSignal);
    actorObject.addMovement(activeRunMovement);
  };

  const initBonusRun = (direction) => {
    // ... (keep existing implementation) ...
    if (activeRunMovement) actorObject.removeMovement(activeRunMovement);
    hasDirectionChangeBonus = true;
    const killSignal = direction === -1 ? () => !isRunningLeft : () => !isRunningRight;
    activeRunMovement = startOppositeRun(bonusStartAcceleration, direction, killSignal, runAcceleration);
    actorObject.addMovement(activeRunMovement);
    // Reset bonus flag after duration (consider central timer management)
    createDelayedAction(configMovement.OPPOSITE_RUN_BONUS_FRAMES || 20, () => { hasDirectionChangeBonus = false; });
  };

  const initJump = (jumpForceMultiplier = 1, customEndCallback = null) => {
    if (activeJumpMovement) actorObject.removeMovement(activeJumpMovement);
    const baseJumpForce = actorObject.jumpAcceleration * jumpForceMultiplier;
    activeJumpMovement = startJump(
      baseJumpForce,
      () => !isJumping, // Key release signal
      () => {
        // console.log(`Slime ${playerIndex}: Jump movement ended.`);
        activeJumpMovement = null;
        if (customEndCallback) customEndCallback();
      }
    );
    actorObject.addMovement(activeJumpMovement);
    isJumping = true;
    // isMidAir = true; // Let the update loop handle this based on actor state
  };

  const initWallJump = (wallDirection) => {
    if (activeJumpMovement) actorObject.removeMovement(activeJumpMovement);
    const baseJumpForce = actorObject.jumpAcceleration;
    const jumpDirection = -wallDirection;
    // canWallJump = false; // change to true if we only want to allow one wall jump per air time
    // isMidAir = true; // Let update loop handle
    isJumping = true;
    // Optional Animation event emit
    animationsEvent?.emit(Animation(6, (frame) => { /* ... */ }, (frame) => frame < 1, () => { /* ... */ }));
    actorObject.setMaxVelocity(constraints.maxVelocity * 1.2);
    activeJumpMovement = startWallJump(
      baseJumpForce, jumpDirection, () => !isJumping,
      () => {
        // console.log(`Slime ${playerIndex}: Wall jump ended.`);
        actorObject.resetMaxVelocity();
        activeJumpMovement = null;
      }
    );
    actorObject.addMovement(activeJumpMovement);
    // Delayed re-enable (consider central timer management)
    createDelayedAction(configMovement.WALL_JUMP_COOLDOWN || 8, () => { canWallJump = true; });
  };

  const initDirectionChangeJump = () => {
    // ... (keep existing implementation using startDirectionChangeJump) ...
    if (activeJumpMovement) actorObject.removeMovement(activeJumpMovement);
    const baseJumpForce = actorObject.jumpAcceleration * (configMovement.DIR_CHANGE_JUMP_ACCEL_BONUS || 1.2);
    // isMidAir = true; // Let update loop handle
    isJumping = true;
    directionChangeFrames = 0;
    activeJumpMovement = startDirectionChangeJump(
      actorObject, baseJumpForce, () => !isJumping, // Pass correct kill signal
      () => {
        // console.log(`Slime ${playerIndex}: Direction change jump ended.`);
        activeJumpMovement = null;
      }
    );
    actorObject.addMovement(activeJumpMovement);
  };


  // --- Input Event Handlers ---

  const onJumpPressed = () => {
    console.log("--- onJumpPressed ---");
    if (isJumping) {
      console.log("Jump prevented: isJumping is true.");
      return;
    }

    // --- FIX: Check actorObject.isGrounded directly ---
    // Remove the negation variable:
    // const currentlyGrounded = !actorObject.isGrounded; // <<< REMOVE THIS LINE

    console.log(`Grounded check: actorObject.isGrounded = ${actorObject.isGrounded}`); // Log the direct state

    // Modify the condition to check if actually grounded
    if (actorObject.isGrounded) { // <<< CHANGE THIS CONDITION
      // --- Ground Jump Logic ---
      console.log("Condition met: Ground jump attempt.");
      if (directionChangeFrames > 0) {
        console.log("Executing Direction Change Jump.");
        initDirectionChangeJump();
      } else {
        console.log("Executing Standard Ground Jump.");
        initJump(1.0);
      }
      return; // Don't check wall jump or buffer if starting from ground
    }
    // --- End Ground Jump Logic ---


    // --- Mid-Air Logic ---
    // This else block now correctly represents being mid-air
    else {
      console.log("Condition met: Mid-air logic check.");
      // Check for Wall Jump Leniency (Side Walls Only)
      let wallToCheck = 0;
      let distanceToWall = Infinity;
      const slimeEdgeLeft = actorObject.pos.x - actorObject.realRadius;
      const slimeEdgeRight = actorObject.pos.x + actorObject.realRadius;
      const distToLeftWall = slimeEdgeLeft - constraints.leftBoundry;
      const distToRightWall = constraints.rightBoundry - slimeEdgeRight;

      if (distToLeftWall <= configMovement.WALL_JUMP_LENIENCY_PIXELS) {
        distanceToWall = distToLeftWall;
        wallToCheck = -1;
      }
      if (distToRightWall <= configMovement.WALL_JUMP_LENIENCY_PIXELS && distToRightWall < distanceToWall) {
        distanceToWall = distToRightWall;
        wallToCheck = 1;
      }
      console.log(`Wall check: wallToCheck=${wallToCheck}, canWallJump=${canWallJump}, distanceToWall=${distanceToWall}`);

      if (wallToCheck !== 0 && canWallJump) {
        console.log("Executing Wall Jump.");
        initWallJump(wallToCheck);
      } else {
        // Buffer Jump if no wall jump happened and airborne
        if (jumpBufferTimeoutId) { /* Cancel if possible */ }
        jumpBufferActive = true;
        console.log("Executing: Buffering jump.");
        jumpBufferTimeoutId = createDelayedAction(configMovement.JUMP_BUFFER_FRAMES || 6, () => {
          jumpBufferActive = false;
          jumpBufferTimeoutId = null;
        });
      }
    }
  };

  const onJumpReleased = () => {
    // console.log(`Slime ${playerIndex}: Jump released.`); // Optional Log
    isJumping = false; // Key is no longer held

    // Cancel buffer if active
    if (jumpBufferActive) {
      // console.log(`Slime ${playerIndex}: Cancelling jump buffer due to key release.`); // Optional Log
      jumpBufferActive = false;
      if (jumpBufferTimeoutId) {
        // cancelDelayedAction(jumpBufferTimeoutId, activeDelayedActions); // Requires access/mechanism
        jumpBufferTimeoutId = null;
      }
    }
  };

  const onMovementPress = (direction) => {
    // ... (keep existing logic, including direction change bonus check using Slime's isMidAir) ...
    if ((direction === -1 && isRunningLeft) || (direction === 1 && isRunningRight)) return;
    if (isRunning && runningDirection !== 0 && runningDirection !== direction) {
      directionChangeFrames = configMovement.DIRECTION_CHANGE_WINDOW || 15;
    }
    runningDirection = direction;
    isRunning = true;
    if (direction === -1) { isRunningLeft = true; isRunningRight = false; }
    else { isRunningRight = true; isRunningLeft = false; }

    const currentSpeed = actorObject.getSpeed();
    // Use Slime's isMidAir flag for bonus run condition check
    if (!isMidAir && Math.sign(currentSpeed) !== 0 && Math.sign(currentSpeed) !== direction && Math.abs(currentSpeed) > bonusThreshold) {
      initBonusRun(direction);
    } else {
      initRun(direction);
    }
  };

  const onMovementRelease = (direction) => {
    // ... (keep existing logic) ...
    if (direction === -1) { isRunningLeft = false; }
    else { isRunningRight = false; }
    if (runningDirection === direction) {
      isRunning = false;
      runningDirection = 0;
    }
  };

  const onDuckPress = () => { isDucking = true; };
  const onDuckRelease = () => { isDucking = false; };

  // --- Physics Event Handlers (from Actor) ---

  // Triggered ONLY when actor transitions from !grounded to grounded
  const onGroundHit = () => {
    // console.log(`Slime ${playerIndex}: onGroundHit event received`); // Optional Log
    canWallJump = true; // Reset wall jump ability

    // Handle buffered jump execution
    if (jumpBufferActive) {
      // console.log(`Slime ${playerIndex}: Executing buffered jump from onGroundHit!`); // Optional Log
      initJump(1.0);
      jumpBufferActive = false;
      if (jumpBufferTimeoutId) {
        // cancel action if possible
        jumpBufferTimeoutId = null;
      }
    }
    // NOTE: isMidAir state is handled in the main update loop now
  };

  // Triggered when actor state transitions to touching or not touching wall/net
  const onWallHit = (direction) => { // Direction: -1 left, 1 right, 0 none
    // console.log(`Slime ${playerIndex}: Wall hit event: ${direction}`); // Optional Log
    // This updates the Slime's internal flag, primarily for visual effects
    isHuggingWall = direction;

    // CSS class toggling logic can remain here if using Option A for visuals
    if (slimeElement) {
      slimeElement.classList.remove('hugging-wall-left', 'hugging-wall-right');
      if (direction === -1) {
        slimeElement.classList.add('hugging-wall-left');
      } else if (direction === 1) {
        slimeElement.classList.add('hugging-wall-right');
      }
    }
  };

  const onNetHit = (direction) => {
    // console.log(`Slime ${playerIndex}: Net hit event: ${direction}`); // Optional Log
    // Update Slime's flag, treat net like a wall for visuals/state
    isHuggingWall = direction;

    // CSS class toggling logic can remain here if using Option A for visuals
    if (slimeElement) {
      slimeElement.classList.remove('hugging-wall-left', 'hugging-wall-right');
      if (direction === -1) { // Hit left edge of net (coming from right)
        slimeElement.classList.add('hugging-wall-left'); // Or hugging-wall-right visually?
      } else if (direction === 1) { // Hit right edge of net (coming from left)
        slimeElement.classList.add('hugging-wall-right'); // Or hugging-wall-left visually?
      }
    }
  };

  // --- Game State/Controller Event Handlers ---

  const onTeamSwitch = (newTeam) => {
    // console.log(`Slime ${playerIndex}: Switching to team ${newTeam}`); // Optional Log
    currentTeam = newTeam;
    slimeAppearance.color = newTeam === 1 ? configTeams.TEAM_1_COLOR : configTeams.TEAM_2_COLOR;
    if (slimeElement) { // Check element exists
      slimeElement.style.backgroundColor = slimeAppearance.color;
    }
    actorObject.updateTeam(currentTeam); // Call the Actor's method
  };

  const onResize = (newSizeConstraints) => {
    // console.log(`Slime ${playerIndex}: Resize detected.`); // Optional Log
    setupConstants(newSizeConstraints);
    if (slimeElement) { // Check element exists
      slimeElement.style.width = `${slimeWidth}px`;
      slimeElement.style.height = `${slimeHeight}px`;
    }
    // TODO: Actor constraint update? actorObject.updateConstraints(newSizeConstraints.rightBoundry, ...)
  };

  // --- Subscriptions ---
  const keyListeners = [
    keys.jumpPress.subscribe(onJumpPressed),
    keys.jumpRelease.subscribe(onJumpReleased),
    keys.movementPress.subscribe(onMovementPress),
    keys.movementRelease.subscribe(onMovementRelease),
    keys.duckPress.subscribe(onDuckPress),
    keys.duckRelease.subscribe(onDuckRelease),
  ];
  const actorListeners = [
    actorObject.groundHitEvent.subscribe(onGroundHit), // Listen for landing transition
    actorObject.wallHitEvent.subscribe(onWallHit),     // Listen for wall contact transition
    actorObject.netHitEvent.subscribe(onNetHit),       // Listen for net contact transition
  ];
  const gameListeners = [
    gameController?.sizeChange?.subscribe(onResize),
    gameController?.teamSwitchEvent?.subscribe(onTeamSwitch),
  ].filter(Boolean);

  const allListeners = [...keyListeners, ...actorListeners, ...gameListeners];

  // Initialize appearance and team state
  onTeamSwitch(currentTeam);

  // --- Public Methods ---

  const update = () => {
    // Decrement direction change bonus window timer
    if (directionChangeFrames > 0) {
      directionChangeFrames--;
    }

    // Update the physics actor FIRST
    actorObject.update();

    // --- Synchronize Slime's state with Actor's state ---
    const newIsMidAir = !actorObject.isGrounded;
    if (isMidAir !== newIsMidAir) {
      // console.log(`Slime ${playerIndex}: isMidAir state updated to ${newIsMidAir}`); // Optional Log
      isMidAir = newIsMidAir;
    }
    // Note: isHuggingWall is updated by onWallHit/onNetHit event handlers now
  };

  const render = () => {
    if (actorObject && actorObject.pos && actorObject.velocity) {
      renderSlime(
        slimeElement,
        actorObject.pos,
        actorObject.velocity,
        slimeWidth,
        slimeHeight,
        isHuggingWall // Pass Slime's internal flag for visual effect trigger
      );
    } else {
      console.error(`Slime ${slimeId}: Cannot render, invalid actor state.`);
    }
  };

  const destroy = () => {
    // console.log(`Destroying slime ${slimeId}`); // Optional Log
    slimeElement?.remove();
    allListeners.forEach(listener => listener?.unsubscribe?.());
    if (activeRunMovement) actorObject.removeMovement(activeRunMovement);
    if (activeJumpMovement) actorObject.removeMovement(activeJumpMovement);
    // Cancel any pending delayed actions? Requires mechanism.
  };

  // --- Return Public Slime Object ---
  return {
    slimeId,
    playerIndex,
    get team() { return currentTeam; },
    actorObject, // Expose actor for collisions etc.

    // Core methods
    update,
    render,
    destroy,
  };
} 
