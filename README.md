# Rāga Atlas

A focused raga reference with two modes. **Carnatic** covers the 72 melakarta
ragas and a curated set of janya ragas. **Hindustani** covers Bhatkhande's ten
thāṭs and thirty ragas, written in his notation (komal underlined, tīvra Ma
stroked), with vādī/samvādī, pakaḍ and time of day. The switch sits above the
logo; each mode remembers its own raga, filter and voice.

At the foot of the atlas page is a **practice loop**: type any sargam in the
selected raga, or pick a generated exercise, set the tempo, speed and tāla, and
it repeats against a metronome until stopped. Spaces never matter. Each bar
(`|`) lasts a chosen number of beats and its notes share them equally, so
`SRG|RGM` in four-beat bars spaces three notes evenly over four beats; with no
bar lines each note is one beat. Notes in brackets share a slot (`S(RG)M`), `-`
holds, `,` rests, `.N` and `S'` are the octaves below and above. The click can sound on every beat or only
where a bar starts. Loops can be named and saved with their tempo and settings.
A pattern remembers the raga it was written in and each note as a step of that
raga's scale, so opening it in another raga re-spells it on the same steps:
`SRG|RGM` from Bhairav becomes `SRG|RGP` in the five-note Bhupali. The interface follows the bundled Rāga Atlas
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

## Hosting

The public build lives at <https://www.ragaatlas.com/>.

Rāga Atlas is a static site with no backend, so any static host works. Pushing
to `main` runs [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml),
which builds the site and publishes it to the `gh-pages` branch that GitHub
Pages serves. [`public/CNAME`](public/CNAME) tells GitHub Pages which domain
to use; `ragaatlas.com` and `lexmanm.github.io/raga-atlas/` redirect to it.

Hosts that serve the site from a subpath need that subpath as `BASE_PATH` at
build time:

```bash
BASE_PATH=/raga-atlas/ npm run build
```

Hosts that serve from the root of a domain (Netlify, Cloudflare Pages, a plain
web server, or a GitHub Pages custom domain) need no setting; the default base
is `/`. In every case the deployable output is the `dist/` directory, with the
build command `npm run build`.

## Development policy

Rāga Atlas is agent agnostic. Its build, runtime, tests, and documentation work
from an ordinary terminal without any coding agent or vendor service. The
repository policy is in [`AGENTS.md`](AGENTS.md), and can be checked with:

```bash
npm run check:agnostic
```

## License

Rāga Atlas is available under the [MIT License](LICENSE).

## Design standards

Interface decisions follow the documented UX standards in [`docs/ux/`](docs/ux/) —
type scale, spacing grid, color and contrast, interaction states, and the
WCAG 2.2 AA floor. `scripts/ux-audit.js` measures a running page against them
from the browser console; see [`docs/ux/README.md`](docs/ux/README.md) for the
review process.
