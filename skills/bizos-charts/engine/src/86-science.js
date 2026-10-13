/* 86-science — E01–E09 experiments and statistics: group comparisons with
   tests, distributions, experimental curves, forest plots, ROC/PR curves,
   Bland–Altman agreement, Q-Q plots, correlation matrices and set
   intersections. Tests, intervals and pooled estimates come from 15-stats;
   every exhibit prints n, the error-bar definition and the method. */

function withUnit(name, unit, lang) { return name + (unit ? (lang === 'en' ? ' (' + unit + ')' : '（' + unit + '）') : ''); }
var ERR_NAMES = { sd: ['SD', 'SD'], sem: ['SEM', 'SEM'], ci95: ['95% CI', '95% CI'], iqr: ['四分位区间', 'interquartile range'], range: ['最小–最大值', 'min–max range'] };
var TEST_NAMES = { welch: ['Welch t 检验', 'Welch’s t-test'], student: ['Student t 检验', 'Student’s t-test'], mannwhitney: ['Mann–Whitney U 检验', 'Mann–Whitney U test'], 'paired-t': ['配对 t 检验', 'paired t-test'] };
var ADJ_NAMES = { holm: ['Holm 法校正', 'Holm-adjusted'], bonferroni: ['Bonferroni 校正', 'Bonferroni-adjusted'], bh: ['Benjamini–Hochberg 校正', 'Benjamini–Hochberg-adjusted'] };
var COMPUTABLE_TESTS = { welch: 1, student: 1, mannwhitney: 1, 'paired-t': 1 };
/* Scientific colour convention: high / positive / up-regulated = red,
   low / negative / down = blue (the finance ramp runs the other way). */
function sciDiv(c, t) { return rampAt(c.pal.div, 1 - clamp(t, 0, 1)); }
function sciLegend(c, x, y, w, lo, mid, hi, fmtFn, title) {
  var out = '', n = 24;
  if (title) { out += text(x, y + 5, title, { baseline: 'middle', size: 11, fill: THEME.muted }); x += textW(title, 11) + 8; w = Math.max(60, w - textW(title, 11) - 8); }
  for (var i = 0; i < n; i++) out += rect(x + i * w / n, y, w / n + 0.5, 9, { fill: sciDiv(c, i / (n - 1)) });
  out += text(x, y + 22, fmtFn(lo), { size: 11, fill: THEME.muted });
  if (mid != null) out += text(x + w / 2, y + 22, fmtFn(mid), { size: 11, fill: THEME.muted, anchor: 'middle' });
  out += text(x + w, y + 22, fmtFn(hi), { size: 11, fill: THEME.muted, anchor: 'end' });
  return out;
}
function par(t, lang) { return lang === 'en' ? ' (' + t + ')' : '（' + t + '）'; }
function nameOf(map, k, lang) { var e = map[k]; return e ? (lang === 'en' ? e[1] : e[0]) : String(k || ''); }
function errText(summ, ek, lang) {
  var en = lang === 'en', e = nameOf(ERR_NAMES, ek, lang);
  if (summ === 'median') return en ? 'line = median, bars = ' + e : '横线为中位数，误差线为' + e;
  if (ek === 'ci95') return en ? 'line = mean, bars = 95% CI' : '横线为均值，误差线为 95% CI';
  return en ? 'line = mean, bars = ±' + e : '横线为均值，误差线为 ± ' + e;
}

/* Long rows → groups in display order ("order" option or first appearance). */
function groupRows(s, field) {
  var data = asArray(s.data), f = field || s.y;
  var names = asArray(s.order).length ? asArray(s.order).map(String) : uniq(data.map(function (r) { return String(r[s.x]); }));
  return names.map(function (g, i) {
    var rows = data.filter(function (r) { return String(r[s.x]) === g && isNum(num(r[f])); });
    return { name: g, i: i, rows: rows, vals: rows.map(function (r) { return num(r[f]); }) };
  });
}
function pairedVals(s, A, B) {
  var mb = {}, a = [], b = [];
  B.rows.forEach(function (r) { mb[String(r[s.pair])] = num(r[s.y]); });
  A.rows.forEach(function (r) { var k = String(r[s.pair]); if (mb[k] != null) { a.push(num(r[s.y])); b.push(mb[k]); } });
  return [a, b];
}
/* Comparisons: user P values are kept as given; otherwise the named test
   runs (two-sided) and, with adjust, P values are corrected together. */
function runComparisons(c, groups) {
  var s = c.spec, test = s.test;
  var out = asArray(s.comparisons).map(function (cp) {
    var A = groups.filter(function (g) { return g.name === String(cp.a); })[0], B = groups.filter(function (g) { return g.name === String(cp.b); })[0];
    if (!A || !B) return null;
    var p = num(cp.p), res = null, method = 'user';
    if (p == null && COMPUTABLE_TESTS[test]) {
      if (test === 'paired-t') { var pv = pairedVals(s, A, B); res = pairedT(pv[0], pv[1]); }
      else res = test === 'student' ? studentT(A.vals, B.vals) : test === 'mannwhitney' ? mannWhitney(A.vals, B.vals) : welchT(A.vals, B.vals);
      p = res ? res.p : null; method = test;
    }
    return { a: A, b: B, p: p, res: res, method: method };
  }).filter(function (x) { return x && x.p != null; });
  var comp = out.filter(function (x) { return x.method !== 'user'; });
  if (s.adjust && s.adjust !== 'none' && comp.length > 1) {
    var adj = pAdjust(comp.map(function (x) { return x.p; }), s.adjust);
    comp.forEach(function (x, k) { x.pRaw = x.p; x.p = adj[k]; });
  }
  return out;
}
function comparisonNote(c, comps) {
  var s = c.spec, en = c.lang === 'en', parts = [];
  if (!comps.length) return null;
  var auto = comps.filter(function (x) { return x.method !== 'user'; });
  if (auto.length) {
    var adj = s.adjust && s.adjust !== 'none' && auto.length > 1 ? (en ? ', ' : '，') + nameOf(ADJ_NAMES, s.adjust, c.lang) : (auto.length > 1 ? (en ? ', not adjusted for multiple comparisons' : '，未做多重比较校正') : '');
    parts.push((en ? 'P values: ' : 'P 值：') + nameOf(TEST_NAMES, s.test, c.lang) + (en ? ' (two-sided)' : '（双侧）') + adj);
  } else if (s.test) parts.push((en ? 'P values: ' : 'P 值：') + s.test);
  if (s.pStyle === 'stars') parts.push(en ? '* P < 0.05, ** P < 0.01, *** P < 0.001, ns P ≥ 0.05' : '* P < 0.05，** P < 0.01，*** P < 0.001，ns：P ≥ 0.05');
  return parts.join(en ? '; ' : '；');
}
function comparisonLint(s, add, names) {
  var comps = asArray(s.comparisons);
  comps.forEach(function (cp) {
    if (names.indexOf(String(cp.a)) < 0 || names.indexOf(String(cp.b)) < 0) add('error', 'E_COMPARE', '比较的组不存在：' + cp.a + ' vs ' + cp.b);
    if (cp.p == null && !COMPUTABLE_TESTS[s.test]) add('error', 'E_TEST', '比较 ' + cp.a + ' vs ' + cp.b + ' 缺少 p：提供 p，或设 test 为 welch / student / mannwhitney / paired-t 由引擎计算');
    if (cp.p != null && !(num(cp.p) >= 0 && num(cp.p) <= 1)) add('error', 'E_P', 'p 必须在 0–1 之间：' + cp.p);
  });
  if (comps.length && comps.every(function (cp) { return cp.p != null; }) && !s.test) add('warning', 'W_TEST', '用户提供的 P 值需在 test 中写明检验方法（如“单因素方差分析 + Dunnett 检验”）');
  if (s.test === 'paired-t' && !s.pair) add('error', 'E_PAIR', 'paired-t 需要 pair 字段（受试对象 ID）');
  if (comps.length > 1 && COMPUTABLE_TESTS[s.test] && !s.adjust) add('warning', 'W_ADJUST', '多组比较未设 adjust（holm / bonferroni / bh）；注释将写明“未做多重比较校正”');
}
/* Deterministic swarm: points sorted by value, each at the free horizontal
   offset nearest the centre line (pixel space). */
function swarmX(ys, cx, half, R) {
  var order = ys.map(function (y, i) { return i; }).sort(function (a, b) { return ys[a] - ys[b]; });
  var xs = new Array(ys.length), placed = [], step = R * 0.9, gap = 2 * R + 0.4;
  order.forEach(function (i) {
    var y = ys[i], best = null;
    for (var k = 0; k < 400; k++) {
      var off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * step;
      if (Math.abs(off) > half) break;
      var ok = true;
      for (var j = placed.length - 1; j >= 0; j--) { var p = placed[j]; if (Math.abs(p.y - y) >= gap) continue; if (Math.hypot(p.x - (cx + off), p.y - y) < gap) { ok = false; break; } }
      if (ok) { best = off; break; }
    }
    if (best == null) best = (((i * 0.6180339887) % 1) - 0.5) * 2 * half;
    xs[i] = cx + best; placed.push({ x: cx + best, y: y });
  });
  return xs;
}
/* Brackets stack upward until they clear the data and each other. */
function placeBrackets(c, comps, X, topPx) {
  var s = c.spec, lineH = 17, placed = [];
  var items = comps.map(function (cp) {
    var lab = s.pStyle === 'stars' ? pStars(cp.p) : fmtP(cp.p, c.lang);
    return { cp: cp, ia: cp.a.idx, ib: cp.b.idx, lab: lab, w: textW(lab, 11, 600) };
  });
  items.sort(function (a, b) { return (Math.abs(a.ib - a.ia) - Math.abs(b.ib - b.ia)) || (Math.min(a.ia, a.ib) - Math.min(b.ia, b.ib)); });
  items.forEach(function (it) {
    var i0 = Math.min(it.ia, it.ib), i1 = Math.max(it.ia, it.ib), x0 = X(i0), x1 = X(i1), mid = (x0 + x1) / 2;
    it.x0 = x0; it.x1 = x1; it.l = Math.min(x0, mid - it.w / 2) - 3; it.r = Math.max(x1, mid + it.w / 2) + 3;
    var y = topPx(i0, i1) - 9, moved = true, guard = 0;
    while (moved && guard++ < 80) { moved = false; placed.forEach(function (p) { if (!(it.r < p.l || it.l > p.r) && Math.abs(y - p.y) < lineH) { y = p.y - lineH; moved = true; } }); }
    it.y = y; placed.push(it);
  });
  return placed;
}
function drawBrackets(placed) {
  var out = '';
  placed.forEach(function (it) {
    var sig = it.cp.p < 0.05;
    out += path('M' + r2(it.x0) + ' ' + r2(it.y + 5) + 'V' + r2(it.y) + 'H' + r2(it.x1) + 'V' + r2(it.y + 5), { stroke: THEME.ink2, width: 1 });
    out += text((it.x0 + it.x1) / 2, it.y - 4, it.lab, { anchor: 'middle', size: 11, weight: sig ? 600 : 400, fill: sig ? THEME.ink : THEME.muted, halo: true });
  });
  return out;
}
/* Frame for group exhibits; grows the value axis until brackets fit. */
function groupFrame(c, groups, comps, lo, hi, zero, yTitle, topsOf) {
  var keys = groups.map(function (g) { return g.name; }), F, placed = [], extra = null;
  var labelFn = function (k) { var g = groups.filter(function (d) { return d.name === k; })[0]; return k + ' (n=' + g.st.n + ')'; };
  for (var pass = 0; pass < 5; pass++) {
    F = frameXY(c, { x: { kind: 'band', keys: keys, inner: 0.28, labels: labelFn }, y: { lo: lo, hi: hi, zero: zero, unit: yTitle } });
    extra = topsOf(F);
    var tops = extra.tops;
    placed = placeBrackets(c, comps, function (i) { return F.x.center(keys[i]); }, function (i0, i1) { return Math.min.apply(null, tops.slice(i0, i1 + 1)); });
    var minTop = Math.min.apply(null, placed.map(function (b) { return b.y - 16; }).concat([F.P.t]));
    if (minTop >= F.P.t - 1) break;
    hi = F.yd.max + (F.P.t - minTop + 6) * (F.yd.max - F.yd.min) / F.P.h * 1.15;
  }
  return { F: F, placed: placed, extra: extra };
}
function groupTable(c, groups) {
  var en = c.lang === 'en', f = function (v) { return v == null ? '—' : c.fmt(v); };
  c.setTable([en ? 'Group' : '组别', 'n', c.t('mean'), 'SD', 'SEM', c.t('median'), 'Q1', 'Q3'],
    groups.map(function (g) { var t = g.st; return [g.name, String(t.n), f(t.mean), f(t.sd), f(t.sem), f(t.median), f(t.q1), f(t.q3)]; }),
    groups.map(function (g) { var t = g.st; return [g.name, t.n, t.mean, t.sd, t.sem, t.median, t.q1, t.q3]; }));
}
function groupStats(groups, comps) {
  return {
    groups: groups.map(function (g) { var t = g.st; return { name: g.name, n: t.n, mean: t.mean, sd: t.sd, sem: t.sem, ci95: t.ci, median: t.median, q1: t.q1, q3: t.q3 }; }),
    comparisons: comps.map(function (x) { return { a: x.a.name, b: x.b.name, p: x.p, pRaw: x.pRaw != null ? x.pRaw : x.p, method: x.method, diff: x.res ? x.res.diff : null, ciLo: x.res ? x.res.lo : null, ciHi: x.res ? x.res.hi : null }; })
  };
}

