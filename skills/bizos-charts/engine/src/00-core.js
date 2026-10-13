/* 00-core — namespace, bilingual strings, text metrics, number formatting,
   color helpers and the string SVG builder. Every later module shares this
   function scope (scripts/build.mjs concatenates engine/src in name order). */

var BC = {};
BC.version = '2.1.0';

var STR = {
  zh: {
    exhibit: '图表', note: '注：', source: '资料来源：', lhs: '左轴', rhs: '右轴',
    est: '预测', act: '实际', total: '合计', other: '其他', median: '中位数', mean: '平均值',
    base: '基准', n: '样本', unit: '单位', missing: '—', nm: 'n.m.', current: '当前',
    target: '目标', actual: '实际', range: '区间', increase: '增加', decrease: '减少',
    up: '上涨', down: '下跌', yoy: '同比', share: '占比', rank: '排名', logScale: '对数刻度',
    rebased: '基期 = 100', dataTable: '查看数据', hideTable: '收起数据', exportSvg: 'SVG',
    exportPng: 'PNG', exportCsv: 'CSV', keyPoints: '核心观点', keyData: '关键数据',
    risks: '风险提示', method: '方法与口径', sources: '数据来源', disclaimer: '声明',
    contents: '目录', recommendation: '建议', rationale: '依据', nextSteps: '下一步',
    question: '决策问题', implied: '隐含', page: '页', week: '周', mon: '一', tue: '二',
    wed: '三', thu: '四', fri: '五', sat: '六', sun: '日', perCell: '每格', less: '低',
    more: '高', noData: '无数据', today: '今日', overall: '整体转化率', stageConv: '环节转化率',
    cohort: '同期群', offset: '期数', r2: 'R²', fit: '线性拟合', quadrantNote: '分界线',
    sizeLegend: '气泡面积', period: '期间', value: '数值', item: '项目', category: '类别',
    est_suffix: 'E', act_suffix: 'A', volume: '成交量', ma: 'MA', price: '价格',
    sameArea: '瓦片面积相同，不代表地理面积', perUnit: '单位', tableNote: '表注',
    abstract: '摘要', findings: '主要发现', glance: '研究概况', limitations: '局限性', methodStats: '方法与统计',
    dataAvail: '数据可得性', refs: '数据来源与参考文献'
  },
  en: {
    exhibit: 'Exhibit', note: 'Note: ', source: 'Source: ', lhs: 'LHS', rhs: 'RHS',
    est: 'Estimate', act: 'Actual', total: 'Total', other: 'Other', median: 'Median', mean: 'Mean',
    base: 'Base', n: 'n', unit: 'Unit', missing: '—', nm: 'n.m.', current: 'Current',
    target: 'Target', actual: 'Actual', range: 'Range', increase: 'Increase', decrease: 'Decrease',
    up: 'Up', down: 'Down', yoy: 'YoY', share: 'Share', rank: 'Rank', logScale: 'log scale',
    rebased: 'Rebased = 100', dataTable: 'Show data', hideTable: 'Hide data', exportSvg: 'SVG',
    exportPng: 'PNG', exportCsv: 'CSV', keyPoints: 'Key points', keyData: 'Key data',
    risks: 'Risks', method: 'Methodology', sources: 'Sources', disclaimer: 'Disclosures',
    contents: 'Contents', recommendation: 'Recommendation', rationale: 'Rationale', nextSteps: 'Next steps',
    question: 'Decision', implied: 'Implied', page: 'Page', week: 'Week', mon: 'Mon', tue: 'Tue',
    wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun', perCell: 'per cell', less: 'Low',
    more: 'High', noData: 'No data', today: 'Today', overall: 'Overall conversion', stageConv: 'Stage conversion',
    cohort: 'Cohort', offset: 'Period', r2: 'R²', fit: 'Linear fit', quadrantNote: 'Split lines',
    sizeLegend: 'Bubble area', period: 'Period', value: 'Value', item: 'Item', category: 'Category',
    est_suffix: 'E', act_suffix: 'A', volume: 'Volume', ma: 'MA', price: 'Price',
    sameArea: 'Equal tiles; area does not represent geography', perUnit: 'Unit', tableNote: 'Table note',
    abstract: 'Abstract', findings: 'Key findings', glance: 'Study at a glance', limitations: 'Limitations', methodStats: 'Methods and statistics',
    dataAvail: 'Data availability', refs: 'Sources and references'
  }
};
function L(ctxOrLang, key) {
  var lang = typeof ctxOrLang === 'string' ? ctxOrLang : (ctxOrLang && ctxOrLang.lang) || 'zh';
  return (STR[lang] || STR.zh)[key];
}
/* Resolve a text value that may be bilingual: "x" | {zh:"x", en:"y"}. */
function tx(v, lang) {
  if (v == null) return '';
  if (typeof v === 'object' && !Array.isArray(v)) {
    if (v[lang] != null) return String(v[lang]);
    if (v.zh != null) return String(v.zh);
    if (v.en != null) return String(v.en);
    return '';
  }
  return String(v);
}

