import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

const markdownSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'id', 'className'],
  },
};

export default defineConfig({
  site: process.env.SITE_URL || 'https://zivyangll.github.io',
  base: process.env.SITE_BASE || '/linkxcap',
  output: 'static',
  build: { format: 'preserve', inlineStylesheets: 'never' },
  compressHTML: true,
  markdown: {
    processor: unified({ rehypePlugins: [[rehypeSanitize, markdownSchema]] }),
  },
  vite: { build: { assetsInlineLimit: 0 } },
});
