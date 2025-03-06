import { GROUND } from './constants.js'
import { Event, events } from './events.js'

// Create event only once
const jumpEvent = Event('jump');
const stopJumpEvent = Event('stopJump');

export const jumpCommand = (unit) => {
  return {
    execute: () => jumpEvent.emit(unit),
    release: () => stopJumpEvent.emit(unit),
  }
}

// Export the run command
export const runCommand = (unit, dir, length) => {
  return {
    execute: () => startRun(unit, dir, length),
    release: () => stopRun(unit, dir),
  }
}

export const moveCommand = (unit, x, y) => {
  return {
    execute: () => moveUnit(unit, x, y),
    release: () => { },
  }
}

export const toggleCommand = (go, displayType = 'block') => {
  return {
    execute: () => toggleHidden(go, displayType),
    release: () => { },
  }
}

//runs callback n frames or until terminated. Send 0 as parameter for continuous mode
export function* frameCommand(frames, callback, termination, end = () => { }) {
  let continuous = frames === 0 ? true : false;
  yield true;
  while ((frames-- > 0 || continuous) && !termination()) {
    yield callback();
  }
  end();
  return false;
}

const startRun = (unit, dir, length = 0) => {
  if (unit.runningDirection !== dir) {
    unit.isRunning = true;
    unit.runningDirection = dir;
    unit.activeRun = frameCommand(
      0,
      () => dir * 0.5,
      () => !unit.isRunning
    );
    if (Math.sign(unit.velocity?.x || 0) !== dir && Math.abs(unit.velocity?.x || 0) > 0.1) {
      //check for direction change bonus. Move unit to own function?
      unit.bonuses = unit.bonuses || [];
      unit.bonuses.push(directionChangeBonus(unit, dir, 15, 1.5, 0.1));
    }
  }
}

const stopRun = (unit, dir) => {
  if (unit.runningDirection === dir) {
    unit.isRunning = false;
    unit.runningDirection = 0;
  }
}

const startJump = (unit) => {
  if (isGrounded(unit)) {
    unit.isJumping = true;
    unit.activeJump = frameCommand(
      15,
      () => -unit.jumpAcceleration,
      () => !unit.isJumping,
      () => (unit.isJumping = false)
    );
  }
}

const isGrounded = (unit) => {
  return unit.pos.y >= unit.ground;
}

const stopJump = (unit) => {
  unit.isJumping = false;
}

const moveUnit = (unit, x, y) => {
  unit.pos.x = x;
  unit.pos.y = y;
}

function* directionChangeBonus(unit, direction, frames, bonus, decrease) {
  let inc = bonus;
  yield true;
  unit.bonusAcceleration = unit.bonusAcceleration || 0;
  unit.bonusAcceleration += bonus;
  while (frames-- > 0 && unit.runningDirection === direction) {
    unit.bonusAcceleration -= decrease;
    inc -= decrease;
    yield true;
  }
  unit.bonusAcceleration -= inc;
  return false;
}

// Export functions for use in other files
export { startJump, isGrounded };
