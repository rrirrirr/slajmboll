export const events = new Map()

export function Event(name) {
  const _name = name;
  const _observers = new Set();

  const subscribe = (cb) => {
    _observers.add(cb);

    const unsubscribe = () => {
      _observers.delete(cb); // Fix: use delete instead of remove
    };

    return { unsubscribe };
  };

  const emit = (data) => {
    _observers.forEach((cb) => {
      cb(data);
    });
  };

  // Check if event already exists
  if (events.has(name)) {
    const existingEvent = events.get(name);
    // Return the existing event instead of creating a new one
    return existingEvent;
  } else {
    // Create new event and store it
    const newEvent = { subscribe, emit };
    events.set(name, newEvent);
    return newEvent;
  }
}
