# Decisions

```toon
decisions[8]{id,date,title,status}:
  001,2026-04-02,Fixed timestep game loop,accepted
  002,2026-04-02,ECS-lite over class hierarchy,accepted
  003,2026-04-02,Anisotropic drag for boat physics,accepted
  004,2026-04-02,Bun as bundler and runtime,accepted
  005,2026-04-02,World-space velocity over local-space,accepted
  006,2026-04-02,Polygon maps over AABB tracks,accepted
  007,2026-04-02,Freehand draw with auto-smoothing for map editor,accepted
  008,2026-04-02,Edge-normal collision response over centroid push,accepted
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

## ADR-006: Polygon maps over AABB tracks

**Status**: accepted
**Context**: AABB TrackBounds only supports rectangular canals. Need curved, user-editable river channels.
**Decision**: Replace TrackBounds with MapData — two polygons (outer bank + island) define a river channel. Rendered with `arcTo` for smooth curves. Collision uses edge normals.
**Consequences**: Arbitrary track shapes. In-game editor possible. Slightly more complex collision (point-in-polygon + edge normal push vs simple AABB clamp). Legacy track.ts and background-render.ts remain but unused.

---

## ADR-007: Freehand draw with auto-smoothing for map editor

**Status**: accepted
**Context**: Placing individual polygon points is tedious for users. Need intuitive track creation.
**Decision**: User paints a freehand loop → system processes via Douglas-Peucker simplification → Chaikin corner-cutting → resample to 12 points → offset ±90px for outer/island. Result is editable via point dragging.
**Consequences**: Fast track creation. Consistent river width. Constraints (min channel width, min turn angle, island-inside-outer) prevent unusable maps. Auto-switch to edit mode after drawing.

---

## ADR-008: Edge-normal collision response over centroid push

**Status**: accepted
**Context**: Original pushIntoPolygon pushed boat toward polygon centroid. For the outer bank, centroid is the map center — where the island sits. Boat got pushed into the island and oscillated.
**Decision**: Find nearest polygon edge, compute its outward normal, push along that normal. Cancel wall-normal velocity component, preserve tangential sliding with friction.
**Consequences**: Boat deflects off walls and slides along them. No more stuck-at-wall oscillation. Works correctly for both outer bank (push inward) and island (push outward).
