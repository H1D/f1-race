# Track

Canal track definition and rendering. Currently a placeholder rectangular moat (outer boundary around inner island).

```toon
status: wip
depends_on[0]:
entry_point: src/track.ts

files[2]{path,purpose}:
  src/track.ts,track boundary factory (placeholder rectangular canal)
  src/systems/background-render.ts,renders water + island + walls + grid
```

## Design Notes

- Track is defined as two AABB rectangles: outer (canal boundary) and inner (island)
- Canal is ~200 units wide on each side
- Start position is at top center of the canal (0, -300), facing right
- Planned: Amsterdam canal layout with curves, multiple paths, and flood zones

## Gotchas

- `TrackBounds` only supports axis-aligned rectangles — will need a different representation for curved canals
- Background render draws a 200-unit margin outside the outer boundary
