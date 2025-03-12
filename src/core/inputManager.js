import { Event } from './events.js';
import { teams } from '.../config.js';

/**
 * @typedef {Object} KeyConfig
 * @property {string} up - Key code for up/jump
 * @property {string} right - Key code for right movement
 * @property {string} down - Key code for down/duck
 * @property {string} left - Key code for left movement
 */

/**
 * @typedef {Object} PlayerEvents
 * @property {Object} movementPress - Event for movement key press
 * @property {Object} movementRelease - Event for movement key release
 * @property {Object} jumpPress - Event for jump key press
 * @property {Object} jumpRelease - Event for jump key release
 * @property {Object} duckPress - Event for duck key press
 * @property {Object} duckRelease - Event for duck key release
 * @property {number} playerIndex - Player index
 */

/**
 * Storage for key actions
 * @type {Map<string, Object>}
 */
const keyMappings = new Map();

/**
 * Player key configurations
 * @type {Array<KeyConfig>}
 */
const playerKeyConfigs = [];

/**
 * Flag indicating we're in key binding mode
 * @type {boolean}
 */
let isListeningForKey = false;

/**
 * Events for key actions
 */
export const keyDownEvent = Event('key_down');
export const keyUpEvent = Event('key_up');

/**
 * Handles keydown events
 * 
 * @param {KeyboardEvent} event - Keyboard event
 */
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

/**
 * Handles keyup events
 * 
 * @param {KeyboardEvent} event - Keyboard event
 */
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

/**
 * Sets up key handlers for a player
 * 
 * @param {KeyConfig} config - Key configuration
 * @param {number} playerIndex - Player index
 * @returns {PlayerEvents} Player-specific events
 */
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

/**
 * Maps a key to actions
 * 
 * @param {string} keyCode - Key code to map
 * @param {Object} actions - Actions for the key
 */
const mapKey = (keyCode, actions) => {
  keyMappings.set(keyCode, actions);
};

/**
 * Clears key mappings for a player
 * 
 * @param {number} playerIndex - Index of player to clear mappings for
 */
const clearPlayerKeys = (playerIndex) => {
  [...keyMappings.entries()].forEach(([key, actions]) => {
    if (actions.playerIndex === playerIndex) {
      keyMappings.delete(key);
    }
  });
};

/**
 * Initializes default key configurations
 * 
 * @returns {Array<KeyConfig>} Array of key configurations
 */
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

/**
 * Gets key configuration for a player
 * 
 * @param {number} playerIndex - Player index
 * @returns {KeyConfig} Key configuration
 */
export const getPlayerKeyConfig = (playerIndex) => {
  if (playerIndex < playerKeyConfigs.length) {
    return playerKeyConfigs[playerIndex];
  }
  return playerKeyConfigs[0]; // Fallback to first config
};

/**
 * Updates a key in player's configuration
 * 
 * @param {number} playerIndex - Player index
 * @param {string} keyType - Key type ('up', 'down', 'left', 'right')
 * @param {string} keyCode - New key code
 * @returns {boolean} True if update was successful
 */
export const updatePlayerKey = (playerIndex, keyType, keyCode) => {
  if (playerIndex < playerKeyConfigs.length) {
    playerKeyConfigs[playerIndex][keyType] = keyCode;
    return true;
  }
  return false;
};

/**
 * Enters key binding mode
 */
export const startKeyBindingMode = () => {
  isListeningForKey = true;

  // Temporarily disable regular key handling
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('keyup', handleKeyUp);
};

/**
 * Exits key binding mode
 */
export const endKeyBindingMode = () => {
  isListeningForKey = false;

  // Re-enable regular key handling
  activateKeyListeners();
};

/**
 * Activates key event listeners
 */
export const activateKeyListeners = () => {
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('keyup', handleKeyUp);
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
};

/**
 * Formats key name for display
 * 
 * @param {string} key - Key code
 * @returns {string} Formatted key name
 */
export const formatKeyName = (key) => {
  return key.replace(/Digit|Arrow|Key/, '');
};

/**
 * Listens for a key press and calls callback with pressed key
 * 
 * @param {Function} callback - Function called with pressed key code
 */
export const listenForKeyPress = (callback) => {
  startKeyBindingMode();

  const keyDownHandler = (event) => {
    event.preventDefault();

    // Clean up
    document.removeEventListener('keydown', keyDownHandler);
    endKeyBindingMode();

    // Call callback with the key
    if (typeof callback === 'function') {
      callback(event.code);
    }
  };

  document.addEventListener('keydown', keyDownHandler);
};

/**
 * Gets all key mappings
 * 
 * @returns {Map} Map of key mappings
 */
export const getAllKeyMappings = () => {
  return new Map(keyMappings);
};

export { handleKeyDown, handleKeyUp };
