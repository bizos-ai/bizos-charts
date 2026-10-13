/* 50-compare — C01–C07: ranked bars, columns, grouped, diverging, dumbbell,
   bullet and range bars. Bars always start at zero. */

function resolveRef(v, values) {
  if (v === 'mean' || v === 'average') return mean(values);
  if (v === 'median') return median(sortNum(values));
  return num(v);
}
function refLabel(c, rl) {
  if (rl.label != null) return String(rl.label);
  if (rl.value === 'mean' || rl.value === 'average') return c.t('mean');
  if (rl.value === 'median') return c.t('median');
  return '';
}
function catRows(c) {
  var s = c.spec, data = asArray(s.data).filter(function (r) { return r && r[s.x] != null; });
  var rows = data.map(function (r) { return { key: String(r[s.x]), v: num(r[s.y]), row: r }; });
  if (s.sort === 'asc') rows.sort(function (a, b) { return (a.v == null) - (b.v == null) || a.v - b.v; });
  else if (s.sort !== 'none' && s.sort !== false) rows.sort(function (a, b) { return (a.v == null) - (b.v == null) || b.v - a.v; });
  return rows;
}
function barFill(c, key, i, est) {
  var col = asArray(c.spec.highlight).length ? (c.isDim(key) ? THEME.dim : c.pal.primary) : (c.spec.colors && c.spec.colors[key]) || c.pal.primary;
  return est ? c.est(col) : col;
}

/* ── C01 Horizontal bar (ranked) ─────────────────────────────────────── */
register({
  id: 'C01', name: { zh: '条形图（排序）', en: 'Bar chart (ranked)' },
  question: { zh: '谁最大、谁最小？主角在同业中排第几、离中位数多远？', en: 'Who is largest or smallest; where does the subject rank against the median?' },
  use: { zh: '3–20 个类别的排序比较，类别名较长；同业对标（主角高亮 + 中位数线）。', en: 'Ranking 3–20 categories with long names; peer benchmarking (highlight + median line).' },
  avoid: { zh: '时间序列（用 C02/T01）；正负混合（用 C04）。', en: 'Time series (use C02/T01); mixed signs (use C04).' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '类别名', en: 'Category' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '数值', en: 'Value' } }
  ],
  options: ['sort:"desc"|"asc"|"none"', 'highlight', 'top（只显示前 N，自动加注）', 'refLines:[{value:"median"|"mean"|数值}]'],
  keywords: { zh: ['排名', '排序', '对比', '条形图', '同业对标', 'TOP', '前十', '中位数', '份额排名'], en: ['ranking', 'bar chart', 'top 10', 'peer comparison', 'benchmark', 'median'] },
  aspect: 0.6,
  lint: function (s, add) {
    checkFields(s, add, [s.x, s.y]);
    var v = asArray(s.data).map(function (r) { return num(r[s.y]); }).filter(isNum);
    if (v.some(function (x) { return x < 0; }) && v.some(function (x) { return x > 0; })) add('warning', 'W_MIXED', '正负混合：建议改用 C04 正负条形图');
    if (asArray(s.data).length > 25 && !s.top) add('warning', 'W_ITEMS', '类别超过 25 个：设 top 截取并注明，或改用表格 K02');
  },
  render: function (c) {
    var s = c.spec, rows = catRows(c), hlist = asArray(s.highlight), dropped = 0;
    var peers = hlist.length ? rows.filter(function (r) { return hlist.indexOf(r.key) < 0; }) : rows, all = peers.map(function (r) { return r.v; });
    if (s.top && rows.length > s.top) { dropped = rows.length - s.top; rows = rows.slice(0, s.top); }
    var refs = asArray(s.refLines).map(function (rl) { var lab = refLabel(c, rl); if (hlist.length && rl.label == null && (rl.value === 'median' || rl.value === 'mean' || rl.value === 'average')) lab = (c.lang === 'en' ? 'Peer ' : '同业') + lab.toLowerCase(); return { v: resolveRef(rl.value, all), label: lab, color: rl.color, stat: typeof rl.value === 'string' }; }).filter(function (r) { return isNum(r.v); });
    if (hlist.length && refs.some(function (r) { return r.stat; })) c.notesExtra.push(c.lang === 'en' ? 'Peer statistics exclude ' + hlist.join(', ') + '.' : '同业统计不含' + hlist.join('、') + '。');
    var e = extent(rows.map(function (r) { return r.v; }).concat(refs.map(function (r) { return r.v; })));
    var labW = Math.max.apply(null, rows.map(function (r) { return textW(c.fmt(r.v), c.fs, 600); }).concat([20])) + 12;
    var F = frameBars(c, { keys: rows.map(function (r) { return r.key; }), lo: Math.min(0, e[0]), hi: Math.max(0, e[1]), unit: s.unit, right: labW, top: refs.length ? 14 : 0, axis: s.axis === true,
      grid: s.axis === true, labelWeight: function (k) { return asArray(s.highlight).indexOf(k) >= 0 ? 700 : 400; } });
    var marks = '', labels = '', hits = '';
    rows.forEach(function (r, i) {
      if (!isNum(r.v)) { labels += text(F.x(0) + 6, F.y.center(r.key), c.t('missing'), { baseline: 'middle', size: c.fs, fill: THEME.muted }); return; }
      var x0 = F.x(Math.min(0, r.v)), x1 = F.x(Math.max(0, r.v)), y = F.y(r.key);
      marks += rect(x0, y, x1 - x0, F.y.bw, { fill: barFill(c, r.key, i), crisp: true });
      var neg = r.v < 0, hl = asArray(s.highlight).indexOf(r.key) >= 0;
      labels += text(neg ? x0 - 6 : x1 + 6, F.y.center(r.key), c.fmt(r.v), { anchor: neg ? 'end' : 'start', baseline: 'middle', size: c.fs, weight: hl ? 700 : 400, fill: THEME.ink, halo: true });
      hits += hitRect(F.P.l, y, F.P.w, F.y.bw, r.key, [[labelOf(s, s.y), c.fmt(r.v)], [c.t('rank'), String(i + 1)]], rows.length <= 40);
    });
    refs.forEach(function (rf) {
      var xx = Math.round(F.x(rf.v)) + .5;
      marks += line(xx, F.P.t - 4, xx, F.P.b, { stroke: rf.color || THEME.zero, dash: '4 3', width: 1.2 });
      labels += text(xx, F.P.t - 8, rf.label + ' ' + c.fmt(rf.v), { anchor: xx > F.P.r - 60 ? 'end' : 'middle', size: c.fs, fill: rf.color || THEME.ink2, halo: true });
    });
    if (dropped) c.notesExtra.push(c.lang === 'en' ? 'Top ' + s.top + ' shown; ' + dropped + ' smaller items omitted.' : '仅显示前 ' + s.top + ' 项，其余 ' + dropped + ' 项未列示。');
    c.setTable([c.t('category'), labelOf(s, s.y)], rows.map(function (r) { return [r.key, c.fmt(r.v)]; }), rows.map(function (r) { return [r.key, r.v]; }));
    return { svg: F.under + marks + F.base + F.axes + labels + hits, height: F.H };
  }
});

