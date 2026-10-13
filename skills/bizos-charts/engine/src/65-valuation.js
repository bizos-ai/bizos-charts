/* 65-valuation — V01 football field, V02 two-way sensitivity table,
   V03 tornado and V04 driver tree (parent = op(children) is verified). */

/* ── V01 Football field ──────────────────────────────────────────────── */
register({
  id: 'V01', name: { zh: '估值区间图（足球场图）', en: 'Valuation football field' },
  question: { zh: '不同估值方法给出的价值区间是多少，与当前价格/报价相比如何？', en: 'What value range does each method imply, and how does it compare with the current price or offer?' },
  use: { zh: '可比公司、可比交易、DCF、52 周区间等方法的估值汇总；情景（悲观/中性/乐观）区间。', en: 'Summary of trading comps, precedent transactions, DCF and 52-week range; bear/base/bull scenarios.' },
  avoid: { zh: '没有区间只有点估计（用 C01）。', en: 'Point estimates without ranges (use C01).' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '方法/情景名称', en: 'Method or scenario' } },
    { key: 'low / high', role: 'measure', required: true, desc: { zh: '区间下限与上限（同一口径，如每股价值或企业价值）', en: 'Range low and high (same basis, e.g. value per share)' } },
    { key: 'basis', role: 'text', required: false, desc: { zh: '方法依据字段，如“EV/EBITDA 9–12x”', en: 'Basis text, e.g. “EV/EBITDA 9–12x”' } }
  ],
  options: ['current（当前价格）', 'refLines（报价、目标价）', 'groupBy（方法类别着色）'],
  keywords: { zh: ['足球场图', '估值区间', '估值汇总', 'DCF', '可比公司', '可比交易', '目标价', '情景分析', '牛熊'], en: ['football field', 'valuation range', 'dcf', 'trading comps', 'precedent transactions', 'target price', 'scenario'] },
  aspect: 0.5,
  lint: function (s, add) { checkFields(s, add, [s.x, s.low, s.high, s.basis]); asArray(s.data).forEach(function (r) { if (num(r[s.low]) > num(r[s.high])) add('error', 'E_RANGE_ORDER', '下限大于上限：' + r[s.x]); }); },
  render: function (c) {
    var s = c.spec, data = asArray(s.data), keys = data.map(function (r) { return String(r[s.x]); });
    var refs = asArray(s.refLines).slice(); if (s.current != null) refs.unshift({ value: s.current, label: c.t('current'), color: c.pal.series[1] });
    var e = extent([].concat(data.map(function (r) { return num(r[s.low]); }), data.map(function (r) { return num(r[s.high]); }), refs.map(function (r) { return num(r.value); })));
    var span = e[1] - e[0], lo = e[0] - span * 0.12, hi = e[1] + span * 0.12;
    if (e[0] >= 0 && lo < 0) lo = 0;
    var showBasis = s.basis && c.W >= 640;
    var basisW = showBasis ? Math.min(c.W * 0.22, Math.max.apply(null, data.map(function (r) { return textW(String(r[s.basis] || ''), 11); })) + 8) : 0;
    var F = frameBars(c, { keys: keys, lo: lo, hi: hi, unit: s.unit, right: 12 + basisW, rowH: showBasis ? 40 : 30, inner: 0.32, top: refs.length > 1 ? 32 : refs.length ? 16 : 0, zero: lo <= 0, padL: 36, labelWeight: function () { return 600; } });
    var under = F.under, axes = '';
    var groups = s.groupBy ? uniq(data.map(function (r) { return String(r[s.groupBy]); })) : [];
    var marks = '', labels = '', hits = '';
    data.forEach(function (r, i) {
      var k = keys[i], a = num(r[s.low]), b = num(r[s.high]), y = F.y(k), h = F.y.bw;
      if (!isNum(a) || !isNum(b)) return;
      var col = s.groupBy ? c.color(String(r[s.groupBy]), groups.indexOf(String(r[s.groupBy]))) : c.pal.series[2];
      marks += rect(F.x(a), y, Math.max(2, F.x(b) - F.x(a)), h, { fill: col, crisp: true });
      labels += text(F.x(a) - 5, y + h / 2, c.fmt(a), { anchor: 'end', baseline: 'middle', size: c.fs, fill: THEME.ink2 });
      labels += text(F.x(b) + 5, y + h / 2, c.fmt(b), { baseline: 'middle', size: c.fs, fill: THEME.ink2 });
      if (showBasis && r[s.basis]) labels += text(c.W - 4, y + h / 2, String(r[s.basis]), { anchor: 'end', baseline: 'middle', size: 11, fill: THEME.muted });
      hits += hitRect(F.P.l, y, F.P.w, h, k, [[c.lang === 'en' ? 'Low' : '下限', c.fmt(a)], [c.lang === 'en' ? 'High' : '上限', c.fmt(b)], [c.lang === 'en' ? 'Midpoint' : '中值', c.fmt((a + b) / 2)]].concat(s.basis && r[s.basis] ? [[c.lang === 'en' ? 'Basis' : '依据', String(r[s.basis])]] : []), true);
    });
    var placed = [];
    refs.forEach(function (rf, j) {
      var v = num(rf.value); if (!isNum(v)) return;
      var xx = Math.round(F.x(v)) + .5, col = rf.color || [c.pal.series[1], THEME.ink, c.pal.series[6]][j % 3];
      var t = String(rf.label || '') + ' ' + c.fmt(v), w = textW(t, c.fs, 700), anchor = xx + w / 2 > c.W - 2 ? 'end' : xx - w / 2 < 2 ? 'start' : 'middle';
      var x0 = anchor === 'end' ? xx - w : anchor === 'start' ? xx : xx - w / 2, row = 0;
      while (placed.some(function (p) { return p.row === row && !(x0 + w + 6 < p.x0 || x0 > p.x1 + 6); }) && row < 2) row++;
      placed.push({ x0: x0, x1: x0 + w, row: row });
      marks += line(xx, F.P.t - 6 - row * 16, xx, F.P.b, { stroke: col, width: 1.8, dash: j ? '5 3' : null });
      labels += text(xx, F.P.t - 10 - row * 16, t, { anchor: anchor, size: c.fs, weight: 700, fill: col, halo: true });
    });
    if (s.groupBy) groups.forEach(function (gname, i) { c.addLegend(gname, c.color(gname, i), 'bar'); });
    c.setTable([c.lang === 'en' ? 'Method' : '方法', c.lang === 'en' ? 'Low' : '下限', c.lang === 'en' ? 'High' : '上限'].concat(s.basis ? [c.lang === 'en' ? 'Basis' : '依据'] : []), data.map(function (r) { return [String(r[s.x]), c.fmt(r[s.low]), c.fmt(r[s.high])].concat(s.basis ? [String(r[s.basis] || '')] : []); }));
    return { svg: under + marks + axes + F.axes + labels + hits, height: F.H };
  }
});

