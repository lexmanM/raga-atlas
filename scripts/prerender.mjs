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

const { render, PAGES, pathOf, pageMeta, HOME_META, withHead } = await import(pathToFileURL(join(serverDir, 'entry-server.js')).href);
const template = await readFile(join(dist, 'index.html'), 'utf8');
if (!template.includes('<div id="root"></div>')) throw new Error('dist/index.html has no empty #root to fill');

const html = (path, meta) => withHead(template, meta).replace('<div id="root"></div>', `<div id="root">${render(path)}</div>`);
const write = async (file, content) => { await mkdir(dirname(file), { recursive: true }); await writeFile(file, content); };

await write(join(dist, 'index.html'), html('/', HOME_META));
for (const raga of PAGES) await write(join(dist, `${pathOf(raga)}.html`), html(pathOf(raga), pageMeta(raga)));

// The server copy exists only to feed this script.
await rm(serverDir, { recursive: true, force: true });
console.log(`Pre-rendered ${PAGES.length + 1} pages into dist/`);
