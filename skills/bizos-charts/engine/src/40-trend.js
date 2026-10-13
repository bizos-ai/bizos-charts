/* 40-trend — T01–T11: lines, areas, bar+rate combo, rebased index, fan,
   candlestick, valuation band, calendar, slope, rank and seasonality. */

/* ── T01 Line ────────────────────────────────────────────────────────── */
register({
  id: 'T01', name: { zh: '折线图', en: 'Line chart' },
  question: { zh: '指标随时间怎样变化？多条序列谁快谁慢、何时拐头？', en: 'How does a metric move over time, and which series turns first?' },
  use: { zh: '连续期间的走势、多序列对比（≤6 条）、实际与预测衔接。', en: 'Trends over continuous periods, up to 6 series, actual-to-forecast continuity.' },
  avoid: { zh: '不连续的类别比较（用 C01/C02）；序列 >6 条且无主角（用 M01 小多图或高亮）。', en: 'Unordered categories (use C01/C02); >6 series without a focus (use M01 or highlight).' },
  fields: [
    { key: 'x', role: 'time', required: true, desc: { zh: '期间：YYYY / YYYY-MM / YYYY-MM-DD / 2025Q1 / 2026E', en: 'Period: YYYY / YYYY-MM / YYYY-MM-DD / 2025Q1 / 2026E' } },
    { key: 'y | series', role: 'measure[]', required: true, desc: { zh: '一个或多个数值字段（宽表）；或 seriesBy + y（长表）', en: 'One or more numeric fields (wide), or seriesBy + y (long)' } }
  ],
  options: ['highlight', 'endLabels', 'markers', 'zero', 'scale:"log"', 'refLines', 'bands', 'annotations', 'estimateFrom'],
  keywords: { zh: ['趋势', '走势', '变化', '折线', '时间序列', '月度', '日度', '周度', '增长', '波动', '拐点', '预测'], en: ['trend', 'over time', 'line', 'time series', 'monthly', 'daily', 'growth', 'turning point', 'forecast'] },
  aspect: 0.5,
  lint: function (s, add) {
    var keys = measureKeys(s); checkFields(s, add, [s.x].concat(keys));
    var n = s.seriesBy ? uniq(asArray(s.data).map(function (r) { return r[s.seriesBy]; })).length : keys.length;
    if (n > 6 && !asArray(s.highlight).length) add('warning', 'W_SERIES', n + ' 条序列且无 highlight：改用 M01 小多图或指定主角');
    if (s.scale === 'log') { var neg = asArray(s.data).some(function (r) { return keys.some(function (k) { return isNum(r[k]) && r[k] <= 0; }); }); if (neg) add('error', 'E_LOG', '对数刻度不能包含 ≤0 的数值'); }
    var xs = asArray(s.data).map(function (r) { return r[s.x]; });
    if (!s.seriesBy) checkEstOrder(s, add, xs, xs.map(function (x) { return isEstLabel(x); }));
  },
  render: function (c) {
    var s = c.spec, m = measures(c), xs = m.xs, list = m.list, flags = estFlags(c, xs);
    var isTime = xs.length > 1 && xs.every(function (x) { return ISO_DAY.test(String(x)); });
    var dom = lineDomain(c, list);
    list.forEach(function (se, i) { se.color = c.color(se.name, i); se.dim = c.isDim(se.name); });
    var lastIdx = function (se) { for (var i = se.values.length - 1; i >= 0; i--) if (isNum(se.values[i])) return i; return -1; };
    var useEnd = s.endLabels !== false && list.length <= 6;
    var endTexts = list.map(function (se) { var li = lastIdx(se); return li < 0 ? '' : (list.length > 1 ? se.name + ' ' : '') + c.fmt(se.values[li]); });
    var endW = useEnd ? Math.max.apply(null, endTexts.map(function (t) { return textW(t, c.fs, 600); }).concat([0])) + 14 : 10;
    if (endW > c.W * 0.34) { useEnd = false; endW = 10; }
    var F = frameXY(c, { x: isTime ? { kind: 'time', t0: parseDay(xs[0]), t1: parseDay(xs[xs.length - 1]) } : { kind: 'point', keys: xs }, y: { lo: dom.lo, hi: dom.hi, zero: dom.zero, unit: s.unit, log: s.scale === 'log' }, right: endW });
    var X = function (i) { return isTime ? F.x(parseDay(xs[i])) : F.x.center(xs[i]); };
    var xPos = xPosFactory(c, F, xs, isTime);
    var ov = overlays(c, F, xPos);
    var marks = '', labels = '', hits = '';
    var showMarkers = s.markers != null ? !!s.markers : xs.length <= 12;
    var order = list.slice().sort(function (a, b) { return (a.dim ? 0 : 1) - (b.dim ? 0 : 1); });
    order.forEach(function (se) {
      var pts = se.values.map(function (v, i) { return isNum(v) ? [X(i), F.y(v)] : null; });
      var parts = estPaths(pts, flags), w = se.dim ? THEME.stroke.lineThin : THEME.stroke.line;
      marks += path(polyline(parts.a), { stroke: se.color, width: w });
      if (parts.e.length) marks += path(polyline(parts.e), { stroke: se.color, width: w, dash: '5 4' });
      if (showMarkers && !se.dim) pts.forEach(function (p, i) { if (p) marks += circle(p[0], p[1], 3.2, { fill: flags[i] ? '#FFFFFF' : se.color, stroke: se.color, width: 1.5 }); });
    });
    if (useEnd) {
      var items = list.map(function (se, k) { var li = lastIdx(se); return li < 0 ? null : { y: F.y(se.values[li]), x: X(li), se: se, text: endTexts[k] }; }).filter(Boolean);
      spread(items, 15, F.P.t + 4, F.P.b - 2);
      items.forEach(function (it) { labels += text(F.P.r + 8, it.y, it.text, { baseline: 'middle', size: c.fs, weight: it.se.dim ? 400 : 600, fill: it.se.dim ? THEME.muted : it.se.color }); });
    }
    if (!useEnd) list.forEach(function (se) { c.addLegend(se.name, se.color, 'line'); });
    if (s.labels === 'all' && list.length <= 2 && xs.length <= 14) list.forEach(function (se) {
      se.values.forEach(function (v, i) { if (isNum(v)) labels += text(X(i), F.y(v) - 9, c.fmt(v), { anchor: 'middle', size: c.fs, fill: THEME.ink2, halo: true }); });
    });
    if (flags.indexOf(true) > 0) { marks += estDivider(c, F, xs, flags, X); }
    var step = xs.length > 1 ? Math.abs(X(1) - X(0)) : F.P.w;
    xs.forEach(function (x, i) {
      var cx = X(i);
      hits += hitRect(cx - step / 2, F.P.t, step, F.P.h, xLabel(c, x) + (flags[i] ? ' (' + c.t('est') + ')' : ''), list.map(function (se) { return [se.name, c.fmt(se.values[i])]; }), xs.length <= 60);
    });
    if (s.scale === 'log') c.notesExtra.push(c.t('logScale'));
    seriesTable(c, xs, list);
    return { svg: ov.under + F.under + F.base + marks + ov.over + F.axes + labels + hits, height: F.H };
  }
});

