import { z } from 'astro/zod';
import source from '../data/companies-source.json';
import assets from '../data/assets.json';

export type Lang = 'zh' | 'en';
export const languages: Lang[] = ['zh', 'en'];
export const base = import.meta.env.BASE_URL.replace(/\/$/, '') + '/';
export const url = (path = '') => base + path.replace(/^\//, '');
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
export const navigation = [
  { page: 'index', en: 'Philosophy', zh: '关于星连' },
  { page: 'portfolio', en: 'Portfolio', zh: '投资组合' },
  { page: 'team', en: 'Team', zh: '团队' },
  { page: 'insights', en: 'Insight', zh: '洞察' },
  { page: 'contact', en: 'Contact', zh: '联系我们' },
];
export const ui = {
  zh: {
    menu: '菜单',
    close: '关闭',
    skip: '跳转到正文',
    more: '阅读全文',
    all: '查看全部',
    profile: '查看完整简介',
    expand: '查看简介',
    back: '返回',
    website: '访问官网',
    original: '阅读原文',
    copy: '复制链接',
    copied: '链接已复制',
    copyFailed: '复制失败，请复制浏览器地址',
    legal: '法律声明',
    mock: '设计预览 · 内容待确认',
    noResults: '暂无相关内容',
    reset: '查看全部内容',
    chapters: '文章目录',
    email: '联系邮箱',
    source: '原文来源',
    previous: '上一家',
    next: '下一家',
    pause: '暂停动态背景',
    resume: '开启动态背景',
  },
  en: {
    menu: 'Menu',
    close: 'Close',
    skip: 'Skip to content',
    more: 'Read more',
    all: 'View all',
    profile: 'Full profile',
    expand: 'View profile',
    back: 'Back',
    website: 'Visit website',
    original: 'Read original',
    copy: 'Copy link',
    copied: 'Link copied',
    copyFailed: 'Please copy the address from your browser',
    legal: 'Legal notice',
    mock: 'Design preview · Content pending approval',
    noResults: 'No stories in this category yet',
    reset: 'View all stories',
    chapters: 'Contents',
    email: 'Email',
    source: 'Original source',
    previous: 'Previous company',
    next: 'Next company',
    pause: 'Pause ambient motion',
    resume: 'Enable ambient motion',
  },
};
export const intro = {
  zh: '星连资本（LinkX Capital）创建于 2021 年，是中国最早聚焦通用智能产业生态、目前最活跃的 AI 风险投资基金之一。我们围绕通用智能时代的关键技术栈与应用场景，投资基座模型、AI 基础设施、多智能体、具身智能、AI 原生应用及智能硬件等方向。我们与清华大学共建华清普智AI孵化器（T-ONE Innovation Lab），打造活跃的全球青年科学家与企业家社区，推动科研、产业、政策与资本的多要素循环，加速源头创新走向真实商业场景。',
  en: 'Founded in 2021, LinkX Capital is one of China’s earliest and most active AI-focused venture capital funds dedicated to the ecosystem of General-Purpose Intelligence. Centered on the key technology stacks and application scenarios of the AGI era, we invest in foundation models, AI infrastructure, multi-agent systems, embodied AI, AI-native applications, and intelligent hardware. Together with Tsinghua University, we co-build T-ONE Innovation Lab, connecting a global community of young scientists and entrepreneurs.',
};
export const join = {
  zh: '如果你正在寻找、定义，或亲手建造一个尚未被市场命名的未来，我们希望更早与你相遇。',
  en: 'If you are seeking, defining, or personally building a future that the market has not yet named, we hope to meet you sooner.',
};
export const sectors = [
  {
    id: 'foundation',
    zh: '智能基础层',
    en: 'Intelligence Foundations',
    desc: {
      zh: '模型、数据与训练范式，决定智能能力演进的速度与上限。我们关注持续推动模型能力跃迁的底层创新。',
      en: 'Models, data and training paradigms shape the pace and possibilities of intelligence. We look for foundational innovations that enable the next leap in capability.',
    },
    mock: false,
  },
  {
    id: 'infrastructure',
    zh: 'AI基础设施',
    en: 'AI Infrastructure',
    desc: {
      zh: '从算力、芯片到推理系统，构建通用智能时代的基础设施，让智能以更高效率走向真实世界。',
      en: 'From compute and chips to inference systems, infrastructure enables intelligence to reach the real world with greater efficiency.',
    },
    mock: true,
  },
  {
    id: 'applications',
    zh: '智能体与AI原生应用',
    en: 'Agents & AI-Native applications',
    desc: {
      zh: '我们关注由智能体重新定义的工作方式与用户体验，寻找技术能力与真实需求相遇的创新。',
      en: 'We explore new ways of working and experiences shaped by agents, where emerging capabilities meet real human needs.',
    },
    mock: true,
  },
  {
    id: 'physical',
    zh: '物理智能',
    en: 'Physical Intelligence',
    desc: {
      zh: '让智能走出屏幕，在感知、行动与反馈中理解世界，探索机器人与智能硬件带来的新可能。',
      en: 'Intelligence moves beyond the screen through perception, action and feedback, opening possibilities in robotics and intelligent hardware.',
    },
    mock: true,
  },
  {
    id: 'frontiers',
    zh: '长期前沿',
    en: 'Long-term Frontiers',
    desc: {
      zh: '在共识形成之前，关注值得长期探索的问题，与看见未来的研究者和创业者共同前行。',
      en: 'Before consensus forms, we explore questions worth pursuing over the long term, alongside researchers and founders who see what comes next.',
    },
    mock: true,
  },
];
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
const sourceCompanies = z.array(companySchema).parse(source);
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
export const team = [
  {
    id: 'alex',
    name: '张鸣晨',
    en: 'Alex Zhang',
    role: { zh: '主管合伙人', en: 'Managing Partner' },
    image: 'imgImage212',
  },
  {
    id: 'elliot',
    name: '王璞',
    en: 'Elliot Wang',
    role: { zh: '合伙人', en: 'Partner' },
    image: 'imgImage213',
  },
  {
    id: 'wenjue',
    name: '李文珏',
    en: 'Wenjue Li',
    role: { zh: '合伙人', en: 'Partner' },
    image: 'imgImage211',
  },
  {
    id: 'leo',
    name: '王晨',
    en: 'Leo Wang',
    role: { zh: '合伙人', en: 'Partner' },
    image: 'imgImage215',
  },
].map((person) => ({
  ...person,
  mock: true,
  bio: {
    zh: '关注通用智能时代的技术演进与创业机会，与具有长期视野的创新者共同探索新的可能。个人履历与代表投资项目正在整理中，正式资料将在确认后更新。',
    en: 'Exploring the evolution of general-purpose intelligence alongside founders with a long-term perspective. This profile is a layout preview; the approved biography and investment history will be added after review.',
  },
}));
export const socials = [
  { name: 'X', href: 'https://x.com/LinkXCapital' },
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/company/link-x-%E6%98%9F%E8%BF%9E%E8%B5%84%E6%9C%AC/',
  },
  {
    name: '小红书',
    en: 'Xiaohongshu',
    href: 'https://xhslink.com/m/UjLFumWxau',
  },
  {
    name: '抖音',
    en: 'Douyin',
    href: 'https://www.douyin.com/user/MS4wLjABAAAAHYtbwIVUi113kSYUweZGc-tFiJGG1WPk8Jgldgk9Fhw',
  },
];

// Line breaks and short introduction are authored in Figma final (2002:3484 / 4801).
export const introLinesZh = [
  '星连资本（LinkX Capital）创建于 2021 年，是中国最早聚焦通用智能产业生态、',
  '目前最活跃的 AI 风险投资基金之一。',
  '我们围绕通用智能时代的关键技术栈与应用场景，投资基座模型、AI 基础设施、',
  '多智能体、具身智能、AI 原生应用及智能硬件等方向。',
  '我们与清华大学共建华清普智AI孵化器（T-ONE Innovation Lab），',
  '打造活跃的全球青年科学家与企业家社区，推动科研、产业、政策与资本的多要素循环，',
  '加速源头创新走向真实商业场景。',
];
export const teamIntro =
  'Founded in 2021, LinkX Capital is one of China’s earliest and most active AI-focused venture capital funds dedicated to the ecosystem of General-Purpose Intelligence.Centered on the key technology stacks and application scenarios of the General-Purpose Intelligence era, we invest in areas such as foundation models, AI infrastructure, multi-agent systems, embodied AI, AI-native applications, and intelligent hardware.';
