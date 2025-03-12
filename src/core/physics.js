import { GRAVITY, TERMINALVELOCITY } from './constants.js';

// Calculate next position based on velocity
export const calculateNextPosition = (position, velocity) => {
  return {
    x: position.x + velocity.x,
    y: position.y + velocity.y
  };
};

// Apply gravity to a velocity
export const applyGravity = (velocity, gravity = GRAVITY) => {
  return {
    x: velocity.x,
    y: velocity.y + gravity
  };
};

// Apply deceleration to horizontal movement
export const applyDeceleration = (velocity, deceleration) => {
  let newVelocityX = velocity.x;

  // Apply deceleration in opposite direction of movement
  newVelocityX += deceleration * -Math.sign(newVelocityX);

  // Stop completely if velocity is very small
  if (Math.abs(deceleration) > Math.abs(newVelocityX)) {
    newVelocityX = 0;
  }

  return {
    x: newVelocityX,
    y: velocity.y
  };
};

// Cap velocity within bounds
export const capVelocity = (velocity, maxHorizontal, maxUpward = maxHorizontal) => {
  let vx = velocity.x;
  let vy = velocity.y;

  // Cap horizontal velocity
  if (Math.abs(vx) > maxHorizontal) {
    vx = Math.sign(vx) * maxHorizontal;
  }

  // Cap vertical velocity
  if (-vy > maxUpward) {
    vy = -maxUpward;
  }
  if (vy > TERMINALVELOCITY) {
    vy = TERMINALVELOCITY;
  }

  return { x: vx, y: vy };
};

// Calculate bounce velocity
export const calculateBounce = (velocity, bounceFactor, direction) => {
  // direction can be 'horizontal' or 'vertical'
  if (direction === 'horizontal') {
    return {
      x: -velocity.x * bounceFactor,
      y: velocity.y
    };
  } else {
    return {
      x: velocity.x,
      y: -velocity.y * bounceFactor
    };
  }
};
