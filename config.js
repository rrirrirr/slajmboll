/**
 * Game configuration parameters
 * @module config
 */

/**
 * Physics constants
 */
export const physics = {
  /** Gravity acceleration value */
  GRAVITY: 0.55,
  /** Maximum falling speed */
  TERMINAL_VELOCITY: 12.5,
  /** Base maximum horizontal velocity */
  MAX_VELOCITY: 10,
  /** Scaling constant for sizes and speeds */
  K: 13,
  /** Ball bounce energy retention factor (0.0 to 1.0) */
  BOUNCE_FACTOR: 1.0,
  /** Slime-ball collision elasticity */
  SLIME_BOUNCE_FACTOR: 1.9,
};

/**
 * Game dimensions
 */
export const dimensions = {
  /** Default game field ground position */
  GROUND: 200,
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
  RUN_ACCELERATION: 0.02,
  /** Jump acceleration multiplier */
  JUMP_ACCELERATION: 0.3,
  /** Direction change bonus acceleration */
  DIRECTION_CHANGE_BONUS: 2.0,
  /** Wall jump cooldown (frames) */
  WALL_JUMP_COOLDOWN: 8,
  /** Direction change jump window (frames) */
  DIRECTION_CHANGE_WINDOW: 15,
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
