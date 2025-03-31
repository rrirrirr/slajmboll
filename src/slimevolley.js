import { Slime } from './game/slime.js';
import { Ball } from './game/ball.js'; // Core Ball logic
// Import config consistently
import { dimensions as configDimensions, physics as configPhysics, rules as configRules, teams as configTeams } from '../config.js';
import {
  handleKeyDown,
  handleKeyUp,
  initializeKeyConfigs,
  setupPlayerKeys,
  addBallEvent // Listen for event to add extra balls
} from './core/inputManager.js';
import { Game, WaitingGame } from './game/game.js'; // Game state machine logic
import { Event, events } from './core/events.js';
import {
  createAddPlayerButton,
  createTeamHeaders,
  createWall,
  createScoreBoard,
  waitingScreen,
  createGround
} from './ui/graphics.js'; // General UI elements
import { createBallElement } from './ui/ballGraphics.js'; // Specific Ball graphics element creation
import {
  // Import gameState itself to check its properties
  gameState, GAME_STATES, stateChangeEvent, teamChangeEvent,
  addPlayer as addPlayerToState, // Alias gameState function
  updatePlayerTeam, canStartGame, setGamePlaying, setGameSetup,
  resetGameState, setGameState
} from './core/gameState.js'; // Central game state management
import {
  createAndAddStartButton,
  updateStartButtonVisibility
} from './ui/startButton.js';
import {
  initBallManager,
  addBall as addExtraBall, // Alias ballManager function
  setMainBall,
  getMainBall,
  updateBalls, // Use ballManager update
  renderBalls, // Use ballManager render
  cleanupExtraBalls,
  cleanupAllBalls
} from './game/ballManager.js'; // Ball collection management
import {
  registerNet,
  registerGround as registerGroundInRegistry, // Alias registry function
  unregisterNet,
  clearRegistry
} from './core/objectRegistry.js'; // Track ground/net objects

/**
 * Main game controller and initialization.
 * Sets up the initial screen, manages player addition,
 * starts the game, and runs the main game loop.
 * @module slimevolley
 */

// --- Module Scope Variables ---

const gameContainer = document.querySelector('#main');
if (!gameContainer) {
  throw new Error("Fatal Error: #main game container not found in DOM.");
}

// Game loop and timing
let animationFrameId = null;

// Game entities and state
const field = { width: 0, height: 0 };
let slimes = []; // Holds Slime instances
let mainBall = null; // Holds main Ball instance
let gameInstance = null; // Holds Game instance
let scoreBoardElements = null;

// Player setup state
const playersData = [];
let playersArea = null;
let initializedKeyConfigs = [];
let startButton = null;

// Scoring cooldown
let lastScoreTime = 0;
const SCORING_COOLDOWN = configRules.SCORING_COOLDOWN; // Use imported configRules

// --- Initialization and Setup ---

/** Initializes the player setup screen. */
const initStartScreen = () => {
  console.log("Initializing start screen...");
  resetGameState();
  clearRegistry();
  cleanupAllBalls();

  document.addEventListener('keydown', addPlayerKeyHandler);
  startEventListeners();

  initializedKeyConfigs = initializeKeyConfigs();

  while (gameContainer.firstChild) {
    gameContainer.removeChild(gameContainer.firstChild);
  }

  updateFieldDimensions(); // Update field dims based on container

  initBallManager(gameContainer, field); // Init manager

  // Create setup UI
  const teamHeaders = createTeamHeaders();
  gameContainer.appendChild(teamHeaders);
  playersArea = document.createElement('div');
  playersArea.classList.add('playersArea');
  gameContainer.appendChild(playersArea);
  startButton = createAndAddStartButton(gameContainer, startGame);
  const addPlayerBtn = createAddPlayerButton(addPlayerToGame);
  gameContainer.appendChild(addPlayerBtn);

  if (playersData.length === 0) {
    addPlayerToGame(); // Add first player
  }

  if (!animationFrameId) {
    gameLoop(); // Start game loop
  }
  console.log("Start screen initialized.");
};

/** Sets up global key event listeners. */
const startEventListeners = () => {
  document.removeEventListener('keyup', handleKeyUp);
  document.removeEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('keydown', handleKeyDown);
};

/** Key handler specifically for adding players during setup ('B' key). */
const addPlayerKeyHandler = (event) => {
  if (event.code === 'KeyB') {
    event.preventDefault();
    addPlayerToGame();
  }
};

