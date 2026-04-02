# Decisions

```toon
decisions[5]{id,date,title,status}:
  001,2026-04-02,Fixed timestep game loop,accepted
  002,2026-04-02,ECS-lite over class hierarchy,accepted
  003,2026-04-02,Anisotropic drag for boat physics,accepted
  004,2026-04-02,Bun as bundler and runtime,accepted
  005,2026-04-02,World-space velocity over local-space,accepted
```

## ADR-001: Fixed timestep game loop

**Status**: accepted
**Date**: 2026-04-02
**Context**: Canvas games need deterministic physics regardless of frame rate.
**Decision**: 60Hz fixed timestep with accumulator. Render interpolates using alpha between previous and current state.
**Consequences**: Physics is framerate-independent. Requires storing `prevPos`/`prevAngle` on every entity for interpolation.

---

## ADR-002: ECS-lite over class hierarchy

**Status**: accepted
**Date**: 2026-04-02
**Context**: Need flexible entity composition without deep inheritance chains.
**Decision**: Entities are plain data objects with optional component interfaces. Systems are pure functions that operate on entities.
**Consequences**: Easy to add new components (e.g., powerups). No method dispatch overhead. Components are optional via `?` properties.

---

## ADR-003: Anisotropic drag for boat physics

**Status**: accepted
**Date**: 2026-04-02
**Context**: Boats should feel different from cars — they glide forward but resist sideways movement.
**Decision**: Decompose velocity into local forward/lateral, apply different drag coefficients (low forward ~0.015, high lateral ~0.95).
**Consequences**: Creates natural boat feel. Speed-dependent turning adds skill ceiling. Tunable via debug menu with presets (yacht, speedboat, dinghy, tugboat).

---

## ADR-004: Bun as bundler and runtime

**Status**: accepted
**Date**: 2026-04-02
**Context**: Need fast dev iteration for a game project.
**Decision**: Use Bun for bundling (`Bun.build`), dev server (`Bun.serve`), and hot reload.
**Consequences**: Single tool for build + serve. No webpack/vite config. Fast builds. Deployed via Netlify with Bun installed in build env.

---

## ADR-005: World-space velocity over local-space

**Status**: accepted
**Date**: 2026-04-02
**Context**: Local-frame velocity (forward/lateral) doesn't create drift when the boat turns — momentum rotates with the heading. Ported from the boat branch which uses world-space velocity.
**Decision**: Store velocity as world-space (vx, vy). Decompose to local frame each tick for anisotropic drag, then recompose to world.
**Consequences**: Turning naturally creates drift — forward momentum becomes lateral when heading changes, then lateral drag kills it. Physics values port directly from the boat branch with no scaling.
