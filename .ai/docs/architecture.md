# Architecture

## Component Map

```toon
components[11]{name,type,path,responsibility}:
  main,bootstrap,src/main.ts,canvas setup + wires input/state/loop
  game-loop,core,src/game-loop.ts,fixed 60Hz timestep with render interpolation
  state-manager,core,src/state-manager.ts,game state lifecycle (enter/exit/update/render)
  menu-state,state,src/states/menu-state.ts,title screen + press-space-to-start
  racing-state,state,src/states/racing-state.ts,main gameplay — spawns boat + runs systems + creates debug panel
  physics,system,src/systems/physics.ts,world-space velocity decompose/recompose + anisotropic drag + motor ramp
  collision,system,src/systems/collision.ts,AABB canal boundary enforcement (world-space velocity)
  camera,system,src/systems/camera.ts,smooth follow with look-ahead + rotation tracking
  boat-render,system,src/systems/boat-render.ts,boat.png sprite with interpolation + procedural fallback
  background-render,system,src/systems/background-render.ts,water + island + wall + grid rendering
  debug,ui,src/debug.ts,live physics tuning panel with sliders + 4 boat presets
```

## Data Flow

1. `main.ts` creates canvas, input system, state manager, and game loop
2. Game loop ticks at 60Hz — calls `input.update(dt)` then `states.update(dt, input)`
3. `RacingState.update()` runs `updatePhysics()` then `resolveCollisions()`
4. Physics: decompose world velocity (vx,vy) into local frame via dot product → anisotropic drag → thrust → recompose to world → cap max speed → integrate
5. Render phase: `RacingState.render()` clears canvas → camera transform → background → boat sprite → HUD
6. State transitions via `gameCtx.switchState()` (MenuState → RacingState)

## Patterns

- **ECS-lite**: Entity is a plain data bag (`types.ts`), systems are pure functions that operate on entities
- **Fixed timestep + interpolation**: Physics runs at 60Hz, rendering interpolates between `prevPos`/`pos` using alpha
- **State machine**: `GameState` interface with `enter/exit/update/render` lifecycle
- **World-space velocity**: Stored as (vx,vy), decomposed to local each frame for anisotropic drag — turning naturally creates drift
- **Motor voltage ramp**: Throttle sets `targetVoltage`, which ramps up (1.5/s) and down (2.5/s)
- **Anisotropic drag**: Forward drag low (0.015 = glide), lateral drag high (0.95 = resist sideways drift)

## Boundaries

- **No external APIs** — fully client-side canvas game
- **No database** — no persistence yet
- **No auth** — local multiplayer planned (shared screen)
