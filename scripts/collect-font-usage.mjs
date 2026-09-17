// Run against a local build before refreshing font subsets after copy changes.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce',
});
const groups = {};
for (const width of [390, 1920]) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
  for (const route of [
    'index',
    'portfolio',
    'team',
    'insights',
    'contact',
    'portfolio/zhipu-ai',
  ]) {
    await page.goto('http://127.0.0.1:4321/linkxcap/zh/' + route + '.html');
    const usage = await page.evaluate(() => {
      const groups = { shared: {}, critical: {}, body: {} };
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
      );
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const parent = node.parentElement;
        if (!parent || parent.closest('script,style,noscript')) continue;
        const style = getComputedStyle(parent);
        if (style.visibility === 'hidden' || !parent.getClientRects().length)
          continue;
        const key = style.fontFamily.includes('LinkX Sans')
          ? 'sans-400'
          : style.fontFamily.includes('LinkX Serif')
            ? `serif-${Number(style.fontWeight)}`
            : null;
        if (!key) continue;
        const r = parent.getBoundingClientRect();
        const bucket = parent.closest('header.site-header,footer')
          ? 'shared'
          : r.top < innerHeight && r.bottom > 0
            ? 'critical'
            : 'body';
        groups[bucket][key] = (groups[bucket][key] || '') + node.textContent;
      }
      return groups;
    });
    groups[`${width}-${route}`] = usage;
  }
}
await browser.close();
await fs.writeFile(
  'src/data/font-priority.json',
  JSON.stringify(groups, null, 2),
);
