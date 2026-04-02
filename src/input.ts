import type { InputState } from "./types";

const STEER_ACCEL = 6.0; // how fast steering builds toward ±1
const STEER_DECAY = 8.0; // how fast it returns to center

export function createInputSystem(): {
  state: InputState;
  update(dt: number): void;
  destroy(): void;
} {
  const keys = new Set<string>();

  const onDown = (e: KeyboardEvent) => {
    keys.add(e.code);
  };
  const onUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
  };
  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);

  const state: InputState = {
    left: false,
    right: false,
    throttle: false,
    steeringAccum: 0,
  };

  return {
    state,

    update(dt: number) {
      state.left = keys.has("ArrowLeft") || keys.has("KeyA");
      state.right = keys.has("ArrowRight") || keys.has("KeyD");
      state.throttle = keys.has("ArrowUp") || keys.has("KeyW") || keys.has("Space");

      const dir = (state.left ? -1 : 0) + (state.right ? 1 : 0);
      if (dir !== 0) {
        state.steeringAccum = Math.max(
          -1,
          Math.min(1, state.steeringAccum + dir * STEER_ACCEL * dt),
        );
      } else {
        const decay = STEER_DECAY * dt;
        if (Math.abs(state.steeringAccum) < decay) {
          state.steeringAccum = 0;
        } else {
          state.steeringAccum -= Math.sign(state.steeringAccum) * decay;
        }
      }
    },

    destroy() {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    },
  };
}
