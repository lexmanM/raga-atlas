import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';

import App from '@/app/page';
import '@/app/globals.css';
import { initAnalytics } from '@/lib/analytics';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Ragas could not find its application root');
}

initAnalytics();

const app = (
  <StrictMode>
    <App path={window.location.pathname} />
  </StrictMode>
);

// A built page arrives already rendered and React takes it over; the dev server sends
// an empty root. The not-found page holds the home page's HTML under whatever address
// was asked for, so it is drawn afresh rather than adopted.
if (root.hasChildNodes() && !root.hasAttribute('data-fallback')) hydrateRoot(root, app);
else createRoot(root).render(app);
