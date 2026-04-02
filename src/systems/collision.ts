import type { CollisionResult, Entity, TrackBounds } from "../types";

export function resolveCollisions(
  entity: Entity,
  track: TrackBounds,
  out: CollisionResult,
): void {
  const pos = entity.transform.pos;
  const vel = entity.velocity;

  // Capture pre-collision speed for spark intensity
  const impactSpeed = Math.sqrt(vel.x ** 2 + vel.y ** 2);

  // Reset result
  out.collided = false;
  out.contactX = pos.x;
  out.contactY = pos.y;
  out.normalX = 0;
  out.normalY = 0;
  out.impactSpeed = 0;

  // Must stay inside outer boundary
  if (pos.x < track.outer.minX) {
    pos.x = track.outer.minX;
    out.collided = true;
    out.normalX = 1; // pointing right, away from left wall
    out.contactX = pos.x;
    out.contactY = pos.y;
  } else if (pos.x > track.outer.maxX) {
    pos.x = track.outer.maxX;
    out.collided = true;
    out.normalX = -1;
    out.contactX = pos.x;
    out.contactY = pos.y;
  }

  if (pos.y < track.outer.minY) {
    pos.y = track.outer.minY;
    out.collided = true;
    out.normalY = 1; // pointing down, away from top wall
    out.contactX = pos.x;
    out.contactY = pos.y;
  } else if (pos.y > track.outer.maxY) {
    pos.y = track.outer.maxY;
    out.collided = true;
    out.normalY = -1;
    out.contactX = pos.x;
    out.contactY = pos.y;
  }

  // Must stay outside inner island
  const inner = track.inner;
  if (
    pos.x > inner.minX &&
    pos.x < inner.maxX &&
    pos.y > inner.minY &&
    pos.y < inner.maxY
  ) {
    const dLeft = pos.x - inner.minX;
    const dRight = inner.maxX - pos.x;
    const dTop = pos.y - inner.minY;
    const dBottom = inner.maxY - pos.y;
    const minDist = Math.min(dLeft, dRight, dTop, dBottom);

    if (minDist === dLeft) {
      pos.x = inner.minX;
      out.normalX = -1; // push left, away from island
    } else if (minDist === dRight) {
      pos.x = inner.maxX;
      out.normalX = 1;
    } else if (minDist === dTop) {
      pos.y = inner.minY;
      out.normalY = -1; // push up, away from island
    } else {
      pos.y = inner.maxY;
      out.normalY = 1;
    }

    out.collided = true;
    out.contactX = pos.x;
    out.contactY = pos.y;
  }

  // On collision: dampen world velocity
  if (out.collided) {
    out.impactSpeed = impactSpeed;
    vel.x *= 0.3;
    vel.y *= 0.3;
    vel.angular *= 0.5;
  }
}
