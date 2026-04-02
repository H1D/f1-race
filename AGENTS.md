# AGENTS.md

Top-down 2D two-player boat racing game set on Amsterdam canals. Vanilla TypeScript + Canvas 2D, bundled with Bun, deployed on Netlify. Two boats on shared screen (WASD + Arrows) with world-space anisotropic drag physics, motor voltage ramp, speed-dependent steering, dual-mode camera (follow/fixed with dynamic zoom), pooled particle effects (wake spray + collision sparks), a data-driven powerup system with lifecycle hooks, event logging, and collapsible live debug panels.

## Commands

```bash
bun run dev        # dev server on localhost:3000 (hot reload)
bun run build      # production build to dist/
bun run lint       # oxlint on src/
bun run fmt        # oxfmt auto-format
```

After any code change, verify with: `bun run lint && npx tsc --noEmit`

## Architecture

ECS-lite architecture with a fixed 60Hz timestep game loop. Entities are plain data bags with optional components, systems are pure functions. State machine manages game screens (Menu → Racing). Two-player input via `DualInput` type. Data-driven powerup framework with registry pattern.

**Key components:**

| Component | Path | Responsibility |
|-----------|------|----------------|
| main | `src/main.ts` | Canvas setup, wires dual-player input/state/loop |
| game-loop | `src/game-loop.ts` | Fixed 60Hz timestep + render interpolation |
| state-manager | `src/state-manager.ts` | Game state lifecycle (enter/exit/update/render) |
| types | `src/types.ts` | All interfaces — entity components + powerup definitions |
| entity | `src/entity.ts` | Entity factories (boat/pickup/obstacle/zone) + ID counter |
| entity-manager | `src/entity-manager.ts` | Entity list with tag/component queries + cleanup |
| physics | `src/systems/physics.ts` | World-space decompose/recompose + anisotropic drag + motor ramp |
| collision | `src/systems/collision.ts` | AABB canal boundary enforcement + CollisionResult out-param |
| camera | `src/systems/camera.ts` | Dual-mode: follow (single entity + look-ahead) or fixed (all entities + dynamic zoom) |
| boat-render | `src/systems/boat-render.ts` | boat.png sprite with interpolation + procedural fallback |
| background-render | `src/systems/background-render.ts` | Water + island + wall + grid |
| particles | `src/systems/particles.ts` | Pooled particle effects — wake spray + collision sparks (512-slot pool) |
| powerup-spawn | `src/systems/powerup-spawn.ts` | Timer-based weighted powerup spawning |
| powerup-collision | `src/systems/powerup-collision.ts` | Circle-circle pickup detection |
| powerup-effects | `src/systems/powerup-effects.ts` | Effect apply/tick/expire lifecycle with stacking rules |
| powerup-render | `src/systems/powerup-render.ts` | Render pickups, zones, obstacles, effect visuals, HUD |
| entity-lifetime | `src/systems/entity-lifetime.ts` | Countdown → mark for removal |
| zone-effects | `src/systems/zone-effects.ts` | Area-of-effect processing |
| game-log | `src/game-log.ts` | Event log with fade/pinned modes |
| debug | `src/debug.ts` | Collapsible BOAT panel (camera toggle + per-boat physics) + shared panel/tab helpers |
| powerup-debug | `src/powerup-debug.ts` | Collapsible POWERUPS panel (per-powerup tunable knobs) + GENERAL panel |
| registry | `src/powerups/registry.ts` | PowerupDefinition map — register + load |

**Data flow:**
1. Game loop ticks 60Hz → `input.update(dt)` → `states.update(dt, dualInput)`
2. RacingState runs `updatePhysics()` + `resolveCollisions()` + particle emitters for each boat, then powerup pipeline → cleanup
3. Powerup pipeline: spawn → detect pickups (both boats) → apply effects → tick → expire → zones → lifetimes → cleanup
4. Physics: decompose world vel (vx,vy) → local frame → drag → thrust → recompose → max speed cap → integrate
5. Render: clear → camera transform → background → zones → pickups → obstacles → particles → both boats + effect visuals → HUD → effects HUD → event log

