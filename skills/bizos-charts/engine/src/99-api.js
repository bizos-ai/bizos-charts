/* 99-api — public surface. */

BC.theme = THEME;
BC.market = MARKET;
BC.css = CSS + '\n' + PAGE_CSS;
BC.render = render;
BC.lint = lint;
BC.exhibitSVG = exhibitSVG;
BC.renderMany = renderMany;
BC.exhibitsPage = exhibitsPage;
BC.documentHTML = documentHTML;
BC.hydrate = hydrate;
BC.format = function (v, fmt, lang, opts) { return fmtNum(v, fmt, lang, opts); };
BC.families = FAMILIES;
/* Statistics used by the scientific exhibits, for computing title numbers
   exactly as the exhibit does. */
BC.stats = {
  describe: describe, welch: welchT, student: studentT, pairedT: pairedT, mannWhitney: mannWhitney, pAdjust: pAdjust,
  pearson: pearson, spearman: spearman, ols: olsFit, kaplanMeier: kaplanMeier, logRank: logRank, roc: rocCurve, delong: delongPaired, pr: prCurve,
  blandAltman: blandAltman, fit4PL: fit4PL, metaPool: metaPool, hclust: hclust, kde: kde, bandwidth: bwSilverman,
  normCdf: normCdf, normPpf: normPpf, tCdf: tCdf, tPpf: tPpf, chi2Sf: chi2Sf, betaPpf: betaPpf, parseNewick: parseNewick,
  formatP: fmtP
};
BC.order = function () { return ORDER.slice(); };
/* Machine-readable catalogue (scripts/build.mjs writes references/chart-index.json). */
BC.catalog = function () {
  return ORDER.map(function (id) {
    var d = TYPES[id];
    return { id: id, family: d.family, familyName: FAMILIES[d.family], name: d.name, question: d.question, use: d.use, avoid: d.avoid,
      fields: d.fields, options: d.options || [], keywords: d.keywords || { zh: [], en: [] }, needsUnit: d.needsUnit !== false, output: d.output || 'svg' };
  });
};
if (typeof BC.report !== 'function' && typeof reportHTML === 'function') BC.report = reportHTML;
