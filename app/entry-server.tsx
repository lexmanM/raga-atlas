import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';

import App from '@/app/page';

// The build renders every page through this module ahead of time (scripts/prerender.mjs),
// so the HTML a reader, a crawler or a link preview fetches already holds the rāga.

export { PAGES, pathOf, SITE_URL } from '@/lib/routes';
export { describe, HOME_META, pageMeta, withHead } from '@/lib/seo';

export function render(path: string) {
  return renderToString(
    <StrictMode>
      <App path={path} />
    </StrictMode>,
  );
}
