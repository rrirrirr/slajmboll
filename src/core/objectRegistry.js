/**
 * Object registry for tracking game objects and their collision properties
 * @module objectRegistry
 */

/**
 * Central registry of game objects for physics and collisions
 * @type {Object}
 */
export const gameObjects = {
  net: null,
  ground: null,
};

/**
 * Registers a net object in the registry
 * 
 * @param {Object} netData - Net properties
 * @param {number} netData.position - X position of the net
 * @param {number} netData.width - Width of the net
 * @param {number} netData.height - Height of the net
 * @param {HTMLElement} netData.element - DOM element of the net
 */
export function registerNet(netData) {
  gameObjects.net = netData;
}

/**
 * Removes the net from the registry
 */
export function unregisterNet() {
  gameObjects.net = null;
}

/**
 * Registers a ground object in the registry
 * 
 * @param {Object} groundData - Ground properties
 * @param {number} groundData.height - Height position of the ground
 * @param {HTMLElement} groundData.element - DOM element of the ground
 */
export function registerGround(groundData) {
  gameObjects.ground = groundData;
}

/**
 * Clears all objects from the registry
 */
export function clearRegistry() {
  gameObjects.net = null;
  gameObjects.ground = null;
  // clear any other objects that may be added in the future
}
