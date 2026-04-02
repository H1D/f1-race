# Debug Panel

Live physics tuning overlay with camera mode toggle, per-boat sliders, and boat presets. Toggle with backtick key or click button.

```toon
status: active
depends_on[2]: boat-physics,camera
entry_point: src/debug.ts

files[1]{path,purpose}:
  src/debug.ts,HTML debug panel — camera toggle + per-boat sliders/presets
```

## Design Notes

- `createDebugMenu(boat1Physics, camera?, boat2Physics?)` — accepts references, mutates directly
- **Camera section**: buttons for Fixed mode, Follow P1, Follow P2 — sets `camera.followTarget`
- **Per-boat sections**: independent sliders and presets for each boat's physics
- 4 presets: Yacht (balanced default), Speedboat (fast + grippy), Dinghy (twitchy + drifty), Tugboat (heavy + slow)
- 7 sliders per boat: forwardDrag, lateralDrag, angularDamping, thrustForce, turnTorque, turnSpeedReference, maxSpeed
- Reset button snaps back to Yacht defaults (per boat)
- Toggle: backtick key or click "` debug" button (top-right)
- Created by `RacingState.enter()`, removed by `RacingState.exit()`

## Gotchas

- Panel is hidden by default — must press backtick or click to show
- Preset apply uses `Object.assign` — replaces all physics fields at once
- Panel is DOM-based (not canvas) — sits above the game as a fixed overlay
- Each boat's sliders are independent — changing P1 physics doesn't affect P2
