/* oxlint-disable react/no-unescaped-entities, react(react-compiler) */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';

import { ALL_RAGAS, ascent, centsFor, descent, fullScale, JANYA_RAGAS, type Raga, type Swara } from '@/lib/ragas';
import { getAudioAnalyser, playRaga, playSustainedNote, startDrone, type PlaybackHandle, type Temperament, type Voice } from '@/lib/audio-engine';

const RATIOS = ['1/1', '16/15', '9/8', '6/5', '5/4', '4/3', '45/32', '3/2', '8/5', '5/3', '9/5', '15/8'];
const LABELS = ['S', 'R₁', 'R₂ G₁', 'R₃ G₂', 'G₃', 'M₁', 'M₂', 'P', 'D₁', 'D₂ N₁', 'D₃ N₂', 'N₃'];
const TONICS = [['C', 130.81], ['C♯', 138.59], ['D', 146.83], ['E♭', 155.56], ['E', 164.81], ['F', 174.61], ['G', 196]] as const;
const CHAKRAS = ['Indu', 'Nētra', 'Agni', 'Vēda', 'Bāṇa', 'Ṛtu', 'Ṛṣi', 'Vasu', 'Brahma', 'Diśi', 'Rudra', 'Āditya'];

function color(note: number, alpha: number) { return `oklch(0.74 0.14 ${34 + note * 27} / ${alpha})`; }
function frequency(sruti: number, semitones: number, temperament: Temperament) { return sruti * Math.pow(2, (temperament === 'just' ? [0, 112, 204, 316, 386, 498, 590, 702, 814, 884, 1018, 1088, 1200][semitones] : semitones * 100) / 1200); }

function Spectrum({ raga, sruti, temperament }: { raga: Raga; sruti: number; temperament: Temperament }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const draw = () => {
      const box = canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; canvas.width = box.width * dpr; canvas.height = box.height * dpr;
      const ctx = canvas.getContext('2d'); if (!ctx) return; const W = canvas.width; const H = canvas.height - 24 * dpr; const x = (f: number) => Math.log(f / 90) / Math.log(6000 / 90) * W;
      ctx.clearRect(0, 0, W, canvas.height); ctx.setLineDash([2 * dpr, 5 * dpr]); ctx.strokeStyle = 'rgba(216,180,94,.14)';
      [...new Set([...raga.arohana, ...raga.avarohana].map((s) => s.semitones))].forEach((n) => [1, 2, 4].forEach((octave) => { const at = x(frequency(sruti, n, temperament) * octave); if (at > 0 && at < W) { ctx.beginPath(); ctx.moveTo(at, 0); ctx.lineTo(at, H); ctx.stroke(); } }));
      ctx.setLineDash([]); const gradient = ctx.createLinearGradient(0, H, W, 0); gradient.addColorStop(0, 'rgba(216,180,94,.9)'); gradient.addColorStop(.55, 'rgba(232,170,120,.75)'); gradient.addColorStop(1, 'rgba(160,130,220,.7)'); ctx.fillStyle = gradient;
      const live = getAudioAnalyser();
      if (live) {
        const values = new Uint8Array(live.frequencyBinCount); live.getByteFrequencyData(values);
        for (let i = 0; i < 120; i++) { const from = Math.floor(i * values.length / 120); const to = Math.max(from + 1, Math.floor((i + 1) * values.length / 120)); let peak = 0; for (let j = from; j < to; j += 1) peak = Math.max(peak, values[j]); const bar = Math.pow(peak / 255, 1.25) * H * .92; if (bar > 0.5) ctx.fillRect(i * W / 120, H - bar, W / 180, bar); }
      }
      ctx.fillStyle = 'rgba(216,180,94,.3)'; ctx.fillRect(0, H, W, dpr); ctx.font = `${9 * dpr}px monospace`; ctx.fillStyle = 'rgba(233,227,214,.34)'; ctx.textAlign = 'center'; [[100, '100'], [200, '200'], [500, '500'], [1000, '1k'], [2000, '2k'], [5000, '5k']].forEach(([f, label]) => { const at = x(Number(f)); if (at > 4 && at < W - 4) ctx.fillText(String(label), at, H + 13 * dpr); });
    }; draw(); window.addEventListener('resize', draw); const timer = window.setInterval(draw, 90); return () => { window.removeEventListener('resize', draw); window.clearInterval(timer); };
  }, [raga, sruti, temperament]);
  return <canvas ref={ref} className="prototype-spectrum" />;
}

