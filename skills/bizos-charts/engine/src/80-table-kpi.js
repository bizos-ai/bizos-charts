/* 80-table-kpi — K01 KPI tiles, K02 data table, K03 comparable-company
   table, K04 financial forecast table. Tables are HTML: crisp, selectable,
   copyable into spreadsheets. Negatives use parentheses in finance tables. */

function sparkSVG(vals, color, w, h) {
  var v = vals.map(num), e = extent(v), pts = [], n = v.length;
  if (n < 2) return '';
  v.forEach(function (x, i) { pts.push(isNum(x) ? [i / (n - 1) * (w - 4) + 2, h - 3 - (e[1] > e[0] ? (x - e[0]) / (e[1] - e[0]) : 0.5) * (h - 6)] : null); });
  var last = null; for (var i = n - 1; i >= 0; i--) if (pts[i]) { last = pts[i]; break; }
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' + path(polyline(pts), { stroke: color, width: 1.6 }) + (last ? circle(last[0], last[1], 2.2, { fill: color }) : '') + '</svg>';
}

/* ── K01 KPI tiles ───────────────────────────────────────────────────── */
register({
  id: 'K01', name: { zh: '关键指标卡', en: 'KPI tiles' },
  question: { zh: '本期核心指标是多少，较上期/去年同期变化多少，方向好坏？', en: 'What are the headline metrics this period, how did they change, and is that good or bad?' },
  use: { zh: '报告首屏的 3–8 个核心指标；每个指标带口径（期间）、变化与可选迷你走势。', en: 'The 3–8 headline metrics at the top of a report, each with period, change and optional sparkline.' },
  avoid: { zh: '指标超过 8 个（用 K02 表格）；没有比较基准的孤立数字。', en: 'More than 8 metrics (use K02); isolated numbers without a comparison.' },
  fields: [
    { key: 'data[]', role: 'items', required: true, desc: { zh: '{label, value, format, unit, delta, deltaFormat, deltaLabel, goodDirection, spark:[…], note}', en: '{label, value, format, unit, delta, deltaFormat, deltaLabel, goodDirection, spark, note}' } }
  ],
  options: ['columns'],
  keywords: { zh: ['KPI', '指标卡', '核心指标', '关键数据', '首屏', '看板', '概览'], en: ['kpi', 'headline metrics', 'scorecard', 'summary tiles', 'dashboard'] },
  dataKind: 'custom', needsUnit: false, output: 'html',
  lint: function (s, add) {
    var d = asArray(s.data);
    if (!d.length) add('error', 'E_DATA', 'data 为空');
    if (d.length > 8) add('warning', 'W_ITEMS', '指标超过 8 个：改用 K02 表格');
    d.forEach(function (it) {
      if (!it.label) add('error', 'E_FIELD', '指标缺少 label');
      if (!isNum(num(it.value)) && it.value !== 'n.m.') add('error', 'E_FIELD', '指标 “' + it.label + '” 缺少数值');
      var f = normFmt(it.format);
      if (!it.unit && !NO_UNIT_TYPES[f.type]) add('error', 'E_UNIT', '指标 “' + it.label + '” 缺少单位 unit');
      if (it.delta != null && !it.deltaLabel) add('warning', 'W_DELTA', '指标 “' + it.label + '” 有变化值但缺少 deltaLabel（如“同比”“环比”）');
    });
  },
  render: function (c) {
    var s = c.spec, items = asArray(s.data);
    var html = '<div class="bz-kpis"' + (s.columns ? ' style="grid-template-columns:repeat(' + s.columns + ',minmax(0,1fr))"' : '') + '>' + items.map(function (it) {
      var f = normFmt(it.format), v = fmtNum(it.value, f, c.lang), unit = it.unit ? '<small>' + esc(it.unit) + '</small>' : '';
      var d = '';
      if (it.delta != null && isNum(num(it.delta))) {
        var df = normFmt(it.deltaFormat || (f.type === 'percent' ? 'pp' : 'percent')), dv = num(it.delta), good = (it.goodDirection === 'down' ? -1 : 1) * dv;
        var col = dv === 0 ? THEME.ink2 : good > 0 ? THEME.good : THEME.bad, arrow = dv > 0 ? '▲' : dv < 0 ? '▼' : '■';
        d = '<div class="d" style="color:' + col + '">' + arrow + ' ' + esc(fmtNum(dv, { type: df.type, decimals: df.decimals, sign: true }, c.lang)) + '<span>' + esc(it.deltaLabel || '') + '</span></div>';
      }
      var sp = Array.isArray(it.spark) && it.spark.length > 1 ? sparkSVG(it.spark, c.pal.primary, 160, 30) : '';
      return '<div class="bz-kpi" tabindex="0" data-tip="' + esc(JSON.stringify({ t: it.label, r: [[c.t('value'), v + (it.unit ? ' ' + it.unit : '')]].concat(it.delta != null ? [[it.deltaLabel || '', fmtNum(it.delta, { type: normFmt(it.deltaFormat || (f.type === 'percent' ? 'pp' : 'percent')).type, sign: true }, c.lang)]] : []) })) + '"><div class="l">' + esc(it.label) + '</div><div class="v">' + esc(v) + unit + '</div>' + d + sp + (it.note ? '<div class="n">' + esc(it.note) + '</div>' : '') + '</div>';
    }).join('') + '</div>';
    c.setTable([c.t('item'), c.t('value'), c.lang === 'en' ? 'Change' : '变化'], items.map(function (it) { return [String(it.label), fmtNum(it.value, it.format, c.lang) + (it.unit ? ' ' + it.unit : ''), it.delta != null ? fmtNum(it.delta, { type: normFmt(it.deltaFormat || (normFmt(it.format).type === 'percent' ? 'pp' : 'percent')).type, sign: true }, c.lang) + ' ' + (it.deltaLabel || '') : '—']; }));
    return { html: html, height: 0 };
  }
});

