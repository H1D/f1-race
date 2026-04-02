# Boat Race

Top-down 2D two-player boat racing game set in the Amsterdam canals. Vanilla TypeScript + Canvas 2D, bundled with Bun, deployed on Netlify. Two boats on shared screen (WASD + Arrows) with world-space anisotropic drag physics, motor voltage ramp, speed-dependent steering, dual-mode camera (follow/fixed with dynamic zoom), a data-driven powerup system with lifecycle hooks, event logging, and a collapsible live debug panel with per-boat physics tuning.

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
dirs[7]{path,purpose}:
  src/,game source code
  src/boat/,boat sprite (boat.png) + legacy standalone boat module
  src/states/,game state implementations (menu / racing)
  src/systems/,ECS-style systems (physics / collision / camera / rendering / powerups)
  src/powerups/,powerup registry + definitions
  src/powerups/definitions/,individual powerup type definitions
  public/,static HTML
```

## Key Entry Points

- **App bootstrap**: `src/main.ts`
- **Game loop**: `src/game-loop.ts` (fixed 60Hz timestep + interpolated render)
- **State machine**: `src/state-manager.ts`
- **Build**: `build.ts` (Bun bundler, copies boat.png to dist)
- **Dev server**: `serve.ts`
