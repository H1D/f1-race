import type { GameContext, GameState } from "./types";
import { createInputSystem } from "./input";
import { createGameLoop } from "./game-loop";
import { createStateManager } from "./state-manager";
import { MenuState } from "./states/menu-state";

// Canvas setup
const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// Input
const input = createInputSystem();

// Game context (switchState is wired by createStateManager)
const gameCtx: GameContext = {
  canvas,
  ctx,
  switchState: (_s: GameState) => {},
  input: input.state,
};

// State manager
const states = createStateManager(gameCtx);

// Game loop: fixed timestep physics + interpolated render
const loop = createGameLoop(
  (dt) => {
    input.update(dt);
    states.update(dt, input.state);
  },
  (alpha) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    states.render(ctx, alpha);
  },
);

// Start
states.switch(new MenuState());
loop.start();
