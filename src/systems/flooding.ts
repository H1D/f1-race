import type { Entity, MapData, Vec2 } from "../types";
import { isOnWater } from "../map/map-data";
import { pushIntoPolygon, nearestPointOnSegment } from "../map/geometry";

export type FloodState = "idle" | "flooding" | "recovering";

export interface FloodSystem {
  enabled: boolean;
  cycleInterval: number;
  floodDuration: number;
  penaltyDuration: number;
  riseSpeed: number;
  fallSpeed: number;
  affectObjects: boolean;

  state: FloodState;
  timer: number;
  waterLevel: number; // 0 = normal, 1 = fully flooded
  penaltyChecked: boolean; // true once we've checked boats after this flood
}

export interface BoatPenalty {
  active: boolean;
  remaining: number; // seconds left
}

export function createFloodSystem(): FloodSystem {
  return {
    enabled: true,
    cycleInterval: 20,
    floodDuration: 5,
    penaltyDuration: 1,
    riseSpeed: 1.5,
    fallSpeed: 1.0,
    affectObjects: true,

    state: "idle",
    timer: 0,
    waterLevel: 0,
    penaltyChecked: false,
  };
}

export function createBoatPenalty(): BoatPenalty {
  return { active: false, remaining: 0 };
}

export function updateFlood(flood: FloodSystem, dt: number): void {
  if (!flood.enabled) {
    flood.state = "idle";
    flood.waterLevel = Math.max(0, flood.waterLevel - flood.fallSpeed * dt);
    flood.timer = 0;
    return;
  }

  flood.timer += dt;

  switch (flood.state) {
    case "idle":
      if (flood.timer >= flood.cycleInterval) {
        flood.state = "flooding";
        flood.timer = 0;
      }
      flood.waterLevel = Math.max(0, flood.waterLevel - flood.fallSpeed * dt);
      break;

    case "flooding":
      flood.waterLevel = Math.min(1, flood.waterLevel + flood.riseSpeed * dt);
      flood.penaltyChecked = false;
      if (flood.timer >= flood.floodDuration) {
        flood.state = "recovering";
        flood.timer = 0;
      }
      break;

    case "recovering":
      flood.waterLevel = Math.max(0, flood.waterLevel - flood.fallSpeed * dt);
      if (flood.waterLevel <= 0) {
        flood.waterLevel = 0;
        flood.state = "idle";
        flood.timer = 0;
      }
      break;
  }
}

export function isFlooding(flood: FloodSystem): boolean {
  return flood.waterLevel > 0.3;
}

/**
 * Check if a boat should receive a penalty after flood ends.
 * Call once per boat when water recedes past threshold.
 */
export function checkFloodPenalty(
  entity: Entity,
  map: MapData,
  flood: FloodSystem,
  penalty: BoatPenalty,
): void {
  // Only check once per flood cycle, when water drops below threshold
  if (flood.state !== "recovering") return;
  if (flood.waterLevel > 0.3) return;
  if (flood.penaltyChecked) return;
  if (penalty.active) return;

  const pos = entity.transform.pos;
  if (!isOnWater(pos, map)) {
    // Boat is on land — start penalty!
    penalty.active = true;
    penalty.remaining = flood.penaltyDuration;
  }
}

/** Mark penalty check as done (call once after checking all boats) */
export function markPenaltyChecked(flood: FloodSystem): void {
  if (flood.state === "recovering" && flood.waterLevel <= 0.3) {
    flood.penaltyChecked = true;
  }
}

/**
 * Update a boat's penalty timer. While active: freeze the boat.
 * When penalty expires: snap boat to nearest water.
 */
