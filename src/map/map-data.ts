import type { MapData, Vec2 } from "../types";
import { pointInPolygon } from "./geometry";

let currentMap: MapData | null = null;

export function createDefaultMap(): MapData {
  // Oval with a kink — straight on right, tight turn bottom-left, wide top
  const outline: Vec2[] = [
    { x: 1000, y: -550 },
    { x: 1000, y: 550 },
    { x: 600, y: 800 },
    { x: 0, y: 850 },
    { x: -450, y: 750 },
    { x: -800, y: 400 },
    { x: -650, y: 0 },
    { x: -900, y: -350 },
    { x: -600, y: -650 },
    { x: 0, y: -750 },
    { x: 500, y: -730 },
    { x: 800, y: -680 },
  ];

  const island: Vec2[] = [
    { x: 750, y: -450 },
    { x: 750, y: 430 },
    { x: 450, y: 580 },
    { x: 0, y: 600 },
    { x: -250, y: 530 },
    { x: -500, y: 260 },
    { x: -380, y: -20 },
    { x: -580, y: -220 },
    { x: -370, y: -440 },
    { x: 0, y: -520 },
    { x: 350, y: -510 },
    { x: 580, y: -480 },
  ];

  return {
    outline,
    island,
    attributes: [
      // Outer land (outside outline)
      { id: 1, type: "albert-heijn", position: { x: 1150, y: 0 } },
      { id: 2, type: "effendi", position: { x: -850, y: -450 } },
      // Island (inside island)
      { id: 3, type: "herring-kiosk", position: { x: 400, y: -300 } },
      { id: 4, type: "bike-shop", position: { x: -200, y: 100 } },
      // Outer land — south-east corner
      { id: 5, type: "kingsday", position: { x: 900, y: 600 } },
    ],
    bridges: [
      // Across the straight
      { id: 1, start: { x: 1080, y: 0 }, end: { x: 680, y: 0 }, width: 26 },
      // Across the top (outer y<-750, island y>-520 at x=0)
      { id: 2, start: { x: 0, y: -830 }, end: { x: 0, y: -450 }, width: 26 },
      // Across the bottom (outer y>850, island y<600 at x=0)
      { id: 3, start: { x: 0, y: 930 }, end: { x: 0, y: 530 }, width: 26 },
    ],
    worldSize: 1400,
    startPos: { x: 880, y: -100 },
    startAngle: -Math.PI / 2,
    checkpoints: [
      // CP1: top
      { a: { x: 0, y: -750 }, b: { x: 0, y: -520 } },
      // CP2: left kink
      { a: { x: -800, y: 400 }, b: { x: -500, y: 260 } },
      // CP3: bottom
      { a: { x: 0, y: 850 }, b: { x: 0, y: 600 } },
    ],
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