/* ── T02 Area / stacked area ─────────────────────────────────────────── */
register({
  id: 'T02', name: { zh: '面积图 / 堆积面积', en: 'Area / stacked area' },
  question: { zh: '总量如何随时间变化，各组成部分各贡献多少？结构是否迁移？', en: 'How does a total evolve and which components drive it; is the mix shifting?' },
  use: { zh: '单一存量走势；2–6 个组成部分随时间的堆积；percent:true 看结构占比迁移。', en: 'A single stock over time; 2–6 stacked components; percent:true for mix shift.' },
  avoid: { zh: '组成部分有负值（用 S01 或 C04）；需精确比较中间层（用 T01 或 M01）。', en: 'Components with negatives (use S01/C04); precise reading of middle layers (use T01/M01).' },
  fields: [
    { key: 'x', role: 'time', required: true, desc: { zh: '期间或日期', en: 'Period or date' } },
    { key: 'y | series', role: 'measure[]', required: true, desc: { zh: '组成部分字段（非负）', en: 'Component fields (non-negative)' } }
  ],
  options: ['stack(默认多序列堆积)', 'percent', 'refLines', 'bands'],
  keywords: { zh: ['面积', '堆积', '构成变化', '结构迁移', '占比变化', '存量'], en: ['area', 'stacked area', 'mix shift', 'composition over time'] },
  aspect: 0.5,
  lint: function (s, add) {
    var keys = measureKeys(s); checkFields(s, add, [s.x].concat(keys));
    if (s.stack !== false && keys.length > 1 || s.percent) {
      var neg = asArray(s.data).some(function (r) { return keys.some(function (k) { return isNum(r[k]) && r[k] < 0; }); });
      if (neg) add('error', 'E_NEG_STACK', '堆积面积不能包含负值');
    }
    if (keys.length > 6 && !s.seriesBy) add('warning', 'W_SERIES', '组成部分超过 6 个：合并长尾为“其他”');
  },
  render: function (c) {
    var s = c.spec, m = measures(c), xs = m.xs, list = m.list, flags = estFlags(c, xs);
    var isTime = xs.length > 1 && xs.every(function (x) { return ISO_DAY.test(String(x)); });
    var stack = list.length > 1 && s.stack !== false, pct = !!s.percent;
    var tot = xs.map(function (_, i) { return sum(list, function (se) { return se.values[i]; }); });
    var vals = list.map(function (se) { return se.values.map(function (v, i) { return pct ? (tot[i] ? (v || 0) / tot[i] * 100 : null) : v; }); });
    var hi = stack ? Math.max.apply(null, xs.map(function (_, i) { return sum(vals, function (v) { return v[i]; }); })) : extent([].concat.apply([], vals))[1];
    var fmtA = pct ? normFmt('percent:0') : s.format;
    var F = frameXY(c, { x: isTime ? { kind: 'time', t0: parseDay(xs[0]), t1: parseDay(xs[xs.length - 1]) } : { kind: 'point', keys: xs, pad: 0 }, y: { lo: 0, hi: pct ? 100 : hi, zero: true, unit: pct ? '%' : s.unit, fmt: fmtA, fixedMax: pct ? 100 : null }, right: stack ? Math.min(c.W * 0.28, 16 + Math.max.apply(null, list.map(function (se) { return textW(se.name, c.fs, 600); }))) : 12 });
    var X = function (i) { return isTime ? F.x(parseDay(xs[i])) : F.x.center(xs[i]); };
    var ov = overlays(c, F, xPosFactory(c, F, xs, isTime));
    var marks = '', labels = '', base = xs.map(function () { return 0; });
    var labelItems = [];
    list.forEach(function (se, k) {
      var col = c.color(se.name, k), top = [], bot = [];
      xs.forEach(function (_, i) {
        var v = vals[k][i];
        if (!isNum(v)) { top.push(null); bot.push(null); return; }
        var b0 = stack ? base[i] : 0, b1 = b0 + v;
        top.push([X(i), F.y(b1)]); bot.push([X(i), F.y(b0)]);
        if (stack) base[i] = b1;
      });
      var d = '', seg = [];
      var flush = function () { if (seg.length > 1) { d += 'M' + seg.map(function (p) { return r2(p[0]) + ' ' + r2(p[1]); }).join('L') + 'L' + seg.slice().reverse().map(function (p) { return r2(p[0]) + ' ' + r2(p[2]); }).join('L') + 'Z'; } seg = []; };
      top.forEach(function (p, i) { if (p) seg.push([p[0], p[1], bot[i][1]]); else flush(); });
      flush();
      marks += path(d, { fill: stack ? col : mix(col, '#FFFFFF', 0.82), stroke: stack ? '#FFFFFF' : null, width: 0.8 });
      if (!stack) marks += path(polyline(top), { stroke: col, width: THEME.stroke.line });
      c.addLegend(se.name, col, stack ? 'bar' : 'line');
      var li = top.length - 1; while (li >= 0 && !top[li]) li--;
      if (stack && li >= 0) labelItems.push({ y: (top[li][1] + bot[li][1]) / 2, text: se.name, color: col });
    });
    if (stack) { spread(labelItems, 15, F.P.t + 4, F.P.b - 4); labelItems.forEach(function (it) { labels += text(F.P.r + 8, it.y, it.text, { baseline: 'middle', size: c.fs, weight: 600, fill: it.color }); }); c.legend = []; }
    if (flags.indexOf(true) > 0) marks += estDivider(c, F, xs, flags, X);
    var hits = '', step = xs.length > 1 ? Math.abs(X(1) - X(0)) : F.P.w;
    xs.forEach(function (x, i) { hits += hitRect(X(i) - step / 2, F.P.t, step, F.P.h, xLabel(c, x), list.map(function (se, k) { return [se.name, pct ? fmtNum(vals[k][i], 'percent', c.lang) : c.fmt(se.values[i])]; }).concat(stack && !pct ? [[c.t('total'), c.fmt(tot[i])]] : []), xs.length <= 60); });
    seriesTable(c, xs, list);
    if (pct) c.notesExtra.push(c.lang === 'en' ? 'Shares of the period total; each period sums to 100%.' : '各期合计为 100%，面积表示占比。');
    return { svg: ov.under + F.under + marks + F.base + ov.over + F.axes + labels + hits, height: F.H };
  }
});

