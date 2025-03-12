import { Event } from './events.js';
import { rules } from '../config.js';

/**
 * Game state constants
 * @enum {string}
 */
export const GAME_STATES = {
  SETUP: 'setup',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  SCORING: 'scoring',
  PAUSED: 'paused',
  GAME_OVER: 'game_over'
};

/**
 * Game state events
 */
export const stateChangeEvent = Event('game_state_change');
export const teamChangeEvent = Event('team_change');
export const roundStartEvent = Event('round_start');
export const roundEndEvent = Event('round_end');
export const countdownStartEvent = Event('countdown_start');
export const countdownEndEvent = Event('countdown_end');
export const scoreChangeEvent = Event('score_change');

/**
 * The central game state object
 * @type {Object}
 */
const gameState = {
  // Current game state
  currentState: GAME_STATES.SETUP,
  previousState: null,

  // Game settings
  isPlaying: false,
  isSetup: true,
  isPaused: false,
  activeCountdown: null,
  servingTeam: 1,

  // Players and teams
  players: [],
  teams: {
    team1Count: 0, // Gold team
    team2Count: 0  // Crimson team
  },

  // Scoring
  score: [0, 0],
  winningScore: rules.WINNING_SCORE,

  // Game progress
  roundInProgress: false,
  gameTime: 0
};

/**
 * Change the current game state
 * 
 * @param {string} newState - New state from GAME_STATES enum
 * @returns {Object} The updated game state
 */
export function setGameState(newState) {
  const oldState = gameState.currentState;
  gameState.currentState = newState;
  gameState.previousState = oldState;

  // Update derived state flags
  if (newState === GAME_STATES.PLAYING) {
    gameState.isPlaying = true;
    gameState.isSetup = false;
  } else if (newState === GAME_STATES.SETUP) {
    gameState.isPlaying = false;
    gameState.isSetup = true;
  } else if (newState === GAME_STATES.GAME_OVER) {
    gameState.isPlaying = false;
    gameState.roundInProgress = false;
  }

  // Emit state change event
  stateChangeEvent.emit({
    type: 'state_change',
    oldState,
    newState,
    gameState: { ...gameState }
  });

  return gameState;
}

/**
 * Set the game to playing state
 * 
 * @param {boolean} isPlaying - Whether the game is in playing state
 * @returns {Object} Updated game state
 */
export function setGamePlaying(isPlaying) {
  gameState.isPlaying = isPlaying;

  // If we're starting to play, update the game state
  if (isPlaying && gameState.currentState !== GAME_STATES.PLAYING) {
    setGameState(GAME_STATES.PLAYING);
  }

  stateChangeEvent.emit({
    type: 'playing_change',
    value: isPlaying,
    gameState: { ...gameState }
  });

  return gameState;
}

/**
 * Set whether the game is in setup mode
 * 
 * @param {boolean} isSetup - Whether the game is in setup mode
 * @returns {Object} Updated game state
 */
export function setGameSetup(isSetup) {
  gameState.isSetup = isSetup;

  stateChangeEvent.emit({
    type: 'setup_change',
    value: isSetup,
    gameState: { ...gameState }
  });

  return gameState;
}

/**
 * Set the active countdown timer ID
 * 
 * @param {number|null} countdown - Countdown timer ID or null if no countdown
 */
export function setActiveCountdown(countdown) {
  gameState.activeCountdown = countdown;
}

/**
 * Add a player to the game
 * 
 * @param {Object} playerData - Player data object
 * @returns {number} The index of the added player
 */
export function addPlayer(playerData) {
  gameState.players.push(playerData);

  stateChangeEvent.emit({
    type: 'player_added',
    player: playerData,
    playerIndex: gameState.players.length - 1
  });

  return gameState.players.length - 1; // Return the index
}

/**
 * Update a player's team assignment
 * 
 * @param {number} playerIndex - Index of the player to update
 * @param {number} team - New team (0=none, 1=team1, 2=team2)
 * @returns {boolean} True if the update was successful
 */
export function updatePlayerTeam(playerIndex, team) {
  if (playerIndex < 0 || playerIndex >= gameState.players.length) {
    return false;
  }

  const oldTeam = gameState.players[playerIndex].team;

  // Skip if team is unchanged
  if (oldTeam === team) {
    return true;
  }

  // Update team counts
  if (oldTeam === 1) gameState.teams.team1Count--;
  if (oldTeam === 2) gameState.teams.team2Count--;
  if (team === 1) gameState.teams.team1Count++;
  if (team === 2) gameState.teams.team2Count++;

  // Update player's team
  gameState.players[playerIndex].team = team;

  // Emit team change events
  teamChangeEvent.emit({
    playerIndex,
    oldTeam,
    newTeam: team,
    teams: { ...gameState.teams }
  });

  stateChangeEvent.emit({
    type: 'team_change',
    playerIndex,
    oldTeam,
    newTeam: team,
    teams: { ...gameState.teams }
  });

  return true;
}

