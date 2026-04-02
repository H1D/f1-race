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
  // Rich layered ground
  const landGrad = ctx.createRadialGradient(0, 0, 100, 0, 0, extent);
  landGrad.addColorStop(0, "#5a9b52");
  landGrad.addColorStop(0.3, "#4a8b45");
  landGrad.addColorStop(0.6, "#3a7035");
  landGrad.addColorStop(1, "#2a5525");
  ctx.fillStyle = landGrad;
  ctx.fillRect(-extent, -extent, extent * 2, extent * 2);

  // Grass clumps — varied sizes and shades
  for (let gx = -extent; gx < extent; gx += 22) {
    for (let gy = -extent; gy < extent; gy += 22) {
      const seed = Math.sin(gx * 0.13 + gy * 0.09) * 43758.5453;
      const r = seed - Math.floor(seed);
      const ox = Math.sin(gx * 0.1 + gy * 0.07) * 10;
      const oy = Math.cos(gx * 0.07 + gy * 0.1) * 10;
      const size = 1.5 + r * 3;
      const shade = Math.floor(60 + r * 40);
      ctx.fillStyle = `rgba(${shade},${shade + 50},${Math.floor(shade * 0.6)},0.12)`;
      ctx.beginPath();
      ctx.arc(gx + ox, gy + oy, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Dirt patches near banks — brownish spots
  for (let gx = -extent; gx < extent; gx += 80) {
    for (let gy = -extent; gy < extent; gy += 80) {
      const seed = Math.sin(gx * 0.07 + gy * 0.11) * 12345.6789;
      const r = seed - Math.floor(seed);
      if (r > 0.7) {
        ctx.fillStyle = "rgba(120,90,50,0.06)";
        ctx.beginPath();
        ctx.ellipse(gx, gy, 15 + r * 20, 10 + r * 15, r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ─── Water channel ───────────────────────────────────
  if (map.outline.length >= 3) {
    ctx.save();

    // Water base — deep blue with subtle gradient
    ctx.beginPath();
    tracePath(ctx, map.outline);
    const waterGrad = ctx.createRadialGradient(0, 0, 50, 0, 0, extent);
    waterGrad.addColorStop(0, "#1e4a70");
    waterGrad.addColorStop(0.4, "#1a3d60");
    waterGrad.addColorStop(1, "#122a45");
    ctx.fillStyle = waterGrad;
    ctx.fill();

    // Cut out island with matching land
    if (map.island.length >= 3) {
      ctx.beginPath();
      tracePath(ctx, map.island);
      const islandGrad = ctx.createRadialGradient(0, 0, 50, 0, 0, 600);
      islandGrad.addColorStop(0, "#5a9b52");
      islandGrad.addColorStop(0.5, "#4a8b45");
      islandGrad.addColorStop(1, "#3a7035");
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

    // Layer 1: flowing wave ripples (two layers for depth)
    for (const [speed, spacing, amp, alpha] of [[1.5, 20, 5, 0.05], [0.8, 35, 8, 0.03]] as const) {
      ctx.strokeStyle = `rgba(100,190,230,${alpha})`;
      ctx.lineWidth = 1.2;
      for (let y = -extent; y < extent; y += spacing) {
        ctx.beginPath();
        for (let x = -extent; x < extent; x += 6) {
          const wy = y + Math.sin(x * 0.012 + t * speed + y * 0.006) * amp
                       + Math.sin(x * 0.025 + t * speed * 0.7) * amp * 0.4;
          if (x === -extent) ctx.moveTo(x, wy);
          else ctx.lineTo(x, wy);
        }
        ctx.stroke();
      }
    }

    // Layer 2: light caustics — shimmering patches
    for (let cx = -extent; cx < extent; cx += 50) {
      for (let cy = -extent; cy < extent; cy += 50) {
        const s = 12 + Math.sin(cx * 0.04 + cy * 0.035 + t * 0.9) * 10;
        if (s > 14) {
          const a = (s - 14) * 0.006;
          ctx.fillStyle = `rgba(140,210,255,${a})`;
          ctx.beginPath();
          ctx.ellipse(
            cx + Math.sin(cy * 0.08 + t * 1.1) * 12,
            cy + Math.cos(cx * 0.08 + t * 0.6) * 12,
            s, s * 0.5, cx * 0.08 + t * 0.2, 0, Math.PI * 2,
          );
          ctx.fill();
        }
      }
    }

    // Layer 3: specular highlights — bright glints
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let cx = -extent; cx < extent; cx += 70) {
      for (let cy = -extent; cy < extent; cy += 70) {
        const flash = Math.sin(cx * 0.06 + cy * 0.05 + t * 2.5);
        if (flash > 0.85) {
          ctx.beginPath();
          ctx.arc(cx + Math.sin(cy + t) * 5, cy + Math.cos(cx + t) * 5, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Depth shading along banks — darker water at edges
    ctx.strokeStyle = "rgba(0,15,35,0.12)";
    ctx.lineWidth = 12;
    ctx.beginPath();
    tracePath(ctx, map.outline);
    ctx.stroke();
    if (map.island.length >= 3) {
      ctx.beginPath();
      tracePath(ctx, map.island);
      ctx.stroke();
    }
    // Second softer edge
    ctx.strokeStyle = "rgba(0,15,35,0.05)";
    ctx.lineWidth = 25;
    ctx.beginPath();
    tracePath(ctx, map.outline);
    ctx.stroke();
    if (map.island.length >= 3) {
      ctx.beginPath();
      tracePath(ctx, map.island);
      ctx.stroke();
    }

    ctx.restore();

    // ─── Bank edges — layered stone/earth embankment ─────
    for (const poly of [map.outline, ...(map.island.length >= 3 ? [map.island] : [])]) {
      // Layer 1: dark base shadow
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      ctx.strokeStyle = "#4a3520";
      ctx.lineWidth = 7;
      ctx.beginPath();
      tracePath(ctx, poly);
      ctx.stroke();
      ctx.restore();

      // Layer 2: stone wall
      ctx.strokeStyle = "#8a7050";
      ctx.lineWidth = 5;
      ctx.beginPath();
      tracePath(ctx, poly);
      ctx.stroke();

      // Layer 3: top highlight (weathered stone)
      ctx.strokeStyle = "rgba(180,160,120,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      tracePath(ctx, poly);
      ctx.stroke();

      // Layer 4: moss/grass edge on land side
      ctx.strokeStyle = "rgba(70,120,50,0.25)";
      ctx.lineWidth = 3;
      ctx.setLineDash([3, 8]);
      ctx.beginPath();
      tracePath(ctx, poly);
      ctx.stroke();
      ctx.setLineDash([]);
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

  // Shadow on water underneath
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  const shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(-shadowBlur, -hw + shadowBlur);
  ctx.lineTo(len + shadowBlur, -hw + shadowBlur);
  ctx.lineTo(len + shadowBlur, hw + shadowBlur);
  ctx.lineTo(-shadowBlur, hw + shadowBlur);
  ctx.closePath();
  ctx.fill();

  // Stone support pillars at intervals
  ctx.fillStyle = "#6a5a48";
  const pillarSpacing = Math.max(40, len / 4);
  for (let px = pillarSpacing / 2; px < len; px += pillarSpacing) {
    ctx.fillRect(px - 4, -hw - 3, 8, width + 6);
    ctx.fillStyle = "#7a6a55";
    ctx.fillRect(px - 3, -hw - 2, 6, width + 4);
    ctx.fillStyle = "#6a5a48";
  }

  // Main deck — warm wood gradient with age variation
  const deckGrad = ctx.createLinearGradient(0, -hw, 0, hw);
  deckGrad.addColorStop(0, "#d4a878");
  deckGrad.addColorStop(0.2, "#c49a6c");
  deckGrad.addColorStop(0.5, "#b08555");
  deckGrad.addColorStop(0.8, "#c49a6c");
  deckGrad.addColorStop(1, "#d4a878");
  ctx.fillStyle = deckGrad;
  ctx.fillRect(0, -hw, len, width);

  // Plank lines with slight irregularity
  ctx.strokeStyle = "rgba(70,40,15,0.2)";
  ctx.lineWidth = 1;
  for (let x = 6; x < len; x += 10) {
    const wobble = Math.sin(x * 0.3) * 0.5;
    ctx.beginPath();
    ctx.moveTo(x + wobble, -hw + railW + 1);
    ctx.lineTo(x - wobble, hw - railW - 1);
    ctx.stroke();
  }

  // Wood grain
  ctx.strokeStyle = "rgba(50,30,10,0.06)";
  ctx.lineWidth = 0.5;
  for (let y = -hw + 3; y < hw; y += 3) {
    ctx.beginPath();
    for (let x = 0; x < len; x += 5) {
      const gy = y + Math.sin(x * 0.2 + y * 0.5) * 0.5;
      if (x === 0) ctx.moveTo(x, gy);
      else ctx.lineTo(x, gy);
    }
    ctx.stroke();
  }

  // Railings — ornate iron style
  const railH = railW * 1.3;

  // Rail base bars
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(0, -hw - 1, len, railH);
  ctx.fillRect(0, hw - railH + 1, len, railH);

  // Rail highlight
  ctx.fillStyle = "rgba(120,120,120,0.3)";
  ctx.fillRect(0, -hw - 1, len, 1);
  ctx.fillRect(0, hw, len, 1);

  // Ornamental posts with tops
  for (let x = 0; x <= len; x += 16) {
    // Post
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(x - 1.5, -hw - 3, 3, railH + 4);
    ctx.fillRect(x - 1.5, hw - railH - 1, 3, railH + 4);
    // Post cap (circle)
    ctx.fillStyle = "#4a4a4a";
    ctx.beginPath();
    ctx.arc(x, -hw - 3.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, hw + 3.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lanterns at each end
  for (const lx of [8, len - 8]) {
    // Lantern body
    ctx.fillStyle = "#d4a030";
    ctx.fillRect(lx - 2, -hw - 7, 4, 4);
    ctx.fillRect(lx - 2, hw + 3, 4, 4);
    // Glow
    ctx.fillStyle = "rgba(255,200,80,0.15)";
    ctx.beginPath();
    ctx.arc(lx, -hw - 5, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lx, hw + 5, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Deck edge border
  ctx.strokeStyle = "rgba(60,40,20,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, -hw, len, width);

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
