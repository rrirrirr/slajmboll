import { Event } from './events.js'
import { MAXVELOCITY, TERMINALVELOCITY, K } from './constants.js'

export default function Actor(
  pos,
  velocity,
  radius,
  rightBoundry,
  leftBoundry,
  ground,
  maxVelocity,
  resizeEvent
) {
  const _pos = pos || { x: 0, y: 0 };
  const _velocity = velocity || { x: 0, y: 0 };
  let _areaWidth = rightBoundry - leftBoundry;
  let _radius = radius; //collider
  let _realRadius = (_areaWidth / K) * radius;
  let _rightBoundry = rightBoundry;
  let _leftBoundry = leftBoundry;
  let _ground = ground;
  let _maxVelocity = (_areaWidth / K) * 0.1;
  let _wallIshugged = false;
  const _deacceleration = (_areaWidth / K) * 0.008;
  const _jumpAcceleration = 0.6;
  const _downwardAcceleration = 0.9;

  let _movements = [];

  const groundHitEvent = Event('ground hit');
  const wallHitEvent = Event('wall hit');

  const getSpeed = () => {
    return _velocity.x;
  };

  const addMovement = (movement) => {
    if (movement && typeof movement.next === 'function') {
      _movements.push(movement);
    }
  };

  const removeMovement = (movement) => {
    if (movement) {
      const index = _movements.indexOf(movement);
      if (index !== -1) {
        _movements.splice(index, 1);
      }
    }
  };

  const updateMovements = () => {
    _movements = _movements.filter((movement) => {
      if (!movement || typeof movement.next !== 'function') {
        return false;
      }

      try {
        const update = movement.next();

        if (update) {
          if (update.x !== undefined && !isNaN(update.x)) {
            _velocity.x += update.x;
          }
          if (update.y !== undefined && !isNaN(update.y)) {
            _velocity.y += update.y;
          }
        }

        // Keep movement if it hasn't ended
        return movement.ended ? !movement.ended() : true;
      } catch (error) {
        return false;
      }
    });
  };

  const updateVelocity = () => {
    // Apply deceleration (drag)
    _velocity.x += _deacceleration * -Math.sign(_velocity.x);

    // Cap horizontal velocity
    if (Math.abs(_velocity.x) > _maxVelocity) {
      _velocity.x = Math.sign(_velocity.x) * _maxVelocity;
    }

    // Stop completely if velocity is very small
    if (Math.abs(_deacceleration) > Math.abs(_velocity.x)) {
      _velocity.x = 0;
    }

    // Apply gravity
    _velocity.y += _downwardAcceleration;

    // Cap vertical velocity
    if (-_velocity.y > _maxVelocity) {
      _velocity.y = -_maxVelocity;
    }
    if (_velocity.y > TERMINALVELOCITY) {
      _velocity.y = TERMINALVELOCITY;
    }
  };

  const updatePosition = () => {
    // Calculate next position
    let nextPos = { x: _pos.x + _velocity.x, y: _pos.y + _velocity.y };
    let wasGrounded = _pos.y >= _ground;

    // Check ground collision
    if (nextPos.y > _ground) {
      nextPos.y = _ground;
      _velocity.y = 0;
      if (!wasGrounded) {
        // Only emit if we just landed
        groundHitEvent.emit();
      }
    }

    // Check left wall collision
    if (nextPos.x - _realRadius < _leftBoundry) {
      nextPos.x = _leftBoundry + _realRadius;
      _velocity.x = 0;
      wallHitEvent.emit(-1);
      _wallIshugged = true;
    }
    // Check right wall collision
    else if (nextPos.x + _realRadius > _rightBoundry) {
      nextPos.x = _rightBoundry - _realRadius;
      _velocity.x = 0;
      wallHitEvent.emit(1);
      _wallIshugged = true;
    }
    // No longer touching a wall
    else if (_wallIshugged) {
      _wallIshugged = false;
      wallHitEvent.emit(0);
    }

    // Update position
    _pos.x = nextPos.x;
    _pos.y = nextPos.y;
  };

  const setMaxVelocity = (velocity) => {
    _maxVelocity = (_areaWidth / K) * velocity;
  };

  const resetMaxVelocity = () => {
    _maxVelocity = (_areaWidth / K) * 0.1;
  };

  const update = () => {
    updateMovements();
    updateVelocity();
    updatePosition();
  };

  return {
    addMovement,
    removeMovement,
    update,
    groundHitEvent,
    wallHitEvent,
    pos: _pos,
    setMaxVelocity,
    resetMaxVelocity,
    _velocity,
    getSpeed,
    _downwardAcceleration,
    jumpAcceleration: _jumpAcceleration,
    ground: _ground,
    realRadius: _realRadius
  };
}
