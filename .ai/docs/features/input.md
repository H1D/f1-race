# Input

Single-player keyboard input system with smoothed steering accumulator. Arrow keys and WASD for movement.

```toon
status: active
depends_on[0]:
entry_point: src/input.ts

files[2]{path,purpose}:
  src/input.ts,keyboard listener + steering accumulator
  src/types.ts,InputState interface
```

## Design Notes

- Inputs: left (ArrowLeft/A), right (ArrowRight/D), throttle (ArrowUp/W/Space)
- Steering accumulator builds at 6.0/s toward +/-1, decays at 8.0/s back to center
- `createInputSystem()` returns `{ state, update, destroy }`
- `GameState.update()` receives `InputState` directly

## Gotchas

- Input system is global (window event listeners) — `destroy()` must be called on cleanup
- `steeringAccum` is continuous -1..1 — physics uses this directly as turning input