/* ── T03 Bars + rate line (dual axis) ────────────────────────────────── */
function lineKeys(s) { return asArray(s.lines || s.line).map(function (d) { return typeof d === 'string' ? d : (d.key || d.field); }); }
function barKeys(s) { return asArray(s.bars || s.bar).map(function (d) { return typeof d === 'string' ? d : (d.key || d.field); }); }
register({
  id: 'T03', name: { zh: '柱线组合（规模 + 增速）', en: 'Bars + rate line (dual axis)' },
  question: { zh: '规模在增长吗？增速/利润率在加速还是放缓？', en: 'Is the business growing, and is growth or margin accelerating?' },
  use: { zh: '研报标准“营收及同比增速”“利润及利润率”。左轴绝对额（柱），右轴比率（线）。', en: 'The standard “revenue and YoY growth” or “profit and margin” exhibit: absolute bars on the left axis, a rate on the right.' },
  avoid: { zh: '两个同单位指标（用 C03 或 T01）；右轴不是比率/倍数/指数。', en: 'Two metrics in the same unit (use C03/T01); a right-axis metric that is not a rate, multiple or index.' },
  fields: [
    { key: 'x', role: 'time', required: true, desc: { zh: '期间，可含 E 预测期', en: 'Period, estimates allowed (E)' } },
    { key: 'bars', role: 'measure[]', required: true, desc: { zh: '1–3 个绝对额字段（左轴，单位 unit）', en: '1–3 absolute fields (left axis, unit)' } },
    { key: 'line | lines', role: 'measure[]', required: true, desc: { zh: '1–2 个比率字段（右轴，lineFormat: percent/pp/multiple/index）', en: '1–2 rate fields (right axis, lineFormat percent/pp/multiple/index)' } }
  ],
  options: ['lineFormat', 'lineUnit', 'barLabels', 'lineLabels', 'estimateFrom'],
  keywords: { zh: ['营收及增速', '同比增速', '利润率', '双轴', '柱线', '规模与增速', '毛利率', '营业收入', '净利润'], en: ['revenue and growth', 'yoy', 'margin', 'dual axis', 'combo', 'bar and line'] },
  aspect: 0.5,
  lint: function (s, add) {
    var b = barKeys(s), l = lineKeys(s);
    checkFields(s, add, [s.x].concat(b, l));
    if (!b.length || b.length > 3) add('error', 'E_BARS', 'bars 需要 1–3 个字段');
    if (!l.length || l.length > 2) add('error', 'E_LINES', 'line/lines 需要 1–2 个字段');
    var lf = normFmt(s.lineFormat || 'percent');
    if (!NO_UNIT_TYPES[lf.type] || lf.type === 'currency') add('error', 'E_DUAL_AXIS', '右轴必须是比率类（lineFormat: percent / pp / multiple / index）；同单位指标不要用双轴');
    if (!s.unit) add('error', 'E_UNIT', '缺少左轴单位 unit');
    var xs = asArray(s.data).map(function (r) { return r[s.x]; }); checkEstOrder(s, add, xs, xs.map(isEstLabel));
  },
  render: function (c) {
    var s = c.spec, data = asArray(s.data), xs = data.map(function (r) { return r[s.x]; }), flags = estFlags(c, xs);
    var bk = barKeys(s), lk = lineKeys(s), lf = normFmt(s.lineFormat || 'percent');
    var bars = bk.map(function (k, i) { return { key: k, name: labelOf(s, k), values: data.map(function (r) { return num(r[k]); }), color: c.color(labelOf(s, k), [0, 2, 3][i]) }; });
    var lines = lk.map(function (k, i) { return { key: k, name: labelOf(s, k), values: data.map(function (r) { return num(r[k]); }), color: c.color(labelOf(s, k), [1, 4][i]) }; });
    var be = extent([].concat.apply([], bars.map(function (b) { return b.values; }))), le = extent([].concat.apply([], lines.map(function (l) { return l.values; })));
    var lineUnit = s.lineUnit != null ? s.lineUnit : (lf.type === 'percent' ? '%' : lf.type === 'multiple' ? 'x' : lf.type === 'pp' ? (c.lang === 'en' ? 'pp' : 'pct') : '');
    var F = frameXY(c, { x: { kind: 'band', keys: xs, inner: bars.length > 1 ? 0.24 : 0.42 }, y: { lo: Math.min(0, be[0]), hi: be[1], zero: true, unit: s.unit, color: bars.length === 1 ? bars[0].color : null }, yr: { lo: le[0], hi: le[1], zero: s.lineZero === true, fmt: lf, unit: lineUnit, color: lines.length === 1 ? lines[0].color : THEME.ink2 }, top: 4 });
    var marks = '', labels = '', hits = '', boxes = [];
    var bw = F.x.bw / bars.length;
    var showBarLab = s.barLabels != null ? !!s.barLabels : (bars.length === 1 && xs.length <= 12 && F.x.bw >= textW('0000', c.fs) * 0.8);
    bars.forEach(function (b, k) {
      b.values.forEach(function (v, i) {
        if (!isNum(v)) return;
        var x0 = F.x(xs[i]) + bw * k, y0 = F.y(Math.max(0, v)), y1 = F.y(Math.min(0, v));
        marks += rect(x0, y0, bw - (bars.length > 1 ? 1 : 0), y1 - y0, { fill: flags[i] ? c.est(b.color) : b.color, stroke: flags[i] ? b.color : null, crisp: true });
        if (showBarLab) { var ly = v >= 0 ? y0 - 5 : y1 + 13, txt = c.fmt(v); labels += text(x0 + bw / 2, ly, txt, { anchor: 'middle', size: c.fs, fill: THEME.ink2 }); boxes.push({ x0: x0 + bw / 2 - textW(txt, c.fs) / 2, x1: x0 + bw / 2 + textW(txt, c.fs) / 2, y0: ly - 11, y1: ly + 2 }); }
      });
      c.addLegend(b.name + (c.lang === 'en' ? ' (' + c.t('lhs') + ')' : '（' + c.t('lhs') + '）'), b.color, 'bar');
    });
    var showLineLab = s.lineLabels != null ? !!s.lineLabels : (lines.length === 1 && xs.length <= 10);
    lines.forEach(function (l) {
      var pts = l.values.map(function (v, i) { return isNum(v) ? [F.x.center(xs[i]), F.yr(v)] : null; });
      var parts = estPaths(pts, flags);
      marks += path(polyline(parts.a), { stroke: l.color, width: THEME.stroke.line });
      if (parts.e.length) marks += path(polyline(parts.e), { stroke: l.color, width: THEME.stroke.line, dash: '5 4' });
      pts.forEach(function (p, i) { if (p) marks += circle(p[0], p[1], 3.2, { fill: flags[i] ? '#FFFFFF' : l.color, stroke: l.color, width: 1.5 }); });
      if (showLineLab) {
        var cands = pts.map(function (p, i) {
          if (!p) return null;
          var t = fmtNum(l.values[i], lf, c.lang), w = textW(t, c.fs) + 4;
          return { t: t, p: p, options: [{ x0: p[0] - w / 2, x1: p[0] + w / 2, y0: p[1] - 22, y1: p[1] - 8, ty: p[1] - 10 }, { x0: p[0] - w / 2, x1: p[0] + w / 2, y0: p[1] + 8, y1: p[1] + 22, ty: p[1] + 19 }], avoid: boxes };
        }).filter(Boolean);
        placeBoxes(cands, { x0: 0, x1: c.W, y0: F.P.t - 4, y1: F.P.b + 2 }).forEach(function (cd) {
          var tw = textW(cd.t, c.fs, 600);
          labels += rect(cd.p[0] - tw / 2 - 3, cd.chosen.ty - 11, tw + 6, 15, { fill: '#FFFFFF', opacity: 0.92 });
          labels += text(cd.p[0], cd.chosen.ty, cd.t, { anchor: 'middle', size: c.fs, weight: 600, fill: l.color });
        });
      }
      c.addLegend(l.name + (c.lang === 'en' ? ' (' + c.t('rhs') + ')' : '（' + c.t('rhs') + '）'), l.color, 'line');
    });
    if (flags.indexOf(true) >= 0) c.addLegend(c.t('est'), THEME.ink2, 'est');
    xs.forEach(function (x, i) {
      hits += hitRect(F.x(x), F.P.t, F.x.bw, F.P.h, xLabel(c, x) + (flags[i] ? ' (' + c.t('est') + ')' : ''), bars.map(function (b) { return [b.name, c.fmt(b.values[i])]; }).concat(lines.map(function (l) { return [l.name, fmtNum(l.values[i], lf, c.lang)]; })), xs.length <= 40);
    });
    var all = bars.concat(lines);
    c.setTable([c.t('period')].concat(all.map(function (d) { return d.name; })), xs.map(function (x, i) { return [xLabel(c, x)].concat(bars.map(function (b) { return c.fmt(b.values[i]); }), lines.map(function (l) { return fmtNum(l.values[i], lf, c.lang); })); }), xs.map(function (x, i) { return [x].concat(all.map(function (d) { return d.values[i]; })); }));
    return { svg: F.under + marks + F.base + F.axes + labels + hits, height: F.H };
  }
});

/* ── T04 Indexed performance (rebased to 100) ────────────────────────── */
register({
  id: 'T04', name: { zh: '指数化表现（基期=100）', en: 'Indexed performance (rebased = 100)' },
  question: { zh: '量级不同的序列，从同一起点出发谁跑得更好？', en: 'From a common start, which series of different scale performed better?' },
  use: { zh: '股价相对指数、各站点/品类 GMV 的相对增长、价格指数对比。', en: 'Share price vs index, relative growth of marketplaces or categories, price indices.' },
  avoid: { zh: '需要读取绝对值（用 T01）；基期值 ≤0。', en: 'When absolute levels matter (use T01); base values ≤ 0.' },
  fields: [
    { key: 'x', role: 'time', required: true, desc: { zh: '日期或期间', en: 'Date or period' } },
    { key: 'y | series', role: 'measure[]', required: true, desc: { zh: '原始水平值（引擎自动换算为基期=100）', en: 'Raw levels; the engine rebases to 100' } }
  ],
  options: ['base（基期，默认第一期）', 'highlight', 'refLines'],
  keywords: { zh: ['指数化', '基期100', '相对表现', '跑赢', '跑输', '股价表现', '相对收益', '归一化'], en: ['indexed', 'rebased', 'relative performance', 'outperform', 'share price', 'normalised'] },
  aspect: 0.5, needsUnit: false,
  lint: function (s, add) {
    var keys = measureKeys(s); checkFields(s, add, [s.x].concat(keys));
    var data = asArray(s.data), bi = s.base != null ? data.map(function (r) { return String(r[s.x]); }).indexOf(String(s.base)) : 0;
    if (s.base != null && bi < 0) add('error', 'E_BASE', '基期 ' + s.base + ' 不在数据中');
    if (!s.seriesBy) keys.forEach(function (k) { var v = data[Math.max(0, bi)] && data[Math.max(0, bi)][k]; if (!(isNum(v) && v > 0)) add('error', 'E_BASE', '序列 ' + k + ' 的基期值必须 >0'); });
  },
  render: function (c) {
    var s = c.spec, m = measures(c), xs = m.xs, list = m.list;
    var bi = s.base != null ? Math.max(0, xs.map(String).indexOf(String(s.base))) : 0;
    list.forEach(function (se) {
      var b = se.values[bi];
      se.raw = se.values;
      se.values = se.values.map(function (v) { return isNum(v) && isNum(b) && b > 0 ? v / b * 100 : null; });
    });
    var spec2 = c.spec;
    spec2.format = normFmt({ type: 'number', decimals: 0 });
    spec2.refLines = asArray(spec2.refLines).concat([{ axis: 'value', value: 100, label: '', dash: false, color: THEME.axis }]);
    spec2.endLabels = false;
    var isTime = xs.length > 1 && xs.every(function (x) { return ISO_DAY.test(String(x)); });
    var dom = lineDomain(c, list, [100]);
    list.forEach(function (se, i) { se.color = c.color(se.name, i); se.dim = c.isDim(se.name); });
    var endTexts = list.map(function (se) {
      var li = se.values.length - 1; while (li >= 0 && !isNum(se.values[li])) li--;
      if (li < 0) return '';
      var chg = se.values[li] - 100;
      return se.name + ' ' + fmtNum(chg, { type: 'percent', decimals: 0, sign: true }, c.lang);
    });
    var endW = Math.min(c.W * 0.34, Math.max.apply(null, endTexts.map(function (t) { return textW(t, c.fs, 600); }).concat([0])) + 14);
    var F = frameXY(c, { x: isTime ? { kind: 'time', t0: parseDay(xs[0]), t1: parseDay(xs[xs.length - 1]) } : { kind: 'point', keys: xs }, y: { lo: dom.lo, hi: dom.hi, zero: false, unit: c.t('rebased'), fmt: spec2.format }, right: endW });
    var X = function (i) { return isTime ? F.x(parseDay(xs[i])) : F.x.center(xs[i]); };
    var ov = overlays(c, F, xPosFactory(c, F, xs, isTime));
    var marks = '', labels = '', hits = '';
    list.slice().sort(function (a, b) { return (a.dim ? 0 : 1) - (b.dim ? 0 : 1); }).forEach(function (se) {
      marks += path(polyline(se.values.map(function (v, i) { return isNum(v) ? [X(i), F.y(v)] : null; })), { stroke: se.color, width: se.dim ? THEME.stroke.lineThin : THEME.stroke.line });
    });
    var items = list.map(function (se, k) { var li = se.values.length - 1; while (li >= 0 && !isNum(se.values[li])) li--; return li < 0 ? null : { y: F.y(se.values[li]), text: endTexts[k], se: se }; }).filter(Boolean);
    spread(items, 15, F.P.t + 4, F.P.b - 2);
    items.forEach(function (it) { labels += text(F.P.r + 8, it.y, it.text, { baseline: 'middle', size: c.fs, weight: it.se.dim ? 400 : 600, fill: it.se.dim ? THEME.muted : it.se.color }); });
    var step = xs.length > 1 ? Math.abs(X(1) - X(0)) : F.P.w;
    xs.forEach(function (x, i) { hits += hitRect(X(i) - step / 2, F.P.t, step, F.P.h, xLabel(c, x), list.map(function (se) { return [se.name, fmtNum(se.values[i], 'number:1', c.lang)]; }), xs.length <= 60); });
    c.notesExtra.push((c.lang === 'en' ? 'Rebased to 100 at ' : '以 ') + xLabel(c, xs[bi]) + (c.lang === 'en' ? '; end labels show change since base.' : ' 为基期（=100）；线端标注为基期以来累计变化。'));
    c.setTable([c.t('period')].concat(list.map(function (se) { return se.name; })), xs.map(function (x, i) { return [xLabel(c, x)].concat(list.map(function (se) { return fmtNum(se.values[i], 'number:1', c.lang); })); }), xs.map(function (x, i) { return [x].concat(list.map(function (se) { return se.raw[i]; })); }));
    return { svg: ov.under + F.under + F.base + marks + ov.over + F.axes + labels + hits, height: F.H };
  }
});

