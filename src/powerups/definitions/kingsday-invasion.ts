import type { Entity, PowerupDefinition } from "../../types";
import { createObstacleEntity } from "../../entity";
import { isOnWater } from "../../map/map-data";
import { drawCrownIcon } from "../../systems/powerup-icons";

const TOURIST_COUNT = 20;
const TOURIST_LIFETIME = 15.0;
const SPAWN_SEARCH_SAMPLES = 400;

function spawnTouristBoats(boat: Entity, map: import("../../types").MapData): Entity[] {
  const results: Entity[] = [];
  const worldS = map.worldSize;
  let attempts = 0;

  while (results.length < TOURIST_COUNT && attempts < SPAWN_SEARCH_SAMPLES) {
    attempts++;
    const x = (Math.random() - 0.5) * worldS;
    const y = (Math.random() - 0.5) * worldS;
    if (!isOnWater({ x, y }, map)) continue;

    // Random drift: 1.5–4 units/sec in a random direction
    const speed = 1.5 + Math.random() * 2.5;
    const angle = Math.random() * Math.PI * 2;

    const obs = createObstacleEntity(x, y, angle, {
      width: 110,
      height: 46,
      lifetime: TOURIST_LIFETIME,
      color: "#e07820", // orange hull
      radius: 50,
    });
    obs.tags.add("tourist-boat");
    obs.velocity.x = Math.cos(angle) * speed;
    obs.velocity.y = Math.sin(angle) * speed;

    // Avoid spawning directly on top of the activating boat
    const dx = x - boat.transform.pos.x;
    const dy = y - boat.transform.pos.y;
    if (Math.sqrt(dx * dx + dy * dy) < 120) continue;

    results.push(obs);
  }

  return results;
}

export const kingsdayInvasion: PowerupDefinition = {
  id: "kingsday-invasion",
  name: "Kingsday Invasion",
  category: "flood",
  rarity: 0, // attr-only — never water-spawned, only from kingsday attribute

  spawn: {
    radius: 22,
    color: "#ff8800",
    icon: "👑",
  },

  effect: {
    type: "spawned",
    duration: 0,
    stacking: "ignore",
    maxStacks: 1,

    onApply(_target, _source, _state) {
      // Tourist boats are spawned via onSpawn
    },
    onExpire(_target, _state) {},

    onSpawn: spawnTouristBoats,
  },

  visual: {
    boatTint: "#ff8800",
    hudIcon: "👑",
    drawIcon: drawCrownIcon,
  },
};
