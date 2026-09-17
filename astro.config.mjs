import { defineConfig } from 'astro/config';

export default defineConfig({
  site: process.env.SITE_URL || 'https://zivyangll.github.io',
  base: process.env.SITE_BASE || '/linkxcap',
  output: 'static',
  build: { format: 'preserve', inlineStylesheets: 'never' },
  compressHTML: true,
  vite: { build: { assetsInlineLimit: 0 } },
});
