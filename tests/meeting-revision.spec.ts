import { test, expect } from '@playwright/test';
import content from '../src/data/content.json' with { type: 'json' };

test('philosophy top bar gains a scroll mask and only collapses on narrow screens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('zh/index.html');
  const header = page.locator('[data-header]');
  await expect(page.locator('.desktop-nav')).toBeVisible();
  await expect(page.locator('[data-menu-open]')).toBeHidden();
  await page.evaluate(() => scrollTo(0, 240));
  await expect(header).toHaveClass(/is-scrolled/);
  await expect(header).toHaveCSS('backdrop-filter', /blur\(16px\)/);
  await expect(header).toHaveCSS(
    'background-color',
    /rgba\(253, 251, 245, 0\.84\)/,
  );
  await expect(page.locator('.desktop-nav')).toBeVisible();
  await expect(page.locator('[data-menu-open]')).toBeHidden();

  await page.evaluate(() => scrollTo(0, innerHeight * 3));
  await expect(header).toHaveClass(/is-minimal/);
  await expect(page.locator('.desktop-nav')).toBeVisible();
  await expect(page.locator('[data-menu-open]')).toBeHidden();

  await page.setViewportSize({ width: 1100, height: 900 });
  await expect(page.locator('.desktop-nav')).toBeHidden();
  await expect(page.locator('[data-menu-open]')).toBeVisible();
  await expect(page.locator('[data-menu-open]')).toHaveCSS('width', '48px');
});

test('all page templates share the same responsive top bar contract', async ({
  page,
}) => {
  const routes = [
    'zh/portfolio.html',
    'zh/portfolio/zhipu-ai.html',
    'zh/team.html',
    'zh/insights.html',
    'zh/contact.html',
  ];

  for (const route of routes) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);

    const header = page.locator('[data-header]');
    await expect(header).toHaveCSS('backdrop-filter', /blur\(16px\)/);
    await expect(header).toHaveCSS(
      'background-color',
      /rgba\(253, 251, 245, 0\.84\)/,
    );
    await expect(page.locator('.desktop-nav')).toBeVisible();
    await expect(page.locator('.language-switch')).toBeVisible();
    await expect(page.locator('[data-menu-open]')).toBeHidden();

    await page.setViewportSize({ width: 1100, height: 900 });
    await expect(page.locator('.desktop-nav')).toBeHidden();
    await expect(page.locator('.language-switch')).toBeVisible();
    await expect(page.locator('[data-menu-open]')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.desktop-nav')).toBeHidden();
    await expect(page.locator('[data-menu-open]')).toBeVisible();
  }
});

