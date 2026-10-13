#!/usr/bin/env node
// Render the animated SVG media for README.md and README.zh-CN.md, then
// refresh the generated gallery sections of both files.
//
// Every card is the engine's own output for the bundled sample in
// examples/specs. This script adds only a card frame and a CSS entrance
// animation: no script, no external resources, and readers who prefer reduced
// motion see the finished chart. Table exhibits (K01–K04, V02) and the report
// samples render as HTML, so a browser lays them out and the result is copied
// into SVG shapes.
//
//   BIZOS_PLAYWRIGHT_CORE=/path/to/playwright-core node tools/render-readme-media.mjs
//
// Options: --lang en|zh, --only T01,S03,hero,reports (partial runs leave the
// READMEs unchanged), --hero T03,V01,B03 (the three hero exhibits).
// Needs playwright-core and a local Chrome or Edge (BIZOS_CHROME). Output:
// docs/media/hero.<lang>.svg, docs/media/reports.<lang>.svg and
// docs/media/gallery/<lang>/<ID>.svg.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = path.join(root, 'skills/bizos-charts');
const media = path.join(root, 'docs/media');
const require = createRequire(import.meta.url);
const BC = require(path.join(skill, 'engine/bizos-charts.js'));
const THEME = BC.theme;

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const only = opt('--only') ? new Set(opt('--only').split(',')) : null;
const langs = opt('--lang') ? [opt('--lang')] : ['en', 'zh'];

/* README sections: the engine's 13 families in 8 groups whose sizes are
   multiples of four, so every gallery row is full. */
const SECTIONS = [
  { families: ['T', 'M'],
    en: ['Trends over time', 'Follow a metric through time: turning points, forecasts, prices, valuation bands, seasonality and rank changes.'],
    zh: ['趋势与时间', '看指标随时间的变化：拐点、预测区间、价格、估值通道、季节性与排名变化。'] },
  { families: ['C', 'R', 'H'],
    en: ['Comparison, relationships and matrices', 'Rank entities, compare before and after, place them on two measures, and read two-way matrices and cohorts.'],
    zh: ['比较、相关与矩阵', '排序与对标、前后对比、两指标定位，以及二维矩阵与同期群留存。'] },
  { families: ['S'],
    en: ['Composition and bridges', 'Show what a total is made of, how the mix shifts, and how one result bridges to another.'],
    zh: ['构成与桥接', '总量由什么组成、结构如何迁移、一个结果如何一步步桥接到另一个结果。'] },
  { families: ['V'],
    en: ['Valuation and sensitivity', 'Compare valuation methods, test assumptions, rank the drivers of an outcome and decompose a metric.'],
    zh: ['估值与敏感性', '估值方法汇总、假设敏感性测试、影响因素排序与指标拆解。'] },
  { families: ['K'],
    en: ['KPIs and tables', 'Headline metrics with trends, detail tables with inline bars, peer comparables and forecast models.'],
    zh: ['指标与表格', '带趋势的核心指标、含行内条形的明细表、同业可比与盈利预测表。'] },
  { families: ['G', 'P'],
    en: ['Maps and schedules', 'Equal-area tile maps of the US and China, milestones and project plans.'],
    zh: ['地图与进度', '美国与中国等面积方块地图、里程碑时间线与项目甘特图。'] },
  { families: ['D', 'E'],
    en: ['Distributions and statistics', 'Distributions, group tests, experimental curves, meta-analysis, diagnostic accuracy, agreement and set overlaps, with statistics computed from the supplied observations.'],
    zh: ['分布与统计', '分布、组间检验、实验曲线、Meta 分析、诊断准确性、一致性与集合交集；统计量由引擎从原始观测计算。'] },
  { families: ['B'],
    en: ['Biomedicine and omics', 'Survival, dose–response, differential expression, association studies, clustering, embeddings, phylogenies and mutations.'],
    zh: ['生物医学与组学', '生存分析、剂量反应、差异表达、关联研究、聚类热图、降维、系统发育与突变分布。'] },
];

const CARD = { w: 480, h: 360, pad: 20, top: 66 };
const PLOT = { x: CARD.pad, y: CARD.top, w: CARD.w - CARD.pad * 2, h: CARD.h - CARD.top - CARD.pad };
const CYCLE = 14; // seconds per loop: build, hold, clear
const FONT = THEME.font;

const catalog = BC.catalog();
const specFile = Object.fromEntries(fs.readdirSync(path.join(skill, 'examples/specs')).map((f) => [f.slice(0, 3), f]));
const loadSpec = (id, lang) => ({ ...JSON.parse(fs.readFileSync(path.join(skill, 'examples/specs', specFile[id]), 'utf8')), lang });
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const shortName = (name) => name.replace(/\s*[（(][^）)]*[）)]\s*$/, '').trim();

for (const section of SECTIONS) section.ids = catalog.filter((c) => section.families.includes(c.family)).map((c) => c.id);
const listed = SECTIONS.flatMap((s) => s.ids);
if (listed.length !== catalog.length) throw new Error(`sections cover ${listed.length} of ${catalog.length} chart types`);

/* ---------------------------------------------------------------- browser */

