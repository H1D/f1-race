import type { DualInput, GameContext, GameState } from "../types";
import { getCurrentMap } from "../map/map-data";
import { renderMap, renderBridges } from "../map/map-renderer";
import { RacingState } from "./racing-state";
import { UI } from "../ui-text";

const P1_COLOR  = "#e04040";
const P2_COLOR  = "#e0c040";
const KEY_BG    = "rgba(255,255,255,0.12)";
const KEY_BORDER = "rgba(255,255,255,0.45)";

/** Draw a single keycap centered at (x, y). */
function drawKey(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  label: string,
  size = 36,
): void {
  const r = 6;
  const x = cx - size / 2;
  const y = cy - size / 2;

  ctx.fillStyle = KEY_BG;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, r);
  ctx.fill();

  ctx.strokeStyle = KEY_BORDER;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, r);
  ctx.stroke();

  // bottom-edge shadow for depth
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + size - 4, size - 4, 4, [0, 0, r, r]);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${label.length > 1 ? 13 : 16}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy + 1);
}

/** Draw a player control panel. */
function drawPlayerPanel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  playerLabel: string,
  color: string,
  upKey: string,
  leftKey: string,
  downKey: string,
  rightKey: string,
  itemKey: string,
  itemKeyWidth: number,
): void {
  const panelW = 190;
  const panelH = 240;
  const px = cx - panelW / 2;
  const py = cy - panelH / 2;
  const r = 10;

  // Panel background
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.roundRect(px, py, panelW, panelH, r);
  ctx.fill();

  // Colored top border accent
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(px, py, panelW, panelH, r);
  ctx.stroke();

  // Player label header
  ctx.fillStyle = color;
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(playerLabel, cx, py + 24);

  // Divider
  ctx.strokeStyle = `${color}44`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 16, py + 42);
  ctx.lineTo(px + panelW - 16, py + 42);
  ctx.stroke();

  // WASD / arrow layout
  const keySize = 38;
  const gap = 4;
  const rowY1 = py + 78;              // top row (W / ↑)
  const rowY2 = rowY1 + keySize + gap; // bottom row (A S D / ← ↓ →)

  drawKey(ctx, cx,                   rowY1, upKey,    keySize);
  drawKey(ctx, cx - keySize - gap,   rowY2, leftKey,  keySize);
  drawKey(ctx, cx,                   rowY2, downKey,  keySize);
  drawKey(ctx, cx + keySize + gap,   rowY2, rightKey, keySize);

  // Divider
  ctx.strokeStyle = `${color}33`;
  ctx.lineWidth = 1;
  const divY = rowY2 + keySize / 2 + 14;
  ctx.beginPath();
  ctx.moveTo(px + 16, divY);
  ctx.lineTo(px + panelW - 16, divY);
  ctx.stroke();

  // Item key row
  const itemY = divY + 26;
  const itemKeySize = itemKeyWidth;
  drawKey(ctx, cx - panelW / 2 + 28 + itemKeySize / 2, itemY, itemKey, itemKeySize);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "13px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("use item", cx - panelW / 2 + 28 + itemKeySize + 8, itemY + 1);
}

export class MenuState implements GameState {
  private gameCtx!: GameContext;
  private spaceWasUp = false;
  private time = 0;

  enter(ctx: GameContext) {
    this.gameCtx = ctx;
    this.spaceWasUp = false;
    this.time = 0;
  }

  exit() {}

  update(dt: number, input: DualInput) {
    this.time += dt;
    const anyThrottle = input.player1.throttle || input.player2.throttle;
    if (!anyThrottle) this.spaceWasUp = true;
    if (this.spaceWasUp && anyThrottle) {
      this.gameCtx.switchState(new RacingState());
    }
  }

  render(ctx: CanvasRenderingContext2D, _alpha: number) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const map = getCurrentMap();

    // Slow orbiting camera over the map
    const camAngle = this.time * 0.15;
    const camX = Math.cos(camAngle) * 200;
    const camY = Math.sin(camAngle) * 150;
    const zoom = 0.35 + Math.sin(this.time * 0.1) * 0.05;

    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);
    renderMap(ctx, map);
    renderBridges(ctx, map);
    ctx.restore();

    // Dark overlay
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, w, h);

    // ── Title ────────────────────────────────────────────
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const pulse = 1 + Math.sin(this.time * 3) * 0.025;
    ctx.font = `bold ${Math.round(60 * pulse)}px monospace`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(UI.menu.title, w / 2, h * 0.13);

    ctx.font = "16px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("amsterdam canal boat racing", w / 2, h * 0.21);

    // ── Player panels ─────────────────────────────────────
    const panelY = h * 0.52;
    const gap = 30;
    const panelW = 190;
    drawPlayerPanel(
      ctx,
      w / 2 - panelW / 2 - gap,
      panelY,
      "P1",
      P1_COLOR,
      "W", "A", "S", "D",
      "Q", 38,
    );
    drawPlayerPanel(
      ctx,
      w / 2 + panelW / 2 + gap,
      panelY,
      "P2",
      P2_COLOR,
      "↑", "←", "↓", "→",
      "⇧R", 46,
    );

    // ── Start prompt ──────────────────────────────────────
    ctx.font = "15px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.textAlign = "center";
    ctx.fillText(UI.menu.startPrompt, w / 2, h * 0.83);

    if (Math.sin(this.time * 4) > 0) {
      ctx.font = "bold 18px monospace";
      ctx.fillStyle = "rgba(100,200,255,0.75)";
      ctx.fillText(">>> START <<<", w / 2, h * 0.90);
    }

    ctx.textBaseline = "alphabetic";
  }
}
