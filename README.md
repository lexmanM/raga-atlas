# Rāga Atlas

A focused Carnatic raga reference for exploring the 72 melakarta ragas and a
curated set of janya ragas. The interface follows the bundled Rāga Atlas
prototype: a searchable atlas, a taxonomy primer, playable arohana and
avarohana note paths, tonic and tempo controls, Tambura drone, spectrum view,
and chromatic svarasthāna map.

Everything runs locally in the browser. No accounts, telemetry, cloud storage,
recording archive, or backend service are required.

## Run locally

Requires Node 22 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`. On macOS,
you can also double-click [`Launch Ragas.command`](Launch%20Ragas.command).

For a production build and local preview:

```bash
npm run build
npm run start
```

The audio controls use the browser Web Audio API. The first playback action
may require a user gesture so the browser can resume its audio context.

## Atlas controls

- **Atlas** searches and filters melakarta and janya ragas.
- **Taxonomy** explains svarasthāna, arohana, avarohana, melakarta, chakras,
  and janya ragas.
- Selecting a raga shows its note paths, playable note cards, spectrum guides,
  and the 12-position chromatic map.
- **Śruti**, **Kāla**, **Tambura**, **Intonation**, **Voice**, and **Kampita**
  adjust playback and visualization behavior.

## Development policy

Rāga Atlas is agent agnostic. Its build, runtime, tests, and documentation work
from an ordinary terminal without any coding agent or vendor service. The
repository policy is in [`AGENTS.md`](AGENTS.md), and can be checked with:

```bash
npm run check:agnostic
```

## License

Rāga Atlas is available under the [MIT License](LICENSE).
