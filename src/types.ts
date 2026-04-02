// === Vector ===
export interface Vec2 {
  x: number;
  y: number;
}

// === Components (plain data, no methods) ===
export interface TransformComponent {
  pos: Vec2;
  prevPos: Vec2; // previous frame position for interpolation
  angle: number;
  prevAngle: number; // previous frame angle for interpolation
}

export interface VelocityComponent {
  x: number; // world-space velocity X
  y: number; // world-space velocity Y
  angular: number; // radians/sec turning rate
}

export interface MotorComponent {
  voltage: number; // current motor power 0..1 (ramps toward target)
  targetVoltage: number; // 0 when throttle released, 1 when held
  rampUp: number; // rate per second
  rampDown: number; // rate per second
  maxForce: number; // max thrust in world units/s^2
}

export interface BoatPhysicsComponent {
  forwardDrag: number; // ~0.015 — low, boat glides
  lateralDrag: number; // ~0.95 — high, resists sideways drift
  angularDamping: number; // ~0.4 — smooths rotation
  turnTorque: number; // turning force
  turnSpeedReference: number; // speed at which turning reaches full effectiveness
  thrustForce: number; // forward thrust power
  maxSpeed: number; // hard speed cap
}

export interface RenderComponent {
  width: number;
  height: number;
  color: string;
}

// === Powerup components ===
export interface PowerupPickupComponent {
  powerupId: string;
  radius: number;
  bobPhase: number;
}

export interface ActiveEffect {
  powerupId: string;
  remainingTime: number; // seconds, -1 for instant/condition-based
  sourceEntityId: number;
  state: Record<string, number>; // mutable bag for effect to store/restore values
}

export interface ActiveEffectsComponent {
  effects: ActiveEffect[];
}

export interface LifetimeComponent {
  remaining: number; // seconds
  fadeStart: number; // seconds before death to start fading
}

export interface ZoneComponent {
  radius: number;
  effectId: string;
  ownerId: number;
  affectsOwner: boolean;
  color?: string; // optional — falls back to default orange if omitted
}

export interface ColliderComponent {
  radius: number;
  layer: number; // bitmask
}

export interface MarkedForRemovalComponent {
  reason: string;
}

// === Collision layers (bitmask) ===
export const LAYER_BOAT = 1;
export const LAYER_PICKUP = 2;
export const LAYER_OBSTACLE = 4;
export const LAYER_ZONE = 8;

// === Entity ===
export interface Entity {
  id: number;
  transform: TransformComponent;
  velocity: VelocityComponent;
  motor?: MotorComponent;
  boatPhysics?: BoatPhysicsComponent;
  render?: RenderComponent;
  tags: Set<string>;
  // Powerup components
  powerupPickup?: PowerupPickupComponent;
  activeEffects?: ActiveEffectsComponent;
  lifetime?: LifetimeComponent;
  zone?: ZoneComponent;
  collider?: ColliderComponent;
  markedForRemoval?: MarkedForRemovalComponent;
  inventory?: InventoryComponent;
}

// === Inventory (pickable powerup slots) ===
export interface InventoryComponent {
  slots: Array<string | null>; // powerupId or null per slot
  maxSlots: number;            // 2
}

// === Input snapshot ===
export interface InputState {
  left: boolean;
  right: boolean;
  throttle: boolean;
  reverse: boolean;
  steeringAccum: number; // -1..1 smoothed
  useItem: boolean;      // one-shot: true only on the frame the button is pressed
}

// === Dual-player input ===
export interface DualInput {
  player1: InputState;
  player2: InputState;
}

// === Game state lifecycle ===
export interface GameState {
  enter(ctx: GameContext): void;
  exit(): void;
  update(dt: number, input: DualInput): void;
  render(ctx: CanvasRenderingContext2D, alpha: number): void;
}

// === Wiring context passed to states ===
export interface GameContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  switchState: (state: GameState) => void;
  input: DualInput;
}

// === Camera state ===
export interface CameraState {
  x: number;
  y: number;
  angle: number;
  zoom: number;
  followTarget: Entity | null; // null = fixed mode (default), set = follow mode
  entities: Entity[]; // all boats — used for framing in fixed mode
  _prevTarget: Entity | null; // internal: previous followTarget for detecting switches
  _transitionElapsed: number; // internal: ms elapsed since last mode switch
  _zoomVelocity: number; // internal: spring velocity for zoom
}

// === Particle (lightweight, pooled) ===
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // remaining seconds, counts down
  maxLife: number; // initial life (alpha = life/maxLife)
  size: number;
  r: number; // 0-255
  g: number;
  b: number;
  round: boolean; // render as circle instead of square
  active: boolean;
}

// === Collision result (mutable out-param) ===
export interface CollisionResult {
  collided: boolean;
  contactX: number;
  contactY: number;
  normalX: number; // wall normal pointing away from surface
  normalY: number;
  impactSpeed: number; // pre-damping speed
}

