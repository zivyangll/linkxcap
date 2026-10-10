# 阿里云 OSS 部署与上线（替换 www.linkxcap.com）

更新日期：2026-10-10。

新官网沿用旧官网的部署方式：**阿里云 OSS 静态网站托管**。旧站响应头为 `Server: AliyunOSS`，`www.linkxcap.com` 已经绑定在某个 OSS Bucket 上，备案和 HTTPS 也已就绪。上线就是把新的 `dist/` 上传到这个 Bucket，替换旧文件。网站是纯静态 HTML，不需要服务器、Node 进程或数据库。

SEO/GEO 的设计见 [SEO 方案](seo.md) 和 [GEO 方案](geo.md)。

## 0. 准备

| 项目 | 说明 |
| --- | --- |
| 阿里云账号 | 能进入 OSS 控制台，并找到旧官网所在的 Bucket |
| 找到 Bucket | OSS 控制台 → Bucket 列表 → 逐个查看「Bucket 配置 → 域名管理」，绑定了 `www.linkxcap.com` 的就是它；同时记下 Endpoint（地域） |
| 是否有 CDN | 在「域名管理」里看该域名是否开启了 CDN 加速；开启了就要在第 6 步刷新 CDN 缓存 |
| 上传工具 | 推荐 [ossutil](https://help.aliyun.com/zh/oss/developer-reference/ossutil-overview)。也可以用 OSS 控制台或 ossbrowser 图形界面上传 |
| 访问密钥 | 建议新建 RAM 子账号，只授予这个 Bucket 的读写权限，不要使用主账号 AccessKey |
| 本机环境 | Node.js 22.12 或以上，能拉取本仓库 |

## 1. 构建正式版本

```bash
git pull
npm ci
npm run build:production
```

`build:production` 等于用以下参数构建：

```bash
SITE_URL=https://www.linkxcap.com SITE_BASE=/ PUBLIC_CONTENT_MODE=production npm run build
```

最后一行出现 `Verified … bilingual content pages` 才算成功。构建会自动完成这些检查和处理：

- 所有地址、canonical、hreflang、sitemap、结构化数据使用 `https://www.linkxcap.com`，不含 `/linkxcap` 预览路径或 GitHub 域名；
- 正式页面不带 `noindex`；
- 删除内容编辑页及其脚本、数据文件，不对外发布；
- 生成 `robots.txt`、`sitemap.xml`、`llms.txt`；
- 生成旧站地址的跳转页：`contact.html` → `fellowship.html`、`portfolio-1.html` → `portfolio.html`、`team-elliot.html` → `team-elliott.html`（中英文各一份）。

产物在 `dist/`，结构与网站根目录一一对应。

## 2. 本地预览正式版本（可选）

```bash
cd dist && python3 -m http.server 8080
```

打开 `http://127.0.0.1:8080/`，应自动进入 `/zh/index.html`。看完后回到仓库根目录。

## 3. 备份旧官网（必须）

上线前完整下载一份旧站，出问题时可以原样恢复：

```bash
ossutil config
ossutil cp -r oss://<Bucket名>/ ./backup-linkxcap-20261010/
```

`ossutil config` 按提示填入 AccessKey 和 Endpoint。也可以在 Bucket 开启「版本控制」，覆盖或删除的文件都能找回。

## 4. 上传新网站

先传资源，再传页面，最后清理旧文件。这样任何时候线上页面引用的图片、字体、脚本都已存在。

```bash
# 4.1 资源（图片、字体、脚本、样式等）
ossutil cp -r dist/ oss://<Bucket名>/ --exclude "*.html" -f

# 4.2 页面
ossutil cp -r dist/ oss://<Bucket名>/ --include "*.html" -f
```

上传后按第 7 步验证。确认无误后，删除新站里已经不存在的旧文件（旧页面、旧图片等）：

```bash
# 4.3 让 Bucket 与 dist/ 完全一致：删除 dist/ 中没有的旧文件
ossutil sync dist/ oss://<Bucket名>/ --delete -f
```

`--delete` 会删除 Bucket 里所有不在 `dist/` 中的文件，执行前确认第 3 步的备份已完成，且 Bucket 里没有其他业务的文件。不确定时先用 `ossutil ls oss://<Bucket名>/` 查看。

> 命令以 ossutil 2.0 为例；1.x 版本的参数基本相同，执行前可用 `ossutil cp --help` 核对。

### 缓存与文件类型（建议）

带内容哈希的文件可以长期缓存，HTML 和索引文件要及时更新：

| 路径 | Cache-Control |
| --- | --- |
| `_astro/*`、`fonts/*` | `public, max-age=31536000, immutable` |
| `assets/*`、`company/*` | `public, max-age=86400` |
| `*.html`、`robots.txt`、`sitemap.xml`、`llms.txt` | `no-cache` |

上传时可附带缓存头（ossutil 2.0 用 `--cache-control "…"`，1.x 用 `--meta "Cache-Control:…"`），或在 CDN 的缓存规则里配置。`llms.txt`、`robots.txt` 含中文，内容类型应为 `text/plain; charset=utf-8`，否则浏览器可能显示乱码。

## 5. 静态页面设置

OSS 控制台 → Bucket → 数据管理 → 静态页面，确认（旧站应该已经这样配置）：

| 设置 | 值 |
| --- | --- |
| 默认首页 | `index.html` |
| 子目录首页 | 开通（`/zh/`、`/en/` 才能打开对应首页，旧站 sitemap 使用这种地址） |
| 默认 404 页 | `404.html` |

## 6. 刷新 CDN（如有）

如果域名开了 CDN：CDN 控制台 → 刷新预热 → 目录刷新，提交 `https://www.linkxcap.com/`（和 `https://linkxcap.com/`，如果也在使用）。

## 7. 上线验证

| 检查 | 预期 |
| --- | --- |
| `https://www.linkxcap.com/` | 跳到 `/zh/index.html`，显示新首页 |
| `/zh/`、`/en/` | 显示对应语言首页 |
| `/zh/contact.html`、`/zh/portfolio-1.html`、`/zh/team-elliot.html`（及英文） | 跳到 Fellowship、投资组合、王璞页面 |
| 投资组合、公司详情、团队、洞察、Fellowship、法律声明 | 中英文都能打开，刷新不报错 |
| `/robots.txt`、`/sitemap.xml`、`/llms.txt` | 能打开，网址都是 `https://www.linkxcap.com/…` |
| 不存在的地址，如 `/zh/abc.html` | 显示 404 页 |
| 内容编辑页 | 不存在（返回 404） |
| 手机和电脑各看一遍 | 动画、星图、图片、字体正常 |

## 8. 回滚

把第 3 步的备份原样传回：

```bash
ossutil sync ./backup-linkxcap-20261010/ oss://<Bucket名>/ --delete -f
```

有 CDN 时再刷新一次。

## 9. 上线后（SEO / GEO）

1. 在 [Google Search Console](https://search.google.com/search-console)、[Bing Webmaster Tools](https://www.bing.com/webmasters)、[百度搜索资源平台](https://ziyuan.baidu.com/) 验证 `www.linkxcap.com` 并提交 `https://www.linkxcap.com/sitemap.xml`。
2. 旧站 sitemap 使用不带 www 的 `https://linkxcap.com/…`。新站统一以 `https://www.linkxcap.com` 为标准地址（页面里的 canonical 已指向 www）。如果使用 CDN，建议在 CDN 上把 `linkxcap.com` 301 跳到 `www.linkxcap.com`；纯 OSS 无法按域名跳转，保持两个域名都能访问即可。
3. 公众号、领英、X 等对外账号里的官网链接改为 `https://www.linkxcap.com/zh/index.html`（或 `/en/index.html`）。
4. D7、D30 按 [GEO 方案第 7 节](geo.md#7-发布后的-ai-验证方法) 在 ChatGPT、Claude、Gemini、豆包等实测并记录。

## 以后更新网站

改完内容后重复第 1、4、6、7 步（备份可按需）。GitHub Pages 预览（`zivyangll.github.io/linkxcap`）照常由推送 `main` 自动更新，两者互不影响。
