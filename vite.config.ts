import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

// Static hosts that serve the app from a subpath (GitHub Pages project sites,
// for example) set BASE_PATH at build time. Local dev and root-domain hosts
// (Netlify, Cloudflare Pages, a plain web server) need no configuration.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
  },
});
