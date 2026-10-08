import { expect, test, type Page } from '@playwright/test';

async function stageRange(page: Page) {
  const stage = page.locator('[data-philosophy-stage]');
  await expect(page.locator('[data-home]')).toHaveClass(/has-h5-sequence/);
  await page.evaluate(() => document.fonts.ready);
  return stage.evaluate((el) => ({
    start: el.parentElement!.getBoundingClientRect().top + scrollY,
    distance: el.parentElement!.offsetHeight - (el as HTMLElement).offsetHeight,
  }));
}

async function openingSample(page: Page, p: number) {
  const opening = page.locator('.opening');
  const range = await opening.evaluate((el) => ({
    start: el.parentElement!.getBoundingClientRect().top + scrollY,
    distance: el.parentElement!.offsetHeight - (el as HTMLElement).offsetHeight,
  }));
  await page.evaluate(
    (top) => scrollTo({ top, behavior: 'instant' }),
    range.start + range.distance * p,
  );
  const trail = page.locator('.opening .scroll-trail');
  await expect
    .poll(async () => Number(await trail.getAttribute('data-trail-progress')))
    .toBeCloseTo(p, 2);
  return trail.evaluate((canvas) =>
    (canvas as HTMLCanvasElement).dataset.point!.split(',').map(Number),
  );
}

async function sample(
  page: Page,
  range: { start: number; distance: number },
  p: number,
) {
  await page.evaluate(
    (top) => scrollTo({ top, behavior: 'instant' }),
    range.start + range.distance * p,
  );
  const stage = page.locator('[data-philosophy-stage]');
  await expect
    .poll(async () => Number(await stage.getAttribute('data-motion-progress')))
    .toBeCloseTo(p, 3);
  return stage.evaluate((el) => {
    const canvas = el.querySelector<HTMLCanvasElement>('canvas')!;
    return {
      point: canvas.dataset.point!.split(',').map(Number),
      world: canvas.dataset.worldPoint!.split(',').map(Number),
      arcBottom: canvas.dataset.arcBottom!.split(',').map(Number),
      markers: canvas.dataset.markerCount,
      opacity: Number(canvas.dataset.nodeOpacity),
    };
  });
}

test.describe('phone home Figma sequence', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'no-preference',
  });

  test('the straight opening rail continues to mid-screen before its node fades', async ({
    page,
  }) => {
    await page.goto('zh/index.html');
    const openingStart = await openingSample(page, 0.2);
    const openingEnd = await openingSample(page, 0.8);
    expect(openingEnd[1]).toBeGreaterThan(openingStart[1]);
    expect(openingEnd[0]).toBeCloseTo(openingStart[0], 2);
    const range = await stageRange(page);
    const heroStart = await sample(page, range, 0);
    expect(heroStart.markers).toBe('1');
    await expect(page.locator('.opening .scroll-trail')).toHaveAttribute(
      'data-trail-progress',
      '1.000',
    );
    const heroMoving = await sample(page, range, 0.1);
    expect(heroMoving.point[0]).toBeCloseTo(heroStart.point[0], 2);
    expect(heroMoving.point[1]).toBeGreaterThan(heroStart.point[1]);
    const heroFading = await sample(page, range, 0.26);
    expect(heroFading.point[0]).toBeCloseTo(heroStart.point[0], 2);
    expect(heroFading.opacity).toBeGreaterThan(0);
    expect(heroFading.opacity).toBeLessThan(1);
    const heroMiddle = await sample(page, range, 0.3);
    expect(heroMiddle.markers).toBe('0');
    expect(heroMiddle.opacity).toBe(0);
    await expect(page.locator('.hero .h5-hero-arc')).toBeHidden();
    await expect(page.locator('.hero .h5-hero-guide')).toBeHidden();
    await expect(page.locator('.hero .h5-arc-markers')).toBeHidden();
    await expect(page.locator('.h5-hero-title')).toHaveCSS('opacity', '1');
    await expect(page.locator('.hero-title--zh')).toHaveCSS('opacity', '1');
    await expect(page.locator('.h5-hero-title > span')).toHaveText([
      'Backing the',
      'builders of',
      'the intelligence age',
    ]);
  });

  test('the node joins the arc bottom and stays on one vertical rail into the fourth screen', async ({
    page,
  }) => {
    await page.goto('zh/index.html');
    const range = await stageRange(page);
    const junction = await sample(page, range, 0.46);
    expect(junction.point[0]).toBeCloseTo(junction.arcBottom[0], 0);
    expect(junction.point[1]).toBeCloseTo(junction.arcBottom[1], 0);
    let previous = junction;
    for (const p of [0.5, 0.58, 0.64, 0.7, 0.76, 0.82, 0.86, 0.9]) {
      const next = await sample(page, range, p);
      expect(next.point[0]).toBeCloseTo(375 / 2, 0);
      expect(next.world[1]).toBeGreaterThanOrEqual(previous.world[1] - 0.1);
      expect(next.markers).toBe('1');
      if (p >= 0.64 && p <= 0.76) {
        const heading = await page
          .locator('.h5-north-line')
          .first()
          .boundingBox();
        expect(heading!.y).toBeGreaterThan(next.point[1] + 5);
      }
      previous = next;
    }
    await expect(page.locator('.about-title span').first()).toHaveCSS(
      'opacity',
      '1',
    );
    await expect(page.locator('.h5-about-exit')).toHaveCount(0);
    await expect
      .poll(() =>
        page
          .locator('.about-copy')
          .evaluate((el) => Number(getComputedStyle(el).opacity)),
      )
      .toBeGreaterThan(0.999);
    const forward = await sample(page, range, 0.58);
    await sample(page, range, 0.9);
    const backward = await sample(page, range, 0.58);
    expect(backward.point[0]).toBeCloseTo(forward.point[0], 0);
    expect(backward.point[1]).toBeCloseTo(forward.point[1], 0);
    await expect(page.locator('.h5-north-line').first()).toHaveCSS(
      'opacity',
      '1',
    );
  });

  test('reduced motion remains readable and phone assets disappear at the PC breakpoint', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('zh/index.html');
    await expect(page.locator('[data-home]')).not.toHaveClass(
      /has-h5-sequence/,
    );
    await expect(page.locator('.h5-hero-title')).toBeVisible();
    await expect(page.locator('.h5-north-star')).toBeVisible();
    await expect(page.locator('.h5-north-sharp').first()).toHaveCSS(
      'opacity',
      '1',
    );
    await expect(page.locator('.about-copy')).toHaveCSS('opacity', '1');
    await page.setViewportSize({ width: 768, height: 900 });
    await expect(page.locator('.h5-hero-title')).toBeHidden();
    await expect(page.locator('.h5-north-star')).toBeHidden();
    await expect(page.locator('.h5-hero-arc')).toBeHidden();
    await expect(page.locator('[data-home]')).not.toHaveClass(/has-h5-layout/);
  });
});
