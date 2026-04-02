import type { CameraState, Entity } from "../types";

const CAMERA_LERP = 0.08;
const LOOK_AHEAD = 80;
const ZOOM_SPRING_STIFFNESS = 4.0; // how fast zoom snaps toward target
const ZOOM_SPRING_DAMPING = 3.0; // how quickly oscillation settles
const BBOX_PADDING = 400;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2.0;
const TRANSITION_MS = 500;
const TRANSITION_LERP = 0.25; // fast lerp used during transition

export function updateCamera(
  camera: CameraState,
  canvasW: number,
  canvasH: number,
  dt: number,
): void {
  // Detect mode switch
  if (camera.followTarget !== camera._prevTarget) {
    camera._prevTarget = camera.followTarget;
    camera._transitionElapsed = 0;
  }

  // Advance transition timer
  camera._transitionElapsed += dt * 1000;

  // Compute lerp factor: fast during transition, easing to normal
  const t = Math.min(camera._transitionElapsed / TRANSITION_MS, 1);
  const lerp = TRANSITION_LERP + (CAMERA_LERP - TRANSITION_LERP) * t;
  if (camera.followTarget) {
    updateFollowMode(camera, camera.followTarget, lerp);
  } else {
    updateFixedMode(camera, canvasW, canvasH, lerp, dt);
  }
}

/** Follow mode: track a single entity with look-ahead and rotation. */
function updateFollowMode(camera: CameraState, target: Entity, lerp: number): void {
  const goalX = target.transform.pos.x + Math.cos(target.transform.angle) * LOOK_AHEAD;
  const goalY = target.transform.pos.y + Math.sin(target.transform.angle) * LOOK_AHEAD;

  camera.x += (goalX - camera.x) * lerp;
  camera.y += (goalY - camera.y) * lerp;

  // Angle tracking — shortest path lerp to avoid 360° swing
  let angleDiff = target.transform.angle - camera.angle;
  angleDiff = ((((angleDiff + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
  camera.angle += angleDiff * lerp;
}

/** Fixed mode: center on midpoint of all entities, no rotation, dynamic zoom. */
function updateFixedMode(
  camera: CameraState,
  canvasW: number,
  canvasH: number,
  lerp: number,
  dt: number,
): void {
  const entities = camera.entities;
  if (entities.length === 0) return;

  // Compute midpoint and bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const e of entities) {
    const px = e.transform.pos.x;
    const py = e.transform.pos.y;
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }

  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  // Smooth position toward midpoint
  camera.x += (midX - camera.x) * lerp;
  camera.y += (midY - camera.y) * lerp;

  // No rotation in fixed mode — lerp angle back to 0
  camera.angle += (0 - camera.angle) * lerp;

  // Dynamic zoom to fit bounding box + padding
  // The camera applies a -angle - PI/2 rotation, so world axes are rotated on screen.
  // Compute the screen-space bounding box size accounting for rotation.
  const worldW = maxX - minX + BBOX_PADDING * 2;
  const worldH = maxY - minY + BBOX_PADDING * 2;
  const absC = Math.abs(Math.cos(camera.angle + Math.PI / 2));
  const absS = Math.abs(Math.sin(camera.angle + Math.PI / 2));
  const screenW = worldW * absC + worldH * absS;
  const screenH = worldW * absS + worldH * absC;
  const targetZoom = Math.min(canvasW / screenW, canvasH / screenH);
  const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));

  // Damped spring for zoom
  const displacement = clampedZoom - camera.zoom;
  const springForce = displacement * ZOOM_SPRING_STIFFNESS;
  const dampingForce = -camera._zoomVelocity * ZOOM_SPRING_DAMPING;
  camera._zoomVelocity += (springForce + dampingForce) * dt;
  camera.zoom += camera._zoomVelocity * dt;
}

export function applyCameraTransform(
  ctx: CanvasRenderingContext2D,
  camera: CameraState,
  canvasW: number,
  canvasH: number,
): void {
  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  // Always apply rotation — in fixed mode it lerps to 0, giving smooth transition
  ctx.rotate(-camera.angle - Math.PI / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
}
