import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const insights = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/insights' }),
  // Article metadata lives in data/content.json. Markdown files intentionally
  // contain only the long-form body so editors never maintain fields twice.
  schema: z.object({}),
});
export const collections = { insights };
