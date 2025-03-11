import { Event } from './events.js';

export const GAME_STATE = {
  SETUP: 'setup',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  SCORING: 'scoring',
  GAME_OVER: 'game_over'
};

// Current state tracking
export let currentGameState = GAME_STATE.SETUP;
export let activeCountdown = null;

// Create events for game flow
export const roundStartEvent = Event('round_start');
export const roundEndEvent = Event('round_end');
export const countdownStartEvent = Event('countdown_start');
export const countdownEndEvent = Event('countdown_end');

// State change functions
export function setGameState(newState) {
  console.log(`Game state changing from ${currentGameState} to ${newState}`);
  currentGameState = newState;
}

export function setActiveCountdown(value) {
  activeCountdown = value;
}

// Set up event subscribers
roundStartEvent.subscribe(() => {
  console.log("Round started - Players have control");
  setGameState(GAME_STATE.PLAYING);
});

roundEndEvent.subscribe((team) => {
  console.log(`Round ended - Team ${team} scored`);
  setGameState(GAME_STATE.SCORING);
});

countdownStartEvent.subscribe(() => {
  console.log("Countdown started - Players wait");
  setGameState(GAME_STATE.COUNTDOWN);
});

countdownEndEvent.subscribe(() => {
  console.log("Countdown ended - Starting play");
  roundStartEvent.emit();
});
