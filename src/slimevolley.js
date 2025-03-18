import { Slime } from './game/slime.js';
import { Ball } from './game/ball.js';
import { physics, rules } from '../config.js';
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

// Import game state management
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

// Import start button functionality
import {
  createAndAddStartButton,
  updateStartButtonVisibility
} from './ui/startButton.js';

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

/**
 * Initializes the game for gameplay
 */
const initGame = () => {
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
  const groundHeight = 40; // Match the height defined in createGround

  // Create center wall/net with improved height
  const wall = createWall(groundHeight, field.height);
  gameContainer.appendChild(wall);

  // Calculate ground position (where slimes stand)
  const groundPosition = field.height - groundHeight; // Adjust for ground height

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

  // Create ball physics object using the Ball factory function
  const ballDimensions = { radius: 0.5 }; // Half the size of a slime
  const ballConstraints = {
    rightBoundry: field.width,
    leftBoundry: 0,
    ground: groundPosition, // Use adjusted ground position
    maxVelocity: 15
  };

  // Create ball using the Ball factory function
  ball = Ball(
    initialBallPosition,
    ballDimensions,
    ballConstraints,
    field
  );

  // Set the DOM element
  ball.setElement(ballElement);

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
};

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

/**
 * Initializes the start screen
 */
const initStartScreen = () => {
  // Reset game state
  resetGameState();

  // Set up event listeners
  document.addEventListener('keydown', addPlayerKeyHandler);
  startEventListeners();

  // Initialize key configurations
  initializedKeyConfigs = initializeKeyConfigs();

  // Clear the main area
  while (gameContainer.firstChild) {
    gameContainer.removeChild(gameContainer.firstChild);
  }

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

  // Only update ball physics and check scoring during PLAYING state
  if (gameState.currentState === GAME_STATES.PLAYING && ball && typeof ball.update === 'function') {
    ball.update();

    // Check for ball-slime collisions
    slimes.forEach((slime) => {
      if (slime && typeof ball.checkSlimeCollision === 'function') {
        ball.checkSlimeCollision(slime);
      }
    });

    // Check for scoring condition
    if (
      ball.ao &&
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
  } else if (gameState.currentState === GAME_STATES.SCORING ||
    gameState.currentState === GAME_STATES.COUNTDOWN) {
    // Still render the ball position during non-playing states
    if (ball && typeof ball.render === 'function') {
      ball.render();
    }
  }
}


/**
 * Renders game elements
 */
function render() {
  // Render slimes
  slimes.forEach((slime) => slime.render());

  // Render ball if game is playing
  if (gameState.isPlaying && ball) {
    ball.render();
  }
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
