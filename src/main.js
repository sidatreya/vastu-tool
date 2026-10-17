import './style.css';
import { renderStage } from './render.js';
import { analyseLayout, analyseTags, ELEMENTS, RULES } from './checker.js';
import { makeFrame, zoneOf, DIR8, DIR_NAMES, bearingToDir8 } from './geometry.js';
import { devtaAt, doorPada } from './mandala.js';
import { exampleSvg, exampleState, EXAMPLE_SIZE } from './example.js';
import { scoreRing, renderChecks, printReport, counts } from './report.js';
import { initVideo } from './video.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const svg = $('#stage');
const LS = 'vastu-tool-state-v1';

const defaults = () => ({
  mode: 'view', image: null, boundary: [], northDeg: 0, elements: [], selected: null, selVertex: null, addType: 'kitchen',
  settings: { overlay: true, opacity: 0.6, devtas: true, zones: '8', purusha: false, marma: true, zoneMethod: 'grid', align: 'plot' },
  site: { slope: '', height: '' },
});
let state = defaults();
let analysis = null;
let uid = 1;

/* ---------- persistence ---------- */
function save() { try { const { mode, selected, selVertex, ...rest } = state; localStorage.setItem(LS, JSON.stringify(rest)); } catch { /* quota: ignore */ } }
function load() { try { const s = JSON.parse(localStorage.getItem(LS)); if (s?.image) { state = { ...defaults(), ...s, settings: { ...defaults().settings, ...s.settings } }; uid = 1 + Math.max(0, ...state.elements.map((e) => +String(e.id).replace(/\D/g, '') || 0)); } } catch { /* ignore */ } }