// === Track boundary (legacy) ===
export interface TrackBounds {
  outer: { minX: number; minY: number; maxX: number; maxY: number };
  inner: { minX: number; minY: number; maxX: number; maxY: number };
  startX: number;
  startY: number;
  startAngle: number;
}

// === Map data ===
export type AttributeType = "albert-heijn" | "effendi" | "herring-kiosk" | "bike-shop";

export interface MapAttribute {
  id: number;
  type: AttributeType;
  position: Vec2;
}

export interface Bridge {
  id: number;
  start: Vec2;
  end: Vec2;
  width: number;
}

export interface Gate {
  a: Vec2;               // left endpoint of the line
  b: Vec2;               // right endpoint of the line
}

export type FinishLine = Gate;

export interface MapData {
  outline: Vec2[];       // outer bank of the water channel
  island: Vec2[];        // inner land mass (the center island)
  attributes: MapAttribute[];
  bridges: Bridge[];
  worldSize: number;
  startPos: Vec2;
  startAngle: number;
  finishLine: FinishLine;
  checkpoints: Gate[];     // gates that must be crossed in order before finish counts
}

// === Powerup definition (data-driven registry) ===
export interface PowerupDefinition {
  id: string;
  name: string;
  category: "canal" | "flood";
  rarity: number; // 0..1 spawn weight

  spawn: {
    radius: number;
    color: string;
    icon: string; // emoji or sprite key
  };

  effect: {
    type: "instant" | "duration" | "spawned";
    duration: number; // seconds (0 for instant)
    stacking: "refresh" | "stack" | "replace" | "ignore";
    maxStacks: number;

    canApply?: (target: Entity) => boolean; // return false to absorb without applying
    onApply: (target: Entity, source: Entity, state: Record<string, number>) => void;
    onTick?: (target: Entity, state: Record<string, number>, dt: number) => void;
    onExpire: (target: Entity, state: Record<string, number>) => void;
    onSpawn?: (boat: Entity, map: MapData) => Entity[];
  };

  visual?: {
    trailEffect?: string;
    boatTint?: string;
    hudIcon: string;
    drawIcon?: (ctx: CanvasRenderingContext2D, size: number) => void;
  };

  /** Optional named numeric knobs exposed in the debug panel. */
  tunables?: Record<string, { value: number; min: number; max: number; step: number }>;
}

// === Pickup name toast (transient, world-space — follows the boat) ===
export interface PowerupToast {
  name: string;
  icon: string;
  color: string;    // background tint matching the powerup orb color
  elapsed: number;  // seconds since the toast appeared
  duration: number; // total lifetime (hold + fade)
  boat: Entity;     // the boat that picked it up — position read each frame
}

// === Powerup pickup event ===
export interface PickupEvent {
  boatEntityId: number;
  pickupEntityId: number;
  powerupId: string;
}

// === Spawn system state ===
export interface SpawnPoint {
  pos: Vec2;
  zoneType: "canal" | "street";
  distanceFromCanal: number;
  active: boolean;
}

export interface SpawnManagerState {
  timeSinceLastSpawn: number;
  spawnInterval: number;
  maxPickupsInWorld: number;
  spawnPoints: SpawnPoint[];
}

// === Flood state ===
export interface FloodState {
  active: boolean;
  level: number; // 0..1
  timeRemaining: number;
}

// === Sound system ===
export type SoundCategory = "engine" | "collision" | "pickup" | "flood" | "ambient" | "penalty";

export interface SoundEnvelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface OscillatorConfig {
  type: OscillatorType;
  frequency: number;
  detune?: number;
  gainMultiplier?: number;
}

export interface NoiseConfig {
  type: "white" | "pink" | "brown";
  gainMultiplier: number;
}

export interface FilterConfig {
  type: BiquadFilterType;
  frequency: number;
  Q?: number;
}

export interface SoundDefinition {
  id: string;
  category: SoundCategory;
  mode: "oneshot" | "continuous";
  oscillators?: OscillatorConfig[];
  noise?: NoiseConfig;
  filter?: FilterConfig;
  envelope: SoundEnvelope;
  duration?: number;
  mapParams?: {
    frequency?: (params: SoundParams) => number;
    gain?: (params: SoundParams) => number;
    filterFreq?: (params: SoundParams) => number;
  };
  maxVoices: number;
}

export interface SoundParams {
  voltage: number;
  speed: number;
  maxSpeed: number;
  intensity: number;
}

export interface ActiveVoice {
  id: number;
  definitionId: string;
  tag: string;
  oscillators: OscillatorNode[];
  noiseSource: AudioBufferSourceNode | null;
  gainNode: GainNode;
  filterNode: BiquadFilterNode | null;
  startTime: number;
  duration: number;
  releaseTime: number;
  releaseDuration: number;
  active: boolean;
}

export interface SoundSystem {
  ctx: AudioContext | null;
  masterGain: GainNode | null;
  categoryGains: Map<SoundCategory, GainNode>;
  definitions: Map<string, SoundDefinition>;
  voices: ActiveVoice[];
  nextVoiceId: number;
  initialized: boolean;
  noiseBuffers: Map<string, AudioBuffer>;
}
