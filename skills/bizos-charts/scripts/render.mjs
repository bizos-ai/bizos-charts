#!/usr/bin/env node
// Render exhibit specs or a report spec into one offline HTML file (or SVG).
// The rule checks run first; nothing is written while any error remains.
//
//   node scripts/render.mjs --spec exhibit.json --out exhibit.html
//   node scripts/render.mjs --spec exhibits.json --out page.html --layout grid
//   node scripts/render.mjs --spec exhibit.json --svg exhibit.svg [--width 760]
//   node scripts/render.mjs --report report.json --out report.html [--lang en]
//   node scripts/render.mjs --check exhibit.json          (rules only)
//   node scripts/render.mjs --list                       (chart IDs)
//
// --spec accepts one spec, an array of specs, or a page object
// {title, kicker, date, lede, layout:"stack"|"grid", exhibits:[…]}.
// --strict also fails on warnings. Exit code 1 = errors, 2 = usage.
// The JSON summary includes "stats" for exhibits that compute statistics
// (E/B families: medians, AUC, IC50, P values, pooled effects …); quote
// title numbers from there so title and exhibit always agree.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const enginePath = path.join(here, '..', 'engine', 'bizos-charts.js');
const require = createRequire(import.meta.url);
const BC = require(enginePath);
const engineSource = fs.readFileSync(enginePath, 'utf8');

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const has = (name) => argv.includes(name);
const fail = (msg, code = 2) => { console.error(msg); process.exit(code); };
const readJSON = (file) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { fail(`Cannot read JSON ${file}: ${e.message}`); }
};
const writeOut = (file, content) => {
  const abs = path.resolve(file);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  return abs;
};
const summarize = (issues) => ({
  errors: issues.filter((i) => i.level === 'error'),
  warnings: issues.filter((i) => i.level === 'warning'),
});
const finish = (payload, issues) => {
  const { errors, warnings } = summarize(issues);
  const failed = errors.length > 0 || (has('--strict') && warnings.length > 0);
  console.log(JSON.stringify({ ok: !failed, ...payload, errors, warnings }, null, 1));
  process.exit(failed ? 1 : 0);
};

if (has('--list')) {
  const rows = BC.catalog().map((c) => `${c.id}\t${c.name.zh} / ${c.name.en}\t${c.question.zh}`);
  console.log(rows.join('\n'));
  process.exit(0);
}

const lang = opt('--lang');
const withLang = (spec) => (lang ? { ...spec, lang } : spec);
const statsOf = (list) => {
  const out = [];
  list.forEach((s, index) => { try { const r = BC.render(s, { width: 760 }); if (r.stats) out.push({ index, type: r.type, stats: r.stats }); } catch { /* lint reports the problem */ } });
  return out.length ? out : undefined;
};

if (has('--check')) {
  const input = readJSON(opt('--check'));
  const specs = Array.isArray(input) ? input : input.exhibits || (input.layout && input.meta ? null : [input]);
  if (!specs) {
    const r = BC.report(withLang(input), {});
    finish({ checked: 'report', exhibits: r.exhibits }, r.issues);
  }
  const issues = [];
  specs.forEach((s, i) => BC.lint(withLang(s)).forEach((x) => issues.push({ index: i, type: s.type, ...x })));
  finish({ checked: specs.length, stats: statsOf(specs.map(withLang)) }, issues);
}

if (opt('--report')) {
  const spec = withLang(readJSON(opt('--report')));
  const r = BC.report(spec, { engineSource });
  const { errors } = summarize(r.issues);
  if (errors.length || (has('--strict') && r.issues.length)) finish({ out: null, exhibits: r.exhibits }, r.issues);
  const out = opt('--out') || 'report.html';
  finish({ out: writeOut(out, r.html), exhibits: r.exhibits, bytes: Buffer.byteLength(r.html) }, r.issues);
}

const specFile = opt('--spec');
if (!specFile) fail('Usage: render.mjs --spec <file> --out <html> | --svg <svg>  ·  --report <file> --out <html>  ·  --check <file>  ·  --list');
const input = readJSON(specFile);
const page = Array.isArray(input) ? { exhibits: input } : input.exhibits ? input : { exhibits: [input] };
const specs = page.exhibits.map(withLang);

if (opt('--svg')) {
  if (specs.length !== 1) fail('--svg renders exactly one exhibit');
  const issues = BC.lint(specs[0]);
  if (summarize(issues).errors.length) finish({ out: null }, issues);
  const svg = BC.exhibitSVG(specs[0], { width: Number(opt('--width')) || 760, no: specs[0].no });
  if (!svg) fail('This chart type renders as an HTML table; use --out for HTML.', 1);
  finish({ out: writeOut(opt('--svg'), svg), stats: statsOf(specs) }, issues);
}

const result = BC.exhibitsPage(specs, {
  engineSource,
  layout: page.layout || (has('--grid') ? 'grid' : 'stack'),
  title: page.title, kicker: page.kicker, date: page.date, lede: page.lede,
  numbering: page.numbering,
});
const issues = result.issues;
if (summarize(issues).errors.length || (has('--strict') && issues.length)) finish({ out: null, exhibits: specs.length }, issues);
const out = opt('--out') || 'exhibits.html';
finish({ out: writeOut(out, result.html), exhibits: specs.length, bytes: Buffer.byteLength(result.html), stats: statsOf(specs) }, issues);