/* ── E01 Group comparison ───────────────────────────────────────────── */
register({
  id: 'E01', name: { zh: '组间比较（逐点 + 误差线）', en: 'Group comparison (dots + error bars)' },
  question: { zh: '几组实验结果的差异有多大，在统计上是否成立？', en: 'How large are the differences between experimental groups, and do they hold statistically?' },
  use: { zh: '小样本实验（每组 3–50 个重复）：处理与对照、剂量组、基因型；显示每个样本、均值或中位数与误差线，可由引擎计算并标注组间 P 值。', en: 'Small experiments (3–50 replicates per group): treatment vs control, dose groups, genotypes; every replicate, mean or median with error bars, engine-computed P values.' },
  avoid: { zh: '每组 >50 个样本（用 E02 或 D02）；只有汇总值、没有重复数据。', en: 'More than 50 per group (use E02 or D02); summary values without replicates.' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '组别（长表，每行一个样本）', en: 'Group (long format, one row per replicate)' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '测量值（unit 必填）', en: 'Measured value (unit required)' } },
    { key: 'pair', role: 'category', required: false, desc: { zh: '配对 ID：同一受试对象跨组连线，用于 paired-t', en: 'Subject ID: links paired observations; used by paired-t' } }
  ],
  options: ['summary:"mean"|"median"', 'error:"sd"|"sem"|"ci95"|"iqr"|"range"', 'comparisons:[{a, b, p?}]', 'test:"welch"|"student"|"mannwhitney"|"paired-t"|说明文字', 'adjust:"holm"|"bonferroni"|"bh"', 'pStyle:"exact"|"stars"', 'bars', 'order', 'highlight'],
  keywords: { zh: ['组间比较', '误差线', '显著性', 't检验', '均值标准差', '处理组', '对照组', 'P值', '实验分组', '重复'], en: ['group comparison', 'error bars', 'significance', 't-test', 'mean sd', 'treatment control', 'p value', 'replicates'] },
  aspect: 0.62, minH: 280, maxH: 460,
  lint: function (s, add) {
    checkFields(s, add, [s.x, s.y, s.pair]);
    var gs = groupRows(s), names = gs.map(function (g) { return g.name; });
    gs.forEach(function (g) {
      if (g.vals.length < 2) add('error', 'E_SAMPLE', '组 “' + g.name + '” 只有 ' + g.vals.length + ' 个样本：无法给出误差线');
      else if (g.vals.length < 3) add('warning', 'W_SAMPLE', '组 “' + g.name + '” n = ' + g.vals.length + '：重复过少，结论不稳');
      if (g.vals.length > 50) add('warning', 'W_ITEMS', '组 “' + g.name + '” n > 50：改用 E02 小提琴图或 D02 箱线图');
    });
    if (s.summary === 'median' && s.error && ['iqr', 'range'].indexOf(s.error) < 0) add('warning', 'W_ERROR', '中位数应配四分位区间（error:"iqr"）');
    if (s.bars && s.summary === 'median') add('warning', 'W_BARS', '柱高表示均值；中位数请不用 bars');
    comparisonLint(s, add, names);
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', summ = s.summary === 'median' ? 'median' : 'mean', ek = s.error || (summ === 'median' ? 'iqr' : 'sd');
    var groups = groupRows(s).filter(function (g) { return g.vals.length; });
    groups.forEach(function (g, k) { g.idx = k; g.st = describe(g.vals); g.iv = errorInterval(g.st, ek); if (summ === 'median') g.iv.c = g.st.median; g.color = c.isDim(g.name) ? THEME.dim : c.color(g.name, g.i); });
    var comps = runComparisons(c, groups);
    var e = extent([].concat.apply([], groups.map(function (g) { return g.vals.concat([g.iv.lo, g.iv.hi]); })));
    var zero = !!s.bars || s.zero === true || (s.zero !== false && ((e[0] >= 0 && e[0] <= e[1] * 0.35) || (e[1] <= 0 && e[1] >= e[0] * 0.35)));
    var yTitle = withUnit(s.yTitle || labelOf(s, s.y), s.unit, c.lang), R = 3;
    var gf = groupFrame(c, groups, comps, e[0], e[1], zero, yTitle, function (F) {
      R = clamp(F.x.bw / 10, 2.4, 4.2);
      var pos = groups.map(function (g) { var cx = F.x.center(g.name), ys = g.vals.map(function (v) { return F.y(v); }); return { cx: cx, ys: ys, xs: swarmX(ys, cx, F.x.bw * 0.42, R) }; });
      return { pos: pos, tops: groups.map(function (g, k) { return Math.min(Math.min.apply(null, pos[k].ys) - R, F.y(g.iv.hi)); }) };
    });
    var F = gf.F, pos = gf.extra.pos, under = '', marks = '', over = '', hits = '';
    groups.forEach(function (g, k) {
      var cx = pos[k].cx, w = F.x.bw;
      if (s.bars) under += rect(cx - w * 0.36, F.y(g.iv.c), w * 0.72, F.y(0) - F.y(g.iv.c), { fill: mix(g.color, '#FFFFFF', 0.8), stroke: g.color, strokeWidth: 1 });
      hits += hitRect(cx - w / 2, F.P.t, w, F.P.h, g.name, [['n', String(g.st.n)], [c.t('mean'), c.fmt(g.st.mean)], ['SD', g.st.sd == null ? '—' : c.fmt(g.st.sd)], ['SEM', g.st.sem == null ? '—' : c.fmt(g.st.sem)], [c.t('median'), c.fmt(g.st.median)]], groups.length <= 30);
    });
    if (s.pair) {
      for (var k = 0; k + 1 < groups.length; k++) {
        var A = groups[k], B = groups[k + 1], mb = {};
        B.rows.forEach(function (r, j) { mb[String(r[s.pair])] = j; });
        A.rows.forEach(function (r, j) { var jb = mb[String(r[s.pair])]; if (jb != null) under += line(pos[k].xs[j], pos[k].ys[j], pos[k + 1].xs[jb], pos[k + 1].ys[jb], { stroke: THEME.faint, width: 1, opacity: 0.7 }); });
      }
    }
    groups.forEach(function (g, k) {
      g.rows.forEach(function (r, j) {
        marks += circle(pos[k].xs[j], pos[k].ys[j], R, { fill: g.color, fillOpacity: 0.85, stroke: '#FFFFFF', width: 0.8, cls: 'bz-hit', data: tip(g.name, [[labelOf(s, s.y), c.fmt(g.vals[j])]].concat(s.pair ? [[labelOf(s, s.pair), String(r[s.pair])]] : [])) });
      });
      var cx = pos[k].cx, w = F.x.bw, yc = F.y(g.iv.c), y0 = F.y(g.iv.lo), y1 = F.y(g.iv.hi);
      over += line(cx, y0, cx, y1, { stroke: THEME.ink, width: 1.4 });
      over += line(cx - w * 0.12, y0, cx + w * 0.12, y0, { stroke: THEME.ink, width: 1.4 }) + line(cx - w * 0.12, y1, cx + w * 0.12, y1, { stroke: THEME.ink, width: 1.4 });
      over += line(cx - w * 0.3, yc, cx + w * 0.3, yc, { stroke: THEME.ink, width: 2.2 });
    });
    var n0 = groups[0].st.n, same = groups.every(function (g) { return g.st.n === n0; });
    c.notesExtra.push((en ? 'Each dot is one replicate; ' : '每个点为一个样本；') + errText(summ, ek, c.lang) + (same ? (en ? '; n = ' + n0 + ' per group' : '；每组 n = ' + n0) : ''));
    var cn = comparisonNote(c, comps); if (cn) c.notesExtra.push(cn);
    groupTable(c, groups);
    c.stats = groupStats(groups, comps);
    return { svg: F.under + under + F.base + hits + marks + over + F.axes + drawBrackets(gf.placed), height: F.H };
  }
});

/* ── E02 Violin / raincloud ─────────────────────────────────────────── */
register({
  id: 'E02', name: { zh: '小提琴图 / 云雨图', en: 'Violin / raincloud plot' },
  question: { zh: '几组数据的分布形状（双峰、偏态、长尾）有何不同？', en: 'How do distribution shapes (bimodality, skew, tails) differ across groups?' },
  use: { zh: '每组 ≥20 个观测的分布比较：单细胞表达、患者指标、各批次测量；内嵌四分位箱与中位数，可叠加逐点或改为云雨图。', en: 'Distributions with ≥20 observations per group: single-cell expression, patient measures, batches; inner quartile box and median, optional points or raincloud.' },
  avoid: { zh: '每组 <20 个（密度估计不稳，用 E01）；只需比较中位数（用 D02）。', en: 'Fewer than 20 per group (use E01); only medians matter (use D02).' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '组别（长表）', en: 'Group (long format)' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '观测值（unit 必填）', en: 'Observed value (unit required)' } }
  ],
  options: ['style:"violin"|"raincloud"', 'points', 'scale:"width"|"area"', 'bwAdjust', 'comparisons / test / adjust / pStyle（同 E01）', 'order', 'highlight'],
  keywords: { zh: ['小提琴图', '云雨图', '分布形状', '密度', '双峰', '单细胞表达', '核密度'], en: ['violin plot', 'raincloud', 'distribution shape', 'density', 'bimodal', 'kde'] },
  aspect: 0.6, minH: 280, maxH: 460,
  lint: function (s, add) {
    checkFields(s, add, [s.x, s.y]);
    var gs = groupRows(s);
    gs.forEach(function (g) { if (g.vals.length < 2) add('error', 'E_SAMPLE', '组 “' + g.name + '” 样本不足 2 个'); else if (g.vals.length < 20) add('warning', 'W_SAMPLE', '组 “' + g.name + '” n = ' + g.vals.length + ' <20：密度估计不稳，改用 E01'); });
    comparisonLint(s, add, gs.map(function (g) { return g.name; }));
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', rain = s.style === 'raincloud';
    var groups = groupRows(s).filter(function (g) { return g.vals.length >= 2; });
    groups.forEach(function (g, k) {
      g.idx = k; g.st = describe(g.vals); g.color = c.isDim(g.name) ? THEME.dim : c.color(g.name, g.i);
      g.bw = bwSilverman(g.vals) * (num(s.bwAdjust) || 1);
      var lo = g.st.min, hi = g.st.max, n = 64; g.grid = [];
      for (var i = 0; i < n; i++) g.grid.push(lo + (hi - lo) * i / (n - 1));
      g.dens = hi > lo ? kde(g.vals, g.bw, g.grid) : g.grid.map(function () { return 1; });
      g.maxD = Math.max.apply(null, g.dens);
    });
    var globalMax = Math.max.apply(null, groups.map(function (g) { return g.maxD; }));
    var comps = runComparisons(c, groups);
    var e = extent([].concat.apply([], groups.map(function (g) { return [g.st.min, g.st.max]; })));
    var zero = s.zero === true || (s.zero !== false && e[0] >= 0 && e[0] <= e[1] * 0.2);
    var yTitle = withUnit(s.yTitle || labelOf(s, s.y), s.unit, c.lang);
    var showPts = s.points != null ? !!s.points : rain || groups.every(function (g) { return g.vals.length <= 150; });
    var gf = groupFrame(c, groups, comps, e[0], e[1], zero, yTitle, function (F) { return { tops: groups.map(function (g) { return F.y(g.st.max) - 2; }) }; });
    var F = gf.F, marks = '', over = '', hits = '';
    groups.forEach(function (g) {
      var cx = F.x.center(g.name), half = F.x.bw * (rain ? 0.5 : 0.46), scaleD = s.scale === 'area' ? globalMax : g.maxD;
      var wAt = function (i) { return scaleD ? g.dens[i] / scaleD * half : 0; };
      var right = g.grid.map(function (v, i) { return [cx + wAt(i), F.y(v)]; }), left = g.grid.map(function (v, i) { return [cx - wAt(i), F.y(v)]; }).reverse();
      var d = rain ? 'M' + r2(cx) + ' ' + r2(F.y(g.grid[0])) + polyline(right).replace(/^M/, 'L') + 'L' + r2(cx) + ' ' + r2(F.y(g.grid[g.grid.length - 1])) + 'Z'
        : polyline(right) + polyline(left).replace(/^M/, 'L') + 'Z';
      marks += path(d, { fill: mix(g.color, '#FFFFFF', 0.55), stroke: g.color, width: 1.2 });
      if (showPts) {
        var R = g.vals.length > 200 ? 1.3 : g.vals.length > 80 ? 1.7 : 2.2;
        g.vals.forEach(function (v, j) {
          var u = ((j * 0.6180339887) % 1) - 0.5, px;
          if (rain) px = cx - 8 - (u + 0.5) * (half * 0.75);
          else { var gi = Math.round((v - g.grid[0]) / ((g.grid[g.grid.length - 1] - g.grid[0]) || 1) * (g.grid.length - 1)); px = cx + u * 1.6 * wAt(clamp(gi, 0, g.grid.length - 1)) * 0.85; }
          marks += circle(px, F.y(v), R, { fill: THEME.ink, opacity: 0.38 });
        });
      }
      var st = g.st, bx = rain ? cx - 3 : cx, iqr = st.q3 - st.q1, inside = g.vals.filter(function (v) { return v >= st.q1 - 1.5 * iqr && v <= st.q3 + 1.5 * iqr; });
      var wlo = inside.length ? Math.min.apply(null, inside) : st.q1, whi = inside.length ? Math.max.apply(null, inside) : st.q3;
      over += line(bx, F.y(wlo), bx, F.y(whi), { stroke: THEME.ink, width: 1.2 });
      over += rect(bx - 3.5, F.y(st.q3), 7, Math.max(1, F.y(st.q1) - F.y(st.q3)), { fill: THEME.ink });
      over += circle(bx, F.y(st.median), 2.6, { fill: '#FFFFFF', stroke: THEME.ink, width: 1 });
      hits += hitRect(cx - F.x.bw / 2, F.P.t, F.x.bw, F.P.h, g.name, [['n', String(st.n)], [c.t('median'), c.fmt(st.median)], ['Q1–Q3', c.fmt(st.q1) + '–' + c.fmt(st.q3)], [c.t('mean'), c.fmt(st.mean)]], groups.length <= 30);
    });
    c.notesExtra.push(en ? 'Shapes are Gaussian kernel density estimates (Silverman bandwidth' + (s.bwAdjust ? ' × ' + s.bwAdjust : '') + '), cut at the observed range' + (s.scale === 'area' ? ', equal area' : ', equal width') + '; box = interquartile range, white dot = median, whiskers = 1.5 × IQR' + (showPts ? '; dots are observations' : '')
      : '小提琴为高斯核密度估计（Silverman 带宽' + (s.bwAdjust ? ' × ' + s.bwAdjust : '') + '），截断于观测范围，' + (s.scale === 'area' ? '各组面积相同' : '各组最大宽度相同') + '；黑色箱体为四分位区间，白点为中位数，细线为 1.5 倍四分位距' + (showPts ? '；灰点为观测值' : ''));
    var cn = comparisonNote(c, comps); if (cn) c.notesExtra.push(cn);
    groupTable(c, groups);
    c.stats = groupStats(groups, comps);
    return { svg: F.under + F.base + hits + marks + over + F.axes + drawBrackets(gf.placed), height: F.H };
  }
});

