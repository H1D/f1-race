import type {
  CameraState,
  CollisionResult,
  DualInput,
  Entity,
  FloodState,
  GameContext,
  GameState,
  MapData,
  Particle,
  PowerupDefinition,
  SpawnManagerState,
  TrackBounds,
} from "../types";
import { LAYER_BOAT } from "../types";
import { createBoatEntity } from "../entity";
import { getCurrentMap } from "../map/map-data";
import { updatePhysics } from "../systems/physics";
import { resolveMapCollisions, resolveBoatCollision } from "../systems/collision";
import { updateCamera, applyCameraTransform } from "../systems/camera";
import { renderBoat } from "../systems/boat-render";
import { renderMap, renderBridges } from "../map/map-renderer";
import { createDebugMenu, debugSettings } from "../debug";
import { createEntityManager, type EntityManager } from "../entity-manager";
import { createSpawnManagerState, updatePowerupSpawning } from "../systems/powerup-spawn";
import { detectPowerupPickups } from "../systems/powerup-collision";
import { applyPickupEvents, tickActiveEffects, processExpirations } from "../systems/powerup-effects";
import { tickLifetimes } from "../systems/entity-lifetime";
import { processZoneEffects } from "../systems/zone-effects";
import { renderPickups, renderZones, renderObstacles, renderActiveEffectVisuals, renderEffectsHUD } from "../systems/powerup-render";
import { loadPowerupDefinitions } from "../powerups/registry";
import { createPowerupDebugSection } from "../powerup-debug";
import { createGameLog, renderGameLog, type GameLog } from "../game-log";
import {
  createParticlePool,
  emitBowSpray,
  emitCollisionSparks,
  emitWake,
  renderParticles,
  updateParticles,
} from "../systems/particles";
import { EditorState } from "../editor/editor-state";
import {
  createFloodSystem,
  createBoatPenalty,
  updateFlood,
  isFlooding,
  checkFloodPenalty,
  markPenaltyChecked,
  updateBoatPenalty,
  renderFloodScreen,
  renderFloodedAttributes,
  createFloodSettingsPanel,
  type FloodSystem,
  type BoatPenalty,
} from "../systems/flooding";

/** Derive TrackBounds from polygon MapData for powerup spawn point generation. */
function trackBoundsFromMap(map: MapData): TrackBounds {
  const xs = map.outline.map((p) => p.x);
  const ys = map.outline.map((p) => p.y);
  const ixs = map.island.map((p) => p.x);
  const iys = map.island.map((p) => p.y);
  return {
    outer: {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    },
    inner: {
      minX: Math.min(...ixs),
      minY: Math.min(...iys),
      maxX: Math.max(...ixs),
      maxY: Math.max(...iys),
    },
    startX: map.startPos.x,
    startY: map.startPos.y,
    startAngle: map.startAngle,
  };
}

