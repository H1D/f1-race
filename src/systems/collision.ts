import type { CollisionResult, Entity, MapData, TrackBounds } from "../types";
import { pointInPolygon, findNearestEdge } from "../map/geometry";

const PUSH_DIST = 6;
const WALL_FRICTION = 0.5; // tangential velocity kept on wall slide
const BOUNCE = 0.35; // bounce off the wall

/** Legacy AABB collision for TrackBounds */
export function resolveCollisions(entity: Entity, track: TrackBounds): void {
  const pos = entity.transform.pos;
  const vel = entity.velocity;

  let collided = false;

  if (pos.x < track.outer.minX) {
    pos.x = track.outer.minX;
    collided = true;
  } else if (pos.x > track.outer.maxX) {
    pos.x = track.outer.maxX;
    collided = true;
  }

  if (pos.y < track.outer.minY) {
    pos.y = track.outer.minY;
    collided = true;
  } else if (pos.y > track.outer.maxY) {
    pos.y = track.outer.maxY;
    collided = true;
  }

  const inner = track.inner;
  if (pos.x > inner.minX && pos.x < inner.maxX && pos.y > inner.minY && pos.y < inner.maxY) {
    const dLeft = pos.x - inner.minX;
    const dRight = inner.maxX - pos.x;
    const dTop = pos.y - inner.minY;
    const dBottom = inner.maxY - pos.y;
    const minDist = Math.min(dLeft, dRight, dTop, dBottom);

    if (minDist === dLeft) pos.x = inner.minX;
    else if (minDist === dRight) pos.x = inner.maxX;
    else if (minDist === dTop) pos.y = inner.minY;
    else pos.y = inner.maxY;

    collided = true;
  }

  if (collided) {
    vel.x *= 0.3;
    vel.y *= 0.3;
    vel.angular *= 0.5;
  }
}

/**
 * Cancel the velocity component pushing into the wall, keep the sliding component.
 * nx,ny = outward normal of the wall the boat hit.
 */
function wallResponse(vel: { x: number; y: number; angular: number }, nx: number, ny: number) {
  // Velocity dot normal = how fast we're moving INTO the wall (negative = toward wall)
  const vDotN = vel.x * nx + vel.y * ny;
  if (vDotN >= 0) return;

  const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
  // headOn: 0 = glancing (parallel to wall), 1 = head-on (perpendicular)
  const headOn = speed > 0.01 ? Math.abs(vDotN) / speed : 0;

  // Glancing hit: strong bounce to deflect course, keep tangential speed
  // Head-on hit: weak bounce, just push back gently
  const bounce = BOUNCE * (1 - headOn * 0.7);
  const friction = WALL_FRICTION + (1 - WALL_FRICTION) * headOn * 0.6;

  // Remove the into-wall component + bounce
  vel.x -= vDotN * (1 + bounce) * nx;
  vel.y -= vDotN * (1 + bounce) * ny;

  // Apply friction to the remaining tangential velocity
  const tDotN = vel.x * nx + vel.y * ny;
  const tx = vel.x - tDotN * nx;
  const ty = vel.y - tDotN * ny;
  vel.x = tDotN * nx + tx * friction;
  vel.y = tDotN * ny + ty * friction;

  vel.angular *= 0.5;
}

const BOAT_RADIUS = 20; // collision radius (~half of 64×32 boat)
const BOAT_BOUNCE = 0.6; // how much velocity is reflected on boat-boat hit
const BOAT_SPIN = 0.08; // angular impulse from off-center hits

/** Resolve collision between two boats, applying forces to both */
export function resolveBoatCollision(a: Entity, b: Entity): boolean {
  const dx = b.transform.pos.x - a.transform.pos.x;
  const dy = b.transform.pos.y - a.transform.pos.y;
  const distSq = dx * dx + dy * dy;
  const minDist = BOAT_RADIUS * 2;

  if (distSq >= minDist * minDist || distSq === 0) return false;

  const dist = Math.sqrt(distSq);
  // Collision normal from a → b
  const nx = dx / dist;
  const ny = dy / dist;

  // Separate boats so they don't overlap
  const overlap = minDist - dist;
  const half = overlap / 2 + 1;
  a.transform.pos.x -= nx * half;
  a.transform.pos.y -= ny * half;
  b.transform.pos.x += nx * half;
  b.transform.pos.y += ny * half;

  // Relative velocity of a w.r.t. b along collision normal
  const dvx = a.velocity.x - b.velocity.x;
  const dvy = a.velocity.y - b.velocity.y;
  const relNormal = dvx * nx + dvy * ny;

  // Only resolve if boats are moving toward each other
  if (relNormal <= 0) return false;

  // Equal mass impulse
  const impulse = relNormal * (1 + BOAT_BOUNCE) * 0.5;
  a.velocity.x -= impulse * nx;
  a.velocity.y -= impulse * ny;
  b.velocity.x += impulse * nx;
  b.velocity.y += impulse * ny;

  // Angular impulse — cross product of contact offset with collision normal
  // gives a spin proportional to how off-center the hit is
  const cosA = Math.cos(a.transform.angle);
  const sinA = Math.sin(a.transform.angle);
  const crossA = (-nx * sinA + ny * cosA); // perpendicular component
  a.velocity.angular += crossA * relNormal * BOAT_SPIN;

  const cosB = Math.cos(b.transform.angle);
  const sinB = Math.sin(b.transform.angle);
  const crossB = (nx * sinB - ny * cosB);
  b.velocity.angular += crossB * relNormal * BOAT_SPIN;

  return true;
}

