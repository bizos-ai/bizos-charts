/* 87-bio — B01–B08 biomedicine and omics: Kaplan–Meier survival with risk
   table, dose–response (4PL, IC50/EC50), volcano/MA, Manhattan, clustered
   heatmap, PCA/UMAP embedding, phylogenetic tree and mutation lollipop.
   Estimates are computed in 15-stats; thresholds and methods go in notes. */

function parB(t, lang) { return lang === 'en' ? ' (' + t + ')' : '（' + t + '）'; }
function eventVal(v) {
  if (v === true || v === 1 || v === '1') return 1;
  if (v === false || v === 0 || v === '0') return 0;
  return null;
}
function sig3(v, lang) {
  if (!isNum(v)) return '—';
  var a = Math.abs(v), d = a === 0 ? 0 : clamp(2 - Math.floor(Math.log10(a)), 0, 4);
  return fmtNum(v, { type: 'number', decimals: d }, lang);
}
/* Dots drawn as one path of zero-length round-capped segments: thousands of
   points stay a few kilobytes (used for non-interactive background points). */
function dotPath(pts, r, color, opacity) {
  if (!pts.length) return '';
  return path(pts.map(function (p) { return 'M' + r2(p[0]) + ' ' + r2(p[1]) + 'h0'; }).join(''), { stroke: color, width: r * 2, cap: 'round', opacity: opacity == null ? null : opacity });
}
function labelPoints(c, cands, bounds, avoid, italic) {
  var out = '';
  placeBoxes(cands.map(function (cd) {
    var w = textW(cd.t, 11, 600), px = cd.x, py = cd.y, r = cd.r || 3;
    cd.avoid = avoid;
    cd.options = [
      { x0: px + r + 4, x1: px + r + 4 + w, y0: py - 18, y1: py - 5, tx: px + r + 4, ty: py - 8, a: 'start' },
      { x0: px - r - 4 - w, x1: px - r - 4, y0: py - 18, y1: py - 5, tx: px - r - 4, ty: py - 8, a: 'end' },
      { x0: px + r + 4, x1: px + r + 4 + w, y0: py + 5, y1: py + 18, tx: px + r + 4, ty: py + 15, a: 'start' },
      { x0: px - r - 4 - w, x1: px - r - 4, y0: py + 5, y1: py + 18, tx: px - r - 4, ty: py + 15, a: 'end' },
      { x0: px - w / 2, x1: px + w / 2, y0: py - r - 26, y1: py - r - 13, tx: px, ty: py - r - 16, a: 'middle' },
      { x0: px + r + 12, x1: px + r + 12 + w, y0: py - 30, y1: py - 17, tx: px + r + 12, ty: py - 20, a: 'start' },
      { x0: px - r - 12 - w, x1: px - r - 12, y0: py - 30, y1: py - 17, tx: px - r - 12, ty: py - 20, a: 'end' }
    ];
    return cd;
  }), bounds).forEach(function (cd) {
    var o = cd.chosen, lx = o.a === 'start' ? o.x0 : o.a === 'end' ? o.x1 : (o.x0 + o.x1) / 2, ly = (o.y0 + o.y1) / 2;
    out += line(cd.x, cd.y, lx + (o.a === 'start' ? -2 : o.a === 'end' ? 2 : 0), o.a === 'middle' ? o.y1 : ly, { stroke: THEME.ink2, width: 0.8 });
    out += text(o.tx, o.ty, cd.t, { anchor: o.a, size: 11, weight: 600, fill: THEME.ink, halo: true, italic: !!italic });
  });
  return out;
}

/* ── B01 Kaplan–Meier ───────────────────────────────────────────────── */
register({
  id: 'B01', name: { zh: '生存曲线（Kaplan–Meier）', en: 'Survival curve (Kaplan–Meier)' },
  question: { zh: '随访期间各组的生存（或无事件）比例如何下降，中位生存期相差多少？', en: 'How does the survival (or event-free) proportion fall by group, and how far apart are the median times?' },
  use: { zh: '临床与动物实验的时间–事件数据（总生存、无进展生存、复发、设备故障、客户流失）；引擎由逐例随访时间与结局计算 KM 曲线、删失标记、风险人数表、中位生存期与 log-rank 检验。', en: 'Time-to-event data (overall or progression-free survival, relapse, failure, churn): KM curves, censor marks, number-at-risk table, medians and log-rank test from per-subject follow-up.' },
  avoid: { zh: '只有各时点汇总生存率（无法计算删失与检验，用 T01 并注明）；竞争风险明显时（需累积发生率曲线）。', en: 'Only aggregated survival rates (use T01 and say so); strong competing risks (needs cumulative incidence).' },
  fields: [
    { key: 'time', role: 'measure', required: true, desc: { zh: '随访时间字段（timeUnit 必填）', en: 'Follow-up time field (timeUnit required)' } },
    { key: 'event', role: 'category', required: true, desc: { zh: '结局字段：1 = 发生事件，0 = 删失', en: 'Event field: 1 = event, 0 = censored' } },
    { key: 'group', role: 'category', required: false, desc: { zh: '分组（≤6 组）', en: 'Group (≤6)' } }
  ],
  options: ['timeUnit', 'ci', 'riskTable', 'medianLines', 'landmarks:[12, 24]', 'hr:{value, lo, hi, label}', 'tickStep', 'xMax', 'yTitle', 'order', 'highlight'],
  keywords: { zh: ['生存曲线', 'Kaplan-Meier', 'KM曲线', '总生存', '无进展生存', '中位生存期', '风险人数', 'log-rank', '删失', '随访'], en: ['survival curve', 'kaplan meier', 'overall survival', 'progression-free survival', 'median survival', 'number at risk', 'log-rank', 'censoring', 'time to event'] },
  needsUnit: false, aspect: 0.5,
  lint: function (s, add) {
    checkFields(s, add, [s.time, s.event, s.group]);
    if (!s.timeUnit) add('error', 'E_UNIT', '缺少时间单位 timeUnit（如“月”“天”）');
    var data = asArray(s.data), badE = data.filter(function (r) { return eventVal(r[s.event]) == null; }).length, badT = data.filter(function (r) { return !(num(r[s.time]) >= 0); }).length;
    if (badE) add('error', 'E_EVENT', badE + ' 行 event 不是 1/0');
    if (badT) add('error', 'E_TIME', badT + ' 行随访时间缺失或为负');
    var gs = s.group ? uniq(data.map(function (r) { return String(r[s.group]); })) : [''];
    if (gs.length > 6) add('warning', 'W_SERIES', gs.length + ' 组：KM 图建议 ≤4 组');
    gs.forEach(function (g) { var n = data.filter(function (r) { return !s.group || String(r[s.group]) === g; }).length; if (n < 10) add('warning', 'W_SAMPLE', '组 “' + g + '” 仅 ' + n + ' 例'); });
    if (s.hr && !(num(s.hr.lo) <= num(s.hr.value) && num(s.hr.value) <= num(s.hr.hi))) add('error', 'E_HR', 'hr 需要 value、lo、hi 且 lo ≤ value ≤ hi');
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', data = asArray(s.data), u = s.timeUnit || '';
    var gnames = s.group ? (asArray(s.order).length ? asArray(s.order).map(String) : uniq(data.map(function (r) { return String(r[s.group]); }))) : [''];
    var groups = gnames.map(function (g, i) {
      var rows = data.filter(function (r) { return (!s.group || String(r[s.group]) === g) && num(r[s.time]) >= 0 && eventVal(r[s.event]) != null; });
      var t = rows.map(function (r) { return num(r[s.time]); }), e = rows.map(function (r) { return eventVal(r[s.event]); });
      var nm = g || (en ? 'All subjects' : '全部样本');
      return { name: nm, t: t, e: e, km: kaplanMeier(t, e), color: c.isDim(nm) ? THEME.dim : c.color(nm, i), dim: c.isDim(nm) };
    }).filter(function (g) { return g.km.n; });
    var lr = groups.length > 1 && s.logrank !== false ? logRank(groups.map(function (g) { return { times: g.t, events: g.e }; })) : null;
    var maxT = num(s.xMax) || Math.max.apply(null, groups.map(function (g) { return g.km.maxT; }));
    var showRisk = s.riskTable !== false, rowH = 17, riskH = showRisk ? 22 + groups.length * rowH : 0;
    var nameW = showRisk ? Math.min(c.W * 0.26, Math.max.apply(null, groups.map(function (g) { return textW(g.name, 11, 600); })) + 12) : 0;
    var plotH = c.height(0.5, 250, 400), step = num(s.tickStep), ticks = null;
    if (step > 0) { ticks = []; for (var tv = 0; tv <= maxT + 1e-9 && ticks.length < 40; tv += step) ticks.push(+tv.toFixed(6)); if (ticks[ticks.length - 1] < maxT) ticks.push(+(ticks[ticks.length - 1] + step).toFixed(6)); }
    var hiX = ticks ? ticks[ticks.length - 1] : maxT;
    var F = frameXY(c, { height: plotH + riskH + 18, x: { kind: 'linear', lo: 0, hi: hiX, fixedMin: 0, fixedMax: ticks ? hiX : null, tickValues: ticks }, y: { lo: 0, hi: 100, zero: true, fixedMin: 0, fixedMax: 100, unit: s.yTitle || (en ? 'Survival probability (%)' : '生存概率（%）'), fmt: 'integer' }, bottom: riskH + 18, leftMin: nameW });
    var X = function (t) { return F.x(Math.min(t, F.x.nice.max)); }, Y = function (p) { return F.y(p * 100); };
    var under = '', marks = '', over = '', labels = '';
    var order = groups.slice().sort(function (a, b) { return (a.dim ? 0 : 1) - (b.dim ? 0 : 1); });
    order.forEach(function (g) {
      var st = g.km.steps.filter(function (p) { return p.t <= maxT; }), end = Math.min(g.km.maxT, maxT);
      if (s.ci) {
        var up = [[X(0), Y(1)]], dn = [[X(0), Y(1)]];
        for (var k = 1; k < st.length; k++) { up.push([X(st[k].t), Y(st[k - 1].hi)], [X(st[k].t), Y(st[k].hi)]); dn.push([X(st[k].t), Y(st[k - 1].lo)], [X(st[k].t), Y(st[k].lo)]); }
        up.push([X(end), Y(st[st.length - 1].hi)]); dn.push([X(end), Y(st[st.length - 1].lo)]);
        under += path(polyline(up) + polyline(dn.reverse()).replace(/^M/, 'L') + 'Z', { fill: g.color, fillOpacity: g.dim ? 0.06 : 0.13 });
      }
      var d = 'M' + r2(X(0)) + ' ' + r2(Y(1));
      for (var k2 = 1; k2 < st.length; k2++) d += 'H' + r2(X(st[k2].t)) + 'V' + r2(Y(st[k2].s));
      d += 'H' + r2(X(end));
      marks += path(d, { stroke: g.color, width: g.dim ? 1.5 : 2.2 });
      g.km.censor.forEach(function (cz) { if (cz.t <= maxT) marks += line(X(cz.t), Y(cz.s) - 4, X(cz.t), Y(cz.s) + 4, { stroke: g.color, width: 1.4 }); });
    });
    if (s.medianLines !== false) {
      var meds = groups.filter(function (g) { return g.km.median != null && g.km.median <= maxT && !g.dim; });
      if (meds.length) {
        var mxm = Math.max.apply(null, meds.map(function (g) { return g.km.median; }));
        under += line(X(0), Y(0.5), X(mxm), Y(0.5), { stroke: THEME.axis, dash: '3 3' });
        meds.forEach(function (g) { under += line(X(g.km.median), Y(0.5), X(g.km.median), F.P.b, { stroke: g.color, dash: '3 3', opacity: 0.8 }); });
      }
    }
    var tFmt = function (v) { return fmtNum(v, { type: 'number', decimals: Math.abs(v) >= 100 ? 0 : 1 }, c.lang); }, uTxt = !en && u === '月' ? '个月' : u;
    var medTxt = function (g) {
      var k = g.km, ci = '95% CI ' + (k.medianLo == null ? 'NR' : tFmt(k.medianLo)) + '–' + (k.medianHi == null ? 'NR' : tFmt(k.medianHi));
      return k.median == null ? (en ? 'not reached' : '未达到') : tFmt(k.median) + (uTxt ? ' ' + uTxt : '') + (en ? ' (' + ci + ')' : '（' + ci + '）');
    };
    var statLines = [];
    if (lr) statLines.push('Log-rank ' + fmtP(lr.p, c.lang));
    if (s.hr) statLines.push((s.hr.label || 'HR') + ' ' + fmtNum(num(s.hr.value), 'number:2', c.lang) + (en ? ' (95% CI ' : '（95% CI ') + fmtNum(num(s.hr.lo), 'number:2', c.lang) + '–' + fmtNum(num(s.hr.hi), 'number:2', c.lang) + (en ? ')' : '）'));
    if (statLines.length) {
      var bw = Math.max.apply(null, statLines.map(function (t) { return textW(t, c.fs, 600); })) + 8, bh = statLines.length * 16 + 4;
      var survAt = function (g, t) { var st2 = g.km.at(Math.min(t, g.km.maxT)); return st2 ? st2.s : 0; };
      var tR = F.x.invert(F.P.r - bw), sTR = (F.P.b - (F.P.t + bh)) / F.P.h;
      var freeTR = groups.every(function (g) { return tR > g.km.maxT || survAt(g, tR) < sTR - 0.03; });
      var tL = F.x.invert(F.P.l + bw), sBL = (F.P.b - (F.P.b - bh - 4)) / F.P.h;
      var freeBL = groups.every(function (g) { return survAt(g, tL) > sBL + 0.03; });
      if (freeTR || freeBL) statLines.forEach(function (t, k) { labels += freeTR ? text(F.P.r - 4, F.P.t + 4 + k * 16, t, { anchor: 'end', baseline: 'top', size: c.fs, weight: 600, fill: THEME.ink, halo: true }) : text(F.P.l + 6, F.P.b - 8 - (statLines.length - 1 - k) * 16, t, { size: c.fs, weight: 600, fill: THEME.ink, halo: true }); });
      else c.notesExtra.push(statLines.join(en ? '; ' : '；'));
    }
    labels += text(F.P.r, F.P.b + 33, withUnit(s.xTitle || (en ? 'Time' : '时间'), u, c.lang), { anchor: 'end', size: c.fs, fill: THEME.muted });
    if (showRisk) {
      var ty = F.P.b + 50, tks = (F.x.nice.ticks || []).filter(function (t) { return t <= F.x.nice.max + 1e-9; });
      labels += text(0, ty, en ? 'Number at risk' : '风险人数', { size: 11, weight: 600, fill: THEME.ink2 });
      groups.forEach(function (g, k) {
        var yy = ty + (k + 1) * rowH;
        labels += text(0, yy, truncate(g.name, nameW - 8, 11, 600), { size: 11, weight: 600, fill: g.dim ? THEME.muted : g.color });
        var lastR = -1e9;
        tks.forEach(function (t) { var lab = String(g.km.atRisk(t)), px = X(t), w = textW(lab, 11); if (px - w / 2 < lastR + 4) return; lastR = px + w / 2; labels += text(Math.min(px, c.W - w / 2 - 1), yy, lab, { anchor: 'middle', size: 11, fill: THEME.ink }); });
      });
    }
    groups.forEach(function (g) { c.addLegend(g.name + ' (n = ' + g.km.n + ')', g.color, 'line'); });
    var lm = asArray(s.landmarks).map(num).filter(isNum);
    c.notesExtra.push(en ? 'Kaplan–Meier estimates; ticks mark censored subjects' + (s.ci ? '; shading = 95% CI (log–log)' : '') : 'Kaplan–Meier 估计；短竖线为删失' + (s.ci ? '；阴影为 95% CI（log-log 变换）' : ''));
    c.notesExtra.push((en ? 'Median ' + (s.xTitle || 'time') + ': ' : '中位' + (s.medianName || '生存期') + '：') + groups.map(function (g) { return (groups.length > 1 ? g.name + ' ' : '') + medTxt(g); }).join(en ? '; ' : '；'));
    if (lr) c.notesExtra.push(en ? 'Log-rank test χ² = ' + lr.chi2.toFixed(2) + ', df = ' + lr.df + ', ' + fmtP(lr.p, 'en') : '组间比较：log-rank 检验 χ² = ' + lr.chi2.toFixed(2) + '，df = ' + lr.df + '，' + fmtP(lr.p, 'zh'));
    if (s.hr) c.notesExtra.push((s.hr.label || 'HR') + (en ? ' as supplied' : ' 为用户提供') + (s.hr.method ? (en ? ' (' + s.hr.method + ')' : '（' + s.hr.method + '）') : ''));
    var head = [en ? 'Group' : '组别', 'n', en ? 'Events' : '事件数', en ? 'Median (95% CI)' : '中位时间（95% CI）'].concat(lm.map(function (t) { return (en ? 'S(' : 'S(') + t + (u ? ' ' + u : '') + ')'; }));
    c.setTable(head, groups.map(function (g) {
      return [g.name, String(g.km.n), String(g.km.events), medTxt(g)].concat(lm.map(function (t) { var st3 = g.km.at(t); return st3 ? fmtNum(st3.s * 100, 'percent:1', c.lang) + (en ? ' (' : '（') + fmtNum(st3.lo * 100, 'number:1', c.lang) + '–' + fmtNum(st3.hi * 100, 'number:1', c.lang) + (en ? ')' : '）') : '—'; }));
    }));
    c.stats = { groups: groups.map(function (g) { return { name: g.name, n: g.km.n, events: g.km.events, median: g.km.median, medianLo: g.km.medianLo, medianHi: g.km.medianHi, landmarks: lm.map(function (t) { var st4 = g.km.at(t); return { t: t, s: st4 ? st4.s : null, lo: st4 ? st4.lo : null, hi: st4 ? st4.hi : null }; }) }; }), logrank: lr ? { chi2: lr.chi2, df: lr.df, p: lr.p } : null, hr: s.hr || null };
    return { svg: F.under + under + F.base + marks + over + F.axes + labels, height: F.H };
  }
});

