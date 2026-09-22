import { test, expect, type Page, type Locator } from '@playwright/test';

test.use({ reducedMotion: 'no-preference', isMobile: true, hasTouch: true });

async function stageBounds(stage: Locator) {
  return stage.evaluate((el) => {
    const spacer = el.parentElement!;
    const height = el.getBoundingClientRect().height;
    return {
      start:
        spacer.getBoundingClientRect().top +
        scrollY +
        Math.max(0, height - innerHeight),
      distance: spacer.getBoundingClientRect().height - height,
      top: Math.min(0, innerHeight - height),
    };
  });
}

async function sample(page: Page, progress: number) {
  const stage = page.locator('[data-philosophy-stage]');
  const bounds = await stageBounds(stage);
  await page.evaluate(
    (y) => scrollTo({ top: y, behavior: 'instant' }),
    bounds.start + bounds.distance * progress,
  );
  await expect
    .poll(async () => Number(await stage.getAttribute('data-motion-progress')))
    .toBeCloseTo(progress, 2);
  return stage.evaluate((el) => ({
    top: el.getBoundingClientRect().top,
    point: (el.querySelector('canvas') as HTMLCanvasElement).dataset
      .point!.split(',')
      .map(Number),
  }));
}

for (const lang of ['zh', 'en']) {
  for (const viewport of [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
  ]) {
    test(`H5 ${lang} ${viewport.width}px pins chapters and reverses one continuous point`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${lang}/index.html`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('[data-home]')).toHaveClass(
        /has-mobile-motion/,
      );
      await expect(page.locator('.pin-spacer')).toHaveCount(3);
      await expect(page.locator('.philosophy-stage-canvas')).toBeVisible();
      await expect(page.locator('.hero-track')).toBeHidden();
      await expect(page.locator('.about-rays')).toBeHidden();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);

      const stage = page.locator('[data-philosophy-stage]');
      const bounds = await stageBounds(stage);
      let previous = await sample(page, 0.2);
      expect(previous.top).toBeCloseTo(bounds.top, 0);
      for (const p of [0.48, 0.58, 0.68, 0.82, 0.97]) {
        const next = await sample(page, p);
        expect(next.top).toBeCloseTo(bounds.top, 0);
        expect(next.point[1]).toBeGreaterThanOrEqual(previous.point[1] - 1);
        if (p === 0.68) {
          const heading = await page.locator('.about-title').boundingBox();
          expect(heading!.y).toBeGreaterThan(72);
          expect(heading!.y + heading!.height).toBeLessThan(viewport.height);
        }
        previous = next;
      }
      await expect(page.locator('.about-copy')).toHaveCSS('opacity', '1');
      await expect(page.locator('.hero')).toHaveAttribute('inert', '');
      const first = await sample(page, 0.58);
      await sample(page, 0.97);
      const reversed = await sample(page, 0.58);
      expect(reversed.point[0]).toBeCloseTo(first.point[0], 0);
      expect(reversed.point[1]).toBeCloseTo(first.point[1], 0);

      await sample(page, 0.97);
      const text = await page.locator('.about-copy').boundingBox();
      const title = await page.locator('.about-title').boundingBox();
      expect(text!.y).toBeGreaterThan(title!.y + title!.height + 15);
      expect(text!.y + text!.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(text!.x).toBeGreaterThanOrEqual(24);
      expect(text!.x + text!.width).toBeLessThanOrEqual(viewport.width - 23);

      await page.evaluate(
        (y) => scrollTo({ top: y, behavior: 'instant' }),
        bounds.start + bounds.distance + 120,
      );
      await expect
        .poll(async () => (await stage.boundingBox())!.y)
        .toBeLessThan(bounds.top - 100);
      await page.locator('[data-sector=physical]').click();
      await expect(page.locator('[data-sector-panel=physical]')).toBeVisible();
      await expect(page.locator('[data-topology]')).toHaveAttribute(
        'data-renderer',
        'static',
      );
      expect(errors).toEqual([]);
    });
  }
}

test('H5 about deep link and return link land on readable copy, not the hidden overlapping scene', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('zh/index.html#about');
  const stage = page.locator('[data-philosophy-stage]');
  await expect
    .poll(async () => Number(await stage.getAttribute('data-motion-progress')))
    .toBeGreaterThan(0.95);
  await expect(page.locator('.about-copy')).toHaveCSS('opacity', '1');
  await page.locator('.focus-links a[href="#about"]').click();
  // The previous readable pose can persist for a frame while native smooth
  // scrolling starts. Wait for the viewport as well as animation progress.
  await expect
    .poll(async () => (await stage.boundingBox())!.y)
    .toBeCloseTo(0, 0);
  await expect
    .poll(async () => Number(await stage.getAttribute('data-motion-progress')))
    .toBeCloseTo(0.97, 2);
  const copy = await page.locator('.about-copy').boundingBox();
  expect(copy!.y).toBeGreaterThan(72);
  expect(copy!.y + copy!.height).toBeLessThan(844);
  await sample(page, 0.1);
  await page.locator('.orbit-label').click();
  await expect
    .poll(async () => Number(await stage.getAttribute('data-motion-progress')))
    .toBeCloseTo(0.97, 2);
  await expect(
    page.locator('.language-switch [data-language=en]'),
  ).toHaveAttribute('href', /en\/index\.html#about$/);
});

test('H5 menu works during a pinned chapter and resizing never duplicates pins', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('zh/index.html');
  await expect(page.locator('.pin-spacer')).toHaveCount(3);
  await sample(page, 0.6);
  const opener = page.locator('[data-menu-open]');
  await opener.click();
  await expect(page.locator('#site-menu')).toBeVisible();
  await page.locator('[data-menu-close]').click();
  await expect(opener).toBeFocused();
  await expect(page.locator('#site-menu')).toBeHidden();

  for (let i = 0; i < 2; i++) {
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('[data-home]')).toHaveAttribute(
      'data-mobile-motion',
      'natural',
    );
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    const hero = await page.locator('.hero').boundingBox();
    const about = await page.locator('.about').boundingBox();
    expect(about!.y).toBeGreaterThanOrEqual(hero!.y + hero!.height - 1);
    await expect(page.locator('.hero')).not.toHaveAttribute('inert', '');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.pin-spacer')).toHaveCount(3);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('[data-home]')).toHaveClass(
    /has-philosophy-motion/,
  );
  await expect(page.locator('[data-home]')).not.toHaveClass(
    /has-mobile-motion/,
  );
  await expect(page.locator('.pin-spacer')).toHaveCount(3);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.pin-spacer')).toHaveCount(3);
  // ScrollTrigger debounces orientation/viewport refreshes for 200ms. Let
  // that browser resize cycle finish before issuing a new scripted scroll.
  await page.waitForTimeout(350);
  await sample(page, 0.97);
  await expect(page.locator('.about-copy')).toHaveCSS('opacity', '1');
});

test('H5 reduced motion can be toggled live without invisible text or stale pins', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('en/index.html');
  await expect(page.locator('.pin-spacer')).toHaveCount(3);
  await sample(page, 0.6);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.pin-spacer')).toHaveCount(0);
  await expect(page.locator('[data-home]')).toHaveAttribute(
    'data-mobile-static',
    'true',
  );
  await expect(page.locator('.hero')).toHaveCSS('opacity', '1');
  await expect(page.locator('.about-copy')).toHaveCSS('opacity', '1');
  await expect(page.locator('.hero')).not.toHaveAttribute('inert', '');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.pin-spacer')).toHaveCount(3);
  await sample(page, 0.97);
});

test('H5 animation import failure leaves the complete static story readable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(
    /\/(?:_astro\/home\.[^/]+\.js|src\/scripts\/home\.ts)/,
    (route) => route.abort(),
  );
  await page.goto('en/index.html');
  await expect(page.locator('[data-home]')).toHaveAttribute(
    'data-mobile-static',
    'true',
  );
  await expect(page.locator('.pin-spacer')).toHaveCount(0);
  await expect(page.locator('.about-copy')).toHaveCSS('opacity', '1');
  await page.locator('[data-sector=physical]').click();
  await expect(page.locator('[data-sector-panel=physical]')).toBeVisible();
});

test('a native touch swipe advances the pinned H5 stage without stealing the gesture', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'CDP touch injection is Chromium-only');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('zh/index.html');
  await expect(page.locator('.pin-spacer')).toHaveCount(3);
  await sample(page, 0.15);
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 195, y: 700 }],
  });
  for (let i = 1; i <= 12; i++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 195, y: 700 - i * 25 }],
    });
    await page.waitForTimeout(25);
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  const stage = page.locator('[data-philosophy-stage]');
  await expect
    .poll(async () => Number(await stage.getAttribute('data-motion-progress')))
    .toBeGreaterThan(0.25);
  expect((await stage.boundingBox())!.y).toBeCloseTo(0, 0);
  await page.locator('[data-menu-open]').tap();
  await expect(page.locator('#site-menu')).toBeVisible();
  await page.locator('[data-menu-close]').tap();
  await expect(page.locator('#site-menu')).toBeHidden();
  await session.detach();
});
