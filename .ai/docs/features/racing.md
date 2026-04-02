# Racing

Main gameplay state. Spawns player boat on track, runs physics + collision systems, renders world with camera follow, and displays HUD.

```toon
status: active
depends_on[2]: boat-physics,track
entry_point: src/states/racing-state.ts

files[5]{path,purpose}:
  src/states/racing-state.ts,racing game state — orchestrates systems
  src/systems/camera.ts,smooth follow camera with look-ahead and rotation tracking
  src/systems/boat-render.ts,sprite rendering with interpolation + procedural fallback
  src/systems/background-render.ts,water + island + wall + grid rendering
  src/states/menu-state.ts,title screen — transitions to racing on SPACE
```

## Design Notes

- Camera lerps position and angle toward the boat with look-ahead offset (80 units in facing direction)
- Camera rotation follows boat heading — screen rotates so boat always "faces up"
- HUD shows speed and motor voltage percentage
- Boat render interpolates between `prevPos` and `pos` using alpha for sub-frame smoothness

## Gotchas

- `applyCameraTransform` calls `ctx.save()` — the matching `ctx.restore()` happens in `RacingState.render()`, not in the camera module
- Menu state waits for space to be released before accepting input — prevents instant skip from previous state
