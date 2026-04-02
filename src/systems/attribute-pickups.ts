import type { AttributeType, Entity, MapData, PowerupDefinition, Vec2 } from "../types";
import { createPickupEntity } from "../entity";
import { isOnWater } from "../map/map-data";

const RESPAWN_COOLDOWN = 10.0; // seconds before attribute pickup reappears

const ATTRIBUTE_POWERUP_MAP: Partial<Record<AttributeType, string>> = {
  "herring-kiosk": "herring-boost",
  "albert-heijn":  "herring-boost",
  "bike-shop":     "bicycle-drop",
  "effendi":       "main-character-syndrome",
};

export interface AttributePickupState {
  attributeId: number;
  powerupId: string;
  spawnPos: Vec2;    // nearest water position to the attribute
  cooldown: number;  // seconds remaining; 0 = ready to spawn
  entityId: number | null;
}

export interface AttributePickupSystem {
  states: AttributePickupState[];
}

/** Find the nearest water position within 200px of `pos`, sampling a radial grid. */
function findNearbyWaterPos(pos: Vec2, map: MapData): Vec2 {
  if (isOnWater(pos, map)) return { ...pos };
  for (let r = 30; r <= 220; r += 25) {
    const steps = Math.max(8, Math.round((Math.PI * 2 * r) / 40));
    for (let i = 0; i < steps; i++) {
      const a = (Math.PI * 2 * i) / steps;
      const candidate: Vec2 = { x: pos.x + Math.cos(a) * r, y: pos.y + Math.sin(a) * r };
      if (isOnWater(candidate, map)) return candidate;
    }
  }
  return { ...pos }; // fallback — keep original even if on land
}

export function createAttributePickupSystem(map: MapData): AttributePickupSystem {
  const states: AttributePickupState[] = [];
  for (const attr of map.attributes) {
    const powerupId = ATTRIBUTE_POWERUP_MAP[attr.type];
    if (!powerupId) continue;
    states.push({
      attributeId: attr.id,
      powerupId,
      spawnPos: findNearbyWaterPos(attr.position, map),
      cooldown: 0,
      entityId: null,
    });
  }
  return { states };
}

/**
 * Tick the attribute pickup system:
 * - Detect when an active orb has been picked up (markedForRemoval) → start cooldown
 * - Count down cooldown
 * - When ready, spawn a new orb tagged "attr-pickup"
 * Returns newly created pickup entities to be added to the entity manager.
 */
export function updateAttributePickups(
  system: AttributePickupSystem,
  entities: Entity[],
  map: MapData,
  definitions: Map<string, PowerupDefinition>,
  dt: number,
): Entity[] {
  const newEntities: Entity[] = [];

  for (const state of system.states) {
    if (state.entityId !== null) {
      // Check if orb was consumed
      const orb = entities.find((e) => e.id === state.entityId);
      if (!orb || orb.markedForRemoval) {
        state.entityId = null;
        state.cooldown = RESPAWN_COOLDOWN;
      }
      // else still active — nothing to do
    } else if (state.cooldown > 0) {
      state.cooldown = Math.max(0, state.cooldown - dt);
    } else {
      // Spawn a new orb
      const def = definitions.get(state.powerupId);
      if (!def) continue;
      const orb = createPickupEntity(state.spawnPos.x, state.spawnPos.y, def);
      orb.tags.add("attr-pickup"); // marks it for inventory routing (not direct apply)
      state.entityId = orb.id;
      newEntities.push(orb);
    }
  }

  return newEntities;
}