/* ── shared HTML table helpers (V02, K02–K04) ───────────────────────── */
function cellTint(ramp, t) { return rampAt(ramp, clamp(t, 0, 1)); }
function tableShell(inner, minWidth) { return '<div class="bz-table-wrap"><table class="bz-tbl"' + (minWidth ? ' style="min-width:' + minWidth + 'px"' : '') + '>' + inner + '</table></div>'; }
var TABLE_CSS = [
  '.bz-tbl{border-collapse:collapse;width:100%;font-size:12px;line-height:1.35;color:' + THEME.ink + '}',
  '.bz-tbl th,.bz-tbl td{padding:6px 8px;text-align:right;white-space:nowrap;border-bottom:1px solid ' + THEME.grid + '}',
  '.bz-tbl th:first-child,.bz-tbl td:first-child{text-align:left;white-space:normal;min-width:7em}',
  '.bz-tbl thead th{font-weight:600;color:' + THEME.ink2 + ';border-bottom:1.5px solid ' + THEME.ink + ';vertical-align:bottom}',
  '.bz-tbl thead tr.bz-grp th{border-bottom:1px solid ' + THEME.axis + ';text-align:center;color:' + THEME.ink + '}',
  '.bz-tbl th.bz-e,.bz-tbl td.bz-e{background:' + THEME.shade + '}',
  '.bz-tbl tr.bz-sub td{font-weight:700;border-top:1px solid ' + THEME.ink2 + '}',
  '.bz-tbl tr.bz-hl td{background:#FBF5EA;font-weight:700}',
  '.bz-tbl tr.bz-yoy td{color:' + THEME.muted + ';font-style:italic;font-size:11.5px;border-bottom-color:transparent}',
  '.bz-tbl tr.bz-stat td{color:' + THEME.ink2 + ';font-weight:600;background:#F7F8FA}',
  '.bz-tbl tr.bz-first-stat td{border-top:1.5px solid ' + THEME.ink2 + '}',
  '.bz-tbl td.bz-ind1{padding-left:22px}.bz-tbl td.bz-ind2{padding-left:36px}',
  '.bz-tbl td.bz-neg{color:' + THEME.bad + '}',
  '.bz-tbl .bz-bar{display:inline-block;height:9px;vertical-align:middle;margin-left:6px;background:' + THEME.series[2] + '}',
  '.bz-tbl td.bz-base{outline:2px solid ' + THEME.ink + ';outline-offset:-2px;font-weight:700}',
  '.bz-tbl .bz-axis-h{color:' + THEME.muted + ';font-weight:400}',
  '.bz-tbl a{color:inherit;text-decoration:underline;text-decoration-color:' + THEME.axis + ';text-underline-offset:2px}',
  '.bz-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0;border-top:1px solid ' + THEME.grid + ';border-left:1px solid ' + THEME.grid + '}',
  '.bz-kpi{padding:12px 14px 10px;border-right:1px solid ' + THEME.grid + ';border-bottom:1px solid ' + THEME.grid + ';min-width:0}',
  '.bz-kpi .l{font-size:12px;color:' + THEME.ink2 + ';line-height:1.35}',
  '.bz-kpi .v{font-size:' + THEME.size.kpi + 'px;font-weight:700;line-height:1.2;margin-top:4px;color:' + THEME.ink + ';letter-spacing:-.01em}',
  '.bz-kpi .v small{font-size:13px;font-weight:600;color:' + THEME.ink2 + ';margin-left:3px}',
  '.bz-kpi .d{font-size:12px;margin-top:3px;font-weight:600}',
  '.bz-kpi .d span{color:' + THEME.muted + ';font-weight:400;margin-left:4px}',
  '.bz-kpi .n{font-size:11px;color:' + THEME.muted + ';margin-top:4px}',
  '.bz-kpi svg{display:block;margin-top:6px;width:100%;height:30px}'
].join('\n');
CSS += '\n' + TABLE_CSS;