**Patterns:**
- **ECS-lite**: Entity = data bag, Systems = pure functions
- **Fixed timestep + interpolation**: Physics at 60Hz, rendering interpolates with alpha
- **World-space velocity**: Stored as (vx,vy), decomposed to local each frame — turning creates natural drift
- **Motor voltage ramp**: Throttle sets `targetVoltage`, ramps up (1.5/s) and down (2.5/s). Reverse targets -0.4
- **Anisotropic drag**: Forward drag 0.012 (glide) + lateral drag 0.95 (resist drift), ~79:1 ratio
- **Dual-mode camera**: Follow mode (rotated, look-ahead) or fixed mode (dynamic zoom, no rotation) — smooth 500ms transition
- **Zero-allocation particle pool**: 512 pre-allocated slots reused via `active` flag — no GC pressure
- **Data-driven powerups**: PowerupDefinition registry with onApply/onTick/onExpire hooks + optional `tunables` record for debug-panel knobs
- **Multiplier-based effect reversal**: Effects store multipliers, divide on expire — order-independent
- **Orchestrator logging**: Systems stay pure, RacingState observes outputs and logs events

## Key Rules

- No runtime dependencies — pure vanilla TS + Canvas 2D
- Entities are plain objects with optional `?` components — never add methods to entities
- Systems are pure functions in `src/systems/` — they take entities + input, mutate in place
- Velocity is world-space (`vel.x`, `vel.y`) — NOT local frame. Physics decomposes/recomposes each tick
- `prevPos`/`prevAngle` must be stored before physics update for render interpolation
- `applyCameraTransform` calls `ctx.save()` — the matching `ctx.restore()` is in `RacingState.render()`
- `src/boat/boat.ts` is a legacy standalone module — the ECS pipeline uses `src/entity.ts` + `src/systems/physics.ts`
- Powerup definitions export data only — registry imports and registers (no side-effect registration to avoid circular deps)
- Effects use multipliers (`*= 1.5` / `/= 1.5`), not absolute snapshots — order-independent cleanup
- Powerup definitions can declare `tunables: Record<string, { value, min, max, step }>` — `onApply` reads from tunables at call time, debug panel auto-generates sliders
- `markedForRemoval` entities are cleaned up at end of update loop — systems must tolerate their presence during the tick
- Debug panel (backtick key) has three collapsible sections: BOAT (physics), POWERUPS (spawn + per-powerup tunable knobs), GENERAL (flood/log/live)
- `build.ts` and `serve.ts` must copy `src/boat/boat.png` to `dist/`
- Input system returns `DualInput` (`{ player1, player2 }`) — P1=WASD, P2=Arrows
- `GameState.update()` takes `DualInput`, not single `InputState`
- `renderParticles()` must be called between `applyCameraTransform()` and `ctx.restore()` — world-space rendering
- `CollisionResult` is a mutable out-param — `resolveCollisions()` resets and populates it each frame

## Features

| Feature | Status | Key Files |
|---------|--------|-----------|
| Boat Physics | active | `src/systems/physics.ts`, `src/entity.ts`, `src/debug.ts` |
| Racing | active | `src/states/racing-state.ts`, `src/systems/boat-render.ts` |
| Camera | active | `src/systems/camera.ts` |
| Powerups | active | `src/powerups/registry.ts`, `src/systems/powerup-effects.ts`, `src/systems/powerup-spawn.ts` |
| Game Log | active | `src/game-log.ts`, `src/powerup-debug.ts` |
| Track | wip | `src/track.ts`, `src/systems/background-render.ts` |
| Input | active | `src/input.ts` |
| Particles | active | `src/systems/particles.ts` |
| Debug | active | `src/debug.ts`, `src/powerup-debug.ts` |

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `src/` | Game source code |
| `src/boat/` | Boat sprite (boat.png) + legacy standalone boat module |
| `src/states/` | Game state implementations (menu, racing) |
| `src/systems/` | ECS-style systems (physics, collision, camera, rendering, particles, powerups) |
| `src/powerups/` | Powerup registry + definitions |
| `src/powerups/definitions/` | Individual powerup type definitions |
| `public/` | Static HTML |
| `dist/` | Build output |
