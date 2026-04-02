/**
 * All end-user-facing strings in one place.
 * Static strings are plain values; dynamic ones are tiny arrow functions.
 * Powerup names live in their own definitions (src/powerups/definitions/*)
 * since they are part of the powerup data model, not UI chrome.
 */
export const UI = {
  menu: {
    title: "BOAT RACE",
    startPrompt: "Press W or UP to race",
    controls: "P1: WASD  ·  P2: Arrow keys",
  },

  hud: {
    p1Speed: (speed: string) => `P1 speed: ${speed}`,
    p2Speed: (speed: string) => `P2 speed: ${speed}`,
  },

  log: {
    raceStarted: "Race started",
    powerupSpawned: (icon: string, name: string) => `${icon} ${name} spawned`,
    pickedUp: (icon: string, name: string) => `Player picked up ${icon} ${name}`,
    effectExpired: (icon: string, name: string) => `${icon} ${name} expired`,
    floodingStarted: "Flooding started!",
    floodReceding: "Flood receding...",
  },
};
