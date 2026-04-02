import type {
  CameraState,
  DualInput,
  Entity,
  FloodState,
  GameContext,
  GameState,
  PowerupDefinition,
  SpawnManagerState,
  TrackBounds,
} from "../types";
import { LAYER_BOAT } from "../types";
import { createBoatEntity } from "../entity";
import { createPlaceholderTrack } from "../track";
import { updatePhysics } from "../systems/physics";
import { resolveCollisions } from "../systems/collision";
import { updateCamera, applyCameraTransform } from "../systems/camera";
import { renderBoat } from "../systems/boat-render";
import { renderBackground } from "../systems/background-render";
import { createDebugMenu } from "../debug";
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

export class RacingState implements GameState {
  private gameCtx!: GameContext;
  private player1!: Entity;
  private player2!: Entity;
  private track!: TrackBounds;
  private camera!: CameraState;
  private debugPanel: HTMLElement | null = null;
  private powerupDebugPanel: HTMLElement | null = null;
  private entityManager!: EntityManager;
  private spawnState!: SpawnManagerState;
  private floodState!: FloodState;
  private powerupDefs!: Map<string, PowerupDefinition>;
  private elapsedTime = 0;
  private gameLog!: GameLog;
  private prevFloodActive = false;
  private lastDt = 1 / 60;

  enter(ctx: GameContext) {
    this.gameCtx = ctx;
    this.track = createPlaceholderTrack();

    // Boat 1 (WASD) — red
    this.player1 = createBoatEntity(this.track.startX, this.track.startY, this.track.startAngle);

    // Boat 2 (Arrows) — offset and yellow
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

    if (this.player1.boatPhysics) {
      this.debugPanel = createDebugMenu(this.player1.boatPhysics, this.camera, this.player2.boatPhysics ?? undefined);
    }

    // Powerup setup — both boats can pick up
    this.player1.collider = { radius: 16, layer: LAYER_BOAT };
    this.player1.activeEffects = { effects: [] };
    this.player2.collider = { radius: 16, layer: LAYER_BOAT };
    this.player2.activeEffects = { effects: [] };

    this.entityManager = createEntityManager();
    this.entityManager.add(this.player1);
    this.entityManager.add(this.player2);

    this.spawnState = createSpawnManagerState(this.track);
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
  }

  exit() {
    this.powerupDebugPanel?.remove(); // clears interval timer
    this.debugPanel?.remove();
    document.getElementById("debug-toggle")?.remove();
  }

  update(dt: number, input: DualInput) {
    this.lastDt = dt;
    this.gameLog.elapsedTime += dt;

    updatePhysics(this.player1, input.player1, dt);
    updatePhysics(this.player2, input.player2, dt);
    resolveCollisions(this.player1, this.track);
    resolveCollisions(this.player2, this.track);

    // Powerup spawning
    const newPickups = updatePowerupSpawning(
      this.entityManager.entities, this.track, this.floodState,
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

    // Clear
    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, w, h);

    // Camera
    updateCamera(this.camera, w, h, this.lastDt);
    applyCameraTransform(ctx, this.camera, w, h);

    // World
    renderBackground(ctx, this.track);

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

    renderBoat(ctx, this.player1, alpha);
    renderBoat(ctx, this.player2, alpha);

    renderActiveEffectVisuals(ctx, this.player1, this.powerupDefs, alpha);

    // Restore to screen space
    ctx.restore();

    // HUD
    this.renderHUD(ctx, w);
    renderEffectsHUD(ctx, this.player1, this.powerupDefs, w);

    // Event log
    renderGameLog(ctx, this.gameLog, w, h);
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
