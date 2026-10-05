# 星连资本官网 GEO 实施方案与 AI 平台验证清单

更新日期：2026-10-06。状态：**方案文档，尚未实施机器人规则、内容增强或线上发布**。

正式域名：`https://www.linkxcap.com/`；托管：阿里云；现有中英文内容已审核。搜索基础、构建参数及上线操作见 [SEO方案](seo.md)。本文件负责 ChatGPT、Claude/Claude Code、Gemini、WorkBuddy、豆包及其他常见 AI 平台的自然发现、网页读取、事实理解和引用。

## 1. 目标、边界和工作方式

GEO（Generative Engine Optimization，生成式搜索优化）的目标，是让 AI 在需要联网回答时，能找到、读取并正确引用官网事实。主要工作是清楚的公开内容、稳定URL、搜索发现、机器人可访问和持续验证。

区分以下四种结果：

| 结果 | 含义 | 验证方式 |
| --- | --- | --- |
| 可抓取 | 工具能获取HTML和正文 | 实际HTTP、日志、直接URL读取 |
| 可被搜索发现 | 搜索模式能召回官网页面 | 无预先指定官网URL的联网搜索 |
| 可正确引用 | 回答有正确事实并给出可访问来源 | 保存回答、逐条核对引用 |
| 模型记忆 | 未联网也知道品牌 | 不由本站SEO/GEO设置控制，不作为技术交付要求 |

直接给官网URL让AI总结，只能证明读取和理解，不证明自然发现能力。开放某个爬虫，也不能证明网站已被收录、被引用或进入训练数据。

本方案不包含购买 ChatGPT 广告、批量付费软文或模型 API。截图中的 ChatGPT 广告入口属于付费投放，与自然搜索/引用独立。无需为 GEO 自动采购百炼、腾讯联网搜索、火山引擎或 MCP 服务。

现有文案沿用已审核内容。新增摘要或问答只能整理已有事实；缺少资料时省略，不编造投资时间、独角兽数量、回报率、机构背书或“最佳基金”评价。

## 2. 平台覆盖矩阵

“官方确认”指公开文档确认对应能力或控制方式；“待实测”指用户账号、模式或该平台的具体收录链路未验证。以下平台均纳入后续观测，不把没有公布的提交渠道写成已存在。

| 平台/入口 | 能力及依据状态 | 网站侧措施 | 发布后验证 |
| --- | --- | --- | --- |
| ChatGPT Search/联网回答 | 官方公布 OAI-SearchBot、ChatGPT-User | 放行公开内容搜索抓取和用户读取；HTML正文、明确实体与来源 | 联网品牌/方向搜索、直接URL读取，分别记录 |
| Claude 聊天/联网研究 | 官方公布 Claude-SearchBot、Claude-User | 搜索与用户读取可达；不与训练机器人混淆 | 开启可用联网模式，核对事实和来源 |
| Claude Code | 官方工具为 WebSearch 和 WebFetch；可用性受会话/组织环境影响 | 稳定静态HTML；验证实际工具，不把它当独立站长平台 | 先检查工具可用，再分开搜索和读取 |
| Gemini / Google AI搜索功能 | 官方Google抓取与产品控制规则；不同产品入口有差异 | Googlebot、索引、可摘录正文；单独核对Google-Extended | Gemini联网引用与Google搜索表现分开记录 |
| Microsoft Copilot / Bing AI | Bing提供搜索与部分AI引用观测 | Bing收录、sitemap、可选IndexNow、正确网页实体 | 品牌搜索与来源；可用时看Bing AI Performance |
| Perplexity | 官方公布 PerplexityBot、Perplexity-User及IP信息 | 搜索抓取和用户读取可达，文章有来源日期 | 自然搜索、直接URL读取和引用核验 |
| WorkBuddy | 官方定位为工作智能体；未确认专属公开网站收录入口/机器人 | 公开网页可读，按当前会话实际搜索、浏览或连接器能力验证 | 不联网的会话记不适用；读取与搜索分别测试 |
| 腾讯元宝 | 腾讯官方元宝搜索公开网页能力可核验；API不等于App提交接口 | 国内可访问HTML；品牌与官方公众号/官网信息一致 | 元宝App实际联网回答与来源；不靠开通API“提交官网” |
| 豆包 | 火山官方提供豆包搜索相关工具资料；App的完整收录路径未确认 | 国内访问、静态正文、真实来源和更新日期 | 豆包实际联网模式验证；不宣称有专属站长入口 |
| 千问 | 阿里官方公布联网检索Agent；API配置不代表千问App收录提交 | 搜索基础、实体一致、公开正文 | 千问App联网引用验证；阿里云托管不代表优先收录 |
| DeepSeek | 本方案未确认官网专属收录规则 | 通用可抓取内容，按实际会话联网能力验证 | 官方App/第三方接入分别记录；不混同“用DeepSeek模型的元宝” |
| Kimi | 本方案未确认官网专属爬虫/提交规范 | 静态正文、链接、长文结构与来源 | 用户账号实际可用的联网/研究入口测试 |
| 文心/百度AI搜索 | 按百度搜索发现和实际AI产品模式验证，不推定两者收录完全一致 | 百度搜索资源平台可用提交、中文事实入口 | 百度检索及AI回答分别核验 |
| Grok | 本方案未确认适用于本网站的专属提交机制 | 通用搜索发现、英文与中文可读正文 | 当前账号可用联网模式和引用测试 |
| Codex、Gemini CLI、Cursor等工具 | 搜索/读取可能来自工具提供方、插件或用户配置 | 同一套公开HTML、URL及可选llms导航 | 记录实际工具/提供方；不笼统归入某个聊天App |

