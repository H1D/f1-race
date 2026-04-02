# Map Editor

In-game overlay editor for designing polygon-based river tracks. Three modes: outline drawing (freehand paint or point editing), attribute placement (shops on land), and bridge creation (land-to-land over water). Accessible via "Editor" button during racing.

```toon
feature:
  status: active
  depends_on: track
  entry_point: src/editor/editor-state.ts
```

## Files

```toon
files[5]{path,role}:
  src/editor/editor-state.ts,main editor GameState — draw/edit/attributes/bridges modes
  src/editor/toolbar.ts,HTML toolbar with mode tabs and action buttons
  src/map/geometry.ts,point-in-polygon + path processing (simplify/smooth/resample/offset)
  src/map/map-data.ts,shared MapData singleton + land/water queries
  src/map/map-renderer.ts,renders water channel + land + bridges + attributes on canvas
```

## Design Notes

- **Draw mode**: user paints freehand loop → Douglas-Peucker simplify → Chaikin smooth (2 passes) → resample to 12 points → offset ±90px for outer bank/island
- **Edit mode**: drag individual points on outer bank or island. Linked dragging moves both polygons together. Constraints enforce min channel width (80px), min turn angle (75deg), island-inside-outer
- **Attributes**: Albert Heijn, Effendi, Doctor Falafel — placeable on land only. Drag to reposition, Del to remove
- **Bridges**: two-click land-to-land placement. Must cross water. 20px wide brown planked rectangles
- **Validation on Apply**: checks min 3 points per polygon, island inside outer, channel width, turn angles. Fails → reset to default + popup
- **Top-down camera**: pan (right-click drag), zoom (scroll wheel), separate from racing camera
- **Rendering**: green land fill → water polygon with clipped grid → island green fill → wall strokes → bridges → attributes. Uses `arcTo` with 60px radius for smooth curves

## Gotchas

- Circular import between `EditorState` and `RacingState` — works because classes only instantiated in callbacks, not at module init
- Collision uses raw polygon points (straight edges), renderer uses `arcTo` curves — slight visual discrepancy at corners
- `MapData` is a shared singleton via `getCurrentMap()`/`setCurrentMap()` — both states access the same data
- Reset clears everything: outline, island, attributes, bridges
