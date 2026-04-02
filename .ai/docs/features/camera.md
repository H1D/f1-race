# Camera

Dual-mode camera system with smooth transitions. Follow mode tracks a single entity with look-ahead and rotation. Fixed mode frames all entities with dynamic zoom and no rotation.

```toon
status: active
depends_on[0]:
entry_point: src/systems/camera.ts

files[2]{path,purpose}:
  src/systems/camera.ts,dual-mode camera — follow (single entity) + fixed (all entities + dynamic zoom)
  src/types.ts,CameraState interface (zoom / followTarget / entities / transition state)
```

## Design Notes

- **Follow mode** (`followTarget` set): lerps toward target + 80-unit look-ahead in facing direction, rotates screen so boat "faces up"
- **Fixed mode** (`followTarget` null): centers on midpoint of all entities, dynamic zoom to fit bounding box + 400px padding, no rotation (angle lerps to 0)
- Mode switch detected by comparing `followTarget` to `_prevTarget` — triggers 500ms fast-lerp transition
- During transition: lerp factor starts at 0.25 (fast) and eases to normal (0.08 for position, 0.15 for zoom)
- Zoom clamped to 0.1–2.0 range
- `applyCameraTransform` applies translate → rotate → scale → translate pipeline to canvas context
- Camera mode toggled via debug panel buttons (Fixed / Follow P1 / Follow P2)

## Gotchas

- `applyCameraTransform` calls `ctx.save()` — the matching `ctx.restore()` is in `RacingState.render()`, not in camera module
- Fixed mode accounts for camera rotation when computing screen-space bounding box (for smooth zoom during transition from rotated follow mode)
- `_prevTarget` and `_transitionElapsed` are internal bookkeeping — prefixed with `_` but still public on the interface
