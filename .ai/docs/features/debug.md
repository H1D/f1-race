# Debug Panel

Live tuning overlay with camera mode toggle, per-boat physics sliders, boat presets, and per-powerup tunable knobs. Toggle with backtick key or click button.

```toon
status: active
depends_on[3]: boat-physics,camera,powerups
entry_point: src/debug.ts

files[2]{path,purpose}:
  src/debug.ts,HTML debug panel — camera toggle + per-boat sliders/presets + shared panel/tab helpers
  src/powerup-debug.ts,POWERUPS panel (spawn controls + per-powerup tunable knobs) + GENERAL panel (flood/log/live)
```

## Design Notes

- `createDebugMenu(boat1Physics, camera?, boat2Physics?)` — accepts references, mutates directly
- `createPowerupDebugSection(ctx)` — POWERUPS + GENERAL panels with live state mutation
- **Camera section**: buttons for Fixed mode, Follow P1, Follow P2 — sets `camera.followTarget`
- **Per-boat sections**: independent sliders and presets for each boat's physics
- 4 presets: Yacht (balanced default), Speedboat (fast + grippy), Dinghy (twitchy + drifty), Tugboat (heavy + slow)
- 7 sliders per boat: forwardDrag, lateralDrag, angularDamping, thrustForce, turnTorque, turnSpeedReference, maxSpeed
- Reset button snaps back to Yacht defaults (per boat)
- **Per-powerup tabs**: each tab has core knobs (Duration, Rarity, Max stacks) + auto-generated sliders from `def.tunables` (e.g. speedMult, thrustMult)
- Spawn controls: interval slider, max pickups slider, Spawn now / Clear pickups / Clear effects buttons
- Toggle: backtick key or click "` debug" button (top-right)
- Created by `RacingState.enter()`, removed by `RacingState.exit()`

## Gotchas

- Panel is hidden by default — must press backtick or click to show
- Preset apply uses `Object.assign` — replaces all physics fields at once
- Panel is DOM-based (not canvas) — sits above the game as a fixed overlay
- Each boat's sliders are independent — changing P1 physics doesn't affect P2
- Powerup tunable changes take effect on next pickup — already-active effects keep their snapshot values
