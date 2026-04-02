import type { Vec2 } from "../types";

/** Ray-casting point-in-polygon test */
export function pointInPolygon(p: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;
    const intersect =
      yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Squared distance from point to line segment */
export function distToSegmentSq(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return (p.x - a.x) ** 2 + (p.y - a.y) ** 2;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return (p.x - projX) ** 2 + (p.y - projY) ** 2;
}

/** Nearest point on a segment to p */
export function nearestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: a.x, y: a.y };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

function crossSign(a: Vec2, b: Vec2, c: Vec2): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** Do two line segments properly cross? */
export function segmentsCross(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): boolean {
  const d1 = crossSign(a1, a2, b1);
  const d2 = crossSign(a1, a2, b2);
  const d3 = crossSign(b1, b2, a1);
  const d4 = crossSign(b1, b2, a2);
  return (d1 > 0 !== d2 > 0) && (d3 > 0 !== d4 > 0);
}

/** Does a line segment cross any edge of the polygon? */
export function lineIntersectsPolygon(a: Vec2, b: Vec2, polygon: Vec2[]): boolean {
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (segmentsCross(a, b, polygon[i], polygon[j])) return true;
  }
  return false;
}

// ─── Collision push helpers ────────────────────────────

const PUSH_DIST = 4;

/**
 * Find nearest edge and its outward normal.
 * For a CCW polygon, outward = right-hand normal of edge direction.
 * We detect winding by checking against centroid.
 */
export function findNearestEdge(p: Vec2, polygon: Vec2[]) {
  let bestDistSq = Infinity;
  let bestPoint: Vec2 = p;
  let bestI = 0;
  let bestJ = 0;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const nearest = nearestPointOnSegment(p, polygon[j], polygon[i]);
    const dSq = (p.x - nearest.x) ** 2 + (p.y - nearest.y) ** 2;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestPoint = nearest;
      bestI = i;
      bestJ = j;
    }
  }

  // Edge direction j→i
  const ex = polygon[bestI].x - polygon[bestJ].x;
  const ey = polygon[bestI].y - polygon[bestJ].y;
  // Right-hand perpendicular
  let nx = ey;
  let ny = -ex;
  const nLen = Math.hypot(nx, ny);
  if (nLen > 0) {
    nx /= nLen;
    ny /= nLen;
  }

  // Ensure normal points outward (away from centroid)
  let cx = 0;
  let cy = 0;
  for (const pt of polygon) {
    cx += pt.x;
    cy += pt.y;
  }
  cx /= polygon.length;
  cy /= polygon.length;
  if (nx * (bestPoint.x - cx) + ny * (bestPoint.y - cy) < 0) {
    nx = -nx;
    ny = -ny;
  }

  return { point: bestPoint, nx, ny, distSq: bestDistSq };
}

/** Push a point out of a polygon along the edge outward normal. Returns null if already outside. */
export function pushOutOfPolygon(p: Vec2, polygon: Vec2[]): Vec2 | null {
  if (!pointInPolygon(p, polygon)) return null;

  const { point, nx, ny } = findNearestEdge(p, polygon);
  return { x: point.x + nx * PUSH_DIST, y: point.y + ny * PUSH_DIST };
}

/** Push a point into a polygon along the edge inward normal. Returns null if already inside. */
export function pushIntoPolygon(p: Vec2, polygon: Vec2[]): Vec2 | null {
  if (pointInPolygon(p, polygon)) return null;

  const { point, nx, ny } = findNearestEdge(p, polygon);
  return { x: point.x - nx * PUSH_DIST, y: point.y - ny * PUSH_DIST };
}

// ─── Path processing (freehand → smooth polygon) ──────

/** Douglas-Peucker line simplification */
function rdp(pts: Vec2[], tolerance: number): Vec2[] {
  if (pts.length <= 2) return pts;
  const first = pts[0];
  const last = pts[pts.length - 1];
  let maxDist = 0;
  let maxIdx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.sqrt(distToSegmentSq(pts[i], first, last));
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > tolerance) {
    const left = rdp(pts.slice(0, maxIdx + 1), tolerance);
    const right = rdp(pts.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

/** Simplify a closed polygon using Douglas-Peucker */
export function simplifyPolygon(pts: Vec2[], tolerance: number): Vec2[] {
  if (pts.length <= 4) return pts;
  // Split at the farthest point from pts[0], simplify each half
  let maxDist = 0;
  let splitIdx = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[0].x, pts[i].y - pts[0].y);
    if (d > maxDist) { maxDist = d; splitIdx = i; }
  }
  const half1 = rdp(pts.slice(0, splitIdx + 1), tolerance);
  const half2 = rdp([...pts.slice(splitIdx), pts[0]], tolerance);
  return [...half1.slice(0, -1), ...half2.slice(0, -1)];
}

