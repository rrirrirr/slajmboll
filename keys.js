import { Event } from './events.js'

// Maps to store key references
const keyActions = new Map() // key(board) action holder
const keyHolder = new Map() // key mapping storage
const playerKeys = []
const keyButtons = new Map() // button references

// Handle key events
const handleKeyDown = ({ code }) => {
  console.log('Key down:', code);
  if (keyActions.has(code)) {
    console.log('Action found for key:', code);
    keyActions.get(code).press();
  }
}

const handleKeyUp = ({ code }) => {
  if (keyActions.has(code)) {
    keyActions.get(code).release();
  }
}

// Setup keys with unique identifiers for each player
const setupKeys = ({ up, right, down, left, jump }, playerIndex = 0) => {
  console.log(`Setting up keys for player ${playerIndex}:`, { up, right, down, left, jump });

  // Create unique events for this player
  const eventPrefix = `player_${playerIndex}`;
  const movementPress = Event(`${eventPrefix}_movement_press`);
  const movementRelease = Event(`${eventPrefix}_movement_release`);
  const jumpPress = Event(`${eventPrefix}_jump_press`);
  const jumpRelease = Event(`${eventPrefix}_jump_release`);
  const duckPress = Event(`${eventPrefix}_duck_press`);
  const duckRelease = Event(`${eventPrefix}_duck_release`);

  // Clear any existing key mappings for this player
  const playerKeyPrefix = `player_${playerIndex}_`;
  Array.from(keyActions.keys()).forEach(key => {
    if (key.startsWith(playerKeyPrefix)) {
      keyActions.delete(key);
    }
  });

  // Map keys to action events with unique identifiers
  keyActions.set(left, {
    press: () => {
      console.log(`Left key pressed for player ${playerIndex}`);
      movementPress.emit(-1);
    },
    release: () => {
      console.log(`Left key released for player ${playerIndex}`);
      movementRelease.emit(-1);
    },
    playerIndex
  });

  keyActions.set(right, {
    press: () => {
      console.log(`Right key pressed for player ${playerIndex}`);
      movementPress.emit(1);
    },
    release: () => {
      console.log(`Right key released for player ${playerIndex}`);
      movementRelease.emit(1);
    },
    playerIndex
  });

  keyActions.set(up, {
    press: () => {
      console.log(`Up key pressed for player ${playerIndex}`);
      jumpPress.emit();
    },
    release: () => {
      console.log(`Up key released for player ${playerIndex}`);
      jumpRelease.emit();
    },
    playerIndex
  });

  keyActions.set(down, {
    press: () => {
      console.log(`Down key pressed for player ${playerIndex}`);
      duckPress.emit();
    },
    release: () => {
      console.log(`Down key released for player ${playerIndex}`);
      duckRelease.emit();
    },
    playerIndex
  });

  // Make sure key listeners are active
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('keyup', handleKeyUp);
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  return {
    movementPress,
    movementRelease,
    jumpPress,
    jumpRelease,
    duckPress,
    duckRelease,
    playerIndex
  };
}

// Clear keyboard mappings
const clearKeys = () => {
  keyActions.clear();
}

// Get a specific player's key configuration
const getPlayerKeys = (index) => {
  return playerKeys[index];
}

// Initialize default key mappings for players
const initKeys = () => {
  // Default key mappings
  keyHolder.set('p1left', 'ArrowLeft');
  keyHolder.set('p1right', 'ArrowRight');
  keyHolder.set('p1up', 'ArrowUp');
  keyHolder.set('p1down', 'ArrowDown');
  keyHolder.set('p2left', 'KeyT');
  keyHolder.set('p2right', 'KeyS');
  keyHolder.set('p2up', 'KeyL');

  // Player 1 keys
  playerKeys.push({
    up: keyHolder.get('p1up'),
    right: keyHolder.get('p1right'),
    down: keyHolder.get('p1down'),
    left: keyHolder.get('p1left'),
  });

  // Player 2 keys
  playerKeys.push({
    up: 'KeyY',
    right: 'KeyE',
    down: 'KeyI',
    left: 'KeyH'
  });

  // Player 3 keys
  playerKeys.push({
    up: 'KeyL',
    right: 'KeyS',
    down: 'KeyN',
    left: 'KeyT'
  });

  // Player 4 keys
  playerKeys.push({
    up: 'Digit5',
    right: 'Digit6',
    down: 'KeyN',
    left: 'Digit4',
  });

  // More players just use player 1 keys for now
  playerKeys.push({
    up: keyHolder.get('p1up'),
    right: keyHolder.get('p1right'),
    down: keyHolder.get('p1down'),
    left: keyHolder.get('p1left'),
  });

  playerKeys.push({
    up: keyHolder.get('p1up'),
    right: keyHolder.get('p1right'),
    down: keyHolder.get('p1down'),
    left: keyHolder.get('p1left'),
  });

  playerKeys.push({
    up: keyHolder.get('p1up'),
    right: keyHolder.get('p1right'),
    down: keyHolder.get('p1down'),
    left: keyHolder.get('p1left'),
  });
}

// Prompt for key change (for configuration UI)
const changeKeyPrompt = (keyToChange) => {
  document.removeEventListener('keyup', handleKeyUp);
  document.removeEventListener('keydown', handleKeyDown);
  document.addEventListener('keydown', (e) => setNewKey(e, keyToChange), {
    once: true,
  });
}

// Set new key (for configuration UI)
const setNewKey = (e, keyToChange) => {
  console.log(e.code);
  if (e.code !== 'Escape') {
    keyHolder.set(keyToChange, e.code);
    if (keyButtons.has(keyToChange)) {
      keyButtons.get(keyToChange).innerHTML = e.code.slice(-1);
    }
    clearKeys();
    setupKeys();
  }

  // Re-enable key listeners
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
}

export {
  handleKeyDown,
  handleKeyUp,
  initKeys,
  setupKeys,
  playerKeys,
  clearKeys,
  getPlayerKeys,
  changeKeyPrompt
}
