Top-down 2D boat racing game set on Amsterdam canals. Vanilla TypeScript + Canvas 2D, bundled with Bun, deployed on Netlify. Local multiplayer planned. Features physics-driven boat handling with motor voltage ramp, anisotropic drag, and speed-dependent steering.

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
| physics | `src/systems/physics.ts` | Motor ramp + anisotropic drag + thrust + steering |
| collision | `src/systems/collision.ts` | AABB canal boundary enforcement |
| camera | `src/systems/camera.ts` | Smooth follow with look-ahead + rotation |
| boat-render | `src/systems/boat-render.ts` | Sprite draw with interpolation + fallback |
| background-render | `src/systems/background-render.ts` | Water + island + wall + grid |

**Data flow:**
1. Game loop ticks 60Hz → `input.update(dt)` → `states.update(dt, input)`
2. RacingState runs `updatePhysics()` then `resolveCollisions()`
3. Render: clear canvas → camera transform → background → boat → HUD

**Patterns:**
- **ECS-lite**: Entity = data bag, Systems = pure functions
- **Fixed timestep + interpolation**: Physics at 60Hz, rendering interpolates with alpha
- **Motor voltage ramp**: Throttle sets `targetVoltage`, voltage ramps at configurable rates
- **Anisotropic drag**: Low forward drag (glide) + high lateral drag (resist drift)

## Key Rules

- No runtime dependencies — pure vanilla TS + Canvas 2D
- Entities are plain objects with optional `?` components — never add methods to entities
- Systems are pure functions in `src/systems/` — they take entities + input, mutate in place
- `prevPos`/`prevAngle` must be stored before physics update for render interpolation
- `applyCameraTransform` calls `ctx.save()` — the matching `ctx.restore()` is in `RacingState.render()`
- `src/boat/boat.ts` is a legacy standalone module — the ECS pipeline uses `src/entity.ts` + `src/systems/physics.ts`
- Debug menu (backtick key) mutates `boatPhysics` component directly via `Object.assign`

## Features

| Feature | Status | Key Files |
|---------|--------|-----------|
| Boat Physics | active | `src/systems/physics.ts`, `src/entity.ts`, `src/debug.ts` |
| Racing | active | `src/states/racing-state.ts`, `src/systems/camera.ts` |
| Track | wip | `src/track.ts`, `src/systems/background-render.ts` |
| Input | stable | `src/input.ts` |

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `src/` | Game source code |
| `src/boat/` | Boat sprite + standalone boat module (legacy) |
| `src/states/` | Game state implementations (menu, racing) |
| `src/systems/` | ECS-style systems (physics, collision, camera, rendering) |
| `public/` | Static HTML |
| `dist/` | Build output |
