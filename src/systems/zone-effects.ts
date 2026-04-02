import type { Entity, PowerupDefinition } from "../types";

export function processZoneEffects(
  zones: Entity[],
  boats: Entity[],
  definitions: Map<string, PowerupDefinition>,
  _dt: number,
): void {
  for (const zone of zones) {
    if (!zone.zone || zone.markedForRemoval) continue;

    for (const boat of boats) {
      if (boat.markedForRemoval) continue;

      // Skip owner if zone doesn't affect them
      if (!zone.zone.affectsOwner && boat.id === zone.zone.ownerId) continue;

      // Circle-circle distance check
      const dx = boat.transform.pos.x - zone.transform.pos.x;
      const dy = boat.transform.pos.y - zone.transform.pos.y;
      const distSq = dx * dx + dy * dy;
      const radius = zone.zone.radius;

      if (distSq < radius * radius) {
        const def = definitions.get(zone.zone.effectId);
        if (def?.effect.onTick) {
          // Zone effects apply via onTick each frame the boat is inside
          if (!boat.activeEffects) {
            boat.activeEffects = { effects: [] };
          }

          // Check if the boat already has this zone effect
          const existing = boat.activeEffects.effects.find(
            (e) => e.powerupId === zone.zone!.effectId,
          );

          if (!existing) {
            // Apply zone effect as a short-lived effect that refreshes while inside
            const state: Record<string, number> = {};
            def.effect.onApply(boat, boat, state);
            boat.activeEffects.effects.push({
              powerupId: zone.zone.effectId,
              remainingTime: 0.2, // short TTL — refreshed each frame inside zone
              sourceEntityId: zone.zone.ownerId,
              state,
            });
          } else {
            // Refresh TTL while inside zone
            existing.remainingTime = 0.2;
          }
        }
      }
    }
  }
}