/* ---------- rendering ---------- */
function render() {
  const has = !!state.image;
  $('#empty').hidden = has; svg.hidden = !has;
  $('#example-badge').hidden = !state.image?.example;
  if (has) {
    analysis = analyseLayout(state);
    svg.setAttribute('viewBox', `0 0 ${state.image.w} ${state.image.h}`);
    svg.innerHTML = renderStage(state, analysis);
    svg.classList.toggle('editing', state.mode !== 'view');
  } else analysis = null;
  renderCompass(); renderSelPanel(); renderReport(); syncInputs(); hint();
  save();
}
function hint() {
  const t = { view: 'Tap anywhere on the plan to see its pada, devta and zone. Tap a red dot for marma details.', boundary: 'Drag the orange corners to match the plot. Tap a dashed + to add a corner; select a corner and press Delete to remove it.', north: 'Drag on the plan (or the compass dial) to rotate North, or type the angle.', label: `Tap the plan to place: ${ELEMENTS[state.addType]?.label}. Tap a label to select it; drag to move.` };
  $('#hint').textContent = state.image ? t[state.mode] : '';
}
function syncInputs() {
  $('#north-deg').value = +state.northDeg.toFixed(1);
  $$('.mode').forEach((b) => b.classList.toggle('active', b.dataset.mode === state.mode));
  $$('.chip').forEach((c) => c.classList.toggle('active', c.dataset.type === state.addType));
  const S = state.settings;
  $('#opt-overlay').checked = S.overlay; $('#opt-opacity').value = S.opacity; $('#opt-devtas').checked = S.devtas; $('#opt-marma').checked = S.marma; $('#opt-purusha').checked = S.purusha; $('#opt-zones').value = S.zones; $('#opt-method').value = S.zoneMethod; $('#opt-align').value = S.align;
  $('#site-slope').value = state.site.slope || ''; $('#site-height').value = state.site.height || '';
}
function renderCompass() {
  const d = state.northDeg;
  let ticks = '';
  for (let i = 0; i < 72; i++) { const a = i * 5, big = a % 45 === 0; ticks += `<line x1="0" y1="-56" x2="0" y2="${big ? -48 : -52}" stroke="${big ? '#7c2d12' : '#d6c3b0'}" stroke-width="${big ? 2 : 1}" transform="rotate(${a})"/>`; }
  const labels = DIR8.map((n, i) => `<text transform="rotate(${d + i * 45}) translate(0 -37) rotate(${-(d + i * 45)})" text-anchor="middle" dominant-baseline="central" font-size="${n.length > 1 ? 8 : 11}" font-weight="800" fill="${n === 'N' ? '#dc2626' : '#57534e'}">${n}</text>`).join('');
  $('#compass').innerHTML = `<circle r="58" fill="#fff7ed" stroke="#fed7aa" stroke-width="2"/>${ticks}${labels}<g transform="rotate(${d})"><path d="M0 -30 L7 4 L0 0 L-7 4Z" fill="#dc2626"/><path d="M0 30 L7 -4 L0 0 L-7 -4Z" fill="#a8a29e"/></g><circle r="3" fill="#7c2d12"/><text y="22" text-anchor="middle" font-size="9" fill="#7c2d12" font-weight="700">top of plan ↑</text>`;
}
function renderSelPanel() {
  const el = state.elements.find((e) => e.id === state.selected);
  const p = $('#sel-panel');
  if (state.mode === 'boundary' && state.selVertex != null) {
    p.hidden = false;
    p.innerHTML = `<b>Corner ${state.selVertex + 1}</b> of ${state.boundary.length}<div class="row gap-s"><button class="btn sm danger" id="del-vertex" ${state.boundary.length <= 3 ? 'disabled' : ''}>Delete corner</button></div>`;
    $('#del-vertex').onclick = () => { state.boundary.splice(state.selVertex, 1); state.selVertex = null; render(); };
    return;
  }
  if (!el) { p.hidden = true; return; }
  p.hidden = false;
  const frame = state.boundary.length >= 3 ? makeFrame(state.boundary, state.northDeg, state.settings.align) : null;
  let where = '';
  if (frame) {
    const z = zoneOf(frame, el, state.settings.zoneMethod);
    where = `Zone <b>${DIR_NAMES[z.zone]}</b> · 16-zone ${z.zone16} · pada (${Math.floor(z.u) + 1}, ${Math.floor(z.v) + 1}) · ${devtaAt(z.u, z.v)?.name || 'outside grid'}`;
    if (el.type === 'entrance') { const d = doorPada(z.u, z.v); where += `<br>Door pada: <b>${d.devta}</b> (${d.devtaSide}${d.index})`; }
  }
  const opts = RULES.elements.map((t) => `<option value="${t.id}" ${t.id === el.type ? 'selected' : ''}>${t.label}</option>`).join('');
  p.innerHTML = `<div class="row gap-s"><select id="sel-type">${opts}</select></div>
   <div class="row gap-s"><input id="sel-name" type="text" placeholder="Custom name" value="${(el.name || '').replace(/"/g, '&quot;')}"/></div>
   <div class="small">${where}</div>
   <div class="row gap-s wrap" style="margin-top:6px">${el.w ? '<button class="btn sm" id="sel-point">Make point</button>' : '<button class="btn sm" id="sel-area">Make area</button>'}<button class="btn sm danger" id="sel-del">Delete</button><button class="btn sm ghost" id="sel-done">Done</button></div>`;
  $('#sel-type').onchange = (e) => { el.type = e.target.value; render(); };
  $('#sel-name').onchange = (e) => { el.name = e.target.value.slice(0, 40); render(); };
  $('#sel-del').onclick = () => { state.elements = state.elements.filter((x) => x !== el); state.selected = null; render(); };
  $('#sel-done').onclick = () => { state.selected = null; render(); };
  const ds = defaultSize();
  if ($('#sel-point')) $('#sel-point').onclick = () => { el.w = 0; el.h = 0; render(); };
  if ($('#sel-area')) $('#sel-area').onclick = () => { el.w = ds; el.h = ds; render(); };
}
function renderReport() {
  const checks = analysis?.checks || [];
  const sc = analysis?.score;
  $('#score-ring').innerHTML = scoreRing(state.image ? sc : null);
  $('#tab-score').textContent = state.image && sc != null ? sc : '';
  const n = counts(checks);
  $('#report-sub').innerHTML = state.image ? `${n.pass} pass · ${n.caution} caution · ${n.fail} fail · ${state.elements.length} labelled element(s) · North ${+state.northDeg.toFixed(1)}° · zones by ${state.settings.zoneMethod === 'grid' ? '3×3 mandala blocks' : '45° sectors'}${analysis?.frame ? ` · grid ${state.settings.align === 'plot' ? `aligned to plot sides (${Math.abs(analysis.frame.offset).toFixed(1)}° off true North)` : 'on exact true North'}` : ''}${state.image.example ? ' · <b>EXAMPLE layout</b>' : ''}` : 'Load or draw a layout, set North and label rooms to see the report.';
  $('#report-list').innerHTML = state.image ? renderChecks(checks) : '';
}

