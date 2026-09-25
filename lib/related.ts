import { HINDUSTANI_RAGAS, THAATS } from './hindustani';
import { JANYA_RAGAS, MELAKARTAS, pitchClass, type Raga } from './ragas';
import { PAGES, traditionOf } from './routes';

// The links a rāga page offers: its family inside its own tradition, and whatever in
// the other tradition uses exactly the same notes. That second list is computed from
// the scales, not curated, and says "same notes" because it does not claim more: two
// rāgas can share every note and still be sung very differently.

export type RelatedGroup = { label: string; ragas: Raga[] };

const noteSet = (raga: Raga) => [...new Set([...raga.arohana, ...raga.avarohana].map((note) => pitchClass(note.semitones)))].sort((a, b) => a - b).join(' ');

export function related(raga: Raga): RelatedGroup[] {
  const others = (list: Raga[]) => list.filter((item) => item.id !== raga.id);
  const groups: RelatedGroup[] = [];
  if (raga.group === 'janya') {
    groups.push({ label: 'Parent melakarta', ragas: [MELAKARTAS[(raga.parentMela ?? 1) - 1]] });
    groups.push({ label: 'Other janyas of this melakarta', ragas: others(JANYA_RAGAS.filter((item) => item.parentMela === raga.parentMela)) });
  } else if (raga.group === 'melakarta') {
    groups.push({ label: 'Janya rāgas of this melakarta', ragas: JANYA_RAGAS.filter((item) => item.parentMela === raga.parentMela) });
  } else if (raga.group === 'raga') {
    groups.push({ label: 'Thāṭ', ragas: THAATS.filter((item) => item.thaat === raga.thaat) });
    groups.push({ label: `Also in ${raga.thaat} thāṭ`, ragas: others(HINDUSTANI_RAGAS.filter((item) => item.thaat === raga.thaat)) });
  } else {
    groups.push({ label: 'Rāgas in this thāṭ', ragas: HINDUSTANI_RAGAS.filter((item) => item.thaat === raga.thaat) });
  }
  const other = traditionOf(raga) === 'carnatic' ? 'hindustani' : 'carnatic';
  const notes = noteSet(raga);
  groups.push({ label: `Same notes in ${other === 'hindustani' ? 'Hindustani' : 'Carnatic'}`, ragas: PAGES.filter((item) => traditionOf(item) === other && noteSet(item) === notes) });
  return groups.filter((group) => group.ragas.length > 0);
}
