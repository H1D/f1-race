import type { TrackBounds } from "./types";

// Placeholder rectangular canal: a moat around a central island
// Canal width is 200 units on each side
export function createPlaceholderTrack(): TrackBounds {
  return {
    outer: { minX: -600, minY: -400, maxX: 600, maxY: 400 },
    inner: { minX: -400, minY: -200, maxX: 400, maxY: 200 },
    startX: 0,
    startY: -300,
    startAngle: 0, // facing right
  };
}