/* ---------- loading layouts ---------- */
function defaultSize() { const b = state.boundary; if (b.length < 3) return 100; const f = makeFrame(b, 0); return Math.round(Math.min(f.bw, f.bh) * 0.16); }
function setImage(src, w, h, extra = {}) {
  state = { ...defaults(), settings: state.settings, image: { src, w, h, ...extra } };
  const m = Math.round(Math.min(w, h) * 0.08);
  state.boundary = [{ x: m, y: m }, { x: w - m, y: m }, { x: w - m, y: h - m }, { x: m, y: h - m }];
  state.mode = 'boundary';
  render();
}
async function loadFile(file) {
  if (!file) return;
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    $('#hint').textContent = 'Rendering PDF page 1…';
    const pdfjs = await import('pdfjs-dist');
    const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const page = await doc.getPage(1);
    const v0 = page.getViewport({ scale: 1 });
    const scale = Math.min(3, 2000 / Math.max(v0.width, v0.height));
    const vp = page.getViewport({ scale });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    setImage(c.toDataURL('image/jpeg', 0.88), c.width, c.height, { name: 'PDF page 1' });
    return;
  }
  const url = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
  const img = await loadImg(url);
  // downscale very large photos to keep things fast
  const maxD = 2200, sc = Math.min(1, maxD / Math.max(img.naturalWidth, img.naturalHeight));
  if (sc < 1) { const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); setImage(c.toDataURL('image/jpeg', 0.9), c.width, c.height); }
  else setImage(url, img.naturalWidth, img.naturalHeight);
}
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
async function svgToPng(svgText, w, h) {
  const img = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText));
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/png');
}
async function loadExample() {
  const { w, h } = EXAMPLE_SIZE;
  const png = await svgToPng(exampleSvg(), w, h);
  setImage(png, w, h, { example: true, name: 'Example layout' });
  const ex = exampleState();
  Object.assign(state, { boundary: ex.boundary, northDeg: ex.northDeg, elements: ex.elements, site: ex.site, mode: 'view' });
  // put the example pillar exactly on the Brahmasthan NE marma so the warning is demonstrated
  const f = makeFrame(state.boundary, state.northDeg, state.settings.align); const pil = state.elements.find((e) => e.type === 'pillar'); Object.assign(pil, f.fromUV(6, 3));
  uid = state.elements.length + 1;
  render();
}
function blankPlot() {
  const wft = parseFloat(prompt('Plot width (East–West), any unit:', '40')) || 40;
  const dft = parseFloat(prompt('Plot depth (North–South), same unit:', '60')) || 60;
  const sc = 900 / Math.max(wft, dft), W = Math.round(wft * sc) + 160, H = Math.round(dft * sc) + 160;
  let grid = '';
  const step = sc * (Math.max(wft, dft) > 200 ? 10 : Math.max(wft, dft) > 60 ? 5 : 1);
  for (let x = 80; x <= W - 80 + 0.1; x += step) grid += `<line x1="${x}" y1="80" x2="${x}" y2="${H - 80}" stroke="#eee6dc"/>`;
  for (let y = 80; y <= H - 80 + 0.1; y += step) grid += `<line x1="80" y1="${y}" x2="${W - 80}" y2="${y}" stroke="#eee6dc"/>`;
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fffdf8"/>${grid}<text x="${W / 2}" y="${H - 30}" text-anchor="middle" font-family="Helvetica,Arial" font-size="22" fill="#a8a29e">${wft} × ${dft} plot · grid = ${step / sc} unit(s)</text></svg>`;
  svgToPng(s, W, H).then((png) => {
    setImage(png, W, H, { name: 'Drawn plot' });
    state.boundary = [{ x: 80, y: 80 }, { x: W - 80, y: 80 }, { x: W - 80, y: H - 80 }, { x: 80, y: H - 80 }];
    state.northDeg = 0; render();
  });
}