/* ── E03 Experimental curves ────────────────────────────────────────── */
register({
  id: 'E03', name: { zh: '实验曲线（均值 ± 误差）', en: 'Experimental curves (mean ± error)' },
  question: { zh: '各处理组的测量值随时间、剂量或温度如何变化，差异从何时出现？', en: 'How does a measurement change with time, dose or temperature in each group, and when do groups diverge?' },
  use: { zh: '数值型横轴的重复测量：肿瘤生长、细菌生长曲线、药代动力学、标准曲线；引擎按组和横轴值汇总重复，误差线或误差带，可加线性拟合。', en: 'Replicated measurements over a numeric axis: tumour growth, growth curves, pharmacokinetics, standard curves; replicates are summarised per group and x, error bars or bands, optional linear fit.' },
  avoid: { zh: '横轴为日期期间（用 T01）；剂量反应拟合 IC50（用 B02）。', en: 'Calendar periods (use T01); dose–response with IC50 (use B02).' },
  fields: [
    { key: 'x', role: 'measure', required: true, desc: { zh: '数值横轴：时间、剂量、温度（xUnit 必填）', en: 'Numeric x: time, dose, temperature (xUnit required)' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '测量值：每行一个重复，或配合 err 字段的组均值', en: 'Measurement: one row per replicate, or group means with an err field' } },
    { key: 'group', role: 'category', required: false, desc: { zh: '处理组', en: 'Treatment group' } },
    { key: 'err', role: 'measure', required: false, desc: { zh: '已汇总数据的误差半宽字段（须同时写明 error 含义）', en: 'Error half-width field for pre-summarised data (state error type)' } }
  ],
  options: ['error:"sd"|"sem"|"ci95"', 'errorStyle:"bar"|"band"', 'points', 'xLog / yLog', 'fit:"linear"', 'xUnit', 'refLines / bands（数值横轴）', 'highlight'],
  keywords: { zh: ['生长曲线', '时间进程', '肿瘤体积', '药代动力学', '标准曲线', '均值误差', '重复测量', '实验曲线'], en: ['growth curve', 'time course', 'tumour volume', 'pharmacokinetics', 'standard curve', 'mean sem', 'repeated measures'] },
  aspect: 0.56,
  lint: function (s, add) {
    checkFields(s, add, [s.x, s.y, s.group, s.err]);
    if (!s.xUnit) add('error', 'E_UNIT', '横轴缺少单位 xUnit（如“天”“h”“°C”）');
    if (s.err && !s.error) add('error', 'E_ERROR', '提供了 err 字段时必须写明误差含义 error（sd / sem / ci95）');
    var data = asArray(s.data);
    if (s.xLog && data.some(function (r) { return num(r[s.x]) <= 0; })) add('error', 'E_LOG', '对数横轴不能含 ≤0 的值');
    if (s.yLog && data.some(function (r) { return num(r[s.y]) <= 0; })) add('error', 'E_LOG', '对数纵轴不能含 ≤0 的值');
    if (s.fit && (s.xLog || s.yLog)) add('error', 'E_FIT', '线性拟合只用于线性坐标轴');
    var gn = s.group ? uniq(data.map(function (r) { return r[s.group]; })).length : 1;
    if (gn > 6 && !asArray(s.highlight).length) add('warning', 'W_SERIES', gn + ' 组且无 highlight：改用 M01 或减少组数');
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', data = asArray(s.data), ek = s.error || 'sd';
    var gnames = s.group ? uniq(data.map(function (r) { return String(r[s.group]); })) : [''];
    var series = gnames.map(function (g, gi) {
      var rows = data.filter(function (r) { return (!s.group || String(r[s.group]) === g) && isNum(num(r[s.x])) && isNum(num(r[s.y])); });
      var ux = uniq(rows.map(function (r) { return num(r[s.x]); })).sort(function (a, b) { return a - b; });
      var pts = ux.map(function (xv) {
        var rr = rows.filter(function (r) { return num(r[s.x]) === xv; }), vals = rr.map(function (r) { return num(r[s.y]); });
        if (s.err) { var e0 = num(rr[0][s.err]) || 0; return { x: xv, c: vals[0], lo: vals[0] - e0, hi: vals[0] + e0, n: s.n ? num(rr[0][s.n]) : null, vals: [] }; }
        var st = describe(vals), iv = errorInterval(st, ek);
        return { x: xv, c: iv.c, lo: iv.lo, hi: iv.hi, n: st.n, vals: vals };
      });
      var nm = g || labelOf(s, s.y);
      return { name: nm, label: g, i: gi, rows: rows, pts: pts, color: c.isDim(nm) ? THEME.dim : c.color(nm, gi), dim: c.isDim(nm) };
    }).filter(function (se) { return se.pts.length; });
    var xs = [].concat.apply([], series.map(function (se) { return se.pts.map(function (p) { return p.x; }); })), ex = extent(xs);
    var ys = [].concat.apply([], series.map(function (se) { return [].concat.apply([], se.pts.map(function (p) { return [p.lo, p.hi].concat(s.points ? p.vals : []); })); })), ey = extent(ys);
    var zero = !s.yLog && (s.zero === true || (s.zero !== false && ((ey[0] >= 0 && ey[0] <= ey[1] * 0.35) || (ey[1] <= 0 && ey[1] >= ey[0] * 0.35))));
    var multi = series.length > 1 && !!s.group, useEnd = multi && series.length <= 6 && !c.compact;
    var endW = useEnd ? Math.max.apply(null, series.map(function (se) { return textW(se.name, c.fs, 600); })) + 16 : 12;
    if (endW > c.W * 0.3) { useEnd = false; endW = 12; }
    var xTitle = withUnit(s.xTitle || labelOf(s, s.x), s.xUnit, c.lang) + (s.xLog ? (en ? ', log scale' : '，对数刻度') : '');
    var F = frameXY(c, { x: { kind: 'linear', lo: ex[0], hi: ex[1], log: !!s.xLog, fmt: s.xFormat }, y: { lo: s.yLog ? Math.max(ey[0], 1e-12) : ey[0], hi: ey[1], zero: zero, unit: withUnit(s.yTitle || labelOf(s, s.y), s.unit, c.lang), log: !!s.yLog }, right: endW, bottom: 16 });
    var ov = overlays(c, F, function (v) { return F.x(num(v)); });
    var band = s.errorStyle === 'band', dodgeW = band || series.length < 2 ? 0 : Math.min(3, F.P.w / Math.max(1, uniq(xs).length) / (series.length * 3));
    var under = '', marks = '', labels = '', hits = '';
    var order = series.slice().sort(function (a, b) { return (a.dim ? 0 : 1) - (b.dim ? 0 : 1); });
    order.forEach(function (se) {
      var dx = (se.i - (series.length - 1) / 2) * dodgeW, X = function (p) { return F.x(p.x) + dx; };
      if (band) {
        var top = se.pts.map(function (p) { return [X(p), F.y(p.hi)]; }), bot = se.pts.map(function (p) { return [X(p), F.y(p.lo)]; }).reverse();
        under += path(polyline(top) + polyline(bot).replace(/^M/, 'L') + 'Z', { fill: se.color, fillOpacity: se.dim ? 0.08 : 0.16 });
      }
      if (s.points) se.pts.forEach(function (p) { p.vals.forEach(function (v) { marks += circle(X(p), F.y(v), 1.8, { fill: se.color, opacity: 0.4 }); }); });
      marks += path(polyline(se.pts.map(function (p) { return [X(p), F.y(p.c)]; })), { stroke: se.color, width: se.dim ? THEME.stroke.lineThin : THEME.stroke.line });
      se.pts.forEach(function (p) {
        var px = X(p);
        if (!band && p.hi > p.lo) {
          marks += line(px, F.y(p.lo), px, F.y(p.hi), { stroke: se.color, width: 1.3 });
          marks += line(px - 3, F.y(p.lo), px + 3, F.y(p.lo), { stroke: se.color, width: 1.3 }) + line(px - 3, F.y(p.hi), px + 3, F.y(p.hi), { stroke: se.color, width: 1.3 });
        }
        marks += circle(px, F.y(p.c), se.pts.length > 30 ? 2.2 : 3.4, { fill: se.color, stroke: '#FFFFFF', width: 1, cls: 'bz-hit', data: tip((multi ? se.name + ' · ' : '') + labelOf(s, s.x) + ' ' + c.fmt(p.x, { format: s.xFormat }) + (s.xUnit ? ' ' + s.xUnit : ''), [[c.t('mean'), c.fmt(p.c)], [s.err ? nameOf(ERR_NAMES, ek, c.lang) : (ek === 'ci95' ? '95% CI' : '± ' + nameOf(ERR_NAMES, ek, c.lang)), c.fmt(p.lo) + ' – ' + c.fmt(p.hi)]].concat(p.n != null ? [['n', String(p.n)]] : [])) });
      });
    });
    var fits = [];
    if (s.fit === 'linear') series.forEach(function (se) {
      var fx = [], fy = [];
      if (s.err) se.pts.forEach(function (p) { fx.push(p.x); fy.push(p.c); });
      else se.rows.forEach(function (r) { fx.push(num(r[s.x])); fy.push(num(r[s.y])); });
      var f = olsFit(fx, fy), e2 = extent(fx);
      if (!f) return;
      fits.push({ se: se, f: f });
      marks += line(F.x(e2[0]), F.y(f.a + f.b * e2[0]), F.x(e2[1]), F.y(f.a + f.b * e2[1]), { stroke: se.color, width: 1.4, dash: '6 4', opacity: 0.9 });
    });
    if (useEnd) {
      var items = series.map(function (se) { var p = se.pts[se.pts.length - 1]; return { y: F.y(p.c), se: se }; });
      spread(items, 15, F.P.t + 4, F.P.b - 2);
      items.forEach(function (it) { labels += text(F.P.r + 8, it.y, it.se.name, { baseline: 'middle', size: c.fs, weight: it.se.dim ? 400 : 600, fill: it.se.dim ? THEME.muted : it.se.color }); });
    } else if (multi) series.forEach(function (se) { c.addLegend(se.name, se.color, 'line'); });
    if (fits.length) c.addLegend(en ? 'Linear fit (dashed)' : '线性拟合（虚线）', THEME.ink2, 'dash');
    labels += text(F.P.r, F.H - 2, xTitle, { anchor: 'end', size: c.fs, fill: THEME.muted });
    var nAll = [].concat.apply([], series.map(function (se) { return se.pts.map(function (p) { return p.n; }); })).filter(isNum), nTxt = '';
    if (nAll.length) { var e3 = extent(nAll); nTxt = e3[0] === e3[1] ? (en ? 'n = ' + e3[0] + ' per point' : '每点 n = ' + e3[0]) : (en ? 'n = ' + e3[0] + '–' + e3[1] + ' per point' : '每点 n = ' + e3[0] + '–' + e3[1]); }
    var how = s.err ? (en ? 'Points are group means; ' + (band ? 'bands' : 'bars') + ' = ' + (ek === 'ci95' ? '95% CI' : '±' + nameOf(ERR_NAMES, ek, 'en')) : '点为组均值，' + (band ? '阴影' : '误差线') + '为' + (ek === 'ci95' ? ' 95% CI' : ' ± ' + nameOf(ERR_NAMES, ek, 'zh')))
      : (en ? 'Points are means of replicates; ' + (band ? 'bands' : 'bars') + ' = ' + (ek === 'ci95' ? '95% CI' : '±' + nameOf(ERR_NAMES, ek, 'en')) : '点为重复测量的均值，' + (band ? '阴影' : '误差线') + '为' + (ek === 'ci95' ? ' 95% CI' : ' ± ' + nameOf(ERR_NAMES, ek, 'zh')));
    c.notesExtra.push(how + (nTxt ? (en ? '; ' : '；') + nTxt : '') + (dodgeW ? (en ? '; groups offset slightly for legibility' : '；各组横向略作错开以免遮挡') : ''));
    fits.forEach(function (ft) { var f = ft.f; c.notesExtra.push((multi ? ft.se.name + (en ? ': ' : '：') : '') + (en ? 'OLS y = ' : '最小二乘 y = ') + (+f.b.toPrecision(3)) + 'x ' + (f.a < 0 ? '− ' : '+ ') + Math.abs(+f.a.toPrecision(3)) + (en ? ', R² = ' : '，R² = ') + f.r2.toFixed(3) + (en ? ', n = ' : '，n = ') + f.n); });
    if (s.yLog) c.notesExtra.push(en ? 'Vertical axis is log scale' : '纵轴为对数刻度');
    var head = (multi ? [en ? 'Group' : '组别'] : []).concat([labelOf(s, s.x), 'n', c.t('mean'), en ? 'Lower' : '下限', en ? 'Upper' : '上限']), rows = [], raw = [];
    series.forEach(function (se) { se.pts.forEach(function (p) { rows.push((multi ? [se.name] : []).concat([c.fmt(p.x, { format: s.xFormat }), p.n == null ? '—' : String(p.n), c.fmt(p.c), c.fmt(p.lo), c.fmt(p.hi)])); raw.push((multi ? [se.name] : []).concat([p.x, p.n, p.c, p.lo, p.hi])); }); });
    c.setTable(head, rows, raw);
    c.stats = { series: series.map(function (se) { return { name: se.name, points: se.pts.map(function (p) { return { x: p.x, n: p.n, mean: p.c, lo: p.lo, hi: p.hi }; }) }; }), fits: fits.map(function (ft) { return { name: ft.se.name, slope: ft.f.b, intercept: ft.f.a, r2: ft.f.r2, n: ft.f.n, pSlope: ft.f.p }; }) };
    return { svg: ov.under + F.under + under + F.base + marks + ov.over + F.axes + labels, height: F.H };
  }
});

