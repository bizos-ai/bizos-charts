#!/usr/bin/env node
// Render English documentation previews from the bundled specifications.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

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
    engineSource, layout: 'grid', title, kicker: 'BIZOS CHARTS · OPEN SKILLS',
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
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => { if (!/^(file|data|blob|about):/.test(request.url())) errors.push('External request: ' + request.url()); });
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    await page.evaluate(() => document.fonts.ready);
    if (errors.length) throw new Error(name + ': ' + errors.join('; '));
    const destination = path.join(images, name + '.png');
    await page.screenshot({ path: destination, fullPage: true });
    results.push({ name, figures: await page.locator('figure.bz-exhibit').count(), bytes: fs.statSync(destination).size });
    await page.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ ok: true, previews: results }, null, 2));
