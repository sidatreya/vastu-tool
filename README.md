# Vastu Mandala Analyser

A static, browser-only Vastu Shastra tool: upload a floor plan or site layout, set North, mark the plot and rooms, and get a 9×9 **Vastu Purush Mandala** overlay with **Marma sthan** points and a **fundamentals report**. You can also check a site walkthrough **video**.

**Live:** https://sidatreya.github.io/vastu-tool/

## Features
- **Layout input:** an image or PDF (first page is rendered with pdf.js), or draw a blank plot by entering its size. The plot boundary has draggable corners; tap `+` to add corners for irregular plots.
- **North:** set it with a compass dial, a degree entry or ±1/±5 buttons, or use the phone compass on site.
- **Mandala overlay:** 81 padas (Paramasayika) with:
  - Brahmasthan
  - all 45 devtas
  - Karna sutra diagonals
  - 8-direction or 16-zone (22.5°) sectors
  - an optional Vastu Purusha figure (head NE)

  You can toggle the overlay and adjust its opacity. The grid aligns to the plot's sides, using the side nearest North, or to exact true North.
- **Marma sthan:** shown as red dots you can tap for details. Labelled pillars, walls, toilets, stairs and septic tanks on a marma are flagged.
- **Fundamentals checker:** each item gets pass, caution or fail with a reason, plus a weighted score. Exports: an annotated PNG and a printable report (save as PDF).
- **Video:** frames are extracted every ~2 s in the browser. Tag each frame (room, where it is in the house, facing) and get an instant report. Optional **Auto-detect** suggests room types with MobileCLIP-S0 running on the device (no key, nothing uploaded).
- **Example:** **Load example layout** opens an illustrative example plan (not a real property).

## Editing the rules
All rules are in **`src/rules/vastu-rules.json`**: element types, zone rules, door padas, Brahmasthan, marma definitions, plot shape and corners, slope and heights, and scoring weights. Each rule has a `source` field. For now every rule is `"standard (pending user's reference images)"`; update it when a rule is confirmed against the reference material.

The devta layout of the mandala is in `src/rules/mandala.json`.

## Develop
```bash
npm install
npm run dev        # local dev server
npm run build      # static build in dist/
npm run publish    # build + push dist/ to the gh-pages branch
node scripts/shots.mjs http://localhost:4791/ walk.webm   # headless screenshots (needs `vite preview --port 4791`)
node scripts/embed-labels.mjs   # regenerate auto-detect label embeddings
```

## Privacy
There's no server. Plans, labels and frames stay in the browser (saved to localStorage on that device only).

*This tool is a guide only. It doesn't replace a qualified Vastu consultant or a structural engineer.*
