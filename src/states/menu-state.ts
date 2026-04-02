import type { DualInput, GameContext, GameState } from "../types";
import { getCurrentMap } from "../map/map-data";
import { renderMap, renderBridges } from "../map/map-renderer";
import { RacingState } from "./racing-state";
import { UI } from "../ui-text";

export class MenuState implements GameState {
  private gameCtx!: GameContext;
  private spaceWasUp = false;
  private time = 0;

  enter(ctx: GameContext) {
    this.gameCtx = ctx;
    this.spaceWasUp = false;
    this.time = 0;
  }

  exit() {}

  update(dt: number, input: DualInput) {
    this.time += dt;
    const anyThrottle = input.player1.throttle || input.player2.throttle;
    if (!anyThrottle) this.spaceWasUp = true;
    if (this.spaceWasUp && anyThrottle) {
      this.gameCtx.switchState(new RacingState());
    }
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const map = getCurrentMap();

    // Slow orbiting camera over the map
    const camAngle = this.time * 0.15;
    const camX = Math.cos(camAngle) * 200;
    const camY = Math.sin(camAngle) * 150;
    const zoom = 0.35 + Math.sin(this.time * 0.1) * 0.05;

    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, w, h);

    // Render map as background
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);
    renderMap(ctx, map);
    renderBridges(ctx, map);
    ctx.restore();

    // Dark overlay so text is readable
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const pulse = 1 + Math.sin(this.time * 3) * 0.03;
    ctx.font = `bold ${Math.round(56 * pulse)}px monospace`;
    ctx.fillText(UI.menu.title, w / 2, h / 2 - 50);

    // Subtitle
    ctx.font = "20px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(UI.menu.startPrompt, w / 2, h / 2 + 20);

    // Controls
    ctx.font = "14px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText(UI.menu.controls, w / 2, h / 2 + 60);

    // Blinking prompt
    if (Math.sin(this.time * 4) > 0) {
      ctx.font = "16px monospace";
      ctx.fillStyle = "rgba(100,200,255,0.6)";
      ctx.fillText(">>> START <<<", w / 2, h / 2 + 110);
    }

    ctx.textBaseline = "alphabetic";
  }
}
