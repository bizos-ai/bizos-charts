/* 20-theme — the BizOS research house style. One source of truth for every
   color, size and rule; color-presets.js and mono-tokens.js are generated
   compatibility views of this object (scripts/build.mjs). */

var THEME = {
  name: 'bizos-research',
  font: '"Helvetica Neue",Helvetica,Arial,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Source Han Sans SC",sans-serif',
  /* text */
  ink: '#1B2533', ink2: '#4A5568', muted: '#6B7684', faint: '#8A94A3',
  /* structure */
  grid: '#E4E8EE', axis: '#9AA4B1', zero: '#4A5568', rule: '#16365C',
  page: '#F4F5F7', card: '#FFFFFF', border: '#E1E5EB', shade: '#EEF2F7',
  /* data */
  primary: '#16365C',
  /* categorical order is fixed: ≤4 series stay separable for normal and
     colour-deficient vision (ΔE2000 ≥ 13); 5–8 need direct labels.        */
  series: ['#16365C', '#BD8730', '#4F86C6', '#838F9C', '#2E8C7A', '#8FB3DB', '#B0574B', '#7A6AA8'],
  mono: ['#1B2533', '#55606E', '#8A94A3', '#B8C0CA', '#DCE1E7'],
  dim: '#C3CAD3',
  good: '#2A7F62', bad: '#B83B3B',
  seq: ['#F2F6FB', '#DCE6F2', '#BACFE6', '#8DB0D6', '#5E8CC0', '#3768A3', '#16365C'],
  div: ['#9E3A30', '#C9705F', '#E8B4A8', '#E9EBEE', '#AFC7E2', '#5D8CC4', '#1F4A85'],
  /* sizes in CSS px at final render; chart text never goes below 12 */
  size: { title: 15, sub: 12, label: 12, small: 11, legend: 12, kpi: 26 },
  stroke: { line: 2, lineThin: 1.5, grid: 1, axis: 1, zero: 1.2 }
};
/* Market price direction: Chinese markets read red as up; others green. */
var MARKET = {
  cn: { up: '#C23B32', down: '#2A7F62' },
  intl: { up: '#2A7F62', down: '#C23B32' }
};

/* Resolve the palette for one exhibit. palette: 'research' | 'mono' |
   {primary:'#hex'} (brand primary replaces the first series and the ramp). */
function paletteFor(spec) {
  var p = spec.palette || 'research';
  if (p === 'mono') {
    return { series: THEME.mono.slice(0, 4).concat(['#6B7684', '#A3ACB7', '#3A4452', '#CBD2DA']), seq: ['#F4F5F7', '#DCE1E7', '#B8C0CA', '#8A94A3', '#55606E', '#1B2533'], div: THEME.div, primary: THEME.mono[0], mono: true };
  }
  if (p && typeof p === 'object' && p.primary && /^#[0-9a-fA-F]{6}$/.test(p.primary)) {
    var b = p.primary.toUpperCase();
    var ser = THEME.series.slice(); ser[0] = b;
    var seq = [mix(b, '#FFFFFF', 0.94), mix(b, '#FFFFFF', 0.82), mix(b, '#FFFFFF', 0.64), mix(b, '#FFFFFF', 0.44), mix(b, '#FFFFFF', 0.22), b, mix(b, '#000000', 0.25)];
    return { series: ser, seq: seq, div: THEME.div, primary: b };
  }
  return { series: THEME.series, seq: THEME.seq, div: THEME.div, primary: THEME.primary };
}

