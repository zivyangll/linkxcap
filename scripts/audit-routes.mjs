// Every generated content URL, both languages, at every agreed breakpoint.
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:4321/linkxcap/';
const output = 'docs/verification/visual-audit';
await fs.mkdir(`${output}/routes`, { recursive: true });
const paths = (await fs.readdir('dist', { recursive: true }))
  .filter((p) => /^(zh|en)\/.+\.html$/.test(p))
  .sort();
const browser = await chromium.launch();
const page = await browser.newPage({
  reducedMotion: 'reduce',
  deviceScaleFactor: 1,
});
const results = [];
let errors = [];
page.on('pageerror', (e) => errors.push(e.message));
for (const width of [360, 768, 1440, 1920]) {
  await page.setViewportSize({ width, height: width === 360 ? 800 : 1080 });
  for (const route of paths) {
    errors = [];
    const response = await page.goto(origin + route);
    await page.evaluate(() => document.fonts.ready);
    // Scroll through the page to exercise image loading and content, then restore.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += innerHeight) {
        scrollTo(0, y);
        await new Promise((r) => requestAnimationFrame(r));
      }
      scrollTo(0, 0);
    });
    await page.evaluate(async () => {
      await Promise.all(
        [...document.querySelectorAll('main img')].map((img) =>
          img.decode().catch(() => {}),
        ),
      );
    });
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      h1: document.querySelectorAll('main h1').length,
      broken: [...document.querySelectorAll('main img')]
        .filter((img) => !img.naturalWidth)
        .map((img) => img.getAttribute('src')),
      height: document.body.scrollHeight,
    }));
    const entry = {
      route,
      width,
      status: response?.status(),
      ...state,
      errors: [...errors],
    };
    if (width === 360 || width === 1440) {
      const name = route
        .replaceAll('/', '-')
        .replace('.html', `-${width}.webp`);
      // Thumbnail for manual contact-sheet review; native 1:1 comparisons use the separate Figma audit.
      await sharp(
        await page.screenshot({ fullPage: true, animations: 'disabled' }),
      )
        .resize({ width: width === 360 ? 360 : 720 })
        .webp({ quality: 88 })
        .toFile(`${output}/routes/${name}`);
      entry.thumbnail = `routes/${name}`;
    }
    results.push(entry);
  }
  console.log(`Checked all ${paths.length} routes at ${width}px`);
}
await browser.close();
const failures = results.filter(
  (r) =>
    r.status !== 200 ||
    r.overflow ||
    r.h1 !== 1 ||
    r.broken.length ||
    r.errors.length,
);
await fs.writeFile(
  `${output}/route-audit.json`,
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      origin,
      routes: paths.length,
      checks: results.length,
      failures,
      results,
    },
    null,
    2,
  ),
);
console.log(
  `${results.length} route/viewport checks; ${failures.length} failures`,
);
if (failures.length) process.exitCode = 1;
