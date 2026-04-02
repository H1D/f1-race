# Powerups

Data-driven powerup framework. Definitions are registered in a central map. Systems handle the full lifecycle: spawn → pickup collision → apply effect → tick → expire → cleanup. Supports canal (always available) and flood (risk/reward) categories.

```toon
status: active
depends_on[3]: boat-physics,racing,track
entry_point: src/powerups/registry.ts

files[11]{path,purpose}:
  src/types.ts,"powerup component interfaces — PowerupPickupComponent, ActiveEffect, ActiveEffectsComponent, LifetimeComponent, ZoneComponent, ColliderComponent, MarkedForRemovalComponent, PowerupDefinition, PickupEvent, SpawnManagerState, FloodState, PowerupToast"
  src/entity.ts,"entity factories — createPickupEntity, createObstacleEntity, createZoneEntity"
  src/entity-manager.ts,entity list with tag/component queries + marked-for-removal cleanup
  src/powerups/registry.ts,PowerupDefinition map — register + load all definitions
  src/powerups/definitions/tailwind-boost.ts,first powerup — speed boost 4s duration with multiplier-based reversal
  src/systems/powerup-spawn.ts,timer-based weighted spawn on canal spawn points + flood filtering
  src/systems/powerup-collision.ts,circle-circle detection between boats and pickups → PickupEvent[]
  src/systems/powerup-effects.ts,"apply (with stacking rules) + tick (countdown + onTick) + expire (onExpire + cleanup)"
  src/systems/powerup-render.ts,"render pickups (bob animation), zones (translucent circles), obstacles, effect visuals (pulsing glow halo + tint ring), effects HUD, pickup name toasts (fade + drift)"
  src/systems/entity-lifetime.ts,generic countdown → mark for removal
  src/systems/entity-cleanup.ts,remove entities with markedForRemoval
```

## Design Notes

- **Three entity roles, one Entity type**: pickups, active effects, and spawned obstacles are all the same Entity struct — differentiated by which optional components are present
- **PowerupDefinition** is the data-driven core: id, spawn config, stacking rules, `onApply`/`onTick`/`onExpire` lifecycle hooks, visual config, optional `tunables` record
- **Tunables**: optional `Record<string, { value, min, max, step }>` on each definition — effect callbacks read from `tunables` at apply time, debug panel auto-generates sliders from the record
- **Multiplier-based reversal**: effects store multipliers (not snapshots) in `state` bag — divide on expire for order-independent cleanup
- **Stacking modes**: refresh (reset timer), stack (parallel up to max), replace (expire old + apply new), ignore (discard if active)
- **Spawn system**: timer-based with weighted random selection by rarity, filtered by flood state. Canal spawn points generated along track boundaries
- **Flood-ready**: `FloodState` and `SpawnPoint.zoneType` enable flood-only powerups when implemented. Category "flood" definitions only spawn during active floods
- **Orchestrator pattern**: `RacingState.update()` runs the full pipeline — spawn → detect → apply → tick → expire → zones → lifetimes → cleanup

## Gotchas

- Circular dependency between registry and definitions is avoided: definitions export data, registry imports and registers them (NOT side-effect registration)
- `processExpirations` uses `remainingTime !== -1 && remainingTime <= 0` — the `-1` sentinel means "condition-based, no countdown"
- Zone effects apply a short-lived effect (0.2s TTL) that refreshes each frame the boat is inside — when the boat leaves, the effect naturally expires
- `entity-cleanup.ts` delegates to `EntityManager.cleanup()` — just a thin wrapper for the system call convention

## Registered Powerups

| ID | Name | Category | Effect | Duration |
|----|------|----------|--------|----------|
| tailwind-boost | Tailwind Boost | canal | maxSpeed × speedMult, thrustForce × thrustMult (tunable) | 4s |
| anchor-drag | Anchor Drag | canal | maxSpeed × speedMult, thrustForce × thrustMult (tunable) | 5s |
