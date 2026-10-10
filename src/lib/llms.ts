import {
  companies,
  fellowshipContent,
  pageUrl,
  sectors,
  siteContent,
  socials,
  team,
  url,
  type Lang,
} from './site';
// Shared pieces of /llms.txt and /llms-full.txt (llmstxt.org). Every fact
// comes from the site's own content so both files match the pages.
export const llmsLink =
  (site: URL | undefined) =>
  (lang: Lang, page = 'index') =>
    new URL(pageUrl(lang, page), site).href;
export const llmsHeader = (site: URL | undefined) => [
  `# ${siteContent.brandZh} / ${siteContent.brand}`,
  '',
  `> ${siteContent.metaDescription.zh}`,
  `> ${siteContent.metaDescription.en}`,
  '',
  '## Key facts / 关键事实',
  '',
  `- Brand / 品牌: ${siteContent.brandZh} / ${siteContent.brand}`,
  `- Operator / 运营主体: ${siteContent.companyLegalName.zh}`,
  `- Website / 官网: ${llmsLink(site)('zh')} · ${llmsLink(site)('en')}`,
  `- Investment focus / 投资方向 (${sectors.length}): ${sectors.map((sector) => `${sector.zh} / ${sector.en}`).join('; ')}`,
  `- Portfolio / 投资组合: ${companies.length} companies listed on the website`,
  `- Team / 团队: ${team.map((person) => `${person.name} ${person.en} (${person.role.en})`).join('; ')}`,
  `- Programme / 计划: ${programmeName('zh')} / ${programmeName('en')}`,
  `- Contact / 联系: ${siteContent.email}`,
  `- Official accounts / 官方账号: ${socials.map((social) => `${social.en} ${social.href}`).join('; ')}`,
  `- Full text / 全文: ${new URL(url('llms-full.txt'), site).href}`,
  '',
];
export const stripMarkdown = (text: string) =>
  text.replace(/\*\*(.+?)\*\*/g, '$1').trim();
// The programme's full name is the bold lead of its description.
const programmeName = (lang: Lang) =>
  fellowshipContent.description[lang][0]?.match(/\*\*(.+?)\*\*/)?.[1] ||
  fellowshipContent.title[lang];
