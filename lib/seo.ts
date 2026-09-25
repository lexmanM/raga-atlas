import { HINDUSTANI_RAGAS, PRAHARS, SWARS } from './hindustani';
import { ascent, descent, MELAKARTAS, pitchClass, type Raga, type Swara } from './ragas';
import { pathOf, SITE_URL } from './routes';

// Each page's title and description, built only from facts already in the data, so
// search results, link previews and the page's own summary say the same thing.

export type PageMeta = { title: string; description: string; url: string };

const SITE_NAME = 'Rāga Atlas';
export const HOME_META: PageMeta = {
  title: 'Rāga Atlas — Carnatic & Hindustani raga reference',
  description: 'A focused Rāga Atlas for Carnatic and Hindustani music: melakarta and janya, thāṭ and rāga.',
  url: `${SITE_URL}/`,
};
export const OG_IMAGE = { url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Rāga Atlas logo: a veena beside the words Rāga Atlas' };

const carnaticLine = (notes: Swara[]) => notes.map((note) => note.label).join(' ');
/** Hindustani letters carry komal and tivra in their case, which reads as noise out of context, so prose names each swar. */
const swarNames = (raga: Raga) => [...new Set([...raga.arohana, ...raga.avarohana].map((note) => pitchClass(note.semitones)))].sort((a, b) => a - b).map((position) => SWARS[position].name).join(', ');
const hindustaniLine = (notes: Swara[]) => notes.map((note) => `${note.semitones < 0 ? 'lower ' : note.semitones > 11 ? 'upper ' : ''}${SWARS[pitchClass(note.semitones)].name}`).join(', ');

/** One or two plain sentences that say what the rāga is, for the page itself and for its meta description. */
export function describe(raga: Raga): string {
  switch (raga.group) {
    case 'melakarta':
      return `${raga.name} is melakarta ${raga.parentMela} of the 72 parent rāgas in Carnatic music. Ārohana ${carnaticLine(ascent(raga))}; avarohana ${carnaticLine(descent(raga))}.`;
    case 'janya':
      return `${raga.name} is a Carnatic janya rāga derived from melakarta ${raga.parentMela}, ${MELAKARTAS[(raga.parentMela ?? 1) - 1].name}. Ārohana ${carnaticLine(ascent(raga))}; avarohana ${carnaticLine(descent(raga))}.`;
    case 'thaat': {
      const filed = HINDUSTANI_RAGAS.filter((item) => item.thaat === raga.thaat).map((item) => item.name);
      return `${raga.name} is thāṭ ${raga.thaatNumber} of the ten Hindustani parent scales: ${swarNames(raga)}.${filed.length ? ` Rāgas filed under it here: ${filed.join(', ')}.` : ''}`;
    }
    case 'raga': {
      const time = raga.prahar ? PRAHARS[raga.prahar - 1] : undefined;
      return `${raga.name} is a Hindustani rāga of ${raga.thaat} thāṭ${time ? `, sung ${time.hours} ${time.caption.replace(' · ', ' (')})` : ''}. Vādī ${SWARS[raga.vadi ?? 0].name}, samvādī ${SWARS[raga.samvadi ?? 0].name}. Āroha: ${hindustaniLine(raga.arohana)}. Avaroha: ${hindustaniLine(raga.avarohana)}.`;
    }
  }
}

const kind = (raga: Raga) => ({ melakarta: `Carnatic melakarta ${raga.parentMela}`, janya: 'Carnatic janya rāga', raga: `Hindustani rāga · ${raga.thaat} thāṭ`, thaat: 'Hindustani thāṭ' })[raga.group];

export function pageMeta(raga?: Raga): PageMeta {
  if (!raga) return HOME_META;
  return { title: `${raga.name} — ${kind(raga)} | ${SITE_NAME}`, description: `${describe(raga)} Hear it, play it and practise with a drone.`, url: `${SITE_URL}${pathOf(raga)}` };
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The head tags a pre-rendered page carries beyond its title and description. */
export function headTags(meta: PageMeta) {
  const property = (name: string, content: string | number) => `<meta property="${name}" content="${escape(String(content))}" />`;
  const named = (name: string, content: string) => `<meta name="${name}" content="${escape(content)}" />`;
  return [
    `<link rel="canonical" href="${escape(meta.url)}" />`,
    property('og:type', 'website'), property('og:site_name', SITE_NAME), property('og:title', meta.title), property('og:description', meta.description), property('og:url', meta.url),
    property('og:image', OG_IMAGE.url), property('og:image:width', OG_IMAGE.width), property('og:image:height', OG_IMAGE.height), property('og:image:alt', OG_IMAGE.alt),
    named('twitter:card', 'summary_large_image'), named('twitter:title', meta.title), named('twitter:description', meta.description), named('twitter:image', OG_IMAGE.url),
  ].join('\n    ');
}

/** Fills a page's head: used by the pre-renderer on the HTML template. */
export function withHead(template: string, meta: PageMeta) {
  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(meta.title)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${escape(meta.description)}$2`)
    .replace('</head>', `    ${headTags(meta)}\n  </head>`);
}

/** Keeps the head in step when the app moves to another rāga without a page load. */
export function applyHead(meta: PageMeta) {
  document.title = meta.title;
  const set = (selector: string, attribute: string, value: string) => { const element = document.head.querySelector(selector); if (element) element.setAttribute(attribute, value); };
  set('meta[name="description"]', 'content', meta.description);
  set('link[rel="canonical"]', 'href', meta.url);
  set('meta[property="og:title"]', 'content', meta.title); set('meta[property="og:description"]', 'content', meta.description); set('meta[property="og:url"]', 'content', meta.url);
  set('meta[name="twitter:title"]', 'content', meta.title); set('meta[name="twitter:description"]', 'content', meta.description);
}
