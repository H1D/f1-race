import type { TrackBounds } from "../types";

const WATER_COLOR = "#1a3a5c";
const ISLAND_COLOR = "#3a6b35";
const WALL_COLOR = "#8b7355";
const GRID_SIZE = 50;
const GRID_COLOR = "rgba(255,255,255,0.04)";

export function renderBackground(ctx: CanvasRenderingContext2D, track: TrackBounds): void {
  const o = track.outer;
  const i = track.inner;

  // Water fill (full outer area)
  ctx.fillStyle = WATER_COLOR;
  ctx.fillRect(o.minX - 200, o.minY - 200, o.maxX - o.minX + 400, o.maxY - o.minY + 400);

  // Subtle water grid for sense of movement
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  for (let x = o.minX - 200; x <= o.maxX + 200; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, o.minY - 200);
    ctx.lineTo(x, o.maxY + 200);
    ctx.stroke();
  }
  for (let y = o.minY - 200; y <= o.maxY + 200; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(o.minX - 200, y);
    ctx.lineTo(o.maxX + 200, y);
    ctx.stroke();
  }

  // Island fill
  ctx.fillStyle = ISLAND_COLOR;
  ctx.fillRect(i.minX, i.minY, i.maxX - i.minX, i.maxY - i.minY);

  // Walls — outer boundary
  ctx.strokeStyle = WALL_COLOR;
  ctx.lineWidth = 4;
  ctx.strokeRect(o.minX, o.minY, o.maxX - o.minX, o.maxY - o.minY);

  // Walls — inner island boundary
  ctx.strokeRect(i.minX, i.minY, i.maxX - i.minX, i.maxY - i.minY);
}
