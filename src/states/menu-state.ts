import type { DualInput, GameContext, GameState } from "../types";
import { RacingState } from "./racing-state";

export class MenuState implements GameState {
  private gameCtx!: GameContext;
  private spaceWasUp = false;

  enter(ctx: GameContext) {
    this.gameCtx = ctx;
    this.spaceWasUp = false;
  }

  exit() {}

  update(_dt: number, input: DualInput) {
    // Wait for throttle to be released first (avoid instant skip)
    const anyThrottle = input.player1.throttle || input.player2.throttle;
    if (!anyThrottle) this.spaceWasUp = true;
    if (this.spaceWasUp && anyThrottle) {
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
    ctx.fillText("Press W or UP to race", w / 2, h / 2 + 30);

    ctx.font = "14px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("P1: WASD  ·  P2: Arrow keys", w / 2, h / 2 + 70);
  }
}
