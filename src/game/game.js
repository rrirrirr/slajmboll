import { Event, events } from '../core/events.js';
import { createSlimeElement } from '../ui/slimeGraphics.js';
import { physics, rules } from '../../config.js';
import {
  GAME_STATES,
  setGameState,
  roundStartEvent,
  roundEndEvent,
  countdownStartEvent,
  countdownEndEvent,
  setActiveCountdown
} from '../core/gameState.js';

/**
 * Creates a global event for game additions
 * @type {Object}
 */
const gameAddEvent = Event('game added');

/**
 * @typedef {Object} FieldDimensions
 * @property {number} width - Width of the playing field
 * @property {number} height - Height of the playing field
 */

/**
 * @typedef {Object} GamePlayer
 * @property {number} playerIndex - Unique player index
 * @property {number} team - Team number (1 or 2) 
 * @property {Object} keys - Player input handlers
 */

/**
 * Creates the main game controller
 * 
 * @returns {Object} Game controller with methods to manage game state
 */
function Game() {
  /**
   * Players data
   * @type {Array<GamePlayer>}
   */
  let players = [];

  /**
   * Slime entities
   * @type {Array<Object>}
   */
  let slimes = [];

  /**
   * Ball entity
   * @type {Object|null}
   */
  let ball = null;

  /**
   * Current score [team1, team2]
   * @type {Array<number>}
   */
  let points = [0, 0];

  /**
   * Score display elements
   * @type {NodeList}
   */
  let scoreElements = document.querySelectorAll('.score');

  /**
   * Main game container
   * @type {HTMLElement}
   */
  let gameContainer = document.querySelector('#main');

  /**
   * Field dimensions
   * @type {FieldDimensions}
   */
  let field = { width: 0, height: 0 };

  /**
   * Initializes the game with players and game elements
   * 
   * @param {Array<GamePlayer>} playerData - Player information
   * @param {FieldDimensions} fieldDimensions - Playing field dimensions
   * @param {Array<Object>} gameSlimes - Slime entities
   * @param {Object} gameBall - Ball entity
   */
  const init = (playerData, fieldDimensions, gameSlimes, gameBall) => {
    // Store references to game elements
    players = playerData;
    slimes = gameSlimes;
    ball = gameBall;
    field = fieldDimensions;

    // Get scores from DOM if they exist
    scoreElements = document.querySelectorAll('.score');

    console.log("Game initialized with ball:", ball);
  };

  /**
   * Positions slimes at evenly spaced intervals on their respective sides
   */
  const positionSlimesForRound = () => {
    // Group slimes by team
    const team1Slimes = slimes.filter(slime => {
      const playerData = players.find(p => p.playerIndex === slime.teamNumber);
      return playerData && playerData.team === 1;
    });

    const team2Slimes = slimes.filter(slime => {
      const playerData = players.find(p => p.playerIndex === slime.teamNumber);
      return playerData && playerData.team === 2;
    });

    // Position each team's slimes
    positionTeamSlimes(team1Slimes, 1);
    positionTeamSlimes(team2Slimes, 2);
  };

  /**
   * Positions slimes for a specific team
   * 
   * @param {Array<Object>} teamSlimes - Slimes belonging to the team
   * @param {number} teamNumber - Team number (1 or 2)
   */
  const positionTeamSlimes = (teamSlimes, teamNumber) => {
    if (!teamSlimes.length) return;

    // Determine side boundaries based on team
    const isTeam1 = teamNumber === 1;
    const sideStart = isTeam1 ? 0 : field.width / 2;
    const sideEnd = isTeam1 ? field.width / 2 : field.width;
    const sideWidth = sideEnd - sideStart;

    // Calculate spacing between slimes
    const padding = field.width * 0.05; // 5% padding from edges
    const availableWidth = sideWidth - (2 * padding);
    const count = teamSlimes.length;

    // Use a different strategy based on number of slimes
    if (count === 1) {
      // Single slime: place in the middle of the side
      const middlePos = sideStart + (sideWidth / 2);
      positionSlime(teamSlimes[0], middlePos, field.height);
    } else {
      // Multiple slimes: space them evenly with some randomization
      const spacing = availableWidth / (count + 1);

      // Calculate positions
      const positions = [];
      for (let i = 1; i <= count; i++) {
        positions.push(sideStart + padding + (spacing * i));
      }

      // Simple shuffle for randomization
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }

      // Position each slime
      teamSlimes.forEach((slime, index) => {
        positionSlime(slime, positions[index], field.height);
      });
    }
  };

  /**
   * Positions a single slime
   * 
   * @param {Object} slime - Slime to position
   * @param {number} xPosition - Horizontal position
   * @param {number} groundPosition - Ground y-coordinate
   */
  const positionSlime = (slime, xPosition, groundPosition) => {
    // Get the DOM element
    const slimeElement = document.querySelector(`[data-slime-id="${slime.slimeId}"]`);
    if (!slimeElement) return;

    // Update the DOM element position
    const slimeWidth = parseInt(slimeElement.style.width);
    const slimeHeight = parseInt(slimeElement.style.height);

    slimeElement.style.left = `${xPosition - slimeWidth / 2}px`;
    slimeElement.style.top = `${groundPosition - slimeHeight}px`;

    // Update the actor position for physics
    if (slime.ao && slime.ao.pos) {
      slime.ao.pos.x = xPosition;
      slime.ao.pos.y = groundPosition;
    }
  };

  /**
   * Calculates ball starting position based on serving team
   * 
   * @param {number} team - Serving team (1 or 2)
   * @returns {Object} Starting position {x, y}
   */
  const getBallStartPosition = (team) => {
    return team === 1
      ? { x: field.width / 4, y: field.height / 3 }
      : { x: (field.width * 3) / 4, y: field.height / 3 };
  };

  /**
   * Resets the ball position for serving
   * 
   * @param {Object} ballEntity - Ball object
   * @param {number} team - Serving team (1 or 2)
   */
  const resetBall = (ballEntity, team) => {
    if (!ballEntity) return;

    // Calculate position based on serving team
    const position = getBallStartPosition(team);

    // Reset ball position in the physics system
    if (ballEntity.ao) {
      ballEntity.ao.pos.x = position.x;
      ballEntity.ao.pos.y = position.y;

      // Reset velocity
      ballEntity.ao._velocity.x = 0;
      ballEntity.ao._velocity.y = 0;
    }

    // Reset position in DOM
    if (ballEntity.element) {
      const ballWidth = parseInt(ballEntity.element.style.width) || 40;
      const ballHeight = parseInt(ballEntity.element.style.height) || 40;

      ballEntity.element.style.left = `${position.x - ballWidth / 2}px`;
      ballEntity.element.style.top = `${position.y - ballHeight / 2}px`;
    }

    // Force a render update
    if (typeof ballEntity.render === 'function') {
      ballEntity.render();
    }
  };

  /**
   * Stops ball physics (for serving)
   * 
   * @param {Object} ballEntity - Ball object
   */
  const stopBall = (ballEntity) => {
    if (!ballEntity || !ballEntity.ao) {
      console.error("Cannot stop ball - ball object is invalid");
      return;
    }

    console.log("Stopping ball physics");
    ballEntity.ao._velocity.x = 0;
    ballEntity.ao._velocity.y = 0;
    ballEntity.ao._downwardAcceleration = 0;
  };

  /**
   * Applies gravity to the ball to start play
   * 
   * @param {Object} ballEntity - Ball object
   */
  const dropBall = (ballEntity) => {
    // Only drop the ball if in right state
    if (gameState.currentState !== GAME_STATES.PLAYING) {
      console.log(`Not dropping ball - currently in ${gameState.currentState} state`);
      return;
    }

    if (!ballEntity || !ballEntity.ao) {
      console.error("Cannot drop ball - ball object is invalid");
      return;
    }

    console.log("Applying gravity to ball:", physics.GRAVITY);
    ballEntity.ao._downwardAcceleration = physics.GRAVITY;
  };

  /**
   * Identifies which team's side the ball is on
   * 
   * @param {number} x - Ball's x position
   * @returns {number} Team number (1 or 2)
   */
  const getTeamHalf = (x) => (x > field.width / 2 ? 2 : 1);

  /**
   * Starts a new round
   * 
   * @param {number} team - Serving team (1 or 2)
   */
  const newRound = (team) => {
    // Only start a new round if not already scoring or in countdown
    if (gameState.currentState === GAME_STATES.SCORING ||
      gameState.currentState === GAME_STATES.COUNTDOWN) {
      console.log(`Not starting new round - currently in ${gameState.currentState} state`);
      return;
    }

    console.log(`Starting new round with team ${team} serving`);

    // Reset game state
    setGameState(GAME_STATES.SETUP);

    // Position all slimes at their starting positions
    positionSlimesForRound();

    // Reset and position the ball
    resetBall(ball, team);
    stopBall(ball);

    // Show countdown and drop ball after countdown
    showCountdown(() => {
      console.log("Dropping ball after countdown");
      dropBall(ball);
    });
  };

  /**
   * Shows countdown before starting the round
   * 
   * @param {Function} callback - Function to call after countdown
   */
  const showCountdown = (callback) => {
    // Only start countdown if one isn't already in progress
    if (gameState.activeCountdown) {
      console.log("Countdown already in progress, not starting another");
      return;
    }

    console.log("Showing countdown...");
    countdownStartEvent.emit();

    // Create or get countdown element
    let countdownElement = document.querySelector('.countdownContainer');
    let countTextElement = document.querySelector('.countdownText');

    if (!countdownElement) {
      // Create countdown container
      countdownElement = document.createElement('div');
      countdownElement.classList.add('countdownContainer');

      // Create text element for count
      countTextElement = document.createElement('div');
      countTextElement.classList.add('countdownText');

      // Add text to container
      countdownElement.appendChild(countTextElement);

      // Add container to game area
      gameContainer.appendChild(countdownElement);

      console.log("Created countdown elements");
    }

    // Ensure the countdown is visible and styled properly
    countdownElement.style.display = 'flex';
    countdownElement.style.position = 'absolute';
    countdownElement.style.top = '50%';
    countdownElement.style.left = '50%';
    countdownElement.style.transform = 'translate(-50%, -50%)';
    countdownElement.style.width = '150px';
    countdownElement.style.height = '150px';
    countdownElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    countdownElement.style.borderRadius = '50%';
    countdownElement.style.display = 'flex';
    countdownElement.style.justifyContent = 'center';
    countdownElement.style.alignItems = 'center';
    countdownElement.style.zIndex = '1000';

    countTextElement.style.fontSize = '80px';
    countTextElement.style.color = 'white';
    countTextElement.style.fontWeight = 'bold';

    // Start count at 3
    let count = rules.COUNTDOWN_DURATION;
    countTextElement.textContent = count;

    // Track this countdown as the active one
    setActiveCountdown(Date.now());
    const currentCountdownId = gameState.activeCountdown;

    // Use a more reliable interval for countdown
    const countdownInterval = setInterval(() => {
      // Check if this countdown is still the active one
      if (gameState.activeCountdown !== currentCountdownId) {
        clearInterval(countdownInterval);
        return;
      }

      count--;

      if (count > 0) {
        countTextElement.textContent = count;
        console.log(`Countdown: ${count}`);
      } else {
        countTextElement.textContent = 'GO!';
        console.log('Countdown: GO!');

        // Hide countdown and start play after a short delay
        setTimeout(() => {
          countdownElement.style.display = 'none';
          console.log("Countdown complete, starting play");

          // Signal that no countdown is active
          setActiveCountdown(null);

          // Emit countdown end event
          countdownEndEvent.emit();

          if (typeof callback === 'function') {
            callback();
          }
        }, 500);

        clearInterval(countdownInterval);
      }
    }, 1000);
  };

  /**
   * Ends a round and updates score
   * 
   * @param {number} team - Team that scored (1 or 2)
   */
  const endRound = (team) => {
    // Only process scoring if in PLAYING or SCORING state
    if (gameState.currentState !== GAME_STATES.PLAYING &&
      gameState.currentState !== GAME_STATES.SCORING) {
      console.log(`Not ending round - currently in ${gameState.currentState} state`);
      return;
    }

    console.log(`Team ${team} scored! Updating score.`);

    // Ensure we're in scoring state
    setGameState(GAME_STATES.SCORING);

    // Update score
    points[team - 1]++;
    updateScoreDisplay();

    // Stop ball physics immediately to prevent further bounces
    stopBall(ball);

    // Check for win
    if (checkForWin()) {
      setGameState(GAME_STATES.GAME_OVER);
      endGame(team);
    } else {
      // Start new round with the losing team serving
      const servingTeam = team === 1 ? 2 : 1;
      console.log(`New round will start with team ${servingTeam} serving after delay`);

      // Add a delay before starting new round to prevent rapid restarts
      setTimeout(() => {
        // Set state back to SETUP before starting new round
        setGameState(GAME_STATES.SETUP);
        newRound(servingTeam);
      }, 2000); // Increased delay for better visibility
    }
  };

  /**
   * Updates the score display
   */
  const updateScoreDisplay = () => {
    console.log(`Updating score display: ${points[0]}-${points[1]}`);

    // Check if score board exists, create if not
    let scoreBoard = document.querySelector('.scoreBoard');
    let team1Score = document.querySelector('.teamOneScore');
    let team2Score = document.querySelector('.teamTwoScore');

    if (!scoreBoard) {
      console.log("Creating scoreboard elements");

      // Create score board
      scoreBoard = document.createElement('div');
      scoreBoard.classList.add('scoreBoard');

      // Style the score board
      scoreBoard.style.position = 'absolute';
      scoreBoard.style.top = '20px';
      scoreBoard.style.left = '50%';
      scoreBoard.style.transform = 'translateX(-50%)';
      scoreBoard.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
      scoreBoard.style.borderRadius = '10px';
      scoreBoard.style.padding = '10px 20px';
      scoreBoard.style.display = 'flex';
      scoreBoard.style.alignItems = 'center';
      scoreBoard.style.justifyContent = 'center';
      scoreBoard.style.zIndex = '100';

      // Create team 1 score element
      team1Score = document.createElement('div');
      team1Score.classList.add('teamScore', 'teamOneScore');
      team1Score.style.color = 'gold';
      team1Score.style.fontSize = '36px';
      team1Score.style.fontWeight = 'bold';
      team1Score.style.margin = '0 10px';

      // Create separator
      const separator = document.createElement('div');
      separator.classList.add('scoreSeparator');
      separator.textContent = '-';
      separator.style.color = '#333';
      separator.style.fontSize = '36px';
      separator.style.fontWeight = 'bold';
      separator.style.margin = '0 10px';

      // Create team 2 score element
      team2Score = document.createElement('div');
      team2Score.classList.add('teamScore', 'teamTwoScore');
      team2Score.style.color = 'crimson';
      team2Score.style.fontSize = '36px';
      team2Score.style.fontWeight = 'bold';
      team2Score.style.margin = '0 10px';

      // Add elements to score board
      scoreBoard.appendChild(team1Score);
      scoreBoard.appendChild(separator);
      scoreBoard.appendChild(team2Score);

      // Add score board to game area
      gameContainer.appendChild(scoreBoard);
    }

    // Update the scores
    team1Score.textContent = points[0];
    team2Score.textContent = points[1];
  };

  /**
   * Checks if a team has won
   * 
   * @returns {boolean} True if a team has reached the winning score
   */
  const checkForWin = () => {
    const winningScore = rules.WINNING_SCORE;
    return points[0] >= winningScore || points[1] >= winningScore;
  };

  /**
   * Ends the game and shows game over screen
   * 
   * @param {number} winningTeam - Team that won (1 or 2)
   */
  const endGame = (winningTeam) => {
    // Show game over screen
    showGameOver(winningTeam);
  };

  /**
   * Shows game over screen
   * 
   * @param {number} winningTeam - Team that won (1 or 2)
   */
  const showGameOver = (winningTeam) => {
    // Create or get game over element
    let gameOverElement = document.querySelector('.gameOverScreen');

    if (!gameOverElement) {
      gameOverElement = document.createElement('div');
      gameOverElement.classList.add('gameOverScreen');

      const gameOverText = document.createElement('div');
      gameOverText.classList.add('gameOverText');

      const playAgainBtn = document.createElement('button');
      playAgainBtn.classList.add('playAgainButton');
      playAgainBtn.textContent = 'PLAY AGAIN';
      playAgainBtn.addEventListener('click', resetGame);

      gameOverElement.appendChild(gameOverText);
      gameOverElement.appendChild(playAgainBtn);
      gameContainer.appendChild(gameOverElement);
    }

    // Update the winning team text
    const gameOverText = gameOverElement.querySelector('.gameOverText');
    gameOverText.textContent = `TEAM ${winningTeam === 1 ? 'GOLD' : 'CRIMSON'} WINS!`;

    gameOverElement.style.display = 'flex';
  };

  /**
   * Resets the game for a new match
   */
  const resetGame = () => {
    // Reset scores
    points = [0, 0];
    updateScoreDisplay();

    // Hide game over screen
    const gameOver = document.querySelector('.gameOverScreen');
    if (gameOver) {
      gameOver.style.display = 'none';
    }

    // Start a new round with random team serving
    const servingTeam = Math.random() < 0.5 ? 1 : 2;
    newRound(servingTeam);
  };

  /**
   * Updates field dimensions when game is resized
   * 
   * @param {FieldDimensions} dimensions - New field dimensions
   */
  const setFieldDimensions = (dimensions) => {
    field = dimensions;

    // Emit size change event for all game objects
    events.get('field_resize')?.emit(dimensions);
  };

  return {
    init,
    newRound,
    endRound,
    getBallStartPosition,
    resetBall,
    stopBall,
    dropBall,
    getTeamHalf,
    positionSlimesForRound,
    endGame,
    resetGame,
    setFieldDimensions
  };
}

