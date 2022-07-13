export const events = new Map()

export function Event(name) {
  const _name = name
  const _observers = new Set()

  const subscribe = (cb) => {
    _observers.add(cb)

    const unsubscribe = () => {
      _observers.remove(cb)
    }

    return { unsubscribe }
  }

  const emit = (data) => {
    _observers.forEach((cb) => {
      cb(data)
    })
  }

  if (events.has(name)) {
    const event = events.get(name)
    if (event.length) {
      events.get(name).push({ subscribe, emit })
    } else {
      events.set(name, [event, {subscribe, emit}])
    }
  } else {
    events.set(name, { subscribe, emit })
  }
  return { subscribe, emit }
}
