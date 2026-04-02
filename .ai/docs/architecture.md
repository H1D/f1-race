# Architecture

## Component Map

```toon
components[14]{name,type,path,responsibility}:
  main,bootstrap,src/main.ts,canvas setup + wires input/state/loop
  game-loop,core,src/game-loop.ts,fixed 60Hz timestep with render interpolation
  state-manager,core,src/state-manager.ts,game state lifecycle (enter/exit/update/render)
  menu-state,state,src/states/menu-state.ts,title screen + press-space-to-start
  racing-state,state,src/states/racing-state.ts,main gameplay — spawns boat + runs systems + debug + editor button
  editor-state,state,src/editor/editor-state.ts,map editor — draw/edit river outline + place attributes + bridges
  editor-toolbar,ui,src/editor/toolbar.ts,HTML toolbar with mode tabs and action buttons
  physics,system,src/systems/physics.ts,world-space velocity decompose/recompose + anisotropic drag + motor ramp
  collision,system,src/systems/collision.ts,polygon boundary enforcement + edge-normal wall response with sliding
  camera,system,src/systems/camera.ts,follow camera with look-ahead + rotation
  boat-render,system,src/systems/boat-render.ts,boat.png sprite with interpolation + procedural fallback
  map-renderer,system,src/map/map-renderer.ts,polygon map rendering — land + water channel + grid + walls + bridges + attributes
  map-data,data,src/map/map-data.ts,shared MapData singleton + default map factory + land/water queries
  geometry,util,src/map/geometry.ts,"point-in-polygon, edge normals, push, path processing, polygon offset"
```

## Data Flow

1. `main.ts` creates canvas, input system, state manager, and game loop
2. Game loop ticks at 60Hz — calls `input.update(dt)` then `states.update(dt, input)`
3. `RacingState.update()` runs `updatePhysics()` + `resolveMapCollisions()` per boat
4. Physics: decompose world velocity to local frame → anisotropic drag → thrust → recompose → cap max speed → integrate
5. Collision: check boat inside outer polygon + outside island polygon. On hit: push to nearest edge via edge normal, cancel wall-normal velocity, apply tangential friction
6. Render: clear → camera transform → `renderMap()` (green land + water + grid + walls + bridges + attributes) → boat → restore → HUD
7. State transitions: MenuState → RacingState ↔ EditorState

## Patterns

- **ECS-lite**: Entity is a plain data bag (`types.ts`), systems are pure functions
- **Fixed timestep + interpolation**: Physics at 60Hz, rendering interpolates using alpha
- **State machine**: `GameState` interface with enter/exit/update/render lifecycle
- **World-space velocity**: Stored as (vx,vy), decomposed to local each frame for anisotropic drag
- **Motor voltage ramp**: Throttle sets targetVoltage, which ramps up (1.5/s) and down (2.5/s)
- **Shared map singleton**: `getCurrentMap()`/`setCurrentMap()` — both RacingState and EditorState access same MapData
- **Freehand → polygon pipeline**: raw mouse points → Douglas-Peucker simplify → Chaikin smooth → resample → offset for outer/island

## Boundaries

- **No external APIs** — fully client-side canvas game
- **No database** — no persistence yet
- **No auth** — single player
