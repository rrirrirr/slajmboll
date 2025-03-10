// slimevolley.js
// Main game file with start button implementation

// Remake of slime volleyball https://oneslime.net
import { Slime } from './slime.js';
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
import {
  createAddPlayerButton,
  createTeamHeaders,
  createWall,
  createBall
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

// Import start button functionality
import {
  createAndAddStartButton,
  updateStartButtonVisibility
} from './startButton.js';

const area = document.querySelector('#main');
let delayedActions = [];
let animations = [];
const delayedActionsEvent = Event('delayed actions');
const animationEvent = Event('animations');

const field = { width: 0, height: 0 };
const units = [];
let slimes = [];
const balls = [];
const walls = [];

const onDelayedActions = (action) => {
  delayedActions.push(action);
};
delayedActionsEvent.subscribe(onDelayedActions);

const onAnimationAdd = (animation) => {
  animations.push(animation);
};
animationEvent.subscribe(onAnimationAdd);

const players = [];
let playersArea = null;
let startButton = null;

const startEventListeners = () => {
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('keydown', handleKeyDown);
};

const addPlayerListen = ({ code }) => {
  if (code === 'KeyB') {
    addPlayerToGame();
  }
};

// Function to add a player to the game
const addPlayerToGame = () => {
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

  // Create center wall/net
  const wall = createWall();
  area.appendChild(wall);

  // Create ball
  const ball = createBall();
  area.appendChild(ball);

  // Position ball in center
  ball.style.left = `${field.width / 2 - 20}px`; // Ball width is 40px
  ball.style.top = `${field.height / 3 - 20}px`; // Ball height is 40px

  // Position slimes based on their team
  positionSlimesForGame();

  // Setup game logic
  const gameInstance = Game();

  // Get players who have chosen a team
  const activePlayers = players.filter(player => player.team > 0);

  // Initialize game with active players
  gameInstance.init(activePlayers);

  // Start the first round
  gameInstance.newRound(1); // Start with team 1 serving
};

// Position slimes based on their team assignments
const positionSlimesForGame = () => {
  slimes.forEach(slime => {
    // Find player data for this slime
    const playerData = players[slime.teamNumber];
    if (!playerData) return;

    // Get DOM element
    const slimeElement = document.querySelector(`.slime-${slime.teamNumber}`);
    if (!slimeElement) return;

    // Position based on team
    if (playerData.team === 1) {
      // Team Gold (left side)
      const leftPosition = field.width * 0.25;
      const topPosition = field.height - 40; // 40px from bottom

      slimeElement.style.left = `${leftPosition - 35}px`; // 35px is half of slime width
      slimeElement.style.top = `${topPosition - 35}px`;   // 35px is slime height

      // Update appearance
      slimeElement.style.backgroundColor = 'gold';
      slimeElement.classList.add('teamColorOne');
      slimeElement.classList.remove('teamColorTwo');
    } else if (playerData.team === 2) {
      // Team Crimson (right side)
      const leftPosition = field.width * 0.75;
      const topPosition = field.height - 40; // 40px from bottom

      slimeElement.style.left = `${leftPosition - 35}px`; // 35px is half of slime width
      slimeElement.style.top = `${topPosition - 35}px`;   // 35px is slime height

      // Update appearance
      slimeElement.style.backgroundColor = 'crimson';
      slimeElement.classList.add('teamColorTwo');
      slimeElement.classList.remove('teamColorOne');
    }
  });
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

  // Update slimes
  slimes.forEach((slime) => slime.update());
}

// Render function for the game loop
function render() {
  // Render slimes
  slimes.forEach((slime) => slime.render());
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
