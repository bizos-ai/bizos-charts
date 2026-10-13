/* 92-report — full reports in six layouts. One spec → one self-contained
   HTML document: masthead, conclusion title, key points, numbered sections,
   auto-numbered exhibits, risks or limitations, method, sources. */

var LAYOUTS = {
  'research-note': { zh: '研究报告', en: 'Research note', cover: 'points+data', grid: 2 },
  'business-review': { zh: '经营分析报告', en: 'Business review', cover: 'kpis', grid: 2 },
  'one-pager': { zh: '一页纸', en: 'One-pager', cover: 'onepager', grid: 1 },
  'dashboard': { zh: '数据看板', en: 'Dashboard', cover: 'kpis', grid: 3 },
  'decision-memo': { zh: '决策备忘录', en: 'Decision memo', cover: 'memo', grid: 2 },
  'study-report': { zh: '科研报告', en: 'Study report', cover: 'abstract', grid: 2 }
};
var REPORT_CSS = [
  '.bz-report .bz-sheet{padding:30px 36px 34px}',
  '.bz-kick{font-size:12px;color:' + THEME.ink2 + '}',
  '.bz-rtitle{font-size:27px;line-height:1.32;font-weight:700;margin:6px 0 6px;color:' + THEME.ink + ';letter-spacing:-.005em}',
  '.bz-rsub{font-size:15px;line-height:1.6;color:' + THEME.ink2 + ';margin:0 0 4px}',
  '.bz-byline{font-size:12px;color:' + THEME.muted + ';margin:6px 0 18px}',
  '.bz-cover{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);gap:28px;margin:6px 0 10px;align-items:start}',
  '.bz-box{border-top:2px solid ' + THEME.rule + ';padding-top:8px}',
  '.bz-box h4{margin:0 0 8px;font-size:13px;font-weight:700;color:' + THEME.rule + ';letter-spacing:.02em}',
  '.bz-points{margin:0;padding:0;list-style:none;counter-reset:pt}',
  '.bz-points li{position:relative;padding-left:22px;margin:0 0 10px;font-size:14px;line-height:1.7;counter-increment:pt}',
  '.bz-points li::before{content:counter(pt);position:absolute;left:0;top:.18em;width:16px;height:16px;line-height:16px;text-align:center;font-size:11px;font-weight:700;color:#fff;background:' + THEME.rule + '}',
  '.bz-points li b{color:' + THEME.ink + '}',
  '.bz-kd{width:100%;border-collapse:collapse;font-size:12.5px}',
  '.bz-kd td{padding:6px 0;border-bottom:1px solid ' + THEME.grid + ';vertical-align:top}',
  '.bz-kd td:last-child{text-align:right;font-weight:600;padding-left:12px;white-space:nowrap}',
  '.bz-section{margin-top:30px}',
  '.bz-section>h2{display:flex;gap:10px;align-items:baseline;font-size:18px;line-height:1.4;margin:0 0 6px;padding-bottom:6px;border-bottom:1px solid ' + THEME.border + ';color:' + THEME.ink + '}',
  '.bz-section>h2 .n{color:' + THEME.rule + ';font-size:15px;font-weight:700;min-width:1.4em}',
  '.bz-lead{font-size:14px;line-height:1.75;color:' + THEME.ink + ';margin:8px 0 14px;font-weight:600}',
  '.bz-p{font-size:14px;line-height:1.8;color:' + THEME.ink + ';margin:0 0 12px;max-width:900px}',
  '.bz-ul{margin:0 0 12px;padding-left:20px;font-size:14px;line-height:1.75}',
  '.bz-ul li{margin:0 0 4px}',
  '.bz-row{display:grid;grid-template-columns:repeat(var(--cols,2),minmax(0,1fr));gap:26px 30px;margin:14px 0}',
  '.bz-row>.bz-wide{grid-column:1/-1}',
  '.bz-callout{border-left:3px solid ' + THEME.series[1] + ';background:#FBF7EF;padding:10px 14px;margin:12px 0;font-size:14px;line-height:1.7}',
  '.bz-callout b{display:block;margin-bottom:2px}',
  '.bz-reco{border:1.5px solid ' + THEME.rule + ';padding:14px 18px;margin:8px 0 16px}',
  '.bz-reco .lab{font-size:12px;font-weight:700;color:' + THEME.rule + ';letter-spacing:.04em}',
  '.bz-reco .txt{font-size:18px;font-weight:700;line-height:1.5;margin-top:4px}',
  '.bz-q{font-size:14px;color:' + THEME.ink2 + ';margin:0 0 8px}',
  '.bz-abs{font-size:14px;line-height:1.8;color:' + THEME.ink + ';margin:0 0 16px}',
  '.bz-onepager{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.55fr);gap:26px;align-items:start}',
  '.bz-onepager .bz-side>*+*{margin-top:18px}',
  '.bz-onepager .bz-main>*+*{margin-top:20px}',
  '.bz-end{margin-top:30px;border-top:1px solid ' + THEME.border + ';padding-top:10px;font-size:12px;line-height:1.7;color:' + THEME.ink2 + '}',
  '.bz-end h4{font-size:12px;margin:10px 0 2px;color:' + THEME.ink + '}',
  '.bz-end ol{margin:0;padding-left:18px}',
  '.bz-disc{font-size:11px;color:' + THEME.muted + ';margin-top:10px;line-height:1.6}',
  '@media (max-width:860px){.bz-cover,.bz-onepager{grid-template-columns:minmax(0,1fr)}.bz-row{grid-template-columns:minmax(0,1fr)!important}.bz-rtitle{font-size:22px}.bz-report .bz-sheet{padding:18px 16px 22px}}',
  '@media print{.bz-section{break-inside:auto}.bz-row{break-inside:avoid}}'
].join('\n');

