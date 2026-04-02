# Debug Panel

Live physics tuning overlay with sliders and boat presets. Toggle with backtick key or click button.

```toon
status: active
depends_on[1]: boat-physics
entry_point: src/debug.ts

files[1]{path,purpose}:
  src/debug.ts,HTML debug panel — physics sliders + presets
```

## Design Notes

- `createDebugMenu(boatPhysics)` — accepts BoatPhysicsComponent reference, mutates directly
- 4 presets: Yacht (balanced), Speedboat (fast + grippy), Dinghy (twitchy + drifty), Tugboat (heavy + slow)
- 7 sliders: forwardDrag, lateralDrag, angularDamping, thrustForce, turnTorque, turnSpeedReference, maxSpeed
- Reset button snaps to Yacht defaults
- Toggle: backtick key or click button (top-right)

## Gotchas

- Panel hidden by default
- Panel is DOM-based (not canvas) — fixed overlay above game
- Created by `RacingState.enter()`, removed by `RacingState.exit()`
