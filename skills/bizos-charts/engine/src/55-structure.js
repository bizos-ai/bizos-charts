/* 55-structure — S01–S08: stacked, 100% mix, waterfall/bridge, donut,
   treemap, Marimekko, Sankey and funnel. Parts must be non-negative and
   reconcile to their totals; the lint enforces it. */

function partsLint(s, add, keys) {
  var neg = asArray(s.data).some(function (r) { return keys.some(function (k) { return isNum(num(r[k])) && num(r[k]) < 0; }); });
  if (neg) add('error', 'E_NEG_PART', '构成类图表的组成部分不能为负；有负值请用 S03 瀑布图或 C04');
}

/* ── S01 Stacked bars ────────────────────────────────────────────────── */
register({
  id: 'S01', name: { zh: '堆积柱/条形图', en: 'Stacked bars' },
  question: { zh: '总量是多少，由哪些部分组成，哪一部分在变化？', en: 'How big is the total, what is it made of, and which part is changing?' },
  use: { zh: '各期/各类的总额与 2–6 个组成部分（按渠道、按站点、按产品线）。', en: 'Totals and 2–6 components across periods or categories (by channel, marketplace, product line).' },
  avoid: { zh: '只关心占比（用 S02）；组成部分有负值（用 S03/C04）。', en: 'When only shares matter (use S02); negative components (use S03/C04).' },
  fields: [
    { key: 'x', role: 'category|time', required: true, desc: { zh: '期间或类别', en: 'Period or category' } },
    { key: 'y | series', role: 'measure[]', required: true, desc: { zh: '组成部分（非负）', en: 'Components (non-negative)' } }
  ],
  options: ['horizontal', 'totals（默认显示合计）', 'estimateFrom'],
  keywords: { zh: ['堆积柱状图', '组成', '构成', '分渠道', '分站点', '合计', '拆分'], en: ['stacked bar', 'composition', 'breakdown', 'by channel', 'total'] },
  aspect: 0.5,
  lint: function (s, add) { var k = measureKeys(s); checkFields(s, add, [s.x].concat(k)); partsLint(s, add, s.seriesBy ? [s.y] : k); if (k.length > 6 && !s.seriesBy) add('warning', 'W_SERIES', '组成部分超过 6 个：合并为“其他”'); },
  render: function (c) {
    var s = c.spec, m = measures(c), xs = m.xs, list = m.list, flags = estFlags(c, xs);
    list.forEach(function (se, i) { se.color = c.color(se.name, i); c.addLegend(se.name, se.color, 'bar'); });
    var tot = xs.map(function (_, i) { return sum(list, function (se) { return se.values[i]; }); });
    var marks = '', labels = '', hits = '', F;
    if (s.horizontal) {
      F = frameBars(c, { keys: xs.map(String), lo: 0, hi: Math.max.apply(null, tot), unit: s.unit, right: Math.max.apply(null, tot.map(function (t) { return textW(c.fmt(t), c.fs, 600); })) + 12, axis: false, grid: false });
      xs.forEach(function (x, i) {
        var acc = 0, y = F.y(String(x));
        list.forEach(function (se) {
          var v = se.values[i]; if (!isNum(v) || v <= 0) return;
          var x0 = F.x(acc), x1 = F.x(acc + v); acc += v;
          marks += rect(x0, y, x1 - x0, F.y.bw, { fill: se.color, stroke: '#FFFFFF', strokeWidth: 0.75 });
          if (x1 - x0 > textW(c.fmt(v), 11) + 6) labels += text((x0 + x1) / 2, y + F.y.bw / 2, c.fmt(v), { anchor: 'middle', baseline: 'middle', size: 11, fill: inkOn(se.color) });
        });
        if (s.totals !== false) labels += text(F.x(acc) + 6, y + F.y.bw / 2, c.fmt(acc), { baseline: 'middle', size: c.fs, weight: 600, fill: THEME.ink });
        hits += hitRect(F.P.l, y, F.P.w, F.y.bw, String(x), list.map(function (se) { return [se.name, c.fmt(se.values[i])]; }).concat([[c.t('total'), c.fmt(tot[i])]]), xs.length <= 40);
      });
    } else {
      F = frameXY(c, { x: { kind: 'band', keys: xs, inner: 0.36 }, y: { lo: 0, hi: Math.max.apply(null, tot), zero: true, unit: s.unit }, top: 6 });
      xs.forEach(function (x, i) {
        var acc = 0, x0 = F.x(x);
        list.forEach(function (se) {
          var v = se.values[i]; if (!isNum(v) || v <= 0) return;
          var y1 = F.y(acc), y0 = F.y(acc + v); acc += v;
          marks += rect(x0, y0, F.x.bw, y1 - y0, { fill: flags[i] ? c.est(se.color) : se.color, stroke: flags[i] ? se.color : '#FFFFFF', strokeWidth: flags[i] ? 1 : 0.75 });
          if (y1 - y0 >= 16 && F.x.bw > textW(c.fmt(v), 11) + 4) labels += text(x0 + F.x.bw / 2, (y0 + y1) / 2, c.fmt(v), { anchor: 'middle', baseline: 'middle', size: 11, fill: flags[i] ? THEME.ink : inkOn(se.color), halo: flags[i] });
        });
        if (s.totals !== false) labels += text(x0 + F.x.bw / 2, F.y(acc) - 5, c.fmt(acc), { anchor: 'middle', size: c.fs, weight: 600, fill: THEME.ink });
        hits += hitRect(x0, F.P.t, F.x.bw, F.P.h, xLabel(c, x), list.map(function (se) { return [se.name, c.fmt(se.values[i])]; }).concat([[c.t('total'), c.fmt(tot[i])]]), xs.length <= 40);
      });
      if (flags.indexOf(true) >= 0) c.addLegend(c.t('est'), THEME.ink2, 'est');
    }
    var head = [c.t('period')].concat(list.map(function (se) { return se.name; }), [c.t('total')]);
    c.setTable(head, xs.map(function (x, i) { return [xLabel(c, x)].concat(list.map(function (se) { return c.fmt(se.values[i]); }), [c.fmt(tot[i])]); }), xs.map(function (x, i) { return [x].concat(list.map(function (se) { return se.values[i]; }), [tot[i]]); }));
    return { svg: F.under + marks + F.base + F.axes + labels + hits, height: F.H };
  }
});

