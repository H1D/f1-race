import type { Entity, InventoryComponent, PowerupDefinition, PowerupToast } from "../types";

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
  definitions?: Map<string, PowerupDefinition>,
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

    // Canvas icon centered in the orb
    const def = definitions?.get(pickup.powerupId);
    if (def?.visual?.drawIcon) {
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 0.8;
      def.visual.drawIcon(ctx, pickup.radius * 1.3);
    }

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

    const zoneColor = zone.color ?? "rgba(255, 100, 0, 1)";

    ctx.save();
    ctx.globalAlpha = 0.4 * fadeMul;

    // Filled zone circle
    ctx.beginPath();
    ctx.arc(x, y, zone.radius, 0, Math.PI * 2);
    ctx.fillStyle = zoneColor;
    ctx.fill();

    // Subtle border ring
    ctx.beginPath();
    ctx.arc(x, y, zone.radius, 0, Math.PI * 2);
    ctx.strokeStyle = zoneColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7 * fadeMul;
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

    if (entity.tags.has("tourist-boat")) {
      drawTouristBoat(ctx, r.width, r.height);
    } else {
      ctx.fillStyle = r.color;
      ctx.fillRect(-r.width / 2, -r.height / 2, r.width, r.height);
    }

    ctx.restore();
  }
}

/**
 * Draw a top-down Amsterdam canal tourist boat (orange hull, orange crowd,
 * Dutch flag tricolor stripe at the bow).
 */
function drawTouristBoat(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const hw = w / 2;
  const hh = h / 2;

  // Hull — rounded rectangle with pointed bow (right side)
  ctx.beginPath();
  ctx.moveTo(-hw, -hh * 0.7);
  ctx.lineTo( hw * 0.55, -hh * 0.7);
  ctx.lineTo( hw, 0);            // pointed bow tip
  ctx.lineTo( hw * 0.55,  hh * 0.7);
  ctx.lineTo(-hw,  hh * 0.7);
  ctx.quadraticCurveTo(-hw * 1.08, 0, -hw, -hh * 0.7); // rounded stern
  ctx.closePath();
  ctx.fillStyle = "#c05010";
  ctx.fill();

  // Deck interior (lighter orange — the crowd)
  ctx.beginPath();
  ctx.moveTo(-hw * 0.7, -hh * 0.45);
  ctx.lineTo( hw * 0.40, -hh * 0.45);
  ctx.lineTo( hw * 0.72, 0);
  ctx.lineTo( hw * 0.40,  hh * 0.45);
  ctx.lineTo(-hw * 0.7,  hh * 0.45);
  ctx.closePath();
  ctx.fillStyle = "#ff9900";
  ctx.fill();

  // Dutch flag stripe at bow (3 thin horizontal bands)
  const flagX = hw * 0.28;
  const flagW = hw * 0.38;
  const strH  = hh * 0.22;
  const flagY = -strH * 1.5;

  ctx.fillStyle = "#ae1c28"; ctx.fillRect(flagX, flagY,            flagW, strH);
  ctx.fillStyle = "#ffffff"; ctx.fillRect(flagX, flagY + strH,     flagW, strH);
  ctx.fillStyle = "#21468b"; ctx.fillRect(flagX, flagY + strH * 2, flagW, strH);

  // Hull outline
  ctx.beginPath();
  ctx.moveTo(-hw, -hh * 0.7);
  ctx.lineTo( hw * 0.55, -hh * 0.7);
  ctx.lineTo( hw, 0);
  ctx.lineTo( hw * 0.55,  hh * 0.7);
  ctx.lineTo(-hw,  hh * 0.7);
  ctx.quadraticCurveTo(-hw * 1.08, 0, -hw, -hh * 0.7);
  ctx.closePath();
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function hexToRgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Draw a pulsing radial gradient glow halo around the boat for each active effect that has a boatTint,
 * plus a crisp stroke ring at the boat edge as a sharp border.
 */
export function renderActiveEffectVisuals(
  ctx: CanvasRenderingContext2D,
  boat: Entity,
  definitions: Map<string, PowerupDefinition>,
  alpha: number,
  time: number,
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

    // Pulsing glow halo
    const glowSize = 18 + ringIndex * 4;
    const pulse = 1 + Math.sin(time * 3 + ringIndex * 1.2) * 0.12;
    const outerRadius = (boatRadius + glowSize) * pulse;

    const gradient = ctx.createRadialGradient(x, y, boatRadius, x, y, outerRadius);
    gradient.addColorStop(0, hexToRgba(tint, 0.45));
    gradient.addColorStop(1, hexToRgba(tint, 0));

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    // Crisp stroke ring at boat edge
    const strokeRadius = boatRadius + 2 + ringIndex * 4;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, strokeRadius, 0, Math.PI * 2);
    ctx.strokeStyle = tint;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.75;
    ctx.stroke();
    ctx.restore();

    ringIndex++;
  }
}

/**
 * Draw a rounded rectangle path (no stroke/fill — caller decides).
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Render transient pickup-name toasts in world-space, anchored to the boat.
 * Counter-rotates by (cameraAngle + π/2) so text always reads upright on screen
 * regardless of camera mode (follow rotates, fixed does not).
 * Drift is applied after the counter-rotation so it always goes upward on screen.
 * Must be called while the camera transform is still applied (before ctx.restore).
 */
