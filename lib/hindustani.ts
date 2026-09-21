import type { Raga, Swara } from './ragas';

// Hindustani music names the same twelve positions Carnatic does, but with twelve
// names instead of sixteen: five notes have a lowered (komal) form, Ma has a
// raised (tivra) one, Sa and Pa never move. That makes a label a pure function of
// position, so this catalogue is written in the typed convention musicians use —
//   S r R g G m M P d D n N      lower case = komal, M = tivra Ma
//   .N = the Ni below Sa (mandra)      S' = the Sa above (tār)
// — and parsed, rather than spelled out as semitone numbers nobody can proofread.
const POSITIONS = 'SrRgGmMPdDnN';

export type SwarMark = 'komal' | 'tivra' | null;
export const SWARS: { letter: string; mark: SwarMark; name: string }[] = [
  { letter: 'S', mark: null, name: 'Sa' },
  { letter: 'R', mark: 'komal', name: 'komal Re' },
  { letter: 'R', mark: null, name: 'Re' },
  { letter: 'G', mark: 'komal', name: 'komal Ga' },
  { letter: 'G', mark: null, name: 'Ga' },
  { letter: 'M', mark: null, name: 'Ma' },
  { letter: 'M', mark: 'tivra', name: 'tivra Ma' },
  { letter: 'P', mark: null, name: 'Pa' },
  { letter: 'D', mark: 'komal', name: 'komal Dha' },
  { letter: 'D', mark: null, name: 'Dha' },
  { letter: 'N', mark: 'komal', name: 'komal Ni' },
  { letter: 'N', mark: null, name: 'Ni' },
];

