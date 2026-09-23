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
  await page.locator('.language-switch [data-language=en]').click();
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
  await expect(page.locator('.insight-row:visible')).toHaveCount(6);
  await page.locator('[data-filter=models]').click();
  await expect(page.locator('.insight-row:visible')).toHaveCount(1);
  await page.locator('.language-switch [data-language=en]').click();
  await expect(page).toHaveURL(/en\/insights.html\?category=models/);
  await expect(page.locator('.insight-row:visible')).toHaveCount(1);
  await page.locator('.insight-row:visible h2 a').first().click();
  await expect(page.locator('.article-actions a')).toHaveAttribute(
    'href',
    'https://www.linkxcap.com/zh/insights-zhang-bo.html',
  );
  await expect(page.locator('.article-toc a')).toHaveCount(3);
});
test('team profiles work with touch', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}zh/team.html`);
  const button = page.locator('.profile-toggle').first();
  await button.tap();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.team-bio').first()).toBeVisible();
  await page.locator('[data-person-bio]:not([hidden])').tap();
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await context.close();
});
test('phone uses native company tabs and a static focus scene', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('zh/portfolio/zhipu-ai.html');
  const rail = page.locator('[data-company-nav]');
  await expect(page.locator('[data-company-loop-link]')).toHaveCount(0);
  await expect(page.locator('.company-scroll-hint')).not.toBeVisible();
  await expect(page.locator('.rail-marker').first()).not.toBeVisible();
  await expect(page.locator('.company-arc-continuation')).not.toBeVisible();
  await expect(page.locator('.rail-controls')).not.toBeVisible();
  expect(
    await rail.evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(true);
  expect(
    await rail.evaluate(
      (element) => element.scrollHeight <= element.clientHeight + 1,
    ),
  ).toBe(true);
  await page.locator('[data-company-link=realai]').click();
  await expect(page.locator('[data-company-browser]')).toHaveAttribute(
    'data-current-company',
    'realai',
  );
  await expect(page.locator('[data-company-title]')).toHaveText('瑞莱智慧');

  await page.goto('zh/index.html');
  await expect(page.locator('[data-topology]')).toHaveAttribute(
    'data-renderer',
    'static',
  );
  await expect(page.locator('.topology-canvas')).not.toBeVisible();
  await expect(page.locator('[data-motion-toggle]')).not.toBeVisible();
});
test('phone Fellow sections use a non-overlapping natural flow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('zh/contact.html');
  const boxes = await page.evaluate(() => {
    const box = (selector: string) =>
      document.querySelector(selector)!.getBoundingClientRect();
    const intro = box('.fellow-intro');
    const media = box('.fellow-media-section');
    const title = box('.fellow-media-title');
    const video = box('[data-video-shell]');
    const caption = box('.fellow-media-caption');
    return {
      introBottom: intro.bottom,
      mediaTop: media.top,
      titleBottom: title.bottom,
      videoTop: video.top,
      videoBottom: video.bottom,
      captionTop: caption.top,
    };
  });
  expect(boxes.mediaTop).toBeCloseTo(boxes.introBottom, 0);
  expect(boxes.titleBottom).toBeLessThan(boxes.videoTop);
  expect(boxes.videoBottom).toBeLessThan(boxes.captionTop);
  await expect(page.locator('.pin-spacer')).toHaveCount(0);
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
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 360, height: 800 },
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}zh/index.html`);
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
  await expect(page.locator('[data-home]')).toHaveAttribute(
    'data-mobile-static',
    'true',
  );
  await expect(page.locator('.scroll-trail').first()).not.toBeVisible();
  await expect(page.locator('.hero-track')).not.toBeVisible();
  await expect(page.locator('.about-rays')).not.toBeVisible();
  await expect(page.locator('.about-decor')).not.toBeVisible();
  await expect(page.locator('.opening-track .diamond')).toBeVisible();
  await expect(page.locator('.chapter')).toBeVisible();
  await expect(page.locator('.orbit-label')).not.toBeVisible();
  await expect(page.locator('.about-label')).not.toBeVisible();
  await expect(page.locator('.pin-spacer')).toHaveCount(0);
  const title = await page.locator('.about-title').boundingBox();
  const copy = await page.locator('.about-copy').boundingBox();
  expect(copy!.y).toBeGreaterThan(title!.y + title!.height + 15);
});
test('ambient canvas stops outside the viewport and has no background toggle', async ({
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
  await expect(page.locator('[data-motion-toggle]')).toHaveCount(0);
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
