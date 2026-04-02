import type { CollisionResult, Entity, Particle } from "../types";

// --- Pool ---

export function createParticlePool(capacity: number): Particle[] {
  const pool: Particle[] = [];
  for (let i = 0; i < capacity; i++) {
    pool.push({
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 0, size: 0,
      r: 0, g: 0, b: 0,
      round: false, active: false,
    });
  }
  return pool;
}

function acquireParticle(pool: Particle[]): Particle | null {
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i]!.active) return pool[i]!;
  }
  return null;
}

// --- Update (called at fixed 60Hz) ---

export function updateParticles(pool: Particle[], dt: number): void {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i]!;
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
  }
}

// --- Render (world-space, between camera save/restore) ---

export function renderParticles(
  ctx: CanvasRenderingContext2D,
  pool: Particle[],
): void {
  const prevAlpha = ctx.globalAlpha;
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i]!;
    if (!p.active) continue;
    const a = p.life / p.maxLife;
    ctx.globalAlpha = a;
    ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
    if (p.round) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.globalAlpha = prevAlpha;
}

// --- Wake emitter (call every physics tick) ---

export function emitWake(pool: Particle[], entity: Entity): void {
  const vel = entity.velocity;
  const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2);
  const phys = entity.boatPhysics;
  if (!phys || speed < 0.5) return;

  const tf = entity.transform;
  const halfW = entity.render ? entity.render.width / 2 : 32;

  // Boat heading vectors
  const fwdX = Math.cos(tf.angle);
  const fwdY = Math.sin(tf.angle);
  const rightX = -Math.sin(tf.angle);
  const rightY = Math.cos(tf.angle);

  const speedRatio = Math.min(speed / phys.maxSpeed, 1);
  const count = Math.floor(speedRatio * 3) + 1; // 1-4 per tick

  for (let i = 0; i < count; i++) {
    const p = acquireParticle(pool);
    if (!p) return;

    // Spawn at stern with lateral spread
    const spread = (Math.random() - 0.5) * 12 * speedRatio;
    p.x = tf.pos.x - fwdX * halfW + rightX * spread;
    p.y = tf.pos.y - fwdY * halfW + rightY * spread;

    // Drift backward + random scatter
    p.vx = -fwdX * speed * 0.3 + (Math.random() - 0.5) * 20 * speedRatio;
    p.vy = -fwdY * speed * 0.3 + (Math.random() - 0.5) * 20 * speedRatio;

    p.life = 0.3 + Math.random() * 0.5;
    p.maxLife = p.life;
    p.size = 2 + Math.random() * 3;

    // Blue-white water colors
    p.r = 180 + Math.floor(Math.random() * 75);
    p.g = 210 + Math.floor(Math.random() * 45);
    p.b = 255;

    p.active = true;
  }
}

// --- Bow arrow emitter (chevron / arrow shape at nose) ---

const BOW_ARM_ANGLE = 0.45; // angle of each arm relative to forward (~26°)

export function emitBowSpray(pool: Particle[], entity: Entity): void {
  const vel = entity.velocity;
  const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2);
  const phys = entity.boatPhysics;
  if (!phys || speed < 1.5) return;

  const tf = entity.transform;
  const halfW = entity.render ? entity.render.width / 2 : 32;

  const fwdX = Math.cos(tf.angle);
  const fwdY = Math.sin(tf.angle);

  const speedRatio = Math.min(speed / phys.maxSpeed, 1);

  // Place particles along each arm of the arrow, from nose backward
  const armLength = 40 + speedRatio * 65; // longer arms at higher speed
  const particlesPerArm = Math.floor(speedRatio * 3) + 2; // 2-5 per arm

  for (const side of [-1, 1]) {
    // Arm points backward+outward from a tip ahead of the nose
    const armAngle = tf.angle + Math.PI + side * BOW_ARM_ANGLE;
    const armDirX = Math.cos(armAngle);
    const armDirY = Math.sin(armAngle);

    // Tip position: just ahead of nose
    const tipOffset = 1;
    const tipX = tf.pos.x + fwdX * (halfW + tipOffset);
    const tipY = tf.pos.y + fwdY * (halfW + tipOffset);

    for (let i = 0; i < particlesPerArm; i++) {
      const p = acquireParticle(pool);
      if (!p) return;

      // Position along the arm from tip back toward nose, with random offset
      const t = (i / particlesPerArm) * armLength + Math.random() * 5;
      const perpX = -armDirY;
      const perpY = armDirX;
      const jitter = (Math.random() - 0.5) * 6;
      p.x = tipX + armDirX * t + perpX * jitter;
      p.y = tipY + armDirY * t + perpY * jitter;

      // Minimal drift
      p.vx = armDirX * speed * 0.1 + (Math.random() - 0.5) * 3;
      p.vy = armDirY * speed * 0.1 + (Math.random() - 0.5) * 3;

      p.life = 0.1 + Math.random() * 0.2;
      p.maxLife = p.life;
      p.size = 2 + Math.random() * 2.5 + (i / particlesPerArm) * 1.5; // varied bubbly sizes

      // White-blue spray
      p.r = 220 + Math.floor(Math.random() * 35);
      p.g = 230 + Math.floor(Math.random() * 25);
      p.b = 255;

      p.round = true;
      p.active = true;
    }
  }
}

// --- Collision spark emitter (call after resolveCollisions) ---

export function emitCollisionSparks(
  pool: Particle[],
  result: CollisionResult,
): void {
  if (!result.collided) return;

  const count = Math.floor(Math.min(result.impactSpeed * 3, 20)) + 5;

  for (let i = 0; i < count; i++) {
    const p = acquireParticle(pool);
    if (!p) return;

    p.x = result.contactX;
    p.y = result.contactY;

    // Scatter outward from wall along normal with spread
    const angle =
      Math.atan2(result.normalY, result.normalX) +
      (Math.random() - 0.5) * 1.5;
    const spd = 40 + Math.random() * 80;
    p.vx = Math.cos(angle) * spd;
    p.vy = Math.sin(angle) * spd;

    p.life = 0.2 + Math.random() * 0.4;
    p.maxLife = p.life;
    p.size = 1.5 + Math.random() * 2.5;

    // Orange/yellow spark colors
    p.r = 255;
    p.g = 150 + Math.floor(Math.random() * 105);
    p.b = Math.floor(Math.random() * 60);

    p.active = true;
  }
}
