/* 85-process — P01 timeline, P02 Gantt, M01 small multiples. */

function dayOf(v) { var s = String(v); if (ISO_DAY.test(s)) return parseDay(s); if (ISO_MONTH.test(s)) return parseDay(s + '-01'); if (/^\d{4}$/.test(s)) return parseDay(s + '-01-01'); return null; }

/* ── P01 Timeline ────────────────────────────────────────────────────── */
register({
  id: 'P01', name: { zh: '事件时间线', en: 'Event timeline' },
  question: { zh: '关键事件按什么顺序发生，间隔多长？', en: 'In what order did key events happen, and how far apart?' },
  use: { zh: '产品上市节点、政策/平台规则变化、融资与并购历程；≤16 个事件，可按类型着色。', en: 'Launch milestones, policy or platform rule changes, funding and M&A history; ≤16 events, coloured by type.' },
  avoid: { zh: '事件需要与数值走势对照（在 T01 中用 annotations）。', en: 'When events must be read against a metric (use T01 annotations).' },
  fields: [
    { key: 'x', role: 'date', required: true, desc: { zh: '日期（YYYY-MM-DD / YYYY-MM / YYYY）', en: 'Date (YYYY-MM-DD / YYYY-MM / YYYY)' } },
    { key: 'label', role: 'text', required: true, desc: { zh: '事件标题字段', en: 'Event title field' } },
    { key: 'category', role: 'category', required: false, desc: { zh: '事件类别字段（≤4 类着色）', en: 'Event category field (≤4 colours)' } }
  ],
  options: ['detail（说明字段）'],
  keywords: { zh: ['时间线', '大事记', '里程碑', '事件', '发展历程', '节点'], en: ['timeline', 'milestones', 'events', 'history', 'chronology'] },
  dataKind: 'rows', needsUnit: false, aspect: 0.42,
  lint: function (s, add) { checkFields(s, add, [s.x, s.label, s.category]); asArray(s.data).forEach(function (r) { if (dayOf(r[s.x]) == null) add('error', 'E_DATE', '无法识别的日期：' + r[s.x]); }); if (asArray(s.data).length > 16) add('warning', 'W_ITEMS', '事件超过 16 个：拆分或只保留关键节点'); },
  render: function (c) {
    var s = c.spec, ev = asArray(s.data).map(function (r) { return { t: dayOf(r[s.x]), d: String(r[s.x]), l: String(r[s.label]), det: s.detail ? String(r[s.detail] || '') : '', ty: s.category ? String(r[s.category]) : '' }; }).filter(function (e) { return e.t != null; }).sort(function (a, b) { return a.t - b.t; });
    var types = uniq(ev.map(function (e) { return e.ty; })).filter(Boolean), t0 = ev[0].t, t1 = ev[ev.length - 1].t, pad = (t1 - t0) * 0.03 || DAY * 30;
    var x = scaleTime(t0 - pad, t1 + pad, 12, c.W - 12), boxW = 150, lineH = 15, rows = [[], []];
    ev.forEach(function (e, i) {
      var px = x(e.t), side = i % 2, w = Math.min(boxW, Math.max(textW(e.l, c.fs, 600), textW(e.d, 11), textW(e.det, 11)) + 6);
      var x0 = clamp(px - w / 2, 2, c.W - 2 - w), lv = 0;
      while (rows[side].some(function (b) { return b.lv === lv && !(x0 + w + 6 < b.x0 || x0 > b.x1 + 6); }) && lv < 4) lv++;
      e.side = side; e.lv = lv; e.x0 = x0; e.w = w; e.px = px; rows[side].push({ x0: x0, x1: x0 + w, lv: lv });
    });
    var blockH = function () { return 3 * lineH + 6; }, levelsTop = Math.max.apply(null, ev.filter(function (e) { return !e.side; }).map(function (e) { return e.lv; }).concat([0])) + 1, levelsBot = Math.max.apply(null, ev.filter(function (e) { return e.side; }).map(function (e) { return e.lv; }).concat([-1])) + 1;
    var bh = blockH(), stem = 14, axisY = Math.round(levelsTop * bh + stem + 6) + .5, H = axisY + stem + levelsBot * bh + 24, out = '';
    out += line(12, axisY, c.W - 12, axisY, { stroke: THEME.ink2, width: 1.5 });
    var y0 = new Date(t0 - pad).getUTCFullYear(), y1 = new Date(t1 + pad).getUTCFullYear();
    for (var yr = y0 + 1; yr <= y1; yr++) { var px = x(Date.UTC(yr, 0, 1)); if (px > 20 && px < c.W - 20) { out += line(px, axisY - 5, px, axisY + 5, { stroke: THEME.ink2, width: 1.5 }); out += text(px + 4, H - 6, String(yr), { size: 11, weight: 600, fill: THEME.muted }); out += line(px, axisY + 5, px, H - 18, { stroke: THEME.grid, dash: '2 3' }); } }
    ev.forEach(function (e) {
      var col = e.ty ? c.color(e.ty, types.indexOf(e.ty)) : c.pal.primary, top = e.side === 0;
      var by = top ? axisY - stem - (e.lv + 1) * bh + 4 : axisY + stem + e.lv * bh + 2;
      out += line(e.px, axisY, e.px, top ? by + bh - 4 : by, { stroke: THEME.axis });
      out += circle(e.px, axisY, 5, { fill: col, stroke: '#FFFFFF', width: 1.5, cls: 'bz-hit', data: tip(e.l, [[c.lang === 'en' ? 'Date' : '日期', e.d]].concat(e.det ? [['', e.det]] : [])) });
      var tx = e.x0 + 3;
      out += rect(e.x0, by, e.w, bh - 6, { fill: '#FFFFFF' });
      out += line(e.x0, by, e.x0, by + bh - 6, { stroke: col, width: 2 });
      out += text(tx + 4, by + 11, e.d, { size: 11, fill: THEME.muted });
      out += text(tx + 4, by + 11 + lineH, truncate(e.l, boxW - 8, c.fs, 600), { size: c.fs, weight: 600, fill: THEME.ink });
      if (e.det) out += text(tx + 4, by + 11 + lineH * 2, truncate(e.det, boxW - 8, 11), { size: 11, fill: THEME.ink2 });
    });
    types.forEach(function (ty, i) { c.addLegend(ty, c.color(ty, i), 'dot'); });
    c.setTable([c.lang === 'en' ? 'Date' : '日期', c.lang === 'en' ? 'Event' : '事件'].concat(types.length ? [c.lang === 'en' ? 'Type' : '类型'] : []), ev.map(function (e) { return [e.d, e.l + (e.det ? ' — ' + e.det : '')].concat(types.length ? [e.ty] : []); }));
    return { svg: out, height: H };
  }
});