/* ── S02 100% stacked (mix) ──────────────────────────────────────────── */
register({
  id: 'S02', name: { zh: '百分比堆积图（结构）', en: '100% stacked (mix)' },
  question: { zh: '结构（占比）在各期/各组之间如何变化？', en: 'How does the mix (share) differ across periods or groups?' },
  use: { zh: '渠道结构、价格段结构、评分结构的跨期/跨组比较；每根柱合计 100%，并标注基数。', en: 'Channel, price-tier or rating mix across periods or groups; each bar sums to 100% with its base shown.' },
  avoid: { zh: '多选题（各项独立 0–100%，用 C01）；需要绝对额（用 S01）。', en: 'Multi-select survey answers (independent shares, use C01); absolute sizes (use S01).' },
  fields: [
    { key: 'x', role: 'category|time', required: true, desc: { zh: '期间或组别', en: 'Period or group' } },
    { key: 'y | series', role: 'measure[]', required: true, desc: { zh: '组成部分绝对值（引擎换算占比）', en: 'Component values (engine computes shares)' } }
  ],
  options: ['horizontal', 'showBase（默认显示每组合计）'],
  keywords: { zh: ['占比', '结构', '构成比例', '百分比堆积', '份额变化', 'mix', '渠道结构'], en: ['share', 'mix', '100% stacked', 'composition', 'proportion'] },
  aspect: 0.5, needsUnit: false,
  lint: function (s, add) { var k = measureKeys(s); checkFields(s, add, [s.x].concat(k)); partsLint(s, add, s.seriesBy ? [s.y] : k); },
  render: function (c) {
    var s = c.spec, m = measures(c), xs = m.xs, list = m.list;
    list.forEach(function (se, i) { se.color = c.color(se.name, i); c.addLegend(se.name, se.color, 'bar'); });
    var tot = xs.map(function (_, i) { return sum(list, function (se) { return se.values[i]; }); });
    var pf = { type: 'percent', decimals: 0 }, marks = '', labels = '', hits = '', F;
    if (s.horizontal) {
      F = frameBars(c, { keys: xs.map(String), lo: 0, hi: 100, unit: '', right: s.showBase === false ? 12 : Math.max.apply(null, tot.map(function (t) { return textW(c.fmt(t), c.fs); })) + 14, axis: false, grid: false, fmt: pf });
      xs.forEach(function (x, i) {
        var acc = 0, y = F.y(String(x));
        list.forEach(function (se) {
          var v = se.values[i]; if (!isNum(v) || v <= 0 || !tot[i]) return;
          var p = v / tot[i] * 100, x0 = F.x(acc), x1 = F.x(acc + p); acc += p;
          marks += rect(x0, y, x1 - x0, F.y.bw, { fill: se.color, stroke: '#FFFFFF', strokeWidth: 0.75 });
          if (x1 - x0 > textW(fmtNum(p, pf, c.lang), 11) + 6) labels += text((x0 + x1) / 2, y + F.y.bw / 2, fmtNum(p, pf, c.lang), { anchor: 'middle', baseline: 'middle', size: 11, fill: inkOn(se.color) });
        });
        if (s.showBase !== false) labels += text(F.P.r + 6, y + F.y.bw / 2, c.fmt(tot[i]), { baseline: 'middle', size: c.fs, fill: THEME.muted });
        hits += hitRect(F.P.l, y, F.P.w, F.y.bw, String(x), list.map(function (se) { return [se.name, fmtNum(tot[i] ? se.values[i] / tot[i] * 100 : null, 'percent:1', c.lang) + ' · ' + c.fmt(se.values[i])]; }), xs.length <= 40);
      });
    } else {
      F = frameXY(c, { x: { kind: 'band', keys: xs, inner: 0.3 }, y: { lo: 0, hi: 100, zero: true, fmt: pf, unit: '%', fixedMax: 100 }, top: s.showBase === false ? 0 : 16 });
      xs.forEach(function (x, i) {
        var acc = 0, x0 = F.x(x);
        list.forEach(function (se) {
          var v = se.values[i]; if (!isNum(v) || v <= 0 || !tot[i]) return;
          var p = v / tot[i] * 100, y1 = F.y(acc), y0 = F.y(acc + p); acc += p;
          marks += rect(x0, y0, F.x.bw, y1 - y0, { fill: se.color, stroke: '#FFFFFF', strokeWidth: 0.75 });
          if (y1 - y0 >= 15 && F.x.bw >= textW(fmtNum(p, pf, c.lang), 11) + 4) labels += text(x0 + F.x.bw / 2, (y0 + y1) / 2, fmtNum(p, pf, c.lang), { anchor: 'middle', baseline: 'middle', size: 11, fill: inkOn(se.color) });
        });
        if (s.showBase !== false) labels += text(x0 + F.x.bw / 2, F.P.t - 6, c.fmt(tot[i]), { anchor: 'middle', size: 11, fill: THEME.muted });
        hits += hitRect(x0, F.P.t, F.x.bw, F.P.h, xLabel(c, x), list.map(function (se) { return [se.name, fmtNum(tot[i] ? se.values[i] / tot[i] * 100 : null, 'percent:1', c.lang)]; }), xs.length <= 40);
      });
    }
    if (s.showBase !== false) c.notesExtra.push((c.lang === 'en' ? 'Figures above or beside each bar are totals' : '柱上方/右侧数字为合计') + (s.unit ? (c.lang === 'en' ? ' (' + s.unit + ').' : '（' + s.unit + '）。') : (c.lang === 'en' ? '.' : '。')));
    c.setTable([c.t('period')].concat(list.map(function (se) { return se.name; }), [c.t('total')]), xs.map(function (x, i) { return [xLabel(c, x)].concat(list.map(function (se) { return fmtNum(tot[i] ? se.values[i] / tot[i] * 100 : null, 'percent:1', c.lang); }), [c.fmt(tot[i])]); }), xs.map(function (x, i) { return [x].concat(list.map(function (se) { return se.values[i]; }), [tot[i]]); }));
    return { svg: F.under + marks + F.base + F.axes + labels + hits, height: F.H };
  }
});

