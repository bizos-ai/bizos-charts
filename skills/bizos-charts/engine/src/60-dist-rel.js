/* 60-dist-rel — D01–D03 distributions and R01–R03 relationships.
   Statistics are computed from raw rows; the method is stated in notes. */

function fiveNum(vals) {
  var v = sortNum(vals);
  if (!v.length) return null;
  var q1 = quantile(v, 0.25), q3 = quantile(v, 0.75), iqr = q3 - q1, lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  var inside = v.filter(function (x) { return x >= lo && x <= hi; });
  return { n: v.length, min: v[0], max: v[v.length - 1], q1: q1, med: quantile(v, 0.5), q3: q3, mean: mean(v),
    wlo: inside.length ? inside[0] : q1, whi: inside.length ? inside[inside.length - 1] : q3,
    out: v.filter(function (x) { return x < lo || x > hi; }) };
}
function groupsOf(s) {
  var data = asArray(s.data), keys = s.x ? uniq(data.map(function (r) { return String(r[s.x]); })) : ['_all'];
  return keys.map(function (k) { return { key: k, vals: data.filter(function (r) { return !s.x || String(r[s.x]) === k; }).map(function (r) { return num(r[s.y]); }).filter(isNum) }; });
}

/* ── D01 Histogram ───────────────────────────────────────────────────── */
register({
  id: 'D01', name: { zh: '直方图', en: 'Histogram' },
  question: { zh: '数值集中在哪个区间，分布是否偏斜、有无长尾？', en: 'Where do values cluster; is the distribution skewed or long-tailed?' },
  use: { zh: '单变量分布：竞品价格、订单金额、配送时长、评分数（≥30 个样本）。', en: 'One-variable distributions: competitor prices, order values, delivery times (n ≥ 30).' },
  avoid: { zh: '样本 <30（用 D03 逐点）；多组比较（用 D02）。', en: 'Fewer than 30 observations (use D03); several groups (use D02).' },
  fields: [
    { key: 'y', role: 'measure', required: true, desc: { zh: '原始观测值字段（每行一个样本）', en: 'Raw observation field (one row per observation)' } }
  ],
  options: ['binWidth', 'bins（箱数）', 'marks:["median","mean"]'],
  keywords: { zh: ['直方图', '分布', '频数', '集中度', '偏态', '价格分布', '区间分布'], en: ['histogram', 'distribution', 'frequency', 'skew', 'price distribution'] },
  aspect: 0.5,
  lint: function (s, add) { checkFields(s, add, [s.y]); var n = asArray(s.data).filter(function (r) { return isNum(num(r[s.y])); }).length; if (n < 30) add('warning', 'W_SAMPLE', '样本 ' + n + ' 个 <30：直方图形状不稳定，改用 D03 点分布'); },
  render: function (c) {
    var s = c.spec, vals = sortNum(asArray(s.data).map(function (r) { return num(r[s.y]); })), n = vals.length;
    var lo = vals[0], hi = vals[n - 1], bw = num(s.binWidth);
    if (!bw) { var iqr = quantile(vals, 0.75) - quantile(vals, 0.25), fd = 2 * iqr / Math.cbrt(n); bw = s.bins ? (hi - lo) / s.bins : (fd > 0 ? fd : (hi - lo) / 10); bw = niceStep(bw * 10, 10); }
    var start = Math.floor(lo / bw) * bw, bins = [];
    for (var b = start; b <= hi + 1e-9 && bins.length < 200; b += bw) bins.push({ a: +b.toFixed(10), b: +(b + bw).toFixed(10), n: 0 });
    vals.forEach(function (v) { var i = Math.min(bins.length - 1, Math.floor((v - start) / bw + 1e-9)); bins[i].n++; });
    var mxN = Math.max.apply(null, bins.map(function (d) { return d.n; }));
    var F = frameXY(c, { x: { kind: 'linear', lo: bins[0].a, hi: bins[bins.length - 1].b, fmt: s.format, grid: false }, y: { lo: 0, hi: mxN, zero: true, unit: c.lang === 'en' ? 'Count' : '频数', fmt: 'integer' }, bottom: 16 });
    var marks = '', labels = '', hits = '';
    bins.forEach(function (d) {
      var x0 = F.x(d.a), x1 = F.x(d.b), y0 = F.y(d.n);
      if (d.n) marks += rect(x0, y0, x1 - x0, F.P.b - y0, { fill: c.pal.series[2], stroke: '#FFFFFF', strokeWidth: 1 });
      hits += hitRect(x0, F.P.t, x1 - x0, F.P.h, c.fmt(d.a) + ' – ' + c.fmt(d.b), [[c.lang === 'en' ? 'Count' : '频数', String(d.n)], [c.t('share'), fmtNum(d.n / n * 100, 'percent:1', c.lang)]], bins.length <= 40);
    });
    var st = fiveNum(vals), mk = asArray(s.marks || ['median']);
    mk.forEach(function (m, j) {
      var v = m === 'mean' ? st.mean : st.med, xx = Math.round(F.x(v)) + .5, col = m === 'mean' ? c.pal.series[1] : c.pal.primary;
      marks += line(xx, F.P.t, xx, F.P.b, { stroke: col, width: 1.6, dash: '4 3' });
      labels += text(xx + 4, F.P.t + 4 + j * 16, c.t(m === 'mean' ? 'mean' : 'median') + ' ' + c.fmt(v), { baseline: 'top', size: c.fs, weight: 600, fill: col, halo: true });
    });
    labels += text(F.P.r, F.H - 2, (s.xTitle || labelOf(s, s.y)) + (s.unit ? (c.lang === 'en' ? ' (' + s.unit + ')' : '（' + s.unit + '）') : ''), { anchor: 'end', size: c.fs, fill: THEME.muted });
    c.notesExtra.push((c.lang === 'en' ? 'n = ' : '样本数 n = ') + n + (c.lang === 'en' ? '; bin width ' : '；组距 ') + c.fmt(bw) + (c.lang === 'en' ? '.' : '。'));
    c.setTable([c.lang === 'en' ? 'Bin' : '区间', c.lang === 'en' ? 'Count' : '频数'], bins.map(function (d) { return [c.fmt(d.a) + '–' + c.fmt(d.b), String(d.n)]; }), bins.map(function (d) { return [d.a + '-' + d.b, d.n]; }));
    return { svg: F.under + marks + F.base + F.axes + labels + hits, height: F.H };
  }
});

