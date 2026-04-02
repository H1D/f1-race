# Boat Physics

Core physics simulation. World-space velocity with per-frame local decomposition, motor voltage ramp for throttle, anisotropic drag for realistic water feel, speed-dependent steering, and max speed cap.

```toon
status: active
depends_on[1]: input
entry_point: src/systems/physics.ts

files[4]{path,purpose}:
  src/systems/physics.ts,physics update — world-space decompose + drag + thrust + recompose
  src/systems/collision.ts,polygon boundary enforcement + wall response + boat-to-boat collision
  src/entity.ts,boat entity factory with tuned physics defaults
  src/debug.ts,runtime tuning panel with presets (yacht/speedboat/dinghy/tugboat)
```

## Physics Model

- Velocity stored in world space (`vel.x`, `vel.y`) — decomposed to local frame each tick via dot product with heading vectors
- When boat turns, world momentum stays fixed → forward momentum becomes lateral → lateral drag kills it → natural drift
- Drag applied before thrust: `forwardSpeed *= (1 - forwardDrag)`, `lateralSpeed *= (1 - lateralDrag)`
- Thrust: `forwardSpeed += motorVoltage * thrustForce * dt`
- Steering scales with `min(1, |forwardSpeed| / turnSpeedReference)` — can't turn stationary
- Collision: polygon-based wall response cancels wall-normal velocity, preserves tangential sliding with friction
- Boat-to-boat collision: circle-based detection (radius 24), equal-mass impulse response with bounce (0.6), mild angular impulse from off-center hits (spin factor 0.08)

## Default Values (Yacht preset)

- `forwardDrag: 0.015`, `lateralDrag: 0.95`
- `angularDamping: 0.4`, `turnTorque: 3.5`, `turnSpeedReference: 3.0`
- `thrustForce: 6.0`, `maxSpeed: 10.0`
- Motor ramp: up 1.5/s, down 2.5/s
- Reverse thrust: 40% of forward

## Gotchas

- `src/boat/boat.ts` is legacy — physics values live in `entity.ts` boatPhysics component
- `MotorComponent.maxForce` is vestigial
- Debug menu mutates boatPhysics directly via slider callbacks
