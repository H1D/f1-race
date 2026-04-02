import type { Entity, TrackBounds } from "../types";

export function resolveCollisions(entity: Entity, track: TrackBounds): void {
  const pos = entity.transform.pos;
  const vel = entity.velocity;

  // Must stay inside outer boundary
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

  // Must stay outside inner island
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

  // On collision: dampen world velocity
  if (collided) {
    vel.x *= 0.3;
    vel.y *= 0.3;
    vel.angular *= 0.5;
  }
}
