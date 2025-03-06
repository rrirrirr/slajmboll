import { Event } from './events.js'
import { waitingScreen } from './graphics.js'

// Create a global event for game additions
const gameAddEvent = Event('game added')

function Game() {
  let players = []
  let go = document.querySelector('#main')

  const init = (players) => {
    const dimensions = { radius: 1 }
    const constraints = { rightBoundry: 100, leftBoundry: 0, ground: 100 }
    players = players.map((player) => {
      return Slime(
        player.team,
        player.keys,
        player.appearance,
        dimensions,
        constraints
      )
    })
  }

  const ballPosition = (team) => {
    return team === 1
      ? { x: field.width / 4, y: field.height / 2 }
      : { x: (field.width * 3) / 4, y: field.height / 2 }
  }

  const resetBall = (ball, team) => {
    ball.ao.pos = ballPosition(team)
  }

  const dropBall = (b) => {
    b.downwardAcceleration = GRAVITY
  }

  const stopBall = (b) => {
    b.downwardAcceleration = 0
  }

  const whichTeamHalf = (x) => (x > field.width / 2 ? 1 : 2)

  const startPosition = (team) => {
    return team === 1
      ? { x: field.width / 4, y: field.height }
      : { x: (field.width * 3) / 4, y: field.height }
  }

  const resetPlayers = () => {
    slimes.forEach((slime) => {
      slime.ao = startPosition(slime.team)
      slime.ao.pos = startPosition(slime.team)
      slime.ao.velocity = { x: 0, y: 0 }
      slime.isRunning = false
    })
  }

  const addGraphic = (graphic) => {
    go.appendChild(graphic)
  }

  const setPoint = (team) => {
    points[team - 1] += 1
  }

  const printPoint = () => {
    if (points[0] > 0) scores[points[0] - 1].className = 'score1'
    if (points[1] > 0) scores.item(10 - points[1]).className = 'score2'
  }

  const clearPoints = () => {
    points = [0, 0]
    scores.forEach((e) => (e.className = 'noScore'))
  }

  const checkForWin = () => points.filter((e) => e === 5).length > 0

  const endGame = (team) => {
    winText.innerHTML = `Player ${team} wins`
    resetBall(balls[0], 1) // fix this [0]
    stopBall(balls[0])
    toggleHidden(winscreenModal, 'block')
    toggleHidden(menu, 'grid')
  }

  const newGame = (players) => {
    clearPoints()
    init(players)
  }

  const newRound = (team) => {
    clearKeys()
    resetPlayers()
    resetBall(balls[0], team) // fix this [0]
    stopBall(balls[0])
    toggleHidden(countdownModal, 'block')

    countDown(3, countText, () => toggleHidden(countdownModal))
    setTimeout(() => setupKeys(slimes[0], slimes[1]), 2600) //fix this slimes[]
    setTimeout(() => dropBall(balls[0]), 3000)
  }

  const endRound = (team) => {
    setPoint(team)
    printPoint()
    if (checkForWin()) {
      endGame(team)
    } else {
      newRound(team)
    }
  }

  return { init, newRound, endRound, addGraphic }
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