/* ── B02 Dose–response (4PL) ────────────────────────────────────────── */
register({
  id: 'B02', name: { zh: '剂量反应曲线（IC50 / EC50）', en: 'Dose–response curve (IC50 / EC50)' },
  question: { zh: '化合物的效力如何（IC50 / EC50 是多少），几种化合物谁更强？', en: 'How potent is each compound (IC50 / EC50), and which is strongest?' },
  use: { zh: '细胞活力、酶抑制、受体激动等浓度梯度实验：引擎对全部重复做四参数 logistic 拟合，给出 IC50/EC50 与 95% CI、Hill 斜率，对数浓度轴。', en: 'Viability, enzyme inhibition or agonist titrations: four-parameter logistic fit on all replicates, IC50/EC50 with 95% CI and Hill slope on a log-concentration axis.' },
  avoid: { zh: '浓度点 <5 个或未覆盖上下平台（IC50 不可靠）；时间进程（用 E03）。', en: 'Fewer than 5 concentrations or no plateaus (IC50 unreliable); time courses (use E03).' },
  fields: [
    { key: 'x', role: 'measure', required: true, desc: { zh: '浓度字段（>0；concUnit 必填）', en: 'Concentration (>0; concUnit required)' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '响应值（每行一个重复；unit 必填，如 %）', en: 'Response, one row per replicate (unit required, e.g. %)' } },
    { key: 'group', role: 'category', required: false, desc: { zh: '化合物 / 条件', en: 'Compound / condition' } }
  ],
  options: ['concUnit', 'metric:"IC50"|"EC50"', 'constrain:{bottom, top}', 'error:"sd"|"sem"', 'fit:false', 'highlight'],
  keywords: { zh: ['剂量反应', 'IC50', 'EC50', '半数抑制浓度', '四参数', '量效曲线', '药效', '细胞活力', '抑制曲线'], en: ['dose response', 'ic50', 'ec50', 'four parameter logistic', '4pl', 'potency', 'inhibition curve', 'viability'] },
  aspect: 0.6,
  lint: function (s, add) {
    checkFields(s, add, [s.x, s.y, s.group]);
    if (!s.concUnit) add('error', 'E_UNIT', '缺少浓度单位 concUnit（如“nM”“μg/mL”）');
    var data = asArray(s.data), gs = s.group ? uniq(data.map(function (r) { return String(r[s.group]); })) : [''];
    if (data.some(function (r) { return num(r[s.x]) < 0; })) add('error', 'E_CONC', '浓度不能为负');
    gs.forEach(function (g) {
      var xs = uniq(data.filter(function (r) { return (!s.group || String(r[s.group]) === g) && num(r[s.x]) > 0 && isNum(num(r[s.y])); }).map(function (r) { return num(r[s.x]); }));
      if (s.fit !== false && xs.length < 4) add('error', 'E_FIT', '“' + (g || '数据') + '” 只有 ' + xs.length + ' 个正浓度：四参数拟合至少需要 4 个（建议 ≥6）');
      else if (s.fit !== false && xs.length < 6) add('warning', 'W_FIT', '“' + (g || '数据') + '” 浓度点 ' + xs.length + ' 个：建议 ≥6 并覆盖上下平台');
    });
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', data = asArray(s.data), ek = s.error || 'sd', u = s.concUnit || '';
    var gnames = s.group ? uniq(data.map(function (r) { return String(r[s.group]); })) : [''], zeroN = 0;
    var groups = gnames.map(function (g, i) {
      var rows = data.filter(function (r) { return (!s.group || String(r[s.group]) === g) && isNum(num(r[s.x])) && isNum(num(r[s.y])); });
      var pos = rows.filter(function (r) { return num(r[s.x]) > 0; }); zeroN += rows.length - pos.length;
      var fit = s.fit === false ? null : fit4PL(pos.map(function (r) { return Math.log10(num(r[s.x])); }), pos.map(function (r) { return num(r[s.y]); }), s.constrain || {});
      var ux = uniq(pos.map(function (r) { return num(r[s.x]); })).sort(function (a, b) { return a - b; });
      var pts = ux.map(function (xv) { var vals = pos.filter(function (r) { return num(r[s.x]) === xv; }).map(function (r) { return num(r[s.y]); }), st = describe(vals), iv = errorInterval(st, ek); return { x: xv, c: iv.c, lo: iv.lo, hi: iv.hi, n: st.n }; });
      var nm = g || labelOf(s, s.y);
      return { name: nm, pts: pts, fit: fit, ux: ux, n: pos.length, color: c.isDim(nm) ? THEME.dim : c.color(nm, i), dim: c.isDim(nm) };
    }).filter(function (g) { return g.pts.length; });
    var allX = [].concat.apply([], groups.map(function (g) { return g.ux; })), ex = extent(allX), xlo = ex[0] / 2, xhi = ex[1] * 2;
    var metricOf = function (g) { return s.metric || (g.fit && g.fit.hill < 0 ? 'IC50' : 'EC50'); };
    var curveY = [];
    groups.forEach(function (g) { if (g.fit) for (var k = 0; k <= 60; k++) { var lx = Math.log10(xlo) + (Math.log10(xhi) - Math.log10(xlo)) * k / 60; curveY.push(f4pl(g.fit, lx)); } });
    var ey = extent([].concat.apply([], groups.map(function (g) { return [].concat.apply([], g.pts.map(function (p) { return [p.lo, p.hi]; })); })).concat(curveY));
    var zero = s.zero !== false && ey[0] >= -0.05 * Math.abs(ey[1]) && ey[0] <= ey[1] * 0.35;
    var tight = zero && ey[0] < 0;
    var F = frameXY(c, { x: { kind: 'linear', lo: xlo, hi: xhi, log: true }, y: { lo: Math.min(ey[0], zero ? 0 : ey[0]), hi: ey[1], zero: zero && !tight, tight: tight, unit: withUnit(s.yTitle || labelOf(s, s.y), s.unit, c.lang) }, bottom: 16, right: 12 });
    var X = function (v) { return F.x(v); }, drops = '', marks = '', over = '', labels = '', dodge = groups.length > 1 ? 2.2 : 0;
    var lo10 = Math.log10(F.x.nice.min), hi10 = Math.log10(F.x.nice.max);
    var order = groups.slice().sort(function (a, b) { return (a.dim ? 0 : 1) - (b.dim ? 0 : 1); });
    order.forEach(function (g, gi) {
      if (g.fit) {
        var cp = [];
        for (var k = 0; k <= 120; k++) { var lx = lo10 + (hi10 - lo10) * k / 120, yv = f4pl(g.fit, lx); if (yv >= F.yd.min && yv <= F.yd.max) cp.push([F.x(Math.pow(10, lx)), F.y(yv)]); else cp.push(null); }
        marks += path(polyline(cp), { stroke: g.color, width: g.dim ? 1.5 : 2.2 });
      }
      var dx = (groups.indexOf(g) - (groups.length - 1) / 2) * dodge;
      g.pts.forEach(function (p) {
        var px = X(p.x) + dx;
        if (p.hi > p.lo) { over += line(px, F.y(p.lo), px, F.y(p.hi), { stroke: g.color, width: 1.2 }) + line(px - 3, F.y(p.lo), px + 3, F.y(p.lo), { stroke: g.color, width: 1.2 }) + line(px - 3, F.y(p.hi), px + 3, F.y(p.hi), { stroke: g.color, width: 1.2 }); }
        over += circle(px, F.y(p.c), 3.4, { fill: g.color, stroke: '#FFFFFF', width: 1, cls: 'bz-hit', data: tip(g.name + ' · ' + sig3(p.x, c.lang) + ' ' + u, [[c.t('mean'), c.fmt(p.c)], [ek === 'sem' ? 'SEM' : 'SD', c.fmt((p.hi - p.lo) / 2)], ['n', String(p.n)]]) });
      });
      if (g.fit && g.fit.ec50 >= F.x.nice.min && g.fit.ec50 <= F.x.nice.max && !g.dim) {
        var mid = (g.fit.top + g.fit.bottom) / 2, ex50 = X(g.fit.ec50);
        if (groups.length <= 3) drops += line(ex50, F.y(mid), ex50, F.P.b, { stroke: g.color, dash: '3 3', opacity: 0.7 });
        over += circle(ex50, F.y(mid), 4.2, { fill: '#FFFFFF', stroke: g.color, width: 2 });
      }
    });
    var outside = [];
    groups.forEach(function (g) {
      var f = g.fit, ok = f && f.converged && f.ciLo != null, inRange = f && f.ec50 >= g.ux[0] && f.ec50 <= g.ux[g.ux.length - 1];
      if (f && !inRange) outside.push(g.name);
      var lab = g.name + (f ? ' · ' + metricOf(g) + ' ' + sig3(f.ec50, c.lang) + ' ' + u + (ok ? parB(sig3(f.ciLo, c.lang) + '–' + sig3(f.ciHi, c.lang), c.lang) : '') + (inRange ? '' : (en ? ' (extrapolated)' : '（外推）')) : '');
      c.addLegend(lab, g.color, 'line');
    });
    labels += text(F.P.r, F.H - 2, (s.xTitle || (en ? 'Concentration' : '浓度')) + (en ? ' (' + u + ', log scale)' : '（' + u + '，对数刻度）'), { anchor: 'end', size: c.fs, fill: THEME.muted });
    var fx = s.constrain ? Object.keys(s.constrain).filter(function (k) { return s.constrain[k] != null; }) : [];
    var nRep = extent([].concat.apply([], groups.map(function (g) { return g.pts.map(function (p) { return p.n; }); })));
    c.notesExtra.push(en ? 'Four-parameter logistic fit on all replicates (least squares); IC50/EC50 = concentration at the midpoint between fitted top and bottom; 95% CI from the standard error of log IC50 (t distribution)' : '四参数 logistic 拟合（全部重复点，最小二乘）；IC50/EC50 为拟合曲线顶部与底部中点对应的浓度；95% CI 由 logIC50 的标准误按 t 分布计算');
    c.notesExtra.push((en ? 'Points = mean ± ' + (ek === 'sem' ? 'SEM' : 'SD') + ', n = ' : '点为均值 ± ' + (ek === 'sem' ? 'SEM' : 'SD') + '，n = ') + (nRep[0] === nRep[1] ? nRep[0] : nRep[0] + '–' + nRep[1]) + (en ? ' per concentration' : '/浓度') + (fx.length ? (en ? '; fixed: ' : '；固定参数：') + fx.map(function (k) { return k + ' = ' + s.constrain[k]; }).join(', ') : ''));
    if (zeroN) c.notesExtra.push(en ? zeroN + ' zero-concentration observations cannot sit on a log axis and are excluded from plot and fit' : zeroN + ' 个零浓度观测无法置于对数轴，未纳入作图与拟合');
    if (outside.length) c.notesExtra.push((en ? 'Outside the tested range (extrapolated): ' : '超出检测浓度范围（外推，需谨慎）：') + outside.join(en ? ', ' : '、'));
    groups.forEach(function (g) { if (g.fit && !g.fit.converged) c.notesExtra.push(g.name + (en ? ': fit did not converge' : '：拟合未收敛')); });
    c.setTable([en ? 'Group' : '组别', en ? 'IC50/EC50' : 'IC50/EC50', '95% CI', en ? 'Hill slope' : 'Hill 斜率', en ? 'Top' : '顶部', en ? 'Bottom' : '底部', 'R²', 'n'].map(function (h, k) { return k === 1 ? h + ' (' + u + ')' : h; }),
      groups.map(function (g) { var f = g.fit; return f ? [g.name, sig3(f.ec50, c.lang), f.ciLo != null ? sig3(f.ciLo, c.lang) + '–' + sig3(f.ciHi, c.lang) : '—', f.hill.toFixed(2), c.fmt(f.top), c.fmt(f.bottom), f.r2 != null ? f.r2.toFixed(3) : '—', String(f.n)] : [g.name, '—', '—', '—', '—', '—', '—', String(g.n)]; }));
    c.stats = { groups: groups.map(function (g) { var f = g.fit; return { name: g.name, metric: metricOf(g), ec50: f ? f.ec50 : null, ciLo: f ? f.ciLo : null, ciHi: f ? f.ciHi : null, hill: f ? f.hill : null, top: f ? f.top : null, bottom: f ? f.bottom : null, r2: f ? f.r2 : null, n: g.n, converged: f ? f.converged : null }; }) };
    return { svg: F.under + F.base + drops + marks + over + F.axes + labels, height: F.H };
  }
});

