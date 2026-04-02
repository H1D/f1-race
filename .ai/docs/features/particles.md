# Particles

Visual effects system for boat wake spray and wall collision sparks. Uses a pre-allocated pool of 512 particles with zero runtime allocation. Particles render in world space between background and boat layers.

```toon
status: active
depends_on[2]: boat-physics,racing
entry_point: src/systems/particles.ts

files[4]{path,purpose}:
  src/systems/particles.ts,particle pool + update + render + wake/spark emitters
  src/types.ts,Particle and CollisionResult interfaces
  src/systems/collision.ts,populates CollisionResult out-param for spark emitter
  src/states/racing-state.ts,creates pool + wires emitters + update + render calls
```

## Design Notes

- **Pool**: `createParticlePool(512)` pre-allocates all slots. `acquireParticle()` linear-scans for first `active === false` slot. No GC pressure.
- **Wake emitter**: spawns 1-4 blue/white particles per tick at boat stern, count scales with `speed / maxSpeed`. Drift backward with random scatter.
- **Spark emitter**: triggered by `CollisionResult.collided`. Spawns 5-25 orange/yellow particles at contact point, count scales with `impactSpeed`. Scatter along wall normal.
- **Update**: decrement `life`, integrate position, apply velocity damping (0.98/tick). Deactivate when `life <= 0`.
- **Render**: alpha = `life / maxLife` (linear fade). Drawn as filled rectangles in world space. Restores `globalAlpha` after.
- **CollisionResult**: mutable out-param struct, reset each frame by `resolveCollisions()` — avoids per-frame object allocation.

## Gotchas

- Pool capacity is fixed at 512 — if exhausted, new particles silently drop. High-speed multi-wall collisions can spike usage.
- `acquireParticle()` is O(n) linear scan — fine for 512 but would need free-list for larger pools.
- `renderParticles()` must be called between `applyCameraTransform()` and `ctx.restore()` — it draws in world space.
- Collision system was modified to populate a `CollisionResult` out-param — callers must pass a pre-allocated result object.