/* ── T05 Fan / range forecast ────────────────────────────────────────── */
register({
  id: 'T05', name: { zh: '区间预测（扇形图）', en: 'Fan / range chart' },
  question: { zh: '预测的中枢在哪里，不确定性有多大？历史分位区间如何？', en: 'Where is the central forecast and how wide is the uncertainty?' },
  use: { zh: '销量/价格预测带置信区间；竞品价格 P10–P90 分位带；情景上下限。', en: 'Forecasts with intervals; competitor price P10–P90 bands; scenario bounds.' },
  avoid: { zh: '区间不是真实统计量或情景时（不要编造区间）。', en: 'When the interval is not a real statistic or scenario (never invent bands).' },
  fields: [
    { key: 'x', role: 'time', required: true, desc: { zh: '期间或日期', en: 'Period or date' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '中枢值（实际 + 预测）', en: 'Central value (actual + forecast)' } },
    { key: 'bands', role: 'interval[]', required: true, desc: { zh: '[{low, high, name}] 由宽到窄，如 90%、50% 区间', en: '[{low, high, name}] widest first, e.g. 90% then 50%' } }
  ],
  options: ['estimateFrom', 'refLines'],
  keywords: { zh: ['区间', '置信区间', '预测区间', '扇形图', '不确定性', '分位数', '上下限', '情景'], en: ['fan chart', 'confidence interval', 'forecast range', 'uncertainty', 'percentile band'] },
  aspect: 0.5,
  lint: function (s, add) {
    checkFields(s, add, [s.x, s.y]);
    var b = asArray(s.bands);
    if (!b.length) add('error', 'E_BANDS', 'bands 至少一个 {low, high, name}');
    b.forEach(function (d) { checkFields(s, add, [d.low, d.high]); asArray(s.data).forEach(function (r) { if (isNum(r[d.low]) && isNum(r[d.high]) && r[d.low] > r[d.high]) add('error', 'E_BAND_ORDER', '区间下限大于上限：' + r[s.x]); }); });
  },
  render: function (c) {
    var s = c.spec, data = asArray(s.data), xs = data.map(function (r) { return r[s.x]; }), flags = estFlags(c, xs);
    var isTime = xs.length > 1 && xs.every(function (x) { return ISO_DAY.test(String(x)); });
    var v = data.map(function (r) { return num(r[s.y]); }), bands = asArray(s.bands);
    var all = v.slice(); bands.forEach(function (b) { data.forEach(function (r) { all.push(num(r[b.low]), num(r[b.high])); }); });
    var e = extent(all), col = c.pal.primary;
    var F = frameXY(c, { x: isTime ? { kind: 'time', t0: parseDay(xs[0]), t1: parseDay(xs[xs.length - 1]) } : { kind: 'point', keys: xs }, y: { lo: e[0], hi: e[1], zero: s.zero === true || (e[0] >= 0 && e[0] < e[1] * 0.3), unit: s.unit } });
    var X = function (i) { return isTime ? F.x(parseDay(xs[i])) : F.x.center(xs[i]); };
    var ov = overlays(c, F, xPosFactory(c, F, xs, isTime));
    var marks = '';
    bands.forEach(function (b, k) {
      var fill = mix(c.pal.series[2], '#FFFFFF', 0.78 - k * 0.2), up = [], dn = [];
      data.forEach(function (r, i) { var lo = num(r[b.low]), hi = num(r[b.high]); if (isNum(lo) && isNum(hi)) { up.push([X(i), F.y(hi)]); dn.push([X(i), F.y(lo)]); } });
      if (up.length > 1) marks += path('M' + up.map(function (p) { return r2(p[0]) + ' ' + r2(p[1]); }).join('L') + 'L' + dn.reverse().map(function (p) { return r2(p[0]) + ' ' + r2(p[1]); }).join('L') + 'Z', { fill: fill });
      c.addLegend(String(b.name || (b.low + '–' + b.high)), fill, 'bar');
    });
    var pts = v.map(function (val, i) { return isNum(val) ? [X(i), F.y(val)] : null; }), parts = estPaths(pts, flags);
    marks += path(polyline(parts.a), { stroke: col, width: THEME.stroke.line });
    if (parts.e.length) marks += path(polyline(parts.e), { stroke: col, width: THEME.stroke.line, dash: '5 4' });
    c.legend.unshift({ label: labelOf(s, s.y), color: col, kind: 'line' });
    if (flags.indexOf(true) > 0) marks += estDivider(c, F, xs, flags, X);
    var hits = '', step = xs.length > 1 ? Math.abs(X(1) - X(0)) : F.P.w;
    xs.forEach(function (x, i) { hits += hitRect(X(i) - step / 2, F.P.t, step, F.P.h, xLabel(c, x), [[labelOf(s, s.y), c.fmt(v[i])]].concat(bands.map(function (b) { return [String(b.name || ''), c.fmt(data[i][b.low]) + ' – ' + c.fmt(data[i][b.high])]; })), xs.length <= 60); });
    c.setTable([c.t('period'), labelOf(s, s.y)].concat(bands.map(function (b) { return String(b.name || '') + ' ' + (c.lang === 'en' ? 'low' : '下限'); }), bands.map(function (b) { return String(b.name || '') + ' ' + (c.lang === 'en' ? 'high' : '上限'); })),
      data.map(function (r, i) { return [xLabel(c, xs[i]), c.fmt(v[i])].concat(bands.map(function (b) { return c.fmt(r[b.low]); }), bands.map(function (b) { return c.fmt(r[b.high]); })); }));
    return { svg: ov.under + F.under + marks + F.base + ov.over + F.axes + hits, height: F.H };
  }
});

