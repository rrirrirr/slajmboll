import { physics, dimensions } from '../config.js';

/**
 * Maximum horizontal velocity
 * @type {number}
 */
export const MAXVELOCITY = physics.MAX_VELOCITY;

/**
 * Ground position (y-coordinate)
 * @type {number}
 */
export const GROUND = dimensions.GROUND;

/**
 * Gravity acceleration
 * @type {number}
 */
export const GRAVITY = physics.GRAVITY;

/**
 * Maximum falling speed
 * @type {number}
 */
export const TERMINALVELOCITY = physics.TERMINAL_VELOCITY;

/**
 * Scaling constant for sizes and speeds
 * @type {number}
 */
export const K = physics.K;
