/* 30-frame — chart registry, spec normalisation, render context, shared
   cartesian axes, legends, label placement, lint rules and the exhibit frame
   (number · conclusion title · descriptive subtitle · plot · notes · source). */

var TYPES = {}, ORDER = [];
function register(def) {
  def.family = def.family || def.id.charAt(0);
  TYPES[def.id] = def; ORDER.push(def.id);
}
var FAMILIES = {
  T: { zh: '趋势与时间', en: 'Trend & time' },
  C: { zh: '比较与排名', en: 'Comparison & ranking' },
  S: { zh: '构成与桥接', en: 'Composition & bridges' },
  D: { zh: '分布', en: 'Distribution' },
  R: { zh: '相关与定位', en: 'Relationship & positioning' },
  V: { zh: '估值与敏感性', en: 'Valuation & sensitivity' },
  H: { zh: '矩阵与同期群', en: 'Matrix & cohort' },
  G: { zh: '地理', en: 'Geography' },
  K: { zh: '指标与表格', en: 'KPIs & tables' },
  P: { zh: '进程与时间线', en: 'Process & timeline' },
  M: { zh: '小多图', en: 'Small multiples' },
  E: { zh: '实验与统计', en: 'Experiments & statistics' },
  B: { zh: '生物医学与组学', en: 'Biomedicine & omics' }
};

/* ── spec normalisation ──────────────────────────────────────────────── */
function resolveBilingual(v, lang, depth) {
  if (depth > 6 || v == null) return v;
  if (Array.isArray(v)) return v.map(function (x) { return resolveBilingual(x, lang, depth + 1); });
  if (typeof v === 'object') {
    var keys = Object.keys(v);
    if (keys.length && keys.every(function (k) { return k === 'zh' || k === 'en'; })) return tx(v, lang);
    var o = {}; keys.forEach(function (k) { o[k] = resolveBilingual(v[k], lang, depth + 1); }); return o;
  }
  return v;
}
function normSpec(spec) {
  var lang = spec && spec.lang === 'en' ? 'en' : 'zh';
  var s = resolveBilingual(deepClone(spec || {}), lang, 0);
  s.lang = lang;
  s.type = String(s.type || s.chart || '').toUpperCase();
  s.notes = asArray(s.notes).map(function (n) { return String(n); }).filter(Boolean);
  if (s.format == null && s.fmt != null) s.format = s.fmt;
  s.format = normFmt(s.format);
  Object.defineProperty(s, '_normalized', { value: true, enumerable: false });
  return s;
}

/* ── render context ──────────────────────────────────────────────────── */
function Ctx(spec, opts) {
  opts = opts || {};
  this.spec = spec; this.lang = spec.lang; this.def = TYPES[spec.type];
  this.W = Math.max(300, Math.round(opts.width || spec.width || 760));
  this.compact = this.W < 560;
  this.pal = paletteFor(spec);
  this.fs = THEME.size.label;
  this.legend = [];
  this.defs = {};
  this.uid = 'bz' + (opts.uid == null ? 0 : opts.uid);
  this.colorMap = opts.colorMap || null;
  this.table = null;
  this.notesExtra = [];
  this.stats = null;
  this._ci = 0;
}
Ctx.prototype.t = function (k) { return L(this.lang, k); };
Ctx.prototype.fmt = function (v, extra) { return fmtNum(v, (extra && extra.format) || this.spec.format, this.lang, extra); };
Ctx.prototype.height = function (aspect, minH, maxH) {
  var d = this.def || {}, a = aspect || d.aspect || 0.56, lo = minH || d.minH || 240, hi = maxH || d.maxH || 440;
  if (this.spec.height) return Math.round(this.spec.height);
  return Math.round(clamp(this.W * (this.compact ? Math.max(a, 0.72) : a), lo, hi));
};
/* Colour for a named series. Report colour maps keep one entity one colour. */
Ctx.prototype.color = function (name, i) {
  var s = this.spec;
  if (s.colors && s.colors[name]) return s.colors[name];
  var hl = asArray(s.highlight);
  if (hl.length) {
    var hi = hl.indexOf(name);
    if (hi < 0) return THEME.dim;
    return this.pal.series[hi % this.pal.series.length];
  }
  if (this.colorMap && this.colorMap[name]) return this.colorMap[name];
  var idx = i == null ? this._ci++ : i;
  var col = this.pal.series[idx % this.pal.series.length];
  if (this.colorMap) this.colorMap[name] = col;
  return col;
};
Ctx.prototype.isDim = function (name) { var hl = asArray(this.spec.highlight); return hl.length > 0 && hl.indexOf(name) < 0; };
/* Hatched fill for estimates (E): tint of the series colour + diagonal rule. */
Ctx.prototype.est = function (color) {
  var id = this.uid + '-e' + color.replace('#', '');
  if (!this.defs[id]) {
    this.defs[id] = el('pattern', { id: id, patternUnits: 'userSpaceOnUse', width: 5, height: 5, patternTransform: 'rotate(45)' },
      rect(0, 0, 5, 5, { fill: mix(color, '#FFFFFF', 0.72) }) + line(0, 0, 0, 5, { stroke: color, width: 1.6 }));
  }
  return 'url(#' + id + ')';
};
Ctx.prototype.addLegend = function (label, color, kind, extra) {
  for (var i = 0; i < this.legend.length; i++) if (this.legend[i].label === label && this.legend[i].kind === kind) return;
  var item = { label: label, color: color, kind: kind || 'bar' };
  if (extra) for (var k in extra) item[k] = extra[k];
  this.legend.push(item);
};
Ctx.prototype.setTable = function (head, rows, raw) { this.table = { head: head, rows: rows, raw: raw || rows }; };