const chromium = require(process.env.BIZOS_PLAYWRIGHT_CORE || 'playwright-core').chromium;
const executablePath = process.env.BIZOS_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath, headless: true, args: ['--disable-extensions', '--disable-background-networking', '--no-first-run'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
const external = [];
page.on('request', (request) => { if (!/^(data|about|blob):/.test(request.url())) external.push(request.url()); });
await page.setContent(`<!doctype html><meta charset="utf-8"><style>${BC.css}
  body{margin:0;background:#fff;font-family:${FONT}} #host{position:absolute;left:0;top:0} #host svg{display:block;overflow:visible}</style>
  <div id="host" class="bz-root"></div>`);
await page.evaluate(() => document.fonts.ready);

/* In the page: copy an HTML exhibit body into SVG shapes (backgrounds,
   borders, text lines and inline SVG), measured from the real layout. */
function domToSvg({ html, width, selector, maxHeight = Infinity }) {
  let box;
  if (selector) box = document.querySelector(selector);
  else {
    const host = document.getElementById('host');
    host.innerHTML = `<div class="bz-plot" style="width:${width}px">${html}</div>`;
    box = host.firstElementChild;
    const wide = Math.max(width, ...[...box.querySelectorAll('table')].map((t) => t.scrollWidth));
    box.style.width = wide + 'px';
  }
  const R = box.getBoundingClientRect();
  const out = [];
  const n = (v) => Math.round(v * 100) / 100;
  const parse = (c) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(',').map(Number);
    if (a === 0) return null;
    const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    return { hex, a };
  };
  const paint = (c, attr) => (c.a < 1 ? `${attr}="${c.hex}" ${attr}-opacity="${n(c.a)}"` : `${attr}="${c.hex}"`);
  const baselines = new Map();
  const baseline = (cs) => {
    const key = [cs.fontFamily, cs.fontSize, cs.fontWeight, cs.fontStyle].join('|');
    if (!baselines.has(key)) {
      const probe = document.createElement('span');
      probe.style.cssText = `font:${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily};line-height:normal;position:absolute;left:0;top:0;white-space:nowrap`;
      probe.textContent = 'Hg';
      const mark = document.createElement('span');
      mark.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      probe.appendChild(mark);
      document.body.appendChild(probe);
      const range = document.createRange();
      range.selectNodeContents(probe.firstChild);
      baselines.set(key, mark.getBoundingClientRect().top - range.getClientRects()[0].top);
      probe.remove();
    }
    return baselines.get(key);
  };
  const alignOf = (el) => {
    for (let p = el; p && p !== box; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.display !== 'inline') return cs.textAlign;
    }
    return 'left';
  };
  const visit = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const closed = el.closest('details:not([open])');
    if (closed && closed !== el && !el.closest('summary')) return;
    const b = el.getBoundingClientRect();
    const x = n(b.left - R.left), y = n(b.top - R.top), w = n(b.width), h = n(b.height);
    if (b.top - R.top > maxHeight) return;
    if (el instanceof SVGSVGElement) {
      const copy = el.cloneNode(true);
      copy.setAttribute('x', x); copy.setAttribute('y', y); copy.setAttribute('width', w); copy.setAttribute('height', h);
      for (const a of ['aria-hidden', 'aria-label', 'role', 'style', 'class', 'xmlns']) copy.removeAttribute(a);
      for (const e of copy.querySelectorAll('title')) e.remove();
      for (const e of copy.querySelectorAll('.bz-hit')) if (/^(transparent|none)$/.test(e.getAttribute('fill') || '')) e.remove();
      for (const e of copy.querySelectorAll('[data-tip],[tabindex],[class]')) { e.removeAttribute('data-tip'); e.removeAttribute('tabindex'); e.removeAttribute('class'); }
      out.push(copy.outerHTML);
      return;
    }
    const bg = parse(cs.backgroundColor);
    const rx = parseFloat(cs.borderTopLeftRadius) || 0;
    if (bg && w > 0 && h > 0) out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}"${rx ? ` rx="${n(rx)}"` : ''} ${paint(bg, 'fill')}/>`);
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({ s, w: parseFloat(cs['border' + s + 'Width']) || 0, style: cs['border' + s + 'Style'], c: parse(cs['border' + s + 'Color']) }))
      .filter((d) => d.w > 0 && d.style !== 'none' && d.c);
    if (sides.length === 4 && sides.every((d) => d.w === sides[0].w && d.c.hex === sides[0].c.hex)) {
      const bw = sides[0].w;
      out.push(`<rect x="${n(x + bw / 2)}" y="${n(y + bw / 2)}" width="${n(w - bw)}" height="${n(h - bw)}"${rx ? ` rx="${n(rx)}"` : ''} fill="none" ${paint(sides[0].c, 'stroke')} stroke-width="${bw}"/>`);
    } else {
      for (const d of sides) {
        const o = d.w / 2;
        const [x1, y1, x2, y2] = d.s === 'Top' ? [x, y + o, x + w, y + o] : d.s === 'Bottom' ? [x, y + h - o, x + w, y + h - o] : d.s === 'Left' ? [x + o, y, x + o, y + h] : [x + w - o, y, x + w - o, y + h];
        out.push(`<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" ${paint(d.c, 'stroke')} stroke-width="${d.w}"${d.style === 'dashed' ? ' stroke-dasharray="4 3"' : ''}/>`);
      }
    }
    for (const node of el.childNodes) {
      if (node.nodeType === 1) visit(node);
      else if (node.nodeType === 3 && node.textContent.trim()) {
        const text = node.textContent, range = document.createRange(), lines = [];
        let cur = null;
        for (let i = 0; i < text.length; i++) {
          range.setStart(node, i); range.setEnd(node, i + 1);
          const r = range.getClientRects()[0];
          if (!r || !r.width) continue;
          if (!cur || Math.abs(r.top - cur.top) > 2) lines.push(cur = { top: r.top, left: r.left, right: r.right, chars: '' });
          cur.chars += text[i]; cur.right = Math.max(cur.right, r.right);
        }
        const align = alignOf(el), base = baseline(cs), fill = parse(cs.color);
        if (!fill) continue;
        const upper = cs.textTransform === 'uppercase';
        for (const ln of lines) {
          let s = ln.chars.replace(/\s+/g, ' ');
          if (!s.trim()) continue;
          s = upper ? s.toUpperCase() : s;
          const anchor = align === 'right' || align === 'end' ? 'end' : align === 'center' ? 'middle' : 'start';
          const tx = anchor === 'end' ? ln.right : anchor === 'middle' ? (ln.left + ln.right) / 2 : ln.left;
          const attrs = [`x="${n(tx - R.left)}"`, `y="${n(ln.top - R.top + base)}"`, `font-size="${parseFloat(cs.fontSize)}"`];
          if (+cs.fontWeight >= 600) attrs.push(`font-weight="${cs.fontWeight}"`);
          if (cs.fontStyle === 'italic') attrs.push('font-style="italic"');
          if (anchor !== 'start') attrs.push(`text-anchor="${anchor}"`);
          if (cs.letterSpacing !== 'normal' && parseFloat(cs.letterSpacing)) attrs.push(`letter-spacing="${parseFloat(cs.letterSpacing)}"`);
          attrs.push(paint(fill, 'fill'));
          out.push(`<text ${attrs.join(' ')}>${s.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`);
        }
      }
    }
  };
  for (const child of box.children) visit(child);
  const W = Math.ceil(R.width), H = Math.ceil(Math.min(R.height, maxHeight));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${out.join('')}</svg>`;
}

/* In the page: classify every mark of a plot and give it an entrance
   animation class and delay. Structure (grid, axes, tick labels) fades in
   once; data marks build, hold and clear on a loop. */
function annotate({ markup, id, table, offset, prefix = 'd', band = null }) {
  const host = document.getElementById('host');
  host.innerHTML = markup;
  const svg = host.querySelector('svg');
  for (const el of [...svg.querySelectorAll('[data-tip],[tabindex],.bz-hit,title')]) {
    if (el.tagName === 'title') { el.remove(); continue; }
    if (el.classList.contains('bz-hit') && el.tagName === 'rect' && /^(transparent|none)$/.test(el.getAttribute('fill') || '')) { el.remove(); continue; }
    el.removeAttribute('data-tip'); el.removeAttribute('tabindex'); el.classList.remove('bz-hit');
    if (!el.classList.length) el.removeAttribute('class');
  }
  const vb = svg.viewBox.baseVal;
  const R = svg.getBoundingClientRect();
  const sx = vb && vb.width ? vb.width / R.width : 1;
  const hex = (c) => {
    if (!c || c === 'none' || c.startsWith('url')) return null;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map(Number);
    if (p.length > 3 && p[3] === 0) return null;
    return '#' + p.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  const STRUCT = new Set(['#E4E8EE', '#9AA4B1', '#E1E5EB', '#EEF2F7', '#F4F5F7', '#FFFFFF']);
  const QUIET_TEXT = new Set(['#4A5568', '#6B7684', '#8A94A3']);
  const leaves = [...svg.querySelectorAll('rect,circle,ellipse,line,path,polygon,polyline,text')]
    .filter((el) => !el.closest('defs,clipPath,pattern,mask'));
  const items = [];
  for (const el of leaves) {
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    items.push({
      el, tag: el.tagName, cs,
      x: (b.left - R.left) * sx, y: (b.top - R.top) * sx, w: b.width * sx, h: b.height * sx,
      fill: hex(cs.fill), stroke: cs.stroke === 'none' ? null : hex(cs.stroke),
      dashed: (el.getAttribute('stroke-dasharray') || cs.strokeDasharray || 'none') !== 'none',
      transformed: el.hasAttribute('transform'),
    });
  }
  const W = vb && vb.width ? vb.width : R.width, H = vb && vb.height ? vb.height : R.height;
  const lines = items.filter((i) => i.tag === 'line');
  const isStructLine = (i) => i.stroke && (STRUCT.has(i.stroke) || (i.stroke === '#4A5568' && (i.w > W * 0.3 || i.h > H * 0.3)));
  const axisH = lines.filter((i) => isStructLine(i) && i.h < 1.5 && i.w > W * 0.2).map((i) => i.y + i.h / 2);
  const axisV = lines.filter((i) => isStructLine(i) && i.w < 1.5 && i.h > H * 0.2).map((i) => i.x + i.w / 2);

  // Rects that share one size are cells (heatmaps, calendars, tile maps).
  const sizeKey = (i) => Math.round(i.w * 2) + 'x' + Math.round(i.h * 2);
  const sizes = new Map();
  for (const i of items) if (i.tag === 'rect' && i.w > 2 && i.h > 2) sizes.set(sizeKey(i), (sizes.get(sizeKey(i)) || 0) + 1);

  // Regular-weight text that lines up with other regular text (a shared
  // anchor x or a shared baseline) is an axis or category label; the rest
  // labels values. Text inside a bar or cell is decided later.
  const plain = items.filter((i) => i.tag === 'text' && +i.cs.fontWeight < 600);
  for (const t of plain) {
    const a = t.cs.textAnchor;
    t.ax = a === 'end' ? t.x + t.w : a === 'middle' ? t.x + t.w / 2 : t.x;
    t.ay = t.y + t.h;
  }
  const aligned = (t) => plain.filter((o) => o !== t && Math.abs(o.ax - t.ax) <= 1).length >= 2
    || plain.filter((o) => o !== t && Math.abs(o.ay - t.ay) <= 1).length >= 2;
  const role = (i) => {
    if (i.tag === 'text') return !table && plain.includes(i) && (aligned(i) || (QUIET_TEXT.has(i.fill) && plain.length < 3)) ? 'struct' : 'label';
    if (i.tag === 'line') {
      if (table || isStructLine(i)) return 'struct';
      if ((i.stroke === '#4A5568' || i.stroke === '#1B2533') && i.w + i.h < 40) return 'label'; // leader lines
      return 'data';
    }
    if (i.tag === 'rect') {
      if (i.w <= 0.01 || i.h <= 0.01) return 'skip';
      if ((sizes.get(sizeKey(i)) || 0) >= 8 && !table) return 'cell';
      if ((!i.fill || STRUCT.has(i.fill)) && (!i.stroke || STRUCT.has(i.stroke))) return 'struct';
      return 'data';
    }
    if (i.tag === 'path' || i.tag === 'polyline') {
      const filled = i.fill && i.cs.fillOpacity !== '0';
      if (!filled) return i.stroke && STRUCT.has(i.stroke) ? 'struct' : 'data';
      return STRUCT.has(i.fill) ? 'struct' : 'data';
    }
    return 'data';
  };
  for (const i of items) i.role = band && (i.y + i.h / 2 < band[0] || i.y + i.h / 2 > band[1]) ? 'struct' : role(i);

  // Bars: find the baseline each rect grows from.
  const data = items.filter((i) => i.role === 'data');
  const rects = data.filter((i) => i.tag === 'rect');
  const near = (a, b, t = 1.6) => Math.abs(a - b) <= t;
  const shared = (vals, pick) => {
    const counts = new Map();
    for (const v of vals) { const k = Math.round(v * 2) / 2; counts.set(k, (counts.get(k) || 0) + 1); }
    return [...counts].filter(([, c]) => c >= 3).map(([k]) => k).filter(pick);
  };
  const bottoms = shared(rects.map((r) => r.y + r.h), (k) => k >= Math.max(...rects.map((r) => r.y + r.h)) - 1);
  const lefts = shared(rects.map((r) => r.x), (k) => k <= Math.min(...rects.map((r) => r.x)) + 1);
  const baseY = axisH.concat(bottoms), baseX = axisV.concat(lefts);
  for (const r of rects) {
    if (baseY.some((y) => near(r.y + r.h, y))) { r.anim = 'gu'; r.level = 0; }
    else if (baseY.some((y) => near(r.y, y))) { r.anim = 'gd'; r.level = 0; }
    else if (baseX.some((x) => near(r.x, x))) { r.anim = 'gr'; r.level = 0; }
    else if (baseX.some((x) => near(r.x + r.w, x))) { r.anim = 'gl'; r.level = 0; }
  }
  // Stacked segments continue from the segment below (or to the left).
  for (let pass = 0; pass < 8; pass++) {
    for (const r of rects) {
      if (r.anim) continue;
      const below = rects.find((o) => o.anim === 'gu' && near(o.y, r.y + r.h, 1) && o.x < r.x + r.w - 1 && r.x < o.x + o.w - 1);
      const left = rects.find((o) => o.anim === 'gr' && near(o.x + o.w, r.x, 1) && o.y < r.y + r.h - 1 && r.y < o.y + o.h - 1);
      if (below) { r.anim = 'gu'; r.level = below.level + 1; }
      else if (left) { r.anim = 'gr'; r.level = left.level + 1; }
    }
  }
  const horizontalBars = rects.filter((r) => r.anim === 'gr' || r.anim === 'gl').length > rects.filter((r) => r.anim === 'gu' || r.anim === 'gd').length;

  // Per-type adjustments for marks that have a natural direction.
  const bad = '#B83B3B';
  for (const i of data) {
    if (i.tag === 'rect' && !i.anim) {
      if (id === 'S03') i.anim = i.fill === bad ? 'gd' : 'gu';
      else if (id === 'S08' || id === 'S06') i.anim = id === 'S08' ? 'gm' : 'gu';
      else if (i.w > i.h * 1.6) i.anim = 'gr';
      else if (i.h > i.w * 1.6) i.anim = 'gc';
      else i.anim = 'pop';
    }
    if (i.tag === 'circle' || i.tag === 'ellipse' || i.tag === 'polygon') i.anim = i.transformed ? 'fd' : 'pop';
    if (i.tag === 'line') {
      const horizontal = i.h < 1.5, vertical = i.w < 1.5;
      if (i.transformed || i.dashed) i.anim = 'fd';
      else if (horizontal) i.anim = id === 'B07' ? 'gr' : 'gm';
      else if (vertical) i.anim = id === 'B08' || id === 'E09' ? 'gu' : 'gc';
      else i.anim = 'fd';
    }
    if (i.tag === 'path' || i.tag === 'polyline') {
      const filled = i.fill && i.cs.fillOpacity !== '0';
      if (!filled) i.anim = i.dashed || i.tag !== 'path' ? 'fd' : 'dr';
      else if (id === 'E02') i.anim = 'gm';
      else if (id === 'S04') i.anim = 'pop';
      else if (baseY.some((y) => near(i.y + i.h, y, 2.5)) && i.w > W * 0.3) i.anim = 'gu';
      else i.anim = 'fd';
    }
    if (!i.anim) i.anim = 'fd';
  }

  // Delays: one left-to-right sweep (top-to-bottom for row layouts).
  const q = (v) => Math.round(Math.max(0, v) * 20) / 20;
  const xf = (i) => Math.min(1, Math.max(0, (i.x + i.w / 2) / W));
  const yf = (i) => Math.min(1, Math.max(0, (i.y + i.h / 2) / H));
  let drawn = 0;
  for (const i of items) {
    if (i.role === 'skip') continue;
    if (i.role === 'struct') { i.cls = 'st'; i.delay = (i.tag === 'text' ? 0.15 : 0) + (table ? 0.1 * yf(i) : 0); continue; }
    if (table) {
      i.cls = i.role === 'label' || i.tag === 'text' ? 'fd' : i.anim || 'fd';
      if (i.cls === 'gu' || i.cls === 'gd' || i.cls === 'gc') i.cls = 'fd';
      i.delay = 0.25 + 1.1 * yf(i) + (i.cls === 'gr' ? 0.15 : 0) + 0.15 * xf(i);
      continue;
    }
    if (i.role === 'label') { i.cls = 'fd'; i.delay = 0.75 + 1.0 * xf(i); continue; }
    if (i.role === 'cell') { i.cls = i.transformed ? 'fd' : 'pop'; i.delay = 0.3 + 0.75 * xf(i) + 0.45 * yf(i); continue; }
    i.cls = i.anim;
    if (i.cls === 'dr') { i.delay = 0.3 + 0.8 * Math.min(1, i.x / W) + 0.08 * (drawn++ % 5); continue; }
    const sweep = horizontalBars && i.tag === 'rect' ? yf(i) : (i.tag === 'path' && i.cls === 'fd' ? Math.min(1, i.x / W) : xf(i));
    i.delay = 0.3 + 1.0 * sweep + 0.14 * (i.level || 0);
  }
  if (id === 'S04') items.filter((i) => i.cls === 'pop' && i.tag === 'path').forEach((i, k) => { i.delay = 0.3 + 0.16 * k; });

  // Text drawn inside a bar, tile or cell appears just after its container.
  if (!table) {
    const boxes = items.filter((i) => i.tag === 'rect' && (i.role === 'data' || i.role === 'cell') && i.w > 8 && i.h > 8)
      .sort((a, b) => a.w * a.h - b.w * b.h);
    for (const t of items.filter((i) => i.tag === 'text')) {
      const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
      const box = boxes.find((b) => cx > b.x && cx < b.x + b.w && cy > b.y && cy < b.y + b.h);
      if (box) { t.cls = 'fd'; t.delay = box.delay + 0.3; }
    }
  }

  const delays = new Map();
  for (const i of items) {
    if (!i.cls) continue;
    const d = q(i.delay + offset);
    if (!delays.has(d)) delays.set(d, prefix + delays.size);
    i.el.classList.add(i.cls, delays.get(d));
    if (i.cls === 'dr') i.el.setAttribute('pathLength', '1');
    if (i.cls === 'fd' && i.el.hasAttribute('opacity')) i.el.style.setProperty('--o', i.el.getAttribute('opacity'));
  }
  const used = [...new Set(items.map((i) => i.cls).filter(Boolean))];
  const counts = {};
  for (const i of items) if (i.cls) counts[i.cls] = (counts[i.cls] || 0) + 1;
  svg.removeAttribute('class');
  return { markup: new XMLSerializer().serializeToString(svg), delays: [...delays].map(([d, c]) => [c, d]), used, counts };
}

/* ---------------------------------------------------------------- styles */

/* Loop keyframes: build in the first ~6% of the cycle, hold, then clear.
   Transforms carry the motion so marks keep their own opacity attributes;
   fades use --o for marks drawn with an opacity attribute. */
const KEYFRAMES = {
  st: '@keyframes st{from{opacity:0}}',
  pop: '@keyframes pop{0%{transform:scale(0)}5%{transform:scale(1)}91%{transform:scale(1)}96%,to{transform:scale(0)}}',
  gy: '@keyframes gy{0%{transform:scaleY(0)}6%{transform:scaleY(1)}91%{transform:scaleY(1)}96%,to{transform:scaleY(0)}}',
  gx: '@keyframes gx{0%{transform:scaleX(0)}6%{transform:scaleX(1)}91%{transform:scaleX(1)}96%,to{transform:scaleX(0)}}',
  dr: '@keyframes dr{0%{stroke-dashoffset:1}11%{stroke-dashoffset:0}91%{stroke-dashoffset:0}97%,to{stroke-dashoffset:-1}}',
  fd: '@keyframes fd{0%{opacity:0}5%{opacity:var(--o,1)}91%{opacity:var(--o,1)}96%,to{opacity:0}}',
};
const ORIGIN = { pop: '50% 50%', gu: '50% 100%', gd: '50% 0', gc: '50% 50%', gr: '0 50%', gl: '100% 50%', gm: '50% 50%' };
const KF_OF = { st: 'st', pop: 'pop', gu: 'gy', gd: 'gy', gc: 'gy', gr: 'gx', gl: 'gx', gm: 'gx', dr: 'dr', fd: 'fd' };

function styleFor(used, delays, cycle) {
  const css = [];
  const kfs = new Set(used.map((c) => KF_OF[c]));
  for (const [key, kf] of Object.entries(KEYFRAMES)) if (kfs.has(key)) css.push(kf);
  const ease = 'cubic-bezier(.22,.8,.24,1)';
  for (const c of used) {
    if (c === 'st') { css.push(`.st{animation:st .6s ease-out both}`); continue; }
    const extra = ORIGIN[c] ? `;transform-box:fill-box;transform-origin:${ORIGIN[c]}` : c === 'dr' ? ';stroke-dasharray:1 1' : '';
    css.push(`.${c}{animation:${KF_OF[c]} ${cycle}s ${ease} infinite both${extra}}`);
  }
  for (const [cls, d] of delays) css.push(`.${cls}{animation-delay:${d}s}`);
  css.push('@media (prefers-reduced-motion:reduce){*{animation:none!important}}');
  return css.join('');
}

/* ---------------------------------------------------------------- cards */

const ASPECT = PLOT.w / PLOT.h;
const WIDTHS = [380, 440, 500, 560, 640, 720, 820, 920];

/* The drawn extent of a plot, including labels outside its view box. */
async function measure(markup) {
  return page.evaluate((m) => {
    const host = document.getElementById('host');
    host.innerHTML = m;
    const bb = host.querySelector('svg').getBBox();
    return { x: bb.x - 3, y: bb.y - 3, w: bb.width + 6, h: bb.height + 6 };
  }, markup);
}

/* Render at the width whose drawn shape best fills the card; narrower wins
   ties so chart text stays as large as possible. */
async function plotFor(spec) {
  const table = !BC.render(spec, { width: 560 }).svg;
  let best = null;
  for (const width of table ? [320, 380, 440, 500, 560] : WIDTHS) {
    const r = BC.render(spec, { width });
    const markup = table ? await page.evaluate(domToSvg, { html: r.plotHtml, width }) : r.svg;
    const view = await measure(markup);
    const score = Math.abs(Math.log((view.w / view.h) / ASPECT)) + width / 1500;
    if (!best || score < best.score) best = { score, markup, width };
  }
  return { markup: best.markup, table, width: best.width };
}

function inner(markup, box, view) {
  const body = markup.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<svg x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" viewBox="${r2(view.x)} ${r2(view.y)} ${r2(view.w)} ${r2(view.h)}" overflow="visible">${body}</svg>`;
}
const r2 = (v) => Math.round(v * 100) / 100;

