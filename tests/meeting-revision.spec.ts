import { test, expect } from '@playwright/test';

test('five home chapters track scroll, reveal text and slide the second screen out', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('zh/index.html');
  await expect(page.locator('.story-scene')).toHaveCount(5);
  await expect(page.locator('.opening')).toHaveClass(/has-scroll-trail/);
  await expect(page.locator('.hero-track')).toBeVisible();
  await expect(page.locator('.hero-track-line')).toBeVisible();
  await expect(page.locator('.philosophy-orbit')).toBeVisible();
  await expect(page.locator('.philosophy-trail')).toHaveCSS('opacity', '0');
  await expect(page.locator('.hero-orbit')).toBeHidden();
  await expect(page.locator('.about-orbit')).toBeHidden();
  await expect(page.locator('.hero-track-end')).toHaveCSS('opacity', '0.55');
  await expect(page.locator('.hero-track-end')).toHaveCSS(
    'background-color',
    'rgb(201, 201, 201)',
  );
  const before = await page
    .locator('[data-scroll-trail=opening]')
    .getAttribute('data-point');
  const opacity = await page
    .locator('.opening-copy')
    .evaluate((e) => Number(getComputedStyle(e).opacity));
  await page.evaluate(() => scrollTo(0, 360));
  await expect
    .poll(() =>
      page.locator('[data-scroll-trail=opening]').getAttribute('data-point'),
    )
    .not.toBe(before);
  await expect
    .poll(() =>
      page
        .locator('.opening-copy')
        .evaluate((e) => Number(getComputedStyle(e).opacity)),
    )
    .toBeGreaterThan(opacity);
  const start = await page
    .locator('.hero')
    .evaluate((e) => e.parentElement!.getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => scrollTo(0, y), start);
  const orbitBefore = await page.locator('.philosophy-orbit').boundingBox();
  const titleBefore = await page.locator('.hero-title').boundingBox();
  const trackBefore = await page.locator('.hero-track').boundingBox();
  await page.evaluate((y) => scrollTo(0, y), start + 575);
  await expect
    .poll(() =>
      page
        .locator('.philosophy-trail')
        .evaluate((e) => Number(getComputedStyle(e).opacity)),
    )
    .toBeGreaterThan(0.9);
  const orbitAfter = await page.locator('.philosophy-orbit').boundingBox();
  const titleAfter = await page.locator('.hero-title').boundingBox();
  const trackAfter = await page.locator('.hero-track').boundingBox();
  expect(titleAfter!.x - titleBefore!.x).toBeCloseTo(
    orbitAfter!.x - orbitBefore!.x,
    0,
  );
  expect(titleAfter!.y - titleBefore!.y).toBeCloseTo(
    orbitAfter!.y - orbitBefore!.y,
    0,
  );
  expect(trackAfter!.x - trackBefore!.x).toBeCloseTo(
    orbitAfter!.x - orbitBefore!.x,
    0,
  );
  expect(trackAfter!.y - trackBefore!.y).toBeCloseTo(
    orbitAfter!.y - orbitBefore!.y,
    0,
  );
  await page.evaluate((y) => scrollTo(0, y), start + 990);
  await expect
    .poll(() =>
      page
        .locator('.hero-title')
        .evaluate((e) => e.getBoundingClientRect().right),
    )
    .toBeLessThan(500);

  const aboutStart = await page
    .locator('.about')
    .evaluate((e) => e.parentElement!.getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => scrollTo(0, y), aboutStart);
  await expect(page.locator('.about-rays .diamond')).toHaveCSS('opacity', '0');
  const orbitStart = (await page.locator('.philosophy-orbit').boundingBox())!.x;
  const dotStart = (await page.locator('.about-rays .diamond').boundingBox())!
    .y;
  const titleOpacity = await page
    .locator('.about-title span')
    .first()
    .evaluate((e) => Number(getComputedStyle(e).opacity));
  await page.evaluate((y) => scrollTo(0, y), aboutStart + 460);
  await expect(page.locator('.philosophy-trail')).toHaveCSS('opacity', '0');
  await expect(page.locator('.about-rays .diamond')).toHaveCSS('opacity', '1');
  await expect
    .poll(
      async () => (await page.locator('.philosophy-orbit').boundingBox())!.x,
    )
    .toBeLessThan(orbitStart - 40);
  await expect
    .poll(
      async () => (await page.locator('.about-rays .diamond').boundingBox())!.y,
    )
    .toBeGreaterThan(dotStart + 40);
  await expect
    .poll(() =>
      page
        .locator('.about-title span')
        .first()
        .evaluate((e) => Number(getComputedStyle(e).opacity)),
    )
    .toBeGreaterThan(titleOpacity);
});