/* ── E04 Forest plot ────────────────────────────────────────────────── */
var MEASURES = {
  HR: ['风险比 HR', 'Hazard ratio'], OR: ['比值比 OR', 'Odds ratio'], RR: ['相对危险度 RR', 'Risk ratio'], IRR: ['发生率比 IRR', 'Incidence rate ratio'],
  MD: ['均值差 MD', 'Mean difference'], SMD: ['标准化均值差 SMD', 'Standardised mean difference'], RD: ['率差 RD', 'Risk difference']
};
function forestTicks(lo, hi, ratio, maxN) {
  if (!ratio) return niceLinear(lo, hi, maxN, false);
  var levels = [[1], [0.1, 10, 0.01, 100], [0.5, 2, 0.2, 5, 0.05, 20], [0.3, 3, 0.03, 30], [0.25, 4, 0.7, 1.5]], t = [];
  for (var i = 0; i < levels.length; i++) {
    var add = levels[i].filter(function (v) { return v >= lo * 0.999 && v <= hi * 1.001; });
    if (t.length + add.length > maxN && t.length) break;
    t = t.concat(add);
  }
  return { min: lo, max: hi, ticks: t.sort(function (a, b) { return a - b; }) };
}
register({
  id: 'E04', name: { zh: '森林图', en: 'Forest plot' },
  question: { zh: '各研究或亚组的效应量及其置信区间是多少，合并后效应是否成立、是否一致？', en: 'What are the effect sizes and confidence intervals across studies or subgroups, and does the pooled effect hold consistently?' },
  use: { zh: 'Meta 分析、临床试验亚组分析、多因素回归结果（HR / OR / RR 对数刻度，MD 线性）；pool 由引擎按逆方差法合并并给出异质性。', en: 'Meta-analyses, trial subgroups, regression estimates (HR/OR/RR on log scale, MD linear); pool lets the engine combine studies by inverse variance with heterogeneity.' },
  avoid: { zh: '没有置信区间的点估计（用 C01）；效应量口径不一致的研究混在一起。', en: 'Point estimates without CIs (use C01); mixing incompatible effect measures.' },
  fields: [
    { key: 'label', role: 'category', required: true, desc: { zh: '研究或亚组名称；只有名称、没有估计值的行作为分组标题', en: 'Study or subgroup; rows without an estimate become headers' } },
    { key: 'est / lo / hi', role: 'interval', required: true, desc: { zh: '效应量与 95% CI 字段（默认 est、lo、hi）', en: 'Estimate and 95% CI fields (default est, lo, hi)' } },
    { key: 'weight', role: 'measure', required: false, desc: { zh: '权重（%）；pool 时自动计算', en: 'Weight (%); computed when pooling' } }
  ],
  options: ['measure:"HR"|"OR"|"RR"|"IRR"|"MD"|"SMD"|"RD"', 'pool:"fixed"|"random"', 'columns:[{field, title}]', 'favors:[左侧含义, 右侧含义]', 'nullValue', 'decimals', 'labelTitle', '行字段 pooled:true / indent'],
  keywords: { zh: ['森林图', 'meta分析', '荟萃分析', '亚组分析', '风险比', '比值比', '置信区间', '效应量', '异质性'], en: ['forest plot', 'meta-analysis', 'subgroup analysis', 'hazard ratio', 'odds ratio', 'confidence interval', 'effect size', 'heterogeneity'] },
  needsUnit: false,
  lint: function (s, add) {
    var fE = s.est || 'est', fLo = s.lo || 'lo', fHi = s.hi || 'hi', fL = s.label || 'label';
    checkFields(s, add, [fL, fE, fLo, fHi, s.weight]);
    var ratio = forestRatio(s), rows = asArray(s.data).filter(function (r) { return isNum(num(r[fE])); });
    if (rows.length < 2) add('error', 'E_DATA', '森林图至少需要 2 个效应量');
    rows.forEach(function (r) {
      var e = num(r[fE]), lo = num(r[fLo]), hi = num(r[fHi]);
      if (!isNum(lo) || !isNum(hi)) add('error', 'E_CI', '“' + r[fL] + '” 缺少置信区间');
      else if (!(lo <= e && e <= hi)) add('error', 'E_CI', '“' + r[fL] + '” 的估计值不在置信区间内');
      if (ratio && (e <= 0 || lo <= 0)) add('error', 'E_RATIO', '比值类效应量（HR/OR/RR）必须 >0：' + r[fL]);
    });
    if (s.pool && rows.some(function (r) { return r.pooled; })) add('warning', 'W_POOL', '已提供 pooled 行又设了 pool：引擎会再追加一行合并结果');
    if (!s.measure) add('warning', 'W_MEASURE', '未写 measure（HR / OR / RR / MD…）：按 HR 处理');
    if (rows.length > 40) add('warning', 'W_ITEMS', '超过 40 行：拆分或只保留主要亚组');
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', ratio = forestRatio(s), measure = String(s.measure || 'HR').toUpperCase();
    var fL = s.label || 'label', fE = s.est || 'est', fLo = s.lo || 'lo', fHi = s.hi || 'hi', dec = s.decimals != null ? +s.decimals : 2;
    var nullV = s.nullValue != null ? num(s.nullValue) : (ratio ? 1 : 0);
    var items = asArray(s.data).map(function (r) {
      var e = num(r[fE]);
      return { label: String(r[fL] == null ? '' : r[fL]), est: e, lo: num(r[fLo]), hi: num(r[fHi]), w: s.weight ? num(r[s.weight]) : null, pooled: !!r.pooled, indent: num(r.indent) || 0, header: !isNum(e), row: r };
    });
    var studies = items.filter(function (it) { return !it.header && !it.pooled; }), pool = null;
    if (s.pool) {
      pool = metaPool(studies, ratio, s.pool === 'random' ? 'random' : 'fixed');
      if (pool) {
        if (!s.weight) studies.forEach(function (it, k) { it.w = pool.weights[k]; });
        items.push({ label: s.poolLabel || (en ? 'Pooled (' + (pool.model === 'random' ? 'random effects' : 'fixed effect') + ')' : '合并效应（' + (pool.model === 'random' ? '随机效应' : '固定效应') + '）'), est: pool.est, lo: pool.lo, hi: pool.hi, pooled: true, w: s.weight ? null : 100, indent: 0, computed: true });
      }
    }
    var fE2 = function (v) { return fmtNum(v, { type: 'number', decimals: dec }, c.lang); };
    var estTxt = function (it) { return it.header ? '' : fE2(it.est) + (en ? ' (' : '（') + fE2(it.lo) + '–' + fE2(it.hi) + (en ? ')' : '）'); };
    var wTxt = function (it) { return it.w != null && !it.header ? fmtNum(it.w, 'percent:1', c.lang) : ''; };
    var mName = MEASURES[measure] ? (en ? MEASURES[measure][1] : MEASURES[measure][0]) : measure;
    var cols = asArray(s.columns).map(function (cl) { return { field: cl.field || cl.key, title: String(cl.title || labelOf(s, cl.field || cl.key)) }; });
    var fs = c.fs, W = c.W, gap = 12;
    var estTitle = measure + (en ? ' (95% CI)' : '（95% CI）'), wTitle = en ? 'Weight' : '权重', labTitle = s.labelTitle || (en ? 'Study' : '研究');
    var estW = Math.max(textW(estTitle, fs, 600), Math.max.apply(null, items.map(function (it) { return textW(estTxt(it), fs, it.pooled ? 600 : 400); }))) + gap;
    var hasW = items.some(function (it) { return it.w != null && !it.header; }), wW = hasW ? Math.max(textW(wTitle, fs, 600), textW('100.0%', fs)) + gap : 0;
    var colW = cols.map(function (cl) { return Math.max(textW(cl.title, fs, 600), Math.max.apply(null, items.map(function (it) { return textW(String(it.row && it.row[cl.field] != null ? it.row[cl.field] : ''), fs); }))) + gap; });
    var labNeed = Math.max(textW(labTitle, fs, 600), Math.max.apply(null, items.map(function (it) { return textW(it.label, fs, it.header || it.pooled ? 600 : 400) + (it.indent || 0) * 12; }))) + gap + 2;
    var labW = Math.min(labNeed, W * (c.compact ? 0.34 : 0.3)), plotMin = c.compact ? 110 : 160;
    var used = function () { return labW + sum(colW) + estW + wW; };
    if (W - used() < plotMin) colW = colW.map(function () { return 0; });
    if (W - used() < plotMin) wW = 0;
    /* Phones: the estimate moves under its label instead of its own column. */
    var stacked = W - Math.min(labNeed, W * 0.34) - estW < plotMin + 20;
    if (stacked) { estW = 0; wW = 0; labW = Math.min(W * 0.5, Math.max(labNeed, Math.max.apply(null, items.map(function (it) { return textW(estTxt(it), 11); })) + gap)); }
    var showCols = cols.filter(function (cl, k) { return colW[k] > 0; }), plotL = labW + sum(colW) + 6, plotR = W - estW - wW - 8;
    var lines = items.map(function (it) { return wrapText(it.label, labW - gap - (it.indent || 0) * 12, fs, it.header || it.pooled ? 600 : 400, 2); });
    var maxL = Math.max.apply(null, lines.map(function (l) { return l.length; })) + (stacked ? 1 : 0);
    var rh = maxL > 1 ? 10 + 14 * maxL : 22, top = 30, n = items.length, H = top + n * rh + 54;
    var all = [nullV]; items.forEach(function (it) { if (!it.header) all.push(it.lo, it.hi); });
    var e = extent(all), lo = e[0], hi = e[1];
    if (ratio) { lo = lo / 1.12; hi = hi * 1.12; } else { var pad = (hi - lo) * 0.06 || 1; lo -= pad; hi += pad; }
    var tk = forestTicks(lo, hi, ratio, Math.max(3, Math.floor((plotR - plotL) / 46)));
    if (!ratio) { lo = tk.min; hi = tk.max; }
    var X = ratio ? scaleLog(lo, hi, plotL, plotR) : scaleLinear(lo, hi, plotL, plotR), out = '';
    out += line(0, top - 6, W, top - 6, { stroke: THEME.ink2, width: 1 });
    out += text(0, top - 12, labTitle, { size: fs, weight: 600, fill: THEME.ink2 });
    var cx0 = labW;
    showCols.forEach(function (cl, k) { var wv = colW[cols.indexOf(cl)]; out += text(cx0 + wv - gap, top - 12, cl.title, { anchor: 'end', size: fs, weight: 600, fill: THEME.ink2 }); cx0 += wv; });
    var plotHead = mName + (ratio ? (en ? ' (log)' : '（对数）') : '');
    if (textW(plotHead, fs, 600) > plotR - plotL) plotHead = measure + (ratio ? (en ? ' (log)' : '（对数）') : '');
    out += text((plotL + plotR) / 2, top - 12, truncate(plotHead, plotR - plotL, fs, 600), { anchor: 'middle', size: fs, weight: 600, fill: THEME.ink2 });
    if (!stacked) out += text(W - wW - estW + gap / 2, top - 12, estTitle, { size: fs, weight: 600, fill: THEME.ink2 });
    if (wW) out += text(W, top - 12, wTitle, { anchor: 'end', size: fs, weight: 600, fill: THEME.ink2 });
    var yb = top + n * rh, nx = Math.round(X(nullV)) + .5;
    tk.ticks.forEach(function (t) { var px = X(t); if (px < plotL - 1 || px > plotR + 1) return; out += line(px, yb, px, yb + 4, { stroke: THEME.axis }); out += text(px, yb + 16, ratio ? fmtNum(t, { type: 'number', decimals: t < 1 ? (t < 0.1 ? 2 : (t === 0.25 ? 2 : 1)) : 0 }, c.lang) : fmtTick(t, null, c.lang, tk.step), { anchor: 'middle', size: 11, fill: THEME.ink2 }); });
    out += line(plotL, yb, plotR, yb, { stroke: THEME.axis });
    out += line(nx, top - 2, nx, yb, { stroke: THEME.zero, width: 1.2 });
    var pooledItem = items.filter(function (it) { return it.pooled; })[0];
    if (pooledItem) out += line(X(pooledItem.est), top - 2, X(pooledItem.est), yb, { stroke: THEME.primary, width: 1, dash: '2 3', opacity: 0.8 });
    var fav = asArray(s.favors);
    if (fav.length === 2) {
      var fl = '← ' + fav[0], fr = fav[1] + ' →', flw = textW(fl, 11), frw = textW(fr, 11);
      var lx = Math.max(flw + 2, nx - 6), rx = Math.min(W - frw - 2, nx + 6), twoRows = rx < lx + 8;
      if (twoRows) H += 14;
      out += text(lx, yb + 32, fl, { anchor: 'end', size: 11, fill: THEME.muted }) + text(rx, yb + (twoRows ? 46 : 32), fr, { size: 11, fill: THEME.muted });
    }
    var maxW = Math.max.apply(null, items.filter(function (it) { return !it.pooled && it.w != null; }).map(function (it) { return it.w; }).concat([0]));
    items.forEach(function (it, i) {
      var cy = top + i * rh + rh / 2, bold = it.header || it.pooled;
      if (it.pooled) out += line(0, top + i * rh, W, top + i * rh, { stroke: THEME.grid });
      var nl = lines[i].length + (stacked && !it.header ? 1 : 0);
      lines[i].forEach(function (ln, k) { out += text((it.indent || 0) * 12, cy + (k - (nl - 1) / 2) * 14, ln, { baseline: 'middle', size: fs, weight: bold ? 600 : 400, fill: THEME.ink }); });
      if (stacked && !it.header) out += text((it.indent || 0) * 12, cy + (nl - 1) / 2 * 14, estTxt(it), { baseline: 'middle', size: 11, weight: it.pooled ? 600 : 400, fill: THEME.ink2 });
      var cx1 = labW;
      showCols.forEach(function (cl) { var wv = colW[cols.indexOf(cl)]; out += text(cx1 + wv - gap, cy, String(it.row && it.row[cl.field] != null ? it.row[cl.field] : ''), { anchor: 'end', baseline: 'middle', size: fs, fill: THEME.ink2 }); cx1 += wv; });
      if (it.header) return;
      if (!stacked) out += text(W - wW - estW + gap / 2, cy, estTxt(it), { baseline: 'middle', size: fs, weight: it.pooled ? 600 : 400, fill: THEME.ink });
      if (wW && it.w != null) out += text(W, cy, wTxt(it), { anchor: 'end', baseline: 'middle', size: fs, fill: THEME.ink2 });
      var x0 = X(it.lo), x1 = X(it.hi), xe = X(it.est);
      if (it.pooled) out += path('M' + r2(x0) + ' ' + r2(cy) + 'L' + r2(xe) + ' ' + r2(cy - 6) + 'L' + r2(x1) + ' ' + r2(cy) + 'L' + r2(xe) + ' ' + r2(cy + 6) + 'Z', { fill: THEME.primary });
      else {
        out += line(x0, cy, x1, cy, { stroke: THEME.ink2, width: 1.4 });
        var sz = it.w != null && maxW ? 4 + 9 * Math.sqrt(it.w / maxW) : 7;
        out += rect(xe - sz / 2, cy - sz / 2, sz, sz, { fill: THEME.primary });
      }
      out += hitRect(0, top + i * rh, W, rh, it.label, [[mName, fE2(it.est)], ['95% CI', fE2(it.lo) + '–' + fE2(it.hi)]].concat(it.w != null ? [[wTitle, wTxt(it)]] : []), n <= 40);
    });
    if (ratio) c.notesExtra.push(en ? 'Log scale; vertical line = no effect (' + measure + ' = 1)' : '横轴为对数刻度；竖线为无效线（' + measure + ' = 1）');
    else c.notesExtra.push(en ? 'Vertical line = no effect (' + measure + ' = ' + nullV + ')' : '竖线为无效线（' + measure + ' = ' + nullV + '）');
    if (hasW) c.notesExtra.push(en ? 'Square area is proportional to weight' : '方块面积与权重成正比');
    var hidden = cols.filter(function (cl, k) { return !(colW[k] > 0); }).map(function (cl) { return cl.title; });
    if (hidden.length) c.notesExtra.push(en ? 'Columns ' + hidden.join(', ') + ' are omitted at this width; see the data table' : '此宽度下省略“' + hidden.join('”“') + '”列，见“查看数据”');
    if (pool) {
      var het = 'I² = ' + fmtNum(pool.I2, 'percent:1', c.lang) + (en ? ', ' : '，') + 'τ² = ' + (+pool.tau2.toPrecision(2)) + (en ? ', ' : '，') + 'Q = ' + pool.Q.toFixed(2) + (en ? ' (df = ' + pool.df + ', ' + fmtP(pool.pQ, 'en') + ')' : '（df = ' + pool.df + '，' + fmtP(pool.pQ, 'zh') + '）');
      c.notesExtra.push(en ? 'Pooled by inverse variance, ' + (pool.model === 'random' ? 'random effects (DerSimonian–Laird)' : 'fixed effect') + '; study SEs recovered from 95% CIs' + (ratio ? ' on the log scale' : '') + '; heterogeneity ' + het + '; overall effect ' + fmtP(pool.p, 'en')
        : '合并方法：逆方差法，' + (pool.model === 'random' ? '随机效应（DerSimonian–Laird）' : '固定效应') + '；各研究标准误由 95% CI' + (ratio ? '在对数尺度上' : '') + '反推；异质性 ' + het + '；总体效应 ' + fmtP(pool.p, 'zh'));
    }
    c.setTable([labTitle, mName, en ? 'Lower 95%' : '95% 下限', en ? 'Upper 95%' : '95% 上限', wTitle].concat(cols.map(function (cl) { return cl.title; })),
      items.filter(function (it) { return !it.header; }).map(function (it) { return [it.label, fE2(it.est), fE2(it.lo), fE2(it.hi), wTxt(it) || '—'].concat(cols.map(function (cl) { return it.row && it.row[cl.field] != null ? String(it.row[cl.field]) : ''; })); }),
      items.filter(function (it) { return !it.header; }).map(function (it) { return [it.label, it.est, it.lo, it.hi, it.w].concat(cols.map(function (cl) { return it.row ? it.row[cl.field] : null; })); }));
    c.stats = { measure: measure, rows: studies.map(function (it) { return { label: it.label, est: it.est, lo: it.lo, hi: it.hi, weight: it.w }; }), pooled: pool ? { model: pool.model, est: pool.est, lo: pool.lo, hi: pool.hi, p: pool.p, I2: pool.I2, tau2: pool.tau2, Q: pool.Q, df: pool.df, pQ: pool.pQ } : null };
    return { svg: out, height: H };
  }
});
function forestRatio(s) {
  if (s.log === true) return true;
  if (s.log === false) return false;
  return /^(HR|OR|RR|IRR|SHR|CSHR|PR)$/.test(String(s.measure || 'HR').toUpperCase());
}

