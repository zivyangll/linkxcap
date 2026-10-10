import type { APIRoute } from 'astro';
import { url } from '../lib/site';
// Public content is open to search engines. AI search crawlers and the
// readers a person triggers in ChatGPT, Claude and Perplexity are listed by
// name so a later rule for "*" cannot shut them out by accident. Training
// crawlers (GPTBot, ClaudeBot, Google-Extended) follow the "*" group.
const aiSearch = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
];
export const GET: APIRoute = ({ site }) =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      '',
      ...aiSearch.map((agent) => `User-agent: ${agent}`),
      'Allow: /',
      '',
      `Sitemap: ${new URL(url('sitemap.xml'), site)}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