/* ── C02 Column ──────────────────────────────────────────────────────── */
register({
  id: 'C02', name: { zh: '柱状图', en: 'Column chart' },
  question: { zh: '各期/各类的规模是多少，哪一期最高，预测期如何？', en: 'How large is each period or category, which is highest, what do estimates show?' },
  use: { zh: '≤16 个期间或短名称类别；年度/季度规模，支持 A/E 区分。', en: 'Up to 16 periods or short-named categories; annual/quarterly size with actual/estimate split.' },
  avoid: { zh: '类别名长（用 C01）；需要看连续走势（用 T01）。', en: 'Long category names (use C01); continuous trends (use T01).' },
  fields: [
    { key: 'x', role: 'category|time', required: true, desc: { zh: '期间或类别', en: 'Period or category' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '数值', en: 'Value' } }
  ],
  options: ['highlight', 'labels:"all"|"ends"|"none"', 'refLines', 'estimateFrom', 'cagr:{from,to}（在图上标注复合增速）'],
  keywords: { zh: ['柱状图', '年度', '季度', '规模', '各期', 'CAGR', '复合增速', '预测'], en: ['column chart', 'annual', 'quarterly', 'size', 'cagr', 'estimates'] },
  aspect: 0.5,
  lint: function (s, add) {
    checkFields(s, add, [s.x, s.y]);
    if (s.yMin != null && s.yMin > 0) add('error', 'E_BASELINE', '柱状图纵轴必须从 0 开始（不能设 yMin>0）');
    var xs = asArray(s.data).map(function (r) { return r[s.x]; }); checkEstOrder(s, add, xs, xs.map(isEstLabel));
    if (xs.length > 24) add('warning', 'W_ITEMS', '柱子超过 24 根：改用 T01 折线或按更粗粒度聚合');
  },
  render: function (c) {
    var s = c.spec, data = asArray(s.data), xs = data.map(function (r) { return r[s.x]; }), v = data.map(function (r) { return num(r[s.y]); }), flags = estFlags(c, xs);
    var refs = asArray(s.refLines).map(function (rl) { return { axis: 'value', value: resolveRef(rl.value, v), label: refLabel(c, rl), color: rl.color }; }).filter(function (r) { return isNum(r.value); });
    c.spec.refLines = refs;
    var e = extent(v.concat(refs.map(function (r) { return r.value; })));
    var F = frameXY(c, { x: { kind: 'band', keys: xs, inner: xs.length > 12 ? 0.25 : 0.38 }, y: { lo: Math.min(0, e[0]), hi: Math.max(0, e[1]), zero: true, unit: s.unit }, top: s.cagr ? 18 : 4 });
    var marks = '', labels = '', hits = '';
    var mode = s.labels || 'auto', fits = F.x.bw >= Math.max.apply(null, v.map(function (x) { return textW(c.fmt(x), c.fs); })) * 0.9;
    var iMax = v.indexOf(Math.max.apply(null, v.filter(isNum))), iMin = v.indexOf(Math.min.apply(null, v.filter(isNum)));
    xs.forEach(function (x, i) {
      if (!isNum(v[i])) return;
      var y0 = F.y(Math.max(0, v[i])), y1 = F.y(Math.min(0, v[i])), fill = barFill(c, String(x), i, flags[i]);
      var base = asArray(s.highlight).length && c.isDim(String(x)) ? THEME.dim : c.pal.primary;
      marks += rect(F.x(x), y0, F.x.bw, Math.max(1, y1 - y0), { fill: fill, stroke: flags[i] ? base : null, crisp: true });
      var show = mode === 'all' || (mode === 'auto' && fits) || ((mode === 'ends' || (mode === 'auto' && !fits)) && (i === xs.length - 1 || i === iMax || i === iMin || i === 0));
      if (mode !== 'none' && show) labels += text(F.x.center(x), v[i] >= 0 ? y0 - 5 : y1 + 13, c.fmt(v[i]), { anchor: 'middle', size: c.fs, fill: THEME.ink2, weight: asArray(s.highlight).indexOf(String(x)) >= 0 ? 700 : 400 });
      hits += hitRect(F.x(x), F.P.t, F.x.bw, F.P.h, xLabel(c, x) + (flags[i] ? ' (' + c.t('est') + ')' : ''), [[labelOf(s, s.y), c.fmt(v[i])]], xs.length <= 40);
    });
    if (s.cagr) {
      var a = xs.map(String).indexOf(String(s.cagr.from)), b = xs.map(String).indexOf(String(s.cagr.to));
      if (a >= 0 && b > a && v[a] > 0 && v[b] > 0) {
        var years = s.cagr.years || (b - a), g = (Math.pow(v[b] / v[a], 1 / years) - 1) * 100;
        var xa = F.x.center(xs[a]), xb = F.x.center(xs[b]), yy = F.P.t - 6;
        marks += path('M' + r2(xa) + ' ' + r2(F.y(v[a]) - 18) + 'L' + r2(xa) + ' ' + yy + 'L' + r2(xb) + ' ' + yy + 'L' + r2(xb) + ' ' + r2(F.y(v[b]) - 18), { stroke: THEME.ink2, width: 1 });
        labels += text((xa + xb) / 2, yy - 5, 'CAGR ' + fmtNum(g, { type: 'percent', decimals: 1, sign: g < 0 }, c.lang), { anchor: 'middle', size: c.fs, weight: 600, fill: THEME.ink, halo: true });
      }
    }
    var ov = overlays(c, F, xPosFactory(c, F, xs, false));
    if (flags.indexOf(true) >= 0) { c.addLegend(c.t('act'), c.pal.primary, 'bar'); c.addLegend(c.t('est'), c.pal.primary, 'est'); }
    c.setTable([c.t('period'), labelOf(s, s.y)], xs.map(function (x, i) { return [xLabel(c, x), c.fmt(v[i])]; }), xs.map(function (x, i) { return [x, v[i]]; }));
    return { svg: F.under + marks + F.base + ov.over + F.axes + labels + hits, height: F.H };
  }
});

