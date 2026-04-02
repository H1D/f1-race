# Flooding

Periodic flood mechanic that temporarily covers the entire map with water, removing land restrictions. After the flood recedes, boats caught on land receive a penalty (flash + freeze) then snap back to valid water aligned to the river.

```toon
status: active
depends_on[2]: track,racing
entry_point: src/systems/flooding.ts

files[2]{path,purpose}:
  src/systems/flooding.ts,"flood state machine, penalty system, settings panel, flood rendering"
  src/states/racing-state.ts,integrates flood update + render + per-boat penalties into game loop
```

## Design Notes

- **Cycle**: Idle (20s) → Flooding (5s) → Recovering → Idle. Configurable via settings panel
- **waterLevel**: 0–1 float drives visuals + physics. Collision skipped when `waterLevel > 0.3`
- **Visuals**: water-colored overlay fades in over land, animated wave lines at high levels, attribute lift rings + shadows
- **Penalty**: when flood recedes and boat is on land → freeze for `penaltyDuration` (default 1s), flash at ~4Hz, then snap to nearest outline edge aligned to river tangent
- **BoatPenalty**: per-boat struct `{ active, remaining }` — freezes velocity + motor during penalty
- **Settings panel**: "Flood" button in top bar. Sliders: cycle interval, duration, penalty, rise/fall speed. Toggles: enabled, lift objects. Manual "Flood Now" trigger
- **HUD**: "FLOOD 3.2s" during active flood, "RECEDING..." during recovery, "FLOOD IN 2.1s" warning, "P1: PENALTY 0.8s" during penalty

## Gotchas

- `penaltyChecked` flag prevents re-triggering penalties within the same flood cycle
- Boat snap-back aligns to nearest outline edge tangent so the boat faces along the river
- Collision still enforces world boundary during flooding — only land collision is skipped
- Flood rendering happens after `renderMap()` but before boats — overlay sits on land layer