/* ── S03 Waterfall / bridge ──────────────────────────────────────────── */
function bridgeSteps(s) {
  var rows = asArray(s.data), acc = 0, out = [];
  rows.forEach(function (r, i) {
    var kind = String(r[s.kind || 'kind'] || (i === 0 ? 'total' : 'delta')).toLowerCase();
    var v = num(r[s.y || 'value']);
    if (kind === 'total' || kind === 'subtotal' || kind === 'end') {
      var calc = i === 0 ? v : acc;
      out.push({ label: String(r[s.x || 'label']), kind: 'total', given: v, value: i === 0 ? v : (isNum(v) ? v : calc), calc: calc, start: 0 });
      acc = i === 0 ? v : (isNum(v) ? v : calc);
    } else {
      out.push({ label: String(r[s.x || 'label']), kind: 'delta', value: v, start: acc });
      acc += isNum(v) ? v : 0;
    }
  });
  return out;
}
register({
  id: 'S03', name: { zh: '瀑布图 / 桥接图', en: 'Waterfall / bridge' },
  question: { zh: '从起点到终点，各因素分别贡献（增加或扣减）了多少？', en: 'From start to end, how much did each driver add or subtract?' },
  use: { zh: '利润桥（收入→毛利→经营利润）、同比变动归因（量价结构）、费用拆解、分部加总估值。', en: 'Profit bridges, YoY variance attribution (price/volume/mix), cost build-ups, sum-of-the-parts.' },
  avoid: { zh: '各步之间没有加减关系；超过 12 步（合并小项）。', en: 'Steps that do not add up; more than 12 steps (merge small items).' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '步骤名（默认字段 label）', en: 'Step label (default field "label")' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '数值（默认字段 value）：total 为水平值，delta 为增减', en: 'Value (default "value"): level for totals, change for deltas' } },
    { key: 'kind', role: 'enum', required: true, desc: { zh: 'total | subtotal | delta；首行为起点，subtotal/total 必须等于累计值', en: 'total | subtotal | delta; first row is the start; subtotals must equal the running sum' } }
  ],
  options: ['goodDirection:"down"（成本桥）', 'horizontal'],
  keywords: { zh: ['瀑布图', '桥接图', '利润桥', '归因', '增减分解', '从收入到利润', '量价分析', '分部估值', 'SOTP'], en: ['waterfall', 'bridge', 'profit bridge', 'variance', 'attribution', 'sum of the parts'] },
  aspect: 0.5,
  lint: function (s, add) {
    var steps = bridgeSteps(s);
    if (!steps.length || steps[0].kind !== 'total') add('error', 'E_BRIDGE_START', '首行必须是起点（kind: total）');
    steps.forEach(function (st, i) {
      if (st.kind === 'total' && i > 0 && isNum(st.given) && isNum(st.calc)) {
        var tol = Math.max(Math.abs(st.calc) * 0.005, 0.5 * Math.pow(10, -(s.format && s.format.decimals != null ? s.format.decimals : 0)));
        if (Math.abs(st.given - st.calc) > tol) add('error', 'E_BRIDGE_SUM', '“' + st.label + '” 给定 ' + st.given + '，但起点加各项增减为 ' + (+st.calc.toFixed(4)) + '：桥接不平');
      }
      if (st.kind === 'delta' && !isNum(st.value)) add('error', 'E_FIELD', '“' + st.label + '” 缺少数值');
    });
    if (steps.length > 12) add('warning', 'W_ITEMS', '超过 12 步：合并小项为“其他”');
  },
  render: function (c) {
    var s = c.spec, steps = bridgeSteps(s), good = s.goodDirection === 'down' ? -1 : 1;
    var levels = []; steps.forEach(function (st) { levels.push(st.start, st.start + (st.kind === 'total' ? st.value : st.value), st.kind === 'total' ? st.value : st.start + st.value); });
    var e = extent(levels), keys = steps.map(function (st, i) { return i + ':' + st.label; });
    var F = frameXY(c, { x: { kind: 'band', keys: keys, inner: 0.3, labels: function (k) { return k.slice(k.indexOf(':') + 1); } }, y: { lo: Math.min(0, e[0]), hi: Math.max(0, e[1]), zero: true, unit: s.unit }, top: 6 });
    var marks = '', labels = '', hits = '', prevEnd = null;
    steps.forEach(function (st, i) {
      var k = keys[i], x0 = F.x(k), a, b, col;
      if (st.kind === 'total') { a = 0; b = st.value; col = c.pal.primary; }
      else { a = st.start; b = st.start + st.value; col = st.value * good >= 0 ? THEME.good : THEME.bad; }
      var y0 = F.y(Math.max(a, b)), y1 = F.y(Math.min(a, b));
      marks += rect(x0, y0, F.x.bw, Math.max(1, y1 - y0), { fill: col, crisp: true });
      if (prevEnd != null) marks += line(F.x(keys[i - 1]) + F.x.bw, Math.round(F.y(prevEnd)) + .5, x0, Math.round(F.y(prevEnd)) + .5, { stroke: THEME.faint, dash: '2 2' });
      prevEnd = st.kind === 'total' ? st.value : b;
      var txt = st.kind === 'total' ? c.fmt(st.value) : c.fmt(st.value, { sign: true });
      var up = st.kind === 'total' ? st.value >= 0 : st.value >= 0;
      labels += text(x0 + F.x.bw / 2, up ? y0 - 5 : y1 + 13, txt, { anchor: 'middle', size: c.fs, weight: st.kind === 'total' ? 700 : 600, fill: st.kind === 'total' ? THEME.ink : col });
      hits += hitRect(x0, F.P.t, F.x.bw, F.P.h, st.label, [[st.kind === 'total' ? c.t('total') : (c.lang === 'en' ? 'Change' : '变动'), txt]], true);
    });
    c.addLegend(c.lang === 'en' ? 'Total / subtotal' : '合计 / 小计', c.pal.primary, 'bar');
    c.addLegend(good > 0 ? c.t('increase') : c.t('decrease'), THEME.good, 'bar');
    c.addLegend(good > 0 ? c.t('decrease') : c.t('increase'), THEME.bad, 'bar');
    c.setTable([c.t('item'), c.t('value'), c.lang === 'en' ? 'Running total' : '累计'], steps.map(function (st) { return [st.label, st.kind === 'total' ? c.fmt(st.value) : c.fmt(st.value, { sign: true }), c.fmt(st.kind === 'total' ? st.value : st.start + st.value)]; }), steps.map(function (st) { return [st.label, st.value, st.kind === 'total' ? st.value : st.start + st.value]; }));
    return { svg: F.under + marks + F.base + F.axes + labels + hits, height: F.H };
  }
});

