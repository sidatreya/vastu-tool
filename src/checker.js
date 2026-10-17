import R from './rules/vastu-rules.json';
import { makeFrame, zoneOf, polyArea, pointInPoly, DIR_NAMES } from './geometry.js';
import { doorPada, marmaPoints } from './mandala.js';

export const RULES = R;
export const ELEMENTS = Object.fromEntries(R.elements.map((e) => [e.id, e]));
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
const statusOf = (rule, z) => (rule.pass?.includes(z) ? 'pass' : rule.fail?.includes(z) ? 'fail' : 'caution');
const zname = (z) => `${DIR_NAMES[z] || z}${z && z !== 'C' && DIR_NAMES[z] ? ` (${z})` : ''}`;

function elRect(el) { // rooms: rect; points: tiny rect
  const w = el.w || 0, h = el.h || 0;
  return { x0: el.x - w / 2, y0: el.y - h / 2, x1: el.x + w / 2, y1: el.y + h / 2 };
}
function samples(el, n = 7) {
  const r = elRect(el); const out = [];
  if (!el.w) return [{ x: el.x, y: el.y }];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out.push({ x: r.x0 + ((i + 0.5) / n) * (r.x1 - r.x0), y: r.y0 + ((j + 0.5) / n) * (r.y1 - r.y0) });
  return out;
}

export function analyseLayout(state) {
  const checks = [];
  const label = (el) => el.name || ELEMENTS[el.type]?.label || el.type;
  if (!state.boundary || state.boundary.length < 3) return { checks, score: null };
  const frame = makeFrame(state.boundary, state.northDeg, state.settings?.align);
  const method = state.settings?.zoneMethod === 'grid' ? 'grid' : 'angle';
  const marmas = marmaPoints().map((m) => ({ ...m, p: frame.fromUV(m.u, m.v) }));
  const tol = (R.rules.find((r) => r.id === 'marma-clear')?.tolerancePada ?? 0.35) * frame.padaPx;

  for (const rule of R.rules) {
    const base = { id: rule.id, title: rule.title, source: rule.source, weight: rule.weight };
    if (rule.kind === 'zone') {
      for (const el of state.elements.filter((e) => e.type === rule.element)) {
        const z = zoneOf(frame, el, method);
        const st = statusOf(rule, z.zone);
        checks.push({ ...base, group: 'Rooms & elements', status: st, elId: el.id, title: `${label(el)}: ${rule.title}`, reason: fill(rule.reason[st], { zone: zname(z.zone) }), zone: z.zone, zone16: z.zone16 });
      }
    } else if (rule.kind === 'entrancePada') {
      for (const el of state.elements.filter((e) => e.type === rule.element)) {
        const { u, v } = frame.toUV(el);
        const d = doorPada(u, v);
        const st = rule.good.includes(d.devta) ? 'pass' : rule.bad.includes(d.devta) ? 'fail' : 'caution';
        checks.push({ ...base, group: 'Entrance', status: st, elId: el.id, title: `${label(el)}: ${rule.title}`, reason: fill(rule.reason[st], { pada: `${d.devta} (${d.devtaSide}${d.index})`, side: DIR_NAMES[d.side] }), pada: d });
      }
    } else if (rule.kind === 'brahmasthan') {
      const hits = { fail: [], caution: [] };
      for (const el of state.elements) {
        const inC = samples(el).filter((p) => { const { u, v } = frame.toUV(p); return u > 3.05 && u < 5.95 && v > 3.05 && v < 5.95; }).length / samples(el).length;
        if (inC < (el.w ? 0.25 : 1)) continue;
        if (rule.fail.includes(el.type)) hits.fail.push(label(el)); else if (rule.caution.includes(el.type)) hits.caution.push(label(el));
      }
      const st = hits.fail.length ? 'fail' : hits.caution.length ? 'caution' : 'pass';
      checks.push({ ...base, group: 'Brahmasthan & marma', status: st, reason: fill(rule.reason[st], { items: (st === 'fail' ? hits.fail : hits.caution).join(', ') }) });
    } else if (rule.kind === 'marma') {
      const hits = { fail: [], caution: [] }; const flagged = [];
      for (const el of state.elements.filter((e) => rule.check.includes(e.type))) {
        const r = elRect(el);
        for (const m of marmas) {
          const inside = el.w ? m.p.x >= r.x0 - tol * 0.3 && m.p.x <= r.x1 + tol * 0.3 && m.p.y >= r.y0 - tol * 0.3 && m.p.y <= r.y1 + tol * 0.3 : Math.hypot(m.p.x - el.x, m.p.y - el.y) <= tol;
          if (inside) { (m.major ? hits.fail : hits.caution).push(`${label(el)} @ ${m.name}`); flagged.push({ elId: el.id, marma: m.name }); }
        }
      }
      const st = hits.fail.length ? 'fail' : hits.caution.length ? 'caution' : 'pass';
      checks.push({ ...base, group: 'Brahmasthan & marma', status: st, reason: fill(rule.reason[st], { items: (st === 'fail' ? hits.fail : hits.caution).join('; ') }), flagged });
    } else if (rule.kind === 'orientation') {
      const g = makeFrame(state.boundary, state.northDeg, 'plot');
      const deg = Math.abs(g.offset);
      const st = deg <= rule.passDeg ? 'pass' : 'caution';
      checks.push({ ...base, group: 'Plot', status: st, reason: fill(rule.reason[st], { deg: deg.toFixed(1) }) });
    } else if (rule.kind === 'shape') {
      const area = polyArea(state.boundary), fillPct = Math.round((area / (frame.bw * frame.bh)) * 100);
      const aspect = Math.max(frame.bw, frame.bh) / Math.min(frame.bw, frame.bh);
      const scale = state.plotRatio ? 1 : 1; // pixel ratio assumed square
      const a = aspect * scale;
      const st = fillPct / 100 >= rule.minFill && a <= rule.cautionAspect ? 'pass' : fillPct / 100 >= rule.minFill - 0.07 && a <= rule.maxAspect ? 'caution' : 'fail';
      checks.push({ ...base, group: 'Plot', status: st, reason: fill(rule.reason[st], { fill: fillPct, aspect: a.toFixed(2) }) });
    } else if (rule.kind === 'corners') {
      const cov = cornerCoverage(state.boundary, frame);
      const cut = Object.entries(cov).filter(([, c]) => c < rule.cutThreshold).map(([k]) => k);
      const items = []; let st = 'pass';
      const worse = (a, b) => (['pass', 'caution', 'fail'].indexOf(a) >= ['pass', 'caution', 'fail'].indexOf(b) ? a : b);
      const opp = { NE: ['NW', 'SE'], SE: ['NE', 'SW'], SW: ['NW', 'SE'], NW: ['NE', 'SW'] };
      let ext = null;
      for (const k of ['NE', 'SE', 'SW', 'NW']) if (!cut.includes(k) && opp[k].every((o) => cut.includes(o))) ext = k;
      if (ext) { items.push(fill(rule.reason.ext, { corner: DIR_NAMES[ext] }) + (rule.extension[ext] === 'pass' ? ' (auspicious)' : '')); st = worse(st, rule.extension[ext]); }
      for (const k of cut) if (!(ext && opp[ext].includes(k))) { items.push(fill(rule.reason.cut, { corner: DIR_NAMES[k], cov: Math.round(cov[k] * 100) })); st = worse(st, rule.cut[k]); }
      checks.push({ ...base, group: 'Plot', status: st, reason: items.length ? items.join(' ') : rule.reason.pass, coverage: cov });
    } else if (rule.kind === 'input') {
      const val = state.site?.[rule.input];
      if (!val) continue;
      const st = rule.pass.includes(val) ? 'pass' : rule.fail.includes(val) ? 'fail' : 'caution';
      checks.push({ ...base, group: 'Site', status: st, reason: fill(rule.reason[st], { zone: DIR_NAMES[val] || val }) });
    }
  }
  return { checks, score: score(checks), frame };
}

