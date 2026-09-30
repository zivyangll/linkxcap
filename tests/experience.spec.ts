import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'no-preference',
});

test('opening fades and resolves blur without scrolling', async ({ page }) => {
  await page.goto('zh/index.html', { waitUntil: 'domcontentloaded' });
  const title = page.locator('.opening-title');
  const keyframes = await title.evaluate((el) =>
    el
      .getAnimations()
      .flatMap((animation) =>
        (animation.effect as KeyframeEffect).getKeyframes(),
      ),
  );
  expect(keyframes.some((frame) => Number(frame.opacity) === 0)).toBe(true);
  expect(keyframes.some((frame) => Number(frame.opacity) === 1)).toBe(true);
  await expect(title).toHaveCSS('opacity', '1');
  await expect(title).toHaveCSS('filter', 'blur(0px)');
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('opening copy sits one-third closer to the title in both locales', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const originalGaps = { zh: 325.953125, en: 414.109375 };
  for (const locale of ['zh', 'en'] as const) {
    await page.goto(`${locale}/index.html`);
    await page.evaluate(() => document.fonts.ready);
    const geometry = await page.evaluate(() => {
      const title = document
        .querySelector('.opening-title')!
        .getBoundingClientRect();
      const copy = document
        .querySelector('.opening-copy')!
        .getBoundingClientRect();
      return {
        gap: copy.left - title.right,
        copyWidth: copy.width,
      };
    });
    expect(geometry.gap / originalGaps[locale]).toBeGreaterThan(0.62);
    expect(geometry.gap / originalGaps[locale]).toBeLessThan(0.7);
    expect(geometry.copyWidth).toBeCloseTo(617, 0);
  }
});

test('opening, Partnering, and About settle at equal-speed authored stops', async ({
  page,
}) => {
  await page.goto('zh/index.html');
  const home = page.locator('[data-home]');
  await expect(home).toHaveAttribute('data-snap-thresholds', /,/);
  await page.evaluate(() => document.fonts.ready);
  const stops = (await home.getAttribute('data-snap-stops'))!
    .split(',')
    .map(Number);
  const thresholds = (await home.getAttribute('data-snap-thresholds'))!
    .split(',')
    .map(Number);
  await page.mouse.move(700, 700);
  await page.mouse.wheel(0, thresholds[0] + 12);
  await expect
    .poll(() => page.evaluate(() => scrollY), { timeout: 7000 })
    .toBeCloseTo(stops[1], -1);
  await expect(home).not.toHaveAttribute('data-snapping', 'true');
  await expect(page.locator('.hero')).toHaveCSS('opacity', '1');
  await page.mouse.wheel(0, thresholds[1] - stops[1] - 30);
  await page.waitForTimeout(400);
  await expect(home).not.toHaveAttribute('data-snapping', 'true');
  const travelled = Number(
    await page
      .locator('[data-philosophy-stage]')
      .getAttribute('data-motion-progress'),
  );
  expect(travelled).toBeGreaterThan(0.5);
  expect(travelled).toBeLessThan(0.8);
  await page.mouse.wheel(0, 45);
  await expect(home).not.toHaveAttribute('data-arc-snap-active', 'true');
  await expect
    .poll(() => page.evaluate(() => scrollY), { timeout: 7000 })
    .toBeCloseTo(stops[2], -1);
  await expect
    .poll(async () =>
      Number(
        await page
          .locator('[data-philosophy-stage]')
          .getAttribute('data-motion-progress'),
      ),
    )
    .toBeCloseTo(0.8, 2);
  await expect(page.locator('.about-label')).toBeVisible();
  await expect(page.locator('.about-title span').first()).toHaveCSS(
    'filter',
    'blur(0px)',
  );
  await page.mouse.wheel(0, (stops[3] - stops[2]) * 0.6);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => scrollY)).toBeLessThan(thresholds[2]);
  await page.mouse.wheel(0, (stops[3] - stops[2]) * 0.3);
  await expect
    .poll(() => page.evaluate(() => scrollY), { timeout: 7000 })
    .toBeCloseTo(stops[3], -1);
  const held = await page
    .locator('[data-philosophy-stage]')
    .evaluate((stage) => {
      const canvas = stage.querySelector('canvas')!;
      return {
        progress: Number((stage as HTMLElement).dataset.motionProgress),
        branch: Number(canvas.dataset.branchMarkerOpacity),
        point: canvas.dataset.point,
        junction: canvas.dataset.junctionPoint,
      };
    });
  expect(held.progress).toBeCloseTo(0.94, 2);
  expect(held.branch).toBe(0);
  expect(held.point).toBe(held.junction);
  await expect(page.locator('.about-title span').first()).toHaveCSS(
    'filter',
    'blur(0px)',
  );
  await expect(page.locator('.about-copy')).toHaveCSS('opacity', '1');
  for (let i = 3; i < stops.length - 1; i++) {
    await page.mouse.wheel(0, (stops[i + 1] - stops[i]) * 0.6);
    await page.waitForTimeout(250);
    await expect(home).not.toHaveAttribute('data-snapping', 'true');
    expect(await page.evaluate(() => scrollY)).toBeLessThan(thresholds[i]);
    await page.mouse.wheel(0, (stops[i + 1] - stops[i]) * 0.3);
    await expect
      .poll(() => page.evaluate(() => scrollY), { timeout: 7000 })
      .toBeCloseTo(stops[i + 1], -1);
    await expect(home).not.toHaveAttribute('data-snapping', 'true');
  }
  await page.mouse.wheel(0, -(stops[5] - stops[4]) * 0.78);
  await expect
    .poll(() => page.evaluate(() => scrollY), { timeout: 7000 })
    .toBeCloseTo(stops[4], -1);
});