const taxons: [string, string, ReactNode][] = [
  ['01', 'An octave has twelve doors', <>Pick any note and sing until you reach the same note again, higher. Between those two points sit twelve usable pitches — the same twelve on a piano. Carnatic music calls each landing place a <em>svarasthāna</em>, a “note position”.</>],
  ['02', 'Seven names, sixteen shades', <>The seven note names are <strong>Sa Ri Ga Ma Pa Da Ni</strong> — written S R G M P D N. Sa is home and Pa never moves. The others have two or three flavours each, marked with a subscript.</>],
    ['03', 'A rāga is a path, not a scale', <>A rāga specifies the way <em>up</em> — the <strong>ārohana</strong> — and the way <em>down</em> — the <strong>avarohana</strong>. They need not match. That asymmetry is most of a rāga&apos;s character.</>],
  ['04', 'The parent rāgas are a grid, not a list', <>A <strong>melakarta</strong> is a parent rāga: all seven names present, straight up and straight down. Two Ma choices × six Ri–Ga pairs × six Da–Ni pairs = 72 parents. These are dealt into twelve groups called <strong>chakras</strong>.</>],
  ['05', 'The children are where the music lives', <>A <strong>janya</strong> rāga borrows its notes from one parent, then drops some, bends the order, or takes a different route down. Most rāgas you will actually hear sung are janyas; the parents are the filing system that makes them findable.</>],
];

function Taxonomy() { return <div className="prototype-taxonomy"><header><div className="prototype-eyebrow">Primer</div><h1>How rāgas are organised</h1><p>Five ideas, in plain language. No notation required.</p></header><div className="taxonomy-list">{taxons.map(([number, title, text]) => <div className="taxonomy-item" key={number}><div className="taxonomy-number">{number}</div><div><h2>{title}</h2><p>{text}</p></div></div>)}</div></div>; }

