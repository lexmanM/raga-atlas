import { HINDUSTANI_RAGAS, THAATS } from './hindustani';
import { ALL_RAGAS, MELAKARTAS, type Raga } from './ragas';
import type { Tradition } from './traditions';

// Every rāga and thāṭ has one public address. Rāgas share /raga/, thāṭs sit under
// /thaat/ because seven of them share a name with a rāga (Bhairav, Kafi, Todi …).
// A name found in both traditions (Hamsadhwani) gets the tradition appended to
// both, so neither side quietly owns the plain address.

export const SITE_URL = 'https://www.ragaatlas.com';

export const traditionOf = (raga: Raga): Tradition => (raga.group === 'melakarta' || raga.group === 'janya' ? 'carnatic' : 'hindustani');

/** Lowercase, hyphenated, diacritics dropped: "Rāga Darbāri" → "raga-darbari". */
export const slugify = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const RAGAS = [...ALL_RAGAS, ...HINDUSTANI_RAGAS];
/** Every page-worthy entry, in the order the sitemap and the index list them. */
export const PAGES: Raga[] = [...MELAKARTAS, ...ALL_RAGAS.filter((item) => item.group === 'janya'), ...HINDUSTANI_RAGAS, ...THAATS];

/** Each entry's address when every rāga is called by `nameOf`, applying the shared-name rule above. */
function addresses(nameOf: (raga: Raga) => string) {
  const traditionsUsing = new Map<string, Set<Tradition>>();
  for (const raga of RAGAS) {
    const slug = slugify(nameOf(raga));
    traditionsUsing.set(slug, (traditionsUsing.get(slug) ?? new Set()).add(traditionOf(raga)));
  }
  const paths = new Map<string, string>();
  for (const raga of PAGES) {
    const slug = slugify(nameOf(raga));
    paths.set(raga.id, raga.group === 'thaat' ? `/thaat/${slug}` : (traditionsUsing.get(slug)?.size ?? 0) > 1 ? `/raga/${slug}-${traditionOf(raga)}` : `/raga/${slug}`);
  }
  return paths;
}

const pathById = addresses((raga) => raga.name);
const byPath = new Map<string, Raga>();
for (const raga of PAGES) {
  const path = pathById.get(raga.id) ?? '/';
  // Two entries on one address would silently hide one of them, so the build stops instead.
  const taken = byPath.get(path);
  if (taken) throw new Error(`"${raga.name}" and "${taken.name}" would both live at ${path}`);
  byPath.set(path, raga);
}

// Pages first went up under the formal melakarta names (/raga/mechakalyani). Those
// addresses are indexed and linked, so each one that changed keeps a redirect.
const formalPaths = addresses((raga) => raga.formalName ?? raga.name);
/** [old address, current address] for every page whose address the common names changed. */
export const MOVED: [string, string][] = PAGES.flatMap((raga) => {
  const from = formalPaths.get(raga.id) ?? '/'; const to = pathById.get(raga.id) ?? '/';
  if (from === to) return [];
  if (byPath.has(from)) throw new Error(`The old address ${from} is now another page, so it cannot redirect to ${to}`);
  return [[from, to] as [string, string]];
});

export const pathOf = (raga: Raga) => pathById.get(raga.id) ?? '/';

/** The rāga or thāṭ a pathname names, forgiving a trailing slash or .html; undefined for the home page or an unknown path. */
export function ragaAt(pathname: string): Raga | undefined {
  const clean = pathname.replace(/\.html$/, '').replace(/\/+$/, '');
  return byPath.get(clean);
}
