import type { MapData, Vec2 } from "../types";
import { pointInPolygon } from "./geometry";

let currentMap: MapData | null = null;

export function createDefaultMap(): MapData {
  // Irregular river channel — bumpy outer and island for tricky racing
  // Tricky river — S-bends, pinch points, wide sweeps, hairpin at the bottom
  const outline: Vec2[] = [
    { x: 950, y: -100 },
    { x: 900, y: -450 },
    { x: 600, y: -700 },
    { x: 150, y: -800 },
    { x: -250, y: -680 },
    { x: -550, y: -450 },
    { x: -850, y: -550 },
    { x: -1050, y: -250 },
    { x: -950, y: 100 },
    { x: -700, y: 300 },
    { x: -850, y: 550 },
    { x: -600, y: 750 },
    { x: -150, y: 700 },
    { x: 250, y: 550 },
    { x: 500, y: 650 },
    { x: 750, y: 450 },
    { x: 850, y: 200 },
  ];

  // Island: tighter, creates narrow chicanes and wide stretches
  const island: Vec2[] = [
    { x: 700, y: -80 },
    { x: 660, y: -330 },
    { x: 420, y: -520 },
    { x: 100, y: -580 },
    { x: -180, y: -490 },
    { x: -400, y: -320 },
    { x: -620, y: -380 },
    { x: -770, y: -150 },
    { x: -700, y: 80 },
    { x: -500, y: 200 },
    { x: -600, y: 400 },
    { x: -420, y: 550 },
    { x: -100, y: 500 },
    { x: 160, y: 380 },
    { x: 350, y: 460 },
    { x: 550, y: 320 },
    { x: 630, y: 130 },
  ];

  return {
    outline,
    island,
    attributes: [
      // On the outer land (outside the outline, away from water)
      { id: 1, type: "albert-heijn", position: { x: -50, y: -900 } },
      { id: 2, type: "effendi", position: { x: -1050, y: -100 } },
      { id: 3, type: "doctor-falafel", position: { x: 500, y: 750 } },
      // On the island (inside the island, away from water)
      { id: 4, type: "herring-kiosk", position: { x: 0, y: -200 } },
      { id: 5, type: "bike-shop", position: { x: -350, y: 50 } },
      { id: 6, type: "cheese-shop", position: { x: 200, y: 200 } },
    ],
    bridges: [
      // Bridge: outer land (far outside outline) ↔ island (deep inside island)
      // Top-right: outer land past outline → deep into island
      { id: 1, start: { x: 1000, y: -180 }, end: { x: 550, y: -100 }, width: 26 },
      // Left side: outer land past outline → deep into island
      { id: 2, start: { x: -1000, y: -400 }, end: { x: -450, y: -250 }, width: 26 },
      // Bottom: outer land past outline → deep into island
      { id: 3, start: { x: -400, y: 780 }, end: { x: -200, y: 350 }, width: 26 },
    ],
    worldSize: 1300,
    startPos: { x: 830, y: 100 },
    startAngle: -Math.PI / 2,
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
