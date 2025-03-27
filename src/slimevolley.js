import { Slime } from './game/slime.js';
import { Ball } from './game/ball.js';
import { dimensions, physics, rules } from '../config.js';
import {
  handleKeyDown,
  handleKeyUp,
  initializeKeyConfigs,
  setupPlayerKeys,
} from './core/inputManager.js';
import { Game, WaitingGame } from './game/game.js';
import { Event, events } from './core/events.js';
import Actor from './game/actor.js';
import {
  createAddPlayerButton,
  createTeamHeaders,
  createWall,
  createBall,
  createScoreBoard,
  waitingScreen,
  createGround
} from './ui/graphics.js';
import {
  gameState,
  GAME_STATES,
  stateChangeEvent,
  teamChangeEvent,
  addPlayer,
  updatePlayerTeam,
  canStartGame,
  setGamePlaying,
  setGameSetup,
  resetGameState,
  setGameState
} from './core/gameState.js';
import {
  createAndAddStartButton,
  updateStartButtonVisibility
} from './ui/startButton.js';
import { addBallEvent } from './core/inputManager.js';
import {
  initBallManager,
  addBall,
  setMainBall,
  getMainBall,
  updateBalls,
  renderBalls,
  cleanupExtraBalls,
  cleanupAllBalls
} from './game/ballManager.js';
import { registerNet, unregisterNet, clearRegistry } from './core/objectRegistry.js';


/**
 * Main game controller and initialization
 * @module slimevolley
 */

/**
 * Main game container
 * @type {HTMLElement}
 */
const gameContainer = document.querySelector('#main');

/**
 * Delayed actions queue
 * @type {Array}
 */
let delayedActions = [];

/**
 * Animation queue
 * @type {Array}
 */
let animations = [];

/**
 * Event for delayed actions
 * @type {Object}
 */
const delayedActionsEvent = Event('delayed actions');

/**
 * Event for animations
 * @type {Object}
 */
const animationEvent = Event('animations');

/**
 * Field dimensions
 * @type {Object}
 */
const field = { width: 0, height: 0 };

/**
 * Slime entities
 * @type {Array}
 */
let slimes = [];

/**
 * Ball entity
 * @type {Object|null}
 */
let ball = null;

/**
 * Game controller instance
 * @type {Object|null}
 */
let gameInstance = null;

/**
 * Timestamp of last scoring event
 * @type {number}
 */
let lastScoringTime = 0;

/**
 * Array to track all balls in the game
 * @type {Array<Object>}
 */
let balls = [];

/**
 * Maximum number of balls allowed at once
 * @type {number}
 */
const MAX_BALLS = 20;

/**
 * Cooldown between scoring events (ms)
 * @type {number}
 */
const SCORING_COOLDOWN = rules.SCORING_COOLDOWN;

// Subscribe to event handlers
delayedActionsEvent.subscribe((action) => {
  delayedActions.push(action);
});

animationEvent.subscribe((animation) => {
  animations.push(animation);
});

/**
 * Player data array
 * @type {Array}
 */
const players = [];

/**
 * Reference to players area container
 * @type {HTMLElement|null}
 */
let playersArea = null;

/**
 * Player key configurations
 * @type {Array}
 */
let initializedKeyConfigs = [];

/**
 * Reference to start button
 * @type {HTMLElement|null}
 */
let startButton = null;

/**
 * Reference to score board
 * @type {HTMLElement|null}
 */
let scoreBoard = null;

/**
 * Set up key event listeners
 */
const startEventListeners = () => {
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('keydown', handleKeyDown);
};

/**
 * Key handler for adding players during setup
 * 
 * @param {KeyboardEvent} event - Key event
 */
const addPlayerKeyHandler = ({ code }) => {
  if (code === 'KeyB') {
    addPlayerToGame();
  }
};

/**
 * Adds a player to the game
 */
