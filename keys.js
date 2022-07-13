import { Event } from './events.js'
const keyActions = new Map() //key(board) action holder
const keyHolder = new Map() //r
const playerKeys = []
const keyButtons = new Map() //r

const handleKeyDown = ({ code }) => {
  // console.log(code)
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

// const setupKeys = (player) => {
//   keyActions.set(player.keys.get('left'), com.run(slime, 'left'))
//   keyActions.set(player.keys.get('right'), com.run(slime, 'right'))
//   keyActions.set(player.keys.get('up'), com.jump(slime))
//   keyActions.set(player.keys.get('down'), com.duck(slime))
// }

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
  // keyHolder.set('p1left', 'KeyH')
  // keyHolder.set('p1right', 'KeyE')
  // keyHolder.set('p1up', 'KeyY')

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

  //map commands to keys
  // keyActions.set(keyHolder.get('p1left'), com.runCommand(slimeBaller1, -1, 0))
  // keyActions.set(keyHolder.get('p1right'), com.runCommand(slimeBaller1, 1, 0))
  // keyActions.set(keyHolder.get('p1up'), com.jumpCommand(slimeBaller1))
  // keyActions.set(keyHolder.get('p2left'), com.runCommand(slimeBaller2, -1, 0))
  // keyActions.set(keyHolder.get('p2right'), com.runCommand(slimeBaller2, 1, 0))
  // keyActions.set(keyHolder.get('p2up'), com.jumpCommand(slimeBaller2))

  //map buttons to keys
  // keyButtons.set('p1left', document.querySelector('#p1left'))
  // keyButtons.set('p1right', document.querySelector('#p1right'))
  // keyButtons.set('p1up', document.querySelector('#p1up'))
  // keyButtons.set('p2left', document.querySelector('#p2left'))
  // keyButtons.set('p2right', document.querySelector('#p2right'))
  // keyButtons.set('p2up', document.querySelector('#p2up'))

  // keyButtons.forEach((v, k) => {
  //   // v.addEventListener("click", () =>  keyPromptModal.innerHTML = keyHolder.get(k).slice(-1));
  //   v.addEventListener(
  //     'click',
  //     () => (keyPromptModal.innerHTML = `Press key to change ${k}`)
  //   )
  //   v.addEventListener('click', () => toggleHidden(keyPromptModal, 'block'))
  //   v.addEventListener('click', () => changeKeyPrompt(k))
  // })
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
