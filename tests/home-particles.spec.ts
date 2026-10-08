import { expect, test, type Page } from '@playwright/test';

async function observeParticlePaints(page: Page) {
  await page.addInitScript(() => {
    const observedWindow = window as unknown as { particlePaints: number };
    observedWindow.particlePaints = 0;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.hasAttribute('data-home-particles'))
        observedWindow.particlePaints++;
      return clear.apply(this, args);
    };
  });
}

const paints = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { particlePaints: number }).particlePaints,
  );

for (const touch of [false, true]) {
  test.describe(touch ? 'touch particles' : 'desktop particles', () => {
    test.use({
      viewport: touch
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
      isMobile: touch,
      hasTouch: touch,
      reducedMotion: 'no-preference',
    });

    for (const lang of ['zh', 'en']) {
      test(`${lang} backdrop stays fixed through light chapters and pauses only in Focus`, async ({
        page,
      }) => {
        await observeParticlePaints(page);
        await page.goto(`${lang}/index.html`);
        await page.evaluate(() => document.fonts.ready);
        const home = page.locator('[data-home]');
        await expect(home).toHaveClass(
          touch ? /has-mobile-motion/ : /has-philosophy-motion/,
        );
        const layer = page.locator('[data-home-particles-layer]');
        const field = page.locator('.home-particle-field');
        await expect(layer).toBeVisible();
        await expect(layer).toHaveCSS('position', 'fixed');
        await expect.poll(() => paints(page)).toBeGreaterThan(1);
        const initial = (await field.boundingBox())!;
        const stops = await home.evaluate((element) => {
          const home = element as HTMLElement;
          if (home.dataset.snapStops) {
            const stops = home.dataset.snapStops.split(',').map(Number);
            return [0, stops[1], stops[3], stops[4]];
          }
          const stage = home.querySelector<HTMLElement>('.philosophy-stage')!;
          const spacer = stage.parentElement!;
          const start = spacer.getBoundingClientRect().top + scrollY;
          const distance = spacer.offsetHeight - stage.offsetHeight;
          const research = home.querySelector('.research')!;
          return [
            0,
            start + distance * 0.25,
            start + distance * 0.9,
            research.getBoundingClientRect().top + scrollY,
          ];
        });
        for (const stop of stops) {
          await page.evaluate(
            (top) => scrollTo({ top, behavior: 'instant' }),
            stop,
          );
          await expect(layer).toBeVisible();
          const box = (await field.boundingBox())!;
          expect(box.x).toBeCloseTo(initial.x, 1);
          expect(box.y).toBeCloseTo(initial.y, 1);
          expect(box.width).toBeCloseTo(initial.width, 1);
          expect(box.height).toBeCloseTo(initial.height, 1);
        }
        for (const selector of ['.opening', '.philosophy-stage', '.research'])
          await expect(page.locator(selector)).toHaveCSS(
            'background-color',
            'rgba(0, 0, 0, 0)',
          );

        await page.locator('#focus').evaluate((focus) =>
          scrollTo({
            top: focus.getBoundingClientRect().top + scrollY,
            behavior: 'instant',
          }),
        );
        await expect(layer).toBeHidden();
        // Let the canvas's final resize finish, then check actual paint calls.
        await page.waitForTimeout(150);
        const paused = await paints(page);
        await page.waitForTimeout(200);
        expect(await paints(page)).toBe(paused);

        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await expect(layer).toBeVisible();
        await expect.poll(() => paints(page)).toBeGreaterThan(paused + 1);
        const restored = (await field.boundingBox())!;
        expect(restored.x).toBeCloseTo(initial.x, 1);
        expect(restored.y).toBeCloseTo(initial.y, 1);
        await expect(page.locator('[data-home-particles]')).toHaveCount(1);
      });
    }
  });
}

test('reduced motion keeps a static field and responds to live preference changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await observeParticlePaints(page);
  await page.goto('zh/index.html');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-home-particles-layer]')).toBeVisible();
  await expect.poll(() => paints(page)).toBeGreaterThan(0);
  await page.waitForTimeout(150);
  const still = await paints(page);
  await page.waitForTimeout(200);
  expect(await paints(page)).toBe(still);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => paints(page)).toBeGreaterThan(still + 1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(150);
  const stopped = await paints(page);
  await page.waitForTimeout(200);
  expect(await paints(page)).toBe(stopped);
});

test('a direct Focus link hides particles and a failed asset keeps the paper fallback', async ({
  page,
}) => {
  await page.goto('zh/index.html#focus');
  await expect(page.locator('body')).toHaveClass(/has-home-particles/);
  await expect(page.locator('[data-home-particles-layer]')).toBeHidden();
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.locator('[data-home-particles-layer]')).toBeVisible();

  await page.route('**/assets/particles.bin', (route) => route.abort());
  await page.goto('en/index.html');
  await expect(page.locator('[data-home-particles-layer]')).toBeHidden();
  await expect(page.locator('.opening > .paper-texture')).toBeVisible();
  await expect(page.locator('.opening-title')).toBeVisible();
});
