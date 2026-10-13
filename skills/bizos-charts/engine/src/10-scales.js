/* 10-scales — linear (nice), log, band, point, sqrt and UTC time scales. */

function niceStep(span, count) {
  if (!(span > 0)) return 1;
  var raw = span / Math.max(1, count);
  var p = Math.pow(10, Math.floor(Math.log10(raw)));
  var f = raw / p;
  var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * p;
}
/* Nice domain + ticks. includeZero forces 0 inside the domain (bars, areas). */
function niceLinear(lo, hi, count, includeZero) {
  if (!isNum(lo) || !isNum(hi)) { lo = 0; hi = 1; }
  if (includeZero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  if (lo === hi) { if (lo === 0) { hi = 1; } else { var pad = Math.abs(lo) * 0.1; lo -= pad; hi += pad; if (includeZero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); } } }
  count = count || 5;
  var step = niceStep(hi - lo, count), a = Math.floor(lo / step + 1e-9) * step, b = Math.ceil(hi / step - 1e-9) * step;
  // Avoid a domain that is mostly empty because of one nice step.
  var guard = 0;
  while ((b - a) / step > count + 2 && guard++ < 4) { step = niceStep(hi - lo, count - 1 - guard); a = Math.floor(lo / step + 1e-9) * step; b = Math.ceil(hi / step - 1e-9) * step; }
  var ticks = [];
  for (var v = a, i = 0; v <= b + step * 1e-6 && i < 50; v += step, i++) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toFixed(10));
  return { min: a, max: b, step: step, ticks: ticks };
}
function scaleLinear(d0, d1, r0, r1) {
  var k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  var f = function (v) { return r0 + (v - d0) * k; };
  f.invert = function (p) { return k === 0 ? d0 : d0 + (p - r0) / k; };
  f.domain = [d0, d1]; f.range = [r0, r1]; f.kind = 'linear';
  return f;
}
function scaleLog(d0, d1, r0, r1) {
  var a = Math.log10(d0), b = Math.log10(d1), k = (r1 - r0) / (b - a || 1);
  var f = function (v) { return v > 0 ? r0 + (Math.log10(v) - a) * k : NaN; };
  f.domain = [d0, d1]; f.range = [r0, r1]; f.kind = 'log';
  return f;
}
function logTicks(lo, hi) {
  var out = [], e0 = Math.floor(Math.log10(lo)), e1 = Math.ceil(Math.log10(hi));
  var mult = e1 - e0 > 3 ? [1] : [1, 2, 5];
  for (var e = e0; e <= e1; e++) mult.forEach(function (m) { var v = m * Math.pow(10, e); if (v >= lo * 0.999 && v <= hi * 1.001) out.push(+v.toPrecision(12)); });
  return out;
}
function niceLog(lo, hi) {
  lo = Math.max(lo, 1e-12);
  var a = Math.pow(10, Math.floor(Math.log10(lo))), b = Math.pow(10, Math.ceil(Math.log10(hi)));
  [2, 5].forEach(function (m) { if (a * m <= lo) a = a * m; });
  if (b / 2 >= hi) b = b / 2;
  return { min: a, max: b, ticks: logTicks(a, b) };
}
/* Band scale: f(key) → band start; f.bw = band width; f.step = distance. */
function scaleBand(keys, r0, r1, inner, outer) {
  inner = inner == null ? 0.3 : inner; outer = outer == null ? inner / 2 : outer;
  var n = keys.length || 1, step = (r1 - r0) / Math.max(1, n - inner + outer * 2), bw = step * (1 - inner);
  var idx = {}; keys.forEach(function (k, i) { idx[String(k)] = i; });
  var f = function (k) { var i = idx[String(k)]; return i == null ? NaN : r0 + step * outer + step * i; };
  f.bw = bw; f.step = step; f.keys = keys; f.kind = 'band';
  f.center = function (k) { return f(k) + bw / 2; };
  return f;
}
/* Point scale: evenly spaced positions with half-step padding by default. */
function scalePoint(keys, r0, r1, pad) {
  pad = pad == null ? 0.5 : pad;
  var n = keys.length, step = n > 1 ? (r1 - r0) / (n - 1 + pad * 2) : 0;
  var idx = {}; keys.forEach(function (k, i) { idx[String(k)] = i; });
  var f = function (k) { var i = idx[String(k)]; return i == null ? NaN : (n > 1 ? r0 + step * (pad + i) : (r0 + r1) / 2); };
  f.step = step; f.keys = keys; f.kind = 'point'; f.center = f; f.bw = 0;
  return f;
}
function scaleSqrt(maxV, maxR) { return function (v) { return v > 0 ? Math.sqrt(v / maxV) * maxR : 0; }; }

/* UTC time ticks: choose a unit so labels do not collide. */
var DAY = 864e5;
function timeTicks(t0, t1, maxTicks, lang) {
  var span = t1 - t0, candidates = [
    { unit: 'day', every: 1 }, { unit: 'day', every: 7 }, { unit: 'month', every: 1 }, { unit: 'month', every: 2 },
    { unit: 'quarter', every: 1 }, { unit: 'month', every: 6 }, { unit: 'year', every: 1 }, { unit: 'year', every: 2 },
    { unit: 'year', every: 5 }, { unit: 'year', every: 10 }];
  for (var c = 0; c < candidates.length; c++) {
    var cand = candidates[c], ticks = genTimeTicks(t0, t1, cand);
    if (ticks.length <= maxTicks) {
      var labelUnit = cand.unit === 'day' ? 'day' : cand.unit === 'quarter' ? 'quarter' : cand.unit === 'year' ? 'year' : 'month';
      if (cand.unit === 'month' && span > 400 * DAY) labelUnit = 'month';
      return ticks.map(function (t) { return { t: t, label: fmtDate(t, labelUnit, lang) }; });
    }
  }
  return [{ t: t0, label: fmtDate(t0, 'year', lang) }, { t: t1, label: fmtDate(t1, 'year', lang) }];
}
function genTimeTicks(t0, t1, cand) {
  var out = [], d = new Date(t0), y = d.getUTCFullYear(), m = d.getUTCMonth();
  if (cand.unit === 'day') {
    var start = Date.UTC(y, m, d.getUTCDate());
    if (cand.every === 7) { var dow = new Date(start).getUTCDay(); start += ((8 - dow) % 7) * DAY; }
    for (var t = start; t <= t1 && out.length < 400; t += cand.every * DAY) if (t >= t0) out.push(t);
    return out;
  }
  if (cand.unit === 'month' || cand.unit === 'quarter') {
    var every = cand.unit === 'quarter' ? 3 : cand.every;
    var mm = Math.ceil(m / every) * every, yy = y;
    for (var k = 0; k < 600; k++) {
      var tt = Date.UTC(yy + Math.floor(mm / 12), mm % 12, 1);
      if (tt > t1) break;
      if (tt >= t0) out.push(tt);
      mm += every;
    }
    return out;
  }
  var ys = Math.ceil(y / cand.every) * cand.every;
  if (Date.UTC(ys, 0, 1) < t0) ys += cand.every;
  for (var yr = ys; Date.UTC(yr, 0, 1) <= t1 && out.length < 200; yr += cand.every) out.push(Date.UTC(yr, 0, 1));
  return out;
}
function scaleTime(t0, t1, r0, r1) {
  var f = scaleLinear(t0, t1, r0, r1); f.kind = 'time'; return f;
}
