// Figma reference PNGs are immutable evidence; captures never alter page content or hide comparison regions.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const root = 'docs/verification/visual-audit';
const phase = process.argv[2] || 'after';
await fs.mkdir(`${root}/${phase}`, { recursive: true });
const cases = [
  { id: '526', route: 'portfolio', full: true },
  { id: '1282', route: 'portfolio/zhipu-ai' },
  { id: '1359', route: 'portfolio/mosi' },
  { id: '4567', route: 'team' },
  { id: '4631', route: 'team', hover: '.team-card:nth-child(2)' },
  { id: '4729', route: 'team', full: true },
  { id: '2833', route: 'insights', full: true },
  { id: '3112', route: 'insights' },
  { id: '3297', route: 'index' },
  { id: '3348', route: 'index', section: '.hero' },
  { id: '3191', route: 'index', section: '.hero', menu: true },
  { id: '3438', route: 'index', section: '.about' },
  { id: '3487', route: 'index', section: '.research' },
  { id: '3549', route: 'index', section: '.focus' },
  { id: '3659', route: 'index', section: '.focus', sector: 'foundation' },
  { id: '3769', route: 'index', section: '.focus', sector: 'applications' },
  { id: '3883', route: 'index', section: '.focus', sector: 'physical' },
  { id: '1692', route: 'index', section: '.next-signal' },
  { id: '2021', route: 'contact' },
];
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
for (const c of cases) {
  await page.mouse.move(0, 0);
  await page.setViewportSize({
    width: 1920,
    height: ['4567', '4631', '1692', '2021'].includes(c.id) ? 1081 : 1080,
  });
  await page.goto(`http://127.0.0.1:4321/linkxcap/zh/${c.route}.html`);
  await page.evaluate(() => document.fonts.ready);
  if (c.section)
    await page
      .locator(c.section)
      .evaluate((el) =>
        window.scrollTo({
          top: el.getBoundingClientRect().top + scrollY,
          behavior: 'instant',
        }),
      );
  if (c.sector) await page.locator(`[data-sector=${c.sector}]`).click();
  if (c.hover) await page.locator(c.hover).hover();
  if (c.menu) await page.locator('[data-menu-open]').click();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.querySelectorAll('img')]
        .filter((i) => {
          const r = i.getBoundingClientRect();
          return r.bottom > 0 && r.top < innerHeight;
        })
        .map((i) => i.decode().catch(() => {})),
    );
  });
  await page.waitForTimeout(160);
  await page.screenshot({
    path: `${root}/${phase}/${c.id}.png`,
    fullPage: !!c.full,
    animations: 'disabled',
  });
  console.log(`${phase} ${c.id}`);
}
await fs.writeFile(`${root}/cases.json`, JSON.stringify(cases, null, 2));
await browser.close();
