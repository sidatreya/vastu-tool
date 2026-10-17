// Precompute MobileCLIP-S0 text embeddings for room labels so the browser only needs the 12 MB vision model.
import { AutoTokenizer, CLIPTextModelWithProjection } from '@huggingface/transformers';
import fs from 'fs';
const M = 'Xenova/mobileclip_s0';
const labels = {
  kitchen: ['a photo of a kitchen', 'a kitchen with a stove and cabinets'],
  master_bedroom: ['a photo of a bedroom', 'a bedroom with a large bed'],
  bedroom: ['a photo of a small bedroom', "a children's bedroom"],
  living: ['a photo of a living room', 'a living room with a sofa'],
  dining: ['a photo of a dining room', 'a dining table with chairs'],
  pooja: ['a photo of a prayer room with idols', 'a hindu pooja room shrine'],
  toilet: ['a photo of a bathroom', 'a toilet and washbasin'],
  staircase: ['a photo of a staircase', 'stairs inside a house'],
  entrance: ['a photo of a main door', 'the front entrance door of a house'],
  balcony: ['a photo of a balcony', 'a terrace or balcony'],
  store: ['a photo of a store room', 'a storage room with shelves'],
  study: ['a photo of a study room', 'a home office with a desk'],
  water_tank: ['a photo of a water tank', 'a borewell or water pump'],
  garden: ['a photo of a garden', 'an open plot of land'],
  parking: ['a photo of a car parking garage', 'a car porch'],
  open_site: ['a photo of an empty construction site', 'an empty plot of land with soil'],
};
const tok = await AutoTokenizer.from_pretrained(M);
const model = await CLIPTextModelWithProjection.from_pretrained(M, { dtype: 'fp32' });
const out = { model: M, dim: 0, labels: {} };
for (const [k, prompts] of Object.entries(labels)) {
  const inputs = tok(prompts, { padding: 'max_length', truncation: true });
  const { text_embeds } = await model(inputs);
  const d = text_embeds.dims[1]; out.dim = d;
  const avg = new Array(d).fill(0);
  for (let i = 0; i < prompts.length; i++) {
    const v = Array.from(text_embeds.data.slice(i * d, (i + 1) * d));
    const n = Math.hypot(...v); v.forEach((x, j) => (avg[j] += x / n));
  }
  const n = Math.hypot(...avg);
  out.labels[k] = avg.map((x) => +(x / n).toFixed(5));
}
fs.writeFileSync('src/data/label-embeds.json', JSON.stringify(out));
console.log('ok', Object.keys(out.labels).length, 'dim', out.dim);
