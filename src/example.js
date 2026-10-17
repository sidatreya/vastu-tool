// A made-up 3BHK house plan used only for the "Load example layout" button. Not a real property.
const W = 1000, H = 800;
const ROOMS = [
  // name, x0, y0, x1, y1, type
  ['Bedroom 2', 60, 60, 330, 300, 'bedroom'],
  ['Living', 330, 60, 700, 300, 'living'],
  ['Pooja', 700, 60, 940, 190, 'pooja'],
  ['Study', 700, 190, 940, 300, 'study'],
  ['Toilet', 60, 300, 210, 470, 'toilet'],
  ['Dining', 210, 300, 380, 520, 'dining'],
  ['Courtyard', 380, 330, 620, 500, 'courtyard'],
  ['Foyer', 700, 300, 940, 520, null],
  ['Master bedroom', 60, 520, 380, 740, 'master_bedroom'],
  ['Stairs', 380, 540, 560, 740, 'staircase'],
  ['Store', 560, 540, 700, 740, 'store'],
  ['Kitchen', 700, 520, 940, 740, 'kitchen'],
];
export function exampleSvg() {
  const walls = ROOMS.map(([, a, b, c, d]) => `<rect x="${a}" y="${b}" width="${c - a}" height="${d - b}" fill="none" stroke="#3f3a36" stroke-width="7"/>`).join('');
  const names = ROOMS.map(([n, a, b, c, d]) => `<text x="${(a + c) / 2}" y="${(b + d) / 2 + 30}" text-anchor="middle" font-size="19" fill="#a8a29e" font-family="Helvetica,Arial,sans-serif">${n}</text>`).join('');
  const stairs = Array.from({ length: 9 }, (_, i) => `<line x1="390" y1="${555 + i * 20}" x2="550" y2="${555 + i * 20}" stroke="#a8a29e" stroke-width="2"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#fffdf8"/>
  <rect x="30" y="30" width="940" height="740" fill="#f4efe6" stroke="#d6cfc4" stroke-dasharray="10 8" stroke-width="2"/>
  <rect x="60" y="60" width="880" height="680" fill="#ffffff" stroke="#1c1917" stroke-width="12"/>
  ${stairs}${walls}
  <rect x="380" y="330" width="240" height="170" fill="#ecfccb" opacity=".6"/>
  <rect x="932" y="262" width="16" height="70" fill="#fffdf8"/><path d="M940 262 A70 70 0 0 0 870 332" fill="none" stroke="#78716c" stroke-width="2"/>
  ${names}
  <text x="500" y="790" text-anchor="middle" font-size="16" fill="#b45309" font-family="Helvetica,Arial,sans-serif" font-weight="700">EXAMPLE LAYOUT · not a real property · 40 ft × 31 ft (illustrative)</text>
</svg>`;
}
export function exampleState() {
  const els = [];
  let n = 1;
  for (const [name, a, b, c, d, type] of ROOMS) if (type) els.push({ id: 'e' + n++, type, name, x: (a + c) / 2, y: (b + d) / 2, w: c - a - 16, h: d - b - 16 });
  els.push({ id: 'e' + n++, type: 'entrance', name: 'Main door', x: 940, y: 297, w: 0, h: 0 });
  els.push({ id: 'e' + n++, type: 'borewell', name: 'Borewell', x: 905, y: 250, w: 0, h: 0 });
  els.push({ id: 'e' + n++, type: 'septic', name: 'Septic tank', x: 95, y: 95, w: 0, h: 0 });
  els.push({ id: 'e' + n++, type: 'overhead_tank', name: 'Overhead tank', x: 95, y: 705, w: 0, h: 0 });
  els.push({ id: 'e' + n++, type: 'electrical', name: 'Inverter / meter', x: 905, y: 95, w: 0, h: 0 });
  els.push({ id: 'e' + n++, type: 'pillar', name: 'Pillar', x: 648, y: 290, w: 0, h: 0 });
  return {
    boundary: [{ x: 60, y: 60 }, { x: 940, y: 60 }, { x: 940, y: 740 }, { x: 60, y: 740 }],
    northDeg: 6,
    elements: els,
    site: { slope: 'NE', height: 'SW' },
  };
}
export const EXAMPLE_SIZE = { w: W, h: H };
