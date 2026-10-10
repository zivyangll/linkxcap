# 星连资本官网 SEO 实施方案与阿里云上线清单

更新日期：2026-10-10。状态：**上线必需的代码部分已实施；阿里云发布、站长平台和线上 HTTP 验证按 [OSS 部署文档](16-阿里云OSS部署与上线.md) 执行**。

## 0. 实施状态（2026-10-10）

| 项目 | 状态 | 位置 |
| --- | --- | --- |
| 正式构建参数 | 已实施：`npm run build:production`（正式域名、根路径、production 模式） | `package.json` |
| 预览/正式隔离 | 已实施：预览带 `noindex`，正式不带；正式构建删除内容编辑页及其脚本、数据 | `scripts/strip-internal.mjs` |
| 结构化数据 | 已实施：每页 Organization + WebSite + 页面节点；文章 Article（含栏目）、团队成员 ProfilePage + Person、公司详情 Organization（不标投资关系）；投资组合/团队/洞察为 CollectionPage + ItemList；除首页外均有 BreadcrumbList；首页主体为机构本身；146 页全部可解析、内部引用无断链 | `SiteLayout.astro`、`[lang]/[...page].astro` |
| 页面描述 | 已实施：公司用详情、文章用摘要、团队成员用本人简介首段（原为团队页通用描述）、其余用文案交付版逐页描述 | `[lang]/[...page].astro` |
| 分享标签 | 已实施：`og:site_name`、`og:locale:alternate`、分享图尺寸与替代文字、Twitter 标题/描述/图片；文章 `og:type=article`，其余 `website` | `SiteLayout.astro` |
| 公司切换 | 已实施：在公司详情页切换公司时，同步 title、description、canonical、hreflang、OG、Twitter、JSON-LD 和面包屑，始终使用标准域名 | `src/scripts/company-browser.ts` |
| 智谱官网 | CSV 与网站统一为 `https://www.zhipuai.cn/zh`；`npm run portfolio:check` 通过 | `docs/被投企业汇总_V6.csv` |
| sitemap | 已实施：中英文互链 + `x-default`；文章使用发布日期作为 `lastmod`，其余页面不写构建时间 | `src/pages/sitemap.xml.ts` |
| robots | 已实施：全部允许，并单独列出 AI 搜索/用户读取机器人；指向正式 sitemap | `src/pages/robots.txt.ts`，详见 GEO |
| llms.txt | 已实施：由站内数据生成 | `src/pages/llms.txt.ts`，详见 GEO |
| 旧站地址 | 已实施：3 个旧地址生成跳转页（见 3.3） | `src/pages/[lang]/[legacy].astro` |
| 404 页 | 已实施：`noindex`，不输出 canonical/hreflang；OSS「默认 404 页」设为 `404.html` 返回真实 404 | `src/pages/404.astro` |
| 构建校验 | 已实施：robots/sitemap/llms 存在；正式构建无 noindex、无预览域名、无编辑器 | `scripts/verify-build.mjs` |
| 托管 | 确定：与旧官网一致的 OSS 静态网站托管 | [部署文档](16-阿里云OSS部署与上线.md) |
| 待办 | 上传 OSS、CDN 刷新、站长平台验证与提交 sitemap、`linkxcap.com` → www 跳转（需 CDN）、统计 | 部署文档第 6–9 步 |

本文负责搜索引擎优化、双语页面、正式域名和部署；AI 平台的自然发现与引用见 [GEO 方案](geo.md)。后续实现以本文任务清单为依据，不把“计划”作为“已完成”。

## 1. 已确认条件和目标

