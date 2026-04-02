import type { MapData } from "../types";

const WATER_COLOR = "#1a3a5c";
const LAND_COLOR = "#3a6b35";
const WALL_COLOR = "#8b7355";
const BRIDGE_COLOR = "#a08060";
const GRID_SIZE = 50;
const GRID_COLOR = "rgba(255,255,255,0.04)";

// Sprite images for map attributes
const ATTR_SPRITES: Record<string, HTMLImageElement> = {};
const ATTR_SPRITE_SIZE = 80; // render size in world units

function loadAttrSprite(type: string, url: string) {
  const img = new Image();
  img.src = url;
  ATTR_SPRITES[type] = img;
}

loadAttrSprite("albert-heijn", new URL("../assets/ah.png", import.meta.url).href);
loadAttrSprite("effendi", new URL("../assets/effendy.png", import.meta.url).href);
loadAttrSprite("herring-kiosk", new URL("../assets/herring.png", import.meta.url).href);
loadAttrSprite("bike-shop", new URL("../assets/bike.png", import.meta.url).href);

const ATTR_LABELS: Record<string, string> = {
  "albert-heijn": "AH",
  effendi: "EF",
  "herring-kiosk": "HK",
  "bike-shop": "BS",
};

const FLAG_POLE_HEIGHT = 32;
const FLAG_WIDTH = 18;
const FLAG_HEIGHT = 13;

function renderFlag(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  // Pole (horizontal, pointing right)
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + FLAG_POLE_HEIGHT, y);
  ctx.stroke();

  // Flag (rectangle hanging down from end of pole)
  ctx.fillStyle = color;
  ctx.fillRect(x + FLAG_POLE_HEIGHT, y + 1, FLAG_HEIGHT, FLAG_WIDTH);
}

const CORNER_RADIUS = 60;

function tracePath(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  const n = pts.length;
  if (n < 3) {
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    return;
  }

  // Start at midpoint of last edge so arcTo has clean entry
  ctx.moveTo((pts[n - 1].x + pts[0].x) / 2, (pts[n - 1].y + pts[0].y) / 2);

  for (let i = 0; i < n; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    ctx.arcTo(curr.x, curr.y, next.x, next.y, CORNER_RADIUS);
  }

  ctx.closePath();
}