/* ---------- pointer interaction ---------- */
let drag = null;
function svgPt(e) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
svg.addEventListener('pointerdown', (e) => {
  if (!state.image) return;
  const p = svgPt(e);
  const h = e.target.closest('.h'); const elG = e.target.closest('.el'); const marma = e.target.closest('.marma');
  if (state.mode === 'boundary') {
    if (h?.dataset.h === 'vertex') { const i = +h.dataset.i; state.selVertex = i; drag = { kind: 'vertex', i }; }
    else if (h?.dataset.h === 'mid') { const i = +h.dataset.i; state.boundary.splice(i + 1, 0, { x: p.x, y: p.y }); state.selVertex = i + 1; drag = { kind: 'vertex', i: i + 1 }; }
    else { state.selVertex = null; }
    render();
  } else if (state.mode === 'north') {
    drag = { kind: 'north', c: { x: state.image.w / 2, y: state.image.h / 2 }, start: Math.atan2(p.x - state.image.w / 2, -(p.y - state.image.h / 2)), deg0: state.northDeg };
  } else if (state.mode === 'label') {
    if (h?.dataset.h === 'resize') drag = { kind: 'resize', id: h.dataset.el };
    else if (elG) { state.selected = elG.dataset.el; const el = state.elements.find((x) => x.id === state.selected); drag = { kind: 'move', id: el.id, dx: p.x - el.x, dy: p.y - el.y, moved: false }; render(); }
    else {
      const t = ELEMENTS[state.addType]; const ds = defaultSize();
      const el = { id: 'e' + uid++, type: state.addType, x: p.x, y: p.y, w: t.shape === 'room' ? ds : 0, h: t.shape === 'room' ? (state.addType === 'wall' ? ds / 6 : ds) : 0 };
      state.elements.push(el); state.selected = el.id; render();
    }
  } else { // view: inspect
    if (marma) { const [, name, kind, hit] = marma.dataset.info.split('|'); showInfo(`<b>Marma sthan:</b> ${name} (${kind}).${hit === '1' ? ' <b style="color:#fca5a5">⚠ A pillar, wall, toilet or staircase sits on this point.</b>' : ' Keep pillars, walls, toilets and stairs off this point.'}`); return; }
    if (elG) { state.selected = elG.dataset.el; render(); }
    inspectAt(p, elG);
  }
  if (drag) svg.setPointerCapture(e.pointerId);
});
svg.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = svgPt(e);
  const W = state.image.w, H = state.image.h; p.x = Math.max(0, Math.min(W, p.x)); p.y = Math.max(0, Math.min(H, p.y));
  if (drag.kind === 'vertex') state.boundary[drag.i] = { x: p.x, y: p.y };
  else if (drag.kind === 'north') { const a = Math.atan2(p.x - drag.c.x, -(p.y - drag.c.y)); setNorth(drag.deg0 + ((a - drag.start) * 180) / Math.PI, false); }
  else if (drag.kind === 'move') { const el = state.elements.find((x) => x.id === drag.id); el.x = p.x - drag.dx; el.y = p.y - drag.dy; drag.moved = true; }
  else if (drag.kind === 'resize') { const el = state.elements.find((x) => x.id === drag.id); const x0 = el.x - el.w / 2, y0 = el.y - el.h / 2; el.w = Math.max(10, p.x - x0); el.h = Math.max(6, p.y - y0); el.x = x0 + el.w / 2; el.y = y0 + el.h / 2; }
  scheduleRender();
});
const endDrag = () => { if (drag) { drag = null; render(); } };
svg.addEventListener('pointerup', endDrag); svg.addEventListener('pointercancel', endDrag);
let raf = 0; function scheduleRender() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); }
function showInfo(html) { const i = $('#info'); i.hidden = false; i.innerHTML = html; }
function inspectAt(p, elG) {
  if (state.boundary.length < 3) return;
  const f = makeFrame(state.boundary, state.northDeg, state.settings.align); const z = zoneOf(f, p, state.settings.zoneMethod);
  const d = devtaAt(z.u, z.v);
  let html = d ? `<b>Pada</b> (col ${Math.floor(z.u) + 1}, row ${Math.floor(z.v) + 1}) · devta <b>${d.name}</b> · zone <b>${DIR_NAMES[z.zone]}</b> · 16-zone ${z.zone16} · bearing ${Math.round(z.bearing ?? 0)}°` : 'Outside the mandala grid.';
  if (elG) { const el = state.elements.find((x) => x.id === elG.dataset.el); const cs = analysis.checks.filter((c) => c.elId === el.id); html = `<b>${el.name || ELEMENTS[el.type].label}</b><br>` + cs.map((c) => `${c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : '⚠️'} ${c.reason}`).join('<br>') + '<br><span style="opacity:.7">' + html + '</span>'; }
  showInfo(html);
}
function setNorth(d, rerender = true) { state.northDeg = ((d % 360) + 360) % 360; if (rerender) render(); else scheduleRender(); }

