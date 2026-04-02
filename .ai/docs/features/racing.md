# Racing

Main gameplay state. Spawns two player boats (P1 red/WASD, P2 yellow/Arrows) on the polygon map, runs physics + collision for each, renders world with dual-mode camera, displays per-player HUD, and provides access to the map editor.

```toon
status: active
depends_on[5]: boat-physics,track,camera,input,debug
entry_point: src/states/racing-state.ts

files[5]{path,purpose}:
  src/states/racing-state.ts,racing game state — creates 2 boats + map + camera + debug + editor button
  src/systems/boat-render.ts,boat.png sprite rendering with interpolation + procedural fallback
  src/map/map-renderer.ts,polygon-based map rendering (water channel + land + bridges + attributes)
  src/states/menu-state.ts,title screen — press space to start
  src/entity.ts,boat entity factory with physics defaults
```

## Design Notes

- Two boats: P1 (red #e04040, WASD) and P2 (yellow #e0c040, Arrows), offset 50 units apart at start
- Physics + polygon collision run independently for each boat each tick
- Camera starts in fixed mode (frames both boats with dynamic zoom)
- Render order: map → boats → bridges (boats pass under bridges)
- HUD: P1 speed (red) + P2 speed (yellow), top-right
- "Editor" button (top-left) switches to `EditorState`
- Debug panel has per-boat physics sections + camera mode toggle

## Gotchas

- `applyCameraTransform` calls `ctx.save()` — matching `ctx.restore()` in `RacingState.render()`
- Menu state waits for space release before allowing transition
- Debug panel + editor button are HTML overlays, removed in `exit()`