| 项目 | 确认结果 |
| --- | --- |
| 正式域名 | `https://www.linkxcap.com/` |
| 托管平台 | 阿里云 OSS 静态网站托管，与旧官网一致（旧站响应头 `Server: AliyunOSS`） |
| 内容状态 | 用户已确认全部内容审核完成；沿用现有中英文内容，不再重复要求审核 |
| 网站形态 | Astro 静态生成，中英文独立 HTML；动画、视频和 Three.js 是体验增强 |
| 现有预览环境 | GitHub Pages 的 `/linkxcap` 子路径，继续与生产环境分开 |
| 本轮范围 | 2026-10-10 已实施代码部分；DNS 不变（沿用旧站域名绑定），发布由管理员按部署文档执行 |
| 成功目标 | 公开页面可抓取、可索引，中文与英文地址一致可核验；上线后能够追踪搜索表现 |

SEO 提供被搜索和被理解的基础。索引时间、排名、富媒体结果和 AI 引用由平台决定，不能写成网站改造后的保证。

## 2. 当前代码核对

以下是 2026-10-06 读取代码的结果（实施结果见第 0 节），不代表正式服务器已经使用相同配置。

| 位置 | 已有能力 | 后续处理 |
| --- | --- | --- |
| `astro.config.mjs` | 静态构建，支持 `SITE_URL`、`SITE_BASE` | 生产明确设置正式域名与根路径，避免沿用 GitHub 默认值 |
| `src/layouts/SiteLayout.astro` | title、description、canonical、hreflang、OG、Twitter Card、语言声明 | 增加逐页元数据和 JSON-LD；区分文章、404、重定向页 |
| `src/lib/site.ts` | 集中内容和 URL 生成；当前年份动态获取；预览模式判断 | SEO、sitemap、GEO 导航共用公开页面清单 |
| `src/pages/sitemap.xml.ts` | 双语 URL 和中文/英文 alternate | 增加过滤、真实更新时间、XML 转义与一致性检查 |
| `src/pages/robots.txt.ts` | 通用允许抓取和 sitemap 地址 | 按正式站与预览环境分别生成；AI 规则详见 GEO |
| `src/pages/index.astro` | 根入口 meta refresh 到中文首页，固定 noindex | 生产优先在服务器设置 HTTP 重定向 |
| `src/pages/404.astro` | 静态错误页面 | 去除错误的首页 canonical/alternate，生产确保 HTTP 404 |
| `src/components/FocusConstellation.astro` | 公司链接和部分文字已存在于 HTML | 保证所有方向、公司与简介在静态正文中可到达 |
| 公司详情与客户端切换 | 独立静态 URL，切换更新部分元数据 | 同步 description、OG、结构化数据，直接访问与切换结果一致 |
| 洞察 Markdown | 双语文章、日期、摘要和来源字段 | 增加可选作者、修改时间、封面与 SEO 覆盖字段 |
| 配置编辑器及 JSON 路由 | 编辑器 noindex；草稿导出后重新构建 | 生产产物排除编辑器和编辑专用 JSON，内部环境保留 |
| `.github/workflows/pages.yml` | main 推送后发布 GitHub 预览 | 阿里云发布使用独立环境与流程，不覆盖预览规则 |
| `scripts/verify-build.mjs` | 基础页面、链接和资源验证 | 补充本文的 SEO 针对性检查 |

当前数据（2026-10-10）为 55 家公司（以 V6 CSV 为准；紫荆芯界已确认删除）、6 名团队成员、6 篇双语洞察文章；共生成 **146 个中英文内容页面**：`2 × (6 + 55 + 6) + 12`（6 = 首页、投资组合、团队、洞察、Fellowship、法律声明；联系方式已并入 Fellowship）。根入口、404、旧地址跳转页、编辑器不计入。后续 sitemap 应以实际可索引清单生成，不把 190 写死；如果某个现有路由调整为重定向，也要从清单移除。

本方案不改变已审核的投资年份、公司方向、团队介绍和业务事实。缺少可选字段时省略对应标记，不用当前年份或推测值补齐投资年份。

## 3. 域名、地址与旧站迁移

### 3.1 统一 URL 规则