/* ── generic table renderer (K02–K04) ───────────────────────────────── */
function fmtCell(v, col, lang, finance) {
  var f = normFmt(col.format);
  if (v === 'n.m.' || v === 'nm' || v === 'NM') return L(lang, 'nm');
  if (typeof v === 'string' && !isNum(num(v))) return v;
  return fmtNum(v, f, lang, { negative: col.negative || (finance && f.type !== 'percent' && f.type !== 'pp' ? 'parens' : 'minus') });
}
function tableLint(s, add) {
  var cols = asArray(s.columns);
  if (!cols.length) { add('error', 'E_COLUMNS', '缺少 columns：[{key,label,format,unit}]'); return; }
  checkFields(s, add, cols.map(function (cl) { return cl.key; }));
  cols.slice(1).forEach(function (cl) {
    var f = normFmt(cl.format), numeric = asArray(s.data).some(function (r) { return isNum(num(r[cl.key])); });
    if (numeric && !cl.unit && !NO_UNIT_TYPES[f.type] && !/[（(].+[)）]/.test(String(cl.label || ''))) add('warning', 'W_UNIT', '列 “' + (cl.label || cl.key) + '” 缺少单位（unit 或在列名括号中注明）');
  });
}
function renderTable(c, opts) {
  var s = c.spec, cols = asArray(s.columns), data = asArray(s.data).slice(), finance = opts.finance;
  if (s.sortBy) { var sk = s.sortBy.replace(/^-/, ''), dir = s.sortBy[0] === '-' ? -1 : 1; data.sort(function (a, b) { return dir * ((num(a[sk]) || 0) - (num(b[sk]) || 0)); }); }
  var colStats = {};
  cols.forEach(function (cl) { var v = data.map(function (r) { return num(r[cl.key]); }).filter(isNum); colStats[cl.key] = { e: extent(v), max: Math.max.apply(null, v.map(Math.abs).concat([0])) }; });
  var hl = asArray(s.highlight).map(String), first = cols[0].key;
  var head = '';
  if (asArray(s.groups).length) {
    head += '<tr class="bz-grp"><th></th>' + s.groups.map(function (gp) { return '<th colspan="' + gp.span + '">' + esc(gp.label || '') + '</th>'; }).join('') + '</tr>';
  }
  head += '<tr>' + cols.map(function (cl) { return '<th' + (cl.est ? ' class="bz-e"' : '') + (cl.align ? ' style="text-align:' + cl.align + '"' : '') + '>' + esc(cl.label || cl.key) + (cl.unit ? '<br><span class="bz-axis-h">' + esc(cl.unit) + '</span>' : '') + '</th>'; }).join('') + '</tr>';
  var rowHTML = function (r, cls) {
    return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' + cols.map(function (cl, j) {
      var v = r[cl.key], txt = j === 0 ? String(v == null ? '' : v) : (v === '' ? '' : fmtCell(v, cl, c.lang, finance)), st = [], klass = [];
      if (cl.est) klass.push('bz-e');
      if (j === 0 && r._indent) klass.push('bz-ind' + r._indent);
      if (j > 0 && cl.negativeRed && num(v) < 0) klass.push('bz-neg');
      if (cl.align) st.push('text-align:' + cl.align);
      if (j > 0 && cl.heat && isNum(num(v)) && !cls) { var e = colStats[cl.key].e, t = e[1] > e[0] ? (num(v) - e[0]) / (e[1] - e[0]) : 0.5; if (cl.heat === 'diverging') { var m = Math.max(Math.abs(e[0]), Math.abs(e[1])) || 1; t = 0.5 + num(v) / m / 2; } var bgc = cl.heat === 'diverging' ? rampAt(['#E9B5A9', '#F4E1DB', '#FFFFFF', '#DCE6F2', '#A9C3E3'], t) : rampAt(c.pal.seq.slice(0, 4), t); st.push('background:' + bgc); }
      var bar = '';
      if (j > 0 && cl.bar && isNum(num(v)) && !cls) { var w = Math.round(Math.abs(num(v)) / (colStats[cl.key].max || 1) * 60); bar = '<span class="bz-bar" style="width:' + w + 'px' + (num(v) < 0 ? ';background:' + THEME.bad : '') + '"></span>'; }
      if (j > 0 && cl.spark && Array.isArray(v)) { txt = ''; bar = '<span style="display:inline-block;width:90px;height:22px;vertical-align:middle">' + sparkSVG(v, c.pal.primary, 90, 22) + '</span>'; }
      var cell = esc(txt), url = cl.href ? String(r[cl.href] || '') : '';
      if (url && /^https?:\/\//i.test(url) && txt) cell = '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + cell + '</a>';
      return '<td' + (klass.length ? ' class="' + klass.join(' ') + '"' : '') + (st.length ? ' style="' + st.join(';') + '"' : '') + '>' + cell + bar + '</td>';
    }).join('') + '</tr>';
  };
  var body = data.map(function (r) { return rowHTML(r, r._class || (hl.indexOf(String(r[first])) >= 0 ? 'bz-hl' : '')); }).join('');
  (opts.extraRows || []).forEach(function (r, i) { body += rowHTML(r, r._class + (i === 0 ? ' bz-first-stat' : '')); });
  if (s.total) {
    var tr = {}; tr[first] = typeof s.total === 'object' && s.total.label ? s.total.label : c.t('total');
    cols.slice(1).forEach(function (cl) { var f = normFmt(cl.format), numeric = data.some(function (r) { return isNum(num(r[cl.key])); }) && data.every(function (r) { return r[cl.key] == null || isNum(num(r[cl.key])); }); if (cl.sum !== false && numeric && (f.type === 'number' || f.type === 'integer' || f.type === 'currency')) tr[cl.key] = sum(data, function (r) { return num(r[cl.key]); }); else tr[cl.key] = ''; });
    body += rowHTML(tr, 'bz-sub');
  }
  c.setTable(cols.map(function (cl) { return cl.label || cl.key; }), data.map(function (r) { return cols.map(function (cl, j) { return j === 0 ? String(r[cl.key]) : fmtCell(r[cl.key], cl, c.lang, finance); }); }), data.map(function (r) { return cols.map(function (cl) { return Array.isArray(r[cl.key]) ? r[cl.key].join(' ') : r[cl.key]; }); }));
  return { html: tableShell('<thead>' + head + '</thead><tbody>' + body + '</tbody>', 120 + cols.length * 80), height: 0 };
}

