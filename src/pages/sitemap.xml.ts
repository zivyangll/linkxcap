import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { languages, companies, team, pageUrl } from '../lib/site';
export const GET: APIRoute = async ({ site }) => {
  const insightRoutes = (await getCollection('insights'))
    .filter(({ data }) => data.lang === 'zh')
    .map(({ data }) => data.route);
  const paths = [
    'index',
    'portfolio',
    'team',
    'insights',
    'contact',
    'legal',
    ...companies.map((c) => `portfolio/${c.slug}`),
    ...team.map((p) => `team-${p.slug}`),
    ...insightRoutes,
  ];
  const absolute = (lang: 'zh' | 'en', page: string) =>
    new URL(pageUrl(lang, page), site).href;
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${paths.flatMap((page) => languages.map((lang) => `<url><loc>${absolute(lang, page)}</loc><xhtml:link rel="alternate" hreflang="zh-CN" href="${absolute('zh', page)}"/><xhtml:link rel="alternate" hreflang="en" href="${absolute('en', page)}"/></url>`)).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
