import type { MapData } from "../types";

const WATER_COLOR = "#1a3a5c";
const LAND_COLOR = "#3a6b35";
const WALL_COLOR = "#8b7355";
const BRIDGE_COLOR = "#a08060";
const GRID_SIZE = 50;
const GRID_COLOR = "rgba(255,255,255,0.04)";

const ATTR_COLORS: Record<string, string> = {
  "albert-heijn": "#00a0e4",
  effendi: "#e06030",
  "doctor-falafel": "#40a040",
  "herring-kiosk": "#c08030",
  "bike-shop": "#e04080",
  "cheese-shop": "#e0c020",
};

const ATTR_LABELS: Record<string, string> = {
  "albert-heijn": "AH",
  effendi: "EF",
  "doctor-falafel": "DF",
  "herring-kiosk": "HK",
  "bike-shop": "BS",
  "cheese-shop": "CS",
};

const FLAG_POLE_HEIGHT = 24;
const FLAG_WIDTH = 14;
const FLAG_HEIGHT = 10;

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

  // Green land fills everything
  ctx.fillStyle = LAND_COLOR;
  ctx.fillRect(-extent, -extent, extent * 2, extent * 2);

  // Water channel (inside outline, outside island)
  if (map.outline.length >= 3) {
    ctx.save();

    // Water fill
    ctx.beginPath();
    tracePath(ctx, map.outline);
    ctx.fillStyle = WATER_COLOR;
    ctx.fill();

    // Cut out island (fill green on top)
    if (map.island.length >= 3) {
      ctx.fillStyle = LAND_COLOR;
      ctx.beginPath();
      tracePath(ctx, map.island);
      ctx.fill();
    }

    // Water grid clipped to the channel
    ctx.beginPath();
    tracePath(ctx, map.outline);
    if (map.island.length >= 3) {
      tracePath(ctx, map.island);
    }
    ctx.clip("evenodd");

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let x = -extent; x <= extent; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, -extent);
      ctx.lineTo(x, extent);
      ctx.stroke();
    }
    for (let y = -extent; y <= extent; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(-extent, y);
      ctx.lineTo(extent, y);
      ctx.stroke();
    }

    ctx.restore();

    // Wall strokes
    ctx.strokeStyle = WALL_COLOR;
    ctx.lineWidth = 4;
    ctx.beginPath();
    tracePath(ctx, map.outline);
    ctx.stroke();

    if (map.island.length >= 3) {
      ctx.beginPath();
      tracePath(ctx, map.island);
      ctx.stroke();
    }
  }

  // Attributes (on land, rendered below bridges)
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
  ctx.strokeStyle = "rgba(255,100,100,0.3)";
  ctx.lineWidth = 2;
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

  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(angle);
  ctx.fillStyle = BRIDGE_COLOR;
  ctx.fillRect(0, -width / 2, len, width);
  ctx.strokeStyle = WALL_COLOR;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, -width / 2, len, width);
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  for (let x = 10; x < len; x += 15) {
    ctx.beginPath();
    ctx.moveTo(x, -width / 2);
    ctx.lineTo(x, width / 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function renderAttributeMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: string,
): void {
  const color = ATTR_COLORS[type] || "#888";
  const label = ATTR_LABELS[type] || "??";

  ctx.fillStyle = color;
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
