import type { BoatPhysicsComponent, CameraState, Entity } from "./types";

interface Slider {
  key: keyof BoatPhysicsComponent;
  label: string;
  min: number;
  max: number;
  step: number;
}

interface Preset {
  name: string;
  params: BoatPhysicsComponent;
}

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

export function createDebugMenu(
  boat1Physics: BoatPhysicsComponent,
  camera?: CameraState,
  boat2Physics?: BoatPhysicsComponent,
): HTMLElement {
  const panel = document.createElement("div");
  panel.id = "debug-panel";
  panel.innerHTML = `
    <style>
      #debug-panel {
        position: fixed; top: 10px; right: 10px;
        background: rgba(0,0,0,0.8); color: #eee;
        padding: 12px 16px; border-radius: 8px;
        font: 12px/1.6 monospace; min-width: 240px;
        max-height: 90vh; overflow-y: auto;
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
      #debug-panel .boat-tab { opacity: 0.5; }
      #debug-panel .boat-tab.active { opacity: 1; border-color: #8cf; }
    </style>
  `;

  const btnStyle = "background:#333;color:#eee;border:1px solid #555;padding:3px 8px;border-radius:4px;cursor:pointer;font:11px monospace;";

  // Camera mode toggle
  if (camera) {
    const camSection = document.createElement("div");
    camSection.style.cssText = "margin-bottom:10px;";

    const camLabel = document.createElement("h3");
    camLabel.textContent = "camera";
    camSection.appendChild(camLabel);

    const camRow = document.createElement("div");
    camRow.style.cssText = "display:flex;gap:4px;flex-wrap:wrap;";

    const modes: { label: string; apply: () => void }[] = [
      {
        label: "Fixed",
        apply: () => {
          camera.followTarget = null;
        },
      },
      ...camera.entities.map((entity, i) => ({
        label: `Follow P${i + 1}`,
        apply: () => {
          camera.followTarget = entity;
        },
      })),
    ];

    for (const mode of modes) {
      const btn = document.createElement("button");
      btn.textContent = mode.label;
      btn.style.cssText = btnStyle;
      btn.addEventListener("click", mode.apply);
      camRow.appendChild(btn);
    }

    camSection.appendChild(camRow);
    panel.appendChild(camSection);
  }

  // Boat physics sections
  const boats: { label: string; color: string; params: BoatPhysicsComponent }[] = [
    { label: "boat 1 (WASD)", color: "#e04040", params: boat1Physics },
  ];
  if (boat2Physics) {
    boats.push({ label: "boat 2 (Arrows)", color: "#e0c040", params: boat2Physics });
  }

  for (const boat of boats) {
    const section = document.createElement("div");
    section.style.cssText = "border-top:1px solid #444;padding-top:8px;margin-top:8px;";

    const header = document.createElement("h3");
    header.textContent = boat.label;
    header.style.color = boat.color;
    section.appendChild(header);

    // Presets
    const presetRow = document.createElement("div");
    presetRow.style.cssText = "display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap;";

    const sliderInputs: HTMLInputElement[] = [];

    function syncBoatSliders() {
      for (let i = 0; i < sliderInputs.length; i++) {
        const input = sliderInputs[i]!;
        input.value = String(boat.params[sliders[i]!.key]);
        (input.nextElementSibling as HTMLElement).textContent = input.value;
      }
    }

    for (const preset of presets) {
      const btn = document.createElement("button");
      btn.textContent = preset.name;
      btn.style.cssText = btnStyle;
      btn.addEventListener("click", () => {
        Object.assign(boat.params, preset.params);
        syncBoatSliders();
      });
      presetRow.appendChild(btn);
    }
    section.appendChild(presetRow);

    // Sliders
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
      input.value = String(boat.params[s.key]);

      const val = document.createElement("span");
      val.className = "val";
      val.textContent = String(boat.params[s.key]);

      input.addEventListener("input", () => {
        boat.params[s.key] = parseFloat(input.value);
        val.textContent = input.value;
      });

      sliderInputs.push(input);
      row.append(label, input, val);
      section.appendChild(row);
    }

    // Reset
    const reset = document.createElement("button");
    reset.textContent = "Reset";
    reset.style.cssText = "margin-top:6px;" + btnStyle;
    reset.addEventListener("click", () => {
      Object.assign(boat.params, yacht.params);
      syncBoatSliders();
    });
    section.appendChild(reset);

    panel.appendChild(section);
  }

  // Toggle visibility with backtick key
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
