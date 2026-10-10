---
name: deploy-oss
description: Deploy or update the production site www.linkxcap.com on Alibaba Cloud OSS (bucket linkxcapital, cn-beijing). Builds the production version, backs up the live bucket, uploads with cache headers, verifies the live site, and optionally removes old files. Use when the user asks to deploy, publish, release, go live, update the official site / 正式站 / 线上官网 / 阿里云 / OSS, or 部署更新.
---

# 部署 www.linkxcap.com 到阿里云 OSS

正式站托管在阿里云 OSS 静态网站（Bucket `linkxcapital`，华北2 北京，无 CDN）。所有执行步骤都在 `scripts/deploy-oss.sh` 里，本 skill 规定如何调用它。背景、现有配置和手动步骤见 `docs/16-阿里云OSS部署与上线.md`。

GitHub Pages 预览（`zivyangll.github.io/linkxcap`）由推送 `main` 自动发布，与本 skill 无关。

## 规则

- **不处理密钥**：不要读取、输入、打印或保存 AccessKey，也不要替用户执行 `ossutil config`。凭证由用户自己配置。
- **调用本 skill 即授权上传**：用户要求部署时，可以直接执行构建、备份、上传和验证。
- **删除旧文件每次都要确认**：`--prune --yes` 会删除 Bucket 里不在 `dist/` 中的文件。必须先运行 `--prune --dry-run`，把要删除的文件列表给用户看，得到明确同意后才能执行。
- **不改 OSS 设置**：静态页面、域名、证书等设置由用户在控制台修改。如果验证提示设置不对，告诉用户去哪里改，不要自行改动。
- 部署前代码应已提交。脚本发现未提交改动时会警告；先问用户是否先提交，或者确认就部署当前工作区。

## 首次使用准备（只需一次）

1. 检查是否已安装 ossutil 2.x：`ossutil version`。
   - 未安装时，先征得用户同意再下载。来源是阿里云官方地址：
     - Apple 芯片：`https://gosspublic.alicdn.com/ossutil/v2/2.4.0/ossutil-2.4.0-mac-arm64.zip`
     - Intel：`https://gosspublic.alicdn.com/ossutil/v2/2.4.0/ossutil-2.4.0-mac-amd64.zip`
   - 解压后把 `ossutil` 放到 `PATH` 中的目录（如 `~/.local/bin`，不需要 sudo），并 `chmod 755`。
   - 最新版本和校验值见 <https://help.aliyun.com/zh/oss/developer-reference/install-ossutil2>。
2. 请用户在自己的终端运行 `ossutil config`：
   - 填写只能读写 `linkxcapital` 的 RAM 子账号的 AccessKey；
   - Region 填 `cn-beijing`，Endpoint 直接回车（默认 `oss-cn-beijing.aliyuncs.com`）。
3. 确认静态页面设置（OSS 控制台 → `linkxcapital` → 数据管理 → 静态页面）：
   - 子目录首页：开通（文件 404 规则 Redirect）；
   - 默认 404 页：`404.html`；
   - 默认首页：`index.html`。

   2026-10-10 核对时子目录首页**未开通**、默认 404 页为 `index.html`，首次部署时需要用户修改。验证步骤会检查这两项。

## 部署流程

1. **试运行**：

   ```bash
   scripts/deploy-oss.sh --dry-run
   ```

   这一步会检查 ossutil 和 Bucket 访问、执行 `npm run build:production`、检查产物，并用 ossutil 的 `-n` 预演上传，不会改动线上。任何 `ERROR` 都要先解决，再继续。

2. **上传并验证**：

   ```bash
   scripts/deploy-oss.sh --skip-build
   ```

   - 先把整个 Bucket 备份到 `.cache/oss-backups/<时间>/`（已被 git 忽略）。
   - 按顺序上传：`_astro/`、`fonts/` 设为 `immutable` 长缓存；图片和 logo 缓存一天；`robots.txt`、`sitemap.xml`、`llms*.txt` 设为 `no-cache` 和 UTF-8；所有 HTML 最后上传，设为 `no-cache`。
   - 上传后逐项验证线上：新页面与 `dist/` 逐字节一致、`/zh/`、`/en/`、旧地址跳转、404 页、robots/sitemap/llms、Google 验证文件、编辑页不公开、缓存头。

   `--skip-build` 复用第 1 步的构建。如果中间改过代码，去掉这个参数重新构建。

3. **处理验证结果**：
   - 只有 `/zh/`、`/en/` 或 404 页失败：多半是静态页面设置没改（见首次使用第 3 步），请用户在控制台修改后运行 `scripts/deploy-oss.sh --verify-only`。
   - 页面不是新构建：重新运行第 2 步。仍失败时，用 `curl -I` 看对应地址的响应头并报告给用户。

4. **清理旧文件**（可选；页面有删除或改名，或首次替换旧站时需要）：

   ```bash
   scripts/deploy-oss.sh --prune --dry-run --skip-build
   ```

   把将被删除的文件列表交给用户确认。首次替换旧站时，列表应包含旧站根目录的 `*.html`、`image*.png`、`insights/`、`tools/`、旧 `assets/` 等；**不应**包含 `googlea0e97b0ecf2a0a58.html`（Google 验证文件，已在 `public/` 中）。用户同意后：

   ```bash
   scripts/deploy-oss.sh --prune --yes --skip-build
   ```

   脚本会先验证线上，验证不通过就拒绝删除；删除后再验证一次。

5. **汇报**：告诉用户部署的提交号、验证结果、备份目录位置，以及是否清理了旧文件。正式站地址是 <https://www.linkxcap.com/zh/index.html> 和 <https://www.linkxcap.com/en/index.html>。

## 回滚

- **整体回滚**：备份在 `.cache/oss-backups/<时间>/`，先征得用户同意再执行：

  ```bash
  ossutil sync .cache/oss-backups/<时间>/ oss://linkxcapital/ --delete -f
  ```

  如果是回滚到旧站，还要请用户把静态页面设置改回原值。
- **单个文件**：Bucket 开启了版本控制，30 天内可在控制台「文件列表 → 显示历史版本」中恢复。

## 只检查线上

```bash
scripts/deploy-oss.sh --verify-only
```

这个命令会对比线上与本地 `dist/`，所以要先运行 `npm run build:production`，并且本地代码与已部署的提交一致。
