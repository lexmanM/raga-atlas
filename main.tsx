import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';

import App from '@/app/page';
import '@/app/globals.css';
import { initAnalytics } from '@/lib/analytics';
import { pathOf, ragaAt } from '@/lib/routes';
import { applyHead, pageMeta } from '@/lib/seo';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Ragas could not find its application root');
}

initAnalytics();

// The not-found page also catches near misses such as /raga/yaman/. When the address
// still names a rāga, show it under its proper address and title.
const fallback = root.hasAttribute('data-fallback');
const named = ragaAt(window.location.pathname);
if (fallback && named) {
  window.history.replaceState(null, '', pathOf(named));
  applyHead(pageMeta(named));
}

const app = (
  <StrictMode>
    <App path={window.location.pathname} />
  </StrictMode>
);

// A built page arrives already rendered and React takes it over; the dev server sends
// an empty root. The not-found page holds the home page's HTML under whatever address
// was asked for, so it is drawn afresh rather than adopted.
if (root.hasChildNodes() && !fallback) hydrateRoot(root, app);
else createRoot(root).render(app);
