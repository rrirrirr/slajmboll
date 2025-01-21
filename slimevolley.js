// Remake of slime volleyball https://oneslime.net
import { Slime } from './slime.js'
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
const removePlayerBox = () => { }

const initStartScreen = () => {
  document.addEventListener('keydown', addPlayerListen)
  startEventListeners()
  initKeys()

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
        waitingGame,
        player.keys
      )
    })
  }

}

function gameLoop() {
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

  slimes.forEach((slime) => slime.render())

  window.requestAnimationFrame(gameLoop)
}

initStartScreen()
window.requestAnimationFrame(gameLoop)
