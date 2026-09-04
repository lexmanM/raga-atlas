import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the site from a subpath; the deploy workflow sets
  // BASE_PATH so the built asset URLs carry it. Local builds stay at root.
  base: process.env.BASE_PATH ?? '/',
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
