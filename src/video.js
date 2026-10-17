import { RULES, analyseTags } from './checker.js';
import { DIR8, DIR_NAMES, bearingToDir8 } from './geometry.js';
import { renderChecks, scoreRing, counts } from './report.js';

const $ = (s) => document.querySelector(s);
let frames = []; // {no, t, url, type, zone, facing, ai}
let heading = null;
let aiLoaded = false;

export function initVideo({ startCompass }) {
  $('#file-video').onchange = (e) => { const f = e.target.files[0]; if (f) extract(f); e.target.value = ''; };
  $('#btn-compass').onclick = async () => {
    try { await startCompass((h) => { heading = h; $('#compass-read').textContent = `Phone facing ${Math.round(h)}° ${bearingToDir8(h)}`; }); }
    catch (err) { $('#compass-read').textContent = err.message; }
  };
  $('#btn-analyse-video').onclick = analyse;
  $('#btn-autodetect').onclick = autodetect;
  $('#ai-status').innerHTML = 'Auto-detect runs a small open vision model (MobileCLIP-S0; about 45 MB the first time for model + runtime, then cached) <b>on this device</b>. It only suggests the room type; you still set the zone and facing.';
}

async function extract(file) {
  frames = []; draw(); $('#video-report').innerHTML = '';
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.setAttribute('playsinline', '');
  v.src = URL.createObjectURL(file);
  const prog = $('#video-progress'); prog.hidden = false; const bar = prog.firstElementChild;
  await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error('This browser cannot decode that video format.')); }).catch((e) => { alert(e.message); prog.hidden = true; throw e; });
  try { await v.play(); v.pause(); } catch { /* autoplay blocked: seeking still works in most browsers */ }
  const dur = v.duration || 0;
  const step = dur > 120 ? dur / 60 : 2;
  const times = []; for (let t = Math.min(0.3, dur / 2); t < dur; t += step) times.push(t);
  const c = document.createElement('canvas'); const ctx = c.getContext('2d');
  for (let i = 0; i < times.length; i++) {
    v.currentTime = times[i];
    await new Promise((r) => { const done = () => { v.removeEventListener('seeked', done); r(); }; v.addEventListener('seeked', done); setTimeout(done, 3000); });
    const sc = Math.min(1, 480 / Math.max(v.videoWidth, v.videoHeight));
    c.width = Math.round(v.videoWidth * sc); c.height = Math.round(v.videoHeight * sc);
    ctx.drawImage(v, 0, 0, c.width, c.height);
    frames.push({ no: i + 1, t: times[i], url: c.toDataURL('image/jpeg', 0.75), type: '', zone: '', facing: '' });
    bar.style.width = `${((i + 1) / times.length) * 100}%`;
    if (i % 4 === 3 || i === times.length - 1) draw();
  }
  URL.revokeObjectURL(v.src);
  setTimeout(() => (prog.hidden = true), 600);
  draw();
}

const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
function draw() {
  const typeOpts = (sel) => `<option value="">— skip —</option>` + RULES.elements.map((t) => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${t.label}</option>`).join('');
  const dirOpts = (sel, centre) => `<option value="">—</option>` + [...DIR8, ...(centre ? ['C'] : [])].map((d) => `<option value="${d}" ${d === sel ? 'selected' : ''}>${DIR_NAMES[d]}</option>`).join('');
  $('#frames').innerHTML = frames.map((f, i) => `<div class="frame ${f.type ? 'tagged' : ''}" data-i="${i}">
    <img src="${f.url}" alt="Frame ${f.no}" loading="lazy"/>
    <div class="fb"><div class="small"><b>Frame ${f.no}</b> · ${fmt(f.t)}</div>
    ${f.ai ? `<div class="ai">AI suggests: ${f.ai.map((a) => `${a.nice} ${Math.round(a.p * 100)}%`).join(' · ')}</div>` : ''}
    <label>Room / item<select data-k="type">${typeOpts(f.type)}</select></label>
    <label>Where in house<select data-k="zone">${dirOpts(f.zone, true)}</select></label>
    <label>Facing<span class="row gap-s"><select data-k="facing">${dirOpts(f.facing)}</select><button class="btn sm" data-k="useheading" title="Use the phone's current compass heading">🧭</button></span></label>
    </div></div>`).join('');
  $('#video-actions').hidden = !frames.length;
  $('#btn-autodetect').disabled = !frames.length;
  $('#frames').querySelectorAll('select').forEach((s) => (s.onchange = (e) => { const f = frames[+e.target.closest('.frame').dataset.i]; f[e.target.dataset.k] = e.target.value; e.target.closest('.frame').classList.toggle('tagged', !!f.type); }));
  $('#frames').querySelectorAll('[data-k=useheading]').forEach((b) => (b.onclick = () => { if (heading == null) return alert('Tap “Enable phone compass” first (works on phones).'); const f = frames[+b.closest('.frame').dataset.i]; f.facing = bearingToDir8(heading); draw(); }));
}

function analyse() {
  const tags = frames.filter((f) => f.type).map((f) => ({ frameNo: f.no, type: f.type, zone: f.zone, facing: f.facing }));
  const site = { slope: $('#site-slope').value, height: $('#site-height').value };
  const { checks, score } = analyseTags(tags, site);
  const n = counts(checks);
  const missing = frames.filter((f) => f.type && !f.zone && f.type !== 'entrance').length;
  $('#video-report').innerHTML = `<div class="card report-head"><div class="score-ring">${scoreRing(checks.length ? score : null)}</div><div class="grow"><h2>Instant video report</h2>
   <p class="small muted">${tags.length} tagged frame(s) · ${n.pass} pass · ${n.caution} caution · ${n.fail} fail${missing ? ` · ${missing} frame(s) need “Where in house” to be checked` : ''}. Marma and door-pada checks need a layout: use the Layout tab for those.</p></div></div>${renderChecks(checks)}`;
  $('#video-report').scrollIntoView({ behavior: 'smooth' });
}

async function autodetect() {
  const st = $('#ai-status'); const btn = $('#btn-autodetect'); btn.disabled = true;
  try {
    const { loadModel, classify } = await import('./autodetect.js');
    if (!aiLoaded) st.textContent = 'Downloading the vision model and runtime (first time only)…';
    await loadModel((p, tot) => (st.textContent = `Downloading the vision model… ${Math.round(p * 100)}% of ${(tot / 1e6).toFixed(0)} MB`));
    aiLoaded = true;
    for (let i = 0; i < frames.length; i++) {
      st.textContent = `Analysing frame ${i + 1} of ${frames.length} on this device…`;
      const f = frames[i]; f.ai = await classify(f.url);
      if (!f.type && f.ai[0].type && f.ai[0].p > 0.25) f.type = f.ai[0].type;
      if (i % 3 === 2) draw();
    }
    draw();
    st.innerHTML = 'Done. Suggestions are pre-filled where confident. <b>Check each one</b>: the model cannot tell directions, and can confuse similar rooms.';
  } catch (err) {
    st.innerHTML = `Auto-detect could not run here (${err.message}). Tag the frames by hand; everything else still works.`;
  } finally { btn.disabled = false; }
}
window.__vastuVideo = { get frames() { return frames; }, analyse, autodetect, extract, draw };
