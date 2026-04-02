import type {
  Entity,
  FloodState,
  PowerupDefinition,
  SpawnManagerState,
  SpawnPoint,
  TrackBounds,
} from "../types";
import { createPickupEntity } from "../entity";

export function createSpawnManagerState(track: TrackBounds): SpawnManagerState {
  return {
    timeSinceLastSpawn: 0,
    spawnInterval: 5.0,
    maxPickupsInWorld: 6,
    spawnPoints: generateCanalSpawnPoints(track),
  };
}

function generateCanalSpawnPoints(track: TrackBounds): SpawnPoint[] {
  const points: SpawnPoint[] = [];
  const { outer, inner } = track;

  // Top canal (between outer.minY and inner.minY)
  const topY = (outer.minY + inner.minY) / 2;
  for (let x = outer.minX + 100; x < outer.maxX; x += 150) {
    points.push({
      pos: { x, y: topY },
      zoneType: "canal",
      distanceFromCanal: 0,
      active: true,
    });
  }

  // Bottom canal
  const botY = (outer.maxY + inner.maxY) / 2;
  for (let x = outer.minX + 100; x < outer.maxX; x += 150) {
    points.push({
      pos: { x, y: botY },
      zoneType: "canal",
      distanceFromCanal: 0,
      active: true,
    });
  }

  // Left canal
  const leftX = (outer.minX + inner.minX) / 2;
  for (let y = inner.minY; y < inner.maxY; y += 150) {
    points.push({
      pos: { x: leftX, y },
      zoneType: "canal",
      distanceFromCanal: 0,
      active: true,
    });
  }

  // Right canal
  const rightX = (outer.maxX + inner.maxX) / 2;
  for (let y = inner.minY; y < inner.maxY; y += 150) {
    points.push({
      pos: { x: rightX, y },
      zoneType: "canal",
      distanceFromCanal: 0,
      active: true,
    });
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

  // Filter eligible definitions by flood state
  const eligible = Array.from(definitions.values()).filter(
    (def) => def.category === "canal" || (def.category === "flood" && floodState.active),
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
