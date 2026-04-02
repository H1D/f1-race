# Sound

Procedural audio system built on the Web Audio API. All sounds are synthesized at runtime — no audio files. Follows the factory + free-function ECS pattern used throughout the codebase.

```toon
status: active
depends_on[2]: racing,boat-physics
entry_point: src/sound/sound.ts

files[10]{path,purpose}:
  src/sound/sound.ts,SoundSystem factory + full public API (play/start/update/stop/cleanup)
  src/sound/synth.ts,Web Audio primitives — noise buffer gen + ADSR envelope + osc/filter/noise builders
  src/sound/definitions/engine.ts,continuous motor hum (sawtooth+square) — pitch/gain track voltage
  src/sound/definitions/collision.ts,boat-boat + wall impact one-shots (noise + sine)
  src/sound/definitions/pickup.ts,powerup collect (C-E-G triad) + expire (descending triangles)
  src/sound/definitions/flood.ts,flood warning beep + start rumble + end wash
  src/sound/definitions/ambient.ts,water ambience (pink noise) — gain tracks boat speed
  src/sound/definitions/penalty.ts,dissonant sawtooth pair for penalty event
  src/types.ts,SoundCategory + SoundEnvelope + OscillatorConfig + NoiseConfig + FilterConfig + SoundDefinition + SoundParams + ActiveVoice + SoundSystem
  src/systems/collision.ts,resolveMapCollisions() — optional CollisionResult out-param for wall hit sound triggers
```

## Design Notes

- **AudioContext lifecycle**: Lazy init on first keypress (Chrome autoplay policy). `createSoundSystem()` returns a shell; `initAudio()` is called inside a `keydown` handler in `RacingState.enter()`. All API calls are no-ops before init
- **Two sound modes**: `oneshot` (fire-and-forget with ADSR scheduled stop) and `continuous` (looping, updated every tick via `updateContinuous`)
- **Tag system**: Continuous sounds accept a `tag` string for multi-instance (e.g., engine "p1" + engine "p2")
- **Data-driven definitions**: `SoundDefinition` objects describe synthesis recipe — oscillators, noise, filter, envelope, ADSR, `mapParams` for param→audio mappings. Analogous to `PowerupDefinition`
- **Smooth param updates**: `setTargetAtTime(value, now, 0.016)` used in `updateContinuous` — avoids zipper noise at 60Hz
- **Noise types**: White (uniform), pink (Voss-McCartney 7-register), brown (integrated white). Pre-generated 2s looping buffers per type
- **Voice management**: Flat `voices[]` array, per-definition `maxVoices` cap. Voice stealing kills oldest voice when cap exceeded. Write-index compaction in `updateSound()` removes expired voices without allocation

## Sounds

| ID | Mode | Synthesis | Trigger |
|----|------|-----------|---------|
| `engine` | continuous | sawtooth(80Hz)+square(40Hz), lowpass | per boat, per tick — freq+gain map to voltage |
| `water-ambient` | continuous | pink noise, lowpass | per tick — gain+filter map to avg boat speed |
| `wall-collision` | oneshot | brown noise+sine(150Hz), lowpass | `resolveMapCollisions` result.collided |
| `boat-collision` | oneshot | white noise+sine(200Hz), bandpass | after `resolveBoatCollision` returns true |
| `pickup` | oneshot | sine C5+E5+G5 triad | pickup event loop |
| `expire` | oneshot | triangle(400Hz)+triangle(300Hz) | expired effects loop |
| `flood-warning` | oneshot | square(440Hz) | each new second of flood countdown ≤5s |
| `flood-start` | oneshot | pink noise+sine(100Hz), lowpass | flood active transition |
| `flood-end` | oneshot | pink noise+sine(200Hz), highpass | flood inactive transition |
| `penalty` | oneshot | sawtooth(200Hz)+sawtooth(150Hz) | penalty rising edge |

## Gotchas

- Web Audio requires `start()` before `stop()` — violating this throws `InvalidStateError`. `buildVoice` calls `start(now)` then `stop(stopTime)` in strict order
- `destroySound()` is called in `RacingState.exit()` — this closes the `AudioContext` and stops all voices
- The `_audioInitHandler` keydown listener is also removed in `exit()` to prevent leaks if the player exits before pressing a key
- Engine and ambient sounds are started inside the `keydown` handler (not in `enter()`), to ensure AudioContext is ready
