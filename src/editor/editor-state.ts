import type {
  DualInput,
  GameContext,
  GameState,
  Vec2,
  MapData,
  AttributeType,
} from "../types";
import { getCurrentMap, setCurrentMap, createDefaultMap, isOnLand } from "../map/map-data";
import { renderMap, renderBridges, renderAttributeMarker } from "../map/map-renderer";
import {
  distToSegmentSq,
  lineIntersectsPolygon,
  pointInPolygon,
  nearestPointOnSegment as nearestPtOnSeg,
  processDrawnPath,
  offsetPolygon,
} from "../map/geometry";
import {
  createToolbar,
  setToolbarActions,
  setToolbarStatus,
  removeToolbar,
  type EditorMode,
} from "./toolbar";
import { RacingState } from "../states/racing-state";

const POINT_RADIUS = 8;
const POINT_HIT_RADIUS = 14;
const ATTR_HIT_RADIUS = 18;
const MIN_CHANNEL_WIDTH = 80;
const MIN_WORLD_MARGIN = 50;
const MIN_TURN_ANGLE = (75 * Math.PI) / 180;
const RIVER_HALF_WIDTH = 90;
const DRAW_SAMPLE_DIST = 15; // min px between sampled draw points
const CENTERLINE_POINTS = 12;

type OutlineTarget = "outer" | "island";
type OutlineSubMode = "draw" | "edit";

export class EditorState implements GameState {
  private gameCtx!: GameContext;
  private toolbar!: HTMLElement;

  // Camera
  private camX = 0;
  private camY = 0;
  private zoom = 0.55;

  // Mode
  private mode: EditorMode = "outline";
  private previewing = false;
  private outlineTarget: OutlineTarget = "outer";
  private outlineSubMode: OutlineSubMode = "draw";

  // Drawing state
  private isDrawing = false;
  private drawnPath: Vec2[] = [];

  // Draft data
  private map!: MapData;
  private draftOutline: Vec2[] = [];
  private draftIsland: Vec2[] = [];

  // Outline editing
  private selPtIdx: number | null = null;
  private draggingPt = false;

  // Attribute editing
  private placingType: AttributeType | null = null;
  private selAttrId: number | null = null;
  private draggingAttr = false;
  private dragOffset: Vec2 = { x: 0, y: 0 };

  // Bridge editing
  private bridgeStart: Vec2 | null = null;

  // Mouse state
  private mouseWorld: Vec2 = { x: 0, y: 0 };
  private isPanning = false;
  private panOrigin: Vec2 = { x: 0, y: 0 };
  private panCamOrigin: Vec2 = { x: 0, y: 0 };

  // IDs
  private nextAttrId = 1;
  private nextBridgeId = 1;

  // Bound handlers
  private _onMouseDown = (e: MouseEvent) => this.onMouseDown(e);
  private _onMouseMove = (e: MouseEvent) => this.onMouseMove(e);
  private _onMouseUp = () => this.onMouseUp();
  private _onWheel = (e: WheelEvent) => this.onWheel(e);
  private _onKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
  private _onContext = (e: Event) => e.preventDefault();

  private get activeDraft(): Vec2[] {
    return this.outlineTarget === "outer" ? this.draftOutline : this.draftIsland;
  }

  private set activeDraft(pts: Vec2[]) {
    if (this.outlineTarget === "outer") this.draftOutline = pts;
    else this.draftIsland = pts;
  }

  // ─── Lifecycle ───────────────────────────────────────

  enter(ctx: GameContext) {
    this.gameCtx = ctx;
    this.map = getCurrentMap();
    this.draftOutline = this.map.outline.map((p) => ({ ...p }));
    this.draftIsland = this.map.island.map((p) => ({ ...p }));

    for (const a of this.map.attributes) if (a.id >= this.nextAttrId) this.nextAttrId = a.id + 1;
    for (const b of this.map.bridges) if (b.id >= this.nextBridgeId) this.nextBridgeId = b.id + 1;

    this.toolbar = createToolbar({
      onModeChange: (m) => this.setMode(m),
      onAction: (a) => this.handleAction(a),
      onBack: () => this.gameCtx.switchState(new RacingState()),
    });

    this.setMode("outline");

    const c = ctx.canvas;
    c.addEventListener("mousedown", this._onMouseDown);
    c.addEventListener("mousemove", this._onMouseMove);
    c.addEventListener("mouseup", this._onMouseUp);
    c.addEventListener("wheel", this._onWheel, { passive: false });
    c.addEventListener("contextmenu", this._onContext);
    window.addEventListener("keydown", this._onKeyDown);
  }

