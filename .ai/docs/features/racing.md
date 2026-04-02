# Racing

Main gameplay state. Spawns one player boat on the polygon map, runs physics + collision each tick, renders world with follow camera, displays HUD, and provides access to the map editor.

```toon
status: active
depends_on[5]: boat-physics,track,camera,input,debug
entry_point: src/states/racing-state.ts

files[5]{path,purpose}:
  src/states/racing-state.ts,racing game state — creates boat + map + camera + debug + editor button
  src/systems/boat-render.ts,boat.png sprite rendering with interpolation + procedural fallback
  src/map/map-renderer.ts,polygon-based map rendering (water channel + land + bridges + attributes)
  src/states/menu-state.ts,title screen — press space to start
  src/entity.ts,boat entity factory with physics defaults
```

## Design Notes

- Single boat spawned at `map.startPos` with `map.startAngle`
- Physics + polygon collision each tick: `updatePhysics()` + `resolveMapCollisions()`
- Map loaded from shared `getCurrentMap()` singleton
- HUD: speed + motor voltage (top-right, monospace, semi-transparent)
- "Editor" button (top-left) switches to `EditorState`
- On return from editor, RacingState re-reads the (possibly modified) MapData

## Gotchas

- `applyCameraTransform` calls `ctx.save()` — matching `ctx.restore()` in `RacingState.render()`
- Menu state waits for space release before allowing transition
- Debug panel + editor button are HTML overlays, removed in `exit()`
