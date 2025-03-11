import { Slime } from './slime.js';
import { Ball } from './ball.js';
import { GRAVITY } from './constants.js';
import {
  playerKeys,
  handleKeyDown,
  handleKeyUp,
  initKeys,
  setupKeys,
} from './keys.js';
import { Game, WaitingGame } from './game.js';
import { Event, events } from './events.js';
import Actor from './actor.js';
import {
  createAddPlayerButton,
  createTeamHeaders,
  createWall,
  createBall,
  createScoreBoard
} from './graphics.js';

// Import game state management
import {
  gameState,
  gameStateChangeEvent,
  addPlayer,
  updatePlayerTeam,
  canStartGame,
  setGamePlaying,
  setGameSetup,
  resetGameState
} from './gameState.js';

import {
  GAME_STATE,
  currentGameState,
  setGameState,
  roundStartEvent,
  roundEndEvent,
  countdownStartEvent,
  countdownEndEvent,
  activeCountdown
} from './gameStateManager.js';

// Import start button functionality
import {
  createAndAddStartButton,
  updateStartButtonVisibility
} from './startButton.js';

// Initialize global variables
const area = document.querySelector('#main');
let delayedActions = [];
let animations = [];
const delayedActionsEvent = Event('delayed actions');
const animationEvent = Event('animations');

const field = { width: 0, height: 0 };
let slimes = [];
let ball = null;
let gameInstance = null;
let lastScoringTime = 0;
const SCORING_COOLDOWN = 2000; // 2 seconds cooldown between scoring events

// Subscribe to event handlers
delayedActionsEvent.subscribe((action) => {
  delayedActions.push(action);
});

animationEvent.subscribe((animation) => {
  animations.push(animation);
});

// Array to hold player data
const players = [];
let playersArea = null;
let startButton = null;
let scoreBoard = null;

// Set up event listeners
const startEventListeners = () => {
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('keydown', handleKeyDown);
};

// Listen for "B" key to add players during setup
const addPlayerListen = ({ code }) => {
  if (code === 'KeyB') {
    addPlayerToGame();
  }
};