/* ── V02 Two-way sensitivity table ───────────────────────────────────── */
register({
  id: 'V02', name: { zh: '敏感性分析表（双因素）', en: 'Sensitivity table (two-way)' },
  question: { zh: '两个关键假设同时变化时，结果（估值/利润）落在什么范围？', en: 'When two key assumptions move together, where does the outcome land?' },
  use: { zh: 'WACC × 永续增长率对估值；售价 × 广告花费率对利润；基准情形加框。', en: 'WACC × terminal growth on value; price × ad-spend ratio on profit; base case boxed.' },
  avoid: { zh: '只有一个变量（用 V03 龙卷风图）。', en: 'A single variable (use V03 tornado).' },
  fields: [
    { key: 'rows / cols', role: 'axis', required: true, desc: { zh: '{name, values:[…], format} 行变量与列变量', en: '{name, values:[…], format} for the row and column variables' } },
    { key: 'values', role: 'matrix', required: true, desc: { zh: '结果矩阵 values[i][j]，行数 = rows.values 数', en: 'Outcome matrix values[i][j]' } },
    { key: 'base', role: 'pair', required: true, desc: { zh: '[行基准值, 列基准值]，加框标出', en: '[row base, column base], boxed' } }
  ],
  options: ['shade:"diverging"|"sequential"|"none"', 'goodDirection'],
  keywords: { zh: ['敏感性分析', '敏感性测试', 'WACC', '永续增长率', '双因素', '假设变化', '情景矩阵'], en: ['sensitivity table', 'sensitivity analysis', 'wacc', 'terminal growth', 'two-way table', 'data table'] },
  dataKind: 'custom', output: 'html',
  lint: function (s, add) {
    var R = s.rows || {}, C = s.cols || {}, V = s.values;
    if (!asArray(R.values).length || !asArray(C.values).length) add('error', 'E_AXES', 'rows.values 与 cols.values 不能为空');
    if (!Array.isArray(V) || V.length !== asArray(R.values).length || V.some(function (row) { return !Array.isArray(row) || row.length !== asArray(C.values).length; })) add('error', 'E_MATRIX', 'values 必须是 rows × cols 的完整矩阵');
    else if (V.some(function (row) { return row.some(function (v) { return !isNum(num(v)); }); })) add('error', 'E_MATRIX', '矩阵存在空值或非数值');
    var b = asArray(s.base);
    if (b.length !== 2 || asArray(R.values).map(String).indexOf(String(b[0])) < 0 || asArray(C.values).map(String).indexOf(String(b[1])) < 0) add('error', 'E_BASE', 'base 必须是 [行基准值, 列基准值] 且都在对应 values 中');
  },
  render: function (c) {
    var s = c.spec, R = s.rows, C = s.cols, V = s.values.map(function (row) { return row.map(num); });
    var bi = R.values.map(String).indexOf(String(s.base[0])), bj = C.values.map(String).indexOf(String(s.base[1])), base = V[bi][bj];
    var flat = [].concat.apply([], V), e = extent(flat), shade = s.shade || 'diverging', good = s.goodDirection === 'down' ? -1 : 1;
    var maxDev = Math.max(Math.abs(e[0] - base), Math.abs(e[1] - base)) || 1;
    var bg = function (v) {
      if (shade === 'none') return '';
      if (shade === 'sequential') return cellTint(c.pal.seq.slice(0, 5), (v - e[0]) / ((e[1] - e[0]) || 1));
      var t = 0.5 + (v - base) / maxDev / 2 * good; return cellTint(['#E9B5A9', '#F4E1DB', '#FFFFFF', '#DCE6F2', '#A9C3E3'], t);
    };
    var head = '<thead><tr class="bz-grp"><th></th><th colspan="' + C.values.length + '">' + esc(C.name || '') + '</th></tr><tr><th class="bz-axis-h">' + esc((R.name || '') + ' ↓') + '</th>' +
      C.values.map(function (v, j) { return '<th' + (j === bj ? ' style="color:' + THEME.ink + '"' : '') + '>' + esc(fmtNum(v, C.format, c.lang)) + '</th>'; }).join('') + '</tr></thead>';
    var body = '<tbody>' + R.values.map(function (rv, i) {
      return '<tr><td style="font-weight:' + (i === bi ? 700 : 600) + '">' + esc(fmtNum(rv, R.format, c.lang)) + '</td>' + V[i].map(function (v, j) {
        var b = bg(v);
        return '<td' + (i === bi && j === bj ? ' class="bz-base"' : '') + (b ? ' style="background:' + b + '"' : '') + '>' + esc(c.fmt(v)) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody>';
    c.notesExtra.push((c.lang === 'en' ? 'Boxed cell is the base case: ' : '加框为基准情形：') + (R.name || '') + ' ' + fmtNum(s.base[0], R.format, c.lang) + (c.lang === 'en' ? ', ' : '，') + (C.name || '') + ' ' + fmtNum(s.base[1], C.format, c.lang) + (c.lang === 'en' ? ' → ' : ' → ') + c.fmt(base) + (s.unit ? ' ' + s.unit : '') + (shade === 'diverging' ? (c.lang === 'en' ? '; shading shows deviation from base' : '；底色深浅为相对基准的偏离') : ''));
    c.setTable([(R.name || '') + ' \\ ' + (C.name || '')].concat(C.values.map(function (v) { return fmtNum(v, C.format, c.lang); })), R.values.map(function (rv, i) { return [fmtNum(rv, R.format, c.lang)].concat(V[i].map(function (v) { return c.fmt(v); })); }), R.values.map(function (rv, i) { return [rv].concat(V[i]); }));
    return { html: tableShell(head + body, 60 + C.values.length * 72), height: 0 };
  }
});

/* ── V03 Tornado ─────────────────────────────────────────────────────── */
register({
  id: 'V03', name: { zh: '龙卷风图（单因素敏感性）', en: 'Tornado (one-way sensitivity)' },
  question: { zh: '哪个假设对结果影响最大？各假设上下浮动时结果变化多少？', en: 'Which assumption moves the outcome most when each is flexed up and down?' },
  use: { zh: '利润/估值对售价、销量、广告费率、汇率、头程成本等单因素 ±x% 的敏感性排序。', en: 'Ranking the outcome’s sensitivity to price, volume, ad ratio, FX, freight … each flexed ±x%.' },
  avoid: { zh: '因素之间相互依赖且需联动分析（用 V02）。', en: 'Interdependent drivers that must move together (use V02).' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '因素名（含浮动幅度，如“售价 ±10%”）', en: 'Driver (with flex, e.g. “Price ±10%”)' } },
    { key: 'low / high', role: 'measure', required: true, desc: { zh: '因素取低值/高值时的结果', en: 'Outcome when the driver is at its low / high value' } }
  ],
  options: ['base（基准结果，必填）', 'lowLabel / highLabel'],
  keywords: { zh: ['龙卷风图', '敏感性', '单因素', '影响排序', '假设', '弹性'], en: ['tornado chart', 'sensitivity', 'one-way', 'drivers', 'elasticity'] },
  aspect: 0.55,
  lint: function (s, add) { checkFields(s, add, [s.x, s.low, s.high]); if (!isNum(num(s.base))) add('error', 'E_BASE', '缺少基准结果 base'); },
  render: function (c) {
    var s = c.spec, base = num(s.base), data = asArray(s.data).slice().sort(function (a, b) { return Math.abs(num(b[s.high]) - num(b[s.low])) - Math.abs(num(a[s.high]) - num(a[s.low])); });
    var keys = data.map(function (r) { return String(r[s.x]); });
    var e = extent([base].concat(data.map(function (r) { return num(r[s.low]); }), data.map(function (r) { return num(r[s.high]); })));
    var span = (e[1] - e[0]) || 1, labW = Math.max.apply(null, data.map(function (r) { return Math.max(textW(c.fmt(r[s.low]), 11), textW(c.fmt(r[s.high]), 11)); })) + 8;
    var F = frameBars(c, { keys: keys, lo: e[0] - span * 0.05, hi: e[1] + span * 0.05, unit: s.unit, right: labW, rowH: 30, top: 16, zero: false, padL: labW, labelWeight: function () { return 600; } });
    var x = F.x, under = F.under, axes = '', marks = '', labels = '', hits = '';
    var cLow = c.pal.series[2], cHigh = c.pal.primary;
    data.forEach(function (r) {
      var k = String(r[s.x]), y = F.y(k), h = F.y.bw, lo = num(r[s.low]), hi = num(r[s.high]);
      [[lo, cLow], [hi, cHigh]].forEach(function (pair) { var v = pair[0]; if (!isNum(v)) return; marks += rect(Math.min(x(base), x(v)), y, Math.abs(x(v) - x(base)), h, { fill: pair[1], crisp: true }); });
      var left = Math.min(lo, hi), right = Math.max(lo, hi);
      labels += text(x(left) - 5, y + h / 2, c.fmt(left), { anchor: 'end', baseline: 'middle', size: 11, fill: THEME.ink2 });
      labels += text(x(right) + 5, y + h / 2, c.fmt(right), { baseline: 'middle', size: 11, fill: THEME.ink2 });
      hits += hitRect(F.P.l, y, F.P.w, h, k, [[s.lowLabel || (c.lang === 'en' ? 'Low case' : '低值情形'), c.fmt(lo)], [s.highLabel || (c.lang === 'en' ? 'High case' : '高值情形'), c.fmt(hi)], [c.lang === 'en' ? 'Swing' : '波动幅度', c.fmt(Math.abs(hi - lo))]], true);
    });
    var bx = Math.round(x(base)) + .5;
    marks += line(bx, F.P.t - 6, bx, F.P.b, { stroke: THEME.ink, width: 1.6 });
    labels += text(bx, F.P.t - 10, c.t('base') + ' ' + c.fmt(base), { anchor: 'middle', size: c.fs, weight: 700, fill: THEME.ink, halo: true });
    c.addLegend(s.lowLabel || (c.lang === 'en' ? 'Driver at low value' : '因素取低值'), cLow, 'bar'); c.addLegend(s.highLabel || (c.lang === 'en' ? 'Driver at high value' : '因素取高值'), cHigh, 'bar');
    c.notesExtra.push(c.lang === 'en' ? 'Sorted by swing; other drivers held at base.' : '按波动幅度排序；其余因素保持基准值。');
    c.setTable([c.lang === 'en' ? 'Driver' : '因素', s.lowLabel || (c.lang === 'en' ? 'Low case' : '低值情形'), s.highLabel || (c.lang === 'en' ? 'High case' : '高值情形')], data.map(function (r) { return [String(r[s.x]), c.fmt(r[s.low]), c.fmt(r[s.high])]; }));
    return { svg: under + marks + axes + F.axes + labels + hits, height: F.H };
  }
});

/* ── V04 Driver tree ─────────────────────────────────────────────────── */
function treeOp(op, vals) {
  if (!vals.length || vals.some(function (v) { return !isNum(v); })) return null;
  if (op === '×' || op === '*' || op === 'x') return vals.reduce(function (a, b) { return a * b; }, 1);
  if (op === '+') return sum(vals);
  if (op === '−' || op === '-') return vals.slice(1).reduce(function (a, b) { return a - b; }, vals[0]);
  if (op === '÷' || op === '/') return vals.slice(1).reduce(function (a, b) { return b ? a / b : NaN; }, vals[0]);
  return null;
}
function walkTree(node, depth, fn) { fn(node, depth); asArray(node.children).forEach(function (ch) { walkTree(ch, depth + 1, fn); }); }
register({
  id: 'V04', name: { zh: '指标拆解树（驱动因素树）', en: 'Driver tree' },
  question: { zh: '结果指标由哪些驱动因素相乘/相加得到，变化来自哪一项？', en: 'Which drivers multiply or add up to the outcome, and where did the change come from?' },
  use: { zh: '杜邦分析（ROE = 净利率 × 周转率 × 杠杆）、GMV = 流量 × 转化率 × 客单价、利润树；可显示同比。', en: 'DuPont (ROE = margin × turnover × leverage), GMV = traffic × conversion × AOV, profit trees; optional YoY.' },
  avoid: { zh: '各层之间没有确定的运算关系。', en: 'Levels without a definite arithmetic relationship.' },
  fields: [
    { key: 'tree', role: 'tree', required: true, desc: { zh: '{label, value, prior?, format, op:"×"|"+"|"−"|"÷", children:[…]}；父值必须等于 op(子值)', en: '{label, value, prior?, format, op, children}; parent must equal op(children)' } }
  ],
  options: ['tolerance（默认 1%）'],
  keywords: { zh: ['指标拆解', '驱动因素', '杜邦分析', 'ROE拆解', 'GMV拆解', '利润树', '因素分解'], en: ['driver tree', 'dupont', 'kpi tree', 'decomposition', 'value driver'] },
  dataKind: 'custom', needsUnit: false,
  lint: function (s, add) {
    if (!s.tree || !s.tree.label) { add('error', 'E_TREE', '缺少 tree 根节点'); return; }
    var tol = s.tolerance != null ? s.tolerance : 0.01;
    walkTree(s.tree, 0, function (n) {
      if (!isNum(num(n.value))) add('error', 'E_TREE', '节点 “' + n.label + '” 缺少数值');
      var ch = asArray(n.children);
      if (ch.length) {
        if (!n.op) { add('error', 'E_TREE_OP', '节点 “' + n.label + '” 有子节点但缺少 op（×、+、−、÷）'); return; }
        var calc = treeOp(n.op, ch.map(function (x) { return num(x.value); }));
        if (isNum(calc) && isNum(num(n.value)) && Math.abs(calc - num(n.value)) > Math.max(Math.abs(num(n.value)) * tol, 1e-9)) add('error', 'E_TREE_SUM', '“' + n.label + '” = ' + n.value + '，但子节点 ' + n.op + ' 运算得 ' + (+calc.toPrecision(6)) + '：拆解不平');
        if (isNum(num(n.prior))) { var pc = treeOp(n.op, ch.map(function (x) { return num(x.prior); })); if (isNum(pc) && Math.abs(pc - num(n.prior)) > Math.max(Math.abs(num(n.prior)) * tol, 1e-9)) add('error', 'E_TREE_SUM', '“' + n.label + '” 上期值与子节点运算不一致'); }
      }
    });
  },
  render: function (c) {
    var s = c.spec, cols = [], depthMax = 0;
    walkTree(s.tree, 0, function (n, d) { depthMax = Math.max(depthMax, d); });
    var leaves = 0; (function count(n) { var ch = asArray(n.children); if (!ch.length) leaves++; ch.forEach(count); })(s.tree);
    var nodeW = clamp((c.W - (depthMax) * 34) / (depthMax + 1), 120, 190), nodeH = s.tree.prior != null ? 56 : 44, gapY = 12;
    var H = Math.max(leaves * (nodeH + gapY) + 10, nodeH + 20), out = '', y0 = 6, yy = y0;
    var place = function (n, d) {
      var ch = asArray(n.children);
      n._x = d * (nodeW + 34);
      if (!ch.length) { n._y = yy; yy += nodeH + gapY; }
      else { ch.forEach(function (k) { place(k, d + 1); }); n._y = (ch[0]._y + ch[ch.length - 1]._y) / 2; }
    };
    place(s.tree, 0);
    var draw = function (n, d) {
      var ch = asArray(n.children), fmtN = n.format || s.format, isRoot = d === 0;
      ch.forEach(function (k) {
        var x1 = n._x + nodeW, y1 = n._y + nodeH / 2, x2 = k._x, y2 = k._y + nodeH / 2, mx = x1 + 17;
        out += path('M' + r2(x1) + ' ' + r2(y1) + 'L' + r2(mx) + ' ' + r2(y1) + 'L' + r2(mx) + ' ' + r2(y2) + 'L' + r2(x2) + ' ' + r2(y2), { stroke: THEME.axis, width: 1 });
      });
      if (ch.length && n.op) out += circle(n._x + nodeW + 17, n._y + nodeH / 2, 8, { fill: '#FFFFFF', stroke: THEME.axis }) + text(n._x + nodeW + 17, n._y + nodeH / 2, n.op === '*' || n.op === 'x' ? '×' : n.op === '-' ? '−' : n.op === '/' ? '÷' : n.op, { anchor: 'middle', baseline: 'middle', size: 12, weight: 700, fill: THEME.ink2 });
      var fill = isRoot ? c.pal.primary : '#FFFFFF', tc = isRoot ? '#FFFFFF' : THEME.ink;
      out += rect(n._x, n._y, nodeW, nodeH, { fill: fill, stroke: isRoot ? null : THEME.axis, cls: 'bz-hit', data: tip(String(n.label), [[c.t('value'), fmtNum(n.value, fmtN, c.lang)]].concat(n.prior != null ? [[c.lang === 'en' ? 'Prior' : '上期', fmtNum(n.prior, fmtN, c.lang)]] : [])) });
      out += text(n._x + 8, n._y + 15, truncate(String(n.label), nodeW - 14, 12, 600), { size: 12, weight: 600, fill: isRoot ? '#FFFFFF' : THEME.ink2 });
      out += text(n._x + 8, n._y + 34, fmtNum(n.value, fmtN, c.lang), { size: 15, weight: 700, fill: tc });
      if (n.prior != null && isNum(num(n.prior)) && isNum(num(n.value))) {
        var f = normFmt(fmtN), isRate = f.type === 'percent', ch2 = isRate ? (num(n.value) - num(n.prior)) / (f.scale || 1) : (num(n.prior) ? (num(n.value) / num(n.prior) - 1) * 100 : null);
        var good = (n.goodDirection === 'down' ? -1 : 1) * (ch2 || 0) >= 0;
        out += text(n._x + 8, n._y + 50, (c.lang === 'en' ? 'vs prior ' : '较上期 ') + fmtNum(ch2, { type: isRate ? 'pp' : 'percent', decimals: 1, sign: true }, c.lang), { size: 11, weight: 600, fill: isRoot ? '#DCE6F2' : (good ? THEME.good : THEME.bad) });
      }
      ch.forEach(function (k) { draw(k, d + 1); });
    };
    draw(s.tree, 0);
    var rows = []; walkTree(s.tree, 0, function (n, d) { rows.push([new Array(d + 1).join('　') + n.label, fmtNum(n.value, n.format || s.format, c.lang)].concat(s.tree.prior != null ? [fmtNum(n.prior, n.format || s.format, c.lang)] : [])); });
    c.setTable([c.t('item'), c.t('value')].concat(s.tree.prior != null ? [c.lang === 'en' ? 'Prior' : '上期'] : []), rows);
    c.notesExtra.push(c.lang === 'en' ? 'Each parent equals its children combined by the operator shown; checked within 1%.' : '每个父节点等于子节点按所示运算的结果（已校验，误差 ≤1%）。');
    return { svg: out, height: H };
  }
});