| 地址类型 | 生产规则 |
| --- | --- |
| 权威主机 | `https://www.linkxcap.com` |
| HTTP 与非 www | 尽量一跳 301/308 到 HTTPS + www，保留路径和查询参数 |
| `/` | 301/308 到 `/zh/index.html`；所有主要内部首页链接直接使用目标地址 |
| 中文 | `/zh/index.html`、`/zh/portfolio.html` 等现有 `.html` 路径 |
| 英文 | `/en/index.html`、`/en/portfolio.html` 等现有 `.html` 路径 |
| 详情页 | 沿用现有 slug，不为 SEO 批量修改地址 |
| `?debug=true` 等查询 | 普通内容 canonical 指向不含跟踪参数的标准页面；编辑器不在生产发布 |
| 未知地址 | 返回真正的 404，不把所有路径回退到首页 |

首页默认中文，`x-default` 指向同一中文页面。中英文使用各自的 self-canonical，不把英文 canonical 到中文。语言切换直接链接对应页面，不强制按 IP 或浏览器语言跳转。

双语对应关系必须是真正的内容对应，每组互相声明、自我声明；缺少译文时省略该语言 alternate，不指向一个不存在或不相关的页面。[Google 多语言网站说明](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)

### 3.2 正式构建参数

```sh
SITE_URL=https://www.linkxcap.com SITE_BASE=/ PUBLIC_CONTENT_MODE=production npm run build
```

已封装为 `npm run build:production`。正式构建会自动删除内容编辑页（`a4f9c2e71b6d4830c5a8e2f94d7b136c.*`）及其 `_astro` 脚本和样式，并在校验中确认没有发布。

GitHub 预览保持：

```sh
SITE_URL=https://zivyangll.github.io SITE_BASE=/linkxcap PUBLIC_CONTENT_MODE=preview npm run build
```

生产 HTML、sitemap、JSON-LD、分享图 URL、内部链接不得残留 `127.0.0.1`、GitHub 域名或 `/linkxcap/` 前缀。预览公开 HTML 保持 noindex，允许机器人读取该标记；需要隐藏的预览使用访问控制。

### 3.3 上线前盘点旧站

2026-10-10 核对旧站 sitemap（共 34 个地址，主机写作 `https://linkxcap.com`）。与新站对照结果：

| 旧 URL（中英文各一） | 新 URL | 处理 |
| --- | --- | --- |
| `/zh/`、`/en/` | 同地址（OSS 子目录首页 → `index.html`） | 保留 |
| `team`、`insights`、`portfolio`、`legal`、5 篇文章、`team-alex/leo/wenjue` | 同地址 | 直接替换 |
| `/zh/contact.html` | `/zh/fellowship.html` | 跳转页（联系方式已并入 Fellowship） |
| `/zh/portfolio-1.html` | `/zh/portfolio.html` | 跳转页 |
| `/zh/team-elliot.html` | `/zh/team-elliott.html` | 跳转页（新站修正了拼写） |

OSS 不能按路径返回 301，跳转页使用 0 秒 meta refresh 加 canonical 指向新页，搜索引擎按跳转处理。跳转页不进入 sitemap，也不计入内容页。标准主机改为 `https://www.linkxcap.com`；`linkxcap.com` → www 的 301 需要在 CDN 上配置（纯 OSS 无法按域名跳转）。

正式域名不能当作从未使用过的新域名处理。发布前导出现有站点 URL、搜索平台已索引页面、常见访问路径和旧 sitemap，建立迁移表：

| 旧 URL | 新 URL | 处理 | 依据 |
| --- | --- | --- | --- |
| 保留且内容对应的地址 | 原地址 | 200，直接替换产物 | 保持外部链接 |
| 地址变更且有对应内容 | 最相关新页 | 一跳 301/308 | 保留页面语义 |
| 已删除且没有对应内容 | 无 | 404/410 | 不一律跳首页 |
| 旧首页 `/` | `/zh/index.html` | 按本文入口规则跳转 | 统一标准入口 |

