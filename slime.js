import { K } from './constants.js'
import Actor from './actor.js'
import { createSlime } from './graphics.js'
import { Animation } from './Animations.js'
import { Event, events } from './events.js'
import {
  startJump,
  startOppositeRun,
  startRun,
  startWallJump,
  startDirectionChangeJump
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
    _runAcceleration = (_areaWidth / K) * 0.02  // Increased acceleration
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
  let _jumpAcceleration = 0.3  // Increased jump power
  let _bonusJumpAcceleration = _jumpAcceleration * 2.0

  // Reference to active movements
  let _activeRunMovement = null;
  let _activeJumpMovement = null;

  const _bonuses = []
  let _isRunning = false
  let _runningLeft = false
  let _runningRight = false
  let _runningDirection = 0
  let _isJumping = false
  let _isDucking = false
  let _isGrounded = true
  let _hasDirectionChangeBonus = false
  let _isHuggingWall = 0
  let _hasWallJump = true
  let _lastDirectionChangeTime = 0
  const _directionChangeWindow = 15 // Frames window to perform jump after direction change

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
    if (_isJumping) {
      return;
    }

    if (_isGrounded) {
      _isJumping = true;
      _isGrounded = false;

      // Direction change high jump
      if (_lastDirectionChangeTime > 0) {
        console.log('Direction change jump!')
        _lastDirectionChangeTime = 0

        // Visual feedback
        _animations.emit(
          Animation(
            10,
            (frame) => {
              go.style.background = `linear-gradient(0deg, ${_appearance.color} ${frame * 10}%, white ${frame * 15}%)`
              if (frame < 2) go.style.background = ''
            },
            (frame) => frame < 1
          )
        )

        // Clear any existing jump movement
        if (_activeJumpMovement) {
          ao.removeMovement(_activeJumpMovement);
        }

        ao.setMaxVelocity(1.5);
        _activeJumpMovement = startDirectionChangeJump(
          _jumpAcceleration,
          _runningDirection,
          () => !_isJumping,
          () => {
            ao.resetMaxVelocity();
            _activeJumpMovement = null;
          }
        );
        ao.addMovement(_activeJumpMovement);
      }
      else if (_hasDirectionChangeBonus) {
        console.log('bonus jump')

        // Clear any existing jump movement
        if (_activeJumpMovement) {
          ao.removeMovement(_activeJumpMovement);
        }

        ao.setMaxVelocity(2.2)
        _activeJumpMovement = startJump(
          _bonusJumpAcceleration,
          () => !_isJumping,
          () => {
            ao.resetMaxVelocity();
            _activeJumpMovement = null;
          }
        );
        ao.addMovement(_activeJumpMovement);
      }
      else {
        console.log('standard jump');

        // Clear any existing jump movement
        if (_activeJumpMovement) {
          ao.removeMovement(_activeJumpMovement);
        }

        _activeJumpMovement = startJump(
          _jumpAcceleration,
          () => !_isJumping,
          () => {
            console.log('Jump complete');
            _activeJumpMovement = null;
          }
        );
        ao.addMovement(_activeJumpMovement);
      }
    }
    else if (_isHuggingWall !== 0 && _hasWallJump) {
      console.log("Executing wall jump, direction:", -_isHuggingWall);
      _isJumping = true;
      _hasWallJump = false;
      _delayedActions.emit({
        slimeId: slimeId,
        delay: 8,
        execute: () => {
          _hasWallJump = true;
        }
      })

      // Visual feedback for wall jump
      _animations.emit(
        Animation(
          6,
          (frame) => {
            go.style.background = `linear-gradient(${-_isHuggingWall * 90}deg, ${_appearance.color} ${frame * 15}%, white ${frame * 20}%)`
            if (frame < 2) go.style.background = ''
          },
          (frame) => frame < 1
        )
      )

      // Clear any existing jump movement
      if (_activeJumpMovement) {
        ao.removeMovement(_activeJumpMovement);
      }

      ao.setMaxVelocity(1.2)
      _activeJumpMovement = startWallJump(
        _jumpAcceleration,
        -_isHuggingWall,
        () => !_isJumping,
        () => {
          ao.resetMaxVelocity();
          _activeJumpMovement = null;
        }
      );
      ao.addMovement(_activeJumpMovement);
    }
  }

  const _onJumpReleased = () => {
    console.log(`Jump released for slime ${teamNumber}`)
    _isJumping = false
  }

  const _initRun = (direction) => {
    // Remove existing run movement if any
    if (_activeRunMovement) {
      ao.removeMovement(_activeRunMovement);
      _activeRunMovement = null;
    }

    // Create proper kill signal
    const killSignal = direction === -1
      ? () => !_runningLeft
      : () => !_runningRight;

    // Create and add new run movement
    _activeRunMovement = startRun(_runAcceleration, direction, killSignal);
    ao.addMovement(_activeRunMovement);
  }

  const _initBonusRun = (direction) => {
    console.log('Init bonus run ' + direction);

    // Remove existing run movement if any
    if (_activeRunMovement) {
      ao.removeMovement(_activeRunMovement);
      _activeRunMovement = null;
    }

    _hasDirectionChangeBonus = true;

    // Create proper kill signal
    const killSignal = direction === -1
      ? () => !_runningLeft
      : () => !_runningRight;

    ao.setMaxVelocity(0.15);
    _activeRunMovement = startOppositeRun(
      _bonusStart,
      direction,
      killSignal,
      () => {
        _hasDirectionChangeBonus = false;
        ao.resetMaxVelocity();
        _activeRunMovement = null;
      }
    );
    ao.addMovement(_activeRunMovement);
  }

  const _onMovementPress = (direction) => {
    // Check if this is a direction change
    if (_runningDirection !== 0 && _runningDirection !== direction) {
      _lastDirectionChangeTime = _directionChangeWindow;
    }

    if (direction === -1) {
      _runningLeft = true;
      _runningRight = false;
    } else {
      _runningRight = true;
      _runningLeft = false;
    }

    _runningDirection = direction;
    _isRunning = true;

    // Check for bonus run condition
    if (_isGrounded &&
      Math.sign(ao.getSpeed()) !== 0 &&
      Math.sign(ao.getSpeed()) !== direction &&
      Math.abs(ao.getSpeed()) > _bonusTreshold) {
      _initBonusRun(direction);
    } else {
      _initRun(direction);
    }
  }

  const _onMovementRelease = (direction) => {
    if (direction === -1) {
      _runningLeft = false;
      if (_runningDirection === -1) {
        _runningDirection = 0;
        _isRunning = false;
      }
    } else {
      _runningRight = false;
      if (_runningDirection === 1) {
        _runningDirection = 0;
        _isRunning = false;
      }
    }
  }

  const _onDuckPress = () => {
    _isDucking = true
  }

  const _onDuckRelease = () => {
    _isDucking = false
  }

  const _onGameStart = (data) => { }
  const _onGameEnd = (data) => { }
  const _onRoundStart = (data) => { }
  const _onRoundEnd = (data) => { }

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
        execute: () => {
          _isHuggingWall = 0;
        },
      })
    }
  }

  const _onResize = (newSize) => {
    setupConstants(newSize)
    go.style.width = `${_slimeWidth}px`
    go.style.height = `${_slimeHeight}px`
  }

  const _onTeamSwitch = (switchTeam) => {
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

  const filterDelayedActions = (action) => {
    if (!action.slimeId || action.slimeId === slimeId) {
      return true;
    }
    return false;
  };

  if (_delayedActions && _delayedActions.originalEmit) {
    // 
  } else if (_delayedActions) {
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
    go.remove();
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

    if (_lastDirectionChangeTime > 0) {
      _lastDirectionChangeTime--;
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
