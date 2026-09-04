export type Swara = { label: string; semitones: number };
export type Raga = {
  id: string;
  name: string;
  group: 'melakarta' | 'janya';
  parentMela?: number;
  arohana: Swara[];
  avarohana: Swara[];
  sancharas?: string;
  gamakaNotes?: string;
};

export const JUST_CENTS = [0, 112, 204, 316, 386, 498, 590, 702, 814, 884, 1018, 1088] as const;
export const ALIASES = ['S', 'R1', 'R2 / G1', 'R3 / G2', 'G3', 'M1', 'M2', 'P', 'D1', 'D2 / N1', 'D3 / N2', 'N3'] as const;
const RI_GA = [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]] as const;
const DA_NI = [[8, 9], [8, 10], [8, 11], [9, 10], [9, 11], [10, 11]] as const;

export const MELAKARTA_NAMES = [
  'Kanakangi', 'Ratnangi', 'Ganamurti', 'Vanaspati', 'Manavati', 'Tanarupi', 'Senavati', 'Hanumatodi', 'Dhenuka', 'Natakapriya', 'Kokilapriya', 'Rupavati',
  'Gayakapriya', 'Vakulabharanam', 'Mayamalavagowla', 'Chakravakam', 'Suryakantam', 'Hatakambari', 'Jhankaradhwani', 'Natabhairavi', 'Keeravani', 'Kharaharapriya', 'Gourimanohari', 'Varunapriya',
  'Mararanjani', 'Charukesi', 'Sarasangi', 'Harikambhoji', 'Dheerasankarabharanam', 'Naganandini', 'Yagapriya', 'Ragavardhini', 'Gangeyabhushani', 'Vagadheeswari', 'Sulini', 'Chalanata',
  'Salagam', 'Jalarnavam', 'Jhalavarali', 'Navaneetam', 'Pavani', 'Raghupriya', 'Gavambodhi', 'Bhavapriya', 'Subhapantuvarali', 'Shadvidhamargini', 'Suvarnangi', 'Divyamani',
  'Dhavalambari', 'Namanarayani', 'Kamavardhini', 'Ramapriya', 'Gamanashrama', 'Vishwambari', 'Shamalangi', 'Shanmukhapriya', 'Simhendramadhyamam', 'Hemavati', 'Dharmavati', 'Neetimati',
  'Kantamani', 'Rishabhapriya', 'Latangi', 'Vachaspati', 'Mechakalyani', 'Chitrambari', 'Sucharitra', 'Jyotiswarupini', 'Dhatuvardhani', 'Nasikabhushani', 'Kosalam', 'Rasikapriya',
] as const;

const labelFor = (degree: 'ri' | 'ga' | 'ma' | 'da' | 'ni', semitones: number): string => {
  const offsets = { ri: 0, ga: 1, ma: 4, da: 7, ni: 8 };
  return `${degree[0].toUpperCase()}${semitones - offsets[degree]}`;
};

export function melakarta(number: number): Raga {
  if (!Number.isInteger(number) || number < 1 || number > 72) throw new RangeError('Melakarta number must be 1–72');
  const ma = number <= 36 ? 5 : 6;
  const k = (number - 1) % 36;
  const [ri, ga] = RI_GA[Math.floor(k / 6)];
  const [da, ni] = DA_NI[k % 6];
  const arohana: Swara[] = [
    { label: 'S', semitones: 0 }, { label: labelFor('ri', ri), semitones: ri }, { label: labelFor('ga', ga), semitones: ga },
    { label: labelFor('ma', ma), semitones: ma }, { label: 'P', semitones: 7 }, { label: labelFor('da', da), semitones: da }, { label: labelFor('ni', ni), semitones: ni },
  ];
  return { id: `mela-${number}`, name: MELAKARTA_NAMES[number - 1], group: 'melakarta', parentMela: number, arohana, avarohana: [...arohana].reverse() };
}

const s = (label: string, semitones: number): Swara => ({ label, semitones });
const janya = (name: string, parentMela: number, up: Swara[], down: Swara[], sancharas = '', gamakaNotes = ''): Raga => ({ id: name.toLowerCase().replaceAll(' ', '-'), name, group: 'janya', parentMela, arohana: up, avarohana: down, sancharas, gamakaNotes });

