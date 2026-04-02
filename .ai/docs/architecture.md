# Architecture

## Component Map

```toon
components[10]{name,type,path,responsibility}:
  main,bootstrap,src/main.ts,canvas setup + wires input/state/loop
  game-loop,core,src/game-loop.ts,fixed 60Hz timestep with render interpolation
  state-manager,core,src/state-manager.ts,game state lifecycle (enter/exit/update/render)
  menu-state,state,src/states/menu-state.ts,title screen + press-space-to-start
  racing-state,state,src/states/racing-state.ts,main gameplay — spawns boat + runs systems
  physics,system,src/systems/physics.ts,motor ramp + anisotropic drag + thrust + steering
  collision,system,src/systems/collision.ts,AABB canal boundary enforcement
  camera,system,src/systems/camera.ts,smooth follow with look-ahead + rotation tracking
  boat-render,system,src/systems/boat-render.ts,sprite draw with interpolation + fallback shape
  background-render,system,src/systems/background-render.ts,water + island + wall + grid rendering
```

## Data Flow

1. `main.ts` creates canvas, input system, state manager, and game loop
2. Game loop ticks at 60Hz — calls `input.update(dt)` then `states.update(dt, input)`
3. `RacingState.update()` runs `updatePhysics()` then `resolveCollisions()`
4. Render phase: `RacingState.render()` clears canvas, applies camera transform, draws background + boat + HUD
5. State transitions via `gameCtx.switchState()` (MenuState → RacingState)

## Patterns

- **ECS-lite**: Entity is a plain data bag (`types.ts`), systems are pure functions that operate on entities
- **Fixed timestep + interpolation**: Physics runs at 60Hz, rendering interpolates between `prevPos`/`pos` using alpha
- **State machine**: `GameState` interface with `enter/exit/update/render` lifecycle
- **Motor voltage ramp**: Throttle input doesn't directly set speed — it sets `targetVoltage`, which ramps up/down at configurable rates
- **Anisotropic drag**: Forward drag is low (gliding), lateral drag is high (resists sideways drift) — creates realistic boat feel

## Boundaries

- **No external APIs** — fully client-side canvas game
- **No database** — no persistence yet
- **No auth** — local multiplayer planned (shared screen)
