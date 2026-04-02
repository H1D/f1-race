import type { EntityManager } from "../entity-manager";

export function cleanupMarkedEntities(manager: EntityManager): void {
  manager.cleanup();
}
