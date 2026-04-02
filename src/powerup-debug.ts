import type {
  Entity,
  FloodState,
  PowerupDefinition,
  SpawnManagerState,
} from "./types";
import type { GameLog } from "./game-log";
import { createCollapsiblePanel, createTabBar } from "./debug";

export interface PowerupDebugContext {
  player: Entity;
  spawnState: SpawnManagerState;
  floodState: FloodState;
  powerupDefs: Map<string, PowerupDefinition>;
  entityManager: { entities: Entity[] };
  gameLog: GameLog;
}

export function createPowerupDebugSection(ctx: PowerupDebugContext): HTMLElement {
  const wrapper = document.createElement("div");

  // =============================================
  // POWERUPS collapsible panel
  // =============================================
  const { wrapper: powerupsPanel, body: powerupsBody } = createCollapsiblePanel("POWERUPS", "#8f8");

  // --- Spawn controls ---
  const spawnHeader = document.createElement("div");
  spawnHeader.style.cssText = "color:#aaa;font-size:11px;margin-bottom:4px;";
  spawnHeader.textContent = "spawn";
  powerupsBody.appendChild(spawnHeader);

  const intervalRow = createSliderRow("Interval", 1, 20, 0.5, ctx.spawnState.spawnInterval, (v) => {
    ctx.spawnState.spawnInterval = v;
  });
  powerupsBody.appendChild(intervalRow);

  const maxRow = createSliderRow("Max pickups", 1, 20, 1, ctx.spawnState.maxPickupsInWorld, (v) => {
    ctx.spawnState.maxPickupsInWorld = v;
  });
  powerupsBody.appendChild(maxRow);

  const spawnBtns = document.createElement("div");
  spawnBtns.style.cssText = "display:flex;gap:4px;margin:6px 0;flex-wrap:wrap;";

  const spawnNowBtn = document.createElement("button");
  spawnNowBtn.className = "pd-btn";
  spawnNowBtn.textContent = "Spawn now";
  spawnNowBtn.addEventListener("click", () => {
    ctx.spawnState.timeSinceLastSpawn = ctx.spawnState.spawnInterval + 1;
  });
  spawnBtns.appendChild(spawnNowBtn);

  const clearBtn = document.createElement("button");
  clearBtn.className = "pd-btn";
  clearBtn.textContent = "Clear pickups";
  clearBtn.addEventListener("click", () => {
    for (const e of ctx.entityManager.entities) {
      if (e.powerupPickup) {
        e.markedForRemoval = { reason: "debug-clear" };
      }
    }
  });
  spawnBtns.appendChild(clearBtn);

  const clearEffectsBtn = document.createElement("button");
  clearEffectsBtn.className = "pd-btn";
  clearEffectsBtn.textContent = "Clear effects";
  clearEffectsBtn.addEventListener("click", () => {
    if (!ctx.player.activeEffects) return;
    for (const effect of ctx.player.activeEffects.effects) {
      const def = ctx.powerupDefs.get(effect.powerupId);
      if (def) {
        def.effect.onExpire(ctx.player, effect.state);
      }
    }
    ctx.player.activeEffects.effects = [];
  });
  spawnBtns.appendChild(clearEffectsBtn);

  powerupsBody.appendChild(spawnBtns);

  // --- Powerup tabs (one per definition) ---
  const tabs: { label: string; content: HTMLElement }[] = [];
  for (const [, def] of ctx.powerupDefs) {
    const content = document.createElement("div");
    content.className = "dbg-tab-content";

    // Info line
    const info = document.createElement("div");
    info.className = "pd-info";
    info.textContent = `${def.effect.type} · ${def.effect.stacking} · category: ${def.category}`;
    content.appendChild(info);

    // --- Core knobs ---
    const coreHeader = document.createElement("div");
    coreHeader.style.cssText = "color:#aaa;font-size:10px;margin:6px 0 2px;";
    coreHeader.textContent = "core";
    content.appendChild(coreHeader);

    content.appendChild(
      createSliderRow("Duration", 0, 30, 0.5, def.effect.duration, (v) => {
        def.effect.duration = v;
      }),
    );

    content.appendChild(
      createSliderRow("Rarity", 0, 1, 0.05, def.rarity, (v) => {
        def.rarity = v;
      }),
    );

    content.appendChild(
      createSliderRow("Max stacks", 1, 10, 1, def.effect.maxStacks, (v) => {
        def.effect.maxStacks = v;
      }),
    );

    // --- Effect-specific tunables ---
    if (def.tunables) {
      const tunHeader = document.createElement("div");
      tunHeader.style.cssText = "color:#aaa;font-size:10px;margin:6px 0 2px;";
      tunHeader.textContent = "effect params";
      content.appendChild(tunHeader);

      for (const [key, tunable] of Object.entries(def.tunables)) {
        if (!tunable) continue;
        content.appendChild(
          createSliderRow(key, tunable.min, tunable.max, tunable.step, tunable.value, (v) => {
            tunable.value = v;
          }),
        );
      }
    }

    // Apply button
    const applyBtn = document.createElement("button");
    applyBtn.className = "pd-btn";
    applyBtn.textContent = `Apply ${def.visual?.hudIcon ?? "?"} ${def.name}`;
    applyBtn.style.marginTop = "6px";
    applyBtn.addEventListener("click", () => {
      applyEffectToPlayer(ctx.player, def);
    });
    content.appendChild(applyBtn);

    tabs.push({
      label: `${def.visual?.hudIcon ?? "?"} ${def.name}`,
      content,
    });
  }

  if (tabs.length > 0) {
    const tabBar = createTabBar(tabs);
    powerupsBody.appendChild(tabBar);
  }

  wrapper.appendChild(powerupsPanel);

  // =============================================
  // GENERAL collapsible panel
  // =============================================
  const { wrapper: generalPanel, body: generalBody } = createCollapsiblePanel("GENERAL", "#fc8");

  // --- Flood toggle ---
  const floodHeader = document.createElement("div");
  floodHeader.style.cssText = "color:#aaa;font-size:11px;margin-bottom:4px;";
  floodHeader.textContent = "flood";
  generalBody.appendChild(floodHeader);

  const floodRow = document.createElement("div");
  floodRow.style.cssText = "display:flex;gap:4px;align-items:center;";

  const floodToggle = document.createElement("button");
  floodToggle.className = "pd-btn";
  floodToggle.textContent = "Flood: OFF";
  floodToggle.addEventListener("click", () => {
    ctx.floodState.active = !ctx.floodState.active;
    if (ctx.floodState.active) {
      ctx.floodState.level = 1;
      ctx.floodState.timeRemaining = 999;
    } else {
      ctx.floodState.level = 0;
      ctx.floodState.timeRemaining = 0;
    }
    floodToggle.textContent = `Flood: ${ctx.floodState.active ? "ON" : "OFF"}`;
    floodToggle.classList.toggle("active", ctx.floodState.active);
  });
  floodRow.appendChild(floodToggle);

  const floodLevelRow = createSliderRow("Level", 0, 1, 0.05, ctx.floodState.level, (v) => {
    ctx.floodState.level = v;
  });
  floodRow.appendChild(floodLevelRow);
  generalBody.appendChild(floodRow);

  // --- Event log toggle ---
  const logHeader = document.createElement("div");
  logHeader.style.cssText = "color:#aaa;font-size:11px;margin: 8px 0 4px;";
  logHeader.textContent = "event log";
  generalBody.appendChild(logHeader);

  const logRow = document.createElement("div");
  logRow.style.cssText = "display:flex;gap:4px;align-items:center;margin-bottom:6px;";

  const logToggle = document.createElement("button");
  logToggle.className = "pd-btn";
  logToggle.textContent = "Log: FADE";
  logToggle.addEventListener("click", () => {
    ctx.gameLog.visible = !ctx.gameLog.visible;
    logToggle.textContent = `Log: ${ctx.gameLog.visible ? "PINNED" : "FADE"}`;
    logToggle.classList.toggle("active", ctx.gameLog.visible);
  });
  logRow.appendChild(logToggle);

  const logClearBtn = document.createElement("button");
  logClearBtn.className = "pd-btn";
  logClearBtn.textContent = "Clear log";
  logClearBtn.addEventListener("click", () => {
    ctx.gameLog.entries.length = 0;
  });
  logRow.appendChild(logClearBtn);
  generalBody.appendChild(logRow);

  // --- Live entity/effect info ---
  const infoHeader = document.createElement("div");
  infoHeader.style.cssText = "color:#aaa;font-size:11px;margin: 8px 0 4px;";
  infoHeader.textContent = "live";
  generalBody.appendChild(infoHeader);

  const infoDiv = document.createElement("div");
  infoDiv.className = "pd-info";
  generalBody.appendChild(infoDiv);

  const effectsDiv = document.createElement("div");
  effectsDiv.className = "pd-effect";
  generalBody.appendChild(effectsDiv);

  const updateInfo = () => {
    const pickups = ctx.entityManager.entities.filter(
      (e) => e.powerupPickup && !e.markedForRemoval,
    ).length;
    const obstacles = ctx.entityManager.entities.filter(
      (e) => e.tags.has("obstacle") && !e.markedForRemoval,
    ).length;
    const zones = ctx.entityManager.entities.filter(
      (e) => e.zone && !e.markedForRemoval,
    ).length;
    const total = ctx.entityManager.entities.filter((e) => !e.markedForRemoval).length;

    infoDiv.textContent = `entities: ${total} | pickups: ${pickups} | obstacles: ${obstacles} | zones: ${zones}`;

    const effects = ctx.player.activeEffects?.effects ?? [];
    if (effects.length === 0) {
      effectsDiv.textContent = "effects: none";
    } else {
      effectsDiv.textContent = effects
        .map((e) => {
          const def = ctx.powerupDefs.get(e.powerupId);
          const icon = def?.visual?.hudIcon ?? "?";
          const time = e.remainingTime === -1 ? "perm" : `${e.remainingTime.toFixed(1)}s`;
          return `${icon} ${e.powerupId} (${time})`;
        })
        .join("  ");
    }
  };

  const intervalId = setInterval(updateInfo, 100);

  wrapper.appendChild(generalPanel);

  // Store cleanup on the element for removal
  const origRemove = wrapper.remove.bind(wrapper);
  wrapper.remove = () => {
    clearInterval(intervalId);
    origRemove();
  };

  return wrapper;
}