/* compass dial drag */
const comp = $('#compass'); let cdrag = false;
const compAngle = (e) => { const r = comp.getBoundingClientRect(); return (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180) / Math.PI; };
comp.addEventListener('pointerdown', (e) => { cdrag = true; comp.setPointerCapture(e.pointerId); setNorth(Math.round(compAngle(e))); });
comp.addEventListener('pointermove', (e) => { if (cdrag) setNorth(Math.round(compAngle(e)), false); });
comp.addEventListener('pointerup', () => { cdrag = false; render(); });
comp.style.touchAction = 'none';

/* ---------- controls ---------- */
$$('.tab').forEach((b) => (b.onclick = () => { $$('.tab').forEach((x) => x.classList.toggle('active', x === b)); $$('.tabpane').forEach((p) => p.classList.toggle('active', p.id === 'tab-' + b.dataset.tab)); window.scrollTo(0, 0); }));
$$('.mode').forEach((b) => (b.onclick = () => { state.mode = b.dataset.mode; state.selVertex = null; if (state.mode !== 'label' && state.mode !== 'view') state.selected = null; render(); }));
$('#palette').innerHTML = RULES.elements.map((t) => `<button class="chip" data-type="${t.id}"><i style="background:${t.color}">${t.short}</i>${t.label}</button>`).join('');
$$('.chip').forEach((c) => (c.onclick = () => { state.addType = c.dataset.type; state.mode = 'label'; const el = state.elements.find((x) => x.id === state.selected); if (el && el._justAdded) el.type = state.addType; render(); }));
['#file-plan', '#file-plan2'].forEach((s) => ($(s).onchange = (e) => { loadFile(e.target.files[0]).catch((err) => alert('Could not open file: ' + err.message)); e.target.value = ''; }));
['#btn-example', '#btn-example2'].forEach((s) => ($(s).onclick = loadExample));
['#btn-blank', '#btn-blank2'].forEach((s) => ($(s).onclick = blankPlot));
$('#btn-clear').onclick = () => { if (confirm('Clear the layout and all labels?')) { state = defaults(); localStorage.removeItem(LS); render(); } };
$('#north-deg').onchange = (e) => setNorth(parseFloat(e.target.value) || 0);
$$('[data-rot]').forEach((b) => (b.onclick = () => setNorth(state.northDeg + +b.dataset.rot)));
$('#zoom').onchange = (e) => { const z = +e.target.value; svg.style.width = `${100 * z}%`; svg.classList.toggle('zoomed', z > 1); };
const bind = (sel, key, conv = (x) => x, prop = 'checked') => ($(sel).oninput = (e) => { state.settings[key] = conv(e.target[prop]); render(); });
bind('#opt-overlay', 'overlay'); bind('#opt-devtas', 'devtas'); bind('#opt-marma', 'marma'); bind('#opt-purusha', 'purusha');
bind('#opt-opacity', 'opacity', parseFloat, 'value'); bind('#opt-zones', 'zones', String, 'value'); bind('#opt-method', 'zoneMethod', String, 'value'); bind('#opt-align', 'align', String, 'value');
const dirOpts = (extra) => `<option value="">— not set —</option>${DIR8.map((d) => `<option value="${d}">${DIR_NAMES[d]}</option>`).join('')}<option value="${extra}">${extra === 'flat' ? 'Flat / level' : 'Even / same height'}</option>`;
$('#site-slope').innerHTML = dirOpts('flat'); $('#site-height').innerHTML = dirOpts('even');
$('#site-slope').onchange = (e) => { state.site.slope = e.target.value; render(); };
$('#site-height').onchange = (e) => { state.site.height = e.target.value; render(); };
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input,select,textarea')) return;
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (state.mode === 'boundary' && state.selVertex != null && state.boundary.length > 3) { state.boundary.splice(state.selVertex, 1); state.selVertex = null; render(); }
    else if (state.selected) { state.elements = state.elements.filter((x) => x.id !== state.selected); state.selected = null; render(); }
  }
});
$('#report-list').addEventListener('click', (e) => { const c = e.target.closest('.check[data-el]'); if (!c) return; state.selected = c.dataset.el; state.mode = 'label'; $$('.tab')[0].click(); render(); });