function chip(x, y, text, size = 15) {
  const w = Math.round(text.length * size * 0.66 + 18);
  return { w, svg: `<rect x="${x}" y="${y}" width="${w}" height="${size + 13}" rx="7" fill="${THEME.rule}"/><text x="${x + w / 2}" y="${y + size + 2.5}" text-anchor="middle" font-size="${size}" font-weight="700" fill="#FFFFFF" letter-spacing=".4">${esc(text)}</text>` };
}

async function card(id, lang, index) {
  const meta = catalog.find((c) => c.id === id);
  const spec = loadSpec(id, lang);
  const issues = BC.lint(spec).filter((i) => i.level === 'error');
  if (issues.length) throw new Error(`${id} [${lang}] ${JSON.stringify(issues)}`);
  const plot = await plotFor(spec);
  const col = index % 4, row = Math.floor(index / 4);
  const offset = 0.12 * (col + row);
  const a = await page.evaluate(annotate, { markup: plot.markup, id, table: plot.table, offset });
  const view = await measure(a.markup);
  const scale = Math.min(PLOT.w / view.w, PLOT.h / view.h);
  const bw = view.w * scale, bh = view.h * scale;
  const box = { x: r2(PLOT.x + (PLOT.w - bw) / 2), y: r2(PLOT.y + (PLOT.h - bh) / 2), w: r2(bw), h: r2(bh) };
  const name = shortName(meta.name[lang]);
  const c = chip(CARD.pad, 22, id);
  const nameSize = fitText(name, CARD.w - CARD.pad * 2 - c.w - 12, lang === 'zh' ? 25 : 26, lang);
  const label = `${id} · ${meta.name[lang]} — ${meta.question[lang]}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD.w} ${CARD.h}" width="${CARD.w}" height="${CARD.h}" role="img" aria-label="${esc(label)}" font-family="${esc(FONT)}" style="font-variant-numeric:tabular-nums">`
    + `<title>${esc(label)}</title><style>${styleFor(['st', ...a.used.filter((u) => u !== 'st')], a.delays, CYCLE)}</style>`
    + `<defs><clipPath id="k"><rect width="${CARD.w}" height="${CARD.h}" rx="16"/></clipPath></defs>`
    + `<rect x=".75" y=".75" width="${CARD.w - 1.5}" height="${CARD.h - 1.5}" rx="16" fill="#FFFFFF" stroke="#D5DBE3" stroke-width="1.5"/>`
    + `<rect width="${CARD.w}" height="4" fill="${THEME.rule}" clip-path="url(#k)"/>`
    + c.svg
    + `<text x="${CARD.pad + c.w + 12}" y="${22 + 21}" font-size="${nameSize}" font-weight="600" fill="${THEME.ink}">${esc(name)}</text>`
    + inner(a.markup, box, view)
    + '</svg>';
  return { svg, counts: a.counts, width: plot.width || 'html', bytes: Buffer.byteLength(svg) };
}

