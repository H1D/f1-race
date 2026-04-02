import type { Entity } from "../types";

export function tickLifetimes(entities: Entity[], dt: number): void {
  for (const entity of entities) {
    if (!entity.lifetime || entity.markedForRemoval) continue;

    entity.lifetime.remaining -= dt;

    if (entity.lifetime.remaining <= 0) {
      entity.markedForRemoval = { reason: "expired" };
    }
  }
}
