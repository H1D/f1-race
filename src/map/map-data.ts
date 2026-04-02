import type { MapData, Vec2 } from "../types";
import { pointInPolygon } from "./geometry";

let currentMap: MapData | null = null;

export function createDefaultMap(): MapData {
  // River channel — 8 control points, arcTo makes it smooth
  const segments = 8;
  const outline: Vec2[] = [];
  const island: Vec2[] = [];

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    outline.push({
      x: Math.round(Math.cos(angle) * 900),
      y: Math.round(Math.sin(angle) * 650),
    });
    island.push({
      x: Math.round(Math.cos(angle) * 720),
      y: Math.round(Math.sin(angle) * 480),
    });
  }

  return {
    outline,
    island,
    attributes: [],
    bridges: [
      { id: 1, start: { x: 720, y: 0 },  end: { x: 900, y: 0 },    width: 20 },
      { id: 2, start: { x: 0,   y: 480 }, end: { x: 0,   y: 650 },  width: 20 },
      { id: 3, start: { x: -900, y: 0 },  end: { x: -720, y: 0 },   width: 20 },
      { id: 4, start: { x: 0,  y: -650 }, end: { x: 0,   y: -480 }, width: 20 },
    ],
    worldSize: 1200,
    startPos: { x: 750, y: 0 },
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
