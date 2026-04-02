# Boat Race

Top-down 2D boat racing game set in the Amsterdam canals. Local multiplayer, canvas-based, with physics-driven boat handling (motor voltage ramp, anisotropic drag, speed-dependent steering). Planned features include weather/flood mechanics and powerups.

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
dirs[4]{path,purpose}:
  src/,game source code
  src/boat/,boat sprite + standalone boat module
  src/states/,game state implementations (menu / racing)
  src/systems/,ECS-style systems (physics / collision / camera / rendering)
```

## Key Entry Points

- **App bootstrap**: `src/main.ts`
- **Game loop**: `src/game-loop.ts` (fixed 60Hz timestep + interpolated render)
- **State machine**: `src/state-manager.ts`
- **Build**: `build.ts` (Bun bundler)
- **Dev server**: `serve.ts`
