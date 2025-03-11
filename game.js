import { Event } from './events.js'
import { waitingScreen } from './graphics.js'
import { GRAVITY } from './constants.js';

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
    players = playerData
    slimes = gameSlimes
    ball = gameBall
    field = fieldDimensions

    // Get scores from DOM if they exist
    scores = document.querySelectorAll('.score')

    // Setup initial positions
    positionSlimesForRound()
  }

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
    const newPos = ballPosition(team)

    // Update DOM position
    if (ball && ball.element) {
      const ballWidth = parseInt(ball.element.style.width) || 40
      const ballHeight = parseInt(ball.element.style.height) || 40

      ball.element.style.left = `${newPos.x - ballWidth / 2}px`
      ball.element.style.top = `${newPos.y - ballHeight / 2}px`
    }

    // Update physics position
    if (ball && ball.ao && ball.ao.pos) {
      ball.ao.pos.x = newPos.x
      ball.ao.pos.y = newPos.y
    }
  }

  // Stop ball physics (for serving)
  const stopBall = (ball) => {
    if (ball && ball.ao) {
      ball.ao._velocity.x = 0
      ball.ao._velocity.y = 0
      ball.ao._downwardAcceleration = 0
    }
  }

  // Apply gravity to the ball to start play
  const dropBall = (ball) => {
    if (ball && ball.ao) {
      ball.ao._downwardAcceleration = GRAVITY
    }
  }

  // Identify which team's side the ball is on
  const whichTeamHalf = (x) => (x > field.width / 2 ? 2 : 1)

  // Start a new round
  const newRound = (team) => {
    // Position all slimes at their starting positions
    positionSlimesForRound()

    // Reset and position the ball
    resetBall(ball, team)
    stopBall(ball)

    // Show countdown
    showCountdown(() => {
      // After countdown, start play
      dropBall(ball)
    })
  }

  // Show countdown before starting the round
  const showCountdown = (callback) => {
    // Create or get countdown element
    let countdown = document.querySelector('.countdownContainer')
    let countText = document.querySelector('.countdownText')

    if (!countdown) {
      countdown = document.createElement('div')
      countdown.classList.add('countdownContainer')

      countText = document.createElement('div')
      countText.classList.add('countdownText')

      countdown.appendChild(countText)
      go.appendChild(countdown)
    }

    countdown.style.display = 'flex'

    // Set up the countdown
    let count = 3
    countText.textContent = count

    const countInterval = setInterval(() => {
      count--
      if (count > 0) {
        countText.textContent = count
      } else {
        countText.textContent = 'GO!'

        // Hide countdown and start play
        setTimeout(() => {
          countdown.style.display = 'none'
          if (typeof callback === 'function') {
            callback()
          }
        }, 500)

        clearInterval(countInterval)
      }
    }, 1000)
  }

  // End a round and update score
  const endRound = (team) => {
    // Update score
    points[team - 1]++
    updateScoreDisplay()

    // Check for win
    if (checkForWin()) {
      endGame(team)
    } else {
      // Start new round with the losing team serving
      const servingTeam = team === 1 ? 2 : 1
      setTimeout(() => newRound(servingTeam), 1000)
    }
  }

  // Update score display
  const updateScoreDisplay = () => {
    // If we have score elements, update them
    if (scores && scores.length >= 2) {
      scores[0].textContent = points[0]
      scores[1].textContent = points[1]
    }
  }

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
    ground: rect.height - 50, // Set ground level relative to container height
    leftBoundry: 0,
    rightBoundry: rect.width,
    teamSwitchEvent,
    playerIndex // Include player index for identification
  };
}

export { Game, WaitingGame }