/* ── B03 Volcano / MA plot ──────────────────────────────────────────── */
register({
  id: 'B03', name: { zh: '火山图 / MA 图', en: 'Volcano / MA plot' },
  question: { zh: '处理前后哪些基因（蛋白、代谢物）显著上调或下调，幅度多大？', en: 'Which genes (proteins, metabolites) are significantly up- or down-regulated, and by how much?' },
  use: { zh: '差异表达、差异蛋白与代谢物：log₂ 倍数变化 × −log₁₀ P，阈值虚线、上下调计数、自动标注最显著的条目；mode:"ma" 画平均表达 × 倍数变化。', en: 'Differential expression, proteomics or metabolomics: log₂ fold change × −log₁₀ P with threshold lines, up/down counts and labels for the top hits; mode:"ma" plots mean expression × fold change.' },
  avoid: { zh: '没有 P 值的倍数变化（用 C04）；条目 <30。', en: 'Fold changes without P values (use C04); fewer than 30 features.' },
  fields: [
    { key: 'x', role: 'measure', required: true, desc: { zh: 'log₂ 倍数变化字段', en: 'log₂ fold-change field' } },
    { key: 'p', role: 'measure', required: true, desc: { zh: 'P 值字段（建议校正 P；pType 说明）', en: 'P-value field (adjusted preferred; see pType)' } },
    { key: 'label', role: 'category', required: false, desc: { zh: '基因 / 蛋白名称字段', en: 'Gene / protein name field' } },
    { key: 'mean', role: 'measure', required: false, desc: { zh: 'MA 模式的平均表达字段', en: 'Mean expression field for MA mode' } }
  ],
  options: ['mode:"volcano"|"ma"', 'fcCut（默认 1）', 'pCut（默认 0.05）', 'pType:"adjusted"|"raw"', 'top（标注个数）', 'highlight（必标注的名称）', 'italic', 'xLog（MA）'],
  keywords: { zh: ['火山图', '差异表达', '差异基因', '上调', '下调', '倍数变化', 'log2FC', 'MA图', '转录组', '蛋白组'], en: ['volcano plot', 'differential expression', 'deg', 'upregulated', 'downregulated', 'fold change', 'log2fc', 'ma plot', 'rna-seq'] },
  needsUnit: false, aspect: 0.66, maxH: 500,
  lint: function (s, add) {
    checkFields(s, add, [s.x, s.p, s.label].concat(s.mode === 'ma' ? [s.mean] : []));
    if (s.mode === 'ma' && !s.mean) add('error', 'E_FIELD', 'MA 模式需要 mean 字段（平均表达）');
    var data = asArray(s.data), bad = data.filter(function (r) { var p = num(r[s.p]); return !(p >= 0 && p <= 1); }).length;
    if (bad) add('error', 'E_P', bad + ' 行 P 值不在 0–1 之间');
    if (data.length < 30) add('warning', 'W_SAMPLE', '条目 <30：火山图意义有限，用表格');
    if (!s.pType) add('warning', 'W_PTYPE', '写明 pType:"adjusted"（推荐，如 BH 校正）或 "raw"');
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', ma = s.mode === 'ma', fcCut = s.fcCut != null ? num(s.fcCut) : 1, pCut = s.pCut != null ? num(s.pCut) : 0.05, adj = s.pType !== 'raw';
    var rows = asArray(s.data).filter(function (r) { return isNum(num(r[s.x])) && num(r[s.p]) >= 0 && num(r[s.p]) <= 1 && (!ma || isNum(num(r[s.mean]))); });
    var minP = Math.min.apply(null, rows.map(function (r) { return num(r[s.p]); }).filter(function (p) { return p > 0; }).concat([1])), zeroP = 0;
    var pts = rows.map(function (r) {
      var fc = num(r[s.x]), p = num(r[s.p]); if (p === 0) zeroP++;
      var cls = p < pCut && fc >= fcCut ? 'up' : p < pCut && fc <= -fcCut ? 'down' : 'ns';
      return { fc: fc, p: p, nl: -Math.log10(p > 0 ? p : minP / 10), cls: cls, label: s.label ? String(r[s.label]) : '', mean: ma ? num(r[s.mean]) : null };
    });
    var cnt = { up: 0, down: 0, ns: 0 }; pts.forEach(function (p) { cnt[p.cls]++; });
    var upC = c.pal.div[0], dnC = c.pal.div[c.pal.div.length - 1], nsC = THEME.dim, F, P2, XY;
    var pName = adj ? (en ? 'adjusted P' : '校正 P') : 'P';
    if (!ma) {
      var m = Math.max.apply(null, pts.map(function (p) { return Math.abs(p.fc); }).concat([fcCut * 1.5])) * 1.06, ymax = Math.max.apply(null, pts.map(function (p) { return p.nl; }).concat([-Math.log10(pCut) * 1.3]));
      F = frameXY(c, { x: { kind: 'linear', lo: -m, hi: m }, y: { lo: 0, hi: ymax * 1.04, zero: true, unit: '−log₁₀ ' + pName }, bottom: 16, right: 10 });
      XY = function (p) { return [F.x(p.fc), F.y(p.nl)]; };
    } else {
      var ex = extent(pts.map(function (p) { return p.mean; })), mm = Math.max.apply(null, pts.map(function (p) { return Math.abs(p.fc); }).concat([fcCut * 1.5])) * 1.06;
      F = frameXY(c, { x: { kind: 'linear', lo: s.xLog ? Math.max(ex[0], 1e-9) : ex[0], hi: ex[1], log: !!s.xLog }, y: { lo: -mm, hi: mm, zero: false, unit: 'log₂ ' + (en ? 'fold change' : '倍数变化') }, bottom: 16, right: 10 });
      XY = function (p) { return [F.x(p.mean), F.y(p.fc)]; };
    }
    var under = '', marks = '', labels = '';
    if (!ma) {
      [-fcCut, fcCut].forEach(function (v) { if (fcCut > 0) under += line(F.x(v), F.P.t, F.x(v), F.P.b, { stroke: THEME.axis, dash: '4 3' }); });
      under += line(F.P.l, F.y(-Math.log10(pCut)), F.P.r, F.y(-Math.log10(pCut)), { stroke: THEME.axis, dash: '4 3' });
    } else {
      [-fcCut, fcCut].forEach(function (v) { under += line(F.P.l, F.y(v), F.P.r, F.y(v), { stroke: THEME.axis, dash: '4 3' }); });
      under += line(F.P.l, F.y(0), F.P.r, F.y(0), { stroke: THEME.zero, width: 1 });
    }
    var nsPts = pts.filter(function (p) { return p.cls === 'ns'; }).map(XY);
    marks += dotPath(nsPts, pts.length > 3000 ? 1.4 : 2, nsC, 0.9);
    var sig = pts.filter(function (p) { return p.cls !== 'ns'; }).sort(function (a, b) { return a.nl - b.nl; });
    sig.forEach(function (p) { var q = XY(p); marks += circle(q[0], q[1], 2.8, { fill: p.cls === 'up' ? upC : dnC, fillOpacity: 0.85, cls: 'bz-hit', data: tip(p.label || (en ? 'Feature' : '条目'), [['log₂FC', fmtNum(p.fc, 'number:2', c.lang)], [pName, fmtNum(p.p, { type: 'pvalue', sci: true }, c.lang)]]) }); });
    var hl = asArray(s.highlight).map(String), topN = s.top != null ? num(s.top) : (c.compact ? 6 : 10);
    var chosen = pts.filter(function (p) { return hl.indexOf(p.label) >= 0; });
    sig.slice().sort(function (a, b) { return b.nl - a.nl || Math.abs(b.fc) - Math.abs(a.fc); }).forEach(function (p) { if (chosen.length < topN + hl.length && chosen.indexOf(p) < 0 && p.label) chosen.push(p); });
    var avoid = sig.map(XY).map(function (q) { return { x0: q[0] - 2, x1: q[0] + 2, y0: q[1] - 2, y1: q[1] + 2 }; });
    labels += labelPoints(c, chosen.map(function (p) { var q = XY(p); return { x: q[0], y: q[1], t: p.label, r: 3 }; }), { x0: F.P.l, x1: F.P.r, y0: F.P.t - 2, y1: F.P.b }, [], s.italic !== false);
    hl.forEach(function (h) { var p = pts.filter(function (q) { return q.label === h; })[0]; if (p) { var q = XY(p); labels += circle(q[0], q[1], 4.2, { stroke: THEME.ink, width: 1.4 }); } });
    labels += text(F.P.r, F.H - 2, ma ? withUnit(s.xTitle || labelOf(s, s.mean), s.xUnit, c.lang) + (s.xLog ? (en ? ', log scale' : '，对数刻度') : '') : 'log₂ ' + (en ? 'fold change' : '倍数变化'), { anchor: 'end', size: c.fs, fill: THEME.muted });
    c.addLegend((en ? 'Up ' : '上调 ') + fmtNum(cnt.up, 'integer', c.lang), upC, 'dot');
    c.addLegend((en ? 'Down ' : '下调 ') + fmtNum(cnt.down, 'integer', c.lang), dnC, 'dot');
    c.addLegend((en ? 'Not significant ' : '无显著差异 ') + fmtNum(cnt.ns, 'integer', c.lang), nsC, 'dot');
    c.notesExtra.push((en ? 'n = ' + fmtNum(pts.length, 'integer', 'en') + '; significant: |log₂FC| ≥ ' + fcCut + ' and ' + pName + ' < ' + pCut + ' (dashed lines)' : 'n = ' + fmtNum(pts.length, 'integer', 'zh') + '；显著标准：|log₂FC| ≥ ' + fcCut + ' 且' + pName + ' < ' + pCut + '（虚线）') + (s.pMethod ? (en ? '; ' : '；') + s.pMethod : ''));
    if (zeroP) c.notesExtra.push(en ? zeroP + ' features with P = 0 drawn at one tenth of the smallest non-zero P' : zeroP + ' 个 P = 0 的条目按最小非零 P 的 1/10 绘制');
    var sigSorted = sig.slice().sort(function (a, b) { return a.p - b.p; });
    c.setTable([en ? 'Feature' : '条目', 'log₂FC', pName, en ? 'Direction' : '方向'].concat(ma ? [labelOf(s, s.mean)] : []), sigSorted.map(function (p) { return [p.label, fmtNum(p.fc, 'number:2', c.lang), fmtNum(p.p, { type: 'pvalue', sci: true }, c.lang), p.cls === 'up' ? (en ? 'Up' : '上调') : (en ? 'Down' : '下调')].concat(ma ? [c.fmt(p.mean)] : []); }), sigSorted.map(function (p) { return [p.label, p.fc, p.p, p.cls].concat(ma ? [p.mean] : []); }));
    if (sigSorted.length) c.notesExtra.push(en ? 'Data table lists significant features only' : '数据表只列显著条目');
    c.stats = { n: pts.length, up: cnt.up, down: cnt.down, ns: cnt.ns, fcCut: fcCut, pCut: pCut, top: chosen.map(function (p) { return { label: p.label, log2fc: p.fc, p: p.p }; }) };
    return { svg: F.under + under + F.base + marks + F.axes + labels, height: F.H };
  }
});