function swar(token: string): Swara {
  const lower = token.startsWith('.'); const upper = token.endsWith("'");
  const letter = token.replace(/^\./, '').replace(/'$/, '');
  const position = POSITIONS.indexOf(letter);
  if (position < 0 || letter.length !== 1) throw new Error(`Unknown swar "${token}"`);
  // The plain-text label keeps the typed convention and adds the octave dot, for
  // tooltips and anywhere else the drawn glyph cannot go.
  return { label: letter + (lower ? '̣' : upper ? '̇' : ''), semitones: position + (lower ? -12 : upper ? 12 : 0) };
}
const line = (text: string): Swara[] => text.trim().split(/\s+/).map(swar);
const phrases = (text: string): Swara[][] => text.split(',').map((phrase) => phrase.trim()).filter(Boolean).map(line);
const position = (token: string) => swar(token).semitones;

// Bhatkhande's ten thāts, in the order he gave them.
const THAAT_SCALES: [string, string][] = [
  ['Bilawal', 'S R G m P D N'], ['Kalyan', 'S R G M P D N'], ['Khamaj', 'S R G m P D n'], ['Bhairav', 'S r G m P d N'], ['Purvi', 'S r G M P d N'],
  ['Marwa', 'S r G M P D N'], ['Kafi', 'S R g m P D n'], ['Asavari', 'S R g m P d n'], ['Bhairavi', 'S r g m P d n'], ['Todi', 'S r g M P d N'],
];

export const THAATS: Raga[] = THAAT_SCALES.map(([name, scale], index) => {
  const arohana = line(scale);
  return { id: `thaat-${name.toLowerCase()}`, name, group: 'thaat', thaat: name, thaatNumber: index + 1, arohana, avarohana: [...arohana].reverse() };
});

// Prahar: the eight three-hour watches of the day, 1 = 6–9 am … 8 = 3–6 am.
const raga = (name: string, thaat: string, aroha: string, avaroha: string, vadi: string, samvadi: string, prahar: number, pakad: string): Raga => ({
  id: `raga-${name.toLowerCase().replaceAll(' ', '-')}`, name, group: 'raga', thaat, thaatNumber: THAAT_SCALES.findIndex(([item]) => item === thaat) + 1,
  arohana: line(aroha), avarohana: line(avaroha), vadi: position(vadi), samvadi: position(samvadi), prahar, pakad: phrases(pakad),
});

// Āroha, avaroha, vādi/samvādi and time follow the standard Bhatkhande-tradition
// descriptions. Gharānās differ on details; treat these as the textbook form.
export const HINDUSTANI_RAGAS: Raga[] = [
  raga('Yaman', 'Kalyan', ".N R G M D N S'", "S' N D P M G R S", 'G', 'N', 5, '.N R G, R S, P M G R S'),
  raga('Bhupali', 'Kalyan', "S R G P D S'", "S' D P G R S", 'G', 'D', 5, 'G R S .D, S R G, P G, D P G, R S'),
  raga('Kedar', 'Kalyan', "S m P D P N D S'", "S' N D P M P D P m G m R S", 'm', 'S', 5, 'S m, m P, D P m, P m, R S'),
  raga('Alhaiya Bilawal', 'Bilawal', "S G R G P D N S'", "S' N D P D n D P m G m R S", 'D', 'G', 2, 'G R G P, D n D P, m G, m R S'),
  raga('Durga', 'Bilawal', "S R m P D S'", "S' D P m R S", 'm', 'S', 6, 'R m P D, m R, .D S'),
  raga('Bihag', 'Bilawal', ".N S G m P N S'", "S' N D P M P G m G R S", 'G', 'N', 6, '.N S G m P, M P G m G, R S'),
  raga('Hamsadhwani', 'Bilawal', "S R G P N S'", "S' N P G R S", 'S', 'P', 5, 'G P N P, G R, .N .P S'),
  raga('Khamaj', 'Khamaj', "S G m P D N S'", "S' n D P m G R S", 'G', 'N', 6, 'n D, m P D, m G'),
  raga('Desh', 'Khamaj', "S R m P N S'", "S' n D P m G R G S", 'R', 'P', 6, 'R m P, n D P, P D P m, G R G S'),
  raga('Tilang', 'Khamaj', "S G m P N S'", "S' n P m G S", 'G', 'N', 6, 'G m P N, S\' n P, G m G, S'),
  raga('Jog', 'Khamaj', "S G m P n S'", "S' n P m G m g S", 'm', 'S', 6, 'G m P, m G m, g S'),
  raga('Bhairav', 'Bhairav', "S r G m P d N S'", "S' N d P m G r S", 'd', 'r', 1, 'G m d, d P, G m r S'),
  raga('Ahir Bhairav', 'Bhairav', "S r G m P D n S'", "S' n D P m G r S", 'm', 'S', 1, 'S r G m, G m r, .n .D, .n r S'),
  raga('Bairagi', 'Bhairav', "S r m P n S'", "S' n P m r S", 'm', 'S', 1, 'S r m P, m r, .n S'),
  raga('Puriya Dhanashri', 'Purvi', ".N r G M P d N S'", "S' N d P M G M r G r S", 'P', 'r', 4, '.N r G M P, d P, M G M r G, r S'),
  raga('Marwa', 'Marwa', "S r G M D N S'", "S' N D M G r S", 'r', 'D', 4, 'D M G r, G M G r, S'),
  raga('Sohini', 'Marwa', "S G M D N S'", "S' N D M G r S", 'D', 'G', 8, "M D N S', r' S', N D, M G"),
  raga('Kafi', 'Kafi', "S R g m P D n S'", "S' n D P m g R S", 'P', 'S', 6, 'S S R R g g m m P'),
  raga('Bageshri', 'Kafi', "S g m D n S'", "S' n D m P D m g R S", 'm', 'S', 7, '.D .n S m, D n D, m g R S'),
  raga('Bhimpalasi', 'Kafi', ".n S g m P n S'", "S' n D P m g R S", 'm', 'S', 3, '.n S m, m g, P m, g, m g R S'),
  raga('Brindavani Sarang', 'Kafi', "S R m P N S'", "S' n P m R S", 'R', 'P', 3, '.N S R, m R, P m R, S'),
  raga('Megh', 'Kafi', "S R m P n S'", "S' n P m R S", 'S', 'P', 7, 'R m P n, P m R, .n S'),
  raga('Shivranjani', 'Kafi', "S R g P D S'", "S' D P g R S", 'P', 'S', 7, 'g P D P, g R, S R .D S'),
  raga('Asavari', 'Asavari', "S R m P d S'", "S' n d P m g R S", 'd', 'g', 2, 'R m P, n d P, m P d m P g, R S'),
  raga('Jaunpuri', 'Asavari', "S R m P d n S'", "S' n d P m g R S", 'd', 'g', 2, 'm P, n d P, m P g, R m P'),
  raga('Darbari Kanada', 'Asavari', "S R g m P d n S'", "S' d n P m P g m R S", 'R', 'P', 7, 'g m R S, .d .n S R, S'),
  raga('Bhairavi', 'Bhairavi', "S r g m P d n S'", "S' n d P m g r S", 'm', 'S', 1, 'm g, S r S, .d .n S'),
  raga('Malkauns', 'Bhairavi', "S g m d n S'", "S' n d m g S", 'm', 'S', 7, 'm g, m d n d, m g S'),
  raga('Todi', 'Todi', "S r g M d N S'", "S' N d P M g r S", 'd', 'g', 2, '.d .N S r g, r g r S'),
  raga('Multani', 'Todi', ".N S g M P N S'", "S' N d P M g r S", 'P', 'S', 4, '.N S M g, P g, r S'),
];

export const HINDUSTANI_ALL = [...HINDUSTANI_RAGAS, ...THAATS];

export const PRAHARS: { hours: string; caption: string }[] = [
  { hours: '6–9', caption: 'am · early morning' }, { hours: '9–12', caption: 'am · late morning' }, { hours: '12–3', caption: 'pm · afternoon' }, { hours: '3–6', caption: 'pm · dusk' },
  { hours: '6–9', caption: 'pm · evening' }, { hours: '9–12', caption: 'pm · late evening' }, { hours: '12–3', caption: 'am · midnight' }, { hours: '3–6', caption: 'am · before dawn' },
];

const JATI = ['', '', '', '', '', 'Auḍav', 'Ṣāḍav', 'Sampūrṇa'];
// The āroha given for these is the characteristic way up, which steps over a note
// (Yaman opens Ni–Re–Ga past Sa and Pa; Todi passes Pa by). The rāga still owns all
// seven and is classed sampūrṇa, so counting the written āroha would mislabel it.
const SAMPURNA_DESPITE_AROHA = new Set(['raga-yaman', 'raga-todi']);
/** Auḍav–Sampūrṇa and the like: how many distinct swars the way up and the way down use. */
export function jati(item: Raga) {
  if (SAMPURNA_DESPITE_AROHA.has(item.id)) return 'Sampūrṇa';
  const count = (notes: Swara[]) => Math.min(7, new Set(notes.map((note) => SWARS[((note.semitones % 12) + 12) % 12].letter)).size);
  const up = JATI[count(item.arohana)]; const down = JATI[count(item.avarohana)];
  return up && down ? (up === down ? up : `${up}–${down}`) : '';
}
