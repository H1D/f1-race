# Boat Race

Top-down 2D boat racing game. Vanilla TypeScript + Canvas 2D, bundled with Bun, deployed on Netlify. Single boat with physics-driven handling: motor voltage ramp, world-space anisotropic drag, speed-dependent steering, and a live debug panel with presets. Features an in-game map editor where users paint freehand river channels that get smoothed into polygon-based tracks.

## Stack

```toon
language: TypeScript
framework: vanilla Canvas 2D
runtime: bun
hosting: Netlify
package_manager: bun
```

## Quick Start

```bash
bun install
bun run dev        # dev server on localhost:3000 (hot reload)
bun run build      # production build to dist/
bun run lint       # oxlint on src/
bun run fmt        # oxfmt auto-format
```

## Project Structure

```toon
dirs[6]{path,purpose}:
  src/,game source code
  src/boat/,boat sprite (boat.png) + legacy standalone boat module
  src/states/,game state implementations (menu / racing)
  src/systems/,ECS-style systems (physics / collision / camera / rendering)
  src/map/,polygon map data model + geometry + renderer
  src/editor/,in-game map editor (outline draw + attributes + bridges)
```

## Key Entry Points

- **App bootstrap**: `src/main.ts`
- **Game loop**: `src/game-loop.ts` (fixed 60Hz timestep + interpolated render)
- **State machine**: `src/state-manager.ts`
- **Build**: `build.ts` (Bun bundler, copies boat.png to dist)
- **Dev server**: `serve.ts`
