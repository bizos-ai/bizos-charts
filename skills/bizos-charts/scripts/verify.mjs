#!/usr/bin/env node
// Open finished HTML in a local headless browser at desktop and phone widths
// and check what source checks cannot see.
//   node scripts/verify.mjs out.html [more.html] [--widths 1280,390] [--chrome <path>]
// Errors: page or console errors, any non-local request, figures that did not
// render, horizontal page overflow, chart text rendered below 11px.
// Warnings: overlapping text inside a chart.
// Exit 0 = pass, 1 = failed checks, 3 = no browser available (not a chart
// failure: report it as unverified, never as verified).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const files = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
if (!files.length) { console.error('Usage: verify.mjs <file.html> [...] [--widths 1280,390] [--chrome <path>]'); process.exit(2); }
const widths = (opt('--widths') || '1280,390').split(',').map(Number).filter(Boolean);

let chromium;
for (const p of [process.env.BIZOS_PLAYWRIGHT_CORE, path.join(here, 'node_modules', 'playwright-core'), 'playwright-core'].filter(Boolean)) {
  try { chromium = require(p).chromium; break; } catch { /* try next */ }
}
const candidates = [opt('--chrome'), process.env.BIZOS_CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean);
const exe = candidates.find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
if (!chromium || !exe) {
  console.log(JSON.stringify({ ok: false, unverified: true, reason: !chromium ? 'playwright-core not available' : 'no local Chrome/Edge found' }));
  process.exit(3);
}

const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--disable-gpu', '--no-first-run', '--disable-extensions', '--disable-background-networking', '--disable-component-update', '--disable-sync'] });
const report = [];
let failed = false;
try {
  for (const file of files) {
    const url = pathToFileURL(path.resolve(file)).href;
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const errors = [], warnings = [];
      page.on('pageerror', (e) => errors.push('page error: ' + e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
      page.on('request', (r) => { const u = r.url(); if (!/^(file|data|blob|about):/.test(u)) errors.push('external request: ' + u); });
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(600);
      const res = await page.evaluate(() => {
        const out = { figures: 0, empty: [], small: [], overlaps: [], overflow: 0 };
        const de = document.documentElement;
        out.overflow = de.scrollWidth - de.clientWidth;
        document.querySelectorAll('figure.bz-exhibit').forEach((fig, i) => {
          out.figures++;
          const title = (fig.querySelector('.bz-title') || {}).textContent || '#' + i;
          const plot = fig.querySelector('.bz-plot');
          if (!plot || !(plot.querySelector('svg, table, .bz-kpis'))) { out.empty.push(title); return; }
          const svg = plot.querySelector(':scope > svg');
          if (!svg) return;
          const vb = svg.viewBox.baseVal, scale = vb && vb.width ? svg.getBoundingClientRect().width / vb.width : 1;
          const boxes = [];
          svg.querySelectorAll('text').forEach((t) => {
            const fs = parseFloat(t.getAttribute('font-size') || getComputedStyle(t).fontSize) * scale;
            if (t.textContent.trim() && fs < 10.5) out.small.push(title + ' · "' + t.textContent.slice(0, 24) + '" ' + fs.toFixed(1) + 'px');
            const r = t.getBoundingClientRect();
            if (r.width > 0 && t.textContent.trim()) boxes.push({ r, s: t.textContent.trim() });
          });
          for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
            const A = boxes[a].r, B = boxes[b].r;
            const w = Math.min(A.right, B.right) - Math.max(A.left, B.left), h = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
            if (w > 2 && h > 3 && w * h > 0.25 * Math.min(A.width * A.height, B.width * B.height)) { out.overlaps.push(title + ' · "' + boxes[a].s.slice(0, 18) + '" × "' + boxes[b].s.slice(0, 18) + '"'); if (out.overlaps.length > 40) return; }
          }
        });
        return out;
      });
      if (res.overflow > 1) errors.push(`page scrolls horizontally by ${res.overflow}px`);
      if (!res.figures) warnings.push('no exhibits found');
      res.empty.forEach((t) => errors.push('exhibit did not render: ' + t));
      res.small.forEach((t) => errors.push('text below 11px: ' + t));
      res.overlaps.forEach((t) => warnings.push('overlapping text: ' + t));
      if (errors.length) failed = true;
      report.push({ file, width, figures: res.figures, errors, warnings });
      await page.close();
    }
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify({ ok: !failed, browser: path.basename(exe), results: report }, null, 1));
process.exit(failed ? 1 : 0);
