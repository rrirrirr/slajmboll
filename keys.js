import { Event } from './events.js'

// Maps to store key references
const keyActions = new Map() // key(board) action holder
const keyHolder = new Map() // key mapping storage
const playerKeys = []
const keyButtons = new Map() // button references
let listenForKey = false // Flag to indicate we're listening for a key

// Handle key events
const handleKeyDown = ({ code }) => {
  // Skip if we're in key binding mode
  if (listenForKey) return;

  console.log('Key down:', code);
  if (keyActions.has(code)) {
    console.log('Action found for key:', code);
    keyActions.get(code).press();
  }
}

const handleKeyUp = ({ code }) => {
  // Skip if we're in key binding mode
  if (listenForKey) return;

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

  // Clear any existing key mappings for this player's keys
  // We need to find all keys mapped to this player and remove them
  Array.from(keyActions.entries()).forEach(([key, action]) => {
    if (action.playerIndex === playerIndex) {
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

// Helper function to clean key names for display
const cleanKey = (key) => {
  return key.replace(/Digit|Arrow|Key/, '');
}

// Get a specific player's key configuration
const getPlayerKeys = (index) => {
  return playerKeys[index];
}

// Update a specific player's key configuration
const updatePlayerKey = (playerIndex, keyType, keyCode) => {
  if (playerIndex < playerKeys.length) {
    playerKeys[playerIndex][keyType] = keyCode;
    console.log(`Updated player ${playerIndex} ${keyType} key to ${keyCode}`);
    return true;
  }
  return false;
}

// Initialize default key mappings for players
const initKeys = () => {
  // Default key mappings
  keyHolder.set('p1left', 'ArrowLeft');
  keyHolder.set('p1right', 'ArrowRight');
  keyHolder.set('p1up', 'ArrowUp');
  keyHolder.set('p1down', 'ArrowDown');

  keyHolder.set('p2left', 'KeyH');
  keyHolder.set('p2right', 'KeyE');
  keyHolder.set('p2up', 'KeyY');
  keyHolder.set('p2down', 'KeyI');

  keyHolder.set('p3left', 'KeyT');
  keyHolder.set('p3right', 'KeyS');
  keyHolder.set('p3up', 'KeyL');
  keyHolder.set('p3down', 'KeyN');

  keyHolder.set('p4left', 'Digit4');
  keyHolder.set('p4right', 'Digit6');
  keyHolder.set('p4up', 'Digit5');
  keyHolder.set('p4down', 'KeyN');

  // Player 1 keys
  playerKeys.push({
    up: keyHolder.get('p1up'),
    right: keyHolder.get('p1right'),
    down: keyHolder.get('p1down'),
    left: keyHolder.get('p1left'),
  });

  // Player 2 keys
  playerKeys.push({
    up: keyHolder.get('p2up'),
    right: keyHolder.get('p2right'),
    down: keyHolder.get('p2down'),
    left: keyHolder.get('p2left'),
  });

  // Player 3 keys
  playerKeys.push({
    up: keyHolder.get('p3up'),
    right: keyHolder.get('p3right'),
    down: keyHolder.get('p3down'),
    left: keyHolder.get('p3left'),
  });

  // Player 4 keys
  playerKeys.push({
    up: keyHolder.get('p4up'),
    right: keyHolder.get('p4right'),
    down: keyHolder.get('p4down'),
    left: keyHolder.get('p4left'),
  });

  // More players just use player 1 keys for now
  for (let i = 4; i < 7; i++) {
    playerKeys.push({
      up: keyHolder.get('p1up'),
      right: keyHolder.get('p1right'),
      down: keyHolder.get('p1down'),
      left: keyHolder.get('p1left'),
    });
  }
}

// Prompt for key change (for configuration UI)
const changeKeyPrompt = (keyToChange, buttonElement) => {
  listenForKey = true;
  const originalText = buttonElement.textContent;
  buttonElement.textContent = "Press Key...";
  buttonElement.classList.add('listening');

  // Create event listeners for key binding
  const keyDownHandler = (e) => {
    e.preventDefault();
    setNewKey(e, keyToChange, buttonElement, originalText);
    cleanup();
  };

  const clickAwayHandler = (event) => {
    if (event.target !== buttonElement) {
      buttonElement.textContent = originalText;
      buttonElement.classList.remove('listening');
      cleanup();
    }
  };

  const escapeHandler = (e) => {
    if (e.code === 'Escape') {
      buttonElement.textContent = originalText;
      buttonElement.classList.remove('listening');
      cleanup();
    }
  };

  // Cleanup function to remove all event listeners
  const cleanup = () => {
    document.removeEventListener('keydown', keyDownHandler);
    document.removeEventListener('click', clickAwayHandler);
    document.removeEventListener('keydown', escapeHandler);
    listenForKey = false;

    // Re-enable regular key handling
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
  };

  // Temporarily disable normal key handling
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('keyup', handleKeyUp);

  // Add key binding event listeners
  document.addEventListener('keydown', keyDownHandler);
  document.addEventListener('keydown', escapeHandler);

  // Add click away listener after a short delay
  setTimeout(() => {
    document.addEventListener('click', clickAwayHandler);
  }, 100);
}

// Set new key (for configuration UI)
const setNewKey = (e, keyToChange, buttonElement) => {
  console.log(`Setting new key: ${e.code} for ${keyToChange}`);

  // Extract player number and key type
  const match = keyToChange.match(/p(\d+)(up|down|left|right)/);
  if (match) {
    const playerNum = parseInt(match[1]);
    const playerIndex = playerNum - 1;
    const keyType = match[2];

    // Update the key mapping
    keyHolder.set(keyToChange, e.code);

    // Update button text
    buttonElement.textContent = cleanKey(e.code);
    buttonElement.classList.remove('listening');

    // Store the button reference
    keyButtons.set(keyToChange, buttonElement);

    if (playerIndex >= 0 && playerIndex < playerKeys.length) {
      updatePlayerKey(playerIndex, keyType, e.code);
      const playerKeySet = playerKeys[playerIndex];
      setupKeys(playerKeySet, playerIndex);
    }
  }

  listenForKey = false;
}

export {
  handleKeyDown,
  handleKeyUp,
  initKeys,
  setupKeys,
  playerKeys,
  clearKeys,
  getPlayerKeys,
  changeKeyPrompt,
  cleanKey
}