/* ── K02 Data table ──────────────────────────────────────────────────── */
register({
  id: 'K02', name: { zh: '数据表（带条形/色阶/迷你图）', en: 'Data table (bars, heat, sparklines)' },
  question: { zh: '需要逐项查数、对比多个指标时，如何一次给全且有重点？', en: 'How to give exact values across many metrics at once, with emphasis?' },
  use: { zh: 'SKU/ASIN 明细、站点经营表、关键词表；列可加内嵌条形、色阶或迷你走势。', en: 'SKU/ASIN detail, marketplace P&L, keyword tables; columns can carry inline bars, heat or sparklines.' },
  avoid: { zh: '只有一两个数（写进正文或 K01）。', en: 'One or two numbers (put them in text or K01).' },
  fields: [
    { key: 'columns', role: 'list', required: true, desc: { zh: '[{key,label,format,unit,bar,heat,spark,align,href}]，第一列为行名；href 指向存放 http(s) 链接的字段（如 ASIN 详情页）', en: '[{key,label,format,unit,bar,heat,spark,align,href}]; first column is the row label; href names a field holding an http(s) link' } },
    { key: 'data', role: 'rows', required: true, desc: { zh: '行数据', en: 'Rows' } }
  ],
  options: ['total（合计行）', 'highlight（行名）', 'sortBy（"-sales"）', 'groups（表头分组）', 'finance:true（负数括号）'],
  keywords: { zh: ['表格', '数据表', '明细', '清单', '经营表', 'SKU明细', '对比表'], en: ['table', 'data table', 'detail', 'listing', 'league table'] },
  dataKind: 'table', needsUnit: false, output: 'html',
  lint: function (s, add) { tableLint(s, add); },
  render: function (c) { return renderTable(c, { finance: !!c.spec.finance }); }
});

