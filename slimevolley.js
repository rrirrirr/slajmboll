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
import { createAddPlayerButton, createTeamHeaders } from './graphics.js'

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
  delayedActions.push(action)
}
delayedActionsEvent.subscribe(onDelayedActions)

const onAnimationAdd = (animation) => {
  animations.push(animation)
}
animationEvent.subscribe(onAnimationAdd)

const players = []
let playersArea = null

const startEventListeners = () => {
  document.addEventListener('keyup', handleKeyUp)
  document.addEventListener('keydown', handleKeyDown)
}

const addPlayerListen = ({ code }) => {
  if (code === 'KeyB') {
    addPlayer()
  }
}

const addPlayer = () => {
  const playerIndex = players.length

  // Get the next available player keys
  const playerKeySet = playerKeys[playerIndex] || playerKeys[0] // Fallback to first key set if we run out

  // Setup player keys and event handlers
  const keyHandlers = setupKeys(playerKeySet)

  // Create player object
  players.push({
    team: 0, // Start with no team selected
    keys: keyHandlers,
    appearance: { color: '#888888' }, // Default color until team is selected
    dimensions: { radius: 1 },
  })

  // Create the waiting game container
  const waitingGame = WaitingGame(
    players.length,
    0, // No team initially
    playerKeySet
  )

  // Define the constraints for the slime
  const constraints = {
    rightBoundry: waitingGame.rightBoundry,
    leftBoundry: waitingGame.leftBoundry,
    ground: waitingGame.ground,
  }

  // Create the slime instance
  slimes.push(
    Slime(
      0, // No team initially
      players.length,
      {
        x: (waitingGame.rightBoundry - waitingGame.leftBoundry) / 2,
        y: waitingGame.ground - 50,
      },
      players[playerIndex].appearance,
      players[playerIndex].dimensions,
      constraints,
      waitingGame,
      keyHandlers
    )
  )

  // Subscribe to team switch event to update player team
  waitingGame.teamSwitchEvent.subscribe((team) => {
    players[playerIndex].team = team

    // Update appearance based on team selection
    if (team === 1) {
      players[playerIndex].appearance.color = 'gold'
    } else if (team === 2) {
      players[playerIndex].appearance.color = 'crimson'
    }
  })
}

const initStartScreen = () => {
  document.addEventListener('keydown', addPlayerListen)
  startEventListeners()
  initKeys()

  // Clear the main area
  while (area.firstChild) {
    area.removeChild(area.firstChild)
  }

  // Add team headers
  const teamHeaders = createTeamHeaders()
  area.appendChild(teamHeaders)

  // Create players area
  playersArea = document.createElement('div')
  playersArea.classList.add('playersArea')
  area.appendChild(playersArea)

  // Add "Add Player" button
  const addPlayerBtn = createAddPlayerButton(addPlayer)
  area.appendChild(addPlayerBtn)

  // Add the first player
  if (players.length === 0) {
    addPlayer()
  }
}

function gameLoop() {
  // Process delayed actions
  delayedActions = delayedActions.filter((action) => {
    action.delay--
    if (action.delay === 0) {
      action.execute()
    }
    return action.delay > 0
  })

  // Process animations
  animations = animations.filter((animation) => {
    animation.next()
    return !animation.ended()
  })

  // Update slimes
  slimes.forEach((slime) => slime.update())

  // Render slimes
  slimes.forEach((slime) => slime.render())

  // Continue game loop
  window.requestAnimationFrame(gameLoop)
}

// Initialize the start screen
initStartScreen()

// Start the game loop
window.requestAnimationFrame(gameLoop)
