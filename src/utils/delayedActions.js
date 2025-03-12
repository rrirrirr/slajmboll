import { Event } from '../core/events.js';

/**
 * Event for delayed actions
 * @type {Object}
 */
export const delayedActionsEvent = Event('delayed_actions');

/**
 * @typedef {Object} DelayedAction
 * @property {string} id - Unique identifier for the action
 * @property {number} delay - Frames remaining before execution
 * @property {Function} execute - Function to call when delay expires
 */

/**
 * Creates and registers a delayed action
 * 
 * @param {number} delay - Number of frames to wait before executing
 * @param {Function} callback - Function to call after delay
 * @param {string} [id=null] - Optional identifier (auto-generated if not provided)
 * @returns {string} ID of the created action
 */
export const createDelayedAction = (delay, callback, id = null) => {
  const actionId = id || generateActionId();

  const action = {
    id: actionId,
    delay,
    execute: callback
  };

  delayedActionsEvent.emit(action);
  return actionId;
};

/**
 * Generates a unique ID for an action
 * 
 * @returns {string} Unique action identifier
 */
function generateActionId() {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Cancels a delayed action by ID
 * 
 * @param {string} id - ID of the action to cancel
 * @param {Array} actions - Array of current actions
 * @returns {boolean} True if the action was found and canceled
 */
export const cancelDelayedAction = (id, actions) => {
  const index = actions.findIndex(action => action.id === id);
  if (index !== -1) {
    actions.splice(index, 1);
    return true;
  }
  return false;
};

/**
 * Processes all active delayed actions
 * 
 * @param {Array} actions - Array of delayed actions to process
 * @returns {Array} Updated array with remaining actions
 */
export const processDelayedActions = (actions) => {
  return actions.filter(action => {
    action.delay--;
    if (action.delay <= 0) {
      action.execute();
      return false;
    }
    return true;
  });
};

/**
 * Creates a function that will be called only after a specified delay
 * 
 * @param {Function} func - Function to delay
 * @param {number} delay - Delay in frames
 * @returns {Function} Function that schedules delayed execution
 */
export const delayedExecution = (func, delay) => {
  return (...args) => {
    createDelayedAction(delay, () => func(...args));
  };
};
