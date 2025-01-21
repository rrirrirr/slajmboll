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
  const _pos = pos
  const _velocity = velocity
  let _areaWidth = rightBoundry - leftBoundry
  let _radius = radius //collider
  let _realRadius = (areaWidth / K) * radius
  let _rightBoundry = rightBoundry
  let _leftBoundry = leftBoundry
  let _ground = ground
  let _maxVelocity = (areaWidth / K) * 0.1
  const _isRunning = false
  const _isJumping = false
  let _wallIshugged = false
  const _deacceleration = (areaWidth / K) * 0.006
  const _bonusAcceleration = 1
  const _jumpAcceleration = 0.5
  const _downwardAcceleration = 0.5

  let _movements = []

  const setBoundaries = (boundaries) => {
    const newRadius = (areaWidth / K) * radius
    _rightBoundry = boundaries.rightBoundry - newRadius || _rightBoundry
    _leftBoundry = boundaries.leftBoundry + newRadius || _leftBoundry
    _ground = boundaries.ground || _ground
  }

  const setMaxVelocity = (velocity) => {
    _maxVelocity = (areaWidth / K) * velocity
  }
  const resetMaxVelocity = () => {
    _maxVelocity = (areaWidth / K) * 0.1
  }

  const groundHitEvent = Event('ground hit')
  const wallHitEvent = Event('wall hit')

  const getSpeed = () => {
    return _velocity.x
  }

  const addMovement = (movement) => {
    movements.push(movement)
  }

  const update = () => {
    updateMovements()
    updateVelocity()
    updatePosition()
  }

  const updateMovements = () => {
    movements = movements.filter((movement) => {
      const update = movement.next()
      _velocity.x += update.x
      _velocity.y += update.y
      return !movement.ended()
    })
  }

  const updateVelocity = () => {
    _velocity.x += _deacceleration * -Math.sign(_velocity.x)
    if (Math.abs(_velocity.x) > _maxVelocity)
      _velocity.x = Math.sign(_velocity.x) * _maxVelocity

    if (Math.abs(_deacceleration) > Math.abs(_velocity.x)) {
      _velocity.x = 0
    }

    _velocity.y += _downwardAcceleration
    if (-_velocity.y > _maxVelocity) _velocity.y = -_maxVelocity
    if (_velocity.y > TERMINALVELOCITY) _velocity.y = TERMINALVELOCITY

  }

  //returns new positions and velocities
  const updatePosition = () => {
    let nextPos = { x: pos.x + _velocity.x, y: pos.y + _velocity.y }


    if (nextPos.y > _ground) {
      nextPos.y = _ground
      _velocity.y = 0
      groundHitEvent.emit()
    }

    if (nextPos.x - realRadius < _leftBoundry) {
      nextPos.x = _leftBoundry + realRadius
      _velocity.x = 0
      wallHitEvent.emit(-1)
      wallIshugged = true
    } else if (nextPos.x + realRadius > _rightBoundry) {

      nextPos.x = _rightBoundry - realRadius
      _velocity.x = 0
      wallHitEvent.emit(1)
      wallIshugged = true
    } else if (wallIshugged) {
      wallIshugged = false
      wallHitEvent.emit(0)
    }
    pos.x = nextPos.x
    pos.y = nextPos.y
  }

  const _onResize = (boundaries) => {
    const oldAreaWidth = areaWidth
    areaWidth = boundaries.rightBoundry - boundaries.leftBoundry
    const areaChange = areaWidth / oldAreaWidth
    pos.x = pos.x * areaChange
    realRadius = (areaWidth / K) * radius
    _rightBoundry = boundaries.rightBoundry || _rightBoundry
    _leftBoundry = boundaries.leftBoundry || _leftBoundry
    _ground = boundaries.ground || _ground
    _maxVelocity = (areaWidth / K) * 0.1
  }

  resizeEvent.subscribe(_onResize)

  return {
    addMovement,
    update,
    groundHitEvent,
    wallHitEvent,
    pos,
    setMaxVelocity,
    resetMaxVelocity,
    _velocity,
    getSpeed,
    _downwardAcceleration,
  }
}
