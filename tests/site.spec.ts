import { test, expect } from '@playwright/test';
const paths = [
  'index',
  'portfolio',
  'portfolio/zhipu-ai',
  'portfolio/approaching-ai',
  'team',
  'team-alex',
  'insights',
  'portfolio-yuanmu',
  'contact',
  'legal',
];
for (const lang of ['zh', 'en']) {
  for (const width of [360, 768, 1440, 1920])
    test(`${lang} layouts ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      for (const path of paths) {
        const response = await page.goto(`${lang}/${path}.html`);
        expect(response?.status()).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('main h1')).toHaveCount(1);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${lang}/${path} overflows ${width}`,
        ).toBe(true);
        const missing = await page
          .locator('main img')
          .evaluateAll((images) =>
            images
              .filter(
                (img) =>
                  (img as HTMLImageElement).complete &&
                  !(img as HTMLImageElement).naturalWidth,
              )
              .map((img) => img.getAttribute('src')),
          );
        expect(missing).toEqual([]);
      }
      expect(errors).toEqual([]);
    });
}
test('language switch keeps current company, and detail refresh works', async ({
  page,
}) => {
  await page.goto('zh/portfolio/modelbest.html');
  await page.locator('[data-menu-open]').click();
  await page.locator('#site-menu [data-language=en]').click();
  await expect(page).toHaveURL(/en\/portfolio\/modelbest.html$/);
  await page.reload();
  await expect(page.locator('main h1')).toContainText('ModelBest');
});
test('mobile menu supports Escape and focus return', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('zh/index.html');
  const opener = page.locator('[data-menu-open]');
  await opener.click();
  await expect(page.locator('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await page.locator('#site-menu a[href$="/zh/team.html"]').click();
  await expect(page.locator('main h1')).toContainText('团队');
});
test('filters, language state and original article link', async ({ page }) => {
  await page.goto('zh/insights.html');
  await page.locator('[data-filter=models]').click();
  await expect(page.locator('.insight-row:visible')).toHaveCount(4);
  await page.locator('.language-switch [data-language=en]').click();
  await expect(page).toHaveURL(/en\/insights.html\?category=models/);
  await expect(page.locator('.insight-row:visible')).toHaveCount(4);
  await page.locator('.insight-row:visible h2 a').first().click();
  await expect(page.locator('.article-actions a')).toHaveAttribute(
    'href',
    'https://www.linkxcap.com/zh/insights-zhang-bo.html',
  );
  await expect(page.locator('.article-toc a')).toHaveCount(3);
});
test('team profiles work with touch', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/linkxcap/zh/team.html');
  const button = page.locator('.profile-toggle').first();
  await button.tap();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await page.locator('.team-bio a').first().tap();
  await expect(page.locator('main h1')).toContainText('张鸣晨');
  await context.close();
});
test('focus controls and reduced motion', async ({ page }) => {
  await page.goto('zh/index.html');
  await page.locator('[data-sector=physical]').click();
  await expect(page.locator('[data-sector-panel=physical]')).toBeVisible();
  await expect(
    page.locator('[data-sector-panel=foundation]'),
  ).not.toBeVisible();
  await expect(page.locator('.topology-canvas')).not.toBeVisible();
});
test('core content and navigation remain available without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 360, height: 800 },
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/linkxcap/zh/index.html');
  await expect(page.locator('.opening-copy')).toContainText('通用智能');
  await expect(page.locator('[data-sector-panel=frontiers]')).toBeVisible();
  await page.locator('.noscript-nav a[href$="/zh/portfolio.html"]').click();
  await expect(page.locator('[data-company-card]')).toHaveCount(19);
  await context.close();
});
test('English mobile copy follows the multiline heading', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('en/index.html');
  await page.evaluate(() => document.fonts.ready);
  const title = await page.locator('.about-title').boundingBox();
  const copy = await page.locator('.about-copy').boundingBox();
  expect(copy!.y).toBeGreaterThan(title!.y + title!.height + 15);
});
test('ambient canvas stops when paused and outside the viewport', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('zh/index.html');
  await page.locator('.focus').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await expect(page.locator('[data-topology]')).toHaveAttribute(
    'data-renderer',
    /webgl|static/,
  );
  if (
    (await page.locator('[data-topology]').getAttribute('data-renderer')) ===
    'static'
  )
    return;
  const running = Number(
    await page.locator('[data-topology]').getAttribute('data-render-frames'),
  );
  await page.waitForTimeout(250);
  expect(
    Number(
      await page.locator('[data-topology]').getAttribute('data-render-frames'),
    ),
  ).toBeGreaterThan(running);
  await page.locator('[data-motion-toggle]').click();
  const paused = Number(
    await page.locator('[data-topology]').getAttribute('data-render-frames'),
  );
  await page.waitForTimeout(250);
  expect(
    Number(
      await page.locator('[data-topology]').getAttribute('data-render-frames'),
    ),
  ).toBe(paused);
  await page.locator('[data-motion-toggle]').click();
  await page.locator('.opening-title').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const offscreen = Number(
    await page.locator('[data-topology]').getAttribute('data-render-frames'),
  );
  await page.waitForTimeout(250);
  expect(
    Number(
      await page.locator('[data-topology]').getAttribute('data-render-frames'),
    ),
  ).toBe(offscreen);
});

test('focus content works if the optional animation chunk cannot load', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/_astro/topology.*.js', (route) => route.abort());
  await page.goto('zh/index.html');
  await page.locator('[data-sector=physical]').click();
  await expect(page.locator('[data-sector-panel=physical]')).toBeVisible();
  await expect(
    page.locator('[data-sector-panel=foundation]'),
  ).not.toBeVisible();
  await page.locator('[data-sector=frontiers]').click();
  await expect(page.locator('[data-sector-panel=frontiers]')).toBeVisible();
  await expect(page.locator('[data-motion-toggle]')).not.toBeVisible();
});

test('selected constellation links open the matching portfolio detail', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('zh/index.html');
  await page.locator('[data-sector=physical]').click();
  const company = page.locator(
    '.constellation-company[href$="/portfolio/amio-robotics.html"]',
  );
  await expect(company).toBeVisible();
  await company.click();
  await expect(page.locator('main h1')).toContainText('阿米奥');
});

test('a long English company name fits without a stranded letter on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('en/portfolio/biogeometry.html');
  await page.evaluate(() => document.fonts.ready);
  const lines = await page.locator('.company-content h1').evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getClientRects().length;
  });
  expect(lines).toBe(1);
});
