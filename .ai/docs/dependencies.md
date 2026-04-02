# Dependencies

## Runtime

No npm runtime dependencies — pure vanilla TypeScript + Canvas 2D + Web Audio API (browser built-in).

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
modules[35]{module,depends_on}:
  main,input + game-loop + state-manager + menu-state
  racing-state,entity + entity-manager + map-data + physics + collision + camera + boat-render + map-renderer + particles + debug + powerup-spawn + powerup-collision + powerup-effects + attribute-pickups + powerup-render + entity-lifetime + zone-effects + game-log + powerup-debug + registry + ui-text + sound-system
  sound-system,types (SoundSystem + SoundDefinition) + synth + sound-definitions
  synth,types (SoundEnvelope + OscillatorConfig + NoiseConfig + FilterConfig)
  sound-def-engine,types (SoundDefinition)
  sound-def-collision,types (SoundDefinition)
  sound-def-pickup,types (SoundDefinition)
  sound-def-flood,types (SoundDefinition)
  sound-def-ambient,types (SoundDefinition)
  sound-def-penalty,types (SoundDefinition)
  editor-state,map-data + map-renderer + geometry + toolbar + racing-state
  physics,types (Entity + InputState)
  collision,types (Entity + MapData) + geometry (pointInPolygon + push + findNearestEdge)
  camera,types (CameraState + Entity)
  boat-render,types (Entity) + boat.png sprite
  map-renderer,types (MapData)
  map-data,types (MapData) + geometry (pointInPolygon)
  geometry,types (Vec2)
  particles,types (Entity + Particle + CollisionResult)
  debug,types (BoatPhysicsComponent + CameraState)
  entity,types (Entity) + createBridgeBarrierEntity
  entity-manager,types (Entity)
  powerup-spawn,types + entity (createPickupEntity)
  powerup-collision,types (Entity + PickupEvent)
  powerup-effects,types (Entity + PickupEvent + PowerupDefinition)
  powerup-render,types (Entity + PowerupDefinition + PowerupToast)
  ui-text,(none — pure data module)
  menu-state,types + racing-state + ui-text
  zone-effects,types (Entity + PowerupDefinition)
  entity-lifetime,types (Entity)
  attribute-pickups,types (AttributeType + Entity + MapData + PowerupDefinition + Vec2) + entity (createPickupEntity) + map-data (isOnWater)
  powerup-icons,types (none — canvas API only)
  registry,types (PowerupDefinition) + definitions/tailwind-boost + definitions/anchor-drag + definitions/oil-slick + definitions/canal-lock + definitions/draft-shield + definitions/bicycle-drop + definitions/main-character-syndrome
  bicycle-drop,types (PowerupDefinition) + entity (createObstacleEntity) + powerup-icons
  main-character-syndrome,types (PowerupDefinition) + powerup-icons
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