export function updateBoatPenalty(
  entity: Entity,
  map: MapData,
  penalty: BoatPenalty,
  dt: number,
): void {
  if (!penalty.active) return;

  penalty.remaining -= dt;

  // Freeze the boat during penalty
  entity.velocity.x = 0;
  entity.velocity.y = 0;
  entity.velocity.angular = 0;
  if (entity.motor) {
    entity.motor.voltage = 0;
    entity.motor.targetVoltage = 0;
  }

  if (penalty.remaining <= 0) {
    penalty.active = false;
    penalty.remaining = 0;

    // Snap to nearest valid water + align to river direction
    const pos = entity.transform.pos;
    if (!isOnWater(pos, map)) {
      const pushed = pushIntoPolygon(pos, map.outline);
      if (pushed) {
        pos.x = pushed.x;
        pos.y = pushed.y;
        entity.transform.prevPos.x = pos.x;
        entity.transform.prevPos.y = pos.y;

        // Find the nearest outline edge and align boat to its tangent
        const outline = map.outline;
        let bestDistSq = Infinity;
        let bestEdgeI = 0;
        let bestEdgeJ = 0;
        for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
          const np = nearestPointOnSegment(pos, outline[j], outline[i]);
          const dSq = (pos.x - np.x) ** 2 + (pos.y - np.y) ** 2;
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            bestEdgeI = i;
            bestEdgeJ = j;
          }
        }
        // Edge tangent direction
        const edgeDx = outline[bestEdgeI].x - outline[bestEdgeJ].x;
        const edgeDy = outline[bestEdgeI].y - outline[bestEdgeJ].y;
        const angle = Math.atan2(edgeDy, edgeDx);
        entity.transform.angle = angle;
        entity.transform.prevAngle = angle;
      }
    }
  }
}

/** Render the flood water overlay in SCREEN SPACE — rises from bottom, recedes downward */
export function renderFloodScreen(
  ctx: CanvasRenderingContext2D,
  flood: FloodSystem,
  screenW: number,
  screenH: number,
): void {
  if (flood.waterLevel <= 0) return;

  // Water rises from bottom of screen to top
  const coveredH = screenH * flood.waterLevel;
  const waterTop = screenH - coveredH;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, waterTop, screenW, coveredH);
  ctx.clip();

  // Water fill — semi-transparent so boats are visible through it
  ctx.fillStyle = "rgba(26, 58, 92, 0.35)";
  ctx.fillRect(0, 0, screenW, screenH);

  // Wave lines
  const t = Date.now() / 1000;
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let y = waterTop; y < screenH; y += 30) {
    ctx.beginPath();
    for (let x = 0; x < screenW; x += 8) {
      const wy = y + Math.sin(x * 0.03 + t * 2 + y * 0.01) * 4;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }

  // Leading edge foam line
  ctx.strokeStyle = "rgba(200,230,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < screenW; x += 6) {
    const wy = waterTop + Math.sin(x * 0.04 + t * 3) * 3;
    if (x === 0) ctx.moveTo(x, wy);
    else ctx.lineTo(x, wy);
  }
  ctx.stroke();

  ctx.restore();
}