/* ── D02 Box plot ────────────────────────────────────────────────────── */
register({
  id: 'D02', name: { zh: '箱线图', en: 'Box plot' },
  question: { zh: '几组数据的中位数、离散程度和异常值有何差异？', en: 'How do medians, spread and outliers differ across groups?' },
  use: { zh: '2–12 组的分布比较：各品类价格、各站点时效、各广告组 ACOS。', en: 'Comparing 2–12 group distributions: category prices, delivery times, ad-group ACOS.' },
  avoid: { zh: '每组样本 <10（用 D03 展示每个点）。', en: 'Groups with fewer than 10 observations (use D03).' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '组别', en: 'Group' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '原始观测值（长表，每行一个样本）', en: 'Raw observations (long format)' } }
  ],
  options: ['horizontal', 'highlight', 'sort:"median"'],
  keywords: { zh: ['箱线图', '分布比较', '中位数', '四分位', '离散', '异常值', '盒须图'], en: ['box plot', 'quartiles', 'median', 'spread', 'outliers'] },
  aspect: 0.55,
  lint: function (s, add) { checkFields(s, add, [s.x, s.y]); groupsOf(s).forEach(function (g) { if (g.vals.length < 10) add('warning', 'W_SAMPLE', '组 “' + g.key + '” 样本 ' + g.vals.length + ' 个 <10：改用 D03'); }); },
  render: function (c) {
    var s = c.spec, groups = groupsOf(s).map(function (g) { g.st = fiveNum(g.vals); return g; }).filter(function (g) { return g.st; });
    if (s.sort === 'median') groups.sort(function (a, b) { return b.st.med - a.st.med; });
    var all = [].concat.apply([], groups.map(function (g) { return [g.st.min, g.st.max]; })), e = extent(all);
    var keys = groups.map(function (g) { return g.key; }), marks = '', labels = '', hits = '', F;
    var colOf = function (k) { return asArray(s.highlight).length ? (c.isDim(k) ? THEME.faint : c.pal.primary) : c.pal.primary; };
    var lo = e[0] >= 0 && e[0] < e[1] * 0.3 ? 0 : e[0];
    F = frameXY(c, { x: { kind: 'band', keys: keys, inner: 0.5, labels: function (k) { var g = groups.filter(function (d) { return d.key === k; })[0]; return k + ' (n=' + g.st.n + ')'; } }, y: { lo: lo, hi: e[1], zero: lo === 0, unit: s.unit } });
    groups.forEach(function (g) {
      var st = g.st, x0 = F.x(g.key), w = F.x.bw, cx = x0 + w / 2, col = colOf(g.key);
      marks += line(cx, F.y(st.whi), cx, F.y(st.q3), { stroke: col, width: 1.2 }) + line(cx, F.y(st.q1), cx, F.y(st.wlo), { stroke: col, width: 1.2 });
      marks += line(cx - w * 0.25, F.y(st.whi), cx + w * 0.25, F.y(st.whi), { stroke: col, width: 1.2 }) + line(cx - w * 0.25, F.y(st.wlo), cx + w * 0.25, F.y(st.wlo), { stroke: col, width: 1.2 });
      marks += rect(x0, F.y(st.q3), w, F.y(st.q1) - F.y(st.q3), { fill: mix(col, '#FFFFFF', 0.78), stroke: col, strokeWidth: 1.2 });
      marks += line(x0, F.y(st.med), x0 + w, F.y(st.med), { stroke: col, width: 2.4 });
      st.out.forEach(function (o) { marks += circle(cx, F.y(o), 2.6, { fill: '#FFFFFF', stroke: col, width: 1.2 }); });
      labels += text(x0 + w + 4, F.y(st.med), c.fmt(st.med), { baseline: 'middle', size: 11, weight: 600, fill: col, halo: true });
      hits += hitRect(x0 - 6, F.P.t, w + 12, F.P.h, g.key, [['n', String(st.n)], [c.lang === 'en' ? 'Max (excl. outliers)' : '上须', c.fmt(st.whi)], ['Q3', c.fmt(st.q3)], [c.t('median'), c.fmt(st.med)], ['Q1', c.fmt(st.q1)], [c.lang === 'en' ? 'Min (excl. outliers)' : '下须', c.fmt(st.wlo)], [c.lang === 'en' ? 'Outliers' : '异常值', String(st.out.length)]], groups.length <= 30);
    });
    c.notesExtra.push(c.lang === 'en' ? 'Box = interquartile range; line = median; whiskers = 1.5 × IQR; circles = outliers.' : '箱体为四分位区间，粗线为中位数，须为 1.5 倍四分位距，圆点为异常值。');
    c.setTable([c.lang === 'en' ? 'Group' : '组别', 'n', c.lang === 'en' ? 'Min' : '最小', 'Q1', c.t('median'), 'Q3', c.lang === 'en' ? 'Max' : '最大', c.t('mean')], groups.map(function (g) { var t = g.st; return [g.key, String(t.n), c.fmt(t.min), c.fmt(t.q1), c.fmt(t.med), c.fmt(t.q3), c.fmt(t.max), c.fmt(t.mean)]; }));
    return { svg: F.under + marks + F.base + F.axes + labels + hits, height: F.H };
  }
});

