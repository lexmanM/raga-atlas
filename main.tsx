import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/app/page';
import '@/app/globals.css';
import { initAnalytics } from '@/lib/analytics';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Ragas could not find its application root');
}

initAnalytics();

createRoot(root).render(
  <StrictMode>
    <App path={window.location.pathname} />
  </StrictMode>,
);
