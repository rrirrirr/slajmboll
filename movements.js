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
    (frame) => {
      return -acceleration * ((frame ** 2) / 50)
    },
    killSignal,
    end
  )
  return Movement(() => {
    return { x: 0, y: fm.next().value }
  })
}

export const startWallJump = (
  acceleration,
  direction,
  killSignal,
  end = () => { }
) => {
  console.log('wall jump')
  const fm = frameMovement(
    35,
    (frame) => {
      console.log(direction * acceleration * ((frame ** 2) / 200))
      return { x: direction * acceleration * ((frame ** 2) / 20), y: -acceleration * ((frame ** 2) / 20) }
    },
    killSignal,
    end
  )
  return Movement(() => {
    return fm.next().value
  })
}

export const startRun = (acceleration, direction, killSignal) => {
  const fm = frameMovement(0, () => direction * acceleration, killSignal)
  return Movement(() => {
    return { x: fm.next().value, y: 0 }
  })

}

export const startRunnew = (acceleration, direction, killSignal) => {
  const value = direction * acceleration
  return { value, next, ended }
}

export const startOppositeRun = (acceleration, direction, killSignal, end) => {
  const fm = frameMovement(20, () => direction * acceleration, killSignal, end)
  return Movement(() => {
    return { x: fm.next().value, y: 0 }
  })
}

export const bonusJump = (acceleration, killSignal, end = () => { }) => {
  const fm = frameMovement(15, () => -acceleration, killSignal, end)
  return Movement(() => {
    return { x: fm.next().value, y: 0 }
  })
}

export const startDash = (
  acceleration,
  direction,
  killSignal,
  end = () => { }
) => {
  const fm = frameMovement(
    35,
    (frame) => {

      return direction * acceleration * ((frame * frame) / 3000)
    },
    killSignal,
    end
  )
  return Movement(() => {
    return { x: fm.next().value, y: 0 }
  })
}

export const startAirDash = (
  acceleration,
  direction,
  gravity,
  killSignal,
  end = () => { }
) => {
  const fm = frameMovement(
    35,
    (frame) => {

      console.log('air dashing')
      return { x: direction * acceleration * ((frame * frame) / 3000), y: -gravity }
    },
    killSignal,
    end
  )
  return Movement(() => {
    return fm.next().value
  })
}


export const startDashJump = (
  acceleration,
  direction,
  killSignal,
  end = () => { }
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

  })
}

export const startStomp = (acceleration, killSignal, end = () => { }) => {
  console.log('stomp')
  const fm = frameMovement(
    0,
    () => {
      return { x: 0, y: acceleration }
    },
    killSignal,
    end
  )
  return Movement(() => {
    return fm.next().value

  })
}

//runs callback n frames or until terminated. Send 0 as parameter for continuous mode
function* frameMovement(frames, callback, termination, end = () => { }) {

  const continuous = frames === 0 ? true : false
  let currentFrame = frames

  while ((currentFrame-- > 0 || continuous) && !termination()) {

    yield callback(currentFrame)
  }

  end(currentFrame)
  return false
}

function* directionChangeBonus(unit, direction, frames, bonus, decrease) {
  let inc = bonus
  yield true
  unit.bonusAcceleration += bonus
  while (frames-- > 0 && unit.runningDirection === direction) {
    unit.bonusAcceleration -= decrease
    inc -= decrease
    yield true
  }
  unit.bonusAcceleration -= inc
  return false
}