/* ── D03 Strip / beeswarm ────────────────────────────────────────────── */
register({
  id: 'D03', name: { zh: '点分布图（蜂群）', en: 'Strip / beeswarm' },
  question: { zh: '每个样本落在哪里？我方/重点对象在分布中的位置如何？', en: 'Where does every observation fall, and where do the highlighted items sit?' },
  use: { zh: '小到中等样本（≤300/组）的逐点分布，可标注我方产品或异常点。', en: 'Point-level distributions for small to medium samples (≤300 per group), labelling our products or outliers.' },
  avoid: { zh: '样本很大（用 D01/D02）。', en: 'Very large samples (use D01/D02).' },
  fields: [
    { key: 'y', role: 'measure', required: true, desc: { zh: '数值', en: 'Value' } },
    { key: 'x', role: 'category', required: false, desc: { zh: '组别（可选）', en: 'Group (optional)' } },
    { key: 'label', role: 'category', required: false, desc: { zh: '点名称字段（用于 highlight 标注）', en: 'Point label field (for highlights)' } }
  ],
  options: ['highlight（点名称）', 'label'],
  keywords: { zh: ['点分布', '蜂群图', '散点分布', '逐点', '我方位置', '竞品分布'], en: ['beeswarm', 'strip plot', 'dot distribution', 'where we sit'] },
  aspect: 0.5,
  lint: function (s, add) { checkFields(s, add, [s.y, s.x, s.label]); },
  render: function (c) {
    var s = c.spec, data = asArray(s.data).filter(function (r) { return isNum(num(r[s.y])); }), groups = s.x ? uniq(data.map(function (r) { return String(r[s.x]); })) : [''];
    var e = extent(data.map(function (r) { return num(r[s.y]); })), hl = asArray(s.highlight);
    var labW = s.x ? Math.min(c.W * 0.26, Math.max.apply(null, groups.map(function (g) { return textW(g, c.fs, 600); })) + 14) : 10;
    var rowH = clamp(Math.round((c.height() - 50) / groups.length), 56, 120), top = 18, H = top + rowH * groups.length + 30, P = { l: labW, r: c.W - 14, t: top, b: top + rowH * groups.length };
    var xd = niceLinear(e[0], e[1], clamp(Math.floor((P.r - P.l) / 90), 3, 7), false), x = scaleLinear(xd.min, xd.max, P.l, P.r), out = '', hits = '', labs = '';
    xd.ticks.forEach(function (t) { var px = Math.round(x(t)) + .5; out += line(px, P.t, px, P.b, { stroke: THEME.grid }); out += text(px, P.b + 16, fmtTick(t, s.format, c.lang, xd.step), { anchor: 'middle', size: c.fs, fill: THEME.ink2 }); });
    if (s.unit) out += text(P.r, H - 2, (s.xTitle || labelOf(s, s.y)) + (c.lang === 'en' ? ' (' + s.unit + ')' : '（' + s.unit + '）'), { anchor: 'end', size: c.fs, fill: THEME.muted });
    var R = 3.6, placedLabels = [];
    groups.forEach(function (g, gi) {
      var rows = data.filter(function (r) { return !s.x || String(r[s.x]) === g; }).sort(function (a, b) { return num(a[s.y]) - num(b[s.y]); });
      var cy = P.t + rowH * (gi + 0.5), placed = [];
      if (s.x) out += text(P.l - 10, cy, g, { anchor: 'end', baseline: 'middle', size: c.fs, weight: 600, fill: THEME.ink });
      rows.forEach(function (r) {
        var px = x(num(r[s.y])), dy = 0, k = 0;
        while (k < 200) {
          var ok = placed.every(function (p) { return Math.hypot(p.x - px, p.y - (cy + dy)) >= R * 2 + 0.6; });
          if (ok && Math.abs(dy) < rowH / 2 - R) break;
          k++; dy = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (R * 0.9);
          if (Math.abs(dy) >= rowH / 2 - R) { dy = 0; break; }
        }
        var name = s.label ? String(r[s.label]) : '', isHl = hl.indexOf(name) >= 0;
        placed.push({ x: px, y: cy + dy });
        out += circle(px, cy + dy, isHl ? R + 1.6 : R, { fill: isHl ? c.pal.series[1] : mix(c.pal.primary, '#FFFFFF', 0.25), stroke: '#FFFFFF', width: 0.6, cls: 'bz-hit', data: tip(name || c.fmt(r[s.y]), [[labelOf(s, s.y), c.fmt(r[s.y])]].concat(s.x ? [[c.t('category'), g]] : [])) });
        if (isHl) placedLabels.push({ x: px, y: cy + dy, t: name + ' ' + c.fmt(r[s.y]) });
      });
      var vals = sortNum(rows.map(function (r) { return num(r[s.y]); })), md = median(vals);
      out += line(Math.round(x(md)) + .5, cy - rowH / 2 + 6, Math.round(x(md)) + .5, cy + rowH / 2 - 6, { stroke: THEME.ink, width: 1.6 });
      labs += text(x(md) + 4, cy - rowH / 2 + 8, c.t('median') + ' ' + c.fmt(md), { baseline: 'top', size: 11, fill: THEME.ink2, halo: true });
    });
    var medBoxes = [];
    labs = labs.replace(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]*)<\/text>/g, function (m0, x0, y0, t0) { medBoxes.push({ x0: +x0, x1: +x0 + textW(t0, 11), y0: +y0, y1: +y0 + 13 }); return m0; });
    placeBoxes(placedLabels.map(function (p) {
      var w = textW(p.t, c.fs, 700);
      return { p: p, avoid: medBoxes, options: [
        { x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y - 34, y1: p.y - 20, ty: p.y - 22, a: 'middle', ly: p.y - 18 },
        { x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y + 20, y1: p.y + 34, ty: p.y + 31, a: 'middle', ly: p.y + 18 },
        { x0: p.x + 8, x1: p.x + 8 + w, y0: p.y - 34, y1: p.y - 20, ty: p.y - 22, a: 'start', ly: p.y - 18 },
        { x0: p.x - 8 - w, x1: p.x - 8, y0: p.y + 20, y1: p.y + 34, ty: p.y + 31, a: 'end', ly: p.y + 18 }] };
    }), { x0: 0, x1: c.W, y0: 0, y1: H }).forEach(function (cd) {
      var p = cd.p, o = cd.chosen;
      labs += line(p.x, p.y + (o.ly > p.y ? 6 : -6), o.a === 'middle' ? p.x : (o.a === 'start' ? o.x0 : o.x1), o.ly, { stroke: c.pal.series[1] });
      labs += text(o.a === 'middle' ? p.x : o.a === 'start' ? o.x0 : o.x1, o.ty, p.t, { anchor: o.a, size: c.fs, weight: 700, fill: THEME.ink, halo: true });
    });
    if (hl.length) c.addLegend(c.lang === 'en' ? 'Highlighted' : '重点对象', c.pal.series[1], 'dot');
    c.notesExtra.push((c.lang === 'en' ? 'Each dot is one observation; n = ' : '每个点为一个样本；n = ') + data.length + (c.lang === 'en' ? '.' : '。'));
    c.setTable((s.label ? [c.t('item')] : []).concat(s.x ? [c.t('category')] : [], [labelOf(s, s.y)]), data.map(function (r) { return (s.label ? [String(r[s.label])] : []).concat(s.x ? [String(r[s.x])] : [], [c.fmt(r[s.y])]); }));
    return { svg: out + labs + hits, height: H };
  }
});