/* ── P02 Gantt ───────────────────────────────────────────────────────── */
register({
  id: 'P02', name: { zh: '甘特图', en: 'Gantt chart' },
  question: { zh: '各项工作何时开始、何时结束，哪些并行、哪些延期？', en: 'When does each workstream start and finish; what overlaps or slips?' },
  use: { zh: '新品上市计划、大促备货排期、项目里程碑；可标注今日线与状态。', en: 'Launch plans, peak-season stocking schedules, project milestones; with a today line and status.' },
  avoid: { zh: '任务 >25 条（按阶段汇总）。', en: 'More than 25 tasks (summarise by phase).' },
  fields: [
    { key: 'x', role: 'text', required: true, desc: { zh: '任务名字段', en: 'Task field' } },
    { key: 'start / end', role: 'date', required: true, desc: { zh: '开始与结束日期字段（YYYY-MM-DD）；里程碑 start = end', en: 'Start and end dates; milestone when start = end' } },
    { key: 'group / status', role: 'category', required: false, desc: { zh: '阶段分组与状态（done/active/planned/late）', en: 'Phase group and status (done/active/planned/late)' } }
  ],
  options: ['today', 'group', 'status'],
  keywords: { zh: ['甘特图', '排期', '项目计划', '时间表', '里程碑', '上市计划', '备货计划'], en: ['gantt', 'schedule', 'project plan', 'timeline', 'roadmap'] },
  dataKind: 'rows', needsUnit: false,
  lint: function (s, add) { checkFields(s, add, [s.x, s.start, s.end, s.group, s.status]); asArray(s.data).forEach(function (r) { var a = dayOf(r[s.start]), b = dayOf(r[s.end]); if (a == null || b == null) add('error', 'E_DATE', '任务 “' + r[s.x] + '” 日期无法识别'); else if (b < a) add('error', 'E_DATE', '任务 “' + r[s.x] + '” 结束早于开始'); }); },
  render: function (c) {
    var s = c.spec, data = asArray(s.data), groups = s.group ? uniq(data.map(function (r) { return String(r[s.group]); })) : [''];
    var rows = []; groups.forEach(function (gname) { if (s.group) rows.push({ hdr: gname }); data.filter(function (r) { return !s.group || String(r[s.group]) === gname; }).forEach(function (r) { rows.push({ r: r }); }); });
    var t0 = Math.min.apply(null, data.map(function (r) { return dayOf(r[s.start]); })), t1 = Math.max.apply(null, data.map(function (r) { return dayOf(r[s.end]); })) + DAY;
    var labW = Math.min(c.W * 0.32, Math.max.apply(null, data.map(function (r) { return textW(String(r[s.x]), c.fs); })) + 24), rowH = 24, top = 28, H = top + rows.length * rowH + 10;
    var x = scaleTime(t0, t1, labW, c.W - 10), out = '';
    timeTicks(t0, t1, Math.max(2, Math.floor((c.W - labW) / 80)), c.lang).forEach(function (tk) { var px = Math.round(x(tk.t)) + .5; out += line(px, top - 4, px, H - 6, { stroke: THEME.grid }); out += text(px + 3, top - 10, tk.label, { size: 11, fill: THEME.muted }); });
    var stCol = { done: THEME.faint, active: c.pal.primary, planned: c.pal.series[2], late: THEME.bad };
    rows.forEach(function (row, i) {
      var y = top + i * rowH;
      if (row.hdr != null) { out += text(4, y + rowH / 2, row.hdr, { baseline: 'middle', size: c.fs, weight: 700, fill: THEME.ink }); out += line(0, y + rowH - .5, c.W, y + rowH - .5, { stroke: THEME.grid }); return; }
      var r = row.r, a = dayOf(r[s.start]), b = dayOf(r[s.end]) + DAY, st = s.status ? String(r[s.status] || 'planned') : 'active', col = stCol[st] || c.pal.primary;
      out += text(s.group ? 16 : 4, y + rowH / 2, truncate(String(r[s.x]), labW - 22, c.fs), { baseline: 'middle', size: c.fs, fill: THEME.ink2 });
      var rowsTip = [[c.lang === 'en' ? 'Start' : '开始', String(r[s.start])], [c.lang === 'en' ? 'End' : '结束', String(r[s.end])]].concat(s.status ? [[c.lang === 'en' ? 'Status' : '状态', st]] : []);
      if (b - a <= DAY) out += path('M' + r2(x(a)) + ' ' + r2(y + 4) + 'l7 8l-7 8l-7-8z', { fill: THEME.ink, cls: 'bz-hit', data: tip(String(r[s.x]), rowsTip) });
      else out += rect(x(a), y + 6, Math.max(3, x(b) - x(a)), rowH - 12, { fill: col, cls: 'bz-hit', data: tip(String(r[s.x]), rowsTip) });
    });
    if (s.today) { var tt = dayOf(s.today); if (tt != null && tt >= t0 && tt <= t1) { var tx = Math.round(x(tt)) + .5; out += line(tx, top - 4, tx, H - 4, { stroke: c.pal.series[1], width: 1.6 }); out += text(tx + 4, H - 6, c.t('today') + ' ' + s.today, { size: 11, weight: 600, fill: c.pal.series[1], halo: true }); } }
    if (s.status) Object.keys(stCol).forEach(function (k) { if (data.some(function (r) { return String(r[s.status]) === k; })) c.addLegend({ done: c.lang === 'en' ? 'Done' : '已完成', active: c.lang === 'en' ? 'In progress' : '进行中', planned: c.lang === 'en' ? 'Planned' : '计划中', late: c.lang === 'en' ? 'Late' : '延期' }[k], stCol[k], 'bar'); });
    c.setTable([c.lang === 'en' ? 'Task' : '任务', c.lang === 'en' ? 'Start' : '开始', c.lang === 'en' ? 'End' : '结束'].concat(s.status ? [c.lang === 'en' ? 'Status' : '状态'] : []), data.map(function (r) { return [String(r[s.x]), String(r[s.start]), String(r[s.end])].concat(s.status ? [String(r[s.status] || '')] : []); }));
    return { svg: out, height: H };
  }
});

