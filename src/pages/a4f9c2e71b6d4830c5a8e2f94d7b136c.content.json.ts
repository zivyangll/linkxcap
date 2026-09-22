import type { APIRoute } from 'astro';
import content from '../data/content.json';
import { validateContentConfig } from '../lib/content-schema';

export const GET: APIRoute = () => {
  const validation = validateContentConfig(content, content);
  if (!validation.valid)
    return new Response(
      JSON.stringify({
        error: 'Invalid bundled content',
        details: validation.errors,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    );
  return new Response(JSON.stringify(content), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
