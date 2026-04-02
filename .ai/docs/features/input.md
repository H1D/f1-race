# Input

Keyboard input system with smoothed steering accumulator. Supports arrow keys and WASD.

```toon
status: stable
depends_on[0]:
entry_point: src/input.ts

files[2]{path,purpose}:
  src/input.ts,keyboard listener + steering accumulator
  src/types.ts,InputState interface definition
```

## Design Notes

- Three effective inputs: left, right, throttle (matches the 3-button design in idea.md)
- Steering accumulator builds at 6.0/s toward +/-1, decays at 8.0/s back to center — creates smooth turning feel
- Throttle: Space, ArrowUp, or W
- Steering: ArrowLeft/A (left), ArrowRight/D (right)

## Gotchas

- Input system is global (window event listeners) — `destroy()` must be called on cleanup
- `steeringAccum` is continuous -1..1, not binary — physics system uses this directly as turning input