// Function to add a player to the game
const addPlayerToGame = () => {
  // Limit to 4 players total (2 per team)
  if (players.length >= 4) return;

  const playerIndex = players.length;

  // Get the next available player keys
  const playerKeySet = playerKeys[playerIndex] || playerKeys[0]; // Fallback to first key set if we run out

  // Setup player keys and event handlers with player index
  const keyHandlers = setupKeys(playerKeySet, playerIndex);

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
    playerKeySet,
    playerIndex // Pass player index
  );

  // Calculate center position
  const centerX = (waitingGame.rightBoundry + waitingGame.leftBoundry) / 2;

  // Define the constraints for the slime
  const constraints = {
    rightBoundry: waitingGame.rightBoundry,
    leftBoundry: waitingGame.leftBoundry,
    ground: waitingGame.ground,
    maxVelocity: 10 // Adding missing maxVelocity parameter
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

// Function to start the game when start button is clicked
const startGame = () => {
  if (!canStartGame()) return;

  console.log("Starting game with players:", players);

  // Update game state
  setGamePlaying(true);
  setGameSetup(false);

  // Remove key listener for adding players
  document.removeEventListener('keydown', addPlayerListen);

  // Hide setup UI elements
  const setupElements = document.querySelectorAll('.teamHeadersContainer, .addPlayerButton');
  setupElements.forEach(el => {
    el.style.display = 'none';
  });

  // Hide player containers but keep slimes
  const playerContainers = document.querySelectorAll('.playerContainer');
  playerContainers.forEach(container => {
    container.style.display = 'none';
  });

  // Initialize the game with the selected players
  initGame();
};

// Initialize the game for gameplay
const initGame = () => {
  // Update field dimensions
  const rect = area.getBoundingClientRect();
  field.width = rect.width;
  field.height = rect.height;

  // Create score board
  const scoreBoardElements = createScoreBoard();
  scoreBoard = scoreBoardElements.container;
  area.appendChild(scoreBoard);

  // Create center wall/net
  const wall = createWall();
  area.appendChild(wall);

  // Calculate ground position (where slimes stand)
  const groundPosition = field.height - 40; // 40px from bottom

  // Create ball DOM element
  const ballElement = createBall();
  area.appendChild(ballElement);

  // Set ball size
  const ballSize = 40; // px
  ballElement.style.width = `${ballSize}px`;
  ballElement.style.height = `${ballSize}px`;

  // Position ball in center initially for visual reference
  ballElement.style.left = `${field.width / 2 - ballSize / 2}px`;
  ballElement.style.top = `${field.height / 3 - ballSize / 2}px`;

  // Create ball physics object
  const ballDimensions = { radius: 0.5 }; // Half the size of a slime
  const ballConstraints = {
    rightBoundry: field.width,
    leftBoundry: 0,
    ground: groundPosition,
    maxVelocity: 15
  };

  // Initialize ball at center position
  const initialBallPosition = {
    x: field.width / 2,
    y: field.height / 3
  };

  // Create ball physics object
  ball = {
    element: ballElement,
    ao: Actor(
      initialBallPosition,
      { x: 0, y: 0 },
      ballDimensions.radius,
      ballConstraints.rightBoundry,
      ballConstraints.leftBoundry,
      ballConstraints.ground,
      ballConstraints.maxVelocity
    ),
    update: function() {
      this.ao.update();
      this.render();
    },
    render: function() {
      const ballWidth = parseInt(this.element.style.width);
      const ballHeight = parseInt(this.element.style.height);
      this.element.style.left = `${this.ao.pos.x - ballWidth / 2}px`;
      this.element.style.top = `${this.ao.pos.y - ballHeight / 2}px`;
    }
  };

  // Create game instance
  gameInstance = Game();

  // Initialize with game elements
  gameInstance.init(players, field, slimes, ball);

  // Start with random team serving
  const servingTeam = Math.random() < 0.5 ? 1 : 2;
  gameInstance.newRound(servingTeam);
};

// Handle ball-slime collisions
const handleBallSlimeCollision = (data) => {
  console.log(`Ball hit slime ${data.slimeId} on team ${data.teamNumber}`);

  // You can add additional effects or logic here
  // For example, play a sound, add a visual effect, etc.
};

// Handle scoring
const handleScore = (data) => {
  console.log(`Team ${data.scoringSide} scored!`);

  // End the round in the game with the scoring team
  if (gameInstance) {
    gameInstance.endRound(data.scoringSide);
  }
};

// Initialize the start screen
const initStartScreen = () => {
  // Reset game state
  resetGameState();

  // Set up event listeners
  document.addEventListener('keydown', addPlayerListen);
  startEventListeners();
  initKeys();

  // Clear the main area
  while (area.firstChild) {
    area.removeChild(area.firstChild);
  }

  // Add team headers
  const teamHeaders = createTeamHeaders();
  area.appendChild(teamHeaders);

  // Create players area
  playersArea = document.createElement('div');
  playersArea.classList.add('playersArea');
  area.appendChild(playersArea);

  // Create and add start button (initially hidden)
  startButton = createAndAddStartButton(area, startGame);

  // Add "Add Player" button
  const addPlayerBtn = createAddPlayerButton(addPlayerToGame);
  area.appendChild(addPlayerBtn);

  // Add the first player
  if (players.length === 0) {
    addPlayerToGame();
  }
};

// Update function for the game loop
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
  if (currentGameState === GAME_STATE.PLAYING && ball && typeof ball.update === 'function') {
    ball.update();

    // Check for scoring condition
    if (
      ball.ao &&
      ball.ao.pos.y >= ball.ao.ground - 5 && // Ball is near ground
      Math.abs(ball.ao._velocity.y) < 0.8 // Ball has low vertical velocity
    ) {
      // Determine which side the ball is on
      const scoringSide = ball.ao.pos.x < field.width / 2 ? 2 : 1;

      console.log(`Ball triggered scoring for team ${scoringSide}`);

      // Change state to prevent multiple scoring events
      setGameState(GAME_STATE.SCORING);

      // Emit round end event with scoring team
      roundEndEvent.emit(scoringSide);

      // End the round with the scoring team
      if (gameInstance) {
        gameInstance.endRound(scoringSide);
      }
    }
  } else if (currentGameState === GAME_STATE.SCORING || currentGameState === GAME_STATE.COUNTDOWN) {
    // Still render the ball position during non-playing states
    if (ball && typeof ball.render === 'function') {
      ball.render();
    }
  }
}

// Render function for the game loop
function render() {
  // Render slimes
  slimes.forEach((slime) => slime.render());

  // Render ball if game is playing
  if (gameState.isPlaying && ball) {
    ball.render();
  }
}

// Game loop
function gameLoop() {
  // Update game state
  update();

  // Render game elements
  render();

  // Continue the loop
  window.requestAnimationFrame(gameLoop);
}

// Handle game state changes
gameStateChangeEvent.subscribe((data) => {
  if (data.type === 'playing_change') {
    console.log('Game playing state changed:', data.value);
  }
});

// Initialize the start screen
initStartScreen();

// Start the game loop
window.requestAnimationFrame(gameLoop);
