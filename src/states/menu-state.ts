import type { GameContext, GameState, InputState } from "../types";
import { RacingState } from "./racing-state";

export class MenuState implements GameState {
  private gameCtx!: GameContext;
  private spaceWasUp = false;

  enter(ctx: GameContext) {
    this.gameCtx = ctx;
    this.spaceWasUp = false;
  }

  exit() {}

  update(_dt: number, input: InputState) {
    // Wait for space to be released first (avoid instant skip)
    if (!input.throttle) this.spaceWasUp = true;
    if (this.spaceWasUp && input.throttle) {
      this.gameCtx.switchState(new RacingState());
    }
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    ctx.fillStyle = "#1a3a5c";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "bold 48px monospace";
    ctx.fillText("BOAT RACE", w / 2, h / 2 - 40);

    ctx.font = "20px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("Press SPACE to race", w / 2, h / 2 + 30);

    ctx.font = "14px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("← → steer  ·  SPACE / ↑ throttle", w / 2, h / 2 + 70);
  }
}
