function Movement(move) {
  let _ended = false
  const next = () => {
    try {
      const result = move()
      if (result === false || result.x === false || result.y === false) {
        _ended = true
        return { x: 0, y: 0 }
      }
      return result
    } catch (error) {
      console.error("Error in movement:", error)
      _ended = true
      return { x: 0, y: 0 }
    }
  }
  const ended = () => _ended
  return { next, ended }
}

export const startJump = (acceleration, killSignal, end) => {
  const jumpPower = acceleration * 10;

  let frameCount = 0;
  const maxFrames = 20;
  const minFrames = 6;

  const fm = frameMovement(
    maxFrames,
    (frame) => {
      frameCount++;

      // Upward force that decreases linearly
      const strength = -jumpPower * (1 - (frameCount / maxFrames) * 0.6);
      return strength;
    },
    () => {
      return killSignal() && frameCount >= minFrames;
    },
    end
  );

  return Movement(() => {
    const yValue = fm.next().value;
    return { x: 0, y: yValue };
  });
};

export const startWallJump = (
  acceleration,
  direction,
  killSignal,
  end = () => { }
) => {
  const jumpPower = acceleration * 8;
  const horizontalFactor = 0.2;

  const fm = frameMovement(
    20,
    (frame) => {
      const framePercent = frame / 20;
      // Minimal horizontal force, normal vertical
      const horizontalForce = direction * jumpPower * horizontalFactor * framePercent;
      const verticalForce = -jumpPower * framePercent;

      return {
        x: horizontalForce,
        y: verticalForce
      };
    },
    killSignal,
    end
  );

  return Movement(() => {
    return fm.next().value;
  });
};

export const startDirectionChangeJump = (acceleration, direction, killSignal, end = () => { }) => {
  const jumpPower = acceleration * 9.6;

  const fm = frameMovement(
    25,
    (frame) => {
      const framePercent = frame / 25;

      return {
        x: 0,
        y: -jumpPower * framePercent
      };
    },
    killSignal,
    end
  );

  return Movement(() => {
    return fm.next().value;
  });
};

// Standard run function
export const startRun = (acceleration, direction, killSignal) => {
  return Movement(() => {
    if (killSignal()) {
      return false;
    }
    return { x: direction * acceleration, y: 0 };
  });
};

export const startOppositeRun = (acceleration, direction, killSignal, end) => {
  let framesLeft = 20;

  return Movement(() => {
    if (killSignal() || framesLeft <= 0) {
      end();
      return false;
    }

    framesLeft--;
    return { x: direction * acceleration, y: 0 };
  });
};

function* frameMovement(frames, callback, termination, end = () => { }) {
  let currentFrame = frames;

  try {
    while (currentFrame > 0 && !termination()) {
      yield callback(currentFrame);
      currentFrame--;
    }
  } finally {
    if (typeof end === 'function') {
      end(currentFrame);
    }
  }

  return false;
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
