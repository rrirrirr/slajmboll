/**
WALL_SLIDE_VERTICAL_FRICTION_FACTOR: 0.90,
 * Game configuration parameters
 * @module config
 */

/**
 * Physics constants
 */
export const physics = {
  /** Gravity acceleration value */
  GRAVITY: 0.4,
  /** Maximum falling speed */
  TERMINAL_VELOCITY: 12.5,
  /** Base maximum horizontal velocity */
  MAX_VELOCITY: 10,
  /** Scaling constant for sizes and speeds */
  K: 23,
  /** Ball bounce energy retention factor (0.0 to 1.0) */
  BOUNCE_FACTOR: 0.8,
  /** Slime-ball collision elasticity */
  SLIME_BOUNCE_FACTOR: 1.0,
  /** Net bounce boost factor - vertical speed added after net collision */
  NET_BOUNCE_BOOST: 0.15,
  /** Ground friction factor (0 = max friction, 1 = no friction) */
  GROUND_FRICTION: 0.85,
  /** Air friction factor (0 = max friction, 1 = no friction) */
  AIR_FRICTION: 0.75,
  /** Mass of the ball for collision calculations */
  BALL_MASS: 1,
  /** Mass of the slime for collision calculations */
  SLIME_MASS: 5,
  WALL_SLIDE_FRICTION_UP: 1.00,
  WALL_SLIDE_FRICTION_DOWN: 0.85,
};

/**
 * Game dimensions
 */
export const dimensions = {
  /** Default game field ground position */
  GROUND: 200, // Note: This might be dynamically calculated based on field height later
  /** Slime radius relative to game area */
  SLIME_RADIUS: 1,
  /** Ball radius relative to game area */
  BALL_RADIUS: 0.5,
  /** Net width as percentage of game width */
  NET_WIDTH_PERCENT: 0.03,
  /** Net height as percentage of game height */
  NET_HEIGHT_PERCENT: 0.2,
};

/**
 * Game rules
 */
export const rules = {
  /** Points needed to win the game */
  WINNING_SCORE: 5,
  /** Cooldown between scoring events (ms) */
  SCORING_COOLDOWN: 2000,
  /** Maximum number of players */
  MAX_PLAYERS: 4,
  /** Countdown duration before round starts (seconds) */
  COUNTDOWN_DURATION: 3,
};

/**
 * Player movement parameters
 */
export const movement = {
  /** Base run acceleration */
  RUN_ACCELERATION: 0.03,
  /** Jump acceleration multiplier */
  JUMP_ACCELERATION: 1.6,
  /** Direction change bonus acceleration */
  DIRECTION_CHANGE_BONUS: 1.0,
  /** Wall jump cooldown (frames) */
  WALL_JUMP_COOLDOWN: 8,
  /** Direction change jump window (frames) */
  DIRECTION_CHANGE_WINDOW: 15,
  JUMP_MAX_FRAMES: 20,          // Duration jump force can be applied if key held
  JUMP_MIN_FRAMES: 6,           // Minimum frames jump force is applied (unused currently?)
  WALL_JUMP_H_FACTOR: 5.2,      // Horizontal force multiplier for wall jump
  WALL_JUMP_DURATION: 20,       // Frames wall jump force is applied
  DIR_CHANGE_JUMP_ACCEL_BONUS: 1.2, // Multiplier for direction change jump force
  DIR_CHANGE_JUMP_LOCK_FRAMES: 10, // Frames to restrict horizontal movement during dir change jump
  DIR_CHANGE_JUMP_TOTAL_FRAMES: 20, // Total duration for dir change jump impulse calculation
  OPPOSITE_RUN_BONUS_FRAMES: 20, // Duration of bonus acceleration when changing run direction
  OPPOSITE_RUN_ACCEL_BONUS: 2.0, // Multiplier for bonus run acceleration (relative to normal run)
  JUMP_BUFFER_FRAMES: 6,
  JUMP_MIN_DURATION_FRAMES: 4,
  WALL_JUMP_LENIENCY_PIXELS: 10,
};

/**
 * Default team properties
 */
export const teams = {
  /** Team 1 (Gold) color */
  TEAM_1_COLOR: 'gold',
  /** Team 2 (Crimson) color */
  TEAM_2_COLOR: 'crimson',
};

/**
 * Screen breakpoints for responsive design
 */
export const responsive = {
  /** Small screen breakpoint (px) */
  SMALL: 600,
  /** Medium screen breakpoint (px) */
  MEDIUM: 900,
  /** Large screen breakpoint (px) */
  LARGE: 1200,
};
