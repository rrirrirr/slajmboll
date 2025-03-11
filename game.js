import { Event, events } from './events.js';
import { waitingScreen } from './graphics.js'
import { GRAVITY } from './constants.js';
import {
  GAME_STATE,
  currentGameState,
  setGameState,
  roundStartEvent,
  roundEndEvent,
  countdownStartEvent,
  countdownEndEvent,
  activeCountdown,
  setActiveCountdown
} from './gameStateManager.js';

// Create a global event for game additions
const gameAddEvent = Event('game added')

function Game() {
  let players = []
  let slimes = []
  let ball = null
  let points = [0, 0]
  let scores = document.querySelectorAll('.score')
  let go = document.querySelector('#main')
  let field = { width: 0, height: 0 }

  // Initialize the game with players
  const init = (playerData, fieldDimensions, gameSlimes, gameBall) => {
    // Store references to game elements
    players = playerData;
    slimes = gameSlimes;
    ball = gameBall;
    field = fieldDimensions;

    // Get scores from DOM if they exist
    scores = document.querySelectorAll('.score');

    console.log("Game initialized with ball:", ball);
  };

  // Position slimes at evenly spaced intervals on their respective sides
  const positionSlimesForRound = () => {
    // Group slimes by team
    const team1Slimes = slimes.filter(slime => {
      const playerData = players.find(p => p.playerIndex === slime.teamNumber)
      return playerData && playerData.team === 1
    })

    const team2Slimes = slimes.filter(slime => {
      const playerData = players.find(p => p.playerIndex === slime.teamNumber)
      return playerData && playerData.team === 2
    })

    // Position each team's slimes
    positionTeamSlimes(team1Slimes, 1)
    positionTeamSlimes(team2Slimes, 2)
  }

  // Position slimes for a specific team
  const positionTeamSlimes = (teamSlimes, teamNumber) => {
    if (!teamSlimes.length) return

    // Determine side boundaries based on team
    const isTeam1 = teamNumber === 1
    const sideStart = isTeam1 ? 0 : field.width / 2
    const sideEnd = isTeam1 ? field.width / 2 : field.width
    const sideWidth = sideEnd - sideStart

    // Calculate spacing between slimes
    const padding = field.width * 0.05 // 5% padding from edges
    const availableWidth = sideWidth - (2 * padding)
    const count = teamSlimes.length

    // Use a different strategy based on number of slimes
    if (count === 1) {
      // Single slime: place in the middle of the side
      const middlePos = sideStart + (sideWidth / 2)
      positionSlime(teamSlimes[0], middlePos, field.height)
    } else {
      // Multiple slimes: space them evenly with some randomization
      const spacing = availableWidth / (count + 1)

      // Calculate positions
      const positions = []
      for (let i = 1; i <= count; i++) {
        positions.push(sideStart + padding + (spacing * i))
      }

      // Simple shuffle for randomization
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
          ;[positions[i], positions[j]] = [positions[j], positions[i]]
      }

      // Position each slime
      teamSlimes.forEach((slime, index) => {
        positionSlime(slime, positions[index], field.height)
      })
    }
  }

  // Position a single slime
  const positionSlime = (slime, xPosition, groundPosition) => {
    // Get the DOM element
    const slimeElement = document.querySelector(`[data-slime-id="${slime.slimeId}"]`)
    if (!slimeElement) return

    // Update the DOM element position
    const slimeWidth = parseInt(slimeElement.style.width)
    const slimeHeight = parseInt(slimeElement.style.height)

    slimeElement.style.left = `${xPosition - slimeWidth / 2}px`
    slimeElement.style.top = `${groundPosition - slimeHeight}px`

    // Update the actor position for physics
    if (slime.ao && slime.ao.pos) {
      slime.ao.pos.x = xPosition
      slime.ao.pos.y = groundPosition
    }
  }

  // Calculate ball starting position based on serving team
  const ballPosition = (team) => {
    return team === 1
      ? { x: field.width / 4, y: field.height / 3 }
      : { x: (field.width * 3) / 4, y: field.height / 3 }
  }

  // Reset the ball position for serving
  const resetBall = (ball, team) => {
    if (!ball) return;

    // Calculate position based on serving team
    const position = team === 1
      ? { x: field.width / 4, y: field.height / 3 }
      : { x: (field.width * 3) / 4, y: field.height / 3 };

    // Reset ball position in the physics system
    if (ball.ao) {
      ball.ao.pos.x = position.x;
      ball.ao.pos.y = position.y;

      // Reset velocity
      ball.ao._velocity.x = 0;
      ball.ao._velocity.y = 0;
    }

    // Reset position in DOM
    if (ball.element) {
      const ballWidth = parseInt(ball.element.style.width) || 40;
      const ballHeight = parseInt(ball.element.style.height) || 40;

      ball.element.style.left = `${position.x - ballWidth / 2}px`;
      ball.element.style.top = `${position.y - ballHeight / 2}px`;
    }

    // Force a render update
    if (typeof ball.render === 'function') {
      ball.render();
    }
  };


  // Stop ball physics (for serving)
  const stopBall = (ball) => {
    if (!ball || !ball.ao) {
      console.error("Cannot stop ball - ball object is invalid");
      return;
    }

    console.log("Stopping ball physics");
    ball.ao._velocity.x = 0;
    ball.ao._velocity.y = 0;
    ball.ao._downwardAcceleration = 0;
  };

  // Apply gravity to the ball to start play
  const dropBall = (ball) => {
    // Only drop the ball if in right state
    if (currentGameState !== GAME_STATE.PLAYING) {
      console.log(`Not dropping ball - currently in ${currentGameState} state`);
      return;
    }

    if (!ball || !ball.ao) {
      console.error("Cannot drop ball - ball object is invalid");
      return;
    }

    console.log("Applying gravity to ball:", GRAVITY);
    ball.ao._downwardAcceleration = GRAVITY;
  };

  // Identify which team's side the ball is on
  const whichTeamHalf = (x) => (x > field.width / 2 ? 2 : 1)

  // Start a new round
  const newRound = (team) => {
    // Only start a new round if not already scoring or in countdown
    if (currentGameState === GAME_STATE.SCORING || currentGameState === GAME_STATE.COUNTDOWN) {
      console.log(`Not starting new round - currently in ${currentGameState} state`);
      return;
    }

    console.log(`Starting new round with team ${team} serving`);

    // Reset game state
    setGameState(GAME_STATE.SETUP);

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

  // Show countdown before starting the round
  const showCountdown = (callback) => {
    // Only start countdown if one isn't already in progress
    if (activeCountdown) {
      console.log("Countdown already in progress, not starting another");
      return;
    }

    console.log("Showing countdown...");
    countdownStartEvent.emit();

    // Create or get countdown element
    let countdown = document.querySelector('.countdownContainer');
    let countText = document.querySelector('.countdownText');

    if (!countdown) {
      // Create countdown container
      countdown = document.createElement('div');
      countdown.classList.add('countdownContainer');

      // Create text element for count
      countText = document.createElement('div');
      countText.classList.add('countdownText');

      // Add text to container
      countdown.appendChild(countText);

      // Add container to game area
      go.appendChild(countdown);

      console.log("Created countdown elements");
    }

    // Ensure the countdown is visible and styled properly
    countdown.style.display = 'flex';
    countdown.style.position = 'absolute';
    countdown.style.top = '50%';
    countdown.style.left = '50%';
    countdown.style.transform = 'translate(-50%, -50%)';
    countdown.style.width = '150px';
    countdown.style.height = '150px';
    countdown.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    countdown.style.borderRadius = '50%';
    countdown.style.display = 'flex';
    countdown.style.justifyContent = 'center';
    countdown.style.alignItems = 'center';
    countdown.style.zIndex = '1000';

    countText.style.fontSize = '80px';
    countText.style.color = 'white';
    countText.style.fontWeight = 'bold';

    // Start count at 3
    let count = 3;
    countText.textContent = count;

    // Track this countdown as the active one
    setActiveCountdown(Date.now())
    const thisCountdown = activeCountdown;

    // Use a more reliable interval for countdown
    const countdownInterval = setInterval(() => {
      // Check if this countdown is still the active one
      if (activeCountdown !== thisCountdown) {
        clearInterval(countdownInterval);
        return;
      }

      count--;

      if (count > 0) {
        countText.textContent = count;
        console.log(`Countdown: ${count}`);
      } else {
        countText.textContent = 'GO!';
        console.log('Countdown: GO!');

        // Hide countdown and start play after a short delay
        setTimeout(() => {
          countdown.style.display = 'none';
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

  // End a round and update score
  const endRound = (team) => {
    // Only process scoring if in PLAYING or SCORING state
    if (currentGameState !== GAME_STATE.PLAYING && currentGameState !== GAME_STATE.SCORING) {
      console.log(`Not ending round - currently in ${currentGameState} state`);
      return;
    }

    console.log(`Team ${team} scored! Updating score.`);

    // Ensure we're in scoring state
    setGameState(GAME_STATE.SCORING);

    // Update score
    points[team - 1]++;
    updateScoreDisplay();

    // Stop ball physics immediately to prevent further bounces
    stopBall(ball);

    // Check for win
    if (checkForWin()) {
      setGameState(GAME_STATE.GAME_OVER);
      endGame(team);
    } else {
      // Start new round with the losing team serving
      const servingTeam = team === 1 ? 2 : 1;
      console.log(`New round will start with team ${servingTeam} serving after delay`);

      // Add a delay before starting new round to prevent rapid restarts
      setTimeout(() => {
        // Set state back to SETUP before starting new round
        setGameState(GAME_STATE.SETUP);
        newRound(servingTeam);
      }, 2000); // Increased delay for better visibility
    }
  };

  // Update score display
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
      go.appendChild(scoreBoard);
    }

    // Update the scores
    team1Score.textContent = points[0];
    team2Score.textContent = points[1];
  };

  // Check if a team has won
  const checkForWin = () => {
    const winningScore = 5 // Can be adjusted
    return points[0] >= winningScore || points[1] >= winningScore
  }

  // End the game
  const endGame = (winningTeam) => {
    // Show game over screen
    showGameOver(winningTeam)
  }

  // Show game over screen
  const showGameOver = (winningTeam) => {
    // Create or get game over element
    let gameOver = document.querySelector('.gameOverScreen')

    if (!gameOver) {
      gameOver = document.createElement('div')
      gameOver.classList.add('gameOverScreen')

      const gameOverText = document.createElement('div')
      gameOverText.classList.add('gameOverText')

      const playAgainBtn = document.createElement('button')
      playAgainBtn.classList.add('playAgainButton')
      playAgainBtn.textContent = 'PLAY AGAIN'
      playAgainBtn.addEventListener('click', resetGame)

      gameOver.appendChild(gameOverText)
      gameOver.appendChild(playAgainBtn)
      go.appendChild(gameOver)
    }

    // Update the winning team text
    const gameOverText = gameOver.querySelector('.gameOverText')
    gameOverText.textContent = `TEAM ${winningTeam === 1 ? 'GOLD' : 'CRIMSON'} WINS!`

    gameOver.style.display = 'flex'
  }

  // Reset the game
  const resetGame = () => {
    // Reset scores
    points = [0, 0]
    updateScoreDisplay()

    // Hide game over screen
    const gameOver = document.querySelector('.gameOverScreen')
    if (gameOver) {
      gameOver.style.display = 'none'
    }

    // Start a new round with random team serving
    const servingTeam = Math.random() < 0.5 ? 1 : 2
    newRound(servingTeam)
  }

  return {
    init,
    newRound,
    endRound,
    ballPosition,
    resetBall,
    stopBall,
    dropBall,
    whichTeamHalf,
    positionSlimesForRound,
    endGame,
    resetGame
  }
}

function WaitingGame(num, team = 0, keys, playerIndex) {
  // Store reference to the main container
  const main = document.querySelector('#main');
  const playersArea = document.querySelector('.playersArea') || main;

  // Create events with player-specific names
  const sizeChangeEvent = Event(`sizeChange_player${playerIndex}`);
  const gameStartEvent = Event(`game_start_player${playerIndex}`);
  const gameEndEvent = Event(`game_end_player${playerIndex}`);
  const roundStartEvent = Event(`round_start_player${playerIndex}`);
  const roundEndEvent = Event(`round_end_player${playerIndex}`);

  // Create the waiting screen UI
  const { screen, teamSwitchEvent } = waitingScreen(num, team, keys, playerIndex);

  // Add to players area
  playersArea.appendChild(screen);

  // Get dimensions based on main container
  const rect = main.getBoundingClientRect();

  // Return the game controller with its events and dimensions
  return {
    go: main, // Use main as the container for slimes
    screen,
    gameStart: gameStartEvent,
    gameEnd: gameEndEvent,
    roundStart: roundStartEvent,
    roundEnd: roundEndEvent,
    sizeChange: sizeChangeEvent,
    ground: rect.height - 50,
    leftBoundry: 0,
    rightBoundry: rect.width,
    teamSwitchEvent,
    playerIndex
  };
}

export { Game, WaitingGame }