/* Shared CSS for exhibits and report pages (light page, white sheets). */
var CSS = [
  '.bz-root{--bz-ink:' + THEME.ink + ';--bz-ink2:' + THEME.ink2 + ';--bz-muted:' + THEME.muted + ';--bz-grid:' + THEME.grid + ';--bz-rule:' + THEME.rule + ';--bz-border:' + THEME.border + ';--bz-card:' + THEME.card + ';--bz-page:' + THEME.page + ';font-family:' + THEME.font + ';color:var(--bz-ink);font-variant-numeric:tabular-nums lining-nums;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}',
  '.bz-root *{box-sizing:border-box}',
  '.bz-exhibit{margin:0;background:var(--bz-card);border-top:2px solid var(--bz-rule);padding:12px 0 10px;break-inside:avoid;page-break-inside:avoid;min-width:0}',
  '.bz-card .bz-exhibit,.bz-exhibit.bz-boxed{border:1px solid var(--bz-border);border-top:2px solid var(--bz-rule);padding:14px 16px 12px}',
  '.bz-head{margin:0 0 8px}',
  '.bz-title{margin:0;font-size:' + THEME.size.title + 'px;line-height:1.4;font-weight:600;letter-spacing:0;color:var(--bz-ink)}',
  '.bz-no{color:var(--bz-rule);font-weight:700;margin-right:.5em;white-space:nowrap}',
  '.bz-sub{margin:3px 0 0;font-size:' + THEME.size.sub + 'px;line-height:1.5;color:var(--bz-ink2)}',
  '.bz-legend{display:flex;flex-wrap:wrap;gap:4px 16px;margin:8px 0 2px;font-size:' + THEME.size.legend + 'px;color:var(--bz-ink2);line-height:1.4}',
  '.bz-li{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}',
  '.bz-sw{display:inline-block;width:12px;height:12px;flex:none}',
  '.bz-sw.line{height:0;border-top:2px solid;width:16px}',
  '.bz-sw.dash{height:0;border-top:2px dashed;width:16px}',
  '.bz-sw.dot{border-radius:50%;width:9px;height:9px}',
  '.bz-sw.range{height:6px;width:16px;opacity:.55}',
  '.bz-plot{position:relative;width:100%;margin-top:4px}',
  '.bz-plot svg{display:block;width:100%;height:auto;overflow:visible;font-family:' + THEME.font + '}',
  '.bz-plot svg text{font-family:' + THEME.font + ';font-variant-numeric:tabular-nums lining-nums}',
  '.bz-foot{margin-top:8px;font-size:' + THEME.size.small + 'px;line-height:1.55;color:var(--bz-muted)}',
  '.bz-foot p{margin:0}',
  '.bz-actions{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:baseline;margin-top:6px;font-size:11px;color:var(--bz-muted)}',
  '.bz-actions:empty{display:none}',
  '.bz-actions button,.bz-data>summary{font:inherit;color:var(--bz-ink2);background:none;border:0;border-bottom:1px solid var(--bz-border);padding:0 0 1px;cursor:pointer;list-style:none}',
  '.bz-data>summary::-webkit-details-marker{display:none}',
  '.bz-data[open]{flex-basis:100%;order:9}',
  '.bz-actions button:hover,.bz-actions button:focus-visible,.bz-data>summary:hover,.bz-data>summary:focus-visible{color:var(--bz-rule);border-bottom-color:var(--bz-rule);outline:none}',
  '.bz-table-wrap{overflow-x:auto;margin-top:6px;-webkit-overflow-scrolling:touch}',
  '.bz-dt{border-collapse:collapse;font-size:12px;width:100%;min-width:max-content}',
  '.bz-dt th,.bz-dt td{padding:4px 8px;border-bottom:1px solid var(--bz-grid);text-align:right;white-space:nowrap}',
  '.bz-dt th:first-child,.bz-dt td:first-child{text-align:left}',
  '.bz-dt thead th{color:var(--bz-ink2);font-weight:600;border-bottom:1px solid var(--bz-ink2)}',
  '.bz-tip{position:absolute;pointer-events:none;z-index:5;background:#1B2533;color:#fff;font-size:12px;line-height:1.45;padding:7px 10px;max-width:280px;box-shadow:0 2px 8px rgba(27,37,51,.18);white-space:normal}',
  '.bz-tip b{font-weight:600}',
  '.bz-tip .r{display:flex;justify-content:space-between;gap:14px}',
  '.bz-hit{cursor:default}',
  '.bz-hit:focus{outline:none}',
  '.bz-hit:focus-visible{outline:2px solid ' + THEME.series[2] + ';outline-offset:1px}',
  '@media print{.bz-actions{display:none}.bz-exhibit{break-inside:avoid}}'
].join('\n');
