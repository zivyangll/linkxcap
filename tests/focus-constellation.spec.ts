import { test, expect, type Page } from '@playwright/test';
import content from '../src/data/content.json' with { type: 'json' };

async function openScene(page: Page, lang = 'zh') {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`${lang}/index.html`);
  await expect(page.locator('[data-home]')).toHaveClass(
    /has-philosophy-motion/,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#focus').evaluate((element) =>
    scrollTo({
      top: element.getBoundingClientRect().top + scrollY,
      behavior: 'instant',
    }),
  );
  await expect(page.locator('#focus')).toHaveAttribute(
    'data-renderer',
    'webgl',
  );
  await expect(page.locator('#focus')).toHaveAttribute('data-running', 'true');
  return page.locator('#focus');
}
async function hoverNode(page: Page, id: string) {
  const button = page.locator(`[data-sector="${id}"]`);
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  return button;
}

test('hover immediately selects every sector and connects only its configured companies', async ({
  page,
}) => {
  const scene = await openScene(page);
  for (const sector of content.sectors) {
    const button = await hoverNode(page, sector.id);
    await expect(
      page.locator(`[data-sector-panel="${sector.id}"]`),
    ).toBeVisible();
    const companies = content.companies.filter(
      (company) => company.sector_id === sector.id,
    );
    await expect(scene).toHaveAttribute(
      'data-highlighted-edges',
      String(companies.length),
    );
    const group = page.locator(`[data-constellation="${sector.id}"]`);
    await expect(group.locator('.constellation-company')).toHaveCount(
      companies.length,
    );
    expect(
      await group.locator('.constellation-company').evaluateAll((links) =>
        links.map((link) => ({
          key: (link as HTMLElement).dataset.topologyAnchor,
          href: link.getAttribute('href'),
        })),
      ),
    ).toEqual(
      companies.map((company) => ({
        key: `company-${company.id}`,
        href: `/linkxcap/zh/portfolio/${company.slug}.html`,
      })),
    );
    await expect(button.locator('.diamond')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    if (companies.length)
      await expect(scene).toHaveAttribute('data-branch-progress', '1.000');
  }
});

test('idle graph cycles automatically; hover holds pose and copy, leaving resumes the cycle', async ({
  page,
}) => {
  const scene = await openScene(page);
  await page.mouse.move(100, 200);
  const initial = await scene.getAttribute('data-focus');
  const rotation = await scene.getAttribute('data-rotation');
  await expect
    .poll(() => scene.getAttribute('data-rotation'))
    .not.toBe(rotation);
  await expect
    .poll(() => scene.getAttribute('data-focus'), { timeout: 10000 })
    .not.toBe(initial);
  const button = await hoverNode(page, 'physical');
  await expect(scene).toHaveAttribute('data-focus-mode', 'held');
  const pose = await scene.getAttribute('data-rotation');
  const box = await button.boundingBox();
  await page.waitForTimeout(5600);
  await expect(scene).toHaveAttribute('data-focus', 'physical');
  await expect(scene).toHaveAttribute('data-rotation', pose!);
  expect(await button.boundingBox()).toEqual(box);
  await page.mouse.move(100, 200);
  await expect(scene).toHaveAttribute('data-focus-held', 'false');
  await expect.poll(() => scene.getAttribute('data-rotation')).not.toBe(pose);
  await expect
    .poll(() => scene.getAttribute('data-focus'), { timeout: 10000 })
    .not.toBe('physical');
});

test('company labels preserve the hovered branch, and company links still navigate', async ({
  page,
}) => {
  const scene = await openScene(page, 'en');
  await hoverNode(page, 'physical');
  const link = page.locator('[data-constellation=physical] a').first();
  await link.locator('span').hover();
  await expect(scene).toHaveAttribute('data-focus-held', 'true');
  await page.waitForTimeout(750);
  await expect(scene).toHaveAttribute('data-focus', 'physical');
  await expect(link).toContainText('AMIO Robotics');
  await link.locator('span').click();
  await expect(page).toHaveURL(/\/en\/portfolio\/amio-robotics.html$/);
});

test('keyboard focus holds a sector without a background toggle', async ({
  page,
}) => {
  const scene = await openScene(page);
  const button = page.locator('[data-sector=infrastructure]');
  await page.keyboard.press('Tab');
  await button.focus();
  await expect(scene).toHaveAttribute('data-focus', 'infrastructure');
  await expect(scene).toHaveAttribute('data-focus-held', 'true');
  await page.waitForTimeout(700);
  await expect(page.locator('[data-motion-toggle]')).toHaveCount(0);
  const pose = await scene.getAttribute('data-rotation');
  await page.waitForTimeout(800);
  await expect(scene).toHaveAttribute('data-rotation', pose!);
  await button.evaluate((element) => element.blur());
  await expect.poll(() => scene.getAttribute('data-rotation')).not.toBe(pose);
});

test('WebGL context loss falls back to connected SVG and interactive text', async ({
  page,
}) => {
  const scene = await openScene(page);
  await hoverNode(page, 'infrastructure');
  await page
    .locator('.topology-canvas')
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })),
    );
  await expect(scene).toHaveAttribute('data-renderer', 'static');
  await expect(scene).toHaveAttribute('data-running', 'false');
  await expect(page.locator('.topology-canvas')).toBeHidden();
  await expect(page.locator('[data-motion-toggle]')).toBeHidden();
  await hoverNode(page, 'physical');
  await expect(
    page.locator(
      '[data-constellation=physical] .constellation-fallback--desktop',
    ),
  ).toBeVisible();
  await expect(
    page.locator('[data-constellation=physical] a').first(),
  ).toBeVisible();
});

