export function Animation(frames, update, killSignal) {
  let currentFrame = frames
  return {
    next: () => {
      update(currentFrame)
      currentFrame--
    },
    ended: () => killSignal(currentFrame),
  }
}