for (const width of [390, 768, 1440])
  test(`right scroll updates company and preserves it after language change ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('zh/portfolio/zhipu-ai.html');
    const rail = page.locator('[data-company-nav]');
    await expect(page.locator('[data-company-browser]')).toHaveAttribute(
      'data-rail-ready',
      'true',
    );
    await expect(page.locator('[data-company-link=zhipu-ai]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    await rail.evaluate((el) => {
      el.scrollTop += 184;
    });
    await expect(page.locator('[data-company-browser]')).toHaveAttribute(
      'data-current-company',
      'mosi',
    );
    await expect(page.locator('h1')).toHaveText('模思智能');
    await expect(page.locator('[data-company-website]')).toHaveAttribute(
      'href',
      /mosi/,
    );
    await expect(page).toHaveURL(/portfolio\/mosi.html$/);
    await page.locator('[data-company-nav]').focus();
    await page.keyboard.press('End');
    await expect(
      page.locator('[data-company-link=xingyun-ic]'),
    ).toHaveAttribute('aria-current', 'page');
    await page.keyboard.press('Home');
    await expect(
      page.locator('[data-company-link=agic-micro]'),
    ).toHaveAttribute('aria-current', 'page');
    await page.locator('[data-company-link=mosi]').click();
    await page.locator('[data-menu-open]').click();
    await page.locator('#site-menu [data-language=en]').click();
    await expect(page.locator('h1')).toHaveText('Mosi');
    await page.reload();
    await expect(page.locator('h1')).toHaveText('Mosi');
  });

test('exactly three portraits reveal and hide the corresponding right biography', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('zh/team.html');
  await expect(page.locator('[data-person]')).toHaveCount(3);
  for (const id of ['alex', 'elliot', 'wenjue']) {
    const portrait = page.locator(`[data-person=${id}]`);
    const bio = page.locator(`[data-person-bio=${id}]`);
    await portrait.hover();
    await expect(bio).toBeVisible();
    await expect(portrait).toHaveCSS('opacity', '1');
    const l = await portrait.boundingBox(),
      r = await bio.boundingBox();
    expect(r!.x).toBeGreaterThan(l!.x + l!.width);
    await page.mouse.move(20, 150);
    await expect(bio).not.toBeVisible();
  }
});

test('Fellow arc moves, window expands, and pending film stays explicitly marked', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('zh/contact.html');
  const dot = page.locator('.fellow-orbit-point');
  const left = await dot.evaluate((e) => e.getBoundingClientRect().left);
  await expect
    .poll(() => dot.evaluate((e) => e.getBoundingClientRect().left))
    .not.toBe(left);
  const before = (await page.locator('[data-video-shell]').boundingBox())!
    .width;
  const start = await page
    .locator('[data-fellow-media]')
    .evaluate((e) => e.getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => scrollTo(0, y + 650), start);
  await expect
    .poll(
      async () =>
        (await page.locator('[data-video-shell]').boundingBox())!.width,
    )
    .toBeGreaterThan(before + 200);
  await expect(page.locator('.fellow-video-placeholder')).toContainText(
    '待提供',
  );
  await expect(page.locator('[data-fellow-video]')).toHaveCount(0);
});

test('3D is deferred until visible, reacts to hover and pauses offscreen', async ({
  page,
  browserName,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  const chunks: string[] = [];
  page.on('request', (r) => {
    if (/\/topology\..*\.js/.test(r.url())) chunks.push(r.url());
  });
  await page.goto('zh/index.html');
  await page.waitForTimeout(350);
  expect(chunks).toHaveLength(0);
  await page.locator('.focus').scrollIntoViewIfNeeded();
  const scene = page.locator('[data-topology]');
  await expect(scene).toHaveAttribute('data-renderer', /webgl|static/);
  if (browserName === 'chromium')
    await expect(scene).toHaveAttribute('data-renderer', 'webgl');
  if ((await scene.getAttribute('data-renderer')) === 'webgl') {
    const surface = page.locator('[data-topology-drag]');
    const box = await surface.boundingBox();
    const rotation = await scene.getAttribute('data-rotation');
    await page.mouse.move(
      box!.x + box!.width * 0.8,
      box!.y + box!.height * 0.5,
    );
    await page.mouse.down();
    await page.mouse.move(
      box!.x + box!.width * 0.62,
      box!.y + box!.height * 0.36,
      { steps: 8 },
    );
    await page.mouse.up();
    await expect(scene).toHaveAttribute('data-dragged', 'true');
    await expect
      .poll(() => scene.getAttribute('data-rotation'))
      .not.toBe(rotation);
    const draggedRotation = (await scene.getAttribute('data-rotation'))!
      .split(',')
      .map(Number);
    expect(Math.max(...draggedRotation.map(Math.abs))).toBeGreaterThan(0.15);
  }
  const star = page.locator('[data-sector=physical]');
  await star.hover();
  await expect(star.locator('.star-glyph')).not.toHaveCSS('filter', 'none');
  if ((await scene.getAttribute('data-renderer')) === 'webgl') {
    await expect(star).toHaveAttribute('data-hovered', 'true');
    await expect(scene).toHaveAttribute(
      'data-highlighted-node',
      'sector-physical',
    );
    await expect
      .poll(async () =>
        Number(await scene.getAttribute('data-highlighted-edges')),
      )
      .toBeGreaterThan(0);
    await expect(
      page.locator('[data-topology-anchor=sector-infrastructure]'),
    ).toHaveCSS('opacity', '0.12');
    const value = await scene.getAttribute('data-render-frames');
    await expect
      .poll(() => scene.getAttribute('data-render-frames'))
      .not.toBe(value);
    await page.locator('[data-motion-toggle]').click();
    await expect(scene).toHaveAttribute('data-running', 'false');
  }
});

test('portfolio hover illuminates original logo and selection opens its detail', async ({
  page,
}) => {
  await page.goto('zh/portfolio.html');
  const node = page.locator('[data-slug=zhipu-ai]');
  const logo = node.locator('img');
  const corners = node.locator('.card-corners');
  const previous = await logo.evaluate((e) => getComputedStyle(e).filter);
  await expect(corners).toHaveCSS('opacity', '0');
  await node.hover();
  await expect(logo).toHaveCSS('filter', 'none');
  await expect(corners).toHaveCSS('opacity', '1');
  expect(previous).not.toBe('none');
  await node.click();
  await expect(page.locator('h1')).toHaveText('智谱AI');
});

test('mobile company text stays within readable page margins', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const lang of ['zh', 'en']) {
    await page.goto(`${lang}/portfolio/mosi.html`);
    const box = await page.locator('.company-description').boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(23);
    expect(box!.x + box!.width).toBeLessThanOrEqual(337);
  }
});

test('WebGL failure leaves focus controls and company links usable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: any,
      ...args: any[]
    ) {
      if (String(type).startsWith('webgl')) return null;
      return getContext.call(this, type, ...args);
    } as typeof getContext;
  });
  await page.goto('zh/index.html');
  await page.locator('[data-sector=physical]').click();
  await expect(page.locator('[data-topology]')).toHaveAttribute(
    'data-renderer',
    'static',
  );
  await expect(page.locator('[data-sector-panel=physical]')).toBeVisible();
  await expect(page.locator('[data-motion-toggle]')).not.toBeVisible();
});
