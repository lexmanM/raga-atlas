import { RagaLibrary, THEMES, type Theme } from '@/components/raga-library';
import type { Raga } from '@/lib/ragas';
import { ragaAt, traditionOf } from '@/lib/routes';
import type { Tradition } from '@/lib/traditions';
import { useCallback, useState } from 'react';

const SRUTI_KEY = 'ragas.sruti';
const THEME_KEY = 'ragas.theme';
const TRADITION_KEY = 'ragas.tradition';
const DEFAULT_SRUTI = 146.83;

function readSruti() {
  try {
    const stored = Number(localStorage.getItem(SRUTI_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_SRUTI;
  } catch {
    return DEFAULT_SRUTI;
  }
}

function readTradition(): Tradition {
  try {
    return localStorage.getItem(TRADITION_KEY) === 'hindustani' ? 'hindustani' : 'carnatic';
  } catch {
    return 'carnatic';
  }
}

// index.html stamps the theme before first paint (stored choice, else the system
// preference), so the app starts from whatever is already on the page.
function readTheme(): Theme {
  const current = document.documentElement.dataset.theme;
  return THEMES.find((item) => item.id === current)?.id ?? 'night';
}

export default function Home({ path }: { path: string }) {
  // A rāga address decides the tradition; the bare home page falls back to the reader's last choice.
  const [initial] = useState<Raga | undefined>(() => ragaAt(path));
  const [sruti, setSruti] = useState(readSruti);
  const [theme, setTheme] = useState(readTheme);
  const [tradition, setTradition] = useState<Tradition>(() => (initial ? traditionOf(initial) : readTradition()));
  const changeSruti = useCallback((value: number) => {
    setSruti(value);
    try { localStorage.setItem(SRUTI_KEY, String(value)); } catch {}
  }, []);
  const changeTheme = useCallback((value: Theme) => {
    setTheme(value);
    document.documentElement.dataset.theme = value;
    try { localStorage.setItem(THEME_KEY, value); } catch {}
  }, []);

  const changeTradition = useCallback((value: Tradition) => {
    setTradition(value);
    try { localStorage.setItem(TRADITION_KEY, value); } catch {}
  }, []);

  return <RagaLibrary initial={initial} sruti={sruti} onSruti={changeSruti} theme={theme} onTheme={changeTheme} tradition={tradition} onTradition={changeTradition} />;
}
