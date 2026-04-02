# AGENTS.md

Top-down 2D boat racing game set on Amsterdam canals. Vanilla TypeScript + Canvas 2D, bundled with Bun, deployed on Netlify. Features world-space anisotropic drag physics (ported from boat branch), motor voltage ramp, speed-dependent steering, and a live debug panel with 4 boat presets.

## Commands

```bash
bun run dev        # dev server on localhost:3000 (hot reload)
bun run build      # production build to dist/
bun run lint       # oxlint on src/
bun run fmt        # oxfmt auto-format
bun run fmt:check  # check formatting without writing
```

After any code change, verify with: `bun run lint && bun run build`

## Architecture

ECS-lite architecture with a fixed 60Hz timestep game loop. Entities are plain data bags, systems are pure functions. State machine manages game screens (Menu → Racing).

**Key components:**

| Component | Path | Responsibility |
|-----------|------|----------------|
| main | `src/main.ts` | Canvas setup, wires input/state/loop |
| game-loop | `src/game-loop.ts` | Fixed 60Hz timestep + render interpolation |
| state-manager | `src/state-manager.ts` | Game state lifecycle (enter/exit/update/render) |
| physics | `src/systems/physics.ts` | World-space decompose/recompose + anisotropic drag + motor ramp |
| collision | `src/systems/collision.ts` | AABB canal boundary enforcement (world-space vel) |
| camera | `src/systems/camera.ts` | Smooth follow with look-ahead + rotation |
| boat-render | `src/systems/boat-render.ts` | boat.png sprite with interpolation + procedural fallback |
| background-render | `src/systems/background-render.ts` | Water + island + wall + grid |
| debug | `src/debug.ts` | Live physics tuning panel with sliders + 4 presets |

**Data flow:**
1. Game loop ticks 60Hz → `input.update(dt)` → `states.update(dt, input)`
2. RacingState runs `updatePhysics()` then `resolveCollisions()`
3. Physics: decompose world vel (vx,vy) → local frame → drag → thrust → recompose → max speed cap → integrate
4. Render: clear canvas → camera transform → background → boat sprite → HUD

**Patterns:**
- **ECS-lite**: Entity = data bag, Systems = pure functions
- **Fixed timestep + interpolation**: Physics at 60Hz, rendering interpolates with alpha
- **World-space velocity**: Stored as (vx,vy), decomposed to local each frame — turning creates natural drift
- **Motor voltage ramp**: Throttle sets `targetVoltage`, ramps up (1.5/s) and down (2.5/s)
- **Anisotropic drag**: Forward drag 0.015 (glide) + lateral drag 0.95 (resist drift), 63:1 ratio

## Key Rules

- No runtime dependencies — pure vanilla TS + Canvas 2D
- Entities are plain objects with optional `?` components — never add methods to entities
- Systems are pure functions in `src/systems/` — they take entities + input, mutate in place
- Velocity is world-space (`vel.x`, `vel.y`) — NOT local frame. Physics decomposes/recomposes each tick
- `prevPos`/`prevAngle` must be stored before physics update for render interpolation
- `applyCameraTransform` calls `ctx.save()` — the matching `ctx.restore()` is in `RacingState.render()`
- `src/boat/boat.ts` is a legacy standalone module — the ECS pipeline uses `src/entity.ts` + `src/systems/physics.ts`
- `MotorComponent.maxForce` is vestigial — thrust comes from `boatPhysics.thrustForce`
- Debug menu (backtick key) mutates `boatPhysics` component directly via `Object.assign`
- `build.ts` and `serve.ts` must copy `src/boat/boat.png` to `dist/`

## Features

| Feature | Status | Key Files |
|---------|--------|-----------|
| Boat Physics | active | `src/systems/physics.ts`, `src/entity.ts`, `src/debug.ts` |
| Racing | active | `src/states/racing-state.ts`, `src/systems/camera.ts` |
| Track | wip | `src/track.ts`, `src/systems/background-render.ts` |
| Input | stable | `src/input.ts` |
| Debug | stable | `src/debug.ts` |

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `src/` | Game source code |
| `src/boat/` | Boat sprite (boat.png) + legacy standalone boat module |
| `src/states/` | Game state implementations (menu, racing) |
| `src/systems/` | ECS-style systems (physics, collision, camera, rendering) |
| `public/` | Static HTML |
| `dist/` | Build output |