/* ── R01 / R02 / R03 shared scatter engine ──────────────────────────── */
function ols(xs, ys) {
  var n = xs.length; if (n < 3) return null;
  var mx = mean(xs), my = mean(ys), sxx = 0, sxy = 0, syy = 0;
  for (var i = 0; i < n; i++) { sxx += (xs[i] - mx) * (xs[i] - mx); sxy += (xs[i] - mx) * (ys[i] - my); syy += (ys[i] - my) * (ys[i] - my); }
  if (!sxx) return null;
  var b = sxy / sxx, a = my - b * mx;
  return { a: a, b: b, r2: syy ? (sxy * sxy) / (sxx * syy) : 0, n: n };
}
function scatterRender(c, mode) {
  var s = c.spec, data = asArray(s.data).filter(function (r) { return isNum(num(r[s.x])) && isNum(num(r[s.y])); });
  var xv = data.map(function (r) { return num(r[s.x]); }), yv = data.map(function (r) { return num(r[s.y]); });
  var xf = normFmt(s.xFormat || 'number'), yf = s.format, hl = asArray(s.highlight);
  var sizeMax = mode === 'bubble' || (mode === 'quadrant' && s.size) ? Math.max.apply(null, data.map(function (r) { return num(r[s.size]) || 0; })) : 0;
  var rMax = clamp(c.W / 26, 14, 30), rad = function (r) { return sizeMax ? Math.max(3, Math.sqrt((num(r[s.size]) || 0) / sizeMax) * rMax) : 5; };
  var ex = extent(xv), ey = extent(yv), padX = (ex[1] - ex[0]) * 0.06 || 1, padY = (ey[1] - ey[0]) * 0.08 || 1;
  if (sizeMax) { padX *= 1.8; padY *= 1.8; }
  var splitX = mode === 'quadrant' ? (s.xSplit === 'mean' ? mean(xv) : isNum(num(s.xSplit)) ? num(s.xSplit) : median(sortNum(xv))) : null;
  var splitY = mode === 'quadrant' ? (s.ySplit === 'mean' ? mean(yv) : isNum(num(s.ySplit)) ? num(s.ySplit) : median(sortNum(yv))) : null;
  var xlo = s.xZero ? Math.min(0, ex[0]) : (ex[0] >= 0 ? Math.max(0, ex[0] - padX) : ex[0] - padX), ylo = s.yZero ? Math.min(0, ey[0]) : (ey[0] >= 0 ? Math.max(0, ey[0] - padY) : ey[0] - padY);
  var xUnit = s.xUnit, yUnit = s.unit;
  var yTitle = (s.yTitle || labelOf(s, s.y)) + (yUnit ? (c.lang === 'en' ? ' (' + yUnit + ')' : '（' + yUnit + '）') : '');
  var xTitle = (s.xTitle || labelOf(s, s.x)) + (xUnit ? (c.lang === 'en' ? ' (' + xUnit + ')' : '（' + xUnit + '）') : '');
  var legendH = sizeMax ? 34 : 0;
  var F = frameXY(c, { height: c.height(0.62, 300, 480) + legendH, x: { kind: 'linear', lo: xlo, hi: ex[1] + padX, fmt: xf }, y: { lo: ylo, hi: ey[1] + padY, zero: false, unit: yTitle, fmt: yf }, bottom: 16 + legendH, right: 14 });
  var groups = s.group ? uniq(data.map(function (r) { return String(r[s.group]); })) : [];
  var colOf = function (r) {
    var name = s.label ? String(r[s.label]) : '';
    if (hl.length) return hl.indexOf(name) >= 0 ? c.pal.series[1] : mix(c.pal.primary, '#FFFFFF', 0.35);
    if (s.group) return c.color(String(r[s.group]), groups.indexOf(String(r[s.group])));
    return c.pal.primary;
  };
  var marks = '', labels = '', over = '';
  if (mode === 'quadrant') {
    var qx = F.x(splitX), qy = F.y(splitY);
    marks += line(qx, F.P.t, qx, F.P.b, { stroke: THEME.zero, dash: '4 3', width: 1.2 }) + line(F.P.l, qy, F.P.r, qy, { stroke: THEME.zero, dash: '4 3', width: 1.2 });
    var ql = asArray(s.quadrants).map(function (q) { return truncate(String(q), F.P.w / 2 - 10, c.fs, 700); });
    if (ql.length === 4) {
      over += text(F.P.r - 4, F.P.t + 4, String(ql[0]), { anchor: 'end', baseline: 'top', size: c.fs, weight: 700, fill: THEME.ink2 });
      over += text(F.P.l + 4, F.P.t + 4, String(ql[1]), { baseline: 'top', size: c.fs, weight: 700, fill: THEME.ink2 });
      over += text(F.P.l + 4, F.P.b - 6, String(ql[2]), { size: c.fs, weight: 700, fill: THEME.ink2 });
      over += text(F.P.r - 4, F.P.b - 6, String(ql[3]), { anchor: 'end', size: c.fs, weight: 700, fill: THEME.ink2 });
    }
    c.notesExtra.push((c.lang === 'en' ? 'Split lines at ' : '分界线：') + (s.xTitle || labelOf(s, s.x)) + ' ' + fmtNum(splitX, xf, c.lang) + (xUnit ? ' ' + xUnit : '') + (c.lang === 'en' ? ', ' : '，') + (s.yTitle || labelOf(s, s.y)) + ' ' + fmtNum(splitY, yf, c.lang) + (yUnit ? ' ' + yUnit : '') + (s.xSplit == null && s.ySplit == null ? (c.lang === 'en' ? ' (medians)' : '（中位数）') : ''));
  }
  var fit = s.fit ? ols(xv, yv) : null;
  if (fit) {
    var x0 = ex[0], x1 = ex[1];
    marks += line(F.x(x0), F.y(fit.a + fit.b * x0), F.x(x1), F.y(fit.a + fit.b * x1), { stroke: c.pal.series[1], width: 1.6, dash: '6 4' });
    c.addLegend(c.t('fit') + '  R² = ' + fit.r2.toFixed(2), c.pal.series[1], 'dash');
    c.notesExtra.push((c.lang === 'en' ? 'OLS fit: y = ' : '最小二乘拟合：y = ') + (+fit.b.toPrecision(3)) + 'x ' + (fit.a < 0 ? '− ' : '+ ') + Math.abs(+fit.a.toPrecision(3)) + '，R² = ' + fit.r2.toFixed(2) + '，n = ' + fit.n + (c.lang === 'en' ? '. Correlation, not causation.' : '；相关不代表因果。'));
  }
  var order = data.map(function (r, i) { return i; }).sort(function (a, b) { return rad(data[b]) - rad(data[a]); });
  var cands = [];
  order.forEach(function (i) {
    var r = data[i], px = F.x(xv[i]), py = F.y(yv[i]), rr = rad(r), col = colOf(r), name = s.label ? String(r[s.label]) : '';
    marks += circle(px, py, rr, { fill: col, fillOpacity: sizeMax ? 0.78 : 0.9, stroke: '#FFFFFF', width: 1, cls: 'bz-hit', data: tip(name || (c.fmt(xv[i], { format: xf }) + ', ' + c.fmt(yv[i])), [[labelOf(s, s.x), fmtNum(xv[i], xf, c.lang)], [labelOf(s, s.y), fmtNum(yv[i], yf, c.lang)]].concat(sizeMax ? [[labelOf(s, s.size), fmtNum(r[s.size], s.sizeFormat, c.lang)]] : []).concat(s.group ? [[c.t('category'), String(r[s.group])]] : [])) });
    if (name) {
      var isHl = hl.indexOf(name) >= 0, w = textW(name, c.fs, isHl ? 700 : 400);
      cands.push({ pri: isHl ? 0 : (sizeMax ? 1 : 2), name: name, isHl: isHl, px: px, py: py, w: w, options: [
        { x0: px + rr + 3, x1: px + rr + 3 + w, y0: py - 7, y1: py + 7, tx: px + rr + 3, ty: py, a: 'start' },
        { x0: px - rr - 3 - w, x1: px - rr - 3, y0: py - 7, y1: py + 7, tx: px - rr - 3, ty: py, a: 'end' },
        { x0: px - w / 2, x1: px + w / 2, y0: py - rr - 17, y1: py - rr - 3, tx: px, ty: py - rr - 9, a: 'middle' },
        { x0: px - w / 2, x1: px + w / 2, y0: py + rr + 3, y1: py + rr + 17, tx: px, ty: py + rr + 10, a: 'middle' }] });
    }
  });
  var limit = s.labels === 'all' ? 999 : (data.length <= 16 ? 999 : 10);
  cands.sort(function (a, b) { return a.pri - b.pri; });
  var circles = data.map(function (r, i) { var rr = rad(r), px = F.x(xv[i]), py = F.y(yv[i]); return { x0: px - rr, x1: px + rr, y0: py - rr, y1: py + rr }; });
  placeBoxes(cands.slice(0, limit).map(function (cd) { cd.avoid = sizeMax ? [] : circles.filter(function (b) { return !(b.x0 <= cd.px && b.x1 >= cd.px && b.y0 <= cd.py && b.y1 >= cd.py); }); return cd; }), { x0: F.P.l, x1: F.P.r + 10, y0: F.P.t - 4, y1: F.P.b }).forEach(function (cd) {
    labels += text(cd.chosen.tx, cd.chosen.ty, cd.name, { anchor: cd.chosen.a, baseline: 'middle', size: c.fs, weight: cd.isHl ? 700 : 400, fill: cd.isHl ? THEME.ink : THEME.ink2, halo: true });
  });
  labels += text(F.P.r, F.P.b + 34, xTitle, { anchor: 'end', size: c.fs, fill: THEME.muted });
  if (s.group && !hl.length) groups.forEach(function (gname, i) { c.addLegend(gname, c.color(gname, i), 'dot'); });
  if (sizeMax) {
    var e10 = Math.pow(10, Math.floor(Math.log10(sizeMax))), ref = [8, 6, 5, 4, 3, 2.5, 2, 1].map(function (m) { return m * e10; }).filter(function (v) { return v <= sizeMax; })[0] || sizeMax;
    var refs = [ref, ref / 4], lx = 0, ly = F.P.b + 48;
    var ttl = (c.lang === 'en' ? 'Bubble area: ' : '气泡面积：') + labelOf(s, s.size) + (s.sizeUnit ? (c.lang === 'en' ? ' (' + s.sizeUnit + ')' : '（' + s.sizeUnit + '）') : '');
    over += text(lx, ly + 6, ttl, { baseline: 'middle', size: 11, fill: THEME.muted });
    lx += textW(ttl, 11) + 12;
    refs.forEach(function (v) { var rr = Math.sqrt(v / sizeMax) * rMax; over += circle(lx + rr, ly + 6, Math.min(rr, 14), { stroke: THEME.faint, width: 1 }); lx += Math.min(rr, 14) * 2 + 4; over += text(lx, ly + 6, fmtNum(v, s.sizeFormat, c.lang), { baseline: 'middle', size: 11, fill: THEME.muted }); lx += textW(fmtNum(v, s.sizeFormat, c.lang), 11) + 14; });
    if (Math.sqrt(refs[0] / sizeMax) * rMax > 14) c.notesExtra.push(c.lang === 'en' ? 'Size key is drawn at reduced scale.' : '气泡图例按缩小比例绘制。');
    c.notesExtra.push(c.lang === 'en' ? 'Bubble area is proportional to ' + labelOf(s, s.size) + '.' : '气泡面积与' + labelOf(s, s.size) + '成正比。');
  }
  if (hl.length) c.addLegend(c.lang === 'en' ? 'Highlighted' : '重点对象', c.pal.series[1], 'dot');
  var head = (s.label ? [c.t('item')] : []).concat([labelOf(s, s.x), labelOf(s, s.y)], sizeMax ? [labelOf(s, s.size)] : [], s.group ? [c.t('category')] : []);
  c.setTable(head, data.map(function (r, i) { return (s.label ? [String(r[s.label])] : []).concat([fmtNum(xv[i], xf, c.lang), fmtNum(yv[i], yf, c.lang)], sizeMax ? [fmtNum(r[s.size], s.sizeFormat, c.lang)] : [], s.group ? [String(r[s.group])] : []); }), data.map(function (r, i) { return (s.label ? [r[s.label]] : []).concat([xv[i], yv[i]], sizeMax ? [num(r[s.size])] : [], s.group ? [r[s.group]] : []); }));
  return { svg: F.under + marks + F.base + over + F.axes + labels, height: F.H };
}
function scatterLint(s, add, needSize) {
  checkFields(s, add, [s.x, s.y, s.label, s.group].concat(needSize ? [s.size] : []));
  if (!s.xUnit && !NO_UNIT_TYPES[normFmt(s.xFormat).type]) add('error', 'E_UNIT', '散点图横轴缺少单位 xUnit（或 xFormat: percent/multiple）');
  if (needSize && asArray(s.data).some(function (r) { return num(r[s.size]) < 0; })) add('error', 'E_NEG_SIZE', '气泡大小不能为负');
  if (asArray(s.data).length < 5) add('warning', 'W_SAMPLE', '点数 <5：考虑用表格或 C05');
}
register({
  id: 'R01', name: { zh: '散点图（含回归）', en: 'Scatter (with fit)' },
  question: { zh: '两个指标是否相关？谁偏离了整体规律？', en: 'Are two metrics related, and who deviates from the pattern?' },
  use: { zh: '估值与增速（EV/EBITDA vs 增速）、价格与销量、评分与转化等两指标关系；fit:true 给出回归线与 R²。', en: 'Valuation vs growth, price vs volume, rating vs conversion; fit:true adds an OLS line and R².' },
  avoid: { zh: '时间序列（用 T01）；点 <5。', en: 'Time series (use T01); fewer than 5 points.' },
  fields: [
    { key: 'x / y', role: 'measure', required: true, desc: { zh: '横轴与纵轴指标（xUnit / unit 必填）', en: 'X and Y metrics (xUnit / unit required)' } },
    { key: 'label', role: 'category', required: false, desc: { zh: '点名称', en: 'Point label' } },
    { key: 'group', role: 'category', required: false, desc: { zh: '分组着色（≤6 组）', en: 'Colour group (≤6)' } }
  ],
  options: ['fit', 'highlight', 'xFormat', 'labels:"all"', 'xZero/yZero'],
  keywords: { zh: ['散点图', '相关性', '回归', '估值与增速', '价格与销量', '关系', 'R方'], en: ['scatter', 'correlation', 'regression', 'valuation vs growth', 'relationship'] },
  aspect: 0.62,
  lint: function (s, add) { scatterLint(s, add, false); },
  render: function (c) { return scatterRender(c, 'scatter'); }
});
register({
  id: 'R02', name: { zh: '气泡图', en: 'Bubble chart' },
  question: { zh: '在两个指标定位之外，第三个指标（规模）有多大？', en: 'Beyond position on two metrics, how big is each item on a third?' },
  use: { zh: '品牌/类目在“增速 × 利润率”上的位置 + 规模（面积 = 销售额）。', en: 'Brands or categories by growth × margin with size (area = sales).' },
  avoid: { zh: '规模差异需要精确比较（面积难精读，配表格）；点 >30。', en: 'When sizes need precise comparison (areas read poorly); more than 30 points.' },
  fields: [
    { key: 'x / y', role: 'measure', required: true, desc: { zh: '定位指标（xUnit / unit 必填）', en: 'Position metrics (xUnit / unit required)' } },
    { key: 'size', role: 'measure', required: true, desc: { zh: '气泡面积指标（非负，面积 ∝ 数值）', en: 'Size metric (non-negative; area ∝ value)' } },
    { key: 'label', role: 'category', required: false, desc: { zh: '名称', en: 'Label' } }
  ],
  options: ['sizeUnit', 'sizeFormat', 'highlight', 'group'],
  keywords: { zh: ['气泡图', '三维', '规模', '增速与利润率', '品类定位'], en: ['bubble chart', 'three variables', 'size', 'growth vs margin'] },
  aspect: 0.62,
  lint: function (s, add) { scatterLint(s, add, true); if (asArray(s.data).length > 30) add('warning', 'W_ITEMS', '气泡超过 30 个：重叠严重，改用 R01 或筛选'); },
  render: function (c) { return scatterRender(c, 'bubble'); }
});
register({
  id: 'R03', name: { zh: '四象限矩阵（2×2）', en: 'Quadrant matrix (2×2)' },
  question: { zh: '按两个维度把对象分成四类，各自该采取什么策略？', en: 'Which of four strategic quadrants does each item fall into on two dimensions?' },
  use: { zh: '产品组合（增速 × 份额）、关键词（搜索量 × 转化）、SKU（毛利 × 动销）的分层管理；分界线默认取中位数。', en: 'Portfolio triage: growth × share, keyword volume × conversion, SKU margin × velocity; splits default to medians.' },
  avoid: { zh: '分界线没有业务含义且未说明；点 <8。', en: 'Unjustified split lines; fewer than 8 items.' },
  fields: [
    { key: 'x / y', role: 'measure', required: true, desc: { zh: '两个分类维度', en: 'Two dimensions' } },
    { key: 'label', role: 'category', required: false, desc: { zh: '名称', en: 'Label' } },
    { key: 'size', role: 'measure', required: false, desc: { zh: '可选气泡大小', en: 'Optional bubble size' } }
  ],
  options: ['xSplit / ySplit（数值、"mean" 或默认中位数）', 'quadrants:[右上, 左上, 左下, 右下]', 'highlight'],
  keywords: { zh: ['四象限', '2x2', '矩阵', '波士顿矩阵', '分层', '象限分析', 'SKU分层', '关键词分层'], en: ['quadrant', '2x2 matrix', 'growth share matrix', 'segmentation', 'triage'] },
  aspect: 0.66,
  lint: function (s, add) { scatterLint(s, add, false); if (asArray(s.quadrants).length && asArray(s.quadrants).length !== 4) add('error', 'E_QUADRANTS', 'quadrants 需要 4 个标签：右上、左上、左下、右下'); },
  render: function (c) { return scatterRender(c, 'quadrant'); }
});
