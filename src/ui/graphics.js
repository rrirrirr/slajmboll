import { Event } from '../core/events.js';
import { updatePlayerTeam } from '../core/gameState.js';
import { teams } from '../config.js';

/**
 * Creates a slime element
 * 
 * @param {Object} options - Slime options
 * @param {string} options.color - Color of the slime
 * @returns {HTMLElement} Slime DOM element
 */
export function createSlime({ color }) {
  const slime = document.createElement('div');
  slime.classList.add('slime');
  slime.style.backgroundColor = color;
  return slime;
}

/**
 * Formats key name for display
 * 
 * @param {string} key - Key code (e.g. 'ArrowUp')
 * @returns {string} Cleaned key name (e.g. 'Up')
 */
export function cleanKey(key) {
  return key.replace(/Digit|Arrow|Key/, '');
}

/**
 * Creates the waiting screen for player setup
 * 
 * @param {number} playerNumber - Player number (1-based)
 * @param {number} team - Team number (0=none, 1, 2)
 * @param {Object} keys - Key configuration
 * @param {number} playerIndex - Player index in the global array
 * @returns {Object} Screen element and team switch event
 */
export function waitingScreen(playerNumber, team = 0, keys, playerIndex) {
  const teamSwitchEvent = Event(`team_switch_player${playerIndex}`);

  // Main player container
  const container = document.createElement('div');
  container.classList.add('playerContainer');
  container.dataset.playerIndex = playerIndex;
  container.dataset.team = team; // Store team data attribute

  // Player name
  const playerLabel = document.createElement('div');
  playerLabel.classList.add('playerLabel');
  playerLabel.textContent = `P${playerNumber}`;
  container.appendChild(playerLabel);

  // Controls with team arrows
  const controlsContainer = document.createElement('div');
  controlsContainer.classList.add('controlsContainer');

  // Left team selector (Team Gold)
  const teamLeftSelector = document.createElement('span');
  teamLeftSelector.classList.add('teamSelector', 'teamLeftSelector');
  teamLeftSelector.innerHTML = '<';
  controlsContainer.appendChild(teamLeftSelector);

  // Panel background for keys
  const keysPanelContainer = document.createElement('div');
  keysPanelContainer.classList.add('keysPanelContainer');

  // Keys container inside panel
  const keysContainer = document.createElement('div');
  keysContainer.classList.add('keysContainer');

  // Create a key layout UI
  createKeyLayout(keysContainer, keys);

  // Build structure
  keysPanelContainer.appendChild(keysContainer);
  controlsContainer.appendChild(keysPanelContainer);

  // Right team selector (Team Crimson)
  const teamRightSelector = document.createElement('span');
  teamRightSelector.classList.add('teamSelector', 'teamRightSelector');
  teamRightSelector.innerHTML = '>';
  controlsContainer.appendChild(teamRightSelector);

  container.appendChild(controlsContainer);

  // Set initial team if provided
  if (team === 1) {
    container.classList.add('teamOne');
    playerLabel.classList.add('teamOneText');
  } else if (team === 2) {
    container.classList.add('teamTwo');
    playerLabel.classList.add('teamTwoText');
  }

  // Function to handle team switching
  const teamSwitch = (newTeam) => {
    container.dataset.team = newTeam; // Update data attribute

    if (newTeam === 1) {
      container.classList.add('teamOne');
      container.classList.remove('teamTwo');
      playerLabel.classList.add('teamOneText');
      playerLabel.classList.remove('teamTwoText');

      // Update global game state
      updatePlayerTeam(playerIndex, 1);

      // Emit local event
      teamSwitchEvent.emit(1);
    } else if (newTeam === 2) {
      container.classList.add('teamTwo');
      container.classList.remove('teamOne');
      playerLabel.classList.add('teamTwoText');
      playerLabel.classList.remove('teamOneText');

      // Update global game state
      updatePlayerTeam(playerIndex, 2);

      // Emit local event
      teamSwitchEvent.emit(2);
    }
  };

  // Add click handlers
  teamLeftSelector.addEventListener('click', () => teamSwitch(1));
  teamRightSelector.addEventListener('click', () => teamSwitch(2));

  return { screen: container, teamSwitchEvent };

  /**
   * Creates a key layout UI
   * 
   * @param {HTMLElement} container - Container for key layout
   * @param {Object} keyConfig - Key configuration
   */
  function createKeyLayout(container, keyConfig) {
    // Top row (up key)
    const buttonLineOne = document.createElement('div');
    buttonLineOne.classList.add('buttonLine');

    // Empty slot for alignment
    const emptyLeft = document.createElement('div');
    emptyLeft.classList.add('keySlot');

    const upButton = document.createElement('button');
    upButton.textContent = cleanKey(keyConfig.up);
    upButton.classList.add('keyButton');

    // Empty slot for alignment
    const emptyRight = document.createElement('div');
    emptyRight.classList.add('keySlot');

    buttonLineOne.appendChild(emptyLeft);
    buttonLineOne.appendChild(upButton);
    buttonLineOne.appendChild(emptyRight);

    // Bottom row (left, down, right keys)
    const buttonLineTwo = document.createElement('div');
    buttonLineTwo.classList.add('buttonLine');

    const leftButton = document.createElement('button');
    leftButton.textContent = cleanKey(keyConfig.left);
    leftButton.classList.add('keyButton');

    const downButton = document.createElement('button');
    downButton.textContent = cleanKey(keyConfig.down);
    downButton.classList.add('keyButton');

    const rightButton = document.createElement('button');
    rightButton.textContent = cleanKey(keyConfig.right);
    rightButton.classList.add('keyButton');

    buttonLineTwo.appendChild(leftButton);
    buttonLineTwo.appendChild(downButton);
    buttonLineTwo.appendChild(rightButton);

    // Add to container
    container.appendChild(buttonLineOne);
    container.appendChild(buttonLineTwo);
  }
}