/** Adds a new player to the setup screen and game state. */
const addPlayerToGame = () => {
  if (playersData.length >= configRules.MAX_PLAYERS) { // Use configRules
    console.log("Max players reached.");
    return;
  }

  const playerIndex = playersData.length;
  const playerNumber = playerIndex + 1;

  const playerKeyConfig = initializedKeyConfigs[playerIndex] || initializedKeyConfigs[0];
  if (!playerKeyConfig) { console.error("Key config missing"); return; }

  const keyHandlers = setupPlayerKeys(playerKeyConfig, playerIndex);

  const newPlayerData = {
    team: 0, keys: keyHandlers,
    appearance: { color: '#888888' },
    dimensions: { radius: configDimensions.SLIME_RADIUS }, // Use configDimensions
    playerIndex: playerIndex
  };
  playersData.push(newPlayerData);
  addPlayerToState(newPlayerData);

  // Create the UI card for player setup
  const waitingGameController = WaitingGame(
    playerNumber, 0, playerKeyConfig, playerIndex
  );

  // Create the Slime instance for this player
  const startX = field.width / 2;
  const startY = waitingGameController.ground; // Use ground from WaitingGame

  // Define constraints for the Slime Actor
  const slimeConstraints = {
    rightBoundry: field.width, // Use full field width for setup area
    leftBoundry: 0,
    ground: waitingGameController.ground, // Ground from WaitingGame
    maxVelocity: configPhysics.MAX_VELOCITY * 1.2 // Slightly higher max speed?
  };

  // Create Slime logic instance
  const newSlime = Slime(
    0, playerIndex,
    { x: startX, y: startY }, // Pass corrected startY
    newPlayerData.appearance,
    newPlayerData.dimensions,
    slimeConstraints, // Pass defined constraints
    waitingGameController,
    keyHandlers
  );
  slimes.push(newSlime); // Add slime instance to array

  // Subscribe to team changes from the WaitingGame card
  waitingGameController.teamSwitchEvent.subscribe((team) => {
    newPlayerData.team = team;
    newPlayerData.appearance.color = team === 1 ? configTeams.TEAM_1_COLOR : configTeams.TEAM_2_COLOR; // Use configTeams
    updatePlayerTeam(playerIndex, team);
    newSlime.actorObject?.updateTeam(team);
  });

  console.log(`Added player ${playerIndex}. Total players: ${playersData.length}.`);
  updateStartButtonVisibility();
};

/** Transitions from player setup to the main game. */
const startGame = () => {
  if (!canStartGame()) {
    console.log("Cannot start game - conditions not met.");
    return;
  }
  console.log("Starting game...");

  setGamePlaying(true);
  setGameSetup(false);

  document.removeEventListener('keydown', addPlayerKeyHandler);
  document.querySelectorAll('.teamHeadersContainer, .addPlayerButton, .playerContainer')
    .forEach(el => el.style.display = 'none');

  initGame(); // Initialize main game components
};


// --- Main Game Initialization ---

/** Sets up the main game screen, entities, and logic. */
function initGame() {
  console.log("Initializing main game...");
  updateFieldDimensions();

  // Create Score Board
  scoreBoardElements = createScoreBoard();
  gameContainer.appendChild(scoreBoardElements.container);

  // Create Ground & Register
  const groundElement = createGround();
  gameContainer.appendChild(groundElement);
  const groundHeight = groundElement.offsetHeight || 40;
  const groundPosition = field.height - groundHeight;
  clearRegistry();
  registerGroundInRegistry({ height: groundPosition, element: groundElement });
  console.log(`Registered ground at ${groundPosition}`);

  // Create Wall/Net & Register
  const wallElement = createWall(groundHeight, field.height, field.width);
  gameContainer.appendChild(wallElement);
  const netWidth = wallElement.offsetWidth || field.width * configDimensions.NET_WIDTH_PERCENT; // Use configDimensions
  const netHeight = wallElement.offsetHeight || field.height * configDimensions.NET_HEIGHT_PERCENT; // Use configDimensions
  registerNet({
    position: field.width / 2, width: netWidth, height: netHeight, element: wallElement
  });
  console.log("Registered net.");

  // --- Create Main Ball ---
  const ballConfigDims = { radius: configDimensions.BALL_RADIUS }; // Use configDimensions
  const { element: ballElement } = createBallElement(field, ballConfigDims);
  gameContainer.appendChild(ballElement);
  const ballConstraints = {
    rightBoundry: field.width, leftBoundry: 0, ground: groundPosition, maxVelocity: 105
  };
  const initialBallPosition = { x: field.width / 2, y: field.height / 3 };
  const ballLogic = Ball(
    initialBallPosition, ballConfigDims, ballConstraints, field,
    { canBounceOnGround: false } // Main scoring ball doesn't bounce
  );
  ballLogic.setElement(ballElement);
  setMainBall(ballLogic); // Register in ballManager
  mainBall = ballLogic; // Keep local reference
  console.log("Main ball created.");

  // Subscribe to the Ball's scoredEvent
  if (mainBall?.scoredEvent) {
    mainBall.scoredEvent.subscribe(handleScore);
    console.log("Subscribed to mainBall scoredEvent.");
  } else {
    console.error("Failed to subscribe to mainBall scoredEvent!");
  }

  // Update Slime Constraints and Team for Gameplay
  slimes.forEach(slime => {
    const playerData = playersData.find(p => p.playerIndex === slime.playerIndex);
    if (!playerData || !slime.actorObject) return;

    slime.actorObject.updateTeam(playerData.team);
    slime.actorObject.ground = groundPosition;
    console.log(`Slime ${slime.playerIndex} team set to ${playerData.team}, ground updated.`);
  });

  // Create Game State Machine Instance
  gameInstance = Game(); // From game.js
  // Ensure gameInstance has access to necessary data (like score array reference)
  gameInstance.init(playersData, field, slimes, mainBall);
  updateScoreDisplay(gameInstance.points); // Initialize score display from gameInstance
  console.log("Game instance created.");

  // Start the first round
  const servingTeam = Math.random() < 0.5 ? 1 : 2;
  gameInstance.newRound(servingTeam);
  console.log(`Starting first round, team ${servingTeam} serving.`);
}

