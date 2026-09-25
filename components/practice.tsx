import { useEffect, useMemo, useRef, useState } from 'react';

import { trackEvent } from '@/lib/analytics';
import { startPractice, type PracticeHandle, type PracticePosition, type PracticeSettings, type Temperament, type Voice } from '@/lib/audio-engine';
import { HINDUSTANI_ALL } from '@/lib/hindustani';
import { accentsOf, fitsBars, parsePattern, PLAIN, presets, respell, TALAS, timed, typed, variantsOf, WRITTEN, type PatternElement, type Timing } from '@/lib/practice';
import { ALL_RAGAS, pitchClass, type Raga } from '@/lib/ragas';
import type { Tradition } from '@/lib/traditions';
import { Swar } from './swar';

const STORE = 'ragas.practice';
type Melody = PracticeSettings['melody'];
// The pattern being worked on. It is either one of the generated exercises, which is
// rebuilt for whichever rāga is open, or something written — kept exactly as written,
// together with the rāga it was written in, so it can be re-spelt for any other.
type Draft = { preset: string } | { text: string; ragaId: string; tradition: Tradition };
// A saved loop is a snapshot: what was written, where, and how it was being played.
type Loop = { id: string; name: string; text: string; ragaId: string; tradition: Tradition; bpm: number; speed: number; bar: number; click: Timing['click']; melody: Melody; tala: string };
type Saved = { draft: Draft; loops: Loop[]; active: string | null; bpm: number; speed: number; bar: number; click: Timing['click']; tala: Record<Tradition, string>; melody: Melody; countIn: boolean };
const DEFAULTS: Saved = { draft: { preset: 'scale' }, loops: [], active: null, bpm: 72, speed: 1, bar: 4, click: 'beat', tala: { carnatic: 'adi', hindustani: 'tintal' }, melody: 'on', countIn: true };
const findRaga = (id: string) => ALL_RAGAS.find((item) => item.id === id) ?? HINDUSTANI_ALL.find((item) => item.id === id);
const BAR_LENGTHS = [0, 2, 3, 4, 5, 6, 7, 8];
const COUNT_IN = 4;

function readSaved(): Saved {
  try { const stored = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Partial<Saved> | null; return { ...DEFAULTS, ...stored, tala: { ...DEFAULTS.tala, ...stored?.tala }, draft: stored?.draft ?? DEFAULTS.draft, loops: Array.isArray(stored?.loops) ? stored.loops : [] }; } catch { return DEFAULTS; }
}

const WORDS = {
  carnatic: { speed: 'Kālam', tala: 'Tāla', speeds: ['1st', '2nd', 'tiśra', '3rd'] },
  hindustani: { speed: 'Laykārī', tala: 'Tāl', speeds: ['ēkgun', 'dugun', 'tigun', 'chaugun'] },
} as const;

/** One written note. Hindustani draws the Bhatkhande glyph; Carnatic keeps the letter, its number and the octave dot the chips use. */
function Note({ semitones, raga, tradition }: { semitones: number; raga: Raga; tradition: Tradition }) {
  if (tradition === 'hindustani') return <Swar semitones={semitones} />;
  const position = pitchClass(semitones); const octave = Math.floor(semitones / 12);
  const label = [...raga.arohana, ...raga.avarohana].find((swara) => pitchClass(swara.semitones) === position)?.label.replace(/[̣̇]/g, '') ?? 'S';
  return <span className="practice-svara">{label[0]}{octave > 0 ? '̇' : octave < 0 ? '̣' : ''}<small>{label.slice(1)}</small></span>;
}