/* ── T06 Candlestick + volume ────────────────────────────────────────── */
register({
  id: 'T06', name: { zh: 'K 线图（含成交量）', en: 'Candlestick with volume' },
  question: { zh: '价格在每个周期的开高低收如何？量价是否配合？', en: 'What were open, high, low and close each period, and did volume confirm?' },
  use: { zh: '股票、商品、币价的日/周 K；可叠加均线与成交量。', en: 'Daily or weekly OHLC for stocks, commodities or tokens; optional moving averages and volume.' },
  avoid: { zh: '只有收盘价（用 T01）；非价格类业务数据。', en: 'Close-only data (use T01); non-price business data.' },
  fields: [
    { key: 'x', role: 'time', required: true, desc: { zh: '交易日（按交易日等距排列，不留周末空档）', en: 'Trading day (evenly spaced, no weekend gaps)' } },
    { key: 'open/high/low/close', role: 'measure', required: true, desc: { zh: '字段名默认 open/high/low/close，可用 ohlc:{} 改名', en: 'Defaults open/high/low/close; rename via ohlc:{}' } },
    { key: 'volume', role: 'measure', required: false, desc: { zh: '成交量（可选，下方副图）', en: 'Volume (optional, lower panel)' } }
  ],
  options: ['ma:[5,20]', 'market:"cn"|"intl"（默认中文 cn 红涨绿跌）', 'volumeUnit'],
  keywords: { zh: ['K线', '蜡烛图', '开高低收', 'OHLC', '股价', '行情', '成交量', '均线'], en: ['candlestick', 'ohlc', 'share price', 'volume', 'moving average'] },
  aspect: 0.56,
  lint: function (s, add) {
    var k = s.ohlc || {}, o = k.open || 'open', h = k.high || 'high', l = k.low || 'low', cl = k.close || 'close';
    checkFields(s, add, [s.x, o, h, l, cl]);
    asArray(s.data).forEach(function (r) {
      if ([r[o], r[h], r[l], r[cl]].every(isNum) && (r[h] < Math.max(r[o], r[cl]) - 1e-9 || r[l] > Math.min(r[o], r[cl]) + 1e-9)) add('error', 'E_OHLC', 'OHLC 不自洽（最高价/最低价）：' + r[s.x]);
    });
  },
  render: function (c) {
    var s = c.spec, data = asArray(s.data), k = s.ohlc || {}, o = k.open || 'open', h = k.high || 'high', l = k.low || 'low', cl = k.close || 'close', vk = s.volume === false ? null : (s.volume || (data[0] && data[0].volume != null ? 'volume' : null));
    var mk = MARKET[s.market || (c.lang === 'zh' ? 'cn' : 'intl')] || MARKET.cn;
    var xs = data.map(function (r) { return r[s.x]; });
    var e = extent([].concat(data.map(function (r) { return num(r[h]); }), data.map(function (r) { return num(r[l]); })));
    var H = c.height(), volH = vk ? Math.round(H * 0.2) : 0;
    var F = frameXY(c, { height: H, x: { kind: 'band', keys: xs, inner: 0.3, labels: function (x) { return xLabel(c, x); } }, y: { lo: e[0], hi: e[1], zero: false, unit: s.unit }, bottom: volH ? volH + 8 : 0, xLabelDy: volH ? volH + 8 : 0 });
    var marks = '', hits = '', bw = Math.max(1, F.x.bw);
    data.forEach(function (r, i) {
      var op = num(r[o]), hi = num(r[h]), lo = num(r[l]), cls = num(r[cl]);
      if (![op, hi, lo, cls].every(isNum)) return;
      var up = cls >= op, col = up ? mk.up : mk.down, cx = Math.round(F.x.center(xs[i])) + .5;
      marks += line(cx, F.y(hi), cx, F.y(lo), { stroke: col, width: 1 });
      var y0 = F.y(Math.max(op, cls)), y1 = F.y(Math.min(op, cls));
      marks += rect(F.x(xs[i]), y0, bw, Math.max(1, y1 - y0), { fill: up ? (s.hollowUp ? '#FFFFFF' : col) : col, stroke: col, crisp: true });
      hits += hitRect(F.x(xs[i]) - (F.x.step - bw) / 2, F.P.t, F.x.step, F.P.h + volH + 8, xLabel(c, xs[i]), [[c.lang === 'en' ? 'Open' : '开盘', c.fmt(op)], [c.lang === 'en' ? 'High' : '最高', c.fmt(hi)], [c.lang === 'en' ? 'Low' : '最低', c.fmt(lo)], [c.lang === 'en' ? 'Close' : '收盘', c.fmt(cls)]].concat(vk ? [[c.t('volume'), fmtNum(r[vk], s.volumeFormat || 'number:0', c.lang)]] : []), false);
    });
    asArray(s.ma).forEach(function (n, j) {
      var pts = data.map(function (_, i) { if (i < n - 1) return null; var w = data.slice(i - n + 1, i + 1).map(function (r) { return num(r[cl]); }); return w.every(isNum) ? [F.x.center(xs[i]), F.y(sum(w) / n)] : null; });
      var col = [c.pal.series[1], c.pal.series[2], c.pal.series[3]][j % 3];
      marks += path(polyline(pts), { stroke: col, width: 1.4 });
      c.addLegend(c.t('ma') + n, col, 'line');
    });
    var vol = '';
    if (vk) {
      var vmax = Math.max.apply(null, data.map(function (r) { return num(r[vk]) || 0; }).concat([1]));
      var vb = F.P.b + 8 + volH, vy = scaleLinear(0, vmax, vb, F.P.b + 14);
      vol += line(F.P.l, vb + .5, F.P.r, vb + .5, { stroke: THEME.axis, crisp: true });
      data.forEach(function (r, i) { var vv = num(r[vk]); if (!isNum(vv)) return; var up = num(r[cl]) >= num(r[o]); vol += rect(F.x(xs[i]), vy(vv), bw, vb - vy(vv), { fill: mix(up ? mk.up : mk.down, '#FFFFFF', 0.35), crisp: true }); });
      vol += text(F.P.l - 8, F.P.b + 18, c.t('volume') + (s.volumeUnit ? '（' + s.volumeUnit + '）' : ''), { anchor: 'start', size: c.fs, fill: THEME.muted, transform: null });
    }
    c.addLegend(c.t('up'), mk.up, 'bar'); c.addLegend(c.t('down'), mk.down, 'bar');
    c.setTable([c.t('period'), 'O', 'H', 'L', 'C'].concat(vk ? [c.t('volume')] : []), data.map(function (r, i) { return [xLabel(c, xs[i]), c.fmt(r[o]), c.fmt(r[h]), c.fmt(r[l]), c.fmt(r[cl])].concat(vk ? [fmtNum(r[vk], 'number:0', c.lang)] : []); }));
    return { svg: F.under + marks + F.base + vol + F.axes + hits, height: F.H };
  }
});

