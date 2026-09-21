import { SWARS } from '@/lib/hindustani';
import { pitchClass } from '@/lib/ragas';

// A Hindustani swar drawn the Bhatkhande way: komal notes underlined, tivra Ma with
// a stroke above, a dot above or below for the octave. Built from plain spans with
// fixed-height slots, so a marked note and a bare one still share a baseline.
export function Swar({ semitones }: { semitones: number }) {
  const item = SWARS[pitchClass(semitones)]; const octave = Math.floor(semitones / 12);
  return <span className={`swar ${item.mark ?? ''}`}><span className="swar-slot top">{octave > 0 && <span className="swar-dot" />}{item.mark === 'tivra' && <span className="swar-stroke" />}</span><span className="swar-letter">{item.letter}</span><span className="swar-slot bottom">{octave < 0 && <span className="swar-dot" />}</span></span>;
}
export const swarName = (semitones: number) => { const octave = Math.floor(semitones / 12); return `${octave < 0 ? 'lower ' : octave > 0 ? 'upper ' : ''}${SWARS[pitchClass(semitones)].name}`; };