/* ── small utilities ─────────────────────────────────────────────────── */
function isNum(v) { return typeof v === 'number' && isFinite(v); }
function num(v) {
  if (isNum(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && isFinite(+v.replace(/,/g, ''))) return +v.replace(/,/g, '');
  return null;
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function r2(v) { return Math.round(v * 100) / 100; }
function sum(arr, f) { var s = 0; for (var i = 0; i < arr.length; i++) { var v = f ? f(arr[i], i) : arr[i]; if (isNum(v)) s += v; } return s; }
function extent(values) {
  var lo = Infinity, hi = -Infinity;
  for (var i = 0; i < values.length; i++) { var v = values[i]; if (isNum(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } }
  return lo === Infinity ? [0, 0] : [lo, hi];
}
function uniq(arr) { var seen = {}, out = []; arr.forEach(function (v) { var k = String(v); if (!seen[k]) { seen[k] = 1; out.push(v); } }); return out; }
function asArray(v) { return v == null ? [] : Array.isArray(v) ? v : [v]; }
function median(sorted) {
  if (!sorted.length) return null;
  var m = (sorted.length - 1) / 2;
  return (sorted[Math.floor(m)] + sorted[Math.ceil(m)]) / 2;
}
function quantile(sorted, p) {
  if (!sorted.length) return null;
  var h = (sorted.length - 1) * p, lo = Math.floor(h), hi = Math.ceil(h);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo);
}
function mean(arr) { var v = arr.filter(isNum); return v.length ? sum(v) / v.length : null; }
function sortNum(arr) { return arr.filter(isNum).slice().sort(function (a, b) { return a - b; }); }
function deepClone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }

/* ── text metrics ────────────────────────────────────────────────────────
   A deterministic width table keeps Node pre-render and browser render
   identical. Latin metrics follow the Helvetica/Arial family; CJK is 1em. */
var NARROW = { 'i': .22, 'l': .22, 'j': .22, 'f': .28, 't': .28, 'r': .33, 'I': .28, 'J': .5,
  ' ': .28, '.': .28, ',': .28, ':': .28, ';': .28, '\'': .19, '"': .35, '|': .26, '!': .28,
  '(': .33, ')': .33, '[': .28, ']': .28, '-': .33, '/': .28, '·': .28 };
var WIDE = { 'm': .83, 'w': .72, 'M': .83, 'W': .94, '%': .89, '@': 1.0, '—': 1.0, '…': 1.0, '×': .58, '+': .58, '−': .58, '±': .58, '=': .58, '<': .58, '>': .58, '$': .56, '€': .56, '¥': .56, '£': .56, '–': .56, '²': .33,
  '≤': .58, '≥': .58, '≈': .58, '→': 1.0, '←': 1.0, 'μ': .58, 'χ': .55, 'λ': .5, 'α': .58, 'β': .56, 'γ': .5, 'κ': .5, 'τ': .45, 'Δ': .67 };
function charW(ch) {
  var c = ch.charCodeAt(0);
  if ((c >= 0x2070 && c <= 0x209F) || c === 0xB9 || c === 0xB3) return .36;
  if ((c >= 0x2E80 && c <= 0x9FFF) || (c >= 0xAC00 && c <= 0xD7AF) || (c >= 0xF900 && c <= 0xFAFF) ||
      (c >= 0xFF00 && c <= 0xFF60) || (c >= 0x3000 && c <= 0x303F) || (c >= 0xFE30 && c <= 0xFE4F)) return 1.0;
  if (NARROW[ch] != null) return NARROW[ch];
  if (WIDE[ch] != null) return WIDE[ch];
  if (ch >= '0' && ch <= '9') return .56;
  if (ch >= 'A' && ch <= 'Z') return .67;
  if (ch >= 'a' && ch <= 'z') return .53;
  return .6;
}
function textW(str, size, weight) {
  str = String(str == null ? '' : str);
  var w = 0;
  for (var i = 0; i < str.length; i++) w += charW(str[i]);
  return w * (size || 12) * (weight >= 600 ? 1.06 : 1);
}
/* Greedy wrap that respects CJK (break anywhere) and Latin (break at spaces). */
function wrapText(str, maxW, size, weight, maxLines) {
  str = String(str == null ? '' : str);
  if (textW(str, size, weight) <= maxW) return [str];
  var tokens = str.match(/[⺀-鿿豈-﫿＀-｠　-〿]|[^\s⺀-鿿豈-﫿＀-｠　-〿]+|\s+/g) || [str];
  var lines = [], cur = '';
  /* Line-breaking rules: closing punctuation never starts a line and an
     opening bracket never ends one. */
  var CLOSE = /^[）」』】〉》，。、；：！？%’”)\]]/, OPEN = /[（「『【〈《‘“(\[]+$/;
  tokens.forEach(function (t) {
    var next = cur + t;
    if (textW(next.trim(), size, weight) <= maxW || !cur.trim() || CLOSE.test(t)) cur = next;
    else {
      var carry = '', m = cur.match(OPEN);
      if (m && m[0].length < cur.trim().length) { carry = m[0]; cur = cur.slice(0, cur.length - carry.length); }
      lines.push(cur.trim()); cur = /^\s+$/.test(t) ? carry : carry + t;
    }
  });
  if (cur.trim()) lines.push(cur.trim());
  if (maxLines && lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    var last = lines[maxLines - 1];
    while (last.length > 1 && textW(last + '…', size, weight) > maxW) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}
function truncate(str, maxW, size, weight) {
  str = String(str == null ? '' : str);
  if (textW(str, size, weight) <= maxW) return str;
  while (str.length > 1 && textW(str + '…', size, weight) > maxW) str = str.slice(0, -1);
  return str + '…';
}

/* ── number formatting ───────────────────────────────────────────────────
   Contract: percent fields are stored as percent numbers (12.5 = 12.5%).
   fmt: {type:number|integer|percent|pp|multiple|currency|index|bps|pvalue|sci,
         decimals, prefix, suffix, sign, negative:'minus'|'parens', scale}
   pvalue: ≥0.1 → 2 decimals, 0.001–0.1 → 2 significant digits, <0.001 →
   "<0.001" (or 4.2×10⁻⁸ with sci:true); sci: mantissa × 10ⁿ.            */
var MINUS = '−';
var SUPS = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '−': '⁻', '+': '⁺' };
function sup(v) { return String(v).split('').map(function (ch) { return SUPS[ch] || ch; }).join(''); }
function fmtSci(v, digits) {
  if (!isNum(v)) return '—';
  if (v === 0) return '0';
  var a = Math.abs(v), e = Math.floor(Math.log10(a)), m = a / Math.pow(10, e), d = Math.max(0, (digits || 2) - 1), ms = m.toFixed(d);
  if (+ms >= 10) { e += 1; ms = (m / 10).toFixed(d); }
  return (v < 0 ? MINUS : '') + ms + '×10' + sup(e);
}
/* Decade tick for log axes: 10ⁿ, or plain digits between 0.001 and 10⁵. */
function fmtDecade(v, lang) {
  if (v >= 0.001 && v < 1e5) return fmtNum(v, { type: 'number', decimals: v < 1 ? Math.min(3, Math.ceil(-Math.log10(v) - 1e-9)) : 0 }, lang);
  return '10' + sup(Math.round(Math.log10(v)));
}
function fmtPval(p, sci) {
  if (!isNum(p)) return '—';
  if (p < 0.001) return sci ? fmtSci(p, 2) : '<0.001';
  if (p > 0.99) return '>0.99';
  if (p >= 0.1) return p.toFixed(2);
  var r = +p.toPrecision(2);
  [0.001, 0.01, 0.05].forEach(function (b) { if (p < b && r >= b) { r = +p.toPrecision(3); if (r >= b) r = +p.toPrecision(4); } });
  return String(r);
}
function normFmt(fmt) {
  if (fmt == null) return { type: 'number' };
  if (typeof fmt === 'string') {
    var m = fmt.match(/^(number|integer|percent|pp|multiple|currency|index|bps|pvalue|sci)(?::(\d))?$/);
    if (m) return { type: m[1], decimals: m[2] != null ? +m[2] : undefined };
    return { type: 'number', suffix: fmt };
  }
  return fmt;
}
function defaultDecimals(type, v) {
  if (type === 'integer' || type === 'bps') return 0;
  if (type === 'percent' || type === 'pp' || type === 'multiple') return 1;
  if (type === 'index') return 1;
  var a = Math.abs(v);
  if (a >= 100) return 0;
  if (a >= 10) return 1;
  if (a >= 1) return 1;
  if (a === 0) return 0;
  return 2;
}
function groupThousands(s) {
  var parts = s.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}
function fmtNum(v, fmt, lang, opts) {
  fmt = normFmt(fmt); opts = opts || {};
  lang = lang || 'zh';
  if (v === 'n.m.' || v === 'nm' || v === 'NM') return L(lang, 'nm');
  v = num(v);
  if (v == null) return L(lang, 'missing');
  var type = fmt.type || 'number';
  if (type === 'pvalue') return fmtPval(v, fmt.sci);
  if (fmt.scale) v = v / fmt.scale;
  if (type === 'sci') return fmtSci(v, fmt.decimals != null ? fmt.decimals + 1 : 2);
  var d = fmt.decimals != null ? fmt.decimals : (opts.decimals != null ? opts.decimals : defaultDecimals(type, v));
  var neg = v < 0 || (Object.is && Object.is(v, -0) && false);
  var a = Math.abs(v);
  var s = a.toFixed(d);
  if (+s === 0) neg = false;
  if (fmt.thousands !== false) s = groupThousands(s);
  var pre = fmt.prefix || '', suf = fmt.suffix || '';
  if (type === 'percent') suf = '%' + suf;
  else if (type === 'pp') suf = (lang === 'en' ? ' pp' : 'pct') + suf;
  else if (type === 'multiple') suf = 'x' + suf;
  else if (type === 'bps') suf = (lang === 'en' ? ' bps' : 'bp') + suf;
  else if (type === 'currency') pre = (fmt.symbol || fmt.prefix || '$');
  var out = pre + s + suf;
  var negStyle = opts.negative || fmt.negative || 'minus';
  if (neg) out = negStyle === 'parens' ? '(' + out + ')' : MINUS + out;
  else if ((opts.sign || fmt.sign) && +a.toFixed(d) !== 0) out = '+' + out;
  return out;
}
/* Short axis label: same rules, never adds a sign, keeps decimals minimal. */
function fmtTick(v, fmt, lang, step) {
  fmt = normFmt(fmt);
  var d = 0;
  if (step != null && step > 0 && step < 1) d = Math.min(4, Math.ceil(-Math.log10(step) - 1e-9));
  if (step != null && step >= 1 && Math.abs(step - Math.round(step)) > 1e-9) d = 1;
  var f = {}; for (var k in fmt) f[k] = fmt[k];
  f.decimals = d; f.sign = false;
  if (f.type === 'currency') { f.type = 'currency'; }
  return fmtNum(v, f, lang, { negative: 'minus' });
}

/* ── periods & dates ─────────────────────────────────────────────────────
   Category periods keep their label; estimates are periods ending in "E"
   (2026E, 3Q26E, 2026Q3E, FY27E) or rows flagged by an estimate field.   */
function isEstLabel(label) { return /^(FY)?\s*[0-9QHM\-\/\s]*[0-9]\s*E$/i.test(String(label).trim()) || /\dE$/.test(String(label).trim()); }
var ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
var ISO_MONTH = /^\d{4}-\d{2}$/;
function parseDay(s) {
  if (s instanceof Date) return s.getTime();
  if (typeof s === 'number') return s;
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3]);
}
var MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(t, unit, lang) {
  var d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
  var yy = String(y).slice(2);
  if (unit === 'year') return String(y);
  if (unit === 'quarter') { var q = Math.floor(m / 3) + 1; return lang === 'en' ? q + 'Q' + yy : yy + 'Q' + q; }
  if (unit === 'month') return lang === 'en' ? MONTHS_EN[m] + '-' + yy : y + '-' + (m < 9 ? '0' : '') + (m + 1);
  if (unit === 'monthShort') return lang === 'en' ? MONTHS_EN[m] : (m + 1) + '月';
  if (unit === 'day') return lang === 'en' ? day + ' ' + MONTHS_EN[m] : (m + 1) + '/' + day;
  return y + '-' + (m < 9 ? '0' : '') + (m + 1) + '-' + (day < 10 ? '0' : '') + day;
}
function fmtMonthLabel(s, lang) {
  var m = String(s).match(/^(\d{4})-(\d{2})$/);
  if (!m) return String(s);
  return lang === 'en' ? MONTHS_EN[+m[2] - 1] + '-' + m[1].slice(2) : m[1] + '-' + m[2];
}