/* ── C03 Grouped bars ────────────────────────────────────────────────── */
register({
  id: 'C03', name: { zh: '分组柱/条形图', en: 'Grouped bars' },
  question: { zh: '同一类别下，两到四个系列（今年 vs 去年、我方 vs 竞品）谁高谁低？', en: 'Within each category, how do 2–4 series (this year vs last, us vs peers) compare?' },
  use: { zh: '类别 ≤10、系列 2–4 的并列比较；horizontal:true 用于长类别名。', en: 'Side-by-side comparison of 2–4 series across ≤10 categories; horizontal:true for long names.' },
  avoid: { zh: '系列 >4（用 M01 或表格）；关心组成合计（用 S01）。', en: 'More than 4 series (use M01 or a table); when totals matter (use S01).' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '类别', en: 'Category' } },
    { key: 'y | series', role: 'measure[]', required: true, desc: { zh: '2–4 个系列（宽表）或 seriesBy + y（长表）', en: '2–4 series (wide) or seriesBy + y (long)' } }
  ],
  options: ['horizontal', 'labels', 'highlight（系列名）'],
  keywords: { zh: ['分组柱状图', '并列', '同比对比', '今年去年', '我方竞品', '多系列对比'], en: ['grouped bar', 'clustered', 'side by side', 'this year vs last'] },
  aspect: 0.5,
  lint: function (s, add) {
    checkFields(s, add, [s.x].concat(measureKeys(s)));
    var n = s.seriesBy ? uniq(asArray(s.data).map(function (r) { return r[s.seriesBy]; })).length : measureKeys(s).length;
    if (n < 2) add('error', 'E_SERIES', '分组柱需要至少 2 个系列；单系列用 C01/C02');
    if (n > 4) add('warning', 'W_SERIES', '系列超过 4 个：改用 M01 小多图或表格');
  },
  render: function (c) {
    var s = c.spec, m = measures(c), xs = m.xs, list = m.list;
    list.forEach(function (se, i) { se.color = c.color(se.name, i); c.addLegend(se.name, se.color, 'bar'); });
    var e = extent([].concat.apply([], list.map(function (se) { return se.values; })));
    var marks = '', labels = '', hits = '', F, n = list.length;
    if (s.horizontal) {
      var labW = Math.max.apply(null, [].concat.apply([], list.map(function (se) { return se.values.map(function (v) { return textW(c.fmt(v), c.fs); }); }))) + 12;
      F = frameBars(c, { keys: xs.map(String), lo: Math.min(0, e[0]), hi: Math.max(0, e[1]), unit: s.unit, right: labW, rowH: 16 * n + 14, inner: 0.22, axis: false, grid: false });
      var bh = F.y.bw / n;
      list.forEach(function (se, k) {
        se.values.forEach(function (v, i) {
          if (!isNum(v)) return;
          var y = F.y(String(xs[i])) + k * bh, x0 = F.x(Math.min(0, v)), x1 = F.x(Math.max(0, v));
          marks += rect(x0, y, x1 - x0, bh - 1, { fill: se.color, crisp: true });
          labels += text(v < 0 ? x0 - 5 : x1 + 5, y + bh / 2, c.fmt(v), { anchor: v < 0 ? 'end' : 'start', baseline: 'middle', size: c.fs, fill: THEME.ink2 });
        });
      });
      xs.forEach(function (x, i) { hits += hitRect(F.P.l, F.y(String(x)), F.P.w, F.y.bw, String(x), list.map(function (se) { return [se.name, c.fmt(se.values[i])]; }), xs.length <= 30); });
    } else {
      F = frameXY(c, { x: { kind: 'band', keys: xs, inner: 0.24 }, y: { lo: Math.min(0, e[0]), hi: Math.max(0, e[1]), zero: true, unit: s.unit }, top: 4 });
      var bw = F.x.bw / n, fits = bw >= Math.max.apply(null, [].concat.apply([], list.map(function (se) { return se.values.map(function (v) { return textW(c.fmt(v), 11); }); }))) - 2;
      list.forEach(function (se, k) {
        se.values.forEach(function (v, i) {
          if (!isNum(v)) return;
          var x0 = F.x(xs[i]) + k * bw, y0 = F.y(Math.max(0, v)), y1 = F.y(Math.min(0, v));
          marks += rect(x0, y0, bw - 1, Math.max(1, y1 - y0), { fill: se.color, crisp: true });
          if (s.labels !== 'none' && (s.labels === 'all' || fits)) labels += text(x0 + bw / 2, v >= 0 ? y0 - 4 : y1 + 12, c.fmt(v), { anchor: 'middle', size: 11, fill: THEME.ink2 });
        });
      });
      xs.forEach(function (x, i) { hits += hitRect(F.x(x), F.P.t, F.x.bw, F.P.h, xLabel(c, x), list.map(function (se) { return [se.name, c.fmt(se.values[i])]; }), xs.length <= 30); });
    }
    seriesTable(c, xs, list);
    return { svg: F.under + marks + F.base + F.axes + labels + hits, height: F.H };
  }
});

