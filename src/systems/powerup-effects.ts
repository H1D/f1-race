import type { Entity, MapData, PickupEvent, PowerupDefinition } from "../types";

export function applyPickupEvents(
  events: PickupEvent[],
  entities: Entity[],
  definitions: Map<string, PowerupDefinition>,
  map: MapData,
): Entity[] {
  const spawnedEntities: Entity[] = [];

  for (const event of events) {
    const boat = entities.find((e) => e.id === event.boatEntityId);
    const pickup = entities.find((e) => e.id === event.pickupEntityId);
    const def = definitions.get(event.powerupId);

    if (!boat || !pickup || !def) continue;

    // Mark pickup for removal
    pickup.markedForRemoval = { reason: "picked-up" };

    // canApply hook — lets a powerup intercept and absorb an incoming effect
    if (def.effect.canApply && !def.effect.canApply(boat)) {
      continue;
    }

    // Ensure boat has activeEffects
    if (!boat.activeEffects) {
      boat.activeEffects = { effects: [] };
    }

    const existing = boat.activeEffects.effects.find(
      (e) => e.powerupId === def.id,
    );

    // Handle stacking rules
    if (existing) {
      switch (def.effect.stacking) {
        case "refresh":
          existing.remainingTime = def.effect.duration;
          continue; // don't re-apply
        case "ignore":
          continue; // discard
        case "replace":
          // Expire the old effect first
          def.effect.onExpire(boat, existing.state);
          boat.activeEffects.effects = boat.activeEffects.effects.filter(
            (e) => e !== existing,
          );
          break; // fall through to apply new
        case "stack":
          if (
            boat.activeEffects.effects.filter((e) => e.powerupId === def.id)
              .length >= def.effect.maxStacks
          ) {
            continue; // at max stacks
          }
          break; // fall through to apply new
      }
    }

    // Apply the effect
    const state: Record<string, number> = {};
    def.effect.onApply(boat, boat, state);

    boat.activeEffects.effects.push({
      powerupId: def.id,
      remainingTime: def.effect.duration,
      sourceEntityId: boat.id,
      state,
    });

    // Spawn entities if the powerup produces them
    if (def.effect.onSpawn) {
      const spawned = def.effect.onSpawn(boat, map);
      spawnedEntities.push(...spawned);
    }
  }

  return spawnedEntities;
}

export function tickActiveEffects(
  entities: Entity[],
  definitions: Map<string, PowerupDefinition>,
  dt: number,
): void {
  for (const entity of entities) {
    if (!entity.activeEffects || entity.markedForRemoval) continue;

    for (const effect of entity.activeEffects.effects) {
      if (effect.remainingTime < 0) continue; // condition-based, no countdown

      effect.remainingTime -= dt;

      const def = definitions.get(effect.powerupId);
      if (def?.effect.onTick) {
        def.effect.onTick(entity, effect.state, dt);
      }
    }
  }
}

export function processExpirations(
  entities: Entity[],
  definitions: Map<string, PowerupDefinition>,
): void {
  for (const entity of entities) {
    if (!entity.activeEffects || entity.markedForRemoval) continue;

    // Find effects that have counted down to zero or below (but not -1 which is condition-based)
    const expired = entity.activeEffects.effects.filter(
      (e) => e.remainingTime !== -1 && e.remainingTime <= 0,
    );

    for (const effect of expired) {
      const def = definitions.get(effect.powerupId);
      if (def) {
        def.effect.onExpire(entity, effect.state);
      }
    }

    // Keep condition-based (-1) and still-active (> 0) effects
    entity.activeEffects.effects = entity.activeEffects.effects.filter(
      (e) => e.remainingTime === -1 || e.remainingTime > 0,
    );
  }
}
