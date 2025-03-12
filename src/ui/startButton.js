import {
  gameState,
  gameStateChangeEvent,
  teamChangeEvent,
  canStartGame,
  setGamePlaying
} from './gameState.js';

// Reference to the start button DOM element
let startButtonElement = null;

// Create the start button and add to container
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
  gameStateChangeEvent.subscribe(handleGameStateChange);

  // Initial check
  updateStartButtonVisibility();

  return startButtonElement;
}

// Update the visibility of the start button
function updateStartButtonVisibility() {
  if (!startButtonElement) return;

  const shouldShow = canStartGame() && !gameState.isPlaying;

  if (shouldShow) {
    startButtonElement.style.display = 'block';
  } else {
    startButtonElement.style.display = 'none';
  }
}

// Handle game state changes
function handleGameStateChange(data) {
  if (data.type === 'playing_change' || data.type === 'reset') {
    updateStartButtonVisibility();
  }
}

// Get the start button element
function getStartButton() {
  return startButtonElement;
}

// Hide the start button
function hideStartButton() {
  if (startButtonElement) {
    startButtonElement.style.display = 'none';
  }
}

// Show the start button (if conditions are met)
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
