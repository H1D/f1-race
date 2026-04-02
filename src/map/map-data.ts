import type { MapData, Vec2 } from "../types";
import { pointInPolygon } from "./geometry";

let currentMap: MapData | null = null;

export function createDefaultMap(): MapData {
  // Racing circuit: long straight, gentle curves, two wide sweeping bends
  const outline: Vec2[] = [
    // Right straight
    { x: 1000, y: -550 },
    { x: 1000, y: 550 },
    // Bottom curve
    { x: 650, y: 800 },
    { x: 200, y: 850 },
    // Left side — two wide gentle bends
    { x: -350, y: 650 },
    { x: -850, y: 350 },
    { x: -350, y: 50 },
    { x: -900, y: -300 },
    { x: -500, y: -550 },
    // Top curve
    { x: -100, y: -750 },
    { x: 400, y: -750 },
    { x: 750, y: -700 },
  ];

  const island: Vec2[] = [
    // Right straight
    { x: 750, y: -480 },
    { x: 750, y: 450 },
    // Bottom curve
    { x: 500, y: 580 },
    { x: 200, y: 600 },
    // Left side — matching gentle bends, wide channel
    { x: -100, y: 440 },
    { x: -400, y: 220 },
    { x: -120, y: -30 },
    { x: -440, y: -180 },
    { x: -240, y: -380 },
    // Top curve
    { x: -50, y: -530 },
    { x: 350, y: -530 },
    { x: 600, y: -500 },
  ];

  return {
    outline,
    island,
    attributes: [
      // Outer land (outside outline)
      { id: 1, type: "albert-heijn", position: { x: 1150, y: 0 } },
      { id: 2, type: "effendi", position: { x: -900, y: -400 } },
      { id: 3, type: "doctor-falafel", position: { x: 200, y: 1000 } },
      // Island (inside island)
      { id: 4, type: "herring-kiosk", position: { x: 400, y: -300 } },
      { id: 5, type: "bike-shop", position: { x: -200, y: 100 } },
      { id: 6, type: "cheese-shop", position: { x: 500, y: 300 } },
    ],
    bridges: [
      // Across the straight (outer land ↔ island)
      { id: 1, start: { x: 1080, y: 0 }, end: { x: 680, y: 0 }, width: 26 },
      // Across the top curve
      { id: 2, start: { x: 300, y: -800 }, end: { x: 250, y: -480 }, width: 26 },
      // Across the bottom curve
      { id: 3, start: { x: 400, y: 900 }, end: { x: 350, y: 560 }, width: 26 },
    ],
    worldSize: 1400,
    startPos: { x: 880, y: 0 },
    startAngle: Math.PI / 2,
    // Checkpoints: gates across the river that must be crossed in order
    checkpoints: [
      // CP1: top area
      { a: { x: 400, y: -750 }, b: { x: 350, y: -530 } },
      // CP2: left side
      { a: { x: -850, y: 350 }, b: { x: -400, y: 220 } },
      // CP3: bottom
      { a: { x: 200, y: 850 }, b: { x: 200, y: 600 } },
    ],
    // Finish line at the start area on the straight
    finishLine: {
      a: { x: 1000, y: -100 },
      b: { x: 750, y: -100 },
    },
  };
}

export function getCurrentMap(): MapData {
  if (!currentMap) currentMap = createDefaultMap();
  return currentMap;
}

export function setCurrentMap(map: MapData): void {
  currentMap = map;
}

// Water = inside outer outline AND outside island
export function isOnWater(point: Vec2, map: MapData): boolean {
  if (map.outline.length < 3) return false;
  const inOuter = pointInPolygon(point, map.outline);
  if (!inOuter) return false;
  if (map.island.length >= 3 && pointInPolygon(point, map.island)) return false;
  return true;
}

// Land = outside outer outline OR inside island
export function isOnLand(point: Vec2, map: MapData): boolean {
  return !isOnWater(point, map);
}

export function isOnBridge(point: Vec2, map: MapData): boolean {
  for (const bridge of map.bridges) {
    const dx = bridge.end.x - bridge.start.x;
    const dy = bridge.end.y - bridge.start.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;
    const t = Math.max(
      0,
      Math.min(1, ((point.x - bridge.start.x) * dx + (point.y - bridge.start.y) * dy) / lenSq),
    );
    const projX = bridge.start.x + t * dx;
    const projY = bridge.start.y + t * dy;
    const dist = Math.hypot(point.x - projX, point.y - projY);
    if (dist < (bridge.width || 20) / 2) return true;
  }
  return false;
}