/* ── E05 ROC / precision–recall ─────────────────────────────────────── */
function rocLabels(s) {
  var pos = s.positive;
  return asArray(s.data).map(function (r) {
    var v = r[s.outcome];
    if (v == null || v === '') return null;
    if (pos != null) return String(v) === String(pos);
    if (v === true || v === 1 || v === '1') return true;
    if (v === false || v === 0 || v === '0') return false;
    return null;
  });
}
register({
  id: 'E05', name: { zh: 'ROC / PR 曲线', en: 'ROC / precision–recall curve' },
  question: { zh: '诊断指标或预测模型区分阳性与阴性的能力有多强，哪个模型更好？', en: 'How well does a test or model separate positives from negatives, and which model is better?' },
  use: { zh: '生物标志物、诊断试验、风险模型的判别力：引擎由原始得分计算 ROC、AUC 与 DeLong 95% CI，两模型可做配对 DeLong 检验；curve:"pr" 画精确率–召回率（阳性稀少时更合适）。', en: 'Discrimination of biomarkers, diagnostic tests or risk models: ROC, AUC and DeLong 95% CI from raw scores; paired DeLong test for two models; curve:"pr" for precision–recall when positives are rare.' },
  avoid: { zh: '只有一个灵敏度/特异度点（用表格）；需要校准度评价（另画校准曲线）。', en: 'A single sensitivity/specificity pair (use a table); calibration questions.' },
  fields: [
    { key: 'outcome', role: 'category', required: true, desc: { zh: '真实结局字段：1/0，或用 positive 指定阳性取值', en: 'True outcome: 1/0, or set positive' } },
    { key: 'score', role: 'measure', required: true, desc: { zh: '得分字段，或多个字段数组（每个一条曲线）；得分越高越倾向阳性', en: 'Score field or array of fields (one curve each); higher = more likely positive' } }
  ],
  options: ['curve:"roc"|"pr"', 'positive', 'cutoff:"youden"', 'names', 'highlight'],
  keywords: { zh: ['ROC曲线', 'AUC', '诊断效能', '灵敏度', '特异度', '生物标志物', '模型区分度', 'PR曲线', '精确率召回率'], en: ['roc curve', 'auc', 'diagnostic accuracy', 'sensitivity specificity', 'biomarker', 'discrimination', 'precision recall'] },
  needsUnit: false, aspect: 0.8,
  lint: function (s, add) {
    var fields = asArray(s.score);
    if (!s.outcome) add('error', 'E_FIELD', '缺少 outcome 字段');
    if (!fields.length) add('error', 'E_FIELD', '缺少 score 字段');
    checkFields(s, add, [s.outcome].concat(fields));
    var lab = rocLabels(s), np = lab.filter(function (v) { return v === true; }).length, nn = lab.filter(function (v) { return v === false; }).length;
    if (lab.some(function (v, i) { return v == null && asArray(s.data)[i][s.outcome] != null; })) add('error', 'E_OUTCOME', 'outcome 需为 1/0 或 true/false；其他取值请用 positive 指定阳性');
    if (!np || !nn) add('error', 'E_OUTCOME', '需要同时有阳性和阴性样本');
    else if (np < 20 || nn < 20) add('warning', 'W_SAMPLE', '阳性 ' + np + ' 例、阴性 ' + nn + ' 例：AUC 置信区间很宽');
    if (fields.length > 4) add('warning', 'W_SERIES', '超过 4 条曲线：只保留主要模型');
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', pr = s.curve === 'pr', data = asArray(s.data), lab = rocLabels(s), fields = asArray(s.score);
    var models = fields.map(function (f, i) {
      var sc = data.map(function (r) { return num(r[f]); }), nm = labelOf(s, f);
      var res = pr ? prCurve(sc, lab) : rocCurve(sc, lab);
      return { field: f, name: nm, scores: sc, res: res, color: c.isDim(nm) ? THEME.dim : c.color(nm, i), dim: c.isDim(nm) };
    }).filter(function (m) { return m.res; });
    var wide = c.W >= 500, fs = c.fs, leftEst = textW('1.0', fs) + 10, panelW = wide ? clamp(c.W * 0.32, 170, 240) : 0;
    var side = Math.max(160, Math.min(c.W - leftEst - 10 - panelW, 400));
    var H = side + 22 + 26 + 16;
    var F = frameXY(c, { height: H, x: { kind: 'linear', lo: 0, hi: 1, fixedMin: 0, fixedMax: 1 }, y: { lo: 0, hi: 1, fixedMin: 0, fixedMax: 1, unit: pr ? (en ? 'Precision' : '精确率') : (en ? 'Sensitivity (true-positive rate)' : '灵敏度（真阳性率）') }, right: c.W - leftEst - side, bottom: 16 });
    var out = '', labels = '';
    if (pr) {
      var prev = models[0].res.prevalence;
      out += line(F.P.l, F.y(prev), F.P.r, F.y(prev), { stroke: THEME.axis, dash: '4 3' });
    } else out += line(F.x(0), F.y(0), F.x(1), F.y(1), { stroke: THEME.axis, dash: '4 3' });
    var order = models.slice().sort(function (a, b) { return (a.dim ? 0 : 1) - (b.dim ? 0 : 1); });
    order.forEach(function (m) {
      var pts = m.res.points.map(function (p) { return pr ? [F.x(p.recall), F.y(p.precision)] : [F.x(p.fpr), F.y(p.tpr)]; });
      if (pr) { var stepPts = []; pts.forEach(function (p, k) { if (k) stepPts.push([p[0], pts[k - 1][1]]); stepPts.push(p); }); pts = stepPts; }
      out += path(polyline(pts), { stroke: m.color, width: m.dim ? 1.5 : 2.2 });
    });
    if (!pr && s.cutoff === 'youden') models.filter(function (m) { return !m.dim; }).slice(0, 2).forEach(function (m) {
      var yd = m.res.youden; if (!yd) return;
      var px = F.x(yd.fpr), py = F.y(yd.sens);
      out += circle(px, py, 4.5, { fill: '#FFFFFF', stroke: m.color, width: 2 });
      labels += text(px + 8, py + 14, (en ? 'cut-off ' : '截断值 ') + (+yd.thr.toPrecision(3)), { size: 11, fill: m.color, weight: 600, halo: true });
    });
    var metric = pr ? 'AP' : 'AUC', lines = models.map(function (m) {
      var r = m.res;
      return { m: m, t1: m.name, t2: pr ? 'AP ' + r.ap.toFixed(2) : 'AUC ' + r.auc.toFixed(2) + par(r.lo.toFixed(2) + '–' + r.hi.toFixed(2), c.lang) };
    });
    var cmp = null;
    if (!pr && models.length === 2) {
      var dl = delongPaired(models[1].scores, models[0].scores, lab);
      if (dl) {
        cmp = { a: models[1].name, b: models[0].name, diff: dl.diff, lo: dl.lo, hi: dl.hi, z: dl.z, p: dl.p };
        lines.push({ t1: 'ΔAUC', t2: (dl.diff >= 0 ? '+' : MINUS) + Math.abs(dl.diff).toFixed(2) + (en ? ', ' : '，') + fmtP(dl.p, c.lang) });
      }
    }
    if (wide) {
      var ly = F.P.t + 6;
      lines.forEach(function (ln) {
        if (ln.m) labels += line(F.P.r + 22, ly + 6, F.P.r + 38, ly + 6, { stroke: ln.m.color, width: 2.4 });
        labels += text(F.P.r + 44, ly + 6, truncate(ln.t1, c.W - F.P.r - 50, fs, 600), { baseline: 'middle', size: fs, weight: 600, fill: ln.m ? ln.m.color : THEME.ink2 });
        labels += text(F.P.r + 44, ly + 22, ln.t2, { baseline: 'middle', size: fs, fill: THEME.ink });
        ly += 42;
      });
    } else {
      var by = pr ? F.P.b - 8 - (lines.length - 1) * 30 - 16 : F.P.b - 8 - (lines.length - 1) * 30 - 16, bx = pr ? F.P.l + 8 : F.P.r - 6;
      lines.forEach(function (ln, k) {
        var yy = by + k * 30;
        labels += text(bx, yy, ln.t1, { anchor: pr ? 'start' : 'end', size: fs, weight: 600, fill: ln.m ? ln.m.color : THEME.ink2, halo: true });
        labels += text(bx, yy + 15, ln.t2, { anchor: pr ? 'start' : 'end', size: 11, fill: THEME.ink, halo: true });
      });
    }
    labels += text(F.P.r, F.H - 2, pr ? (en ? 'Recall (sensitivity)' : '召回率（灵敏度）') : (en ? '1 − specificity (false-positive rate)' : '1 − 特异度（假阳性率）'), { anchor: 'end', size: fs, fill: THEME.muted });
    var r0 = models[0].res;
    c.notesExtra.push(pr ? (en ? 'AP = average precision (step-wise); dashed line = prevalence ' + fmtNum(r0.prevalence * 100, 'percent:1', 'en') : 'AP 为平均精确率（逐级求和）；虚线为阳性比例 ' + fmtNum(r0.prevalence * 100, 'percent:1', 'zh'))
      : (en ? 'AUC 95% CI by DeLong; dashed diagonal = no discrimination (AUC = 0.5)' : 'AUC 的 95% CI 按 DeLong 法计算；对角虚线为无判别能力（AUC = 0.5）'));
    c.notesExtra.push((en ? 'Positives n = ' : '阳性 n = ') + r0.n1 + (en ? ', negatives n = ' : '，阴性 n = ') + r0.n0 + (cmp ? (en ? '; ΔAUC = ' + cmp.a + ' − ' + cmp.b + ', paired DeLong test on the same subjects' : '；ΔAUC = ' + cmp.a + ' − ' + cmp.b + '，同一批样本的配对 DeLong 检验') : (models.length > 1 && !pr ? (en ? '; curves share subjects, differences not tested' : '；多条曲线基于同一批样本，差异未做检验') : '')));
    if (!pr && s.cutoff === 'youden') c.notesExtra.push(en ? 'Circle = Youden-optimal cut-off (max sensitivity + specificity − 1)' : '圆圈为 Youden 指数最大的截断值（灵敏度 + 特异度 − 1 最大）');
    c.setTable([en ? 'Model' : '模型', metric, en ? '95% CI' : '95% CI', 'SE', en ? 'Positives' : '阳性数', en ? 'Negatives' : '阴性数'].concat(pr ? [] : [en ? 'Youden cut-off' : 'Youden 截断值', en ? 'Sensitivity' : '灵敏度', en ? 'Specificity' : '特异度']),
      models.map(function (m) { var r = m.res; return pr ? [m.name, r.ap.toFixed(3), '—', '—', String(r.n1), String(r.n0)] : [m.name, r.auc.toFixed(3), r.lo.toFixed(3) + '–' + r.hi.toFixed(3), r.se.toFixed(3), String(r.n1), String(r.n0), r.youden ? String(+r.youden.thr.toPrecision(4)) : '—', r.youden ? fmtNum(r.youden.sens * 100, 'percent:1', c.lang) : '—', r.youden ? fmtNum(r.youden.spec * 100, 'percent:1', c.lang) : '—']; }));
    c.stats = { curve: pr ? 'pr' : 'roc', models: models.map(function (m) { var r = m.res; return pr ? { name: m.name, ap: r.ap, prevalence: r.prevalence, n1: r.n1, n0: r.n0 } : { name: m.name, auc: r.auc, lo: r.lo, hi: r.hi, se: r.se, n1: r.n1, n0: r.n0, youden: r.youden }; }), comparison: cmp };
    return { svg: F.under + F.base + out + F.axes + labels, height: F.H };
  }
});

