import type { Entity } from "../types";

const boatImage = new Image();
boatImage.src = "boat.png";

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

  if (boatImage.complete && boatImage.naturalWidth > 0) {
    ctx.drawImage(boatImage, -r.width / 2, -r.height / 2, r.width, r.height);
  } else {
    // Fallback: procedural boat while image loads
    const hw = r.width / 2;
    const hh = r.height / 2;
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.moveTo(hw, 0);
    ctx.lineTo(-hw * 0.6, -hh);
    ctx.lineTo(-hw, -hh * 0.6);
    ctx.lineTo(-hw, hh * 0.6);
    ctx.lineTo(-hw * 0.6, hh);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