export function renderMap(ctx: CanvasRenderingContext2D, map: MapData): void {
  const ws = map.worldSize;
  const extent = ws + 200;
  const t = Date.now() / 1000;

  // ─── Land ────────────────────────────────────────────
  // Base green with radial gradient for depth
  const landGrad = ctx.createRadialGradient(0, 0, 100, 0, 0, extent);
  landGrad.addColorStop(0, "#4a8b45");
  landGrad.addColorStop(0.5, "#3a6b35");
  landGrad.addColorStop(1, "#2a5525");
  ctx.fillStyle = landGrad;
  ctx.fillRect(-extent, -extent, extent * 2, extent * 2);

  // Grass texture — scattered dots
  ctx.fillStyle = "rgba(80,140,60,0.15)";
  for (let gx = -extent; gx < extent; gx += 30) {
    for (let gy = -extent; gy < extent; gy += 30) {
      const ox = Math.sin(gx * 0.1 + gy * 0.07) * 8;
      const oy = Math.cos(gx * 0.07 + gy * 0.1) * 8;
      ctx.beginPath();
      ctx.arc(gx + ox, gy + oy, 2 + Math.sin(gx + gy) * 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── Water channel ───────────────────────────────────
  if (map.outline.length >= 3) {
    ctx.save();

    // Water base fill
    ctx.beginPath();
    tracePath(ctx, map.outline);
    const waterGrad = ctx.createLinearGradient(-extent, -extent, extent, extent);
    waterGrad.addColorStop(0, "#1a3a5c");
    waterGrad.addColorStop(0.5, "#1e4a6e");
    waterGrad.addColorStop(1, "#162e4a");
    ctx.fillStyle = waterGrad;
    ctx.fill();

    // Cut out island
    if (map.island.length >= 3) {
      // Island gets its own land gradient
      ctx.beginPath();
      tracePath(ctx, map.island);
      const islandGrad = ctx.createRadialGradient(0, 0, 50, 0, 0, 600);
      islandGrad.addColorStop(0, "#4a8b45");
      islandGrad.addColorStop(1, "#3a6b35");
      ctx.fillStyle = islandGrad;
      ctx.fill();
    }

    // Clip to water channel for detail rendering
    ctx.beginPath();
    tracePath(ctx, map.outline);
    if (map.island.length >= 3) {
      tracePath(ctx, map.island);
    }
    ctx.clip("evenodd");

    // Animated wave ripples
    ctx.strokeStyle = "rgba(100,180,220,0.06)";
    ctx.lineWidth = 1.5;
    for (let y = -extent; y < extent; y += 25) {
      ctx.beginPath();
      for (let x = -extent; x < extent; x += 8) {
        const wy = y + Math.sin(x * 0.015 + t * 1.5 + y * 0.008) * 6;
        if (x === -extent) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }

    // Subtle light caustics
    ctx.fillStyle = "rgba(120,200,255,0.03)";
    for (let cx = -extent; cx < extent; cx += 60) {
      for (let cy = -extent; cy < extent; cy += 60) {
        const s = 15 + Math.sin(cx * 0.05 + cy * 0.04 + t * 0.8) * 10;
        if (s > 15) {
          ctx.beginPath();
          ctx.ellipse(
            cx + Math.sin(cy * 0.1 + t) * 10,
            cy + Math.cos(cx * 0.1 + t * 0.7) * 10,
            s, s * 0.6, cx * 0.1, 0, Math.PI * 2,
          );
          ctx.fill();
        }
      }
    }

    // Water depth — darker near the edges
    ctx.strokeStyle = "rgba(0,20,40,0.08)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    tracePath(ctx, map.outline);
    ctx.stroke();
    if (map.island.length >= 3) {
      ctx.beginPath();
      tracePath(ctx, map.island);
      ctx.stroke();
    }

    ctx.restore();

    // ─── Bank edges ──────────────────────────────────────
    // Outer bank — earthy edge with shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.strokeStyle = "#7a6040";
    ctx.lineWidth = 5;
    ctx.beginPath();
    tracePath(ctx, map.outline);
    ctx.stroke();
    ctx.restore();

    // Lighter inner line on outer bank
    ctx.strokeStyle = "rgba(160,130,90,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    tracePath(ctx, map.outline);
    ctx.stroke();

    // Island bank
    if (map.island.length >= 3) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.2)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.strokeStyle = "#7a6040";
      ctx.lineWidth = 5;
      ctx.beginPath();
      tracePath(ctx, map.island);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = "rgba(160,130,90,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      tracePath(ctx, map.island);
      ctx.stroke();
    }
  }

  // ─── Attributes ────────────────────────────────────────
  for (const attr of map.attributes) {
    renderAttributeMarker(ctx, attr.position.x, attr.position.y, attr.type);
  }

  // Checkpoint flags on each bank
  if (map.checkpoints) {
    for (const cp of map.checkpoints) {
      renderFlag(ctx, cp.a.x, cp.a.y, "#ff8844");
      renderFlag(ctx, cp.b.x, cp.b.y, "#ff8844");
    }
  }

  // Finish line (checkered pattern)
  if (map.finishLine) {
    const fl = map.finishLine;
    const dx = fl.b.x - fl.a.x;
    const dy = fl.b.y - fl.a.y;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const lineWidth = 12;
    const squareSize = lineWidth / 2;
    const numSquares = Math.ceil(len / squareSize);

    ctx.save();
    ctx.translate(fl.a.x, fl.a.y);
    ctx.rotate(angle);

    for (let i = 0; i < numSquares; i++) {
      for (let row = 0; row < 2; row++) {
        ctx.fillStyle = (i + row) % 2 === 0 ? "#ffffff" : "#111111";
        ctx.fillRect(
          i * squareSize,
          -lineWidth / 2 + row * squareSize,
          squareSize,
          squareSize,
        );
      }
    }

    ctx.restore();
  }

  // World boundary
  ctx.strokeStyle = "rgba(255,100,100,0.2)";
  ctx.lineWidth = 1;
  ctx.setLineDash([10, 10]);
  ctx.strokeRect(-ws, -ws, ws * 2, ws * 2);
  ctx.setLineDash([]);
}

/** Render bridges on top of boats (boats pass under) */
export function renderBridges(ctx: CanvasRenderingContext2D, map: MapData): void {
  for (const bridge of map.bridges) {
    renderBridge(
      ctx,
      bridge.start.x,
      bridge.start.y,
      bridge.end.x,
      bridge.end.y,
      bridge.width || 20,
    );
  }
}

export function renderBridge(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  const len = Math.hypot(dx, dy);
  const hw = width / 2;
  const railW = width * 0.15;

  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(angle);

  // Shadow underneath
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(3, -hw + 3, len, width);

  // Main deck — wood gradient
  const deckGrad = ctx.createLinearGradient(0, -hw, 0, hw);
  deckGrad.addColorStop(0, "#c49a6c");
  deckGrad.addColorStop(0.3, "#b8885a");
  deckGrad.addColorStop(0.7, "#a07848");
  deckGrad.addColorStop(1, "#c49a6c");
  ctx.fillStyle = deckGrad;
  ctx.fillRect(0, -hw, len, width);

  // Planks
  ctx.strokeStyle = "rgba(80,50,20,0.25)";
  ctx.lineWidth = 1;
  for (let x = 8; x < len; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, -hw + railW);
    ctx.lineTo(x, hw - railW);
    ctx.stroke();
  }

  // Wood grain lines (horizontal)
  ctx.strokeStyle = "rgba(60,35,10,0.08)";
  ctx.lineWidth = 0.5;
  for (let y = -hw + 4; y < hw; y += 5) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(len, y);
    ctx.stroke();
  }

  // Railings — left and right
  const railGrad = ctx.createLinearGradient(0, -hw, 0, -hw + railW);
  railGrad.addColorStop(0, "#8b6b3d");
  railGrad.addColorStop(1, "#6b4f2d");
  ctx.fillStyle = railGrad;
  ctx.fillRect(0, -hw, len, railW);
  ctx.fillRect(0, hw - railW, len, railW);

  // Railing posts
  ctx.fillStyle = "#6b4f2d";
  for (let x = 6; x < len; x += 20) {
    ctx.fillRect(x - 2, -hw - 2, 4, railW + 4);
    ctx.fillRect(x - 2, hw - railW - 2, 4, railW + 4);
  }

  // Highlight edge on top rail
  ctx.strokeStyle = "rgba(255,220,160,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -hw + 1);
  ctx.lineTo(len, -hw + 1);
  ctx.stroke();

  // Outer border
  ctx.strokeStyle = "#5a3f20";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, -hw, len, width);

  // Entry/exit arches
  for (const xPos of [0, len]) {
    ctx.fillStyle = "#6b4f2d";
    ctx.beginPath();
    ctx.arc(xPos, -hw - 2, 5, 0, Math.PI, true);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(xPos, hw + 2, 5, Math.PI, 0, true);
    ctx.fill();
  }

  ctx.restore();
}

export function renderAttributeMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: string,
): void {
  const sprite = ATTR_SPRITES[type];
  const s = ATTR_SPRITE_SIZE;

  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    // Scale to fit within ATTR_SPRITE_SIZE, maintaining aspect ratio
    const aspect = sprite.naturalWidth / sprite.naturalHeight;
    let w = s;
    let h = s;
    if (aspect > 1) { h = s / aspect; }
    else { w = s * aspect; }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 2); // 90 degrees — face right
    ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
    ctx.restore();
  } else {
    // Fallback: colored circle with label
    const label = ATTR_LABELS[type] || "??";
    ctx.fillStyle = "#888";
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
  }
}
