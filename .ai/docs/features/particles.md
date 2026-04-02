# Particles

Visual effects system with three emitters: stern wake spray, bow arrow wave, and wall collision sparks. Uses a pre-allocated pool of 512 particles with zero runtime allocation. Particles render in world space between background and boat layers.

```toon
status: active
depends_on[2]: boat-physics,racing
entry_point: src/systems/particles.ts

files[4]{path,purpose}:
  src/systems/particles.ts,particle pool + update + render + wake/bow/spark emitters
  src/types.ts,Particle and CollisionResult interfaces
  src/systems/collision.ts,populates CollisionResult out-param for spark emitter
  src/states/racing-state.ts,creates pool + wires emitters + update + render calls
```

## Design Notes

- **Pool**: `createParticlePool(512)` pre-allocates all slots. `acquireParticle()` linear-scans for first `active === false` slot. No GC pressure.
- **Wake emitter** (`emitWake`): spawns 1-4 blue/white square particles per tick at boat stern, count scales with `speed / maxSpeed`. Drift backward with random scatter. Activates above speed 0.5.
- **Bow arrow emitter** (`emitBowSpray`): arrow/chevron shape at bow — two arms diverge from a tip just ahead of the nose at ~26° each side (`BOW_ARM_ANGLE = 0.45`). 2-5 round (bubbly) white-blue particles per arm, positioned along each arm with perpendicular jitter. Arm length scales 40-105 with speed. Activates above speed 1.5.
- **Spark emitter** (`emitCollisionSparks`): triggered by `CollisionResult.collided`. Spawns 5-25 orange/yellow square particles at contact point, count scales with `impactSpeed`. Scatter along collision normal. Used for both wall hits and boat-to-boat collisions.
- **Update**: decrement `life`, integrate position, apply velocity damping (0.98/tick). Deactivate when `life <= 0`.
- **Render**: alpha = `life / maxLife` (linear fade). Particles with `round: true` draw as circles (arc), others as filled rectangles. Restores `globalAlpha` after.
- **CollisionResult**: mutable out-param struct, reset each frame by `resolveCollisions()` — avoids per-frame object allocation.

## Gotchas

- Pool capacity is fixed at 512 — if exhausted, new particles silently drop. High-speed multi-wall collisions + bow spray can spike usage.
- `acquireParticle()` is O(n) linear scan — fine for 512 but would need free-list for larger pools.
- `renderParticles()` must be called between `applyCameraTransform()` and `ctx.restore()` — it draws in world space.
- Collision system was modified to populate a `CollisionResult` out-param — callers must pass a pre-allocated result object.
- Bow spray particles use `round: true` — other emitters leave it `false` (square rendering)
