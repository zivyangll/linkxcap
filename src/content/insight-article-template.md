---
# 模板文件不会参与网站构建。复制后请删除这些注释，并保存到：
# src/content/insights/<route>.zh.md 或 <route>.en.md

# 同一篇文章的中英文文件必须使用相同 id，且不可与其他文章重复。
id: 'replace-with-article-id'

# 详情页路径，不含语言、斜杠和 .html。
# 中英文文件使用相同 route，例如生成 /zh/example-article.html 和 /en/example-article.html。
route: 'example-article'

# 必须等于 src/data/content.json -> insights.filters 中某个具体筛选项的 id。
# 可用值目前为 applications、models、portfolio、panorama；all 不能用于文章。
category: 'applications'

# 发布日期，固定为 YYYY-MM-DD。
date: '2026-09-23'

# 原文链接只允许安全的完整 URL，例如 https://...。
source_url: 'https://example.com/original-article'

# 洞察列表按数字从小到大排列。中英文文件建议保持一致，且避免重复。
order: 0

# 中文文件填写 zh，英文文件填写 en。
lang: 'zh'

# 详情页标题与摘要。
title: '文章详情页标题'
summary: '文章详情页摘要，同时用于页面 SEO 描述。'

# 洞察列表中的标题与摘要；允许与详情页内容不同。
list_title: '洞察列表标题'
list_summary: '洞察列表摘要。'

# 原文链接旁显示的来源名称。
source_name: '原文来源名称'
---

## 第一章节标题

正文从二级标题开始；页面模板会自动显示文章一级标题。

普通段落可以包含 **加粗文字**、_斜体文字_ 和[安全链接](https://example.com)。

### 小节标题

- 无序列表第一项
- 无序列表第二项

1. 有序列表第一项
2. 有序列表第二项

> 这里可以填写引用内容。

## 第二章节标题

继续填写文章正文。不要在正文中加入脚本、iframe 或依赖自定义 HTML 的交互内容。
