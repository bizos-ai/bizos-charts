#!/usr/bin/env node
// Self-check for the skill. Run after any change:  node scripts/validate.mjs
// Fails (exit 1) on: broken SKILL.md frontmatter or links, references to
// external skills/brands/CDNs, network URLs or Math.random in the engine,
// stale generated files, chart types without a passing sample, sample or
// report rule errors, or formatter and statistics regressions.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const errors = [], warnings = [], notes = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);
const rel = (p) => path.relative(root, p);
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

const LICENSE_FILES = ['LICENSE', 'NOTICE'];

/* 1. layout of the skill directory */
const ALLOWED_TOP = new Set(['SKILL.md', 'README.md', 'README.en.md', 'LICENSE', 'NOTICE', 'assets', 'catalog.md', 'report-catalog.md', 'color-presets.js', 'mono-tokens.js', 'engine', 'references', 'scripts', 'templates', 'examples']);
for (const name of fs.readdirSync(root)) if (!name.startsWith('.') && !ALLOWED_TOP.has(name)) err(`unexpected top-level entry: ${name}`);
for (const p of ['SKILL.md', 'catalog.md', 'report-catalog.md', 'engine/bizos-charts.js', 'references/house-style.md', 'references/chart-selection.md', 'references/spec-reference.md', 'references/report-mode.md', 'references/delivery-checks.md', 'references/chart-index.json', 'templates/gallery.zh.html', 'templates/gallery.en.html']) if (!exists(p)) err(`missing: ${p}`);

/* 2. SKILL.md frontmatter */
const skill = exists('SKILL.md') ? read('SKILL.md') : '';
const fm = skill.match(/^---\n([\s\S]*?)\n---\n/);
if (!fm) err('SKILL.md has no frontmatter');
else {
  const name = (fm[1].match(/^name:\s*(.+)$/m) || [])[1], desc = (fm[1].match(/^description:\s*(.+)$/m) || [])[1];
  if (name !== 'bizos-charts') err('frontmatter name must be bizos-charts');
  if (!desc) err('frontmatter description missing');
  else if (desc.length > 1024) err(`description too long (${desc.length} > 1024)`);
  const lines = skill.split('\n').length;
  if (lines > 400) warn(`SKILL.md is ${lines} lines; keep the entry file short and move detail to references/`);
}

/* 3. text files: links and external references */
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};
const files = walk(root);
const TEXT = /\.(md|js|mjs|cjs|json|html|txt|yaml|yml|css)$/;
// Names of external tools, skills, brands and CDNs are kept out of this skill,
// including this file: the list is stored as SHA-256 prefixes of the terms.
const BLOCKED = new Set(["184cf6b2e23c12b1", "1bf26a0f3f931961", "286a3c612017ad1d", "2b487fc7d30b1b4b", "334c869e24a471c0", "39f2ccd563ab3c6a", "43d26e8db66a76f6", "485e01f974db14ca", "4f383524eede9578", "5247a9aa8c1a5fed", "5536a646767eeca5", "57de4cf40144bdf7", "5e25812b64b920c1", "60965168ce762e94", "68961e958f446498", "7072481935bd8844", "7d3194f79e645c42", "aa150d3005ceb681", "ab6e8ae2e86a5982", "ab7a428375435ad7", "aeb6dd081c371827", "bb74933adfea82ab", "bf11eb52df8cda62", "c70eca6b0f88f44d", "c857d09db23e6822", "c90d5f3fe5c68483", "cb88b41d223c7f04", "d26c6a08a591011a", "dac8cb71ebe9642e", "db1530a0d085c987", "f42a85b7e87ca90a", "f84035fd958129fc", "fa7dedef78d8bec1"]);
const h16 = (t) => crypto.createHash('sha256').update(t.toLowerCase()).digest('hex').slice(0, 16);
function externalTerms(text) {
  const hits = new Set();
  for (const tok of text.match(/[A-Za-z][A-Za-z0-9.\-]*[A-Za-z0-9]/g) || []) {
    for (const part of [tok, ...tok.split(/[.\-\/]/)]) if (part && BLOCKED.has(h16(part))) hits.add(part);
    const dots = tok.split('.'); for (let i = 0; i < dots.length - 1; i++) { const pair = dots[i] + '.' + dots[i + 1]; if (BLOCKED.has(h16(pair))) hits.add(pair); }
  }
  for (const run of text.match(/[\u2E80-\u9FFF]{2,}/g) || []) for (let n = 2; n <= 5; n++) for (let i = 0; i + n <= run.length; i++) { const sub = run.slice(i, i + n); if (BLOCKED.has(h16(sub))) hits.add(sub); }
  return [...hits];
}
for (const f of files) {
  const r = rel(f);
  if (!TEXT.test(f) || LICENSE_FILES.includes(r)) continue;
  const text = fs.readFileSync(f, 'utf8');
  const ext = externalTerms(text);
  if (ext.length) err(`external reference in ${r}: ${ext.join(', ')}`);
  if (/\.md$/.test(f)) {
    for (const link of text.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
      const target = link[1];
      if (/^[a-z]+:/i.test(target)) { err(`absolute link in ${r}: ${target}`); continue; }
      if (!fs.existsSync(path.resolve(path.dirname(f), target))) err(`broken link in ${r}: ${target}`);
    }
  }
}