function reportLint(spec) {
  var out = [], add = function (level, code, msg) { out.push({ level: level, code: code, message: msg }); };
  var s = spec, m = s.meta || {};
  if (!LAYOUTS[s.layout]) add('error', 'E_LAYOUT', '未知 layout ' + s.layout + '；可用：' + Object.keys(LAYOUTS).join(', '));
  if (!m.title) add('error', 'E_TITLE', '报告缺少结论式标题 meta.title');
  if (!m.date) add('error', 'E_DATE', '报告缺少日期 meta.date');
  if ((s.layout === 'research-note' || s.layout === 'decision-memo' || s.layout === 'one-pager') && !asArray(s.summary).length) add('error', 'E_SUMMARY', '该版式需要 summary（核心观点，3–5 条）');
  if (asArray(s.summary).length > 6) add('warning', 'W_SUMMARY', '核心观点超过 6 条：保留最重要的 3–5 条');
  if (s.layout === 'decision-memo' && !(s.recommendation && s.question)) add('error', 'E_MEMO', '决策备忘录需要 question 与 recommendation');
  if (s.layout === 'study-report') {
    if (!s.abstract) add('error', 'E_ABSTRACT', '科研报告需要摘要 abstract');
    if (!asArray(s.summary).length) add('error', 'E_SUMMARY', '科研报告需要主要发现 summary（3–5 条，引用图表编号）');
    if (!s.method) add('error', 'E_METHOD', '科研报告需要方法与统计 method（检验、校正、误差线含义、样本量）');
    if (!asArray(s.risks).length) add('warning', 'W_LIMITS', '科研报告应写明局限性 risks');
  }
  if (!asArray(s.sources).length) add('warning', 'W_SOURCES', '缺少报告级数据来源列表 sources');
  var CJKr = /[⺀-鿿]/;
  if (s.lang === 'en' && CJKr.test(m.title || '')) add('warning', 'W_LANG', '英文报告标题含中文');
  if (s.lang !== 'en' && m.title && !CJKr.test(m.title)) add('warning', 'W_LANG', '中文报告标题不含中文');
  return out;
}
function collectExhibits(s) {
  var list = [];
  var visit = function (blocks) {
    asArray(blocks).forEach(function (bk) {
      if (!bk) return;
      if (bk.type === 'exhibit' && bk.spec) list.push(bk);
      if (bk.type === 'exhibits') asArray(bk.items).forEach(function (it) { list.push(it.spec ? it : { spec: it }); });
      if (bk.type === 'columns') visit(bk.blocks);
    });
  };
  if (s.kpis) list.push({ spec: s.kpis, kpi: true });
  asArray(s.sections).forEach(function (sec) { visit(sec.blocks); });
  asArray(s.side).forEach(function (bk) { if (bk && bk.type === 'exhibit') list.push(bk); });
  return list;
}

