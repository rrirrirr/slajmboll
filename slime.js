import { K } from './constants.js'
import Actor from './actor.js'
import { createSlime } from './graphics.js'
import { events } from './events.js'
import {
  startJump,
  startOppositeRun,
  startRun,
  startDash,
  startDashJump,
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
  // const ao = actor() //actor object
  // const go =  //graphical object
  let _team = team
  const _played = true
  const _appearance = appearance
  let areaWidth = constraints.rightBoundry - constraints.leftBoundry
  let radius = dimensions.radius
  let slimeWidth = (areaWidth / K) * radius * 2
  let slimeHeight = (areaWidth / K) * radius

  let _runAcceleration = (areaWidth / K) * 0.012
  let _bonusStart = (areaWidth / K) * 0.028
  let _dashAcceleration = (areaWidth / K) * 0.052
  // let _runDeacceleration =(areaWidth/K)*0.008
  let _bonusAcceleration = 1
  let _jumpAcceleration = 1.0
  let _bonusJumpAcceleration = 6.5
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
  let _isHuggingWall = false

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
  game.go.appendChild(go)
  //

  const _onJumpPressed = () => {
    // console.log('jump ')

    if ((_isGrounded || _isHuggingWall) && !_isJumping) {
      _isJumping = true
      _isGrounded = false
      if (_isDashing) {
        ao.addMovement(
          startDashJump(
            _dashAcceleration,
            _runningDirection,
            () => !_isJumping,
            // () => (_isJumping = false)
            () => false
          )
        )
      } else if (_hasDirectionChangeBonus) {
        console.log('bonus jump')
        ao.addMovement(
          startJump(
            _bonusJumpAcceleration,
            () => !_isJumping,
            // () => (_isJumping = false)
            () => false
          )
        )
      } else {
        ao.addMovement(
          startJump(
            _jumpAcceleration,
            () => !_isJumping,
            // () => (_isJumping = false)
            () => false
          )
        )
      }
    }

    // _isGrounded
    // 	? _ao.addMovement(movements.jump.start(_ao))
    // 	:	_isCloseToWall
    // 	? movement.wallJump.start()
    // 	: _doubleJumps > 0
    // 	? movements.doubleJump.start()
    // 	: movements.jump.fail()
  }

  const _onJumpReleased = () => {
    // console.log('jump release')
    _isJumping = false
  }

  const _onMovementPress = (direction) => {
    if (direction === -1 && _runningLeft !== _runningDirection) {
      // console.log('movement ' + direction + ' rd ' + _runningDirection)
      // console.log(_runningDirection !== -2)
      if (_isDucking && !_dashCD) {
        _runningLeft = direction
        _runningDirection = -1
        _isDashing = true
        _dashCD = true
        _onTeamSwitch(3)
        ao.setMaxVelocity(0.2)
        ao.addMovement(
          startDash(
            _dashAcceleration,
            direction,
            () => {
              return _runningLeft !== _runningDirection
            },
            () => {
              ao.resetMaxVelocity()
              delayedActions.emit({
                delay: 15,
                wait: () => {},
                execute: () => (_isDashing = false),
              })
              delayedActions.emit({
                delay: 300,
                wait: (frames) => {
                  go.style.background = `linear-gradient(180deg, grey ${
                    frames / 3
                  }%, gold ${frames / 6}%) `
                },
                execute: () => {
                  _onTeamSwitch(_team)
                  _dashCD = false
                },
              })
              // _isDashing = false
            }
          )
        )
      } else if (_runningDirection !== -2 && _runningRight === 1) {
        _runningLeft = direction
        _runningDirection = -1
        // console.log('bonus run')
        ao.addMovement(
          startRun(_runAcceleration, direction, () => {
            // console.log(_runningDirection + ' !== ' + _runningLeft + ' || ')

            return _runningLeft !== _runningDirection
            // return !_isRunning
          })
        )
        _hasDirectionChangeBonus = true
        ao.addMovement(
          startOppositeRun(
            _bonusStart,
            direction,
            () => {
              // console.log(
              //   _runningDirection + ' !== ' + direction + ' || ' + !_isRunning
              // )
              // console.log('bonus')
              // return _runningLeft !== direction
              return _runningLeft !== _runningDirection

              // return !_isRunning
            },
            () => {
              _hasDirectionChangeBonus = false
              // if (_runningLeft === -1 && _runningDirection === -1) {
              //
              //   _runningDirection = -2
              //   _runningLeft = 0
              //   console.log('trying for bonus')
              //   _onMovementPress(-1)
              // }
              // _isRunning = false
              // console.log(_isRunning)
              // maxspeed = ...?
            }
          )
        )
      } else {
        // _isRunning = true
        _runningDirection = -1
        _runningLeft = direction
        // console.log('common run')
        ao.addMovement(
          startRun(_runAcceleration, direction, () => {
            // console.log(_runningDirection + ' !== ' + _runningLeft + ' || ')

            return _runningLeft !== _runningDirection
            // return !_isRunning
          })
        )
      }
    } else if (direction === 1 && _runningRight !== _runningDirection) {
      // console.log('movement ' + direction)
      _runningRight = direction
      _runningDirection = direction
      if (_isDucking && !_dashCD) {
        ao.setMaxVelocity(0.2)
        _isDashing = true
        _dashCD = true
        _onTeamSwitch(3)
        ao.addMovement(
          startDash(
            _dashAcceleration,
            direction,
            () => {
              return _runningRight !== _runningDirection
            },
            () => {
              ao.resetMaxVelocity()
              delayedActions.emit({
                delay: 15,
                wait: () => {},
                execute: () => (_isDashing = false),
              })
              delayedActions.emit({
                delay: 300,
                wait: (frames) => {
                  go.style.background = `linear-gradient(180deg, grey ${
                    frames / 3
                  }%, gold ${frames / 6}%) `
                },
                execute: () => {
                  _onTeamSwitch(_team)
                  _dashCD = false
                },
              })
            }
          )
        )
      } else if (_runningLeft === -1) {
        // console.log('bonus run right')
        ao.addMovement(
          startRun(_runAcceleration, direction, () => {
            // console.log(
            //   _runningDirection + ' !== ' + _runningRight + ' || '
            // )

            return _runningRight !== _runningDirection

            // return _runningRight !== direction
            // return !_isRunning
          })
        )
        _hasDirectionChangeBonus = true

        ao.addMovement(
          startOppositeRun(
            _bonusStart,
            direction,
            () => {
              // console.log(
              //   _runningDirection + ' !== ' + direction + ' || ' + !_isRunning
              // )
              // return _runningRight !== direction
              return _runningRight !== _runningDirection

              // return !_isRunning
            },
            () => {
              _hasDirectionChangeBonus = false
              // _isRunning = false
              // console.log(_isRunning)
              // maxspeed = ...?
              // console.log('trying for bonus')
              // _onMovementPress(1)
            }
          )
        )
      } else {
        // _isRunning = true
        _runningRight = direction
        ao.addMovement(
          startRun(_runAcceleration, direction, () => {
            // console.log(
            //   _runningDirection + ' !== ' + _runningRight + ' || '
            // )

            return _runningRight !== _runningDirection

            // return _runningRight !== direction
            // return !_isRunning
          })
        )
      }
    }
  }
  const _onMovementRelease = (direction) => {
    console.log('released ' + direction)
    if (_runningLeft === direction) {
      _runningLeft = 0
      // _isRunning = false
    } else {
      _runningRight = 0
    }
  }

  const _onMovementReleaseOld = (direction) => {
    console.log('released ' + direction)
    if (_runningDirection === direction) {
      _runningDirection = 0
      _isRunning = false
    }
  }

  const _onDuckPress = () => {
    _isDucking = true
  }
  const _onDuckRelease = () => {
    _isDucking = false
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
    // _isGrounded = true
  }

  const _onWallHit = (event) => {
    if (event === 1 || event === -1) {
      _isHuggingWall = true
    } else {
      delayedActions.emit({
        delay: 10,
        wait: () => {},
        execute: () => (_isHuggingWall = false),
      })
    }
    // _wallHit = true
  }

  const _onResize = (newSize) => {
    areaWidth = newSize.rightBoundry - newSize.leftBoundry
    slimeWidth = (areaWidth / K) * radius * 2
    slimeHeight = (areaWidth / K) * radius
    go.style.width = `${slimeWidth}px`
    go.style.height = `${slimeHeight}px`
    console.log(slimeWidth)
  }

  const _onTeamSwitch = (team) => {
    go.classList.remove('dashCd')
    if (team === 3) {
      go.classList.add('dashCd')
      go.classList.remove('teamColorTwo')
      go.classList.remove('teamColorOne')
    } else if (team === 1) {
      _team = team
      go.classList.add('teamColorOne')
      go.classList.remove('teamColorTwo')
    } else {
      _team = team
      go.classList.add('teamColorTwo')
      go.classList.remove('teamColorOne')
    }
  }

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
