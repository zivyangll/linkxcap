import { z } from 'astro/zod';
import contentSource from '../data/content.json';
import assets from '../data/assets.json';

export type Lang = 'zh' | 'en';
export const languages: Lang[] = ['zh', 'en'];
export const base = import.meta.env.BASE_URL.replace(/\/$/, '') + '/';
export const url = (path = '') => base + path.replace(/^\//, '');
export const pageUrl = (lang: Lang, page = 'index') =>
  url(`${lang}/${page}.html`);
export const portfolioLogo = (slug: string) =>
  url(`assets/portfolio-logos/${slug}.webp`);
export const pick = (lang: Lang, zh: string, en: string) =>
  lang === 'zh' ? zh : en;
export const asset = (node: string, key: string) => {
  const src = (assets as Record<string, Record<string, string>>)[node]?.[key];
  if (!src) throw new Error(`Missing exported Figma asset ${node}/${key}`);
  return url(src);
};
export const preview = import.meta.env.PUBLIC_CONTENT_MODE !== 'production';
export const content = contentSource;
export const siteContent = content.site;
export const navigationContent = content.navigation;
export const navigation = navigationContent.items;
export const ui = content.ui;
export const socials = content.socials.items;
export const pages = content.pages;
export const homeContent = pages.home;
export const portfolioContent = pages.portfolio;
export const teamContent = pages.team;
export const insightsContent = pages.insights;
export const contactContent = pages.contact;
export const legalContent = pages.legal;
export const sectors = content.sectors.items;
export const team = content.team.items;
export const pageTitle = (
  lang: Lang,
  page: keyof typeof siteContent.pageTitles,
) => siteContent.pageTitles[page][lang];

type InsightLocalized = {
  title: string;
  summary: string;
  sourceName: string;
  listTitle?: string;
  listSummary?: string;
};
export const insightArticles = content.insights.articles.flatMap((article) =>
  languages.map((lang) => ({
    id: article.id,
    route: article.route,
    category: article.category,
    date: article.date,
    source: article.source,
    mock: article.mock,
    order: article.order,
    file: article.files[lang],
    lang,
    ...(article[lang] as InsightLocalized),
  })),
);
export type InsightArticle = (typeof insightArticles)[number];
// Astro's glob loader normalizes dots in collection entry IDs. Keep the JSON
// file names human-readable and normalize only when joining metadata to bodies.
export const insightFileId = (file: string) =>
  file.replace(/\.md$/, '').replaceAll('.', '');
const companySchema = z.looseObject({
  name: z.string(),
  nameEn: z.string(),
  slug: z.string(),
  desc: z.string(),
  descEn: z.string(),
  detail: z.string(),
  detailEn: z.string(),
  website: z.string().optional(),
});
const sourceCompanies = z.array(companySchema).parse(content.companies);
const foundation = ['zhipu-ai', 'shengshu-technology', 'modelbest', 'mosi'];
const physical = ['phybot', 'amio-robotics', 'zettlab'];
const applications = ['realai', 'polo-interactive', 'tairex', 'biogeometry'];
// The image keys preserve the Figma logo crops. Identity mapping is reviewed
// against the existing site's official logo inventory.
const logoMap: Record<string, string> = {
  'zhipu-ai': 'imgImage71',
  'shengshu-technology': 'imgImage72',
  modelbest: 'imgImage75',
  mosi: 'imgImage79',
  realai: 'imgImage126',
  'approaching-ai': 'imgImage141',
  'infinigence-ai': 'imgImage127',
  'agic-micro': 'imgImage131',
  infrawaves: 'imgImage73',
  'polo-interactive': 'imgImage143',
  tairex: 'imgImage142',
  biogeometry: 'imgImage74',
  phybot: 'imgImage130',
  'amio-robotics': 'imgImage129',
  rhino: 'imgImage144',
  'qingcheng-jizhi': 'imgImage145',
  'xingyun-ic': 'imgImage146',
  zettlab: 'imgImage147',
  siliconflow: 'imgImage148',
};
export const companyOrder = [
  'zhipu-ai',
  'shengshu-technology',
  'infrawaves',
  'biogeometry',
  'mosi',
  'amio-robotics',
  'realai',
  'agic-micro',
  'infinigence-ai',
  'rhino',
  'siliconflow',
  'polo-interactive',
  'phybot',
  'modelbest',
  'tairex',
  'zettlab',
  'qingcheng-jizhi',
  'approaching-ai',
  'xingyun-ic',
];
export const companies = companyOrder.map((slug) => {
  const c = sourceCompanies.find((c) => c.slug === slug)!;
  const sector = foundation.includes(slug)
    ? 'foundation'
    : physical.includes(slug)
      ? 'physical'
      : applications.includes(slug)
        ? 'applications'
        : 'infrastructure';
  return {
    ...c,
    sector,
    logo: logoMap[slug],
    status: 'source-review' as const,
    website: c.website?.replace(/\?srsltid=.*/, ''),
  };
});
export type Company = (typeof companies)[number];
