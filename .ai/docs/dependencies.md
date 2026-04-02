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
modules[17]{module,depends_on}:
  main,input + game-loop + state-manager + menu-state
  racing-state,entity + entity-manager + track + physics + collision + camera + boat-render + background-render + particles + debug + powerup-spawn + powerup-collision + powerup-effects + powerup-render + entity-lifetime + zone-effects + game-log + powerup-debug + registry
  physics,types (Entity + InputState)
  collision,types (Entity + TrackBounds + CollisionResult)
  camera,types (CameraState + Entity)
  boat-render,types (Entity) + boat.png sprite
  background-render,types (TrackBounds)
  particles,types (Entity + Particle + CollisionResult)
  debug,types (BoatPhysicsComponent + CameraState)
  entity-manager,types (Entity)
  powerup-spawn,types + entity (createPickupEntity)
  powerup-collision,types (Entity + PickupEvent)
  powerup-effects,types (Entity + PickupEvent + PowerupDefinition)
  powerup-render,types (Entity + PowerupDefinition)
  zone-effects,types (Entity + PowerupDefinition)
  entity-lifetime,types (Entity)
  registry,types (PowerupDefinition) + definitions/tailwind-boost + definitions/anchor-drag
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