/** Chaikin corner-cutting smoothing for a closed polygon */
export function smoothPolygon(pts: Vec2[], iterations: number): Vec2[] {
  let result = pts;
  for (let iter = 0; iter < iterations; iter++) {
    const next: Vec2[] = [];
    const n = result.length;
    for (let i = 0; i < n; i++) {
      const c = result[i];
      const nx = result[(i + 1) % n];
      next.push({ x: c.x * 0.75 + nx.x * 0.25, y: c.y * 0.75 + nx.y * 0.25 });
      next.push({ x: c.x * 0.25 + nx.x * 0.75, y: c.y * 0.25 + nx.y * 0.75 });
    }
    result = next;
  }
  return result;
}

/** Resample a closed polygon to exactly targetCount evenly-spaced points */
export function resamplePolygon(pts: Vec2[], targetCount: number): Vec2[] {
  const n = pts.length;
  if (n <= 1) return pts;

  // Cumulative arc lengths
  const cumLen: number[] = [0];
  for (let i = 0; i < n; i++) {
    const nx = pts[(i + 1) % n];
    cumLen.push(cumLen[i] + Math.hypot(nx.x - pts[i].x, nx.y - pts[i].y));
  }
  const totalLen = cumLen[n];
  const segLen = totalLen / targetCount;

  const result: Vec2[] = [];
  for (let s = 0; s < targetCount; s++) {
    const target = s * segLen;
    // Binary search for the edge
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumLen[mid + 1] < target) lo = mid + 1;
      else hi = mid;
    }
    const edgeStart = cumLen[lo];
    const edgeEnd = cumLen[lo + 1];
    const t = edgeEnd > edgeStart ? (target - edgeStart) / (edgeEnd - edgeStart) : 0;
    const a = pts[lo];
    const b = pts[(lo + 1) % n];
    result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return result;
}

/** Offset a closed polygon. Positive = expand outward, negative = shrink inward. */
export function offsetPolygon(pts: Vec2[], offset: number): Vec2[] {
  const n = pts.length;
  if (n < 3) return pts;

  // Detect winding (positive signed area = CW in screen coords)
  let area = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    area += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
  }
  const windSign = area > 0 ? 1 : -1;

  const result: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];

    const d1x = curr.x - prev.x, d1y = curr.y - prev.y;
    const d2x = next.x - curr.x, d2y = next.y - curr.y;
    const len1 = Math.hypot(d1x, d1y) || 1;
    const len2 = Math.hypot(d2x, d2y) || 1;

    // Outward normals (perpendicular, adjusted for winding)
    const n1x = (-d1y / len1) * windSign, n1y = (d1x / len1) * windSign;
    const n2x = (-d2y / len2) * windSign, n2y = (d2x / len2) * windSign;

    // Average normal
    let nx = n1x + n2x, ny = n1y + n2y;
    const nlen = Math.hypot(nx, ny);
    if (nlen > 0.01) { nx /= nlen; ny /= nlen; }
    else { nx = n1x; ny = n1y; }

    // Miter correction (clamp to prevent spikes)
    const cosHalf = Math.max(0.4, nx * n1x + ny * n1y);
    const miter = Math.min(2, 1 / cosHalf);

    result.push({
      x: curr.x + nx * offset * miter,
      y: curr.y + ny * offset * miter,
    });
  }
  return result;
}

/** Full pipeline: raw freehand points → clean centerline */
export function processDrawnPath(raw: Vec2[], targetPoints: number): Vec2[] {
  if (raw.length < 5) return [];
  let pts = simplifyPolygon(raw, 20);
  if (pts.length < 3) return [];
  pts = smoothPolygon(pts, 2);
  pts = resamplePolygon(pts, targetPoints);
  return pts;
}
