import { Event } from './events.js'
const keyActions = new Map() //key(board) action holder
const keyHolder = new Map() //r
const playerKeys = []
const keyButtons = new Map() //r

const handleKeyDown = ({ code }) => {
  if (keyActions.has(code)) keyActions.get(code).press()
}

const handleKeyUp = ({ code }) => {
  if (keyActions.has(code)) keyActions.get(code).release()
}

const setupKeys = ({ up, right, down, left, jump }) => {
  const movementPress = Event('movement press')
  const movementRelease = Event('movement release')
  const jumpPress = Event('jump press')
  const jumpRelease = Event('jump release')
  const duckPress = Event('duck press')
  const duckRelease = Event('duck release')

  keyActions.set(left, {
    press: () => movementPress.emit(-1),
    release: () => movementRelease.emit(-1),
  })
  keyActions.set(right, {
    press: () => movementPress.emit(1),
    release: () => movementRelease.emit(1),
  })
  keyActions.set(up, {
    press: () => jumpPress.emit(),
    release: () => jumpRelease.emit(),
  })
  keyActions.set(down, {
    press: () => duckPress.emit(),
    release: () => duckRelease.emit(),
  })

  return { movementPress, movementRelease, jumpPress, jumpRelease, duckPress, duckRelease }
}

const clearKeys = () => {
  keyActions.clear()
}

const getPlayerKeys = (index) => {
  return playerKeys[index]
}

const initKeys = () => {
  // names of keyactions mapped to key code
  keyHolder.set('p1left', 'ArrowLeft')
  keyHolder.set('p1right', 'ArrowRight')
  keyHolder.set('p1up', 'ArrowUp')
  keyHolder.set('p1down', 'ArrowDown')
  keyHolder.set('p2left', 'KeyT')
  keyHolder.set('p2right', 'KeyS')
  keyHolder.set('p2up', 'KeyL')

  playerKeys.push({
    up: keyHolder.get('p1up'),
    right: keyHolder.get('p1right'),
    down: keyHolder.get('p1down'),
    left: keyHolder.get('p1left'),
  })

  playerKeys.push({ up: 'KeyY', right: 'KeyE', down: 'KeyI', left: 'KeyH' })
  playerKeys.push({ up: 'KeyL', right: 'KeyS', down: 'KeyN', left: 'KeyT' })
  playerKeys.push({
    up: 'Digit5',
    right: 'Digit6',
    down: 'KeyN',
    left: 'Digit4',
  })

  playerKeys.push({
    up: keyHolder.get('p1up'),
    right: keyHolder.get('p1right'),
    down: keyHolder.get('p1down'),
    left: keyHolder.get('p1left'),
  })
  playerKeys.push({
    up: keyHolder.get('p1up'),
    right: keyHolder.get('p1right'),
    down: keyHolder.get('p1down'),
    left: keyHolder.get('p1left'),
  })
  playerKeys.push({
    up: keyHolder.get('p1up'),
    right: keyHolder.get('p1right'),
    down: keyHolder.get('p1down'),
    left: keyHolder.get('p1left'),
  })
}

const changeKeyPrompt = (keyToChange) => {
  document.removeEventListener('keyup', handleKeyUp)
  document.removeEventListener('keydown', handleKeyDown)
  document.addEventListener('keydown', (e) => setNewKey(e, keyToChange), {
    once: true,
  })
}

const setNewKey = (e, keyToChange) => {
  console.log(e.code)
  if (e.code !== 'Escape') {
    keyHolder.set(keyToChange, e.code)
    keyButtons.get(keyToChange).innerHTML = e.code.slice(-1)
    clearKeys()
    setupKeys()
  }
  toggleHidden(keyPromptModal, 'block')
  startEventListeners()
}

export { handleKeyDown, handleKeyUp, initKeys, setupKeys, playerKeys }
