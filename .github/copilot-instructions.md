# Boat Race

Top-down 2D boat racing game. Vanilla TypeScript + Canvas 2D, bundled with Bun. Single boat with physics-driven handling on user-editable polygon river tracks. In-game map editor with freehand drawing, attribute placement, and bridges.

## Commands

- `bun run dev` — dev server on localhost:3000 (hot reload)
- `bun run build` — production build to dist/
- `bun run lint` — oxlint on src/
- `bun run fmt` — oxfmt auto-format

## Architecture

Key components: `src/main.ts` (bootstrap), `src/game-loop.ts` (60Hz fixed timestep), `src/state-manager.ts` (state lifecycle), `src/states/racing-state.ts` (gameplay), `src/editor/editor-state.ts` (map editor), `src/systems/physics.ts` (anisotropic drag), `src/systems/collision.ts` (polygon collision), `src/map/map-data.ts` (MapData singleton), `src/map/geometry.ts` (geometry utils).

Patterns: ECS-lite (entity = data, systems = functions), world-space velocity decomposed to local for drag, polygon maps (outer bank + island = river channel), freehand draw → simplify → smooth → offset.

## Key Rules

- No runtime dependencies — vanilla Canvas 2D only
- MapData is a shared singleton (`getCurrentMap()`/`setCurrentMap()`)
- Collision uses edge outward normals, NOT centroid direction
- Legacy unused files: `src/track.ts`, `src/systems/background-render.ts`, `src/boat/boat.ts`
- `applyCameraTransform` calls `ctx.save()` — matching `ctx.restore()` in RacingState.render()
