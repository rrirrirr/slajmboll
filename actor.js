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
  const _deacceleration = (_areaWidth / K) * 0.006;
  const _jumpAcceleration = 0.5;
  const _downwardAcceleration = 0.5;

  let _movements = [];

  const groundHitEvent = Event('ground hit');
  const wallHitEvent = Event('wall hit');

  const getSpeed = () => {
    return _velocity.x;
  };

  const addMovement = (movement) => {
    _movements.push(movement);
  };

  const updateMovements = () => {
    _movements = _movements.filter((movement) => {
      if (!movement || typeof movement.next !== 'function') {
        console.error('Invalid movement', movement);
        return false;
      }

      try {
        const update = movement.next();

        if (update) {
          if (update.x !== undefined) _velocity.x += update.x;
          if (update.y !== undefined) _velocity.y += update.y;
        }

        return movement.ended ? !movement.ended() : false;
      } catch (error) {
        console.error('Error in movement update:', error);
        return false;
      }
    });
  };

  const updateVelocity = () => {
    _velocity.x += _deacceleration * -Math.sign(_velocity.x);

    if (Math.abs(_velocity.x) > _maxVelocity) {
      _velocity.x = Math.sign(_velocity.x) * _maxVelocity;
    }

    if (Math.abs(_deacceleration) > Math.abs(_velocity.x)) {
      _velocity.x = 0;
    }

    _velocity.y += _downwardAcceleration;
    if (-_velocity.y > _maxVelocity) _velocity.y = -_maxVelocity;
    if (_velocity.y > TERMINALVELOCITY) _velocity.y = TERMINALVELOCITY;
  };

  const updatePosition = () => {
    let nextPos = { x: _pos.x + _velocity.x, y: _pos.y + _velocity.y };

    if (nextPos.y > _ground) {
      nextPos.y = _ground;
      _velocity.y = 0;
      groundHitEvent.emit();
    }

    if (nextPos.x - _realRadius < _leftBoundry) {
      nextPos.x = _leftBoundry + _realRadius;
      _velocity.x = 0;
      wallHitEvent.emit(-1);
      _wallIshugged = true;
    } else if (nextPos.x + _realRadius > _rightBoundry) {
      nextPos.x = _rightBoundry - _realRadius;
      _velocity.x = 0;
      wallHitEvent.emit(1);
      _wallIshugged = true;
    } else if (_wallIshugged) {
      _wallIshugged = false;
      wallHitEvent.emit(0);
    }

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