/* ── M01 Small multiples ─────────────────────────────────────────────── */
register({
  id: 'M01', name: { zh: '小多图（分面）', en: 'Small multiples' },
  question: { zh: '同一指标在多个对象（站点、品类、SKU）上的走势/结构是否一致？', en: 'Does the same metric behave alike across many items (marketplaces, categories, SKUs)?' },
  use: { zh: '超过 6 条序列时替代“意大利面”折线；默认共享纵轴，便于横向比较。', en: 'Replaces spaghetti lines beyond 6 series; shared y-axis by default for honest comparison.' },
  avoid: { zh: '面板 >12（筛选重点）；需要看各自细节且量级差异巨大时设 sharedScale:false 并注明。', en: 'More than 12 panels; when scales differ wildly use sharedScale:false and say so.' },
  fields: [
    { key: 'base', role: 'type', required: true, desc: { zh: '底图类型：T01 / T02 / C02', en: 'Base chart: T01 / T02 / C02' } },
    { key: 'facet', role: 'category', required: true, desc: { zh: '分面字段', en: 'Facet field' } },
    { key: 'x / y', role: 'fields', required: true, desc: { zh: '同底图字段', en: 'As the base chart' } }
  ],
  options: ['columns', 'sharedScale（默认 true）', 'highlight（面板名）'],
  keywords: { zh: ['小多图', '分面', '多面板', '逐个对比', '每个站点', '每个品类'], en: ['small multiples', 'facet', 'trellis', 'panel', 'per market'] },
  aspect: 0.5,
  lint: function (s, add) {
    if (['T01', 'T02', 'C02'].indexOf(String(s.base || '').toUpperCase()) < 0) add('error', 'E_BASE', 'base 只支持 T01 / T02 / C02');
    checkFields(s, add, [s.facet, s.x].concat(measureKeys(s)));
    var n = uniq(asArray(s.data).map(function (r) { return String(r[s.facet]); })).length;
    if (n > 12) add('warning', 'W_ITEMS', n + ' 个面板：只保留重点或分页');
    if (s.sharedScale === false) add('warning', 'W_SCALE', '各面板纵轴独立：务必在副标题注明“纵轴不同”');
  },
  render: function (c) {
    var s = c.spec, base = String(s.base).toUpperCase(), def = TYPES[base], facets = uniq(asArray(s.data).map(function (r) { return String(r[s.facet]); }));
    var cols = s.columns || (c.W < 560 ? 1 : c.W < 900 ? 2 : 3), gap = 22, pw = Math.floor((c.W - gap * (cols - 1)) / cols), ph = 190, titleH = 20;
    var keys = measureKeys(s), all = [];
    asArray(s.data).forEach(function (r) { (s.seriesBy ? [Array.isArray(s.y) ? s.y[0] : s.y] : keys).forEach(function (k) { if (isNum(num(r[k]))) all.push(num(r[k])); }); });
    var e = extent(all), shared = s.sharedScale !== false, zero = base !== 'T01' || e[0] >= 0 && e[0] <= e[1] * 0.35;
    var out = '', H = 0, hl = asArray(s.highlight);
    facets.forEach(function (fv, i) {
      var sub = {}; for (var k in s) if (k !== 'type' && k !== 'base' && k !== 'facet' && k !== 'highlight') sub[k] = s[k];
      sub.type = base; sub.data = asArray(s.data).filter(function (r) { return String(r[s.facet]) === fv; }); sub.annotations = []; sub.bands = asArray(s.bands); sub.height = ph;
      if (shared) sub.yDomain = [zero ? Math.min(0, e[0]) : e[0], e[1]];
      var sc = new Ctx(sub, { width: pw, uid: c.uid + 'm' + i });
      sc.colorMap = c.colorMap; sc.pal = c.pal;
      var r = def.render(sc);
      for (var dk in sc.defs) c.defs[dk] = sc.defs[dk];
      if (i === 0) sc.legend.forEach(function (it) { c.addLegend(it.label, it.color, it.kind); });
      var col = i % cols, row = Math.floor(i / cols), x0 = col * (pw + gap), y0 = row * (ph + titleH + 18);
      var isHl = hl.indexOf(fv) >= 0;
      out += '<g transform="translate(' + x0 + ',' + y0 + ')">' + text(0, 13, fv, { size: 13, weight: 700, fill: isHl ? c.pal.series[1] : THEME.ink }) + '<g transform="translate(0,' + titleH + ')">' + r.svg + '</g></g>';
      H = Math.max(H, y0 + titleH + r.height);
    });
    c.notesExtra.push(shared ? (c.lang === 'en' ? 'All panels share the same y-axis.' : '各面板纵轴刻度相同，可直接横向比较。') : (c.lang === 'en' ? 'Panels use different y-axes; compare shapes, not levels.' : '各面板纵轴刻度不同：比较形态而非高低。'));
    c.setTable([s.facet, c.t('period')].concat(keys.map(function (k) { return labelOf(s, k); })), asArray(s.data).map(function (r) { return [String(r[s.facet]), xLabel(c, r[s.x])].concat(keys.map(function (k) { return c.fmt(r[k]); })); }));
    return { svg: out, height: H + 4 };
  }
});
