# Racing

Main gameplay state. Spawns two player boats on track, runs physics + collision for each, renders world with dual-mode camera, displays per-player HUD, and creates debug panel.

```toon
status: active
depends_on[4]: boat-physics,track,camera,debug
entry_point: src/states/racing-state.ts

files[5]{path,purpose}:
  src/states/racing-state.ts,racing game state — orchestrates systems for 2 boats + creates debug panel
  src/systems/boat-render.ts,boat.png sprite rendering with interpolation + procedural fallback
  src/systems/background-render.ts,water + island + wall + grid rendering
  src/states/menu-state.ts,title screen — transitions to racing on SPACE
  src/entity.ts,boat entity factory (spawned twice for P1 and P2)
```

## Design Notes

- Two boats spawned: Player 1 (red #e04040, WASD) and Player 2 (yellow #e0c040, Arrows)
- Player 2 offset 50 units below Player 1 at start
- Physics + collision run independently for each boat each tick
- HUD shows P1 speed (red) and P2 speed (yellow) — top-right corner
- Boat rendered using `boat.png` sprite with procedural polygon fallback while image loads
- Debug panel created in `enter()`, cleaned up (DOM removal) in `exit()`

## Gotchas

- `applyCameraTransform` calls `ctx.save()` — the matching `ctx.restore()` happens in `RacingState.render()`, not in the camera module
- Menu state waits for space to be released before accepting input — prevents instant skip from previous state
- Debug panel is an HTML overlay (DOM elements) — not drawn on canvas
- HUD no longer shows motor voltage — only speed per player
