/* 90-page — self-contained HTML documents. Every exhibit is pre-rendered as
   static SVG (prints and reads without JavaScript); the inline runtime then
   re-renders at the real container width and adds tooltips and exports. */

var PAGE_CSS = [
  'html{background:' + THEME.page + '}',
  'body{margin:0;background:' + THEME.page + ';color:' + THEME.ink + '}',
  '.bz-page{max-width:1120px;margin:0 auto;padding:28px 24px 48px}',
  '.bz-sheet{background:#FFFFFF;border:1px solid ' + THEME.border + ';padding:28px 32px 32px}',
  '.bz-mast{display:flex;justify-content:space-between;gap:16px;align-items:baseline;border-bottom:2px solid ' + THEME.rule + ';padding-bottom:8px;margin-bottom:18px;font-size:12px;color:' + THEME.ink2 + '}',
  '.bz-mast b{color:' + THEME.rule + ';letter-spacing:.06em}',
  '.bz-h1{font-size:26px;line-height:1.3;font-weight:700;margin:0 0 6px;color:' + THEME.ink + '}',
  '.bz-lede{font-size:14px;line-height:1.7;color:' + THEME.ink2 + ';margin:0 0 18px;max-width:860px}',
  '.bz-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px 32px}',
  '.bz-grid>.bz-wide{grid-column:1/-1}',
  '.bz-stack>*+*{margin-top:28px}',
  '.bz-sec{margin:30px 0 12px;display:flex;align-items:baseline;gap:10px;border-bottom:1px solid ' + THEME.border + ';padding-bottom:6px}',
  '.bz-sec h2{font-size:17px;margin:0;font-weight:700;color:' + THEME.ink + '}',
  '.bz-sec span{font-size:12px;color:' + THEME.muted + '}',
  '.bz-meta{font-size:11px;color:' + THEME.muted + ';margin-top:6px}',
  '.bz-issues{font-size:11px;color:' + THEME.bad + ';margin-top:4px}',
  '.bz-pagefoot{margin-top:28px;padding-top:8px;border-top:1px solid ' + THEME.border + ';font-size:11px;color:' + THEME.muted + ';display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}',
  '@media (max-width:760px){.bz-page{padding:16px 12px 32px}.bz-sheet{padding:18px 16px 22px}.bz-grid{grid-template-columns:minmax(0,1fr)}.bz-h1{font-size:21px}}',
  '@media print{html,body{background:#fff}.bz-page{padding:0;max-width:none}.bz-sheet{border:0;padding:0}@page{size:A4;margin:14mm 12mm}}'
].join('\n');

function jsonForScript(o) { return JSON.stringify(o).replace(/</g, '\\u003c').replace(/-->/g, '--\\u003e'); }

/* Render a list of exhibit specs into page fragments. Numbering is
   sequential unless a spec sets "no"; one colour map keeps an entity's
   colour identical across exhibits. */
function renderMany(specs, opts) {
  opts = opts || {};
  var colorMap = opts.colorMap || {}, n = opts.startNo || 1, out = [], all = [];
  specs.forEach(function (sp, i) {
    var width = opts.widthFor ? opts.widthFor(sp, i) : (opts.width || 760);
    var no = sp.no != null ? sp.no : (opts.numbering === false ? null : n++);
    var r = render(sp, { width: width, uid: (opts.uidBase || 0) + i, colorMap: colorMap, no: no, index: (opts.indexBase || 0) + i });
    r.no = no;
    r.issues.forEach(function (is) { all.push({ index: i, type: r.type, title: r.spec && r.spec.title, level: is.level, code: is.code, message: is.message }); });
    out.push(r);
  });
  return { results: out, issues: all, colorMap: colorMap };
}

/* Full HTML document. body: HTML string containing figures produced by
   render(); specs: the specs in figure order (data-bz index). */
function documentHTML(o) {
  var lang = o.lang === 'en' ? 'en' : 'zh';
  var runtime = o.engineSource ? '<script>' + o.engineSource.replace(/<\/script/gi, '<\\/script') + '</script>' +
    '<script>BizosCharts.hydrate(document,' + jsonForScript({ specs: o.specs || [], colorMap: o.colorMap || {} }) + ');</script>' : '';
  return '<!doctype html>\n<html lang="' + (lang === 'en' ? 'en' : 'zh-CN') + '"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="generator" content="BizOS Charts ' + BC.version + '">' +
    '<title>' + esc(o.title || 'BizOS Charts') + '</title>' +
    '<style>' + CSS + '\n' + PAGE_CSS + (o.css ? '\n' + o.css : '') + '</style></head>' +
    '<body class="bz-root">' + o.body + runtime + '</body></html>';
}

/* Convenience: a page of exhibits (one column, or two with layout:"grid"). */
function exhibitsPage(specs, o) {
  o = o || {};
  var lang = (specs[0] && specs[0].lang) === 'en' ? 'en' : 'zh';
  var grid = o.layout === 'grid';
  var many = renderMany(specs, { width: grid ? 520 : 820, colorMap: o.colorMap, numbering: o.numbering, widthFor: function (sp) { return grid && !sp.wide ? 520 : (grid ? 1056 : 820); } });
  var figs = many.results.map(function (r, i) {
    var wide = grid && specs[i].wide;
    return '<div' + (wide ? ' class="bz-wide"' : '') + '>' + r.html + '</div>';
  }).join('');
  var head = '';
  if (o.title || o.kicker) head = '<div class="bz-mast"><span><b>' + esc(o.kicker || 'BIZOS RESEARCH') + '</b></span><span>' + esc(o.date || '') + '</span></div>' + (o.title ? '<h1 class="bz-h1">' + esc(o.title) + '</h1>' : '') + (o.lede ? '<p class="bz-lede">' + esc(o.lede) + '</p>' : '');
  var body = '<main class="bz-page"><div class="bz-sheet">' + head + '<div class="' + (grid ? 'bz-grid' : 'bz-stack') + '">' + figs + '</div></div></main>';
  return { html: documentHTML({ lang: lang, title: o.title || (many.results[0] && many.results[0].spec && many.results[0].spec.title), body: body, specs: specs.map(function (sp, i) { var c = deepClone(sp); c.no = many.results[i].no; return c; }), colorMap: many.colorMap, engineSource: o.engineSource }), issues: many.issues };
}