function applyEffectToPlayer(player: Entity, def: PowerupDefinition): void {
  if (!player.activeEffects) {
    player.activeEffects = { effects: [] };
  }

  const existing = player.activeEffects.effects.find((e) => e.powerupId === def.id);

  if (existing && def.effect.stacking === "refresh") {
    existing.remainingTime = def.effect.duration;
    return;
  }

  if (existing && def.effect.stacking === "ignore") {
    return;
  }

  if (existing && def.effect.stacking === "replace") {
    def.effect.onExpire(player, existing.state);
    player.activeEffects.effects = player.activeEffects.effects.filter(
      (e) => e !== existing,
    );
  }

  if (
    def.effect.stacking === "stack" &&
    player.activeEffects.effects.filter((e) => e.powerupId === def.id).length >=
      def.effect.maxStacks
  ) {
    return;
  }

  const state: Record<string, number> = {};
  def.effect.onApply(player, player, state);

  player.activeEffects.effects.push({
    powerupId: def.id,
    remainingTime: def.effect.duration,
    sourceEntityId: player.id,
    state,
  });
}

function createSliderRow(
  label: string,
  min: number,
  max: number,
  step: number,
  initial: number,
  onChange: (v: number) => void,
): HTMLElement {
  const row = document.createElement("div");
  row.className = "pd-row";

  const lbl = document.createElement("label");
  lbl.textContent = label;

  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(initial);

  const val = document.createElement("span");
  val.className = "pd-val";
  val.textContent = String(initial);

  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    onChange(v);
    val.textContent = input.value;
  });

  row.append(lbl, input, val);
  return row;
}