test('small gestures stay native and a pointer press interrupts an automatic transition', async ({
  page,
}) => {
  await page.goto('zh/index.html');
  const home = page.locator('[data-home]');
  await expect(home).toHaveAttribute('data-snap-thresholds', /,/);
  const first = Number(
    (await home.getAttribute('data-snap-thresholds'))!.split(',')[0],
  );
  await page.mouse.move(700, 700);
  await page.mouse.wheel(0, first * 0.5);
  await page.waitForTimeout(250);
  await expect(home).not.toHaveAttribute('data-snapping', 'true');
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(10);
  await page.mouse.wheel(0, first * 0.7);
  await expect(home).toHaveAttribute('data-snapping', 'true');
  await page.mouse.down();
  await expect(home).not.toHaveAttribute('data-snapping', 'true');
  const y = await page.evaluate(() => scrollY);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(y, 0);
  await page.mouse.up();
});

test('continuous trackpad input reaches Partnering and About without a fast arc jump', async ({
  page,
}) => {
  await page.goto('zh/index.html');
  const home = page.locator('[data-home]');
  await expect(home).toHaveAttribute('data-snap-thresholds', /,/);
  const stops = (await home.getAttribute('data-snap-stops'))!
    .split(',')
    .map(Number);
  await page.evaluate((y) => scrollTo(0, y), stops[1] + 2);
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeCloseTo(stops[1] + 2, 0);
  await page.mouse.wheel(0, (stops[2] - stops[1]) * 0.77);
  await expect(home).not.toHaveAttribute('data-arc-snap-active', 'true');
  await expect(home).toHaveAttribute('data-snapping', 'true');
  await expect
    .poll(() => page.evaluate(() => scrollY), { timeout: 7000 })
    .toBeCloseTo(stops[2], -1);
  await expect(home).not.toHaveAttribute('data-snapping', 'true');
  await expect(page.locator('.about-label')).toBeVisible();
});

test('key text progressively resolves from blurred to sharp', async ({
  page,
}) => {
  await page.goto('zh/index.html');
  const stage = page.locator('[data-philosophy-stage]');
  await expect(page.locator('[data-home]')).toHaveClass(
    /has-philosophy-motion/,
  );
  const bounds = await stage.evaluate((el) => ({
    start: el.parentElement!.getBoundingClientRect().top + scrollY,
    distance:
      el.parentElement!.getBoundingClientRect().height -
      el.getBoundingClientRect().height,
  }));
  await page.evaluate(
    (y) => scrollTo(0, y),
    bounds.start + bounds.distance * 0.58,
  );
  await page.waitForTimeout(80);
  const line = page.locator('.about-title span').first();
  await expect
    .poll(() =>
      line.evaluate((el) => parseFloat(getComputedStyle(el).filter.slice(5))),
    )
    .toBeGreaterThan(1);
  await page.evaluate(
    (y) => scrollTo(0, y),
    bounds.start + bounds.distance * 0.94,
  );
  await page.waitForTimeout(80);
  await expect(line).toHaveCSS('filter', 'blur(0px)');
});

