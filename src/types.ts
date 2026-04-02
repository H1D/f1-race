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

// === Entity ===
export interface Entity {
  id: number;
  transform: TransformComponent;
  velocity: VelocityComponent;
  motor?: MotorComponent;
  boatPhysics?: BoatPhysicsComponent;
  render?: RenderComponent;
  tags: Set<string>;
}

// === Input snapshot ===
export interface InputState {
  left: boolean;
  right: boolean;
  throttle: boolean;
  reverse: boolean;
  steeringAccum: number; // -1..1 smoothed
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

// === Track boundary ===
export interface TrackBounds {
  outer: { minX: number; minY: number; maxX: number; maxY: number };
  inner: { minX: number; minY: number; maxX: number; maxY: number };
  startX: number;
  startY: number;
  startAngle: number;
}
