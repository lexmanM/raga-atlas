import { useMemo, useRef, useState } from 'react';
import { BookOpenText, Headphones, Pause, Play, Search, Square } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { playRaga, startDrone, type PlaybackHandle, type Voice } from '@/lib/audio-engine';
import { ALL_RAGAS, JANYA_RAGAS, type Swara } from '@/lib/ragas';
import { SwaraLadder } from './swara-ladder';

const sequenceText = (sequence: Swara[], ascent: boolean) => (ascent ? [...sequence, { label: 'Ṡ', semitones: 12 }] : [{ label: 'Ṡ', semitones: 12 }, ...sequence]).map((s) => s.label).join('  ');

export function RagaLibrary() {
  const [query, setQuery] = useState(''); const [selectedId, setSelectedId] = useState('mohanam');
  const [temperament, setTemperament] = useState<'just' | 'equal'>('just'); const [voice, setVoice] = useState<Voice>('bowed'); const [kampita, setKampita] = useState(false);
  const [sruti, setSruti] = useState(146.83); const [current, setCurrent] = useState<Swara | null>(null); const [playing, setPlaying] = useState(false); const [drone, setDrone] = useState(false);
  const playbackRef = useRef<PlaybackHandle | null>(null); const droneRef = useRef<PlaybackHandle | null>(null);
  const filtered = useMemo(() => ALL_RAGAS.filter((raga) => raga.name.toLowerCase().includes(query.toLowerCase())), [query]);
  const raga = ALL_RAGAS.find((item) => item.id === selectedId) ?? JANYA_RAGAS[0];
  const stop = () => { playbackRef.current?.stop(); playbackRef.current = null; setPlaying(false); setCurrent(null); };
  const play = () => { stop(); setPlaying(true); playbackRef.current = playRaga({ sequence: [...raga.arohana, { label: 'Ṡ', semitones: 12 }, ...raga.avarohana], sruti, temperament, voice, kampita, onSwara: (swara) => { setCurrent(swara); if (!swara) setPlaying(false); } }); };
  const toggleDrone = () => { if (drone) { droneRef.current?.stop(); droneRef.current = null; setDrone(false); } else { droneRef.current = startDrone(sruti); setDrone(true); } };

  return (
    <section className="raga-library">
      <aside className="raga-index">
        <div className="section-heading"><div><h2>Raga library</h2><p>72 melakartas · {JANYA_RAGAS.length} authored janyas</p></div></div>
        <div className="raga-search"><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a raga" aria-label="Find a raga" /></div>
        <div className="raga-list" aria-label="Ragas">
          {filtered.map((item) => <button key={item.id} aria-pressed={item.id === raga.id} className={item.id === raga.id ? 'selected' : ''} onClick={() => setSelectedId(item.id)}><span>{item.group === 'melakarta' ? String(item.parentMela).padStart(2, '0') : 'J'}</span><strong>{item.name}</strong><small>{item.group === 'janya' ? `Janya · Mela ${item.parentMela}` : 'Melakarta'}</small></button>)}
        </div>
      </aside>

      <div className="raga-console">
        <div className="deck-screws" aria-hidden="true"><i /><i /></div>
        <header className="raga-title"><div><p className="eyebrow">{raga.group === 'janya' ? `Janya · Mela ${raga.parentMela}` : `Melakarta ${raga.parentMela}`}</p><h2>{raga.name}</h2></div><button className={`drone-button ${drone ? 'active' : ''}`} onClick={toggleDrone}><Headphones /> Drone {drone ? 'on' : 'off'}</button></header>
        <div className="raga-display">
          <div className="raga-readout"><span>CURRENT SWARA</span><strong>{current?.label ?? '—'}</strong><small>{current && ['R2','G1','R3','G2','D2','N1','D3','N2'].includes(current.label) ? `same pitch as ${current.label === 'R2' ? 'G1' : current.label === 'G1' ? 'R2' : current.label === 'R3' ? 'G2' : current.label === 'G2' ? 'R3' : current.label === 'D2' ? 'N1' : current.label === 'N1' ? 'D2' : current.label === 'D3' ? 'N2' : 'D3'}` : 'relative to sa'}</small></div>
          <SwaraLadder raga={raga} temperament={temperament} current={current} />
        </div>
        <div className="scale-phrases">
          <div><span>AROHANA</span><strong>{sequenceText(raga.arohana, true)}</strong></div>
          <div><span>AVAROHANA</span><strong>{sequenceText(raga.avarohana, false)}</strong></div>
        </div>
        <div className="reference-note"><BookOpenText /><p><strong>A scale is a guide, not the raga.</strong> Phrase shape, approach and gamaka distinguish ragas that share these swaras.</p></div>
        <div className="raga-controls">
          <div className="transport-row raga-transport"><button className="orange-transport" aria-label={playing ? 'Pause raga' : 'Play raga'} onClick={playing ? stop : play}>{playing ? <Pause /> : <Play fill="currentColor" />}</button><button className="metal-button" onClick={stop} aria-label="Stop raga"><Square /></button></div>
          <label><span>SRUTI</span><div className="number-unit"><input type="number" min="80" max="400" step="0.01" value={sruti} onChange={(event) => setSruti(Number(event.target.value))} aria-label="Sruti in hertz" /><b>Hz</b></div></label>
          <fieldset><legend>INTONATION</legend><button className={temperament === 'just' ? 'active' : ''} onClick={() => setTemperament('just')}>Just</button><button className={temperament === 'equal' ? 'active' : ''} onClick={() => setTemperament('equal')}>Equal</button></fieldset>
          <fieldset><legend>VOICE</legend><button className={voice === 'bowed' ? 'active' : ''} onClick={() => setVoice('bowed')}>Bowed</button><button className={voice === 'veena' ? 'active' : ''} onClick={() => setVoice('veena')}>Veena</button></fieldset>
          <div className="kampita-toggle"><span><b>Kampita</b><small>Approximation</small></span><Switch checked={kampita} onCheckedChange={setKampita} aria-label="Approximate kampita" /></div>
        </div>
        <div className="raga-notes"><article><span>SANCHARAS</span><p>{raga.sancharas || 'Add characteristic phrases as your teacher introduces them.'}</p></article><article><span>GAMAKA NOTES</span><p>{raga.gamakaNotes || 'No notes yet. This field is intentionally free text.'}</p></article></div>
      </div>
    </section>
  );
}