test('reduced motion has static connections, no automatic cycle and no Three.js request', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/topology\..*\.js/.test(request.url())) requests.push(request.url());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('zh/index.html');
  await page.locator('[data-sector=infrastructure]').click();
  await expect(page.locator('#focus')).toHaveAttribute(
    'data-focus',
    'infrastructure',
  );
  await expect(
    page.locator(
      '[data-constellation=infrastructure] .constellation-fallback--desktop line',
    ),
  ).toHaveCount(8);
  await page.waitForTimeout(700);
  expect(requests).toHaveLength(0);
  await expect(page.locator('.topology-canvas')).toBeHidden();
  await expect(page.locator('#focus')).toHaveAttribute(
    'data-focus',
    'infrastructure',
  );
});

for (const width of [360, 768])
  test(`touch focus controls remain usable at ${width}px with homepage motion enabled`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}zh/index.html`);
    await expect(page.locator('[data-home]')).toHaveClass(/has-mobile-motion/);
    for (const sector of content.sectors) {
      const button = page.locator(`[data-sector="${sector.id}"]`);
      await button.tap();
      await expect(
        page.locator(`[data-sector-panel="${sector.id}"]`),
      ).toBeVisible();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator('#focus')).toHaveAttribute(
      'data-renderer',
      'webgl',
    );
    await expect(page.locator('.topology-canvas')).toBeVisible();
    await expect(page.locator('#focus')).toHaveAttribute(
      'data-focus-pinned',
      'true',
    );
    await context.close();
  });

for (const width of [360, 768])
  test(`H5 ${width}px automatically connects companies and tapping locks then resumes the graph`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}zh/index.html`);
    await expect(page.locator('[data-home]')).toHaveClass(/has-mobile-motion/);
    await page.locator('.constellation').scrollIntoViewIfNeeded();
    const scene = page.locator('#focus');
    await expect(scene).toHaveAttribute('data-renderer', 'webgl');
    const initial = await scene.getAttribute('data-focus');
    await expect
      .poll(() => scene.getAttribute('data-focus'), { timeout: 15000 })
      .not.toBe(initial);
    await page.locator('[data-sector=infrastructure]').tap();
    await expect(scene).toHaveAttribute('data-focus-pinned', 'true');
    await expect(scene).toHaveAttribute('data-highlighted-edges', '8');
    await expect(scene).toHaveAttribute('data-branch-progress', '1.000');
    await expect(scene).toHaveAttribute('data-running', 'false');
    const overlaps = await page
      .locator('.sector-star .star-label')
      .evaluateAll((labels) => {
        const boxes = labels.map((label) => label.getBoundingClientRect());
        return boxes.flatMap((a, i) =>
          boxes
            .slice(i + 1)
            .filter(
              (b) =>
                Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
                Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top),
            ),
        );
      });
    expect(overlaps).toEqual([]);
    const rotation = await scene.getAttribute('data-rotation');
    const frames = await scene.getAttribute('data-render-frames');
    await page.waitForTimeout(5500);
    await expect(scene).toHaveAttribute('data-focus', 'infrastructure');
    await expect(scene).toHaveAttribute('data-rotation', rotation!);
    await expect(scene).toHaveAttribute('data-render-frames', frames!);
    const box = (await page.locator('.constellation').boundingBox())!;
    const canvas = await page.locator('.topology-canvas').evaluate((node) => ({
      width: (node as HTMLCanvasElement).width,
      height: (node as HTMLCanvasElement).height,
    }));
    expect(canvas.width * canvas.height).toBeLessThanOrEqual(910000);
    expect(box.width).toBeLessThanOrEqual(width);
    await page.locator('[data-sector=infrastructure]').tap();
    await expect(scene).toHaveAttribute('data-focus-pinned', 'false');
    await expect(scene).toHaveAttribute('data-running', 'true');
    await expect
      .poll(() => scene.getAttribute('data-rotation'))
      .not.toBe(rotation);
    await context.close();
  });
