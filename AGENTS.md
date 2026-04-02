# AGENTS.md

Top-down 2D two-player boat racing game set on Amsterdam canals. Vanilla TypeScript + Canvas 2D, bundled with Bun, deployed on Netlify. Two boats on shared screen (WASD + Arrows) with world-space anisotropic drag physics, motor voltage ramp, speed-dependent steering, dual-mode camera (follow/fixed with dynamic zoom), pooled particle effects (wake spray + collision sparks), and a live debug panel with per-boat tuning + 4 presets.

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

ECS-lite architecture with a fixed 60Hz timestep game loop. Entities are plain data bags, systems are pure functions. State machine manages game screens (Menu → Racing). Two-player input via `DualInput` type.

**Key components:**

| Component | Path | Responsibility |
|-----------|------|----------------|
| main | `src/main.ts` | Canvas setup, wires dual-player input/state/loop |
| game-loop | `src/game-loop.ts` | Fixed 60Hz timestep + render interpolation |
| state-manager | `src/state-manager.ts` | Game state lifecycle (enter/exit/update/render) |
| physics | `src/systems/physics.ts` | World-space decompose/recompose + anisotropic drag + motor ramp |
| collision | `src/systems/collision.ts` | AABB canal boundary enforcement + CollisionResult out-param |
| camera | `src/systems/camera.ts` | Dual-mode: follow (single entity + look-ahead) or fixed (all entities + dynamic zoom) |
| boat-render | `src/systems/boat-render.ts` | boat.png sprite with interpolation + procedural fallback |
| background-render | `src/systems/background-render.ts` | Water + island + wall + grid |
| particles | `src/systems/particles.ts` | Pooled particle effects — wake spray + bow arrow wave + collision sparks (512-slot pool) |
| debug | `src/debug.ts` | Camera mode toggle + per-boat physics tuning with sliders + 4 presets |

**Data flow:**
1. Game loop ticks 60Hz → `input.update(dt)` → `states.update(dt, dualInput)`
2. RacingState runs `updatePhysics()` + `resolveCollisions()` for each boat, then particle emitters + `updateParticles()`
3. Physics: decompose world vel (vx,vy) → local frame → drag → thrust → recompose → max speed cap → integrate
4. Render: clear canvas → `updateCamera()` → `applyCameraTransform()` → background → particles → both boats → restore → HUD

**Patterns:**
- **ECS-lite**: Entity = data bag, Systems = pure functions
- **Fixed timestep + interpolation**: Physics at 60Hz, rendering interpolates with alpha
- **World-space velocity**: Stored as (vx,vy), decomposed to local each frame — turning creates natural drift
- **Motor voltage ramp**: Throttle sets `targetVoltage`, ramps up (1.5/s) and down (2.5/s). Reverse targets -0.4
- **Anisotropic drag**: Forward drag 0.012 (glide) + lateral drag 0.95 (resist drift), ~79:1 ratio
- **Dual-mode camera**: Follow mode (rotated, look-ahead) or fixed mode (damped-spring zoom, no rotation) — smooth 500ms transition
- **Zero-allocation particle pool**: 512 pre-allocated slots reused via `active` flag — no GC pressure. Three emitters: wake (stern), bow arrow (chevron at nose), collision sparks

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
| Track | wip | `src/track.ts`, `src/systems/background-render.ts` |
| Input | active | `src/input.ts` |
| Particles | active | `src/systems/particles.ts` |
| Debug | active | `src/debug.ts` |

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `src/` | Game source code |
| `src/boat/` | Boat sprite (boat.png) + legacy standalone boat module |
| `src/states/` | Game state implementations (menu, racing) |
| `src/systems/` | ECS-style systems (physics, collision, camera, rendering, particles) |
| `public/` | Static HTML |
| `dist/` | Build output |