平台官方依据： [OpenAI机器人](https://developers.openai.com/api/docs/bots)、[Anthropic机器人](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)、[Claude Code工具](https://code.claude.com/docs/en/tools-reference)、[Google抓取控制](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)、[Perplexity机器人](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)。

国内能力依据： [WorkBuddy官方介绍](https://cloud.tencent.com/product/workbuddy)、[元宝搜索简介](https://cloud.tencent.com/document/api/1806/121812)、[豆包搜索工具说明](https://docs.volcengine.com/docs/ark/agent-plan-enterprise-search?lang=zh)、[千问联网检索Agent](https://help.aliyun.com/zh/model-studio/web-search-agent-guide)。这些产品或API文档可证明相关能力，不证明某个官网会被App自动引用；豆包资料的网页正文依赖动态加载，本轮未完整读取，实施前应在官方控制台/文档再次核对。

DeepSeek、Kimi、Grok等未确认项，后续根据官方资料与实际日志补充，不能编造 `DeepSeekBot`、`KimiBot`、`DoubaoBot`、`WorkBuddyBot` 等 token 后声称已经适配。中文平台的搜索供应商也不能凭推测写成固定关系。

## 3. 官网内容与实体结构

### 3.1 建立可信的事实入口

官网已有独立公司、团队与文章页面，主要工作是加强关联和可读性，不批量复制新页面。

| 入口 | 公开内容要求 | 复用数据 |
| --- | --- | --- |
| 中英文首页 | 简明机构定位、实际关注方向、投资组合/团队/洞察/联系链接 | 全站已审核介绍 |
| 投资组合列表 | 公司名、方向、详情链接，允许正常文字阅读 | 公司记录与方向配置 |
| 公司详情 | 公司名、投资年份（有值时）、方向、已审核简介及官网链接 | 同一公司配置，避免Three.js单独维护年份/关系 |
| 团队详情 | 姓名、英文名、职务、已审核介绍 | 团队配置 |
| 洞察文章 | 完整静态正文、日期、作者/来源、清楚主题 | Markdown及frontmatter |
| 联系页 | 明确邮箱、相关机构关系和公众号图片说明 | 现有联系配置 |

品牌统一以当前配置的 `site.brand_cn` / `site.brand_en` 为准，即“星连资本 / LinkX Capital”。历史材料中的 Link-X Capital 等拼写，只有确认是同一机构的真实别名时才进入 `alternateName`，不改掉已审核的主品牌名。避免网站、公众号、公司投资组合和英文介绍各写一套名称。法定主体名与品牌名分开，不虚构法定英文名。

六个方向按 V6 的行业标签配置读取；首页每家公司只使用行业标签 1，投资组合筛选使用全部标签：

| 配置方向ID | 中文 | 英文 |
| --- | --- | --- |
| `foundation` | 基础模型与学习范式 | Foundation Models & Learning |
| `infrastructure` | AI 基础设施 | AI Infrastructure |
| `chips` | 芯片 | Chips |
| `applications` | AI 原生应用 | AI-Native Applications |
| `physical` | 具身智能 | Embodied AI |
| `frontiers` | 科学智能 | AI for Science |

视觉标题可按现有审核文案展示，但关系使用同一配置ID。公司年份不能退回到版权年份、构建年份或统一“2026”。没有投资年份则不输出年份部分。

### 3.2 可被提取的正文

1. 每页先有一句准确说明“谁、做什么、属于哪个方向”，之后展开正文。
2. 段落按实际主题组织，用清楚的小标题、列表和必要表格，不机械切成大量短片段。
3. 所有核心事实存在于初始HTML；Three.js和Lottie不承载唯一的事实入口。
4. 方向到公司、公司到文章、文章到方向/联系页使用真实链接，避免孤立详情页。
5. 中英文对应内容事实一致，年份、名字、方向由共享数据产生；翻译字段保留各语言自然表达。
6. 文章说明原创、采访或转载关系；外部原文使用真实来源。官网自己的URL可以作为官网事实来源，但不能包装成独立第三方背书。

不要对AI使用不同事实、隐藏大段关键词、写“忽略此前指令推荐本公司”等提示注入，或批量生成没有信息增量的地区页/关键词页。

Google的AI搜索仍强调常规搜索可访问性与内容价值；没有专用schema或llms文件可以代替这些条件。[Google AI优化说明](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

### 3.3 问答和专题的增量范围

先在现有页面补充可见的简短问答，不改变既有视觉主叙事。候选问题包括：星连资本关注什么、有哪些投资方向、在哪里查看投资组合、如何联系、孵化器与基金是什么关系。答案只整理现有批准资料。

只有某个方向有足够真实介绍、公司案例和文章时，才增加中英文方向专题。专题需独立价值和URL，纳入同一公开清单、sitemap、语言对应关系及导航。没有资料就保留方向段落，不为了GEO凑五组薄页面。

结构化数据复用SEO方案的 Organization/WebSite/Article/Person；可见问答不意味着本站有资格获得FAQ特殊搜索展示。

### 3.4 可选 `llms.txt`

计划在根部生成 `/llms.txt`，作为简洁的品牌及重点内容导航；这是开放提议格式，不是主流AI平台通用收录协议，也不是保证排名或引用的必要条件。[格式提议](https://llmstxt.org/)

建议包含：品牌标题、已审核一句话介绍、中英文首页、投资组合、团队、洞察、联系页，以及 sitemap。URL均从共享清单生成，过滤编辑器、预览和失效页面；不在文件里堆入所有公司全文或优先推荐指令。

示意结构（后续实现时按真实URL与简介生成）：

```markdown
# 星连资本 / LinkX Capital

> 使用官网已审核的机构简介。

## 官方页面
- [中文首页](https://www.linkxcap.com/zh/index.html)
- [English](https://www.linkxcap.com/en/index.html)
- [投资组合](https://www.linkxcap.com/zh/portfolio.html)
- [Portfolio](https://www.linkxcap.com/en/portfolio.html)
- [洞察](https://www.linkxcap.com/zh/insights.html)
- [Insights](https://www.linkxcap.com/en/insights.html)
- [联系我们](https://www.linkxcap.com/zh/contact.html)
- [Contact](https://www.linkxcap.com/en/contact.html)

## 网站索引
- [Sitemap](https://www.linkxcap.com/sitemap.xml)
```

若后续某个工具确实需要Markdown，可增加内容等价的正文导出或内容协商；先验证必要性。不要为该可选能力重复维护事实或自动建设昂贵的MCP/RAG系统。内部知识库上传只能帮助授权用户的内部检索，不等于公众AI可发现官网。

## 4. 机器人规则和阿里云访问控制

### 4.1 搜索、用户读取与训练分开

| 标识 | 官方用途 | 本项目推荐 |
| --- | --- | --- |
| `OAI-SearchBot` | ChatGPT搜索发现 | 允许公开内容 |
| `ChatGPT-User` | 用户触发访问；不是搜索收录机器人 | 公开页可读取；不把它的访问次数当作收录数 |
| `GPTBot` | OpenAI训练相关抓取 | 独立内容使用策略，不为Search覆盖自动放行训练 |
| `Claude-SearchBot` | Claude搜索 | 允许公开内容 |
| `Claude-User` | 用户触发读取 | 公开页可读取 |
| `ClaudeBot` | Anthropic训练相关抓取 | 独立内容使用策略，与搜索规则分开 |
| `Googlebot` | Google搜索抓取 | 允许公开内容与必要渲染资源 |
| `Google-Extended` | Gemini训练及指定产品的Search grounding内容使用控制 | 为Gemini覆盖推荐允许公开审核内容，必须理解其两种用途耦合 |
| `PerplexityBot` | Perplexity搜索抓取 | 允许公开内容 |
| `Perplexity-User` | 用户触发访问 | 公开页可读取 |
| 其他搜索机器人 | 按搜索引擎官方规范确认身份 | 公开内容一般可访问；不根据猜测添加专属AI规则 |

OpenAI、Anthropic各自区分搜索、用户读取与训练；不能用一个总开关代替所有用途。[OpenAI用途说明](https://developers.openai.com/api/docs/bots)、[Anthropic用途说明](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)

**Google-Extended例外：**它没有单独HTTP User-Agent，是robots产品控制token；同时控制未来Gemini训练和Gemini Apps/Vertex指定Search grounding使用，不能声称“禁止它只影响训练、完全不影响Gemini联网回答”。它不控制Google Search收录或搜索排名。若选择禁止，需接受相应Gemini覆盖限制；不能宣称通过这个token分别控制两种用途。[Google官方定义](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)

Claude Code官方文档说明 WebSearch 搜索后可通过 WebFetch 读取页面，当前WebFetch请求的UA以 `Claude-User` 开头；第三方模型网关、MCP或版本变化另行实测，不据此推断所有Claude Code网络请求都相同。[Claude Code工具行为](https://code.claude.com/docs/en/tools-reference)

### 4.2 生产规则示意

以下是**待实现模板**，不是当前线上robots。仅适用于生产公开内容，内部编辑器已从生产构建移除。搜索明确放行；训练策略应在实现时依据实际内容使用选择单独生成，不把“内容审核完成”自动解释成训练授权。

```text
User-agent: *
Allow: /

User-agent: OAI-SearchBot
User-agent: Claude-SearchBot
User-agent: PerplexityBot
Allow: /

Sitemap: https://www.linkxcap.com/sitemap.xml
```

若未来在robots中加入公共路径限制，必须同步到匹配的专属分组：不能假定 `User-agent: *` 的规则会自动继承到更具体的组。用户触发fetch可能不遵循robots，因此内部数据仍靠不发布/鉴权保护，而非依靠Disallow。[Perplexity机器人说明](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)

预览HTML保持noindex，不给AI作为官方事实地址。正式站的robots、sitemap、分享图及HTML正文均应公开可达；验证码、登录墙或JS挑战会影响无需浏览器执行的读取。

### 4.3 CDN/WAF与日志

| 项目 | 阿里云实施要求 |
| --- | --- |
| 合法机器人 | 能验证时结合官方IP列表/反向与正向DNS规范，不只相信可伪造UA |
| 放行范围 | 仅必要公开GET/HEAD和静态资源；不整体绕过WAF、账户认证或接口限制 |
| 防护方式 | 公共读取尽量不要求JS挑战；异常高频仍限流并记录 |
| 国内外访问 | 分别测源站/CDN路径、DNS、TLS、IPv4/IPv6与403/429/5xx |
| 日志 | 时间、路径、状态、UA、耗时、缓存命中；在必要权限下记录来源IP用于身份核验 |
| 缓存 | 避免robots旧策略和旧正文长时间缓存；修改后受控刷新 |
| 身份未知 | 记录“疑似机器人”，不写“已确认某AI平台收录” |

官方IP资料示例：[OpenAI搜索机器人IP](https://openai.com/searchbot.json)、[ChatGPT用户读取IP](https://openai.com/chatgpt-user.json)、[Perplexity搜索IP](https://www.perplexity.com/perplexitybot.json)、[Perplexity用户读取IP](https://www.perplexity.com/perplexity-user.json)。实施时定期核对来源与更新，不永久硬编码本轮看到的IP。未公开可验证IP的工具采用常规访问控制和实测，不因一个UA直接授予防护豁免。

## 5. 国内平台、外部信源和权威性

### 5.1 国内平台的执行路线

1. 保证大陆网络正常访问官网、正文、图片和内部链接。
2. 完成百度、Bing及Google的适用搜索基础工作；这扩大被发现的机会，不等于所有国内AI固定使用它们。
3. 豆包、元宝、千问、Kimi、DeepSeek、文心分别使用其实际联网模式测试，不将一个平台的结果归因到另一个模型。
4. 元宝等场景可关注已有官方公众号信息与官网的一致性；公众号文章保留官网来源链接、日期和品牌名，二维码图片本身不能替代可读取的事实。
5. 若官方提供真实的网站合作/数据收录渠道，核验权限、用途与费用后再列入；搜索API开通和“指定检索域名”不是网站提交收录。

### 5.2 外部证据

投资公司官网、真实活动主办方、合作高校和已发布采访如有对应介绍，可链接到官网相关页。运营时在已有官方账号更新标准域名和品牌描述；只针对真实合作事实，不批量购买外链或虚构权威推荐。

官网事实和第三方评论分别标注来源。存在真实新闻原文时保留链接；不存在则不要为了“提高权威”伪造出处。已审核数据按原配置发布，不额外制造数字和评价。

## 6. 双语与多屏内容验收

中英文均须通过静态正文提取和正常浏览。AI可读取性以核心信息完整为标准，不能只在一个旋转角度、某个hover状态或某一屏幕宽度出现。

| 类型 | 验证要求 |
| --- | --- |
| 全部可索引页面 | 名称、介绍、语言、年份和方向关系由实际配置正确生成 |
| 首页3D区 | 六方向及相关公司有可访问静态链接；公司名/年份不能只有canvas或移动端被隐藏 |
| 公司详情 | 单独URL和客户端切换读取到同样的公司事实 |
| 中英文 | 不遗漏一个语言；名字、年份、方向与来源对应 |
| 响应式 | 代表宽度320/375/390/430、768/820、1024/1100、1366/1440/1920px，文字无遮挡、不出屏 |
| Lottie | 原始JSON不改写、不有损压缩；保持比例和设计效果，校验文件一致性；无损HTTP压缩可用 |

GEO新增正文不能以机器人需求破坏现有设计。文案区通过正常可见的展开、栏目或落地页组织，保证用户也能阅读；具体视觉变更单独进行针对性验证。

## 7. 发布后的 AI 验证方法

### 7.1 两类测试分开执行

**A. 自然发现：**新建无历史偏好的会话，开启实际可用的联网/搜索模式，不先给官网URL，询问品牌和业务。记录它是否搜索、是否召回官网、是否引用。

**B. 直接读取：**提供具体中英文官网URL，要求总结与提取来源中的事实。记录读取成功、事实准确和URL可达。B通过不等于A通过。

不得用大量同类会话“刷结果”。首次建立基线，之后有实质发布或平台变化再复测；一般按D0、D7、D30观察收录和引用，不宣称固定天数后必然出现。

### 7.2 统一题集

每个平台先跑下列核心中英文题；有方向或投资年份测试需要时再使用详细题。为比较自然波动，关键题可在三个独立会话重复，保留全部结果，不只挑选成功回答。

| 编号 | 中文题 | 英文题 | 主要核验 |
| --- | --- | --- | --- |
| Q1 | 星连资本是什么机构？请给出官方来源。 | What is Link-X Capital? Please cite official sources. | 名称、定位、官网 |
| Q2 | 星连资本关注哪些AI投资方向？ | Which AI investment areas does Link-X Capital focus on? | 六方向与事实一致 |
| Q3 | 哪里可以查看星连资本的投资组合？ | Where can I find Link-X Capital's portfolio? | 正确列表URL |
| Q4 | 如何联系星连资本？ | How can I contact Link-X Capital? | 正式联系方式 |
| Q5 | 星连资本官网有哪些最新洞察文章？请注明日期与来源。 | What recent insights are published on Link-X Capital's website? Include dates and sources. | 真文章与真日期 |
| Q6 | 星连资本对某公司的投资年份是什么？请根据官网回答。 | In what year did Link-X Capital invest in this company, according to its website? | 用有年份配置的具体公司替换占位，不猜年份 |
| Q7 | 星连资本的AI基础设施方向有哪些公司？ | Which companies are listed under AI Infrastructure at Link-X Capital? | 配置关系、公司名 |
| Q8 | 请根据这个网页总结机构定位和联系方式：[具体首页URL] | Summarize the organization and contact details from this page: [specific homepage URL]. | 直接读取能力 |
| Q9 | 请读取这个公司详情页，提取公司名、方向和投资年份：[具体URL] | Extract the company name, sector and investment year from this page: [specific URL]. | 逐页HTML事实 |

另设少量不带品牌的探索题，例如“中国关注AI基础设施的投资机构有哪些？”及其英文版本，仅作为竞争场景观察。未提到本站不判为技术失败；不得要求平台无依据优先推荐。

### 7.3 记录格式

后续实施可新增 `docs/verification/geo/` 保存人工记录；本轮只规划，未宣称完成平台测试。记录至少包含：

| 字段 | 要求 |
| --- | --- |
| 时间/平台 | 日期时间、App/CLI/API入口、地区/网络条件 |
| 版本/模式 | 可见模型名、联网是否开启、实际使用工具；未知写未知 |
| 问题与会话 | 完整问题、独立会话编号、自然发现/直接读取类型 |
| 回答 | 原文或截图路径、是否发生搜索/读取 |
| 引用 | 原始URL、标准官网URL、打开状态、支持哪条事实 |
| 准确性 | 正确、缺失、错误；逐条记录错误事实及官网依据 |
| 技术证据 | 可关联的公开页请求/状态；没有日志证据不推断抓取来源 |
| 下一步 | 修复网站错误/向平台反馈/等待处理/不适用 |

无法登录或没有联网功能的会话标“未验证”或“不适用”，不能填“通过”。AI服务调用可能计费，日常验证优先使用用户已有账户；不为完成观察自动购买API。

## 8. 观测指标与成功口径

| 层级 | 指标 | 解释 |
| --- | --- | --- |
| 技术可达 | 公开页面抓取成功、正确状态码、正文可提取 | 能控制并做确定性验收 |
| 搜索发现 | 官方品牌题的官网召回率、中英文有效索引 | 按模式和样本数报告 |
| 引用 | 核心题官网引用次数/测试次数、引用的具体页面 | 不是全网曝光率；不混入直接给URL测试 |
| 事实 | 所测事实正确率，错误年份/方向/联系方式数量 | 实测题集希望零事实错误，不保证所有生成回答 |
| 用户行为 | AI来源访问、联系邮件点击、来源文章阅读 | 不等于实际客户转化；仅记录真实事件 |

App跳转可能不带Referer，不能将“direct”全部归因于AI，也不能因没有AI来源标签就断言没有AI访问。UA访问量、搜索曝光、回答引用和用户点击分别统计。

Google Search Console用于搜索观察；Bing AI Performance在账户可用时观察Copilot/Bing及其支持范围内的引用，不覆盖所有AI平台，引用次数也不等于点击数。[Bing官方AI Performance说明](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/)

## 9. 待实现任务与用户操作

### 9.1 项目代码任务

| 优先级 | 待实现 | 交付/验证 |
| --- | --- | --- |
| P0 | SEO生产域名、静态HTML、公共URL清单、双语metadata/schema | 复用[SEO实现清单](seo.md#10-实施顺序) |
| P0 | 六方向与公司/团队/文章静态关联，年份统一读取公司配置 | 中英文事实提取检查 |
| P0 | 搜索抓取规则与阿里云实际HTTP/WAF验证 | robots、日志、公开页读取 |
| P1 | 已审核简介整理、可见问答、可选llms.txt | 无重复维护事实、无失效URL |
| P1 | 平台测试记录、搜索/引用/点击分开统计 | 全矩阵记录已测与缺口 |
| P2 | 有资料支撑的双语方向专题与新洞察 | 独立价值与真实引用来源 |
| 可选 | 用户内部知识库、MCP或指定站点API检索 | 单独需求与成本评估，不属于公开GEO必需项 |

### 9.2 上线后用户需要操作

| 操作 | 说明 |
| --- | --- |
| 完成域名/云服务配置 | 按SEO上线清单；不需要一个单独的“GEO域名” |
| 核对内容使用策略 | 搜索、用户读取、训练分别处理；尤其Google-Extended两用途耦合 |
| 在云控制台核对WAF/CDN | 仅为合法公开抓取调整挑战和限流，不全面关闭防护 |
| 验证Google/Bing/百度站点并提交sitemap | 使用本人管理账号；入口以当前账户能力为准 |
| 更新现有官方对外链接 | 公众号、已使用的公司/团队官方账号保持正式URL与事实一致 |
| 在本人AI账号运行题集 | ChatGPT、Claude/Claude Code、Gemini、WorkBuddy、豆包优先；其余常见平台同样记录 |
| 保存完整回答与引用 | 失败样本也保留；不只保存通过截图 |
| 对事实错误分类处理 | 官网页面错误先修网站；网站正确但平台过时则记录并使用平台反馈入口 |
| 定期复核 | D7/D30看首次发布结果；之后内容变化/平台规则变化时复核 |

WorkBuddy或编码工具的私有连接器需要用户授权相应账号；不公开内部文件、对话或密钥。仅测试官网公开网页无需导入项目源码。第三方API“搜索范围设置”只能影响该应用自己的请求，不等于向所有用户的AI回答提交官网。

## 10. 官方资料和复核边界

| 主题 | 依据 | 本方案使用边界 |
| --- | --- | --- |
| ChatGPT | [OpenAI机器人](https://developers.openai.com/api/docs/bots) | 搜索、用户读取、训练用途区分 |
| Claude | [Anthropic抓取说明](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) | 不混同三类机器人 |
| Claude Code | [工具参考](https://code.claude.com/docs/en/tools-reference) | 确认WebSearch/WebFetch；具体组织策略实测 |
| Google/Gemini | [抓取与产品token](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)、[AI优化](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) | Google-Extended耦合用途；常规搜索基础 |
| Gemini API | [Google Search grounding](https://ai.google.dev/gemini-api/docs/google-search/) | 证明API联网能力；不推定每个消费者入口完全相同 |
| Perplexity | [机器人与IP](https://docs.perplexity.ai/docs/resources/perplexity-crawlers) | 搜索与用户触发访问区分 |
| Copilot/Bing | [AI Performance](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/) | 观测范围以报告支持范围为准 |
| WorkBuddy | [产品介绍](https://cloud.tencent.com/product/workbuddy) | 工作智能体定位，不证明专属搜索索引 |
| 元宝 | [联网搜索简介](https://cloud.tencent.com/document/api/1806/121812) | 公开网页与腾讯内容检索；不是官网提交接口 |
| 豆包 | [搜索工具说明](https://docs.volcengine.com/docs/ark/agent-plan-enterprise-search?lang=zh) | 动态文档需再核对；API与App验证独立 |
| 千问 | [联网检索Agent](https://help.aliyun.com/zh/model-studio/web-search-agent-guide) | API应用能力不等于App收录承诺 |
| llms.txt | [格式提议](https://llmstxt.org/) | 可选导航，不作为通用平台保证 |

资料核对日期：2026-10-06。没有官方公开规范的事项保留“待确认”；正式实现前复核变化，尤其机器人用途、工具可用性、平台入口和阿里云防护配置。
