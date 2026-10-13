#!/usr/bin/env node
// Record real chart interactions as looping English documentation previews.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = path.join(root, 'skills/bizos-charts');
const require = createRequire(import.meta.url);
const charts = require(path.join(skill, 'engine/bizos-charts.js'));
const engineSource = fs.readFileSync(path.join(skill, 'engine/bizos-charts.js'), 'utf8');
const chromium = require(process.env.BIZOS_PLAYWRIGHT_CORE || 'playwright-core').chromium;
const executablePath = process.env.BIZOS_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = path.join(root, 'output/previews');
const images = path.join(skill, 'assets/previews');
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(images, { recursive: true });

const load = file => ({ ...JSON.parse(fs.readFileSync(path.join(skill, 'examples/specs', file + '.json'), 'utf8')), lang: 'en' });
const previews = [
  ['overview', 'BizOS Charts · Evidence in view', ['T01-line', 'C05-dumbbell', 'V02-sensitivity', 'E04-forest', 'B01-survival', 'B02-dose']],
  ['trends', 'Follow performance and compare entities', ['T01-line', 'C05-dumbbell']],
  ['finance', 'Explain results and inspect assumptions', ['S03-waterfall', 'V02-sensitivity']],
  ['biomedicine', 'Inspect survival and dose response', ['B01-survival', 'B02-dose']],
  ['statistics', 'Read effects, intervals, and classification evidence', ['E04-forest', 'E05-roc']],
];
const files = [];
for (const [name, title, samples] of previews) {
  const result = charts.exhibitsPage(samples.map(load), {
    engineSource, layout: 'grid', title, kicker: 'BIZOS CHARTS · OPEN SOURCE',
    lede: 'Rendered from bundled specifications. All data are illustrative.',
  });
  const errors = result.issues.filter(issue => issue.level === 'error');
  if (errors.length) throw new Error(JSON.stringify(errors));
  const file = path.join(output, name + '.html');
  fs.writeFileSync(file, result.html);
  files.push({ name, file });
}
const dashboard = JSON.parse(fs.readFileSync(path.join(skill, 'examples/reports/dashboard.json'), 'utf8'));
const report = charts.report({ ...dashboard, lang: 'en' }, { engineSource });
if (report.issues.some(issue => issue.level === 'error')) throw new Error(JSON.stringify(report.issues));
const dashboardFile = path.join(output, 'dashboard.html');
fs.writeFileSync(dashboardFile, report.html);
files.push({ name: 'dashboard', file: dashboardFile });

const browser = await chromium.launch({ executablePath, headless: true, args: ['--disable-extensions', '--disable-background-networking', '--no-first-run'] });
const results = [];
try {
  for (const { name, file } of files) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => { if (!/^(file|data|blob|about):/.test(request.url())) errors.push('External request: ' + request.url()); });
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    await page.evaluate(() => document.fonts.ready);
    if (errors.length) throw new Error(name + ': ' + errors.join('; '));
    const framesDir = path.join(output, name + '-frames');
    fs.mkdirSync(framesDir, { recursive: true });
    const frames = [];
    const capture = async (duration = 0.125) => {
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const frame = path.join(framesDir, String(frames.length).padStart(4, '0') + '.png');
      await page.screenshot({ path: frame });
      frames.push({ frame, duration });
    };
    const scrollTo = async (target, seconds = 2) => {
      const start = await page.evaluate(() => window.scrollY);
      const max = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
      const end = Math.max(0, Math.min(target, max));
      if (Math.abs(end - start) < 2) return;
      const count = Math.round(seconds * 8);
      for (let i = 1; i <= count; i++) {
        const t = i / count, eased = t * t * (3 - 2 * t);
        await page.evaluate(y => window.scrollTo(0, y), start + (end - start) * eased);
        await capture(seconds / count);
      }
    };
    await capture(1.2);
    let tooltips = 0;
    const hits = page.locator('[data-tip]');
    const count = await hits.count();
    for (const index of [...new Set([0, Math.min(6, count - 1)])]) {
      if (index < 0) continue;
      const hit = hits.nth(index), box = await hit.boundingBox();
      if (!box || box.y < 0 || box.y + box.height > 800) continue;
      await hit.focus();
      const shown = await page.locator('.bz-tip').evaluateAll(tips => tips.some(tip => getComputedStyle(tip).display !== 'none'));
      if (shown) { tooltips++; await capture(1); }
      await hit.evaluate(element => element.blur());
    }
    const summary = page.locator('details.bz-data > summary').first();
    const tableCount = await summary.count();
    if (tableCount) {
      const y = await summary.evaluate(element => element.getBoundingClientRect().top + window.scrollY);
      await scrollTo(y - 450, 1.5);
      await summary.click();
      await capture(1.4);
      await summary.click();
    }
    const max = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
    await scrollTo(max, name === 'overview' || name === 'dashboard' ? 4 : 2);
    await capture(1.3);
    await scrollTo(0, name === 'overview' || name === 'dashboard' ? 3 : 2);
    await capture(1);
    if (errors.length) throw new Error(name + ': ' + errors.join('; '));
    const escapePath = p => p.replaceAll("'", "'\\''");
    const sequence = path.join(framesDir, 'frames.txt');
    fs.writeFileSync(sequence, frames.map(({ frame, duration }) => `file '${escapePath(frame)}'\nduration ${duration}\n`).join('') + `file '${escapePath(frames.at(-1).frame)}'\n`);
    const destination = path.join(images, name + '.gif');
    execFileSync(process.env.BIZOS_FFMPEG || 'ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', sequence,
      '-filter_complex', 'split[a][b];[a]palettegen=max_colors=192:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
      '-fps_mode', 'vfr', '-loop', '0', destination,
    ], { stdio: 'pipe' });
    results.push({ name, figures: await page.locator('figure.bz-exhibit').count(), frames: frames.length, tooltips, dataTableShown: !!tableCount, bytes: fs.statSync(destination).size });
    console.log(JSON.stringify(results.at(-1)));
    await page.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ ok: true, previews: results }, null, 2));
