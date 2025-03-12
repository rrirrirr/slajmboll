import { Event } from './events.js';

// Key mapping storage
const keyMappings = new Map();
const playerKeyConfigs = [];
let isListeningForKey = false;

// Create key events
export const keyDownEvent = Event('key_down');
export const keyUpEvent = Event('key_up');

// Handle key events
const handleKeyDown = (event) => {
  const { code } = event;

  // Skip if in key binding mode
  if (isListeningForKey) return;

  // Emit global event
  keyDownEvent.emit({ code });

  // Execute mapped actions
  if (keyMappings.has(code)) {
    keyMappings.get(code).press();
  }
};

const handleKeyUp = (event) => {
  const { code } = event;

  // Skip if in key binding mode
  if (isListeningForKey) return;

  // Emit global event
  keyUpEvent.emit({ code });

  // Execute mapped actions
  if (keyMappings.has(code)) {
    keyMappings.get(code).release();
  }
};

// Setup keys for a player
export const setupPlayerKeys = (config, playerIndex) => {
  const { up, right, down, left } = config;

  // Create events for this player
  const eventPrefix = `player_${playerIndex}`;
  const movementPress = Event(`${eventPrefix}_movement_press`);
  const movementRelease = Event(`${eventPrefix}_movement_release`);
  const jumpPress = Event(`${eventPrefix}_jump_press`);
  const jumpRelease = Event(`${eventPrefix}_jump_release`);
  const duckPress = Event(`${eventPrefix}_duck_press`);
  const duckRelease = Event(`${eventPrefix}_duck_release`);

  // Clear old mappings for this player
  clearPlayerKeys(playerIndex);

  // Map keys to actions
  mapKey(left, {
    press: () => movementPress.emit(-1),
    release: () => movementRelease.emit(-1),
    playerIndex
  });

  mapKey(right, {
    press: () => movementPress.emit(1),
    release: () => movementRelease.emit(1),
    playerIndex
  });

  mapKey(up, {
    press: () => jumpPress.emit(),
    release: () => jumpRelease.emit(),
    playerIndex
  });

  mapKey(down, {
    press: () => duckPress.emit(),
    release: () => duckRelease.emit(),
    playerIndex
  });

  // Ensure event listeners are active
  activateKeyListeners();

  // Return events for this player
  return {
    movementPress,
    movementRelease,
    jumpPress,
    jumpRelease,
    duckPress,
    duckRelease,
    playerIndex
  };
};

// Map a key to actions
const mapKey = (keyCode, actions) => {
  keyMappings.set(keyCode, actions);
};

// Clear mappings for a player
const clearPlayerKeys = (playerIndex) => {
  [...keyMappings.entries()].forEach(([key, actions]) => {
    if (actions.playerIndex === playerIndex) {
      keyMappings.delete(key);
    }
  });
};

// Initialize default key configurations
export const initializeKeyConfigs = () => {
  // Default key mappings for 4 players
  const defaultConfigs = [
    // Player 1
    {
      up: 'ArrowUp',
      right: 'ArrowRight',
      down: 'ArrowDown',
      left: 'ArrowLeft'
    },
    // Player 2
    {
      up: 'KeyW',
      right: 'KeyD',
      down: 'KeyS',
      left: 'KeyA'
    },
    // Player 3
    {
      up: 'KeyI',
      right: 'KeyL',
      down: 'KeyK',
      left: 'KeyJ'
    },
    // Player 4
    {
      up: 'Digit8',
      right: 'Digit6',
      down: 'Digit5',
      left: 'Digit4'
    }
  ];

  // Store configurations
  playerKeyConfigs.length = 0;
  defaultConfigs.forEach(config => {
    playerKeyConfigs.push({ ...config });
  });

  return playerKeyConfigs;
};

// Get key configuration for a player
export const getPlayerKeyConfig = (playerIndex) => {
  if (playerIndex < playerKeyConfigs.length) {
    return playerKeyConfigs[playerIndex];
  }
  return playerKeyConfigs[0]; // Fallback to first config
};

// Update a key configuration
export const updatePlayerKey = (playerIndex, keyType, keyCode) => {
  if (playerIndex < playerKeyConfigs.length) {
    playerKeyConfigs[playerIndex][keyType] = keyCode;
    return true;
  }
  return false;
};

// Enter key binding mode
export const startKeyBindingMode = () => {
  isListeningForKey = true;

  // Temporarily disable regular key handling
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('keyup', handleKeyUp);
};

// Exit key binding mode
export const endKeyBindingMode = () => {
  isListeningForKey = false;

  // Re-enable regular key handling
  activateKeyListeners();
};

// Activate key event listeners
export const activateKeyListeners = () => {
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('keyup', handleKeyUp);
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
};

// Format key name for display
export const formatKeyName = (key) => {
  return key.replace(/Digit|Arrow|Key/, '');
};