/* phone compass for North */
let headingListener = null;
export async function startCompass(onHeading) {
  if (typeof DeviceOrientationEvent === 'undefined') throw new Error('This device has no compass sensor.');
  if (typeof DeviceOrientationEvent.requestPermission === 'function') { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') throw new Error('Compass permission was denied.'); }
  if (headingListener) { window.removeEventListener('deviceorientationabsolute', headingListener); window.removeEventListener('deviceorientation', headingListener); }
  let got = false;
  headingListener = (ev) => { let h = null; if (typeof ev.webkitCompassHeading === 'number') h = ev.webkitCompassHeading; else if (ev.absolute && ev.alpha != null) h = (360 - ev.alpha) % 360; if (h != null) { got = true; onHeading(h); } };
  window.addEventListener('deviceorientationabsolute', headingListener); window.addEventListener('deviceorientation', headingListener);
  await new Promise((r) => setTimeout(r, 1500));
  if (!got) throw new Error('No compass reading. Compass is available on phones (Safari on iPhone, Chrome on Android) over HTTPS.');
}
$('#btn-north-phone').onclick = async () => {
  if (!state.image) return alert('Load a layout first.');
  try {
    let last = null; await startCompass((h) => (last = h));
    if (last == null) throw new Error('No reading');
    if (confirm(`Phone heading ${Math.round(last)}°. Is the TOP edge of your phone pointing the same way as the TOP of the plan? OK to set North to ${Math.round((360 - last) % 360)}°.`)) setNorth((360 - last) % 360);
  } catch (err) { alert(err.message); }
};

/* ---------- export ---------- */
async function annotatedPng() {
  if (!state.image) return null;
  const { w, h } = state.image;
  const sc = Math.min(1, 2400 / Math.max(w, h)); const W = Math.round(w * sc), H = Math.round(h * sc);
  const band = Math.round(56 * (Math.max(W, H) / 1000));
  const inner = renderStage({ ...state, selected: null }, analysis, { clean: true });
  const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
  const img = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText));
  const c = document.createElement('canvas'); c.width = W; c.height = H + band; const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, W, H);
  ctx.fillStyle = '#7c2d12'; ctx.fillRect(0, H, W, band); ctx.fillStyle = '#fff7ed'; ctx.font = `700 ${band * 0.38}px sans-serif`; ctx.textBaseline = 'middle';
  const n = counts(analysis.checks);
  ctx.fillText(`Vastu score ${analysis.score ?? '–'}/100 · ${n.pass} pass · ${n.caution} caution · ${n.fail} fail · North ${+state.northDeg.toFixed(1)}°${state.image.example ? ' · EXAMPLE' : ''}`, band * 0.3, H + band / 2);
  return c.toDataURL('image/png');
}
$('#btn-png').onclick = async () => { const url = await annotatedPng(); if (!url) return alert('Load a layout first.'); const a = document.createElement('a'); a.href = url; a.download = 'vastu-layout.png'; a.click(); };
$('#btn-print').onclick = async () => {
  if (!state.image) return alert('Load a layout first.');
  const imgUrl = await annotatedPng();
  printReport({ title: 'Vastu fundamentals report', imgUrl, score: analysis.score, checks: analysis.checks, meta: `${new Date().toLocaleString('en-GB')} · North ${+state.northDeg.toFixed(1)}° · ${state.elements.length} labelled elements${state.image.example ? ' · EXAMPLE layout' : ''}` });
};