/* ── C04 Diverging bar ───────────────────────────────────────────────── */
register({
  id: 'C04', name: { zh: '正负条形图', en: 'Diverging bar' },
  question: { zh: '哪些项目增长、哪些下滑，幅度各多大？', en: 'Which items grew and which declined, and by how much?' },
  use: { zh: '同比变化、利润贡献、价格变动等有正有负的类别数值。', en: 'YoY changes, profit contribution, price moves — category values with both signs.' },
  avoid: { zh: '全部同号（用 C01）。', en: 'All values with the same sign (use C01).' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '类别', en: 'Category' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '有正有负的数值', en: 'Signed value' } }
  ],
  options: ['goodDirection:"up"|"down"（成本类设 down）', 'sort'],
  keywords: { zh: ['正负', '增减', '涨跌', '同比变化', '贡献', '盈亏', '变化幅度'], en: ['diverging', 'positive negative', 'change', 'gainers losers', 'contribution'] },
  aspect: 0.6,
  lint: function (s, add) { checkFields(s, add, [s.x, s.y]); },
  render: function (c) {
    var s = c.spec, rows = catRows(c), good = s.goodDirection === 'down' ? -1 : 1;
    var fmtS = { format: s.format, sign: true };
    var e = extent(rows.map(function (r) { return r.v; }));
    var labW = Math.max.apply(null, rows.map(function (r) { return textW(c.fmt(r.v, fmtS), c.fs, 600); }).concat([20])) + 12;
    // labels sit outside each bar: reserve room on both sides
    var F = frameBars(c, { keys: rows.map(function (r) { return r.key; }), lo: Math.min(0, e[0]), hi: Math.max(0, e[1]), unit: s.unit, right: labW, axis: false, grid: false });
    var marks = '', labels = '', hits = '';
    var negRoom = e[0] < 0 ? labW : 0;
    if (negRoom) { var sc = scaleLinear(F.xd.min, F.xd.max, F.P.l + negRoom, F.P.r); F.x = sc; F.base = line(Math.round(sc(0)) + .5, F.P.t - 2, Math.round(sc(0)) + .5, F.P.b + 2, { stroke: THEME.zero, width: THEME.stroke.zero }); }
    rows.forEach(function (r) {
      if (!isNum(r.v)) return;
      var x0 = F.x(Math.min(0, r.v)), x1 = F.x(Math.max(0, r.v)), col = r.v * good >= 0 ? THEME.good : THEME.bad;
      marks += rect(x0, F.y(r.key), Math.max(1, x1 - x0), F.y.bw, { fill: col, crisp: true });
      labels += text(r.v < 0 ? x0 - 5 : x1 + 5, F.y.center(r.key), c.fmt(r.v, fmtS), { anchor: r.v < 0 ? 'end' : 'start', baseline: 'middle', size: c.fs, weight: 600, fill: col });
      hits += hitRect(F.P.l, F.y(r.key), F.P.w, F.y.bw, r.key, [[labelOf(s, s.y), c.fmt(r.v, fmtS)]], rows.length <= 40);
    });
    c.addLegend(good > 0 ? c.t('increase') : c.t('decrease'), THEME.good, 'bar');
    c.addLegend(good > 0 ? c.t('decrease') : c.t('increase'), THEME.bad, 'bar');
    c.setTable([c.t('category'), labelOf(s, s.y)], rows.map(function (r) { return [r.key, c.fmt(r.v, fmtS)]; }), rows.map(function (r) { return [r.key, r.v]; }));
    return { svg: F.under + marks + F.base + F.axes + labels + hits, height: F.H };
  }
});

