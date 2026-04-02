export type EditorMode = "outline" | "attributes" | "bridges";

export interface ToolbarCallbacks {
  onModeChange: (mode: EditorMode) => void;
  onAction: (action: string) => void;
  onBack: () => void;
}

let actionCallback: ((action: string) => void) | null = null;

export function createToolbar(callbacks: ToolbarCallbacks): HTMLElement {
  actionCallback = callbacks.onAction;

  const bar = document.createElement("div");
  bar.id = "editor-toolbar";
  bar.innerHTML = `
    <style>
      #editor-toolbar {
        position: fixed; top: 0; left: 0; right: 0;
        background: rgba(0,0,0,0.9);
        display: flex; align-items: center; gap: 8px;
        padding: 8px 16px; z-index: 200;
        font: 13px monospace; color: #eee;
        user-select: none;
      }
      #editor-toolbar .sep { width: 1px; height: 24px; background: #444; margin: 0 4px; }
      #editor-toolbar button {
        background: #333; color: #eee; border: 1px solid #555;
        padding: 5px 12px; border-radius: 4px; cursor: pointer;
        font: 13px monospace; white-space: nowrap;
      }
      #editor-toolbar button:hover { background: #444; }
      #editor-toolbar button.active { background: #1a6b3a; border-color: #2a8b4a; }
      #editor-toolbar button.act { background: #2a5a8a; border-color: #3a7aaa; }
      #editor-toolbar button.act:hover { background: #3a6a9a; }
      #editor-toolbar button.warn { background: #8a2a2a; border-color: #aa3a3a; }
      #editor-toolbar .back { margin-left: auto; }
      #editor-toolbar .lbl { color: #f88; font-weight: bold; font-size: 12px; }
      #editor-actions { display: flex; gap: 6px; align-items: center; }
      #editor-status { color: #999; font-size: 11px; margin-left: 8px; }
    </style>
    <span class="lbl">EDITOR</span>
    <div class="sep"></div>
    <button data-mode="outline" class="active">Map Outline</button>
    <button data-mode="attributes">Map Attributes</button>
    <button data-mode="bridges">Bridges</button>
    <div class="sep"></div>
    <div id="editor-actions"></div>
    <span id="editor-status"></span>
    <button class="back">← Race</button>
  `;

  document.body.appendChild(bar);

  // Mode buttons
  const modeButtons = bar.querySelectorAll<HTMLButtonElement>("[data-mode]");
  for (const btn of modeButtons) {
    btn.addEventListener("click", () => {
      for (const b of modeButtons) b.classList.remove("active");
      btn.classList.add("active");
      callbacks.onModeChange(btn.dataset.mode as EditorMode);
    });
  }

  // Action delegation
  bar.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");
    if (btn && actionCallback) actionCallback(btn.dataset.action!);
  });

  // Back
  bar.querySelector(".back")!.addEventListener("click", callbacks.onBack);

  return bar;
}

export function setToolbarActions(
  actions: { label: string; id: string; cls?: string }[],
): void {
  const el = document.getElementById("editor-actions");
  if (!el) return;
  el.innerHTML = "";
  for (const a of actions) {
    const btn = document.createElement("button");
    btn.textContent = a.label;
    btn.className = a.cls || "act";
    btn.dataset.action = a.id;
    el.appendChild(btn);
  }
}

export function setToolbarStatus(text: string): void {
  const el = document.getElementById("editor-status");
  if (el) el.textContent = text;
}

export function removeToolbar(): void {
  document.getElementById("editor-toolbar")?.remove();
}
