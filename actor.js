import { Event } from './events.js'
import { MAXVELOCITY, TERMINALVELOCITY, K } from './constants.js'
// export const createActor = ({
//   pos,
//   velocity,
//   radius,
//   rightBoundry,
//   leftBoundry,
//   ground,
//   maxVelocity,
//   updateMovements,
// }) => ({
//   pos,
//   velocity,
//   radius,
//   rightBoundry,
//   leftBoundry,
//   ground,
//   maxVelocity,
//   updateMovements,
// })
export default function Actor(
  pos_,
  velocity,
  radius,
  rightBoundry,
  leftBoundry,
  ground,
  maxVelocity,
  resizeEvent
) {
  const pos = pos_
  const _velocity = velocity
  let areaWidth = rightBoundry - leftBoundry
  let _radius = radius //collider
  let realRadius = (areaWidth / K) * radius
  // console.log('rhadius ' + realRadius)
  let _rightBoundry = rightBoundry
  let _leftBoundry = leftBoundry
  let _ground = ground
  // let _maxVelocity = maxVelocity
  let _maxVelocity = (areaWidth / K) * 0.1
  const _isRunning = false
  const _isJumping = false
  let wallIshugged = false
  // const _acceleration = 0.55
  const _deacceleration = (areaWidth / K) * 0.006
  const _bonusAcceleration = 1
  const _jumpAcceleration = 0.5
  const _downwardAcceleration = 0.5

  let movements = []

  const setRunning = (val) => (_isRunning = val)
  const setJumping = (val) => (_isJumping = val)

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

  const addMovement = (movement) => {
    // console.log('adding movement')
    // console.log(movement)
    movements.push(movement)
    // console.log(movements)
  }

  const update = () => {
    updateMovements()
    updateVelocity()
    updatePosition()
  }

  const updateMovements = () => {
    // if (movements.length > 0) console.log(movements)
    movements = movements.filter((movement) => {
      const update = movement.next()
      _velocity.x += update.x
      _velocity.y += update.y
      if (movement.ended()) console.log('movement filtered')
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

    // _velocity.x += _acceleration.x
    // _velocity.y += _acceleration.y

    // if (_isRunning) _velocity.x += activeRun.next().value

    // _velocity.x += _isRunning //increase speed if we are holding a run button
    //   ? _acceleration * runningDirection * bonusAcceleration
    //   : _velocity.x === 0 //are we standing still?
    //   ? 0
    //   : Math.abs(_deacceleration) > Math.abs(_velocity.x) //will the deacceleration move us past stand still?
    //   ? -_velocity.x //bring us to stand still
    //   : _deacceleration * -Math.sign(_velocity.x) //deaccelerate

    // if (_isJumping) _velocity.y += activeJump.next().value

    // _velocity.y +=
    //   !_isJumping && pos.y !== _ground
    //     ? _downwardAcceleration //accelerate towards ground
    //     : 0
  }

  //returns new positions and velocities
  const updatePosition = () => {
    // pos.x += _velocity.x
    // pos.y += _velocity.y
    // console.log(_velocity)
    // create new velocity vector
    // let newV = {
    //   x:
    //     Math.abs(_velocity.x) > _maxVelocity
    //       ? Math.sign(_velocity.x) * _maxVelocity
    //       : _velocity.x,
    //   y: _velocity.y > TERMINALVELOCITY ? TERMINALVELOCITY : _velocity.y,
    // }

    // let newPos = {
    //   pos: { x: pos.x + newV.x, y: pos.y + newV.y },
    //   velocity: newV,
    // }

    let nextPos = { x: pos.x + _velocity.x, y: pos.y + _velocity.y }

    // let nextPos = newPos

    if (nextPos.y > _ground) {
      nextPos.y = _ground
      _velocity.y = 0
      groundHitEvent.emit()
    }

    if (nextPos.x - realRadius < _leftBoundry) {
      // console.log('wall hit')
      nextPos.x = _leftBoundry + realRadius
      _velocity.x = 0
      wallHitEvent.emit(-1)
			wallIshugged = true
    } else if (nextPos.x + realRadius > _rightBoundry) {
      // console.log('wall hit')
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

    // return nextPos
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

  return { addMovement, update, groundHitEvent, wallHitEvent, pos, setMaxVelocity, resetMaxVelocity, _velocity }
}
// const render = (go, pos, radius) => {
//   go.style.top = `${pos.y - radius}px`
//   go.style.left = `${pos.x - radius}px`
// }

// export const render = function (u, unitModifier = _ => _) {
// 	// let r = unitModifier(u);
// 	let r = u;
// 	r.go.style.top = `${r.ao.pos.y}px`;
// 	r.go.style.left = `${r.ao.pos.x}px`;
// };
