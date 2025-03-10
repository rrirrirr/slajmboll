import { Event } from './events.js';
import { updatePlayerTeam } from './gameState.js';

// Create a slime element
export function createSlime({ color }) {
  const slime = document.createElement('div');
  slime.classList.add('slime');
  slime.style.backgroundColor = color;
  return slime;
}

// Clean key display
export function cleanKey(key) {
  return key.replace(/Digit|Arrow|Key/, '');
}

// Create the waiting screen for player setup
export function waitingScreen(num, team = 0, keys, playerIndex) {
  const teamSwitchEvent = Event(`team_switch_player${playerIndex}`);

  // Main player container
  const container = document.createElement('div');
  container.classList.add('playerContainer');
  container.dataset.playerIndex = playerIndex;
  container.dataset.team = team; // Store team data attribute

  // Player name
  const playerLabel = document.createElement('div');
  playerLabel.classList.add('playerLabel');
  playerLabel.textContent = `P${num}`;
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

  // Top row (up key)
  const buttonLineOne = document.createElement('div');
  buttonLineOne.classList.add('buttonLine');

  // Empty slot for alignment
  const emptyLeft = document.createElement('div');
  emptyLeft.classList.add('keySlot');

  const up = document.createElement('button');
  up.textContent = cleanKey(keys.up);
  up.classList.add('keyButton');

  // Empty slot for alignment
  const emptyRight = document.createElement('div');
  emptyRight.classList.add('keySlot');

  buttonLineOne.appendChild(emptyLeft);
  buttonLineOne.appendChild(up);
  buttonLineOne.appendChild(emptyRight);

  // Bottom row (left, down, right keys)
  const buttonLineTwo = document.createElement('div');
  buttonLineTwo.classList.add('buttonLine');

  const left = document.createElement('button');
  left.textContent = cleanKey(keys.left);
  left.classList.add('keyButton');

  const down = document.createElement('button');
  down.textContent = cleanKey(keys.down);
  down.classList.add('keyButton');

  const right = document.createElement('button');
  right.textContent = cleanKey(keys.right);
  right.classList.add('keyButton');

  buttonLineTwo.appendChild(left);
  buttonLineTwo.appendChild(down);
  buttonLineTwo.appendChild(right);

  // Build structure
  keysContainer.appendChild(buttonLineOne);
  keysContainer.appendChild(buttonLineTwo);
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
}

// Create the "Add Player" button
export function createAddPlayerButton(callback) {
  const button = document.createElement('div');
  button.classList.add('addPlayerButton');
  button.textContent = 'Press B to Add Player';
  button.addEventListener('click', callback);
  return button;
}

// Create team headers
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

// Create the start button
export function createStartButton(callback) {
  const button = document.createElement('button');
  button.classList.add('startButton');
  button.textContent = 'START GAME';
  button.addEventListener('click', callback);
  return button;
}

// Create the ball element
export function createBall() {
  const ball = document.createElement('div');
  ball.classList.add('ball');
  return ball;
}

// Create a countdown display
export function createCountdown() {
  const countdownContainer = document.createElement('div');
  countdownContainer.classList.add('countdownContainer');

  const countdownText = document.createElement('div');
  countdownText.classList.add('countdownText');
  countdownContainer.appendChild(countdownText);

  countdownContainer.style.display = 'none'; // Hide initially

  return { container: countdownContainer, text: countdownText };
}

// Create a score board
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

// Create game over screen
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

// Create the center wall/net
export function createWall() {
  const wall = document.createElement('div');
  wall.id = 'wall';
  return wall;
}
