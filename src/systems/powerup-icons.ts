/**
 * Canvas 2D icon drawing functions for canal powerups.
 * Each function draws centered at (0,0), fitting within ±size/2.
 * Caller is responsible for setting fillStyle / strokeStyle / lineWidth
 * and for ctx.save() + ctx.translate(x, y) before calling.
 */

export function drawHerringIcon(ctx: CanvasRenderingContext2D, size: number): void {
  const s = size / 2;

  ctx.save();

  // Body — closed double-bezier teardrop: wide at head (right), tapers to tail root (left)
  ctx.beginPath();
  ctx.moveTo(s * 0.42, 0);
  ctx.bezierCurveTo(
    s * 0.42,  s * 0.38,
   -s * 0.30,  s * 0.44,
   -s * 0.48,  0,
  );
  ctx.bezierCurveTo(
   -s * 0.30, -s * 0.44,
    s * 0.42, -s * 0.38,
    s * 0.42,  0,
  );
  ctx.fill();
  ctx.stroke();

  // Forked tail — upper lobe
  ctx.beginPath();
  ctx.moveTo(-s * 0.48,  0);
  ctx.quadraticCurveTo(-s * 0.62,  s * 0.18, -s * 0.88,  s * 0.42);
  ctx.quadraticCurveTo(-s * 0.70,  s * 0.20, -s * 0.52,  s * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Forked tail — lower lobe
  ctx.beginPath();
  ctx.moveTo(-s * 0.48,  0);
  ctx.quadraticCurveTo(-s * 0.62, -s * 0.18, -s * 0.88, -s * 0.42);
  ctx.quadraticCurveTo(-s * 0.70, -s * 0.20, -s * 0.52, -s * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dorsal fin
  ctx.beginPath();
  ctx.moveTo(-s * 0.05, -s * 0.41);
  ctx.quadraticCurveTo(s * 0.05, -s * 0.70, s * 0.18, -s * 0.42);
  ctx.quadraticCurveTo(s * 0.10, -s * 0.42, -s * 0.05, -s * 0.41);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Eye
  ctx.beginPath();
  ctx.arc(s * 0.22, -s * 0.10, Math.max(1, s * 0.07), 0, Math.PI * 2);
  ctx.fill();

  // Gill line
  ctx.beginPath();
  ctx.moveTo(s * 0.12, -s * 0.30);
  ctx.quadraticCurveTo(s * 0.06, 0, s * 0.12, s * 0.30);
  ctx.stroke();

  ctx.restore();
}

export function drawBicycleIcon(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.save();

  const s = size / 2;
  const wheelR  = s * 0.38;
  const rearCx  = -s * 0.35;
  const frontCx =  s * 0.35;
  const wheelCy =  s * 0.18;

  // Rear wheel
  ctx.beginPath();
  ctx.arc(rearCx, wheelCy, wheelR, 0, Math.PI * 2);
  ctx.stroke();

  // Front wheel
  ctx.beginPath();
  ctx.arc(frontCx, wheelCy, wheelR, 0, Math.PI * 2);
  ctx.stroke();

  // Frame geometry
  const bbX      = (rearCx + frontCx) * 0.15;
  const bbY      = wheelCy + wheelR * 0.05;
  const seatTopX = rearCx + wheelR * 0.05;
  const seatTopY = wheelCy - wheelR * 0.95;
  const headTopX = frontCx - wheelR * 0.08;
  const headTopY = wheelCy - wheelR * 0.85;

  // Chain stay
  ctx.beginPath();
  ctx.moveTo(rearCx, wheelCy);
  ctx.lineTo(bbX, bbY);
  ctx.stroke();

  // Seat tube
  ctx.beginPath();
  ctx.moveTo(bbX, bbY);
  ctx.lineTo(seatTopX, seatTopY);
  ctx.stroke();

  // Seat stay
  ctx.beginPath();
  ctx.moveTo(seatTopX, seatTopY);
  ctx.lineTo(rearCx, wheelCy);
  ctx.stroke();

  // Top tube
  ctx.beginPath();
  ctx.moveTo(seatTopX, seatTopY);
  ctx.lineTo(headTopX, headTopY);
  ctx.stroke();

  // Down tube
  ctx.beginPath();
  ctx.moveTo(bbX, bbY);
  ctx.lineTo(headTopX, headTopY);
  ctx.stroke();

  // Fork
  ctx.beginPath();
  ctx.moveTo(headTopX, headTopY);
  ctx.lineTo(frontCx, wheelCy);
  ctx.stroke();

  // Seat
  const seatHalf = wheelR * 0.35;
  ctx.beginPath();
  ctx.moveTo(seatTopX - seatHalf, seatTopY);
  ctx.lineTo(seatTopX + seatHalf * 0.4, seatTopY);
  ctx.stroke();

  // Handlebars
  const stemTipX = headTopX + wheelR * 0.08;
  const stemTipY = headTopY - wheelR * 0.32;
  ctx.beginPath();
  ctx.moveTo(headTopX, headTopY);
  ctx.lineTo(stemTipX, stemTipY);
  ctx.stroke();

  const barHalf = wheelR * 0.28;
  ctx.beginPath();
  ctx.moveTo(stemTipX - barHalf, stemTipY + wheelR * 0.1);
  ctx.lineTo(stemTipX + barHalf, stemTipY - wheelR * 0.05);
  ctx.stroke();

  ctx.restore();
}

export function drawCanalLockIcon(ctx: CanvasRenderingContext2D, size: number): void {
  const h = size / 2;
  const beamH      = h * 0.22;
  const pillarW    = h * 0.18;
  const barW       = h * 0.13;
  const barCount   = 3;
  const barSpacing = (size - pillarW * 2) / (barCount + 1);
  const barTop     = -h + beamH;
  const barBottom  = h * 0.72;

  ctx.save();

  // Left pillar
  ctx.beginPath();
  ctx.moveTo(-h, -h);
  ctx.lineTo(-h + pillarW, -h);
  ctx.lineTo(-h + pillarW, barBottom);
  ctx.lineTo(-h, barBottom);
  ctx.closePath();
  ctx.fill();

  // Right pillar
  ctx.beginPath();
  ctx.moveTo(h - pillarW, -h);
  ctx.lineTo(h, -h);
  ctx.lineTo(h, barBottom);
  ctx.lineTo(h - pillarW, barBottom);
  ctx.closePath();
  ctx.fill();

  // Top beam
  ctx.beginPath();
  ctx.moveTo(-h, -h);
  ctx.lineTo(h, -h);
  ctx.lineTo(h, -h + beamH);
  ctx.lineTo(-h, -h + beamH);
  ctx.closePath();
  ctx.fill();

  // Vertical bars with pointed tips
  const barAreaLeft = -h + pillarW;
  for (let i = 0; i < barCount; i++) {
    const bx = barAreaLeft + barSpacing * (i + 1) - barW / 2;
    ctx.beginPath();
    ctx.moveTo(bx, barTop);
    ctx.lineTo(bx + barW, barTop);
    ctx.lineTo(bx + barW, barBottom - barW * 0.6);
    ctx.lineTo(bx + barW / 2, barBottom);
    ctx.lineTo(bx, barBottom - barW * 0.6);
    ctx.closePath();
    ctx.fill();
  }

  // Water ripples below the gate
  const waterY1  = h * 0.82;
  const waterY2  = h * 0.94;
  const waveInset = h * 0.25;

  ctx.beginPath();
  ctx.moveTo(-h + waveInset, waterY1);
  ctx.quadraticCurveTo(0, waterY1 - h * 0.06, h - waveInset, waterY1);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-h + waveInset * 1.6, waterY2);
  ctx.quadraticCurveTo(0, waterY2 - h * 0.06, h - waveInset * 1.6, waterY2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Stompot (Dutch stamppot) icon — a bowl of mashed potatoes with steam.
 * Used for the Main Character Syndrome powerup (Effendi attribute).
 */
export function drawStompotIcon(ctx: CanvasRenderingContext2D, size: number): void {
  const s = size / 2;

  ctx.save();

  // Bowl body (open trapezoid)
  const rimY   = -s * 0.08;
  const baseY  =  s * 0.62;
  const rimW   =  s * 0.76;
  const baseW  =  s * 0.52;

  ctx.beginPath();
  ctx.moveTo(-rimW, rimY);
  ctx.lineTo( rimW, rimY);
  ctx.lineTo( baseW, baseY);
  ctx.lineTo(-baseW, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rim ellipse
  ctx.beginPath();
  ctx.ellipse(0, rimY, rimW, s * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Mash surface — three bumps inside the rim
  const mashY = rimY + s * 0.05;
  ctx.beginPath();
  ctx.moveTo(-rimW * 0.65, mashY);
  for (let i = 0; i < 3; i++) {
    const bx = -rimW * 0.65 + (rimW * 1.3 / 3) * (i + 0.5);
    ctx.quadraticCurveTo(bx, mashY - s * 0.16, bx + rimW * 0.65 / 3, mashY);
  }
  ctx.lineWidth = Math.max(0.8, size * 0.04);
  ctx.stroke();

  // Two steam wisps above
  for (const sx of [-s * 0.22, s * 0.22]) {
    ctx.beginPath();
    ctx.moveTo(sx, rimY - s * 0.08);
    ctx.quadraticCurveTo(sx + s * 0.10, rimY - s * 0.26, sx, rimY - s * 0.42);
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

export function drawOilSpillIcon(ctx: CanvasRenderingContext2D, size: number): void {
  const h = size / 2;
  const r = h * 0.38;

  ctx.save();

  // Main teardrop drop
  const tipY      = -h * 0.50;
  const bulgeY    = h * 0.28;
  const cpSpread  = h * 0.52;

  ctx.beginPath();
  ctx.moveTo(0, tipY);
  ctx.bezierCurveTo(
    cpSpread * 0.55, tipY + h * 0.30,
    r,               bulgeY - r * 0.5,
    0,               bulgeY + r * 0.18,
  );
  ctx.bezierCurveTo(
    -r,               bulgeY - r * 0.5,
    -cpSpread * 0.55, tipY + h * 0.30,
    0,                tipY,
  );
  ctx.closePath();
  ctx.fill();

  // Spill puddle ellipse at the base
  const puddleY = h * 0.42;
  const pw = h * 0.60;
  const ph = h * 0.14;

  ctx.beginPath();
  ctx.moveTo(-pw, puddleY);
  ctx.bezierCurveTo(-pw, puddleY - ph, pw, puddleY - ph, pw, puddleY);
  ctx.bezierCurveTo(pw, puddleY + ph, -pw, puddleY + ph, -pw, puddleY);
  ctx.closePath();
  ctx.fill();

  // Scatter dots
  ctx.beginPath();
  ctx.arc(h * 0.10, h * 0.38, h * 0.055, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-h * 0.18, h * 0.45, h * 0.038, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
