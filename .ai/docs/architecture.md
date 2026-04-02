# Architecture

## Component Map

```toon
components[29]{name,type,path,responsibility}:
  main,bootstrap,src/main.ts,canvas setup + wires dual-player input/state/loop
  game-loop,core,src/game-loop.ts,fixed 60Hz timestep with render interpolation
  state-manager,core,src/state-manager.ts,game state lifecycle (enter/exit/update/render)
  types,core,src/types.ts,all interfaces — entity components + powerup definitions + game state
  entity,core,src/entity.ts,entity factories (boat/pickup/obstacle/zone) + ID counter
  entity-manager,core,src/entity-manager.ts,entity list with tag/component queries + cleanup
  menu-state,state,src/states/menu-state.ts,title screen + press-space-to-start
  racing-state,state,src/states/racing-state.ts,main gameplay — dual boats + powerup pipeline + particles + camera + map collision + event logging
  editor-state,state,src/editor/editor-state.ts,map editor — draw/edit river outline + place attributes + bridges
  editor-toolbar,ui,src/editor/toolbar.ts,HTML toolbar with mode tabs and action buttons
  physics,system,src/systems/physics.ts,world-space velocity decompose/recompose + anisotropic drag + motor ramp
  collision,system,src/systems/collision.ts,polygon boundary + wall response + boat-to-boat collision with impulse
  flooding,system,src/systems/flooding.ts,"periodic flood cycle (20s/5s), penalty system, settings panel, flood overlay"
  camera,system,src/systems/camera.ts,follow camera with look-ahead + rotation
  boat-render,system,src/systems/boat-render.ts,boat.png sprite with interpolation + procedural fallback
  map-renderer,system,src/map/map-renderer.ts,polygon map rendering — land + water channel + grid + walls + bridges + attributes
  particles,system,src/systems/particles.ts,pooled particle effects — wake spray + collision sparks (512-slot pool)
  powerup-spawn,system,src/systems/powerup-spawn.ts,timer-based weighted powerup spawning via trackBoundsFromMap() adapter
  powerup-collision,system,src/systems/powerup-collision.ts,circle-circle pickup detection → PickupEvent[]
  powerup-effects,system,src/systems/powerup-effects.ts,effect apply (stacking rules) + tick + expire lifecycle
  powerup-render,system,src/systems/powerup-render.ts,render pickups + zones + obstacles + effect visuals + effects HUD
  entity-lifetime,system,src/systems/entity-lifetime.ts,countdown → mark entities for removal
  entity-cleanup,system,src/systems/entity-cleanup.ts,remove entities marked for removal
  zone-effects,system,src/systems/zone-effects.ts,area-of-effect processing for zone entities
  map-data,data,src/map/map-data.ts,shared MapData singleton + default map factory + land/water queries
  geometry,util,src/map/geometry.ts,"point-in-polygon, edge normals, push, path processing, polygon offset"
  debug,ui,src/debug.ts,collapsible BOAT panel (camera toggle + per-boat physics + 4 presets) + shared panel/tab helpers
  powerup-debug,ui,src/powerup-debug.ts,collapsible POWERUPS panel (per-powerup tunable knobs) + GENERAL panel (flood/log/live stats)
  game-log,ui,src/game-log.ts,event log with fade/pinned modes — rendered on canvas
```

## Data Flow

1. `main.ts` creates canvas, dual-player input system, state manager, and game loop
2. Game loop ticks at 60Hz — calls `input.update(dt)` then `states.update(dt, dualInput)`
3. `RacingState.update()` runs physics → `resolveMapCollisions()` → particles for each boat, then `resolveBoatCollision()` between them, then powerup pipeline → cleanup
4. Physics: decompose world velocity (vx,vy) into local frame via dot product → anisotropic drag → thrust → recompose to world → cap max speed → integrate
5. Collision: radius-aware wall check (boat edge, not center) for outer polygon + island. Angle-dependent response: glancing hits deflect, head-on hits push back. Boat-to-boat: circle collision with impulse
6. Powerup pipeline: spawn pickups (via `trackBoundsFromMap()` adapter) → detect pickup collisions (both boats) → apply effects → tick effects → expire effects → zone effects → tick lifetimes → cleanup entities
7. Render phase: clear canvas → `updateCamera(w, h, dt)` → `applyCameraTransform()` → `renderMap()` (land + water + grid + walls + attributes) → zones → pickups → obstacles → particles → both boats → effect visuals → `renderBridges()` (boats pass under) → restore → HUD → effects HUD → event log
8. State transitions via `gameCtx.switchState()` (MenuState → RacingState ↔ EditorState)

## Patterns

- **ECS-lite**: Entity is a plain data bag (`types.ts`), systems are pure functions that operate on entities
- **Fixed timestep + interpolation**: Physics runs at 60Hz, rendering interpolates between `prevPos`/`pos` using alpha
- **State machine**: `GameState` interface with `enter/exit/update/render` lifecycle
- **World-space velocity**: Stored as (vx,vy), decomposed to local each frame for anisotropic drag — turning naturally creates drift
- **Motor voltage ramp**: Throttle sets `targetVoltage`, which ramps up (1.5/s) and down (2.5/s). Reverse targets -0.4
- **Anisotropic drag**: Forward drag low (0.012 = glide), lateral drag high (0.95 = resist sideways drift)
- **Dual-mode camera**: Follow mode (single entity, rotated view + look-ahead) or fixed mode (all entities, dynamic zoom, no rotation) — smooth 500ms transition
- **Shared map singleton**: `getCurrentMap()`/`setCurrentMap()` — both RacingState and EditorState access same MapData
- **Polygon maps**: Outer bank + island polygons define a river channel, rendered with `arcTo` curves. Collision uses edge normals
- **Freehand → polygon pipeline**: raw mouse points → Douglas-Peucker simplify → Chaikin smooth → resample → offset for outer/island
- **Zero-allocation particle pool**: 512 pre-allocated slots reused via `active` flag — no GC pressure during gameplay
- **Data-driven powerups**: `PowerupDefinition` registry with `onApply/onTick/onExpire` lifecycle hooks + optional `tunables` record — adding a powerup = one definition file
- **Multiplier-based effect cleanup**: Effects store multipliers, not snapshots — divide on expire for order-independent reversal
- **Orchestrator-level event logging**: Systems stay pure, `RacingState` observes outputs and logs events (set-diff for expirations)

## Boundaries

- **No external APIs** — fully client-side canvas game
- **No database** — no persistence yet
- **No auth** — local two-player on shared screen (WASD + Arrows)
