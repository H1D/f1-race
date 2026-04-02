# Decisions

```toon
decisions[14]{id,date,title,status}:
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
  011,2026-04-02,Polygon maps over AABB tracks,accepted
  012,2026-04-02,Freehand draw with auto-smoothing for map editor,accepted
  013,2026-04-02,Edge-normal collision response over centroid push,accepted
  014,2026-04-02,Grid-sampled water-only powerup spawn points,accepted
```

## ADR-001: Fixed timestep game loop

**Status**: accepted
**Context**: Canvas games need deterministic physics regardless of frame rate.
**Decision**: 60Hz fixed timestep with accumulator. Render interpolates using alpha between previous and current state.
**Consequences**: Physics is framerate-independent. Requires storing `prevPos`/`prevAngle` on every entity.

---

## ADR-002: ECS-lite over class hierarchy

**Status**: accepted
**Context**: Need flexible entity composition without deep inheritance chains.
**Decision**: Entities are plain data objects with optional component interfaces. Systems are pure functions.
**Consequences**: Easy to add new components. No method dispatch overhead.

---

## ADR-003: Anisotropic drag for boat physics

**Status**: accepted
**Context**: Boats should feel different from cars — glide forward but resist sideways movement.
**Decision**: Decompose velocity into local forward/lateral, apply different drag coefficients (low forward ~0.015, high lateral ~0.95).
**Consequences**: Natural boat feel. Speed-dependent turning adds skill ceiling. Tunable via debug presets.

---

## ADR-004: Bun as bundler and runtime

**Status**: accepted
**Context**: Need fast dev iteration for a game project.
**Decision**: Use Bun for bundling, dev server, and hot reload. Single tool, no webpack/vite config.
**Consequences**: Fast builds. Deployed via Netlify with Bun in build env.

---

## ADR-005: World-space velocity over local-space

**Status**: accepted
**Context**: Local-frame velocity doesn't create drift — momentum rotates with heading.
**Decision**: Store velocity as world-space (vx, vy). Decompose to local each tick for anisotropic drag, then recompose.
**Consequences**: Turning naturally creates drift. Forward momentum becomes lateral when heading changes, then lateral drag kills it.

---

## ADR-006: Two-player shared-screen with split controls

**Status**: accepted
**Date**: 2026-04-02
**Context**: A racing game is more fun with competition. Need two boats on one screen.
**Decision**: `DualInput` type with P1=WASD, P2=Arrows. Both boats share the same canvas. Camera frames both players.
**Consequences**: Local multiplayer on shared screen. Camera must handle framing two entities.

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

---

## ADR-011: Polygon maps over AABB tracks

**Status**: accepted
**Context**: AABB TrackBounds only supports rectangular canals. Need curved, user-editable river channels.
**Decision**: Replace TrackBounds with MapData — two polygons (outer bank + island) define a river channel. Rendered with `arcTo` for smooth curves. Collision uses edge normals.
**Consequences**: Arbitrary track shapes. In-game editor possible. Slightly more complex collision (point-in-polygon + edge normal push vs simple AABB clamp). Legacy track.ts and background-render.ts remain but unused.

---

## ADR-012: Freehand draw with auto-smoothing for map editor

**Status**: accepted
**Context**: Placing individual polygon points is tedious for users. Need intuitive track creation.
**Decision**: User paints a freehand loop → system processes via Douglas-Peucker simplification → Chaikin corner-cutting → resample to 12 points → offset ±90px for outer/island. Result is editable via point dragging.
**Consequences**: Fast track creation. Consistent river width. Constraints (min channel width, min turn angle, island-inside-outer) prevent unusable maps. Auto-switch to edit mode after drawing.

---

## ADR-014: Grid-sampled water-only powerup spawn points

**Status**: accepted
**Date**: 2026-04-02
**Context**: The original spawn point generator produced points along four rectangular canal strips derived from `TrackBounds`. Since the map is an elliptical polygon, many strip points landed on the island or outside the water channel.
**Decision**: Sample a regular grid (120-unit step) over the world bounding box and keep only points where `isOnWater(point, map)` returns true. `isOnWater` uses point-in-polygon ray casting — inside outer polygon AND outside island polygon.
**Consequences**: Pickups always appear on water, adapting automatically to any map shape. Grid sampling replaces all spawn-zone-specific logic. Spawn system now takes `MapData` instead of `TrackBounds`.

---

## ADR-013: Edge-normal collision response over centroid push

**Status**: accepted
**Context**: Original pushIntoPolygon pushed boat toward polygon centroid. For the outer bank, centroid is the map center — where the island sits. Boat got pushed into the island and oscillated.
**Decision**: Find nearest polygon edge, compute its outward normal, push along that normal. Cancel wall-normal velocity component, preserve tangential sliding with friction.
**Consequences**: Boat deflects off walls and slides along them. No more stuck-at-wall oscillation. Works correctly for both outer bank (push inward) and island (push outward).
