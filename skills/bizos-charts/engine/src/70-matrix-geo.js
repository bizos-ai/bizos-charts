/* 70-matrix-geo — H01 heatmap, H02 cohort triangle, G01 US state tiles,
   G02 China province tiles. Tile maps use equal-area squares: no external
   boundary files, and land area never masquerades as a value. */

function heatColor(c, v, e, center, ramp) {
  if (!isNum(v)) return null;
  if (center != null) { var m = Math.max(Math.abs(e[0] - center), Math.abs(e[1] - center)) || 1; return rampAt(c.pal.div, 0.5 + (v - center) / m / 2); }
  return rampAt(ramp || c.pal.seq, e[1] > e[0] ? (v - e[0]) / (e[1] - e[0]) : 0.5);
}
function rampLegend(c, x, y, w, e, center, fmtFn) {
  var out = '', n = 24, ramp = center != null ? c.pal.div : c.pal.seq;
  for (var i = 0; i < n; i++) out += rect(x + i * w / n, y, w / n + 0.5, 9, { fill: rampAt(ramp, i / (n - 1)) });
  out += text(x, y + 22, fmtFn(e[0]), { size: 11, fill: THEME.muted });
  if (center != null) out += text(x + w / 2, y + 22, fmtFn(center), { size: 11, fill: THEME.muted, anchor: 'middle' });
  out += text(x + w, y + 22, fmtFn(e[1]), { size: 11, fill: THEME.muted, anchor: 'end' });
  return out;
}

/* ── H01 Heatmap matrix ──────────────────────────────────────────────── */
register({
  id: 'H01', name: { zh: '热力矩阵', en: 'Heatmap matrix' },
  question: { zh: '两个维度交叉后，哪些组合的数值最高/最低？有无规律？', en: 'Across two dimensions, which combinations are highest or lowest, and is there a pattern?' },
  use: { zh: '星期 × 小时订单、站点 × 品类增速、相关系数矩阵（center:0）、价格段 × 评分。', en: 'Weekday × hour orders, marketplace × category growth, correlation matrices (center:0).' },
  avoid: { zh: '需要精确比较少数数值（用 C03）；格子 >400。', en: 'Precise comparison of a few values (use C03); more than 400 cells.' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '列维度', en: 'Column dimension' } },
    { key: 'row', role: 'category', required: true, desc: { zh: '行维度字段', en: 'Row dimension field' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '格子数值', en: 'Cell value' } }
  ],
  options: ['center（发散色中点，如 0）', 'labels:"auto"|"all"|"none"', 'rowOrder / colOrder'],
  keywords: { zh: ['热力图', '热力矩阵', '交叉分析', '星期小时', '相关矩阵', '相关系数', '矩阵'], en: ['heatmap', 'matrix', 'cross-tab', 'weekday hour', 'correlation matrix'] },
  aspect: 0.5,
  lint: function (s, add) { checkFields(s, add, [s.x, s.row, s.y]); var n = asArray(s.data).length; if (n > 400) add('warning', 'W_ITEMS', n + ' 格：过密，按更粗粒度聚合'); },
  render: function (c) {
    var s = c.spec, data = asArray(s.data), cols = s.colOrder || uniq(data.map(function (r) { return String(r[s.x]); })), rows = s.rowOrder || uniq(data.map(function (r) { return String(r[s.row]); }));
    var map = {}; data.forEach(function (r) { map[String(r[s.row]) + '|' + String(r[s.x])] = num(r[s.y]); });
    var vals = data.map(function (r) { return num(r[s.y]); }).filter(isNum), e = extent(vals), center = s.center != null ? num(s.center) : null;
    var labW = Math.min(c.W * 0.28, Math.max.apply(null, rows.map(function (r) { return textW(r, c.fs); })) + 12), top = 22;
    var cw = (c.W - labW - 4) / cols.length, ch = clamp(cw * 0.62, 20, 34), H = top + ch * rows.length + 40, out = '';
    var showLab = s.labels === 'all' || (s.labels !== 'none' && cw >= Math.max.apply(null, vals.map(function (v) { return textW(c.fmt(v), 11); })) + 6 && ch >= 18);
    var every = Math.max(1, Math.ceil((Math.max.apply(null, cols.map(function (k) { return textW(k, c.fs); })) + 6) / cw));
    cols.forEach(function (k, j) { if (j % every === 0) out += text(labW + cw * (j + 0.5), top - 8, k, { anchor: 'middle', size: c.fs, fill: THEME.ink2 }); });
    rows.forEach(function (rk, i) {
      out += text(labW - 8, top + ch * (i + 0.5), rk, { anchor: 'end', baseline: 'middle', size: c.fs, fill: THEME.ink });
      cols.forEach(function (k, j) {
        var v = map[rk + '|' + k], x = labW + cw * j, y = top + ch * i, fill = heatColor(c, v, e, center);
        out += rect(x, y, cw, ch, { fill: fill || '#FFFFFF', stroke: '#FFFFFF', strokeWidth: 1, cls: 'bz-hit', data: tip(rk + ' · ' + k, [[labelOf(s, s.y), c.fmt(v)]]) });
        if (!isNum(v)) out += line(x + 4, y + ch - 4, x + cw - 4, y + 4, { stroke: THEME.grid });
        else if (showLab) out += text(x + cw / 2, y + ch / 2, c.fmt(v), { anchor: 'middle', baseline: 'middle', size: 11, fill: inkOn(fill) });
      });
    });
    out += rampLegend(c, labW, H - 30, Math.min(220, c.W - labW - 10), e, center, function (v) { return c.fmt(v); });
    if (data.length < rows.length * cols.length) c.notesExtra.push(c.lang === 'en' ? 'Crossed cells have no data.' : '斜线格为无数据。');
    c.setTable([c.t('category')].concat(cols), rows.map(function (rk) { return [rk].concat(cols.map(function (k) { return c.fmt(map[rk + '|' + k]); })); }), rows.map(function (rk) { return [rk].concat(cols.map(function (k) { return map[rk + '|' + k]; })); }));
    return { svg: out, height: H };
  }
});

