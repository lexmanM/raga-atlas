/* oxlint-disable react/no-unescaped-entities, react(react-compiler) */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';

import { ALL_RAGAS, ascent, centsFor, descent, fullScale, JANYA_RAGAS, type Raga, type Swara } from '@/lib/ragas';
import { getAudioAnalyser, loadHarmonium, playRaga, playSustainedNote, startDrone, type PlaybackHandle, type Temperament, type Voice } from '@/lib/audio-engine';

const RATIOS = ['1/1', '16/15', '9/8', '6/5', '5/4', '4/3', '45/32', '3/2', '8/5', '5/3', '9/5', '15/8'];
const LABELS = ['S', 'R₁', 'R₂ G₁', 'R₃ G₂', 'G₃', 'M₁', 'M₂', 'P', 'D₁', 'D₂ N₁', 'D₃ N₂', 'N₃'];
// [name, Hz, pitch class counted from C]
const TONICS = [['C', 130.81, 0], ['C♯', 138.59, 1], ['D', 146.83, 2], ['E♭', 155.56, 3], ['E', 164.81, 4], ['F', 174.61, 5], ['G', 196, 7]] as const;
const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const THEMES = [{ id: 'night', label: 'Night' }, { id: 'paper', label: 'Paper' }, { id: 'peacock', label: 'Peacock' }] as const;
export type Theme = (typeof THEMES)[number]['id'];
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
      // Canvas cannot see CSS, so the theme tokens are read on every frame and a theme switch repaints at once.
      const css = getComputedStyle(canvas); const tone = (token: string, alpha: number) => `rgb(${css.getPropertyValue(token).trim()} / ${alpha})`;
      ctx.clearRect(0, 0, W, canvas.height); ctx.setLineDash([2 * dpr, 5 * dpr]); ctx.strokeStyle = tone('--accent-rgb', .14);
      [...new Set([...raga.arohana, ...raga.avarohana].map((s) => s.semitones))].forEach((n) => [1, 2, 4].forEach((octave) => { const at = x(frequency(sruti, n, temperament) * octave); if (at > 0 && at < W) { ctx.beginPath(); ctx.moveTo(at, 0); ctx.lineTo(at, H); ctx.stroke(); } }));
      ctx.setLineDash([]); const gradient = ctx.createLinearGradient(0, H, W, 0); gradient.addColorStop(0, tone('--accent-rgb', .9)); gradient.addColorStop(.55, tone('--warm-rgb', .75)); gradient.addColorStop(1, tone('--cool-rgb', .7)); ctx.fillStyle = gradient;
      const live = getAudioAnalyser();
      if (live) {
        const values = new Uint8Array(live.frequencyBinCount); live.getByteFrequencyData(values);
        for (let i = 0; i < 120; i++) { const from = Math.floor(i * values.length / 120); const to = Math.max(from + 1, Math.floor((i + 1) * values.length / 120)); let peak = 0; for (let j = from; j < to; j += 1) peak = Math.max(peak, values[j]); const bar = Math.pow(peak / 255, 1.25) * H * .92; if (bar > 0.5) ctx.fillRect(i * W / 120, H - bar, W / 180, bar); }
      }
      ctx.fillStyle = tone('--accent-rgb', .3); ctx.fillRect(0, H, W, dpr); ctx.font = `${9 * dpr}px monospace`; ctx.fillStyle = tone('--text-rgb', .34); ctx.textAlign = 'center'; [[100, '100'], [200, '200'], [500, '500'], [1000, '1k'], [2000, '2k'], [5000, '5k']].forEach(([f, label]) => { const at = x(Number(f)); if (at > 4 && at < W - 4) ctx.fillText(String(label), at, H + 13 * dpr); });
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

function Taxonomy() { return <div className="prototype-taxonomy"><header><div className="prototype-eyebrow">Primer</div><h1 id="primer-title">How rāgas are organised</h1><p>Five ideas, in plain language. No notation required.</p></header><div className="taxonomy-list">{taxons.map(([number, title, text]) => <div className="taxonomy-item" key={number}><div className="taxonomy-number">{number}</div><div><h2>{title}</h2><p>{text}</p></div></div>)}</div></div>; }

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

// A primer is something you glance at from where you are, so it opens as a drawer
// over the current rāga instead of taking a slot in the navigation.
function ExplainNudge({ onClick }: { onClick: () => void }) {
  return <button className="explain-nudge" type="button" onClick={onClick} aria-haspopup="dialog"><b aria-hidden="true">?</b><span><strong>Explain me?</strong> <small>How rāgas are organised · 2 min</small></span></button>;
}

function PrimerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (!dialog) return; if (open && !dialog.open) dialog.showModal(); else if (!open && dialog.open) dialog.close(); }, [open]);
  // A click that lands on the dialog itself, rather than the sheet inside it, is a click on the backdrop.
  // Escape is handled natively by the dialog, which is why there is no key handler here.
  // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
  return <dialog ref={ref} className="primer-dialog" aria-labelledby="primer-title" onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="primer-sheet"><button className="close-btn" type="button" onClick={onClose} aria-label="Close primer">✕</button><Taxonomy /><button className="primer-done" type="button" onClick={onClose}>Back to the rāga</button></div></dialog>;
}

function ThemeSwitch({ theme, onTheme }: { theme: Theme; onTheme: (theme: Theme) => void }) {
  return <fieldset className="theme-switch" aria-label="Colour theme">{THEMES.map((item) => <button aria-label={`${item.label} theme`} aria-pressed={theme === item.id} key={item.id} onClick={() => onTheme(item.id)} title={`${item.label} theme`} type="button"><i aria-hidden="true" className={`swatch swatch-${item.id}`} /><span>{item.label}</span></button>)}</fieldset>;
}

// Standard tuning as MIDI numbers, low E first: pitch class and octave both fall out of one number.
const GUITAR_STRINGS = [40, 45, 50, 55, 59, 64];
const FRETS = 24;
const subscript = (label: string) => label[0] + label.slice(1).replace(/\d/g, (digit) => '₀₁₂₃₄₅₆₇₈₉'[Number(digit)]);

function Guitar({ raga, tonic, tonicControl, onExplain }: { raga: Raga; tonic: number; tonicControl: ReactNode; onExplain: () => void }) {
  // Svaras are distances from Sa, but a fret is an absolute pitch, so each fret is
  // measured from the selected śruti. Counting from C put every label off by the tonic.
  const sa = TONICS[tonic][2];
  const swaras = useMemo(() => { const byPosition = new Map<number, string>(); for (const swara of [...raga.arohana, ...raga.avarohana]) { const position = swara.semitones % 12; if (!byPosition.has(position)) byPosition.set(position, position === 0 ? 'S' : subscript(swara.label)); } return byPosition; }, [raga]);
  return <><header className="prototype-header guitar-header"><div><div className="prototype-eyebrow">Guitar · standard tuning · Sa = {TONICS[tonic][0]}</div><h1>{raga.name}</h1><p>Lit frets are this rāga's svaras, counted from Sa · {swaras.size} of 12 positions</p><ExplainNudge onClick={onExplain} /></div>{tonicControl}</header><div className="guitar-container"><div className="fretboard">{GUITAR_STRINGS.map((open) => <div key={open} className="string-row"><div className="string-label">{NOTE_NAMES[open % 12]}</div>{Array.from({ length: FRETS + 1 }, (_, fret) => { const pitch = open + fret; const label = swaras.get((pitch - sa) % 12); const hz = 440 * Math.pow(2, (pitch - 69) / 12); return <button key={fret} className={`fret ${label ? 'note' : ''} ${label === 'S' ? 'sa' : ''}`} title={`${label ? `${label} · ` : ''}${NOTE_NAMES[pitch % 12]}${Math.floor(pitch / 12) - 1} · ${hz.toFixed(1)} Hz`} type="button"><span className="fret-label">{label ?? (fret === 0 ? '○' : fret % 12 === 0 ? '●' : '')}</span></button>; })}</div>)}</div></div></>;
}

function HelpIcon({ title, description }: { title: string; description: string }) {
  const [showHelp, setShowHelp] = useState(false);
  return <div className="help-icon-wrapper" onMouseEnter={() => setShowHelp(true)} onMouseLeave={() => setShowHelp(false)} onClick={() => setShowHelp(!showHelp)}><button className="help-icon" aria-label={title} type="button">?</button>{showHelp && <div className="help-tooltip"><strong>{title}</strong><p>{description}</p></div>}</div>;
}