test('compact desktop header controls share one vertical center', async ({
  page,
}) => {
  for (const locale of ['zh', 'en']) {
    for (const width of [1024, 1100, 1150, 1279]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${locale}/index.html`);
      await page.evaluate(() => document.fonts.ready);

      for (const minimal of [false, true]) {
        await page.locator('[data-header]').evaluate((header, enabled) => {
          header.classList.toggle('is-minimal', enabled);
        }, minimal);

        const centers = await Promise.all(
          ['.home-link', '.language-switch', '[data-menu-open]'].map(
            async (selector) => {
              const box = await page.locator(selector).boundingBox();
              expect(box).not.toBeNull();
              return box!.y + box!.height / 2;
            },
          ),
        );

        expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(
          0.5,
        );
      }
    }
  }
});

test('insight detail activates Insights and keeps the compact menu close icon square', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1150, height: 900 });
  await page.goto('zh/portfolio-yuanmu.html');

  await expect(
    page.locator('.desktop-nav a[href$="/zh/insights.html"]'),
  ).toHaveAttribute('aria-current', 'page');
  await expect(
    page.locator('.desktop-nav a[href$="/zh/portfolio.html"]'),
  ).not.toHaveAttribute('aria-current', 'page');

  await page.locator('[data-menu-open]').click();
  const close = page.locator('[data-menu-close]');
  const closeIcon = close.locator('img');
  await expect(close).toHaveCSS('width', '48px');
  await expect(close).toHaveCSS('height', '48px');
  await expect(closeIcon).toHaveCSS('width', '22px');
  await expect(closeIcon).toHaveCSS('height', '22px');
  await expect(
    page.locator('#site-menu a[href$="/zh/insights.html"]'),
  ).toHaveAttribute('aria-current', 'page');
});

for (const width of [1440, 1920]) {
  test(`philosophy transition has one point and no vertical reversal at ${width}px`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 900 });
    await page.goto('zh/index.html');
    const stage = page.locator('[data-philosophy-stage]');
    await expect(page.locator('[data-home]')).toHaveClass(
      /has-philosophy-motion/,
    );
    await expect(page.locator('.story-scene')).toHaveCount(5);
    const bounds = await stage.evaluate((el) => {
      const spacer = el.parentElement!;
      return {
        start: spacer.getBoundingClientRect().top + scrollY,
        distance:
          spacer.getBoundingClientRect().height -
          el.getBoundingClientRect().height,
      };
    });
    const sample = async (progress: number) => {
      await page.evaluate(
        (y) => scrollTo(0, y),
        bounds.start + bounds.distance * progress,
      );
      await expect
        .poll(async () =>
          Number(await stage.getAttribute('data-motion-progress')),
        )
        .toBeCloseTo(progress, 3);
      return await stage.evaluate((el) => {
        const title = el.querySelector('.about-title span')!;
        const point = (el.querySelector('canvas') as HTMLCanvasElement).dataset
          .point!.split(',')
          .map(Number);
        return {
          pointX: point[0],
          pointY: point[1],
          titleY: title.getBoundingClientRect().y,
          titleOpacity: Number(getComputedStyle(title).opacity),
          copyOpacity: Number(
            getComputedStyle(el.querySelector('.about-copy')!).opacity,
          ),
          top: el.getBoundingClientRect().top,
        };
      });
    };
    await sample(0.15);
    await expect(page.locator('.hero-track')).toBeHidden();
    await expect(page.locator('.hero-orbit')).toBeHidden();
    await expect(page.locator('.orbit-label .diamond')).toBeHidden();
    await expect(page.locator('.about-rays')).toBeHidden();
    await expect(page.locator('.philosophy-stage-canvas')).toBeVisible();
    let previous = await sample(0.7);
    const entering = await sample(0.74);
    expect(entering.pointY).toBeGreaterThan(previous.pointY);
    expect(entering.titleY).toBeGreaterThanOrEqual(previous.titleY);
    expect(entering.titleOpacity).toBeGreaterThan(0);
    expect(entering.titleOpacity).toBeLessThan(1);
    previous = entering;
    for (const progress of [0.78, 0.82, 0.86]) {
      const next = await sample(progress);
      expect(Math.abs(next.top)).toBeLessThan(1);
      expect(next.pointY).toBeGreaterThanOrEqual(previous.pointY - 0.5);
      expect(next.titleY).toBeGreaterThanOrEqual(previous.titleY - 0.5);
      expect(next.titleOpacity).toBeGreaterThanOrEqual(
        previous.titleOpacity - 0.01,
      );
      previous = next;
    }
    // Once the composition reaches the left-hand axis it holds fully readable
    // for a distinct scroll interval instead of fading during the move.
    for (const progress of [0.9, 0.92, 0.94, 0.96]) {
      const next = await sample(progress);
      expect(Math.abs(next.top)).toBeLessThan(1);
      expect(next.pointY).toBeGreaterThanOrEqual(previous.pointY - 0.5);
      expect(next.titleY).toBeGreaterThanOrEqual(previous.titleY - 0.5);
      expect(next.titleOpacity).toBeGreaterThan(0.99);
      if (progress >= 0.92) expect(next.copyOpacity).toBeGreaterThan(0.99);
      previous = next;
    }
    // The copy remains fully visible while the node completes its downward
    // handoff. Fading belongs to the subsequent natural page exit.
    for (const progress of [0.975, 0.99, 1]) {
      const next = await sample(progress);
      expect(Math.abs(next.top)).toBeLessThan(1);
      expect(next.pointY).toBeGreaterThanOrEqual(previous.pointY - 0.5);
      expect(next.titleY).toBeGreaterThanOrEqual(previous.titleY - 0.5);
      expect(next.titleOpacity).toBeGreaterThan(0.99);
      expect(next.copyOpacity).toBeGreaterThan(0.99);
      previous = next;
    }
    // Returning through the handoff reconstructs identical positions, rather
    // than depending on which of several triggers last wrote a transform.
    const reversed = await sample(0.74);
    expect(reversed.pointY).toBeCloseTo(entering.pointY, 0);
    expect(reversed.titleY).toBeCloseTo(entering.titleY, 0);
    await sample(1);
    // Read stage and title in one browser frame; separate protocol round trips
    // can otherwise sample different positions during native smooth scrolling.
    const geometry = () =>
      stage.evaluate((el) => ({
        stage: el.getBoundingClientRect().y,
        copy: el.querySelector('.about-title')!.getBoundingClientRect().y,
      }));
    const beforeExit = await geometry();
    const titleOffset = await stage
      .locator('.about-title')
      .evaluate((el) => (el as HTMLElement).offsetTop);
    const exitStart = bounds.start + bounds.distance + titleOffset - 200;
    await page.evaluate((y) => scrollTo(0, y), exitStart);
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeCloseTo(exitStart, 0);
    await expect(page.locator('.about')).toHaveCSS('opacity', '1');
    const startGeometry = await geometry();
    expect(startGeometry.copy).toBeCloseTo(200, 0);

    const exitMiddle = exitStart + 100;
    await page.evaluate((y) => scrollTo(0, y), exitMiddle);
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeCloseTo(exitMiddle, 0);
    await expect
      .poll(() =>
        page
          .locator('.about')
          .evaluate((el) => Number(getComputedStyle(el).opacity)),
      )
      .toBeCloseTo(0.5, 1);

    const exitEnd = exitStart + 200;
    await page.evaluate((y) => scrollTo(0, y), exitEnd);
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeCloseTo(exitEnd, 0);
    await expect(page.locator('.about')).toHaveCSS('opacity', '0');
    const afterExit = await geometry();
    expect(afterExit.copy).toBeCloseTo(0, 0);
    expect(afterExit.stage).toBeLessThan(beforeExit.stage - titleOffset + 1);
  });
}

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
    if (width < 1024) {
      await page.locator('[data-company-link=mosi]').click();
    } else {
      await rail.evaluate((el) => {
        const row = el.querySelector('[data-company-link="mosi"]')!;
        const rect = row.getBoundingClientRect();
        el.scrollTop +=
          rect.top +
          rect.height / 2 -
          el.getBoundingClientRect().top -
          el.clientHeight / 2;
      });
    }
    await expect(page.locator('[data-company-browser]')).toHaveAttribute(
      'data-current-company',
      'mosi',
    );
    await expect(page.locator('[data-company-title]')).toHaveText('模思智能');
    await expect(page.locator('[data-company-website]')).toHaveAttribute(
      'href',
      /mosi/,
    );
    await expect(page).toHaveURL(/portfolio\/mosi.html$/);
    await page.locator('[data-company-nav]').focus();
    await page.keyboard.press('End');
    await expect(
      page.locator('[data-company-link=ligit]'),
    ).toHaveAttribute('aria-current', 'page');
    await page.keyboard.press('Home');
    await expect(
      page.locator('[data-company-link="zhipu-ai"]'),
    ).toHaveAttribute('aria-current', 'page');
    await page.locator('[data-company-link=mosi]').click();
    if (width < 1280) {
      await page.locator('[data-menu-open]').click();
      await page.locator('#site-menu [data-language=en]').click();
    } else await page.locator('.language-switch [data-language=en]').click();
    await expect(page.locator('[data-company-title]')).toHaveText('Mosi');
    await page.reload();
    await expect(page.locator('[data-company-title]')).toHaveText('Mosi');
  });

test('desktop company rail remains a single continuous blurred looping arc', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('zh/portfolio/zhipu-ai.html');
  const browser = page.locator('[data-company-browser]');
  const rail = page.locator('[data-company-nav]');
  await expect(browser).toHaveAttribute('data-rail-ready', 'true');
  await expect(page.locator('[data-company-link]')).toHaveCount(
    content.companies.length,
  );
  await expect(page.locator('[data-company-loop-link]')).toHaveCount(
    content.companies.length * 2,
  );

  const circleErrors = await page
    .locator('[data-company-index]')
    .evaluateAll((links) => {
      const orbit = document
        .querySelector('.company-orbit')!
        .getBoundingClientRect();
      const center = {
        x: orbit.left + orbit.width / 2,
        y: orbit.top + orbit.height / 2,
      };
      const radius = orbit.width * (565 / 1187);
      const rail = document
        .querySelector('[data-company-nav]')!
        .getBoundingClientRect();
      return links
        .map((link) =>
          link.querySelector('.rail-marker')!.getBoundingClientRect(),
        )
        .filter(
          (marker) => marker.bottom > rail.top && marker.top < rail.bottom,
        )
        .map((marker) =>
          Math.abs(
            Math.hypot(
              marker.left + marker.width / 2 - center.x,
              marker.top + marker.height / 2 - center.y,
            ) - radius,
          ),
        );
    });
  expect(Math.max(...circleErrors)).toBeLessThan(1);

  await rail.focus();
  await page.keyboard.press('Home');
  await expect(browser).toHaveAttribute('data-current-company', 'zhipu-ai');
  await page.keyboard.press('ArrowUp');
  await expect(browser).toHaveAttribute(
    'data-current-company',
    'ligit',
  );
  await page.keyboard.press('ArrowDown');
  await expect(browser).toHaveAttribute('data-current-company', 'zhipu-ai');

  await page.keyboard.press('End');
  await expect(browser).toHaveAttribute(
    'data-current-company',
    'ligit',
  );
  await page.keyboard.press('ArrowDown');
  await expect(browser).toHaveAttribute('data-current-company', 'zhipu-ai');
  await expect
    .poll(() =>
      page.locator('[data-company-loop-link]').evaluateAll(
        (rows) =>
          rows.filter((row) => {
            const box = row.getBoundingClientRect();
            const rail = document
              .querySelector('[data-company-nav]')!
              .getBoundingClientRect();
            return box.bottom > rail.top && box.top < rail.bottom;
          }).length,
      ),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      rail.evaluate(
        (element) =>
          element.scrollTop > 0 &&
          element.scrollTop < element.scrollHeight - element.clientHeight,
      ),
    )
    .toBe(true);
  await expect(page.locator('[data-company-link=tairex]')).not.toHaveCSS(
    'filter',
    'blur(0px)',
  );
});

test('all six portraits swap to the corresponding in-card biography', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('zh/team.html');
  await expect(page.locator('[data-person]')).toHaveCount(6);
  const gaps: number[] = [];
  for (const id of ['alex', 'elliott', 'leo', 'wenjue', 'chris', 'emily']) {
    const portrait = page.locator(`[data-person=${id}]`);
    const bio = page.locator(`[data-person-bio=${id}]`);
    await portrait.scrollIntoViewIfNeeded();
    const portraitBox = (await portrait.boundingBox())!;
    await page.mouse.move(
      portraitBox.x + portraitBox.width / 2,
      portraitBox.y + portraitBox.height / 2,
    );
    await expect(bio).toBeVisible();
    await expect(portrait).toHaveCSS('opacity', '0');
    const l = await portrait.boundingBox(),
      r = await bio.boundingBox();
    expect(r!.x).toBeGreaterThan(l!.x);
    expect(r!.x + r!.width).toBeLessThan(l!.x + l!.width);
    expect(r!.y).toBeGreaterThan(l!.y);
    expect(r!.y + r!.height).toBeLessThan(l!.y + l!.height);
    gaps.push(r!.x - l!.x, l!.x + l!.width - r!.x - r!.width);
    await page.mouse.move(20, 150);
    await expect(bio).toBeHidden();
    await expect(bio.locator('button')).toHaveCount(0);
  }
  expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(1);
});

test('Fellow arc moves and the group portrait replaces the video', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('zh/contact.html');
  await expect(page.locator('.next-title-outline')).toBeVisible();
  await expect(page.locator('.next-zh-outline')).toBeVisible();
  await expect(page.locator('.next-zh-fill')).toHaveCSS('opacity', '1');
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(
    page.locator('.signal-guides--opening .signal-guide-v'),
  ).toHaveCount(4);
  await expect(
    page.locator('.signal-guides--opening .signal-guide-h'),
  ).toHaveCount(6);
  await expect(
    page.locator('.signal-guides--context .signal-guide-v'),
  ).toHaveCount(4);
  await expect(page.locator('.fellow-context')).toHaveCSS('opacity', '0');
  await page.evaluate(() => scrollTo(0, innerHeight * 0.45));
  await expect
    .poll(() =>
      page
        .locator('.signal-guides--opening')
        .evaluate((element) => Number(getComputedStyle(element).opacity)),
    )
    .toBeGreaterThan(0.95);
  await expect(page.locator('.fellow-media-guide')).toHaveCount(4);
  await expect(page.locator('.fellow-media-orbit')).toHaveCount(1);
  await expect(page.locator('.fellow-orbit-point')).toHaveCount(0);
  const context = page.locator('.fellow-context');
  const marker = context.locator('.fellow-context-marker');
  await expect(marker).toHaveCount(1);
  await expect(context.locator('p')).toHaveCount(2);
  const contextBox = (await context.boundingBox())!;
  const markerBox = (await marker.boundingBox())!;
  const lastLineBox = (await context.locator('p').last().boundingBox())!;
  expect(markerBox.y).toBeGreaterThan(lastLineBox.y + lastLineBox.height);
  expect(
    Math.abs(
      markerBox.x + markerBox.width / 2 - (contextBox.x + contextBox.width / 2),
    ),
  ).toBeLessThan(1);
  // Figma 251:96 replaces the video with a static group portrait.
  await expect(page.locator('[data-fellow-video], video')).toHaveCount(0);
  const portrait = page.locator('.fellow-media-figure img');
  await expect(portrait).toHaveAttribute('alt', '让想法迈出下一步');
  // Rest on the Figma frame: the portrait finishes its scroll-linked growth
  // exactly when the section reaches the top of the viewport.
  await page.evaluate(() =>
    scrollTo(
      0,
      document.querySelector('[data-fellow-media]')!.getBoundingClientRect()
        .top + scrollY,
    ),
  );
  await expect
    .poll(() =>
      page
        .locator('.fellow-media-figure')
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a),
    )
    .toBeCloseTo(1, 2);
  await expect
    .poll(() =>
      portrait.evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  const figure = (await page.locator('.fellow-media-figure').boundingBox())!;
  // Figma places it at x 310 of 1920 (slightly right of centre).
  expect(Math.abs(figure.x - (310 * 1440) / 1920)).toBeLessThan(1);
  expect(Math.abs(figure.width - (1311 * 1440) / 1920)).toBeLessThan(1);
});

test('English Fellow subtitle changes from outline to fill without overlapping its copy', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('en/contact.html');
  const outline = page.locator('.next-en-outline');
  const fill = page.locator('.next-en-fill');
  await expect(page.locator('.fellow-context p')).toHaveCount(1);
  await expect(page.locator('.fellow-media-caption')).toHaveCount(1);
  await expect(outline).toHaveCSS('color', 'rgba(0, 0, 0, 0)');
  await expect(fill).toHaveCSS('opacity', '1');
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.evaluate(() => scrollTo(0, innerHeight * 0.74));
  await expect
    .poll(async () =>
      Number(await fill.evaluate((e) => getComputedStyle(e).opacity)),
    )
    .toBeGreaterThan(0.9);
  await expect
    .poll(async () =>
      Number(await outline.evaluate((e) => getComputedStyle(e).opacity)),
    )
    .toBeLessThan(0.1);
  // Fill opacity now finishes automatically before scrolling. Wait for the
  // scroll-driven layout as well, rather than treating opacity as its signal.
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeCloseTo(900 * 0.74, 0);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const title = document
          .querySelector('.next-en-fill')!
          .getBoundingClientRect();
        const context = document
          .querySelector('.fellow-context')!
          .getBoundingClientRect();
        return context.top - title.bottom;
      }),
    )
    .toBeGreaterThan(0);
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
    await expect(scene).toHaveAttribute(
      'data-highlighted-node',
      'sector-foundation',
    );
    // One highlighted edge per company configured for the sector.
    await expect(scene).toHaveAttribute(
      'data-highlighted-edges',
      String(
        await page
          .locator('.constellation-company[data-focus-sector=foundation]')
          .count(),
      ),
    );
    await expect(
      page.locator('[data-topology-anchor=company-zhipu-ai]').first(),
    ).toHaveAttribute('data-topology-state', 'connected');
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
    // Read the pose before release: afterwards it springs back to the front.
    await expect(scene).toHaveAttribute('data-dragging', 'true');
    expect(await scene.getAttribute('data-rotation')).not.toBe(rotation);
    const draggedRotation = (await scene.getAttribute('data-rotation'))!
      .split(',')
      .map(Number);
    expect(Math.max(...draggedRotation.map(Math.abs))).toBeGreaterThan(0.15);
    await page.mouse.up();
    await expect(scene).toHaveAttribute('data-dragged', 'true');
    await expect(scene).toHaveAttribute('data-camera-state', 'front', {
      timeout: 2500,
    });
    await expect
      .poll(
        async () =>
          Math.max(
            ...(await scene.getAttribute('data-rotation'))!
              .split(',')
              .map((value) => Math.abs(Number(value))),
          ),
        // The front pose holds for 0.9s before the orbit resumes.
        { intervals: [50] },
      )
      .toBeLessThan(0.01);
  }
  const star = page.locator('[data-sector=physical]');
  const framesBeforeClick = await scene.getAttribute('data-render-frames');
  // The orbiting node can slip from under a click computed a frame earlier.
  await expect(async () => {
    await star.click();
    await expect(star).toHaveAttribute('aria-pressed', 'true', {
      timeout: 1000,
    });
  }).toPass();
  if ((await scene.getAttribute('data-renderer')) === 'webgl')
    await expect(scene).toHaveAttribute('data-camera-state', 'front');
  await star.hover();
  if ((await scene.getAttribute('data-renderer')) === 'webgl') {
    await expect(star.locator('.star-glyph')).toHaveCSS('filter', 'none');
    await expect(star).toHaveAttribute('data-hovered', 'true');
    await expect(scene).toHaveAttribute(
      'data-highlighted-node',
      'sector-physical',
    );
    const physicalCompanies = await page
      .locator('.constellation-company[data-focus-sector=physical]')
      .count();
    await expect
      .poll(async () =>
        Number(await scene.getAttribute('data-highlighted-edges')),
      )
      .toBe(physicalCompanies);
    await expect(
      page.locator('[data-topology-anchor=sector-infrastructure]'),
    ).toHaveAttribute('data-topology-state', 'unrelated');
    await expect(
      page.locator('[data-topology-anchor=company-phybot]').first(),
    ).toHaveAttribute('data-topology-state', 'connected');
    await expect(star.locator('.diamond')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    // A click pins the sector; the scene redraws into that pose, then its
    // render loop may rest until the next interaction.
    await expect
      .poll(() => scene.getAttribute('data-render-frames'))
      .not.toBe(framesBeforeClick);
    await expect(page.locator('[data-motion-toggle]')).toHaveCount(0);
    await page.locator('.opening-title').scrollIntoViewIfNeeded();
    await expect(scene).toHaveAttribute('data-running', 'false');
  } else
    await expect(star.locator('.diamond')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
});

test('portfolio hover illuminates original logo and selection opens its detail', async ({
  page,
}) => {
  await page.goto('zh/portfolio.html');
  const node = page.locator('[data-slug=zhipu-ai]');
  const logo = node.locator('.company-logo img');
  const corners = node.locator('.card-corners');
  const previous = await logo.evaluate((e) => getComputedStyle(e).filter);
  await expect(corners).toHaveCSS('opacity', '0');
  await node.hover();
  await expect(logo).toHaveCSS('filter', 'none');
  await expect(corners).toHaveCSS('opacity', '1');
  expect(previous).not.toBe('none');
  await node.click();
  await expect(page.locator('[data-company-title]')).toHaveText('智谱');
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