test('desktop chapter and orbit node labels share one size and clear their diamonds', async ({
  page,
}) => {
  for (const locale of ['zh', 'en']) {
    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 1366, height: 768 },
      { width: 2160, height: 858 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`${locale}/index.html`);
      await page.evaluate(() => document.fonts.ready);
      const stage = page.locator('[data-philosophy-stage]');
      const sizes = await page
        .locator('.chapter, .orbit-label, .about-label')
        .evaluateAll((elements) =>
          elements.map((element) => getComputedStyle(element).fontSize),
        );
      expect(new Set(sizes).size).toBe(1);
      const chapterGap = await page.evaluate(() => {
        const chapter = document
          .querySelector('.chapter')!
          .getBoundingClientRect();
        const track = document
          .querySelector('.opening-track')!
          .getBoundingClientRect();
        return track.left - chapter.right;
      });
      expect(chapterGap).toBeGreaterThanOrEqual(12);

      const bounds = await stage.evaluate((element) => ({
        start: element.parentElement!.getBoundingClientRect().top + scrollY,
        distance:
          element.parentElement!.getBoundingClientRect().height -
          element.getBoundingClientRect().height,
      }));
      const gapAt = async (progress: number, selector: string) => {
        await page.evaluate(
          (target) => scrollTo(0, target),
          bounds.start + bounds.distance * progress,
        );
        await expect
          .poll(async () =>
            Number(await stage.getAttribute('data-motion-progress')),
          )
          .toBeCloseTo(progress, 2);
        return stage.evaluate((element, labelSelector) => {
          const point = (element.querySelector('canvas')!.dataset.point || '')
            .split(',')
            .map(Number);
          const stageBox = element.getBoundingClientRect();
          const labelBox = element
            .querySelector<HTMLElement>(labelSelector)!
            .getBoundingClientRect();
          return stageBox.left + point[0] - labelBox.right;
        }, selector);
      };
      expect(await gapAt(0.3, '.orbit-label')).toBeGreaterThanOrEqual(18);
      expect(await gapAt(0.58, '.about-label')).toBeGreaterThanOrEqual(18);
    }
  }
});

test('portfolio keeps the original grid and the original round arrow follows the pointer', async ({
  page,
}) => {
  await page.goto('zh/portfolio.html');
  await expect(page.locator('.portfolio-grid')).toHaveCSS('display', 'grid');
  await expect(page.locator('.portfolio-page canvas')).toHaveCount(0);
  await expect(page.locator('[data-orbit-pause]')).toHaveCount(0);
  const card = page.locator('[data-company-card]').first();
  await expect(card.locator('.card-arrow')).toHaveCSS('visibility', 'hidden');
  const box = (await card.boundingBox())!;
  const cursor = page.locator('.live-cursor');
  const x = Math.round(box.x + box.width * 0.6),
    y = Math.round(box.y + box.height * 0.4);
  await page.mouse.move(x, y);
  await expect(cursor).toBeVisible();
  await expect(cursor).toHaveCSS('border-radius', '50%');
  expect(await cursor.locator('img').getAttribute('src')).toBe(
    await card.locator('.card-arrow img').getAttribute('src'),
  );
  const firstCursorBox = (await cursor.boundingBox())!;
  expect(firstCursorBox.x + firstCursorBox.width / 2).toBeCloseTo(x, 0);
  expect(firstCursorBox.y + firstCursorBox.height / 2).toBeCloseTo(y, 0);
  const nextX = Math.round(box.x + box.width * 0.35);
  const nextY = Math.round(box.y + box.height * 0.7);
  await page.mouse.move(nextX, nextY);
  await page.waitForTimeout(260);
  const secondCursorBox = (await cursor.boundingBox())!;
  expect(secondCursorBox.x + secondCursorBox.width / 2).toBeCloseTo(nextX, 0);
  expect(secondCursorBox.y + secondCursorBox.height / 2).toBeCloseTo(nextY, 0);
  await expect(page.locator('.card-number')).toHaveCount(0);
  await expect(card.locator('.company-logo img')).toHaveCSS('filter', 'none');
  const heading = (await page.locator('.portfolio-page h1').boundingBox())!;
  await page.mouse.move(heading.x + 10, heading.y + 10);
  await expect(cursor).toBeHidden();
  await expect(page.locator('html')).not.toHaveClass(
    /(?:^|\s)has-live-cursor(?:\s|$)/,
  );
  await page.mouse.move(x, y);
  await expect(cursor).toBeVisible();
  await Promise.all([
    page.waitForURL(/portfolio\/.+\.html$/),
    page.mouse.click(x, y),
  ]);
  await page.goBack();
  await expect(page.locator('.live-cursor')).toBeHidden();
  await expect(
    page.locator('.portfolio-card').first().locator('.card-arrow'),
  ).toHaveCSS('visibility', 'hidden');
  await page.mouse.move(x, y);
  await expect(page.locator('.live-cursor')).toBeVisible();
  await page.mouse.wheel(0, 50);
  await expect(cursor).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(cursor).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveClass(
    /(?:^|\s)has-live-cursor(?:\s|$)/,
  );
});