/* ── T07 Valuation band (PE / PB band) ───────────────────────────────── */
register({
  id: 'T07', name: { zh: '估值通道（PE/PB Band）', en: 'Valuation band (PE / PB band)' },
  question: { zh: '当前股价对应历史上多少倍估值？处在通道的什么位置？', en: 'Which historical multiple does the current price imply; where in the band is it?' },
  use: { zh: '股价与“每股收益/净资产 × 不同倍数”的平行通道对比。', en: 'Price against parallel lines of EPS/BVPS × fixed multiples.' },
  avoid: { zh: '每股收益为负或波动极大（倍数无意义，标 n.m.）。', en: 'Negative or volatile per-share earnings (multiples are not meaningful).' },
  fields: [
    { key: 'x', role: 'time', required: true, desc: { zh: '日期（月度或周度）', en: 'Date (monthly or weekly)' } },
    { key: 'price', role: 'measure', required: true, desc: { zh: '股价字段', en: 'Price field' } },
    { key: 'base', role: 'measure', required: true, desc: { zh: '每股指标字段（EPS 或 BVPS，滚动或预测）', en: 'Per-share base (EPS or BVPS, trailing or forward)' } },
    { key: 'multiples', role: 'list', required: true, desc: { zh: '倍数列表，如 [10,15,20,25]', en: 'Multiples, e.g. [10,15,20,25]' } }
  ],
  options: ['multipleLabel（如 "x PE"）'],
  keywords: { zh: ['PE Band', 'PB Band', '估值通道', '估值带', '市盈率通道', '历史估值', '倍数'], en: ['pe band', 'pb band', 'valuation band', 'multiple band', 'historical valuation'] },
  aspect: 0.5,
  lint: function (s, add) {
    checkFields(s, add, [s.x, s.price, s.base]);
    if (!asArray(s.multiples).length) add('error', 'E_MULTIPLES', 'multiples 不能为空');
    if (asArray(s.data).some(function (r) { return isNum(r[s.base]) && r[s.base] <= 0; })) add('warning', 'W_NEG_BASE', '每股指标存在 ≤0：该段倍数无意义，通道线将断开');
  },
  render: function (c) {
    var s = c.spec, data = asArray(s.data), xs = data.map(function (r) { return r[s.x]; }), mult = asArray(s.multiples).slice().sort(function (a, b) { return a - b; });
    var isTime = xs.length > 1 && xs.every(function (x) { return ISO_DAY.test(String(x)); });
    var all = data.map(function (r) { return num(r[s.price]); });
    mult.forEach(function (m) { data.forEach(function (r) { var b = num(r[s.base]); if (isNum(b) && b > 0) all.push(b * m); }); });
    var e = extent(all), lab = function (m) { return m + 'x' + (s.multipleLabel ? ' ' + s.multipleLabel : ''); };
    var F = frameXY(c, { x: isTime ? { kind: 'time', t0: parseDay(xs[0]), t1: parseDay(xs[xs.length - 1]) } : { kind: 'point', keys: xs }, y: { lo: e[0], hi: e[1], zero: e[0] < e[1] * 0.3, unit: s.unit }, right: Math.max.apply(null, mult.map(function (m) { return textW(lab(m), c.fs); })) + 14 });
    var X = function (i) { return isTime ? F.x(parseDay(xs[i])) : F.x.center(xs[i]); };
    var marks = '', labels = '', items = [];
    mult.forEach(function (m, j) {
      var col = rampAt(['#B8C0CA', c.pal.series[2], c.pal.primary], mult.length > 1 ? j / (mult.length - 1) : 0.5);
      var pts = data.map(function (r, i) { var b = num(r[s.base]); return isNum(b) && b > 0 ? [X(i), F.y(b * m)] : null; });
      marks += path(polyline(pts), { stroke: col, width: 1.2, dash: '4 3' });
      var li = pts.length - 1; while (li >= 0 && !pts[li]) li--;
      if (li >= 0) items.push({ y: pts[li][1], text: lab(m), color: col });
    });
    marks += path(polyline(data.map(function (r, i) { return isNum(num(r[s.price])) ? [X(i), F.y(num(r[s.price]))] : null; })), { stroke: c.pal.series[1], width: 2.2 });
    spread(items, 14, F.P.t, F.P.b);
    items.forEach(function (it) { labels += text(F.P.r + 8, it.y, it.text, { baseline: 'middle', size: c.fs, fill: it.color, weight: 600 }); });
    c.addLegend(labelOf(s, s.price), c.pal.series[1], 'line');
    c.addLegend((c.lang === 'en' ? 'Implied price at multiple' : '对应倍数下的价格'), c.pal.series[2], 'dash');
    var last = data[data.length - 1], lb = last && num(last[s.base]), lp = last && num(last[s.price]);
    if (isNum(lb) && lb > 0 && isNum(lp)) c.notesExtra.push((c.lang === 'en' ? 'Latest implied multiple: ' : '最新隐含倍数：') + fmtNum(lp / lb, 'multiple', c.lang) + (s.multipleLabel ? ' ' + s.multipleLabel : ''));
    var hits = '', step = xs.length > 1 ? Math.abs(X(1) - X(0)) : F.P.w;
    xs.forEach(function (x, i) { var b = num(data[i][s.base]), p = num(data[i][s.price]); hits += hitRect(X(i) - step / 2, F.P.t, step, F.P.h, xLabel(c, x), [[labelOf(s, s.price), c.fmt(p)], [labelOf(s, s.base), c.fmt(b)], [c.t('implied'), isNum(b) && b > 0 && isNum(p) ? fmtNum(p / b, 'multiple', c.lang) : c.t('nm')]], xs.length <= 60); });
    c.setTable([c.t('period'), labelOf(s, s.price), labelOf(s, s.base), c.t('implied')], data.map(function (r, i) { var b = num(r[s.base]), p = num(r[s.price]); return [xLabel(c, xs[i]), c.fmt(p), c.fmt(b), isNum(b) && b > 0 && isNum(p) ? fmtNum(p / b, 'multiple', c.lang) : c.t('nm')]; }));
    return { svg: F.under + F.base + marks + F.axes + labels + hits, height: F.H };
  }
});

/* ── T08 Calendar heatmap ────────────────────────────────────────────── */
register({
  id: 'T08', name: { zh: '日历热力图', en: 'Calendar heatmap' },
  question: { zh: '一年中每天的量有什么周内/季节规律，哪些日子异常？', en: 'What weekday and seasonal patterns show up day by day, and which days are outliers?' },
  use: { zh: '日销量、日订单、日广告花费等 3–24 个月的逐日数据。', en: 'Daily sales, orders or ad spend over 3–24 months.' },
  avoid: { zh: '需要精确读数或少于 60 天（用 T01/C02）。', en: 'Precise reading or fewer than 60 days (use T01/C02).' },
  fields: [
    { key: 'x', role: 'date', required: true, desc: { zh: 'YYYY-MM-DD', en: 'YYYY-MM-DD' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '当日数值（缺失日留空，不补 0）', en: 'Daily value (leave missing days empty; never fill 0)' } }
  ],
  options: ['weekStart:"mon"|"sun"'],
  keywords: { zh: ['日历', '逐日', '热力', '每天', '周内规律', '日销量', '日订单'], en: ['calendar', 'daily', 'heatmap', 'day of week', 'daily sales'] },
  aspect: 0.3,
  lint: function (s, add) {
    checkFields(s, add, [s.x, s.y]);
    var bad = asArray(s.data).filter(function (r) { return !ISO_DAY.test(String(r[s.x])); }).length;
    if (bad) add('error', 'E_DATE', bad + ' 行日期不是 YYYY-MM-DD');
    var ts = asArray(s.data).map(function (r) { return parseDay(r[s.x]); }).filter(isNum);
    if (ts.length && (Math.max.apply(null, ts) - Math.min.apply(null, ts)) / DAY > 740) add('error', 'E_RANGE', '日历热力图最多 2 年；更长请按月聚合用 T01/T11');
  },
  render: function (c) {
    var s = c.spec, data = asArray(s.data).filter(function (r) { return ISO_DAY.test(String(r[s.x])); });
    var map = {}; data.forEach(function (r) { map[r[s.x]] = num(r[s.y]); });
    var ts = data.map(function (r) { return parseDay(r[s.x]); }), t0 = Math.min.apply(null, ts), t1 = Math.max.apply(null, ts);
    var monStart = s.weekStart !== 'sun', dow = function (t) { var d = new Date(t).getUTCDay(); return monStart ? (d + 6) % 7 : d; };
    var start = t0 - dow(t0) * DAY, weeks = Math.ceil((t1 - start + DAY) / (7 * DAY));
    var left = 34, top = 30, avail = c.W - left - 8, cell = Math.max(6, Math.min(16, Math.floor(avail / weeks) - 2)), gap = cell >= 10 ? 2 : 1;
    var vals = data.map(function (r) { return num(r[s.y]); }).filter(isNum), e = extent(vals);
    var cls = classBreaks(vals, s.scale === 'linear' ? 'linear' : 'quantile', 6), ramp = c.pal.seq.slice(1);
    var color = function (v) { return ramp[Math.round(classOf(cls, v) * (ramp.length - 1) / Math.max(1, cls.length - 2))] || ramp[ramp.length - 1]; };
    var out = '', hits = '';
    var dn = monStart ? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] : ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    [0, 2, 4].forEach(function (i) { out += text(left - 6, top + i * (cell + gap) + cell / 2, c.t(dn[i]), { anchor: 'end', baseline: 'middle', size: c.fs, fill: THEME.ink2 }); });
    var lastMonth = -1, monthX = -1e9;
    var years = uniq(data.map(function (r) { return String(r[s.x]).slice(0, 4); })), multiYear = years.length > 1;
    if (!multiYear && textW(years[0], c.fs, 600) <= left - 4) out += text(2, top - 9, years[0], { size: c.fs, weight: 600, fill: THEME.ink2 });
    for (var t = start; t <= t1; t += DAY) {
      var wi = Math.floor((t - start) / (7 * DAY)), di = dow(t), x = left + wi * (cell + gap), y = top + di * (cell + gap);
      var key = fmtDate(t, 'iso'), v = map[key];
      var d = new Date(t);
      if (d.getUTCDate() <= 7 && di === 0 && d.getUTCMonth() !== lastMonth && t >= t0 - 6 * DAY) {
        lastMonth = d.getUTCMonth();
        var ml = multiYear && d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : fmtDate(t, 'monthShort', c.lang), mw = textW(ml, c.fs);
        if (x >= monthX) { out += text(x, top - 9, ml, { size: c.fs, fill: THEME.ink2 }); monthX = x + mw + 6; }
      }
      if (t < t0) continue;
      if (isNum(v)) { out += rect(x, y, cell, cell, { fill: color(v) }); hits += hitRect(x, y, cell, cell, key, [[labelOf(s, s.y), c.fmt(v)]], false); }
      else if (key in map || t <= t1) out += rect(x + .5, y + .5, cell - 1, cell - 1, { fill: '#FFFFFF', stroke: THEME.grid });
    }
    var H = top + 7 * (cell + gap) + 44, ly = top + 7 * (cell + gap) + 12;
    out += classLegend(c, cls, color, left, ly, s.scale === 'linear' ? '' : (c.lang === 'en' ? 'Quantile classes' : '分位数分档'));
    c.setTable([c.lang === 'en' ? 'Date' : '日期', labelOf(s, s.y)], data.map(function (r) { return [r[s.x], c.fmt(r[s.y])]; }));
    return { svg: out + hits, height: H };
  }
});