const addPlayerToGame = () => {
  // Limit to 4 players total (2 per team)
  if (players.length >= rules.MAX_PLAYERS) return;

  const playerIndex = players.length;

  const playerKeyConfig = initializedKeyConfigs[playerIndex] ||
    (initializedKeyConfigs.length > 0 ? initializedKeyConfigs[0] : initializeKeyConfigs()[0]); // Fallback with safety check


  // Setup player keys and event handlers with player index
  const keyHandlers = setupPlayerKeys(playerKeyConfig, playerIndex);

  // Create player object
  const playerData = {
    team: 0, // Start with no team selected
    keys: keyHandlers,
    appearance: { color: '#888888' }, // Default color until team is selected
    dimensions: { radius: 1 },
    playerIndex
  };

  // Add to players array
  players.push(playerData);

  // Add to game state
  addPlayer(playerData);

  // Create the waiting game container
  const waitingGame = WaitingGame(
    players.length,
    0, // No team initially
    playerKeyConfig,
    playerIndex // Pass player index
  );

  // Calculate center position
  const centerX = (waitingGame.rightBoundary + waitingGame.leftBoundary) / 2;

  // Define the constraints for the slime
  const constraints = {
    rightBoundry: waitingGame.rightBoundary,
    leftBoundry: waitingGame.leftBoundary,
    ground: waitingGame.ground,
    maxVelocity: physics.MAX_VELOCITY
  };

  // Create the slime instance with proper positioning and player index
  const newSlime = Slime(
    0, // No team initially
    playerIndex, // Use player index for identification
    {
      x: centerX,
      y: waitingGame.ground
    },
    { color: '#888888' }, // Default appearance
    { radius: 1 },  // Default dimensions
    constraints,
    waitingGame,
    keyHandlers
  );

  slimes.push(newSlime);

  // Subscribe to team switch event to update player team
  waitingGame.teamSwitchEvent.subscribe((team) => {
    // Only update the specific player
    players[playerIndex].team = team;

    // Update appearance based on team selection
    if (team === 1) {
      players[playerIndex].appearance.color = 'gold';
    } else if (team === 2) {
      players[playerIndex].appearance.color = 'crimson';
    }

    // Update player team in game state
    updatePlayerTeam(playerIndex, team);
  });

  console.log(`Added player ${playerIndex}, total slimes: ${slimes.length}`);

  // Check if start button should be shown
  updateStartButtonVisibility();
};

/**
 * Starts the game when start button is clicked
 */
const startGame = () => {
  if (!canStartGame()) return;

  console.log("Starting game with players:", players);

  // Update game state
  setGamePlaying(true);
  setGameSetup(false);

  // Remove key listener for adding players
  document.removeEventListener('keydown', addPlayerKeyHandler);

  // Hide setup UI elements
  const setupElements = document.querySelectorAll('.teamHeadersContainer, .addPlayerButton');
  setupElements.forEach(element => {
    element.style.display = 'none';
  });

  // Hide player containers but keep slimes
  const playerContainers = document.querySelectorAll('.playerContainer');
  playerContainers.forEach(container => {
    container.style.display = 'none';
  });

  // Initialize the game with the selected players
  initGame();
};



