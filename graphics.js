import { Event } from './events.js'
import { changeKeyPrompt, cleanKey } from './keys.js'

const createSlime = ({ color }) => {
  const slime = document.createElement('div')
  slime.classList.add('slime')
  slime.style.backgroundColor = color
  return slime
}

const waitingScreen = (num, team = 0, keys, playerIndex) => {
  const teamSwitchEvent = Event(`team_switch_player${playerIndex}`);

  // Main player container
  const container = document.createElement('div');
  container.classList.add('playerContainer');
  container.dataset.playerIndex = playerIndex; // Add data attribute for identification

  // Player name
  const playerLabel = document.createElement('div');
  playerLabel.classList.add('playerLabel');
  playerLabel.textContent = `P${num}`;
  container.appendChild(playerLabel);

  // Controls with team arrows
  const controlsContainer = document.createElement('div')
  controlsContainer.classList.add('controlsContainer')

  // Left team selector
  const teamLeftSelector = document.createElement('span')
  teamLeftSelector.classList.add('teamSelector', 'teamLeftSelector')
  teamLeftSelector.innerHTML = '<'
  controlsContainer.appendChild(teamLeftSelector)

  // Panel background for keys
  const keysPanelContainer = document.createElement('div')
  keysPanelContainer.classList.add('keysPanelContainer')

  // Keys container inside panel
  const keysContainer = document.createElement('div')
  keysContainer.classList.add('keysContainer')

  // Top row (up key)
  const buttonLineOne = document.createElement('div')
  buttonLineOne.classList.add('buttonLine')

  // Empty slot for alignment
  const emptyLeft = document.createElement('div')
  emptyLeft.classList.add('keySlot')

  const up = document.createElement('button')
  up.textContent = cleanKey(keys.up)
  up.classList.add('keyButton')
  // Add click handler for key binding
  up.addEventListener('click', (e) => {
    e.stopPropagation();
    changeKeyPrompt(`p${num}up`, up);
  });

  // Empty slot for alignment
  const emptyRight = document.createElement('div')
  emptyRight.classList.add('keySlot')

  buttonLineOne.appendChild(emptyLeft)
  buttonLineOne.appendChild(up)
  buttonLineOne.appendChild(emptyRight)

  // Bottom row (left, down, right keys)
  const buttonLineTwo = document.createElement('div')
  buttonLineTwo.classList.add('buttonLine')

  const left = document.createElement('button')
  left.textContent = cleanKey(keys.left)
  left.classList.add('keyButton')
  // Add click handler for key binding
  left.addEventListener('click', (e) => {
    e.stopPropagation();
    changeKeyPrompt(`p${num}left`, left);
  });

  const down = document.createElement('button')
  down.textContent = cleanKey(keys.down)
  down.classList.add('keyButton')
  // Add click handler for key binding
  down.addEventListener('click', (e) => {
    e.stopPropagation();
    changeKeyPrompt(`p${num}down`, down);
  });

  const right = document.createElement('button')
  right.textContent = cleanKey(keys.right)
  right.classList.add('keyButton')
  // Add click handler for key binding
  right.addEventListener('click', (e) => {
    e.stopPropagation();
    changeKeyPrompt(`p${num}right`, right);
  });

  buttonLineTwo.appendChild(left)
  buttonLineTwo.appendChild(down)
  buttonLineTwo.appendChild(right)

  // Build structure
  keysContainer.appendChild(buttonLineOne)
  keysContainer.appendChild(buttonLineTwo)
  keysPanelContainer.appendChild(keysContainer)
  controlsContainer.appendChild(keysPanelContainer)

  // Right team selector
  const teamRightSelector = document.createElement('span')
  teamRightSelector.classList.add('teamSelector', 'teamRightSelector')
  teamRightSelector.innerHTML = '>'
  controlsContainer.appendChild(teamRightSelector)

  container.appendChild(controlsContainer)

  // Set initial team if provided
  if (team === 1) {
    container.classList.add('teamOne')
    playerLabel.classList.add('teamOneText')
  } else if (team === 2) {
    container.classList.add('teamTwo')
    playerLabel.classList.add('teamTwoText')
  }

  const teamSwitch = (newTeam) => {
    if (newTeam === 1) {
      container.classList.add('teamOne');
      container.classList.remove('teamTwo');
      playerLabel.classList.add('teamOneText');
      playerLabel.classList.remove('teamTwoText');
      teamSwitchEvent.emit(1);
    } else if (newTeam === 2) {
      container.classList.add('teamTwo');
      container.classList.remove('teamOne');
      playerLabel.classList.add('teamTwoText');
      playerLabel.classList.remove('teamOneText');
      teamSwitchEvent.emit(2);
    }
  };

  // Add click handlers
  teamLeftSelector.addEventListener('click', () => teamSwitch(1))
  teamRightSelector.addEventListener('click', () => teamSwitch(2))

  return { screen: container, teamSwitchEvent }
}

// Create the "Add Player" button
const createAddPlayerButton = (callback) => {
  const button = document.createElement('div')
  button.classList.add('addPlayerButton')
  button.textContent = 'Press B to Add Player'
  button.addEventListener('click', callback)
  return button
}

// Create team headers
const createTeamHeaders = () => {
  const container = document.createElement('div')
  container.classList.add('teamHeadersContainer')

  const teamGold = document.createElement('div')
  teamGold.classList.add('teamHeader', 'teamGoldHeader')
  teamGold.textContent = 'TEAM GOLD'

  const teamCrim = document.createElement('div')
  teamCrim.classList.add('teamHeader', 'teamCrimHeader')
  teamCrim.textContent = 'TEAM CRIM'

  container.appendChild(teamGold)
  container.appendChild(teamCrim)

  return container
}

export { createSlime, waitingScreen, createAddPlayerButton, createTeamHeaders }
