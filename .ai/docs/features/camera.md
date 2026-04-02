# Camera

Follow camera that tracks the player boat with look-ahead and rotation.

```toon
status: active
depends_on[0]:
entry_point: src/systems/camera.ts

files[2]{path,purpose}:
  src/systems/camera.ts,follow camera with look-ahead + angle tracking
  src/types.ts,CameraState interface
```

## Design Notes

- Lerps toward target position + 80-unit look-ahead in boat's facing direction
- Rotates screen so boat "faces up" — shortest-path angle lerp avoids 360-degree swing
- Lerp factor: 0.08 (smooth following)
- Zoom: 1.4x (set by RacingState)
- `applyCameraTransform`: translate center → rotate → scale → translate camera position

## Gotchas

- `applyCameraTransform` calls `ctx.save()` — matching `ctx.restore()` is in `RacingState.render()`
- Editor uses its own separate top-down camera (pan/zoom, no rotation)
