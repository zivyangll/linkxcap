# 阿里云 OSS 部署与上线（替换 www.linkxcap.com）

更新日期：2026-10-10。第 1 节为当天在 OSS 控制台**只读核对**的实际配置（未做任何修改）。

新官网沿用旧官网的部署方式：**阿里云 OSS 静态网站托管**。网站是纯静态 HTML，不需要服务器、Node 进程或数据库。上线就是把新的 `dist/` 上传到现有 Bucket，替换旧文件，并调整两项静态页面设置。

SEO/GEO 的设计见 [SEO 方案](seo.md) 和 [GEO 方案](geo.md)。

## 1. 现有配置（2026-10-10 核对）

### 1.1 Bucket

| 项目 | 实际值 |
| --- | --- |
| Bucket | `linkxcapital`（账号下唯一的 Bucket） |
| 地域 / Endpoint | 华北2（北京）/ `oss-cn-beijing.aliyuncs.com` |
| 存储 | 标准存储，同城冗余；创建于 2026-06-05 |
| 读写权限 | 公共读 |
| 当前内容 | 234 个文件，约 42 MB（旧站 2026-07-03 上传） |
| 版本控制 | **已开通** |
| 生命周期 | 一条全 Bucket 规则：历史版本在最后修改 30 天后删除，并自动移除过期删除标记 |
| 禁止文件覆盖写 | 无规则（可以直接覆盖上传） |
| 传输加速 | 未开启 |

版本控制 + 生命周期意味着：上线时被覆盖或删除的旧文件，**30 天内**都能在「文件列表 → 显示历史版本」里找回。仍建议另做一份本地备份（第 4 步）。

### 1.2 域名与 HTTPS

| 域名 | 绑定 | 阿里云 CDN | HTTPS 证书 | 实际访问 |
| --- | --- | --- | --- | --- |
| `www.linkxcap.com` | 已绑定到 `linkxcapital` | 未配置 | 已托管 | HTTP、HTTPS 都直接由 OSS 返回（`Server: AliyunOSS`） |
| `linkxcap.com` | 已绑定到 `linkxcapital` | 未配置 | 已托管 | `http://linkxcap.com/…` 由 Tengine 301 跳到 `https://www.linkxcap.com/…`（保留路径，像是 DNS 的 URL 转发）；**`https://linkxcap.com/` 访问超时** |

没有使用 CDN，所以上传后立即生效，不需要刷新缓存。`https://linkxcap.com` 不可访问是旧站就存在的问题，与本次上线无关；如需修复，在云解析 DNS 控制台核对 `linkxcap.com` 的解析与转发设置。

### 1.3 静态页面（数据管理 → 静态页面）

| 设置 | 当前值 | 新站需要 | 原因 |
| --- | --- | --- | --- |
| 默认首页 | `index.html` | `index.html`（不变） | 根地址 `/` 打开 `index.html`，新站在这里跳到 `/zh/index.html` |
| 子目录首页 | **未开通** | **开通** | 未开通时 `/zh/`、`/en/` 都返回根首页（现在 `/en/` 显示的是中文首页）；开通后分别打开 `zh/index.html`、`en/index.html`。旧站 sitemap 使用的正是 `/zh/`、`/en/` |
| 默认 404 页 | `index.html` | `404.html` | 新站根目录 `index.html` 是跳转页；不存在的地址应显示 404 页 |
| 错误文档响应码 | 404 | 404（不变） | |

开通「子目录首页」时，「文件 404 规则」保持默认的 **Redirect**：访问 `/zh`（不带斜杠）且存在 `zh/index.html` 时，跳到 `/zh/`。

### 1.4 旧站文件