function fitText(text, max, size) {
  const est = (s) => [...s].reduce((w, ch) => w + (/[⺀-鿿＀-￯]/.test(ch) ? 1.0 : /[A-Z]/.test(ch) ? 0.66 : /[ il.,'|]/.test(ch) ? 0.3 : 0.56), 0);
  while (size > 18 && est(text) * size > max) size -= 1;
  return size;
}

/* ---------------------------------------------------------------- hero */

const HERO = {
  en: {
    kicker: 'BIZOS CHARTS · OPEN SOURCE', meta: 'Apache-2.0 · offline · no runtime dependencies',
    title: 'Charts that state the finding and show the evidence',
    lede: '64 exhibit types · 6 report layouts · English and Chinese · offline HTML and SVG with units, sources and data attached',
  },
  zh: {
    kicker: 'BIZOS CHARTS · 开源', meta: 'Apache-2.0 · 离线 · 零运行时依赖',
    title: '每张图先讲结论，再给证据',
    lede: '64 种图表 · 6 种报告版式 · 中英双语 · 离线 HTML 与 SVG，单位、来源与数据随图交付',
  },
};
const HERO_EXHIBITS = (opt('--hero') || 'T03,V01,B03').split(',');

async function hero(lang) {
  const t = HERO[lang];
  const W = 1280, pad = 56, gap = 26, top = 222;
  const cw = Math.floor((W - pad * 2 - gap * 2) / 3), ew = cw - 32;
  const parts = [], delays = [], used = new Set(['st']);
  let tallest = 0;
  for (const [k, id] of HERO_EXHIBITS.entries()) {
    const spec = loadSpec(id, lang);
    if (BC.lint(spec).some((i) => i.level === 'error')) throw new Error(`hero exhibit ${id} has rule errors`);
    const full = BC.exhibitSVG(spec, { width: ew });
    const plotY = Number(full.match(/<g transform="translate\(0,([\d.]+)\)">/)[1]);
    const plotH = BC.render(spec, { width: ew }).height;
    // One document holds three exhibits, so their ids must not collide.
    const unique = full.replace(/id="([^"]+)"/g, `id="h${k}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#h${k}-$1)`);
    const a = await page.evaluate(annotate, { markup: unique, id, table: false, offset: 0.35 + 0.3 * k, prefix: 'abc'[k], band: [plotY - 2, plotY + plotH + 2] });
    a.used.forEach((u) => used.add(u));
    delays.push(...a.delays);
    const h = Number(full.match(/viewBox="0 0 [\d.]+ ([\d.]+)"/)[1]);
    tallest = Math.max(tallest, h);
    parts.push({ x: pad + k * (cw + gap), h, body: a.markup.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '') });
  }
  const ch = tallest + 32, H = top + ch + 44;
  const titleSize = lang === 'zh' ? 42 : 40;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(t.title + ' — ' + t.lede)}" font-family="${esc(FONT)}" style="font-variant-numeric:tabular-nums">`
    + `<title>${esc(t.title)}</title><style>${styleFor([...used], delays, CYCLE)}</style>`
    + `<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="22" fill="${THEME.page}" stroke="${THEME.border}" stroke-width="1.5"/>`
    + `<text x="${pad}" y="70" font-size="14" font-weight="700" letter-spacing="1.8" fill="${THEME.rule}">${esc(t.kicker)}</text>`
    + `<text x="${W - pad}" y="70" text-anchor="end" font-size="14" fill="${THEME.muted}">${esc(t.meta)}</text>`
    + `<rect x="${pad}" y="84" width="${W - pad * 2}" height="2" fill="${THEME.rule}"/>`
    + `<text x="${pad}" y="146" font-size="${titleSize}" font-weight="700" fill="${THEME.ink}">${esc(t.title)}</text>`
    + `<text x="${pad}" y="186" font-size="18" fill="${THEME.ink2}">${esc(t.lede)}</text>`
    + parts.map((p) => `<rect x="${p.x}" y="${top}" width="${cw}" height="${ch}" rx="12" fill="#FFFFFF" stroke="${THEME.border}" stroke-width="1.2"/>`
      + `<svg x="${p.x + 16}" y="${top + 16}" width="${ew}" height="${p.h}" viewBox="0 0 ${ew} ${p.h}" overflow="visible">${p.body}</svg>`).join('')
    + '</svg>';
  return { svg, bytes: Buffer.byteLength(svg) };
}

