# BizOS Charts

A standalone charting skill and offline engine for business, financial, experimental, and biomedical evidence. Public package **2.1.2**, using renderer **2.1.0**, includes **64 exhibit types** and **6 complete report layouts**.

All sample data are illustrative. The engine embeds data, styles, and scripts in the finished HTML; chart rendering needs Node.js and no npm install or service account.

## Start here

- [SKILL.md](SKILL.md): English workflow and essential rules.
- [Chart catalog](catalog.md): questions, appropriate uses, and exclusions for all 64 types.
- [Specification reference](references/spec-reference.md): required fields, options, and examples.
- [Report catalog](report-catalog.md): six layouts and paired language samples.
- [House style](references/house-style.md): visual and numerical conventions.
- [Delivery checks](references/delivery-checks.md): data and browser verification.
- [English atlas](templates/gallery.en.html) and [Chinese atlas](templates/gallery.zh.html): download and open locally.

Supporting catalogs contain English chart names and field descriptions alongside Chinese guidance. Complete outputs can be rendered in either language.

## Render

From this directory:

```bash
node scripts/render.mjs --spec examples/specs/T01-line.json --lang en --out output/trend.html
node scripts/render.mjs --spec examples/specs/T01-line.json --lang en --svg output/trend.svg
node scripts/render.mjs --report examples/reports/business-review.json --lang en --out output/review.html
node scripts/render.mjs --check examples/specs/B01-survival.json --lang en
```

Use the returned statistical values in titles and captions. Reconcile other title calculations with the supplied data. Source, units, periods, missing values, and estimate labels remain part of the data contract.

## Maintain and validate

Edit `engine/src/`, then rebuild and validate. Generated files should not be edited by hand. Reference builds use Node.js 22.17.0; other runtimes can differ in the final digits of statistical calculations.

```bash
node scripts/build.mjs
node scripts/validate.mjs
node scripts/verify.mjs output/trend.html
```

Browser verification needs optional `playwright-core` and a local Chrome/Edge executable. Set `BIZOS_PLAYWRIGHT_CORE` to the module path if it is not installed locally, and use `--chrome` for an explicit browser executable. An unavailable browser returns `unverified`, not a pass.

This public package covers the standalone chart engine and six general report layouts. It has no private application template or account-service dependency. The [Apache License 2.0](LICENSE) applies.