| 位置 | 内容 | 上线后 |
| --- | --- | --- |
| `zh/`、`en/` | 旧站中英文页面 | 被新页面覆盖；新站没有的页面会被删除。其中 `contact.html`、`portfolio-1.html`、`team-elliot.html` 由新站的跳转页接替 |
| 根目录 `*.html` | 旧站另一套页面（`index.html`、`index_refer.html`、`portfolio.html`、`team.html`、`contact.html` 等），不在旧站 sitemap 中 | 删除（根目录 `index.html` 被新的跳转页覆盖） |
| `googlea0e97b0ecf2a0a58.html` | **Google Search Console 站点验证文件** | **保留**：已放入仓库 `public/`，每次构建原样带上，清理旧文件时不会被删除 |
| `robots.txt`、`sitemap.xml` | 旧版（sitemap 指向 `https://linkxcap.com/`） | 被新版覆盖 |
| `assets/`、`image*.png`、`insights/`（4 张文章封面 SVG） | 旧站图片 | 删除 |
| `tools/`（`build-seo-pages.mjs`、`verify-seo.mjs`） | 旧站误传的构建脚本，目前任何人都能下载 | 删除 |

旧文件均无 `Cache-Control` 头。

## 2. 准备

| 项目 | 说明 |
| --- | --- |
| 上传工具 | [ossutil](https://help.aliyun.com/zh/oss/developer-reference/ossutil-overview)（推荐，可删除旧文件）；或 OSS 控制台「文件列表 → 上传文件」（只能上传，不能批量清理旧文件） |
| 访问密钥 | 新建 RAM 子账号，只授予 `linkxcapital` 的读写权限，不要用主账号 AccessKey |
| ossutil 配置 | `ossutil config`，Endpoint 填 `oss-cn-beijing.aliyuncs.com`，地域 `cn-beijing` |
| 本机环境 | Node.js 22.12 或以上，能拉取本仓库 |

## 3. 构建正式版本

```bash
git pull
npm ci
npm run build:production
```

最后一行出现 `Verified … bilingual content pages` 才算成功。构建会自动：

- 所有地址、canonical、hreflang、sitemap、结构化数据使用 `https://www.linkxcap.com`，不含 `/linkxcap` 预览路径或 GitHub 域名；
- 正式页面不带 `noindex`；删除内容编辑页及其脚本、数据；
- 生成 `robots.txt`、`sitemap.xml`、`llms.txt`、`llms-full.txt`、`404.html`；
- 生成旧地址跳转页：`contact.html` → `fellowship.html`、`portfolio-1.html` → `portfolio.html`、`team-elliot.html` → `team-elliott.html`（中英文各一份）；
- 带上 Google Search Console 验证文件 `googlea0e97b0ecf2a0a58.html`（源文件在 `public/`，与线上原文件逐字节相同），不要删除或改名。

可选的本地预览：

```bash
cd dist && python3 -m http.server 8080
```

## 4. 备份旧官网

版本控制可以找回 30 天内的旧版本；另外再下载一份完整备份，方便整体回滚：

```bash
ossutil cp -r oss://linkxcapital/ ./backup-linkxcap-20261010/
```

## 5. 上传新网站

先传资源，再传页面，最后清理旧文件。这样任何时候线上页面引用的图片、字体、脚本都已存在。

### 5.1 资源（图片、字体、脚本、样式等）

```bash
ossutil cp -r dist/ oss://linkxcapital/ --exclude "*.html" -f
```

### 5.2 页面

```bash
ossutil cp -r dist/ oss://linkxcapital/ --include "*.html" -f
```

### 5.3 调整静态页面设置

OSS 控制台 → `linkxcapital` → 数据管理 → 静态页面 → 设置：

- 子目录首页：**开通**（文件 404 规则保持 Redirect）
- 默认 404 页：改为 **`404.html`**
- 默认首页 `index.html`、错误文档响应码 404 保持不变

### 5.4 验证（见第 6 步）无误后，清理旧文件

```bash
ossutil sync dist/ oss://linkxcapital/ --delete -f
```

`--delete` 会删除 Bucket 中所有不在 `dist/` 里的文件（第 1.4 节列出的旧页面、旧图片、`tools/` 等）。执行前确认第 4 步备份已完成，且 `dist/googlea0e97b0ecf2a0a58.html` 存在（构建会自动带上）。

> 命令以 ossutil 2.0 为例；1.x 版本参数基本相同，执行前可用 `ossutil cp --help` 核对。

### 缓存与文件类型（建议）

旧文件都没有缓存头。新站带内容哈希的文件可以长期缓存，HTML 和索引文件要及时更新：

| 路径 | Cache-Control |
| --- | --- |
| `_astro/*`、`fonts/*` | `public, max-age=31536000, immutable` |
| `assets/*`、`company/*` | `public, max-age=86400` |
| `*.html`、`robots.txt`、`sitemap.xml`、`llms.txt`、`llms-full.txt` | `no-cache` |

上传时可附带缓存头（ossutil 2.0 用 `--cache-control "…"`，1.x 用 `--meta "Cache-Control:…"`）。`robots.txt`、`llms.txt`、`llms-full.txt` 含中文，内容类型应为 `text/plain; charset=utf-8`，否则浏览器可能显示乱码。

## 6. 上线验证

| 检查 | 预期 |
| --- | --- |
| `https://www.linkxcap.com/` | 跳到 `/zh/index.html`，显示新首页 |
| `/zh/`、`/en/` | 分别显示中文、英文首页（需第 5.3 步开通子目录首页） |
| `/zh/contact.html`、`/zh/portfolio-1.html`、`/zh/team-elliot.html`（及英文） | 跳到 Fellowship、投资组合、王璞页面 |
| 投资组合、公司详情、团队、洞察、Fellowship、法律声明 | 中英文都能打开，刷新不报错 |
| `/robots.txt`、`/sitemap.xml`、`/llms.txt`、`/llms-full.txt` | 能打开，网址都是 `https://www.linkxcap.com/…` |
| `/googlea0e97b0ecf2a0a58.html` | 仍能打开 |
| 不存在的地址，如 `/zh/abc.html` | 显示新站 404 页，状态码 404 |
| 内容编辑页、`/tools/verify-seo.mjs` | 不存在（清理后返回 404） |
| `http://linkxcap.com/zh/index.html` | 301 到 `https://www.linkxcap.com/zh/index.html` |
| 手机和电脑各看一遍 | 动画、星图、图片、字体正常 |

## 7. 回滚

两种方式：

1. **整体回滚**：把第 4 步的备份传回，并把静态页面设置改回原值（子目录首页未开通、默认 404 页 `index.html`）。

   ```bash
   ossutil sync ./backup-linkxcap-20261010/ oss://linkxcapital/ --delete -f
   ```

2. **单个文件**：30 天内在「文件列表」右上角选择「显示历史版本」，恢复对应文件的旧版本。

## 8. 上线后（SEO / GEO）

1. Google Search Console 已通过 `googlea0e97b0ecf2a0a58.html` 验证过本站，直接在原有资源里提交 `https://www.linkxcap.com/sitemap.xml`。
2. 在 [Bing Webmaster Tools](https://www.bing.com/webmasters)、[百度搜索资源平台](https://ziyuan.baidu.com/) 验证并提交同一个 sitemap。
3. 旧 sitemap 使用不带 www 的 `https://linkxcap.com/…`。新站统一以 `https://www.linkxcap.com` 为标准地址；`http://linkxcap.com` 已经 301 到 www，`https://linkxcap.com` 超时的问题见 1.2。
4. 公众号、领英、X 等对外账号里的官网链接改为 `https://www.linkxcap.com/zh/index.html`（或 `/en/index.html`）。
5. D7、D30 按 [GEO 方案第 7 节](geo.md#7-发布后的-ai-验证方法) 在 ChatGPT、Claude、Gemini、豆包等实测并记录。

## 以后更新网站

改完内容后重复第 3、5.1、5.2、6 步；有页面删除时再执行 5.4。静态页面设置只需调整一次。GitHub Pages 预览（`zivyangll.github.io/linkxcap`）照常由推送 `main` 自动更新，两者互不影响。
