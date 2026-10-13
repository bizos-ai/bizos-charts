/* 95-runtime — browser behaviour: width-true re-render, tooltips with
   keyboard focus, and SVG / PNG / CSV export. Never fetches anything. */

function hydrate(root, payload) {
  if (typeof document === 'undefined') return;
  root = root || document;
  var specs = (payload && payload.specs) || [], colorMap = (payload && payload.colorMap) || {};
  var figs = root.querySelectorAll('figure.bz-exhibit[data-bz]');
  Array.prototype.forEach.call(figs, function (fig) {
    var idx = +fig.getAttribute('data-bz'), spec = specs[idx];
    if (!spec) return;
    mountFigure(fig, spec, idx, colorMap);
  });
}
function mountFigure(fig, spec, idx, colorMap) {
  var state = { fig: fig, spec: spec, idx: idx, colorMap: colorMap, w: 0 };
  var rerender = function () {
    var plot = state.fig.querySelector('.bz-plot');
    if (!plot) return;
    var w = Math.round(plot.getBoundingClientRect().width);
    if (!w || Math.abs(w - state.w) < 2) return;
    var pre = +plot.getAttribute('data-w');
    if (!state.w && Math.abs(w - pre) < 2) { state.w = w; return; }
    state.w = w;
    var cm = {}; for (var k in colorMap) cm[k] = colorMap[k];
    var r = render(spec, { width: w, uid: 'r' + idx + 'w' + w, colorMap: cm, no: spec.no, index: idx, boxed: state.fig.classList.contains('bz-boxed') });
    var holder = document.createElement('div');
    holder.innerHTML = r.html;
    var fresh = holder.firstChild;
    var details = state.fig.querySelector('details.bz-data');
    if (details && details.open) { var d2 = fresh.querySelector('details.bz-data'); if (d2) d2.open = true; }
    state.fig.parentNode.replaceChild(fresh, state.fig);
    state.fig = fresh;
    wire(state);
  };
  wire(state);
  rerender();
  var timer = null;
  if (typeof ResizeObserver !== 'undefined') {
    var ro = new ResizeObserver(function () { clearTimeout(timer); timer = setTimeout(rerender, 120); });
    ro.observe(fig.parentNode || fig);
  } else window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(rerender, 150); });
}
function wire(state) {
  var fig = state.fig, plot = fig.querySelector('.bz-plot');
  if (!plot) return;
  var tipEl = document.createElement('div');
  tipEl.className = 'bz-tip'; tipEl.style.display = 'none'; tipEl.setAttribute('role', 'status');
  plot.appendChild(tipEl);
  var show = function (target, cx, cy) {
    var data; try { data = JSON.parse(target.getAttribute('data-tip')); } catch (e) { return; }
    tipEl.innerHTML = '<b>' + esc(data.t) + '</b>' + (data.r || []).map(function (row) { return '<div class="r"><span>' + esc(row[0]) + '</span><span>' + esc(row[1]) + '</span></div>'; }).join('');
    tipEl.style.display = 'block';
    var pr = plot.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    var x = cx - pr.left + 14, y = cy - pr.top + 14;
    if (x + tw > pr.width) x = Math.max(0, cx - pr.left - tw - 14);
    if (y + th > pr.height) y = Math.max(0, cy - pr.top - th - 14);
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  };
  var hide = function () { tipEl.style.display = 'none'; };
  plot.addEventListener('pointermove', function (ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest('[data-tip]') : null;
    if (t) show(t, ev.clientX, ev.clientY); else hide();
  });
  plot.addEventListener('pointerleave', hide);
  plot.addEventListener('focusin', function (ev) {
    var t = ev.target; if (!t || !t.getAttribute || !t.getAttribute('data-tip')) return;
    var b = t.getBoundingClientRect(); show(t, b.left + b.width / 2, b.top + b.height / 2);
  });
  plot.addEventListener('focusout', hide);
  var tools = fig.querySelector('.bz-actions');
  if (!tools) { tools = document.createElement('div'); tools.className = 'bz-actions'; fig.appendChild(tools); }
  if (tools.querySelector('button')) return;
  var first = tools.firstChild;
  var isSvg = !!plot.querySelector(':scope > svg');
  var mk = function (label, fn) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', fn); tools.insertBefore(b, first); };
  var name = String(normSpec(state.spec).title || 'exhibit').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60);
  if (isSvg) {
    mk('SVG', function () { var svg = exhibitSVG(state.spec, { width: state.w || 760, no: state.spec.no, colorMap: state.colorMap }); download(name + '.svg', new Blob([svg], { type: 'image/svg+xml' })); });
    mk('PNG', function () { var svg = exhibitSVG(state.spec, { width: state.w || 760, no: state.spec.no, colorMap: state.colorMap }); toPNG(svg, function (blob) { if (blob) download(name + '.png', blob); }); });
  }
  mk('CSV', function () {
    var r = render(state.spec, { width: state.w || 760, colorMap: state.colorMap });
    if (!r.table) return;
    var rows = [r.table.head].concat(r.table.raw || r.table.rows);
    var csv = '﻿' + rows.map(function (row) { return row.map(function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    download(name + '.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  });
}
function download(name, blob) {
  var a = document.createElement('a'), url = URL.createObjectURL(blob);
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
}
function toPNG(svg, cb) {
  var m = svg.match(/width="(\d+)" height="(\d+)"/), w = m ? +m[1] : 760, h = m ? +m[2] : 480, scale = 2;
  var img = new Image();
  img.onload = function () {
    var cv = document.createElement('canvas'); cv.width = w * scale; cv.height = h * scale;
    var ctx = cv.getContext('2d'); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.scale(scale, scale); ctx.drawImage(img, 0, 0, w, h);
    cv.toBlob(cb, 'image/png');
  };
  img.onerror = function () { cb(null); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
