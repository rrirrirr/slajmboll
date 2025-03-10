import { Event } from './events.js';

// Game state events
const gameStateChangeEvent = Event('game_state_change');
const teamChangeEvent = Event('team_change');

// Initial game state
const gameState = {
  isPlaying: false,
  isSetup: true,
  players: [],
  teams: {
    team1Count: 0, // Gold team
    team2Count: 0  // Crimson team
  }
};

// Methods to manipulate game state
function setGamePlaying(isPlaying) {
  gameState.isPlaying = isPlaying;
  gameStateChangeEvent.emit({ type: 'playing_change', value: isPlaying });
}

function setGameSetup(isSetup) {
  gameState.isSetup = isSetup;
  gameStateChangeEvent.emit({ type: 'setup_change', value: isSetup });
}

// Add a player to the state
function addPlayer(playerData) {
  gameState.players.push(playerData);
  gameStateChangeEvent.emit({ type: 'player_added', player: playerData });
  return gameState.players.length - 1; // Return the index
}

// Update a player's team
function updatePlayerTeam(playerIndex, team) {
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

    // Emit event
    teamChangeEvent.emit({
      playerIndex,
      oldTeam,
      newTeam: team,
      teams: { ...gameState.teams }
    });

    // Also emit the general state change event
    gameStateChangeEvent.emit({
      type: 'team_change',
      playerIndex,
      team,
      teams: { ...gameState.teams }
    });
  }
}

// Check if all game start conditions are met
function canStartGame() {
  // Need at least 2 players
  if (gameState.players.length < 2) return false;

  // Each team must have at least one player
  if (gameState.teams.team1Count < 1 || gameState.teams.team2Count < 1) return false;

  // All players must have chosen a team
  const unassignedPlayers = gameState.players.filter(player => player.team === 0);
  if (unassignedPlayers.length > 0) return false;

  return true;
}

// Get players for a specific team
function getTeamPlayers(teamNumber) {
  return gameState.players.filter(player => player.team === teamNumber);
}

// Reset the game state
function resetGameState() {
  gameState.isPlaying = false;
  gameState.isSetup = true;
  gameState.players = [];
  gameState.teams.team1Count = 0;
  gameState.teams.team2Count = 0;
  gameStateChangeEvent.emit({ type: 'reset' });
}

export {
  gameState,
  gameStateChangeEvent,
  teamChangeEvent,
  setGamePlaying,
  setGameSetup,
  addPlayer,
  updatePlayerTeam,
  canStartGame,
  getTeamPlayers,
  resetGameState
};
