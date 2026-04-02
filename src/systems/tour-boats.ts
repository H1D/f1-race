import type { MapData, Vec2 } from "../types";

const tourBoatImage = new Image();
tourBoatImage.src = new URL("../assets/tour-boat.png", import.meta.url).href;

export interface TourBoat {
  x: number;
  y: number;
  angle: number;
  pathProgress: number; // 0..1 around the centerline
  speed: number;        // units per second
}

/** Generate the river centerline from outline + island midpoints */
function buildCenterline(map: MapData): Vec2[] {
  const n = Math.min(map.outline.length, map.island.length);
  const pts: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    pts.push({
      x: (map.outline[i].x + map.island[i].x) / 2,
      y: (map.outline[i].y + map.island[i].y) / 2,
    });
  }
  return pts;
}

/** Get position and angle on the centerline at progress t (0..1) */
function sampleCenterline(centerline: Vec2[], t: number): { x: number; y: number; angle: number } {
  const n = centerline.length;
  const total = t * n;
  const i = Math.floor(total) % n;
  const frac = total - Math.floor(total);
  const a = centerline[i];
  const b = centerline[(i + 1) % n];

  const x = a.x + (b.x - a.x) * frac;
  const y = a.y + (b.y - a.y) * frac;
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return { x, y, angle };
}

/** Compute total centerline perimeter */
function centerlineLength(centerline: Vec2[]): number {
  let len = 0;
  for (let i = 0; i < centerline.length; i++) {
    const a = centerline[i];
    const b = centerline[(i + 1) % centerline.length];
    len += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return len;
}

export function createTourBoats(map: MapData, count: number): { boats: TourBoat[]; centerline: Vec2[] } {
  const centerline = buildCenterline(map);
  const boats: TourBoat[] = [];

  for (let i = 0; i < count; i++) {
    const progress = i / count; // evenly spaced
    const pos = sampleCenterline(centerline, progress);
    boats.push({
      x: pos.x,
      y: pos.y,
      angle: pos.angle,
      pathProgress: progress,
      speed: 3.5 + Math.random() * 1.0, // moderate ~3.5-4.5 units/sec
    });
  }

  return { boats, centerline };
}

export function updateTourBoats(boats: TourBoat[], centerline: Vec2[], dt: number): void {
  const perimeter = centerlineLength(centerline);

  for (const boat of boats) {
    // Advance along the path
    boat.pathProgress += (boat.speed * dt) / perimeter;
    if (boat.pathProgress >= 1) boat.pathProgress -= 1;

    const pos = sampleCenterline(centerline, boat.pathProgress);
    // Smooth position and angle
    boat.x += (pos.x - boat.x) * 0.1;
    boat.y += (pos.y - boat.y) * 0.1;

    // Smooth angle (shortest path)
    let angleDiff = pos.angle - boat.angle;
    angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    boat.angle += angleDiff * 0.1;
  }
}

const TOUR_BOAT_W = 80;
const TOUR_BOAT_H = 36;

export function renderTourBoats(ctx: CanvasRenderingContext2D, boats: TourBoat[]): void {
  for (const boat of boats) {
    ctx.save();
    ctx.translate(boat.x, boat.y);
    ctx.rotate(boat.angle);

    if (tourBoatImage.complete && tourBoatImage.naturalWidth > 0) {
      const aspect = tourBoatImage.naturalWidth / tourBoatImage.naturalHeight;
      const w = TOUR_BOAT_W;
      const h = w / aspect;
      ctx.drawImage(tourBoatImage, -w / 2, -h / 2, w, h);
    } else {
      // Fallback: brown rectangle
      ctx.fillStyle = "#8b6b3d";
      ctx.fillRect(-TOUR_BOAT_W / 2, -TOUR_BOAT_H / 2, TOUR_BOAT_W, TOUR_BOAT_H);
      ctx.strokeStyle = "#5a3f20";
      ctx.lineWidth = 2;
      ctx.strokeRect(-TOUR_BOAT_W / 2, -TOUR_BOAT_H / 2, TOUR_BOAT_W, TOUR_BOAT_H);
    }

    ctx.restore();
  }
}

/** Check collision between a player entity and tour boats */
export const TOUR_BOAT_RADIUS = 30;

export function collideTourBoats(
  boats: TourBoat[],
  playerX: number,
  playerY: number,
  playerVelX: number,
  playerVelY: number,
  playerRadius: number,
): { hit: boolean; velX: number; velY: number; contactX: number; contactY: number; normalX: number; normalY: number; impactSpeed: number } {
  let velX = playerVelX;
  let velY = playerVelY;
  let hit = false;
  let contactX = 0;
  let contactY = 0;
  let normalX = 0;
  let normalY = 0;
  let impactSpeed = 0;

  for (const boat of boats) {
    const dx = playerX - boat.x;
    const dy = playerY - boat.y;
    const dist = Math.hypot(dx, dy);
    const minDist = playerRadius + TOUR_BOAT_RADIUS;

    if (dist < minDist && dist > 0) {
      hit = true;
      const nx = dx / dist;
      const ny = dy / dist;
      contactX = (playerX + boat.x) / 2;
      contactY = (playerY + boat.y) / 2;
      normalX = nx;
      normalY = ny;
      impactSpeed = Math.hypot(playerVelX, playerVelY);

      const vDotN = velX * nx + velY * ny;
      if (vDotN < 0) {
        velX -= vDotN * 1.5 * nx;
        velY -= vDotN * 1.5 * ny;
      }
    }
  }

  return { hit, velX, velY, contactX, contactY, normalX, normalY, impactSpeed };
}
