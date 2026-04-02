# Architecture

## Component Map

```toon
components[11]{name,type,path,responsibility}:
  main,bootstrap,src/main.ts,canvas setup + wires dual-player input/state/loop
  game-loop,core,src/game-loop.ts,fixed 60Hz timestep with render interpolation
  state-manager,core,src/state-manager.ts,game state lifecycle (enter/exit/update/render)
  menu-state,state,src/states/menu-state.ts,title screen + press-space-to-start
  racing-state,state,src/states/racing-state.ts,main gameplay — spawns 2 boats + runs systems + debug panel
  physics,system,src/systems/physics.ts,world-space velocity decompose/recompose + anisotropic drag + motor ramp
  collision,system,src/systems/collision.ts,AABB canal boundary enforcement (world-space velocity)
  camera,system,src/systems/camera.ts,dual-mode: follow (single entity + look-ahead) or fixed (all entities + dynamic zoom)
  boat-render,system,src/systems/boat-render.ts,boat.png sprite with interpolation + procedural fallback
  background-render,system,src/systems/background-render.ts,water + island + wall + grid rendering
  debug,ui,src/debug.ts,camera mode toggle + per-boat physics tuning with sliders + 4 presets
```

## Data Flow

1. `main.ts` creates canvas, dual-player input system, state manager, and game loop
2. Game loop ticks at 60Hz — calls `input.update(dt)` then `states.update(dt, dualInput)`
3. `RacingState.update()` runs `updatePhysics()` + `resolveCollisions()` for each boat independently
4. Physics: decompose world velocity (vx,vy) into local frame via dot product → anisotropic drag → thrust → recompose to world → cap max speed → integrate
5. Render phase: `RacingState.render()` clears canvas → `updateCamera()` → `applyCameraTransform()` → background → both boats → restore → HUD
6. State transitions via `gameCtx.switchState()` (MenuState → RacingState)

## Patterns

- **ECS-lite**: Entity is a plain data bag (`types.ts`), systems are pure functions that operate on entities
- **Fixed timestep + interpolation**: Physics runs at 60Hz, rendering interpolates between `prevPos`/`pos` using alpha
- **State machine**: `GameState` interface with `enter/exit/update/render` lifecycle
- **World-space velocity**: Stored as (vx,vy), decomposed to local each frame for anisotropic drag — turning naturally creates drift
- **Motor voltage ramp**: Throttle sets `targetVoltage`, which ramps up (1.5/s) and down (2.5/s)
- **Anisotropic drag**: Forward drag low (0.012 = glide), lateral drag high (0.95 = resist sideways drift)
- **Dual-mode camera**: Follow mode (single entity, rotated view) or fixed mode (all entities, dynamic zoom, no rotation) — toggled via debug panel

## Boundaries

- **No external APIs** — fully client-side canvas game
- **No database** — no persistence yet
- **No auth** — local two-player on shared screen (WASD + Arrows)