/* 4. engine hygiene */
const engine = exists('engine/bizos-charts.js') ? read('engine/bizos-charts.js') : '';
const urls = (engine.match(/https?:\/\/[^\s'"`)]+/g) || []).filter((u) => !/^http:\/\/www\.w3\.org\//.test(u));
if (urls.length) err(`engine contains network URLs: ${[...new Set(urls)].join(', ')}`);
for (const f of fs.readdirSync(path.join(root, 'engine/src'))) if (/Math\.random\(/.test(read('engine/src/' + f))) err(`Math.random in engine/src/${f}: output must be deterministic`);
for (const f of files.filter((x) => /\.html$/.test(x))) {
  const t = fs.readFileSync(f, 'utf8');
  const ext = (t.match(/(?:src|href)=["']https?:\/\/[^"']+/g) || []).concat(t.match(/@import\s+url\(["']?https?:/g) || []);
  if (ext.length) err(`${rel(f)} loads remote resources: ${ext.slice(0, 3).join(', ')}`);
}

/* 5. generated files are current */
try { execFileSync(process.execPath, [path.join(root, 'scripts/build.mjs'), '--check'], { stdio: 'pipe' }); }
catch (e) { err('generated files are stale: run node scripts/build.mjs\n' + String(e.stdout || '') + String(e.stderr || '')); }

/* 6. registry completeness, samples and reports */
const BC = require(path.join(root, 'engine/bizos-charts.js'));
const catalog = BC.catalog();
const specFiles = exists('examples/specs') ? fs.readdirSync(path.join(root, 'examples/specs')).filter((f) => f.endsWith('.json')) : [];
for (const c of catalog) {
  for (const k of ['name', 'question', 'use', 'avoid']) if (!c[k] || !c[k].zh || !c[k].en) err(`${c.id}: ${k} needs zh and en`);
  if (!c.fields || !c.fields.length) err(`${c.id}: no field contract`);
  if (!(c.keywords.zh || []).length || (c.keywords.zh || []).length < 3 || (c.keywords.en || []).length < 3) err(`${c.id}: needs ≥3 zh and ≥3 en keywords`);
  const mine = specFiles.filter((f) => f.startsWith(c.id + '-'));
  if (mine.length !== 1) err(`${c.id}: expected exactly one sample in examples/specs, found ${mine.length}`);
}
let rendered = 0;
for (const f of specFiles) {
  const spec = JSON.parse(read('examples/specs/' + f));
  for (const lang of ['zh', 'en']) {
    const s = { ...spec, lang };
    const issues = BC.lint(s);
    issues.filter((i) => i.level === 'error').forEach((i) => err(`${f} [${lang}] ${i.code}: ${i.message}`));
    issues.filter((i) => i.level === 'warning').forEach((i) => warn(`${f} [${lang}] ${i.code}: ${i.message}`));
    for (const w of [340, 760]) {
      try { const r = BC.render(s, { width: w }); if (!r.html || r.error) err(`${f} [${lang}] did not render at ${w}px`); rendered++; }
      catch (e) { err(`${f} [${lang}] threw at ${w}px: ${e.message}`); }
    }
  }
}
const reportDir = path.join(root, 'examples/reports');
if (fs.existsSync(reportDir)) for (const f of fs.readdirSync(reportDir).filter((x) => x.endsWith('.json'))) {
  const out = path.join(root, 'templates/reports', JSON.parse(read('examples/reports/' + f)).layout + '.zh.html');
  if (!fs.existsSync(out)) err(`report sample ${f} has no built template`);
}

/* 7. formatter regressions */
const F = BC.format, eq = (got, want, what) => { if (got !== want) err(`format ${what}: got "${got}", want "${want}"`); };
eq(F(-1234.5, 'number:1', 'zh'), '−1,234.5', 'negative minus');
eq(F(-1234.5, 'number:1', 'zh', { negative: 'parens' }), '(1,234.5)', 'negative parentheses');
eq(F(12.345, 'percent:1', 'en'), '12.3%', 'percent');
eq(F(1.25, { type: 'pp', decimals: 1, sign: true }, 'en'), '+1.3 pp', 'pp en');
eq(F(1.25, { type: 'pp', decimals: 1, sign: true }, 'zh'), '+1.3pct', 'pp zh');
eq(F(15.63, 'multiple', 'zh'), '15.6x', 'multiple');
eq(F(null, 'number', 'zh'), '—', 'missing');
eq(F('n.m.', 'multiple', 'en'), 'n.m.', 'not meaningful');
eq(F(-0.04, 'number:1', 'zh'), '0.0', 'negative zero');
eq(F(0.0499, 'pvalue', 'zh'), '0.0499', 'P just under 0.05 keeps its digits');
eq(F(0.234, 'pvalue', 'en'), '0.23', 'P above 0.1');
eq(F(0.00042, 'pvalue', 'en'), '<0.001', 'small P');
eq(F(4.2e-9, { type: 'pvalue', sci: true }, 'en'), '4.2×10⁻⁹', 'genome-wide P');
eq(BC.stats.formatP(0.03, 'en'), 'P = 0.03', 'P sentence');

/* 8. statistics regressions: reference values from standard tables and a
   classic leukaemia remission dataset (maintained vs non-maintained). */
const S = BC.stats, near = (got, want, tol, what) => { if (!(Math.abs(got - want) <= tol)) err(`stats ${what}: got ${got}, want ${want}`); };
near(S.normPpf(0.975), 1.959964, 1e-6, 'normal quantile');
near(S.tPpf(0.975, 10), 2.228139, 1e-6, 't quantile, df 10');
near(S.chi2Sf(3.841459, 1), 0.05, 1e-6, 'chi-square tail');
near(S.welch([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]).p, 0.107531, 1e-5, 'Welch t-test');
near(S.mannWhitney([1.1, 2.2, 3.3, 4.4], [5.5, 6.6, 7.7, 8.8, 9.9]).p, 2 / 126, 1e-12, 'exact Mann–Whitney');
const mt = [9, 13, 13, 18, 23, 28, 31, 34, 45, 48, 161], me = [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0], nt = [5, 5, 8, 8, 12, 16, 23, 27, 30, 33, 43, 45], ne = [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1];
near(S.kaplanMeier(mt, me).median, 31, 0, 'Kaplan–Meier median');
near(S.logRank([{ times: mt, events: me }, { times: nt, events: ne }]).chi2, 3.3964, 1e-3, 'log-rank chi-square');
near(S.roc([0.9, 0.8, 0.7, 0.6, 0.55, 0.54, 0.53, 0.52, 0.51, 0.505, 0.4, 0.39, 0.38, 0.37, 0.36, 0.35, 0.34, 0.33, 0.3, 0.1], [1, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0]).auc, 0.68, 1e-12, 'ROC AUC');
const lx = [], ly = [];
for (let x = -10; x <= -4.5; x += 0.5) for (const e of [-1.5, 0.4, 1.1]) { lx.push(x); ly.push(5 + 93 / (1 + Math.pow(10, (-7.3 - x) * -1.2)) + e); }
const f4 = S.fit4PL(lx, ly);
near(f4.logec50, -7.3, 1e-4, '4PL log EC50'); near(f4.hill, -1.2, 1e-4, '4PL Hill slope');


const ok = errors.length === 0;
console.log(JSON.stringify({ ok, types: catalog.length, samples: specFiles.length, renders: rendered, errors, warnings, notes }, null, 1));
process.exit(ok ? 0 : 1);
