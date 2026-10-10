import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { companies, navigation, sectors, team, ui, url } from '../lib/site';
import { llmsHeader, llmsLink } from '../lib/llms';
// A short guide for AI tools (llmstxt.org): who LinkX Capital is and where
// the official pages are. The full text of every company, person and
// article is in /llms-full.txt.
export const GET: APIRoute = async ({ site }) => {
  const link = llmsLink(site);
  const articles = (await getCollection('insights'))
    .map(({ data }) => data)
    .sort((a, b) => b.date.localeCompare(a.date));
  const lines = [
    ...llmsHeader(site),
    '## Official pages / 官方页面',
    '',
    // Page names are the site's own navigation labels.
    ...[
      ...navigation
        .filter((item) => item.page !== 'contact')
        .map((item) => ({ page: item.page, zh: item.zh, en: item.en })),
      { page: 'legal', zh: ui.zh.legal, en: ui.en.legal },
    ].map(
      (item) =>
        `- [${item.zh}](${link('zh', item.page)}) · [${item.en}](${link('en', item.page)})`,
    ),
    '',
    '## Investment focus / 投资方向',
    '',
    ...sectors.map(
      (sector) =>
        `- ${sector.zh} / ${sector.en}: ${sector.desc.en || sector.desc.zh}`,
    ),
    '',
    '## Portfolio / 投资组合',
    '',
    ...sectors.flatMap((sector) => {
      const listed = companies.filter((company) =>
        company.sectorIds.includes(sector.id),
      );
      return listed.length
        ? [
            `### ${sector.zh} / ${sector.en}`,
            '',
            ...listed.map(
              (company) =>
                `- [${company.name} / ${company.nameEn}](${link('en', `portfolio/${company.slug}`)})`,
            ),
            '',
          ]
        : [];
    }),
    '## Team / 团队',
    '',
    ...team.map(
      (person) =>
        `- [${person.name} / ${person.en}](${link('en', `team-${person.slug}`)}): ${person.role.zh} / ${person.role.en}`,
    ),
    '',
    '## Insights / 洞察',
    '',
    ...articles.map(
      (article) =>
        `- [${article.title}](${link(article.lang, article.route)}) (${article.date})`,
    ),
    '',
    '## Index',
    '',
    `- [Sitemap](${new URL(url('sitemap.xml'), site).href})`,
    '',
  ];
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
