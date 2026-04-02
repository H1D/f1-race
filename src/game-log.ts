export type LogCategory = "pickup" | "effect" | "flood" | "spawn" | "system";

export interface LogEntry {
  time: number; // elapsed game time in seconds
  message: string;
  category: LogCategory;
  color: string;
}

const CATEGORY_COLORS: Record<LogCategory, string> = {
  pickup: "#8cf",
  effect: "#fc8",
  flood: "#8bf",
  spawn: "#8f8",
  system: "#aaa",
};

const MAX_ENTRIES = 50;
const VISIBLE_ENTRIES = 8;
const FADE_DURATION = 4; // seconds before an entry starts fading
const FADE_OUT = 2; // seconds to fully fade after FADE_DURATION

export interface GameLog {
  entries: LogEntry[];
  visible: boolean; // debug toggle: show persistent log
  elapsedTime: number;
  log(message: string, category: LogCategory): void;
}

export function createGameLog(): GameLog {
  const entries: LogEntry[] = [];

  const gameLog: GameLog = {
    entries,
    visible: false,
    elapsedTime: 0,

    log(message: string, category: LogCategory) {
      entries.push({
        time: gameLog.elapsedTime,
        message,
        category,
        color: CATEGORY_COLORS[category],
      });

      // Trim old entries
      if (entries.length > MAX_ENTRIES) {
        entries.splice(0, entries.length - MAX_ENTRIES);
      }
    },
  };

  return gameLog;
}

export function renderGameLog(
  ctx: CanvasRenderingContext2D,
  log: GameLog,
  screenWidth: number,
  screenHeight: number,
): void {
  if (log.entries.length === 0) return;

  const now = log.elapsedTime;
  const lineHeight = 18;
  const padding = 12;
  const x = padding;

  ctx.save();
  ctx.font = "12px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";

  if (log.visible) {
    // Debug mode: show all recent entries in a scrollable-style box
    const shown = log.entries.slice(-VISIBLE_ENTRIES);
    const boxHeight = shown.length * lineHeight + padding * 2;
    const boxY = screenHeight - boxHeight - padding;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(x - 4, boxY, screenWidth * 0.45, boxHeight);

    // Header
    ctx.fillStyle = "#666";
    ctx.font = "10px monospace";
    ctx.textBaseline = "top";
    ctx.fillText(`event log (${log.entries.length} total)`, x, boxY + 4);
    ctx.font = "12px monospace";
    ctx.textBaseline = "bottom";

    for (let i = 0; i < shown.length; i++) {
      const entry = shown[i]!;
      const y = boxY + padding + 10 + i * lineHeight;
      const age = now - entry.time;

      // Timestamp
      ctx.fillStyle = "#555";
      ctx.fillText(formatTime(entry.time), x, y);

      // Message
      const alpha = log.visible ? 0.9 : computeAlpha(age);
      ctx.fillStyle = entry.color;
      ctx.globalAlpha = alpha;
      ctx.fillText(entry.message, x + 58, y);
      ctx.globalAlpha = 1;
    }
  } else {
    // Normal mode: show recent entries with fade-out
    const recent = log.entries
      .filter((e) => now - e.time < FADE_DURATION + FADE_OUT)
      .slice(-VISIBLE_ENTRIES);

    if (recent.length === 0) {
      ctx.restore();
      return;
    }

    for (let i = 0; i < recent.length; i++) {
      const entry = recent[i]!;
      const age = now - entry.time;
      const alpha = computeAlpha(age);
      if (alpha <= 0) continue;

      const y = screenHeight - padding - (recent.length - 1 - i) * lineHeight;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = entry.color;
      ctx.fillText(entry.message, x, y);
    }

    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function computeAlpha(age: number): number {
  if (age < FADE_DURATION) return 0.85;
  if (age > FADE_DURATION + FADE_OUT) return 0;
  return 0.85 * (1 - (age - FADE_DURATION) / FADE_OUT);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