/* ── T09 Slope chart ─────────────────────────────────────────────────── */
register({
  id: 'T09', name: { zh: '斜率图（两期对比）', en: 'Slope chart (two periods)' },
  question: { zh: '两个时点之间，各项目升降方向与幅度如何，排名有无交叉？', en: 'Between two points in time, which items rose or fell and did ranks cross?' },
  use: { zh: '3–12 个项目的前后两期对比（份额、利润率、价格）。', en: 'Before/after comparison for 3–12 items (share, margin, price).' },
  avoid: { zh: '超过两期（用 T01/T10）；项目 >12。', en: 'More than two periods (use T01/T10); more than 12 items.' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '项目名', en: 'Item' } },
    { key: 'from / to', role: 'measure', required: true, desc: { zh: '两期字段名，periods 给出两期标签', en: 'Fields for the two periods; periods gives their labels' } }
  ],
  options: ['periods:["2024","2025"]', 'highlight', 'colorBy:"direction"|"series"', 'goodDirection:"up"|"down"'],
  keywords: { zh: ['斜率图', '两期对比', '前后对比', '升降', '变化方向', '排名交叉'], en: ['slope chart', 'before and after', 'two periods', 'change direction'] },
  aspect: 0.62,
  lint: function (s, add) { checkFields(s, add, [s.x, s.from, s.to]); if (asArray(s.data).length > 12) add('warning', 'W_ITEMS', '超过 12 项：标签会拥挤，建议筛选或改用 C05'); },
  render: function (c) {
    var s = c.spec, data = asArray(s.data), periods = asArray(s.periods).length === 2 ? s.periods : [labelOf(s, s.from), labelOf(s, s.to)];
    var vals = [].concat(data.map(function (r) { return num(r[s.from]); }), data.map(function (r) { return num(r[s.to]); })), e = extent(vals);
    var H = c.height(), top = 34, bottom = H - 14;
    var lw = Math.max.apply(null, data.map(function (r) { return textW(String(r[s.x]) + ' ' + c.fmt(r[s.from]), c.fs, 600); })) + 12;
    lw = Math.min(lw, c.W * 0.36);
    var x0 = lw, x1 = c.W - lw, ys = scaleLinear(e[0], e[1], bottom, top + 10);
    var good = s.goodDirection === 'down' ? -1 : 1, out = '', hits = '';
    out += text(x0, top - 12, String(periods[0]), { anchor: 'middle', weight: 600, size: c.fs, fill: THEME.ink });
    out += text(x1, top - 12, String(periods[1]), { anchor: 'middle', weight: 600, size: c.fs, fill: THEME.ink });
    out += line(x0, top - 2, x0, bottom + 4, { stroke: THEME.axis }) + line(x1, top - 2, x1, bottom + 4, { stroke: THEME.axis });
    var L1 = [], R1 = [];
    data.forEach(function (r, i) {
      var a = num(r[s.from]), b = num(r[s.to]); if (!isNum(a) || !isNum(b)) return;
      var name = String(r[s.x]), col;
      if (asArray(s.highlight).length) col = c.isDim(name) ? THEME.dim : c.color(name, asArray(s.highlight).indexOf(name));
      else if (s.colorBy === 'series') col = c.color(name, i);
      else col = (b - a) * good >= 0 ? THEME.good : THEME.bad;
      var dim = c.isDim(name);
      out += line(x0, ys(a), x1, ys(b), { stroke: col, width: dim ? 1.4 : 2.2 });
      out += circle(x0, ys(a), 3.5, { fill: col }) + circle(x1, ys(b), 3.5, { fill: col });
      L1.push({ y: ys(a), t: name + '  ' + c.fmt(a), col: dim ? THEME.muted : THEME.ink });
      var chg = s.format.type === 'percent' ? fmtNum(b - a, { type: 'pp', decimals: 1, sign: true }, c.lang) : fmtNum(a ? (b - a) / Math.abs(a) * 100 : null, { type: 'percent', decimals: 0, sign: true }, c.lang);
      R1.push({ y: ys(b), t: c.fmt(b) + '  ' + name + '  ' + chg, col: dim ? THEME.muted : THEME.ink });
      hits += el('line', { x1: x0, y1: ys(a), x2: x1, y2: ys(b), stroke: 'transparent', 'stroke-width': 12, 'class': 'bz-hit', 'data-tip': JSON.stringify({ t: name, r: [[String(periods[0]), c.fmt(a)], [String(periods[1]), c.fmt(b)], [c.lang === 'en' ? 'Change' : '变化', fmtNum(b - a, { type: s.format.type === 'percent' ? 'pp' : s.format.type, decimals: s.format.decimals, sign: true }, c.lang)]] }) });
    });
    spread(L1, 15, top, bottom); spread(R1, 15, top, bottom);
    L1.forEach(function (it) { out += text(x0 - 8, it.y, it.t, { anchor: 'end', baseline: 'middle', size: c.fs, fill: it.col }); });
    R1.forEach(function (it) { out += text(x1 + 8, it.y, it.t, { baseline: 'middle', size: c.fs, fill: it.col }); });
    if (!asArray(s.highlight).length && s.colorBy !== 'series') { c.addLegend(c.t('increase'), good > 0 ? THEME.good : THEME.bad, 'line'); c.addLegend(c.t('decrease'), good > 0 ? THEME.bad : THEME.good, 'line'); }
    c.setTable([c.t('item'), String(periods[0]), String(periods[1])], data.map(function (r) { return [String(r[s.x]), c.fmt(r[s.from]), c.fmt(r[s.to])]; }));
    return { svg: out + hits, height: H };
  }
});

/* ── T10 Bump chart (rank over time) ─────────────────────────────────── */
register({
  id: 'T10', name: { zh: '排名变化图', en: 'Bump chart (rank over time)' },
  question: { zh: '各实体的名次如何随时间变化，谁在上升谁在掉队？', en: 'How do ranks change over time; who is climbing and who is slipping?' },
  use: { zh: '品牌/ASIN 的 BSR 或销售额排名、市场份额排名的多期变化（≤10 个实体、≤12 期）。', en: 'Brand or ASIN rank, sales or share rank across periods (≤10 entities, ≤12 periods).' },
  avoid: { zh: '排名背后的差距很重要时（名次掩盖差距，用 T01 或 C03）。', en: 'When the gaps behind ranks matter (ranks hide gaps; use T01 or C03).' },
  fields: [
    { key: 'x', role: 'time', required: true, desc: { zh: '期间', en: 'Period' } },
    { key: 'seriesBy', role: 'dimension', required: true, desc: { zh: '实体字段', en: 'Entity field' } },
    { key: 'y | rank', role: 'measure', required: true, desc: { zh: '数值（引擎按降序计算名次）或直接给 rank 字段', en: 'Value (ranked descending) or a rank field' } }
  ],
  options: ['rank（名次字段）', 'ascending（数值越小名次越高，如 BSR）', 'highlight'],
  keywords: { zh: ['排名', '名次', '排名变化', 'BSR', '位次', '赛马'], en: ['rank', 'ranking', 'bump chart', 'bsr', 'position change'] },
  aspect: 0.55,
  lint: function (s, add) { checkFields(s, add, [s.x, s.seriesBy, s.rank || s.y]); },
  render: function (c) {
    var s = c.spec, data = asArray(s.data), xs = uniq(data.map(function (r) { return r[s.x]; })), ents = uniq(data.map(function (r) { return r[s.seriesBy]; }));
    var rank = {};
    xs.forEach(function (x) {
      var rows = data.filter(function (r) { return r[s.x] === x; });
      if (s.rank) rows.forEach(function (r) { rank[x + '|' + r[s.seriesBy]] = num(r[s.rank]); });
      else rows.filter(function (r) { return isNum(num(r[s.y])); }).sort(function (a, b) { return s.ascending ? num(a[s.y]) - num(b[s.y]) : num(b[s.y]) - num(a[s.y]); }).forEach(function (r, i) { rank[x + '|' + r[s.seriesBy]] = i + 1; });
    });
    var maxR = Math.max.apply(null, Object.keys(rank).map(function (k) { return rank[k]; }).filter(isNum).concat([ents.length]));
    var lw = Math.min(c.W * 0.24, Math.max.apply(null, ents.map(function (e) { return textW(String(e), c.fs, 600); })) + 30);
    var top = 30, rowH = clamp(Math.round(260 / maxR), 22, 34), H = top + rowH * maxR + 10;
    var xp = scalePoint(xs, lw, c.W - lw, 0.15), yr = function (r) { return top + (r - 0.5) * rowH; };
    var out = '', hits = '';
    var hdrW = Math.max.apply(null, xs.map(function (x) { return textW(xLabel(c, x), c.fs); })), hdrEvery = Math.max(1, Math.ceil((hdrW + 8) / Math.max(1, xp.step)));
    xs.forEach(function (x, i) { if ((xs.length - 1 - i) % hdrEvery === 0) out += text(xp(x), top - 12, xLabel(c, x), { anchor: 'middle', size: c.fs, fill: THEME.ink2 }); });
    for (var r = 1; r <= maxR; r++) out += line(lw - 8, Math.round(yr(r)) + .5, c.W - lw + 8, Math.round(yr(r)) + .5, { stroke: THEME.grid });
    var order = ents.slice().sort(function (a, b) { return (c.isDim(String(a)) ? 0 : 1) - (c.isDim(String(b)) ? 0 : 1); });
    order.forEach(function (en) {
      var i = ents.indexOf(en), name = String(en), col = c.color(name, i), dim = c.isDim(name);
      var pts = xs.map(function (x) { var rk = rank[x + '|' + en]; return isNum(rk) ? [xp(x), yr(rk)] : null; });
      out += path(polyline(pts), { stroke: col, width: dim ? 2 : 3.2 });
      pts.forEach(function (p, j) {
        if (!p) return;
        out += circle(p[0], p[1], dim ? 4 : 9, { fill: col, stroke: '#FFFFFF', width: 1.5 });
        if (!dim) out += text(p[0], p[1], String(rank[xs[j] + '|' + en]), { anchor: 'middle', baseline: 'middle', size: 11, weight: 700, fill: inkOn(col) });
        hits += el('circle', { cx: p[0], cy: p[1], r: 10, fill: 'transparent', 'class': 'bz-hit', 'data-tip': JSON.stringify({ t: name + ' · ' + xLabel(c, xs[j]), r: [[c.t('rank'), String(rank[xs[j] + '|' + en])]] }) });
      });
      var f = pts.findIndex ? pts.findIndex(Boolean) : 0, l = pts.length - 1; while (l >= 0 && !pts[l]) l--;
      if (f >= 0 && pts[f]) out += text(pts[f][0] - 14, pts[f][1], name, { anchor: 'end', baseline: 'middle', size: c.fs, weight: dim ? 400 : 600, fill: dim ? THEME.muted : col });
      if (l >= 0) out += text(pts[l][0] + 14, pts[l][1], name, { baseline: 'middle', size: c.fs, weight: dim ? 400 : 600, fill: dim ? THEME.muted : col });
    });
    c.setTable([c.t('period')].concat(ents.map(String)), xs.map(function (x) { return [xLabel(c, x)].concat(ents.map(function (en) { var rk = rank[x + '|' + en]; return isNum(rk) ? String(rk) : c.t('missing'); })); }));
    if (!s.rank) c.notesExtra.push(c.lang === 'en' ? 'Rank by ' + labelOf(s, s.y) + (s.ascending ? ' (lower is better).' : ' (higher is better).') : '按' + labelOf(s, s.y) + (s.ascending ? '由小到大' : '由大到小') + '排名。');
    return { svg: out + hits, height: H };
  }
});