/* ---------- about ---------- */
$('#about').innerHTML = `<h2>How it works</h2>
<ol><li><b>Layout:</b> upload a plan (image or PDF, first page) or draw a plot. Drag the corners to the plot boundary (add corners for irregular plots) and set North.</li>
<li><b>Mandala:</b> a 9×9 Paramasayika grid (81 padas) is fitted to the plot's North-aligned bounding rectangle: Brahmasthan (central 3×3), the 45 devtas, diagonals (Karna sutra) and central lines.</li>
<li><b>Marma sthan:</b> red dots. Major: Mahamarma at the centre plus the corners and side midpoints of the Brahmasthan. Minor: where the diagonals cross Nadi lines 1, 2, 7, 8. Pillars, walls, toilets and stairs on a marma are flagged.</li>
<li><b>Fundamentals:</b> each labelled element is checked against its zone; door padas use the 32 outer devtas; plot shape, corner cuts/extensions, Brahmasthan, slope and heights are checked too. The score is a weighted average (pass 1, caution ½, fail 0).</li>
<li><b>Video:</b> frames are extracted in the browser; you tag each frame and the same rules produce a report. Optional auto-detect runs a small vision model on your device.</li></ol>
<h3>Rules and sources</h3><p>All ${RULES.rules.length} rules live in one editable file, <code>src/rules/vastu-rules.json</code>; the devta layout is in <code>src/rules/mandala.json</code>. Every rule currently says <i>source: standard (pending user's reference images)</i>. They will be replaced with the owner's step-by-step reference material.</p>
<h3>Privacy</h3><p>No server: files, labels and video frames stay in your browser (saved in local storage on this device only). Auto-detect downloads the open MobileCLIP-S0 model from Hugging Face once; images are never uploaded.</p>
<p class="muted small">Guidance only. Not a substitute for a qualified Vastu consultant or structural engineer.</p>`;

initVideo({ startCompass });
load();
render();
window.vastu = { get state() { return state; }, loadExample, render, setNorth, get analysis() { return analysis; } };
