import type { Entity, PickupEvent } from "../types";

export function detectPowerupPickups(
  boats: Entity[],
  pickups: Entity[],
): PickupEvent[] {
  const events: PickupEvent[] = [];

  for (const boat of boats) {
    if (boat.markedForRemoval || !boat.collider) continue;

    for (const pickup of pickups) {
      if (pickup.markedForRemoval || !pickup.powerupPickup || !pickup.collider)
        continue;

      const dx = boat.transform.pos.x - pickup.transform.pos.x;
      const dy = boat.transform.pos.y - pickup.transform.pos.y;
      const distSq = dx * dx + dy * dy;
      const radii = boat.collider.radius + pickup.collider.radius;

      if (distSq < radii * radii) {
        events.push({
          boatEntityId: boat.id,
          pickupEntityId: pickup.id,
          powerupId: pickup.powerupPickup.powerupId,
        });
      }
    }
  }

  return events;
}
