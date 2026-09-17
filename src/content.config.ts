import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    translationKey: z.string(),
    lang: z.enum(['zh', 'en']),
    route: z.string(),
    title: z.string(),
    summary: z.string(),
    date: z.string(),
    category: z.enum(['applications', 'models', 'portfolio', 'panorama']),
    source: z.url(),
    sourceName: z.string(),
    mock: z.boolean(),
    order: z.number(),
  }),
});
export const collections = { articles };