/* ── K03 Comparable companies table ──────────────────────────────────── */
register({
  id: 'K03', name: { zh: '可比公司估值表', en: 'Comparable companies table' },
  question: { zh: '主角的估值倍数、增速和利润率相对同业均值/中位数处于什么水平？', en: 'Where do the subject’s multiples, growth and margins sit against the peer mean and median?' },
  use: { zh: '可比公司估值（P/E、EV/EBITDA、P/S）、经营指标对标；自动计算同业均值与中位数（不含主角）。', en: 'Trading comps (P/E, EV/EBITDA, P/S) and operating benchmarks; peer mean/median computed excluding the subject.' },
  avoid: { zh: '同业不可比（业务结构差异大时需说明筛选标准）。', en: 'Non-comparable peers (state the screening criteria).' },
  fields: [
    { key: 'columns', role: 'list', required: true, desc: { zh: '同 K02；倍数列 format:"multiple"，≤0 或缺失显示 n.m.', en: 'As K02; multiple columns show n.m. for ≤0' } },
    { key: 'subject', role: 'text', required: true, desc: { zh: '主角名称（首列值），置顶并加粗', en: 'Subject name (first-column value), pinned and bold' } }
  ],
  options: ['stats:["mean","median"]'],
  keywords: { zh: ['可比公司', '估值表', '同业对比', '倍数', '市盈率', 'EV/EBITDA', 'comps', '对标'], en: ['comparable companies', 'trading comps', 'peer table', 'multiples', 'p/e', 'ev/ebitda'] },
  dataKind: 'table', needsUnit: false, output: 'html',
  lint: function (s, add) { tableLint(s, add); if (!s.subject) add('error', 'E_SUBJECT', '缺少 subject（主角公司名）'); else if (!asArray(s.data).some(function (r) { return String(r[asArray(s.columns)[0] && s.columns[0].key]) === String(s.subject); })) add('error', 'E_SUBJECT', '数据中找不到主角 “' + s.subject + '”'); if (asArray(s.data).length < 4) add('warning', 'W_SAMPLE', '同业少于 3 家：均值/中位数意义有限'); },
  render: function (c) {
    var s = c.spec, cols = asArray(s.columns), first = cols[0].key, subj = String(s.subject);
    var rows = asArray(s.data).map(function (r) { var o = {}; for (var k in r) o[k] = r[k]; cols.forEach(function (cl) { if (normFmt(cl.format).type === 'multiple' && (!isNum(num(o[cl.key])) || num(o[cl.key]) <= 0)) o[cl.key] = 'n.m.'; }); return o; });
    var subject = rows.filter(function (r) { return String(r[first]) === subj; }), peers = rows.filter(function (r) { return String(r[first]) !== subj; });
    if (s.sortBy) { var sk = String(s.sortBy).replace(/^-/, ''), dir = String(s.sortBy)[0] === '-' ? -1 : 1; peers.sort(function (a, b) { return dir * ((num(a[sk]) || 0) - (num(b[sk]) || 0)); }); c.spec.sortBy = null; }
    subject.forEach(function (r) { r._class = 'bz-hl'; });
    var stats = asArray(s.stats || ['mean', 'median']).map(function (st) {
      var o = { _class: 'bz-stat' }; o[first] = (c.lang === 'en' ? 'Peer ' : '同业') + c.t(st === 'mean' ? 'mean' : 'median');
      cols.slice(1).forEach(function (cl) { var v = sortNum(peers.map(function (r) { return num(r[cl.key]); })); o[cl.key] = v.length ? (st === 'mean' ? mean(v) : median(v)) : null; });
      return o;
    });
    c.spec.data = subject.concat(peers);
    c.notesExtra.push(c.lang === 'en' ? 'Peer mean and median exclude ' + subj + '; n.m. = not meaningful (negative or missing denominator).' : '同业均值与中位数不含' + subj + '；n.m. 表示无意义（分母为负或缺失）。');
    return renderTable(c, { finance: true, extraRows: stats });
  }
});