/* ── E06 Bland–Altman ───────────────────────────────────────────────── */
register({
  id: 'E06', name: { zh: '一致性分析（Bland–Altman）', en: 'Bland–Altman agreement' },
  question: { zh: '两种测量方法的结果是否一致：平均偏倚多大，95% 的差值落在什么范围？', en: 'Do two measurement methods agree: how large is the mean bias and where do 95% of differences fall?' },
  use: { zh: '新旧检测方法、仪器、评分者之间的一致性；引擎计算偏倚、95% 一致性界限及其置信区间，并检验比例偏倚。', en: 'Agreement between assays, devices or raters: bias, 95% limits of agreement with CIs, and a proportional-bias check.' },
  avoid: { zh: '用相关系数判断一致性（相关高不代表一致）；两种方法单位不同。', en: 'Judging agreement by correlation; methods on different scales.' },
  fields: [
    { key: 'a', role: 'measure', required: true, desc: { zh: '方法 A 测量值字段（names 写方法名）', en: 'Method A field (name it via names)' } },
    { key: 'b', role: 'measure', required: true, desc: { zh: '方法 B 测量值字段（同一样本同一行）', en: 'Method B field (same subject, same row)' } }
  ],
  options: ['diff:"absolute"|"percent"', 'limits:[下限, 上限]（临床可接受范围）', 'names'],
  keywords: { zh: ['一致性', 'Bland-Altman', '方法比较', '偏倚', '一致性界限', '仪器比对', '检测方法'], en: ['bland altman', 'agreement', 'method comparison', 'bias', 'limits of agreement', 'assay comparison'] },
  aspect: 0.6,
  lint: function (s, add) {
    checkFields(s, add, [s.a, s.b]);
    var n = asArray(s.data).filter(function (r) { return isNum(num(r[s.a])) && isNum(num(r[s.b])); }).length;
    if (n < 3) add('error', 'E_SAMPLE', '成对样本不足 3 个');
    else if (n < 30) add('warning', 'W_SAMPLE', '成对样本 ' + n + ' 个 <30：一致性界限置信区间较宽');
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', pct = s.diff === 'percent';
    var pairs = asArray(s.data).filter(function (r) { var a = num(r[s.a]), b = num(r[s.b]); return isNum(a) && isNum(b) && (!pct || a + b !== 0); });
    var va = pairs.map(function (r) { return num(r[s.a]); }), vb = pairs.map(function (r) { return num(r[s.b]); });
    var ba = blandAltman(va, vb, pct ? 'percent' : 'absolute');
    var nA = labelOf(s, s.a), nB = labelOf(s, s.b), lim = asArray(s.limits).map(num).filter(isNum);
    var ex = extent(ba.means), ey = extent(ba.diffs.concat([0, ba.loaCI[0][0], ba.loaCI[1][1]]).concat(lim));
    var fmtD = function (v) { return pct ? fmtNum(v, 'percent:1', c.lang) : c.fmt(v); };
    var labelsR = [{ v: ba.loa[1], t: '+1.96 SD ' + fmtD(ba.loa[1]) }, { v: ba.bias, t: (en ? 'Bias ' : '偏倚 ') + fmtD(ba.bias) }, { v: ba.loa[0], t: '−1.96 SD ' + fmtD(ba.loa[0]) }];
    var rightW = c.compact ? 10 : Math.max.apply(null, labelsR.map(function (l) { return textW(l.t, c.fs, 600); })) + 14;
    var padX = (ex[1] - ex[0]) * 0.05 || 1;
    var F = frameXY(c, { x: { kind: 'linear', lo: ex[0] - padX, hi: ex[1] + padX }, y: { lo: ey[0], hi: ey[1], zero: false, unit: withUnit((en ? 'Difference: ' : '差值：') + nA + ' − ' + nB, pct ? '%' : s.unit, c.lang) }, right: rightW, bottom: 16 });
    var under = '', marks = '', labels = '';
    var bandR = function (a, b, col) { return rect(F.P.l, F.y(Math.max(a, b)), F.P.w, Math.abs(F.y(a) - F.y(b)), { fill: col }); };
    under += bandR(ba.biasCI[0], ba.biasCI[1], mix(THEME.primary, '#FFFFFF', 0.86));
    under += bandR(ba.loaCI[0][0], ba.loaCI[0][1], mix(THEME.series[1], '#FFFFFF', 0.82)) + bandR(ba.loaCI[1][0], ba.loaCI[1][1], mix(THEME.series[1], '#FFFFFF', 0.82));
    if (lim.length === 2) { marks += line(F.P.l, F.y(lim[0]), F.P.r, F.y(lim[0]), { stroke: THEME.good, dash: '2 3', width: 1.2 }) + line(F.P.l, F.y(lim[1]), F.P.r, F.y(lim[1]), { stroke: THEME.good, dash: '2 3', width: 1.2 }); c.addLegend(en ? 'Acceptable limits' : '临床可接受范围', THEME.good, 'dash'); }
    marks += line(F.P.l, F.y(ba.bias), F.P.r, F.y(ba.bias), { stroke: THEME.primary, width: 1.8 });
    marks += line(F.P.l, F.y(ba.loa[0]), F.P.r, F.y(ba.loa[0]), { stroke: THEME.series[1], width: 1.6, dash: '6 4' }) + line(F.P.l, F.y(ba.loa[1]), F.P.r, F.y(ba.loa[1]), { stroke: THEME.series[1], width: 1.6, dash: '6 4' });
    ba.means.forEach(function (m, i) { marks += circle(F.x(m), F.y(ba.diffs[i]), 3.2, { fill: THEME.primary, fillOpacity: 0.7, stroke: '#FFFFFF', width: 0.8, cls: 'bz-hit', data: tip((en ? 'Pair ' : '样本 ') + (i + 1), [[en ? 'Mean' : '均值', c.fmt(m)], [en ? 'Difference' : '差值', fmtD(ba.diffs[i])]]) }); });
    var items = labelsR.map(function (l, k) { return { y: F.y(l.v) - (c.compact ? 7 : 0), t: l.t, k: k }; });
    spread(items, 15, F.P.t + 6, F.P.b - 4);
    items.forEach(function (it) {
      var col = it.k === 1 ? THEME.primary : mix(THEME.series[1], '#000000', 0.2);
      labels += c.compact ? text(F.P.r - 4, it.y, it.t, { anchor: 'end', size: 11, weight: 600, fill: col, halo: true }) : text(F.P.r + 8, it.y, it.t, { baseline: 'middle', size: c.fs, weight: 600, fill: col });
    });
    labels += text(F.P.r, F.H - 2, withUnit(en ? 'Mean of ' + nA + ' and ' + nB : '两种方法均值', s.unit, c.lang), { anchor: 'end', size: c.fs, fill: THEME.muted });
    var tr = ba.trend;
    c.notesExtra.push(en ? 'n = ' + ba.n + ' pairs; bias = mean difference ' + fmtD(ba.bias) + ' (95% CI ' + fmtD(ba.biasCI[0]) + ' to ' + fmtD(ba.biasCI[1]) + '); limits of agreement = bias ± 1.96 SD: ' + fmtD(ba.loa[0]) + ' to ' + fmtD(ba.loa[1]) + '; shading = 95% CIs (Bland–Altman approximation)'
      : 'n = ' + ba.n + ' 对；偏倚 = 平均差值 ' + fmtD(ba.bias) + '（95% CI ' + fmtD(ba.biasCI[0]) + ' 至 ' + fmtD(ba.biasCI[1]) + '）；一致性界限 = 偏倚 ± 1.96 SD：' + fmtD(ba.loa[0]) + ' 至 ' + fmtD(ba.loa[1]) + '；阴影为 95% CI（Bland–Altman 近似法）');
    if (tr) c.notesExtra.push((en ? 'Proportional bias: slope of difference on mean ' : '比例偏倚：差值对均值的回归斜率 ') + (+tr.b.toPrecision(2)) + (en ? ', ' : '，') + fmtP(tr.p, c.lang));
    if (pct) c.notesExtra.push(en ? 'Differences as % of the pair mean' : '差值以两方法均值的百分比表示');
    c.setTable([en ? 'Pair' : '样本', nA, nB, en ? 'Mean' : '均值', en ? 'Difference' : '差值'], ba.means.map(function (m, i) { return [String(i + 1), c.fmt(va[i]), c.fmt(vb[i]), c.fmt(m), fmtD(ba.diffs[i])]; }), ba.means.map(function (m, i) { return [i + 1, va[i], vb[i], m, ba.diffs[i]]; }));
    c.stats = { n: ba.n, bias: ba.bias, sd: ba.sd, loa: ba.loa, biasCI: ba.biasCI, loaCI: ba.loaCI, trend: tr ? { slope: tr.b, p: tr.p } : null };
    return { svg: under + F.under + F.base + marks + F.axes + labels, height: F.H };
  }
});

