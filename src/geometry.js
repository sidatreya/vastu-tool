// Frame maths: image coords <-> north-aligned frame <-> mandala pada coords (u: 0 W..9 E, v: 0 N..9 S)
export const DIR8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const DIR16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export const DIR_NAMES = { N: 'North', NE: 'North-East', E: 'East', SE: 'South-East', S: 'South', SW: 'South-West', W: 'West', NW: 'North-West', C: 'Brahmasthan (centre)' };
const GRID_ZONES = [['NW', 'N', 'NE'], ['W', 'C', 'E'], ['SW', 'S', 'SE']];

// Angle (deg, clockwise from image-up) the mandala grid is drawn at. 'plot': aligned to the plot's own sides
// (minimum-area bounding rectangle), with its North side being the side nearest true North. 'north': exact true North.
export function gridAngle(boundary, northDeg, align = 'plot') {
  if (align !== 'plot' || boundary.length < 3) return northDeg;
  let best = null;
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i], b = boundary[(i + 1) % boundary.length];
    const ang = (Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI; // edge bearing on screen
    const t = (ang * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
    const xs = boundary.map((p) => p.x * c + p.y * s), ys = boundary.map((p) => -p.x * s + p.y * c);
    const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    if (!best || area < best.area - 1e-6) best = { area, ang };
  }
  // snap to the orientation (ang + k*90) closest to true North
  let g = best.ang; const d = (x) => ((((x - northDeg) % 360) + 540) % 360) - 180;
  g = g - 90 * Math.round(d(g) / 90);
  return ((g % 360) + 360) % 360;
}

export function makeFrame(boundary, northDeg, align = 'plot') {
  const trueNorth = northDeg;
  northDeg = gridAngle(boundary, trueNorth, align);
  const offset = ((((trueNorth - northDeg) % 360) + 540) % 360) - 180; // true North relative to grid North
  const t = (northDeg * Math.PI) / 180, cos = Math.cos(t), sin = Math.sin(t);
  const rot = (p) => ({ x: p.x * cos + p.y * sin, y: -p.x * sin + p.y * cos }); // image -> north-up
  const unrot = (p) => ({ x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos });
  const r = boundary.map(rot);
  const minX = Math.min(...r.map((p) => p.x)), maxX = Math.max(...r.map((p) => p.x));
  const minY = Math.min(...r.map((p) => p.y)), maxY = Math.max(...r.map((p) => p.y));
  const bw = Math.max(maxX - minX, 1e-6), bh = Math.max(maxY - minY, 1e-6);
  const su = bw / 9, sv = bh / 9;
  const f = {
    cos, sin, minX, minY, bw, bh, su, sv, northDeg, gridDeg: northDeg, trueNorth, offset,
    toUV(p) { const q = rot(p); return { u: (q.x - minX) / su, v: (q.y - minY) / sv }; },
    fromUV(u, v) { return unrot({ x: minX + u * su, y: minY + v * sv }); },
    // SVG matrix mapping pada coords to image coords
    matrix: [cos * su, sin * su, -sin * sv, cos * sv, cos * minX - sin * minY, sin * minX + cos * minY],
    rot, unrot,
    centreRot: { x: minX + bw / 2, y: minY + bh / 2 },
    bearingOf(p) { const q = rot(p); const c = f.centreRot; let b = (Math.atan2(q.x - c.x, -(q.y - c.y)) * 180) / Math.PI - offset; return ((b % 360) + 360) % 360; },
    padaPx: Math.min(su, sv),
  };
  return f;
}

export function zoneOf(frame, p, method = 'grid') {
  const { u, v } = frame.toUV(p);
  if (u >= 3 && u <= 6 && v >= 3 && v <= 6) return { zone: 'C', zone16: 'C', u, v };
  const b = frame.bearingOf(p);
  const zone16 = DIR16[Math.round(b / 22.5) % 16];
  let zone;
  if (method === 'grid') {
    const c = Math.min(2, Math.max(0, Math.floor(u / 3))), r = Math.min(2, Math.max(0, Math.floor(v / 3)));
    zone = GRID_ZONES[r][c];
  } else zone = DIR8[Math.round(b / 45) % 8];
  return { zone, zone16, u, v, bearing: b };
}

export function polyArea(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; } return Math.abs(a) / 2; }
export function pointInPoly(p, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
export function bearingToDir8(b) { return DIR8[Math.round((((b % 360) + 360) % 360) / 45) % 8]; }
export function bearingToDir16(b) { return DIR16[Math.round((((b % 360) + 360) % 360) / 22.5) % 16]; }