function initGame() {
  // Update field dimensions
  const rect = gameContainer.getBoundingClientRect();
  field.width = rect.width;
  field.height = rect.height;

  // Create score board
  const scoreBoardElements = createScoreBoard();
  scoreBoard = scoreBoardElements.container;
  gameContainer.appendChild(scoreBoard);

  // Create ground element first (so it's under everything else)
  const groundElement = createGround();
  gameContainer.appendChild(groundElement);
  const groundHeight = 40; // Match the height defined in CSS

  // Calculate ground position (where slimes stand)
  const groundPosition = field.height - groundHeight;

  // Register the ground in the object registry for consistent reference
  // Clear existing registry first to avoid conflicts
  clearRegistry();

  // Register the ground in the registry for consistency
  registerGround({
    height: groundPosition,
    element: groundElement
  });

  console.log(`initGame: registered ground at height ${groundPosition}`);

  // Create center wall/net with improved height
  const wall = createWall(groundHeight, field.height, field.width);
  gameContainer.appendChild(wall);

  // Calculate net dimensions
  const netWidth = field.width * dimensions.NET_WIDTH_PERCENT;
  const netHeight = field.height * dimensions.NET_HEIGHT_PERCENT;
  const netPosition = field.width / 2;

  // Register the net in the object registry
  registerNet({
    position: netPosition,
    width: netWidth,
    height: netHeight,
    element: wall
  });

  // Create ball DOM element
  const ballElement = createBall();
  gameContainer.appendChild(ballElement);

  // Set ball size
  const ballSize = 40; // px
  ballElement.style.width = `${ballSize}px`;
  ballElement.style.height = `${ballSize}px`;

  // Position ball in center initially for visual reference
  ballElement.style.left = `${field.width / 2 - ballSize / 2}px`;
  ballElement.style.top = `${field.height / 3 - ballSize / 2}px`;

  // Initialize ball at center position
  const initialBallPosition = {
    x: field.width / 2,
    y: field.height / 3
  };

  // Clean up any existing balls
  cleanupAllBalls();

  // Initialize ball manager with updated field dimensions
  initBallManager(gameContainer, field);

  // Create ball dimensions and constraints
  const ballDimensions = { radius: 0.5 }; // Half the size of a slime
  const ballConstraints = {
    rightBoundry: field.width,
    leftBoundry: 0,
    ground: groundPosition, // Use adjusted ground position
    maxVelocity: 15
  };

  // Create the main game ball
  ball = Ball(
    initialBallPosition,
    ballDimensions,
    ballConstraints,
    field,
    { canBounceOnGround: false } // Main game ball cannot bounce on ground
  );

  // Set the DOM element
  ball.setElement(ballElement);

  // Register the main ball with the ball manager
  setMainBall(ball);

  // Subscribe to ball collision events
  ball.hitSlimeEvent.subscribe(handleBallSlimeCollision);
  ball.scoredEvent.subscribe(handleScore);

  // Create game instance
  gameInstance = Game();

  // Initialize with game elements
  gameInstance.init(players, field, slimes, ball);

  // Start with random team serving
  const servingTeam = Math.random() < 0.5 ? 1 : 2;
  gameInstance.newRound(servingTeam);
}


/**
 * Updates game elements when screen is resized
 * 
 * @param {Object} dimensions - New field dimensions
 */
function handleFieldResize(dimensions) {
  // Update field dimensions
  field.width = dimensions.width;
  field.height = dimensions.height;

  // Update ball dimensions if the ball exists
  if (ball && typeof ball.updateAllSlimeDimensions === 'function') {
    ball.updateAllSlimeDimensions();
  }

  // Other resize handling code like repositioning elements...
}

// Find existing resize event or create one
const fieldResizeEvent = events.get('field_resize') || Event('field_resize');

// Subscribe to the resize event
fieldResizeEvent.subscribe(handleFieldResize);

/**
 * Handles ball-slime collisions
 * 
 * @param {Object} data - Collision data
 */
const handleBallSlimeCollision = (data) => {
  console.log(`Ball hit slime ${data.slimeId} on team ${data.teamNumber}`);

  // You can add additional effects or logic here
  // For example, play a sound, add a visual effect, etc.
};

/**
 * Handles scoring
 * 
 * @param {Object} data - Scoring data
 */
const handleScore = (data) => {
  const currentTime = Date.now();

  // Prevent multiple scoring events too close together
  if (currentTime - lastScoringTime < SCORING_COOLDOWN) {
    console.log("Scoring too soon after last score, ignoring");
    return;
  }

  lastScoringTime = currentTime;
  console.log(`Team ${data.scoringSide} scored!`);

  // End the round in the game with the scoring team
  if (gameInstance) {
    gameInstance.endRound(data.scoringSide);
  }
};


