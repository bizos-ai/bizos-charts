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

The animated preview generator is `tools/render-previews.mjs`. It needs `playwright-core`, a local browser, and FFmpeg. Point `BIZOS_PLAYWRIGHT_CORE` to the module path, then run it from the repository root. Set `BIZOS_FFMPEG` if FFmpeg is not on PATH. It regenerates English preview pages, checks browser errors and network requests, records real scrolling, tooltips and data-table interactions, and encodes the looping GIFs used in the introduction. Temporary frames stay in the ignored `output/` directory.

## Branches

`main` contains published source. `develop` is available for integration work. Use feature or fix branches and open a focused pull request with the behavior change and relevant validation. This repository does not include automatic hosted build workflows.

## Scope and licensing

Do not add credentials, user data, local dependencies, private application resources, or service configuration. Changes must remain offline and self-contained at render time. Contributions are distributed under the repository's Apache License 2.0; retain any legally necessary license notices.