/* ── B04 Manhattan plot ─────────────────────────────────────────────── */
function chrRank(ch) {
  var t = String(ch).replace(/^chr/i, '');
  if (/^\d+$/.test(t)) return +t;
  var m = { X: 100, Y: 101, XY: 102, M: 103, MT: 103 };
  return m[t.toUpperCase()] != null ? m[t.toUpperCase()] : 200;
}
register({
  id: 'B04', name: { zh: '曼哈顿图（GWAS）', en: 'Manhattan plot (GWAS)' },
  question: { zh: '全基因组范围内哪些位点与性状显著关联，信号集中在哪些染色体？', en: 'Which loci across the genome are significantly associated with the trait, and on which chromosomes?' },
  use: { zh: '全基因组关联分析、eQTL、全外显子负担检验：按染色体位置排列 −log₁₀ P，全基因组显著与提示性阈值线，自动标注各染色体的领头位点。', en: 'GWAS, eQTL or burden tests: −log₁₀ P by genomic position with genome-wide and suggestive thresholds and lead variants labelled per locus.' },
  avoid: { zh: '少量候选位点（用 C01 或表格）；P 值未经质量控制。', en: 'A handful of candidate variants (use C01 or a table); unfiltered P values.' },
  fields: [
    { key: 'chr', role: 'category', required: true, desc: { zh: '染色体（1–22、X、Y、MT，可带 chr 前缀）', en: 'Chromosome (1–22, X, Y, MT; chr prefix allowed)' } },
    { key: 'pos', role: 'measure', required: true, desc: { zh: '位置（bp）', en: 'Position (bp)' } },
    { key: 'p', role: 'measure', required: true, desc: { zh: 'P 值', en: 'P value' } },
    { key: 'label', role: 'category', required: false, desc: { zh: '位点 ID 或基因名（领头位点标注用）', en: 'Variant ID or gene (for lead labels)' } }
  ],
  options: ['threshold（默认 5e-8）', 'suggestive（默认 1e-5；false 关闭）', 'window（领头位点合并窗口 bp，默认 1,000,000）', 'build（参考基因组版本，写入注释）'],
  keywords: { zh: ['曼哈顿图', 'GWAS', '全基因组关联', 'SNP', '显著位点', '染色体', 'eQTL', '遗传关联'], en: ['manhattan plot', 'gwas', 'genome-wide association', 'snp', 'loci', 'chromosome', 'eqtl'] },
  needsUnit: false, aspect: 0.42, minH: 260,
  lint: function (s, add) {
    checkFields(s, add, [s.chr, s.pos, s.p, s.label]);
    var data = asArray(s.data), bad = data.filter(function (r) { var p = num(r[s.p]); return !(p > 0 && p <= 1); }).length;
    if (bad) add('error', 'E_P', bad + ' 行 P 值不在 (0, 1] 之间');
    if (data.length > 50000) add('warning', 'W_ITEMS', '超过 5 万个点：先剔除 P > 0.01 的位点并在注释说明');
    if (!s.build) add('warning', 'W_BUILD', '写明参考基因组版本 build（如 GRCh38）');
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', thr = s.threshold != null ? num(s.threshold) : 5e-8, sug = s.suggestive === false ? null : (s.suggestive != null ? num(s.suggestive) : 1e-5), win = num(s.window) || 1e6;
    var rows = asArray(s.data).filter(function (r) { return num(r[s.p]) > 0 && isNum(num(r[s.pos])) && r[s.chr] != null; });
    var chrs = uniq(rows.map(function (r) { return String(r[s.chr]).replace(/^chr/i, ''); })).sort(function (a, b) { return chrRank(a) - chrRank(b) || (a < b ? -1 : 1); });
    var len = {}; rows.forEach(function (r) { var ch = String(r[s.chr]).replace(/^chr/i, ''); len[ch] = Math.max(len[ch] || 0, num(r[s.pos])); });
    var total = sum(chrs, function (ch) { return len[ch]; }), gap = total * 0.006, off = {}, acc = 0;
    chrs.forEach(function (ch) { off[ch] = acc; acc += len[ch] + gap; });
    var pts = rows.map(function (r) { var ch = String(r[s.chr]).replace(/^chr/i, ''); return { ch: ch, ci: chrs.indexOf(ch), pos: num(r[s.pos]), g: off[ch] + num(r[s.pos]), p: num(r[s.p]), nl: -Math.log10(num(r[s.p])), label: s.label ? String(r[s.label]) : ch + ':' + fmtNum(num(r[s.pos]), 'integer', c.lang) }; });
    var ymax = Math.max.apply(null, pts.map(function (p) { return p.nl; }).concat([-Math.log10(thr) + 1]));
    var F = frameXY(c, { x: { kind: 'linear', lo: 0, hi: acc - gap, hide: true }, y: { lo: 0, hi: ymax * 1.06, zero: true, unit: '−log₁₀ P' }, bottom: 16, right: 10 });
    var X = function (g) { return F.P.l + (g / (acc - gap)) * F.P.w; }, under = '', marks = '', labels = '';
    var cols = [THEME.primary, '#7FA3CC'], a = [], b = [];
    pts.forEach(function (p) { if (p.p >= thr) (p.ci % 2 ? b : a).push([X(p.g), F.y(p.nl)]); });
    var R = pts.length > 20000 ? 1.2 : pts.length > 5000 ? 1.6 : 2.1;
    marks += dotPath(a, R, cols[0]) + dotPath(b, R, cols[1]);
    var hits = pts.filter(function (p) { return p.p < thr; }).sort(function (p, q) { return p.p - q.p; });
    hits.forEach(function (p) { marks += circle(X(p.g), F.y(p.nl), 3, { fill: THEME.series[1], stroke: '#FFFFFF', width: 0.6, cls: 'bz-hit', data: tip(p.label, [[en ? 'Chromosome' : '染色体', p.ch], [en ? 'Position' : '位置', fmtNum(p.pos, 'integer', c.lang)], ['P', fmtNum(p.p, { type: 'pvalue', sci: true }, c.lang)]]) }); });
    var ty = F.y(-Math.log10(thr));
    under += line(F.P.l, ty, F.P.r, ty, { stroke: THEME.bad, dash: '5 3', width: 1.2 });
    labels += text(F.P.r - 2, ty - 4, fmtSci(thr, 1), { anchor: 'end', size: 11, fill: THEME.bad, halo: true });
    if (sug) { var sy = F.y(-Math.log10(sug)); under += line(F.P.l, sy, F.P.r, sy, { stroke: THEME.axis, dash: '3 3' }); labels += text(F.P.r - 2, sy - 4, fmtSci(sug, 1), { anchor: 'end', size: 11, fill: THEME.muted, halo: true }); }
    var lastR = -1e9;
    chrs.forEach(function (ch, i) {
      var cx = X(off[ch] + len[ch] / 2), w = textW(ch, 11);
      if (cx - w / 2 < lastR + 3) return;
      lastR = cx + w / 2;
      labels += text(cx, F.P.b + 16, ch, { anchor: 'middle', size: 11, fill: THEME.ink2 });
    });
    var leads = [];
    hits.forEach(function (p) { if (!leads.some(function (q) { return q.ch === p.ch && Math.abs(q.pos - p.pos) < win; })) leads.push(p); });
    labels += labelPoints(c, leads.slice(0, c.compact ? 4 : 8).map(function (p) { return { x: X(p.g), y: F.y(p.nl), t: p.label, r: 3 }; }), { x0: F.P.l, x1: F.P.r, y0: F.P.t - 4, y1: F.P.b }, [], false);
    labels += text(F.P.r, F.H - 2, en ? 'Chromosome' : '染色体', { anchor: 'end', size: c.fs, fill: THEME.muted });
    c.notesExtra.push((en ? 'n = ' + fmtNum(pts.length, 'integer', 'en') + ' variants; red line = genome-wide significance P < ' : 'n = ' + fmtNum(pts.length, 'integer', 'zh') + ' 个位点；红线为全基因组显著性阈值 P < ') + fmtSci(thr, 1) + (sug ? (en ? ', grey line = suggestive P < ' : '，灰线为提示性阈值 P < ') + fmtSci(sug, 1) : '') + (s.build ? (en ? '; positions on ' : '；坐标基于 ') + s.build : ''));
    if (leads.length) c.notesExtra.push((en ? leads.length + ' independent loci (lead variants ≥ ' : leads.length + ' 个独立位点（领头位点间隔 ≥ ') + fmtNum(win / 1e6, 'number:1', c.lang) + (en ? ' Mb apart)' : ' Mb）'));
    c.setTable([en ? 'Variant' : '位点', en ? 'Chromosome' : '染色体', en ? 'Position' : '位置', 'P'], hits.map(function (p) { return [p.label, p.ch, fmtNum(p.pos, 'integer', c.lang), fmtNum(p.p, { type: 'pvalue', sci: true }, c.lang)]; }), hits.map(function (p) { return [p.label, p.ch, p.pos, p.p]; }));
    c.stats = { n: pts.length, significant: hits.length, threshold: thr, leads: leads.map(function (p) { return { label: p.label, chr: p.ch, pos: p.pos, p: p.p }; }) };
    return { svg: F.under + under + F.base + marks + F.axes + labels, height: F.H };
  }
});

