import { ALIASES, centsFor, type Raga, type Swara } from '@/lib/ragas';

export function SwaraLadder({ raga, temperament, current }: { raga: Raga; temperament: 'just' | 'equal'; current: Swara | null }) {
  const activeSemitones = new Set([...raga.arohana, ...raga.avarohana].map((swara) => swara.semitones % 12));
  const positionFor = (semitones: number) => `${(centsFor(semitones, temperament) / 1200) * 100}%`;
  return (
    <div className="ladder" aria-label={`${raga.name} swara ladder using ${temperament === 'just' ? 'just intonation' : 'equal temperament'}`}>
      <div className="ladder-line" />
      {ALIASES.map((label, semitones) => {
        const active = activeSemitones.has(semitones); const sounding = current ? current.semitones % 12 === semitones : false;
        return (
          <div key={label} className={`ladder-tick ${active ? 'in-raga' : ''} ${sounding ? 'sounding' : ''} ${semitones % 2 ? 'below' : 'above'}`} style={{ left: positionFor(semitones) }}>
            <i /><span>{label}<small>{centsFor(semitones, temperament)}¢</small></span>
          </div>
        );
      })}
      <div className="ladder-tick in-raga octave above" style={{ left: '100%' }}><i /><span>Ṡ<small>1200¢</small></span></div>
    </div>
  );
}