export function renderPickupToasts(
  ctx: CanvasRenderingContext2D,
  toasts: PowerupToast[],
  alpha: number,
  cameraAngle: number,
): void {
  if (toasts.length === 0) return;

  const HOLD_TIME = 0.5; // seconds fully visible before fade begins

  for (const toast of toasts) {
    // Alpha: hold at 1, then linearly fade to 0
    const fadeRatio = toast.elapsed > HOLD_TIME
      ? 1 - (toast.elapsed - HOLD_TIME) / (toast.duration - HOLD_TIME)
      : 1;
    const a = Math.max(0, Math.min(1, fadeRatio));
    if (a <= 0) continue;

    // Interpolated boat position (world-space)
    const tf = toast.boat.transform;
    const bx = lerp(tf.prevPos.x, tf.pos.x, alpha);
    const by = lerp(tf.prevPos.y, tf.pos.y, alpha);

    // Translate to boat, counter-rotate to cancel camera, then drift upward in screen space
    const drift = toast.elapsed * 22;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(cameraAngle + Math.PI / 2); // net rotation = 0 → local frame = screen frame
    ctx.translate(0, -(32 + drift));       // screen-up, always

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const label = `${toast.icon}  ${toast.name}`;
    ctx.font = "bold 20px monospace";
    const textW = ctx.measureText(label).width;
    const pad = 10;
    const pillW = textW + pad * 2;
    const pillH = 22;

    // Tinted background pill
    ctx.globalAlpha = a * 0.55;
    ctx.fillStyle = toast.color;
    roundRect(ctx, -pillW / 2, -pillH / 2, pillW, pillH, 6);
    ctx.fill();

    // Subtle white border
    ctx.globalAlpha = a * 0.35;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    roundRect(ctx, -pillW / 2, -pillH / 2, pillW, pillH, 6);
    ctx.stroke();

    // Label text
    ctx.globalAlpha = a;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, 0, 0);

    ctx.restore();
  }
}

/**
 * Draw per-player inventory HUD: two pickup slots at bottom corners.
 * P1 bottom-left ("Q: use"), P2 bottom-right ("⇧: use").
 */
export function renderInventoryHUD(
  ctx: CanvasRenderingContext2D,
  player1: Entity,
  player2: Entity,
  definitions: Map<string, PowerupDefinition>,
  screenW: number,
  screenH: number,
): void {
  const slotSize = 32;
  const gap = 5;
  const bottomPad = 60; // above the race timer

  // P1: bottom-left
  if (player1.inventory) {
    renderSlots(ctx, player1.inventory, definitions, 12, screenH - bottomPad - slotSize, slotSize, gap, "#e04040", "Q: use", false);
  }
  // P2: bottom-right
  if (player2.inventory) {
    const totalW = 2 * slotSize + gap;
    renderSlots(ctx, player2.inventory, definitions, screenW - 12 - totalW, screenH - bottomPad - slotSize, slotSize, gap, "#e0c040", "⇧: use", true);
  }
}

function renderSlots(
  ctx: CanvasRenderingContext2D,
  inventory: InventoryComponent,
  definitions: Map<string, PowerupDefinition>,
  x: number,
  y: number,
  slotSize: number,
  gap: number,
  accentColor: string,
  keyLabel: string,
  rightAlign: boolean,
): void {
  ctx.save();

  for (let i = 0; i < inventory.maxSlots; i++) {
    const sx = x + i * (slotSize + gap);
    const powerupId = inventory.slots[i] ?? null;
    const def = powerupId ? definitions.get(powerupId) : null;

    // Slot background
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = def ? def.spawn.color : "#1a1a2a";
    roundRect(ctx, sx, y, slotSize, slotSize, 5);
    ctx.fill();

    // Border
    ctx.globalAlpha = def ? 0.7 : 0.3;
    ctx.strokeStyle = def ? "#ffffff" : "#555577";
    ctx.lineWidth = 1.5;
    roundRect(ctx, sx, y, slotSize, slotSize, 5);
    ctx.stroke();

    // Icon
    if (def?.visual?.drawIcon) {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 0.8;
      ctx.save();
      ctx.translate(sx + slotSize / 2, y + slotSize / 2);
      def.visual.drawIcon(ctx, slotSize * 0.72);
      ctx.restore();
    } else if (!def) {
      // Empty slot number
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#aaaacc";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), sx + slotSize / 2, y + slotSize / 2);
    }
  }

  // Key label below slots
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = accentColor;
  ctx.font = "11px monospace";
  ctx.textAlign = rightAlign ? "right" : "left";
  ctx.textBaseline = "top";
  const labelX = rightAlign ? x + 2 * slotSize + gap : x;
  ctx.fillText(keyLabel, labelX, y + slotSize + 4);

  ctx.globalAlpha = 1;
  ctx.restore();
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

    // HUD icon — canvas-drawn if available, emoji fallback otherwise
    if (def?.visual?.drawIcon) {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 0.8;
      ctx.save();
      ctx.translate(ix + size / 2, iy + size / 2);
      def.visual.drawIcon(ctx, size * 0.78);
      ctx.restore();
    } else if (def?.visual?.hudIcon) {
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
