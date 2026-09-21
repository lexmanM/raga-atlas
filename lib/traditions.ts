export type Tradition = 'carnatic' | 'hindustani';
export const TRADITIONS: { id: Tradition; label: string }[] = [{ id: 'carnatic', label: 'Carnatic' }, { id: 'hindustani', label: 'Hindustani' }];

// The words that differ between the two traditions for the same idea. Carnatic
// strings are the ones the page has always used; nothing about that mode changes.
export const WORDS = {
  carnatic: {
    ascent: 'Ārohana', descent: 'Avarohana', tonic: 'Śruti', tempo: 'Kāla', drone: 'Tambura',
    positions: 'Chromatic position · 12 svarasthāna', notes: 'svara',
    search: 'search rāga or mela no.',
    wobble: 'Wobble (Kampita)',
  },
  hindustani: {
    ascent: 'Āroha', descent: 'Avaroha', tonic: 'Sa', tempo: 'Laya', drone: 'Tānpūrā',
    positions: 'Chromatic position · 12 swar', notes: 'swar',
    search: 'search rāga or thāt',
    wobble: 'Wobble (Āndolan)',
  },
} as const;