/* ── S04 Donut ───────────────────────────────────────────────────────── */
function arcPath(cx, cy, r0, r1, a0, a1) {
  var p = function (r, a) { return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; };
  var big = a1 - a0 > Math.PI ? 1 : 0, A = p(r1, a0), B = p(r1, a1), C = p(r0, a1), D = p(r0, a0);
  if (a1 - a0 >= Math.PI * 2 - 1e-6) return 'M' + r2(cx) + ' ' + r2(cy - r1) + 'A' + r1 + ' ' + r1 + ' 0 1 1 ' + r2(cx - 0.01) + ' ' + r2(cy - r1) + 'Z M' + r2(cx) + ' ' + r2(cy - r0) + 'A' + r0 + ' ' + r0 + ' 0 1 0 ' + r2(cx - 0.01) + ' ' + r2(cy - r0) + 'Z';
  return 'M' + r2(A[0]) + ' ' + r2(A[1]) + 'A' + r1 + ' ' + r1 + ' 0 ' + big + ' 1 ' + r2(B[0]) + ' ' + r2(B[1]) + 'L' + r2(C[0]) + ' ' + r2(C[1]) + 'A' + r0 + ' ' + r0 + ' 0 ' + big + ' 0 ' + r2(D[0]) + ' ' + r2(D[1]) + 'Z';
}
register({
  id: 'S04', name: { zh: '环形图（≤6 项）', en: 'Donut (≤6 parts)' },
  question: { zh: '一个整体由哪几部分组成，最大的部分占多少？', en: 'What makes up one whole, and how big is the largest part?' },
  use: { zh: '单一整体的 2–6 个互斥部分（收入构成、渠道占比），中心显示合计。', en: 'A single whole split into 2–6 mutually exclusive parts, with the total in the centre.' },
  avoid: { zh: '部分 >6、需要精确比较相近份额、跨期比较（用 C01/S02）。', en: 'More than 6 parts, close shares to compare, or several periods (use C01/S02).' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '部分名称', en: 'Part' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '数值（非负，引擎计算占比）', en: 'Value (non-negative; shares computed)' } }
  ],
  options: ['centerLabel', 'otherLabel（“其他”排最后）'],
  keywords: { zh: ['环形图', '饼图', '占比', '构成', '收入结构', '份额'], en: ['donut', 'pie', 'share', 'composition', 'breakdown'] },
  aspect: 0.62,
  lint: function (s, add) {
    checkFields(s, add, [s.x, s.y]); partsLint(s, add, [s.y]);
    var n = asArray(s.data).length;
    if (n > 7) add('error', 'E_SLICES', n + ' 个部分：环形图最多 6 项（可含“其他”），请合并或改用 C01');
    else if (n > 6) add('warning', 'W_SLICES', '7 项：建议合并小项为“其他”');
  },
  render: function (c) {
    var s = c.spec, other = s.otherLabel || c.t('other');
    var rows = asArray(s.data).map(function (r) { return { k: String(r[s.x]), v: num(r[s.y]) || 0 }; });
    rows.sort(function (a, b) { return (a.k === other) - (b.k === other) || b.v - a.v; });
    var tot = sum(rows, function (r) { return r.v; }), H = c.height(0.62, 260, 380), cx = c.W / 2, cy = H / 2 + 4;
    var R = Math.min(H / 2 - 30, c.W * (c.W < 560 ? 0.24 : 0.2)), r0 = R * 0.6, a = 0, out = '', labs = [];
    rows.forEach(function (r, i) {
      var sw = tot ? r.v / tot * Math.PI * 2 : 0, col = r.k === other ? THEME.dim : c.color(r.k, i);
      out += path(arcPath(cx, cy, r0, R, a, a + sw), { fill: col, stroke: '#FFFFFF', width: 1.2, cls: 'bz-hit', data: tip(r.k, [[c.t('share'), fmtNum(tot ? r.v / tot * 100 : null, 'percent:1', c.lang)], [c.t('value'), c.fmt(r.v)]]) });
      var mid = a + sw / 2, side = Math.sin(mid) >= 0 ? 1 : -1;
      labs.push({ mid: mid, side: side, y: cy - (R + 14) * Math.cos(mid), ax: cx + R * Math.sin(mid), ay: cy - R * Math.cos(mid), t: r.k, p: fmtNum(tot ? r.v / tot * 100 : null, 'percent:1', c.lang), col: col });
      a += sw;
    });
    [1, -1].forEach(function (side) {
      var group = labs.filter(function (l) { return l.side === side; });
      spread(group, 32, 14, H - 14);
      group.forEach(function (l) {
        var lx = cx + side * (R + 26);
        out += path('M' + r2(l.ax) + ' ' + r2(l.ay) + 'L' + r2(cx + side * (R + 12)) + ' ' + r2(l.y) + 'L' + r2(lx - side * 4) + ' ' + r2(l.y), { stroke: THEME.faint, width: 1 });
        out += text(lx, l.y - 3, l.t, { anchor: side > 0 ? 'start' : 'end', size: c.fs, fill: THEME.ink2 });
        out += text(lx, l.y + 13, l.p, { anchor: side > 0 ? 'start' : 'end', size: c.fs, weight: 700, fill: THEME.ink });
      });
    });
    var cl = wrapText(s.centerLabel || (c.t('total') + (s.unit ? (c.lang === 'en' ? ' (' + s.unit + ')' : '（' + s.unit + '）') : '')), r0 * 1.7, 11, 400, 2);
    out += text(cx, cy - 4 - (cl.length - 1) * 6, c.fmt(tot), { anchor: 'middle', size: 18, weight: 700, fill: THEME.ink });
    cl.forEach(function (ln, i) { out += text(cx, cy + 14 + i * 13 - (cl.length - 1) * 6, ln, { anchor: 'middle', size: 11, fill: THEME.muted }); });
    c.setTable([c.t('item'), c.t('value'), c.t('share')], rows.map(function (r) { return [r.k, c.fmt(r.v), fmtNum(tot ? r.v / tot * 100 : null, 'percent:1', c.lang)]; }), rows.map(function (r) { return [r.k, r.v, tot ? r.v / tot * 100 : null]; }));
    var shares = rows.map(function (r) { return tot ? Math.round(r.v / tot * 1000) / 10 : 0; }), ss = Math.round(sum(shares) * 10) / 10;
    if (ss !== 100) c.notesExtra.push(c.lang === 'en' ? 'Shares may not sum to 100% due to rounding.' : '占比四舍五入，合计可能不等于 100%。');
    return { svg: out, height: H };
  }
});

