import { Event } from './events.js';

// Game state constants
export const GAME_STATES = {
  SETUP: 'setup',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  SCORING: 'scoring',
  GAME_OVER: 'game_over'
};

// Game events
export const stateChangeEvent = Event('game_state_change');
export const teamChangeEvent = Event('team_change');
export const roundStartEvent = Event('round_start');
export const roundEndEvent = Event('round_end');
export const countdownStartEvent = Event('countdown_start');
export const countdownEndEvent = Event('countdown_end');

// Game state
const gameState = {
  currentState: GAME_STATES.SETUP,
  isPlaying: false,
  isSetup: true,
  activeCountdown: null,
  players: [],
  teams: {
    team1Count: 0, // Gold team
    team2Count: 0  // Crimson team
  },
  score: [0, 0]
};

// State change methods
export const setGameState = (newState) => {
  const oldState = gameState.currentState;
  gameState.currentState = newState;

  // Update isPlaying flag
  if (newState === GAME_STATES.PLAYING) {
    gameState.isPlaying = true;
  } else if (newState === GAME_STATES.SETUP || newState === GAME_STATES.GAME_OVER) {
    gameState.isPlaying = false;
  }

  stateChangeEvent.emit({
    oldState,
    newState,
    type: 'state_change'
  });
};

export const setGamePlaying = (isPlaying) => {
  gameState.isPlaying = isPlaying;
  stateChangeEvent.emit({
    type: 'playing_change',
    value: isPlaying
  });
};

export const setGameSetup = (isSetup) => {
  gameState.isSetup = isSetup;
  stateChangeEvent.emit({
    type: 'setup_change',
    value: isSetup
  });
};

export const setActiveCountdown = (countdown) => {
  gameState.activeCountdown = countdown;
};

// Player management
export const addPlayer = (playerData) => {
  gameState.players.push(playerData);
  stateChangeEvent.emit({
    type: 'player_added',
    player: playerData
  });
  return gameState.players.length - 1; // Return the index
};

export const updatePlayerTeam = (playerIndex, team) => {
  if (playerIndex >= 0 && playerIndex < gameState.players.length) {
    const oldTeam = gameState.players[playerIndex].team;

    // Update counts if team is changing
    if (oldTeam !== team) {
      if (oldTeam === 1) gameState.teams.team1Count--;
      if (oldTeam === 2) gameState.teams.team2Count--;

      if (team === 1) gameState.teams.team1Count++;
      if (team === 2) gameState.teams.team2Count++;
    }

    // Update player's team
    gameState.players[playerIndex].team = team;

    // Emit events
    teamChangeEvent.emit({
      playerIndex,
      oldTeam,
      newTeam: team,
      teams: { ...gameState.teams }
    });

    stateChangeEvent.emit({
      type: 'team_change',
      playerIndex,
      team,
      teams: { ...gameState.teams }
    });
  }
};

// Game state utilities
export const canStartGame = () => {
  // Need at least 2 players
  if (gameState.players.length < 2) return false;

  // Each team must have at least one player
  if (gameState.teams.team1Count < 1 || gameState.teams.team2Count < 1) return false;

  // All players must have chosen a team
  const unassignedPlayers = gameState.players.filter(player => player.team === 0);
  if (unassignedPlayers.length > 0) return false;

  return true;
};

export const getTeamPlayers = (teamNumber) => {
  return gameState.players.filter(player => player.team === teamNumber);
};

export const updateScore = (teamIndex, points) => {
  gameState.score[teamIndex] = points;
  stateChangeEvent.emit({
    type: 'score_change',
    teamIndex,
    score: [...gameState.score]
  });
};

export const resetGameState = () => {
  gameState.currentState = GAME_STATES.SETUP;
  gameState.isPlaying = false;
  gameState.isSetup = true;
  gameState.players = [];
  gameState.teams.team1Count = 0;
  gameState.teams.team2Count = 0;
  gameState.score = [0, 0];
  stateChangeEvent.emit({ type: 'reset' });
};

export { gameState };