同一个 `www.linkxcap.com` 换服务器或换页面结构，不需要在 Google 提交跨域“地址变更”。只有确实从另一个域名迁移时才评估该工具。需要迁移的旧地址重定向建议至少保留一年；已有 URL 是否需要迁移以实际盘点为准。[Google URL 迁移说明](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)

## 4. 页面级 SEO 与结构化数据

### 4.1 页面内容与元数据

| 页面 | title/description 来源 | 正文与内部链接 | 结构化数据计划 |
| --- | --- | --- | --- |
| 首页 | 品牌名、已审核定位与简介 | 静态简介、方向、投资组合、团队、洞察、联系入口 | WebSite、Organization、WebPage |
| 投资组合列表 | 投资组合标题及简介 | 公司名称、方向、真实详情链接；Logo 使用有意义 alt | CollectionPage、ItemList |
| 公司详情 | 公司名、方向、已审核描述 | 一个明确 H1、简介、投资年份、返回列表与官网链接 | WebPage、BreadcrumbList；信息充足时标记公司 Organization |
| 团队列表/详情 | 已审核姓名、职务与简介 | 静态个人介绍、实际投资链接 | Person；满足语义时 ProfilePage |
| 洞察列表 | 分类与已审核介绍 | 正常分页/分类链接，文章不只依赖 JS 展示 | CollectionPage、ItemList |
| 洞察文章 | 文章标题、摘要和真实封面 | 正文、发布时间、作者/来源、相关推荐 | Article、BreadcrumbList |
| 联系我们 | 联系主题及真实联系方式 | 邮箱、地址、公众号说明与图片文字替代 | ContactPage、Organization 引用 |
| 法律等公共页 | 实际页面主题 | 清楚正文 | WebPage；是否索引按用途确定 |
| 重定向、404、内部配置 | 不作为内容落地页 | 正确状态或访问控制 | 不套用正常内容页 JSON-LD |

title 和 description 每页按主题生成，允许内容编辑覆盖。标题长度按实际搜索展示核对，不以固定字数裁掉公司名；description 不堆砌关键词。使用一个清楚的主 H1 和有层次的 H2/H3。

分享标签逐页一致：canonical = `og:url`；文章用 `og:type=article` 和真实日期；图片给出绝对 URL、alt、实际宽高。可准备约 1200×630 的分享图，保留 Logo、标题与合理边距；这是制作尺寸建议，不是排名因素。

