/**
 * Global event registry
 * @type {Map<string, EventObject>}
 */
export const events = new Map();

/**
 * @typedef {Object} EventSubscription
 * @property {Function} unsubscribe - Function to unsubscribe from the event
 */

/**
 * @typedef {Object} EventObject
 * @property {Function} subscribe - Function to add a callback to the event
 * @property {Function} emit - Function to trigger the event with data
 */

/**
 * Creates or retrieves an event by name
 * 
 * @param {string} eventName - Unique name for the event
 * @returns {EventObject} Event object with subscribe and emit methods
 */
export function Event(eventName) {
  // Return existing event if already created
  if (events.has(eventName)) {
    return events.get(eventName);
  }

  /**
   * Set of callback functions subscribed to this event
   * @type {Set<Function>}
   */
  const observers = new Set();

  /**
   * The event object with subscribe and emit methods
   * @type {EventObject}
   */
  const eventObject = {
    /**
     * Subscribe to the event
     * @param {Function} callback - Function to call when event is emitted
     * @returns {EventSubscription} Subscription object with unsubscribe method
     */
    subscribe: (callback) => {
      observers.add(callback);
      return {
        unsubscribe: () => {
          observers.delete(callback);
        }
      };
    },

    /**
     * Emit the event with data
     * @param {*} data - Data to pass to all subscribed callbacks
     */
    emit: (data) => {
      observers.forEach(callback => {
        callback(data);
      });
    }
  };

  // Store and return the event object
  events.set(eventName, eventObject);
  return eventObject;
}