export function PracticeSection({ raga, tradition, sruti, temperament, voice, kampita, onBeforeStart, interrupt }: { raga: Raga; tradition: Tradition; sruti: number; temperament: Temperament; voice: Voice; kampita: boolean; onBeforeStart: () => void; interrupt: number }) {
  const [saved, setSaved] = useState(readSaved); const [octave, setOctave] = useState(0); const [name, setName] = useState(''); const [deleting, setDeleting] = useState<string | null>(null); const [position, setPosition] = useState<PracticePosition | null>(null); const [running, setRunning] = useState(false);
  const handle = useRef<PracticeHandle | null>(null); const taps = useRef<number[]>([]);
  const save = (change: Partial<Saved>) => setSaved((previous) => { const next = { ...previous, ...change }; try { localStorage.setItem(STORE, JSON.stringify(next)); } catch {} return next; });

  const library = useMemo(() => presets(raga, tradition), [raga, tradition]);
  // What is shown is always spelt for the open rāga. A written pattern that came from another
  // rāga is re-spelt on the way to the screen and left untouched in storage, so going back to
  // its own rāga gives back exactly what was written. Editing makes it this rāga's.
  const draft = saved.draft; const origin = 'text' in draft && draft.ragaId !== raga.id ? findRaga(draft.ragaId) : undefined;
  const text = 'preset' in draft ? (library.find((item) => item.id === draft.preset) ?? library[0]).text : origin ? respell(draft.text, origin, draft.tradition, raga, tradition) : draft.text;
  const setText = (value: string) => save({ draft: { text: value, ragaId: raga.id, tradition } });
  const parsed = useMemo(() => parsePattern(text, raga, tradition), [text, raga, tradition]);
  const talas = [...PLAIN, ...TALAS[tradition]]; const tala = talas.find((item) => item.id === saved.tala[tradition]) ?? talas[1];
  const accents = useMemo(() => accentsOf(tala), [tala]);
  const pattern = useMemo(() => timed(parsed, { speed: saved.speed, barBeats: saved.bar, accents, click: saved.click }), [parsed, saved.speed, saved.bar, accents, saved.click]);
  const playable = parsed.errors.length === 0 && parsed.notes > 0; const fitted = fitsBars(parsed, saved.bar);
  const settings = useMemo<PracticeSettings>(() => ({ pattern, bpm: saved.bpm, melody: saved.melody, sruti, temperament, voice, kampita }), [pattern, saved.bpm, saved.melody, sruti, temperament, voice, kampita]);

  const stop = () => { handle.current?.stop(); handle.current = null; setRunning(false); setPosition(null); };
  const start = () => { if (!playable) return; onBeforeStart(); handle.current?.stop(); handle.current = startPractice(settings, { countIn: saved.countIn && saved.click !== 'off' ? COUNT_IN : 0, onPosition: setPosition }); setRunning(true); trackEvent('practice/start'); };
  // A running loop follows the controls. A pattern that stops making sense mid-edit is
  // not sent, so the loop keeps playing the last one that did.
  useEffect(() => { if (handle.current && playable) handle.current.update(settings); }, [settings, playable]);
  // Another rāga is another exercise, and the page's own playback shares the speakers:
  // leaving this rāga, the page playing something itself, or the section going away all end the loop.
  useEffect(() => () => { handle.current?.stop(); handle.current = null; setRunning(false); setPosition(null); }, [raga.id, tradition, interrupt]);

  // Spaces mean nothing in a pattern, so the buttons write none: S, R, –, | gives SR-|.
  const activeLoop = saved.loops.find((item) => item.id === saved.active);
  const keep = () => {
    if (!playable) return;
    const label = name.trim() || `${raga.name} · ${text.replace(/\s+/g, '').slice(0, 14)}`;
    const existing = saved.loops.find((item) => item.name.toLowerCase() === label.toLowerCase());
    const loop: Loop = { id: existing?.id ?? Date.now().toString(36), name: label, text, ragaId: raga.id, tradition, bpm: saved.bpm, speed: saved.speed, bar: saved.bar, click: saved.click, melody: saved.melody, tala: tala.id };
    save({ loops: existing ? saved.loops.map((item) => (item.id === existing.id ? loop : item)) : [...saved.loops, loop], active: loop.id, draft: { text, ragaId: raga.id, tradition } }); setName(label);
  };
  // Loading brings back how it was being played too. A tāla belongs to its tradition, so it only comes back there.
  const load = (loop: Loop) => { save({ draft: { text: loop.text, ragaId: loop.ragaId, tradition: loop.tradition }, active: loop.id, bpm: loop.bpm, speed: loop.speed, bar: loop.bar, click: loop.click, melody: loop.melody, tala: loop.tradition === tradition ? { ...saved.tala, [tradition]: loop.tala } : saved.tala }); setName(loop.name); setDeleting(null); };
  const remove = (loop: Loop) => { save({ loops: saved.loops.filter((item) => item.id !== loop.id), active: saved.active === loop.id ? null : saved.active }); setDeleting(null); };
  const append = (token: string) => setText(text.trimEnd() + token);
  const backspace = () => { const trimmed = text.trimEnd(); const last = [...trimmed.matchAll(WRITTEN)].at(-1); setText(last ? trimmed.slice(0, last.index).trimEnd() : ''); };
  const tap = () => { const now = performance.now(); taps.current = [...taps.current.filter((at) => now - at < 2500), now].slice(-5); if (taps.current.length < 2) return; const gaps = taps.current.slice(1).map((at, index) => at - taps.current[index]); save({ bpm: Math.max(30, Math.min(240, Math.round(60000 / (gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length)))) }); };

  // The preview is laid out bar by bar, so a line can break between bars but never inside one.
  const barred = useMemo(() => parsed.bars.map((slots, bar) => { const from = parsed.bars.slice(0, bar).reduce((sum, size) => sum + size, 0); return parsed.beats.slice(from, from + slots); }), [parsed]);
  const palette = useMemo(() => [...variantsOf(raga, tradition).values()].flat().map((item) => item.position).sort((a, b) => a - b), [raga, tradition]);
  const element = (item: PatternElement, key: number) => item.kind === 'hold' ? <span className="practice-mark" key={key}>–</span> : item.kind === 'rest' ? <span className={`practice-mark ${position?.step === item.step ? 'now' : ''}`} key={key}>·</span> : <span className={`practice-note ${position?.step === item.step ? 'now' : ''} ${position && !position.audible ? 'silent' : ''}`} key={key}><Note semitones={item.semitones} raga={raga} tradition={tradition} /></span>;
  // The lights follow the tāla when there is one, and otherwise count through a bar.
  const lights = accents.length > 1 ? accents : fitted && Number.isInteger(saved.bar / saved.speed) ? Array.from({ length: saved.bar / saved.speed }, (_, index) => (index === 0 ? 2 : 0)) : [];
  const words = WORDS[tradition]; const beatNow = position ? position.beat % Math.max(1, lights.length) : -1;
  const barText = fitted ? `${parsed.bars.length} bars × ${+(saved.bar / saved.speed).toFixed(2)} beats · ` : '';
  const status = !running ? (playable ? `${barText}${pattern.loopBeats} beats a round · ${parsed.notes} notes` : parsed.errors[0] ?? 'Write a few notes to begin')
    : position?.countIn ? `Count-in · ${COUNT_IN - position.beat}` : saved.melody === 'alternate' ? (position?.audible === false ? `Round ${(position?.loop ?? 0) + 1} · your turn` : `Round ${(position?.loop ?? 0) + 1} · listen`) : `Round ${(position?.loop ?? 0) + 1}`;

  return <section className="practice-section" aria-label="Practice loop">
    <div className="section-label"><span>Practice loop</span><em>write a sargam in {raga.name}, set the beat, and it repeats until you stop it · spaces never matter · each bar ( | ) lasts the same number of beats, however many notes it holds · notes in ( ) share one slot</em></div>
    <div className="practice-pattern">
      <textarea id="practice-pattern" aria-label="Sargam to practise" aria-invalid={parsed.errors.length > 0} rows={2} spellCheck={false} autoCapitalize="off" autoCorrect="off" value={text} onChange={(event) => setText(event.target.value)} placeholder="SRG|RGM|GMP" />
      <div className="practice-preview" aria-hidden="true">{barred.map((beats, bar) => <span className="practice-bar-group" key={bar}>{beats.map((beat, index) => <span className={`practice-beat ${beat.error ? 'bad' : ''} ${beat.grouped ? 'group' : ''}`} key={index} title={beat.error ?? (beat.grouped ? 'These share one slot' : undefined)}>{beat.error ? beat.text : beat.elements.map(element)}</span>)}{bar < barred.length - 1 && <span className="practice-bar" />}</span>)}</div>
      <output className={`practice-status ${!running && !playable ? 'bad' : ''}`}>{status}</output>
      {origin && <p className="practice-origin">{activeLoop ? `“${activeLoop.name}” was` : 'This was'} written in {origin.name} · shown here on the same steps of {raga.name}’s scale · edit it and it becomes {raga.name}’s</p>}
    </div>
    <div className="practice-row">
      <span className="practice-caption">Notes</span>
      <div className="practice-keys">{palette.map((item) => <button key={item} type="button" onClick={() => append(typed(item + 12 * octave, raga, tradition))} aria-label={`Add ${typed(item + 12 * octave, raga, tradition)}`}><Note semitones={item + 12 * octave} raga={raga} tradition={tradition} /></button>)}<button type="button" onClick={() => append(typed(12 * (octave + 1), raga, tradition))} aria-label="Add the Sa above"><Note semitones={12 * (octave + 1)} raga={raga} tradition={tradition} /></button></div>
      <fieldset className="practice-seg" aria-label="Octave for the note buttons">{([[-1, 'Low'], [0, 'Mid'], [1, 'High']] as const).map(([value, label]) => <button aria-pressed={octave === value} key={value} onClick={() => setOctave(value)} type="button">{label}</button>)}</fieldset>
      <div className="practice-keys tools"><button type="button" onClick={() => append('-')} title="Hold the note before for another slot">– hold</button><button type="button" onClick={() => append(',')} title="A slot of silence">, rest</button><button type="button" onClick={() => append('|')} title="Bar line: each bar lasts the same number of beats">| bar</button><button type="button" onClick={() => append('(')} title="Start a group: the notes inside the brackets share one slot">(</button><button type="button" onClick={() => append(')')} title="End the group">)</button><button type="button" onClick={backspace} aria-label="Remove the last thing written">⌫</button><button type="button" onClick={() => setText('')}>Clear</button></div>
    </div>
    <div className="practice-row">
      <span className="practice-caption">Exercises</span>
      <div className="practice-keys presets">{library.map((item) => <button className={'preset' in draft && (library.find((entry) => entry.id === draft.preset) ?? library[0]).id === item.id ? 'active' : ''} key={item.id} onClick={() => { save({ draft: { preset: item.id }, active: null }); setName(''); }} type="button">{item.label}</button>)}</div>
    </div>
    <div className="practice-row">
      <span className="practice-caption">Saved</span>
      <div className="practice-keys loops">{saved.loops.length === 0 && <span className="practice-empty">nothing saved yet</span>}{saved.loops.map((loop) => <span className={`practice-loop ${loop.id === saved.active ? 'active' : ''}`} key={loop.id}>
        <button type="button" onClick={() => load(loop)} title={`Written in ${findRaga(loop.ragaId)?.name ?? 'another rāga'} · ${loop.bpm} bpm · loads re-spelt for ${raga.name}`}>{loop.name}</button>
        {deleting === loop.id ? <><button className="danger" type="button" onClick={() => remove(loop)}>Delete</button><button type="button" onClick={() => setDeleting(null)}>Keep</button></> : <button type="button" onClick={() => setDeleting(loop.id)} aria-label={`Delete ${loop.name}`}>✕</button>}
      </span>)}</div>
      <div className="practice-save"><input id="practice-name" aria-label="Name for this loop" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') keep(); }} placeholder="name this loop" maxLength={40} /><button type="button" onClick={keep} disabled={!playable}>{saved.loops.some((item) => item.name.toLowerCase() === name.trim().toLowerCase()) ? 'Update' : 'Save'}</button></div>
    </div>
    <div className="practice-row transport">
      {running ? <button className="practice-go stop" type="button" onClick={stop}>■ Stop</button> : <button className="practice-go" type="button" onClick={start} disabled={!playable}>▶ Start loop</button>}
      <label className="practice-field bpm" htmlFor="practice-bpm"><span>Tempo</span><input id="practice-bpm-range" aria-label="Tempo slider" type="range" min="30" max="240" step="1" value={saved.bpm} onChange={(event) => save({ bpm: Number(event.target.value) })} /><input id="practice-bpm" type="number" min="30" max="240" value={saved.bpm} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value)) save({ bpm: Math.max(30, Math.min(240, Math.round(value))) }); }} /><em>bpm</em><button type="button" onClick={tap} title="Tap along to set the tempo">Tap</button></label>
      <div className="practice-field"><span>{words.speed}</span><fieldset className="practice-seg" aria-label={`${words.speed}: notes per beat`}>{[1, 2, 3, 4].map((value, index) => <button aria-pressed={saved.speed === value} key={value} onClick={() => save({ speed: value })} title={words.speeds[index]} type="button">{value}×</button>)}</fieldset></div>
      <label className="practice-field" htmlFor="practice-bar"><span>Bar</span><select id="practice-bar" value={saved.bar} onChange={(event) => save({ bar: Number(event.target.value) })} title="How many beats each bar ( | ) lasts. Its notes share that time equally, however many there are.">{BAR_LENGTHS.map((value) => <option key={value} value={value}>{value === 0 ? 'As written' : `${value} beats`}</option>)}</select></label>
      <label className="practice-field" htmlFor="practice-tala"><span>{words.tala}</span><select id="practice-tala" value={tala.id} onChange={(event) => save({ tala: { ...saved.tala, [tradition]: event.target.value } })}>{talas.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <div className="practice-field"><span>Click</span><fieldset className="practice-seg" aria-label="Metronome click">{([['beat', 'Every beat', 'A click on every beat'], ['bar', 'Bar starts', 'A click only on the first beat of each bar'], ['off', 'Off', 'No click']] as const).map(([value, label, hint]) => <button aria-pressed={saved.click === value} key={value} onClick={() => save({ click: value })} title={hint} type="button">{label}</button>)}</fieldset></div>
      <div className="practice-field"><span>Melody</span><fieldset className="practice-seg" aria-label="Melody">{([['on', 'Play', 'The app plays every round'], ['alternate', 'Repeat after me', 'The app plays one round, then leaves the next to you with only the beat and drone'], ['off', 'Beat only', 'No melody, only the beat']] as const).map(([value, label, hint]) => <button aria-pressed={saved.melody === value} key={value} onClick={() => save({ melody: value })} title={hint} type="button">{label}</button>)}</fieldset></div>
      <label className="practice-check" htmlFor="practice-countin"><input id="practice-countin" type="checkbox" checked={saved.countIn} disabled={saved.click === 'off'} onChange={(event) => save({ countIn: event.target.checked })} /> {COUNT_IN}-beat count-in</label>
    </div>
    {lights.length > 1 && <div className="practice-lights" aria-hidden="true">{lights.map((weight, index) => <i className={`w${weight} ${index === beatNow && running && !position?.countIn ? 'on' : ''} ${weight > 0 && index > 0 ? 'gap' : ''}`} key={index} />)}</div>}
  </section>;
}
