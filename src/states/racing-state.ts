import type { CameraState, CollisionResult, DualInput, Entity, GameContext, GameState, MapData, Particle } from "../types";
import { createBoatEntity } from "../entity";
import { getCurrentMap } from "../map/map-data";
import { updatePhysics } from "../systems/physics";
import { resolveMapCollisions } from "../systems/collision";
import { updateCamera, applyCameraTransform } from "../systems/camera";
import { renderBoat } from "../systems/boat-render";
import { renderMap, renderBridges } from "../map/map-renderer";
import { createDebugMenu } from "../debug";
import {
  createParticlePool,
  emitBowSpray,
  emitCollisionSparks,
  emitWake,
  renderParticles,
  updateParticles,
} from "../systems/particles";
import { EditorState } from "../editor/editor-state";

export class RacingState implements GameState {
  private gameCtx!: GameContext;
  private player1!: Entity;
  private player2!: Entity;
  private map!: MapData;
  private camera!: CameraState;
  private debugPanel: HTMLElement | null = null;
  private editorBtn: HTMLButtonElement | null = null;
  private particles!: Particle[];
  private collisionResult: CollisionResult = {
    collided: false,
    contactX: 0,
    contactY: 0,
    normalX: 0,
    normalY: 0,
    impactSpeed: 0,
  };
  private lastDt = 1 / 60;

  enter(ctx: GameContext) {
    this.gameCtx = ctx;
    this.map = getCurrentMap();

    // Player 1 (red, WASD)
    this.player1 = createBoatEntity(
      this.map.startPos.x,
      this.map.startPos.y,
      this.map.startAngle,
    );
    this.player1.render!.color = "#e04040";

    // Player 2 (yellow, Arrows) — offset 50 units to the side
    const offsetX = Math.cos(this.map.startAngle + Math.PI / 2) * 50;
    const offsetY = Math.sin(this.map.startAngle + Math.PI / 2) * 50;
    this.player2 = createBoatEntity(
      this.map.startPos.x + offsetX,
      this.map.startPos.y + offsetY,
      this.map.startAngle,
    );
    this.player2.render!.color = "#e0c040";

    this.camera = {
      x: this.map.startPos.x,
      y: this.map.startPos.y,
      angle: this.map.startAngle,
      zoom: 1.4,
      followTarget: null,
      entities: [this.player1, this.player2],
      _prevTarget: null,
      _transitionElapsed: 1000,
    };

    this.particles = createParticlePool(512);

    if (this.player1.boatPhysics) {
      this.debugPanel = createDebugMenu(
        this.player1.boatPhysics,
        this.camera,
        this.player2.boatPhysics,
      );
    }

    // Editor button
    this.editorBtn = document.createElement("button");
    this.editorBtn.textContent = "Editor";
    this.editorBtn.id = "editor-open-btn";
    this.editorBtn.style.cssText =
      "position:fixed;top:10px;left:10px;background:rgba(0,0,0,0.6);color:#f88;border:1px solid #555;padding:6px 14px;border-radius:6px;cursor:pointer;font:13px monospace;z-index:50;";
    this.editorBtn.addEventListener("click", () => {
      this.gameCtx.switchState(new EditorState());
    });
    document.body.appendChild(this.editorBtn);
  }

  exit() {
    this.debugPanel?.remove();
    this.editorBtn?.remove();
    document.getElementById("debug-toggle")?.remove();
  }

  update(dt: number, input: DualInput) {
    this.lastDt = dt;

    // Player 1: physics → collision → particles
    updatePhysics(this.player1, input.player1, dt);
    resolveMapCollisions(this.player1, this.map);
    emitWake(this.particles, this.player1);
    emitBowSpray(this.particles, this.player1);

    // Player 2: physics → collision → particles
    updatePhysics(this.player2, input.player2, dt);
    resolveMapCollisions(this.player2, this.map);
    emitWake(this.particles, this.player2);
    emitBowSpray(this.particles, this.player2);

    updateParticles(this.particles, dt);
  }

  render(ctx: CanvasRenderingContext2D, alpha: number) {
    const w = this.gameCtx.canvas.width;
    const h = this.gameCtx.canvas.height;

    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, w, h);

    updateCamera(this.camera, w, h, this.lastDt);
    applyCameraTransform(ctx, this.camera, w, h);

    renderMap(ctx, this.map);
    renderParticles(ctx, this.particles);
    renderBoat(ctx, this.player1, alpha);
    renderBoat(ctx, this.player2, alpha);
    renderBridges(ctx, this.map);

    ctx.restore();

    this.renderHUD(ctx, w);
  }

  private renderHUD(ctx: CanvasRenderingContext2D, w: number) {
    const v1 = this.player1.velocity;
    const s1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const v2 = this.player2.velocity;
    const s2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

    ctx.font = "14px monospace";
    ctx.textAlign = "right";

    ctx.fillStyle = "rgba(224,64,64,0.6)";
    ctx.fillText(`P1: ${s1.toFixed(0)}`, w - 20, 30);

    ctx.fillStyle = "rgba(224,192,64,0.6)";
    ctx.fillText(`P2: ${s2.toFixed(0)}`, w - 20, 50);
  }
}
