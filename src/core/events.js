export const events = new Map();

export function Event(name) {
  // Check if event already exists
  if (events.has(name)) {
    return events.get(name);
  }

  // Create new observers set
  const observers = new Set();

  // Create the event object
  const event = {
    subscribe: (callback) => {
      observers.add(callback);
      return {
        unsubscribe: () => {
          observers.delete(callback);
        }
      };
    },

    emit: (data) => {
      observers.forEach(callback => {
        callback(data);
      });
    }
  };

  events.set(name, event);
  return event;
}
