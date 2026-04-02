import type {
  CameraState,
  CollisionResult,
  DualInput,
  Entity,
  GameContext,
  GameState,
  Particle,
  TrackBounds,
} from "../types";
import { createBoatEntity } from "../entity";
import { createPlaceholderTrack } from "../track";
import { updatePhysics } from "../systems/physics";
import { resolveCollisions } from "../systems/collision";
import { updateCamera, applyCameraTransform } from "../systems/camera";
import { renderBoat } from "../systems/boat-render";
import { renderBackground } from "../systems/background-render";
import { createDebugMenu } from "../debug";
import {
  createParticlePool,
  emitCollisionSparks,
  emitWake,
  renderParticles,
  updateParticles,
} from "../systems/particles";

export class RacingState implements GameState {
  private gameCtx!: GameContext;
  private player1!: Entity;
  private player2!: Entity;
  private track!: TrackBounds;
  private camera!: CameraState;
  private debugPanel: HTMLElement | null = null;
  private lastDt = 1 / 60;
  private particles!: Particle[];
  private collisionResult: CollisionResult = {
    collided: false,
    contactX: 0,
    contactY: 0,
    normalX: 0,
    normalY: 0,
    impactSpeed: 0,
  };

  enter(ctx: GameContext) {
    this.gameCtx = ctx;
    this.track = createPlaceholderTrack();

    // Boat 1 (WASD) — red
    this.player1 = createBoatEntity(this.track.startX, this.track.startY, this.track.startAngle);

    // Boat 2 (Arrows) — offset and blue
    this.player2 = createBoatEntity(this.track.startX, this.track.startY + 50, this.track.startAngle);
    if (this.player2.render) {
      this.player2.render.color = "#e0c040";
    }

    this.camera = {
      x: this.track.startX,
      y: this.track.startY,
      angle: 0,
      zoom: 1.4,
      followTarget: null,
      entities: [this.player1, this.player2],
      _prevTarget: null,
      _transitionElapsed: 999,
    };

    this.particles = createParticlePool(512);

    if (this.player1.boatPhysics) {
      this.debugPanel = createDebugMenu(this.player1.boatPhysics, this.camera, this.player2.boatPhysics ?? undefined);
    }
  }

  exit() {
    this.debugPanel?.remove();
    document.getElementById("debug-toggle")?.remove();
  }

  update(dt: number, input: DualInput) {
    this.lastDt = dt;

    // Player 1: physics → collision → particles
    updatePhysics(this.player1, input.player1, dt);
    resolveCollisions(this.player1, this.track, this.collisionResult);
    emitWake(this.particles, this.player1);
    emitCollisionSparks(this.particles, this.collisionResult);

    // Player 2: physics → collision → particles
    updatePhysics(this.player2, input.player2, dt);
    resolveCollisions(this.player2, this.track, this.collisionResult);
    emitWake(this.particles, this.player2);
    emitCollisionSparks(this.particles, this.collisionResult);

    // Particle physics
    updateParticles(this.particles, dt);
  }

  render(ctx: CanvasRenderingContext2D, alpha: number) {
    const w = this.gameCtx.canvas.width;
    const h = this.gameCtx.canvas.height;

    // Clear
    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, w, h);

    // Camera
    updateCamera(this.camera, w, h, this.lastDt);
    applyCameraTransform(ctx, this.camera, w, h);

    // World
    renderBackground(ctx, this.track);
    renderParticles(ctx, this.particles);
    renderBoat(ctx, this.player1, alpha);
    renderBoat(ctx, this.player2, alpha);

    // Restore to screen space
    ctx.restore();

    // HUD
    this.renderHUD(ctx, w);
  }

  private renderHUD(ctx: CanvasRenderingContext2D, w: number) {
    ctx.font = "14px monospace";
    ctx.textAlign = "right";

    // Player 1 stats
    const vel1 = this.player1.velocity;
    const speed1 = Math.sqrt(vel1.x ** 2 + vel1.y ** 2);
    ctx.fillStyle = "rgba(224,64,64,0.7)";
    ctx.fillText(`P1 speed: ${speed1.toFixed(0)}`, w - 20, 30);

    // Player 2 stats
    const vel2 = this.player2.velocity;
    const speed2 = Math.sqrt(vel2.x ** 2 + vel2.y ** 2);
    ctx.fillStyle = "rgba(224,192,64,0.7)";
    ctx.fillText(`P2 speed: ${speed2.toFixed(0)}`, w - 20, 50);
  }
}