/* ── C05 Dumbbell ────────────────────────────────────────────────────── */
register({
  id: 'C05', name: { zh: '哑铃图（前后对比）', en: 'Dumbbell (before / after)' },
  question: { zh: '每个类别从 A 到 B 变了多少？差距在扩大还是收窄？', en: 'How far did each category move from A to B; is the gap widening?' },
  use: { zh: '类别 ≤15 的两期/两组对比（改版前后、我方 vs 行业）；强调差值。', en: 'Two-state comparison for up to 15 categories (before/after, us vs market), emphasising the gap.' },
  avoid: { zh: '超过两期（用 T01/T09）。', en: 'More than two states (use T01/T09).' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '类别', en: 'Category' } },
    { key: 'from / to', role: 'measure', required: true, desc: { zh: '起点与终点字段；names 给出两期名称', en: 'Start and end fields; names gives their labels' } }
  ],
  options: ['sort:"to"|"change"|"none"', 'goodDirection'],
  keywords: { zh: ['哑铃图', '前后对比', '改版前后', '差距', '两期', '提升幅度'], en: ['dumbbell', 'before after', 'gap', 'two states'] },
  aspect: 0.6,
  lint: function (s, add) { checkFields(s, add, [s.x, s.from, s.to]); },
  render: function (c) {
    var s = c.spec, data = asArray(s.data).slice(), good = s.goodDirection === 'down' ? -1 : 1;
    if (s.sort === 'change') data.sort(function (a, b) { return (num(b[s.to]) - num(b[s.from])) - (num(a[s.to]) - num(a[s.from])); });
    else if (s.sort !== 'none') data.sort(function (a, b) { return num(b[s.to]) - num(a[s.to]); });
    var keys = data.map(function (r) { return String(r[s.x]); });
    var e = extent([].concat(data.map(function (r) { return num(r[s.from]); }), data.map(function (r) { return num(r[s.to]); })));
    var chgFmt = { type: s.format.type === 'percent' ? 'pp' : s.format.type, decimals: s.format.decimals, sign: true };
    var labW = Math.max.apply(null, data.map(function (r) { return textW(fmtNum(num(r[s.to]) - num(r[s.from]), chgFmt, c.lang), c.fs, 600); })) + 16;
    var lo = s.zero === false || e[0] > e[1] * 0.5 ? e[0] - (e[1] - e[0]) * 0.08 : Math.min(0, e[0]);
    var F = frameBars(c, { keys: keys, lo: lo, hi: e[1], unit: s.unit, right: labW, axis: true, rowH: 28, zero: lo <= 0 });
    if (lo > 0) c.notesExtra.push(c.lang === 'en' ? 'Axis does not start at zero; read the gaps, not bar lengths.' : '横轴未从 0 开始：读两点间距，而非长度。');
    var fromName = labelOf(s, s.from), toName = labelOf(s, s.to), cFrom = THEME.faint, cTo = c.pal.primary;
    var marks = '', labels = '', hits = '';
    data.forEach(function (r) {
      var a = num(r[s.from]), b = num(r[s.to]), k = String(r[s.x]), cy = F.y.center(k);
      if (!isNum(a) || !isNum(b)) return;
      var d = b - a, col = d * good >= 0 ? THEME.good : THEME.bad;
      marks += line(F.x(a), cy, F.x(b), cy, { stroke: mix(col, '#FFFFFF', 0.35), width: 3 });
      marks += circle(F.x(a), cy, 5, { fill: '#FFFFFF', stroke: cFrom, width: 2 }) + circle(F.x(b), cy, 5.5, { fill: cTo });
      labels += text(F.P.r + 8, cy, fmtNum(d, chgFmt, c.lang), { baseline: 'middle', size: c.fs, weight: 600, fill: col });
      hits += hitRect(F.P.l, F.y(k), F.P.w, F.y.bw, k, [[fromName, c.fmt(a)], [toName, c.fmt(b)], [c.lang === 'en' ? 'Change' : '变化', fmtNum(d, chgFmt, c.lang)]], data.length <= 40);
    });
    c.addLegend(fromName, cFrom, 'outline'); c.addLegend(toName, cTo, 'dot');
    c.setTable([c.t('category'), fromName, toName], data.map(function (r) { return [String(r[s.x]), c.fmt(r[s.from]), c.fmt(r[s.to])]; }), data.map(function (r) { return [r[s.x], r[s.from], r[s.to]]; }));
    return { svg: F.under + marks + (F.base || '') + F.axes + labels + hits, height: F.H };
  }
});

