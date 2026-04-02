# Racing

Main gameplay state. 5-lap race with checkpoints, finish line, and race timer. Spawns two player boats (P1 red/WASD, P2 yellow/Arrows) on the polygon map, runs physics + collision for each, renders world with dual-mode camera, displays per-player HUD, and provides access to the map editor.

```toon
status: active
depends_on[5]: boat-physics,track,camera,input,debug
entry_point: src/states/racing-state.ts

files[5]{path,purpose}:
  src/states/racing-state.ts,racing game state — 2 boats + lap tracking + checkpoints + timer + win screen
  src/systems/boat-render.ts,boat.png sprite rendering with interpolation + procedural fallback
  src/map/map-renderer.ts,"polygon map rendering (water channel + land + bridges + attributes + finish line + checkpoint flags)"
  src/states/menu-state.ts,title screen — press space to start
  src/entity.ts,boat entity factory with physics defaults
```

## Design Notes

- Two boats: P1 (red #e04040, WASD) and P2 (yellow #e0c040, Arrows), offset 50 units apart at start
- Physics + polygon collision run independently for each boat each tick, then boat-to-boat collision resolves between them
- **5-lap race**: boats must cross 3 checkpoints in order per lap, then the finish line to complete a lap. First to 5 laps wins
- **Checkpoints**: `Gate` type (two endpoints), stored in `MapData.checkpoints[]`. Crossing detected via `segmentsCross()` on boat prev→curr path. Rendered as orange marker flags on both banks
- **Finish line**: checkered black/white pattern spanning full river width. `MapData.finishLine` (Gate type). Only counts after all checkpoints passed
- **Race timer**: starts after 2s grace period, displays `M:SS.ms` at bottom center. Freezes on win
- **Win screen**: dark overlay fades in, shows winner name in their color + finishing time + "RACE FINISHED". Press SPACE to restart (new RacingState)
- **Lap HUD**: top center shows laps remaining per player in large bold text
- Camera starts in fixed mode (frames both boats with dynamic zoom)
- Render order: map → checkpoint flags → finish line → boats → bridges (boats pass under bridges)
- Speed HUD: P1 speed (red) + P2 speed (yellow), top-right
- "Editor" button (top-left) switches to `EditorState`

## Sound Integration

`RacingState` owns the `SoundSystem` instance and drives all audio:
- Engine hum + water ambient are continuous sounds started inside the first-keypress `AudioContext` init handler
- `resolveMapCollisions()` receives a reusable `CollisionResult` out-param — `result.collided` triggers `wall-collision` oneshot
- `resolveBoatCollision()` return value triggers `boat-collision` oneshot
- Pickup events → `pickup`, expired effects → `expire`, penalty rising-edge → `penalty`
- Flood state transitions trigger `flood-start`/`flood-end`; countdown ≤5s fires `flood-warning` each new second
- `updateSound(dt)` called at end of each update tick for voice cleanup
- `destroySound()` called in `exit()` — closes AudioContext and removes the keydown listener

## Gotchas

- `applyCameraTransform` calls `ctx.save()` — matching `ctx.restore()` in `RacingState.render()`
- 2-second grace period prevents finish line trigger at race start
- Checkpoint progress resets to 0 after each completed lap
- Restart listener (`keydown` for Space) is added after 2s win delay and cleaned up in `exit()`
- Menu state waits for space release before allowing transition
- Debug panel + editor button are HTML overlays, removed in `exit()`
