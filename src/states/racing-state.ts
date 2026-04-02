import type {
  CameraState,
  Entity,
  GameContext,
  GameState,
  InputState,
  TrackBounds,
} from "../types";
import { createBoatEntity } from "../entity";
import { createPlaceholderTrack } from "../track";
import { updatePhysics } from "../systems/physics";
import { resolveCollisions } from "../systems/collision";
import { updateCamera, applyCameraTransform } from "../systems/camera";
import { renderBoat } from "../systems/boat-render";
import { renderBackground } from "../systems/background-render";

export class RacingState implements GameState {
  private gameCtx!: GameContext;
  private player!: Entity;
  private track!: TrackBounds;
  private camera!: CameraState;

  enter(ctx: GameContext) {
    this.gameCtx = ctx;
    this.track = createPlaceholderTrack();
    this.player = createBoatEntity(this.track.startX, this.track.startY, this.track.startAngle);
    this.camera = {
      x: this.track.startX,
      y: this.track.startY,
      angle: this.track.startAngle,
      zoom: 1.4,
    };
  }

  exit() {}

  update(dt: number, input: InputState) {
    updatePhysics(this.player, input, dt);
    resolveCollisions(this.player, this.track);
  }

  render(ctx: CanvasRenderingContext2D, alpha: number) {
    const w = this.gameCtx.canvas.width;
    const h = this.gameCtx.canvas.height;

    // Clear
    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, w, h);

    // Camera
    updateCamera(this.camera, this.player, alpha);
    applyCameraTransform(ctx, this.camera, w, h);

    // World
    renderBackground(ctx, this.track);
    renderBoat(ctx, this.player, alpha);

    // Restore to screen space
    ctx.restore();

    // HUD
    this.renderHUD(ctx, w);
  }

  private renderHUD(ctx: CanvasRenderingContext2D, w: number) {
    const vel = this.player.velocity;
    const speed = Math.sqrt(vel.forward ** 2 + vel.lateral ** 2);
    const motor = this.player.motor;

    ctx.font = "14px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "right";
    ctx.fillText(`speed: ${speed.toFixed(0)}`, w - 20, 30);
    if (motor) {
      ctx.fillText(`motor: ${(motor.voltage * 100).toFixed(0)}%`, w - 20, 50);
    }
  }
}
