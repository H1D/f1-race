const TICK_RATE = 60;
const DT = 1 / TICK_RATE;
const MAX_FRAME_TIME = 0.25; // clamp to avoid spiral of death

export function createGameLoop(
  update: (dt: number) => void,
  render: (alpha: number) => void,
): { start(): void; stop(): void } {
  let accumulator = 0;
  let lastTime = 0;
  let rafId = 0;

  function frame(timestamp: number) {
    const frameTime = Math.min((timestamp - lastTime) / 1000, MAX_FRAME_TIME);
    lastTime = timestamp;
    accumulator += frameTime;

    while (accumulator >= DT) {
      update(DT);
      accumulator -= DT;
    }

    render(accumulator / DT);
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      lastTime = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(rafId);
    },
  };
}

export { DT };