/* ── S05 Treemap (squarified) ────────────────────────────────────────── */
function squarify(items, x, y, w, h) {
  var out = [], list = items.slice().sort(function (a, b) { return b.v - a.v; }), total = sum(list, function (d) { return d.v; });
  if (!total) return out;
  var scale = w * h / total;
  list = list.map(function (d) { return { d: d, a: d.v * scale }; });
  function worst(row, side) { var s = sum(row, function (r) { return r.a; }), mx = Math.max.apply(null, row.map(function (r) { return r.a; })), mn = Math.min.apply(null, row.map(function (r) { return r.a; })); return Math.max(side * side * mx / (s * s), s * s / (side * side * mn)); }
  var row = [];
  while (list.length) {
    var side = Math.min(w, h), next = list[0];
    if (!row.length || worst(row.concat([next]), side) <= worst(row, side)) { row.push(next); list.shift(); }
    else { lay(); row = []; }
  }
  if (row.length) lay();
  function lay() {
    var s = sum(row, function (r) { return r.a; }), horiz = w >= h, thick = s / (horiz ? h : w), off = 0;
    row.forEach(function (r) {
      var len = r.a / thick;
      if (horiz) out.push({ d: r.d, x: x, y: y + off, w: thick, h: len }); else out.push({ d: r.d, x: x + off, y: y, w: len, h: thick });
      off += len;
    });
    if (horiz) { x += thick; w -= thick; } else { y += thick; h -= thick; }
  }
  return out;
}
register({
  id: 'S05', name: { zh: '矩形树图', en: 'Treemap' },
  question: { zh: '在一个大盘子里，哪些类别/子类占得最多？', en: 'Within one total, which categories and sub-categories take the most?' },
  use: { zh: '两层层级的规模分布（品类→子类目、站点→店铺），面积 = 数值；可按增速着色。', en: 'Two-level size distribution (category → sub-category); area = value; optional growth colouring.' },
  avoid: { zh: '有负值；需要精确比较（用 C01）；叶子 >40 个（合并长尾）。', en: 'Negative values; precise comparison (use C01); more than 40 leaves (merge the tail).' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '叶子名称', en: 'Leaf name' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '面积数值（非负）', en: 'Area value (non-negative)' } },
    { key: 'parent', role: 'category', required: false, desc: { zh: '父级字段（两层时）', en: 'Parent field (two levels)' } },
    { key: 'colorBy', role: 'measure', required: false, desc: { zh: '着色指标（如同比增速，发散色）', en: 'Colour metric (e.g. growth, diverging)' } }
  ],
  options: ['parent', 'colorBy', 'colorFormat'],
  keywords: { zh: ['矩形树图', '树图', '层级', '规模分布', '类目结构', '面积图'], en: ['treemap', 'hierarchy', 'size distribution', 'category structure'] },
  aspect: 0.56,
  lint: function (s, add) { checkFields(s, add, [s.x, s.y, s.parent, s.colorBy]); partsLint(s, add, [s.y]); if (asArray(s.data).length > 40) add('warning', 'W_ITEMS', '叶子超过 40 个：合并长尾'); },
  render: function (c) {
    var s = c.spec, data = asArray(s.data).filter(function (r) { return num(r[s.y]) > 0; }), H = c.height(), W = c.W, out = '', tot = sum(data, function (r) { return num(r[s.y]); });
    var parents = s.parent ? uniq(data.map(function (r) { return String(r[s.parent]); })) : [null];
    var colorScale = null;
    if (s.colorBy) { var cv = data.map(function (r) { return num(r[s.colorBy]); }).filter(isNum), mx = Math.max(Math.abs(extent(cv)[0]), Math.abs(extent(cv)[1])) || 1; colorScale = function (v) { return isNum(v) ? rampAt(c.pal.div, 0.5 + v / mx / 2) : THEME.dim; }; }
    var groups = parents.map(function (p, i) { var rows = s.parent ? data.filter(function (r) { return String(r[s.parent]) === p; }) : data; return { p: p, v: sum(rows, function (r) { return num(r[s.y]); }), rows: rows, color: s.parent ? c.color(p, i) : c.pal.primary }; });
    var top = squarify(groups.map(function (g) { return { v: g.v, g: g }; }), 0, 0, W, H - 2);
    top.forEach(function (t) {
      var g = t.d.g, hdr = s.parent && t.h > 40 && t.w > 60 ? 18 : 0;
      var hdrFill = colorScale ? THEME.ink2 : g.color;
      if (hdr) { out += rect(t.x, t.y, t.w, hdr, { fill: hdrFill }); out += text(t.x + 6, t.y + 13, truncate(g.p + '  ' + fmtNum(g.v / tot * 100, 'percent:0', c.lang), t.w - 10, 11, 600), { size: 11, weight: 600, fill: inkOn(hdrFill) }); }
      var leaves = squarify(g.rows.map(function (r) { return { v: num(r[s.y]), r: r }; }), t.x, t.y + hdr, t.w, t.h - hdr);
      leaves.forEach(function (lf, j) {
        var r = lf.d.r, v = num(r[s.y]), base = colorScale ? colorScale(num(r[s.colorBy])) : (s.parent ? mix(g.color, '#FFFFFF', 0.18 + 0.5 * (j / Math.max(1, leaves.length))) : rampAt(c.pal.seq.slice(2), 1 - j / Math.max(1, leaves.length - 1) * 0.85));
        out += rect(lf.x, lf.y, lf.w, lf.h, { fill: base, stroke: '#FFFFFF', strokeWidth: 1.5, cls: 'bz-hit', data: tip(String(r[s.x]), [[c.t('value'), c.fmt(v)], [c.t('share'), fmtNum(v / tot * 100, 'percent:1', c.lang)]].concat(s.colorBy ? [[labelOf(s, s.colorBy), fmtNum(r[s.colorBy], s.colorFormat || 'percent', c.lang, { sign: true })]] : []).concat(s.parent ? [[c.t('category'), g.p]] : [])) });
        var tc = inkOn(base);
        if (lf.w > 46 && lf.h > 32) {
          out += text(lf.x + 6, lf.y + 15, truncate(String(r[s.x]), lf.w - 10, 12, 600), { size: 12, weight: 600, fill: tc });
          out += text(lf.x + 6, lf.y + 30, truncate(c.fmt(v) + (lf.h > 46 ? '' : '  ' + fmtNum(v / tot * 100, 'percent:0', c.lang)), lf.w - 10, 11), { size: 11, fill: tc });
          if (lf.h > 46) out += text(lf.x + 6, lf.y + 44, s.colorBy ? fmtNum(r[s.colorBy], s.colorFormat || 'percent', c.lang, { sign: true }) : fmtNum(v / tot * 100, 'percent:1', c.lang), { size: 11, fill: tc });
        }
      });
    });
    if (s.parent && !s.colorBy) groups.forEach(function (g) { c.addLegend(g.p, g.color, 'bar'); });
    if (s.colorBy) { c.addLegend((labelOf(s, s.colorBy)) + (c.lang === 'en' ? ': negative' : '：负'), c.pal.div[1], 'bar'); c.addLegend(c.lang === 'en' ? 'positive' : '正', c.pal.div[5], 'bar'); }
    c.notesExtra.push(c.lang === 'en' ? 'Rectangle area is proportional to value.' : '矩形面积与数值成正比。');
    c.setTable((s.parent ? [c.t('category')] : []).concat([c.t('item'), c.t('value'), c.t('share')], s.colorBy ? [labelOf(s, s.colorBy)] : []), data.map(function (r) { var v = num(r[s.y]); return (s.parent ? [String(r[s.parent])] : []).concat([String(r[s.x]), c.fmt(v), fmtNum(v / tot * 100, 'percent:1', c.lang)], s.colorBy ? [fmtNum(r[s.colorBy], s.colorFormat || 'percent', c.lang, { sign: true })] : []); }));
    return { svg: out, height: H };
  }
});