export class RacingState implements GameState {
  private gameCtx!: GameContext;
  private player1!: Entity;
  private player2!: Entity;
  private map!: MapData;
  private camera!: CameraState;
  private debugPanel: HTMLElement | null = null;
  private powerupDebugPanel: HTMLElement | null = null;
  private editorBtn: HTMLButtonElement | null = null;
  private entityManager!: EntityManager;
  private spawnState!: SpawnManagerState;
  private floodState!: FloodState;
  private powerupDefs!: Map<string, PowerupDefinition>;
  private elapsedTime = 0;
  private gameLog!: GameLog;
  private prevFloodActive = false;
  private lastDt = 1 / 60;
  private flood!: FloodSystem;
  private floodPanel: HTMLElement | null = null;
  private penalty1!: BoatPenalty;
  private penalty2!: BoatPenalty;
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
      _zoomVelocity: 0,
    };

    this.particles = createParticlePool(512);
    this.flood = createFloodSystem();
    this.penalty1 = createBoatPenalty();
    this.penalty2 = createBoatPenalty();
    this.floodPanel = createFloodSettingsPanel(this.flood);

    if (this.player1.boatPhysics) {
      this.debugPanel = createDebugMenu(
        this.player1.boatPhysics,
        this.camera,
        this.player2.boatPhysics,
      );
    }

    // Powerup setup — both boats can pick up
    this.player1.collider = { radius: 16, layer: LAYER_BOAT };
    this.player1.activeEffects = { effects: [] };
    this.player2.collider = { radius: 16, layer: LAYER_BOAT };
    this.player2.activeEffects = { effects: [] };

    this.entityManager = createEntityManager();
    this.entityManager.add(this.player1);
    this.entityManager.add(this.player2);

    const trackBounds = trackBoundsFromMap(this.map);
    this.spawnState = createSpawnManagerState(trackBounds);
    this.floodState = { active: false, level: 0, timeRemaining: 0 };
    this.powerupDefs = loadPowerupDefinitions();
    this.gameLog = createGameLog();

    this.powerupDebugPanel = createPowerupDebugSection({
      player: this.player1,
      spawnState: this.spawnState,
      floodState: this.floodState,
      powerupDefs: this.powerupDefs,
      entityManager: this.entityManager,
      gameLog: this.gameLog,
    });
    this.debugPanel?.appendChild(this.powerupDebugPanel);

    this.gameLog.log("Race started", "system");

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
    this.powerupDebugPanel?.remove();
    this.debugPanel?.remove();
    this.editorBtn?.remove();
    this.floodPanel?.remove();
    document.getElementById("debug-toggle")?.remove();
    document.getElementById("flood-toggle-btn")?.remove();
  }

  update(dt: number, input: DualInput) {
    this.lastDt = dt;
    this.gameLog.elapsedTime += dt;

    // Flood system
    updateFlood(this.flood, dt);
    const flooded = isFlooding(this.flood);

    // Sync flood state for powerup system
    this.floodState.active = flooded;
    this.floodState.level = this.flood.waterLevel;
    this.floodState.timeRemaining = this.flood.state === "flooding"
      ? Math.max(0, this.flood.floodDuration - this.flood.timer) : 0;

    // Check penalties when flood recedes
    checkFloodPenalty(this.player1, this.map, this.flood, this.penalty1);
    checkFloodPenalty(this.player2, this.map, this.flood, this.penalty2);
    markPenaltyChecked(this.flood);

    // Player 1: penalty → physics → collision → particles
    updateBoatPenalty(this.player1, this.map, this.penalty1, dt);
    if (!this.penalty1.active) {
      updatePhysics(this.player1, input.player1, dt);
      resolveMapCollisions(this.player1, this.map, flooded);
    }
    emitWake(this.particles, this.player1);
    emitBowSpray(this.particles, this.player1);

    // Player 2: penalty → physics → collision → particles
    updateBoatPenalty(this.player2, this.map, this.penalty2, dt);
    if (!this.penalty2.active) {
      updatePhysics(this.player2, input.player2, dt);
      resolveMapCollisions(this.player2, this.map, flooded);
    }
    emitWake(this.particles, this.player2);
    emitBowSpray(this.particles, this.player2);

    // Boat-to-boat collision
    const boatHit = resolveBoatCollision(this.player1, this.player2);
    if (boatHit) {
      const p1 = this.player1.transform.pos;
      const p2 = this.player2.transform.pos;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      this.collisionResult.collided = true;
      this.collisionResult.contactX = (p1.x + p2.x) / 2;
      this.collisionResult.contactY = (p1.y + p2.y) / 2;
      this.collisionResult.normalX = dx / d;
      this.collisionResult.normalY = dy / d;
      this.collisionResult.impactSpeed = Math.sqrt(
        (this.player1.velocity.x - this.player2.velocity.x) ** 2 +
        (this.player1.velocity.y - this.player2.velocity.y) ** 2,
      );
      emitCollisionSparks(this.particles, this.collisionResult);
    } else {
      this.collisionResult.collided = false;
    }

    updateParticles(this.particles, dt);

    // Powerup spawning
    const trackBounds = trackBoundsFromMap(this.map);
    const newPickups = updatePowerupSpawning(
      this.entityManager.entities, trackBounds, this.floodState,
      this.powerupDefs, dt, this.spawnState,
    );
    this.entityManager.addMany(newPickups);
    for (const pickup of newPickups) {
      const def = this.powerupDefs.get(pickup.powerupPickup!.powerupId);
      if (def) {
        this.gameLog.log(`${def.visual?.hudIcon ?? "?"} ${def.name} spawned`, "spawn");
      }
    }

    // Pickup collision detection (both boats can pick up)
    const boats = this.entityManager.getByTag("player");
    const pickups = this.entityManager.getWithComponent("powerupPickup");
    const pickupEvents = detectPowerupPickups(boats, pickups);

    for (const event of pickupEvents) {
      const def = this.powerupDefs.get(event.powerupId);
      if (def) {
        this.gameLog.log(`Player picked up ${def.visual?.hudIcon ?? "?"} ${def.name}`, "pickup");
      }
    }

    // Apply pickup effects
    const spawnedEntities = applyPickupEvents(
      pickupEvents, this.entityManager.entities, this.powerupDefs,
    );
    this.entityManager.addMany(spawnedEntities);

    // Snapshot active effects before tick/expiration
    const effectsBefore = new Set(
      this.player1.activeEffects?.effects.map((e) => e.powerupId) ?? [],
    );

    tickActiveEffects(this.entityManager.entities, this.powerupDefs, dt);
    processExpirations(this.entityManager.entities, this.powerupDefs);

    // Log expired effects
    const effectsAfter = new Set(
      this.player1.activeEffects?.effects.map((e) => e.powerupId) ?? [],
    );
    for (const id of effectsBefore) {
      if (!effectsAfter.has(id)) {
        const def = this.powerupDefs.get(id);
        if (def) {
          this.gameLog.log(`${def.visual?.hudIcon ?? "?"} ${def.name} expired`, "effect");
        }
      }
    }

    // Zone effects
    const zones = this.entityManager.getWithComponent("zone");
    processZoneEffects(zones, boats, this.powerupDefs, dt);

    // Tick lifetimes on temporary entities
    tickLifetimes(this.entityManager.entities, dt);

    // Cleanup removed entities
    this.entityManager.cleanup();

    // Flood state change detection
    if (this.floodState.active !== this.prevFloodActive) {
      if (this.floodState.active) {
        this.gameLog.log("Flooding started!", "flood");
      } else {
        this.gameLog.log("Flood receding...", "flood");
      }
      this.prevFloodActive = this.floodState.active;
    }
  }

  render(ctx: CanvasRenderingContext2D, alpha: number) {
    const w = this.gameCtx.canvas.width;
    const h = this.gameCtx.canvas.height;

    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, w, h);

    updateCamera(this.camera, w, h, this.lastDt);
    applyCameraTransform(ctx, this.camera, w, h);

    // World (polygon map)
    renderMap(ctx, this.map);

    // Zones (ground level, under boats)
    const zones = this.entityManager.getWithComponent("zone");
    renderZones(ctx, zones, alpha);

    // Pickups
    this.elapsedTime += 1 / 60;
    const pickups = this.entityManager.getWithComponent("powerupPickup");
    renderPickups(ctx, pickups, alpha, this.elapsedTime);

    // Obstacles
    const obstacles = this.entityManager.getByTag("obstacle");
    renderObstacles(ctx, obstacles, alpha);

    // Particles (world-space)
    renderParticles(ctx, this.particles);

    this.renderBoatWithPenalty(ctx, this.player1, alpha, this.penalty1);
    this.renderBoatWithPenalty(ctx, this.player2, alpha, this.penalty2);

    if (debugSettings.showBoatCollision) {
      this.renderCollisionCircle(ctx, this.player1, alpha, "#e04040");
      this.renderCollisionCircle(ctx, this.player2, alpha, "#e0c040");
    }

    renderBridges(ctx, this.map);

    renderActiveEffectVisuals(ctx, this.player1, this.powerupDefs, alpha);

    ctx.restore();

    // Flood overlay in screen space (bottom → top)
    renderFloodScreen(ctx, this.flood, w, h);

    // Attributes float on top of the flood water
    if (this.flood.waterLevel > 0.05 && this.flood.affectObjects) {
      ctx.save();
      // Re-apply camera transform so attributes render in world space on top of flood
      applyCameraTransform(ctx, this.camera, w, h);
      renderFloodedAttributes(ctx, this.map, this.flood);
      ctx.restore();
    }

    this.renderHUD(ctx, w);
    this.renderFloodHUD(ctx, w, h);
    renderEffectsHUD(ctx, this.player1, this.powerupDefs, w);

    // Event log
    renderGameLog(ctx, this.gameLog, w, h);
  }

  private renderHUD(ctx: CanvasRenderingContext2D, w: number) {
    const v1 = this.player1.velocity;
    const s1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const v2 = this.player2.velocity;
    const s2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

    ctx.font = "14px monospace";
    ctx.textAlign = "right";

    ctx.fillStyle = this.penalty1.active ? "rgba(255,80,80,0.9)" : "rgba(224,64,64,0.6)";
    ctx.fillText(
      this.penalty1.active ? `P1: PENALTY ${this.penalty1.remaining.toFixed(1)}s` : `P1: ${s1.toFixed(0)}`,
      w - 20, 30,
    );

    ctx.fillStyle = this.penalty2.active ? "rgba(255,200,80,0.9)" : "rgba(224,192,64,0.6)";
    ctx.fillText(
      this.penalty2.active ? `P2: PENALTY ${this.penalty2.remaining.toFixed(1)}s` : `P2: ${s2.toFixed(0)}`,
      w - 20, 50,
    );
  }

  private renderBoatWithPenalty(
    ctx: CanvasRenderingContext2D,
    boat: Entity,
    alpha: number,
    penalty: BoatPenalty,
  ) {
    if (penalty.active) {
      const flash = Math.sin(Date.now() / 125 * Math.PI) > 0;
      if (!flash) return;
      ctx.globalAlpha = 0.5;
      renderBoat(ctx, boat, alpha);
      ctx.globalAlpha = 1;
    } else {
      renderBoat(ctx, boat, alpha);
    }
  }

  private renderCollisionCircle(
    ctx: CanvasRenderingContext2D,
    boat: Entity,
    alpha: number,
    color: string,
  ) {
    const tf = boat.transform;
    const x = tf.prevPos.x + (tf.pos.x - tf.prevPos.x) * alpha;
    const y = tf.prevPos.y + (tf.pos.y - tf.prevPos.y) * alpha;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private renderFloodHUD(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (!this.flood.enabled) return;
    const f = this.flood;
    const cx = w / 2;
    const cy = h / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (f.state === "idle") {
      const until = Math.max(0, f.cycleInterval - f.timer);
      if (until <= 5) {
        const n = Math.ceil(until);
        const pulse = 1 + Math.sin(Date.now() / 150) * 0.15;
        const size = Math.round(64 * pulse);
        ctx.font = `bold ${size}px monospace`;
        ctx.fillStyle = `rgba(255,200,50,${0.8 + Math.sin(Date.now() / 200) * 0.2})`;
        ctx.fillText(`FLOODING IN ${n}`, cx, cy);
      }
    } else if (f.state === "flooding") {
      const remaining = Math.max(0, f.floodDuration - f.timer);
      const n = Math.ceil(remaining);

      ctx.font = "bold 56px monospace";
      ctx.fillStyle = `rgba(50,180,255,${0.8 + Math.sin(Date.now() / 200) * 0.15})`;
      ctx.fillText("FLOODED", cx, cy - 30);

      if (remaining <= 5) {
        const pulse = 1 + Math.sin(Date.now() / 150) * 0.1;
        const size = Math.round(48 * pulse);
        ctx.font = `bold ${size}px monospace`;
        ctx.fillStyle = "rgba(255,150,50,0.9)";
        ctx.fillText(`ENDS IN ${n}`, cx, cy + 35);
      }
    } else if (f.state === "recovering") {
      ctx.font = "bold 44px monospace";
      ctx.fillStyle = "rgba(50,150,255,0.5)";
      ctx.fillText("RECEDING...", cx, cy);
    }

    ctx.textBaseline = "alphabetic";
  }
}
