import { z } from 'astro/zod';
import contentSource from '../data/content.json';
import assets from '../data/assets.json';
import { validateContentConfig } from './content-schema';

const bundledContentValidation = validateContentConfig(
  contentSource,
  contentSource,
);
if (!bundledContentValidation.valid)
  throw new Error(
    `Invalid src/data/content.json:\n${bundledContentValidation.errors.join('\n')}`,
  );

export type Lang = 'zh' | 'en';
export const languages: Lang[] = ['zh', 'en'];
export const base = import.meta.env.BASE_URL.replace(/\/$/, '') + '/';
export const url = (path = '') => base + path.replace(/^\//, '');
export const contentAsset = (filename: string) =>
  filename ? url(`assets/${encodeURIComponent(filename)}`) : '';
export const pageUrl = (lang: Lang, page = 'index') =>
  url(`${lang}/${page}.html`);
export const pick = (lang: Lang, zh: string, en: string) =>
  lang === 'zh' ? zh : en;
export const asset = (node: string, key: string) => {
  const src = (assets as Record<string, Record<string, string>>)[node]?.[key];
  if (!src) throw new Error(`Missing exported Figma asset ${node}/${key}`);
  return url(src);
};
export const preview = import.meta.env.PUBLIC_CONTENT_MODE !== 'production';

type AnyRecord = Record<string, any>;
type Localized<T = string> = { zh: T; en: T };
type PageName =
  'index' | 'portfolio' | 'team' | 'insights' | 'contact' | 'legal';
type NavigationItem = { page: string; zh: string; en: string };
type NavigationContent = {
  items: NavigationItem[];
  languageLabel: Localized;
  languageNames: Localized;
  languageShort: Localized;
  mainNavLabel: Localized;
  menuNavLabel: Localized;
  menuContactTitle: Localized;
  wechatLabel: Localized;
  menuTitle: string;
  menuContactLink: string;
  menuFooter: string;
};
type HomeContent = {
  opening: {
    chapter: string;
    title: Localized<string[]>;
    body: Localized<string[]>;
  };
  hero: {
    title: string[];
    zhTitle: string[];
    orbitEyebrow: string;
    orbitLabel: Localized;
  };
  about: {
    eyebrow: string;
    label: Localized;
    title: Localized<string[]>;
    description: Localized<string[]>;
  };
  research: {
    title: string[];
    stats: Array<{ value: string; label: string }>;
    dataNote: Localized;
  };
  focus: {
    title: string[];
    zhTitle: string;
    contactLink: Localized;
    aboutLink: Localized;
    ariaLabel: Localized;
    investmentYear: string;
  };
};
type PortfolioContent = {
  title: Localized & { figmaZhEnglish: string };
  scrollHint: Localized;
  navigatorLabel: Localized;
};
type TeamContent = {
  title: Localized;
  intro: Localized;
  eyebrow: string;
  featured: Localized;
  contactLink: Localized;
};
type InsightsContent = {
  title: Localized;
  intro: Localized;
  filterLabel: Localized;
  copyright: string;
  back: Localized;
  eyebrow: string;
  publisher: string;
};
type ContactContent = {
  signalTitle: string;
  signalSubtitle: Localized;
  joinCopy: Localized;
  joinDisplay: Localized<string[]>;
  definition: Localized;
  videoPlaceholder: Localized;
  playVideo: Localized;
  joinTitle: Localized;
  joinEyebrow: string;
  contactLink: string;
  detailsEyebrow: string;
  detailsTitle: Localized;
  copyEmail: Localized;
  findUs: Localized;
  wechat: Array<{ title: Localized; pending: Localized }>;
};
type LegalContent = {
  eyebrow: string;
  title: Localized;
  sections: Array<{ heading: Localized; body: Localized }>;
  existingSiteLink: Localized;
  existingSiteUrl: string;
  fontsHeading: Localized;
  fontsBody: Localized;
  fontLicenses: Array<{ label: string; path: string }>;
  restoreHeading: Localized;
  restoreBody: Localized;
  fontDownload: Localized;
  fontDownloadUrl: string;
  fontDownloadName: string;
  fontNotice: Localized;
  fontNoticePath: string;
};
const raw = contentSource as AnyRecord;
const camel = (value: string) =>
  value.replace(/_([a-z0-9])/g, (_match, character: string) =>
    character.toUpperCase(),
  );
const pair = (source: AnyRecord, key: string) => ({
  zh: source[`${key}_cn`],
  en: source[`${key}_en`],
});
const runtimeShape = (value: any): any => {
  if (Array.isArray(value)) return value.map(runtimeShape);
  if (!value || typeof value !== 'object') return value;
  const result: AnyRecord = {};
  for (const [key, child] of Object.entries(value)) {
    const suffix = key.match(/^(.*)_(cn|en)$/);
    if (suffix) {
      const outputKey = camel(suffix[1]);
      result[outputKey] ||= {};
      result[outputKey][suffix[2] === 'cn' ? 'zh' : 'en'] = runtimeShape(child);
    } else {
      result[camel(key)] = runtimeShape(child);
    }
  }
  return result;
};

export const contentConfig = contentSource;
export const siteContent = {
  brand: raw.site.brand_en,
  brandZh: raw.site.brand_cn,
  email: raw.site.email,
  companyLegalName: pair(raw.site, 'company_legal_name'),
  copyright: pair(raw.site, 'copyright'),
  recordNumber: raw.site.record_number,
  metaDescription: pair(raw.site, 'meta_description'),
  ogImageUrl: contentAsset(raw.site.og_image_file),
  pageTitles: Object.fromEntries(
    ['index', 'portfolio', 'team', 'insights', 'contact', 'legal'].map(
      (page) => [page, pair(raw.site.page_titles, page)],
    ),
  ) as Record<PageName, Localized>,
  redirectPage: {
    title: raw.site.redirect_page.title,
    zhLink: raw.site.redirect_page.link_cn,
    enLink: raw.site.redirect_page.link_en,
  },
  notFound: {
    title: pair(raw.site.not_found, 'title'),
    eyebrow: raw.site.not_found.eyebrow,
    body: pair(raw.site.not_found, 'body'),
    back: pair(raw.site.not_found, 'back'),
    english: raw.site.not_found.english_label,
  },
};

const navigationRuntime = runtimeShape(raw.navigation);
export const navigationContent: NavigationContent = {
  ...navigationRuntime,
  items: (raw.navigation.items as AnyRecord[]).map((item) => ({
    page: item.page,
    zh: item.label_cn,
    en: item.label_en,
  })),
};
export const navigation: NavigationItem[] = navigationContent.items;

const uiRuntime = runtimeShape(raw.ui);
const uiKeys = Object.keys(raw.ui)
  .filter((key) => key.endsWith('_cn'))
  .map((key) => key.slice(0, -3));
export const ui = {
  zh: Object.fromEntries(
    uiKeys.map((key) => [camel(key), raw.ui[`${key}_cn`]]),
  ),
  en: Object.fromEntries(
    uiKeys.map((key) => [camel(key), raw.ui[`${key}_en`]]),
  ),
  clientMessages: uiRuntime.clientMessages,
};

const pagesRuntime = runtimeShape(raw.pages);
export const homeContent = {
  ...pagesRuntime.home,
  hero: {
    ...pagesRuntime.home.hero,
    title: raw.pages.home.hero.title_en,
    zhTitle: raw.pages.home.hero.title_cn,
  },
  focus: {
    ...pagesRuntime.home.focus,
    title: raw.pages.home.focus.title_en,
    zhTitle: raw.pages.home.focus.title_cn,
  },
} as HomeContent;
export const portfolioContent = {
  ...pagesRuntime.portfolio,
  title: {
    zh: raw.pages.portfolio.title_cn,
    en: raw.pages.portfolio.title_en,
    figmaZhEnglish: raw.pages.portfolio.title_artwork_cn,
  },
} as PortfolioContent;
export const teamContent = pagesRuntime.team as TeamContent;
export const insightsContent = pagesRuntime.insights as InsightsContent;
export const contactContent = pagesRuntime.contact as ContactContent;
export const legalContent = pagesRuntime.legal as LegalContent;

export const socials = (raw.socials as AnyRecord[]).map((item) => ({
  name: item.name_cn,
  en: item.name_en,
  href: item.url,
}));
export const sectors = (raw.sectors as AnyRecord[]).map((item) => ({
  id: item.id,
  zh: item.name_cn,
  en: item.name_en,
  desc: { zh: item.description_cn, en: item.description_en },
}));
export const team = (raw.team as AnyRecord[]).map((person) => ({
  id: person.id,
  slug: person.slug,
  name: person.name_cn,
  en: person.name_en,
  role: { zh: person.role_cn, en: person.role_en },
  imageUrl: contentAsset(person.image_file),
  bio: { zh: person.bio_cn, en: person.bio_en },
}));

export const insightFilters = (raw.insights.filters as AnyRecord[]).map(
  (item) => ({
    id: item.id,
    zh: item.label_cn,
    en: item.label_en,
  }),
);
export const content = {
  insights: { filters: insightFilters },
};
export type InsightArticle = {
  id: string;
  route: string;
  category: string;
  date: string;
  source: string;
  sourceName: string;
  order: number;
  lang: Lang;
  title: string;
  summary: string;
  listTitle: string;
  listSummary: string;
};
export const insightArticleFromData = (article: AnyRecord): InsightArticle => ({
  id: article.id,
  route: article.route,
  category: article.category,
  date: article.date,
  source: article.source_url,
  sourceName: article.source_name,
  order: article.order,
  lang: article.lang,
  title: article.title,
  summary: article.summary,
  listTitle: article.list_title,
  listSummary: article.list_summary,
});

const companySchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  nameEn: z.string(),
  slug: z.string(),
  desc: z.string(),
  descEn: z.string(),
  detail: z.string(),
  detailEn: z.string(),
  website: z.string().optional(),
  sector: z.string(),
  logoUrl: z.string(),
});
const sourceCompanies = z.array(companySchema).parse(
  (raw.companies as AnyRecord[]).map((company) => ({
    id: company.id,
    name: company.name_cn,
    nameEn: company.name_en,
    slug: company.slug,
    desc: company.description_cn,
    descEn: company.description_en,
    detail: company.detail_cn,
    detailEn: company.detail_en,
    website: company.website_url || undefined,
    sector: company.sector_id,
    logoUrl: contentAsset(company.logo_file),
  })),
);
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
export const companies = sourceCompanies.map((company) => ({
  ...company,
  logo: logoMap[company.id] || '',
}));
export type Company = (typeof companies)[number];

export const pageTitle = (
  lang: Lang,
  page: keyof typeof siteContent.pageTitles,
) => siteContent.pageTitles[page][lang];

export const fellowMedia = {
  videoUrl: raw.media.fellow.video_url as string,
  posterUrl: contentAsset(raw.media.fellow.poster_file as string),
};