/* ── E07 Q-Q plot ───────────────────────────────────────────────────── */
register({
  id: 'E07', name: { zh: 'Q-Q 图', en: 'Q-Q plot' },
  question: { zh: '数据（或残差）是否服从正态？关联检验的 P 值是否整体膨胀？', en: 'Are data (or residuals) normal; are association P values inflated overall?' },
  use: { zh: 'mode:"normal" 检查正态性（残差、测量值）；mode:"pvalue" 检查全基因组或高通量检验的 P 值分布，给出 λGC 与 95% 置信带。', en: 'mode:"normal" for normality of values or residuals; mode:"pvalue" for genome-wide or high-throughput P values with λGC and a 95% band.' },
  avoid: { zh: '比较两组分布（用 E02）；样本 <10。', en: 'Comparing two groups (use E02); fewer than 10 values.' },
  fields: [
    { key: 'y', role: 'measure', required: true, desc: { zh: '观测值（normal）或 P 值字段（pvalue）', en: 'Values (normal) or P-value field (pvalue)' } }
  ],
  options: ['mode:"normal"|"pvalue"', 'threshold（pvalue 模式高亮阈值，默认 5e-8）'],
  keywords: { zh: ['QQ图', 'Q-Q', '正态性检验', '残差', 'P值膨胀', 'λGC', '基因组膨胀因子'], en: ['qq plot', 'quantile quantile', 'normality', 'residuals', 'p value inflation', 'genomic control lambda'] },
  needsUnit: false, aspect: 0.75, maxH: 480,
  lint: function (s, add) {
    checkFields(s, add, [s.y]);
    var v = asArray(s.data).map(function (r) { return num(r[s.y]); }).filter(isNum);
    if (v.length < 10) add('error', 'E_SAMPLE', 'Q-Q 图至少需要 10 个值');
    if (s.mode === 'pvalue' && v.some(function (p) { return p <= 0 || p > 1; })) add('error', 'E_P', 'P 值必须在 (0, 1] 之间');
    if (s.mode !== 'pvalue' && !s.unit) add('error', 'E_UNIT', '正态 Q-Q 图需写明数值单位 unit');
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', pmode = s.mode === 'pvalue';
    var v = sortNum(asArray(s.data).map(function (r) { return num(r[s.y]); })), n = v.length, out = '', labels = '', marks = '';
    if (pmode) {
      var thr = num(s.threshold) || 5e-8, obs = v.map(function (p) { return -Math.log10(p); }), exp = v.map(function (_, i) { return -Math.log10((i + 0.5) / n); });
      var chi = v.map(function (p) { var z = normPpf(p / 2); return z * z; }).sort(function (a, b) { return a - b; }), lambda = median(chi) / 0.454936423119572;
      var mx = Math.max(exp[0], obs[0]) * 1.04, F = frameXY(c, { x: { kind: 'linear', lo: 0, hi: exp[0] * 1.02, zero: true }, y: { lo: 0, hi: mx, zero: true, unit: en ? 'Observed −log₁₀ P' : '观测 −log₁₀ P' }, bottom: 16, right: 12 });
      var band = [], k = 0, idx = [];
      for (var t = 0; t <= 1.0001; t += 1 / 90) { var i = Math.min(n - 1, Math.max(0, Math.round(Math.pow(n, t)) - 1)); if (idx.indexOf(i) < 0) idx.push(i); }
      idx.sort(function (a, b) { return a - b; });
      var up = [], dn = [];
      idx.forEach(function (i) { var ex2 = -Math.log10((i + 0.5) / n); up.push([F.x(ex2), F.y(-Math.log10(betaPpf(0.025, i + 1, n - i)))]); dn.push([F.x(ex2), F.y(-Math.log10(betaPpf(0.975, i + 1, n - i)))]); });
      out += path(polyline(up) + polyline(dn.reverse()).replace(/^M/, 'L') + 'Z', { fill: THEME.shade });
      out += line(F.x(0), F.y(0), F.x(exp[0]), F.y(exp[0]), { stroke: THEME.zero, width: 1.2, dash: '4 3' });
      var dots = '', hiDots = '', nHit = 0;
      for (var j = n - 1; j >= 0; j--) {
        var px = r2(F.x(exp[j])), py = r2(F.y(obs[j]));
        if (v[j] < thr) { hiDots += circle(px, py, 3, { fill: THEME.series[1], stroke: '#FFFFFF', width: 0.6 }); nHit++; }
        else dots += 'M' + px + ' ' + py + 'h0';
      }
      marks += path(dots, { stroke: THEME.primary, width: 4.4, cap: 'round' }) + hiDots;
      labels += text(F.P.l + 6, F.P.t + 4, 'λGC = ' + lambda.toFixed(2), { baseline: 'top', size: c.fs, weight: 600, fill: THEME.ink, halo: true });
      labels += text(F.P.r, F.H - 2, en ? 'Expected −log₁₀ P' : '期望 −log₁₀ P', { anchor: 'end', size: c.fs, fill: THEME.muted });
      c.notesExtra.push((en ? 'n = ' + fmtNum(n, 'integer', 'en') + ' tests; dashed line = expected under the null; shading = 95% band (beta order statistics); λGC = median χ² / 0.455' : 'n = ' + fmtNum(n, 'integer', 'zh') + ' 次检验；虚线为无效假设下的期望；阴影为 95% 置信带（Beta 次序统计量）；λGC = χ² 中位数 / 0.455') + (nHit ? (en ? '; gold = P < ' + fmtSci(thr, 1) : '；金色点 P < ' + fmtSci(thr, 1)) : ''));
      c.setTable([en ? 'Rank' : '序号', 'P', en ? 'Expected −log₁₀ P' : '期望 −log₁₀ P', en ? 'Observed −log₁₀ P' : '观测 −log₁₀ P'], v.slice(0, 50).map(function (p, i) { return [String(i + 1), fmtNum(p, { type: 'pvalue', sci: true }, c.lang), exp[i].toFixed(2), obs[i].toFixed(2)]; }));
      c.stats = { mode: 'pvalue', n: n, lambda: lambda, below: nHit };
      return { svg: F.under + out + F.base + marks + F.axes + labels, height: F.H };
    }
    var st = describe(v), th = v.map(function (_, i) { return normPpf((i + 1 - 0.375) / (n + 0.25)); });
    var q1t = normPpf(0.25), q3t = normPpf(0.75), slope = (st.q3 - st.q1) / (q3t - q1t), icpt = st.q1 - slope * q1t;
    var m3 = 0, m4 = 0; v.forEach(function (x) { var d = x - st.mean; m3 += d * d * d; m4 += d * d * d * d; });
    var sd0 = Math.sqrt(v.reduce(function (a, x) { return a + (x - st.mean) * (x - st.mean); }, 0) / n), skew = m3 / n / Math.pow(sd0, 3), kurt = m4 / n / Math.pow(sd0, 4) - 3;
    var ey = extent(v.concat([icpt + slope * th[0], icpt + slope * th[n - 1]])), F2 = frameXY(c, { x: { kind: 'linear', lo: th[0] * 1.05, hi: th[n - 1] * 1.05 }, y: { lo: ey[0], hi: ey[1], zero: false, unit: withUnit(en ? 'Sample quantiles' : '样本分位数', s.unit, c.lang) }, bottom: 16, right: 12 });
    out += line(F2.x(th[0] * 1.05), F2.y(icpt + slope * th[0] * 1.05), F2.x(th[n - 1] * 1.05), F2.y(icpt + slope * th[n - 1] * 1.05), { stroke: THEME.series[1], width: 1.6 });
    v.forEach(function (x, i) { marks += circle(F2.x(th[i]), F2.y(x), n > 300 ? 1.8 : 2.8, { fill: THEME.primary, fillOpacity: 0.75 }); });
    labels += text(F2.P.r, F2.H - 2, en ? 'Theoretical quantiles (standard normal)' : '理论分位数（标准正态）', { anchor: 'end', size: c.fs, fill: THEME.muted });
    c.notesExtra.push((en ? 'n = ' + n + '; plotting positions (i − 0.375)/(n + 0.25); reference line through the quartiles; skewness ' : 'n = ' + n + '；绘图位置 (i − 0.375)/(n + 0.25)；参考线经过第 1、3 四分位点；偏度 ') + skew.toFixed(2) + (en ? ', excess kurtosis ' : '，超额峰度 ') + kurt.toFixed(2));
    c.setTable([en ? 'Rank' : '序号', en ? 'Theoretical' : '理论分位数', en ? 'Sample' : '样本分位数'], v.map(function (x, i) { return [String(i + 1), th[i].toFixed(3), c.fmt(x)]; }));
    c.stats = { mode: 'normal', n: n, skewness: skew, excessKurtosis: kurt, slope: slope, intercept: icpt };
    return { svg: F2.under + out + F2.base + marks + F2.axes + labels, height: F2.H };
  }
});

/* ── E08 Correlation matrix ─────────────────────────────────────────── */
register({
  id: 'E08', name: { zh: '相关矩阵', en: 'Correlation matrix' },
  question: { zh: '多个变量两两之间的相关方向与强度如何，哪些相关在统计上成立？', en: 'How strongly and in which direction are variables pairwise correlated, and which correlations hold statistically?' },
  use: { zh: '由原始观测（每行一个样本）计算 Pearson 或 Spearman 相关与 P 值，下三角色阶展示；可做多重比较校正，不显著的格子留白。', en: 'Pearson or Spearman correlations and P values computed from raw rows, lower-triangle colour matrix; optional multiple-testing correction, non-significant cells left blank.' },
  avoid: { zh: '只关心两个变量（用 R01）；变量 >16 个（先筛选）。', en: 'Only two variables (use R01); more than 16 variables.' },
  fields: [
    { key: 'vars', role: 'measure[]', required: true, desc: { zh: '参与计算的数值字段数组（3–16 个）', en: 'Numeric fields to correlate (3–16)' } }
  ],
  options: ['method:"pearson"|"spearman"', 'sig（显著性阈值，默认 0.05；false 关闭）', 'adjust:"none"|"holm"|"bh"', 'names'],
  keywords: { zh: ['相关矩阵', '相关系数', '皮尔逊', '斯皮尔曼', '变量相关', '共线性', '相关性热图'], en: ['correlation matrix', 'pearson', 'spearman', 'pairwise correlation', 'collinearity'] },
  needsUnit: false,
  lint: function (s, add) {
    var vars = asArray(s.vars);
    if (vars.length < 3) add('error', 'E_FIELD', 'vars 至少需要 3 个数值字段');
    if (vars.length > 16) add('warning', 'W_ITEMS', '变量超过 16 个：格子过小，先筛选');
    checkFields(s, add, vars);
    if (asArray(s.data).length < 10) add('warning', 'W_SAMPLE', '样本 <10：相关系数不稳定');
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', data = asArray(s.data), vars = asArray(s.vars), k = vars.length, sp = s.method === 'spearman';
    var col = function (f) { return data.map(function (r) { return num(r[f]); }); }, cols = vars.map(col), M = [], pl = [];
    for (var i = 0; i < k; i++) { M.push([]); for (var j = 0; j < k; j++) { var res = i === j ? { r: 1, p: 0, n: data.length } : (j < i ? M[j][i] : (sp ? spearman : pearson)(cols[i], cols[j])); M[i].push(res); if (j < i) pl.push({ i: i, j: j, p: res.p }); } }
    var sig = s.sig === false ? null : (num(s.sig) || 0.05), adjM = s.adjust && s.adjust !== 'none' ? s.adjust : null;
    if (adjM) { var adj = pAdjust(pl.map(function (q) { return q.p == null ? 1 : q.p; }), adjM); pl.forEach(function (q, t) { q.padj = adj[t]; }); } else pl.forEach(function (q) { q.padj = q.p; });
    var P = {}; pl.forEach(function (q) { P[q.i + ',' + q.j] = q.padj; });
    var names = vars.map(function (f) { return labelOf(s, f); }), fs = c.fs;
    var labW = Math.min(c.W * 0.3, Math.max.apply(null, names.slice(1).map(function (nm) { return textW(nm, fs); })) + 10);
    var cw = Math.min(64, (c.W - labW - 6) / (k - 1));
    var colLines = names.slice(0, k - 1).map(function (nm) { return wrapText(nm, cw - 6, fs, 400); });
    var rot = colLines.some(function (l) { return l.length > 2 || l.some(function (ln) { return textW(ln, fs) > cw - 4; }); }), two = !rot && colLines.some(function (l) { return l.length > 1; });
    var colLabH = rot ? Math.min(110, Math.max.apply(null, names.map(function (nm) { return textW(nm, fs); }))) + 12 : two ? 34 : 20;
    var top = 6, H = top + cw * (k - 1) + colLabH + 44, out = '';
    for (var a = 1; a < k; a++) {
      out += text(labW - 8, top + cw * (a - 0.5), names[a], { anchor: 'end', baseline: 'middle', size: fs, fill: THEME.ink });
      for (var b = 0; b < a; b++) {
        var res2 = M[a][b], x = labW + cw * b, y = top + cw * (a - 1), pv = P[a + ',' + b], ns = sig != null && (pv == null || pv >= sig);
        var fill = res2.r == null ? '#FFFFFF' : ns ? '#FFFFFF' : sciDiv(c, 0.5 + res2.r / 2);
        out += rect(x + 1, y + 1, cw - 2, cw - 2, { fill: fill, stroke: ns ? THEME.grid : null, cls: 'bz-hit', data: tip(names[a] + ' × ' + names[b], [[sp ? 'ρ' : 'r', res2.r == null ? '—' : res2.r.toFixed(2)], [adjM ? (en ? 'Adjusted P' : '校正 P') : 'P', pv == null ? '—' : fmtNum(pv, 'pvalue', c.lang)], ['n', String(res2.n)]]) });
        var rTxt = fmtNum(res2.r, { type: 'number', decimals: 2 }, c.lang);
        if (cw < 40) rTxt = rTxt.replace(/^0\./, '.').replace(/^−0\./, '−.');
        if (res2.r != null && cw >= 30) out += text(x + cw / 2, y + cw / 2, rTxt, { anchor: 'middle', baseline: 'middle', size: 11, fill: ns ? THEME.faint : inkOn(fill) });
      }
    }
    var yb = top + cw * (k - 1);
    for (var b2 = 0; b2 < k - 1; b2++) {
      var cx = labW + cw * (b2 + 0.5);
      if (rot) out += text(cx, yb + 6, truncate(names[b2], 108, fs), { anchor: 'end', baseline: 'middle', size: fs, fill: THEME.ink, transform: 'rotate(-90 ' + r2(cx) + ' ' + r2(yb + 6) + ')' });
      else colLines[b2].forEach(function (ln, j) { out += text(cx, yb + 16 + j * 14, ln, { anchor: 'middle', size: fs, fill: THEME.ink }); });
    }
    var lx = labW, ly = H - 30, lw = Math.min(220, c.W - labW - 10);
    out += sciLegend(c, lx, ly, lw, -1, 0, 1, function (v) { return fmtNum(v, { type: 'number', decimals: v === 0 ? 0 : 1 }, c.lang); }, sp ? 'ρ' : 'r');
    var nObs = data.length, nUsed = extent(pl.map(function (q) { return M[q.i][q.j].n; }));
    c.notesExtra.push((sp ? (en ? 'Spearman rank correlation ρ' : 'Spearman 秩相关 ρ') : (en ? 'Pearson correlation r' : 'Pearson 相关系数 r')) + (en ? '; n = ' : '；n = ') + (nUsed[0] === nUsed[1] ? nUsed[0] : nUsed[0] + '–' + nUsed[1]) + (nUsed[0] < nObs ? (en ? ' (pairwise complete)' : '（成对完整观测）') : ''));
    if (sig != null) c.notesExtra.push(en ? 'White cells: P ≥ ' + sig + ' (two-sided, ' + (adjM ? nameOf(ADJ_NAMES, adjM, 'en') : 'not adjusted for multiple comparisons') + ')' : '白色格为 P ≥ ' + sig + '（双侧，' + (adjM ? nameOf(ADJ_NAMES, adjM, 'zh') : '未做多重比较校正') + '）');
    c.setTable([en ? 'Variable' : '变量'].concat(names), names.map(function (nm, i) { return [nm].concat(names.map(function (_, j) { return M[i][j].r == null ? '—' : M[i][j].r.toFixed(2); })); }), names.map(function (nm, i) { return [nm].concat(names.map(function (_, j) { return M[i][j].r; })); }));
    c.stats = { method: sp ? 'spearman' : 'pearson', vars: names, pairs: pl.map(function (q) { return { a: names[q.i], b: names[q.j], r: M[q.i][q.j].r, p: q.p, pAdj: q.padj, n: M[q.i][q.j].n }; }) };
    return { svg: out, height: H };
  }
});

