# Decisions

```toon
decisions[10]{id,date,title,status}:
  001,2026-04-02,Fixed timestep game loop,accepted
  002,2026-04-02,ECS-lite over class hierarchy,accepted
  003,2026-04-02,Anisotropic drag for boat physics,accepted
  004,2026-04-02,Bun as bundler and runtime,accepted
  005,2026-04-02,World-space velocity over local-space,accepted
  006,2026-04-02,Two-player shared-screen with split controls,accepted
  007,2026-04-02,Dual-mode camera (follow vs fixed),accepted
  008,2026-04-02,Data-driven powerup definitions,accepted
  009,2026-04-02,Multiplier-based effect reversal,accepted
  010,2026-04-02,Orchestrator-level event logging,accepted
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

---

## ADR-006: Two-player shared-screen with split controls

**Status**: accepted
**Date**: 2026-04-02
**Context**: Game needs multiplayer. Options: online netcode, split-screen, or shared-screen.
**Decision**: Two players on same screen — Player 1 uses WASD, Player 2 uses arrow keys. Input system returns `DualInput` with independent `InputState` per player. Physics/collision run independently per boat.
**Consequences**: Simple to implement (no networking). Camera must frame both boats (fixed mode) or follow one (follow mode). Debug panel needs per-boat physics sections. `GameState.update()` takes `DualInput` instead of `InputState`.

---

## ADR-007: Dual-mode camera (follow vs fixed)

**Status**: accepted
**Date**: 2026-04-02
**Context**: With two boats, a single follow camera can't show both players. Need a way to frame both or focus on one.
**Decision**: Two camera modes — **Follow** (tracks one entity with look-ahead + rotation) and **Fixed** (centers on midpoint of all entities, dynamic zoom, no rotation). Toggled via debug panel. Smooth 500ms transition between modes.
**Consequences**: Fixed mode is default for two-player gameplay. Follow mode available for spectating one player. Dynamic zoom keeps both boats in frame. Transition uses fast lerp (0.25) easing to normal (0.08) to avoid jarring snaps.

---

## ADR-008: Data-driven powerup definitions

**Status**: accepted
**Date**: 2026-04-02
**Context**: The game needs many powerup types with diverse effects. Adding a powerup shouldn't require modifying framework code.
**Decision**: Each powerup is a `PowerupDefinition` object registered in a central map. Definition contains spawn config, stacking rules, and three lifecycle hooks (`onApply`/`onTick`/`onExpire`) that mutate entity data directly.
**Consequences**: Adding a powerup = one definition file + one import in registry. Framework code (spawn, collision, effects) is generic and never changes per-powerup. Stacking rules (refresh/stack/replace/ignore) are per-definition.

---

## ADR-009: Multiplier-based effect reversal

**Status**: accepted
**Date**: 2026-04-02
**Context**: Multiple effects can modify the same physics field (e.g., `maxSpeed`). Storing/restoring absolute snapshots breaks when effects expire out of order.
**Decision**: Effects store multipliers in their state bag (`state.speedMult = 1.5`), then divide on expire (`maxSpeed /= state.speedMult`). This is commutative — order-independent cleanup.
**Consequences**: Any number of effects can modify the same field simultaneously. No need for a "base values" system. Each effect is self-contained.

---

## ADR-010: Orchestrator-level event logging

**Status**: accepted
**Date**: 2026-04-02
**Context**: Need a game event log for debugging and game feel, but systems should stay pure (no logging dependency).
**Decision**: `RacingState` observes system outputs (PickupEvent[], effect count diffs, flood state changes) and writes to a `GameLog` data structure. Log renders on canvas with fade/pinned modes.
**Consequences**: Systems remain pure functions with no side effects. Log categories and messages are controlled at the orchestrator level. Debug panel provides log toggle and clear.
