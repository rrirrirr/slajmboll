import { Event, events } from './events.js'
import { waitingScreen } from './graphics.js'
const gameAdd = Event('game added')
let main = document.querySelector('#main')

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
    team === 1
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

function WaitingGame(num, team = 1, keys) {
  const _team = team
  const sizeChange = Event('sizeChange')
  const go = document.querySelector(`.playerPreview:nth-of-type(${num})`)
  const { screen, teamSwitchEvent } = waitingScreen(num, team, keys)
  go.appendChild(screen)
  let rect = go.getBoundingClientRect()
  gameAdd.emit()

  const onTeamChange = (team) => {
    _team = team
  }

  const onSizeChange = () => {
    const newRect = go.getBoundingClientRect()
    if (
      rect.bottom !== newRect.bottom ||
      rect.left !== newRect.left ||
      rect.top !== newRect.top ||
      rect.right !== newRect.right
    ) {
      rect = newRect
      sizeChange.emit({
        ground: rect.bottom,
        leftBoundry: rect.left - main.getBoundingClientRect().x,
        rightBoundry: rect.left - main.getBoundingClientRect().x + rect.width,
      })
    }
  }

  window.onresize = onSizeChange
  events.get('game added').subscribe(onSizeChange)

  return {
    go,
    gameStart: Event('waiting'),
    gameEnd: Event('waiting'),
    roundStart: Event('waiting'),
    roundEnd: Event('waiting'),
    sizeChange,
    ground: rect.bottom,
    leftBoundry: rect.left - main.getBoundingClientRect().x,
    rightBoundry: rect.left - main.getBoundingClientRect().x + rect.width,
    teamSwitchEvent
  }
}

export { Game, WaitingGame }