/* ── colors ──────────────────────────────────────────────────────────── */
function hexRgb(h) {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbHex(rgb) { return '#' + rgb.map(function (v) { v = clamp(Math.round(v), 0, 255); return (v < 16 ? '0' : '') + v.toString(16); }).join('').toUpperCase(); }
function mix(a, b, t) { var x = hexRgb(a), y = hexRgb(b); return rgbHex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * t; })); }
function relLum(hex) {
  var c = hexRgb(hex).map(function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) { var x = relLum(a), y = relLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
/* Text color with ≥4.5:1 on a given fill (ink or white). */
function inkOn(fill) { return contrast(fill, '#FFFFFF') >= 4.5 ? '#FFFFFF' : THEME.ink; }
function rampAt(ramp, t) {
  t = clamp(t, 0, 1);
  var p = t * (ramp.length - 1), i = Math.floor(p), f = p - i;
  if (i >= ramp.length - 1) return ramp[ramp.length - 1];
  return mix(ramp[i], ramp[i + 1], f);
}

/* ── SVG string builder ──────────────────────────────────────────────── */
function fmtAttr(v) { return typeof v === 'number' ? String(r2(v)) : esc(v); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c];
  });
}
function attrs(a) {
  var out = '';
  for (var k in a) { var v = a[k]; if (v == null || v === false) continue; out += ' ' + k + '="' + fmtAttr(v) + '"'; }
  return out;
}
function el(tag, a, inner) { return '<' + tag + attrs(a || {}) + (inner == null ? '/>' : '>' + inner + '</' + tag + '>'); }
/* text(x, y, str, {anchor, size, weight, fill, baseline:'middle'|'top'|'bottom', ...}) */
function text(x, y, str, o) {
  o = o || {};
  var dy = o.baseline === 'middle' ? '0.35em' : o.baseline === 'top' ? '0.8em' : o.baseline === 'hanging' ? '0.8em' : null;
  var a = { x: x, y: y, dy: dy, 'text-anchor': o.anchor && o.anchor !== 'start' ? o.anchor : null,
    'font-size': o.size || null, 'font-weight': o.weight && o.weight !== 400 ? o.weight : null,
    fill: o.fill || null, 'class': o.cls || null, transform: o.transform || null, opacity: o.opacity == null ? null : o.opacity,
    'font-style': o.italic ? 'italic' : null, 'paint-order': o.halo ? 'stroke' : null,
    stroke: o.halo ? (o.haloColor || '#FFFFFF') : null, 'stroke-width': o.halo ? 3 : null, 'stroke-linejoin': o.halo ? 'round' : null };
  if (o.data) for (var k in o.data) a['data-' + k] = o.data[k];
  return el('text', a, esc(str));
}
function line(x1, y1, x2, y2, o) {
  o = o || {};
  return el('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: o.stroke || THEME.axis, 'stroke-width': o.width || 1,
    'stroke-dasharray': o.dash || null, 'shape-rendering': o.crisp ? 'crispEdges' : null, opacity: o.opacity == null ? null : o.opacity, 'class': o.cls || null });
}
function rect(x, y, w, h, o) {
  o = o || {};
  if (h < 0) { y += h; h = -h; }
  if (w < 0) { x += w; w = -w; }
  var a = { x: x, y: y, width: Math.max(0, w), height: Math.max(0, h), fill: o.fill || 'none', stroke: o.stroke || null,
    'stroke-width': o.stroke ? (o.strokeWidth || 1) : null, 'stroke-dasharray': o.dash || null, rx: o.rx || null,
    opacity: o.opacity == null ? null : o.opacity, 'class': o.cls || null, 'shape-rendering': o.crisp ? 'crispEdges' : null };
  if (o.data) for (var k in o.data) a['data-' + k] = o.data[k];
  return el('rect', a, o.title ? el('title', {}, esc(o.title)) : null);
}
function path(d, o) {
  o = o || {};
  var a = { d: d, fill: o.fill || 'none', stroke: o.stroke || null, 'stroke-width': o.stroke ? (o.width || 1.5) : null,
    'stroke-dasharray': o.dash || null, 'stroke-linejoin': o.stroke ? 'round' : null, 'stroke-linecap': o.cap || null,
    opacity: o.opacity == null ? null : o.opacity, 'fill-opacity': o.fillOpacity == null ? null : o.fillOpacity, 'class': o.cls || null };
  if (o.data) for (var k in o.data) a['data-' + k] = o.data[k];
  return el('path', a, o.title ? el('title', {}, esc(o.title)) : null);
}
function circle(cx, cy, rr, o) {
  o = o || {};
  var a = { cx: cx, cy: cy, r: Math.max(0, rr), fill: o.fill || 'none', stroke: o.stroke || null, 'stroke-width': o.stroke ? (o.width || 1) : null,
    opacity: o.opacity == null ? null : o.opacity, 'fill-opacity': o.fillOpacity == null ? null : o.fillOpacity, 'class': o.cls || null };
  if (o.data) for (var k in o.data) a['data-' + k] = o.data[k];
  return el('circle', a, o.title ? el('title', {}, esc(o.title)) : null);
}
function g(inner, a) { return el('g', a || {}, inner); }
function polyline(pts) {
  var d = '', pen = false;
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i];
    if (!p || !isNum(p[0]) || !isNum(p[1])) { pen = false; continue; }
    d += (pen ? 'L' : 'M') + r2(p[0]) + ' ' + r2(p[1]);
    pen = true;
  }
  return d;
}
/* Tooltip payload carried as data attributes; the browser runtime reads them. */
function tip(label, rows) {
  return { tip: JSON.stringify({ t: label, r: rows }) };
}