/* ── B05 Clustered heatmap ──────────────────────────────────────────── */
function dendro(root, posOf, hScale, vertical) {
  var out = '';
  (function walk(nd) {
    if (nd.leaf != null) { nd.p = posOf(nd.leaf); return; }
    walk(nd.left); walk(nd.right);
    nd.p = (nd.left.p + nd.right.p) / 2;
    var h = hScale(nd.h), hl = hScale(nd.left.h), hr = hScale(nd.right.h);
    out += vertical ? 'M' + r2(nd.left.p) + ' ' + r2(hl) + 'V' + r2(h) + 'H' + r2(nd.right.p) + 'V' + r2(hr)
      : 'M' + r2(hl) + ' ' + r2(nd.left.p) + 'H' + r2(h) + 'V' + r2(nd.right.p) + 'H' + r2(hr);
  })(root);
  return path(out, { stroke: THEME.ink2, width: 1 });
}
register({
  id: 'B05', name: { zh: '聚类热图', en: 'Clustered heatmap' },
  question: { zh: '样本和基因按表达谱如何聚类，哪些基因在哪组样本中高表达？', en: 'How do samples and genes cluster by expression profile, and which genes are high in which samples?' },
  use: { zh: '表达矩阵（基因 × 样本）：按行 z 分数标准化，行列层次聚类并画树状图，顶部标注样本分组；也适用于蛋白、代谢物、患者特征矩阵。', en: 'Expression matrices (genes × samples): row z-scores, hierarchical clustering of rows and columns with dendrograms and sample annotation; also proteins, metabolites, patient features.' },
  avoid: { zh: '行数 >300（先按方差筛选）；行列有固定顺序且不需聚类（用 H01）。', en: 'More than 300 rows (filter by variance first); fixed orders without clustering (use H01).' },
  fields: [
    { key: 'row', role: 'category', required: true, desc: { zh: '行（基因）字段', en: 'Row (gene) field' } },
    { key: 'x', role: 'category', required: true, desc: { zh: '列（样本）字段', en: 'Column (sample) field' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '数值（表达量，建议已 log 转换）', en: 'Value (expression, preferably log-transformed)' } },
    { key: 'colGroup', role: 'category', required: false, desc: { zh: '样本分组字段（顶部注释色条）', en: 'Sample group field (annotation bar)' } }
  ],
  options: ['scale:"row"|"none"', 'cluster:"both"|"rows"|"cols"|"none"', 'distance:"euclidean"|"correlation"', 'linkage:"average"|"complete"', 'clip（z 分数色阶截断，默认 2）'],
  keywords: { zh: ['聚类热图', '表达热图', '层次聚类', '树状图', '基因表达', 'z分数', '转录组热图', '样本聚类'], en: ['clustered heatmap', 'expression heatmap', 'hierarchical clustering', 'dendrogram', 'gene expression', 'z-score'] },
  needsUnit: false,
  lint: function (s, add) {
    checkFields(s, add, [s.row, s.x, s.y, s.colGroup]);
    var data = asArray(s.data), nr = uniq(data.map(function (r) { return String(r[s.row]); })).length, nc = uniq(data.map(function (r) { return String(r[s.x]); })).length;
    if (nr > 300) add('error', 'E_ITEMS', nr + ' 行：聚类热图最多 300 行，先按方差或差异筛选');
    else if (nr > 150) add('warning', 'W_ITEMS', nr + ' 行：行标签将省略');
    if (nc < 2 || nr < 2) add('error', 'E_DATA', '至少需要 2 行 × 2 列');
    if (s.scale === 'none' && !s.unit) add('error', 'E_UNIT', '未标准化（scale:"none"）时需写明数值单位 unit');
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', data = asArray(s.data), z = s.scale !== 'none', clip = num(s.clip) || 2;
    var rows = uniq(data.map(function (r) { return String(r[s.row]); })), cols = uniq(data.map(function (r) { return String(r[s.x]); }));
    var grp = {}; if (s.colGroup) data.forEach(function (r) { if (r[s.colGroup] != null) grp[String(r[s.x])] = String(r[s.colGroup]); });
    var M = rows.map(function () { return cols.map(function () { return null; }); }), ri = {}, ci = {};
    rows.forEach(function (r, i) { ri[r] = i; }); cols.forEach(function (k, j) { ci[k] = j; });
    data.forEach(function (r) { var v = num(r[s.y]); if (isNum(v)) M[ri[String(r[s.row])]][ci[String(r[s.x])]] = v; });
    var Z = M.map(function (row) { if (!z) return row.slice(); var st = describe(row); return row.map(function (v) { return v == null ? null : (st && st.sd > 0 ? (v - st.mean) / st.sd : 0); }); });
    var cl = s.cluster || 'both', metric = s.distance === 'correlation' ? 'correlation' : 'euclidean', link = s.linkage === 'complete' ? 'complete' : s.linkage === 'single' ? 'single' : 'average';
    var hr = (cl === 'both' || cl === 'rows') && rows.length > 2 ? hclust(Z, metric, link) : null;
    var hc = (cl === 'both' || cl === 'cols') && cols.length > 2 ? hclust(cols.map(function (_, j) { return Z.map(function (row) { return row[j]; }); }), metric, link) : null;
    var rOrd = hr ? hr.order : rows.map(function (_, i) { return i; }), cOrd = hc ? hc.order : cols.map(function (_, j) { return j; });
    var fs = c.fs, dW = hr ? clamp(c.W * 0.09, 24, 60) : 0, dH = hc ? clamp(c.W * 0.06, 22, 44) : 0, annH = s.colGroup ? 10 : 0;
    var rowLabW = rows.length <= 150 ? Math.min(c.W * 0.24, Math.max.apply(null, rows.map(function (r) { return textW(r, 11, 400); })) + 8) : 0;
    var cw = (c.W - dW - rowLabW - 4) / cols.length, ch = clamp(Math.min(c.W * 0.68, 520) / rows.length, 5, 18);
    var showRowLab = rowLabW > 0 && ch >= 10, rlFs = ch >= 13 ? fs : 11;
    if (!showRowLab) { rowLabW = 0; cw = (c.W - dW - 4) / cols.length; }
    var colLabMax = Math.max.apply(null, cols.map(function (k) { return textW(k, 11); })), rotate = colLabMax > cw - 4, colLabH = rotate ? Math.min(110, colLabMax) + 10 : 18;
    var x0 = dW + 2, y0 = 4 + dH + (annH ? annH + 4 : 0) + 2, y1 = y0 + rows.length * ch, H = y1 + colLabH + 44, out = '';
    var gnames = uniq(cOrd.map(function (j) { return grp[cols[j]]; }).filter(function (v) { return v != null; }));
    if (hc) out += dendro(hc.root, function (j) { return x0 + cw * (cOrd.indexOf(j) + 0.5); }, function (h) { return 4 + dH - (hc.root.h ? h / hc.root.h : 0) * (dH - 2); }, true);
    if (hr) out += dendro(hr.root, function (i) { return y0 + ch * (rOrd.indexOf(i) + 0.5); }, function (h) { return dW - (hr.root.h ? h / hr.root.h : 0) * (dW - 2); }, false);
    if (annH) cOrd.forEach(function (j, k) { var gname = grp[cols[j]]; if (gname != null) out += rect(x0 + cw * k, 4 + dH + 2, cw, annH, { fill: c.color(gname, gnames.indexOf(gname)), title: cols[j] + ' · ' + gname }); });
    var e0 = extent([].concat.apply([], Z));
    rOrd.forEach(function (i, a) {
      cOrd.forEach(function (j, b) {
        var v = Z[i][j], fill = v == null ? '#FFFFFF' : z ? sciDiv(c, 0.5 + clamp(v, -clip, clip) / clip / 2) : rampAt(c.pal.seq, e0[1] > e0[0] ? (v - e0[0]) / (e0[1] - e0[0]) : 0.5);
        out += rect(x0 + cw * b, y0 + ch * a, cw + 0.3, ch + 0.3, { fill: fill, cls: 'bz-hit', data: tip(rows[i] + ' · ' + cols[j], [[labelOf(s, s.y), M[i][j] == null ? '—' : c.fmt(M[i][j])]].concat(z ? [[en ? 'Row z-score' : '行 z 分数', v == null ? '—' : fmtNum(v, 'number:2', c.lang)]] : [])) });
      });
      if (showRowLab) out += text(x0 + cw * cols.length + 4, y0 + ch * (a + 0.5), truncate(rows[i], rowLabW - 6, rlFs), { baseline: 'middle', size: rlFs, fill: THEME.ink, italic: s.italic !== false });
    });
    cOrd.forEach(function (j, b) {
      var cx = x0 + cw * (b + 0.5);
      out += rotate ? text(cx, y1 + 4, truncate(cols[j], 106, 11), { anchor: 'end', baseline: 'middle', size: 11, fill: THEME.ink2, transform: 'rotate(-90 ' + r2(cx) + ' ' + r2(y1 + 4) + ')' }) : text(cx, y1 + 15, cols[j], { anchor: 'middle', size: 11, fill: THEME.ink2 });
    });
    var ly = H - 32;
    if (z) out += sciLegend(c, x0, ly, Math.min(240, c.W - x0 - 10), -clip, 0, clip, function (v) { return (v > 0 ? '+' : '') + fmtNum(v, 'number:0', c.lang); }, en ? 'Row z-score' : '行 z 分数');
    else out += rampLegend(c, x0, ly, Math.min(220, c.W - x0 - 10), e0, null, function (v) { return c.fmt(v); });
    gnames.forEach(function (gname) { c.addLegend(gname, c.color(gname, gnames.indexOf(gname)), 'bar'); });
    var topSplit = null;
    if (hc) { var leaves = function (nd) { return nd.leaf != null ? [cols[nd.leaf]] : leaves(nd.left).concat(leaves(nd.right)); }; topSplit = [leaves(hc.root.left), leaves(hc.root.right)]; }
    c.notesExtra.push((z ? (en ? 'Colour = row z-score (each row centred and scaled across samples; colour clipped at ±' + clip + ')' : '颜色为行 z 分数（每行在样本间中心化并除以标准差；色阶截断于 ±' + clip + '）') : (en ? 'Colour = value' : '颜色为原始数值') + (s.unit ? ' (' + s.unit + ')' : '')) +
      (hr || hc ? (en ? '; hierarchical clustering of ' + (hr && hc ? 'rows and columns' : hr ? 'rows' : 'columns') + ', ' + link + ' linkage, ' + (metric === 'correlation' ? '1 − Pearson r' : 'Euclidean') + ' distance' : '；' + (hr && hc ? '行与列' : hr ? '行' : '列') + '层次聚类：' + { average: '平均', complete: '完全', single: '单' }[link] + '连接，' + (metric === 'correlation' ? '1 − Pearson r' : '欧氏') + '距离') : ''));
    if (!showRowLab) c.notesExtra.push(en ? rows.length + ' rows; row labels omitted' : '共 ' + rows.length + ' 行，行标签省略');
    c.setTable([en ? 'Row' : '行'].concat(cOrd.map(function (j) { return cols[j]; })), rOrd.map(function (i) { return [rows[i]].concat(cOrd.map(function (j) { return M[i][j] == null ? '—' : c.fmt(M[i][j]); })); }), rOrd.map(function (i) { return [rows[i]].concat(cOrd.map(function (j) { return M[i][j]; })); }));
    c.stats = { rows: rows.length, cols: cols.length, rowOrder: rOrd.map(function (i) { return rows[i]; }), colOrder: cOrd.map(function (j) { return cols[j]; }), topSplit: topSplit };
    return { svg: out, height: H };
  }
});

