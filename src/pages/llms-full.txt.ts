import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import {
  companies,
  fellowshipContent,
  sectors,
  siteContent,
  team,
} from '../lib/site';
import { llmsHeader, llmsLink, stripMarkdown } from '../lib/llms';
// Everything an AI tool needs to answer factual questions about LinkX
// Capital without rendering the animated pages: each company, person,
// direction and article as published, in Chinese and English.
export const GET: APIRoute = async ({ site }) => {
  const link = llmsLink(site);
  const sectorName = (id: string) => {
    const sector = sectors.find((entry) => entry.id === id);
    return sector ? `${sector.zh} / ${sector.en}` : id;
  };
  const articles = (await getCollection('insights'))
    .map(({ data }) => data)
    .filter(({ lang }) => lang === 'zh')
    .sort((a, b) => b.date.localeCompare(a.date));
  const english = new Map(
    (await getCollection('insights'))
      .map(({ data }) => data)
      .filter(({ lang }) => lang === 'en')
      .map((data) => [data.route, data]),
  );
  const lines = [
    ...llmsHeader(site),
    '## About / 关于',
    '',
    siteContent.metaDescription.zh,
    '',
    siteContent.metaDescription.en,
    '',
    '## Investment focus / 投资方向',
    '',
    ...sectors.flatMap((sector) => [
      `### ${sector.zh} / ${sector.en}`,
      '',
      sector.desc.zh,
      '',
      sector.desc.en,
      '',
    ]),
    `## Portfolio / 投资组合 (${companies.length})`,
    '',
    ...companies.flatMap((company) => [
      `### ${company.name} / ${company.nameEn}`,
      '',
      `- Directions / 方向: ${company.sectorIds.map(sectorName).join('; ')}`,
      ...(company.investmentYear
        ? [`- Investment year / 投资年份: ${company.investmentYear}`]
        : []),
      ...(company.website ? [`- Website / 官网: ${company.website}`] : []),
      `- Page / 页面: ${link('zh', `portfolio/${company.slug}`)} · ${link('en', `portfolio/${company.slug}`)}`,
      '',
      company.detail,
      '',
      company.detailEn,
      '',
    ]),
    '## Team / 团队',
    '',
    ...team.flatMap((person) => [
      `### ${person.name} / ${person.en} — ${person.role.zh} / ${person.role.en}`,
      '',
      `- Page / 页面: ${link('zh', `team-${person.slug}`)} · ${link('en', `team-${person.slug}`)}`,
      '',
      person.bio.zh,
      '',
      person.bio.en,
      '',
    ]),
    '## Fellowship',
    '',
    ...fellowshipContent.description.zh.map(stripMarkdown),
    '',
    ...fellowshipContent.description.en.map(stripMarkdown),
    '',
    `- Page / 页面: ${link('zh', 'fellowship')} · ${link('en', 'fellowship')}`,
    `- Contact / 联系: ${siteContent.email}`,
    '',
    '## Insights / 洞察',
    '',
    ...articles.flatMap((article) => {
      const en = english.get(article.route);
      return [
        `### ${article.title}${en ? ` / ${en.title}` : ''} (${article.date})`,
        '',
        article.summary,
        ...(en ? ['', en.summary] : []),
        '',
        `- Page / 页面: ${link('zh', article.route)}${en ? ` · ${link('en', article.route)}` : ''}`,
        '',
      ];
    }),
  ];
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
