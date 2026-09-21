# Link-X Capital · 星连资本


按照 Figma `final` 桌面稿实现的中英文品牌官网。Astro 静态生成、TypeScript、CSS/SVG、GSAP ScrollTrigger 和 Canvas 2D；服务器无需 Node.js 或数据库。

## 本地开发

```sh
npm ci
npm run dev
```

开发地址：`http://127.0.0.1:4321/linkxcap/zh/index.html`。

```sh
npm run build
npm run preview
npx playwright install chromium webkit
npm test
```

`build` 同时执行类型检查、70 个内容页面的路由／资源／SEO 校验，以及压缩体积预算检查。`dist/` 是可直接部署的纯静态成品。Node.js 22.12+；锁文件已提交。

## 页面范围

| 内容                                   | 每种语言的页面数 | 地址示例                      |
| -------------------------------------- | ---------------: | ----------------------------- |
| 首页、投资组合、团队、洞察、联系、法律 |                6 | `/zh/portfolio.html`          |
| 投资组合详情                           |               19 | `/en/portfolio/zhipu-ai.html` |
| 人物详情                               |                4 | `/zh/team-alex.html`          |
| 文章详情                               |                6 | `/en/portfolio-yuanmu.html`   |

共 70 个双语内容页面，另有根入口和 404。Fellow 合并到首页和联系页。

## 内容维护

| 位置                                      | 修改内容                                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/lib/site.ts`                         | 双语 UI、公司排序与 Logo 对照、投资方向、团队资料、外部社交链接                              |
| `src/data/companies-source.json`          | 从现官网整理的 19 家公司双语资料，待公司最终审核                                             |
| `src/content/articles/*.zh.md`、`*.en.md` | 每篇文章的标题、摘要、日期、正文、分类、原文地址；中英文使用相同 `route` 和 `translationKey` |
| `src/components/`                         | Figma 对应的页面模块                                                                         |
| `src/styles/global.css`                   | 设计变量、桌面布局、交互状态和响应式断点                                                     |
| `public/assets/figma/`                    | 已永久保存的 Figma 原图及优化版本，无远程临时素材依赖                                        |
| `src/data/assets.json`                    | 页面使用的素材映射，保留 Figma 原始节点对应关系                                              |

当前是 **mock 设计预览**：文章正文／英文译稿、人物简介、部分投资方向介绍及统计数字待审核。预览设置 `noindex,follow`；正式内容替换并验收后，才将 `PUBLIC_CONTENT_MODE` 改为 `production`。

### 字体更新

Source Han Serif SC、LXGW Neo XiHei、Source Serif 4 均本地托管，许可证在 `public/licenses/`。字体按实际用字和页面优先级拆分，原设计字体仍保持一致。

新增中文后，浏览器可使用系统宋体作为缺字回退；正式交付应重新生成子集：

1. 将官方原始字体放入 `.cache/fonts/SourceHanSerifSC-VF.otf` 和 `.cache/fonts/LXGWNeoXiHei.ttf`。
2. 本地预览运行时执行 `node scripts/collect-font-usage.mjs`。
3. 在安装 `fonttools[woff]` 的 Python 环境运行 `python scripts/subset-fonts.py`。
4. 重建并检查文字。生成字体和 `src/data/fonts.json` 一起提交。CI 使用已提交子集，不下载大字体。

字体来源和使用范围见 [实现与维护说明](docs/04-实现与维护说明.md)。

## GitHub Pages

源码与网站统一保存在公开仓库 `zivyangll/linkxcap`。工作流 `.github/workflows/pages.yml` 在 `main` 更新时构建和发布。

在线预览：<https://zivyangll.github.io/linkxcap/>。

- `SITE_URL=https://zivyangll.github.io`
- `SITE_BASE=/linkxcap`
- 页面地址、字体、图片、canonical、hreflang、sitemap 均处理项目子路径。
- Pages 设置选择 **GitHub Actions**；发布产物仅为 `dist/`。
- 根地址默认进入中文，页内可切换相同页面的英文版。
- 没有 SPA 回退；所有详情页都有实体 `.html`，直接访问和刷新可用。

迁移至 `www.linkxcap.com` 时，把 `SITE_URL` 改为正式域名，`SITE_BASE` 改为 `/`，重建后上传 `dist/`。自定义域名和 DNS 变更需另行配置；本次预览未更改现有官网。

## 文档

- [技术方案与素材清单](docs/README.md)
- [实现与维护说明](docs/04-实现与维护说明.md)
- [验收记录](docs/05-验收记录.md)