/* ── B06 Embedding (PCA / UMAP / t-SNE) ─────────────────────────────── */
function ellipse95(xs, ys) {
  var n = xs.length;
  if (n < 3) return null;
  var mx = sum(xs) / n, my = sum(ys) / n, a = 0, b = 0, d = 0;
  for (var i = 0; i < n; i++) { a += (xs[i] - mx) * (xs[i] - mx); b += (xs[i] - mx) * (ys[i] - my); d += (ys[i] - my) * (ys[i] - my); }
  a /= n - 1; b /= n - 1; d /= n - 1;
  var tr = a + d, det = a * d - b * b, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det)), l1 = tr / 2 + disc, l2 = Math.max(0, tr / 2 - disc);
  var th = b !== 0 ? Math.atan2(l1 - a, b) : (a >= d ? 0 : Math.PI / 2), k = 5.991464547, r1 = Math.sqrt(l1 * k), r2v = Math.sqrt(l2 * k), pts = [];
  for (var t = 0; t <= 72; t++) { var f = 2 * Math.PI * t / 72, ex = r1 * Math.cos(f), ey = r2v * Math.sin(f); pts.push([mx + ex * Math.cos(th) - ey * Math.sin(th), my + ex * Math.sin(th) + ey * Math.cos(th)]); }
  return pts;
}
register({
  id: 'B06', name: { zh: '降维图（PCA / UMAP / t-SNE）', en: 'Embedding (PCA / UMAP / t-SNE)' },
  question: { zh: '样本或细胞按整体特征如何分群，处理组与对照组是否分开？', en: 'How do samples or cells group by overall profile, and do treatment and control separate?' },
  use: { zh: '转录组样本 PCA（轴上写解释方差，可加 95% 置信椭圆）、单细胞 UMAP / t-SNE（无坐标刻度，簇标签直接标在簇上）。坐标由分析软件计算后传入。', en: 'Sample PCA with explained variance on the axes and optional 95% ellipses; single-cell UMAP/t-SNE without tick values and labels on clusters. Coordinates come from the analysis software.' },
  avoid: { zh: '用 UMAP 簇间距离或簇大小下结论；只有两个原始变量（用 R01）。', en: 'Reading distances or sizes between UMAP clusters; two raw variables (use R01).' },
  fields: [
    { key: 'x / y', role: 'measure', required: true, desc: { zh: '第 1、2 维坐标字段', en: 'Dimension 1 and 2 fields' } },
    { key: 'group', role: 'category', required: false, desc: { zh: '分组或细胞类型', en: 'Group or cell type' } },
    { key: 'label', role: 'category', required: false, desc: { zh: '样本名（少量样本时可标注）', en: 'Sample name (for small n)' } }
  ],
  options: ['method:"pca"|"umap"|"tsne"|"other"', 'variance:[PC1%, PC2%]（PCA 必填）', 'ellipse', 'labelGroups', 'axisNames', 'highlight'],
  keywords: { zh: ['PCA', '主成分分析', 'UMAP', 't-SNE', '降维', '单细胞', '细胞分群', '样本聚类', '主成分'], en: ['pca', 'principal component', 'umap', 'tsne', 'dimensionality reduction', 'single cell', 'clusters', 'embedding'] },
  needsUnit: false, aspect: 0.7, maxH: 520,
  lint: function (s, add) {
    checkFields(s, add, [s.x, s.y, s.group, s.label]);
    if (!s.method) add('error', 'E_METHOD', '写明降维方法 method（pca / umap / tsne / other）');
    if (s.method === 'pca' && asArray(s.variance).length !== 2) add('error', 'E_VARIANCE', 'PCA 需给出两个主成分的解释方差 variance:[PC1%, PC2%]');
    var gn = s.group ? uniq(asArray(s.data).map(function (r) { return r[s.group]; })).length : 0;
    if (gn > 12) add('warning', 'W_SERIES', gn + ' 组：颜色难以区分，合并小类或高亮');
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', method = String(s.method || 'other').toLowerCase(), pca = method === 'pca', free = method === 'umap' || method === 'tsne';
    var rows = asArray(s.data).filter(function (r) { return isNum(num(r[s.x])) && isNum(num(r[s.y])); });
    var gnames = s.group ? uniq(rows.map(function (r) { return String(r[s.group]); })) : [''];
    var groups = gnames.map(function (g, i) { var rr = rows.filter(function (r) { return !s.group || String(r[s.group]) === g; }); return { name: g, rows: rr, xs: rr.map(function (r) { return num(r[s.x]); }), ys: rr.map(function (r) { return num(r[s.y]); }), color: c.isDim(g) ? THEME.dim : c.color(g || 'all', i), dim: c.isDim(g) }; });
    groups.forEach(function (g) { g.ell = s.ellipse ? ellipse95(g.xs, g.ys) : null; });
    var allX = [].concat.apply([], groups.map(function (g) { return g.xs.concat(g.ell ? g.ell.map(function (p) { return p[0]; }) : []); })), allY = [].concat.apply([], groups.map(function (g) { return g.ys.concat(g.ell ? g.ell.map(function (p) { return p[1]; }) : []); }));
    var ex = extent(allX), ey = extent(allY), px = (ex[1] - ex[0]) * 0.05 || 1, py = (ey[1] - ey[0]) * 0.05 || 1;
    var names = asArray(s.axisNames).length === 2 ? asArray(s.axisNames).map(String) : pca ? ['PC1', 'PC2'] : method === 'umap' ? ['UMAP 1', 'UMAP 2'] : method === 'tsne' ? ['t-SNE 1', 't-SNE 2'] : [labelOf(s, s.x), labelOf(s, s.y)];
    var vr = asArray(s.variance).map(num);
    if (pca && vr.length === 2) names = [names[0] + (en ? ' (' : '（') + fmtNum(vr[0], 'percent:1', c.lang) + (en ? ')' : '）'), names[1] + (en ? ' (' : '（') + fmtNum(vr[1], 'percent:1', c.lang) + (en ? ')' : '）')];
    var H = c.height(), F, X, Y, out = '', marks = '', labels = '';
    if (free) {
      var P = { l: 10, r: c.W - 10, t: 8, b: H - 30 };
      X = scaleLinear(ex[0] - px, ex[1] + px, P.l, P.r); Y = scaleLinear(ey[0] - py, ey[1] + py, P.b, P.t);
      var ax = P.l, ay = P.b + 14;
      out += path('M' + ax + ' ' + ay + 'h42m-5 -3l5 3l-5 3', { stroke: THEME.ink2, width: 1.2 }) + path('M' + ax + ' ' + ay + 'v-42m-3 5l3 -5l3 5', { stroke: THEME.ink2, width: 1.2 });
      labels += text(ax + 48, ay, names[0], { baseline: 'middle', size: 11, fill: THEME.ink2 }) + text(ax + 6, ay - 40, names[1], { baseline: 'middle', size: 11, fill: THEME.ink2 });
      F = { P: { l: P.l, r: P.r, t: P.t, b: P.b, w: P.r - P.l, h: P.b - P.t }, H: H, under: '', base: '', axes: '' };
    } else {
      F = frameXY(c, { height: H, x: { kind: 'linear', lo: ex[0] - px, hi: ex[1] + px }, y: { lo: ey[0] - py, hi: ey[1] + py, zero: false, unit: names[1] }, bottom: 16, right: 10 });
      X = F.x; Y = F.y;
      if (pca) { if (F.yd.min < 0 && F.yd.max > 0) out += line(F.P.l, Y(0), F.P.r, Y(0), { stroke: THEME.axis, dash: '3 3' }); if (X.nice.min < 0 && X.nice.max > 0) out += line(X(0), F.P.t, X(0), F.P.b, { stroke: THEME.axis, dash: '3 3' }); }
      labels += text(F.P.r, F.H - 2, names[0], { anchor: 'end', size: c.fs, fill: THEME.muted });
    }
    var n = rows.length, R = n > 3000 ? 1.2 : n > 800 ? 1.8 : n > 150 ? 2.6 : 4;
    groups.forEach(function (g) { if (g.ell) out += path(polyline(g.ell.map(function (p) { return [X(p[0]), Y(p[1])]; })) + 'Z', { fill: g.color, fillOpacity: 0.08, stroke: g.color, width: 1.2, dash: '4 3' }); });
    var order = groups.slice().sort(function (a, b) { return (a.dim ? 0 : 1) - (b.dim ? 0 : 1); });
    order.forEach(function (g) {
      if (n > 300) marks += dotPath(g.xs.map(function (v, k) { return [X(v), Y(g.ys[k])]; }), R, g.color, 0.75);
      else g.rows.forEach(function (r, k) { marks += circle(X(g.xs[k]), Y(g.ys[k]), R, { fill: g.color, fillOpacity: 0.85, stroke: '#FFFFFF', width: 0.8, cls: 'bz-hit', data: tip(s.label ? String(r[s.label]) : (g.name || (en ? 'Sample' : '样本')), [[names[0], c.fmt(g.xs[k])], [names[1], c.fmt(g.ys[k])]].concat(s.group ? [[c.t('category'), g.name]] : [])) }); });
    });
    var labelG = s.group && (s.labelGroups != null ? !!s.labelGroups : gnames.length <= 10 && free);
    if (labelG) {
      var cands = groups.map(function (g) { var mxv = median(sortNum(g.xs)), myv = median(sortNum(g.ys)); return { x: X(mxv), y: Y(myv), t: g.name, g: g }; });
      placeBoxes(cands.map(function (cd) { var w = textW(cd.t, c.fs, 700); cd.options = [0, -16, 16, -30, 30].map(function (dy) { return { x0: cd.x - w / 2, x1: cd.x + w / 2, y0: cd.y + dy - 8, y1: cd.y + dy + 8, ty: cd.y + dy }; }); return cd; }), { x0: F.P.l, x1: F.P.r, y0: F.P.t, y1: F.P.b }).forEach(function (cd) {
        labels += text(cd.x, cd.chosen.ty, cd.t, { anchor: 'middle', baseline: 'middle', size: c.fs, weight: 700, fill: mix(cd.g.color, '#000000', 0.25), halo: true });
      });
    } else if (s.group) groups.forEach(function (g) { c.addLegend(g.name + ' (n = ' + g.rows.length + ')', g.color, 'dot'); });
    if (s.label && n <= 40 && !labelG) labels += labelPoints(c, rows.map(function (r) { return { x: X(num(r[s.x])), y: Y(num(r[s.y])), t: String(r[s.label]), r: R }; }).slice(0, 24), { x0: F.P.l, x1: F.P.r, y0: F.P.t, y1: F.P.b }, [], false).replace(/ font-weight="600"/g, '');
    c.notesExtra.push(pca ? (en ? 'Principal component analysis; axis brackets show variance explained; n = ' + n : '主成分分析；轴名括号内为该主成分解释的方差比例；n = ' + n)
      : free ? (en ? method.toUpperCase() + ' embedding; coordinates have no units and distances between clusters or cluster sizes should not be interpreted; n = ' + fmtNum(n, 'integer', 'en') : (method === 'umap' ? 'UMAP' : 't-SNE') + ' 降维；坐标无单位，簇间距离与簇大小不宜解读；n = ' + fmtNum(n, 'integer', 'zh'))
      : (en ? 'n = ' + n : 'n = ' + n));
    if (s.ellipse) c.notesExtra.push(en ? 'Ellipses = 95% normal confidence ellipses per group (n ≥ 3)' : '椭圆为各组 95% 置信椭圆（正态近似，n ≥ 3）');
    if (labelG) c.notesExtra.push(en ? 'Group labels sit at group medians' : '组名标在各组中位位置');
    c.setTable((s.label ? [c.t('item')] : []).concat(s.group ? [c.t('category')] : [], names), rows.slice(0, 2000).map(function (r) { return (s.label ? [String(r[s.label])] : []).concat(s.group ? [String(r[s.group])] : [], [c.fmt(num(r[s.x])), c.fmt(num(r[s.y]))]); }), rows.map(function (r) { return (s.label ? [r[s.label]] : []).concat(s.group ? [r[s.group]] : [], [num(r[s.x]), num(r[s.y])]); }));
    c.stats = { method: method, n: n, groups: groups.map(function (g) { return { name: g.name, n: g.rows.length, medianX: median(sortNum(g.xs)), medianY: median(sortNum(g.ys)) }; }) };
    return { svg: F.under + out + F.base + marks + F.axes + labels, height: F.H || H };
  }
});

