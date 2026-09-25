import { useSyncExternalStore } from 'react';

const never = () => () => {};

/**
 * False on the server and while React adopts the pre-rendered HTML, true from the
 * next render on. Anything read from browser storage waits for it, so the first
 * render in the browser matches the HTML the server wrote.
 */
export const useHydrated = () => useSyncExternalStore(never, () => true, () => false);
