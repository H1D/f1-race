# Debug Panel

Live physics tuning overlay with sliders and boat presets. Toggle with backtick key or click button.

```toon
status: stable
depends_on[1]: boat-physics
entry_point: src/debug.ts

files[1]{path,purpose}:
  src/debug.ts,HTML debug panel — sliders + presets that mutate boatPhysics component
```

## Design Notes

- `createDebugMenu(params: BoatPhysicsComponent)` accepts a reference — sliders mutate the entity's physics directly
- 4 presets: Yacht (balanced default), Speedboat (fast + grippy), Dinghy (twitchy + drifty), Tugboat (heavy + slow)
- 7 sliders: forwardDrag, lateralDrag, angularDamping, thrustForce, turnTorque, turnSpeedReference, maxSpeed
- Reset button snaps back to Yacht defaults
- Toggle: backtick key or click "` debug" button (top-right)
- Created by `RacingState.enter()`, removed by `RacingState.exit()`

## Gotchas

- Panel is hidden by default — must press backtick or click to show
- Preset apply uses `Object.assign` — replaces all physics fields at once
- Panel is DOM-based (not canvas) — sits above the game as a fixed overlay