站内真实视频如有可见标题、简介、封面、发布日期和时长，可进一步生成 VideoObject，并提供可公开访问的媒体URL；资料不完整时不编造字段，也不把只有背景视频的页面承诺为视频搜索结果。字幕/文字介绍使用实际视频内容，不能用无关关键词代替。[Google VideoObject说明](https://developers.google.com/search/docs/appearance/structured-data/video)

### 4.2 JSON-LD 关系与事实约束

统一组织实体 ID：`https://www.linkxcap.com/#organization`；网站 ID：`https://www.linkxcap.com/#website`。每页用自身标准 URL 建立 WebPage ID，并引用同一组织。

只填写已审核且在页面可核验的名称、别名、Logo、联系方式和官方账号。投资关系不能标成 `parentOrganization` 或“子公司”；无法确认的成立日期、法定英文名、地址等不补猜测。文章作者按真实署名，转载不冒充原创。schema 有效不等于必然获得特殊展示。[Organization 说明](https://developers.google.com/search/docs/appearance/structured-data/organization)、[Article 说明](https://developers.google.com/search/docs/appearance/structured-data/article)

BreadcrumbList 与页面可见的导航路径相同。不要给全部页面套 Article，也不要为投资机构使用商品评分、虚构评论或不相干 LocalBusiness 类型。FAQ 可作为可见内容组织方式，本站不把 FAQ 富结果当作承诺。

### 4.3 配置与代码改动位置

以下是待实现字段和入口，不表示配置平台已有这些控件。

| 位置 | 计划字段/职责 |
| --- | --- |
| 构建环境 | 正式域名、部署 base、生产/预览模式；不让普通内容编辑随意修改 |
| `src/data/content.json` 全站 | 品牌别名、组织公开信息、分享图默认值；仅使用已有审核数据 |
| 公司/团队记录 | 可选 `seoTitle`、`seoDescription`、分享图片；复用现有 slug、投资年份和方向字段 |
| 洞察 frontmatter/schema | 可选 `author`、`dateModified`、`cover`、`coverAlt`、SEO 覆盖和原创/转载信息 |
| 公共 URL 清单工具（新增） | URL、语言对应、页面类型、是否索引、真实修改时间 |
| `SiteLayout.astro` | 合并逐页 SEO 属性；安全序列化 JSON-LD，避免正文中的 HTML 终止脚本 |
| 页面组件和客户端切换 | 所有直接访问有静态元数据；客户端切换完整同步元数据 |
| 构建验证脚本 | 按公共 URL 清单验证 canonical、alternate、schema、sitemap |
| 内容编辑器 | 仅增加可编辑内容字段，部署权限/搜索平台密钥不进入 JSON |

不要重新添加“版权年份”配置：版权仍动态取当前年份，投资年份仍逐公司读取。这两个年份用途独立。

当前静态构建中的 `currentYear` 在构建时计算。正式实现需保证跨年刷新，可通过年度重新构建或页面中的当前年份更新完成，不能把“无需配置”误写成静态HTML会自行跨年变化。

## 5. 抓取、索引和静态内容

### 5.1 robots 与 sitemap

正式站基础规则为公开内容允许抓取，sitemap 指向 `https://www.linkxcap.com/sitemap.xml`。文件必须位于域名根部 `/robots.txt`。AI 专项分组和训练用途策略见 [GEO 的机器人规则](geo.md#4-机器人规则和阿里云访问控制)。

配置页的随机文件名和 `debug=true` 都不是鉴权。保留内部编辑入口时使用独立内部环境或真实访问控制，不依赖难猜的URL。

robots 的 Disallow 不是密码保护，也不是可靠的去索引方法。需要 noindex 的页面须让机器人读到标记；内部页面优先不发布或访问控制。[Google robots 说明](https://developers.google.com/search/docs/crawling-indexing/robots/intro)

站点地图仅包含最终返回 200、允许索引且 self-canonical 的 URL，去除 404、重定向、预览和配置路由。所有 loc、alternate 使用正式 HTTPS 域名；中英文互链加入 `x-default`。`lastmod` 使用实际内容修改日期，不按每次构建时间刷新全站，也不用投资年份充当修改日期；无可信日期就省略。构建时做 XML 转义、解析、重复项和实际文件检查。

### 5.2 静态正文和动画

搜索及 AI 工具首先应在初始 HTML 中读到品牌简介、方向名称、公司名、投资年份、团队介绍和文章正文。现有 Three.js 区域并非所有文字都仅在 canvas；需要补齐的是各方向的完整、正常可见内容入口，不能依赖逐个旋转节点才能找到公司。

无 JavaScript 时保留正常导航和摘要。移动端缩小字号可以，不能为 SEO/GEO 删除核心事实。为用户提供可读的静态内容区；不要专为机器人加入隐藏关键词、与视觉内容不同的“AI 版本”或指令。

公司详情通过动态切换进入时，应同步 title、description、canonical、hreflang、OG 和 JSON-LD；每个对应 URL 直接访问仍生成同样主题的 HTML。

## 6. 性能、分享与可访问性

| 项目 | 计划 |
| --- | --- |
| 首屏 | 保持 HTML 与主要字体优先；Three.js/Lottie 按可见区域加载，不阻塞正文 |
| 图片/视频 | 指定尺寸，合理格式、poster、懒加载；视频按现有播放规则运行 |
| 布局稳定 | 为 Logo、视频、动画和字体切换预留空间，避免内容跳动 |
| 动画成本 | 离屏暂停、低性能设备适配、遵循 reduced-motion；不损坏设计内容 |
| Lottie 文件 | 保留设计师原始 JSON 字节、尺寸比例与效果；禁止重写、简化或有损压缩 |
| 网络压缩 | gzip/Brotli 属于无损传输，可启用；解压后的 Lottie 必须与原文件校验一致 |
| 缓存 | 有内容哈希的资源长期 immutable；HTML、robots、sitemap 和非哈希配置短缓存/可重验证 |
| 键盘与语义 | 导航、语言切换、公司链接有可识别名称；图片 alt；焦点可见 |
| 分享预览 | 正式域名图片可公开访问，中文英文内容匹配；分享抓取不被登录或验证码阻挡 |

性能目标：真实用户数据第 75 百分位 LCP ≤ 2.5s、INP ≤ 200ms、CLS ≤ 0.1。上线前实验室测试辅助定位；不能用单次 Lighthouse 分数声称真实用户指标已达标。[Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals)

## 7. 阿里云托管与发布设计

### 7.1 部署路径

**已确定**：与旧官网一致，使用 OSS 静态网站托管；步骤见 [OSS 部署文档](16-阿里云OSS部署与上线.md)。下表保留作为日后迁移参考。

| 路径 | 适用场景 | 必须确认的能力 |
| --- | --- | --- |
| ECS/轻量服务器 + Nginx | 已有服务器，需精确管理跳转、状态码与版本回滚 | HTTPS、301/308、真正 404、缓存、日志、原子切换 |
| OSS + CDN/DCDN/ESA | 已有静态托管/边缘服务，需资源加速 | 自定义域名、证书、边缘重定向与404保留、内容类型、缓存刷新 |

Astro 交付 `dist/`，生产不运行开发服务，也不需要常驻 Node 来展示页面。OSS 静态网站能力支持自定义索引和错误页，但不能据此假设所有服务器重定向与状态码要求已经满足；缺少的能力由边缘规则补齐或使用 Nginx。[阿里云 OSS 静态网站说明](https://help.aliyun.com/zh/oss/user-guide/hosting-static-websites)

阿里云托管不自动提升千问、豆包或国内 AI 引用率。部署选型依据访问、成本和运维能力，不因 GEO 自动采购额外云产品。

### 7.2 发布流程

实际操作见 [OSS 部署文档](16-阿里云OSS部署与上线.md)；以下为通用原则。

1. 保留现有 GitHub 预览流程；新增阿里云生产环境、正式参数和人工可触发的发布入口。
2. 使用项目要求的 Node 版本（当前 ≥22.12），执行 `npm ci` 和生产构建。
3. 检查产物：正式域名、公开 URL 清单、内部路由排除、双语 SEO、Lottie 校验。
4. 上传到新版本目录或版本化资源路径，先做非公开/受保护的预发布验证。
5. 通过版本目录切换或受控同步发布；确认引用的新资源先到位，再发布 HTML。
6. 刷新必要 CDN 缓存，验证入口、静态资源、robots、sitemap 和错误状态。
7. 验证成功后，再向站长平台/IndexNow 通知新增、更新或删除的 URL。
8. 保存版本号、日志与可回滚产物；故障回切版本并刷新缓存。

阿里云访问凭证放部署环境 Secrets，使用最小权限 RAM 身份。它们不能进入 `src/data/content.json`、编辑器、浏览器脚本或本文件。IndexNow 的公开验证文件不是阿里云密钥，不混用。

### 7.3 HTTP 与缓存检查表

| 请求 | 期望 |
| --- | --- |
| HTTP/非 www 对应路径 | 一跳到标准 HTTPS www URL；特殊证书验证路径按所用方案保留 |
| `/` | 301/308 到中文标准首页 |
| 中英文公开页面 | 200、`text/html`，无生产 noindex |
| 不存在的 `.html`/任意路径 | 404、错误正文，不能 200 回首页 |
| robots/llms | 200、`text/plain`，UTF-8 |
| sitemap | 200、XML 类型，正文为 XML |
| 编辑器及编辑专用 JSON | 不公开部署，直接请求404；内部版另行访问控制 |
| 新旧哈希静态资源 | 新版引用可访问；回滚需要的旧资源仍保留 |

## 8. 上线时需要用户操作的完整清单

代码实现可以先完成；下列账号与基础设施操作需要域名或平台管理员在正式发布阶段执行/授权。不要求用户提前公开密钥。

| 时点 | 用户操作 | 完成凭据/检查 |
| --- | --- | --- |
| 发布前 | 确认阿里云具体服务、地域、现有源站、发布账号和是否已有 CDN/WAF | 架构和发布目标明确，避免覆盖错误服务 |
| 发布前 | 提供旧站 URL 清单或站长平台/访问日志导出 | 重定向表与保留页面表 |
| 发布前 | 确认域名证书覆盖 www 和需要跳转的根域名，并配置续期 | HTTPS 两个主机验证，无证书错误 |
| 发布前 | 若使用中国内地资源，核对备案及接入要求；已有其他接入商备案时核对是否需接入阿里云 | 以阿里云账户审核为准；页脚备案号本身不证明接入完成 |
| 发布前 | 创建受限部署身份，将凭证存入生产部署环境 | 可部署目标路径/桶，不授予无关资源权限 |
| 切换时 | 按所选服务修改 www 和根域的 A/AAAA/CNAME/ALIAS 等记录 | 路由到正确源站/边缘；记录类型按服务要求 |
| 切换时 | 保留邮箱 MX、SPF、DKIM、DMARC 和验证 TXT；核对旧 AAAA、CAA 不冲突 | 邮箱不受影响，IPv4/IPv6与证书均正常 |
| 切换时 | 设置标准域名跳转、旧 URL 跳转、真实404和缓存 | 表7.3逐项通过；必要时提前调低相关 DNS TTL |
| 切换时 | 配置机器人访问及 WAF 策略 | 合法公共抓取不遭 JS 验证码；见 GEO |
| 发布后 | Google Search Console 验证域名资产（通常 DNS TXT），提交正式 sitemap | 验证成功；抽查中文英文 URL Inspection |
| 发布后 | Bing Webmaster Tools 验证并提交 sitemap | 抓取/索引报告可查看，按可用性查看 AI Performance |
| 发布后 | 在百度搜索资源平台按当前账号能力验证站点，使用可用的链接提交功能 | 记录提交方式与结果；不假设所有账号有同样配额/入口 |
| 发布后 | 配置 IndexNow 验证文件和更新通知（如采用） | 根目录验证文件公开可达，通知只在发布成功后发送 |
| 发布后 | 选择统计工具，填入已建立的站点 ID/域名配置，明确统计口径 | 国内与海外访问均能测量；不只依赖可能不可达的海外脚本 |
| 发布后 | 用本人可用 AI 账号开启联网搜索，执行 GEO 验证题集 | 保存回答及来源；没有平台账号记“未验证” |
| 首周 | 查看索引、404、抓取错误、缓存和旧路径命中 | 问题进入修复清单 |
| 首月及维护 | 查看搜索词、有效页面、引用、过时事实；新文章发布后更新 sitemap | 基于真实数据持续调整 |

中国内地部署的备案/接入条件参考 [阿里云域名接入说明](https://help.aliyun.com/zh/ecs/user-guide/how-to-connect-a-registered-domain-name-to-alibaba-cloud)。部署到香港/海外等不同地域，按实际服务要求核对，不自动套用同一流程。

IndexNow 用于参与该协议的搜索引擎更新通知，不是 Google 的通用提交 API，也不保证收录。只提交真实已发布变更，删除页也可通知；提交失败记录并重试，不把已成功发布的网站自动回滚。[IndexNow 官方文档](https://www.indexnow.org/documentation)

## 9. 验证范围与验收结果格式

仅运行与改动相关的检查；已经通过且代码未再变化的项目，不每次重复完整视觉回归。涉及双语元数据和 URL 的变更，必须批量检查所有对应页面；响应式正文变更用代表尺寸核对。

| 层级 | 检查与验收条件 |
| --- | --- |
| 全量静态检查 | 清单内所有中英文页面有主题匹配 title/description/H1；canonical、alternate、OG、JSON-LD 无失效链接 |
| sitemap | URL集合与可索引清单一致，双语互链，XML有效，无内部路由和重定向 |
| 环境隔离 | 正式域名根部署没有预览地址或 noindex；预览保留 noindex；编辑器只在内部环境 |
| 结构化数据 | JSON可解析、实体ID稳定、事实与可见内容一致；适用页面使用 Google Rich Results Test 辅助检查 |
| 浏览器针对性检查 | 首页、列表、公司、团队、文章、联系页中英文；320/375/390/430、768/820、1024/1100、1366/1440/1920px宽，检查换行/溢出/可见文字 |
| 无JS与读取 | 初始HTML可提取核心事实与实际链接；无JS仍有基本阅读和导航 |
| 真实线上HTTP | 标准主机、重定向、404、Content-Type、robots、sitemap、分享图、编辑器排除与CDN缓存 |
| 搜索平台 | 记录提交和抓取状态，不把“已提交”写成“已收录” |
| 性能 | 保留测试设备、网络与时间；字段数据不足时注明待观察 |

报告分开记录：代码检查通过、线上部署验证通过、搜索平台处理状态、AI回答观察。未测试的账号/平台/尺寸列出缺口，不冒充全平台验收。

## 10. 实施顺序

| 优先级 | 任务 | 依赖 | 交付 |
| --- | --- | --- | --- |
| P0 | 正式域名/根路径、环境隔离、编辑器排除、URL清单、canonical/hreflang/404 | 已确认域名；选定阿里云服务后配置线上状态 | 可发布的生产构建与检查脚本 |
| P0 | 元数据逐页生成、静态正文补齐、组织/文章/导航JSON-LD | 现有审核内容 | 双语SEO实现 |
| P0 | 阿里云发布、HTTPS、DNS、旧站URL处理、缓存和抓取验证 | 云资源与管理员操作 | 线上可抓取站点 |
| P1 | sitemap真实更新、分享图、站长验证、统计、IndexNow | 生产上线 | 搜索观测入口和更新流程 |
| P1 | GEO平台规则、品牌事实入口、引用验证 | 按[GEO方案](geo.md) | 可读内容与平台验证记录 |
| P2 | 有实际内容价值的方向专题、持续文章与权威外部链接 | 已有内容或后续真实资料 | 新落地页和持续维护 |

## 11. 官方依据

技术依据核对日期为2026-10-06；实施前如平台文档或控制台入口变化，应复核。

| 主题 | 官方资料 |
| --- | --- |
| 双语网站 | [Google 多地区与多语言](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) |
| URL迁移 | [Google 网站迁移](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes) |
| robots | [Google robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro) |
| 结构化数据 | [入门](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)、[组织](https://developers.google.com/search/docs/appearance/structured-data/organization)、[文章](https://developers.google.com/search/docs/appearance/structured-data/article) |
| 性能 | [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals) |
| 阿里云托管 | [OSS静态网站](https://help.aliyun.com/zh/oss/user-guide/hosting-static-websites)、[域名接入](https://help.aliyun.com/zh/ecs/user-guide/how-to-connect-a-registered-domain-name-to-alibaba-cloud) |
| 更新通知 | [IndexNow](https://www.indexnow.org/documentation) |
