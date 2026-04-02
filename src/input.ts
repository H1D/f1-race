import type { InputState } from "./types";

const STEER_ACCEL = 6.0; // how fast steering builds toward ±1
const STEER_DECAY = 8.0; // how fast it returns to center

function createInputState(): InputState {
  return { left: false, right: false, throttle: false, reverse: false, steeringAccum: 0, useItem: false };
}

function updateSteering(state: InputState, dt: number): void {
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
}

export function createInputSystem(): {
  player1: InputState;
  player2: InputState;
  update(dt: number): void;
  destroy(): void;
} {
  const keys = new Set<string>();

  // One-shot use-item flags — set on keydown, consumed on next update()
  let useItem1 = false;
  let useItem2 = false;

  const onDown = (e: KeyboardEvent) => {
    keys.add(e.code);
    if (e.code === "KeyQ") useItem1 = true;
    if (e.code === "ShiftRight") useItem2 = true;
  };
  const onUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
  };
  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);

  const player1 = createInputState();
  const player2 = createInputState();

  return {
    player1,
    player2,

    update(dt: number) {
      // Player 1: WASD + Q (use item)
      player1.left = keys.has("KeyA");
      player1.right = keys.has("KeyD");
      player1.throttle = keys.has("KeyW");
      player1.reverse = keys.has("KeyS");
      player1.useItem = useItem1;
      useItem1 = false;
      updateSteering(player1, dt);

      // Player 2: Arrow keys + ShiftRight (use item)
      player2.left = keys.has("ArrowLeft");
      player2.right = keys.has("ArrowRight");
      player2.throttle = keys.has("ArrowUp");
      player2.reverse = keys.has("ArrowDown");
      player2.useItem = useItem2;
      useItem2 = false;
      updateSteering(player2, dt);
    },

    destroy() {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    },
  };
}
