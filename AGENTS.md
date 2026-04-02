# Boat Race

Top-down 2D two-player boat racing game. Vanilla TypeScript + Canvas 2D, bundled with Bun. Two boats (P1 WASD, P2 Arrows) with physics-driven handling on user-editable polygon river tracks. In-game map editor with freehand drawing, attribute placement, and bridges. Boats pass under bridges.

## Commands

```bash
bun run dev        # dev server on localhost:3000 (hot reload)
bun run build      # production build to dist/
bun run lint       # oxlint on src/
bun run fmt        # oxfmt auto-format
```

## Architecture

### Key Components

| Component | Path | Role |
|-----------|------|------|
| main | src/main.ts | Canvas setup, wires input/state/loop |
| game-loop | src/game-loop.ts | Fixed 60Hz timestep + interpolated render |
| state-manager | src/state-manager.ts | GameState lifecycle (enter/exit/update/render) |
| racing-state | src/states/racing-state.ts | Main gameplay — 2 boats + physics + collision + map + editor button |
| editor-state | src/editor/editor-state.ts | Map editor — draw/edit river + attributes + bridges |
| physics | src/systems/physics.ts | Anisotropic drag + motor ramp + speed-dependent steering |
| collision | src/systems/collision.ts | Polygon boundary + edge-normal wall response |
| camera | src/systems/camera.ts | Follow camera with look-ahead + rotation |
| map-data | src/map/map-data.ts | MapData singleton + land/water queries |
| map-renderer | src/map/map-renderer.ts | Polygon map rendering (land + water + grid + walls + bridges) |
| geometry | src/map/geometry.ts | Point-in-polygon, edge normals, path processing, polygon offset |
| debug | src/debug.ts | Physics tuning sliders + boat presets |

### Data Flow

1. Game loop ticks at 60Hz → `input.update(dt)` → `states.update(dt, input)`
2. Physics: decompose world velocity to local → anisotropic drag → thrust → recompose → integrate
3. Collision: keep boat inside outer polygon + outside island. Edge-normal push + velocity cancellation
4. Render: camera transform → `renderMap()` → boats → `renderBridges()` (boats under) → HUD
5. States: MenuState → RacingState ↔ EditorState

### Patterns

- **ECS-lite**: Entity = plain data, systems = pure functions
- **Fixed timestep + interpolation**: Physics at 60Hz, render interpolates with alpha
- **World-space velocity**: Decomposed to local each frame for anisotropic drag
- **Polygon maps**: Outer bank + island polygons define river channel, rendered with `arcTo` curves
- **Freehand → polygon**: Draw → Douglas-Peucker → Chaikin smooth → resample → offset ±90px

## Key Rules

- No runtime dependencies — vanilla Canvas 2D only
- MapData is a shared singleton (`getCurrentMap()`/`setCurrentMap()`)
- `applyCameraTransform` calls `ctx.save()` — matching `ctx.restore()` in RacingState.render()
- Collision uses edge outward normals, NOT centroid direction
- Legacy files exist but are unused: `src/track.ts`, `src/systems/background-render.ts`
- `src/boat/boat.ts` is legacy — physics values live in `src/entity.ts`

## Features

| Feature | Entry Point | Description |
|---------|-------------|-------------|
| Boat Physics | src/systems/physics.ts | Anisotropic drag, motor ramp, speed-dependent steering |
| Racing | src/states/racing-state.ts | Two-player gameplay with polygon map |
| Camera | src/systems/camera.ts | Dual-mode camera (follow / fixed framing both boats) |
| Map Editor | src/editor/editor-state.ts | Freehand draw + point edit + attributes + bridges |
| Track | src/map/map-data.ts | Polygon river channel (outer bank + island) |
| Input | src/input.ts | Two-player keyboard input (P1 WASD, P2 Arrows) |
| Debug | src/debug.ts | Physics tuning sliders + 4 presets |

## Project Structure

| Path | Purpose |
|------|---------|
| src/ | Game source code |
| src/boat/ | Boat sprite + legacy boat module |
| src/states/ | Game states (menu, racing) |
| src/systems/ | ECS systems (physics, collision, camera, rendering) |
| src/map/ | Polygon map system (data, geometry, renderer) |
| src/editor/ | In-game map editor (state, toolbar) |