/* ── K04 Financial forecast table (A/E) ──────────────────────────────── */
register({
  id: 'K04', name: { zh: '财务预测表（A/E）', en: 'Financial forecast table (A/E)' },
  question: { zh: '历史与预测期的收入、利润、利润率和估值指标是多少？', en: 'What are revenue, profit, margins and valuation metrics across actual and estimate years?' },
  use: { zh: '研报“盈利预测与估值”表：实际期（A）与预测期（E）并列，自动计算同比，预测列加底色。', en: 'The “earnings forecast and valuation” table: actual and estimate columns, automatic YoY, shaded estimates.' },
  avoid: { zh: '没有预测期的普通明细（用 K02）。', en: 'Plain detail without estimates (use K02).' },
  fields: [
    { key: 'periods', role: 'list', required: true, desc: { zh: '期间列，如 ["2023A","2024A","2025E","2026E"]', en: 'Period columns, e.g. ["2023A","2024A","2025E","2026E"]' } },
    { key: 'rows', role: 'list', required: true, desc: { zh: '[{label, values:[…], format, yoy:true, bold, indent}]', en: '[{label, values, format, yoy, bold, indent}]' } }
  ],
  options: ['unit（表注单位）'],
  keywords: { zh: ['盈利预测', '财务预测', '预测表', '估值表', 'EPS', '净利润', '营业收入', '主要财务指标'], en: ['earnings forecast', 'financial summary', 'estimates table', 'eps', 'key financials'] },
  dataKind: 'custom', output: 'html',
  lint: function (s, add) {
    var p = asArray(s.periods), r = asArray(s.rows);
    if (!p.length || !r.length) { add('error', 'E_DATA', '缺少 periods 或 rows'); return; }
    r.forEach(function (row) { if (asArray(row.values).length !== p.length) add('error', 'E_ROW', '行 “' + row.label + '” 的值个数与期间数不一致'); });
    checkEstOrder(s, add, p, p.map(isEstLabel));
    if (!p.some(isEstLabel)) add('warning', 'W_EST', '期间中没有预测期（E）：普通明细请用 K02');
  },
  render: function (c) {
    var s = c.spec, p = asArray(s.periods), flags = p.map(isEstLabel);
    var cols = [{ key: '_l', label: c.lang === 'en' ? (s.unit ? s.unit : '') : (s.unit ? '单位：' + s.unit : '') }].concat(p.map(function (per, i) { return { key: 'p' + i, label: per, est: flags[i] }; }));
    var data = [];
    asArray(s.rows).forEach(function (row) {
      var o = { _l: row.label, _indent: row.indent || 0, _class: row.bold || row.kind === 'subtotal' ? 'bz-sub' : '' };
      var f = normFmt(row.format || s.format);
      p.forEach(function (_, i) { o['p' + i] = row.values[i]; });
      o._fmt = f; data.push(o);
      if (row.yoy) {
        var y = { _l: c.lang === 'en' ? '  YoY' : '  同比', _class: 'bz-yoy', _indent: (row.indent || 0) + 1 };
        p.forEach(function (_, i) { var a = num(row.values[i]), b = num(row.values[i - 1]); y['p' + i] = i && isNum(a) && isNum(b) && b > 0 ? (a / b - 1) * 100 : (i && isNum(a) && isNum(b) && b < 0 ? 'n.m.' : null); });
        y._fmt = normFmt('percent:1'); data.push(y);
      }
    });
    var head = '<tr>' + cols.map(function (cl) { return '<th' + (cl.est ? ' class="bz-e"' : '') + '>' + esc(cl.label) + '</th>'; }).join('') + '</tr>';
    var body = data.map(function (r) {
      return '<tr' + (r._class ? ' class="' + r._class + '"' : '') + '>' + cols.map(function (cl, j) {
        if (j === 0) return '<td' + (r._indent ? ' class="bz-ind' + Math.min(2, r._indent) + '"' : '') + '>' + esc(String(r._l).trim()) + '</td>';
        var v = r[cl.key], txt = v === 'n.m.' ? c.t('nm') : fmtNum(v, r._fmt, c.lang, { negative: r._fmt.type === 'percent' || r._fmt.type === 'pp' ? 'minus' : 'parens' });
        return '<td' + (cl.est ? ' class="bz-e"' : '') + '>' + esc(txt) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    c.notesExtra.push(c.lang === 'en' ? 'A = actual, E = estimate (shaded); negatives in parentheses.' : 'A 为实际值，E 为预测值（底色）；负数以括号表示。');
    c.setTable(cols.map(function (cl) { return cl.label; }), data.map(function (r) { return cols.map(function (cl, j) { return j === 0 ? String(r._l).trim() : (r[cl.key] === 'n.m.' ? 'n.m.' : fmtNum(r[cl.key], r._fmt, c.lang)); }); }), data.map(function (r) { return cols.map(function (cl, j) { return j === 0 ? String(r._l).trim() : r[cl.key]; }); }));
    return { html: tableShell('<thead>' + head + '</thead><tbody>' + body + '</tbody>', 140 + p.length * 76), height: 0 };
  }
});
