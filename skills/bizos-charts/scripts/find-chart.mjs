#!/usr/bin/env node
// Recall chart types for an analysis question.
//   node scripts/find-chart.mjs --query "各站点月度销售额走势" [--fields time,measure,category] [--top 5] [--json]
// Scoring uses the registry (names, questions, use cases, keywords) in both
// languages plus field-role compatibility. It suggests; the data contract
// in catalog.md decides.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const index = JSON.parse(fs.readFileSync(path.join(here, '..', 'references', 'chart-index.json'), 'utf8'));
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const query = (opt('--query') || argv.filter((a) => !a.startsWith('--')).join(' ')).trim();
if (!query) { console.error('Usage: find-chart.mjs --query "<question>" [--fields time,measure,category] [--top 5] [--json]'); process.exit(2); }
const top = Number(opt('--top')) || 5;
const fields = (opt('--fields') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const norm = (s) => String(s || '').toLowerCase();
const cjkGrams = (s) => { const t = norm(s).replace(/[^⺀-鿿]/g, ''); const g = new Set(); for (let i = 0; i < t.length - 1; i++) g.add(t.slice(i, i + 2)); return g; };
const words = (s) => new Set(norm(s).split(/[^a-z0-9/+]+/).filter((w) => w.length > 2));
const qGrams = cjkGrams(query), qWords = words(query), qn = norm(query);

const ROLE_ALIASES = {
  time: ['time', 'date'], date: ['date', 'time'], measure: ['measure', 'measure[]'], category: ['category', 'dimension', 'geo'],
  geo: ['geo'], link: ['link'], tree: ['tree'], matrix: ['matrix', 'axis'], text: ['text'], interval: ['interval'], ordinal: ['ordinal']
};
function fieldScore(chart) {
  if (!fields.length) return 0;
  const roles = chart.fields.map((f) => String(f.role).split('|')).flat().map(norm);
  let s = 0;
  for (const f of fields) if ((ROLE_ALIASES[f] || [f]).some((r) => roles.some((x) => x.startsWith(r)))) s += 1.5; else s -= 1;
  return s;
}
function score(chart) {
  let s = 0; const why = [];
  const kws = [...(chart.keywords.zh || []), ...(chart.keywords.en || [])];
  for (const k of kws) if (qn.includes(norm(k))) { s += norm(k).length >= 3 ? 4 : 2.5; why.push(k); }
  const text = [chart.name.zh, chart.name.en, chart.question.zh, chart.question.en, chart.use.zh, chart.use.en].join(' ');
  const g = cjkGrams(text); let hit = 0; for (const x of qGrams) if (g.has(x)) hit++;
  s += hit * 0.8;
  const w = words(text); for (const x of qWords) if (w.has(x)) s += 1.2;
  const avoid = cjkGrams(chart.avoid.zh); let neg = 0; for (const x of qGrams) if (avoid.has(x)) neg++;
  s -= neg * 0.3;
  s += fieldScore(chart);
  return { s, why: [...new Set(why)].slice(0, 4) };
}
const ranked = index.charts.map((c) => ({ c, ...score(c) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s).slice(0, top);
if (argv.includes('--json')) {
  console.log(JSON.stringify(ranked.map((r) => ({ id: r.c.id, name: r.c.name, score: +r.s.toFixed(2), matched: r.why, question: r.c.question, avoid: r.c.avoid, fields: r.c.fields })), null, 1));
} else if (!ranked.length) {
  console.log('No confident match. Read references/chart-selection.md and catalog.md.');
} else {
  for (const r of ranked) {
    console.log(`${r.c.id}  ${r.c.name.zh} / ${r.c.name.en}  (score ${r.s.toFixed(1)}${r.why.length ? '; ' + r.why.join(', ') : ''})`);
    console.log(`    回答：${r.c.question.zh}`);
    console.log(`    不适用：${r.c.avoid.zh}`);
    console.log(`    字段：${r.c.fields.map((f) => `${f.key}${f.required ? '*' : ''}`).join(', ')}`);
  }
}