/* Field helpers used by most chart modules. */
function fieldVal(row, key) { if (row == null) return null; return row[key]; }
function labelOf(spec, key) {
  var names = spec.names || spec.labels || {};
  if (names[key] != null) return String(names[key]);
  var ser = asArray(spec.series);
  for (var i = 0; i < ser.length; i++) if (ser[i] && (ser[i].key === key || ser[i].field === key)) return String(ser[i].name || ser[i].label || key);
  return String(key);
}
/* Wide measures: spec.y (string|array) or spec.series ([{key,name}]) or long
   format via spec.seriesBy + spec.y. Returns {xs, list:[{key,name,values}]}. */
function measures(c, opts) {
  var s = c.spec, data = asArray(s.data), xKey = s.x;
  opts = opts || {};
  if (s.seriesBy) {
    var yKey = Array.isArray(s.y) ? s.y[0] : s.y, xs = uniq(data.map(function (r) { return r[xKey]; }));
    var groups = uniq(data.map(function (r) { return r[s.seriesBy]; }));
    var list = groups.map(function (gname) {
      var vals = xs.map(function (xv) {
        var row = data.filter(function (r) { return r[xKey] === xv && r[s.seriesBy] === gname; })[0];
        return row ? num(row[yKey]) : null;
      });
      return { key: String(gname), name: String(gname), values: vals };
    });
    return { xs: xs, list: list };
  }
  var keys = [];
  if (Array.isArray(s.series) && s.series.length) keys = s.series.map(function (d) { return typeof d === 'string' ? d : (d.key || d.field); });
  else if (Array.isArray(s.y)) keys = s.y;
  else if (s.y) keys = [s.y];
  var xs2 = data.map(function (r) { return r[xKey]; });
  return {
    xs: xs2,
    list: keys.map(function (k) {
      var meta = asArray(s.series).filter(function (d) { return d && typeof d === 'object' && (d.key === k || d.field === k); })[0] || {};
      return { key: k, name: labelOf(s, k), meta: meta, values: data.map(function (r) { return num(r[k]); }) };
    })
  };
}
/* Estimate flags per x position. */
function estFlags(c, xs) {
  var s = c.spec, data = asArray(s.data);
  if (s.estimateField) return data.map(function (r) { return !!r[s.estimateField]; });
  if (s.estimateFrom != null) { var i0 = xs.map(String).indexOf(String(s.estimateFrom)); return xs.map(function (_, i) { return i0 >= 0 && i >= i0; }); }
  if (s.estimates === false) return xs.map(function () { return false; });
  return xs.map(function (x) { return isEstLabel(x); });
}
function xLabel(c, x) {
  var s = c.spec;
  if (s.xLabels && s.xLabels[x] != null) return String(s.xLabels[x]);
  if (ISO_MONTH.test(String(x))) return fmtMonthLabel(x, c.lang);
  var q = String(x).match(/^(\d{4})\s*-?Q([1-4])([AE]?)$/i);
  if (q && s.quarterStyle !== 'keep') return c.lang === 'en' ? q[2] + 'Q' + q[1].slice(2) + q[3].toUpperCase() : q[1].slice(2) + 'Q' + q[2] + q[3].toUpperCase();
  if (ISO_DAY.test(String(x))) return fmtDate(parseDay(x), 'day', c.lang);
  return String(x);
}

