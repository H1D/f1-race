import type { Entity } from "./types";

export interface EntityManager {
  entities: Entity[];
  add(entity: Entity): void;
  addMany(entities: Entity[]): void;
  getById(id: number): Entity | undefined;
  getByTag(tag: string): Entity[];
  getWithComponent<K extends keyof Entity>(component: K): Entity[];
  cleanup(): void;
}

export function createEntityManager(): EntityManager {
  const entities: Entity[] = [];

  return {
    entities,

    add(entity: Entity) {
      entities.push(entity);
    },

    addMany(newEntities: Entity[]) {
      for (const e of newEntities) {
        entities.push(e);
      }
    },

    getById(id: number) {
      return entities.find((e) => e.id === id);
    },

    getByTag(tag: string) {
      return entities.filter((e) => e.tags.has(tag));
    },

    getWithComponent<K extends keyof Entity>(component: K) {
      return entities.filter(
        (e) => e[component] !== undefined && !e.markedForRemoval,
      );
    },

    cleanup() {
      for (let i = entities.length - 1; i >= 0; i--) {
        if (entities[i]!.markedForRemoval) {
          entities.splice(i, 1);
        }
      }
    },
  };
}
