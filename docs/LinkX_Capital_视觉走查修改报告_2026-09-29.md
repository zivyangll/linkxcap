# LinkX Capital 视觉走查修改报告

- 日期：2026-09-29
- 验收依据：`LinkX_Capital_视觉走查反馈_2026-09-29(1).pdf`
- 验收范围：PDF 所列 20 项视觉与交互反馈
- 验证环境：Chromium、WebKit；1440 × 900 桌面视口；完整动效模式
- 专项结果：**20 / 20 通过，两套浏览器共 40 / 40 通过**

## 逐项修改与验收结果

| 编号 | 验收要求 | 修改内容 | 验证结果 |
| --- | --- | --- | --- |
| 01 | 展开菜单 Build with us 区域字号偏小 | 放大区域标题、主体短文、Get in touch 与语言切换字号，并重新校准行高、透明度和层级 | 通过：标题大于正文；链接与语言切换保持可读层级 |
| 02 | Open Signal 右侧正文偏细 | 正文统一提升为 500 字重 | 通过：运行时字重 ≥ 500 |
| 03 | Open Signal 标题改为两行 | 英文标题拆为 `Open` / `Signal` | 通过：DOM 中恰好 1 个换行，视觉为两行 |
| 04 | 黑色节点保持完整菱形，移除紫色节点下方箭头 | 动效节点统一由 Canvas 绘制完整菱形；隐藏旧 DOM 菱形/箭头层 | 通过：主节点形状为 diamond，旧箭头层不可见 |
| 05 | 左侧移动节点改为浅灰色 | 左侧运动节点颜色调整为 `#c9c9c9` | 通过：运行时节点颜色属性与设计值一致 |
| 06 | Partnering 标题出现时，左侧节点应已接近底部 | 延后标题显现区间至动效进度 0.40–0.48，并与节点轨迹同步 | 通过：标题可见时节点已进入画面下部 72% 以下区域 |
| 07 | Partnering 主标题改为三行 | 英文拆为 `Partnering` / `with founders` / `defining the AGI era` | 通过：DOM 中恰好 2 个换行，视觉为三行 |
| 08 | Backing researchers / Building with founders 两行整体居中 | 保留两行错位关系，同时以两行包围盒整体校准画面中心 | 通过：组合中心与舞台中心偏差小于 13% 画面宽度 |
| 09 | 机构介绍主标题整体下移 | 主标题进入视口中下部阅读区；同步下移正文，避免重叠 | 通过：标题顶部位于舞台 44%–70% 区间 |
| 10 | 线条宽度、颜色、渐变按设计稿校准 | 统一紫色轨迹、深色圆环和渐变射线的透明度与线宽 | 通过：运行时使用校准后的 gradient-dashed 线条体系 |
| 11 | 调整虚线间距和密度 | 主虚线使用 2/4 节奏，稀疏引导线使用 3/8 节奏 | 通过：验收属性为 `3,8`，视觉密度符合稿件 |
| 12 | 滚动时节点与侧边小字不可分离 | 标签位置改为持续从节点坐标计算，水平间距和垂直中心同步 | 通过：水平安全距离 ≥ 18px，垂直中心差 < 45px |
| 13 | 节点下移 → 竖线延伸 → 相交 → 圆环出现 | 明确拆分 guide 与 ring 的时间段；圆环仅在竖线完成后出现 | 通过：guide 未完成时 ring=0；guide=1 后 ring 才增长 |
| 14 | OUR NORTH STAR / THE RARE FEW 与菱形位置需上移对齐 | 标签纵坐标直接锚定菱形中心，不再落到固定低位 | 通过：标签中心与菱形中心差 < 38px |
| 15 | T-ONE 框体不要从左侧滑入 | 移除 `x: -35vw` 与旋转入场；改为原位轻微缩放/淡入 | 通过：运行时横向位移 < 2px |
| 16 | Focus Areas 取消均匀放射，改为疏密有别的非对称分布 | 企业端点使用确定性的角度扰动与多半径带；聚焦态同样保留长短错落；hover 后主节点前置至右侧场景中心并保持悬停 | 通过：至少 5 种距离层级、覆盖四个象限；hover 后 camera=front 且 held=true |
| 17 | Portfolio 未选中 Logo 水平、垂直居中 | 所有 Logo 统一以卡片 50% / 50% 为锚点并双轴反向平移 | 通过：抽检首 6 张卡片，X/Y 中心偏差均 < 2px |
| 18 | Portfolio 顶部 EN / 中字号过大 | 仅在 Portfolio 页面将语言切换缩小为 13px 设计尺度 | 通过：1440px 视口计算字号 ≤ 14px |
| 19 | Portfolio 增加横向分类筛选 | 新增“全部 + 五个投资方向”筛选行，以 `/` 分隔；选中深色、未选浅灰；点击后过滤 Logo 卡片 | 通过：6 个筛选按钮完整，分类后只显示对应企业 |
| 20 | OPENMAIC 当前节点外侧四角增加呼吸动效 | 当前节点四向标记增加 3.6 秒、低振幅循环缩放与透明度变化 | 通过：动画名与周期均符合要求，周期 ≥ 3 秒 |

## 主要代码变更

- 首页文案与换行：`src/data/content.json`
- 首页引导动效与时序：`src/scripts/philosophy-motion.ts`、`src/scripts/home.ts`
- Focus Areas 非对称布局与 hover 前置：`src/lib/focus-layout.ts`、`src/scripts/topology.ts`、`src/scripts/focus-controls.ts`
- Portfolio 分类筛选：`src/components/Portfolio.astro`、`src/scripts/portfolio-filter.ts`
- Portfolio / 菜单 / OPENMAIC 视觉样式：`src/styles/experience.css`
- 页面级 Portfolio 标识：`src/pages/[lang]/[...page].astro`
- 20 项专项测试：`tests/visual-review-2026-09-29.spec.ts`

## 验证记录

1. `npm run build`：通过；Astro 类型与模板检查 0 error / 0 warning，193 个静态页面成功生成。
2. `npx playwright test tests/visual-review-2026-09-29.spec.ts --workers=2`：通过；Chromium 20/20、WebKit 20/20，总计 40/40。
3. 本地浏览器逐屏复查：Open Signal、Portfolio、OPENMAIC 企业详情、Focus Areas 聚焦态均完成视觉确认。

## 补充说明

仓库既有全量回归中仍包含若干与当前已批准内容不一致的历史断言，例如旧企业名称、旧年份展示格式与旧顶栏模糊值。这些历史基线不属于本次 PDF 的 20 项验收范围；本次新增的专项测试已覆盖并锁定本轮全部验收标准。
