import { K } from './constants.js'
import Actor from './actor.js'
import { createSlime } from './graphics.js'
import { Animation } from './Animations.js'
import { events } from './events.js'
import {
  startJump,
  startOppositeRun,
  startRun,
  startDash,
  startAirDash,
  startDashJump,
  startWallJump,
  startStomp,
} from './movements.js'

export function Slime(
  team,
  teamNumber,
  pos,
  appearance,
  dimensions,
  constraints,
  game,
  keys
) {
  const delayedActions = events.get('delayed actions')
  const animations = events.get('animations')
  // const ao = actor() //actor object
  // const go =  //graphical object
  let _team = team

  const _played = true
  const _appearance = appearance

  // let areaWidth = constraints.rightBoundry - constraints.leftBoundry
  // let radius = dimensions.radius
  // let slimeWidth = (areaWidth / K) * radius * 2
  // let slimeHeight = (areaWidth / K) * radius

  // let _runAcceleration = (areaWidth / K) * 0.012
  // let _bonusStart = (areaWidth / K) * 0.028
  // let _dashAcceleration = (areaWidth / K) * 0.052
  // let bonusTreshold = _runAcceleration * 5
  // let _runDeacceleration =(areaWidth/K)*0.008

  const setupConstants = (constraints) => {
    areaWidth = constraints.rightBoundry - constraints.leftBoundry
    radius = dimensions.radius
    slimeWidth = (areaWidth / K) * radius * 2
    slimeHeight = (areaWidth / K) * radius
    _runAcceleration = (areaWidth / K) * 0.012
    _bonusStart = _runAcceleration * 2
    _dashAcceleration = (areaWidth / K) * 0.052
    bonusTreshold = _runAcceleration * 5
    // let _runDeacceleration =(areaWidth/K)*0.008
  }

  let areaWidth,
    radius,
    slimeWidth,
    slimeHeight,
    _runAcceleration,
    _bonusStart,
    _dashAcceleration,
    bonusTreshold,
    _runDeacceleration
  setupConstants(constraints)

  let _bonusAcceleration = 1
  let _jumpAcceleration = 0.1
  let _bonusJumpAcceleration = _jumpAcceleration * 2.0
  let _dashJumpAcceleration = 0.5
  let _downwardAcceleration = 0.5

  const _bonuses = []
  let _isRunning = false
  let _runningLeft = false
  let _runningRight = false
  let _runningDirection = 0
  let _isJumping = false
  let _isDucking = false
  let _isDashing = false
  let _isGrounded = true
  let _hasDirectionChangeBonus = false
  let _isHuggingWall = 0
  let _hasWallJump = true

  let _dashCD = false

  // const _activeJump = false
  // const _activeRun = null
  let ao = Actor(
    pos,
    { x: 0, y: 0 }, // velocity,
    dimensions.radius, // radius,
    constraints.rightBoundry, // rightBoundry,
    constraints.leftBoundry, // leftBoundry,
    constraints.ground, // ground,
    constraints.maxVelocity, // maxVelocity
    game.sizeChange
  )

  //  const newSlime = document.createElement("div");
  const go = createSlime(appearance)
  go.style.width = `${slimeWidth}px`
  go.style.height = `${slimeHeight}px`
  // console.log(go)
  game.go.appendchild(go)
  //

  const _onjumppressed = () => {
    // console.log('jump ')
    if (_isjumping) return
    if (_isgrounded) {
      _isjumping = true
      _isgrounded = false
      if (_isdashing) {
        ao.addmovement(
          startdashjump(
            _dashacceleration,
            _runningdirection,
            () => !_isjumping,
            // () => (_isjumping = false)
            () => false
          )
        )
      } else if (_isducking) {
        console.log('duck jump')
        ao.setmaxvelocity(1.5)
        ao.addmovement(
          startjump(
            _jumpacceleration,
            () => false,
            // () => (_isjumping = false)
            () => ao.resetmaxvelocity()
          )
        )
      } else if (_hasdirectionchangebonus) {
        console.log('bonus jump')
        ao.setmaxvelocity(2.2)
        ao.addmovement(
          startjump(
            _bonusjumpacceleration,
            () => false,
            // () => (_isjumping = false)
            () => ao.resetmaxvelocity()
          )
        )
      } else {
        ao.addmovement(
          startjump(
            _jumpacceleration,
            () => !_isjumping,
            // () => (_isjumping = false)
            (frame) => {
              console.log(frame)
              if(frame <1) {
                console.log('start floating')
                // initfloat()
              }
            }
          )
        )
      }
    } else if (_ishuggingwall !== 0 && _haswalljump) {
      _haswalljump = false
      ao.addmovement(
        startwalljump(
          _jumpacceleration,
          -_ishuggingwall,
          () => false,
          // () => (_isjumping = false)
          () => false
        )
      )
    }

    // _isgrounded
    // 	? _ao.addmovement(movements.jump.start(_ao))
    // 	:	_isclosetowall
    // 	? movement.walljump.start()
    // 	: _doublejumps > 0
    // 	? movements.doublejump.start()
    // 	: movements.jump.fail()
  }

  const _onjumpreleased = () => {
    // console.log('jump release')
    _isjumping = false
  }

  const _dashend = () => {
    ao.resetmaxvelocity()
    delayedactions.emit({
      delay: 15,
      execute: () => (_isdashing = false),
    })
    delayedactions.emit({
      delay: 15,
      execute: () => {
        _dashcd = false
      },
    })
    animations.emit(
      animation(
        15,
        (frame) => {
          go.style.background = `linear-gradient(180deg, grey ${frame / 3}%, ${
            _appearance.color
          } ${frame / 6}%) `
          if (frame < 2) go.style.background = ''
        },
        (frame) => frame < 1
      )
    )
    // _isDashing = false
  }

  const initDash = (direction) => {
    _isDashing = true
    _dashCD = true
    ao.setMaxVelocity(2.2)
    const killSignal = direction === -1 ? () => false : () => false

    ao.addMovement(
      _isGrounded
        ? startDash(_dashAcceleration, direction, killSignal, _dashEnd)
        : startAirDash(
            _dashAcceleration,
            direction,
            ao._downwardAcceleration,
            killSignal,
            _dashEnd
          )
    )
  }

  const initRun = (direction) => {
    const killSignal =
      direction === -1
        ? () => !_runningLeft || _runningDirection !== -1
        : () => !_runningRight || _runningDirection !== 1
    ao.addMovement(startRun(_runAcceleration, direction, killSignal))
  }

  const initBonusRun = (direction) => {
    console.log('init bonus run ' + direction)

    console.log(`${Math.sign(ao.getSpeed())} !== ${direction} &&
      ${Math.abs(ao.getSpeed())} > ${bonusTreshold}`)

    _hasDirectionChangeBonus = true
    const killSignal =
      direction === -1
        ? () => !_runningLeft || _runningDirection !== -1
        : () => !_runningRight || _runningDirection !== 1
    ao.setMaxVelocity(0.15)
    ao.addMovement(
      startOppositeRun(_bonusStart, direction, killSignal, () => {
        _hasDirectionChangeBonus = false
        ao.resetMaxVelocity()
      })
    )
  }

  const _onMovementPress = (direction) => {
    if (direction === -1) {
      if (_runningLeft) return
      _runningLeft = true
    } else {
      if (_runningRight) return
      _runningRight = true
    }

    if (_isDucking && !_dashCD) {
      initDash(direction)
      // return
    }
    if (
      _isGrounded &&
      !_isDashing &&
      Math.sign(ao.getSpeed()) !== direction &&
      Math.abs(ao.getSpeed()) > bonusTreshold
    ) {
      initBonusRun(direction)
    }
    // if (direction !== _runningDirection) {
    initRun(direction)
    // }
    _runningDirection = direction
  }

  const _onMovementRelease = (direction) => {
    console.log('released ' + direction)
    if (direction === -1) {
      _runningLeft = false
      // _isRunning = false
    } else {
      _runningRight = false
    }
  }

  const _onDuckPress = () => {
    _isDucking = true
    if (!_isGrounded) {
      delayedActions.emit({
        delay: 10,
        execute: () => {
          if (_isDucking) {
            ao.addMovement(
              startStomp(_jumpAcceleration * 0.5, () => {
                return !_isDucking || _isGrounded
              })
            )
          }
        },
      })
    }
  }
  const _onDuckRelease = () => {
    delayedActions.emit({
      delay: 10,
      execute: () => (_isDucking = false),
    })
  }

  const _onGameStart = (data) => {}

  const _onGameEnd = (data) => {
    //destroy
  }

  const _onRoundStart = (data) => {}

  const _onRoundEnd = (data) => {
    //suspend keys
  }

  const _onGroundHit = () => {
    _isGrounded = true
    _hasWallJump = true
    // _isGrounded = true
  }

  const _onWallHit = (event) => {
    if (event !== 0) {
      _isHuggingWall = event
    } else {
      delayedActions.emit({
        delay: 10,
        execute: () => (_isHuggingWall = 0),
      })
    }
    // _wallHit = true
  }

  const _onResize = (newSize) => {
    // areaWidth = newSize.rightBoundry - newSize.leftBoundry
    // slimeWidth = (areaWidth / K) * radius * 2
    // slimeHeight = (areaWidth / K) * radius
    setupConstants(newSize)
    go.style.width = `${slimeWidth}px`
    go.style.height = `${slimeHeight}px`
    console.log(slimeWidth)
  }

  const _onTeamSwitch = (team) => {
    // go.classList.remove('dashCd')
    if (team === 1) {
      _team = team
      go.classList.add('teamColorOne')
      go.classList.remove('teamColorTwo')
      _appearance.color = 'gold'
    } else {
      _team = team
      go.classList.add('teamColorTwo')
      go.classList.remove('teamColorOne')
      _appearance.color = 'crimson'
    }
  }
  _onTeamSwitch(team)

  const _listeners = [
    keys.jumpPress.subscribe(_onJumpPressed),
    keys.jumpRelease.subscribe(_onJumpReleased),
    keys.movementPress.subscribe(_onMovementPress),
    keys.movementRelease.subscribe(_onMovementRelease),
    keys.duckPress.subscribe(_onDuckPress),
    keys.duckRelease.subscribe(_onDuckRelease),

    game.gameStart.subscribe(_onGameStart),
    game.gameEnd.subscribe(_onGameEnd),
    game.roundStart.subscribe(_onRoundStart),
    game.roundEnd.subscribe(_onRoundEnd),
    game.sizeChange.subscribe(_onResize),
    game.teamSwitchEvent.subscribe(_onTeamSwitch),

    ao.groundHitEvent.subscribe(_onGroundHit),
    ao.wallHitEvent.subscribe(_onWallHit),
    // movements
  ]

  const destroy = () => {
    _go.destroy()
    _listeners.forEach((listener) => listener.unsubscribe())
  }

  const update = () => {
    ao.update()
  }

  const render = () => {
    go.style.borderTopLeftRadius = `${110 + ao._velocity.x * 2}px`
    go.style.borderTopRightRadius = `${110 - ao._velocity.x * 2}px`
    go.style.height = `${slimeHeight - Math.abs(ao._velocity.x * 1)}px`

    go.style.top = `${ao.pos.y - slimeHeight + Math.abs(ao._velocity.x * 1)}px`
    go.style.left = `${ao.pos.x - slimeWidth / 2}px`
    // go.style.left = `${0  - slimeWidth/2}px`
  }

  return { update, render }
}

// export const createSlime = ({ ao, go, team }) => ({
//   ao, //actor object
//   go, //graphical object
//   team,
//   acceleration: 0.25,
//   deacceleration: 0.9,
//   bonusAcceleration: 1,
//   jumpAcceleration: 0.5,
//   downwardAcceleration: 0.5,
//   bonuses: [],
//   isRunning: false,
//   isJumping: false,
//   activeJump: false,
//   activeRun: null,
//   runningDirection: 0,
//   updatePosition: updatePosition,
//   render: render,
// })