/* ---------------------------------------------------------------- reports */

const REPORT_NOTES = {
  en: {
    'research-note': 'Company, industry or category research',
    'business-review': 'Monthly or quarterly results and next steps',
    'one-pager': 'A category or competitor brief on one page',
    'dashboard': 'A recurring view of one set of metrics',
    'decision-memo': 'One decision, its evidence and a clear call',
    'study-report': 'Experiments, clinical and omics results',
  },
  zh: {
    'research-note': '公司、行业与品类深度研究',
    'business-review': '月报、季报与经营复盘',
    'one-pager': '品类速览、竞品速写',
    'dashboard': '周期监控、全年概览',
    'decision-memo': '需要拍板的问题与明确建议',
    'study-report': '实验、临床与组学研究结果',
  },
};

/* The six bundled report samples, copied into SVG from the real pages and
   shown as windows that scroll through the first part of each report. */
async function reports(lang) {
  const names = Object.keys(BC.layouts);
  const W = 1280, pad = 40, gap = 24, cols = 3, winH = 300, labelH = 66;
  const tw = Math.floor((W - pad * 2 - gap * (cols - 1)) / cols), th = winH + labelH;
  const rows = Math.ceil(names.length / cols), H = pad * 2 + rows * th + (rows - 1) * gap;
  const css = ['@keyframes st{from{opacity:0}}'], tiles = [];
  for (const [k, name] of names.entries()) {
    const view = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
    view.on('request', (request) => { if (!/^(data|about|blob):/.test(request.url())) external.push(request.url()); });
    await view.setContent(fs.readFileSync(path.join(skill, 'templates/reports', `${name}.${lang}.html`), 'utf8'), { waitUntil: 'load' });
    await view.evaluate(() => document.fonts.ready);
    const page = await view.evaluate(domToSvg, { selector: 'article.bz-sheet', maxHeight: 2200 });
    await view.close();
    const [, pw, ph] = page.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
    const s = tw / pw, dy = Math.min(0, Math.round(winH - ph * s - 12));
    const x = pad + (k % cols) * (tw + gap), y = pad + Math.floor(k / cols) * (th + gap);
    css.push(`@keyframes s${k}{0%,14%{transform:translateY(0)}50%,68%{transform:translateY(${dy}px)}88%,to{transform:translateY(0)}}`,
      `.s${k}{animation:s${k} 18s ease-in-out ${(0.8 + 0.5 * k).toFixed(1)}s infinite both}`,
      `.t${k}{animation:st .7s ease-out ${(0.15 * k).toFixed(2)}s both}`);
    const body = page.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    tiles.push(`<g class="t${k}" transform="translate(${x},${y})">`
      + `<clipPath id="w${k}"><rect width="${tw}" height="${th}" rx="14"/></clipPath>`
      + `<rect width="${tw}" height="${th}" rx="14" fill="#FFFFFF"/>`
      + `<g clip-path="url(#w${k})"><g class="s${k}"><svg width="${tw}" height="${r2(ph * s)}" viewBox="0 0 ${pw} ${ph}">${body}</svg></g>`
      + `<rect y="${winH}" width="${tw}" height="${labelH}" fill="#FFFFFF"/><rect y="${winH}" width="${tw}" height="1" fill="${THEME.border}"/></g>`
      + `<rect x=".6" y=".6" width="${tw - 1.2}" height="${th - 1.2}" rx="14" fill="none" stroke="#D5DBE3" stroke-width="1.2"/>`
      + `<text x="18" y="${winH + 29}" font-size="19" font-weight="600" fill="${THEME.ink}">${esc(BC.layouts[name][lang])}</text>`
      + `<text x="18" y="${winH + 51}" font-size="14.5" fill="${THEME.muted}">${esc(REPORT_NOTES[lang][name])}</text></g>`);
  }
  css.push('@media (prefers-reduced-motion:reduce){*{animation:none!important}}');
  const label = lang === 'zh' ? '六种报告版式的样张' : 'Samples of the six report layouts';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}" font-family="${esc(FONT)}" style="font-variant-numeric:tabular-nums">`
    + `<title>${esc(label)}</title><style>${css.join('')}</style>`
    + `<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="22" fill="${THEME.page}" stroke="${THEME.border}" stroke-width="1.5"/>`
    + tiles.join('') + '</svg>';
  return { svg, bytes: Buffer.byteLength(svg) };
}

