# Contributing

Keep each change tied to a real analytical use case. Preserve the distinction between supplied data, calculated statistics, and narrative interpretation.

## Source and generated files

Work in `skills/bizos-charts/engine/src/`. Run the build from the skill directory using the Node.js version in `.nvmrc`:

```bash
cd skills/bizos-charts
node scripts/build.mjs
node scripts/validate.mjs
```

The build generates the bundled engine, catalogs, specification reference, chart index, theme tokens, atlases, and report samples. Include the relevant generated changes in your contribution.

For a new chart type, provide a registered ID, English and Chinese names, an analytical question, suitability/exclusion guidance, field contracts, validation, rendering, and exactly one sample specification. State that sample data are illustrative. Every numerical claim in a sample title must be reproducible from its data.

## Browser checks

Rendering has no npm dependency. Real-browser checks additionally need `playwright-core` and Chrome or Edge. Check changed outputs at 1280px and 390px; inspect labeling, scaling, data tables, source lines, and exports. Never report an `unverified` result as a browser pass.

The README media generator is `tools/render-readme-media.mjs`. It needs `playwright-core` and a local Chrome or Edge (`BIZOS_CHROME`). Point `BIZOS_PLAYWRIGHT_CORE` to the module path, then run it from the repository root. It renders every bundled sample with the engine, copies the HTML table exhibits and the report samples into SVG from their real browser layout, adds CSS-only entrance animations (no script; readers who prefer reduced motion see the finished chart), writes `docs/media/`, and regenerates the gallery sections of `README.md` and `README.zh-CN.md` between the `gallery` markers. Rerun it and commit the results when a chart type, a sample, a report sample or the house style changes. While iterating, `--lang en` or `--only T01,hero,reports` limits a run; partial runs leave the READMEs unchanged.

## Branches

`main` contains published source. `develop` is available for integration work. Use feature or fix branches and open a focused pull request with the behavior change and relevant validation. This repository does not include automatic hosted build workflows.

## Scope and licensing

Do not add credentials, user data, local dependencies, private application resources, or service configuration. Changes must remain offline and self-contained at render time. Contributions are distributed under the repository's Apache License 2.0; retain any legally necessary license notices.