/* ── E09 UpSet (set intersections) ──────────────────────────────────── */
register({
  id: 'E09', name: { zh: '交集图（UpSet）', en: 'Set intersections (UpSet)' },
  question: { zh: '多个集合之间各种交集（如几组差异基因的重叠）各有多少元素？', en: 'How many elements fall in each intersection of several sets (e.g. overlapping gene lists)?' },
  use: { zh: '3–8 个集合的重叠：差异基因、突变、客户群、关键词；精确的互斥交集计数，替代面积不准的韦恩图。', en: 'Overlaps of 3–8 sets: gene lists, mutations, customer groups, keywords; exact exclusive counts instead of inexact Venn areas.' },
  avoid: { zh: '只有两个集合（用文字或 C03）；交集数量太多且都很小（先过滤）。', en: 'Only two sets (use text or C03); many tiny intersections.' },
  fields: [
    { key: 'set / item', role: 'category', required: true, desc: { zh: '长表：每行一个“集合–元素”归属（默认字段 set、item）；或 intersections 预计算', en: 'Long rows of set–item membership (default fields set, item); or precomputed intersections' } }
  ],
  options: ['intersections:[{sets:[…], count}] + setSizes', 'top（显示交集数，默认 16）', 'order（集合顺序）'],
  keywords: { zh: ['交集', 'UpSet', '韦恩图', '集合重叠', '差异基因重叠', '共有', '特有'], en: ['upset plot', 'venn', 'set intersection', 'overlap', 'shared genes', 'unique'] },
  needsUnit: false, dataKind: 'custom',
  lint: function (s, add) {
    var inter = asArray(s.intersections);
    if (!inter.length && !asArray(s.data).length) add('error', 'E_DATA', '需要 data（集合–元素长表）或 intersections');
    if (!inter.length) checkFields(s, add, [s.set || 'set', s.item || 'item']);
    var sets = upsetSets(s);
    if (sets.length < 2) add('error', 'E_SETS', '至少需要 2 个集合');
    if (sets.length > 8) add('warning', 'W_ITEMS', '超过 8 个集合：交集组合过多，先合并或筛选');
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', d = upsetData(s), inter = d.inter, fs = c.fs;
    var sets = d.sets.map(function (st) { return { key: st.name, name: labelOf(s, st.name), size: st.size }; }), dn = {};
    sets.forEach(function (st) { dn[st.key] = st.name; });
    inter = inter.map(function (it) { return { sets: it.sets.map(function (k) { return dn[k] || k; }), keys: it.sets, count: it.count }; });
    var top = num(s.top) || (c.compact ? 10 : 16), labW = Math.min(c.W * 0.26, Math.max.apply(null, sets.map(function (st) { return textW(st.name + (c.compact ? ' ' + c.fmt(st.size) : ''), fs); })) + 10);
    var sizeW = c.compact ? 0 : clamp(c.W * 0.15, 60, 120), mx0 = sizeW + labW + 6;
    var maxCols = Math.max(1, Math.floor((c.W - mx0 - 4) / 14)), shown = inter.slice(0, Math.min(top, maxCols)), rest = inter.slice(shown.length);
    var cw = (c.W - mx0 - 4) / shown.length, rowH = 20, barsH = clamp(c.W * 0.34, 120, 210), y0 = 22, mTop = y0 + barsH + 10, H = mTop + rowH * sets.length + 8;
    var maxC = Math.max.apply(null, shown.map(function (it) { return it.count; })), yd = niceLinear(0, maxC, 4, true), Y = scaleLinear(0, yd.max, y0 + barsH, y0), out = '';
    yd.ticks.forEach(function (t) { var yy = Math.round(Y(t)) + .5; if (t) out += line(mx0, yy, c.W, yy, { stroke: THEME.grid }); out += text(mx0 - 6, yy, fmtNum(t, 'integer', c.lang), { anchor: 'end', baseline: 'middle', size: 11, fill: THEME.ink2 }); });
    out += line(mx0, Y(0) + .5, c.W, Y(0) + .5, { stroke: THEME.axis });
    out += text(mx0 - 6, 8, en ? 'Intersection size' : '交集元素数', { anchor: 'end', size: 11, fill: THEME.muted });
    sets.forEach(function (st, i) { if (i % 2 === 0) out += rect(mx0, mTop + i * rowH, c.W - mx0, rowH, { fill: THEME.shade }); });
    var maxS = Math.max.apply(null, sets.map(function (st) { return st.size; })), r = clamp(cw * 0.28, 3, 6);
    shown.forEach(function (it, k) {
      var cx = mx0 + cw * (k + 0.5), bw = Math.max(4, cw * 0.62), by = Y(it.count);
      out += rect(cx - bw / 2, by, bw, Y(0) - by, { fill: THEME.primary });
      var ct = fmtNum(it.count, 'integer', c.lang);
      if (textW(ct, 11) <= cw + 2) out += text(cx, by - 4, ct, { anchor: 'middle', size: 11, fill: THEME.ink2 });
      var members = [];
      sets.forEach(function (st, i) { var on = it.keys.indexOf(st.key) >= 0, cy = mTop + i * rowH + rowH / 2; if (on) members.push(cy); out += circle(cx, cy, r, { fill: on ? THEME.ink : THEME.grid }); });
      if (members.length > 1) out += line(cx, Math.min.apply(null, members), cx, Math.max.apply(null, members), { stroke: THEME.ink, width: 2 });
      out += hitRect(cx - cw / 2, y0, cw, H - y0, it.sets.length === 1 ? (en ? 'Only ' : '仅 ') + it.sets[0] : it.sets.join(' ∩ '), [[en ? 'Elements' : '元素数', fmtNum(it.count, 'integer', c.lang)], [en ? 'Sets' : '集合数', String(it.sets.length)]], shown.length <= 40);
    });
    sets.forEach(function (st, i) {
      var cy = mTop + i * rowH + rowH / 2;
      out += text(sizeW + labW, cy, truncate(st.name, labW - 6 - (c.compact ? textW(' ' + c.fmt(st.size), fs) : 0), fs) + (c.compact ? ' ' + fmtNum(st.size, 'integer', c.lang) : ''), { anchor: 'end', baseline: 'middle', size: fs, fill: THEME.ink });
      if (sizeW) { var bl = (sizeW - 40) * st.size / maxS; out += rect(sizeW - 2 - bl, cy - 5, bl, 10, { fill: THEME.faint }); out += text(sizeW - 6 - bl, cy, fmtNum(st.size, 'integer', c.lang), { anchor: 'end', baseline: 'middle', size: 11, fill: THEME.ink2 }); }
    });
    if (sizeW) out += text(sizeW - 2, mTop - 4, en ? 'Set size' : '集合大小', { anchor: 'end', size: 11, fill: THEME.muted });
    c.notesExtra.push(en ? 'Exclusive intersections: each element is counted once, in the exact combination of sets it belongs to; ' + (d.raw ? 'n = ' + d.nItems + ' distinct elements' : 'counts as supplied') : '交集为互斥计数：每个元素只计入其所属集合的精确组合；' + (d.raw ? '共 ' + d.nItems + ' 个不同元素' : '计数为用户提供'));
    if (rest.length) c.notesExtra.push(en ? rest.length + ' smaller intersections (' + sum(rest, function (it) { return it.count; }) + ' elements) not shown' : '另有 ' + rest.length + ' 个较小交集（共 ' + sum(rest, function (it) { return it.count; }) + ' 个元素）未显示');
    c.setTable([en ? 'Intersection' : '交集', en ? 'Sets' : '集合数', en ? 'Elements' : '元素数'], inter.map(function (it) { return [it.sets.join(' ∩ '), String(it.sets.length), String(it.count)]; }));
    c.stats = { sets: sets.map(function (st) { return { key: st.key, name: st.name, size: st.size }; }), intersections: inter.map(function (it) { return { sets: it.keys, names: it.sets, count: it.count }; }), items: d.nItems };
    return { svg: out, height: H };
  }
});
function upsetSets(s) { return upsetData(s).sets; }
function upsetData(s) {
  var inter = asArray(s.intersections), sets = {}, out = [], nItems = null, raw = !inter.length;
  if (raw) {
    var fS = s.set || 'set', fI = s.item || 'item', mem = {}, items = [];
    asArray(s.data).forEach(function (r) {
      if (r[fS] == null || r[fI] == null) return;
      var it = String(r[fI]), st = String(r[fS]);
      if (!mem[it]) { mem[it] = {}; items.push(it); }
      mem[it][st] = 1;
    });
    items.forEach(function (it) { Object.keys(mem[it]).forEach(function (st) { sets[st] = (sets[st] || 0) + 1; }); });
    var setNames = asArray(s.order).length ? asArray(s.order).map(String) : Object.keys(sets).sort(function (a, b) { return sets[b] - sets[a] || (a < b ? -1 : 1); });
    var combos = {};
    items.forEach(function (it) { var key = setNames.filter(function (st) { return mem[it][st]; }); var k = key.join('\u0001'); if (!combos[k]) combos[k] = { sets: key, count: 0 }; combos[k].count++; });
    out = Object.keys(combos).map(function (k) { return combos[k]; });
    nItems = items.length;
    return finishUpset(setNames.map(function (nm) { return { name: nm, size: sets[nm] || 0 }; }), out, raw, nItems);
  }
  var sizes = s.setSizes || {};
  inter.forEach(function (it) { asArray(it.sets).forEach(function (st) { st = String(st); if (sizes[st] == null) sets[st] = (sets[st] || 0) + (num(it.count) || 0); }); });
  Object.keys(sizes).forEach(function (st) { sets[st] = num(sizes[st]); });
  var names2 = asArray(s.order).length ? asArray(s.order).map(String) : Object.keys(sets).sort(function (a, b) { return sets[b] - sets[a] || (a < b ? -1 : 1); });
  out = inter.map(function (it) { var mem2 = asArray(it.sets).map(String); return { sets: names2.filter(function (nm) { return mem2.indexOf(nm) >= 0; }), count: num(it.count) || 0 }; });
  return finishUpset(names2.map(function (nm) { return { name: nm, size: sets[nm] || 0 }; }), out, raw, sum(out, function (it) { return it.count; }));
}
function finishUpset(sets, inter, raw, nItems) {
  inter.sort(function (a, b) { return b.count - a.count || a.sets.length - b.sets.length || (a.sets.join() < b.sets.join() ? -1 : 1); });
  return { sets: sets, inter: inter.filter(function (it) { return it.count > 0 && it.sets.length; }), raw: raw, nItems: nItems };
}