/* ---------------------------------------------------------------- readme */

/* The gallery sections of both READMEs are generated between markers so the
   names, questions and sample links always match the catalog. */
const README = {
  en: { file: 'README.md', index: ['Group', 'Types', 'Count'], total: 'Total', count: (n) => `${n} types`, details: 'What each type answers', head: ['ID', 'Chart', 'The question it answers', 'Sample'] },
  zh: { file: 'README.zh-CN.md', index: ['分组', '编号', '数量'], total: '合计', count: (n) => `共 ${n} 种`, details: '每种图表回答什么问题', head: ['编号', '图表', '回答的问题', '样例'] },
};
const slug = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s/g, '-');
const cell = (s) => String(s).replace(/\|/g, '\\|');

function galleryMarkdown(lang) {
  const t = README[lang], out = [];
  const ranges = (s) => s.families.map((f) => {
    const ids = s.ids.filter((id) => id[0] === f);
    return ids.length > 1 ? `${ids[0]}–${ids.at(-1)}` : ids[0];
  });
  out.push(`| ${t.index.join(' | ')} |`, '|---|---|---:|');
  for (const s of SECTIONS) out.push(`| [${s[lang][0]}](#${slug(s[lang][0])}) | ${ranges(s).join(' · ')} | ${s.ids.length} |`);
  out.push(`| **${t.total}** | | **${listed.length}** |`);
  for (const s of SECTIONS) {
    const families = s.families.map((f, i) => `${ranges(s)[i]} ${BC.families[f][lang]}`).join(' · ');
    out.push('', `### ${s[lang][0]}`, '', `<sub>${families} · ${t.count(s.ids.length)}</sub>`, '', s[lang][1], '', '<p>');
    for (const id of s.ids) {
      const c = catalog.find((x) => x.id === id);
      out.push(`<img src="docs/media/gallery/${lang}/${id}.svg" width="24%" alt="${esc(id + ' · ' + c.name[lang])}">`);
    }
    out.push('</p>', '', `<details><summary>${t.details}</summary>`, '', `| ${t.head.join(' | ')} |`, '|---|---|---|---|');
    for (const id of s.ids) {
      const c = catalog.find((x) => x.id === id);
      out.push(`| ${id} | ${cell(c.name[lang])} | ${cell(c.question[lang])} | [JSON](skills/bizos-charts/examples/specs/${specFile[id]}) |`);
    }
    out.push('', '</details>');
  }
  return out.join('\n');
}