// --- Event Handlers ---

/** Handles score events emitted by the main Ball object. */
const handleScore = (scoreData) => {
  const currentTime = Date.now();
  if (currentTime - lastScoreTime < SCORING_COOLDOWN) {
    console.log("Score event ignored - cooldown active.");
    return;
  }
  lastScoreTime = currentTime;

  console.log(`Score detected for team ${scoreData.scoringSide}!`);
  setGameState(GAME_STATES.SCORING);

  if (gameInstance) {
    const isGameOver = gameInstance.incrementScore(scoreData.scoringSide); // Increment score in game state
    updateScoreDisplay(gameInstance.points); // Update UI with new score from game instance
    gameInstance.endRound(scoreData.scoringSide); // Let game instance handle win check / next round
  } else {
    console.error("Cannot handle score - gameInstance is null!");
  }
};

/** Updates the score display UI based on array [team1, team2]. */
const updateScoreDisplay = (scoreArray) => {
  if (scoreBoardElements?.teamOneScore && scoreBoardElements?.teamTwoScore && scoreArray) { // Check elements exist
    scoreBoardElements.teamOneScore.textContent = scoreArray[0];
    scoreBoardElements.teamTwoScore.textContent = scoreArray[1];
  } else {
    console.warn("Cannot update score display - elements or score array missing.");
  }
};

/** Handles window resize events. */
const handleResize = () => {
  console.log("Resize detected.");
  updateFieldDimensions(); // Update field object first

  slimes.forEach(slime => slime.handleResize?.(field));
  mainBall?.handleResize?.(field);
  gameInstance?.setFieldDimensions?.(field);
};

// Debounced resize handler
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(handleResize, 150);
});


// --- Utility Functions ---

/** Updates the global field dimensions object based on the container size. */
function updateFieldDimensions() {
  const rect = gameContainer.getBoundingClientRect();
  field.width = rect.width;
  field.height = rect.height;
}


// --- Game Loop ---

/** The main game loop, called recursively via requestAnimationFrame. */
function gameLoop() {
  update(); // Update logic
  render(); // Render state
  animationFrameId = window.requestAnimationFrame(gameLoop); // Request next frame
}

/** Stop the game loop */
function stopGameLoop() {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    console.log("Game loop stopped.");
  }
}

/** Updates game state for one frame. */
function update() {
  slimes.forEach((slime) => slime.update?.());
  updateBalls(slimes); // Updates all balls via manager
}

/** Renders all game elements based on current state. */
function render() {
  slimes.forEach((slime) => slime.render?.());
  renderBalls(); // Renders all balls via manager
}


// --- Game State Change Subscription ---
stateChangeEvent.subscribe((data) => {
  console.log(`GameState changed: ${data.oldState} -> ${data.newState}`);
  if (data.newState === GAME_STATES.GAME_OVER) {
    console.log("Game Over state reached.");
    mainBall?.stopPhysics?.();
  }
});

addBallEvent.subscribe(() => {
  console.log('Add ball event received');
  console.log(`Current game state: ${gameState.currentState}`);

  if (gameState.currentState === GAME_STATES.SETUP || gameState.currentState === GAME_STATES.PLAYING) {
    console.log(`State is ${gameState.currentState}, attempting to add extra ball...`);
    addExtraBall(true); // isBouncingBall = true
  } else {
    console.log(`State is ${gameState.currentState}, extra ball not added.`);
  }
});

// --- Start Application ---
initStartScreen(); // Initialize the player setup screen first
