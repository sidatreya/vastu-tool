import { makeFrame, DIR8, DIR16 } from './geometry.js';
import { devtaShapes, marmaPoints } from './mandala.js';
import { ELEMENTS } from './checker.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f1 = (n) => +n.toFixed(1);
const SHAPES = devtaShapes();
const STATUS_COL = { pass: '#16a34a', caution: '#d97706', fail: '#dc2626' };
const DEVTA_FILL = { centre: '#fde68a', inner: '#fed7aa', diagonal: '#fecaca', outer: '#fff7ed' };

function purushaPath() {
  // local figure, head up; placed with head in NE via rotate(45)
  return `<g transform="translate(4.5 4.5) rotate(45)" fill="none" stroke="#7c2d12" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="0" cy="-3.75" r="0.62" fill="#7c2d12" fill-opacity=".35" stroke-width="0.12"/>
    <path d="M0 -3.1 L0 -2.7" stroke-width="0.2"/>
    <ellipse cx="0" cy="-1.1" rx="0.95" ry="1.75" fill="#7c2d12" fill-opacity=".18" stroke-width="0.12"/>
    <path d="M-0.8 -2.4 Q-2.4 -2.2 -2.6 -0.9 Q-2.4 0.2 -1.3 0.2 M0.8 -2.4 Q2.4 -2.2 2.6 -0.9 Q2.4 0.2 1.3 0.2" stroke-width="0.2"/>
    <path d="M-0.45 0.5 Q-2.3 1.3 -2.1 2.6 Q-1.4 3.6 -0.35 3.9 M0.45 0.5 Q2.3 1.3 2.1 2.6 Q1.4 3.6 0.35 3.9" stroke-width="0.22"/>
  </g>`;
}

function rayToRect(c, deg, minX, minY, maxX, maxY) {
  const t = (deg * Math.PI) / 180, dx = Math.sin(t), dy = -Math.cos(t);
  let best = Infinity;
  if (dx > 1e-9) best = Math.min(best, (maxX - c.x) / dx); if (dx < -1e-9) best = Math.min(best, (minX - c.x) / dx);
  if (dy > 1e-9) best = Math.min(best, (maxY - c.y) / dy); if (dy < -1e-9) best = Math.min(best, (minY - c.y) / dy);
  return { x: c.x + dx * best, y: c.y + dy * best, d: best };
}