/* ── T11 Seasonality (year-over-year overlay) ────────────────────────── */
register({
  id: 'T11', name: { zh: '季节性对比（逐年叠加）', en: 'Seasonality overlay' },
  question: { zh: '今年与往年同期相比如何？季节性高峰在哪几个月？', en: 'How does this year compare with prior years at the same point; where are seasonal peaks?' },
  use: { zh: '月度/周度销量、搜索量、广告花费的多年同期对比，可加往年区间带。', en: 'Monthly or weekly sales, search volume or ad spend across years, with an optional prior-year range.' },
  avoid: { zh: '少于两年数据；不规则期间。', en: 'Less than two years of data; irregular periods.' },
  fields: [
    { key: 'x', role: 'date', required: true, desc: { zh: 'YYYY-MM（月度）或 YYYY-MM-DD（按 ISO 周聚合）', en: 'YYYY-MM (monthly) or YYYY-MM-DD (ISO-week)' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '数值', en: 'Value' } }
  ],
  options: ['range:true（往年最小–最大区间带）', 'years（指定年份）'],
  keywords: { zh: ['季节性', '同期对比', '逐年', '旺季', '淡季', '年度叠加', '同比'], en: ['seasonality', 'year over year', 'seasonal', 'peak season', 'same period'] },
  aspect: 0.5,
  lint: function (s, add) { checkFields(s, add, [s.x, s.y]); var yrs = uniq(asArray(s.data).map(function (r) { return String(r[s.x]).slice(0, 4); })); if (yrs.length < 2) add('error', 'E_YEARS', '季节性对比至少需要两年数据'); },
  render: function (c) {
    var s = c.spec, data = asArray(s.data), weekly = data.length && ISO_DAY.test(String(data[0][s.x]));
    var byYear = {};
    data.forEach(function (r) {
      var k = String(r[s.x]), y = k.slice(0, 4), v = num(r[s.y]), slot;
      if (!isNum(v)) return;
      if (weekly) { var t = parseDay(k), d = new Date(t), j1 = Date.UTC(d.getUTCFullYear(), 0, 1); slot = Math.min(52, Math.floor((t - j1) / (7 * DAY))); }
      else slot = +k.slice(5, 7) - 1;
      byYear[y] = byYear[y] || {}; byYear[y][slot] = (byYear[y][slot] || 0) + v;
    });
    var years = (s.years ? asArray(s.years).map(String) : Object.keys(byYear)).sort(), cur = years[years.length - 1], prev = years.slice(0, -1);
    var n = weekly ? 53 : 12, slots = []; for (var i = 0; i < n; i++) slots.push(i);
    var all = []; years.forEach(function (y) { slots.forEach(function (sl) { if (isNum(byYear[y] && byYear[y][sl])) all.push(byYear[y][sl]); }); });
    var e = extent(all);
    var labelsFn = function (sl) { return weekly ? (sl % 4 === 0 ? 'W' + (sl + 1) : '') : (c.lang === 'en' ? MONTHS_EN[sl] : (sl + 1) + '月'); };
    var F = frameXY(c, { x: { kind: 'point', keys: slots, labels: labelsFn }, y: { lo: e[0], hi: e[1], zero: e[0] < e[1] * 0.35, unit: s.unit }, right: Math.max.apply(null, years.map(function (y) { return textW(y, c.fs, 600); })) + 14 });
    var X = function (sl) { return F.x(sl); }, marks = '', labels = '', items = [];
    if (s.range && prev.length >= 2) {
      var up = [], dn = [];
      slots.forEach(function (sl) { var v = prev.map(function (y) { return byYear[y] && byYear[y][sl]; }).filter(isNum); if (v.length >= 2) { up.push([X(sl), F.y(Math.max.apply(null, v))]); dn.push([X(sl), F.y(Math.min.apply(null, v))]); } });
      if (up.length > 1) marks += path('M' + up.map(function (p) { return r2(p[0]) + ' ' + r2(p[1]); }).join('L') + 'L' + dn.reverse().map(function (p) { return r2(p[0]) + ' ' + r2(p[1]); }).join('L') + 'Z', { fill: THEME.shade });
      c.addLegend((c.lang === 'en' ? prev[0] + '–' + prev[prev.length - 1] + ' range' : prev[0] + '–' + prev[prev.length - 1] + ' 区间'), THEME.shade, 'bar');
    }
    years.forEach(function (y, k) {
      var isCur = y === cur, isPrev = y === prev[prev.length - 1];
      var col = isCur ? c.pal.primary : isPrev ? c.pal.series[1] : mix(THEME.dim, '#FFFFFF', 0.1 * (prev.length - k));
      var pts = slots.map(function (sl) { var v = byYear[y] && byYear[y][sl]; return isNum(v) ? [X(sl), F.y(v)] : null; });
      marks += path(polyline(pts), { stroke: col, width: isCur ? 2.6 : isPrev ? 1.8 : 1.3 });
      var li = pts.length - 1; while (li >= 0 && !pts[li]) li--;
      if (li >= 0) items.push({ y: pts[li][1], x: pts[li][0], t: y, col: isCur || isPrev ? col : THEME.muted, w: isCur ? 700 : 400 });
    });
    spread(items, 14, F.P.t, F.P.b);
    items.forEach(function (it) { labels += text(it.x + 8, it.y, it.t, { baseline: 'middle', size: c.fs, fill: it.col, weight: it.w, halo: true }); });
    var hits = '', step = F.x.step || F.P.w / n;
    slots.forEach(function (sl) { hits += hitRect(X(sl) - step / 2, F.P.t, step, F.P.h, weekly ? 'W' + (sl + 1) : labelsFn(sl), years.map(function (y) { return [y, c.fmt(byYear[y] && byYear[y][sl])]; }), !weekly); });
    c.setTable([weekly ? c.t('week') : c.t('period')].concat(years), slots.map(function (sl) { return [weekly ? 'W' + (sl + 1) : labelsFn(sl)].concat(years.map(function (y) { return c.fmt(byYear[y] && byYear[y][sl]); })); }));
    return { svg: F.under + marks + F.base + F.axes + labels + hits, height: F.H };
  }
});