/* ── H02 Cohort triangle ─────────────────────────────────────────────── */
register({
  id: 'H02', name: { zh: '同期群留存三角', en: 'Cohort retention triangle' },
  question: { zh: '不同月份获得的客户，此后各期还剩多少（复购/留存）？新客质量在变好吗？', en: 'Of customers acquired each month, how many remain or repurchase later; is cohort quality improving?' },
  use: { zh: '复购率、会员留存、订阅续费的同期群分析；每行一个获客期。', en: 'Repeat-purchase, membership or subscription retention by acquisition cohort.' },
  avoid: { zh: '没有按获客期追踪的个体数据（不能用总量反推）。', en: 'Without cohort-tracked customer data (cannot be reverse-engineered from totals).' },
  fields: [
    { key: 'x', role: 'category', required: true, desc: { zh: '获客期（同期群）', en: 'Cohort (acquisition period)' } },
    { key: 'offset', role: 'ordinal', required: true, desc: { zh: '距获客期的期数（0、1、2…）字段', en: 'Periods since acquisition (0, 1, 2 …)' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '留存率/复购率（%）', en: 'Retention or repeat rate (%)' } },
    { key: 'size', role: 'measure', required: false, desc: { zh: '同期群规模（首期人数）字段', en: 'Cohort size field' } }
  ],
  options: ['size'],
  keywords: { zh: ['同期群', 'cohort', '留存', '复购', '复购率', '客户留存', '会员'], en: ['cohort', 'retention', 'repeat purchase', 'churn', 'triangle'] },
  aspect: 0.5, needsUnit: false,
  lint: function (s, add) { checkFields(s, add, [s.x, s.offset, s.y, s.size]); },
  render: function (c) {
    var s = c.spec, data = asArray(s.data), cohorts = uniq(data.map(function (r) { return String(r[s.x]); })), offs = uniq(data.map(function (r) { return num(r[s.offset]); })).filter(isNum).sort(function (a, b) { return a - b; });
    var map = {}, size = {}; data.forEach(function (r) { map[String(r[s.x]) + '|' + num(r[s.offset])] = num(r[s.y]); if (s.size && isNum(num(r[s.size]))) size[String(r[s.x])] = num(r[s.size]); });
    var vals = data.filter(function (r) { return num(r[s.offset]) > 0; }).map(function (r) { return num(r[s.y]); }).filter(isNum), e = extent(vals);
    var labW = Math.max.apply(null, cohorts.map(function (k) { return textW(xLabel(c, k), c.fs); })) + 12, sizeW = s.size ? 64 : 0, top = 40;
    var cw = (c.W - labW - sizeW - 4) / offs.length, ch = 24, H = top + ch * cohorts.length + 42, out = '', f = s.format.type === 'none' ? normFmt('percent') : s.format;
    out += text(labW + sizeW + cw * offs.length / 2, 8, (c.lang === 'en' ? 'Periods since acquisition →' : '距获客期数 →'), { anchor: 'middle', baseline: 'top', size: 11, fill: THEME.muted });
    offs.forEach(function (o, j) { out += text(labW + sizeW + cw * (j + 0.5), top - 6, String(o), { anchor: 'middle', size: c.fs, fill: THEME.ink2 }); });
    if (s.size) out += text(labW + sizeW - 8, top - 6, c.lang === 'en' ? 'Size' : '规模', { anchor: 'end', size: c.fs, fill: THEME.ink2 });
    cohorts.forEach(function (k, i) {
      var y = top + ch * i;
      out += text(labW - 8, y + ch / 2, xLabel(c, k), { anchor: 'end', baseline: 'middle', size: c.fs, fill: THEME.ink });
      if (s.size) out += text(labW + sizeW - 8, y + ch / 2, fmtNum(size[k], 'integer', c.lang), { anchor: 'end', baseline: 'middle', size: 11, fill: THEME.muted });
      offs.forEach(function (o, j) {
        var v = map[k + '|' + o]; if (!isNum(v)) return;
        var fill = o === 0 ? '#F4F5F7' : heatColor(c, v, e, null), x = labW + sizeW + cw * j;
        out += rect(x, y, cw, ch, { fill: fill, stroke: '#FFFFFF', strokeWidth: 1, cls: 'bz-hit', data: tip(xLabel(c, k) + ' · +' + o, [[labelOf(s, s.y), fmtNum(v, f, c.lang)]]) });
        if (cw >= textW(fmtNum(v, f, c.lang), 11) + 4) out += text(x + cw / 2, y + ch / 2, fmtNum(v, f, c.lang), { anchor: 'middle', baseline: 'middle', size: 11, fill: o === 0 ? THEME.muted : inkOn(fill) });
      });
    });
    out += rampLegend(c, labW + sizeW, H - 30, Math.min(220, c.W - labW - sizeW - 10), e, null, function (v) { return fmtNum(v, f, c.lang); });
    c.notesExtra.push(c.lang === 'en' ? 'Each row is one acquisition cohort; period 0 = 100% by definition; shading excludes period 0.' : '每行为一个获客期；第 0 期按定义为 100%，不参与着色。');
    c.setTable([c.t('cohort')].concat(s.size ? [c.lang === 'en' ? 'Size' : '规模'] : [], offs.map(String)), cohorts.map(function (k) { return [xLabel(c, k)].concat(s.size ? [fmtNum(size[k], 'integer', c.lang)] : [], offs.map(function (o) { return fmtNum(map[k + '|' + o], f, c.lang); })); }));
    return { svg: out, height: H };
  }
});

