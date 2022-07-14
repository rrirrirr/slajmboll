// Remake of slime volleyball https://oneslime.net
import { Slime } from './slime.js'
// import { createBall, updateBallPhysics } from './ball.js'
// import * as com from './commands.js'
// import { toggleHidden, countDown } from './menu.js'
// import { createActor } from './actor.js'
// import { createWall, createSolid } from './solid.js'
import { GRAVITY } from './constants.js'
import {
  playerKeys,
  handleKeyDown,
  handleKeyUp,
  initKeys,
  setupKeys,
} from './keys.js'
import { Game, WaitingGame } from './game.js'
import { Event, events } from './events.js'

// const menu = document.querySelector('#menu')
// const keyChange = document.querySelector('.key-change')
// const scoreBoard = document.querySelector('#score-board')
// const scores = document.querySelectorAll("#score-board>li");
// const scores = document.querySelectorAll(
//   '#score-board>.score1,.noScore,.score2'
// )
// const fieldElement = document.querySelector('#field')
// const countdownModal = document.querySelector('#countdown')
// const winscreenModal = document.querySelector('#win-screen')
// const keyPromptModal = document.querySelector('#key-prompt')
// const winText = document.querySelector('#win-text')
// const countText = document.querySelector('#countdown-text')
// const startButton = document.querySelector('#start-button')

const area = document.querySelector('#main')
let delayedActions = []
let animations = []
const delayedActionsEvent = Event('delayed actions')
const animationEvent = Event('animations')

const field = { width: 0, height: 0 }
const units = []
let slimes = []
const balls = []
const walls = []

//action {delay: ..., action:....}
const onDelayedActions = (action) => {
  console.log('added delayed action')
  delayedActions.push(action)
}
delayedActionsEvent.subscribe(onDelayedActions)
const onAnimationAdd = (animation) => {
  console.log('adding anim')
  animations.push(animation)
}
animationEvent.subscribe(onAnimationAdd)

// let players = 1
const players = []

const startEventListeners = () => {
  document.addEventListener('keyup', handleKeyUp)
  document.addEventListener('keydown', handleKeyDown)
}

const removeEventListener = (k) => {
  k.forEach.map((e) => e)
}
const addPlayerListen = ({ code }) => {
  if (code === 'KeyB') {
    addPlayer()
  }
}

const addPlayer = () => {
  players.push({
    team: 1,
    keys: setupKeys(playerKeys[players.length]),
    appearance: { color: 'gold' },
    dimensions: { radius: 1 },
    // constraints,
  })
  const player = players[players.length - 1]
  addPlayerBox()
  const waitingGame = WaitingGame(
    players.length,
    1,
    playerKeys[players.length - 1]
  )
  const constraints = {
    rightBoundry: waitingGame.rightBoundry,
    leftBoundry: waitingGame.leftBoundry,
    ground: waitingGame.ground,
  }
  slimes.push(
    Slime(
      1,
      players.length,
      {
        x: (waitingGame.rightBoundry - waitingGame.leftBoundry) / 2,
        y: waitingGame.ground - 50,
      },
      player.appearance,
      player.dimensions,
      constraints,
      // WaitingGame(index + 1),
      waitingGame,
      player.keys
    )
  )
}

const removePlayer = (index) => {
  // players.push(Slime())
}

const addPlayerBox = () => {
  const box = document.createElement('div')
  box.classList.add('playerPreview')
  area.appendChild(box)
}
const removePlayerBox = () => {}

