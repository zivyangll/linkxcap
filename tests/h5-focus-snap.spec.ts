import { expect, test } from '@playwright/test';

test.use({ isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
]) {
  for (const lang of ['zh', 'en']) {
    test(`H5 ${lang} star map settles as one full screen once at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(`${lang}/index.html`);
      await expect(page.locator('[data-home]')).toHaveClass(
        /has-mobile-motion/,
      );
      await page.evaluate(() => document.fonts.ready);
      const map = page.locator('[data-h5-focus]');
      const frame = map.locator('.h5-focus-frame');
      const approach = await frame.evaluate((el) => {
        const header = document.querySelector('[data-header]')!;
        return (
          el.getBoundingClientRect().top +
          scrollY -
          header.getBoundingClientRect().bottom -
          60
        );
      });
      await page.evaluate(
        (top) => scrollTo({ top, behavior: 'instant' }),
        approach,
      );
      await expect(map).toHaveAttribute('data-h5-snapping', 'true');
      await expect
        .poll(() => frame.evaluate((el) => el.getBoundingClientRect().top))
        .toBeCloseTo(0, 0);
      await expect(map).not.toHaveAttribute('data-h5-snapping', 'true');

      const destination = await page.evaluate(() => scrollY - 40);
      await page.evaluate(
        (top) => scrollTo({ top, behavior: 'instant' }),
        destination,
      );
      // The next gesture leaves the stop instead of snapping back to it.
      await page.waitForTimeout(650);
      expect(await page.evaluate(() => scrollY)).toBeCloseTo(destination, 0);
      await expect(map).not.toHaveAttribute('data-h5-snapping', 'true');

      await map.locator('[data-h5-sector=chips]').tap();
      await expect(map).toHaveAttribute('data-h5-selection', 'chips');
      await expect(map.locator('[data-h5-result=chips]')).toBeVisible();
    });
  }
}

test('a large downward gesture lands on the star-map screen before the page bottom', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: false,
    hasTouch: false,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}zh/index.html`);
  await expect(page.locator('[data-home]')).toHaveClass(/has-mobile-motion/);
  await page.evaluate(() => document.fonts.ready);
  const map = page.locator('[data-h5-focus]');
  const frame = map.locator('.h5-focus-frame');
  const top = await frame.evaluate(
    (el) => el.getBoundingClientRect().top + scrollY - 220,
  );
  await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), top);
  await page.mouse.wheel(0, 1500);
  await expect(map).toHaveAttribute('data-h5-snapping', 'true');
  await page.mouse.wheel(0, 1500);
  await expect
    .poll(() => frame.evaluate((el) => el.getBoundingClientRect().top))
    .toBeCloseTo(0, 0);
  await expect(map).not.toHaveAttribute('data-h5-snapping', 'true');
  const stop = await page.evaluate(() => scrollY);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight - innerHeight - scrollY,
    ),
  ).toBeGreaterThan(40);
  await page.waitForTimeout(200);
  await page.mouse.wheel(0, 40);
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThan(stop + 20);
  await context.close();
});

test('a native touch swipe settles the star-map screen before continuing', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Native touch injection requires CDP');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('zh/index.html');
  await expect(page.locator('[data-home]')).toHaveClass(/has-mobile-motion/);
  await page.evaluate(() => document.fonts.ready);
  const map = page.locator('[data-h5-focus]');
  const frame = map.locator('.h5-focus-frame');
  const top = await frame.evaluate(
    (el) => el.getBoundingClientRect().top + scrollY - 220,
  );
  await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), top);
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 330, y: 700 }],
  });
  for (let step = 1; step <= 12; step++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 330, y: 700 - step * 40 }],
    });
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect
    .poll(() => frame.evaluate((el) => el.getBoundingClientRect().top))
    .toBeCloseTo(0, 0);
  await expect(map).not.toHaveAttribute('data-h5-snapping', 'true');
  await page.waitForTimeout(650);
  expect(
    await frame.evaluate((el) => el.getBoundingClientRect().top),
  ).toBeCloseTo(0, 0);
  await session.detach();
});

test('reduced motion keeps the H5 star map at the user-selected scroll position', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('zh/index.html');
  await page.evaluate(() => document.fonts.ready);
  const map = page.locator('[data-h5-focus]');
  const top = await map
    .locator('.h5-focus-frame')
    .evaluate((el) => el.getBoundingClientRect().top + scrollY - 132);
  await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), top);
  await page.waitForTimeout(650);
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(top, 0);
  await expect(map).not.toHaveAttribute('data-h5-snapping', 'true');
});

test('switching to PC cancels an active H5 star-map settle', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: false,
    hasTouch: false,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}zh/index.html`);
  await expect(page.locator('[data-home]')).toHaveClass(/has-mobile-motion/);
  await page.evaluate(() => document.fonts.ready);
  const map = page.locator('[data-h5-focus]');
  const top = await map
    .locator('.h5-focus-frame')
    .evaluate((el) => el.getBoundingClientRect().top + scrollY - 132);
  await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), top);
  await expect(map).toHaveAttribute('data-h5-snapping', 'true');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(map).not.toHaveAttribute('data-h5-snapping', 'true');
  await expect(map).toBeHidden();
  await expect(page.locator('.constellation')).toBeVisible();
  await expect(page.locator('[data-home]')).toHaveClass(
    /has-philosophy-motion/,
  );
  await context.close();
});
