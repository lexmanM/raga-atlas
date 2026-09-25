// Writes one complete HTML file per page into dist/, after `vite build` has produced
// the browser bundle and `vite build --ssr` the server copy of the same app.
// /raga/yaman is written as dist/raga/yaman.html, which GitHub Pages and
// `vite preview` both serve at the extensionless address.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// React's server renderer picks its build from NODE_ENV; the production one is faster and quieter.
process.env.NODE_ENV = 'production';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(root, 'dist');
const serverDir = join(root, 'dist-server');

const { render, PAGES, pathOf, pageMeta, describe, HOME_META, SITE_URL, withHead } = await import(pathToFileURL(join(serverDir, 'entry-server.js')).href);
const template = await readFile(join(dist, 'index.html'), 'utf8');
if (!template.includes('<div id="root"></div>')) throw new Error('dist/index.html has no empty #root to fill');

const html = (path, meta) => withHead(template, meta).replace('<div id="root"></div>', `<div id="root">${render(path)}</div>`);
const write = async (file, content) => { await mkdir(dirname(file), { recursive: true }); await writeFile(file, content); };

await write(join(dist, 'index.html'), html('/', HOME_META));
for (const raga of PAGES) await write(join(dist, `${pathOf(raga)}.html`), html(pathOf(raga), pageMeta(raga)));

// Unknown addresses get the home page with a not-found status. It is marked so the
// browser draws it afresh rather than adopting it, and kept out of search results.
await write(join(dist, '404.html'), html('/', HOME_META)
  .replace('<div id="root">', '<div id="root" data-fallback>')
  .replace(/\s*<link rel="canonical"[^>]*>/, '')
  .replace('</head>', '  <meta name="robots" content="noindex" />\n  </head>'));
// GitHub Pages would otherwise run the output through Jekyll.
await write(join(dist, '.nojekyll'), '');

const urls = ['/', ...PAGES.map(pathOf)].map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`);
await write(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
await write(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

// llms.txt (https://llmstxt.org): the whole catalogue as plain Markdown, one line per page.
const section = (title, group) => [`## ${title}`, '', ...PAGES.filter((raga) => raga.group === group).map((raga) => `- [${raga.name}](${SITE_URL}${pathOf(raga)}): ${describe(raga)}`), ''];
await write(join(dist, 'llms.txt'), [
  '# Rāga Atlas', '',
  `> ${HOME_META.description} Each rāga has its own page with its ascent and descent, parent scale and related rāgas, and in the browser it can be played, sung against a drone and practised in loops.`, '',
  'Carnatic notes are written S R1 R2 R3 G1 G2 G3 M1 M2 P D1 D2 D3 N1 N2 N3, with the upper Sa as Ṡ. Hindustani pages name each swar (komal Re, tivra Ma). Scales follow the standard textbook forms; lineages differ on details.', '',
  ...section('Carnatic melakartas', 'melakarta'), ...section('Carnatic janya rāgas', 'janya'), ...section('Hindustani rāgas', 'raga'), ...section('Hindustani thāṭs', 'thaat'),
].join('\n'));

// The server copy exists only to feed this script.
await rm(serverDir, { recursive: true, force: true });
console.log(`Pre-rendered ${PAGES.length + 1} pages, 404.html, sitemap.xml, robots.txt and llms.txt into dist/`);