/** Polygon-based collision for MapData. Optional `result` out-param reports wall hits for sound. */
export function resolveMapCollisions(
  entity: Entity, map: MapData, flooding = false, result?: CollisionResult,
): void {
  if (result) result.collided = false;

  const pos = entity.transform.pos;
  const vel = entity.velocity;

  // World boundary (always enforced)
  const ws = map.worldSize;
  if (pos.x < -ws) { pos.x = -ws; vel.x = Math.max(0, vel.x); }
  if (pos.x > ws) { pos.x = ws; vel.x = Math.min(0, vel.x); }
  if (pos.y < -ws) { pos.y = -ws; vel.y = Math.max(0, vel.y); }
  if (pos.y > ws) { pos.y = ws; vel.y = Math.min(0, vel.y); }

  // During flooding: skip land collision — entire map is water
  if (flooding) return;

  // Outer bank — boat must stay INSIDE the outline (accounting for radius)
  if (map.outline.length >= 3) {
    if (!pointInPolygon(pos, map.outline)) {
      const edge = findNearestEdge(pos, map.outline);
      const impactSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      pos.x = edge.point.x - edge.nx * (PUSH_DIST + BOAT_RADIUS);
      pos.y = edge.point.y - edge.ny * (PUSH_DIST + BOAT_RADIUS);
      wallResponse(vel, -edge.nx, -edge.ny);
      if (result) {
        result.collided = true;
        result.contactX = edge.point.x;
        result.contactY = edge.point.y;
        result.normalX = -edge.nx;
        result.normalY = -edge.ny;
        result.impactSpeed = impactSpeed;
      }
    } else {
      const edge = findNearestEdge(pos, map.outline);
      if (edge.distSq < BOAT_RADIUS * BOAT_RADIUS) {
        const dist = Math.sqrt(edge.distSq);
        const penetration = BOAT_RADIUS - dist;
        const impactSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
        pos.x -= edge.nx * (penetration + PUSH_DIST);
        pos.y -= edge.ny * (penetration + PUSH_DIST);
        wallResponse(vel, -edge.nx, -edge.ny);
        if (result) {
          result.collided = true;
          result.contactX = edge.point.x;
          result.contactY = edge.point.y;
          result.normalX = -edge.nx;
          result.normalY = -edge.ny;
          result.impactSpeed = impactSpeed;
        }
      }
    }
  }

  // Island — boat must stay OUTSIDE the island (accounting for radius)
  if (map.island.length >= 3) {
    if (pointInPolygon(pos, map.island)) {
      const edge = findNearestEdge(pos, map.island);
      const impactSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      pos.x = edge.point.x + edge.nx * (PUSH_DIST + BOAT_RADIUS);
      pos.y = edge.point.y + edge.ny * (PUSH_DIST + BOAT_RADIUS);
      wallResponse(vel, edge.nx, edge.ny);
      if (result) {
        result.collided = true;
        result.contactX = edge.point.x;
        result.contactY = edge.point.y;
        result.normalX = edge.nx;
        result.normalY = edge.ny;
        result.impactSpeed = impactSpeed;
      }
    } else {
      const edge = findNearestEdge(pos, map.island);
      if (edge.distSq < BOAT_RADIUS * BOAT_RADIUS) {
        const dist = Math.sqrt(edge.distSq);
        const penetration = BOAT_RADIUS - dist;
        const impactSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
        pos.x += edge.nx * (penetration + PUSH_DIST);
        pos.y += edge.ny * (penetration + PUSH_DIST);
        wallResponse(vel, edge.nx, edge.ny);
        if (result) {
          result.collided = true;
          result.contactX = edge.point.x;
          result.contactY = edge.point.y;
          result.normalX = edge.nx;
          result.normalY = edge.ny;
          result.impactSpeed = impactSpeed;
        }
      }
    }
  }
}
