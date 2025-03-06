import { K } from './constants.js'
import Actor from './actor.js'
import { createSlime } from './graphics.js'
import { Animation } from './Animations.js'
import { Event, events } from './events.js'
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
  // Get global events
  const _delayedActions = events.get('delayed actions')
  const _animations = events.get('animations')

  // Setup instance variables
  let _team = team
  const _played = true
  const _appearance = appearance
  const _game = game

  // Create unique identifiers for this slime
  const slimeId = `slime_${teamNumber}_${Date.now()}`

  const setupConstants = (constraints) => {
    _areaWidth = constraints.rightBoundry - constraints.leftBoundry
    _radius = dimensions.radius
    _slimeWidth = (_areaWidth / K) * _radius * 2
    _slimeHeight = (_areaWidth / K) * _radius
    _runAcceleration = (_areaWidth / K) * 0.012
    _bonusStart = _runAcceleration * 2
    _dashAcceleration = (_areaWidth / K) * 0.052
    _bonusTreshold = _runAcceleration * 5
  }

  let _areaWidth,
    _radius,
    _slimeWidth,
    _slimeHeight,
    _runAcceleration,
    _bonusStart,
    _dashAcceleration,
    _bonusTreshold,
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

  // Create actor with unique id
  let ao = Actor(
    pos,
    { x: 0, y: 0 },
    dimensions.radius,
    constraints.rightBoundry,
    constraints.leftBoundry,
    constraints.ground,
    constraints.maxVelocity,
    game.sizeChange
  )

  // Create DOM element with unique identifier
  const go = createSlime(appearance)
  go.setAttribute('data-slime-id', slimeId)
  go.classList.add(`slime-${teamNumber}`)
  go.style.width = `${_slimeWidth}px`
  go.style.height = `${_slimeHeight}px`
  _game.go.appendChild(go)

  const _onJumpPressed = () => {
    console.log(`Jump pressed for slime ${teamNumber}`)
    if (_isJumping) return
    if (_isGrounded) {
      _isJumping = true
      _isGrounded = false
      if (_isDashing) {
        ao.addMovement(
          startDashJump(
            _dashAcceleration,
            _runningDirection,
            () => !_isJumping,
            () => false
          )
        )
      } else if (_isDucking) {
        console.log('duck jump')
        ao.setMaxVelocity(1.5)
        ao.addMovement(
          startJump(
            _jumpAcceleration,
            () => false,
            () => ao.resetMaxVelocity()
          )
        )
      } else if (_hasDirectionChangeBonus) {
        console.log('bonus jump')
        ao.setMaxVelocity(2.2)
        ao.addMovement(
          startJump(
            _bonusJumpAcceleration,
            () => false,
            () => ao.resetMaxVelocity()
          )
        )
      } else {
        ao.addMovement(
          startJump(
            _jumpAcceleration,
            () => !_isJumping,
            (frame) => {
              console.log(frame)
              if (frame < 1) {
                console.log('start floating')
              }
            }
          )
        )
      }
    } else if (_isHuggingWall !== 0 && _hasWallJump) {
      _hasWallJump = false
      ao.addMovement(
        startWallJump(
          _jumpAcceleration,
          -_isHuggingWall,
          () => false,
          () => false
        )
      )
    }
  }

  const _onJumpReleased = () => {
    console.log(`Jump released for slime ${teamNumber}`)
    _isJumping = false
  }

  const _dashEnd = () => {
    ao.resetMaxVelocity()
    _delayedActions.emit({
      slimeId: slimeId,
      delay: 15,
      execute: () => (_isDashing = false),
    })
    _delayedActions.emit({
      slimeId: slimeId,
      delay: 15,
      execute: () => {
        _dashCD = false
      },
    })
    _animations.emit(
      Animation(
        15,
        (frame) => {
          go.style.background = `linear-gradient(180deg, grey ${frame / 3}%, ${_appearance.color
            } ${frame / 6}%) `
          if (frame < 2) go.style.background = ''
        },
        (frame) => frame < 1
      )
    )
  }

  const _initDash = (direction) => {
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

  const _initRun = (direction) => {
    const killSignal =
      direction === -1
        ? () => !_runningLeft || _runningDirection !== -1
        : () => !_runningRight || _runningDirection !== 1
    ao.addMovement(startRun(_runAcceleration, direction, killSignal))
  }

  const _initBonusRun = (direction) => {
    console.log('init bonus run ' + direction)

    console.log(`${Math.sign(ao.getSpeed())} !== ${direction} &&
      ${Math.abs(ao.getSpeed())} > ${_bonusTreshold}`)

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
    console.log(`Movement press ${direction} for slime ${teamNumber}`)
    if (direction === -1) {
      if (_runningLeft) return
      _runningLeft = true
    } else {
      if (_runningRight) return
      _runningRight = true
    }

    if (_isDucking && !_dashCD) {
      _initDash(direction)
    }
    if (
      _isGrounded &&
      !_isDashing &&
      Math.sign(ao.getSpeed()) !== direction &&
      Math.abs(ao.getSpeed()) > _bonusTreshold
    ) {
      _initBonusRun(direction)
    }
    _initRun(direction)
    _runningDirection = direction
  }

  const _onMovementRelease = (direction) => {
    console.log(`Movement release ${direction} for slime ${teamNumber}`)
    if (direction === -1) {
      _runningLeft = false
    } else {
      _runningRight = false
    }
  }

  const _onDuckPress = () => {
    console.log(`Duck press for slime ${teamNumber}`)
    _isDucking = true
    if (!_isGrounded) {
      _delayedActions.emit({
        slimeId: slimeId,
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
    console.log(`Duck release for slime ${teamNumber}`)
    _delayedActions.emit({
      slimeId: slimeId,
      delay: 10,
      execute: () => (_isDucking = false),
    })
  }

  const _onGameStart = (data) => { }

  const _onGameEnd = (data) => {
    //destroy
  }

  const _onRoundStart = (data) => { }

  const _onRoundEnd = (data) => {
    //suspend keys
  }

  const _onGroundHit = () => {
    console.log(`Ground hit for slime ${teamNumber}`)
    _isGrounded = true
    _hasWallJump = true
  }

  const _onWallHit = (event) => {
    console.log(`Wall hit ${event} for slime ${teamNumber}`)
    if (event !== 0) {
      _isHuggingWall = event
    } else {
      _delayedActions.emit({
        slimeId: slimeId,
        delay: 10,
        execute: () => (_isHuggingWall = 0),
      })
    }
  }

  const _onResize = (newSize) => {
    setupConstants(newSize)
    go.style.width = `${_slimeWidth}px`
    go.style.height = `${_slimeHeight}px`
  }

  const _onTeamSwitch = (switchTeam) => {
    console.log(`Team switch to ${switchTeam} for slime ${teamNumber}`)
    if (switchTeam === 1) {
      _team = switchTeam
      go.classList.add('teamColorOne')
      go.classList.remove('teamColorTwo')
      _appearance.color = 'gold'
    } else {
      _team = switchTeam
      go.classList.add('teamColorTwo')
      go.classList.remove('teamColorOne')
      _appearance.color = 'crimson'
    }
  }
  _onTeamSwitch(team)

  // Filter delayed actions that belong to this slime
  const filterDelayedActions = (action) => {
    if (!action.slimeId || action.slimeId === slimeId) {
      return true;
    }
    return false;
  };

  // Update events.js to add slimeId filtering
  if (_delayedActions && _delayedActions.originalEmit) {
    // Already patched
  } else if (_delayedActions) {
    // Patch the emit function to filter by slimeId
    _delayedActions.originalEmit = _delayedActions.emit;
    _delayedActions.emit = (action) => {
      if (!action.slimeId) {
        action.slimeId = slimeId;
      }
      _delayedActions.originalEmit(action);
    };
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
  ]

  const destroy = () => {
    go.remove(); // Use remove instead of destroy
    _listeners.forEach((listener) => {
      if (listener && typeof listener.unsubscribe === 'function') {
        listener.unsubscribe();
      }
    });
  }

  const update = () => {
    if (ao && typeof ao.update === 'function') {
      ao.update();
    }
  }

  const render = () => {
    go.style.borderTopLeftRadius = `${70 + ao._velocity.x * 2}px`;
    go.style.borderTopRightRadius = `${70 - ao._velocity.x * 2}px`;
    go.style.height = `${_slimeHeight - Math.abs(ao._velocity.x * 1)}px`;
    go.style.top = `${ao.pos.y - _slimeHeight + Math.abs(ao._velocity.x * 1)}px`;
    go.style.left = `${ao.pos.x - _slimeWidth / 2}px`;
  }

  return {
    update,
    render,
    destroy,
    slimeId,
    teamNumber
  }
}