/* ── S06 Marimekko ───────────────────────────────────────────────────── */
register({
  id: 'S06', name: { zh: '马赛克图（Marimekko）', en: 'Marimekko (market map)' },
  question: { zh: '各细分市场有多大，每个细分里谁占多少份额？', en: 'How large is each segment, and who holds what share within it?' },
  use: { zh: '市场地图：列宽 = 细分市场规模，列内高度 = 玩家份额；定位我方在哪些细分有优势。', en: 'Market map: column width = segment size, height = player share; shows where the subject is strong.' },
  avoid: { zh: '细分 >8 或玩家 >6（合并为“其他”）。', en: 'More than 8 segments or 6 players (merge into “Other”).' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '细分市场', en: 'Segment' } },
    { key: 'seriesBy', role: 'category', required: true, desc: { zh: '玩家/品牌字段', en: 'Player field' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '销售额（非负）', en: 'Sales (non-negative)' } }
  ],
  options: ['highlight（玩家名）', 'otherLabel'],
  keywords: { zh: ['马赛克图', 'Marimekko', '市场地图', '细分市场', '市场份额', '竞争格局'], en: ['marimekko', 'mekko', 'market map', 'segment share', 'competitive landscape'] },
  aspect: 0.58,
  lint: function (s, add) { checkFields(s, add, [s.x, s.seriesBy, s.y]); partsLint(s, add, [s.y]); },
  render: function (c) {
    var s = c.spec, data = asArray(s.data), segs = uniq(data.map(function (r) { return String(r[s.x]); })), players = uniq(data.map(function (r) { return String(r[s.seriesBy]); }));
    var other = s.otherLabel || c.t('other');
    players.sort(function (a, b) { return (a === other) - (b === other); });
    var val = function (sg, p) { var r = data.filter(function (d) { return String(d[s.x]) === sg && String(d[s.seriesBy]) === p; })[0]; return r ? (num(r[s.y]) || 0) : 0; };
    var segTot = segs.map(function (sg) { return sum(players, function (p) { return val(sg, p); }); }), tot = sum(segTot);
    var H = c.height(), top = 34, bottom = H - 30, left = 40, right = c.W - 8, w = right - left, out = '', x = left;
    var pcol = {}, hl = asArray(s.highlight), greys = ['#9AA4B1', '#B8C0CA', '#CFD5DD', '#A9B6C6', '#C4CDD8'], gi = 0;
    players.forEach(function (p, i) {
      if (p === other) pcol[p] = '#E1E5EA';
      else if (hl.length) pcol[p] = hl.indexOf(p) >= 0 ? c.pal.series[hl.indexOf(p) % c.pal.series.length] : greys[gi++ % greys.length];
      else pcol[p] = c.color(p, i);
    });
    [0, 25, 50, 75, 100].forEach(function (t) { var yy = bottom - (bottom - top) * t / 100; out += text(left - 6, yy, t + '%', { anchor: 'end', baseline: 'middle', size: c.fs, fill: THEME.ink2 }); });
    segs.forEach(function (sg, i) {
      var cw = w * segTot[i] / tot, acc = 0;
      players.forEach(function (p) {
        var v = val(sg, p); if (!v) return;
        var sh = v / segTot[i], y1 = bottom - (bottom - top) * acc, y0 = bottom - (bottom - top) * (acc + sh); acc += sh;
        out += rect(x, y0, cw, y1 - y0, { fill: pcol[p], stroke: '#FFFFFF', strokeWidth: 1.2, cls: 'bz-hit', data: tip(sg + ' · ' + p, [[c.lang === 'en' ? 'Share of segment' : '细分内份额', fmtNum(sh * 100, 'percent:1', c.lang)], [c.t('value'), c.fmt(v)]]) });
        if (cw > 34 && y1 - y0 > 16) out += text(x + cw / 2, (y0 + y1) / 2, fmtNum(sh * 100, 'percent:0', c.lang), { anchor: 'middle', baseline: 'middle', size: 11, fill: inkOn(pcol[p]), weight: asArray(s.highlight).indexOf(p) >= 0 ? 700 : 400 });
      });
      var lbl = truncate(sg, Math.max(cw - 4, 20), c.fs, 600);
      out += text(x + cw / 2, top - 18, lbl, { anchor: 'middle', size: c.fs, weight: 600, fill: THEME.ink });
      out += text(x + cw / 2, top - 4, fmtNum(segTot[i] / tot * 100, 'percent:0', c.lang), { anchor: 'middle', size: 11, fill: THEME.muted });
      x += cw;
    });
    out += text(left, bottom + 18, (c.lang === 'en' ? 'Column width = segment size; total ' : '列宽 = 细分市场规模；合计 ') + c.fmt(tot) + (s.unit ? ' ' + s.unit : ''), { size: c.fs, fill: THEME.muted });
    players.forEach(function (p) { c.addLegend(p, pcol[p], 'bar'); });
    c.setTable([c.lang === 'en' ? 'Segment' : '细分市场'].concat(players, [c.t('total')]), segs.map(function (sg, i) { return [sg].concat(players.map(function (p) { return c.fmt(val(sg, p)); }), [c.fmt(segTot[i])]); }), segs.map(function (sg, i) { return [sg].concat(players.map(function (p) { return val(sg, p); }), [segTot[i]]); }));
    return { svg: out, height: H };
  }
});

