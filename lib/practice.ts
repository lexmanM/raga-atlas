import type { PracticePattern, PracticeStep } from './audio-engine';
import { SWARS } from './hindustani';
import { ascent, descent, pitchClass, type Raga, type Swara } from './ragas';
import type { Tradition } from './traditions';

// A practice pattern is typed the way sargam is written on paper. Spaces never mean
// anything, so it can be written tight or spread out, by hand or from the buttons:
//
//   SRG|RGM   =   S R G | R G M     every note is one slot; each bar lasts the same number
//                                   of beats however many slots it holds, so three notes
//                                   spread evenly over a four-beat bar
//   SRGMPDNS'                       with no bar lines, a slot is simply one beat
//   S(RG)M                          notes in brackets share one slot
//   S--R                            a dash holds the note before it for another slot
//   S,R,                            a comma is a slot of silence
//   .N  S'                          a dot before is the octave below, a tick after the one above
//
// The pattern is always in a rāga, so a bare letter is enough: R means whichever Ri or
// Re this rāga has. Only a rāga that owns two forms of one note needs more — lower case
// for the lower one and upper case for the higher (the Hindustani typed convention:
// m / M, n / N), or the Carnatic number (N2, N3).

export type PatternElement = { kind: 'note'; semitones: number; step: number } | { kind: 'hold' } | { kind: 'rest'; step: number };
export type PatternBeat = { text: string; elements: PatternElement[]; grouped?: boolean; error?: string };
// Where one written element sits: which bar, which slot of that bar's slots, which
// part of that slot. Turning this into beats waits for the bar length and speed.
type Placed = { kind: 'note' | 'rest' | 'hold'; semitones: number | null; bar: number; slot: number; slots: number; part: number; parts: number };
export type ParsedPattern = { beats: PatternBeat[]; placed: Placed[]; bars: number[]; barred: boolean; notes: number; length: number; errors: string[] };

