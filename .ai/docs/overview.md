# Boat Race

Top-down 2D two-player boat racing game set on Amsterdam canals. Vanilla TypeScript + Canvas 2D, bundled with Bun, deployed on Netlify. Two boats on shared screen (P1 WASD, P2 Arrows) with physics-driven handling on user-editable polygon river tracks, world-space anisotropic drag, motor voltage ramp, speed-dependent steering, dual-mode camera (follow/fixed with dynamic zoom), pooled particle effects (wake spray + bow wave + collision sparks), a data-driven powerup system with lifecycle hooks, event logging, an in-game map editor with freehand drawing and bridges, and collapsible live debug panels.

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
dirs[9]{path,purpose}:
  src/,game source code
  src/boat/,boat sprite (boat.png) + legacy standalone boat module
  src/states/,game state implementations (menu / racing)
  src/systems/,ECS-style systems (physics / collision / camera / rendering / powerups)
  src/map/,polygon map data model + geometry + renderer
  src/editor/,in-game map editor (outline draw + attributes + bridges)
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