function updateReadme(lang) {
  const file = path.join(root, README[lang].file);
  const text = fs.readFileSync(file, 'utf8');
  const start = '<!-- gallery:start -->', end = '<!-- gallery:end -->';
  const a = text.indexOf(start), b = text.indexOf(end);
  if (a < 0 || b < a) throw new Error(`${README[lang].file} has no gallery markers`);
  fs.writeFileSync(file, text.slice(0, a + start.length) + '\n' + galleryMarkdown(lang) + '\n' + text.slice(b));
}

/* ---------------------------------------------------------------- run */

const summary = [];
try {
  for (const lang of langs) {
    const dir = path.join(media, 'gallery', lang);
    fs.mkdirSync(dir, { recursive: true });
    if (!only || only.has('hero')) {
      const h = await hero(lang);
      fs.writeFileSync(path.join(media, `hero.${lang}.svg`), h.svg);
      summary.push({ lang, id: 'hero', kb: Math.round(h.bytes / 102.4) / 10 });
    }
    if (!only || only.has('reports')) {
      const r = await reports(lang);
      fs.writeFileSync(path.join(media, `reports.${lang}.svg`), r.svg);
      summary.push({ lang, id: 'reports', kb: Math.round(r.bytes / 102.4) / 10 });
    }
    for (const section of SECTIONS) {
      for (const [index, id] of section.ids.entries()) {
        if (only && !only.has(id)) continue;
        const c = await card(id, lang, index);
        fs.writeFileSync(path.join(dir, id + '.svg'), c.svg);
        summary.push({ lang, id, width: c.width, kb: Math.round(c.bytes / 102.4) / 10, marks: c.counts });
      }
    }
  }
} finally {
  await browser.close();
}
if (external.length) throw new Error('External requests: ' + external.join(', '));
if (!only) for (const lang of langs) updateReadme(lang);
for (const s of summary) console.log(JSON.stringify(s));
console.log(JSON.stringify({ ok: true, cards: summary.length, kb: Math.round(summary.reduce((a, s) => a + s.kb, 0)) }));
