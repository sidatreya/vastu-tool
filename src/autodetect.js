// Optional in-browser room recognition: MobileCLIP-S0 vision encoder (fp16, ~23 MB, cached by the browser)
// compared against text embeddings precomputed offline (src/data/label-embeds.json). No API key, nothing uploaded.
import E from './data/label-embeds.json';
let ready = null;
const MAP = { kitchen: 'kitchen', master_bedroom: 'bedroom', bedroom: 'bedroom', living: 'living', dining: 'dining', pooja: 'pooja', toilet: 'toilet', staircase: 'staircase', entrance: 'entrance', balcony: 'balcony', store: 'store', study: 'study', water_tank: 'borewell', garden: null, parking: 'parking', open_site: null };
const NICE = { garden: 'garden / open land', open_site: 'empty site', master_bedroom: 'bedroom', water_tank: 'water tank / borewell' };
export async function loadModel(onProgress) {
  if (!ready) ready = (async () => {
    const T = await import('@huggingface/transformers');
    T.env.allowLocalModels = false;
    const files = {};
    const cb = (p) => { if (p.status === 'progress' && p.total) { files[p.file] = [p.loaded, p.total]; const L = Object.values(files).reduce((a, b) => a + b[0], 0), Tt = Object.values(files).reduce((a, b) => a + b[1], 0); onProgress?.(L / Tt, Tt); } };
    const processor = await T.AutoProcessor.from_pretrained(E.model, { progress_callback: cb });
    const model = await T.CLIPVisionModelWithProjection.from_pretrained(E.model, { dtype: 'fp16', device: 'wasm', progress_callback: cb });
    return { T, processor, model };
  })().catch((e) => { ready = null; throw e; });
  return ready;
}
export async function classify(dataUrl) {
  const { T, processor, model } = await ready;
  const img = await T.RawImage.fromURL(dataUrl);
  const { image_embeds } = await model(await processor(img));
  const v = Array.from(image_embeds.data); const n = Math.hypot(...v);
  const sims = Object.entries(E.labels).map(([k, t]) => [k, t.reduce((a, x, i) => a + (x * v[i]) / n, 0)]);
  const ex = sims.map(([k, s]) => [k, Math.exp(100 * s)]); const Z = ex.reduce((a, b) => a + b[1], 0);
  const agg = {};
  for (const [k, e] of ex) { const nice = NICE[k] || k.replace('_', ' '); (agg[nice] ||= { label: k, nice, type: MAP[k], p: 0 }).p += e / Z; }
  return Object.values(agg).sort((a, b) => b.p - a.p).slice(0, 3);
}