export function renderStage(state, analysis, opts = {}) {
  const { w: W, h: H } = state.image;
  const k = Math.max(W, H) / 1000; // stroke / font unit
  const clean = !!opts.clean;
  const s = state.settings;
  let out = `<style>text{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}</style>`;
  out += `<image href="${state.image.src}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/>`;
  if (opts.clean) out = `<rect width="${W}" height="${H}" fill="#fff"/>` + out;
  const B = state.boundary;
  if (B.length >= 3) {
    const frame = makeFrame(B, state.northDeg, s.align);
    const gd = frame.gridDeg;
    const m = frame.matrix.map((x) => +x.toFixed(5)).join(' ');
    const pp = B.map((p) => `${f1(p.x)},${f1(p.y)}`).join(' ');
    out += `<polygon points="${pp}" fill="#f59e0b" fill-opacity=".06" stroke="#b45309" stroke-width="${3 * k}" stroke-dasharray="${10 * k} ${6 * k}"/>`;
    if (s.overlay) {
      const op = s.opacity;
      out += `<g opacity="${op}">`;
      out += `<g transform="matrix(${m})">`;
      for (const d of SHAPES) for (const poly of d.polys) out += `<polygon points="${poly.map((p) => p.join(',')).join(' ')}" fill="${DEVTA_FILL[d.ring]}" fill-opacity=".38" stroke="none"/>`;
      out += `</g>`;
      const P = (u, v) => { const q = frame.fromUV(u, v); return `${f1(q.x)} ${f1(q.y)}`; };
      const L = (segs) => segs.map(([u1, v1, u2, v2]) => `M${P(u1, v1)}L${P(u2, v2)}`).join('');
      const grid = []; for (let i = 0; i <= 9; i++) { grid.push([i, 0, i, 9], [0, i, 9, i]); }
      out += `<path d="${L(grid)}" stroke="#9a3412" stroke-width="${1 * k}" fill="none" stroke-opacity=".55"/>`;
      out += `<path d="${L([[3, 0, 3, 9], [6, 0, 6, 9], [0, 3, 9, 3], [0, 6, 9, 6]])}" stroke="#7c2d12" stroke-width="${2.4 * k}" fill="none"/>`;
      out += `<polygon points="${[P(3, 3), P(6, 3), P(6, 6), P(3, 6)].join(' ')}" fill="#facc15" fill-opacity=".22" stroke="#a16207" stroke-width="${3.2 * k}"/>`;
      out += `<polygon points="${[P(0, 0), P(9, 0), P(9, 9), P(0, 9)].join(' ')}" fill="none" stroke="#7c2d12" stroke-width="${3.2 * k}"/>`;
      out += `<path d="${L([[6, 1, 8, 3], [8, 6, 6, 8], [1, 6, 3, 8], [3, 1, 1, 3]])}" stroke="#9a3412" stroke-width="${1.3 * k}" stroke-dasharray="${4 * k} ${3 * k}" fill="none"/>`;
      out += `<path d="${L([[0, 0, 9, 9], [9, 0, 0, 9]])}" stroke="#dc2626" stroke-width="${1.1 * k}" stroke-opacity=".5" stroke-dasharray="${2 * k} ${4 * k}" fill="none"/>`;
      out += `<path d="${L([[4.5, 0, 4.5, 9], [0, 4.5, 9, 4.5]])}" stroke="#2563eb" stroke-width="${1.1 * k}" stroke-opacity=".4" stroke-dasharray="${6 * k} ${4 * k}" fill="none"/>`;
      out += `<g transform="matrix(${m})">`;
      if (s.purusha) out += `<g opacity=".4">${purushaPath()}</g>`;
      out += `</g>`;
      if (s.devtas) {
        const pad = frame.padaPx;
        for (const d of SHAPES) {
          const p = frame.fromUV(d.label[0], d.label[1]);
          const big = d.name === 'Brahma';
          const name = d.name.replace(' (Indrajaya)', '');
          const wide = d.ring === 'outer' ? 0.94 : d.ring === 'diagonal' ? 1.2 : 1.9;
          const fs = big ? pad * 0.42 : Math.min(frame.sv * 0.22, (frame.su * wide) / (name.length * 0.6));
          out += `<text x="${f1(p.x)}" y="${f1(p.y)}" font-size="${f1(fs)}" text-anchor="middle" dominant-baseline="central" fill="${big ? '#92400e' : '#7c2d12'}" font-weight="${big ? 800 : 600}" transform="rotate(${gd} ${f1(p.x)} ${f1(p.y)})" paint-order="stroke" stroke="#fff" stroke-width="${f1(fs * 0.22)}" stroke-opacity=".8">${esc(name)}</text>`;
        }
        const bp = frame.fromUV(4.5, 5.15);
        out += `<text x="${f1(bp.x)}" y="${f1(bp.y)}" font-size="${f1(frame.padaPx * 0.16)}" text-anchor="middle" fill="#a16207" transform="rotate(${gd} ${f1(bp.x)} ${f1(bp.y)})">BRAHMASTHAN</text>`;
      }
      out += `</g>`;
    }
    // direction sectors
    if (s.zones !== 'off') {
      const n = s.zones === '16' ? 16 : 8, step = 360 / n, names = n === 16 ? DIR16 : DIR8;
      const c = frame.centreRot, minX = frame.minX, minY = frame.minY, maxX = minX + frame.bw, maxY = minY + frame.bh;
      let d = '';
      let labels = '';
      for (let i = 0; i < n; i++) {
        const e = rayToRect(c, i * step + step / 2 + frame.offset, minX, minY, maxX, maxY);
        const a = frame.unrot(c), b = frame.unrot(e);
        d += `M${f1(a.x)} ${f1(a.y)}L${f1(b.x)} ${f1(b.y)}`;
        const mid = rayToRect(c, i * step + frame.offset, minX, minY, maxX, maxY);
        const L = frame.unrot({ x: c.x + (mid.x - c.x) * 0.86, y: c.y + (mid.y - c.y) * 0.86 });
        const fs = (n === 16 ? 15 : 20) * k;
        labels += `<g transform="translate(${f1(L.x)} ${f1(L.y)})"><rect x="${-fs * 1.1}" y="${-fs * 0.72}" width="${fs * 2.2}" height="${fs * 1.44}" rx="${fs * 0.4}" fill="#1e3a8a" fill-opacity=".82"/><text font-size="${f1(fs)}" fill="#fff" text-anchor="middle" dominant-baseline="central" font-weight="700">${names[i]}</text></g>`;
      }
      out += `<path d="${d}" stroke="#1d4ed8" stroke-width="${1.6 * k}" stroke-opacity=".6" stroke-dasharray="${8 * k} ${5 * k}" fill="none"/>${labels}`;
    }
    // marma
    if (s.marma) {
      const flagged = new Set((analysis?.checks.find((c) => c.id === 'marma-clear')?.flagged || []).map((f) => f.marma));
      for (const mp of marmaPoints()) {
        const p = frame.fromUV(mp.u, mp.v);
        const r = (mp.major ? 9 : 6.5) * k;
        const hit = flagged.has(mp.name);
        out += `<g class="marma" data-info="marma|${esc(mp.name)}|${mp.major ? 'major' : 'minor'}|${hit ? 1 : 0}">`;
        if (hit) out += `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${r * 2.3}" fill="none" stroke="#dc2626" stroke-width="${2.5 * k}"><animate attributeName="r" values="${r * 1.6};${r * 2.6};${r * 1.6}" dur="1.6s" repeatCount="indefinite"/></circle>`;
        out += `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${r}" fill="#dc2626" stroke="#fff" stroke-width="${2 * k}"><title>Marma: ${esc(mp.name)} (${mp.major ? 'major' : 'minor'})</title></circle></g>`;
      }
    }
  }
  // elements
  const statusById = {};
  for (const c of analysis?.checks || []) if (c.elId) { const prev = statusById[c.elId]; if (!prev || ['pass', 'caution', 'fail'].indexOf(c.status) > ['pass', 'caution', 'fail'].indexOf(prev)) statusById[c.elId] = c.status; }
  for (const el of state.elements) {
    const t = ELEMENTS[el.type] || { color: '#555', short: '?', label: el.type };
    const sel = !clean && state.selected === el.id;
    const st = statusById[el.id];
    const name = el.name || t.label;
    if (el.w) {
      const x = el.x - el.w / 2, y = el.y - el.h / 2;
      out += `<g class="el" data-el="${el.id}"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(el.w)}" height="${f1(el.h)}" rx="${4 * k}" fill="${t.color}" fill-opacity=".2" stroke="${t.color}" stroke-width="${(sel ? 4 : 2.5) * k}" ${sel ? `stroke-dasharray="${8 * k} ${4 * k}"` : ''}/>`;
      const fs = Math.min(16 * k, el.w / 7);
      out += `<g transform="translate(${f1(el.x)} ${f1(el.y - fs * 0.2)})"><rect x="${-fs * 1.2}" y="${-fs * 1.55}" width="${fs * 2.4}" height="${fs * 1.5}" rx="${fs * 0.35}" fill="${t.color}"/><text y="${-fs * 0.8}" font-size="${f1(fs)}" fill="#fff" text-anchor="middle" dominant-baseline="central" font-weight="800">${esc(t.short)}</text>`;
      out += `<text y="${fs * 0.9}" font-size="${f1(fs * 0.95)}" fill="#1f1a17" text-anchor="middle" font-weight="700" paint-order="stroke" stroke="#fff" stroke-width="${fs * 0.3}">${esc(name)}</text></g>`;
      if (st) out += `<circle cx="${f1(x + el.w - 9 * k)}" cy="${f1(y + 9 * k)}" r="${6.5 * k}" fill="${STATUS_COL[st]}" stroke="#fff" stroke-width="${1.5 * k}"/>`;
      out += `<title>${esc(name)}</title></g>`;
      if (sel) out += `<circle class="h" data-h="resize" data-el="${el.id}" cx="${f1(x + el.w)}" cy="${f1(y + el.h)}" r="${11 * k}" fill="#fff" stroke="#7c2d12" stroke-width="${3 * k}"/>`;
    } else {
      const r = 15 * k;
      out += `<g class="el" data-el="${el.id}"><circle cx="${f1(el.x)}" cy="${f1(el.y)}" r="${r}" fill="${t.color}" stroke="${sel ? '#111' : '#fff'}" stroke-width="${(sel ? 4 : 2.5) * k}"/><text x="${f1(el.x)}" y="${f1(el.y)}" font-size="${f1(r * 0.85)}" fill="#fff" text-anchor="middle" dominant-baseline="central" font-weight="800">${esc(t.short)}</text>`;
      out += `<text x="${f1(el.x)}" y="${f1(el.y + r * 2)}" font-size="${f1(12 * k)}" fill="#1f1a17" text-anchor="middle" font-weight="700" paint-order="stroke" stroke="#fff" stroke-width="${3.5 * k}">${esc(name)}</text>`;
      if (st) out += `<circle cx="${f1(el.x + r * 0.8)}" cy="${f1(el.y - r * 0.8)}" r="${5.5 * k}" fill="${STATUS_COL[st]}" stroke="#fff" stroke-width="${1.5 * k}"/>`;
      out += `<title>${esc(name)}</title></g>`;
    }
  }
  // north arrow (on plan)
  {
    const r = 46 * k, cx = W - r - 18 * k, cy = r + 18 * k;
    out += `<g transform="translate(${f1(cx)} ${f1(cy)})"><circle r="${r}" fill="#fff" fill-opacity=".9" stroke="#7c2d12" stroke-width="${2 * k}"/><g transform="rotate(${state.northDeg})"><path d="M0 ${-r * 0.82} L${r * 0.26} ${r * 0.3} L0 ${r * 0.12} L${-r * 0.26} ${r * 0.3}Z" fill="#dc2626"/><text y="${-r * 0.42}" font-size="${r * 0.42}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-weight="800">N</text></g><text y="${r * 0.72}" font-size="${r * 0.26}" text-anchor="middle" fill="#7c2d12" font-weight="700">${+state.northDeg.toFixed(1)}°</text></g>`;
  }
  // handles
  if (!clean && state.mode === 'boundary') {
    B.forEach((p, i) => {
      const q = B[(i + 1) % B.length];
      out += `<circle class="h" data-h="mid" data-i="${i}" cx="${f1((p.x + q.x) / 2)}" cy="${f1((p.y + q.y) / 2)}" r="${9 * k}" fill="#fff" stroke="#b45309" stroke-width="${2 * k}" stroke-dasharray="${3 * k} ${2 * k}"><title>Tap to add a corner</title></circle><text x="${f1((p.x + q.x) / 2)}" y="${f1((p.y + q.y) / 2)}" font-size="${14 * k}" text-anchor="middle" dominant-baseline="central" fill="#b45309" pointer-events="none" font-weight="800">+</text>`;
    });
    B.forEach((p, i) => { out += `<circle class="h" data-h="vertex" data-i="${i}" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${16 * k}" fill="${state.selVertex === i ? '#7c2d12' : '#f59e0b'}" fill-opacity=".85" stroke="#fff" stroke-width="${3 * k}"/>`; });
  }
  if (opts.footer) out += opts.footer;
  return out;
}