function Onboarding({ onDismiss, onExplain }: { onDismiss: () => void; onExplain: () => void }) {
  return <div className="onboarding-overlay" onClick={onDismiss}><div className="onboarding-card" onClick={(e) => e.stopPropagation()}><button className="close-btn" onClick={onDismiss}>✕</button><h2>Welcome to Rāga Atlas</h2><p><strong>Rāgas</strong> are melodic frameworks in Carnatic classical music. Pick one above to explore its structure, hear it played, and see how it maps to guitar.</p><div className="onboarding-tips"><h3>Getting started:</h3><ul><li><strong>Atlas</strong> — Deep dive into any raga's details</li><li><strong>Guitar</strong> — See notes on a guitar fretboard</li><li><strong>Explain me?</strong> — New to rāgas? <button className="link" type="button" onClick={() => { onDismiss(); onExplain(); }}>Read the 2-minute primer</button></li></ul></div><p className="onboarding-hint">Enable Tambura for a reference drone, or use keyboard (a,s,d,f,g,h,j) to play notes.</p><button className="primary" onClick={onDismiss}>Got it</button></div></div>;
}

export function RagaLibrary({ sruti, onSruti, theme, onTheme }: { sruti: number; onSruti: (value: number) => void; theme: Theme; onTheme: (theme: Theme) => void }) {
  const [tab, setTab] = useState<'atlas' | 'guitar'>('atlas');
  const [primerOpen, setPrimerOpen] = useState(false); const openPrimer = () => setPrimerOpen(true);
  const [showOnboarding, setShowOnboarding] = useState(() => typeof localStorage !== 'undefined' ? !localStorage.getItem('raga-atlas-onboarded') : true);
  const [advancedOpen, setAdvancedOpen] = useState(false); const [filter, setFilter] = useState<'all' | 'melakarta' | 'janya'>('all'); const [selectedId, setSelectedId] = useState('mela-28'); const [tonic, setTonic] = useState(2); const [tempo, setTempo] = useState(2.2); const [playing, setPlaying] = useState(''); const [drone, setDrone] = useState(false); const [temperament, setTemperament] = useState<Temperament>('just'); const [voice, setVoice] = useState<Voice>('veena'); const [kampita, setKampita] = useState(true); const [octaveOffset, setOctaveOffset] = useState(0);
  const [playback, setPlayback] = useState<PlaybackHandle | null>(null); const [droneHandle, setDroneHandle] = useState<PlaybackHandle | null>(null);
  const [keyboardPlaying, setKeyboardPlaying] = useState<Set<string>>(new Set());
  const [keyboardEnabled, setKeyboardEnabled] = useState(false);
  const keyboardNotesRef = useRef<Map<string, PlaybackHandle>>(new Map());
  const filtered = useMemo(() => ALL_RAGAS.filter((r) => filter === 'all' || r.group === filter), [filter]); const raga = ALL_RAGAS.find((r) => r.id === selectedId) ?? ALL_RAGAS[0]; const up = ascent(raga); const down = descent(raga);
  const stop = () => { playback?.stop(); setPlayback(null); setPlaying(''); };
  // Harmonium is the one sampled voice. Fetch its takes the moment it is picked
  // so the first press plays immediately rather than waiting on the network.
  useEffect(() => { if (voice === 'harmonium') void loadHarmonium().catch(() => {}); }, [voice]);
  useEffect(() => {
    const keyMap: { [key: string]: number } = { 'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4, 'h': 5, 'j': 6, 'k': 7, 'l': 8, ';': 9, "'": 10 };
    console.log('[Raga Atlas] Keyboard input handlers registered');
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!keyboardEnabled) return;
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
      setKeyboardPlaying((prev) => new Set([...prev, cacheKey]));
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!(key in keyMap)) return;
      const wasShift = e.shiftKey;
      const cacheKey = `${wasShift ? 'shift+' : ''}${key}`;
      const handle = keyboardNotesRef.current.get(cacheKey);
      if (handle) { handle.stop(); keyboardNotesRef.current.delete(cacheKey); setKeyboardPlaying((prev) => { const next = new Set(prev); next.delete(cacheKey); return next; }); }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => { document.removeEventListener('keydown', handleKeyDown); document.removeEventListener('keyup', handleKeyUp); };
  }, [temperament, voice, kampita, tonic, up, down, octaveOffset, keyboardEnabled]); const play = (direction: 'aro' | 'ava' | 'both') => { stop(); const sequence = direction === 'aro' ? up : direction === 'ava' ? down : fullScale(raga); setPlaying(direction); setPlayback(playRaga({ sequence, sruti: TONICS[tonic][1], temperament, voice, kampita, tempo, onSwara: (_s, i) => { if (i === -1) setPlaying(''); } })); }; const note = (swara: Swara, direction: string) => { stop(); setPlaying(direction); setPlayback(playRaga({ sequence: [swara], sruti: TONICS[tonic][1], temperament, voice, kampita, tempo, onSwara: (_s, i) => { if (i === -1) setPlaying(''); } })); };
  const toggleDrone = () => { if (drone) { droneHandle?.stop(); setDroneHandle(null); setDrone(false); } else { const handle = startDrone(TONICS[tonic][1]); setDroneHandle(handle); setDrone(true); } };
  const chips = (notes: Swara[], direction: string) => notes.map((swara, index) => { const active = playing === direction; const kbKey = direction === 'aro' ? ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"][index] : ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"][index]; const kbActive = kbKey && keyboardPlaying.has(`${direction === 'aro' ? '' : 'shift+'}${kbKey}`); return <button className={`note-chip ${active ? 'active' : ''} ${kbActive ? 'keyboard-active' : ''}`} key={`${direction}-${index}`} onClick={() => note(swara, direction)}><span>{swara.label[0]}<small>{swara.label.slice(1)}</small></span><em>{frequency(TONICS[tonic][1], swara.semitones, temperament).toFixed(1)} Hz</em><i style={{ background: color(swara.semitones, active || kbActive ? 1 : .55) }} /></button>; });
  const cells = LABELS.map((label, index) => { const on = [...raga.arohana, ...raga.avarohana].some((s) => s.semitones % 12 === index); return <div className={`chromatic-cell ${on ? 'lit' : ''}`} key={label}><div className="bar-wrap"><i style={{ height: on ? `${34 + index * 3.4}%` : '3%', background: color(index, on ? .85 : .12) }} /></div><strong>{label}</strong><small>{RATIOS[index]}</small></div>; });
  const handleOnboardingDismiss = () => { setShowOnboarding(false); if (typeof localStorage !== 'undefined') localStorage.setItem('raga-atlas-onboarded', '1'); };
  const tonicControl = <div className="tonic-control"><span>Śruti</span>{TONICS.map(([label], index) => <button className={tonic === index ? 'active' : ''} key={label} onClick={() => setTonic(index)}>{label}</button>)}</div>;
  return <div className="prototype-shell">{showOnboarding && <Onboarding onDismiss={handleOnboardingDismiss} onExplain={openPrimer} />}<header className="prototype-topbar"><div className="topbar-identity"><div className="prototype-eyebrow">Carnatic</div><div className="prototype-logo">Rāga Atlas</div><div className="prototype-meta">72 melakarta · {JANYA_RAGAS.length} janya</div></div><div className="prototype-tabs"><button className={tab === 'atlas' ? 'active' : ''} onClick={() => setTab('atlas')}>🎼 Atlas</button><button className={tab === 'guitar' ? 'active' : ''} onClick={() => setTab('guitar')}>🎸 Guitar</button></div><div className="topbar-picker"><div className="raga-picker-wrapper"><RagaPicker onSelect={(id) => { setSelectedId(id); }} ragas={filtered} selected={raga} /><div className="picker-hint">{filtered.length} ragas</div></div><div className="prototype-filter">{(['all', 'melakarta', 'janya'] as const).map((value) => <button className={filter === value ? 'active' : ''} key={value} onClick={() => setFilter(value)}>{value === 'melakarta' ? 'Mela' : value[0].toUpperCase() + value.slice(1)}</button>)}</div></div><ThemeSwitch theme={theme} onTheme={onTheme} /></header><main className="prototype-main"><div className="prototype-content">{tab === 'guitar' ? <Guitar raga={raga} tonic={tonic} tonicControl={tonicControl} onExplain={openPrimer} /> : <><header className="prototype-header"><div><div className="prototype-eyebrow">{raga.group === 'melakarta' ? 'Melakarta · sampūrṇa · 7 svara' : 'Janya · derived raga'}</div><h1>{raga.name}</h1><p>{raga.group === 'melakarta' ? `Position ${raga.parentMela} in ${CHAKRAS[Math.floor(((raga.parentMela ?? 1) - 1) / 6)]} chakra · symmetric ārohana / avarohana` : `Derived from mela ${raga.parentMela}`}</p><ExplainNudge onClick={openPrimer} /></div><div className="mela-coordinate"><strong>{String(raga.parentMela).padStart(2, '0')}</strong><span>{raga.group === 'melakarta' ? CHAKRAS[Math.floor(((raga.parentMela ?? 1) - 1) / 6)] : 'janaka mela'}</span></div></header><section className="note-paths"><Path label="Ārohana" notes={up} content={chips(up, 'aro')} /><Path label="Avarohana" notes={down} content={chips(down, 'ava')} /></section><section className="prototype-controls"><div className="transport-buttons"><button className="primary" onClick={() => play('aro')}>Ārohana</button><button onClick={() => play('ava')}>Avarohana</button><button onClick={() => play('both')}>Both</button></div><span className="control-divider" /><div className="feature-button-group"><button className={drone ? 'drone active' : 'drone'} onClick={toggleDrone} aria-label="Tambura drone">🔔 Drone <span className="status">{drone ? 'on' : 'off'}</span></button><HelpIcon title="Tambura" description="Play a continuous reference drone at the base note (Sa). Helps you tune correctly." /></div><div className="feature-button-group"><button className={keyboardEnabled ? 'keyboard active' : 'keyboard'} onClick={() => setKeyboardEnabled(!keyboardEnabled)} aria-label="Keyboard input">⌨️ Keyboard <span className="status">{keyboardEnabled ? 'on' : 'off'}</span></button><HelpIcon title="Keyboard" description="Play notes using qwerty keys (a,s,d,f,g,h,j). Shift for avarohana. Arrow keys for octaves." /></div>{tonicControl}<label className="tempo-control"><span>Kāla</span><input type="range" min="0.9" max="4.2" step="0.1" value={tempo} onChange={(e) => setTempo(Number(e.target.value))} /><em>{tempo.toFixed(1)}/s</em></label></section><section className="spectrum-section"><div className="section-label"><span>Spectrum</span><em>90 Hz – 6 kHz, log scale · dotted guides = this rāga's svara across 3 octaves · {playing ? `playing ${playing}` : 'idle'}</em></div><div className="spectrum-frame"><Spectrum raga={raga} sruti={TONICS[tonic][1]} temperament={temperament} /></div></section><section className="chromatic-section"><div className="section-label"><span>Chromatic position · 12 svarasthāna</span></div><div className="chromatic-grid">{cells}</div></section><section className="prototype-sound-settings"><button className="advanced-toggle" onClick={() => setAdvancedOpen(!advancedOpen)} aria-expanded={advancedOpen}>⚙️ Advanced Settings</button>{advancedOpen && <div className="advanced-panel"><label><div className="label-row"><span>Intonation</span><HelpIcon title="Intonation" description="Just: Pure ratios from the root note (warmer). Equal: Equal temperament (modern standard)." /></div><select value={temperament} onChange={(e) => setTemperament(e.target.value as Temperament)} aria-label="Intonation: Just or Equal"><option value="just">Just</option><option value="equal">Equal</option></select></label><label><div className="label-row"><span>Voice</span><HelpIcon title="Voice" description="Veena: Stringed (sitar-like). Chitravina: Fretted string. Swarmandal: Zither. Harmonium: Recorded free reed — it sustains instead of decaying, and its fixed reeds cannot bend, so Wobble does not apply to it." /></div><select value={voice} onChange={(e) => setVoice(e.target.value as Voice)} aria-label="Voice: Veena, Chitravina, Swarmandal, or Harmonium"><option value="veena">Veena</option><option value="chitravina">Chitravina</option><option value="swarmandal">Swarmandal</option><option value="harmonium">Harmonium</option></select></label><label><div className="label-row"><span>Wobble</span><HelpIcon title="Wobble (Kampita)" description="Add slight vibrato/wavering to notes for expressive playing." /></div><select value={kampita ? 'shaken' : 'plain'} onChange={(e) => setKampita(e.target.value === 'shaken')} aria-label="Wobble: add vibrato"><option value="plain">Off</option><option value="shaken">On</option></select></label><label><div className="label-row"><span>Base Frequency (Hz)</span><HelpIcon title="Sa Frequency" description="Adjust the base note frequency. Default 130.81 Hz (C3)." /></div><input type="number" min="60" max="500" step="0.01" value={sruti} onChange={(e) => { const value = Number(e.target.value); if (Number.isFinite(value) && value > 0) onSruti(value); }} aria-label="Base frequency in Hz" /></label></div>}</section></>}</div></main><PrimerDialog open={primerOpen} onClose={() => setPrimerOpen(false)} /></div>;
}

function Path({ label, notes: _notes, content }: { label: string; notes: Swara[]; content: ReactNode }) { return <div className="note-path"><div className="path-heading"><span>{label}</span><i /></div><div className="note-chip-row">{content}</div></div>; }