/* ── label placement ─────────────────────────────────────────────────── */
function spread(items, gap, lo, hi) {
  items.sort(function (a, b) { return a.y - b.y; });
  for (var i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < gap) items[i].y = items[i - 1].y + gap;
  var n = items.length;
  if (n && items[n - 1].y > hi) {
    items[n - 1].y = hi;
    for (var j = n - 2; j >= 0; j--) if (items[j + 1].y - items[j].y < gap) items[j].y = items[j + 1].y - gap;
  }
  if (n && items[0].y < lo) {
    items[0].y = lo;
    for (var k = 1; k < n; k++) if (items[k].y - items[k - 1].y < gap) items[k].y = items[k - 1].y + gap;
  }
  return items;
}
/* Greedy rectangle collision filter for point labels: keeps priority order. */
function placeBoxes(cands, bounds) {
  var placed = [];
  cands.forEach(function (cd) {
    var opts = cd.options || [cd];
    for (var i = 0; i < opts.length; i++) {
      var b = opts[i], box = { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
      if (bounds && (box.x0 < bounds.x0 || box.x1 > bounds.x1 || box.y0 < bounds.y0 || box.y1 > bounds.y1)) continue;
      var hit = placed.some(function (p) { return !(box.x1 < p.x0 || box.x0 > p.x1 || box.y1 < p.y0 || box.y0 > p.y1); });
      if (!hit && cd.avoid) hit = cd.avoid.some(function (p) { return !(box.x1 < p.x0 || box.x0 > p.x1 || box.y1 < p.y0 || box.y0 > p.y1); });
      if (!hit) { placed.push(box); b.ok = true; cd.chosen = b; break; }
    }
  });
  return cands.filter(function (cd) { return cd.chosen; });
}

/* ── cartesian frame ─────────────────────────────────────────────────────
   o.x: {kind:'band'|'point'|'time'|'linear', keys, t0, t1, lo, hi, inner, labels, fmt}
   o.y: {lo, hi, zero, fmt, log, unit, tight (domain hugs the data; ticks inside)}
   o.yr: optional right axis {lo, hi, zero, fmt, unit, color}
   o.right: extra right margin for end labels; o.top: extra top margin.
   Linear x also takes log:true (decade ticks), tickFmt(v), tickValues and
   hide:true (no ticks or grid; the chart draws its own); o.leftMin reserves
   a left margin. */
function frameXY(c, o) {
  var W = c.W, H = o.height || c.height(), fs = c.fs;
  var yo = o.y || {}, xo = o.x || {};
  if (Array.isArray(c.spec.yDomain) && c.spec.yDomain.length === 2) { var yo2 = {}; for (var yk in yo) yo2[yk] = yo[yk]; yo2.lo = c.spec.yDomain[0]; yo2.hi = c.spec.yDomain[1]; yo = yo2; }
  var ticksN = clamp(Math.floor((H - 70) / 48), 3, 6);
  var yd = yo.log ? niceLog(Math.max(yo.lo, 1e-9), yo.hi) : niceLinear(yo.lo, yo.hi, ticksN, !!yo.zero);
  if (yo.fixedMin != null) { yd.min = yo.fixedMin; yd.ticks = yd.ticks.filter(function (t) { return t >= yo.fixedMin; }); if (yd.ticks[0] !== yo.fixedMin) yd.ticks.unshift(yo.fixedMin); }
  if (yo.fixedMax != null) { yd.max = yo.fixedMax; yd.ticks = yd.ticks.filter(function (t) { return t <= yo.fixedMax; }); }
  if (yo.tight && !yo.log) { var padT = (yo.hi - yo.lo) * 0.04 || 1, a0 = Math.max(yd.min, yo.lo - padT), b0 = Math.min(yd.max, yo.hi + padT); yd.ticks = yd.ticks.filter(function (t) { return t >= a0 - 1e-9 && t <= b0 + 1e-9; }); yd.min = a0; yd.max = b0; }
  var yfmt = yo.fmt || c.spec.format;
  var yLabels = yd.ticks.map(function (t) { return yo.tickFmt ? yo.tickFmt(t) : yo.log ? fmtDecade(t, c.lang) : fmtTick(t, yfmt, c.lang, yd.step); });
  var left = Math.max(o.leftMin || 0, Math.max.apply(null, yLabels.map(function (s) { return textW(s, fs); })) + 10);
  var yrd = null, yrLabels = [], right = o.right || 8;
  if (o.yr) {
    yrd = alignRightAxis(yd, o.yr.lo, o.yr.hi, !!o.yr.zero);
    yrLabels = yrd.ticks.map(function (t) { return fmtTick(t, o.yr.fmt, c.lang, yrd.step); });
    right = Math.max(right, Math.max.apply(null, yrLabels.map(function (s) { return textW(s, fs); })) + 10);
  }
  var top = (o.top || 0) + ((yo.unit || (o.yr && o.yr.unit)) ? 22 : 10);
  // x labels
  var xh = 0, xTickSvg = '', P = { l: left, t: top, r: W - right };
  var bottomGuess = 26;
  if ((xo.kind === 'band' || xo.kind === 'point') && !xo.labels && xo.keys.length > 1 && xo.keys.every(function (k) { return ISO_MONTH.test(String(k)); }) && uniq(xo.keys.map(function (k) { return String(k).slice(0, 4); })).length === 1) {
    xo = Object.assign({}, xo, { labels: function (k) { return fmtDate(parseDay(k + '-01'), 'monthShort', c.lang); } });
  }
  if (xo.kind === 'band' || xo.kind === 'point') {
    var keys = xo.keys, labels = keys.map(function (k) { return xo.labels ? xo.labels(k) : xLabel(c, k); });
    var avail = (P.r - P.l) / Math.max(1, keys.length);
    var maxLW = Math.max.apply(null, labels.map(function (s) { return textW(s, fs); }).concat([1]));
    var timeLike = labels.every(function (l) { return TIME_LABEL.test(String(l)); });
    var wrapLines = 1;
    if (maxLW + 10 > avail && !timeLike && keys.length <= 24) wrapLines = Math.max(2, Math.min(3, Math.max.apply(null, labels.map(function (l) { return wrapText(l, Math.max(avail - 10, 20), fs, 400).length; }))));
    bottomGuess = 12 + 14 * wrapLines;
    xo.wrapLines = wrapLines;
  }
  P.b = H - bottomGuess - (o.bottom || 0);
  P.w = P.r - P.l; P.h = P.b - P.t;
  var y = yo.log ? scaleLog(yd.min, yd.max, P.b, P.t) : scaleLinear(yd.min, yd.max, P.b, P.t);
  var yr = yrd ? scaleLinear(yrd.min, yrd.max, P.b, P.t) : null;
  var x;
  if (xo.kind === 'band') x = scaleBand(xo.keys, P.l, P.r, xo.inner == null ? 0.32 : xo.inner, xo.outer);
  else if (xo.kind === 'point') x = scalePoint(xo.keys, P.l, P.r, xo.pad == null ? 0.5 : xo.pad);
  else if (xo.kind === 'time') x = scaleTime(xo.t0, xo.t1, P.l + (xo.padPx || 0), P.r - (xo.padPx || 0));
  else if (xo.log) { var xl = niceLog(Math.max(xo.lo, 1e-300), xo.hi); x = scaleLog(xl.min, xl.max, P.l, P.r); x.nice = { min: xl.min, max: xl.max, ticks: xl.ticks, step: null, log: true }; }
  else { var xdN = niceLinear(xo.lo, xo.hi, clamp(Math.floor(P.w / 80), 3, 8), !!xo.zero); if (xo.tickValues) xdN.ticks = xo.tickValues.slice(); if (xo.fixedMin != null) { xdN.min = xo.fixedMin; xdN.ticks = xdN.ticks.filter(function (t) { return t >= xo.fixedMin; }); } if (xo.fixedMax != null) { xdN.max = xo.fixedMax; xdN.ticks = xdN.ticks.filter(function (t) { return t <= xo.fixedMax; }); } x = scaleLinear(xdN.min, xdN.max, P.l, P.r); x.nice = xdN; }
  // grid + y labels
  var grid = '', axes = '';
  yd.ticks.forEach(function (t, i) {
    var yy = Math.round(y(t)) + 0.5;
    var isZero = Math.abs(t) < 1e-12 && !yo.log;
    if (!isZero && !(yo.zero && i === 0 && t === yd.min && t === 0)) grid += line(P.l, yy, P.r, yy, { stroke: THEME.grid, crisp: true });
    axes += text(P.l - 8, yy, yLabels[i], { anchor: 'end', baseline: 'middle', size: fs, fill: o.yr ? (yo.color || THEME.ink2) : THEME.ink2 });
  });
  if (yr) yrd.ticks.forEach(function (t, i) {
    axes += text(P.r + 8, Math.round(yr(t)) + 0.5, yrLabels[i], { baseline: 'middle', size: fs, fill: o.yr.color || THEME.ink2 });
  });
  // baseline: zero line if inside domain, else bottom axis line
  var zeroY = (!yo.log && yd.min <= 0 && yd.max >= 0) ? Math.round(y(0)) + 0.5 : Math.round(P.b) + 0.5;
  var baseline = line(P.l, zeroY, P.r, zeroY, { stroke: (!yo.log && yd.min < 0 && yd.max > 0) ? THEME.zero : THEME.axis, width: (!yo.log && yd.min < 0) ? THEME.stroke.zero : 1, crisp: true });
  // unit labels above axes
  if (yo.unit) axes += text(P.l - 8, P.t - 12, yo.unit, { anchor: o.unitAnchor || 'start', size: fs, fill: o.yr ? (yo.color || THEME.muted) : THEME.muted, transform: null });
  if (o.yr && o.yr.unit) axes += text(P.r + 8, P.t - 12, o.yr.unit, { anchor: 'end', size: fs, fill: o.yr.color || THEME.muted });
  // x ticks
  var xLab = '';
  var xdy = o.xLabelDy || 0;
  P.b += xdy;
  if (xo.kind === 'band' || xo.kind === 'point') {
    var ks = xo.keys, labs = ks.map(function (k) { return xo.labels ? xo.labels(k) : xLabel(c, k); });
    var step = x.step || P.w / Math.max(1, ks.length);
    var mlw = Math.max.apply(null, labs.map(function (s) { return textW(s, fs); }).concat([1]));
    var two = (xo.wrapLines || 1) > 1;
    var every = two ? 1 : Math.max(1, Math.ceil((mlw + 10) / step));
    ks.forEach(function (k, i) {
      if ((ks.length - 1 - i) % every !== 0) return;
      var cx = x.center(k);
      if (two) {
        var lines = wrapText(labs[i], Math.max(step - 4, 20), fs, 400, xo.wrapLines).map(function (ln) { return truncate(ln, Math.max(step - 2, 18), fs); });
        lines.forEach(function (ln, j) { xLab += text(cx, P.b + 16 + j * 14, ln, { anchor: 'middle', size: fs, fill: THEME.ink2 }); });
      } else {
        var lw0 = textW(labs[i], fs), anc = 'middle', lx0 = cx;
        if (cx + lw0 / 2 > W - 1) { anc = 'end'; lx0 = W - 1; } else if (cx - lw0 / 2 < 1) { anc = 'start'; lx0 = 1; }
        xLab += text(lx0, P.b + 17, labs[i], { anchor: anc, size: fs, fill: THEME.ink2 });
      }
      if (xo.ticks) xLab += line(Math.round(cx) + .5, zeroY, Math.round(cx) + .5, zeroY + 4, { stroke: THEME.axis });
    });
  } else if (xo.kind === 'time') {
    var maxT = Math.max(2, Math.floor(P.w / 64));
    var tt = timeTicks(xo.t0, xo.t1, maxT, c.lang);
    var lastX = -1e9;
    tt.forEach(function (tk) {
      var px = x(tk.t), w = textW(tk.label, fs);
      if (px - w / 2 < P.l - 20 || px + w / 2 > W - 2 || px - w / 2 < lastX + 6) return;
      lastX = px + w / 2;
      xLab += line(Math.round(px) + .5, P.b, Math.round(px) + .5, P.b + 4, { stroke: THEME.axis });
      xLab += text(px, P.b + 17, tk.label, { anchor: 'middle', size: fs, fill: THEME.ink2 });
    });
  } else if (xo.kind === 'linear' && !xo.hide) {
    var xd = x.nice, lastR = -1e9;
    xd.ticks.forEach(function (t) {
      var px = x(t);
      if (px < P.l - 1 || px > P.r + 1) return;
      if (xo.grid !== false && (xd.log || Math.abs(t) > 1e-12)) grid += line(Math.round(px) + .5, P.t, Math.round(px) + .5, P.b, { stroke: THEME.grid, crisp: true });
      xLab += line(Math.round(px) + .5, P.b, Math.round(px) + .5, P.b + 4, { stroke: THEME.axis });
      var lab = xo.tickFmt ? xo.tickFmt(t) : xd.log ? fmtDecade(t, c.lang) : fmtTick(t, xo.fmt, c.lang, xd.step), lw = textW(lab, fs);
      var anc = 'middle', lx = px;
      if (px + lw / 2 > W - 1) { anc = 'end'; lx = W - 1; } else if (px - lw / 2 < 1) { anc = 'start'; lx = 1; }
      var l0 = anc === 'middle' ? lx - lw / 2 : anc === 'end' ? lx - lw : lx;
      if (l0 < lastR + 6) return;
      lastR = l0 + lw;
      xLab += text(lx, P.b + 17, lab, { anchor: anc, size: fs, fill: THEME.ink2 });
    });
  }
  P.b -= xdy;
  return { x: x, y: y, yr: yr, yd: yd, yrd: yrd, P: P, H: H, W: W, zeroY: zeroY,
    under: grid, axes: axes + xLab, base: baseline };
}

var TIME_LABEL = /^(\d{4}([-\/.]\d{1,2}){0,2}[AE]?|\d{2}Q[1-4][AE]?|[1-4]Q\d{2}[AE]?|FY\s?\d{2,4}[AE]?|\d{1,2}月|\d{1,2}\/\d{1,2}|W\d{1,2}|[A-Z][a-z]{2}(-\d{2})?|\d{1,2} [A-Z][a-z]{2}|\d{4}年(\d{1,2}月)?)$/;
/* Right axis shares the left axis gridlines: same interval count; when the
   left axis crosses zero the right zero sits on the same gridline. */
function alignRightAxis(yd, lo, hi, zero) {
  var n = yd.ticks.length - 1, negN = yd.min < 0 ? Math.round(-yd.min / yd.step) : 0;
  if (zero || negN > 0) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  var steps = [];
  for (var e = -6; e <= 13; e++) [1, 2, 2.5, 5].forEach(function (m) { steps.push(m * Math.pow(10, e)); });
  for (var i = 0; i < steps.length; i++) {
    var st = steps[i], loR;
    if (negN > 0) loR = -negN * st;
    else if (zero) loR = 0;
    else loR = Math.floor(lo / st + 1e-9) * st;
    if (loR <= lo + 1e-12 && loR + n * st >= hi - 1e-12) {
      var ticks = [];
      for (var k = 0; k <= n; k++) ticks.push(+(loR + st * k).toFixed(10));
      return { min: loR, max: loR + n * st, step: st, ticks: ticks };
    }
  }
  return niceLinear(lo, hi, n, zero);
}

/* Horizontal-bar frame: categories down the left, values along x. */
function frameBars(c, o) {
  var W = c.W, fs = c.fs, keys = o.keys, labels = keys.map(function (k) { return o.labels ? o.labels(k) : String(k); });
  var maxLab = Math.min(W * (c.compact ? 0.38 : 0.3), Math.max.apply(null, labels.map(function (s) { return textW(s, fs); }).concat([20])) + 4);
  var wrapped = labels.map(function (s) { return wrapText(s, maxLab, fs, 400, 2); });
  var rowH = o.rowH || (wrapped.some(function (w) { return w.length > 1; }) ? 34 : 26);
  var top = (o.top || 0) + 8;
  var H = top + rowH * keys.length + (o.axis === false ? 6 : 26) + (o.unit ? 16 : 0);
  var left = maxLab + 12, right = o.right || 56;
  var P = { l: left, t: top, r: W - right, b: top + rowH * keys.length };
  P.w = P.r - P.l; P.h = P.b - P.t;
  var xd = niceLinear(o.lo, o.hi, clamp(Math.floor((P.w - (o.padL || 0)) / 90), 2, 6), o.zero !== false);
  var x = scaleLinear(xd.min, xd.max, P.l + (o.padL || 0), P.r);
  var yb = scaleBand(keys, P.t, P.b, o.inner == null ? 0.34 : o.inner, 0.17);
  var under = '', axes = '';
  if (o.grid !== false) xd.ticks.forEach(function (t) {
    var px = Math.round(x(t)) + .5;
    if (Math.abs(t) > 1e-12) under += line(px, P.t, px, P.b, { stroke: THEME.grid, crisp: true });
    if (o.axis !== false) axes += text(px, P.b + 17, fmtTick(t, o.fmt || c.spec.format, c.lang, xd.step), { anchor: 'middle', size: fs, fill: THEME.ink2 });
  });
  keys.forEach(function (k, i) {
    var cy = yb.center(k), lines = wrapped[i];
    lines.forEach(function (ln, j) {
      axes += text(P.l - 10, cy + (j - (lines.length - 1) / 2) * 14, ln, { anchor: 'end', baseline: 'middle', size: fs, fill: o.labelColor ? o.labelColor(k) : THEME.ink, weight: o.labelWeight ? o.labelWeight(k) : 400 });
    });
  });
  var zx = Math.round(x(Math.max(xd.min, Math.min(0, xd.max)))) + .5;
  var base = o.zero === false && xd.min > 0 ? '' : line(zx, P.t - 2, zx, P.b + 2, { stroke: xd.min < 0 ? THEME.zero : THEME.axis, width: xd.min < 0 ? THEME.stroke.zero : 1, crisp: true });
  if (o.unit) axes += text(P.r, H - 3, (c.lang === 'en' ? 'Unit: ' : '单位：') + o.unit, { anchor: 'end', size: fs, fill: THEME.muted });
  return { x: x, y: yb, xd: xd, P: P, H: H, W: W, under: under, axes: axes, base: base, rowH: rowH };
}

/* Reference lines, shaded periods and callouts shared by cartesian charts.
   refLines: [{axis:'y'|'x', value, label, dash}], bands: [{from,to,label}],
   annotations: [{x, y?, text}] (x is a category key, ISO date or number). */
function overlays(c, F, xPos) {
  var s = c.spec, out = { under: '', over: '' };
  asArray(s.bands).forEach(function (b) {
    var x0 = xPos(b.from, 'start'), x1 = xPos(b.to, 'end');
    if (!isNum(x0) || !isNum(x1)) return;
    out.under += rect(Math.min(x0, x1), F.P.t, Math.abs(x1 - x0), F.P.b - F.P.t, { fill: THEME.shade });
    if (b.label) out.under += text(Math.min(x0, x1) + 4, F.P.t + 4, String(b.label), { baseline: 'top', size: c.fs, fill: THEME.muted });
  });
  asArray(s.refLines).forEach(function (rl) {
    var lab = rl.label != null ? String(rl.label) : '';
    if (!rl.axis || rl.axis === 'y' || rl.axis === 'value') {
      var yy = (rl.right && F.yr ? F.yr : F.y)(rl.value);
      if (!isNum(yy)) return;
      out.over += line(F.P.l, yy, F.P.r, yy, { stroke: rl.color || THEME.zero, dash: rl.dash === false ? null : '4 3', width: 1.2 });
      if (lab) out.over += text(F.P.r - 2, yy - 5, lab + (rl.showValue === false ? '' : ' ' + c.fmt(rl.value)), { anchor: 'end', size: c.fs, fill: rl.color || THEME.ink2, halo: true });
    } else {
      var xx = xPos(rl.value, 'center');
      if (!isNum(xx)) return;
      out.over += line(xx, F.P.t, xx, F.P.b, { stroke: rl.color || THEME.zero, dash: rl.dash === false ? null : '4 3', width: 1.2 });
      if (lab) out.over += text(xx + 4, F.P.t + 4, lab, { baseline: 'top', size: c.fs, fill: rl.color || THEME.ink2, halo: true });
    }
  });
  asArray(s.annotations).forEach(function (an) {
    var xx = xPos(an.x, 'center');
    if (!isNum(xx)) return;
    var yy = an.y != null && isNum(F.y(an.y)) ? F.y(an.y) : F.P.t + 14;
    var ty = Math.max(F.P.t + 2, yy - 26);
    out.over += line(xx, yy - 4, xx, ty + 4, { stroke: THEME.ink2, width: 1 });
    out.over += circle(xx, yy, 2.5, { fill: THEME.ink });
    var tw = textW(an.text, c.fs), anchor = xx + tw / 2 > F.P.r ? 'end' : xx - tw / 2 < F.P.l ? 'start' : 'middle';
    out.over += text(xx, ty, String(an.text), { anchor: anchor, size: c.fs, fill: THEME.ink, weight: 600, halo: true });
  });
  return out;
}

/* Class breaks for heat colours. Quantile classes keep skewed data (promo
   spikes) from washing out the rest; breaks are printed in the legend. */
function classBreaks(vals, mode, n) {
  var v = sortNum(vals);
  if (!v.length) return [0, 1];
  var lo = v[0], hi = v[v.length - 1], out = [lo];
  for (var i = 1; i < n; i++) out.push(mode === 'linear' ? lo + (hi - lo) * i / n : quantile(v, i / n));
  out.push(hi);
  var u = [out[0]];
  for (var j = 1; j < out.length; j++) if (out[j] > u[u.length - 1] + 1e-12) u.push(out[j]);
  if (u.length < 2) u.push(hi + 1);
  return u;
}
function classOf(br, v) {
  for (var i = 1; i < br.length - 1; i++) if (v < br[i]) return i - 1;
  return br.length - 2;
}
function classLegend(c, br, colorFn, x, y, title) {
  var out = '', n = br.length - 1, w = clamp(Math.floor((c.W - x - 20) / Math.max(n, 1)), 36, 64);
  if (title) { out += text(x, y + 9, title, { size: c.fs, fill: THEME.muted }); x += textW(title, c.fs) + 10; }
  for (var i = 0; i < n; i++) {
    out += rect(x + i * w, y, w - 2, 10, { fill: colorFn((br[i] + br[i + 1]) / 2) });
    out += text(x + i * w, y + 24, c.fmt(br[i]), { size: 11, fill: THEME.muted });
  }
  out += text(x + n * w - 2, y + 24, c.fmt(br[n]), { size: 11, fill: THEME.muted, anchor: 'end' });
  return out;
}

/* ── helpers shared by chart modules ─────────────────────────────── */
function hitRect(x, y, w, h, label, rows, focus) {
  var a = { x: x, y: y, width: Math.max(1, w), height: Math.max(1, h), fill: 'transparent', 'class': 'bz-hit' };
  if (focus) a.tabindex = 0;
  a['data-tip'] = JSON.stringify({ t: label, r: rows });
  return el('rect', a);
}
function xPosFactory(c, F, xs, isTime) {
  return function (v, edge) {
    if (v == null) return NaN;
    if (isTime) { var t = parseDay(v); return t == null ? NaN : F.x(t); }
    var i = xs.map(String).indexOf(String(v));
    if (i < 0) return NaN;
    var cx = F.x.center(xs[i]), half = (F.x.step || 0) / 2;
    return edge === 'start' ? cx - half : edge === 'end' ? cx + half : cx;
  };
}
function lineDomain(c, list, extra) {
  var all = [];
  list.forEach(function (se) { se.values.forEach(function (v) { if (isNum(v)) all.push(v); }); });
  asArray(c.spec.refLines).forEach(function (r) { if ((!r.axis || r.axis === 'y' || r.axis === 'value') && isNum(r.value)) all.push(r.value); });
  (extra || []).forEach(function (v) { if (isNum(v)) all.push(v); });
  var e = extent(all), s = c.spec, zero;
  if (s.zero === true) zero = true;
  else if (s.zero === false || s.scale === 'log') zero = false;
  else zero = (e[0] >= 0 && e[0] <= e[1] * 0.35) || (e[1] <= 0 && e[1] >= e[0] * 0.35);
  return { lo: e[0], hi: e[1], zero: zero };
}
/* Split a series into actual (solid) and estimate (dashed) paths. */
function estPaths(pts, flags) {
  var a = [], e = [], firstE = flags.indexOf(true);
  if (firstE < 0) return { a: pts, e: [] };
  for (var i = 0; i < pts.length; i++) {
    if (i < firstE) a.push(pts[i]);
    if (i >= firstE - 1) e.push(i >= firstE || pts[i] ? pts[i] : null);
  }
  if (firstE === 0) a = [];
  return { a: a, e: e };
}
function estDivider(c, F, xs, flags, X) {
  var i = flags.indexOf(true);
  if (i <= 0) return '';
  var xx = (X(i - 1) + X(i)) / 2, out = '';
  out += line(Math.round(xx) + .5, F.P.t - 2, Math.round(xx) + .5, F.P.b, { stroke: THEME.axis, dash: '3 3' });
  out += text(xx - 6, F.P.t + 2, c.t('act'), { anchor: 'end', baseline: 'top', size: c.fs, fill: THEME.muted });
  out += text(xx + 6, F.P.t + 2, c.t('est'), { baseline: 'top', size: c.fs, fill: THEME.muted });
  return out;
}
function seriesTable(c, xs, list, fmtOf) {
  var head = [c.spec.xTitle || c.t('period')].concat(list.map(function (s) { return s.name; }));
  var rows = xs.map(function (x, i) { return [xLabel(c, x)].concat(list.map(function (s) { return fmtNum(s.values[i], fmtOf ? fmtOf(s) : c.spec.format, c.lang); })); });
  var raw = xs.map(function (x, i) { return [x].concat(list.map(function (s) { return s.values[i]; })); });
  c.setTable(head, rows, raw);
}

/* ── lint ─────────────────────────────────────────────────────────────── */
var CJK = /[⺀-鿿豈-﫿]/;
var NO_UNIT_TYPES = { percent: 1, pp: 1, multiple: 1, index: 1, bps: 1, currency: 1 };
function lint(spec) {
  var s = spec && spec._normalized ? spec : normSpec(spec || {});
  var out = [];
  var add = function (level, code, msg) { out.push({ level: level, code: code, message: msg }); };
  var def = TYPES[s.type];
  if (!def) { add('error', 'E_TYPE', '未知图表类型 ' + s.type + '；可用：' + ORDER.join(', ')); return out; }
  if (!s.title) add('error', 'E_TITLE', '缺少结论式标题 title');
  if (!s.source) add('error', 'E_SOURCE', '缺少资料来源 source（用户提供的数据写“用户提供”或文件名）');
  if (!s.subtitle) add('warning', 'W_SUBTITLE', '缺少副标题 subtitle：写明指标、单位与期间');
  if (def.needsUnit !== false && !s.unit && !NO_UNIT_TYPES[s.format.type] && !s.yRight && def.id !== 'T04') add('error', 'E_UNIT', '缺少单位 unit（如 “百万美元”“件”“%”）；百分比请设 format:"percent"');
  var texts = [s.title, s.subtitle].filter(Boolean).join(' ');
  if (s.lang === 'en' && CJK.test(texts)) add('warning', 'W_LANG', '英文版标题/副标题含中文字符');
  if (s.lang === 'zh' && texts && !CJK.test(texts)) add('warning', 'W_LANG', '中文版标题/副标题不含中文');
  if (s.title && textW(s.title, 15) > 15 * 46) add('warning', 'W_TITLE_LONG', '标题过长：一句话结论，建议不超过 40 个汉字');
  if (def.dataKind !== 'custom') {
    if (!Array.isArray(s.data) || !s.data.length) add('error', 'E_DATA', 'data 为空或不是数组');
  }
  if (s.format.type === 'percent' && Array.isArray(s.data) && def.dataKind !== 'custom') {
    var vals = [];
    s.data.forEach(function (r) { for (var k in r) if (k !== s.x && isNum(r[k])) vals.push(r[k]); });
    if (vals.length > 2 && vals.every(function (v) { return Math.abs(v) <= 1; }) && vals.some(function (v) { return v !== 0; })) add('warning', 'W_PERCENT_RATIO', '百分比字段看起来是比例（≤1）；本引擎约定 12.5 表示 12.5%');
  }
  if (Array.isArray(s.data) && s.x && def.dataKind !== 'custom') {
    var miss = s.data.filter(function (r) { return r[s.x] == null; }).length;
    if (miss) add('error', 'E_FIELD', miss + ' 行缺少 x 字段 “' + s.x + '”');
  }
  if (def.lint) def.lint(s, add);
  return out;
}
function checkFields(s, add, keys) {
  var data = asArray(s.data);
  keys.forEach(function (k) {
    if (!k) return;
    if (!data.some(function (r) { return r && r[k] != null; })) add('error', 'E_FIELD', '数据中找不到字段 “' + k + '”');
  });
}
function measureKeys(s) {
  if (s.seriesBy) return [s.seriesBy, Array.isArray(s.y) ? s.y[0] : s.y];
  if (Array.isArray(s.series) && s.series.length) return s.series.map(function (d) { return typeof d === 'string' ? d : (d.key || d.field); });
  if (Array.isArray(s.y)) return s.y;
  return s.y ? [s.y] : [];
}
function checkEstOrder(s, add, xs, flags) {
  var seenE = false;
  for (var i = 0; i < xs.length; i++) {
    if (flags[i]) seenE = true;
    else if (seenE) { add('error', 'E_EST_ORDER', '预测期（E）之后又出现实际期：' + xs[i]); return; }
  }
}

/* ── exhibit frame ───────────────────────────────────────────────────── */
function legendHTML(items) {
  if (!items.length) return '';
  return '<div class="bz-legend" aria-hidden="true">' + items.map(function (it) {
    var sw;
    if (it.kind === 'line') sw = '<span class="bz-sw line" style="border-color:' + it.color + '"></span>';
    else if (it.kind === 'dash') sw = '<span class="bz-sw dash" style="border-color:' + it.color + '"></span>';
    else if (it.kind === 'dot') sw = '<span class="bz-sw dot" style="background:' + it.color + '"></span>';
    else if (it.kind === 'range') sw = '<span class="bz-sw range" style="background:' + it.color + '"></span>';
    else if (it.kind === 'est') sw = '<span class="bz-sw" style="background:repeating-linear-gradient(135deg,' + mix(it.color, '#FFFFFF', 0.72) + ' 0 2px,' + it.color + ' 2px 3.4px);outline:1px solid ' + it.color + ';outline-offset:-1px"></span>';
    else if (it.kind === 'outline') sw = '<span class="bz-sw" style="border:1.5px solid ' + it.color + ';background:#fff"></span>';
    else sw = '<span class="bz-sw" style="background:' + it.color + '"></span>';
    return '<span class="bz-li">' + sw + esc(it.label) + '</span>';
  }).join('') + '</div>';
}
function tableHTML(tbl, lang) {
  if (!tbl || !tbl.rows || !tbl.rows.length) return '';
  return '<details class="bz-data"><summary>' + esc(L(lang, 'dataTable')) + '</summary><div class="bz-table-wrap"><table class="bz-dt"><thead><tr>' +
    tbl.head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    tbl.rows.map(function (r) { return '<tr>' + r.map(function (v) { return '<td>' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') +
    '</tbody></table></div></details>';
}
function notesText(s, extra) {
  var en = s.lang === 'en', notes = s.notes.concat(extra || []).map(function (n) { return String(n).trim().replace(/[。．.;；，,\s]+$/, ''); }).filter(Boolean);
  if (!notes.length) return '';
  var end = en ? '.' : '。';
  if (notes.length === 1) return notes[0] + end;
  return notes.map(function (n, i) { return '(' + (i + 1) + ') ' + n; }).join(en ? '; ' : '；') + end;
}
function footHTML(s, extraNotes) {
  var nt = notesText(s, extraNotes), out = '';
  if (nt) out += '<p class="bz-notes">' + esc(L(s.lang, 'note') + nt) + '</p>';
  if (s.source) out += '<p class="bz-source">' + esc(L(s.lang, 'source') + s.source) + '</p>';
  return out ? '<div class="bz-foot">' + out + '</div>' : '';
}
function exhibitNo(s, opts) {
  var no = s.no != null ? s.no : opts && opts.no;
  if (no == null || no === false) return '';
  return L(s.lang, 'exhibit') + ' ' + no + (s.lang === 'en' ? ':' : '：');
}
function wrapPlot(c, out) {
  var H = out.height, W = c.W, defs = Object.keys(c.defs).map(function (k) { return c.defs[k]; }).join('');
  var label = (c.spec.title || '') + (c.spec.subtitle ? ' — ' + c.spec.subtitle : '');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(label) + '" font-size="12" fill="' + THEME.ink + '">' +
    (defs ? '<defs>' + defs + '</defs>' : '') + out.svg + '</svg>';
}

function render(spec, opts) {
  opts = opts || {};
  var s = normSpec(spec), def = TYPES[s.type];
  var issues = lint(s);
  if (!def) return { html: '', svg: '', issues: issues, type: s.type, error: true };
  var c = new Ctx(s, opts), out;
  try { out = def.render(c); }
  catch (e) { issues.push({ level: 'error', code: 'E_RENDER', message: '渲染失败：' + (e && e.message) }); return { html: '', svg: '', issues: issues, type: s.type, error: true }; }
  var plot = out.html != null ? out.html : wrapPlot(c, out);
  var noLabel = exhibitNo(s, opts);
  var html = '<figure class="bz-exhibit' + (opts.boxed ? ' bz-boxed' : '') + '" data-type="' + s.type + '"' + (opts.index != null ? ' data-bz="' + opts.index + '"' : '') + '>' +
    '<figcaption class="bz-head"><h3 class="bz-title">' + (noLabel ? '<span class="bz-no">' + esc(noLabel) + '</span>' : '') + esc(s.title || '') + '</h3>' +
    (s.subtitle ? '<p class="bz-sub">' + esc(s.subtitle) + '</p>' : '') + '</figcaption>' +
    legendHTML(s.legend === false ? [] : c.legend) +
    '<div class="bz-plot" data-w="' + c.W + '">' + plot + '</div>' +
    footHTML(s, c.notesExtra) + '<div class="bz-actions">' + (s.table === false ? '' : tableHTML(c.table, s.lang)) + '</div></figure>';
  return { html: html, svg: out.html != null ? '' : plot, plotHtml: plot, issues: issues, type: s.type, width: c.W, height: out.height, legend: c.legend, table: c.table, notes: c.notesExtra, stats: c.stats, spec: s };
}

/* Stand-alone SVG of a whole exhibit (title, legend, plot, notes, source),
   used by the SVG/PNG export and by scripts/render.mjs --svg. */
function exhibitSVG(spec, opts) {
  opts = opts || {};
  var r = render(spec, opts);
  if (!r.svg) return null;
  var s = r.spec, W = r.width, pad = 0, y = 4, parts = [];
  var noLabel = exhibitNo(s, opts);
  var titleLines = wrapText(noLabel + (s.title || ''), W - pad * 2, THEME.size.title, 600);
  parts.push(rect(0, 0, W, 2, { fill: THEME.rule }));
  y = 22;
  titleLines.forEach(function (ln, i) { parts.push(text(pad, y + i * 21, ln, { size: THEME.size.title, weight: 600, fill: THEME.ink })); });
  y += titleLines.length * 21;
  if (s.subtitle) { wrapText(s.subtitle, W, THEME.size.sub).forEach(function (ln) { parts.push(text(pad, y, ln, { size: THEME.size.sub, fill: THEME.ink2 })); y += 17; }); }
  if (r.legend.length && s.legend !== false) {
    var lx = pad; y += 8;
    r.legend.forEach(function (it) {
      var w = 20 + textW(it.label, 12) + 16;
      if (lx + w > W) { lx = pad; y += 18; }
      if (it.kind === 'line' || it.kind === 'dash') parts.push(line(lx, y - 4, lx + 14, y - 4, { stroke: it.color, width: 2, dash: it.kind === 'dash' ? '4 3' : null }));
      else if (it.kind === 'dot') parts.push(circle(lx + 5, y - 4, 4.5, { fill: it.color }));
      else parts.push(rect(lx, y - 10, 12, 12, { fill: it.kind === 'outline' ? '#FFFFFF' : it.kind === 'est' ? mix(it.color, '#FFFFFF', 0.6) : it.color, stroke: it.kind === 'outline' || it.kind === 'est' ? it.color : null }));
      parts.push(text(lx + 18, y, it.label, { size: 12, fill: THEME.ink2 }));
      lx += w;
    });
    y += 8;
  }
  y += 6;
  var plotY = y, inner = r.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  parts.push('<g transform="translate(0,' + plotY + ')">' + inner + '</g>');
  y += r.height + 14;
  var nt = notesText(s, r.notes);
  if (nt) { wrapText(L(s.lang, 'note') + nt, W, 11).forEach(function (ln) { parts.push(text(pad, y, ln, { size: 11, fill: THEME.muted })); y += 15; }); }
  if (s.source) { wrapText(L(s.lang, 'source') + s.source, W, 11).forEach(function (ln) { parts.push(text(pad, y, ln, { size: 11, fill: THEME.muted })); y += 15; }); }
  var H = y + 4;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="' + esc(THEME.font) + '" style="font-variant-numeric:tabular-nums"><rect width="' + W + '" height="' + H + '" fill="#FFFFFF"/>' + parts.join('') + '</svg>';
}
