---
name: bizos-charts
license: Apache-2.0
description: Create rigorous business, financial, experimental, and biomedical charts or complete reports from supplied data. Includes an offline HTML/SVG engine with 64 exhibit types, 6 report layouts, English/Chinese output, and inspectable data. Use for charts, visualization, dashboards, performance reviews, valuation, study reports, and scientific figures; plain-text explanations and source-data cleanup do not require charts.
---

# BizOS Charts

Use the bundled engine and data contracts to turn supplied evidence into clear, inspectable exhibits. Select by the analytical question and available fields. Keep each exhibit focused on one conclusion supported by its data.

The engine is `engine/bizos-charts.js`, with no runtime dependencies. Use JSON specifications and the renderer rather than recreating charts by hand.

## Read only what the task needs

| Task | Resources |
|---|---|
| One or a few charts | [Selection guidance](references/chart-selection.md), [catalog](catalog.md), then the selected type in [spec reference](references/spec-reference.md) |
| Complete report, dashboard, review, or memo | Also read [report mode](references/report-mode.md) and [report catalog](report-catalog.md) |
| Formatting, colors, units, estimates, or annotations | [House style](references/house-style.md) |
| Experimental or biomedical data | Scientific sections of selection guidance and house style; the E/B type contracts |
| Before delivery | [Delivery checks](references/delivery-checks.md) |

The atlases are [English](templates/gallery.en.html) and [Chinese](templates/gallery.zh.html). Reports have paired language templates under `templates/reports/`. Some supporting prose is Chinese; names and field descriptions in the generated contracts include English.

## Chart workflow

1. Identify the question, intended reader, and a conclusion supported by the data. Confirm grain, units, currency, dates, missingness, estimates, and source. Do not invent missing records or methods.
2. Search candidates with `node scripts/find-chart.mjs --query "question" --fields time,measure`, then check the relevant catalog entry's suitability and exclusions. Compare at most three genuinely valid choices.
3. Write a spec. Use a conclusion title, metric/unit/period subtitle, and an explicit source. Store percentages in percentage units (`12.5` means `12.5%`). Preserve missing values as `null`.
4. For supported scientific calculations, run `node scripts/render.mjs --check spec.json` and inspect its `stats`. Quote those values in titles and prose so they agree with the figure. Independently check arithmetic in other titles.
5. Render with `node scripts/render.mjs --spec spec.json --out output.html`. Resolve errors before generating output. Review warnings; fix them or explain the relevant limitation in notes. Do not bypass validation to force a chart.
6. Check in a real browser with `node scripts/verify.mjs output.html` at desktop and mobile widths. A result of `unverified` means browser validation was unavailable, not passed.
7. Deliver the HTML with its conclusion, source, definitions, and limitations. Use the host's built-in preview when available. Provide SVG for vector insertion and the page's PNG/CSV exports where useful.

## Report workflow

Start with the report's conclusion and core evidence. Choose one of the six layouts in the report catalog. Use a report spec with `node scripts/render.mjs --report report.json --out report.html`. Keep entity colors consistent, number exhibits, reconcile repeated metrics, and remove unsupported sections rather than filling them with demonstration content.

## Essential rules

- Include number, conclusion title, subtitle, plot, notes, and source. Replace all demonstration text and data in a user deliverable.
- Keep encodings honest: bars and areas start at zero; bubble radii follow the square root of values; forecasts are visually distinguished and marked with E. State when a line axis does not start at zero.
- Use dual axes only for a scale plus a rate/multiple combination; avoid two same-unit measures on separate axes.
- Use one palette per output. Default to light gray pages, white cards, dark text, and restrained research colors. Custom primary colors or `palette: "mono"` are supported.
- Do not infer densities from five-number summaries, paths from aggregate edges, or a mutually exclusive composition from overlapping percentages.
- State statistical methods, sample sizes, interval/error-bar definitions, and multiplicity handling. Externally supplied model estimates must retain their real method and source.
- Keep every output in one language. Bilingual delivery uses two complete versions. Preserve necessary names and original identifiers.
- Include inspectable data and reconcile title, text, and plot values. The engine does not prove arbitrary narrative claims.
- Generate offline, self-contained HTML. Fetch necessary external data before creating a spec; do not add remote scripts, fonts, or image dependencies to the output.
- Extend the engine source with a new contract and sample only when an existing type cannot express the actual data. Build and validate before use.

## Commands

```bash
node scripts/render.mjs --spec exhibit.json --out exhibit.html --lang en
node scripts/render.mjs --spec exhibit.json --svg exhibit.svg --lang en
node scripts/render.mjs --report report.json --out report.html --lang en
node scripts/render.mjs --check exhibit.json
node scripts/verify.mjs exhibit.html
node scripts/build.mjs
node scripts/validate.mjs
```

Maintain `engine/src/`; rebuild the engine, catalogs, and samples with `build.mjs`. Use the repository's pinned Node version when checking generated files byte for byte. Browser verification needs optional `playwright-core` and a local Chrome or Edge installation; rendering itself has no npm dependency.
