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
  PowerupToast,
  SoundSystem,
  SpawnManagerState,
  TrackBounds,
} from "../types";
import { LAYER_BOAT } from "../types";
import { createBoatEntity } from "../entity";
import { getCurrentMap } from "../map/map-data";
import { updatePhysics } from "../systems/physics";
import {
  resolveMapCollisions,
  resolveBoatCollision,
  resolveBoatObstacleCollision,
} from "../systems/collision";
import { segmentsCross } from "../map/geometry";
import { updateCamera, applyCameraTransform } from "../systems/camera";
import { renderBoat } from "../systems/boat-render";
import { renderMap, renderBridges } from "../map/map-renderer";
import { createDebugMenu, debugSettings } from "../debug";
import { createEntityManager, type EntityManager } from "../entity-manager";
import {
  createSpawnManagerState,
  updatePowerupSpawning,
} from "../systems/powerup-spawn";
import { detectPowerupPickups } from "../systems/powerup-collision";
import {
  applyPickupEvents,
  activateInventoryEffect,
  tickActiveEffects,
  processExpirations,
} from "../systems/powerup-effects";
import {
  createAttributePickupSystem,
  updateAttributePickups,
  type AttributePickupSystem,
} from "../systems/attribute-pickups";
import { tickLifetimes } from "../systems/entity-lifetime";
import { processZoneEffects } from "../systems/zone-effects";
import { renderPickups, renderZones, renderObstacles, renderActiveEffectVisuals, renderEffectsHUD, renderPickupToasts, renderInventoryHUD } from "../systems/powerup-render";
import { loadPowerupDefinitions } from "../powerups/registry";
import { createPowerupDebugSection } from "../powerup-debug";
import { createGameLog, renderGameLog, type GameLog } from "../game-log";
import { UI } from "../ui-text";
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
  createSoundSystem,
  loadSoundDefinitions,
  initAudio,
  playSound,
  startContinuous,
  updateContinuous,
  updateSound,
  destroySound,
} from "../sound/sound";
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
  private toasts: PowerupToast[] = [];
  private sound!: SoundSystem;
  private attrPickupSystem!: AttributePickupSystem;
  private _syndromeActive = false;
  private _audioInitHandler: (() => void) | null = null;
  private wallResult: CollisionResult = {
    collided: false, contactX: 0, contactY: 0,
    normalX: 0, normalY: 0, impactSpeed: 0,
  };
  private prevPenalty1Active = false;
  private prevPenalty2Active = false;
  private prevFloodCountdown = 0;
  private winner: string | null = null;
  private winTime = 0;
  private raceStartGrace = 2; // seconds before finish line activates
  private restartHandler: ((e: KeyboardEvent) => void) | null = null;
  private readonly totalLaps = 5;
  private p1NextCheckpoint = 0; // index of next checkpoint boat must cross
  private p2NextCheckpoint = 0;
  private p1Laps = 0;
  private p2Laps = 0;
  private raceTimer = 0;
  private winnerTime = 0;
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
    this.player1.inventory = { slots: [null, null], maxSlots: 2 };
    this.player2.collider = { radius: 16, layer: LAYER_BOAT };
    this.player2.activeEffects = { effects: [] };
    this.player2.inventory = { slots: [null, null], maxSlots: 2 };

    this.entityManager = createEntityManager();
    this.entityManager.add(this.player1);
    this.entityManager.add(this.player2);

    this.spawnState = createSpawnManagerState(this.map);
    this.floodState = { active: false, level: 0, timeRemaining: 0 };
    this.powerupDefs = loadPowerupDefinitions();
    this.attrPickupSystem = createAttributePickupSystem(this.map);
    this.gameLog = createGameLog();

    this.powerupDebugPanel = createPowerupDebugSection({
      player: this.player1,
      spawnState: this.spawnState,
      floodState: this.floodState,
      powerupDefs: this.powerupDefs,
      entityManager: this.entityManager,
      map: this.map,
      gameLog: this.gameLog,
    });
    this.debugPanel?.appendChild(this.powerupDebugPanel);

    this.gameLog.log(UI.log.raceStarted, "system");

    // Sound system — AudioContext deferred to first keypress (browser autoplay policy)
    this.sound = createSoundSystem();
    loadSoundDefinitions(this.sound);
    this._audioInitHandler = () => {
      initAudio(this.sound);
      startContinuous(this.sound, "engine", "p1");
      startContinuous(this.sound, "engine", "p2");
      startContinuous(this.sound, "water-ambient");
      window.removeEventListener("keydown", this._audioInitHandler!);
      this._audioInitHandler = null;
    };
    window.addEventListener("keydown", this._audioInitHandler);

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
    destroySound(this.sound);
    if (this._audioInitHandler) {
      window.removeEventListener("keydown", this._audioInitHandler);
      this._audioInitHandler = null;
    }
    if (this.restartHandler) {
      window.removeEventListener("keydown", this.restartHandler);
      this.restartHandler = null;
    }
    this.powerupDebugPanel?.remove();
    this.debugPanel?.remove();
    this.editorBtn?.remove();
    this.floodPanel?.remove();
    document.getElementById("debug-toggle")?.remove();
    document.getElementById("flood-toggle-btn")?.remove();
  }

  private crossesGate(
    boat: Entity,
    gate: { a: { x: number; y: number }; b: { x: number; y: number } },
  ): boolean {
    return segmentsCross(
      boat.transform.prevPos,
      boat.transform.pos,
      gate.a,
      gate.b,
    );
  }

  private updateCheckpoints(boat: Entity, nextCheckpoint: number): number {
    const cps = this.map.checkpoints;
    if (!cps || nextCheckpoint >= cps.length) return nextCheckpoint;
    if (this.crossesGate(boat, cps[nextCheckpoint]!)) {
      return nextCheckpoint + 1;
    }
    return nextCheckpoint;
  }

  private hasCompletedLap(boat: Entity, nextCheckpoint: number): boolean {
    const cps = this.map.checkpoints;
    if (!cps || cps.length === 0) return true; // no checkpoints = always valid
    return (
      nextCheckpoint >= cps.length &&
      this.crossesGate(boat, this.map.finishLine)
    );
  }

  update(dt: number, input: DualInput) {
    this.lastDt = dt;
    this.gameLog.elapsedTime += dt;
    this.raceStartGrace -= dt;

    // Race timer (starts after grace period)
    if (this.raceStartGrace <= 0 && !this.winner) {
      this.raceTimer += dt;
    }

    // If someone won, freeze the game — space restarts
    if (this.winner) {
      this.winTime += dt;
      if (!this.restartHandler && this.winTime > 2) {
        this.restartHandler = (e: KeyboardEvent) => {
          if (e.code === "Space") {
            this.gameCtx.switchState(new RacingState());
          }
        };
        window.addEventListener("keydown", this.restartHandler);
      }
      return;
    }

    // Flood system
    updateFlood(this.flood, dt);
    const flooded = isFlooding(this.flood);

    // Sync flood state for powerup system
    this.floodState.active = flooded;
    this.floodState.level = this.flood.waterLevel;
    this.floodState.timeRemaining =
      this.flood.state === "flooding"
        ? Math.max(0, this.flood.floodDuration - this.flood.timer)
        : 0;

    // Check penalties when flood recedes
    checkFloodPenalty(this.player1, this.map, this.flood, this.penalty1);
    checkFloodPenalty(this.player2, this.map, this.flood, this.penalty2);
    markPenaltyChecked(this.flood);

    // Player 1: penalty → physics → collision → particles → sound
    updateBoatPenalty(this.player1, this.map, this.penalty1, dt);
    if (!this.penalty1.active) {
      updatePhysics(this.player1, input.player1, dt);
      resolveMapCollisions(this.player1, this.map, flooded, this.wallResult);
      if (this.wallResult.collided) {
        playSound(this.sound, "wall-collision", {
          intensity: Math.min(this.wallResult.impactSpeed / 8, 1),
        });
      }
    }
    emitWake(this.particles, this.player1);
    emitBowSpray(this.particles, this.player1);

    // Player 2: penalty → physics → collision → particles → sound
    updateBoatPenalty(this.player2, this.map, this.penalty2, dt);
    if (!this.penalty2.active) {
      updatePhysics(this.player2, input.player2, dt);
      resolveMapCollisions(this.player2, this.map, flooded, this.wallResult);
      if (this.wallResult.collided) {
        playSound(this.sound, "wall-collision", {
          intensity: Math.min(this.wallResult.impactSpeed / 8, 1),
        });
      }
    }
    emitWake(this.particles, this.player2);
    emitBowSpray(this.particles, this.player2);

    // Engine + ambient continuous sound updates
    const v1 = this.player1.velocity;
    const s1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    updateContinuous(this.sound, "engine", {
      voltage: this.player1.motor?.voltage ?? 0,
      speed: s1,
      maxSpeed: this.player1.boatPhysics?.maxSpeed ?? 10,
      intensity: 1,
    }, "p1");
    const v2 = this.player2.velocity;
    const s2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
    updateContinuous(this.sound, "engine", {
      voltage: this.player2.motor?.voltage ?? 0,
      speed: s2,
      maxSpeed: this.player2.boatPhysics?.maxSpeed ?? 10,
      intensity: 1,
    }, "p2");
    updateContinuous(this.sound, "water-ambient", {
      voltage: 0,
      speed: (s1 + s2) / 2,
      maxSpeed: this.player1.boatPhysics?.maxSpeed ?? 10,
      intensity: 1,
    });

    // Boat-vs-obstacle collision (e.g. canal lock barrier)
    for (const obs of this.entityManager.getByTag("obstacle")) {
      if (obs.markedForRemoval) continue;
      resolveBoatObstacleCollision(this.player1, obs);
      resolveBoatObstacleCollision(this.player2, obs);
    }

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
      playSound(this.sound, "boat-collision", {
        intensity: Math.min(this.collisionResult.impactSpeed / 10, 1),
      });
    } else {
      this.collisionResult.collided = false;
    }

    updateParticles(this.particles, dt);

    // Checkpoint + finish line tracking
    if (this.raceStartGrace <= 0 && !this.winner) {
      this.p1NextCheckpoint = this.updateCheckpoints(
        this.player1,
        this.p1NextCheckpoint,
      );
      this.p2NextCheckpoint = this.updateCheckpoints(
        this.player2,
        this.p2NextCheckpoint,
      );

      if (this.hasCompletedLap(this.player1, this.p1NextCheckpoint)) {
        this.p1Laps++;
        this.p1NextCheckpoint = 0;
        if (this.p1Laps >= this.totalLaps) {
          this.winner = "Player 1";
          this.winnerTime = this.raceTimer;
          this.winTime = 0;
          this.gameLog.log("Player 1 wins!", "system");
        } else {
          this.gameLog.log(`P1 lap ${this.p1Laps}/${this.totalLaps}`, "system");
        }
      }
      if (
        !this.winner &&
        this.hasCompletedLap(this.player2, this.p2NextCheckpoint)
      ) {
        this.p2Laps++;
        this.p2NextCheckpoint = 0;
        if (this.p2Laps >= this.totalLaps) {
          this.winner = "Player 2";
          this.winnerTime = this.raceTimer;
          this.winTime = 0;
          this.gameLog.log("Player 2 wins!", "system");
        } else {
          this.gameLog.log(`P2 lap ${this.p2Laps}/${this.totalLaps}`, "system");
        }
      }
    }

    // Attribute pickup spawning (fixed positions near map attributes)
    const newAttrPickups = updateAttributePickups(
      this.attrPickupSystem,
      this.entityManager.entities,
      this.map,
      this.powerupDefs,
      dt,
    );
    this.entityManager.addMany(newAttrPickups);

    // Water-spawned powerup spawning
    const trackBounds = trackBoundsFromMap(this.map);
    const newPickups = updatePowerupSpawning(
      this.entityManager.entities,
      trackBounds,
      this.floodState,
      this.powerupDefs,
      dt,
      this.spawnState,
    );
    this.entityManager.addMany(newPickups);
    for (const pickup of newPickups) {
      const def = this.powerupDefs.get(pickup.powerupPickup!.powerupId);
      if (def) {
        this.gameLog.log(UI.log.powerupSpawned(def.visual?.hudIcon ?? "?", def.name), "spawn");
      }
    }

    // Pickup collision detection (both boats can pick up)
    const boats = this.entityManager.getByTag("player");
    const pickups = this.entityManager.getWithComponent("powerupPickup");
    const allPickupEvents = detectPowerupPickups(boats, pickups);

    // Split: attribute-spawned pickups → inventory (use with key), water-spawned → apply immediately
    const attrPickupEvents = allPickupEvents.filter((ev) => {
      const e = this.entityManager.entities.find((x) => x.id === ev.pickupEntityId);
      return e?.tags.has("attr-pickup");
    });
    const regularPickupEvents = allPickupEvents.filter((ev) => !attrPickupEvents.includes(ev));

    // Attr pickups: add to boat inventory (if space), mark orb for removal
    for (const event of attrPickupEvents) {
      const boat = event.boatEntityId === this.player1.id ? this.player1 : this.player2;
      const orb = this.entityManager.entities.find((e) => e.id === event.pickupEntityId);
      if (!orb || !boat.inventory) continue;
      const emptyIdx = boat.inventory.slots.findIndex((s) => s === null);
      if (emptyIdx < 0) continue; // inventory full
      boat.inventory.slots[emptyIdx] = event.powerupId;
      orb.markedForRemoval = { reason: "picked-up" };
      const def = this.powerupDefs.get(event.powerupId);
      if (def) {
        this.gameLog.log(`📦 Stored ${def.name}`, "pickup");
        this.toasts.push({
          name: def.name,
          icon: def.visual?.hudIcon ?? def.spawn.icon,
          color: def.spawn.color,
          elapsed: 0,
          duration: 2.0,
          boat,
        });
      }
      playSound(this.sound, "pickup");
    }

    // Inventory use: Q (P1) / ShiftRight (P2)
    for (const [boat, inp] of [
      [this.player1, input.player1],
      [this.player2, input.player2],
    ] as const) {
      if (!inp.useItem || !boat.inventory) continue;
      const idx = boat.inventory.slots.findIndex((s) => s !== null);
      if (idx < 0) continue;
      const powerupId = boat.inventory.slots[idx]!;
      boat.inventory.slots[idx] = null;
      // Shift remaining items toward front
      boat.inventory.slots = [
        ...boat.inventory.slots.filter((s) => s !== null),
        ...Array(boat.inventory.maxSlots).fill(null),
      ].slice(0, boat.inventory.maxSlots) as Array<string | null>;
      const spawned = activateInventoryEffect(boat, powerupId, this.powerupDefs, this.map);
      this.entityManager.addMany(spawned);
      const def = this.powerupDefs.get(powerupId);
      if (def) {
        this.gameLog.log(`⚡ Used ${def.name}`, "pickup");
        this.toasts.push({
          name: def.name,
          icon: def.visual?.hudIcon ?? def.spawn.icon,
          color: def.spawn.color,
          elapsed: 0,
          duration: 2.0,
          boat,
        });
        playSound(this.sound, "pickup");
      }
    }

    for (const event of regularPickupEvents) {
      const def = this.powerupDefs.get(event.powerupId);
      if (def) {
        this.gameLog.log(UI.log.pickedUp(def.visual?.hudIcon ?? "?", def.name), "pickup");
        const boat = event.boatEntityId === this.player1.id ? this.player1 : this.player2;
        this.toasts.push({
          name: def.name,
          icon: def.visual?.hudIcon ?? def.spawn.icon,
          color: def.spawn.color,
          elapsed: 0,
          duration: 2.0,
          boat,
        });
      }
      playSound(this.sound, "pickup");
    }

    // Tick and expire toasts
    for (const toast of this.toasts) toast.elapsed += dt;
    this.toasts = this.toasts.filter((t) => t.elapsed < t.duration);

    // Apply regular pickup effects
    const spawnedEntities = applyPickupEvents(
      regularPickupEvents, this.entityManager.entities, this.powerupDefs, this.map,
    );
    this.entityManager.addMany(spawnedEntities);

    // Snapshot active effects before tick/expiration
    const effectsBefore = new Set(
      this.player1.activeEffects?.effects.map((e) => e.powerupId) ?? [],
    );

    tickActiveEffects(this.entityManager.entities, this.powerupDefs, dt);
    processExpirations(this.entityManager.entities, this.powerupDefs);

    // Main Character Syndrome: lock camera onto the affected boat + zoom in
    {
      const p1Syndrome = this.player1.activeEffects?.effects.find(
        (e) => e.powerupId === "main-character-syndrome",
      );
      const p2Syndrome = this.player2.activeEffects?.effects.find(
        (e) => e.powerupId === "main-character-syndrome",
      );
      const wasSyndrome = this._syndromeActive;
      this._syndromeActive = !!(p1Syndrome ?? p2Syndrome);
      if (p1Syndrome) {
        this.camera.followTarget = this.player1;
      } else if (p2Syndrome) {
        this.camera.followTarget = this.player2;
      } else if (wasSyndrome) {
        this.camera.followTarget = null; // spring eases back to fixed-mode zoom
      }

      // Smoothly zoom in during syndrome, let the fixed-mode spring ease back out
      if (this._syndromeActive) {
        const SYNDROME_ZOOM = 2.8;
        const ZOOM_IN_SPEED = 1.5; // zoom units per second
        if (this.camera.zoom < SYNDROME_ZOOM) {
          this.camera.zoom = Math.min(SYNDROME_ZOOM, this.camera.zoom + ZOOM_IN_SPEED * dt);
          this.camera._zoomVelocity = 0;
        }
      }
    }

    // Log expired effects
    const effectsAfter = new Set(
      this.player1.activeEffects?.effects.map((e) => e.powerupId) ?? [],
    );
    for (const id of effectsBefore) {
      if (!effectsAfter.has(id)) {
        const def = this.powerupDefs.get(id);
        if (def) {
          this.gameLog.log(UI.log.effectExpired(def.visual?.hudIcon ?? "?", def.name), "effect");
        }
        playSound(this.sound, "expire");
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
        this.gameLog.log(UI.log.floodingStarted, "flood");
        playSound(this.sound, "flood-start");
      } else {
        this.gameLog.log(UI.log.floodReceding, "flood");
        playSound(this.sound, "flood-end");
      }
      this.prevFloodActive = this.floodState.active;
    }

    // Flood countdown warning beeps
    if (this.flood.state === "idle") {
      const until = Math.max(0, this.flood.cycleInterval - this.flood.timer);
      const n = Math.ceil(until);
      if (until <= 5 && n !== this.prevFloodCountdown && n > 0) {
        playSound(this.sound, "flood-warning");
      }
      this.prevFloodCountdown = n;
    } else {
      this.prevFloodCountdown = 0;
    }

    // Penalty activation sounds (rising edge only)
    if (this.penalty1.active && !this.prevPenalty1Active) playSound(this.sound, "penalty");
    this.prevPenalty1Active = this.penalty1.active;
    if (this.penalty2.active && !this.prevPenalty2Active) playSound(this.sound, "penalty");
    this.prevPenalty2Active = this.penalty2.active;

    updateSound(this.sound, dt);
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
    renderPickups(ctx, pickups, alpha, this.elapsedTime, this.powerupDefs);

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

    if (debugSettings.showBoatVelocity) {
      this.renderVelocityArrow(ctx, this.player1, alpha, "#e04040");
      this.renderVelocityArrow(ctx, this.player2, alpha, "#e0c040");
    }

    renderBridges(ctx, this.map);

    renderActiveEffectVisuals(ctx, this.player1, this.powerupDefs, alpha, this.elapsedTime);

    // Pickup toasts — world-space, so rendered before restore
    renderPickupToasts(ctx, this.toasts, alpha, this.camera.angle);

    ctx.restore();

    // Flood overlay in screen space (bottom → top)
    renderFloodScreen(ctx, this.flood, w, h);

    // During flood: re-render boats + attributes on top of the water overlay
    if (this.flood.waterLevel > 0.05) {
      ctx.save();
      applyCameraTransform(ctx, this.camera, w, h);
      this.renderBoatWithPenalty(ctx, this.player1, alpha, this.penalty1);
      this.renderBoatWithPenalty(ctx, this.player2, alpha, this.penalty2);
      renderBridges(ctx, this.map);
      if (this.flood.affectObjects) {
        renderFloodedAttributes(ctx, this.map, this.flood);
      }
      ctx.restore();
    }

    this.renderHUD(ctx, w);
    this.renderFloodHUD(ctx, w, h);
    renderEffectsHUD(ctx, this.player1, this.powerupDefs, w);
    renderInventoryHUD(ctx, this.player1, this.player2, this.powerupDefs, w, h);

    // Race timer (bottom center)
    const displayTime = this.winner ? this.winnerTime : this.raceTimer;
    const mins = Math.floor(displayTime / 60);
    const secs = Math.floor(displayTime % 60);
    const ms = Math.floor((displayTime % 1) * 100);
    const timeStr = `${mins}:${String(secs).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(timeStr, w / 2, h - 20);

    // Event log
    renderGameLog(ctx, this.gameLog, w, h);

    // Win screen overlay
    if (this.winner) {
      const fade = Math.min(1, this.winTime * 2);
      ctx.fillStyle = `rgba(0,0,0,${fade * 0.6})`;
      ctx.fillRect(0, 0, w, h);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Winner name
      const pulse = 1 + Math.sin(this.winTime * 3) * 0.05;
      const size = Math.round(64 * pulse);
      ctx.font = `bold ${size}px monospace`;
      const color = this.winner === "Player 1" ? "#e04040" : "#e0c040";
      ctx.fillStyle = color;
      ctx.globalAlpha = fade;
      ctx.fillText(`${this.winner} Wins!`, w / 2, h / 2 - 30);

      // Winner time
      const wMins = Math.floor(this.winnerTime / 60);
      const wSecs = Math.floor(this.winnerTime % 60);
      const wMs = Math.floor((this.winnerTime % 1) * 100);
      const wTimeStr = `${wMins}:${String(wSecs).padStart(2, "0")}.${String(wMs).padStart(2, "0")}`;
      ctx.font = "bold 32px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(wTimeStr, w / 2, h / 2 + 30);

      // Subtitle
      ctx.font = "bold 22px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText("RACE FINISHED", w / 2, h / 2 + 70);

      if (this.winTime > 2) {
        ctx.font = "18px monospace";
        ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(this.winTime * 4) * 0.3})`;
        ctx.fillText("Press SPACE to restart", w / 2, h / 2 + 120);
      }

      ctx.globalAlpha = 1;
      ctx.textBaseline = "alphabetic";
    }
  }

  private renderHUD(ctx: CanvasRenderingContext2D, w: number) {
    const v1 = this.player1.velocity;
    const s1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const v2 = this.player2.velocity;
    const s2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

    ctx.font = "14px monospace";
    ctx.textAlign = "right";

    ctx.fillStyle = this.penalty1.active
      ? "rgba(255,80,80,0.9)"
      : "rgba(224,64,64,0.6)";
    ctx.fillText(
      this.penalty1.active ? `P1: PENALTY ${this.penalty1.remaining.toFixed(1)}s` : UI.hud.p1Speed(s1.toFixed(0)),
      w - 20, 30,
    );

    ctx.fillStyle = this.penalty2.active
      ? "rgba(255,200,80,0.9)"
      : "rgba(224,192,64,0.6)";
    ctx.fillText(
      this.penalty2.active ? `P2: PENALTY ${this.penalty2.remaining.toFixed(1)}s` : UI.hud.p2Speed(s2.toFixed(0)),
      w - 20, 50,
    );

    // Lap counter (top center)
    ctx.textAlign = "center";
    ctx.font = "bold 65px monospace";
    const p1Left = this.totalLaps - this.p1Laps;
    const p2Left = this.totalLaps - this.p2Laps;
    ctx.fillStyle = "rgba(224,64,64,0.6)";
    ctx.fillText(`P1: ${p1Left} lap${p1Left !== 1 ? "s" : ""} left`, w / 2, 70);
    ctx.fillStyle = "rgba(224,192,64,0.6)";
    ctx.fillText(
      `P2: ${p2Left} lap${p2Left !== 1 ? "s" : ""} left`,
      w / 2,
      140,
    );
  }

  private renderBoatWithPenalty(
    ctx: CanvasRenderingContext2D,
    boat: Entity,
    alpha: number,
    penalty: BoatPenalty,
  ) {
    if (penalty.active) {
      const flash = Math.sin((Date.now() / 125) * Math.PI) > 0;
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

  private renderVelocityArrow(
    ctx: CanvasRenderingContext2D,
    boat: Entity,
    alpha: number,
    color: string,
  ) {
    const tf = boat.transform;
    const x = tf.prevPos.x + (tf.pos.x - tf.prevPos.x) * alpha;
    const y = tf.prevPos.y + (tf.pos.y - tf.prevPos.y) * alpha;
    const vel = boat.velocity;
    const scale = 8;
    const endX = x + vel.x * scale;
    const endY = y + vel.y * scale;

    // Line
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(vel.y, vel.x);
    const headLen = 6;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - Math.cos(angle - 0.4) * headLen,
      endY - Math.sin(angle - 0.4) * headLen,
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - Math.cos(angle + 0.4) * headLen,
      endY - Math.sin(angle + 0.4) * headLen,
    );
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
