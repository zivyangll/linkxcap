# LinkX Capital · 星连资本

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

`build` 同时执行类型检查、所有内容页面的路由／资源／SEO 校验，以及压缩体积预算检查。每页实际加载的 CSS（外部样式表和内联样式）须不超过 35 KiB gzip；各独立页面的 CSS 不相加判定，站点总量仍记录在 `.cache/build-report.json`。`dist/` 是可直接部署的纯静态成品。Node.js 22.12+；锁文件已提交。

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

### 被投企业名单与顺序

被投企业以 `docs/被投企业汇总_V6.csv` 为准：名单、名称、文案、官网和分类标签都取自该表，作品集页和公司轨道的展示顺序与 CSV 行顺序一致（不再按英文名排序）。

| 命令                      | 作用                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm run portfolio:sync`  | 按 CSV 重新生成 `src/data/content.json` 的公司列表（含顺序）和 `docs/portfolio-v6-classification-audit.json` |
| `npm run portfolio:check` | 只校验，不写文件：对比 CSV 与站点数据，输出缺失和未列入的公司                                                |

增删公司或调整顺序：修改 CSV（新增公司需先在 `public/company` 放入 Logo）→ `npm run portfolio:sync` → `npm run build`。若首末公司变化，同步更新 `tests/meeting-revision.spec.ts` 中公司轨道的首末项（当前为 `zhipu-ai`、`ligit`）。

### 字体更新

全站中英文、PC 和 H5 统一使用自托管的思源宋体（Source Han Serif SC）。`public/fonts/` 包含拉丁和中文两个 WOFF2 子集，保留 250–900 可变字重；文件名包含内容哈希以更新浏览器缓存。许可证在 `public/licenses/`。

修改文案后重新生成字体子集：

1. 将官方原始字体放入 `.cache/fonts/SourceHanSerifSC-VF.otf`。
2. 在安装 `fonttools[woff]` 的 Python 环境运行 `python scripts/subset-fonts.py`。
3. 重建并检查，生成字体和 `src/data/fonts.json` 一起提交。

字体来源和使用范围见 [字体说明](public/licenses/FONT-NOTICE.md)。

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
