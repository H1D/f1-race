import type {
  Entity,
  FloodState,
  MapData,
  PowerupDefinition,
  SpawnManagerState,
  SpawnPoint,
  TrackBounds,
} from "../types";
import { createPickupEntity } from "../entity";
import { isOnWater } from "../map/map-data";

export function createSpawnManagerState(map: MapData): SpawnManagerState {
  return {
    timeSinceLastSpawn: 0,
    spawnInterval: 5.0,
    maxPickupsInWorld: 6,
    spawnPoints: generateCanalSpawnPoints(map),
  };
}

function generateCanalSpawnPoints(map: MapData): SpawnPoint[] {
  // Sample a grid over the world bounding box and keep only water-covered points.
  // This works correctly for any polygon shape — elliptical canals, irregular coastlines, etc.
  const xs = map.outline.map((p) => p.x);
  const ys = map.outline.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const step = 120;
  const points: SpawnPoint[] = [];

  for (let x = minX + step / 2; x < maxX; x += step) {
    for (let y = minY + step / 2; y < maxY; y += step) {
      if (!isOnWater({ x, y }, map)) continue;
      points.push({
        pos: { x, y },
        zoneType: "canal",
        distanceFromCanal: 0,
        active: true,
      });
    }
  }

  return points;
}

export function updatePowerupSpawning(
  entities: Entity[],
  _track: TrackBounds,
  floodState: FloodState,
  definitions: Map<string, PowerupDefinition>,
  dt: number,
  state: SpawnManagerState,
): Entity[] {
  state.timeSinceLastSpawn += dt;

  if (state.timeSinceLastSpawn < state.spawnInterval) return [];

  // Count existing pickups
  const pickupCount = entities.filter(
    (e) => e.powerupPickup && !e.markedForRemoval,
  ).length;
  if (pickupCount >= state.maxPickupsInWorld) return [];

  state.timeSinceLastSpawn = 0;

  // Filter eligible definitions: must be a spawnable pickup (rarity > 0) and match flood state
  const eligible = Array.from(definitions.values()).filter(
    (def) =>
      def.rarity > 0 &&
      (def.category === "canal" || (def.category === "flood" && floodState.active)),
  );
  if (eligible.length === 0) return [];

  // Weighted random selection by rarity
  const def = selectWeighted(eligible);
  if (!def) return [];

  // Pick a random active spawn point matching the definition's category
  const activePoints = state.spawnPoints.filter((p) => {
    if (!p.active) return false;
    if (def.category === "canal") return p.zoneType === "canal";
    return true; // flood powerups can spawn anywhere active
  });
  if (activePoints.length === 0) return [];

  const point = activePoints[Math.floor(Math.random() * activePoints.length)]!;

  // Don't spawn too close to existing pickups
  const tooClose = entities.some((e) => {
    if (!e.powerupPickup || e.markedForRemoval) return false;
    const dx = e.transform.pos.x - point.pos.x;
    const dy = e.transform.pos.y - point.pos.y;
    return dx * dx + dy * dy < 80 * 80;
  });
  if (tooClose) return [];

  return [createPickupEntity(point.pos.x, point.pos.y, def)];
}

function selectWeighted(
  definitions: PowerupDefinition[],
): PowerupDefinition | undefined {
  const totalWeight = definitions.reduce((sum, d) => sum + d.rarity, 0);
  if (totalWeight <= 0) return undefined;

  let roll = Math.random() * totalWeight;
  for (const def of definitions) {
    roll -= def.rarity;
    if (roll <= 0) return def;
  }
  return definitions[definitions.length - 1];
}