/**
 * Creates a game controller for the player setup/waiting screen
 * 
 * @param {number} playerNumber - Player number (1, 2, etc)
 * @param {number} team - Team number (0=unassigned, 1, 2)
 * @param {Object} keys - Player key configuration
 * @param {number} playerIndex - Player index in the global array
 * @returns {Object} Waiting game controller
 */
function WaitingGame(playerNumber, team = 0, keys, playerIndex) {
  // Store reference to the main container
  const mainContainer = document.querySelector('#main');
  const playersArea = document.querySelector('.playersArea') || mainContainer;

  // Create events with player-specific names
  const sizeChangeEvent = Event(`sizeChange_player${playerIndex}`);
  const gameStartEvent = Event(`game_start_player${playerIndex}`);
  const gameEndEvent = Event(`game_end_player${playerIndex}`);
  const roundStartEvent = Event(`round_start_player${playerIndex}`);
  const roundEndEvent = Event(`round_end_player${playerIndex}`);

  // Create the waiting screen UI
  const { screen, teamSwitchEvent } = createWaitingScreen(
    playerNumber,
    team,
    keys,
    playerIndex
  );

  // Add to players area
  playersArea.appendChild(screen);

  // Get dimensions based on main container
  const rect = mainContainer.getBoundingClientRect();

  /**
   * Creates waiting screen UI
   * 
   * @param {number} num - Player number
   * @param {number} teamId - Team ID
   * @param {Object} keyConfig - Key configuration
   * @param {number} index - Player index
   * @returns {Object} Screen element and team switch event
   */
  function createWaitingScreen(num, teamId, keyConfig, index) {
    // Implementation would go here, similar to the waitingScreen function
    // This is a placeholder to show the concept
    const screenElement = document.createElement('div');
    screenElement.classList.add('playerSetupScreen');
    screenElement.textContent = `Player ${num} setup`;

    const switchEvent = Event(`team_switch_player${index}`);

    return { screen: screenElement, teamSwitchEvent: switchEvent };
  }

  // Return the game controller with its events and dimensions
  return {
    go: mainContainer, // Use main as the container for slimes
    screen,
    gameStart: gameStartEvent,
    gameEnd: gameEndEvent,
    roundStart: roundStartEvent,
    roundEnd: roundEndEvent,
    sizeChange: sizeChangeEvent,
    ground: rect.height - 50,
    leftBoundary: 0,
    rightBoundary: rect.width,
    teamSwitchEvent,
    playerIndex
  };
}

export { Game, WaitingGame };
