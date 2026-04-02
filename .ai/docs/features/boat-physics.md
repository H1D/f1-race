# Boat Physics

Core physics simulation for boat movement. Uses motor voltage ramp for throttle, anisotropic drag for realistic water feel, and speed-dependent steering.

```toon
status: active
depends_on[1]: input
entry_point: src/systems/physics.ts

files[4]{path,purpose}:
  src/systems/physics.ts,physics update system — drag + thrust + steering
  src/systems/collision.ts,AABB boundary enforcement against canal walls
  src/entity.ts,boat entity factory with default physics params
  src/debug.ts,runtime tuning panel with presets (yacht/speedboat/dinghy/tugboat)
```

## Design Notes

- Velocity is decomposed into local forward/lateral components each frame, drag applied independently, then recomposed to world space
- Motor voltage ramps up at 1.5/s and down at 2.5/s — creates momentum feel
- Steering torque scales with `min(1, |forwardSpeed| / turnSpeedReference)` — can't turn a stationary boat
- Four presets available via debug menu (backtick key): Yacht (default), Speedboat, Dinghy, Tugboat

## Gotchas

- `boatPhysics` component on entity duplicates some values from `src/boat/boat.ts` — the ECS version in `entity.ts` is the one used by the physics system
- `src/boat/boat.ts` has its own standalone physics and render — appears to be an earlier standalone module, not used by the ECS pipeline
- Debug menu uses `Object.assign` to swap presets — mutates the entity's `boatPhysics` component directly
