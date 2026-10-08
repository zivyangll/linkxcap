import { test, expect } from '@playwright/test';

const sections = [
  {
    route: 'portfolio',
    title: '.portfolio-page > .page-title',
    largeTitle: '.portfolio-page > .page-title > span:first-child',
    headline: '.portfolio-intro-line:first-child',
  },
  {
    route: 'team',
    title: '.team-desktop-title',
    largeTitle: '.team-desktop-title > span:last-child',
    headline: '.team-review-title > .page-title > span:first-child',
  },
  {
    route: 'insights',
    title: '.insights-heading-title',
    largeTitle: '.insights-heading-title > p',
    headline: '.insights-headline',
  },
] as const;

for (const lang of ['zh', 'en']) {
  for (const width of [1024, 1440, 1920, 2560]) {
    test(`${lang} desktop section headings stay aligned across routes at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1080 });
      const geometry = [];
      for (const section of sections) {
        await page.goto(`${lang}/${section.route}.html`);
        await page.evaluate(() => document.fonts.ready);
        const title = (await page.locator(section.title).boundingBox())!;
        const largeTitle = (await page
          .locator(section.largeTitle)
          .boundingBox())!;
        const headline = (await page.locator(section.headline).boundingBox())!;
        expect(
          headline.y + headline.height / 2,
          `${section.route}: right first line centers on the left large title`,
        ).toBeCloseTo(largeTitle.y + largeTitle.height / 2, 1);
        expect(headline.x + headline.width).toBeLessThanOrEqual(width);
        geometry.push({ title, largeTitle, headline });
      }

      for (const current of geometry.slice(1)) {
        expect(current.title.x).toBeCloseTo(geometry[0].title.x, 1);
        expect(current.title.y).toBeCloseTo(geometry[0].title.y, 1);
        expect(current.largeTitle.y).toBeCloseTo(geometry[0].largeTitle.y, 1);
        expect(current.headline.x).toBeCloseTo(geometry[0].headline.x, 1);
      }
    });
  }
}
