import { Fragment, type MouseEvent } from 'react';

import { THAATS, HINDUSTANI_RAGAS } from '@/lib/hindustani';
import { JANYA_RAGAS, MELAKARTAS, type Raga } from '@/lib/ragas';
import { related } from '@/lib/related';
import { PAGES, pathOf } from '@/lib/routes';
import { describe } from '@/lib/seo';

// Plain prose and real links, so the page says what the rāga is and where it sits
// even to a reader or crawler that never runs the script. Inside the app a click
// opens the rāga in place; a modified click still opens a new tab as links should.

const linkText = (raga: Raga) => raga.group === 'thaat' ? `${raga.name} thāṭ` : raga.group === 'melakarta' ? `${raga.name} (${raga.parentMela})` : raga.name;

function RagaLink({ raga, onOpen, current }: { raga: Raga; onOpen: (raga: Raga) => void; current?: boolean }) {
  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); onOpen(raga);
  };
  return <a href={pathOf(raga)} onClick={click} aria-current={current ? 'page' : undefined}>{linkText(raga)}</a>;
}

export function RagaAbout({ raga, onOpen }: { raga: Raga; onOpen: (raga: Raga) => void }) {
  return <section className="raga-about" aria-labelledby="raga-about-title">
    <div className="section-label"><span id="raga-about-title">About {raga.name}</span></div>
    <p className="raga-summary">{describe(raga)}</p>
    {raga.sancharas && <p className="raga-note"><strong>Sañcāras</strong> {raga.sancharas}</p>}
    {raga.gamakaNotes && <p className="raga-note"><strong>Gamaka</strong> {raga.gamakaNotes}</p>}
    <dl className="raga-related">{related(raga).map((group) => <div key={group.label}><dt>{group.label}</dt><dd>{group.ragas.map((item, index) => <Fragment key={item.id}>{index > 0 && ', '}<RagaLink raga={item} onOpen={onOpen} /></Fragment>)}</dd></div>)}</dl>
  </section>;
}

const INDEX: { label: string; ragas: Raga[] }[] = [
  { label: 'Carnatic · 72 melakarta', ragas: MELAKARTAS },
  { label: `Carnatic · ${JANYA_RAGAS.length} janya`, ragas: JANYA_RAGAS },
  { label: `Hindustani · ${HINDUSTANI_RAGAS.length} rāga`, ragas: HINDUSTANI_RAGAS },
  { label: `Hindustani · ${THAATS.length} thāṭ`, ragas: THAATS },
];

/** Every page in one place: the site map a reader can use, and the path a crawler follows to reach all of them. */
export function RagaIndex({ current, onOpen }: { current: Raga; onOpen: (raga: Raga) => void }) {
  return <details className="raga-index">
    <summary>Browse all {PAGES.length} rāgas and thāṭs</summary>
    {INDEX.map((group) => <section key={group.label} aria-label={group.label}><h2>{group.label}</h2><ul>{group.ragas.map((item) => <li key={item.id}><RagaLink raga={item} onOpen={onOpen} current={item.id === current.id} /></li>)}</ul></section>)}
  </details>;
}
