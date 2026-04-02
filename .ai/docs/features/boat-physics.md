# Boat Physics

Core physics simulation ported from the boat branch. World-space velocity with per-frame local decomposition, motor voltage ramp for throttle, anisotropic drag for realistic water feel, speed-dependent steering, and max speed cap.

```toon
status: active
depends_on[1]: input
entry_point: src/systems/physics.ts

files[4]{path,purpose}:
  src/systems/physics.ts,physics update — world-space decompose + drag + thrust + recompose
  src/systems/collision.ts,AABB boundary enforcement against canal walls (world-space vel)
  src/entity.ts,boat entity factory with boat-branch-tuned physics defaults
  src/debug.ts,runtime tuning panel with presets (yacht/speedboat/dinghy/tugboat)
```

## Physics Model

- Velocity stored in world space (`vel.x`, `vel.y`) — decomposed to local frame each tick via dot product with heading vectors
- When boat turns, world momentum stays fixed → forward momentum becomes lateral → lateral drag kills it → natural drift
- Drag applied before thrust (boat branch order): `forwardSpeed *= (1 - forwardDrag)`, `lateralSpeed *= (1 - lateralDrag)`
- Thrust: `forwardSpeed += motorVoltage * thrustForce * dt`
- Steering scales with `min(1, |forwardSpeed| / turnSpeedReference)` — can't turn a stationary boat
- Integration: `pos += vel` (velocity is in px/frame units at 60Hz)

## Default Values (Yacht preset)

- `forwardDrag: 0.012`, `lateralDrag: 0.95` (~79:1 ratio)
- `angularDamping: 0.4`, `turnTorque: 3.5`, `turnSpeedReference: 3.0`
- `thrustForce: 6.0`, `maxSpeed: 12.0`
- Motor ramp: up 1.5/s, down 2.5/s
- Reverse: `targetVoltage` = -0.4 (slower than forward's 1.0)

## Gotchas

- `src/boat/boat.ts` is a legacy standalone module — not used by the ECS pipeline. Physics values originate from it but live in `entity.ts` `boatPhysics` component
- `MotorComponent.maxForce` is vestigial — thrust comes from `boatPhysics.thrustForce`
- Debug menu mutates `boatPhysics` component directly via `Object.assign` — changes apply immediately