/* ── B07 Phylogenetic tree / dendrogram ─────────────────────────────── */
register({
  id: 'B07', name: { zh: '系统发育树 / 聚类树', en: 'Phylogenetic tree / dendrogram' },
  question: { zh: '各物种、菌株或样本的亲缘关系如何，哪些聚为一支，支持度多高？', en: 'How are species, strains or samples related, which form clades, and how well supported are they?' },
  use: { zh: '由 Newick 字符串绘制矩形系统发育树：有枝长时按进化距离（附比例尺），节点显示自展支持率，叶片可按分组着色、可高亮一个分支；也可画样本聚类树。', en: 'Rectangular trees from a Newick string: branch lengths with a scale bar, bootstrap support at nodes, tips coloured by group, one clade highlighted; also sample dendrograms.' },
  avoid: { zh: '叶片 >150 个（拆分或折叠分支）；需要无根树的径向布局。', en: 'More than 150 tips (split or collapse); unrooted radial layouts.' },
  fields: [
    { key: 'newick', role: 'tree', required: true, desc: { zh: 'Newick 字符串（内部节点标签为数字时视为支持率）', en: 'Newick string (numeric internal labels = support)' } }
  ],
  options: ['groups:{叶片: 分组}', 'clade:[叶片…]（阴影标出这些叶片最近共同祖先所在的分支）', 'supportMin（默认 70）', 'italic（物种名斜体）', 'unit（枝长单位，如“替换/位点”）', 'branchLengths:false（等深度聚类树）'],
  keywords: { zh: ['系统发育树', '进化树', '系统树', 'Newick', '自展值', '亲缘关系', '菌株', '聚类树', '分支'], en: ['phylogenetic tree', 'phylogeny', 'newick', 'bootstrap', 'clade', 'strains', 'dendrogram', 'evolution'] },
  needsUnit: false, dataKind: 'custom',
  lint: function (s, add) {
    var root;
    try { root = parseNewick(s.newick); } catch (e) { add('error', 'E_NEWICK', 'Newick 解析失败：' + e.message); return; }
    var tips = [], neg = false, lens = true;
    (function walk(nd, isRoot) { if (!isRoot && nd.len == null) lens = false; if (nd.len < 0) neg = true; if (!nd.children.length) tips.push(nd.name); nd.children.forEach(function (ch) { walk(ch, false); }); })(root, true);
    if (tips.length < 3) add('error', 'E_TREE', '至少需要 3 个叶片');
    if (tips.length > 150) add('warning', 'W_ITEMS', tips.length + ' 个叶片：图很高，拆分或折叠');
    if (neg) add('error', 'E_TREE', '枝长不能为负');
    if (lens && s.branchLengths !== false && !s.unit) add('error', 'E_UNIT', '有枝长时写明单位 unit（如“替换/位点”）');
    asArray(s.clade).forEach(function (h) { if (tips.indexOf(String(h)) < 0) add('error', 'E_TIP', 'clade 中的叶片不存在：' + h); });
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', root = parseNewick(s.newick), tips = [], hasLen = true;
    (function mark(nd, isRoot) { if (!isRoot && nd.len == null) hasLen = false; nd.children.forEach(function (ch) { mark(ch, false); }); if (!nd.children.length) tips.push(nd); })(root, true);
    var phylo = hasLen && s.branchLengths !== false;
    (function ht(nd) { nd.hgt = nd.children.length ? 1 + Math.max.apply(null, nd.children.map(ht)) : 0; return nd.hgt; })(root);
    (function dep(nd, d) { nd.d = d; nd.children.forEach(function (ch) { dep(ch, phylo ? d + (ch.len || 0) : root.hgt - ch.hgt); }); })(root, 0);
    var maxD = Math.max.apply(null, tips.map(function (t) { return t.d; })) || 1, groups = s.groups || {}, gnames = uniq(tips.map(function (t) { return groups[t.name]; }).filter(function (v) { return v != null; }));
    var fs = c.fs, rowH = tips.length > 60 ? 15 : 19, labW = Math.min(c.W * 0.42, Math.max.apply(null, tips.map(function (t) { return textW(t.name, fs, 400); })) + 14), top = 8;
    var X = function (d) { return 10 + d / maxD * (c.W - labW - 22); }, H = top + tips.length * rowH + (phylo ? 40 : 14), out = '', marks = '', labels = '';
    tips.forEach(function (t, i) { t.y = top + (i + 0.5) * rowH; });
    (function pos(nd) { if (!nd.children.length) return nd.y; var ys = nd.children.map(pos); nd.y = (ys[0] + ys[ys.length - 1]) / 2; return nd.y; })(root);
    var hl = asArray(s.clade).map(String);
    if (hl.length) {
      var mrca = null;
      (function find(nd) { var under = []; (function col(n2) { if (!n2.children.length) under.push(n2.name); n2.children.forEach(col); })(nd); if (hl.every(function (h) { return under.indexOf(h) >= 0; })) { mrca = nd; nd.children.forEach(find); } })(root);
      if (mrca) { var lv = []; (function col2(n2) { if (!n2.children.length) lv.push(n2); n2.children.forEach(col2); })(mrca); var yA = Math.min.apply(null, lv.map(function (t) { return t.y; })) - rowH / 2, yB = Math.max.apply(null, lv.map(function (t) { return t.y; })) + rowH / 2; out += rect(X(mrca.d) - 6, yA, c.W - X(mrca.d) + 6, yB - yA, { fill: mix(THEME.series[1], '#FFFFFF', 0.84) }); }
    }
    var supMin = s.supportMin != null ? num(s.supportMin) : 70, d = '';
    (function draw(nd, isRoot) {
      if (!nd.children.length) return;
      var x = X(nd.d), ys = nd.children.map(function (ch) { return ch.y; });
      d += 'M' + r2(x) + ' ' + r2(Math.min.apply(null, ys)) + 'V' + r2(Math.max.apply(null, ys));
      nd.children.forEach(function (ch) { d += 'M' + r2(x) + ' ' + r2(ch.y) + 'H' + r2(X(ch.d)); draw(ch, false); });
      var sp = num(nd.name);
      if (!isRoot && isNum(sp) && sp >= supMin) labels += text(x - 3, nd.y - 4, String(nd.name), { anchor: 'end', size: 11, fill: THEME.muted, halo: true });
    })(root, true);
    marks += path('M' + r2(X(0) - 8) + ' ' + r2(root.y) + 'H' + r2(X(0)) + d, { stroke: THEME.ink, width: 1.3 });
    tips.forEach(function (t) {
      var g = groups[t.name], col = g != null ? c.color(g, gnames.indexOf(g)) : THEME.ink;
      if (phylo || g != null) marks += circle(X(t.d), t.y, 3, { fill: col });
      if (!phylo && t.d < maxD) marks += line(X(t.d), t.y, X(maxD), t.y, { stroke: THEME.grid, dash: '2 2' });
      labels += text((phylo ? X(t.d) : X(maxD)) + 7, t.y, truncate(t.name, labW - 10, fs), { baseline: 'middle', size: fs, fill: g != null ? mix(col, '#000000', 0.15) : THEME.ink, italic: !!s.italic, cls: 'bz-hit', data: tip(t.name, (g != null ? [[c.t('category'), String(g)]] : []).concat(phylo ? [[en ? 'Distance to root' : '至根距离', sig3(t.d, c.lang)]] : [])) });
    });
    if (phylo) {
      var L0 = niceStep(maxD / 4, 1), sx = X(0), sy = H - 18;
      out += line(sx, sy, X(L0), sy, { stroke: THEME.ink, width: 1.4 }) + line(sx, sy - 3, sx, sy + 3, { stroke: THEME.ink }) + line(X(L0), sy - 3, X(L0), sy + 3, { stroke: THEME.ink });
      labels += text(X(L0) + 6, sy, String(+L0.toPrecision(3)) + (s.unit ? ' ' + s.unit : ''), { baseline: 'middle', size: 11, fill: THEME.ink2 });
    }
    gnames.forEach(function (g) { c.addLegend(g, c.color(g, gnames.indexOf(g)), 'dot'); });
    c.notesExtra.push((phylo ? (en ? 'Branch lengths to scale' + (s.unit ? ' (' + s.unit + ')' : '') : '枝长按比例绘制' + (s.unit ? '（' + s.unit + '）' : '')) : (en ? 'Branch lengths not to scale' : '枝长不代表距离')) + (en ? '; node labels = support ≥ ' + supMin : '；节点数字为支持率（≥ ' + supMin + ' 显示）') + (hl.length ? (en ? '; shaded clade = most recent common ancestor of ' + hl.join(', ') : '；阴影为 ' + hl.join('、') + ' 的最近共同祖先所在分支') : '') + (en ? '; ' + tips.length + ' tips' : '；共 ' + tips.length + ' 个叶片'));
    c.setTable([en ? 'Tip' : '叶片', c.t('category'), en ? 'Distance to root' : '至根距离'], tips.map(function (t) { return [t.name, groups[t.name] != null ? String(groups[t.name]) : '—', phylo ? sig3(t.d, c.lang) : '—']; }));
    var clades = root.children.map(function (ch) { var lv2 = []; (function col3(n2) { if (!n2.children.length) lv2.push(n2.name); n2.children.forEach(col3); })(ch); return { tips: lv2, support: isNum(num(ch.name)) ? num(ch.name) : null }; });
    c.stats = { tips: tips.length, rootClades: clades, maxDepth: phylo ? maxD : null };
    return { svg: out + marks + labels, height: H };
  }
});

