import type { InputState } from "./types";

const STEER_ACCEL = 6.0; // how fast steering builds toward ±1
const STEER_DECAY = 8.0; // how fast it returns to center

function createInputState(): InputState {
  return { left: false, right: false, throttle: false, reverse: false, steeringAccum: 0 };
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

  const onDown = (e: KeyboardEvent) => {
    keys.add(e.code);
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
      // Player 1: WASD
      player1.left = keys.has("KeyA");
      player1.right = keys.has("KeyD");
      player1.throttle = keys.has("KeyW");
      player1.reverse = keys.has("KeyS");
      updateSteering(player1, dt);

      // Player 2: Arrow keys
      player2.left = keys.has("ArrowLeft");
      player2.right = keys.has("ArrowRight");
      player2.throttle = keys.has("ArrowUp");
      player2.reverse = keys.has("ArrowDown");
      updateSteering(player2, dt);
    },

    destroy() {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    },
  };
}
