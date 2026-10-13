/* 15-stats — deterministic statistics behind the scientific exhibits
   (families E and B). Each routine is a standard estimator or test; the
   exhibit states the method in its notes and returns the computed numbers
   in render().stats so titles can quote them exactly. No random sampling. */

/* ── special functions ───────────────────────────────────────────────── */
var LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function lgamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  var a = LANCZOS[0], t = x + 7.5;
  for (var i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
/* Regularised incomplete gamma: series for P, continued fraction for Q. */
function gammaQcf(a, x) {
  var b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (var i = 1; i < 600; i++) {
    var an = -i * (i - a); b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; var del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}
function gammaPser(a, x) {
  var ap = a, s = 1 / a, del = s;
  for (var n = 0; n < 600; n++) { ap += 1; del *= x / ap; s += del; if (Math.abs(del) < Math.abs(s) * 1e-15) break; }
  return s * Math.exp(-x + a * Math.log(x) - lgamma(a));
}
function gammaQ(a, x) { if (x <= 0) return 1; return x < a + 1 ? 1 - gammaPser(a, x) : gammaQcf(a, x); }
/* Regularised incomplete beta I_x(a, b) (modified Lentz). */
function betaCf(a, b, x) {
  var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-300) d = 1e-300;
  d = 1 / d; var h = d;
  for (var m = 1; m <= 600; m++) {
    var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; var del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return h;
}
function betaI(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  var bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betaCf(a, b, x) / a : 1 - bt * betaCf(b, a, 1 - x) / b;
}
function betaPpf(p, a, b) {
  var lo = 0, hi = 1;
  for (var i = 0; i < 100; i++) { var mid = (lo + hi) / 2; if (betaI(mid, a, b) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
/* Normal distribution: complementary error function (relative error
   < 1.2e-7) and the inverse CDF (relative error < 1.2e-9). */
function erfc(x) {
  var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
    t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
function normCdf(z) { return 0.5 * erfc(-z / Math.SQRT2); }
function normSf(z) { return 0.5 * erfc(z / Math.SQRT2); }
function normPpf(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  var q, r;
  if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  q = p - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
var Z975 = 1.959963984540054;
/* Student t: CDF, two-sided p and quantile; chi-square upper tail. */
function tCdf(t, df) {
  if (!isFinite(t)) return t > 0 ? 1 : 0;
  var tail = 0.5 * betaI(df / (df + t * t), df / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
}
function tP2(t, df) { return isFinite(t) ? betaI(df / (df + t * t), df / 2, 0.5) : 0; }
function tPpf(p, df) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (!(df < 1e7)) return normPpf(p);
  var lo = -1, hi = 1;
  while (tCdf(lo, df) > p && lo > -1e12) lo *= 2;
  while (tCdf(hi, df) < p && hi < 1e12) hi *= 2;
  for (var i = 0; i < 200 && hi - lo > 1e-12 * Math.max(1, Math.abs(hi)); i++) { var mid = (lo + hi) / 2; if (tCdf(mid, df) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
function chi2Sf(x, k) { return x <= 0 ? 1 : gammaQ(k / 2, x / 2); }

/* ── small linear algebra (≤ 8 × 8) ──────────────────────────────────── */
function solveLinear(A, b) {
  var n = b.length, M = A.map(function (row, i) { return row.slice().concat([b[i]]); });
  for (var c = 0; c < n; c++) {
    var piv = c;
    for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-300) return null;
    var tmp = M[c]; M[c] = M[piv]; M[piv] = tmp;
    for (var r2 = 0; r2 < n; r2++) {
      if (r2 === c) continue;
      var f = M[r2][c] / M[c][c];
      for (var k = c; k <= n; k++) M[r2][k] -= f * M[c][k];
    }
  }
  return M.map(function (row, i) { return row[n] / row[i]; });
}
function invertMatrix(A) {
  var n = A.length, cols = [];
  for (var j = 0; j < n; j++) {
    var e = []; for (var i = 0; i < n; i++) e.push(i === j ? 1 : 0);
    var x = solveLinear(A, e);
    if (!x) return null;
    cols.push(x);
  }
  return A.map(function (_, i) { return cols.map(function (col) { return col[i]; }); });
}

/* ── descriptive statistics ──────────────────────────────────────────── */
function describe(vals) {
  var v = sortNum(vals), n = v.length;
  if (!n) return null;
  var m = sum(v) / n, ss = 0;
  for (var i = 0; i < n; i++) ss += (v[i] - m) * (v[i] - m);
  var sd = n > 1 ? Math.sqrt(ss / (n - 1)) : null, sem = sd != null ? sd / Math.sqrt(n) : null;
  return { n: n, mean: m, sd: sd, sem: sem, ci: sem != null ? tPpf(0.975, n - 1) * sem : null,
    median: quantile(v, 0.5), q1: quantile(v, 0.25), q3: quantile(v, 0.75), min: v[0], max: v[n - 1] };
}
/* Centre and interval for an error-bar definition. */
function errorInterval(st, kind) {
  if (!st) return null;
  if (kind === 'iqr') return { c: st.median, lo: st.q1, hi: st.q3 };
  if (kind === 'range') return { c: st.median, lo: st.min, hi: st.max };
  var h = kind === 'sem' ? st.sem : kind === 'ci95' ? st.ci : st.sd;
  if (h == null) return { c: st.mean, lo: st.mean, hi: st.mean };
  return { c: st.mean, lo: st.mean - h, hi: st.mean + h };
}
/* Average ranks (ties share the mean rank). */
function rankAvg(vals) {
  var idx = vals.map(function (v, i) { return i; }).sort(function (a, b) { return vals[a] - vals[b]; });
  var r = new Array(vals.length), i = 0;
  while (i < idx.length) {
    var j = i;
    while (j + 1 < idx.length && vals[idx[j + 1]] === vals[idx[i]]) j++;
    for (var k = i; k <= j; k++) r[idx[k]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}
function pearson(x, y) {
  var px = [], py = [];
  for (var i = 0; i < x.length; i++) if (isNum(x[i]) && isNum(y[i])) { px.push(x[i]); py.push(y[i]); }
  var n = px.length;
  if (n < 3) return { r: null, n: n, p: null };
  var mx = sum(px) / n, my = sum(py) / n, sxx = 0, syy = 0, sxy = 0;
  for (var k = 0; k < n; k++) { sxx += (px[k] - mx) * (px[k] - mx); syy += (py[k] - my) * (py[k] - my); sxy += (px[k] - mx) * (py[k] - my); }
  if (!sxx || !syy) return { r: null, n: n, p: null };
  var r = clamp(sxy / Math.sqrt(sxx * syy), -1, 1);
  var p = Math.abs(r) >= 1 ? 0 : tP2(r * Math.sqrt((n - 2) / (1 - r * r)), n - 2);
  return { r: r, n: n, p: p };
}
function spearman(x, y) {
  var px = [], py = [];
  for (var i = 0; i < x.length; i++) if (isNum(x[i]) && isNum(y[i])) { px.push(x[i]); py.push(y[i]); }
  return pearson(rankAvg(px), rankAvg(py));
}
/* Ordinary least squares with slope inference. */
function olsFit(xs, ys) {
  var px = [], py = [];
  for (var i = 0; i < xs.length; i++) if (isNum(xs[i]) && isNum(ys[i])) { px.push(xs[i]); py.push(ys[i]); }
  var n = px.length;
  if (n < 3) return null;
  var mx = sum(px) / n, my = sum(py) / n, sxx = 0, sxy = 0, syy = 0;
  for (var k = 0; k < n; k++) { sxx += (px[k] - mx) * (px[k] - mx); sxy += (px[k] - mx) * (py[k] - my); syy += (py[k] - my) * (py[k] - my); }
  if (!sxx) return null;
  var b = sxy / sxx, a = my - b * mx, sse = Math.max(0, syy - b * sxy), se = Math.sqrt(sse / (n - 2) / sxx);
  return { a: a, b: b, r2: syy ? 1 - sse / syy : 0, n: n, seB: se, p: se > 0 ? tP2(b / se, n - 2) : 0 };
}
/* Multiple-comparison adjustment: holm | bonferroni | bh (Benjamini–Hochberg). */
function pAdjust(ps, method) {
  var m = ps.length, out = ps.slice();
  if (!method || method === 'none' || m < 2) return out;
  var idx = ps.map(function (p, i) { return i; }).sort(function (a, b) { return ps[a] - ps[b]; });
  if (method === 'bonferroni') return ps.map(function (p) { return Math.min(1, p * m); });
  if (method === 'holm') {
    var run = 0;
    idx.forEach(function (i, k) { run = Math.max(run, Math.min(1, (m - k) * ps[i])); out[i] = run; });
    return out;
  }
  if (method === 'bh') {
    var best = 1;
    for (var k = m - 1; k >= 0; k--) { var i = idx[k]; best = Math.min(best, Math.min(1, ps[i] * m / (k + 1))); out[i] = best; }
    return out;
  }
  return out;
}

/* ── two-group tests ─────────────────────────────────────────────────── */
function welchT(a, b) {
  var A = describe(a), B = describe(b);
  if (!A || !B || A.n < 2 || B.n < 2) return null;
  var va = A.sd * A.sd / A.n, vb = B.sd * B.sd / B.n, se = Math.sqrt(va + vb);
  if (!(se > 0)) return null;
  var df = (va + vb) * (va + vb) / (va * va / (A.n - 1) + vb * vb / (B.n - 1)), t = (A.mean - B.mean) / se, q = tPpf(0.975, df), diff = A.mean - B.mean;
  return { method: 'welch', t: t, df: df, p: tP2(t, df), diff: diff, lo: diff - q * se, hi: diff + q * se };
}
function studentT(a, b) {
  var A = describe(a), B = describe(b);
  if (!A || !B || A.n < 2 || B.n < 2) return null;
  var df = A.n + B.n - 2, sp2 = ((A.n - 1) * A.sd * A.sd + (B.n - 1) * B.sd * B.sd) / df, se = Math.sqrt(sp2 * (1 / A.n + 1 / B.n));
  if (!(se > 0)) return null;
  var t = (A.mean - B.mean) / se, q = tPpf(0.975, df), diff = A.mean - B.mean;
  return { method: 'student', t: t, df: df, p: tP2(t, df), diff: diff, lo: diff - q * se, hi: diff + q * se };
}
function pairedT(a, b) {
  var d = [];
  for (var i = 0; i < Math.min(a.length, b.length); i++) if (isNum(a[i]) && isNum(b[i])) d.push(a[i] - b[i]);
  var D = describe(d);
  if (!D || D.n < 2 || !(D.sem > 0)) return null;
  var t = D.mean / D.sem, q = tPpf(0.975, D.n - 1);
  return { method: 'paired-t', t: t, df: D.n - 1, p: tP2(t, D.n - 1), diff: D.mean, lo: D.mean - q * D.sem, hi: D.mean + q * D.sem, n: D.n };
}
/* Mann–Whitney U: exact null distribution without ties (n1 + n2 ≤ 60),
   otherwise the normal approximation with tie and continuity correction. */
function mannWhitney(a, b) {
  var A = a.filter(isNum), B = b.filter(isNum), n1 = A.length, n2 = B.length;
  if (!n1 || !n2) return null;
  var all = A.concat(B), r = rankAvg(all), R1 = 0;
  for (var i = 0; i < n1; i++) R1 += r[i];
  var U = R1 - n1 * (n1 + 1) / 2, N = n1 + n2, ties = 0, sorted = all.slice().sort(function (x, y) { return x - y; });
  for (var k = 0; k < N;) { var j = k; while (j + 1 < N && sorted[j + 1] === sorted[k]) j++; var t = j - k + 1; if (t > 1) ties += t * t * t - t; k = j + 1; }
  var lowU = Math.min(U, n1 * n2 - U);
  if (!ties && N <= 60) {
    var m = Math.min(n1, n2), other = Math.max(n1, n2), poly = [1];
    for (var s = 1; s <= m; s++) {
      var next = poly.slice();
      for (var z0 = 0; z0 < other + s; z0++) next.push(0);
      var mult = next.slice();
      for (var q = next.length - 1; q >= other + s; q--) mult[q] = next[q] - next[q - other - s];
      var div = mult.slice();
      for (var q2 = s; q2 < div.length; q2++) div[q2] = mult[q2] + div[q2 - s];
      poly = div.slice(0, m * other + 1);
    }
    var total = 0, below = 0;
    poly.forEach(function (cnt, u) { total += cnt; if (u <= lowU + 1e-9) below += cnt; });
    return { method: 'mannwhitney', U: U, p: Math.min(1, 2 * below / total), exact: true };
  }
  var mu = n1 * n2 / 2, sigma = Math.sqrt(n1 * n2 / 12 * ((N + 1) - ties / (N * (N - 1))));
  var z = sigma > 0 ? Math.max(0, Math.abs(U - mu) - 0.5) / sigma : 0;
  return { method: 'mannwhitney', U: U, p: Math.min(1, 2 * normSf(z)), exact: false };
}

/* ── survival ────────────────────────────────────────────────────────────
   Kaplan–Meier with Greenwood variance and log–log confidence limits;
   medians follow the usual convention (first time S(t) ≤ 0.5; midpoint
   when the curve sits exactly at 0.5). */
function kaplanMeier(times, events, conf) {
  var rows = [];
  for (var i = 0; i < times.length; i++) if (isNum(times[i]) && times[i] >= 0) rows.push({ t: times[i], e: events[i] ? 1 : 0 });
  rows.sort(function (a, b) { return a.t - b.t; });
  var n = rows.length, z = normPpf(1 - (1 - (conf || 0.95)) / 2);
  var steps = [{ t: 0, s: 1, lo: 1, hi: 1, n: n, d: 0 }], censor = [], s = 1, v = 0, risk = n, ev = 0, k = 0;
  while (k < n) {
    var t = rows[k].t, d = 0, c = 0;
    while (k < n && rows[k].t === t) { if (rows[k].e) d++; else c++; k++; }
    if (d > 0) {
      s *= 1 - d / risk;
      v = risk > d ? v + d / (risk * (risk - d)) : Infinity;
      var lo = 0, hi = 0;
      if (s > 0 && isFinite(v)) { var sig = Math.sqrt(v) / Math.abs(Math.log(s)); lo = Math.pow(s, Math.exp(z * sig)); hi = Math.pow(s, Math.exp(-z * sig)); }
      steps.push({ t: t, s: s, lo: lo, hi: hi, n: risk, d: d });
      ev += d;
    }
    if (c > 0) censor.push({ t: t, s: s, n: c });
    risk -= d + c;
  }
  var cross = function (key) {
    for (var j = 1; j < steps.length; j++) {
      if (steps[j][key] <= 0.5 + 1e-12) {
        if (Math.abs(steps[j][key] - 0.5) < 1e-12) { var nx = j + 1 < steps.length ? steps[j + 1].t : (n ? rows[n - 1].t : steps[j].t); return (steps[j].t + nx) / 2; }
        return steps[j].t;
      }
    }
    return null;
  };
  var maxT = n ? rows[n - 1].t : 0;
  return {
    n: n, events: ev, steps: steps, censor: censor, maxT: maxT,
    median: cross('s'), medianLo: cross('lo'), medianHi: cross('hi'),
    at: function (t) { var st = steps[0]; for (var j = 1; j < steps.length && steps[j].t <= t; j++) st = steps[j]; return t > maxT ? null : st; },
    atRisk: function (t) { var cnt = 0; for (var j = 0; j < n; j++) if (rows[j].t >= t) cnt++; return cnt; }
  };
}
/* Log-rank test for k groups: chi-square on k − 1 df. */
function logRank(groups) {
  var k = groups.length, all = [];
  groups.forEach(function (gr, gi) { gr.times.forEach(function (t, i) { if (isNum(t)) all.push({ t: t, e: gr.events[i] ? 1 : 0, g: gi }); }); });
  if (k < 2) return null;
  all.sort(function (a, b) { return a.t - b.t; });
  var risk = groups.map(function (gr) { return gr.times.filter(isNum).length; }), O = risk.map(function () { return 0; }), E = O.slice();
  var V = risk.map(function () { return risk.map(function () { return 0; }); }), i = 0;
  while (i < all.length) {
    var t = all[i].t, d = O.map(function () { return 0; }), c = d.slice();
    while (i < all.length && all[i].t === t) { if (all[i].e) d[all[i].g]++; else c[all[i].g]++; i++; }
    var D = sum(d), N = sum(risk);
    if (D > 0 && N > 0) {
      for (var j = 0; j < k; j++) { O[j] += d[j]; E[j] += D * risk[j] / N; }
      if (N > 1) for (var a = 0; a < k; a++) for (var b = 0; b < k; b++) V[a][b] += D * (N - D) / (N - 1) * (risk[a] / N) * ((a === b ? 1 : 0) - risk[b] / N);
    }
    for (var j2 = 0; j2 < k; j2++) risk[j2] -= d[j2] + c[j2];
  }
  var m = k - 1, diff = [], Vm = [];
  for (var r = 0; r < m; r++) { diff.push(O[r] - E[r]); Vm.push(V[r].slice(0, m)); }
  var inv = invertMatrix(Vm);
  if (!inv) return null;
  var chi2 = 0;
  for (var x = 0; x < m; x++) for (var y = 0; y < m; y++) chi2 += diff[x] * inv[x][y] * diff[y];
  return { chi2: chi2, df: m, p: chi2Sf(chi2, m), observed: O, expected: E };
}

/* ── diagnostic accuracy ─────────────────────────────────────────────────
   Empirical ROC (ties share a diagonal step), AUC by the trapezoid rule
   (= Mann–Whitney), DeLong standard error; precision–recall with average
   precision (step-wise). */
function lowerBound(arr, v) { var lo = 0, hi = arr.length; while (lo < hi) { var m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; } return lo; }
function upperBound(arr, v) { var lo = 0, hi = arr.length; while (lo < hi) { var m = (lo + hi) >> 1; if (arr[m] <= v) lo = m + 1; else hi = m; } return lo; }
function sampleVar(v) { var n = v.length; if (n < 2) return 0; var m = sum(v) / n, s = 0; for (var i = 0; i < n; i++) s += (v[i] - m) * (v[i] - m); return s / (n - 1); }
function rocCurve(scores, labels) {
  var pos = [], neg = [];
  for (var i = 0; i < scores.length; i++) { if (!isNum(scores[i]) || labels[i] == null) continue; (labels[i] ? pos : neg).push(scores[i]); }
  var n1 = pos.length, n0 = neg.length;
  if (!n1 || !n0) return null;
  var all = pos.map(function (s) { return { s: s, y: 1 }; }).concat(neg.map(function (s) { return { s: s, y: 0 }; })).sort(function (a, b) { return b.s - a.s; });
  var tp = 0, fp = 0, pts = [{ fpr: 0, tpr: 0, thr: null }], k = 0;
  while (k < all.length) { var thr = all[k].s; while (k < all.length && all[k].s === thr) { if (all[k].y) tp++; else fp++; k++; } pts.push({ fpr: fp / n0, tpr: tp / n1, thr: thr }); }
  var auc = 0;
  for (var j = 1; j < pts.length; j++) auc += (pts[j].fpr - pts[j - 1].fpr) * (pts[j].tpr + pts[j - 1].tpr) / 2;
  var negS = neg.slice().sort(function (a, b) { return a - b; }), posS = pos.slice().sort(function (a, b) { return a - b; });
  var v10 = pos.map(function (x) { var l = lowerBound(negS, x), u = upperBound(negS, x); return (l + 0.5 * (u - l)) / n0; });
  var v01 = neg.map(function (y) { var l = lowerBound(posS, y), u = upperBound(posS, y); return 1 - (l + 0.5 * (u - l)) / n1; });
  var se = Math.sqrt(sampleVar(v10) / n1 + sampleVar(v01) / n0);
  var best = null;
  pts.forEach(function (p) { if (p.thr != null && (!best || p.tpr - p.fpr > best.j + 1e-12)) best = { j: p.tpr - p.fpr, thr: p.thr, sens: p.tpr, spec: 1 - p.fpr, fpr: p.fpr }; });
  return { points: pts, auc: auc, se: se, lo: clamp(auc - Z975 * se, 0, 1), hi: clamp(auc + Z975 * se, 0, 1), n1: n1, n0: n0, youden: best };
}
/* Paired DeLong test for two AUCs measured on the same subjects. */
function delongPaired(sa, sb, labels) {
  var A = [], B = [], Y = [];
  for (var i = 0; i < labels.length; i++) if (isNum(sa[i]) && isNum(sb[i]) && labels[i] != null) { A.push(sa[i]); B.push(sb[i]); Y.push(labels[i] ? 1 : 0); }
  var pi = [], ni = [];
  Y.forEach(function (y, k) { (y ? pi : ni).push(k); });
  var n1 = pi.length, n0 = ni.length;
  if (n1 < 2 || n0 < 2) return null;
  var comps = function (S) {
    var pv = pi.map(function (k) { return S[k]; }), nv = ni.map(function (k) { return S[k]; });
    var ns = nv.slice().sort(function (a, b) { return a - b; }), ps = pv.slice().sort(function (a, b) { return a - b; });
    var v10 = pv.map(function (x) { var l = lowerBound(ns, x), u = upperBound(ns, x); return (l + 0.5 * (u - l)) / n0; });
    var v01 = nv.map(function (y) { var l = lowerBound(ps, y), u = upperBound(ps, y); return 1 - (l + 0.5 * (u - l)) / n1; });
    return { v10: v10, v01: v01, auc: sum(v10) / n1 };
  };
  var cov = function (u, v) { var mu = sum(u) / u.length, mv = sum(v) / v.length, s = 0; for (var k = 0; k < u.length; k++) s += (u[k] - mu) * (v[k] - mv); return s / (u.length - 1); };
  var a = comps(A), b = comps(B);
  var v = (cov(a.v10, a.v10) + cov(b.v10, b.v10) - 2 * cov(a.v10, b.v10)) / n1 + (cov(a.v01, a.v01) + cov(b.v01, b.v01) - 2 * cov(a.v01, b.v01)) / n0;
  var se = Math.sqrt(Math.max(v, 0)), diff = a.auc - b.auc, z = se > 0 ? diff / se : 0;
  return { diff: diff, se: se, z: z, p: se > 0 ? 2 * normSf(Math.abs(z)) : 1, lo: diff - Z975 * se, hi: diff + Z975 * se, n1: n1, n0: n0 };
}
function prCurve(scores, labels) {
  var rows = [];
  for (var i = 0; i < scores.length; i++) if (isNum(scores[i]) && labels[i] != null) rows.push({ s: scores[i], y: labels[i] ? 1 : 0 });
  var n1 = rows.filter(function (r) { return r.y; }).length;
  if (!n1 || n1 === rows.length) return null;
  rows.sort(function (a, b) { return b.s - a.s; });
  var tp = 0, fp = 0, pts = [], ap = 0, prevR = 0, k = 0;
  while (k < rows.length) {
    var thr = rows[k].s;
    while (k < rows.length && rows[k].s === thr) { if (rows[k].y) tp++; else fp++; k++; }
    var rec = tp / n1, prec = tp / (tp + fp);
    ap += (rec - prevR) * prec; prevR = rec;
    pts.push({ recall: rec, precision: prec, thr: thr });
  }
  if (pts.length) pts.unshift({ recall: 0, precision: pts[0].precision, thr: null });
  return { points: pts, ap: ap, prevalence: n1 / rows.length, n1: n1, n0: rows.length - n1 };
}

/* ── agreement (Bland–Altman) ────────────────────────────────────────── */
function blandAltman(a, b, mode) {
  var means = [], diffs = [];
  for (var i = 0; i < Math.min(a.length, b.length); i++) {
    if (!isNum(a[i]) || !isNum(b[i])) continue;
    var m = (a[i] + b[i]) / 2;
    if (mode === 'percent' && !m) continue;
    means.push(m); diffs.push(mode === 'percent' ? 100 * (a[i] - b[i]) / m : a[i] - b[i]);
  }
  var D = describe(diffs);
  if (!D || D.n < 3) return null;
  var tq = tPpf(0.975, D.n - 1), seB = D.sd / Math.sqrt(D.n), seL = D.sd * Math.sqrt(3 / D.n);
  var lo = D.mean - Z975 * D.sd, hi = D.mean + Z975 * D.sd;
  return { n: D.n, means: means, diffs: diffs, bias: D.mean, sd: D.sd, loa: [lo, hi],
    biasCI: [D.mean - tq * seB, D.mean + tq * seB], loaCI: [[lo - tq * seL, lo + tq * seL], [hi - tq * seL, hi + tq * seL]],
    trend: olsFit(means, diffs) };
}

/* ── density ─────────────────────────────────────────────────────────── */
function bwSilverman(vals) {
  var st = describe(vals);
  if (!st || st.n < 2) return 1;
  var spread = Math.min(st.sd, (st.q3 - st.q1) / 1.34) || st.sd || Math.abs(st.mean) * 0.1 || 1;
  return 0.9 * spread * Math.pow(st.n, -0.2);
}
function kde(vals, bw, xs) {
  var n = vals.length, k = 1 / (n * bw * Math.sqrt(2 * Math.PI));
  return xs.map(function (x) { var s = 0; for (var i = 0; i < n; i++) { var u = (x - vals[i]) / bw; s += Math.exp(-0.5 * u * u); } return s * k; });
}

/* ── hierarchical clustering ───────────────────────────────────────────
   metric: euclidean | correlation (1 − r); linkage: average | complete |
   single. Ties break on the lower index, so the order is reproducible. */
function vecDist(a, b, metric) {
  if (metric === 'correlation') { var pr = pearson(a, b); return pr.r == null ? 1 : 1 - pr.r; }
  var s = 0, n = 0;
  for (var i = 0; i < a.length; i++) if (isNum(a[i]) && isNum(b[i])) { s += (a[i] - b[i]) * (a[i] - b[i]); n++; }
  return n ? Math.sqrt(s * a.length / n) : 0;
}
function hclust(vecs, metric, linkage) {
  var n = vecs.length, nodes = [], act = [], D = {};
  for (var i = 0; i < n; i++) { nodes.push({ id: i, leaf: i, size: 1, h: 0, min: i }); act.push(i); }
  var key = function (a, b) { return a < b ? a + ',' + b : b + ',' + a; };
  for (var x = 0; x < n; x++) for (var y = x + 1; y < n; y++) D[key(x, y)] = vecDist(vecs[x], vecs[y], metric);
  while (act.length > 1) {
    var best = null;
    for (var p = 0; p < act.length; p++) for (var q = p + 1; q < act.length; q++) {
      var d = D[key(act[p], act[q])];
      if (!best || d < best.d - 1e-12) best = { d: d, a: act[p], b: act[q] };
    }
    var A = nodes[best.a], B = nodes[best.b], id = nodes.length;
    var left = A.min <= B.min ? A : B, right = left === A ? B : A;
    nodes.push({ id: id, left: left, right: right, size: A.size + B.size, h: Math.max(best.d, A.h, B.h), min: Math.min(A.min, B.min) });
    act = act.filter(function (k) { return k !== best.a && k !== best.b; });
    act.forEach(function (k) {
      var da = D[key(k, best.a)], db = D[key(k, best.b)];
      D[key(k, id)] = linkage === 'complete' ? Math.max(da, db) : linkage === 'single' ? Math.min(da, db) : (da * A.size + db * B.size) / (A.size + B.size);
    });
    act.push(id);
  }
  var root = nodes[act[0]], order = [];
  (function walk(nd) { if (nd.leaf != null) order.push(nd.leaf); else { walk(nd.left); walk(nd.right); } })(root);
  return { root: root, order: order };
}

/* ── four-parameter logistic fit (Levenberg–Marquardt) ──────────────────
   y = bottom + (top − bottom) / (1 + 10^((logEC50 − x) · hill)), x = log10
   concentration. Returns estimates, asymptotic standard errors and the 95%
   CI of EC50/IC50 from the CI of logEC50. */
var P4 = ['bottom', 'top', 'logec50', 'hill'];
function f4pl(p, x) { return p.bottom + (p.top - p.bottom) / (1 + Math.pow(10, (p.logec50 - x) * p.hill)); }
function fit4PL(xs, ys, fixed) {
  fixed = fixed || {};
  var X = [], Y = [];
  for (var i = 0; i < xs.length; i++) if (isNum(xs[i]) && isNum(ys[i])) { X.push(xs[i]); Y.push(ys[i]); }
  var free = P4.filter(function (k) { return fixed[k] == null; }), n = X.length;
  if (n <= free.length) return null;
  var ux = uniq(X).sort(function (a, b) { return a - b; }), mY = ux.map(function (x) { return mean(Y.filter(function (y, j) { return X[j] === x; })); });
  var e = extent(mY), pr = pearson(X, Y);
  var p = { bottom: e[0], top: e[1], hill: (pr.r || 0) < 0 ? -1 : 1, logec50: 0 };
  var mid = (e[0] + e[1]) / 2, bi = 0;
  mY.forEach(function (v, j) { if (Math.abs(v - mid) < Math.abs(mY[bi] - mid)) bi = j; });
  p.logec50 = ux[bi];
  P4.forEach(function (k) { if (fixed[k] != null) p[k] = fixed[k]; });
  var sse = function (pp) { var s = 0; for (var j = 0; j < n; j++) { var r = Y[j] - f4pl(pp, X[j]); s += r * r; } return s; };
  var jac = function (pp, x) {
    var u = Math.pow(10, (pp.logec50 - x) * pp.hill);
    if (!isFinite(u)) return { bottom: 1, top: 0, logec50: 0, hill: 0 };
    var D = 1 + u, g = (pp.top - pp.bottom) * u * Math.LN10 / (D * D);
    return { bottom: 1 - 1 / D, top: 1 / D, logec50: -g * pp.hill, hill: -g * (pp.logec50 - x) };
  };
  var lam = 1e-3, cur = sse(p), converged = false;
  for (var it = 0; it < 400; it++) {
    var JTJ = free.map(function () { return free.map(function () { return 0; }); }), JTr = free.map(function () { return 0; });
    for (var j = 0; j < n; j++) {
      var J = jac(p, X[j]), r = Y[j] - f4pl(p, X[j]);
      for (var a = 0; a < free.length; a++) { JTr[a] += J[free[a]] * r; for (var b = 0; b < free.length; b++) JTJ[a][b] += J[free[a]] * J[free[b]]; }
    }
    var improved = false;
    for (var tries = 0; tries < 12; tries++) {
      var A = JTJ.map(function (row, ai) { return row.map(function (v, bi2) { return ai === bi2 ? v * (1 + lam) + 1e-12 : v; }); });
      var delta = solveLinear(A, JTr);
      if (!delta) { lam *= 10; continue; }
      var trial = {}; P4.forEach(function (k) { trial[k] = p[k]; });
      free.forEach(function (k, ai) { trial[k] += delta[ai]; });
      var s2 = sse(trial);
      if (isFinite(s2) && s2 < cur) { var rel = (cur - s2) / Math.max(cur, 1e-300); p = trial; cur = s2; lam = Math.max(lam / 10, 1e-12); improved = true; if (rel < 1e-12) converged = true; break; }
      lam *= 10;
    }
    if (!improved || converged) { converged = true; break; }
  }
  var df = n - free.length, s2r = cur / df, JTJ2 = free.map(function () { return free.map(function () { return 0; }); });
  for (var j3 = 0; j3 < n; j3++) { var J3 = jac(p, X[j3]); for (var a3 = 0; a3 < free.length; a3++) for (var b3 = 0; b3 < free.length; b3++) JTJ2[a3][b3] += J3[free[a3]] * J3[free[b3]]; }
  var cov = invertMatrix(JTJ2), se = {};
  free.forEach(function (k, ai) { se[k] = cov && cov[ai][ai] > 0 ? Math.sqrt(cov[ai][ai] * s2r) : null; });
  var tq = tPpf(0.975, df), lse = se.logec50, my = mean(Y), sst = 0;
  Y.forEach(function (y) { sst += (y - my) * (y - my); });
  return { bottom: p.bottom, top: p.top, logec50: p.logec50, hill: p.hill, ec50: Math.pow(10, p.logec50),
    ciLo: lse != null ? Math.pow(10, p.logec50 - tq * lse) : null, ciHi: lse != null ? Math.pow(10, p.logec50 + tq * lse) : null,
    se: se, sse: cur, df: df, n: n, r2: sst ? 1 - cur / sst : null, converged: converged, fixed: Object.keys(fixed).filter(function (k) { return fixed[k] != null; }) };
}

/* ── meta-analysis (inverse variance; random effects by DerSimonian–Laird).
   Study standard errors are recovered from 95% CIs (log scale for ratios). */
function metaPool(rows, ratio, model) {
  var ys = [], vs = [];
  rows.forEach(function (r) {
    var y = ratio ? Math.log(r.est) : r.est, l = ratio ? Math.log(r.lo) : r.lo, h = ratio ? Math.log(r.hi) : r.hi;
    var se = (h - l) / (2 * Z975);
    if (isNum(y) && se > 0) { ys.push(y); vs.push(se * se); }
  });
  var k = ys.length;
  if (k < 2) return null;
  var w = vs.map(function (v) { return 1 / v; }), sw = sum(w), yF = sum(ys.map(function (y, i) { return w[i] * y; })) / sw;
  var Q = sum(ys.map(function (y, i) { return w[i] * (y - yF) * (y - yF); })), df = k - 1, C = sw - sum(w.map(function (x) { return x * x; })) / sw;
  var tau2 = model === 'random' ? Math.max(0, (Q - df) / C) : 0;
  var wu = vs.map(function (v) { return 1 / (v + tau2); }), swu = sum(wu), est = sum(ys.map(function (y, i) { return wu[i] * y; })) / swu, se2 = Math.sqrt(1 / swu);
  var back = function (v) { return ratio ? Math.exp(v) : v; };
  return { model: model === 'random' ? 'random' : 'fixed', k: k, est: back(est), lo: back(est - Z975 * se2), hi: back(est + Z975 * se2), z: est / se2, p: 2 * normSf(Math.abs(est / se2)),
    Q: Q, df: df, pQ: chi2Sf(Q, df), I2: Q > df ? (Q - df) / Q * 100 : 0, tau2: tau2, weights: wu.map(function (x) { return x / swu * 100; }) };
}

/* ── Newick trees ────────────────────────────────────────────────────── */
function parseNewick(str) {
  var s = String(str || '').replace(/\s+(?=(?:[^']*'[^']*')*[^']*$)/g, ''), i = 0;
  var node = function () {
    var nd = { children: [], name: '', len: null };
    if (s[i] === '(') {
      i++; nd.children.push(node());
      while (s[i] === ',') { i++; nd.children.push(node()); }
      if (s[i] !== ')') throw new Error('Newick: missing ")" at ' + i);
      i++;
    }
    var lab = '';
    if (s[i] === '\'') { i++; while (i < s.length && s[i] !== '\'') lab += s[i++]; i++; }
    else { while (i < s.length && ',():;'.indexOf(s[i]) < 0) lab += s[i++]; lab = lab.replace(/_/g, ' '); }
    nd.name = lab;
    if (s[i] === ':') { i++; var nb = ''; while (i < s.length && ',();'.indexOf(s[i]) < 0) nb += s[i++]; nd.len = parseFloat(nb); }
    return nd;
  };
  var root = node();
  if (s[i] === ';') i++;
  if (i < s.length) throw new Error('Newick: unexpected "' + s.slice(i, i + 12) + '"');
  return root;
}

/* ── p-values in text ──────────────────────────────────────────────────── */
function fmtP(p, lang, sci) {
  var v = fmtNum(p, { type: 'pvalue', sci: !!sci }, lang);
  if (v.charAt(0) === '<' || v.charAt(0) === '>') return 'P ' + v.charAt(0) + ' ' + v.slice(1);
  return 'P = ' + v;
}
function pStars(p) { return p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : 'ns'; }
