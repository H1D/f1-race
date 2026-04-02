import type { PowerupDefinition } from "../types";
import { tailwindBoost } from "./definitions/tailwind-boost";
import { anchorDrag } from "./definitions/anchor-drag";

const POWERUP_REGISTRY: Map<string, PowerupDefinition> = new Map();

function register(def: PowerupDefinition): void {
  POWERUP_REGISTRY.set(def.id, def);
}

// Register all definitions
register(tailwindBoost);
register(anchorDrag);

export function getPowerupDef(id: string): PowerupDefinition | undefined {
  return POWERUP_REGISTRY.get(id);
}

export function loadPowerupDefinitions(): Map<string, PowerupDefinition> {
  return POWERUP_REGISTRY;
}
