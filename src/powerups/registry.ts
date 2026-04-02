import type { PowerupDefinition } from "../types";
import { herringBoost } from "./definitions/tailwind-boost";
import { anchorDrag } from "./definitions/anchor-drag";
import { oilSlick, oilSlickZone } from "./definitions/oil-slick";
import { canalLock } from "./definitions/canal-lock";
import { draftShield } from "./definitions/draft-shield";

const POWERUP_REGISTRY: Map<string, PowerupDefinition> = new Map();

function register(def: PowerupDefinition): void {
  POWERUP_REGISTRY.set(def.id, def);
}

// Canal powerups (player-spawnable pickups)
register(herringBoost);
register(anchorDrag);
register(oilSlick);
register(canalLock);
register(draftShield);

// Zone effect definitions (not spawnable pickups — applied by zone entities)
register(oilSlickZone);

export function getPowerupDef(id: string): PowerupDefinition | undefined {
  return POWERUP_REGISTRY.get(id);
}

export function loadPowerupDefinitions(): Map<string, PowerupDefinition> {
  return POWERUP_REGISTRY;
}