test('PC and H5 motion owners are removed and rebuilt independently on resize', async ({
  page,
}) => {
  await page.goto('zh/index.html');
  const home = page.locator('[data-home]');
  await expect(home).toHaveClass(/has-philosophy-motion/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(home).toHaveClass(/has-mobile-motion/);
  await expect(home).not.toHaveClass(/has-philosophy-motion/);
  await expect(home).not.toHaveAttribute('data-snap-stops', /,/);
  await expect(page.locator('.pin-spacer')).toHaveCount(3);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(home).not.toHaveClass(/has-mobile-motion/);
  await expect(home).toHaveClass(/has-philosophy-motion/);
  await expect(home).toHaveAttribute('data-snap-stops', /,/);
  await expect(page.locator('.pin-spacer')).toHaveCount(3);
});

test('image loading holder settles and failed images show their label', async ({
  page,
}) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/team-alex.webp', async (route) => {
    await pending;
    await route.continue();
  });
  await page.goto('zh/team.html', { waitUntil: 'domcontentloaded' });
  const holder = page.locator('[data-person=alex]');
  await expect(holder).toHaveAttribute('data-image-state', 'loading');
  release();
  await expect(holder).toHaveAttribute('data-image-state', 'ready');
  await page.route('**/assets/team-elliot.webp', (route) => route.abort());
  await page.reload();
  await expect(page.locator('[data-person=elliot]')).toHaveAttribute(
    'data-image-state',
    'error',
  );
});

test('mobile video autoplays when visible and toggles on direct click', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('video_example.mp4'))
      requests.push(request.url());
  });
  await page.goto('zh/contact.html');
  const video = page.locator('[data-fellow-video]');
  await video.scrollIntoViewIfNeeded();
  await expect(video.locator('source')).toHaveAttribute(
    'src',
    '/linkxcap/assets/video_example.mp4',
  );
  await expect
    .poll(() => video.evaluate((el) => (el as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0.05);
  await video.click();
  await expect
    .poll(() => video.evaluate((el) => (el as HTMLVideoElement).paused))
    .toBe(true);
  await video.click();
  await expect
    .poll(() => video.evaluate((el) => (el as HTMLVideoElement).paused))
    .toBe(false);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(video).toHaveAttribute('playsinline', '');
  await expect(page.locator('[data-video-play]')).toHaveCount(0);
  expect(requests.length).toBeGreaterThan(0);
});

for (const lang of ['zh', 'en'])
  test(`H5 ${lang} opening becomes solid automatically without scrolling`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}${lang}/index.html`, {
      waitUntil: 'domcontentloaded',
    });
    const title = page.locator('.opening-title');
    const frames = await title.evaluate((element) =>
      element
        .getAnimations()
        .flatMap((a) => (a.effect as KeyframeEffect).getKeyframes()),
    );
    expect(frames.some((frame) => frame.color === 'rgba(0, 0, 0, 0)')).toBe(
      true,
    );
    await expect(title).toHaveCSS('opacity', '1');
    await expect(title).toHaveCSS('color', 'rgb(29, 29, 29)');
    await expect(title).toHaveCSS('-webkit-text-stroke-width', '0px');
    await expect(page.locator('.opening-copy')).toHaveCSS('opacity', '1');
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await context.close();
  });

for (const lang of ['zh', 'en']) {
  test(`Insights ${lang} dots rotate clockwise and respect reduced motion`, async ({
    page,
  }) => {
    await page.goto(`${lang}/insights.html`);
    const orbit = page.locator('.insights-orbit');
    const points = page.locator('.insights-orbit-points');
    const dots = page.locator('.insights-orbit-dot');
    await expect(dots).toHaveCount(32);
    await expect(orbit).toHaveAttribute('data-orbit-running', 'true');
    const before = await points.evaluate(
      (el) => getComputedStyle(el).transform,
    );
    await expect
      .poll(() => points.evaluate((el) => getComputedStyle(el).transform))
      .not.toBe(before);
    const frames = await points.evaluate((el) =>
      el
        .getAnimations()
        .flatMap((a) => (a.effect as KeyframeEffect).getKeyframes()),
    );
    expect(
      frames.some((frame) =>
        /rotate\((?:360deg|1turn)\)/.test(String(frame.transform)),
      ),
    ).toBe(true);
    const dotFrames = await dots
      .first()
      .evaluate((el) =>
        el
          .getAnimations()
          .flatMap((a) => (a.effect as KeyframeEffect).getKeyframes()),
      );
    expect(
      dotFrames.some(
        (frame) =>
          Number(frame.opacity) >= 0.8 &&
          /blur\((?:0(?:px)?|)\)/.test(String(frame.filter)),
      ),
    ).toBe(true);
    expect(
      dotFrames.some((frame) => /blur\([^0]/.test(String(frame.filter))),
    ).toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(orbit).toHaveAttribute('data-orbit-running', 'false');
    await expect(points).toHaveCSS('animation-name', 'none');
    await expect(dots.first()).toHaveCSS('animation-name', 'none');
    await expect(page.locator('.insight-row').first()).toBeVisible();
  });
}
