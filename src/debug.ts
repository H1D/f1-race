import type { BoatPhysicsComponent, CameraState } from "./types";

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

// === Reusable UI helpers ===

export function createCollapsiblePanel(
  title: string,
  color: string,
  open = true,
): { wrapper: HTMLElement; body: HTMLElement } {
  const wrapper = document.createElement("div");
  wrapper.className = "dbg-panel";

  const header = document.createElement("div");
  header.className = "dbg-panel-header";
  header.style.color = color;

  const arrow = document.createElement("span");
  arrow.className = "dbg-arrow";
  arrow.textContent = open ? "▾" : "▸";

  header.appendChild(arrow);
  header.appendChild(document.createTextNode(` ${title}`));

  const body = document.createElement("div");
  body.className = "dbg-panel-body";
  body.style.display = open ? "block" : "none";

  header.addEventListener("click", () => {
    const isOpen = body.style.display !== "none";
    body.style.display = isOpen ? "none" : "block";
    arrow.textContent = isOpen ? "▸" : "▾";
  });

  wrapper.append(header, body);
  return { wrapper, body };
}

export function createTabBar(
  tabs: { label: string; content: HTMLElement }[],
): HTMLElement {
  const container = document.createElement("div");

  const bar = document.createElement("div");
  bar.className = "dbg-tab-bar";

  tabs.forEach((tab, i) => {
    const btn = document.createElement("button");
    btn.className = `dbg-tab-btn${i === 0 ? " active" : ""}`;
    btn.textContent = tab.label;
    btn.addEventListener("click", () => {
      bar.querySelectorAll(".dbg-tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      tabs.forEach((t, j) => {
        t.content.style.display = j === i ? "block" : "none";
      });
    });
    bar.appendChild(btn);
    tab.content.style.display = i === 0 ? "block" : "none";
  });

  container.appendChild(bar);
  for (const t of tabs) container.appendChild(t.content);
  return container;
}

// === Main debug menu ===

export function createDebugMenu(
  boat1Physics: BoatPhysicsComponent,
  camera?: CameraState,
  boat2Physics?: BoatPhysicsComponent,
): HTMLElement {
  const panel = document.createElement("div");
  panel.id = "debug-panel";
  panel.innerHTML = `<style>
    #debug-panel {
      position: fixed; top: 10px; right: 10px;
      background: rgba(0,0,0,0.85); color: #eee;
      padding: 12px 16px; border-radius: 8px;
      font: 12px/1.6 monospace; min-width: 260px;
      user-select: none; z-index: 100;
      max-height: calc(100vh - 20px); overflow-y: auto;
    }
    #debug-panel::-webkit-scrollbar { width: 4px; }
    #debug-panel::-webkit-scrollbar-thumb { background: #555; border-radius: 2px; }
    #debug-toggle {
      position: fixed; top: 10px; right: 10px;
      background: rgba(0,0,0,0.6); color: #f88; border: none;
      padding: 6px 10px; border-radius: 6px; cursor: pointer;
      font: 12px monospace; z-index: 101;
    }
    .dbg-panel { margin-bottom: 2px; }
    .dbg-panel + .dbg-panel { border-top: 1px solid #333; }
    .dbg-panel-header {
      cursor: pointer; padding: 5px 0; font-size: 12px; font-weight: bold;
      letter-spacing: 1px; user-select: none;
    }
    .dbg-panel-header:hover { opacity: 0.8; }
    .dbg-arrow { display: inline-block; width: 14px; }
    .dbg-panel-body { padding: 2px 0 8px; }
    .dbg-tab-bar { display: flex; gap: 2px; margin: 6px 0 0; }
    .dbg-tab-btn {
      background: #222; color: #888; border: 1px solid #444;
      padding: 3px 8px; border-radius: 4px 4px 0 0; cursor: pointer;
      font: 11px monospace; border-bottom: none;
    }
    .dbg-tab-btn:hover { color: #ccc; }
    .dbg-tab-btn.active { background: #333; color: #eee; border-color: #666; }
    .dbg-tab-content { border-top: 1px solid #444; padding: 6px 0; }
    #debug-panel .row { display: flex; align-items: center; gap: 6px; margin: 4px 0; }
    #debug-panel label { flex: 1; white-space: nowrap; }
    #debug-panel input[type=range] { width: 90px; }
    #debug-panel .val { width: 42px; text-align: right; color: #8cf; }
    .pd-row { display: flex; align-items: center; gap: 6px; margin: 4px 0; }
    .pd-row label { flex: 1; white-space: nowrap; }
    .pd-row input[type=range] { width: 90px; }
    .pd-val { width: 42px; text-align: right; color: #8fc; }
    .pd-btn {
      background: #333; color: #eee; border: 1px solid #555;
      padding: 3px 8px; border-radius: 4px; cursor: pointer; font: 11px monospace;
    }
    .pd-btn:hover { background: #555; }
    .pd-btn.active { background: #264; border-color: #8f8; }
    .pd-info { color: #888; font-size: 11px; margin: 2px 0; font-family: monospace; }
    .pd-effect { color: #8cf; font-size: 11px; font-family: monospace; }
  </style>`;

  const btnStyle =
    "background:#333;color:#eee;border:1px solid #555;padding:3px 8px;border-radius:4px;cursor:pointer;font:11px monospace;";

  // === BOAT collapsible panel ===
  const { wrapper: boatPanel, body: boatBody } = createCollapsiblePanel("BOAT", "#f88");

  // Camera mode toggle (from upstream camera feature)
  if (camera) {
    const camHeader = document.createElement("div");
    camHeader.style.cssText = "color:#aaa;font-size:11px;margin-bottom:4px;";
    camHeader.textContent = "camera";
    boatBody.appendChild(camHeader);

    const camRow = document.createElement("div");
    camRow.style.cssText = "display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap;";

    const modes: { label: string; apply: () => void }[] = [
      {
        label: "Fixed",
        apply: () => {
          camera.followTarget = null;
        },
      },
      ...camera.entities.map((_, i) => ({
        label: `Follow P${i + 1}`,
        apply: () => {
          camera.followTarget = camera.entities[i]!;
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

    boatBody.appendChild(camRow);
  }

  // Boat physics sections (supports 1 or 2 boats)
  const boats: { label: string; color: string; params: BoatPhysicsComponent }[] = [
    { label: "boat 1 (WASD)", color: "#e04040", params: boat1Physics },
  ];
  if (boat2Physics) {
    boats.push({ label: "boat 2 (Arrows)", color: "#e0c040", params: boat2Physics });
  }

  for (const boat of boats) {
    const section = document.createElement("div");
    if (boats.length > 1) {
      section.style.cssText = "border-top:1px solid #444;padding-top:6px;margin-top:6px;";
    }

    const header = document.createElement("div");
    header.style.cssText = `color:${boat.color};font-size:12px;font-weight:bold;margin-bottom:4px;`;
    header.textContent = boat.label;
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

    boatBody.appendChild(section);
  }

  panel.appendChild(boatPanel);

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