  exit() {
    removeToolbar();
    const c = this.gameCtx.canvas;
    c.removeEventListener("mousedown", this._onMouseDown);
    c.removeEventListener("mousemove", this._onMouseMove);
    c.removeEventListener("mouseup", this._onMouseUp);
    c.removeEventListener("wheel", this._onWheel);
    c.removeEventListener("contextmenu", this._onContext);
    window.removeEventListener("keydown", this._onKeyDown);
  }

  update(_dt: number, _input: DualInput) {}

  render(ctx: CanvasRenderingContext2D, _alpha: number) {
    const w = this.gameCtx.canvas.width;
    const h = this.gameCtx.canvas.height;

    ctx.fillStyle = "#0a1220";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camX, -this.camY);

    const previewMap = this.previewing ? this.buildPreviewMap() : this.map;
    renderMap(ctx, previewMap);
    renderBridges(ctx, previewMap);

    if (!this.previewing) {
      if (this.mode === "outline") this.renderOutlineOverlay(ctx);
      if (this.mode === "attributes") this.renderAttributesOverlay(ctx);
      if (this.mode === "bridges") this.renderBridgesOverlay(ctx);
    }

    ctx.restore();

    if (this.previewing) {
      ctx.fillStyle = "rgba(0,180,80,0.15)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("PREVIEW — click Apply to commit or Edit to return", w / 2, h - 30);
    }
  }

  // ─── Mode switching ──────────────────────────────────

  private setMode(mode: EditorMode) {
    this.mode = mode;
    this.previewing = false;
    this.selPtIdx = null;
    this.selAttrId = null;
    this.placingType = null;
    this.bridgeStart = null;

    if (mode === "outline") {
      this.setOutlineSubMode(this.outlineSubMode);
    } else if (mode === "attributes") {
      setToolbarActions([
        { label: "Albert Heijn", id: "place-albert-heijn" },
        { label: "Effendi", id: "place-effendi" },
        { label: "Doctor Falafel", id: "place-doctor-falafel" },
      ]);
      setToolbarStatus("Select an item, then click on land to place.");
    } else if (mode === "bridges") {
      setToolbarActions([]);
      setToolbarStatus("Click a land point, then click another land point to bridge.");
    }
  }

  private setOutlineSubMode(sub: OutlineSubMode) {
    this.outlineSubMode = sub;
    this.selPtIdx = null;
    this.isDrawing = false;
    this.drawnPath = [];

    if (sub === "draw") {
      setToolbarActions([
        { label: "Draw River", id: "sub-draw", cls: "active" },
        { label: "Edit Points", id: "sub-edit" },
        { label: "Preview", id: "preview" },
        { label: "Apply", id: "apply" },
        { label: "Reset", id: "reset" },
      ]);
      setToolbarStatus("Click and drag to paint the river path. Draw a full loop.");
    } else {
      setToolbarActions([
        { label: "Draw River", id: "sub-draw" },
        { label: "Edit Points", id: "sub-edit", cls: "active" },
        { label: "Outer", id: "target-outer", cls: this.outlineTarget === "outer" ? "active" : "act" },
        { label: "Island", id: "target-island", cls: this.outlineTarget === "island" ? "active" : "act" },
        { label: "Preview", id: "preview" },
        { label: "Apply", id: "apply" },
        { label: "Reset", id: "reset" },
      ]);
      const label = this.outlineTarget === "outer" ? "outer bank" : "island";
      setToolbarStatus(`Editing ${label}. Click to add, drag to move, Del to remove.`);
    }
  }

  private handleAction(action: string) {
    if (action === "sub-draw") {
      this.setOutlineSubMode("draw");
    } else if (action === "sub-edit") {
      this.setOutlineSubMode("edit");
    } else if (action === "target-outer") {
      this.outlineTarget = "outer";
      this.setOutlineSubMode("edit");
    } else if (action === "target-island") {
      this.outlineTarget = "island";
      this.setOutlineSubMode("edit");
    } else if (action === "preview") {
      this.previewing = true;
      setToolbarActions([
        { label: "Edit", id: "edit" },
        { label: "Apply", id: "apply" },
      ]);
      setToolbarStatus("Previewing. Green = land, blue = water channel.");
    } else if (action === "edit") {
      this.previewing = false;
      this.setOutlineSubMode(this.outlineSubMode);
    } else if (action === "apply") {
      this.applyOutline();
    } else if (action === "reset") {
      const defaults = createDefaultMap();
      this.draftOutline = defaults.outline.map((p) => ({ ...p }));
      this.draftIsland = defaults.island.map((p) => ({ ...p }));
      this.map.attributes = [];
      this.map.bridges = [];
      this.selPtIdx = null;
      this.selAttrId = null;
      this.bridgeStart = null;
      setCurrentMap(this.map);
      setToolbarStatus("Everything reset. Click Apply to commit outline.");
    } else if (action.startsWith("place-")) {
      const type = action.replace("place-", "") as AttributeType;
      this.placingType = type;
      this.selAttrId = null;
      setToolbarStatus(`Placing: ${type}. Click on land.`);
    }
  }

  private applyOutline() {
    const error = this.validateMap();
    if (error) {
      // Reset to defaults and show popup
      const defaults = createDefaultMap();
      this.draftOutline = defaults.outline.map((p) => ({ ...p }));
      this.draftIsland = defaults.island.map((p) => ({ ...p }));
      this.selPtIdx = null;
      this.previewing = false;
      this.setOutlineTarget(this.outlineTarget);
      this.showPopup(error);
      return;
    }
    this.map.outline = this.draftOutline.map((p) => ({ ...p }));
    this.map.island = this.draftIsland.map((p) => ({ ...p }));
    setCurrentMap(this.map);
    this.previewing = false;
    this.setOutlineTarget(this.outlineTarget);
    setToolbarStatus("Map applied.");
  }

  private showPopup(message: string) {
    const overlay = document.createElement("div");
    overlay.id = "editor-popup-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:300;";

    const box = document.createElement("div");
    box.style.cssText =
      "background:#1a1a2e;border:2px solid #e04040;border-radius:10px;padding:28px 36px;max-width:420px;text-align:center;font:14px monospace;color:#eee;";

    const title = document.createElement("div");
    title.textContent = "Invalid Map";
    title.style.cssText = "font-size:18px;font-weight:bold;color:#f66;margin-bottom:12px;";

    const msg = document.createElement("div");
    msg.textContent = message;
    msg.style.cssText = "color:#ccc;margin-bottom:8px;line-height:1.5;";

    const note = document.createElement("div");
    note.textContent = "Map has been reset to default.";
    note.style.cssText = "color:#888;font-size:12px;margin-bottom:18px;";

    const btn = document.createElement("button");
    btn.textContent = "OK";
    btn.style.cssText =
      "background:#e04040;color:#fff;border:none;padding:8px 32px;border-radius:6px;cursor:pointer;font:14px monospace;";
    btn.addEventListener("click", () => overlay.remove());

    box.append(title, msg, note, btn);
    overlay.appendChild(box);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    btn.focus();
  }

  private buildPreviewMap(): MapData {
    return { ...this.map, outline: this.draftOutline, island: this.draftIsland };
  }

  // ─── Coordinate conversion ───────────────────────────

  private screenToWorld(sx: number, sy: number): Vec2 {
    const w = this.gameCtx.canvas.width;
    const h = this.gameCtx.canvas.height;
    return {
      x: (sx - w / 2) / this.zoom + this.camX,
      y: (sy - h / 2) / this.zoom + this.camY,
    };
  }

  // ─── Constraints ──────────────────────────────────────

  private enforceConstraints(idx: number) {
    const ws = this.map.worldSize;
    const margin = MIN_WORLD_MARGIN;

    // Clamp outer point to world bounds
    if (idx < this.draftOutline.length) {
      const op = this.draftOutline[idx];
      op.x = Math.max(-ws + margin, Math.min(ws - margin, op.x));
      op.y = Math.max(-ws + margin, Math.min(ws - margin, op.y));
    }

    // Enforce smooth turns on both polygons (dragged point + neighbors)
    this.enforceSmoothAt(this.draftOutline, idx);
    this.enforceSmoothAt(this.draftIsland, idx);

    // Enforce min channel width on ALL linked pairs.
    // The dragged polygon is authoritative — the other adjusts.
    const pairCount = Math.min(this.draftOutline.length, this.draftIsland.length);
    for (let i = 0; i < pairCount; i++) {
      const op = this.draftOutline[i];
      const ip = this.draftIsland[i];
      const dist = Math.hypot(op.x - ip.x, op.y - ip.y);

      if (dist < MIN_CHANNEL_WIDTH) {
        const dx = op.x - ip.x;
        const dy = op.y - ip.y;
        const d = Math.max(dist, 0.01);
        const ux = dx / d;
        const uy = dy / d;

        if (this.outlineTarget === "outer") {
          // Outer is authoritative — push island away from outer
          this.draftIsland[i] = {
            x: op.x - ux * MIN_CHANNEL_WIDTH,
            y: op.y - uy * MIN_CHANNEL_WIDTH,
          };
        } else {
          // Island is authoritative — push outer away from island
          this.draftOutline[i] = {
            x: ip.x + ux * MIN_CHANNEL_WIDTH,
            y: ip.y + uy * MIN_CHANNEL_WIDTH,
          };
        }
      }
    }

    // Keep every island point inside the outer polygon
    if (this.draftOutline.length >= 3) {
      for (let i = 0; i < this.draftIsland.length; i++) {
        const ip = this.draftIsland[i];
        if (!pointInPolygon(ip, this.draftOutline)) {
          let bestDistSq = Infinity;
          let bestPt: Vec2 = ip;
          for (let a = 0, b = this.draftOutline.length - 1; a < this.draftOutline.length; b = a++) {
            const n = nearestPtOnSeg(ip, this.draftOutline[b], this.draftOutline[a]);
            const dSq = (ip.x - n.x) ** 2 + (ip.y - n.y) ** 2;
            if (dSq < bestDistSq) { bestDistSq = dSq; bestPt = n; }
          }
          let cx = 0, cy = 0;
          for (const p of this.draftIsland) { cx += p.x; cy += p.y; }
          cx /= this.draftIsland.length; cy /= this.draftIsland.length;
          const dx = cx - bestPt.x, dy = cy - bestPt.y;
          const d = Math.max(Math.hypot(dx, dy), 0.01);
          this.draftIsland[i] = { x: bestPt.x + (dx / d) * 10, y: bestPt.y + (dy / d) * 10 };
        }
      }
    }
  }

  /** Pull a vertex toward its neighbors' midpoint until the turn angle is wide enough. */
  private clampVertexAngle(pts: Vec2[], idx: number) {
    const n = pts.length;
    if (n < 3 || idx >= n) return;

    const prev = pts[(idx - 1 + n) % n];
    const curr = pts[idx];
    const next = pts[(idx + 1) % n];

    const angle = this.vertexAngle(prev, curr, next);
    if (angle >= MIN_TURN_ANGLE) return;

    // Binary search: lerp curr toward midpoint of neighbors until angle is OK
    const midX = (prev.x + next.x) / 2;
    const midY = (prev.y + next.y) / 2;

    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 10; i++) {
      const t = (lo + hi) / 2;
      const tx = curr.x + (midX - curr.x) * t;
      const ty = curr.y + (midY - curr.y) * t;
      const a = this.vertexAngle(prev, { x: tx, y: ty }, next);
      if (a >= MIN_TURN_ANGLE) hi = t;
      else lo = t;
    }

    pts[idx] = {
      x: curr.x + (midX - curr.x) * hi,
      y: curr.y + (midY - curr.y) * hi,
    };
  }

  /** Enforce smooth angle at vertex idx and its two neighbors. */
  private enforceSmoothAt(pts: Vec2[], idx: number) {
    if (idx >= pts.length || pts.length < 3) return;
    const n = pts.length;
    this.clampVertexAngle(pts, idx);
    this.clampVertexAngle(pts, (idx - 1 + n) % n);
    this.clampVertexAngle(pts, (idx + 1) % n);
  }

  private vertexAngle(prev: Vec2, curr: Vec2, next: Vec2): number {
    const v1x = prev.x - curr.x;
    const v1y = prev.y - curr.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);
    if (len1 < 1 || len2 < 1) return Math.PI;
    const cos = (v1x * v2x + v1y * v2y) / (len1 * len2);
    return Math.acos(Math.max(-1, Math.min(1, cos)));
  }

  private validateMap(): string | null {
    if (this.draftOutline.length < 3) return "Outer bank needs at least 3 points.";
    if (this.draftIsland.length < 3) return "Island needs at least 3 points.";

    // Check all island points are inside the outer polygon
    for (let i = 0; i < this.draftIsland.length; i++) {
      if (!pointInPolygon(this.draftIsland[i], this.draftOutline)) {
        return `Island point ${i} is outside the outer bank.`;
      }
    }

    // Check min channel width at every pair
    const checkCount = Math.min(this.draftOutline.length, this.draftIsland.length);
    for (let i = 0; i < checkCount; i++) {
      const op = this.draftOutline[i];
      const ip = this.draftIsland[i];
      if (Math.hypot(op.x - ip.x, op.y - ip.y) < MIN_CHANNEL_WIDTH * 0.8) {
        return `Channel too narrow at point ${i}. Widen the gap.`;
      }
    }

    // Check turn angles on both polygons
    for (const [name, pts] of [["Outer bank", this.draftOutline], ["Island", this.draftIsland]] as const) {
      const n = pts.length;
      for (let i = 0; i < n; i++) {
        const prev = pts[(i - 1 + n) % n];
        const next = pts[(i + 1) % n];
        if (this.vertexAngle(prev, pts[i], next) < MIN_TURN_ANGLE * 0.8) {
          return `${name} has too sharp a turn at point ${i}. Smooth it out.`;
        }
      }
    }

    return null;
  }

  // ─── Mouse events ────────────────────────────────────

  private onMouseDown(e: MouseEvent) {
    this.mouseWorld = this.screenToWorld(e.offsetX, e.offsetY);

    if (e.button === 1 || e.button === 2) {
      this.isPanning = true;
      this.panOrigin = { x: e.offsetX, y: e.offsetY };
      this.panCamOrigin = { x: this.camX, y: this.camY };
      return;
    }

    if (this.previewing) return;

    if (this.mode === "outline") this.onOutlineMouseDown();
    else if (this.mode === "attributes") this.onAttributesMouseDown();
    else if (this.mode === "bridges") this.onBridgesMouseDown();
  }

  private onMouseMove(e: MouseEvent) {
    this.mouseWorld = this.screenToWorld(e.offsetX, e.offsetY);

    if (this.isPanning) {
      const dx = (e.offsetX - this.panOrigin.x) / this.zoom;
      const dy = (e.offsetY - this.panOrigin.y) / this.zoom;
      this.camX = this.panCamOrigin.x - dx;
      this.camY = this.panCamOrigin.y - dy;
      return;
    }

    // Drawing mode: sample points while dragging
    if (this.isDrawing) {
      const last = this.drawnPath[this.drawnPath.length - 1];
      if (Math.hypot(this.mouseWorld.x - last.x, this.mouseWorld.y - last.y) > DRAW_SAMPLE_DIST / this.zoom) {
        this.drawnPath.push({ ...this.mouseWorld });
      }
      return;
    }

    if (this.draggingPt && this.selPtIdx !== null) {
      const old = this.activeDraft[this.selPtIdx];
      const dx = this.mouseWorld.x - old.x;
      const dy = this.mouseWorld.y - old.y;

      // Move the dragged point
      this.activeDraft[this.selPtIdx] = { ...this.mouseWorld };

      // Link-drag: move the corresponding point on the other polygon
      const other = this.outlineTarget === "outer" ? this.draftIsland : this.draftOutline;
      if (this.selPtIdx < other.length) {
        other[this.selPtIdx].x += dx;
        other[this.selPtIdx].y += dy;
      }

      this.enforceConstraints(this.selPtIdx);
    }

    if (this.draggingAttr && this.selAttrId !== null) {
      const attr = this.map.attributes.find((a) => a.id === this.selAttrId);
      if (attr) {
        attr.position = {
          x: this.mouseWorld.x - this.dragOffset.x,
          y: this.mouseWorld.y - this.dragOffset.y,
        };
      }
    }
  }

  private onMouseUp() {
    if (this.draggingAttr && this.selAttrId !== null) {
      const attr = this.map.attributes.find((a) => a.id === this.selAttrId);
      if (attr) {
        const previewMap = this.buildPreviewMap();
        if (!isOnLand(attr.position, previewMap)) {
          setToolbarStatus("Can't place on water! Moved back.");
        }
      }
    }
    // Finalize drawing
    if (this.isDrawing) {
      this.isDrawing = false;
      this.finalizeDrawing();
    }

    this.isPanning = false;
    this.draggingPt = false;
    this.draggingAttr = false;
  }

  private finalizeDrawing() {
    if (this.drawnPath.length < 20) {
      setToolbarStatus("Draw a bigger loop! Hold mouse and paint a full circle.");
      this.drawnPath = [];
      return;
    }

    const centerline = processDrawnPath(this.drawnPath, CENTERLINE_POINTS);
    if (centerline.length < 3) {
      setToolbarStatus("Could not process shape. Try drawing a cleaner loop.");
      this.drawnPath = [];
      return;
    }

    this.draftOutline = offsetPolygon(centerline, RIVER_HALF_WIDTH);
    this.draftIsland = offsetPolygon(centerline, -RIVER_HALF_WIDTH);
    this.drawnPath = [];

    // Auto-switch to edit mode so user can refine
    this.setOutlineSubMode("edit");
    setToolbarStatus("River generated! Fine-tune the points or click Apply.");
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    this.zoom = Math.max(0.1, Math.min(3, this.zoom * factor));
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.code === "Escape") {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.drawnPath = [];
        setToolbarStatus("Drawing cancelled.");
        return;
      }
      if (this.previewing) {
        this.previewing = false;
        this.setOutlineSubMode(this.outlineSubMode);
      } else if (this.placingType) {
        this.placingType = null;
        setToolbarStatus("Placement cancelled.");
      } else if (this.bridgeStart) {
        this.bridgeStart = null;
        setToolbarStatus("Bridge cancelled.");
      }
      return;
    }

    if (e.code === "Delete" || e.code === "Backspace") {
      if (this.mode === "outline" && this.selPtIdx !== null) {
        this.activeDraft.splice(this.selPtIdx, 1);
        this.selPtIdx = null;
        setToolbarStatus("Point deleted.");
      } else if (this.mode === "attributes" && this.selAttrId !== null) {
        this.map.attributes = this.map.attributes.filter((a) => a.id !== this.selAttrId);
        this.selAttrId = null;
        setCurrentMap(this.map);
        setToolbarStatus("Attribute deleted.");
      } else if (this.mode === "bridges") {
        this.deleteNearestBridge();
      }
    }
  }

  // ─── Outline mode ────────────────────────────────────

  private onOutlineMouseDown() {
    // Draw mode: start painting
    if (this.outlineSubMode === "draw") {
      this.isDrawing = true;
      this.drawnPath = [{ ...this.mouseWorld }];
      setToolbarStatus("Painting... release to finish.");
      return;
    }

    // Edit mode: point manipulation
    const wp = this.mouseWorld;
    const pts = this.activeDraft;

    // Hit existing point
    for (let i = 0; i < pts.length; i++) {
      if (Math.hypot(pts[i].x - wp.x, pts[i].y - wp.y) < POINT_HIT_RADIUS / this.zoom) {
        this.selPtIdx = i;
        this.draggingPt = true;
        setToolbarStatus(`Point ${i} selected. Drag to move, Del to remove.`);
        return;
      }
    }

    // Insert on edge
    if (pts.length >= 2) {
      let bestDist = Infinity;
      let bestEdge = -1;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        const dSq = distToSegmentSq(wp, pts[i], pts[j]);
        if (dSq < bestDist) {
          bestDist = dSq;
          bestEdge = i;
        }
      }
      if (bestDist < (12 / this.zoom) ** 2 && bestEdge >= 0) {
        pts.splice(bestEdge + 1, 0, { ...wp });
        this.selPtIdx = bestEdge + 1;
        this.draggingPt = true;
        setToolbarStatus(`Point inserted.`);
        return;
      }
    }

    // Add at end
    pts.push({ ...wp });
    this.selPtIdx = pts.length - 1;
    setToolbarStatus(`Point added. ${pts.length} total.`);
  }

  private renderOutlineOverlay(ctx: CanvasRenderingContext2D) {
    // Drawing mode: show the live stroke
    if (this.isDrawing && this.drawnPath.length > 1) {
      ctx.strokeStyle = "#ffcc00";
      ctx.lineWidth = 3 / this.zoom;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(this.drawnPath[0].x, this.drawnPath[0].y);
      for (let i = 1; i < this.drawnPath.length; i++) {
        ctx.lineTo(this.drawnPath[i].x, this.drawnPath[i].y);
      }
      ctx.stroke();

      // Show river width preview as a translucent band
      ctx.strokeStyle = "rgba(26,58,92,0.3)";
      ctx.lineWidth = RIVER_HALF_WIDTH * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(this.drawnPath[0].x, this.drawnPath[0].y);
      for (let i = 1; i < this.drawnPath.length; i++) {
        ctx.lineTo(this.drawnPath[i].x, this.drawnPath[i].y);
      }
      ctx.stroke();

      // Start point marker
      ctx.fillStyle = "#4f4";
      ctx.beginPath();
      ctx.arc(this.drawnPath[0].x, this.drawnPath[0].y, 8 / this.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineCap = "butt";
      return;
    }

    // Edit mode: show point overlays
    this.renderPolygonOverlay(ctx, this.draftOutline, this.outlineTarget === "outer", "#4af");
    this.renderPolygonOverlay(ctx, this.draftIsland, this.outlineTarget === "island", "#fa4");
  }

  private renderPolygonOverlay(
    ctx: CanvasRenderingContext2D,
    pts: Vec2[],
    isActive: boolean,
    color: string,
  ) {
    if (pts.length === 0) return;

    const dimColor = isActive ? color : `${color}66`;

    // Lines
    ctx.strokeStyle = dimColor;
    ctx.lineWidth = (isActive ? 2 : 1) / this.zoom;
    ctx.setLineDash([6 / this.zoom, 4 / this.zoom]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (pts.length >= 3) ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Points
    const r = (isActive ? POINT_RADIUS : POINT_RADIUS * 0.6) / this.zoom;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isActive && i === this.selPtIdx ? "#ff4444" : dimColor;
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.stroke();

      if (isActive) {
        ctx.fillStyle = "#000";
        ctx.font = `${10 / this.zoom}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i), p.x, p.y);
      }
    }
  }

  // ─── Attributes mode ─────────────────────────────────

  private onAttributesMouseDown() {
    const wp = this.mouseWorld;

    if (this.placingType) {
      if (isOnLand(wp, this.map)) {
        this.map.attributes.push({
          id: this.nextAttrId++,
          type: this.placingType,
          position: { ...wp },
        });
        setCurrentMap(this.map);
        setToolbarStatus(`${this.placingType} placed.`);
      } else {
        setToolbarStatus("Can't place on water! Click on green land.");
      }
      return;
    }

    for (const attr of this.map.attributes) {
      if (Math.hypot(attr.position.x - wp.x, attr.position.y - wp.y) < ATTR_HIT_RADIUS / this.zoom) {
        this.selAttrId = attr.id;
        this.draggingAttr = true;
        this.dragOffset = { x: wp.x - attr.position.x, y: wp.y - attr.position.y };
        setToolbarStatus(`Selected ${attr.type}. Drag to move, Del to remove.`);
        return;
      }
    }

    this.selAttrId = null;
    setToolbarStatus("Select an item above, then click on land to place.");
  }

  private renderAttributesOverlay(ctx: CanvasRenderingContext2D) {
    // Red tint on water (invalid zone)
    if (this.placingType && this.map.outline.length >= 3) {
      ctx.fillStyle = "rgba(255,50,50,0.06)";
      ctx.beginPath();
      ctx.moveTo(this.map.outline[0].x, this.map.outline[0].y);
      for (let i = 1; i < this.map.outline.length; i++) {
        ctx.lineTo(this.map.outline[i].x, this.map.outline[i].y);
      }
      ctx.closePath();
      ctx.fill();

      const onLand = isOnLand(this.mouseWorld, this.map);
      ctx.globalAlpha = 0.5;
      if (onLand) {
        renderAttributeMarker(ctx, this.mouseWorld.x, this.mouseWorld.y, this.placingType);
      } else {
        const s = 10 / this.zoom;
        ctx.strokeStyle = "#ff4444";
        ctx.lineWidth = 3 / this.zoom;
        ctx.beginPath();
        ctx.moveTo(this.mouseWorld.x - s, this.mouseWorld.y - s);
        ctx.lineTo(this.mouseWorld.x + s, this.mouseWorld.y + s);
        ctx.moveTo(this.mouseWorld.x + s, this.mouseWorld.y - s);
        ctx.lineTo(this.mouseWorld.x - s, this.mouseWorld.y + s);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    if (this.selAttrId !== null) {
      const attr = this.map.attributes.find((a) => a.id === this.selAttrId);
      if (attr) {
        ctx.strokeStyle = "#ffcc00";
        ctx.lineWidth = 2 / this.zoom;
        ctx.setLineDash([4 / this.zoom, 3 / this.zoom]);
        ctx.beginPath();
        ctx.arc(attr.position.x, attr.position.y, 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // ─── Bridges mode ────────────────────────────────────

  private onBridgesMouseDown() {
    const wp = this.mouseWorld;

    if (!this.bridgeStart) {
      if (isOnLand(wp, this.map)) {
        this.bridgeStart = { ...wp };
        setToolbarStatus("Start set. Click second land point.");
      } else {
        setToolbarStatus("Bridge must start on land!");
      }
    } else {
      if (!isOnLand(wp, this.map)) {
        setToolbarStatus("Bridge must end on land!");
        return;
      }

      const crossesWater =
        lineIntersectsPolygon(this.bridgeStart, wp, this.map.outline) ||
        lineIntersectsPolygon(this.bridgeStart, wp, this.map.island);
      if (!crossesWater) {
        setToolbarStatus("Bridge must cross water!");
        this.bridgeStart = null;
        return;
      }

      this.map.bridges.push({
        id: this.nextBridgeId++,
        start: { ...this.bridgeStart },
        end: { ...wp },
        width: 20,
      });
      setCurrentMap(this.map);
      this.bridgeStart = null;
      setToolbarStatus("Bridge placed. Del to remove nearby.");
    }
  }

  private deleteNearestBridge() {
    const wp = this.mouseWorld;
    let bestDist = Infinity;
    let bestId = -1;

    for (const b of this.map.bridges) {
      const dx = b.end.x - b.start.x;
      const dy = b.end.y - b.start.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;
      const t = Math.max(
        0,
        Math.min(1, ((wp.x - b.start.x) * dx + (wp.y - b.start.y) * dy) / lenSq),
      );
      const dist = Math.hypot(wp.x - (b.start.x + t * dx), wp.y - (b.start.y + t * dy));
      if (dist < bestDist) {
        bestDist = dist;
        bestId = b.id;
      }
    }

    if (bestId >= 0 && bestDist < 30 / this.zoom) {
      this.map.bridges = this.map.bridges.filter((b) => b.id !== bestId);
      setCurrentMap(this.map);
      setToolbarStatus("Bridge deleted.");
    }
  }

  private renderBridgesOverlay(ctx: CanvasRenderingContext2D) {
    if (this.bridgeStart) {
      const onLand = isOnLand(this.mouseWorld, this.map);
      ctx.strokeStyle = onLand ? "rgba(160,128,96,0.6)" : "rgba(255,50,50,0.6)";
      ctx.lineWidth = 20;
      ctx.lineCap = "round";
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(this.bridgeStart.x, this.bridgeStart.y);
      ctx.lineTo(this.mouseWorld.x, this.mouseWorld.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineCap = "butt";

      ctx.fillStyle = "#ffcc00";
      ctx.beginPath();
      ctx.arc(this.bridgeStart.x, this.bridgeStart.y, 6 / this.zoom, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const b of this.map.bridges) {
      for (const pt of [b.start, b.end]) {
        ctx.fillStyle = "rgba(255,200,100,0.6)";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5 / this.zoom, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