/* ── C06 Bullet ──────────────────────────────────────────────────────── */
register({
  id: 'C06', name: { zh: '子弹图（实际 vs 目标）', en: 'Bullet chart (actual vs target)' },
  question: { zh: '各项指标完成了目标的多少，处于差/中/好哪个区间？', en: 'How far is each metric against target, and in which performance band?' },
  use: { zh: '预算达成、KPI 完成率、库存周转对标；同一单位的多行指标。', en: 'Budget attainment, KPI completion, benchmarks — several rows in one unit.' },
  avoid: { zh: '各行单位不同（拆成多张或用 K01）。', en: 'Rows in different units (split, or use K01).' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '指标名', en: 'Metric' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '实际值', en: 'Actual' } },
    { key: 'target', role: 'measure', required: true, desc: { zh: '目标值字段', en: 'Target field' } },
    { key: 'bands', role: 'list', required: false, desc: { zh: '区间阈值字段数组，如 ["poor","ok"]（第三档至轴末）', en: 'Threshold fields, e.g. ["poor","ok"] (last band runs to axis end)' } }
  ],
  options: ['bands', 'goodDirection'],
  keywords: { zh: ['子弹图', '目标达成', '预算完成', 'KPI', '完成率', '实际与目标'], en: ['bullet chart', 'target', 'budget attainment', 'kpi', 'actual vs plan'] },
  aspect: 0.4,
  lint: function (s, add) { checkFields(s, add, [s.x, s.y, s.target].concat(asArray(s.bands))); },
  render: function (c) {
    var s = c.spec, data = asArray(s.data), keys = data.map(function (r) { return String(r[s.x]); });
    var vals = []; data.forEach(function (r) { vals.push(num(r[s.y]), num(r[s.target])); asArray(s.bands).forEach(function (b) { vals.push(num(r[b])); }); });
    var e = extent(vals), labW = Math.max.apply(null, data.map(function (r) { return textW(c.fmt(r[s.y]) + ' / ' + fmtNum(num(r[s.y]) / num(r[s.target]) * 100, 'percent:0', c.lang), c.fs, 600); })) + 14;
    var F = frameBars(c, { keys: keys, lo: Math.min(0, e[0]), hi: e[1] * 1.04, unit: s.unit, right: labW, rowH: 34, inner: 0.3, grid: false, axis: true });
    var marks = '', labels = '', hits = '', shades = ['#C9CFD8', '#DCE1E7', '#EDF0F4'];
    data.forEach(function (r) {
      var k = String(r[s.x]), y = F.y(k), h = F.y.bw, a = num(r[s.y]), t = num(r[s.target]);
      var th = asArray(s.bands).map(function (b) { return num(r[b]); }).filter(isNum).concat([F.xd.max]);
      var prev = F.xd.min;
      th.forEach(function (v, j) { marks += rect(F.x(prev), y, F.x(v) - F.x(prev), h, { fill: shades[Math.min(j, 2)], crisp: true }); prev = v; });
      if (isNum(a)) marks += rect(F.x(Math.min(0, a)), y + h * 0.32, Math.abs(F.x(a) - F.x(0)), h * 0.36, { fill: c.pal.primary, crisp: true });
      if (isNum(t)) marks += line(Math.round(F.x(t)) + .5, y + 2, Math.round(F.x(t)) + .5, y + h - 2, { stroke: THEME.ink, width: 2.4 });
      var pct = isNum(a) && isNum(t) && t ? a / t * 100 : null;
      labels += text(F.P.r + 8, y + h / 2, c.fmt(a) + ' / ' + fmtNum(pct, 'percent:0', c.lang), { baseline: 'middle', size: c.fs, weight: 600, fill: pct != null && pct * (s.goodDirection === 'down' ? -1 : 1) >= (s.goodDirection === 'down' ? -100 : 100) ? THEME.good : THEME.ink });
      hits += hitRect(F.P.l, y, F.P.w, h, k, [[c.t('actual'), c.fmt(a)], [c.t('target'), c.fmt(t)], [c.lang === 'en' ? 'Attainment' : '达成率', fmtNum(pct, 'percent:1', c.lang)]], true);
    });
    c.addLegend(c.t('actual'), c.pal.primary, 'bar'); c.addLegend(c.t('target'), THEME.ink, 'line');
    if (asArray(s.bands).length) c.addLegend(c.lang === 'en' ? 'Performance bands' : '评价区间', '#D2D8E0', 'bar');
    c.setTable([c.t('item'), c.t('actual'), c.t('target'), c.lang === 'en' ? 'Attainment' : '达成率'], data.map(function (r) { var a = num(r[s.y]), t = num(r[s.target]); return [String(r[s.x]), c.fmt(a), c.fmt(t), fmtNum(t ? a / t * 100 : null, 'percent:1', c.lang)]; }));
    return { svg: marks + F.base + F.axes + labels + hits, height: F.H };
  }
});