const LETTERS = 'SRGMPDN';
const NAMES: Record<Tradition, string[]> = { carnatic: ['Sa', 'Ri', 'Ga', 'Ma', 'Pa', 'Da', 'Ni'], hindustani: ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'] };

type Variant = { position: number; label: string };
/** The forms of each of the seven notes this rāga actually uses, lowest first. */
export function variantsOf(raga: Raga, tradition: Tradition): Map<string, Variant[]> {
  const found = new Map<string, Variant[]>();
  for (const swara of [...raga.arohana, ...raga.avarohana]) {
    const position = pitchClass(swara.semitones); const letter = tradition === 'hindustani' ? SWARS[position].letter : swara.label[0];
    const list = found.get(letter) ?? []; if (!list.some((item) => item.position === position)) list.push({ position, label: swara.label.replace(/[̣̇]/g, '') });
    found.set(letter, list.sort((a, b) => a.position - b.position));
  }
  return found;
}

// One written thing: a note with its octave marks, a hold, a rest, a bracket — or, last, anything
// else that is not a space, so that it can be pointed at rather than silently dropped.
export const WRITTEN = /\.*[A-Za-z]\d?'*|-|,|\(|\)|\S/g;

export function parsePattern(text: string, raga: Raga, tradition: Tradition): ParsedPattern {
  const variants = variantsOf(raga, tradition); const beats: PatternBeat[] = []; const placed: Placed[] = []; const errors: string[] = []; const bars: number[] = []; let steps = 0;
  const resolve = (part: string): number | string => {
    const [, below, typedLetter, digit, above] = /^(\.*)([A-Za-z])(\d?)('*)$/.exec(part) ?? []; if (!typedLetter) return `“${part}” is not sargam`;
    const letter = typedLetter.toUpperCase(); const name = NAMES[tradition][LETTERS.indexOf(letter)]; const options = variants.get(letter);
    if (!name) return `“${typedLetter}” is not a note name`;
    if (!options) return `${name} is not in ${raga.name}`;
    // One form in the rāga: the letter is enough, in either case. Two forms: the
    // number picks one (Carnatic), otherwise lower case is the lower, upper the higher.
    const chosen: Variant | undefined = digit ? options.find((item) => item.label === letter + digit) : options.length === 1 || typedLetter !== letter ? options[0] : options.at(-1);
    return chosen ? chosen.position + 12 * (above.length - below.length) : `${letter}${digit} is not in ${raga.name}`;
  };
  text.split('|').forEach((segment) => {
    // Gather the bar's slots first: a slot is one written thing, or everything inside one pair of brackets.
    const slots: string[][] = []; let group: string[] | null = null; let problem = '';
    for (const part of segment.match(WRITTEN) ?? []) {
      // The first thing wrong is the one worth reporting; what follows is usually its echo.
      if (part === '(') { if (group) problem ||= 'Brackets cannot sit inside brackets'; else group = []; }
      else if (part === ')') { if (!group) problem ||= 'A “)” has no “(” before it'; else if (group.length > 0) slots.push(group); group = null; }
      else if (group) group.push(part); else slots.push([part]);
    }
    if (group) { problem ||= 'A “(” is never closed'; if (group.length > 0) slots.push(group); }
    if (problem) errors.push(problem);
    if (slots.length === 0) return;
    const bar = bars.length; bars.push(slots.length);
    slots.forEach((parts, slot) => {
      const beat: PatternBeat = { text: parts.join(''), elements: [], grouped: parts.length > 1 };
      parts.forEach((part, index) => {
        if (beat.error) return;
        const where = { bar, slot, slots: slots.length, part: index, parts: parts.length };
        if (part === '-') { placed.push({ kind: 'hold', semitones: null, ...where }); beat.elements.push({ kind: 'hold' }); return; }
        if (part === ',') { placed.push({ kind: 'rest', semitones: null, ...where }); beat.elements.push({ kind: 'rest', step: steps++ }); return; }
        const semitones = resolve(part);
        if (typeof semitones === 'string') { beat.error = semitones; return; }
        placed.push({ kind: 'note', semitones, ...where }); beat.elements.push({ kind: 'note', semitones, step: steps++ });
      });
      if (beat.error) errors.push(beat.error);
      beats.push(beat);
    });
  });
  return { beats, placed, bars, barred: text.includes('|'), notes: placed.filter((item) => item.kind === 'note').length, length: beats.length, errors: [...new Set(errors)] };
}

/** How a note is typed so that parsePattern reads it back as the same pitch. */
export function typed(semitones: number, raga: Raga, tradition: Tradition): string {
  const position = pitchClass(semitones); const octave = Math.floor(semitones / 12);
  const letter = tradition === 'hindustani' ? SWARS[position].letter : [...raga.arohana, ...raga.avarohana].find((swara) => pitchClass(swara.semitones) === position)?.label[0] ?? 'S';
  const options = variantsOf(raga, tradition).get(letter) ?? []; let text = letter;
  if (options.length > 1) text = tradition === 'hindustani' ? (options[0].position === position ? letter.toLowerCase() : letter) : options.find((item) => item.position === position)?.label ?? letter;
  return '.'.repeat(Math.max(0, -octave)) + text + "'".repeat(Math.max(0, octave));
}

export type Timing = { speed: number; barBeats: number; accents: number[]; click: 'beat' | 'bar' | 'off' };
/** True when the bar length, not the space, sets the pace: bars were written and a bar length is chosen. */
export const fitsBars = (parsed: ParsedPattern, barBeats: number) => barBeats > 0 && parsed.barred;

/** The written pattern laid over the beat. With bar lines and a bar length, each bar takes that many
 *  beats and its slots share them equally — three notes in a four-beat bar are 1⅓ beats apart, and the
 *  next bar's first note lands back on the beat. Otherwise a slot is one beat. Speed divides both. */
export function timed(parsed: ParsedPattern, timing: Timing): PracticePattern {
  const fitted = fitsBars(parsed, timing.barBeats); const barStarts: number[] = []; let cursor = 0;
  parsed.bars.forEach((slots) => { barStarts.push(cursor); cursor += fitted ? timing.barBeats : slots; });
  const steps: PracticeStep[] = [];
  for (const item of parsed.placed) {
    const slotBeats = fitted ? timing.barBeats / item.slots : 1; const beats = slotBeats / item.parts / timing.speed;
    const start = (barStarts[item.bar] + (item.slot + item.part / item.parts) * slotBeats) / timing.speed;
    if (item.kind === 'hold') { const last = steps.at(-1); if (last) last.beats += beats; } else steps.push({ semitones: item.semitones, start, beats });
  }
  const cycle = Math.max(1, timing.accents.length); const loopBeats = Math.ceil(Math.max(1, Math.ceil(cursor / timing.speed - 1e-9)) / cycle) * cycle;
  const weightAt = (beat: number) => timing.accents[beat % cycle] ?? 0;
  // Every beat keeps the tāla's own accents. Bar starts are all marked, sam a little more; one that
  // falls between beats (a four-beat bar at 3×) still gets its click.
  const ticks = timing.click === 'off' ? [] : timing.click === 'beat' ? Array.from({ length: loopBeats }, (_, beat) => ({ start: beat, weight: weightAt(beat) }))
    : barStarts.map((at) => at / timing.speed).map((start) => ({ start, weight: Number.isInteger(start) ? Math.max(1, weightAt(start)) : 1 }));
  return { steps, loopBeats, ticks };
}

// ---- Presets: the standard exercises, built from whichever rāga is selected ----
const ladder = (notes: Swara[], direction: 1 | -1) => { const positions = [...new Set(notes.map((note) => pitchClass(note.semitones)))].filter((position) => position !== 0).sort((a, b) => a - b); const rungs = [0, ...positions, 12]; return direction === 1 ? rungs : rungs.reverse(); };
const groups = (rungs: number[], shape: number[]) => { const out: number[][] = []; for (let at = 0; at + Math.max(...shape) < rungs.length; at++) out.push(shape.map((offset) => rungs[at + offset])); return out; };

export function presets(raga: Raga, tradition: Tradition): { id: string; label: string; text: string }[] {
  // Written tight, the way the buttons write. Spaces would be harmless, but they would also be noise.
  const write = (list: number[][]) => list.map((group) => group.map((semitones) => typed(semitones, raga, tradition)).join('')).join('|');
  const up = ladder(raga.arohana, 1); const down = ladder(raga.avarohana, -1);
  const both = (shape: number[]) => `${write(groups(up, shape))}|${write(groups(down, shape))}`;
  const list = [
    // No bar lines here: the way up and the way down are often different lengths (Yaman is 7 and 8),
    // and unequal bars would play at unequal speeds. Without bars each note is one beat; the space
    // between the two halves is only there to be read.
    { id: 'scale', label: 'Scale', text: `${write([ascent(raga).map((note) => note.semitones)])} ${write([descent(raga).map((note) => note.semitones)])}` },
    { id: 'threes', label: 'Threes', text: both([0, 1, 2]) },
    { id: 'fours', label: 'Fours', text: both([0, 1, 2, 3]) },
    { id: 'zigzag', label: 'Zigzag', text: both([0, 1, 0]) },
    { id: 'doubles', label: 'Doubles', text: `${write(up.map((rung) => [rung, rung]))}|${write(down.map((rung) => [rung, rung]))}` },
  ];
  // Pakaḍ phrases are unequal too, so they are separated by a beat of rest rather than a bar line.
  if (raga.pakad) list.push({ id: 'pakad', label: 'Pakaḍ', text: raga.pakad.map((phrase) => write([phrase.map((note) => note.semitones)])).join(', ') });
  return list;
}

// ---- The beat: no click, an even click, or a tāla with its sections marked ----
export type Tala = { id: string; label: string; sections: number[] };
export const PLAIN: Tala[] = [{ id: 'plain', label: 'None · even beats', sections: [1] }];
export const TALAS: Record<Tradition, Tala[]> = {
  carnatic: [{ id: 'adi', label: 'Ādi · 8', sections: [4, 2, 2] }, { id: 'rupaka', label: 'Rūpaka · 6', sections: [2, 4] }, { id: 'misra-chapu', label: 'Miśra Chāpu · 7', sections: [3, 2, 2] }, { id: 'khanda-chapu', label: 'Khaṇḍa Chāpu · 5', sections: [2, 3] }],
  hindustani: [{ id: 'tintal', label: 'Tīntāl · 16', sections: [4, 4, 4, 4] }, { id: 'keharwa', label: 'Keharwā · 8', sections: [4, 4] }, { id: 'dadra', label: 'Dādrā · 6', sections: [3, 3] }, { id: 'rupak', label: 'Rūpak · 7', sections: [3, 2, 2] }, { id: 'jhaptal', label: 'Jhaptāl · 10', sections: [2, 3, 2, 3] }, { id: 'ektal', label: 'Ēktāl · 12', sections: [2, 2, 2, 2, 2, 2] }],
};
/** Click weight for each beat of the cycle: 2 on sam, 1 where a section starts, 0 elsewhere. With no tāla every beat is the same. */
export function accentsOf(tala: Tala): number[] {
  if (tala.id === 'plain') return [0];
  return tala.sections.flatMap((size, section) => Array.from({ length: size }, (_, index) => (index > 0 ? 0 : section === 0 ? 2 : 1)));
}
