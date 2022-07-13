import { GROUND } from './constants.js'

const events = Map()

function Event('name') {
  const _name = name
  const _observers

  const subscribe = (cb) => {
    _observers.add(cb)
    events.set(_name, cb)

    const unsubscribe = () => {
      _observers.remove(cb)
      events.delete(_name)
    }

		return {unsubscribe}
  }

  const emit = (data) => {
  	_observers.forEach((cb) => {
  		cb(data)
  	})
  }

	return {subscribe, emit }
}

const jump = Event('jump')

export const jumpCommand = (unit) => {
  return {
    execute: () => jump.emit(unit),
    release: () => stopJump.emit(unit),
  }
}

// export const jump = (unit) => {
//   return {
//     execute: () => startJump(unit),
//     release: () => stopJump(unit),
//   }
// }

//issue a run of specific length with a direction
//if length is 0 the command will run indefinitely (until canceled)
export const runCommand = (unit, dir, length) => {
  return {
    execute: () => startRun(unit, dir, length),
    release: () => stopRun(unit, dir),
  }
}

export const moveCommand = (unit, x, y) => {
  return {
    execute: () => moveUnit(unit, x, y),
    release: () => {},
  }
}

export const toggleCommand = (go, displayType = 'block') => {
  return {
    execute: () => toggleHidden(go, displayType),
    release: () => {},
  }
}

//runs callback n frames or until terminated. Send 0 as parameter for continuous mode
export function* frameCommand(frames, callback, termination, end = () => {}) {
  // console.log('start command')
  let continuous = frames === 0 ? true : false
  yield true
  while ((frames-- > 0 || continuous) && !termination()) {
    // console.log('loop command')
    yield callback()
  }
  // console.log('end command ' + ((false || true) && !termination()));
  end()
  return false
}

const startRun = (unit, dir, length = 0) => {
  if (unit.runningDirection !== dir) {
    unit.isRunning = true
    unit.runningDirection = dir
    unit.activeRun = frameCommand(
      0,
      () => dir * 0.5,
      () => !unit.isRunning
    )
    if (Math.sign(unit.xvelocity) !== dir && Math.abs(unit.xvelocity) > 0.1) {
      //check for direction change bonus. Move unit to own function?
      unit.bonuses.push(unit.directionChangeBonus(dir, 15, 1.5, 0.1))
    }
  }
}

const stopRun = (unit, dir) => {
  if (unit.runningDirection === dir) {
    unit.isRunning = false
    unit.runningDirection = 0
  }
}

const startJump = (unit) => {
  if (isGrounded(unit.ao)) {
    unit.isJumping = true
    unit.activeJump = frameCommand(
      15,
      () => -unit.jumpAcceleration,
      () => !unit.isJumping,
      () => (unit.isJumping = false)
    )
  }
}

const isGrounded = (ao) => ao.pos.y === ao.ground

const stopJump = (unit) => {
  unit.isJumping = false
}

const moveUnit = (unit, x, y) => {
  unit.apo.pos = { x: x, y: y }
}

function* directionChangeBonus(unit, direction, frames, bonus, decrease) {
  let inc = bonus
  yield true
  unit.bonusAcceleration += bonus
  while (frames-- > 0 && unit.runningDirection === direction) {
    // console.log('bonusloop ' + frames)
    unit.bonusAcceleration -= decrease
    inc -= decrease
    yield true
  }
  unit.bonusAcceleration -= inc
  return false
}
