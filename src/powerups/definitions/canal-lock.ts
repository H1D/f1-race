import type { PowerupDefinition } from "../../types";
import { drawCanalLockIcon } from "../../systems/powerup-icons";
import { createBridgeBarrierEntity } from "../../entity";

export const canalLock: PowerupDefinition = {
  id: "canal-lock",
  name: "Canal Lock",
  category: "canal",
  rarity: 0.4,

  spawn: {
    radius: 18,
    color: "#cc2255",
    icon: "🌉",
  },

  effect: {
    type: "instant",
    duration: 0,
    stacking: "stack",
    maxStacks: 3,

    onApply() {},
    onExpire() {},

    onSpawn(boat, map) {
      if (map.bridges.length === 0) return [];

      const bx = boat.transform.pos.x;
      const by = boat.transform.pos.y;
      // Forward direction of the boat
      const fx = Math.cos(boat.transform.angle);
      const fy = Math.sin(boat.transform.angle);

      // Prefer the nearest bridge that is ahead of the boat's heading.
      // Score = forward dot product (positive = ahead); ties broken by distance.
      let nearest = map.bridges[0]!;
      let bestScore = -Infinity;
      for (const bridge of map.bridges) {
        const mx = (bridge.start.x + bridge.end.x) / 2;
        const my = (bridge.start.y + bridge.end.y) / 2;
        const dx = mx - bx;
        const dy = my - by;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const forward = (dx * fx + dy * fy) / dist; // −1..1, positive = ahead
        // Penalise bridges behind; among those ahead, prefer closer ones
        const score = forward - dist / 10000;
        if (score > bestScore) {
          bestScore = score;
          nearest = bridge;
        }
      }

      const midX = (nearest.start.x + nearest.end.x) / 2;
      const midY = (nearest.start.y + nearest.end.y) / 2;
      const dx = nearest.end.x - nearest.start.x;
      const dy = nearest.end.y - nearest.start.y;
      const angle = Math.atan2(dy, dx);
      const span = Math.sqrt(dx * dx + dy * dy);

      return [createBridgeBarrierEntity(midX, midY, angle, span)];
    },
  },

  visual: {
    hudIcon: "🌉",
    drawIcon: drawCanalLockIcon,
  },
};