/**
 * Creates the "Add Player" button
 * 
 * @param {Function} callback - Click handler
 * @returns {HTMLElement} Button element
 */
export function createAddPlayerButton(callback) {
  const button = document.createElement('div');
  button.classList.add('addPlayerButton');
  button.textContent = 'Press B to Add Player';
  button.addEventListener('click', callback);
  return button;
}

/**
 * Creates team header elements
 * 
 * @returns {HTMLElement} Container with team headers
 */
export function createTeamHeaders() {
  const container = document.createElement('div');
  container.classList.add('teamHeadersContainer');

  const teamGold = document.createElement('div');
  teamGold.classList.add('teamHeader', 'teamGoldHeader');
  teamGold.textContent = 'TEAM GOLD';

  const teamCrim = document.createElement('div');
  teamCrim.classList.add('teamHeader', 'teamCrimHeader');
  teamCrim.textContent = 'TEAM CRIM';

  container.appendChild(teamGold);
  container.appendChild(teamCrim);

  return container;
}

/**
 * Creates the start button
 * 
 * @param {Function} callback - Click handler
 * @returns {HTMLElement} Button element
 */
export function createStartButton(callback) {
  const button = document.createElement('button');
  button.classList.add('startButton');
  button.textContent = 'START GAME';
  button.addEventListener('click', callback);
  return button;
}

/**
 * Creates the ball element
 * 
 * @returns {HTMLElement} Ball element
 */
export function createBall() {
  const ball = document.createElement('div');
  ball.classList.add('ball');
  return ball;
}

/**
 * Creates a countdown display
 * 
 * @returns {Object} Countdown container and text elements
 */
export function createCountdown() {
  const countdownContainer = document.createElement('div');
  countdownContainer.classList.add('countdownContainer');

  const countdownText = document.createElement('div');
  countdownText.classList.add('countdownText');
  countdownContainer.appendChild(countdownText);

  countdownContainer.style.display = 'none'; // Hide initially

  return { container: countdownContainer, text: countdownText };
}

/**
 * Creates a score board
 * 
 * @returns {Object} Score board elements
 */
export function createScoreBoard() {
  const scoreBoard = document.createElement('div');
  scoreBoard.classList.add('scoreBoard');

  const teamOneScore = document.createElement('div');
  teamOneScore.classList.add('teamScore', 'teamOneScore');
  teamOneScore.textContent = '0';

  const scoreSeparator = document.createElement('div');
  scoreSeparator.classList.add('scoreSeparator');
  scoreSeparator.textContent = '-';

  const teamTwoScore = document.createElement('div');
  teamTwoScore.classList.add('teamScore', 'teamTwoScore');
  teamTwoScore.textContent = '0';

  scoreBoard.appendChild(teamOneScore);
  scoreBoard.appendChild(scoreSeparator);
  scoreBoard.appendChild(teamTwoScore);

  return {
    container: scoreBoard,
    teamOneScore,
    teamTwoScore
  };
}

/**
 * Creates game over screen
 * 
 * @param {number} winningTeam - Team that won (1 or 2)
 * @param {Function} onPlayAgain - Click handler for play again button
 * @returns {HTMLElement} Game over screen element
 */
export function createGameOverScreen(winningTeam, onPlayAgain) {
  const gameOverScreen = document.createElement('div');
  gameOverScreen.classList.add('gameOverScreen');

  const gameOverText = document.createElement('div');
  gameOverText.classList.add('gameOverText');
  gameOverText.textContent = `TEAM ${winningTeam === 1 ? 'GOLD' : 'CRIM'} WINS!`;

  const playAgainButton = document.createElement('button');
  playAgainButton.classList.add('playAgainButton');
  playAgainButton.textContent = 'PLAY AGAIN';
  playAgainButton.addEventListener('click', onPlayAgain);

  gameOverScreen.appendChild(gameOverText);
  gameOverScreen.appendChild(playAgainButton);

  return gameOverScreen;
}

/**
 * Creates the center wall/net
 * 
 * @returns {HTMLElement} Wall element
 */
export function createWall() {
  const wall = document.createElement('div');
  wall.id = 'wall';
  return wall;
}

/**
 * Creates a UI element with text
 * 
 * @param {string} elementType - HTML element type (e.g., 'div', 'button')
 * @param {string} text - Text content
 * @param {string[]} [classNames=[]] - CSS class names
 * @param {Object} [attributes={}] - HTML attributes
 * @returns {HTMLElement} Created element
 */
export function createUIElement(elementType, text, classNames = [], attributes = {}) {
  const element = document.createElement(elementType);
  element.textContent = text;

  // Add classes
  classNames.forEach(className => element.classList.add(className));

  // Add attributes
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  return element;
}

/**
 * Applies team styling to an element
 * 
 * @param {HTMLElement} element - Element to style
 * @param {number} teamNumber - Team number (1 or 2)
 */
export function applyTeamStyling(element, teamNumber) {
  // Remove existing team classes
  element.classList.remove('teamOne', 'teamTwo', 'teamOneText', 'teamTwoText');

  if (teamNumber === 1) {
    element.classList.add('teamOne');
    element.classList.add('teamOneText');
  } else if (teamNumber === 2) {
    element.classList.add('teamTwo');
    element.classList.add('teamTwoText');
  }
}
