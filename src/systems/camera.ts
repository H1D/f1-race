import type { CameraState, Entity } from "../types";

const CAMERA_LERP = 0.08;
const LOOK_AHEAD = 80;

export function updateCamera(camera: CameraState, target: Entity, _alpha: number): void {
  // Look-ahead: offset camera in the direction the boat faces
  const goalX = target.transform.pos.x + Math.cos(target.transform.angle) * LOOK_AHEAD;
  const goalY = target.transform.pos.y + Math.sin(target.transform.angle) * LOOK_AHEAD;

  camera.x += (goalX - camera.x) * CAMERA_LERP;
  camera.y += (goalY - camera.y) * CAMERA_LERP;

  // Angle tracking — shortest path lerp to avoid 360° swing
  let angleDiff = target.transform.angle - camera.angle;
  angleDiff = ((((angleDiff + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
  camera.angle += angleDiff * CAMERA_LERP;
}

export function applyCameraTransform(
  ctx: CanvasRenderingContext2D,
  camera: CameraState,
  canvasW: number,
  canvasH: number,
): void {
  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.rotate(-camera.angle - Math.PI / 2); // boat faces "up" on screen
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
}
