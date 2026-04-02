# Architecture

## Component Map

```toon
components[25]{name,type,path,responsibility}:
  main,bootstrap,src/main.ts,canvas setup + wires dual-player input/state/loop
  game-loop,core,src/game-loop.ts,fixed 60Hz timestep with render interpolation
  state-manager,core,src/state-manager.ts,game state lifecycle (enter/exit/update/render)
  types,core,src/types.ts,all interfaces — entity components + powerup definitions + game state
  entity,core,src/entity.ts,entity factories (boat/pickup/obstacle/zone) + ID counter
  entity-manager,core,src/entity-manager.ts,entity list with tag/component queries + cleanup
  menu-state,state,src/states/menu-state.ts,title screen + press-space-to-start
  racing-state,state,src/states/racing-state.ts,main gameplay — dual boats + powerup pipeline + particles + camera + event logging
  physics,system,src/systems/physics.ts,world-space velocity decompose/recompose + anisotropic drag + motor ramp
  collision,system,src/systems/collision.ts,AABB canal boundary enforcement + CollisionResult out-param for sparks
  camera,system,src/systems/camera.ts,dual-mode: follow (single entity + look-ahead) or fixed (all entities + dynamic zoom)
  boat-render,system,src/systems/boat-render.ts,boat.png sprite with interpolation + procedural fallback
  background-render,system,src/systems/background-render.ts,water + island + wall + grid rendering
  particles,system,src/systems/particles.ts,pooled particle effects — wake spray + collision sparks (512-slot pool)
  powerup-spawn,system,src/systems/powerup-spawn.ts,timer-based weighted powerup spawning on canal/street spawn points
  powerup-collision,system,src/systems/powerup-collision.ts,circle-circle pickup detection → PickupEvent[]
  powerup-effects,system,src/systems/powerup-effects.ts,effect apply (stacking rules) + tick + expire lifecycle
  powerup-render,system,src/systems/powerup-render.ts,render pickups + zones + obstacles + effect visuals (pulsing radial gradient glow) + effects HUD + pickup name toasts (PowerupToast fade/drift)
  ui-text,data,src/ui-text.ts,all player-visible strings — static values + typed template functions for dynamic labels
  entity-lifetime,system,src/systems/entity-lifetime.ts,countdown → mark entities for removal
  entity-cleanup,system,src/systems/entity-cleanup.ts,remove entities marked for removal
  zone-effects,system,src/systems/zone-effects.ts,area-of-effect processing for zone entities
  debug,ui,src/debug.ts,collapsible BOAT panel (camera toggle + per-boat physics + 4 presets) + shared panel/tab helpers
  powerup-debug,ui,src/powerup-debug.ts,collapsible POWERUPS panel (per-powerup tunable knobs) + GENERAL panel (flood/log/live stats)
  game-log,ui,src/game-log.ts,event log with fade/pinned modes — rendered on canvas
```

## Data Flow

1. `main.ts` creates canvas, dual-player input system, state manager, and game loop
2. Game loop ticks at 60Hz — calls `input.update(dt)` then `states.update(dt, dualInput)`
3. `RacingState.update()` runs physics → collision → particles for each boat, then powerup pipeline → cleanup
4. Physics: decompose world velocity (vx,vy) into local frame via dot product → anisotropic drag → thrust → recompose to world → cap max speed → integrate
5. Powerup pipeline: spawn pickups → detect pickup collisions (both boats) → apply effects → tick effects → expire effects → zone effects → tick lifetimes → cleanup entities
6. Render phase: clear canvas → `updateCamera(w, h, dt)` → `applyCameraTransform()` → background → zones → pickups → obstacles → particles → both boats → effect visuals → restore → HUD → effects HUD → pickup toasts → event log
7. State transitions via `gameCtx.switchState()` (MenuState → RacingState)

## Patterns

- **ECS-lite**: Entity is a plain data bag (`types.ts`), systems are pure functions that operate on entities
- **Fixed timestep + interpolation**: Physics runs at 60Hz, rendering interpolates between `prevPos`/`pos` using alpha
- **State machine**: `GameState` interface with `enter/exit/update/render` lifecycle
- **World-space velocity**: Stored as (vx,vy), decomposed to local each frame for anisotropic drag — turning naturally creates drift
- **Motor voltage ramp**: Throttle sets `targetVoltage`, which ramps up (1.5/s) and down (2.5/s). Reverse targets -0.4
- **Anisotropic drag**: Forward drag low (0.012 = glide), lateral drag high (0.95 = resist sideways drift)
- **Dual-mode camera**: Follow mode (single entity, rotated view + look-ahead) or fixed mode (all entities, dynamic zoom, no rotation) — smooth 500ms transition
- **Zero-allocation particle pool**: 512 pre-allocated slots reused via `active` flag — no GC pressure during gameplay
- **Data-driven powerups**: `PowerupDefinition` registry with `onApply/onTick/onExpire` lifecycle hooks + optional `tunables` record — adding a powerup = one definition file
- **Multiplier-based effect cleanup**: Effects store multipliers, not snapshots — divide on expire for order-independent reversal
- **Orchestrator-level event logging**: Systems stay pure, `RacingState` observes outputs and logs events (set-diff for expirations)

## Boundaries

- **No external APIs** — fully client-side canvas game
- **No database** — no persistence yet
- **No auth** — local two-player on shared screen (WASD + Arrows)