export const JANYA_RAGAS: Raga[] = [
  janya('Mohanam', 28, [s('S',0),s('R2',2),s('G3',4),s('P',7),s('D2',9)], [s('D2',9),s('P',7),s('G3',4),s('R2',2),s('S',0)], 'G R S · D P G · G P D S', 'G3 and D2 are important resting points; keep phrases open and bright.'),
  janya('Hamsadhwani', 29, [s('S',0),s('R2',2),s('G3',4),s('P',7),s('N3',11)], [s('N3',11),s('P',7),s('G3',4),s('R2',2),s('S',0)], 'S R G P N S · N P G R S', 'G3 and N3 take light kampita in characteristic phrases.'),
  janya('Malahari', 15, [s('S',0),s('R1',1),s('M1',5),s('P',7),s('D1',8)], [s('D1',8),s('P',7),s('M1',5),s('G3',4),s('R1',1),s('S',0)]),
  janya('Abhogi', 22, [s('S',0),s('R2',2),s('G2',3),s('M1',5),s('D2',9)], [s('D2',9),s('M1',5),s('G2',3),s('R2',2),s('S',0)]),
  janya('Sriranjani', 22, [s('S',0),s('R2',2),s('G2',3),s('M1',5),s('D2',9),s('N2',10)], [s('N2',10),s('D2',9),s('M1',5),s('G2',3),s('R2',2),s('S',0)]),
  janya('Hindolam', 20, [s('S',0),s('G2',3),s('M1',5),s('D1',8),s('N2',10)], [s('N2',10),s('D1',8),s('M1',5),s('G2',3),s('S',0)]),
  janya('Madhyamavati', 22, [s('S',0),s('R2',2),s('M1',5),s('P',7),s('N2',10)], [s('N2',10),s('P',7),s('M1',5),s('R2',2),s('S',0)]),
  janya('Suddha Saveri', 29, [s('S',0),s('R2',2),s('M1',5),s('P',7),s('D2',9)], [s('D2',9),s('P',7),s('M1',5),s('R2',2),s('S',0)]),
  janya('Bilahari', 29, [s('S',0),s('R2',2),s('G3',4),s('P',7),s('D2',9)], [s('N3',11),s('D2',9),s('P',7),s('M1',5),s('G3',4),s('R2',2),s('S',0)]),
  janya('Mohanakalyani', 65, [s('S',0),s('R2',2),s('G3',4),s('P',7),s('D2',9)], [s('N3',11),s('D2',9),s('P',7),s('M2',6),s('G3',4),s('R2',2),s('S',0)]),
  janya('Kambhoji', 28, [s('S',0),s('R2',2),s('G3',4),s('M1',5),s('P',7),s('D2',9)], [s('N2',10),s('D2',9),s('P',7),s('M1',5),s('G3',4),s('R2',2),s('S',0)]),
  janya('Anandabhairavi', 20, [s('S',0),s('G2',3),s('R2',2),s('G2',3),s('M1',5),s('P',7),s('D2',9),s('P',7)], [s('N2',10),s('D2',9),s('P',7),s('M1',5),s('G2',3),s('R2',2),s('S',0)]),
  janya('Arabhi', 29, [s('S',0),s('R2',2),s('M1',5),s('P',7),s('D2',9)], [s('N3',11),s('D2',9),s('P',7),s('M1',5),s('G3',4),s('R2',2),s('S',0)]),
  janya('Saveri', 15, [s('S',0),s('R1',1),s('M1',5),s('P',7),s('D1',8)], [s('N3',11),s('D1',8),s('P',7),s('M1',5),s('G3',4),s('R1',1),s('S',0)]),
  janya('Nattai', 36, [s('S',0),s('R3',3),s('G3',4),s('M1',5),s('P',7),s('N3',11)], [s('N3',11),s('P',7),s('M1',5),s('R3',3),s('S',0)]),
  janya('Revati', 2, [s('S',0),s('R1',1),s('M1',5),s('P',7),s('N2',10)], [s('N2',10),s('P',7),s('M1',5),s('R1',1),s('S',0)]),
  janya('Sivaranjani', 22, [s('S',0),s('R2',2),s('G2',3),s('P',7),s('D2',9)], [s('D2',9),s('P',7),s('G2',3),s('R2',2),s('S',0)]),
  janya('Kanada', 22, [s('S',0),s('R2',2),s('G2',3),s('M1',5),s('P',7),s('D2',9),s('N2',10),s('S',12)], [s('N2',10),s('P',7),s('M1',5),s('G2',3),s('M1',5),s('R2',2),s('S',0)]),
];

export const MELAKARTAS = Array.from({ length: 72 }, (_, i) => melakarta(i + 1));
export const ALL_RAGAS = [...JANYA_RAGAS, ...MELAKARTAS];
export const centsFor = (semitones: number, temperament: 'just' | 'equal') => semitones === 12 ? 1200 : temperament === 'just' ? JUST_CENTS[semitones] : semitones * 100;