// A native select cannot hold a text field, and on a phone it is replaced by an OS
// wheel with no keyboard at all. This is the same control drawn in the page, so
// typing narrows the list identically on desktop and mobile.
function RagaPicker({ ragas, selected, onSelect }: { ragas: Raga[]; selected: Raga; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState(''); const [open, setOpen] = useState(false); const [highlight, setHighlight] = useState(0);
  const viaKey = useRef(false); const wrap = useRef<HTMLDivElement>(null); const field = useRef<HTMLInputElement>(null); const list = useRef<HTMLDivElement>(null);
  const term = query.trim().toLowerCase();
  const matches = useMemo(() => ragas.filter((item) => !term || item.name.toLowerCase().includes(term) || String(item.parentMela).includes(term)), [ragas, term]);
  const label = (item: Raga) => item.group === 'melakarta' ? `${item.name} · ${String(item.parentMela).padStart(2, '0')}` : item.name;
  useEffect(() => { if (!open) return; const away = (event: PointerEvent) => { if (!wrap.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener('pointerdown', away); return () => document.removeEventListener('pointerdown', away); }, [open]);
  // Arrowing through 90 ragas has to drag the list along, but only for the keyboard:
  // doing it on hover would fight the pointer while the reader scrolls.
  useEffect(() => { if (!open || !viaKey.current) return; viaKey.current = false; (list.current?.children[highlight] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' }); }, [open, highlight]);
  const choose = (item: Raga | undefined) => { if (!item) return; onSelect(item.id); setOpen(false); setQuery(''); field.current?.blur(); };
  const keys = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) { setOpen(true); return; } viaKey.current = true; setHighlight((at) => Math.max(0, Math.min(matches.length - 1, at + (event.key === 'ArrowDown' ? 1 : -1)))); }
    else if (event.key === 'Enter') { event.preventDefault(); choose(matches[highlight]); }
    else if (event.key === 'Escape') { setOpen(false); setQuery(''); }
  };
  return <div className="raga-picker" ref={wrap}><input ref={field} className="raga-field" role="combobox" aria-expanded={open} aria-controls="raga-options" aria-autocomplete="list" aria-activedescendant={open && matches.length > 0 ? `raga-option-${highlight}` : undefined} aria-label="Rāga" placeholder="search rāga or mela no." value={open ? query : label(selected)} onFocus={() => { setOpen(true); setQuery(''); setHighlight(0); }} onChange={(event) => { setQuery(event.target.value); setOpen(true); setHighlight(0); }} onKeyDown={keys} />
    {/* Keys are handled on the input, where focus stays, and the options are deliberately not tabbable:
       that is the ARIA combobox pattern. The rules below want a native select, which is the one thing
       this control cannot be, since a select cannot contain the text field it exists to provide. */}
    {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role, jsx-a11y/click-events-have-key-events */}
    {open && <div className="raga-options" id="raga-options" ref={list} role="listbox" tabIndex={-1}>{matches.map((item, index) => <div aria-selected={item.id === selected.id} className={index === highlight ? 'active' : ''} id={`raga-option-${index}`} key={item.id} onClick={() => choose(item)} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setHighlight(index)} role="option" tabIndex={-1}><span>{item.group === 'melakarta' ? String(item.parentMela).padStart(2, '0') : '·'}</span><strong>{item.name}</strong><em>{item.group === 'melakarta' ? CHAKRAS[Math.floor(((item.parentMela ?? 1) - 1) / 6)] : 'janya'}</em></div>)}{matches.length === 0 && <div className="empty">no matches</div>}</div>}
  </div>;
}

export function RagaLibrary({ sruti, onSruti }: { sruti: number; onSruti: (value: number) => void }) {
  const [tab, setTab] = useState<'atlas' | 'taxonomy'>('atlas'); const [filter, setFilter] = useState<'all' | 'melakarta' | 'janya'>('all'); const [selectedId, setSelectedId] = useState('mela-28'); const [tonic, setTonic] = useState(2); const [tempo, setTempo] = useState(2.2); const [playing, setPlaying] = useState(''); const [drone, setDrone] = useState(false); const [temperament, setTemperament] = useState<Temperament>('just'); const [voice, setVoice] = useState<Voice>('veena'); const [kampita, setKampita] = useState(true); const [octaveOffset, setOctaveOffset] = useState(0);
  const [playback, setPlayback] = useState<PlaybackHandle | null>(null); const [droneHandle, setDroneHandle] = useState<PlaybackHandle | null>(null);
  const keyboardNotesRef = useRef<Map<string, PlaybackHandle>>(new Map());
  const filtered = useMemo(() => ALL_RAGAS.filter((r) => filter === 'all' || r.group === filter), [filter]); const raga = ALL_RAGAS.find((r) => r.id === selectedId) ?? ALL_RAGAS[0]; const up = ascent(raga); const down = descent(raga);
  const stop = () => { playback?.stop(); setPlayback(null); setPlaying(''); };
  useEffect(() => {
    const keyMap: { [key: string]: number } = { 'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4, 'h': 5, 'j': 6, 'k': 7, 'l': 8, ';': 9, "'": 10 };
    console.log('[Raga Atlas] Keyboard input handlers registered');
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('[KB] keydown:', e.key, 'mapped:', keyMap[e.key.toLowerCase()]);
      if (e.key === 'ArrowUp') { e.preventDefault(); setOctaveOffset((o) => o + 1); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setOctaveOffset((o) => Math.max(-2, o - 1)); return; }
      const key = e.key.toLowerCase();
      const index = keyMap[key];
      if (index === undefined) { console.log('[KB] key not in map'); return; }
      const isShift = e.shiftKey;
      const sequence = isShift ? down : up;
      console.log('[KB] sequence length:', sequence.length, 'index:', index, 'shift:', isShift);
      if (index >= sequence.length) { console.log('[KB] index out of range'); return; }
      const cacheKey = `${isShift ? 'shift+' : ''}${key}`;
      if (keyboardNotesRef.current.has(cacheKey)) { console.log('[KB] already playing'); return; }
      const note = sequence[index];
      const baseCents = centsFor(note.semitones, temperament);
      const octaveCents = octaveOffset * 1200;
      const noteFreq = TONICS[tonic][1] * Math.pow(2, (baseCents + octaveCents) / 1200);
      console.log('[KB] playing note freq:', noteFreq);
      const handle = playSustainedNote({ frequency: noteFreq, voice, temperament, sruti: TONICS[tonic][1], kampita });
      keyboardNotesRef.current.set(cacheKey, handle);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!(key in keyMap)) return;
      const wasShift = e.shiftKey;
      const cacheKey = `${wasShift ? 'shift+' : ''}${key}`;
      const handle = keyboardNotesRef.current.get(cacheKey);
      if (handle) { handle.stop(); keyboardNotesRef.current.delete(cacheKey); }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => { document.removeEventListener('keydown', handleKeyDown); document.removeEventListener('keyup', handleKeyUp); };
  }, [temperament, voice, kampita, tonic, up, down, octaveOffset]); const play = (direction: 'aro' | 'ava' | 'both') => { stop(); const sequence = direction === 'aro' ? up : direction === 'ava' ? down : fullScale(raga); setPlaying(direction); setPlayback(playRaga({ sequence, sruti: TONICS[tonic][1], temperament, voice, kampita, tempo, onSwara: (_s, i) => { if (i === -1) setPlaying(''); } })); }; const note = (swara: Swara, direction: string) => { stop(); setPlaying(direction); setPlayback(playRaga({ sequence: [swara], sruti: TONICS[tonic][1], temperament, voice, kampita, tempo, onSwara: (_s, i) => { if (i === -1) setPlaying(''); } })); };
  const toggleDrone = () => { if (drone) { droneHandle?.stop(); setDroneHandle(null); setDrone(false); } else { const handle = startDrone(TONICS[tonic][1]); setDroneHandle(handle); setDrone(true); } };
  const chips = (notes: Swara[], direction: string) => notes.map((swara, index) => { const active = playing === direction; return <button className={`note-chip ${active ? 'active' : ''}`} key={`${direction}-${index}`} onClick={() => note(swara, direction)}><span>{swara.label[0]}<small>{swara.label.slice(1)}</small></span><em>{frequency(TONICS[tonic][1], swara.semitones, temperament).toFixed(1)} Hz</em><i style={{ background: color(swara.semitones, active ? 1 : .55) }} /></button>; });
  const cells = LABELS.map((label, index) => { const on = [...raga.arohana, ...raga.avarohana].some((s) => s.semitones % 12 === index); return <div className={`chromatic-cell ${on ? 'lit' : ''}`} key={label}><div className="bar-wrap"><i style={{ height: on ? `${34 + index * 3.4}%` : '3%', background: color(index, on ? .85 : .12) }} /></div><strong>{label}</strong><small>{RATIOS[index]}</small></div>; });
  return <div className="prototype-shell"><header className="prototype-topbar"><div className="topbar-identity"><div className="prototype-eyebrow">Carnatic</div><div className="prototype-logo">Rāga Atlas</div><div className="prototype-meta">72 melakarta · {JANYA_RAGAS.length} janya · just intonation</div></div><div className="prototype-tabs"><button className={tab === 'atlas' ? 'active' : ''} onClick={() => setTab('atlas')}>Atlas</button><button className={tab === 'taxonomy' ? 'active' : ''} onClick={() => setTab('taxonomy')}>Taxonomy</button></div><div className="topbar-picker"><RagaPicker onSelect={(id) => { setSelectedId(id); setTab('atlas'); }} ragas={filtered} selected={raga} /><div className="prototype-filter">{(['all', 'melakarta', 'janya'] as const).map((value) => <button className={filter === value ? 'active' : ''} key={value} onClick={() => setFilter(value)}>{value === 'melakarta' ? 'Mela' : value[0].toUpperCase() + value.slice(1)}</button>)}</div></div></header><main className="prototype-main"><div className="prototype-content">{tab === 'taxonomy' ? <Taxonomy /> : <><header className="prototype-header"><div><div className="prototype-eyebrow">{raga.group === 'melakarta' ? 'Melakarta · sampūrṇa · 7 svara' : 'Janya · derived raga'}</div><h1>{raga.name}</h1><p>{raga.group === 'melakarta' ? `Position ${raga.parentMela} in ${CHAKRAS[Math.floor(((raga.parentMela ?? 1) - 1) / 6)]} chakra · symmetric ārohana / avarohana` : `Derived from mela ${raga.parentMela}`}</p></div><div className="mela-coordinate"><strong>{String(raga.parentMela).padStart(2, '0')}</strong><span>{raga.group === 'melakarta' ? CHAKRAS[Math.floor(((raga.parentMela ?? 1) - 1) / 6)] : 'janaka mela'}</span></div></header><section className="note-paths"><Path label="Ārohana" notes={up} content={chips(up, 'aro')} /><Path label="Avarohana" notes={down} content={chips(down, 'ava')} /></section><section className="prototype-controls"><div className="transport-buttons"><button className="primary" onClick={() => play('aro')}>Ārohana</button><button onClick={() => play('ava')}>Avarohana</button><button onClick={() => play('both')}>Both</button></div><span className="control-divider" /><button className={drone ? 'drone active' : 'drone'} onClick={toggleDrone}>Tambura {drone ? 'on' : 'off'}</button><div className="tonic-control"><span>Śruti</span>{TONICS.map(([label], index) => <button className={tonic === index ? 'active' : ''} key={label} onClick={() => setTonic(index)}>{label}</button>)}</div><label className="tempo-control"><span>Kāla</span><input type="range" min="0.9" max="4.2" step="0.1" value={tempo} onChange={(e) => setTempo(Number(e.target.value))} /><em>{tempo.toFixed(1)}/s</em></label></section><section className="spectrum-section"><div className="section-label"><span>Spectrum</span><em>90 Hz – 6 kHz, log scale · dotted guides = this rāga's svara across 3 octaves · {playing ? `playing ${playing}` : 'idle'}</em></div><div className="spectrum-frame"><Spectrum raga={raga} sruti={TONICS[tonic][1]} temperament={temperament} /></div></section><section className="chromatic-section"><div className="section-label"><span>Chromatic position · 12 svarasthāna</span></div><div className="chromatic-grid">{cells}</div></section><section className="prototype-sound-settings"><label>Intonation <select value={temperament} onChange={(e) => setTemperament(e.target.value as Temperament)}><option value="just">Just</option><option value="equal">Equal</option></select></label><label>Voice <select value={voice} onChange={(e) => setVoice(e.target.value as Voice)}><option value="veena">Veena</option><option value="chitravina">Chitravina</option><option value="swarmandal">Swarmandal</option></select></label><label>Kampita <select value={kampita ? 'shaken' : 'plain'} onChange={(e) => setKampita(e.target.value === 'shaken')}><option value="plain">Plain</option><option value="shaken">Shaken</option></select></label><label>Sa in Hz <input type="number" min="60" max="500" step="0.01" value={sruti} onChange={(e) => { const value = Number(e.target.value); if (Number.isFinite(value) && value > 0) onSruti(value); }} /></label></section></>}</div></main></div>;
}

function Path({ label, notes: _notes, content }: { label: string; notes: Swara[]; content: ReactNode }) { return <div className="note-path"><div className="path-heading"><span>{label}</span><i /></div><div className="note-chip-row">{content}</div></div>; }
