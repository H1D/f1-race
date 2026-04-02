# Input

Two-player keyboard input system with smoothed steering accumulators. Player 1 uses WASD, Player 2 uses arrow keys. `createInputSystem()` returns a `DualInput`-compatible object with `player1` and `player2` sub-states.

```toon
status: active
depends_on[0]:
entry_point: src/input.ts

files[2]{path,purpose}:
  src/input.ts,keyboard listener + dual-player steering accumulators
  src/types.ts,InputState + DualInput interface definitions
```

## Design Notes

- Four effective inputs per player: left, right, throttle, reverse
- Player 1: WASD (W=throttle, S=reverse, A=left, D=right)
- Player 2: Arrow keys (Up=throttle, Down=reverse, Left/Right=steer)
- Steering accumulator builds at 6.0/s toward +/-1, decays at 8.0/s back to center — creates smooth turning feel
- `createInputSystem()` returns `{ player1, player2, update, destroy }` — not a single `InputState`
- `GameState.update()` and `GameContext.input` use `DualInput` type (`{ player1: InputState, player2: InputState }`)

## Gotchas

- Input system is global (window event listeners) — `destroy()` must be called on cleanup
- `steeringAccum` is continuous -1..1, not binary — physics system uses this directly as turning input
- `reverse` sets motor `targetVoltage` to -0.4 (slower than forward's 1.0)