/** Render lifted attribute markers during flood */
export function renderFloodedAttributes(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  flood: FloodSystem,
): void {
  if (!flood.affectObjects || flood.waterLevel <= 0.1) return;

  const t = Date.now() / 800;
  const bobOffset = Math.sin(t) * 3 * flood.waterLevel;

  for (const attr of map.attributes) {
    // Shadow
    ctx.fillStyle = `rgba(0,0,0,${0.2 * flood.waterLevel})`;
    ctx.beginPath();
    ctx.ellipse(attr.position.x, attr.position.y + 4, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lifted marker
    ctx.save();
    ctx.translate(0, -8 * flood.waterLevel + bobOffset);
    // The actual attribute is already rendered by renderMap, so we just
    // need to add a visual "lift" effect — a highlight ring
    ctx.strokeStyle = `rgba(100,200,255,${0.4 * flood.waterLevel})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(attr.position.x, attr.position.y, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ─── Settings panel ────────────────────────────────────

export function createFloodSettingsPanel(flood: FloodSystem): HTMLElement {
  const panel = document.createElement("div");
  panel.id = "flood-settings";
  panel.innerHTML = `
    <style>
      #flood-settings {
        position: fixed; top: 10px; left: 90px;
        background: rgba(0,0,0,0.85); color: #eee;
        padding: 12px 16px; border-radius: 8px;
        font: 12px/1.6 monospace; min-width: 220px;
        user-select: none; z-index: 100;
        display: none;
      }
      #flood-settings h3 { margin: 0 0 8px; font-size: 13px; color: #4af; }
      #flood-settings .row { display: flex; align-items: center; gap: 6px; margin: 4px 0; }
      #flood-settings label { flex: 1; white-space: nowrap; }
      #flood-settings input[type=range] { width: 80px; }
      #flood-settings .val { width: 36px; text-align: right; color: #8cf; }
      #flood-settings button {
        background: #333; color: #eee; border: 1px solid #555;
        padding: 3px 10px; border-radius: 4px; cursor: pointer;
        font: 11px monospace; margin-top: 6px;
      }
      #flood-settings button:hover { background: #444; }
      #flood-settings button.active { background: #1a6b3a; border-color: #2a8b4a; }
      #flood-toggle-btn {
        position: fixed; top: 10px; left: 90px;
        background: rgba(0,0,0,0.6); color: #4af; border: 1px solid #555;
        padding: 6px 10px; border-radius: 6px; cursor: pointer;
        font: 12px monospace; z-index: 101;
      }
    </style>
    <h3>flood settings</h3>
  `;

  // Enable toggle
  const enableRow = document.createElement("div");
  enableRow.className = "row";
  const enableLabel = document.createElement("label");
  enableLabel.textContent = "Enabled";
  const enableBtn = document.createElement("button");
  enableBtn.textContent = flood.enabled ? "ON" : "OFF";
  enableBtn.className = flood.enabled ? "active" : "";
  enableBtn.addEventListener("click", () => {
    flood.enabled = !flood.enabled;
    enableBtn.textContent = flood.enabled ? "ON" : "OFF";
    enableBtn.className = flood.enabled ? "active" : "";
  });
  enableRow.append(enableLabel, enableBtn);
  panel.appendChild(enableRow);

  // Sliders
  const sliders: { label: string; key: keyof FloodSystem; min: number; max: number; step: number }[] = [
    { label: "Cycle (s)", key: "cycleInterval", min: 5, max: 60, step: 1 },
    { label: "Duration (s)", key: "floodDuration", min: 1, max: 15, step: 0.5 },
    { label: "Penalty (s)", key: "penaltyDuration", min: 1, max: 10, step: 0.5 },
    { label: "Rise Speed", key: "riseSpeed", min: 0.3, max: 5, step: 0.1 },
    { label: "Fall Speed", key: "fallSpeed", min: 0.3, max: 5, step: 0.1 },
  ];

  for (const s of sliders) {
    const row = document.createElement("div");
    row.className = "row";
    const label = document.createElement("label");
    label.textContent = s.label;
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(s.min);
    input.max = String(s.max);
    input.step = String(s.step);
    input.value = String(flood[s.key]);
    const val = document.createElement("span");
    val.className = "val";
    val.textContent = String(flood[s.key]);
    input.addEventListener("input", () => {
      (flood as any)[s.key] = parseFloat(input.value);
      val.textContent = input.value;
    });
    row.append(label, input, val);
    panel.appendChild(row);
  }

  // Affect objects toggle
  const objRow = document.createElement("div");
  objRow.className = "row";
  const objLabel = document.createElement("label");
  objLabel.textContent = "Lift Objects";
  const objBtn = document.createElement("button");
  objBtn.textContent = flood.affectObjects ? "ON" : "OFF";
  objBtn.className = flood.affectObjects ? "active" : "";
  objBtn.addEventListener("click", () => {
    flood.affectObjects = !flood.affectObjects;
    objBtn.textContent = flood.affectObjects ? "ON" : "OFF";
    objBtn.className = flood.affectObjects ? "active" : "";
  });
  objRow.append(objLabel, objBtn);
  panel.appendChild(objRow);

  // Manual trigger
  const triggerBtn = document.createElement("button");
  triggerBtn.textContent = "Flood Now";
  triggerBtn.style.marginRight = "6px";
  triggerBtn.addEventListener("click", () => {
    flood.state = "flooding";
    flood.timer = 0;
  });
  panel.appendChild(triggerBtn);

  // Toggle button
  let visible = false;
  const toggle = document.createElement("button");
  toggle.id = "flood-toggle-btn";
  toggle.textContent = "Flood";
  toggle.addEventListener("click", () => {
    visible = !visible;
    panel.style.display = visible ? "block" : "none";
    toggle.style.display = visible ? "none" : "block";
  });

  document.body.appendChild(toggle);
  document.body.appendChild(panel);
  return panel;
}
