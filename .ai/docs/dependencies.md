# Dependencies

## Runtime

No runtime dependencies — pure vanilla TypeScript + Canvas 2D.

## Dev

```toon
dev[4]{name,version,purpose}:
  @types/bun,latest,Bun runtime type definitions
  oxlint,^1.58.0,fast linter (Rust-based)
  oxfmt,^0.43.0,fast formatter (Rust-based)
  typescript,^5,type checking
```

## Internal Module Dependencies

```toon
modules[11]{module,depends_on}:
  main,input + game-loop + state-manager + menu-state
  racing-state,entity + map-data + physics + collision + camera + boat-render + map-renderer + debug + editor-state
  editor-state,map-data + map-renderer + geometry + toolbar + racing-state
  physics,types (Entity + InputState)
  collision,types (Entity + MapData) + geometry (pointInPolygon + push + findNearestEdge)
  camera,types (CameraState + Entity)
  boat-render,types (Entity) + boat.png sprite
  map-renderer,types (MapData)
  map-data,types (MapData) + geometry (pointInPolygon)
  geometry,types (Vec2)
  debug,types (BoatPhysicsComponent)
```

## Assets

```toon
assets[1]{path,type,used_by}:
  src/boat/boat.png,sprite,boat-render (copied to dist/ by build.ts + serve.ts)
```

## External Services

```toon
services[1]{name,type,used_by}:
  Netlify,hosting,build + deploy
```
