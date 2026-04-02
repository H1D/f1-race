import { boatParams } from "./boat/boat";

interface Slider {
  key: keyof typeof boatParams;
  label: string;
  min: number;
  max: number;
  step: number;
}

interface Preset {
  name: string;
  params: typeof boatParams;
}

// Speedboat: snappy arcade racer. High thrust + high lateral drag
// keeps it glued to its heading even at speed. Crank turn torque
// so you can whip around corners without waiting.
// Best for: racing, action gameplay
const speedboat: Preset = {
  name: "Speedboat",
  params: {
    forwardDrag: 0.02,
    lateralDrag: 1.1,
    angularDamping: 0.55,
    thrustForce: 14,
    turnTorque: 5.5,
    turnSpeedReference: 3.5,
    maxSpeed: 18,
  },
};

// Tugboat: heavy and deliberate. Very low forward drag gives a
// long coast — you commit to your momentum. Low turn torque +
// high angular damping means you plan turns ahead of time.
// Best for: sim feel, cargo/delivery gameplay
const tugboat: Preset = {
  name: "Tugboat",
  params: {
    forwardDrag: 0.008,
    lateralDrag: 1.4,
    angularDamping: 0.65,
    thrustForce: 4,
    turnTorque: 1.8,
    turnSpeedReference: 2.0,
    maxSpeed: 7,
  },
};

// Dinghy: light and twitchy. Lower lateral drag lets it slide
// and drift through turns. High turn torque on a low speed ref
// makes it pivot fast even at low speed. Fun but chaotic.
// Best for: casual play, tight spaces
const dinghy: Preset = {
  name: "Dinghy",
  params: {
    forwardDrag: 0.025,
    lateralDrag: 0.5,
    angularDamping: 0.35,
    thrustForce: 8,
    turnTorque: 7,
    turnSpeedReference: 1.5,
    maxSpeed: 11,
  },
};

// Yacht: the goldilocks preset. Smooth long glide from low
// forward drag, strong lateral grip, moderate turning that
// rewards flowing lines over sharp cuts. Feels premium.
// Best for: balanced default, exploration
const yacht: Preset = {
  name: "Yacht",
  params: {
    forwardDrag: 0.012,
    lateralDrag: 0.95,
    angularDamping: 0.4,
    thrustForce: 6,
    turnTorque: 3.5,
    turnSpeedReference: 3.0,
    maxSpeed: 12,
  },
};

const presets: Preset[] = [yacht, speedboat, dinghy, tugboat];

const sliders: Slider[] = [
  { key: "forwardDrag", label: "Forward Drag", min: 0, max: 0.2, step: 0.005 },
  { key: "lateralDrag", label: "Lateral Drag", min: 0, max: 2, step: 0.05 },
  { key: "angularDamping", label: "Angular Damping", min: 0, max: 2, step: 0.05 },
  { key: "thrustForce", label: "Thrust", min: 1, max: 30, step: 0.5 },
  { key: "turnTorque", label: "Turn Torque", min: 0.5, max: 15, step: 0.5 },
  { key: "turnSpeedReference", label: "Turn Speed Ref", min: 0.5, max: 10, step: 0.5 },
  { key: "maxSpeed", label: "Max Speed", min: 2, max: 40, step: 1 },
];

export function createDebugMenu(): HTMLElement {
  const panel = document.createElement("div");
  panel.id = "debug-panel";
  panel.innerHTML = `
    <style>
      #debug-panel {
        position: fixed; top: 10px; right: 10px;
        background: rgba(0,0,0,0.8); color: #eee;
        padding: 12px 16px; border-radius: 8px;
        font: 12px/1.6 monospace; min-width: 240px;
        user-select: none; z-index: 100;
      }
      #debug-panel h3 { margin: 0 0 8px; font-size: 13px; color: #f88; }
      #debug-panel .row { display: flex; align-items: center; gap: 6px; margin: 4px 0; }
      #debug-panel label { flex: 1; white-space: nowrap; }
      #debug-panel input[type=range] { width: 90px; }
      #debug-panel .val { width: 42px; text-align: right; color: #8cf; }
      #debug-toggle {
        position: fixed; top: 10px; right: 10px;
        background: rgba(0,0,0,0.6); color: #f88; border: none;
        padding: 6px 10px; border-radius: 6px; cursor: pointer;
        font: 12px monospace; z-index: 101;
      }
    </style>
    <h3>boat debug</h3>
  `;

  function syncSliders() {
    panel.querySelectorAll<HTMLInputElement>("input[type=range]").forEach((input, i) => {
      input.value = String(boatParams[sliders[i]!.key]);
      (input.nextElementSibling as HTMLElement).textContent = input.value;
    });
  }

  // Presets row
  const presetRow = document.createElement("div");
  presetRow.style.cssText = "display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap;";
  const btnStyle = "background:#333;color:#eee;border:1px solid #555;padding:3px 8px;border-radius:4px;cursor:pointer;font:11px monospace;";
  for (const preset of presets) {
    const btn = document.createElement("button");
    btn.textContent = preset.name;
    btn.style.cssText = btnStyle;
    btn.addEventListener("click", () => {
      Object.assign(boatParams, preset.params);
      syncSliders();
    });
    presetRow.appendChild(btn);
  }
  panel.appendChild(presetRow);

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
    input.value = String(boatParams[s.key]);

    const val = document.createElement("span");
    val.className = "val";
    val.textContent = String(boatParams[s.key]);

    input.addEventListener("input", () => {
      boatParams[s.key] = parseFloat(input.value);
      val.textContent = input.value;
    });

    row.append(label, input, val);
    panel.appendChild(row);
  }

  // Reset button (resets to Yacht — the balanced default)
  const reset = document.createElement("button");
  reset.textContent = "Reset";
  reset.style.cssText = "margin-top:8px;background:#333;color:#eee;border:1px solid #555;padding:4px 12px;border-radius:4px;cursor:pointer;font:12px monospace;";
  reset.addEventListener("click", () => {
    Object.assign(boatParams, yacht.params);
    syncSliders();
  });
  panel.appendChild(reset);

  // Toggle visibility with backtick
  let visible = false;
  panel.style.display = "none";

  const toggle = document.createElement("button");
  toggle.id = "debug-toggle";
  toggle.textContent = "` debug";
  toggle.addEventListener("click", () => {
    visible = !visible;
    panel.style.display = visible ? "block" : "none";
    toggle.style.display = visible ? "none" : "block";
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Backquote") {
      visible = !visible;
      panel.style.display = visible ? "block" : "none";
      toggle.style.display = visible ? "none" : "block";
    }
  });

  document.body.appendChild(toggle);
  document.body.appendChild(panel);
  return panel;
}
