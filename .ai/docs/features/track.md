# Track / Map System

Polygon-based river channel map. Water flows between an outer bank polygon and an inner island polygon. Both rendered with rounded corners (`arcTo` radius 60px). Replaces the legacy AABB TrackBounds system.

```toon
status: active
depends_on[0]:
entry_point: src/map/map-data.ts

files[4]{path,purpose}:
  src/map/map-data.ts,MapData singleton + createDefaultMap + land/water/bridge queries
  src/map/map-renderer.ts,renders green land + water channel + grid + walls + bridges + attributes
  src/map/geometry.ts,"point-in-polygon, edge normals, push in/out, path processing, polygon offset"
  src/types.ts,MapData + MapAttribute + Bridge + AttributeType interfaces
```

## Design Notes

- **MapData**: `outline` (outer bank Vec2[]) + `island` (inner land Vec2[]) + `attributes` + `bridges` + `worldSize` + `startPos`
- **Water**: inside outline AND outside island. `isOnWater()` = `pointInPolygon(outer) && !pointInPolygon(island)`
- **Default map**: 8-point ellipses — outer 900x650, island 720x480, worldSize 1200
- **Collision**: `resolveMapCollisions()` keeps boat inside outline + outside island. Edge-normal push + wall-normal velocity cancellation with sliding friction
- **Rendering**: green fill → water polygon → island green → clipped grid (evenodd) → wall strokes → bridges → attributes

## Gotchas

- `src/track.ts` still exists (legacy AABB) but is unused — racing state uses MapData
- `src/systems/background-render.ts` still exists but is unused — replaced by `map-renderer.ts`
- Push functions use edge outward normals, not centroid direction — prevents stuck-between-walls oscillation
- `PUSH_DIST = 6` + wall-normal velocity cancellation prevents stuck-at-wall issues
