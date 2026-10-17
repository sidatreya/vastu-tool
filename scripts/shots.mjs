// Headless test + screenshots. Usage: node scripts/shots.mjs [baseUrl] [videoPath]
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://localhost:4173/';
const video = process.argv[3];
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const errors = [];
const watch = (p) => { p.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); }); };
// desktop
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
watch(page);
await page.goto(base, { waitUntil: 'networkidle' });
await page.click('#btn-example');
await page.waitForTimeout(800);
await page.click('#opt-purusha');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/desktop-mandala.png' });
const a = await page.evaluate(() => ({ score: window.vastu.analysis.score, checks: window.vastu.analysis.checks.map((c) => `${c.status.padEnd(7)} ${c.title} — ${c.reason}`) }));
console.log('SCORE', a.score); console.log(a.checks.join('\n'));
// tap a marma for tooltip
const box = await page.locator('.marma circle').first().boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(200);
console.log('INFO:', await page.textContent('#info'));
await page.click('#opt-purusha');
await page.click('.tab[data-tab=report]');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/report.png', fullPage: true });
// export png
const png = await page.evaluate(async () => { const b = document.querySelector('#btn-png'); let url; const orig = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { url = this.href; }; b.click(); await new Promise((r) => setTimeout(r, 1500)); HTMLAnchorElement.prototype.click = orig; return url; });
if (png) { const fs = await import('fs'); fs.writeFileSync('shots/export-annotated.png', Buffer.from(png.split(',')[1], 'base64')); console.log('export png bytes', png.length); }
// video
await page.click('.tab[data-tab=video]');
if (video) {
  await page.setInputFiles('#file-video', video);
  await page.waitForFunction(() => window.__vastuVideo.frames.length >= 6, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  if (process.env.AI) {
    await page.click('#btn-autodetect');
    await page.waitForFunction(() => /Done|could not/.test(document.querySelector('#ai-status').textContent), null, { timeout: 240000 });
    console.log('AI:', await page.textContent('#ai-status'));
    console.log(await page.evaluate(() => window.__vastuVideo.frames.map((f) => `${f.no}@${f.t.toFixed(1)}s ${f.ai?.map((a) => a.nice + ':' + a.p.toFixed(2)).join(' ')} -> ${f.type}`).join('\n')));
  }
  await page.evaluate(() => { const F = window.__vastuVideo.frames; const z = ['SE', 'NE', 'SW', 'S']; F.forEach((f, i) => { f.zone = z[Math.floor(f.t / 4)] || 'S'; if (!f.type) f.type = ['kitchen', 'toilet', 'master_bedroom', 'staircase'][Math.floor(f.t / 4)] || ''; }); F[0].facing = 'E'; });
  await page.evaluate(() => window.__vastuVideo.draw());
  // redraw by toggling a select
  await page.evaluate(() => window.__vastuVideo.analyse());
  await page.waitForTimeout(500);
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: 'shots/video.png', fullPage: true });
// mobile
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
watch(m);
await m.goto(base, { waitUntil: 'networkidle' });
await m.screenshot({ path: 'shots/mobile-start.png' });
await m.click('#btn-example');
await m.waitForTimeout(800);
await m.screenshot({ path: 'shots/mobile.png' });
await m.click('.tab[data-tab=report]');
await m.waitForTimeout(300);
await m.screenshot({ path: 'shots/mobile-report.png' });
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
