import {
  Archive,
  BookOpen,
  CircleStop,
  Library,
  Mic2,
  Pause,
  Play,
  Repeat2,
  Search,
  Settings2,
  SkipBack,
  SlidersHorizontal,
  TimerReset,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { RagaLibrary } from '@/components/raga-library';
import { CaptureView, ProgressView } from '@/components/secondary-views';

const pieces = [
  { name: 'Ninnukori', detail: 'Varnam · Adi tala', raga: 'Mohanam', practiced: 'Today, 7:42 AM', takes: 12 },
  { name: 'Vatapi Ganapatim', detail: 'Kriti · Adi tala', raga: 'Hamsadhwani', practiced: 'Yesterday', takes: 8 },
  { name: 'Lambodara', detail: 'Geetham · Rupaka tala', raga: 'Malahari', practiced: 'Aug 31', takes: 6 },
  { name: 'Sami Ninne', detail: 'Varnam · Adi tala', raga: 'Sankarabharanam', practiced: 'Aug 29', takes: 4 },
];

function Waveform({ role, muted = false }: { role: string; muted?: boolean }) {
  const bars = useMemo(
    () => Array.from({ length: 92 }, (_, i) => Math.max(5, Math.min(36, 16 + Math.sin(i * 1.7) * 12 + Math.sin(i * 0.29 + 0.8) * 17))),
    [],
  );
  return (
    <div className={`waveform ${muted ? 'waveform-muted' : ''}`} aria-label={`${role} waveform`}>
      <div className="wave-progress" />
      {bars.map((height, index) => <i key={index} style={{ height }} />)}
      <span className="loop-flag loop-a">A</span>
      <span className="loop-flag loop-b">B</span>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<'shelf' | 'capture' | 'ragas' | 'progress'>('shelf');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('Ninnukori');
  const [playing, setPlaying] = useState(false);
  const [role, setRole] = useState<'reference' | 'take'>('take');
  const [speed, setSpeed] = useState(0.75);
  const [volume, setVolume] = useState([72]);
  const [recording, setRecording] = useState(false);
  const [recordStatus, setRecordStatus] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const filtered = pieces.filter((piece) => `${piece.name} ${piece.raga}`.toLowerCase().includes(query.toLowerCase()));
  const current = pieces.find((piece) => piece.name === selected) ?? pieces[0];

  const toggleRecording = async () => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop(); setRecording(false); setRecordStatus('Saving locally…'); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const chunks: Blob[] = []; const recorder = new MediaRecorder(stream); recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }); const form = new FormData(); const now = new Date();
        const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        form.append('audio', blob, 'browser-take.webm'); form.append('session_date', localDate); form.append('sruti_hz', '146.83');
        try { const response = await fetch('http://127.0.0.1:8000/api/recordings', { method: 'POST', body: form }); if (!response.ok) throw new Error('save failed'); setRecordStatus('Take saved as WAV'); }
        catch { setRecordStatus('Could not reach the local archive'); }
      };
      recorder.start(250); setRecording(true); setRecordStatus('Recording dry microphone');
    } catch { setRecordStatus('Microphone permission is required'); }
  };

  return (
    <main className="app-shell">
      <aside className="rail" aria-label="Primary navigation">
        <div className="brand" aria-label="Swara home"><span>S</span></div>
        <nav>
          <button className={`rail-item ${view === 'shelf' ? 'active' : ''}`} aria-current={view === 'shelf' ? 'page' : undefined} onClick={() => setView('shelf')}><Library /><span>Shelf</span></button>
          <button className={`rail-item ${view === 'capture' ? 'active' : ''}`} aria-current={view === 'capture' ? 'page' : undefined} onClick={() => setView('capture')}><Mic2 /><span>Capture</span></button>
          <button className={`rail-item ${view === 'ragas' ? 'active' : ''}`} aria-current={view === 'ragas' ? 'page' : undefined} onClick={() => setView('ragas')}><BookOpen /><span>Ragas</span></button>
          <button className={`rail-item ${view === 'progress' ? 'active' : ''}`} aria-current={view === 'progress' ? 'page' : undefined} onClick={() => setView('progress')}><SlidersHorizontal /><span>Progress</span></button>
        </nav>
        <button className="rail-item rail-bottom"><Settings2 /><span>Settings</span></button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">{view === 'shelf' ? 'Practice archive' : view === 'ragas' ? 'Listen · Locate · Learn' : view === 'capture' ? 'Label · Sort · Keep' : 'Observe · Ask · Refine'}</p><h1>{view === 'shelf' ? 'Choose a piece' : view === 'ragas' ? 'Raga reference' : view === 'capture' ? 'Class capture' : 'Across your practice'}</h1></div>
          <div className="sruti-readout"><span>SRUTI</span><strong>146.83 <small>Hz</small></strong><i aria-hidden="true" /></div>
        </header>

        {view === 'shelf' ? <div className="content-grid">
          <section className="shelf-panel" aria-labelledby="shelf-title">
            <div className="section-heading">
              <div><h2 id="shelf-title">Your shelf</h2><p>4 pieces · 30 takes</p></div>
              <Button className="orange-button"><Archive /> Add audio</Button>
            </div>
            <div className="search-row">
              <Search aria-hidden="true" />
              <Input aria-label="Search pieces or ragas" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pieces or ragas" />
              <Button variant="outline" aria-label="Filter shelf"><SlidersHorizontal /></Button>
            </div>
            <div className="piece-list">
              {filtered.map((piece) => (
                <button key={piece.name} aria-label={`Practice ${piece.name} in ${piece.raga}`} className={`piece-card ${selected === piece.name ? 'selected' : ''}`} onClick={() => setSelected(piece.name)}>
                  <span className="cassette-mini" aria-hidden="true"><i /><i /></span>
                  <span className="piece-copy"><strong>{piece.name}</strong><small>{piece.detail}</small><em>{piece.raga}</em></span>
                  <span className="piece-meta"><small>{piece.practiced}</small><strong>{piece.takes} <span>takes</span></strong></span>
                </button>
              ))}
            </div>
          </section>

          <section className="deck" aria-labelledby="deck-title">
            <div className="deck-screws" aria-hidden="true"><i /><i /></div>
            <div className="deck-header">
              <div><p className="eyebrow">Now practising</p><h2 id="deck-title">{current.name}</h2><p>{current.raga} · {current.detail.split(' · ')[1]}</p></div>
              <span className="take-counter">TAKE 12 / 12</span>
            </div>
            <div className="display-window">
              <div className="display-topline"><span>{role === 'take' ? 'YOUR TAKE' : 'TEACHER REFERENCE'}</span><span>00:24.8 / 01:16.2</span></div>
              <div className="reels" aria-hidden="true">
                <span className={playing ? 'spinning' : ''}><i /><i /><i /><i /><i /><i /></span><b /><span className={playing ? 'spinning' : ''}><i /><i /><i /><i /><i /><i /></span>
              </div>
              <div className="swara-status"><strong>G2</strong><span>same pitch as R3</span><small>+7 cents from sa-relative guide</small></div>
            </div>
            <div className="ab-switch" aria-label="Compare recording">
              <button className={role === 'reference' ? 'active' : ''} onClick={() => setRole('reference')}>A · Reference</button>
              <button className={role === 'take' ? 'active' : ''} onClick={() => setRole('take')}>B · Take 12</button>
            </div>
            <Waveform role={role} muted={role === 'reference'} />
            <div className="transport-panel">
              <div className="transport-row" aria-label="Transport controls">
                <button className="metal-button" aria-label="Return to start"><SkipBack /></button>
                <button className="orange-transport" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)}>{playing ? <Pause /> : <Play fill="currentColor" />}</button>
                <button className="metal-button" aria-label="Stop" onClick={() => setPlaying(false)}><CircleStop /></button>
                <button className="metal-button active-loop" aria-label="A B loop"><Repeat2 /><span>A–B</span></button>
                <button className={`record-button ${recording ? 'recording' : ''}`} aria-label={recording ? 'Stop and save recording' : 'Record a take'} onClick={toggleRecording}><i /> {recording ? 'STOP' : 'REC'}</button>
              </div>
              <div className="deck-controls">
                <div className="speed-control"><span>SPEED</span>{[0.5, 0.75, 1].map((value) => <button key={value} onClick={() => setSpeed(value)} className={speed === value ? 'active' : ''}>{value}×</button>)}</div>
                <label className="volume-control"><span>OUTPUT</span><Slider value={volume} onValueChange={(value) => setVolume(Array.isArray(value) ? [...value] : [value])} max={100} step={1} aria-label="Output volume" /><strong>{volume[0]}</strong></label>
              </div>
              {recordStatus && <output className="record-status" aria-live="polite">{recordStatus}</output>}
            </div>
            <div className="marker-strip">
              <div className="marker-heading"><span><TimerReset /> Markers</span><button>+ Add marker</button></div>
              <button><time>00:18.4</time><span>Hold the G2 landing—don’t rush the turn</span></button>
              <button><time>00:43.1</time><span>Compare teacher’s kampita shape</span></button>
            </div>
          </section>
        </div> : view === 'ragas' ? <RagaLibrary /> : view === 'capture' ? <CaptureView /> : <ProgressView />}
      </section>
    </main>
  );
}
