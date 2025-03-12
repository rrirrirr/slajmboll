import {
  gameState,
  stateChangeEvent,
  teamChangeEvent,
  canStartGame,
  setGamePlaying
} from '../core/gameState.js';

/**
 * Reference to the start button DOM element
 * @type {HTMLElement|null}
 */
let startButtonElement = null;

/**
 * Creates and adds a start button to the container
 * 
 * @param {HTMLElement} container - DOM element to add button to
 * @param {Function} onStartGame - Callback when game starts
 * @returns {HTMLElement} The created button element
 */
function createAndAddStartButton(container, onStartGame) {
  // Create the button element
  startButtonElement = document.createElement('button');
  startButtonElement.classList.add('startButton');
  startButtonElement.textContent = 'START GAME';
  startButtonElement.style.display = 'none'; // Hidden by default

  // Add click handler
  startButtonElement.addEventListener('click', () => {
    if (canStartGame()) {
      setGamePlaying(true);
      if (typeof onStartGame === 'function') {
        onStartGame();
      }
    }
  });

  // Add to container
  container.appendChild(startButtonElement);

  // Subscribe to events to update visibility
  teamChangeEvent.subscribe(updateStartButtonVisibility);
  stateChangeEvent.subscribe(handleGameStateChange);

  // Initial check
  updateStartButtonVisibility();

  return startButtonElement;
}

/**
 * Updates the visibility of the start button based on game state
 */
function updateStartButtonVisibility() {
  if (!startButtonElement) return;

  const shouldShow = canStartGame() && !gameState.isPlaying;

  startButtonElement.style.display = shouldShow ? 'block' : 'none';
}

/**
 * Handles game state change events
 * 
 * @param {Object} data - Event data
 */
function handleGameStateChange(data) {
  if (data.type === 'playing_change' || data.type === 'reset') {
    updateStartButtonVisibility();
  }
}

/**
 * Gets the start button element
 * 
 * @returns {HTMLElement|null} The start button element or null
 */
function getStartButton() {
  return startButtonElement;
}

/**
 * Hides the start button
 */
function hideStartButton() {
  if (startButtonElement) {
    startButtonElement.style.display = 'none';
  }
}

/**
 * Shows the start button if conditions are met
 */
function showStartButton() {
  updateStartButtonVisibility();
}

export {
  createAndAddStartButton,
  updateStartButtonVisibility,
  getStartButton,
  hideStartButton,
  showStartButton
};
