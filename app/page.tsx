import { RagaLibrary } from '@/components/raga-library';
import { useCallback, useState } from 'react';

const SRUTI_KEY = 'ragas.sruti';
const DEFAULT_SRUTI = 146.83;

function readSruti() {
  try {
    const stored = Number(localStorage.getItem(SRUTI_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_SRUTI;
  } catch {
    return DEFAULT_SRUTI;
  }
}

export default function Home() {
  const [sruti, setSruti] = useState(readSruti);
  const changeSruti = useCallback((value: number) => {
    setSruti(value);
    try { localStorage.setItem(SRUTI_KEY, String(value)); } catch {}
  }, []);

  return <RagaLibrary sruti={sruti} onSruti={changeSruti} />;
}