/* ── C07 Range bar ───────────────────────────────────────────────────── */
register({
  id: 'C07', name: { zh: '区间条形图', en: 'Range bar' },
  question: { zh: '各对象的取值范围（最低–最高）在哪里，典型值和我方位置在哪？', en: 'Where does each item’s range sit, where is the typical value and our position?' },
  use: { zh: '竞品价格带、各站点配送时效区间、预测分歧（最低–最高 + 中位数）。', en: 'Competitor price ranges, delivery-time spans, forecast dispersion (min–max + median).' },
  avoid: { zh: '估值方法汇总（用 V01 足球场图）；只有单点值（用 C01）。', en: 'Valuation summaries (use V01); single values (use C01).' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '对象', en: 'Item' } },
    { key: 'low / high', role: 'measure', required: true, desc: { zh: '下限与上限字段', en: 'Low and high fields' } },
    { key: 'mid', role: 'measure', required: false, desc: { zh: '典型值（中位数/均值）字段', en: 'Typical value (median/mean)' } }
  ],
  options: ['refLines:[{value, label}]（如我方价格）', 'sort'],
  keywords: { zh: ['区间', '价格带', '最低最高', '范围', '分歧', '价格区间'], en: ['range', 'price band', 'min max', 'spread', 'dispersion'] },
  aspect: 0.6,
  lint: function (s, add) { checkFields(s, add, [s.x, s.low, s.high, s.mid]); asArray(s.data).forEach(function (r) { if (num(r[s.low]) > num(r[s.high])) add('error', 'E_RANGE_ORDER', '下限大于上限：' + r[s.x]); }); },
  render: function (c) {
    var s = c.spec, data = asArray(s.data).slice();
    if (s.sort !== 'none') data.sort(function (a, b) { return num(b[s.mid || s.high]) - num(a[s.mid || s.high]); });
    var keys = data.map(function (r) { return String(r[s.x]); }), refs = asArray(s.refLines);
    var e = extent([].concat(data.map(function (r) { return num(r[s.low]); }), data.map(function (r) { return num(r[s.high]); }), refs.map(function (r) { return num(r.value); })));
    var lo = e[0] > (e[1] - e[0]) * 0.6 ? e[0] - (e[1] - e[0]) * 0.1 : Math.min(0, e[0]);
    var F = frameBars(c, { keys: keys, lo: lo, hi: e[1], unit: s.unit, right: 16, rowH: 30, axis: true, top: refs.length ? 14 : 0, zero: lo <= 0, padL: 34 });
    var marks = '', labels = '', hits = '', col = c.pal.series[2];
    data.forEach(function (r) {
      var k = String(r[s.x]), y = F.y(k), h = F.y.bw, a = num(r[s.low]), b = num(r[s.high]), m = s.mid ? num(r[s.mid]) : null;
      if (!isNum(a) || !isNum(b)) return;
      var hl = asArray(s.highlight).indexOf(k) >= 0, cc = asArray(s.highlight).length ? (hl ? c.pal.primary : mix(col, '#FFFFFF', 0.3)) : col;
      marks += rect(F.x(a), y + h * 0.2, Math.max(2, F.x(b) - F.x(a)), h * 0.6, { fill: mix(cc, '#FFFFFF', 0.45), crisp: true });
      if (isNum(m)) marks += line(Math.round(F.x(m)) + .5, y + 1, Math.round(F.x(m)) + .5, y + h - 1, { stroke: THEME.ink, width: 2.2 });
      labels += text(F.x(a) - 5, y + h / 2, c.fmt(a), { anchor: 'end', baseline: 'middle', size: 11, fill: THEME.ink2 });
      labels += text(F.x(b) + 5, y + h / 2, c.fmt(b), { baseline: 'middle', size: 11, fill: THEME.ink2 });
      hits += hitRect(F.P.l, y, F.P.w, h, k, [[c.lang === 'en' ? 'Low' : '下限', c.fmt(a)], [c.lang === 'en' ? 'High' : '上限', c.fmt(b)]].concat(isNum(m) ? [[labelOf(s, s.mid), c.fmt(m)]] : []), data.length <= 40);
    });
    refs.forEach(function (rf) { var v = num(rf.value); if (!isNum(v)) return; var xx = Math.round(F.x(v)) + .5; marks += line(xx, F.P.t - 4, xx, F.P.b, { stroke: rf.color || c.pal.series[1], width: 1.6, dash: '4 3' }); labels += text(xx, F.P.t - 8, String(rf.label || '') + ' ' + c.fmt(v), { anchor: 'middle', size: c.fs, weight: 600, fill: rf.color || c.pal.series[1], halo: true }); });
    c.addLegend(c.lang === 'en' ? 'Low–high range' : '最低–最高区间', mix(col, '#FFFFFF', 0.45), 'bar');
    if (s.mid) c.addLegend(labelOf(s, s.mid), THEME.ink, 'line');
    c.setTable([c.t('item'), c.lang === 'en' ? 'Low' : '下限', c.lang === 'en' ? 'High' : '上限'].concat(s.mid ? [labelOf(s, s.mid)] : []), data.map(function (r) { return [String(r[s.x]), c.fmt(r[s.low]), c.fmt(r[s.high])].concat(s.mid ? [c.fmt(r[s.mid])] : []); }));
    return { svg: F.under + marks + (F.base || '') + F.axes + labels + hits, height: F.H };
  }
});
