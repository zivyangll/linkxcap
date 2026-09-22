# 洞察文章 Markdown 模板与筛选关联

日期：2026-09-23。

## 1. 模板位置

可复制的完整模板：

```text
src/content/insight-article-template.md
```

该文件放在洞察文章集合目录之外，因此只作为模板，不会生成文章页面。正式文章必须放入：

```text
src/content/insights/
```

建议一篇文章创建两个文件：

```text
src/content/insights/<route>.zh.md
src/content/insights/<route>.en.md
```

例如：

```text
src/content/insights/ai-agent-manufacturing.zh.md
src/content/insights/ai-agent-manufacturing.en.md
```

## 2. 新增文章步骤

1. 复制 `src/content/insight-article-template.md` 两次，分别保存为 `<route>.zh.md` 和 `<route>.en.md`。
2. 两个文件填写相同的 `id`、`route` 和 `category`，并建议保持 `date`、`order` 一致。
3. 中文文件填写 `lang: 'zh'` 和中文文案；英文文件填写 `lang: 'en'` 和英文文案。
4. 将 `category` 填为“洞察内容”筛选项中的一个具体 `id`，对应关系见下一节。
5. 从 `##` 二级标题开始填写正文。页面会使用 `title` 自动输出一级标题，不需要在正文中再写 `# 标题`。
6. 执行 `npm run build`。构建会检查双语配对、路由重复、字段格式和筛选项关联。

## 3. 文章如何关联筛选项

筛选项在以下位置维护：

```text
src/data/content.json -> insights.filters
```

文章使用 frontmatter 中的 `category` 与筛选项的 `id` 精确关联：

```yaml
category: 'applications'
```

对应配置：

```json
{
  "id": "applications",
  "label_cn": "应用",
  "label_en": "Applications"
}
```

`id` 是程序关联值，`label_cn` 和 `label_en` 是页面显示文字。修改显示文字不会影响文章关联；修改 `id` 后，必须同步修改所有相关文章的 `category`。

当前筛选项如下：

| 筛选项 ID      | 中文显示 | 英文显示     | 文章能否使用                       |
| -------------- | -------- | ------------ | ---------------------------------- |
| `all`          | 全部     | All          | 不能。它只用于在页面上显示全部文章 |
| `applications` | 应用     | Applications | 可以                               |
| `models`       | 模型     | Models       | 可以                               |
| `portfolio`    | 投资组合 | Portfolio    | 可以                               |
| `panorama`     | 全景观察 | Panorama     | 可以                               |

在隐藏配置编辑页的“洞察公共设置 → 洞察内容”中可以修改现有筛选项的中英文显示文字。文章文件本身不进入 JSON 编辑器。新增或删除筛选项时，需直接修改 `content.json` 的 `insights.filters` 数组，并同步检查 Markdown 中的 `category`。

## 4. Frontmatter 字段说明

| 字段           | 必填 | 中英文文件关系 | 说明与示例                                  |
| -------------- | ---- | -------------- | ------------------------------------------- |
| `id`           | 是   | 必须相同       | 文章稳定标识，例如 `ai-agent-manufacturing` |
| `route`        | 是   | 必须相同       | 详情页路径，例如 `ai-agent-manufacturing`   |
| `category`     | 是   | 必须相同       | 必须对应具体筛选项 `id`，不能使用 `all`     |
| `date`         | 是   | 建议相同       | 发布日期，格式 `YYYY-MM-DD`                 |
| `source_url`   | 是   | 可不同         | 中英文原文地址，必须是安全的完整 URL        |
| `order`        | 是   | 建议相同       | 列表按数字从小到大排序，从 `0` 开始         |
| `lang`         | 是   | 必须不同       | 中文为 `zh`，英文为 `en`                    |
| `title`        | 是   | 分别填写       | 详情页标题                                  |
| `summary`      | 是   | 分别填写       | 详情摘要及 SEO 描述                         |
| `list_title`   | 是   | 分别填写       | 洞察列表显示标题                            |
| `list_summary` | 是   | 分别填写       | 洞察列表显示摘要                            |
| `source_name`  | 是   | 分别填写       | 原文链接旁显示的来源名称                    |

`route: 'ai-agent-manufacturing'` 会生成：

```text
/zh/ai-agent-manufacturing.html
/en/ai-agent-manufacturing.html
```

## 5. 正文可用格式

正文支持常用 Markdown：二级和三级标题、段落、加粗、斜体、列表、引用和安全链接。发布时会清理不允许的 HTML 标签、属性和危险协议。

```markdown
## 观察起点

这里是正文段落，可以使用 **加粗内容** 和[外部链接](https://example.com)。

### 关键发现

- 第一项
- 第二项

> 这里是一段引用。
```

不要在正文中加入脚本、iframe、事件属性或必须依赖自定义 HTML 才能工作的交互内容。

## 6. 构建校验

`npm run build` 会阻止以下错误进入发布产物：

- 同一语言出现重复 `route`；
- 同一文章出现重复的 `id + lang`；
- 只有中文或只有英文，缺少双语配对；
- 同一文章的中英文文件使用了不同的 `route` 或 `category`；
- `category` 不存在于筛选项中；
- 使用保留筛选项 `all` 作为文章分类；
- 日期、链接、布尔值、排序数字或必填文案格式错误。

构建提示会包含出错文章的 `id`、语言和 `category`，便于定位对应 Markdown 文件。