/**
 * Check if the game can be started
 * 
 * @returns {boolean} True if the game meets starting requirements
 */
export function canStartGame() {
  // Need at least 2 players
  if (gameState.players.length < 2) return false;

  // Each team must have at least one player
  if (gameState.teams.team1Count < 1 || gameState.teams.team2Count < 1) return false;

  // All players must have chosen a team
  const unassignedPlayers = gameState.players.filter(player => player.team === 0);
  if (unassignedPlayers.length > 0) return false;

  return true;
}

/**
 * Get all players for a specific team
 * 
 * @param {number} teamNumber - Team number (1 or 2)
 * @returns {Array} Array of players in the specified team
 */
export function getTeamPlayers(teamNumber) {
  return gameState.players.filter(player => player.team === teamNumber);
}

/**
 * Update the score for a team
 * 
 * @param {number} teamIndex - Index of the team (0 for team1, 1 for team2)
 * @param {number} points - New point value
 */
export function updateScore(teamIndex, points) {
  if (teamIndex < 0 || teamIndex > 1) return;

  gameState.score[teamIndex] = points;

  scoreChangeEvent.emit({
    teamIndex,
    points,
    score: [...gameState.score]
  });
}

/**
 * Increment score for a team
 * 
 * @param {number} team - Team number (1 or 2)
 * @returns {boolean} True if the team won the game
 */
export function incrementScore(team) {
  if (team !== 1 && team !== 2) return false;

  const teamIndex = team - 1;
  gameState.score[teamIndex]++;

  // Emit score change event
  scoreChangeEvent.emit({
    team,
    teamIndex,
    score: [...gameState.score]
  });

  // Check for win condition
  if (gameState.score[teamIndex] >= gameState.winningScore) {
    setGameState(GAME_STATES.GAME_OVER);
    return true;
  }

  return false;
}

/**
 * Check if a team has won
 * 
 * @returns {number|null} Winning team (1 or 2) or null if no winner
 */
export function getWinningTeam() {
  if (gameState.score[0] >= gameState.winningScore) {
    return 1;
  } else if (gameState.score[1] >= gameState.winningScore) {
    return 2;
  }
  return null;
}

/**
 * Start a new round with specified serving team
 * 
 * @param {number} servingTeam - Team that will serve (1 or 2)
 */
export function startRound(servingTeam) {
  if (gameState.roundInProgress) {
    return;
  }

  gameState.servingTeam = servingTeam;
  gameState.roundInProgress = true;
  setGameState(GAME_STATES.COUNTDOWN);

  roundStartEvent.emit({
    servingTeam,
    gameState: { ...gameState }
  });
}

/**
 * End the current round
 * 
 * @param {number} scoringTeam - Team that scored (1 or 2)
 * @returns {boolean} True if the team won the game
 */
export function endRound(scoringTeam) {
  if (!gameState.roundInProgress) {
    return false;
  }

  gameState.roundInProgress = false;
  setGameState(GAME_STATES.SCORING);

  // Update score and check for game end
  const isGameOver = incrementScore(scoringTeam);

  roundEndEvent.emit({
    scoringTeam,
    isGameOver,
    gameState: { ...gameState }
  });

  return isGameOver;
}

/**
 * Reset the game state
 */
export function resetGameState() {
  // Reset game flow
  gameState.currentState = GAME_STATES.SETUP;
  gameState.previousState = null;
  gameState.isPlaying = false;
  gameState.isSetup = true;
  gameState.isPaused = false;
  gameState.activeCountdown = null;

  // Reset players
  gameState.players = [];
  gameState.teams.team1Count = 0;
  gameState.teams.team2Count = 0;

  // Reset score
  gameState.score = [0, 0];
  gameState.roundInProgress = false;

  // Emit reset event
  stateChangeEvent.emit({ type: 'reset' });
}

/**
 * Get a copy of the current game state
 * 
 * @returns {Object} Copy of the game state
 */
export function getGameState() {
  return { ...gameState };
}

/**
 * Pause the game
 */
export function pauseGame() {
  if (gameState.isPaused) return;

  gameState.isPaused = true;
  gameState.previousState = gameState.currentState;
  setGameState(GAME_STATES.PAUSED);
}

/**
 * Resume the game
 */
export function resumeGame() {
  if (!gameState.isPaused) return;

  gameState.isPaused = false;
  setGameState(gameState.previousState || GAME_STATES.PLAYING);
}

// Export the game state for readonly access
export { gameState };
