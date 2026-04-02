import type { Entity } from "../types";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function renderBoat(ctx: CanvasRenderingContext2D, entity: Entity, alpha: number): void {
  const r = entity.render;
  if (!r) return;

  const tf = entity.transform;

  // Interpolate between previous and current state for smooth rendering
  const x = lerp(tf.prevPos.x, tf.pos.x, alpha);
  const y = lerp(tf.prevPos.y, tf.pos.y, alpha);

  // Interpolate angle (shortest path)
  let angleDiff = tf.angle - tf.prevAngle;
  angleDiff = ((((angleDiff + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
  const angle = tf.prevAngle + angleDiff * alpha;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Boat hull — pointed front, flat back
  const hw = r.width / 2;
  const hh = r.height / 2;

  ctx.fillStyle = r.color;
  ctx.beginPath();
  ctx.moveTo(hw, 0); // bow (front point)
  ctx.lineTo(-hw * 0.6, -hh); // top-left
  ctx.lineTo(-hw, -hh * 0.6); // back-left
  ctx.lineTo(-hw, hh * 0.6); // back-right
  ctx.lineTo(-hw * 0.6, hh); // bottom-right
  ctx.closePath();
  ctx.fill();

  // Cabin accent
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(-hw * 0.2, -hh * 0.35, hw * 0.5, hh * 0.7);

  ctx.restore();
}