export function cornerCoverage(boundary, frame, n = 14) {
  const zones = { NW: [0, 0], NE: [6, 0], SW: [0, 6], SE: [6, 6] }; const out = {};
  for (const [k, [u0, v0]] of Object.entries(zones)) {
    let inn = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (pointInPoly(frame.fromUV(u0 + ((i + 0.5) / n) * 3, v0 + ((j + 0.5) / n) * 3), boundary)) inn++;
    out[k] = inn / (n * n);
  }
  return out;
}

export function score(checks) {
  const w = { pass: R.scoring.pass, caution: R.scoring.caution, fail: R.scoring.fail };
  let tot = 0, got = 0;
  for (const c of checks) { tot += c.weight; got += c.weight * w[c.status]; }
  return tot ? Math.round((got / tot) * 100) : null;
}

// Video / frame-based analysis: tags = [{type, zone, facing}]
export function analyseTags(tags, site) {
  const checks = [];
  for (const t of tags) {
    if (!t.type) continue;
    const label = ELEMENTS[t.type]?.label || t.type;
    const where = `frame ${t.frameNo}`;
    if (t.zone) {
      for (const rule of R.rules.filter((r) => r.kind === 'zone' && r.element === t.type)) {
        const st = statusOf(rule, t.zone);
        checks.push({ id: rule.id, group: 'Rooms & elements', title: `${label} (${where}): ${rule.title}`, status: st, reason: fill(rule.reason[st], { zone: zname(t.zone) }), weight: rule.weight, source: rule.source, frameNo: t.frameNo });
      }
      const b = R.rules.find((r) => r.kind === 'brahmasthan');
      if (t.zone === 'C' && (b.fail.includes(t.type) || b.caution.includes(t.type))) {
        const st = b.fail.includes(t.type) ? 'fail' : 'caution';
        checks.push({ id: b.id, group: 'Brahmasthan & marma', title: `${label} (${where}): ${b.title}`, status: st, reason: fill(b.reason[st], { items: label }), weight: b.weight, source: b.source, frameNo: t.frameNo });
      }
    }
    if (t.type === 'entrance' && t.facing) {
      const rule = R.rules.find((r) => r.kind === 'facing');
      const st = statusOf(rule, t.facing);
      checks.push({ id: rule.id, group: 'Entrance', title: `${label} (${where}): ${rule.title}`, status: st, reason: fill(rule.reason[st], { zone: zname(t.facing) }), weight: rule.weight, source: rule.source, frameNo: t.frameNo });
    }
  }
  for (const rule of R.rules.filter((r) => r.kind === 'input')) {
    const val = site?.[rule.input]; if (!val) continue;
    const st = rule.pass.includes(val) ? 'pass' : rule.fail.includes(val) ? 'fail' : 'caution';
    checks.push({ id: rule.id, group: 'Site', title: rule.title, status: st, reason: fill(rule.reason[st], { zone: DIR_NAMES[val] || val }), weight: rule.weight, source: rule.source });
  }
  return { checks, score: score(checks) };
}