/* ── S07 Sankey ──────────────────────────────────────────────────────── */
register({
  id: 'S07', name: { zh: '桑基图（流向）', en: 'Sankey (flows)' },
  question: { zh: '总量从哪里来、流向哪里、在每一层分成多少？', en: 'Where does the total come from, where does it go, and how does it split at each stage?' },
  use: { zh: '利润表流向（收入→成本/毛利→费用/利润）、流量来源→落地页→转化、预算分配。', en: 'Income-statement flows, traffic source → landing → conversion, budget allocation.' },
  avoid: { zh: '流不守恒且无法解释；节点 >20（聚合）；需要逐路径查询。', en: 'Flows that do not conserve; more than 20 nodes (aggregate).' },
  fields: [
    { key: 'source / target / value', role: 'link', required: true, desc: { zh: 'data 为连线数组：{source, target, value}', en: 'data is a link list: {source, target, value}' } },
    { key: 'nodes', role: 'list', required: false, desc: { zh: '可选 [{id, label, kind:"cost"|"profit"}] 控制顺序与配色', en: 'Optional [{id, label, kind:"cost"|"profit"}] for order and colour' } }
  ],
  options: ['nodes', 'nodeColors'],
  keywords: { zh: ['桑基图', '流向', '利润表拆解', '收入流向', '转化路径', '资金流向', '预算分配'], en: ['sankey', 'flow', 'income statement', 'where the money goes', 'allocation'] },
  aspect: 0.58, dataKind: 'links',
  lint: function (s, add) {
    var links = asArray(s.data);
    if (!links.length) add('error', 'E_DATA', 'data 应为连线数组 {source, target, value}');
    links.forEach(function (l) { if (!(num(l.value) > 0)) add('error', 'E_LINK', '连线 ' + l.source + '→' + l.target + ' 数值必须 >0'); });
    var inn = {}, outv = {};
    links.forEach(function (l) { inn[l.target] = (inn[l.target] || 0) + (num(l.value) || 0); outv[l.source] = (outv[l.source] || 0) + (num(l.value) || 0); });
    Object.keys(inn).forEach(function (n) { if (outv[n] != null && Math.abs(inn[n] - outv[n]) > Math.max(inn[n], outv[n]) * 0.005) add('warning', 'W_FLOW', '节点 “' + n + '” 流入 ' + inn[n] + ' ≠ 流出 ' + outv[n] + '：确认差额已列示'); });
  },
  render: function (c) {
    var s = c.spec, links = asArray(s.data).map(function (l) { return { s: String(l.source), t: String(l.target), v: num(l.value) || 0 }; });
    var meta = {}; asArray(s.nodes).forEach(function (n) { meta[String(n.id)] = n; });
    var ids = uniq([].concat.apply([], links.map(function (l) { return [l.s, l.t]; })));
    var col = {}; ids.forEach(function (id) { col[id] = 0; });
    for (var it = 0; it < ids.length; it++) links.forEach(function (l) { if (col[l.t] < col[l.s] + 1) col[l.t] = col[l.s] + 1; });
    var ncol = Math.max.apply(null, ids.map(function (id) { return col[id]; })) + 1;
    var val = {}; ids.forEach(function (id) { var a = sum(links.filter(function (l) { return l.t === id; }), function (l) { return l.v; }), b = sum(links.filter(function (l) { return l.s === id; }), function (l) { return l.v; }); val[id] = Math.max(a, b); });
    var order = Object.keys(meta).length ? Object.keys(meta) : ids;
    var H = c.height(), top = 10, bottom = H - 10, labelW = Math.min(c.W * 0.22, Math.max.apply(null, ids.map(function (id) { return textW((meta[id] && meta[id].label) || id, c.fs, 600); })) + 8);
    var nodeW = 12, left = labelW, right = c.W - labelW, step = ncol > 1 ? (right - left - nodeW) / (ncol - 1) : 0;
    var cols = []; for (var k = 0; k < ncol; k++) cols.push(ids.filter(function (id) { return col[id] === k; }).sort(function (a, b) { var ia = order.indexOf(a), ib = order.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); }));
    var gap = 14, maxSum = Math.max.apply(null, cols.map(function (cl) { return sum(cl, function (id) { return val[id]; }); }));
    var maxN = Math.max.apply(null, cols.map(function (cl) { return cl.length; }));
    var ky = (bottom - top - gap * (maxN - 1)) / maxSum, pos = {};
    cols.forEach(function (cl, k) { var used = sum(cl, function (id) { return val[id] * ky; }) + gap * (cl.length - 1), y = top + (bottom - top - used) / 2; cl.forEach(function (id) { pos[id] = { x: left + k * step, y: y, h: Math.max(1, val[id] * ky), so: 0, to: 0 }; y += pos[id].h + gap; }); });
    var colorOf = function (id, i) { var m = meta[id] || {}; if (s.nodeColors && s.nodeColors[id]) return s.nodeColors[id]; if (m.kind === 'cost') return THEME.bad; if (m.kind === 'profit') return THEME.good; return col[id] === 0 ? c.pal.primary : c.pal.series[2]; };
    var out = '', hits = '';
    links.sort(function (a, b) { return pos[a.s].y - pos[b.s].y || pos[a.t].y - pos[b.t].y; }).forEach(function (l) {
      var a = pos[l.s], b = pos[l.t], h = l.v * ky, y0 = a.y + a.so + h / 2, y1 = b.y + b.to + h / 2; a.so += h; b.to += h;
      var x0 = a.x + nodeW, x1 = b.x, mx = (x0 + x1) / 2, tc = colorOf(l.t);
      out += path('M' + r2(x0) + ' ' + r2(y0) + 'C' + r2(mx) + ' ' + r2(y0) + ' ' + r2(mx) + ' ' + r2(y1) + ' ' + r2(x1) + ' ' + r2(y1), { stroke: mix(tc, '#FFFFFF', 0.55), width: Math.max(1, h), opacity: 0.75, cls: 'bz-hit', data: tip(((meta[l.s] || {}).label || l.s) + ' → ' + ((meta[l.t] || {}).label || l.t), [[c.t('value'), c.fmt(l.v)], [c.lang === 'en' ? 'Share of source' : '占来源', fmtNum(l.v / val[l.s] * 100, 'percent:1', c.lang)]]) });
    });
    var colLabels = {};
    ids.forEach(function (id, i) {
      var p = pos[id], colr = colorOf(id, i);
      out += rect(p.x, p.y, nodeW, p.h, { fill: colr });
      (colLabels[col[id]] = colLabels[col[id]] || []).push({ id: id, y: p.y + p.h / 2 });
    });
    Object.keys(colLabels).forEach(function (k) {
      var items = colLabels[k], two = c.W >= 560;
      spread(items, two ? 30 : 16, top + 8, bottom - 8);
      items.forEach(function (it) {
        var id = it.id, p = pos[id], name = (meta[id] && meta[id].label) || id;
        var lx = col[id] === 0 ? p.x - 6 : p.x + nodeW + 6, anc = col[id] === 0 ? 'end' : 'start';
        var maxW = col[id] === 0 ? labelW - 8 : (col[id] === ncol - 1 ? c.W - lx - 2 : step - nodeW - 14);
        if (two) {
          out += text(lx, it.y - 7, truncate(name, maxW, c.fs, 600), { anchor: anc, baseline: 'middle', size: c.fs, weight: 600, fill: THEME.ink, halo: true });
          out += text(lx, it.y + 8, c.fmt(val[id]), { anchor: anc, baseline: 'middle', size: 11, fill: THEME.ink2, halo: true });
        } else out += text(lx, it.y, truncate(name + ' ' + c.fmt(val[id]), maxW, 11, 600), { anchor: anc, baseline: 'middle', size: 11, weight: 600, fill: THEME.ink, halo: true });
      });
    });
    c.notesExtra.push(c.lang === 'en' ? 'Band width is proportional to value.' : '带宽与数值成正比。');
    c.setTable([c.lang === 'en' ? 'From' : '来源', c.lang === 'en' ? 'To' : '去向', c.t('value')], links.map(function (l) { return [(meta[l.s] || {}).label || l.s, (meta[l.t] || {}).label || l.t, c.fmt(l.v)]; }), links.map(function (l) { return [l.s, l.t, l.v]; }));
    return { svg: out + hits, height: H };
  }
});

