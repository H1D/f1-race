# Game Log

Event logging system for gameplay events. Rendered on canvas with two modes: fade (auto-disappearing toasts) and pinned (persistent timestamped box). The orchestrator (RacingState) writes to the log — systems stay pure.

```toon
status: active
depends_on[1]: racing
entry_point: src/game-log.ts

files[2]{path,purpose}:
  src/game-log.ts,"GameLog data structure + createGameLog() + renderGameLog() — fade/pinned display modes"
  src/powerup-debug.ts,debug panel toggle for log visibility (FADE/PINNED) + clear button
```

## Design Notes

- **Orchestrator-level logging**: systems are pure functions — RacingState observes outputs and logs (set-diff pattern for expirations)
- **Five categories**: pickup (cyan), effect (orange), flood (blue), spawn (green), system (gray)
- **Fade mode** (default): recent entries auto-disappear after 4s + 2s fade. Unobtrusive during play
- **Pinned mode**: persistent box with timestamps (MM:SS), last 8 entries, total count. For debugging
- **Live info updates**: debug panel refreshes entity counts + active effects every 100ms via setInterval

## Gotchas

- `elapsedTime` on GameLog must be updated each frame in `RacingState.update()` — log timestamps depend on it
- The debug section's setInterval is cleaned up via a patched `.remove()` method on the DOM element
- Log entries are capped at 50 to prevent unbounded growth