function reportHTML(input, opts) {
  opts = opts || {};
  var lang = input && input.lang === 'en' ? 'en' : 'zh';
  var s = resolveBilingual(deepClone(input || {}), lang, 0);
  s.lang = lang;
  var issues = reportLint(s).map(function (i) { i.where = 'report'; return i; });
  var L0 = LAYOUTS[s.layout] || LAYOUTS['research-note'], m = s.meta || {}, en = lang === 'en';
  var colorMap = {}, no = 1, index = 0, specs = [];
  var widthFor = function (cols) { return cols >= 3 ? 330 : cols === 2 ? 500 : 1010; };
  var exhibit = function (spec, cols, wide) {
    var sp = deepClone(spec); sp.lang = lang;
    var isKpi = String(sp.type || '').toUpperCase() === 'K01';
    var myNo = sp.no != null ? sp.no : (isKpi && sp.numbered !== true ? null : no++);
    var r = render(sp, { width: wide ? 1010 : widthFor(cols), uid: 'x' + index, colorMap: colorMap, no: myNo, index: index });
    sp.no = myNo;
    r.issues.forEach(function (i) { issues.push({ level: i.level, code: i.code, message: i.message, where: (en ? 'Exhibit ' : '图表 ') + (sp.no || sp.type) + ' · ' + (r.spec && r.spec.title || '') }); });
    specs.push(sp); index++;
    return r.html;
  };
  var blocksHTML = function (blocks, cols) {
    return asArray(blocks).map(function (bk) {
      if (!bk) return '';
      if (typeof bk === 'string') return '<p class="bz-p">' + esc(bk) + '</p>';
      if (bk.type === 'text' || bk.type === 'p') return '<p class="bz-p">' + esc(bk.text) + '</p>';
      if (bk.type === 'bullets') return '<ul class="bz-ul">' + asArray(bk.items).map(function (it) { return '<li>' + esc(it) + '</li>'; }).join('') + '</ul>';
      if (bk.type === 'callout') return '<div class="bz-callout">' + (bk.title ? '<b>' + esc(bk.title) + '</b>' : '') + esc(bk.text || '') + '</div>';
      if (bk.type === 'exhibit') return '<div class="bz-row" style="--cols:1"><div>' + exhibit(bk.spec, 1, true) + '</div></div>';
      if (bk.type === 'exhibits') {
        var n = bk.columns || Math.min(asArray(bk.items).length, L0.grid);
        return '<div class="bz-row" style="--cols:' + n + '">' + asArray(bk.items).map(function (it) { var sp = it.spec || it; var wide = it.wide || sp.wide; return '<div' + (wide ? ' class="bz-wide"' : '') + '>' + exhibit(sp, wide ? 1 : n, wide) + '</div>'; }).join('') + '</div>';
      }
      if (bk.type === 'columns') return '<div class="bz-row" style="--cols:' + (bk.columns || 2) + '">' + asArray(bk.blocks).map(function (b2) { return '<div>' + blocksHTML([b2], 2) + '</div>'; }).join('') + '</div>';
      return '';
    }).join('');
  };
  var head = '<div class="bz-mast"><span><b>BIZOS RESEARCH</b>' + (m.kicker ? ' · ' + esc(m.kicker) : ' · ' + esc(L0[lang])) + '</span><span>' + esc(m.date || '') + '</span></div>' +
    '<h1 class="bz-rtitle">' + esc(m.title || '') + '</h1>' + (m.subtitle ? '<p class="bz-rsub">' + esc(m.subtitle) + '</p>' : '') +
    '<div class="bz-byline">' + esc([m.author, m.scope].filter(Boolean).join(' · ')) + '</div>';
  var study = s.layout === 'study-report';
  var points = asArray(s.summary).length ? '<div class="bz-box"><h4>' + esc(L(lang, study ? 'findings' : 'keyPoints')) + '</h4><ol class="bz-points">' + asArray(s.summary).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ol></div>' : '';
  var keyData = asArray(s.keyData).length ? '<div class="bz-box"><h4>' + esc(L(lang, 'keyData')) + '</h4><table class="bz-kd">' + asArray(s.keyData).map(function (k) { return '<tr><td>' + esc(k.label) + '</td><td>' + esc(k.value) + '</td></tr>'; }).join('') + '</table>' + (s.keyDataNote ? '<div class="bz-disc">' + esc(s.keyDataNote) + '</div>' : '') + '</div>' : '';
  var risks = asArray(s.risks).length ? '<div class="bz-box"><h4>' + esc(L(lang, study ? 'limitations' : 'risks')) + '</h4><ul class="bz-ul">' + asArray(s.risks).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></div>' : '';
  var cover = '';
  if (L0.cover === 'points+data') cover = '<div class="bz-cover"><div>' + points + '</div><div>' + keyData + '</div></div>';
  else if (L0.cover === 'kpis') cover = (s.lede ? '<p class="bz-lede">' + esc(s.lede) + '</p>' : '') + (s.kpis ? exhibit(s.kpis, 1, true) : '') + (points ? '<div style="margin-top:18px">' + points + '</div>' : '');
  else if (L0.cover === 'abstract') cover = '<div class="bz-cover"><div><div class="bz-box"><h4>' + esc(L(lang, 'abstract')) + '</h4><p class="bz-abs">' + esc(s.abstract || '') + '</p></div>' + points + '</div><div>' + keyData.replace('<h4>' + esc(L(lang, 'keyData')) + '</h4>', '<h4>' + esc(L(lang, 'glance')) + '</h4>') + '</div></div>';
  else if (L0.cover === 'memo') cover = '<p class="bz-q"><b>' + esc(L(lang, 'question')) + (en ? ': ' : '：') + '</b>' + esc(s.question || '') + '</p><div class="bz-reco"><div class="lab">' + esc(L(lang, 'recommendation')) + '</div><div class="txt">' + esc(s.recommendation || '') + '</div></div>' + (points ? points.replace(esc(L(lang, 'keyPoints')), esc(L(lang, 'rationale'))) : '');
  var secs = L0.cover === 'onepager' ? '' : asArray(s.sections).map(function (sec, i) {
    return '<section class="bz-section"><h2><span class="n">' + (i + 1) + '</span>' + esc(sec.title || '') + '</h2>' + (sec.lead ? '<p class="bz-lead">' + esc(sec.lead) + '</p>' : '') + blocksHTML(sec.blocks, L0.grid) + '</section>';
  }).join('');
  var body;
  if (L0.cover === 'onepager') {
    var side = points + keyData + blocksHTML(s.side, 1) + risks;
    body = head + '<div class="bz-onepager"><div class="bz-side">' + side + '</div><div class="bz-main">' + asArray(s.sections).map(function (sec) { return (sec.title ? '<div class="bz-box"><h4>' + esc(sec.title) + '</h4></div>' : '') + blocksHTML(sec.blocks, 1); }).join('') + '</div></div>';
  } else body = head + cover + secs + (risks && L0.cover !== 'onepager' ? '<section class="bz-section">' + risks + '</section>' : '') + (s.nextSteps ? '<section class="bz-section"><div class="bz-box"><h4>' + esc(L(lang, 'nextSteps')) + '</h4><ol class="bz-ul">' + asArray(s.nextSteps).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div></section>' : '');
  var end = '<div class="bz-end">' + (s.method ? '<h4>' + esc(L(lang, study ? 'methodStats' : 'method')) + '</h4><div>' + esc(s.method) + '</div>' : '') +
    (s.dataAvailability ? '<h4>' + esc(L(lang, 'dataAvail')) + '</h4><div>' + esc(s.dataAvailability) + '</div>' : '') +
    (asArray(s.sources).length ? '<h4>' + esc(L(lang, study ? 'refs' : 'sources')) + '</h4><ol>' + asArray(s.sources).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : '') +
    '<div class="bz-disc">' + esc(s.disclaimer || (study ? (en ? 'Prepared by BizOS from the data listed; methods are described above. Findings apply only to the samples and conditions studied and are not medical advice.' : '本报告由 BizOS 依据所列数据整理，方法见上文；结论仅适用于所述样本与条件，不构成医疗建议。') : (en ? 'Prepared by BizOS from the sources listed. Figures marked E are estimates. Not investment advice.' : '本报告由 BizOS 依据所列来源整理；标注 E 的数据为预测值；不构成投资建议。'))) + '</div></div>';
  var html = documentHTML({ lang: lang, title: m.title || 'BizOS report', body: '<main class="bz-page bz-report"><article class="bz-sheet">' + body + end + '</article></main>', specs: specs, colorMap: colorMap, engineSource: opts.engineSource, css: REPORT_CSS });
  return { html: html, issues: issues, exhibits: specs.length };
}
BC.report = reportHTML;
BC.layouts = LAYOUTS;