const initStartScreen = () => {
  document.addEventListener('keydown', addPlayerListen)

  // field.width = fieldd.offsetWidth
  // field.height = fieldd.offsetHeight

  // let slimeBaller1 = createSlime({
  //   ao: createActor({
  //     pos: { x: field.width / 4, y: field.height },
  //     velocity: { x: 0, y: 0 },
  //     radius: field.width * 0.04,
  //     rightBoundry: field.width / 2 - field.width * 0.05,
  //     leftBoundry: field.width * 0.04,
  //     ground: field.height,
  //     maxVelocity: 8.5,
  //     updateMovements: updateSlimeMovements, //change this
  //   }),
  //   go: document.querySelector('#slime1'),
  //   team: 1,
  // })
  // slimeBaller1.go.style.width = `${slimeBaller1.ao.radius * 2}px`
  // slimeBaller1.go.style.height = `${slimeBaller1.ao.radius}px`

  // let slimeBaller2 = createSlime({
  //   ao: createActor({
  //     pos: { x: 500, y: field.height },
  //     velocity: { x: 0, y: 0 },
  //     radius: field.width * 0.04,
  //     rightBoundry: field.width - field.width * 0.04,
  //     leftBoundry: field.width / 2 + field.width * 0.05,
  //     ground: field.height,
  //     maxVelocity: 8.5,
  //     updateMovements: updateSlimeMovements,
  //   }),
  //   go: document.querySelector('#slime2'),
  //   team: 2,
  // })

  // slimeBaller2.go.style.width = `${slimeBaller2.ao.radius * 2}px`
  // slimeBaller2.go.style.height = `${slimeBaller2.ao.radius}px`

  // let ball = createBall({
  //   ao: createActor({
  //     pos: { x: 200, y: 100 },
  //     velocity: { x: 0, y: 0 },
  //     radius: field.width * 0.02,
  //     rightBoundry: field.width - field.width * 0.02,
  //     leftBoundry: field.width * 0.02,
  //     ground: field.height - field.width * 0.01, // give the players some leniency. Ball can be a couple of units underground
  //     maxVelocity: 10.5,
  //     updateMovements: updateBallPhysics,
  //   }),
  //   go: document.querySelector('.ball'),
  // })
  // ball.go.style.width = `${ball.ao.radius * 2}px`
  // ball.go.style.height = `${ball.ao.radius * 2}px`

  // let wall = createWall({
  //   so: createSolid({
  //     pos: { x: field.width / 2, y: field.height - field.height * 0.075 },
  //     dim: { w: field.width * 0.015, h: field.height * 0.15 },
  //   }),
  //   go: document.querySelector('#wall'),
  //   top: {
  //     pos: { x: field.width / 2, y: field.height - field.height * 0.15 },
  //     radius: field.width * 0.015,
  //     go: document.querySelector('#wall-top'),
  //   },
  // })
  // wall.go.style.left = `${wall.so.pos.x - wall.so.dim.w / 2}px`
  // wall.go.style.top = `${wall.so.pos.y - wall.so.dim.h / 2}px`
  // wall.go.style.width = `${wall.so.dim.w}px`
  // wall.go.style.height = `${wall.so.dim.h}px`
  // // let wt = document.querySelector("#wall-top");
  // wall.top.go.style.left = `${wall.top.pos.x - wall.so.dim.w / 2}px`
  // wall.top.go.style.top = `${wall.top.pos.y - wall.top.radius / 2}px`
  // wall.top.go.style.width = `${wall.so.dim.w}px`
  // wall.top.go.style.height = `${wall.so.dim.h * 0.05}px`

  // slimes.push(slimeBaller1)
  // slimes.push(slimeBaller2)
  // balls.push(ball)
  // walls.push(wall)

  startEventListeners()
  initKeys()

  // game.gameStart.subscribe(_onGameStart),
  // game.gameEnd.subscribe(_onGameEnd),
  // game.roundStart.subscribe(_onRoundStart),
  // game.roundEnd.subscribe(_onRoundEnd),

  // console.log(events)
  if (!players.length) {
    addPlayer()
  } else {
    slimes = players.map((player, index) => {
      addPlayerBox()
      const waitingGame = WaitingGame(index + 1, 1, playerKeys[index])
      const constraints = {
        rightBoundry: waitingGame.rightBoundry,
        leftBoundry: waitingGame.leftBoundry,
        ground: waitingGame.ground,
      }
      return Slime(
        player.team,
        index,
        {
          x: (waitingGame.rightBoundry - waitingGame.leftBoundry) / 2,
          y: waitingGame.ground - 50,
        },
        player.appearance,
        player.dimensions,
        constraints,
        // WaitingGame(index + 1),
        waitingGame,
        player.keys
      )
    })
  }

  // team,
  // teamNumber,
  // pos,
  // appearance,
  // dimensions,
  // constraints,
  // game,
  // keys

  // playerKeys.forEach((playerKeys) => {
  //   slimes.push(
  //     Slime(
  //       1,
  //       1,
  //       { x: 0, y: 0 },
  //       0,
  //       { radius: 1 },
  //       { rightBoundry: 0, leftBoundry: 0, ground: 0, maxVelocity: 0 },
  //       0,
  // 		setupKeys(playerKeys)
  //     )
  //   )
  // })

  // startButton.addEventListener('click', () => toggleHidden(menu))
  // startButton.addEventListener('click', () => newGame())
  // winscreenModal.addEventListener('click', () => toggleHidden(winscreenModal))

  // toggleHidden(winscreenModal, 'block')
  // toggleHidden(keyPromptModal, 'block')
  // toggleHidden(countdownModal, 'block')
}

function gameLoop() {
  // commands.forEach((e) => e())
  // commands = [] // commands might be dropped before being executed?
  delayedActions = delayedActions.filter((action) => {
    action.delay--
    if (action.delay === 0) {
      action.execute()
    }
    return action.delay > 0
  })

  animations = animations.filter((animation) => {
		animation.next()
		return !animation.ended()
  })

  slimes.forEach((slime) => slime.update())
  // balls.forEach((ball) => ball.update())

  // slimes.forEach((e) => Object.assign(e.ao, e.updatePosition(e.ao)))
  // balls.forEach((e) => {
  //   let result = e.updatePosition(e.ao, walls, slimes)
  //   Object.assign(e.ao, result.nextPos)
  //   if (result.groundHit) endRound(whichTeamHalf(result.nextPos.pos.x))
  // })

  slimes.forEach((slime) => slime.render())
  // balls.forEach((ball) => ball.render())

  // sleep
  window.requestAnimationFrame(gameLoop)
}

initStartScreen()
window.requestAnimationFrame(gameLoop)
