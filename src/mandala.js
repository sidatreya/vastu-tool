import M from './rules/mandala.json';
import R from './rules/vastu-rules.json';
// Polygons for each devta in pada coords
export function devtaShapes() {
  return M.devtas.map((d) => {
    if (d.block) {
      const [c, r] = d.block; // 2x2 block, split along anti-diagonal
      const o = { NE: [c + 2, r], SE: [c + 2, r + 2], SW: [c, r + 2], NW: [c, r] }[d.corner];
      const corners = [[c, r], [c + 2, r], [c + 2, r + 2], [c, r + 2]];
      const idx = corners.findIndex((p) => p[0] === o[0] && p[1] === o[1]);
      const a = corners[(idx + 1) % 4], b = corners[(idx + 3) % 4], inner = corners[(idx + 2) % 4];
      const poly = d.half === 'outer' ? [o, a, b] : [a, inner, b];
      const cx = poly.reduce((s, p) => s + p[0], 0) / 3, cy = poly.reduce((s, p) => s + p[1], 0) / 3;
      return { ...d, polys: [poly], label: [cx, cy], padas: 2 };
    }
    const polys = d.cells.map(([c, r]) => [[c, r], [c + 1, r], [c + 1, r + 1], [c, r + 1]]);
    const cx = d.cells.reduce((s, p) => s + p[0] + 0.5, 0) / d.cells.length, cy = d.cells.reduce((s, p) => s + p[1] + 0.5, 0) / d.cells.length;
    return { ...d, polys, label: [cx, cy], padas: d.cells.length };
  });
}
export function devtaAt(u, v) {
  const c = Math.floor(u), r = Math.floor(v);
  if (c < 0 || c > 8 || r < 0 || r > 8) return null;
  for (const d of M.devtas) {
    if (d.cells && d.cells.some(([x, y]) => x === c && y === r)) return d;
    if (d.block) {
      const [bc, br] = d.block;
      if (c >= bc && c < bc + 2 && r >= br && r < br + 2) {
        // distance from the outer corner along the diagonal decides outer/inner half
        const o = { NE: [bc + 2, br], SE: [bc + 2, br + 2], SW: [bc, br + 2], NW: [bc, br] }[d.corner];
        const dist = Math.abs(u - o[0]) + Math.abs(v - o[1]);
        const half = dist < 2 ? 'outer' : 'inner';
        if (d.half === half) return d;
      }
    }
  }
  return null;
}
// door pada: nearest side of the outer ring
export function doorPada(u, v) {
  const cu = Math.min(Math.max(u, 0), 8.999), cv = Math.min(Math.max(v, 0), 8.999);
  const dists = { N: cv, S: 9 - cv, W: cu, E: 9 - cu };
  const side = Object.entries(dists).sort((a, b) => a[1] - b[1])[0][0];
  let c = Math.floor(cu), r = Math.floor(cv);
  if (side === 'N') r = 0; if (side === 'S') r = 8; if (side === 'W') c = 0; if (side === 'E') c = 8;
  const d = M.devtas.find((x) => x.ring === 'outer' && x.cells[0][0] === c && x.cells[0][1] === r);
  return { side, devta: d?.name, index: d?.index, devtaSide: d?.side };
}
export function marmaPoints() {
  return [
    ...R.marma.major.map(([u, v, n]) => ({ u, v, name: n, major: true })),
    ...R.marma.minor.map(([u, v, n]) => ({ u, v, name: n, major: false })),
  ];
}
export const mandalaSource = M.source;