const initStartScreen = () => {
  // Reset game state
  resetGameState();

  // Clear any registered game objects
  clearRegistry();

  // Set up event listeners
  document.addEventListener('keydown', addPlayerKeyHandler);
  startEventListeners();

  // Initialize key configurations
  initializedKeyConfigs = initializeKeyConfigs();

  // Clear the main area
  while (gameContainer.firstChild) {
    gameContainer.removeChild(gameContainer.firstChild);
  }

  // Initialize ball manager
  initBallManager(gameContainer, field);

  // Add team headers
  const teamHeaders = createTeamHeaders();
  gameContainer.appendChild(teamHeaders);

  // Create players area
  playersArea = document.createElement('div');
  playersArea.classList.add('playersArea');
  gameContainer.appendChild(playersArea);

  // Create and add start button (initially hidden)
  startButton = createAndAddStartButton(gameContainer, startGame);

  // Add "Add Player" button
  const addPlayerBtn = createAddPlayerButton(addPlayerToGame);
  gameContainer.appendChild(addPlayerBtn);

  // Add the first player
  if (players.length === 0) {
    addPlayerToGame();
  }
};


/**
 * Cleans up all balls except the main game ball
 */
const cleanupBalls = () => {
  // Remove all balls from DOM except main game ball
  balls.forEach(ballObj => {
    if (ballObj !== ball && ballObj && ballObj.element) {
      ballObj.element.remove();
    }
  });

  // Reset to just the main game ball if it exists
  balls = ball ? [ball] : [];
};

// Subscribe to add ball event from the input manager
const ballSubscription = addBallEvent.subscribe(() => {
  console.log('Adding new ball from event');
  addBall(true);
});

// Subscribe to state change event to cleanup balls when needed
const stateSubscription = stateChangeEvent.subscribe((data) => {
  if (data.type === 'state_change') {
    if (data.newState === GAME_STATES.GAME_OVER ||
      data.newState === GAME_STATES.SETUP) {
      // Clean up balls when game ends or returns to setup
      cleanupBalls();
    }
  }
});


/**
 * Updates game state for one frame
 */
function update() {
  // Process delayed actions
  delayedActions = delayedActions.filter((action) => {
    action.delay--;
    if (action.delay === 0) {
      action.execute();
    }
    return action.delay > 0;
  });

  // Process animations
  animations = animations.filter((animation) => {
    animation.next();
    return !animation.ended();
  });

  // Update slimes regardless of state
  slimes.forEach((slime) => slime.update());

  // Update all balls using the ball manager
  updateBalls(slimes);

  // Check scoring condition only for the main game ball during PLAYING state
  ball = getMainBall(); // Get the current main ball reference

  if (
    gameState.currentState === GAME_STATES.PLAYING &&
    ball &&
    ball.ao
  ) {
    if (
      ball.ao.pos.y >= ball.ao.ground - ball.ao.realRadius * 1.2 && // Ball is near ground
      Math.abs(ball.ao._velocity.y) < 0.8 // Ball has low vertical velocity
    ) {
      // Determine which side the ball is on
      const scoringSide = ball.ao.pos.x < field.width / 2 ? 2 : 1;

      console.log(`Ball triggered scoring for team ${scoringSide}`);

      // Change state to prevent multiple scoring events
      setGameState(GAME_STATES.SCORING);

      // End the round with the scoring team
      if (gameInstance) {
        gameInstance.endRound(scoringSide);
      }
    }
  }
}

/**
 * Renders game elements
 */
function render() {
  // Render slimes
  slimes.forEach((slime) => slime.render());

  // Render all balls
  renderBalls()
}

/**
 * Game loop
 */
function gameLoop() {
  // Update game state
  update();

  // Render game elements
  render();

  // Continue the loop
  window.requestAnimationFrame(gameLoop);
}

/**
 * Handles game state changes
 * 
 * @param {Object} data - State change data
 */
stateChangeEvent.subscribe((data) => {
  if (data.type === 'playing_change') {
    console.log('Game playing state changed:', data.value);
  }
});

// Initialize the start screen
initStartScreen();

// Start the game loop
window.requestAnimationFrame(gameLoop);
