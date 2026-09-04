import { useState } from 'react';
import { FileAudio, FolderOpen, Pause, Play, Scissors, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

const chunks = [
  { time: '00:02–01:18', piece: 'Ninnukori · Pallavi', role: 'reference' },
  { time: '01:24–02:31', piece: 'Ninnukori · Pallavi', role: 'take' },
  { time: '02:38–04:06', piece: 'Ninnukori · Anupallavi', role: 'reference' },
  { time: '04:14–05:37', piece: 'Ninnukori · Anupallavi', role: 'take' },
];

export function CaptureView() {
  const [roles, setRoles] = useState<Record<number, string>>(Object.fromEntries(chunks.map((chunk, index) => [index, chunk.role])));
  const [active, setActive] = useState<number | null>(null);
  return (
    <section className="capture-view">
      <header className="secondary-heading"><div><p className="eyebrow">Class capture</p><h2>September 1 class</h2><p>Pause detection found four useful phrases. Label the music; Swara will not guess the singer.</p></div><Button className="orange-button"><Upload /> Choose recording</Button></header>
      <div className="capture-drop"><FileAudio /><div><strong>Drop a class recording here</strong><span>M4A, WAV, MP3 · kept locally</span></div><button><FolderOpen /> Open folder</button></div>
      <div className="capture-toolbar"><span><Scissors /> 4 chunks · energy threshold −38 dB</span><button>Adjust threshold</button></div>
      <div className="chunk-strip">
        {chunks.map((chunk, index) => <article key={chunk.time} className={active === index ? 'playing' : ''}>
          <button className="chunk-play" aria-label={`${active === index ? 'Pause' : 'Play'} chunk ${index + 1}`} onClick={() => setActive(active === index ? null : index)}>{active === index ? <Pause /> : <Play fill="currentColor" />}</button>
          <div className="chunk-wave" aria-hidden="true">{Array.from({ length: 34 }, (_, bar) => <i key={bar} style={{ height: 7 + Math.abs(Math.sin(bar * 1.17 + index)) * 25 }} />)}</div>
          <time>{chunk.time}</time><label><span>PIECE / PHRASE</span><input defaultValue={chunk.piece} /></label>
          <div className="role-toggle"><button className={roles[index] === 'reference' ? 'active' : ''} onClick={() => setRoles({ ...roles, [index]: 'reference' })}>Teacher · reference</button><button className={roles[index] === 'take' ? 'active' : ''} onClick={() => setRoles({ ...roles, [index]: 'take' })}>Student · take</button></div>
        </article>)}
      </div>
    </section>
  );
}

export function ProgressView() {
  const minutes = [18, 26, 12, 34, 29, 41, 24];
  return (
    <section className="progress-view">
      <header className="secondary-heading"><div><p className="eyebrow">Practice progress</p><h2>Ninnukori · Mohanam</h2><p>Specific observations across your last six takes. No score—these are prompts for your next lesson.</p></div><button className="piece-picker">Change piece ▾</button></header>
      <div className="observation-grid"><article><span>G3 LANDING</span><strong>+11<small> cents</small></strong><p>Consistently sharp in the pallavi over the last three weeks.</p></article><article><span>D2 LANDING</span><strong>−6<small> cents</small></strong><p>Closer to the reference this week; earlier takes averaged −14 cents.</p></article><article><span>TIMING</span><strong>+8<small>% faster</small></strong><p>The anupallavi turn still arrives before the teacher reference.</p></article></div>
      <div className="progress-charts"><article><header><div><span>SWARA DEVIATION</span><strong>Median cents from guide</strong></div><small>raw f0 · no quantisation</small></header><div className="deviation-chart"><div className="zero-line" />{['S','R2','G3','P','D2'].map((label, index) => { const value = [2,-3,11,1,-6][index]; return <div key={label} className="deviation-point" style={{ left: `${10 + index * 20}%`, bottom: `${50 + value * 2}%` }}><i /><span>{value > 0 ? '+' : ''}{value}¢</span><b>{label}</b></div>; })}</div></article>
        <article><header><div><span>PRACTICE MINUTES</span><strong>184 minutes this week</strong></div><small>Sep 1–7</small></header><div className="minutes-chart">{minutes.map((value, index) => <div key={index}><i style={{ height: `${value * 2}px` }} /><span>{['M','T','W','T','F','S','S'][index]}</span></div>)}</div></article>
      </div>
      <div className="timing-note"><span>DTW PATH · TAKE 12 → REFERENCE</span><strong>Steep from 00:39–00:46</strong><p>You rushed the approach into the anupallavi. The ornament itself begins about 310 ms early.</p></div>
    </section>
  );
}