/* ── B08 Mutation lollipop ──────────────────────────────────────────── */
function mutColor(c, type, types) {
  var t = String(type).toLowerCase();
  if (/missense|错义/.test(t)) return THEME.series[0];
  if (/trunc|nonsense|frame ?shift|stop|截断|无义|移码/.test(t)) return THEME.series[6];
  if (/in.?frame|框内/.test(t)) return THEME.series[1];
  if (/splice|剪接/.test(t)) return THEME.series[4];
  return [THEME.series[3], THEME.series[7], THEME.series[2], THEME.series[5]][types.indexOf(type) % 4];
}
register({
  id: 'B08', name: { zh: '突变棒棒糖图', en: 'Mutation lollipop' },
  question: { zh: '突变沿蛋白序列分布在哪里，是否集中在某个结构域或热点位点？', en: 'Where do mutations fall along the protein, and do they cluster in a domain or hotspot?' },
  use: { zh: '肿瘤测序、遗传病变异、定点突变筛选：按氨基酸位置画突变数，下方为蛋白结构域，颜色区分突变类型，自动标注热点。', en: 'Tumour sequencing, disease variants or mutagenesis screens: mutation counts by residue above the domain track, coloured by type, hotspots labelled.' },
  avoid: { zh: '比较多个基因的突变负荷（用 C01）；缺少蛋白长度与结构域坐标。', en: 'Comparing burden across genes (use C01); missing protein length or domain coordinates.' },
  fields: [
    { key: 'x', role: 'measure', required: true, desc: { zh: '氨基酸位置字段（1…length）', en: 'Residue position (1…length)' } },
    { key: 'y', role: 'measure', required: false, desc: { zh: '该行突变数（缺省时每行计 1）', en: 'Mutation count per row (default 1 per row)' } },
    { key: 'mutType', role: 'category', required: false, desc: { zh: '突变类型字段（错义、截断、框内、剪接…）', en: 'Mutation type field (missense, truncating, in-frame, splice…)' } },
    { key: 'label', role: 'category', required: false, desc: { zh: '氨基酸改变，如 R175H', en: 'Protein change, e.g. R175H' } }
  ],
  options: ['length（蛋白长度 aa，必填）', 'domains:[{name, start, end}]', 'top（标注热点数，默认 5）', 'protein（蛋白名）'],
  keywords: { zh: ['棒棒糖图', '突变分布', '蛋白结构域', '热点突变', '肿瘤测序', '错义突变', '变异位点'], en: ['lollipop plot', 'mutation map', 'protein domains', 'hotspot', 'tumour sequencing', 'missense', 'variants'] },
  needsUnit: false, aspect: 0.48, minH: 260,
  lint: function (s, add) {
    checkFields(s, add, [s.x, s.y, s.mutType, s.label]);
    var L = num(s.length);
    if (!(L > 0)) add('error', 'E_LENGTH', '缺少蛋白长度 length（氨基酸数）');
    else {
      var bad = asArray(s.data).filter(function (r) { var p = num(r[s.x]); return !(p >= 1 && p <= L); }).length;
      if (bad) add('error', 'E_POS', bad + ' 行位置超出 1–' + L);
      asArray(s.domains).forEach(function (dm) { if (!(num(dm.start) >= 1 && num(dm.end) <= L && num(dm.start) < num(dm.end))) add('error', 'E_DOMAIN', '结构域坐标无效：' + dm.name); });
    }
  },
  render: function (c) {
    var s = c.spec, en = c.lang === 'en', L = num(s.length), rows = asArray(s.data).filter(function (r) { var p = num(r[s.x]); return p >= 1 && p <= L; });
    var types = s.mutType ? uniq(rows.map(function (r) { return String(r[s.mutType]); })) : [], by = {};
    rows.forEach(function (r) {
      var p = num(r[s.x]), k = String(p), n = s.y ? (num(r[s.y]) || 0) : 1, t = s.mutType ? String(r[s.mutType]) : '';
      if (!by[k]) by[k] = { pos: p, n: 0, types: {}, labels: {} };
      by[k].n += n; by[k].types[t] = (by[k].types[t] || 0) + n;
      if (s.label && r[s.label] != null) by[k].labels[String(r[s.label])] = (by[k].labels[String(r[s.label])] || 0) + n;
    });
    var sites = Object.keys(by).map(function (k) { var b = by[k]; b.top = Object.keys(b.types).sort(function (a, c2) { return b.types[c2] - b.types[a]; })[0]; b.lab = Object.keys(b.labels).sort(function (a, c2) { return b.labels[c2] - b.labels[a]; })[0] || ''; return b; }).sort(function (a, b) { return a.pos - b.pos; });
    var maxN = Math.max.apply(null, sites.map(function (b) { return b.n; }).concat([1]));
    var F = frameXY(c, { x: { kind: 'linear', lo: 0, hi: L, fixedMin: 0, fmt: 'integer' }, y: { lo: 0, hi: maxN * 1.15, zero: true, unit: s.yTitle || (en ? 'Mutations' : '突变数'), fmt: 'integer' }, bottom: 44, xLabelDy: 26, right: 12 });
    var X = function (p) { return F.x(p); }, out = '', marks = '', labels = '', ty = F.P.b + 6;
    out += rect(X(0), ty + 4, X(L) - X(0), 8, { fill: THEME.grid });
    asArray(s.domains).forEach(function (dm, k) {
      var x0 = X(num(dm.start)), x1 = X(num(dm.end)), col = mix([THEME.series[4], THEME.series[5], THEME.series[7], THEME.series[2]][k % 4], '#FFFFFF', 0.25), nm = String(dm.name);
      out += rect(x0, ty, x1 - x0, 16, { fill: col, title: nm + ' ' + dm.start + '–' + dm.end });
      if (textW(nm, 11, 600) + 6 <= x1 - x0) labels += text((x0 + x1) / 2, ty + 8, nm, { anchor: 'middle', baseline: 'middle', size: 11, weight: 600, fill: inkOn(col) });
      c.addLegend(nm + parB(dm.start + '–' + dm.end, c.lang), col, 'bar');
    });
    sites.forEach(function (b) {
      var x = X(b.pos), y = F.y(b.n), col = s.mutType ? mutColor(c, b.top, types) : THEME.primary;
      marks += line(x, F.P.b, x, y, { stroke: THEME.faint, width: 1 });
      marks += circle(x, y, b.n === maxN ? 5 : 4, { fill: col, stroke: '#FFFFFF', width: 0.8, cls: 'bz-hit', data: tip((b.lab || (en ? 'Residue ' : '位点 ') + b.pos), [[en ? 'Position' : '位置', String(b.pos)], [en ? 'Mutations' : '突变数', String(b.n)]].concat(Object.keys(b.types).filter(Boolean).map(function (t) { return [t, String(b.types[t])]; }))) });
    });
    var topN = s.top != null ? num(s.top) : 5, hot = sites.slice().sort(function (a, b) { return b.n - a.n || a.pos - b.pos; }).slice(0, topN);
    labels += labelPoints(c, hot.map(function (b) { return { x: X(b.pos), y: F.y(b.n), t: b.lab || String(b.pos), r: 4 }; }), { x0: F.P.l, x1: F.P.r, y0: F.P.t - 4, y1: F.P.b - 2 }, [], false);
    types.forEach(function (t) { c.addLegend(t, mutColor(c, t, types), 'dot'); });
    labels += text(F.P.r, F.H - 2, (s.protein ? s.protein + ' ' : '') + (en ? 'amino-acid position (' + L + ' aa)' : '氨基酸位置（共 ' + L + ' aa）'), { anchor: 'end', size: c.fs, fill: THEME.muted });
    var total = sum(sites, function (b) { return b.n; });
    c.notesExtra.push(en ? total + ' mutations at ' + sites.length + ' residues; each stem is one residue, height = mutations, colour = most frequent type at that residue' : '共 ' + total + ' 个突变，分布于 ' + sites.length + ' 个位点；每根棒为一个氨基酸位点，高度为突变数，颜色为该位点最多的突变类型');
    c.setTable([en ? 'Position' : '位置', en ? 'Change' : '氨基酸改变', en ? 'Mutations' : '突变数', en ? 'Main type' : '主要类型'], sites.slice().sort(function (a, b) { return b.n - a.n || a.pos - b.pos; }).map(function (b) { return [String(b.pos), b.lab || '—', String(b.n), b.top || '—']; }));
    c.stats = { total: total, sites: sites.length, hotspots: hot.map(function (b) { return { pos: b.pos, label: b.lab, n: b.n, type: b.top }; }) };
    return { svg: F.under + out + F.base + marks + F.axes + labels, height: F.H };
  }
});
