import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const insights = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/insights' }),
  // Insight metadata and long-form copy live together in Markdown so the
  // directory is the single source used for lists, routes and detail pages.
  schema: z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    route: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    lang: z.enum(['zh', 'en']),
    category: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    source_url: z.url().refine((value) => {
      if (!URL.canParse(value)) return false;
      const protocol = new URL(value).protocol;
      return protocol === 'https:' || protocol === 'http:';
    }, 'Source URL must use http or https.'),
    source_name: z.string().min(1),
    order: z.number().int().nonnegative(),
    title: z.string().min(1),
    summary: z.string().min(1),
    list_title: z.string().min(1),
    list_summary: z.string().min(1),
  }),
});
export const collections = { insights };
