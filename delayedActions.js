import { Event } from './events.js';

// Delayed actions event
export const delayedActionsEvent = Event('delayed_actions');

// Create a delayed action
export const createDelayedAction = (delay, callback, id = null) => {
  const action = {
    id: id || `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    delay,
    execute: callback
  };

  delayedActionsEvent.emit(action);
  return action.id;
};

// Cancel a delayed action by id
export const cancelDelayedAction = (id, actions) => {
  const index = actions.findIndex(action => action.id === id);
  if (index !== -1) {
    actions.splice(index, 1);
    return true;
  }
  return false;
};

// Process all delayed actions
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
