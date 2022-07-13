//runs callback n frames or until terminated. Send 0 as parameter for continuous mode
// export function* frameCommand(frames, callback, termination, end = () => {}) {
//   // console.log('start command')
//   let continuous = frames === 0 ? true : false
//   yield true
//   while ((frames-- > 0 || continuous) && !termination()) {
//     // console.log('loop command')
//     yield callback()
//   }
//   // console.log('end command ' + ((false || true) && !termination()));
//   end()
//   return false
// }

// if (unit.runningDirection !== dir) {
//   unit.isRunning = true
//   unit.runningDirection = dir
//   unit.activeRun = frameCommand(
//     0,
//     () => dir * 0.5,
//     () => !unit.isRunning
//   )
//   if (Math.sign(unit.xvelocity) !== dir && Math.abs(unit.xvelocity) > 0.1) {
//     //check for direction change bonus. Move unit to own function?
//     unit.bonuses.push(unit.directionChangeBonus(dir, 15, 1.5, 0.1))
//   }
// }
// }

// const stopRun = (unit, dir) => {
//   if (unit.runningDirection === dir) {
//     unit.isRunning = false
//     unit.runningDirection = 0
//   }
// }

function Movement(move) {
  let _ended = false
  const next = () => {
    const result = move()
    if (result === false || result.x === false || result.y === false) {
      _ended = true
      return { x: 0, y: 0 }
    }
    return result
  }
  const ended = () => _ended
  return { next, ended }
}

export const startJump = (acceleration, killSignal, end) => {
  const fm = frameMovement(
    35,
    () => {
      return -acceleration
    },
    killSignal,
    end
  )
  return Movement(() => {
    return { x: 0, y: fm.next().value }
  })
}

export const startRun = (acceleration, direction, killSignal) => {
  const fm = frameMovement(0, () => direction * acceleration, killSignal)
  return Movement(() => {
    return { x: fm.next().value, y: 0 }
  })
  //   if (!result) {
  // 	_ended = true
  // 	return {x:0, y:0}
  //   }
  //   return result
  // }
  // const ended = () => _ended
  // return {next, ended}
}

export const startRunnew = (acceleration, direction, killSignal) => {
  const value = direction * acceleration
  return { value, next, ended }
}

export const startOppositeRun = (acceleration, direction, killSignal, end) => {
  const fm = frameMovement(10, () => direction * acceleration, killSignal, end)
  return Movement(() => {
    return { x: fm.next().value, y: 0 }
  })
}

export const bonusJump = (acceleration, killSignal, end = () => {}) => {
  const fm = frameMovement(15, () => -acceleration, killSignal, end)
  return Movement(() => {
    return { x: fm.next().value, y: 0 }
  })
}

export const startDash = (
  acceleration,
  direction,
  killSignal,
  end = () => {}
) => {
  const fm = frameMovement(115, () => direction * acceleration, killSignal, end)
  return Movement(() => {
    return { x: fm.next().value, y: 0 }
  })
}

export const startDashJump = (
  acceleration,
  direction,
  killSignal,
  end = () => {}
) => {
  console.log('dash jump')
  const fm = frameMovement(
    15,
    () => {
      return { x: direction * acceleration, y: -acceleration }
    },
    killSignal,
    end
  )
  return Movement(() => {
    return fm.next().value
    // return { x: fm.next().value, y: 0 }
  })
}

//runs callback n frames or until terminated. Send 0 as parameter for continuous mode
function* frameMovement(frames, callback, termination, end = () => {}) {
  // console.log('start command')
  const continuous = frames === 0 ? true : false
  let currentFrame = frames
  // yield true
  while ((currentFrame-- > 0 || continuous) && !termination()) {
    // if (!continuous) console.log(currentFrame)
    // console.log('loop command')
    yield callback()
  }
  console.log('move ended')
  // console.log('end command ' + ((false || true) && !termination()));
  end()
  return false
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