/* ── S08 Funnel ──────────────────────────────────────────────────────── */
register({
  id: 'S08', name: { zh: '转化漏斗', en: 'Conversion funnel' },
  question: { zh: '从曝光到成交每一步流失多少，哪一环转化率最低？', en: 'How much is lost at each step from impression to order; which step converts worst?' },
  use: { zh: '广告/店铺转化路径（曝光→点击→加购→下单），注明环节转化率与整体转化率。', en: 'Ad or store conversion paths (impressions → clicks → add-to-cart → orders) with stage and overall rates.' },
  avoid: { zh: '各步不是同一批对象的递进（不同口径不能串成漏斗）。', en: 'Steps that are not a nested sequence of the same population.' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '环节名称（按顺序）', en: 'Stage (in order)' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '该环节数量（应逐级不增）', en: 'Count at stage (non-increasing)' } }
  ],
  options: [],
  keywords: { zh: ['漏斗', '转化率', '转化路径', '流失', '曝光点击', '加购', '下单'], en: ['funnel', 'conversion', 'drop-off', 'click through', 'add to cart'] },
  aspect: 0.5,
  lint: function (s, add) {
    checkFields(s, add, [s.x, s.y]); partsLint(s, add, [s.y]);
    var v = asArray(s.data).map(function (r) { return num(r[s.y]); });
    for (var i = 1; i < v.length; i++) if (v[i] > v[i - 1]) { add('error', 'E_FUNNEL', '第 ' + (i + 1) + ' 步数值大于上一步：漏斗必须逐级不增（口径不一致不能串联）'); break; }
  },
  render: function (c) {
    var s = c.spec, rows = asArray(s.data).map(function (r) { return { k: String(r[s.x]), v: num(r[s.y]) }; });
    var n = rows.length, rowH = 40, top = 6, H = top + n * rowH + 30, labW = Math.min(c.W * 0.26, Math.max.apply(null, rows.map(function (r) { return textW(r.k, c.fs, 600); })) + 14);
    var rateW = 120, cx0 = labW + 6, cw = c.W - labW - rateW - 12, out = '';
    var cut = n > 2 && rows[1].v > 0 && rows[0].v / rows[1].v > 12, mx = cut ? rows[1].v / 0.82 : (rows[0].v || 1);
    var rates = rows.map(function (r, i) { return i && rows[i - 1].v ? r.v / rows[i - 1].v * 100 : null; });
    var worst = -1; rates.forEach(function (r, i) { if (i && isNum(r) && (worst < 0 || r < rates[worst])) worst = i; });
    rows.forEach(function (r, i) {
      var w = Math.max(2, Math.min(cw, cw * r.v / mx)), x = cx0 + (cw - w) / 2, y = top + i * rowH, col = rampAt([c.pal.primary, c.pal.series[2]], n > 1 ? i / (n - 1) : 0);
      out += rect(x, y, w, rowH - 12, { fill: col, cls: 'bz-hit', data: tip(r.k, [[c.t('value'), c.fmt(r.v)], [c.lang === 'en' ? 'Of first stage' : '占首环节', fmtNum(r.v / mx * 100, 'percent:2', c.lang)]]) });
      out += text(labW, y + (rowH - 12) / 2, r.k, { anchor: 'end', baseline: 'middle', size: c.fs, weight: 600, fill: THEME.ink });
      var vt = c.fmt(r.v), inside = w > textW(vt, c.fs, 600) + 10;
      out += text(inside ? cx0 + cw / 2 : x + w + 6, y + (rowH - 12) / 2, vt, { anchor: inside ? 'middle' : 'start', baseline: 'middle', size: c.fs, weight: 600, fill: inside ? inkOn(col) : THEME.ink });
      if (i === 0 && cut) {
        var bx = x + w - 30;
        out += path('M' + r2(bx - 7) + ' ' + r2(y - 2) + 'L' + r2(bx - 1) + ' ' + r2(y + 9) + 'L' + r2(bx - 7) + ' ' + r2(y + 16) + 'L' + r2(bx - 1) + ' ' + r2(y + rowH - 10), { stroke: '#FFFFFF', width: 6 });
        out += path('M' + r2(bx + 1) + ' ' + r2(y - 2) + 'L' + r2(bx + 7) + ' ' + r2(y + 9) + 'L' + r2(bx + 1) + ' ' + r2(y + 16) + 'L' + r2(bx + 7) + ' ' + r2(y + rowH - 10), { stroke: '#FFFFFF', width: 6 });
      }
      if (i > 0) out += text(c.W - rateW + 8, y - 4, '↓ ' + fmtNum(rates[i], { type: 'percent', decimals: rates[i] < 1 ? 2 : rates[i] < 10 ? 1 : 0 }, c.lang), { baseline: 'middle', size: c.fs, weight: i === worst ? 700 : 400, fill: i === worst ? THEME.bad : THEME.ink2 });
    });
    if (cut) c.notesExtra.push(c.lang === 'en' ? 'The first bar is truncated (break mark); other bars are to scale with each other.' : '首环节条形已截断（断口标记），其余环节之间按比例绘制。');
    out += text(c.W - rateW + 8, top - 2 + 6, c.t('stageConv'), { baseline: 'top', size: 11, fill: THEME.muted });
    var overall = rows[0].v ? rows[n - 1].v / rows[0].v * 100 : null;
    out += text(cx0, H - 10, c.t('overall') + (c.lang === 'en' ? ': ' : '：') + fmtNum(overall, { type: 'percent', decimals: overall < 1 ? 2 : 1 }, c.lang), { size: c.fs, weight: 600, fill: THEME.ink });
    c.notesExtra.push(c.lang === 'en' ? 'Bar width is proportional to count; the lowest stage rate is in red.' : '条宽与数量成正比；红色为转化率最低的环节。');
    c.setTable([c.lang === 'en' ? 'Stage' : '环节', c.t('value'), c.t('stageConv')], rows.map(function (r, i) { return [r.k, c.fmt(r.v), i ? fmtNum(rows[i - 1].v ? r.v / rows[i - 1].v * 100 : null, 'percent:1', c.lang) : '—']; }), rows.map(function (r) { return [r.k, r.v]; }));
    return { svg: out, height: H };
  }
});
