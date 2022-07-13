import { Event } from './events.js'

const createSlime = ({ color }) => {
  const slime = document.createElement('div')
  slime.classList.add('slime')
  slime.style.backgroundColor = color
  return slime
}

const cleanKey = (key) => {
    return key.replace(/Digit|Arrow|Key/, '')
}

const waitingScreen = (num, team, keys)=> {
  const teamSwitchEvent = Event('team switch')
  const container = document.createElement('div')
  container.classList.add('teamTextContainer')

  const nameContainer = document.createElement('div')
  const name = document.createElement('b')
  nameContainer.classList.add('nameContainer')
  name.classList.add('name')
  name.innerHTML = `PLAYER ${num}`
  // nameContainer.appendChild(name)
  // container.appendChild(nameContainer)

  const teamLine = document.createElement('div')
  const team1 = document.createElement('span')
  const team2 = document.createElement('span')
  team1.innerHTML = 'TEAM GOLD'
  team2.innerHTML = 'TEAM CRIM'
  team1.classList.add('teamText')
  team2.classList.add('teamText')
  if (team === 1) {
    team1.classList.add('teamOne')
    team2.classList.remove('teamTwo')
  } else {
    team1.classList.remove('teamOne')
    team2.classList.add('teamTwo')
  }
  // teamLine.appendChild(team1)
  // teamLine.appendChild(team2)
  // container.appendChild(teamLine)

  nameContainer.appendChild(team1)
  nameContainer.appendChild(name)
  nameContainer.appendChild(team2)
  container.appendChild(nameContainer)

  team1.onclick = () => teamSwitch(1)
  team2.onclick = () => teamSwitch(2)
  // continer.style.backgroundColor = color

  const buttonLineOne = document.createElement('div')
  const up = document.createElement('button')
  up.innerHTML = cleanKey(keys.up)
  buttonLineOne.appendChild(up)

  const buttonLineTwo = document.createElement('div')
  const left = document.createElement('button')
  left.innerHTML = cleanKey(keys.left)
  const down = document.createElement('button')
  down.innerHTML = cleanKey(keys.down)
  const right = document.createElement('button')
  right.innerHTML = cleanKey(keys.right)
  buttonLineTwo.appendChild(left)
  buttonLineTwo.appendChild(down)
  buttonLineTwo.appendChild(right)

  container.appendChild(buttonLineOne)
  container.appendChild(buttonLineTwo)

  const teamSwitch = (team) => {
    if (team === 1) {
      team1.classList.add('teamOne')
      team2.classList.remove('teamTwo')
      teamSwitchEvent.emit(1)
    } else {
      team1.classList.remove('teamOne')
      team2.classList.add('teamTwo')
      teamSwitchEvent.emit(2)
    }
  }

  return { screen: container, teamSwitchEvent }
}

export { createSlime, waitingScreen }
