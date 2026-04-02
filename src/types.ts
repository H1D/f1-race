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
  steeringAccum: number; // -1..1 smoothed
}

// === Game state lifecycle ===
export interface GameState {
  enter(ctx: GameContext): void;
  exit(): void;
  update(dt: number, input: InputState): void;
  render(ctx: CanvasRenderingContext2D, alpha: number): void;
}

// === Wiring context passed to states ===
export interface GameContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  switchState: (state: GameState) => void;
  input: InputState;
}

// === Camera state ===
export interface CameraState {
  x: number;
  y: number;
  angle: number;
  zoom: number;
}

// === Track boundary ===
export interface TrackBounds {
  outer: { minX: number; minY: number; maxX: number; maxY: number };
  inner: { minX: number; minY: number; maxX: number; maxY: number };
  startX: number;
  startY: number;
  startAngle: number;
}
