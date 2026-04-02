import type { Entity, PowerupDefinition } from "../types";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Render pickup orbs floating in the world with a gentle bobbing animation.
 */
export function renderPickups(
  ctx: CanvasRenderingContext2D,
  pickups: Entity[],
  alpha: number,
  time: number,
): void {
  for (const entity of pickups) {
    const pickup = entity.powerupPickup;
    const r = entity.render;
    if (!pickup || !r) continue;

    const tf = entity.transform;
    const x = lerp(tf.prevPos.x, tf.pos.x, alpha);
    const y = lerp(tf.prevPos.y, tf.pos.y, alpha);

    // Gentle bob: +-3px vertical oscillation
    const bobOffset = Math.sin(pickup.bobPhase + time * 2) * 3;

    // Pulsing glow radius
    const pulse = 1 + Math.sin(time * 3) * 0.15;
    const glowRadius = pickup.radius * 1.6 * pulse;

    ctx.save();
    ctx.translate(x, y + bobOffset);

    // Outer glow
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = r.color;
    ctx.globalAlpha = 0.3;
    ctx.fill();

    // Solid orb
    ctx.beginPath();
    ctx.arc(0, 0, pickup.radius, 0, Math.PI * 2);
    ctx.fillStyle = r.color;
    ctx.globalAlpha = 0.9;
    ctx.fill();

    // White border
    ctx.beginPath();
    ctx.arc(0, 0, pickup.radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Render zone entities as translucent circles on the water surface.
 */
export function renderZones(
  ctx: CanvasRenderingContext2D,
  zones: Entity[],
  alpha: number,
): void {
  for (const entity of zones) {
    const zone = entity.zone;
    if (!zone) continue;

    const tf = entity.transform;
    const x = lerp(tf.prevPos.x, tf.pos.x, alpha);
    const y = lerp(tf.prevPos.y, tf.pos.y, alpha);

    // Compute fade multiplier from lifetime
    let fadeMul = 1;
    if (entity.lifetime && entity.lifetime.remaining < entity.lifetime.fadeStart) {
      fadeMul = Math.max(0, entity.lifetime.remaining / entity.lifetime.fadeStart);
    }

    ctx.save();
    ctx.globalAlpha = 0.15 * fadeMul;

    // Filled zone circle
    ctx.beginPath();
    ctx.arc(x, y, zone.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 100, 0, 1)";
    ctx.fill();

    // Subtle border ring
    ctx.beginPath();
    ctx.arc(x, y, zone.radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 100, 0, 1)";
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.3 * fadeMul;
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Render obstacle entities as interpolated rectangles with optional fade-out.
 */
export function renderObstacles(
  ctx: CanvasRenderingContext2D,
  obstacles: Entity[],
  alpha: number,
): void {
  for (const entity of obstacles) {
    const r = entity.render;
    if (!r) continue;

    const tf = entity.transform;
    const x = lerp(tf.prevPos.x, tf.pos.x, alpha);
    const y = lerp(tf.prevPos.y, tf.pos.y, alpha);

    // Interpolate angle (shortest path)
    let angleDiff = tf.angle - tf.prevAngle;
    angleDiff = ((((angleDiff + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
    const angle = tf.prevAngle + angleDiff * alpha;

    // Compute fade multiplier from lifetime
    let fadeMul = 1;
    if (entity.lifetime && entity.lifetime.remaining < entity.lifetime.fadeStart) {
      fadeMul = Math.max(0, entity.lifetime.remaining / entity.lifetime.fadeStart);
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = fadeMul;

    ctx.fillStyle = r.color;
    ctx.fillRect(-r.width / 2, -r.height / 2, r.width, r.height);

    ctx.restore();
  }
}

/**
 * Draw tinted visual rings around the boat for each active effect that has a boatTint.
 */
export function renderActiveEffectVisuals(
  ctx: CanvasRenderingContext2D,
  boat: Entity,
  definitions: Map<string, PowerupDefinition>,
  alpha: number,
): void {
  const effects = boat.activeEffects;
  if (!effects || effects.effects.length === 0) return;

  const tf = boat.transform;
  const x = lerp(tf.prevPos.x, tf.pos.x, alpha);
  const y = lerp(tf.prevPos.y, tf.pos.y, alpha);

  const r = boat.render;
  const boatRadius = r ? Math.max(r.width, r.height) * 0.6 : 20;

  let ringIndex = 0;
  for (const effect of effects.effects) {
    const def = definitions.get(effect.powerupId);
    if (!def?.visual?.boatTint) continue;

    const tint = def.visual.boatTint;
    const ringRadius = boatRadius + 4 + ringIndex * 3;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = tint;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.restore();

    ringIndex++;
  }
}

/**
 * Draw a HUD showing active powerup effects as small colored squares with remaining time.
 * Rendered in screen space (top-left area).
 */
export function renderEffectsHUD(
  ctx: CanvasRenderingContext2D,
  boat: Entity,
  definitions: Map<string, PowerupDefinition>,
  _screenWidth: number,
): void {
  const effects = boat.activeEffects;
  if (!effects || effects.effects.length === 0) return;

  const startX = 12;
  const startY = 12;
  const size = 24;
  const gap = 6;

  ctx.save();
  ctx.font = "12px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (let i = 0; i < effects.effects.length; i++) {
    const effect = effects.effects[i]!;
    const def = definitions.get(effect.powerupId);

    const ix = startX + i * (size + gap);
    const iy = startY;

    // Colored square background
    const color = def?.spawn?.color ?? "#888888";
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = color;
    ctx.fillRect(ix, iy, size, size);

    // White border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(ix, iy, size, size);

    // HUD icon text (centered in the square)
    if (def?.visual?.hudIcon) {
      ctx.globalAlpha = 1;
      ctx.font = "14px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(def.visual.hudIcon, ix + size / 2, iy + 4);
    }

    // Remaining time below the square
    if (effect.remainingTime > 0) {
      ctx.globalAlpha = 0.7;
      ctx.font = "12px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(effect.remainingTime.toFixed(1), ix + size / 2, iy + size + 2);
    }
  }

  ctx.restore();
}