/* ── G01 / G02 tile maps ─────────────────────────────────────────────── */
var US_TILES = { AK: [0, 0], ME: [10, 0], VT: [9, 1], NH: [10, 1], WA: [0, 2], ID: [1, 2], MT: [2, 2], ND: [3, 2], MN: [4, 2], IL: [5, 2], WI: [6, 2], MI: [7, 2], NY: [8, 2], RI: [9, 2], MA: [10, 2],
  OR: [0, 3], NV: [1, 3], WY: [2, 3], SD: [3, 3], IA: [4, 3], IN: [5, 3], OH: [6, 3], PA: [7, 3], NJ: [8, 3], CT: [9, 3],
  CA: [0, 4], UT: [1, 4], CO: [2, 4], NE: [3, 4], MO: [4, 4], KY: [5, 4], WV: [6, 4], VA: [7, 4], MD: [8, 4], DE: [9, 4],
  AZ: [1, 5], NM: [2, 5], KS: [3, 5], AR: [4, 5], TN: [5, 5], NC: [6, 5], SC: [7, 5], DC: [8, 5],
  OK: [3, 6], LA: [4, 6], MS: [5, 6], AL: [6, 6], GA: [7, 6], HI: [0, 7], TX: [3, 7], FL: [8, 7] };
var US_NAMES = { Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY' };
var CN_TILES = { '黑龙江': [8, 0], '吉林': [8, 1], '内蒙古': [5, 1], '辽宁': [8, 2], '北京': [6, 2], '天津': [7, 2], '河北': [5, 2], '山西': [4, 2], '宁夏': [3, 2], '新疆': [1, 2],
  '青海': [2, 3], '甘肃': [3, 3], '陕西': [4, 3], '河南': [5, 3], '山东': [6, 3], '西藏': [1, 4], '四川': [2, 4], '重庆': [3, 4], '湖北': [4, 4], '安徽': [5, 4], '江苏': [6, 4], '上海': [7, 4],
  '云南': [2, 5], '贵州': [3, 5], '湖南': [4, 5], '江西': [5, 5], '浙江': [6, 5], '广西': [3, 6], '广东': [4, 6], '福建': [5, 6], '台湾': [7, 6], '海南': [3, 7], '澳门': [4, 7], '香港': [5, 7] };
var CN_EN = { Heilongjiang: '黑龙江', Jilin: '吉林', 'Inner Mongolia': '内蒙古', Liaoning: '辽宁', Beijing: '北京', Tianjin: '天津', Hebei: '河北', Shanxi: '山西', Ningxia: '宁夏', Xinjiang: '新疆', Qinghai: '青海', Gansu: '甘肃', Shaanxi: '陕西', Henan: '河南', Shandong: '山东', Tibet: '西藏', Xizang: '西藏', Sichuan: '四川', Chongqing: '重庆', Hubei: '湖北', Anhui: '安徽', Jiangsu: '江苏', Shanghai: '上海', Yunnan: '云南', Guizhou: '贵州', Hunan: '湖南', Jiangxi: '江西', Zhejiang: '浙江', Guangxi: '广西', Guangdong: '广东', Fujian: '福建', Taiwan: '台湾', Hainan: '海南', Macau: '澳门', Macao: '澳门', 'Hong Kong': '香港' };
var CN_ABBR_EN = { '黑龙江': 'HL', '吉林': 'JL', '内蒙古': 'NM', '辽宁': 'LN', '北京': 'BJ', '天津': 'TJ', '河北': 'HE', '山西': 'SX', '宁夏': 'NX', '新疆': 'XJ', '青海': 'QH', '甘肃': 'GS', '陕西': 'SN', '河南': 'HA', '山东': 'SD', '西藏': 'XZ', '四川': 'SC', '重庆': 'CQ', '湖北': 'HB', '安徽': 'AH', '江苏': 'JS', '上海': 'SH', '云南': 'YN', '贵州': 'GZ', '湖南': 'HN', '江西': 'JX', '浙江': 'ZJ', '广西': 'GX', '广东': 'GD', '福建': 'FJ', '台湾': 'TW', '海南': 'HI', '澳门': 'MO', '香港': 'HK' };
function cnKey(name) {
  var n = String(name).trim();
  if (CN_EN[n]) return CN_EN[n];
  n = n.replace(/(维吾尔|壮族|回族)?自治区$|特别行政区$|省$|市$/, '');
  return CN_TILES[n] ? n : null;
}
function usKey(name) { var n = String(name).trim(); if (US_TILES[n.toUpperCase()]) return n.toUpperCase(); return US_NAMES[n] || null; }
function tileMap(c, tiles, keyFn, labelFn, cols, rows) {
  var s = c.spec, data = asArray(s.data), map = {}, unknown = [];
  data.forEach(function (r) { var k = keyFn(r[s.x]); if (k) map[k] = num(r[s.y]); else unknown.push(String(r[s.x])); });
  var vals = Object.keys(map).map(function (k) { return map[k]; }).filter(isNum), e = extent(vals), center = s.center != null ? num(s.center) : null;
  var cls = s.scale === 'linear' || center != null ? null : classBreaks(vals, 'quantile', 5);
  var colorFn = function (v) { if (!isNum(v)) return null; if (cls) { var ramp = c.pal.seq.slice(1); return ramp[Math.round(classOf(cls, v) * (ramp.length - 1) / Math.max(1, cls.length - 2))]; } return heatColor(c, v, e, center); };
  var gap = 3, size = Math.min((c.W - 4) / cols - gap, 58), H = rows * (size + gap) + 48, x0 = (c.W - cols * (size + gap)) / 2, out = '';
  Object.keys(tiles).forEach(function (k) {
    var p = tiles[k], x = x0 + p[0] * (size + gap), y = p[1] * (size + gap), v = map[k], fill = colorFn(v) || '#FFFFFF';
    out += rect(x, y, size, size, { fill: fill, stroke: isNum(v) ? null : THEME.grid, cls: 'bz-hit', data: tip(labelFn(k, true), [[labelOf(s, s.y), isNum(v) ? c.fmt(v) : c.t('noData')]]) });
    var tc = isNum(v) ? inkOn(fill) : THEME.faint;
    out += text(x + size / 2, y + size / 2 - (size > 34 ? 6 : 0), labelFn(k, false), { anchor: 'middle', baseline: 'middle', size: size > 40 ? 12 : 11, weight: 600, fill: tc });
    if (size > 34 && isNum(v)) out += text(x + size / 2, y + size / 2 + 9, c.fmt(v), { anchor: 'middle', baseline: 'middle', size: 11, fill: tc });
  });
  if (cls) out += classLegend(c, cls, colorFn, x0, H - 36, c.lang === 'en' ? 'Quintiles' : '五分位分档');
  else out += rampLegend(c, x0, H - 36, Math.min(220, c.W - x0 - 10), e, center, function (v) { return c.fmt(v); });
  c.notesExtra.push(c.t('sameArea'));
  if (unknown.length) c.notesExtra.push((c.lang === 'en' ? 'Unmatched names: ' : '未匹配地区：') + unknown.join(', '));
  c.setTable([c.lang === 'en' ? 'Region' : '地区', labelOf(s, s.y)], data.map(function (r) { return [String(r[s.x]), c.fmt(r[s.y])]; }), data.map(function (r) { return [r[s.x], r[s.y]]; }));
  return { svg: out, height: H };
}
register({
  id: 'G01', name: { zh: '美国分州瓦片地图', en: 'US state tile map' },
  question: { zh: '各州数值（销量、订单、渗透率）高低如何分布，有无区域集中？', en: 'How do state-level values (sales, orders, penetration) vary, and are they regionally concentrated?' },
  use: { zh: '美国站按收货州的销售/订单/客单价；每州等面积方块，避免大州在视觉上被夸大。', en: 'US sales, orders or AOV by ship-to state; equal tiles avoid over-weighting large states.' },
  avoid: { zh: '需要精确地理位置或城市级数据。', en: 'Exact geography or city-level data.' },
  fields: [
    { key: 'x', role: 'geo', required: true, desc: { zh: '州代码（CA）或英文州名', en: 'State code (CA) or name' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '数值', en: 'Value' } }
  ],
  options: ['scale:"quantile"(默认)|"linear"', 'center'],
  keywords: { zh: ['美国地图', '分州', '州', '地域分布', '收货地', '区域'], en: ['us map', 'state', 'tile map', 'geography', 'regional'] },
  aspect: 0.6,
  lint: function (s, add) { checkFields(s, add, [s.x, s.y]); var bad = asArray(s.data).filter(function (r) { return !usKey(r[s.x]); }).map(function (r) { return r[s.x]; }); if (bad.length) add('warning', 'W_GEO', '无法识别的州：' + bad.slice(0, 5).join(', ')); },
  render: function (c) { return tileMap(c, US_TILES, usKey, function (k) { return k; }, 11, 8); }
});
register({
  id: 'G02', name: { zh: '中国省级瓦片地图', en: 'China province tile map' },
  question: { zh: '各省份数值（卖家数、工厂、销量）如何分布，集中在哪些省？', en: 'How do province-level values (sellers, factories, sales) vary, and where do they concentrate?' },
  use: { zh: '卖家/供应商所在地、各省销量；等面积方块，含港澳台。', en: 'Seller or supplier locations, provincial sales; equal tiles, including HK, Macao and Taiwan.' },
  avoid: { zh: '城市级或需要精确边界的分析。', en: 'City-level analysis or exact boundaries.' },
  fields: [
    { key: 'x', role: 'geo', required: true, desc: { zh: '省份名（广东/广东省/Guangdong）', en: 'Province name (广东 / Guangdong)' } },
    { key: 'y', role: 'measure', required: true, desc: { zh: '数值', en: 'Value' } }
  ],
  options: ['scale:"quantile"(默认)|"linear"', 'center'],
  keywords: { zh: ['中国地图', '省份', '分省', '卖家所在地', '地域分布', '区域'], en: ['china map', 'province', 'tile map', 'seller location', 'regional'] },
  aspect: 0.75,
  lint: function (s, add) { checkFields(s, add, [s.x, s.y]); var bad = asArray(s.data).filter(function (r) { return !cnKey(r[s.x]); }).map(function (r) { return r[s.x]; }); if (bad.length) add('warning', 'W_GEO', '无法识别的省份：' + bad.slice(0, 5).join(', ')); },
  render: function (c) { return tileMap(c, CN_TILES, cnKey, function (k, full) { return c.lang === 'en' ? (full ? (Object.keys(CN_EN).filter(function (e) { return CN_EN[e] === k; })[0] || k) : CN_ABBR_EN[k]) : k; }, 9, 8); }
});
