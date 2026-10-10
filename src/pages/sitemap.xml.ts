import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { languages, companies, team, pageUrl } from '../lib/site';
export const GET: APIRoute = async ({ site }) => {
  // Articles carry a real publication date; other pages omit lastmod rather
  // than claiming every build as a change.
  const articles = (await getCollection('insights')).filter(
    ({ data }) => data.lang === 'zh',
  );
  const pages: { page: string; lastmod?: string }[] = [
    'index',
    'portfolio',
    'team',
    'insights',
    'fellowship',
    'legal',
    ...companies.map((c) => `portfolio/${c.slug}`),
    ...team.map((p) => `team-${p.slug}`),
  ].map((page) => ({ page }));
  pages.push(
    ...articles.map(({ data }) => ({ page: data.route, lastmod: data.date })),
  );
  const absolute = (lang: 'zh' | 'en', page: string) =>
    new URL(pageUrl(lang, page), site).href;
  const entry = ({ page, lastmod }: (typeof pages)[number]) =>
    languages
      .map(
        (lang) =>
          `<url><loc>${absolute(lang, page)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<xhtml:link rel="alternate" hreflang="zh-CN" href="${absolute('zh', page)}"/><xhtml:link rel="alternate" hreflang="en" href="${absolute('en', page)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${absolute('zh', page)}"/></url>`,
      )
      .join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${pages.map(entry).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
