import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import {
  companies,
  pageUrl,
  sectors,
  siteContent,
  team,
  url,
} from '../lib/site';
// A short guide for AI tools (llmstxt.org): who LinkX Capital is and where
// the official pages are. Every fact and link comes from the site's own
// content, so it never drifts from the pages it points to.
export const GET: APIRoute = async ({ site }) => {
  const link = (lang: 'zh' | 'en', page = 'index') =>
    new URL(pageUrl(lang, page), site).href;
  const articles = (await getCollection('insights'))
    .map(({ data }) => data)
    .sort((a, b) => b.date.localeCompare(a.date));
  const lines = [
    `# ${siteContent.brandZh} / ${siteContent.brand}`,
    '',
    `> ${siteContent.metaDescription.zh}`,
    `> ${siteContent.metaDescription.en}`,
    '',
    `Operator: ${siteContent.companyLegalName.zh}. Contact: ${siteContent.email}.`,
    '',
    '## Official pages / 官方页面',
    '',
    `- [首页](${link('zh')}) · [Home](${link('en')})`,
    `- [投资组合](${link('zh', 'portfolio')}) · [Portfolio](${link('en', 'portfolio')})`,
    `- [团队](${link('zh', 'team')}) · [Team](${link('en', 'team')})`,
    `- [洞察与动态](${link('zh', 'insights')}) · [Insights & News](${link('en', 'insights')})`,
    `- [Fellowship](${link('zh', 'fellowship')}) · [Fellowship](${link('en', 'fellowship')})`,
    `- [法律声明](${link('zh', 'legal')}) · [Legal notice](${link('en', 'legal')})`,
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
        `- [${person.name} / ${person.en}](${link('en', `team-${person.slug}`)}): ${person.role.en}`,
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
