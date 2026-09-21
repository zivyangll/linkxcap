import { test, expect } from '@playwright/test';

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
  await expect(page.locator('[data-menu-open]')).toHaveCSS('width', '42px');
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
    let previous = await sample(0.54);
    const entering = await sample(0.58);
    expect(entering.pointY).toBeGreaterThan(previous.pointY);
    expect(entering.titleY).toBeGreaterThan(previous.titleY);
    expect(entering.titleOpacity).toBeGreaterThan(0);
    expect(entering.titleOpacity).toBeLessThan(1);
    previous = entering;
    for (const progress of [0.62, 0.68, 0.74, 0.84, 0.96]) {
      const next = await sample(progress);
      expect(Math.abs(next.top)).toBeLessThan(1);
      expect(next.pointY).toBeGreaterThanOrEqual(previous.pointY - 0.5);
      expect(next.titleY).toBeGreaterThanOrEqual(previous.titleY - 0.5);
      expect(next.titleOpacity).toBeGreaterThanOrEqual(
        previous.titleOpacity - 0.01,
      );
      previous = next;
    }
    await expect(page.locator('.about-copy')).toHaveCSS('opacity', '1');
    // Returning through the handoff reconstructs identical positions, rather
    // than depending on which of several triggers last wrote a transform.
    const reversed = await sample(0.58);
    expect(reversed.pointY).toBeCloseTo(entering.pointY, 0);
    expect(reversed.titleY).toBeCloseTo(entering.titleY, 0);
    await sample(0.96);
    const leavingBefore = await stage.boundingBox();
    const copyBefore = await page.locator('.about-title').boundingBox();
    await page.evaluate(
      (y) => scrollTo(0, y),
      bounds.start + bounds.distance + 200,
    );
    const leavingAfter = await stage.boundingBox();
    const copyAfter = await page.locator('.about-title').boundingBox();
    expect(leavingAfter!.y).toBeLessThan(leavingBefore!.y - 150);
    expect(copyAfter!.y - copyBefore!.y).toBeCloseTo(
      leavingAfter!.y - leavingBefore!.y,
      0,
    );
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

test('desktop company rail remains a single continuous blurred looping arc', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('zh/portfolio/zhipu-ai.html');
  const browser = page.locator('[data-company-browser]');
  const rail = page.locator('[data-company-nav]');
  await expect(browser).toHaveAttribute('data-rail-ready', 'true');
  await expect(page.locator('[data-company-link]')).toHaveCount(19);
  await expect(page.locator('[data-company-loop-link]')).toHaveCount(38);

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
      return links
        .map((link) =>
          link.querySelector('.rail-marker')!.getBoundingClientRect(),
        )
        .filter((marker) => marker.bottom > 0 && marker.top < innerHeight)
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
  await expect(browser).toHaveAttribute('data-current-company', 'agic-micro');
  await page.keyboard.press('ArrowUp');
  await expect(browser).toHaveAttribute('data-current-company', 'xingyun-ic');
  await page.keyboard.press('ArrowDown');
  await expect(browser).toHaveAttribute('data-current-company', 'agic-micro');

  await page.keyboard.press('End');
  await expect(browser).toHaveAttribute('data-current-company', 'xingyun-ic');
  await page.keyboard.press('ArrowDown');
  await expect(browser).toHaveAttribute('data-current-company', 'agic-micro');
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

test('exactly three portraits swap to the corresponding in-card biography', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('zh/team.html');
  await expect(page.locator('[data-person]')).toHaveCount(3);
  const bioWidths: number[] = [];
  for (const id of ['alex', 'elliot', 'wenjue']) {
    const portrait = page.locator(`[data-person=${id}]`);
    const bio = page.locator(`[data-person-bio=${id}]`);
    await portrait.hover();
    await expect(bio).toBeVisible();
    await expect(portrait).toHaveCSS('opacity', '0');
    const l = await portrait.boundingBox(),
      r = await bio.boundingBox();
    expect(r!.x).toBeGreaterThan(l!.x);
    expect(r!.x + r!.width).toBeLessThan(l!.x + l!.width);
    expect(r!.y).toBeGreaterThan(l!.y);
    expect(r!.y + r!.height).toBeLessThan(l!.y + l!.height);
    bioWidths.push(r!.width);
    await page.mouse.move(20, 150);
    await expect(bio).not.toBeVisible();
  }
  expect(Math.max(...bioWidths) - Math.min(...bioWidths)).toBeLessThan(1);
});

test('Fellow arc moves, window expands, and pending film stays explicitly marked', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('zh/contact.html');
  await expect(page.locator('.next-title-outline')).toBeVisible();
  await expect(page.locator('.next-zh-outline')).toBeVisible();
  await expect(page.locator('.next-zh-fill')).toHaveCSS('opacity', '0');
  await expect(
    page.locator('.signal-guides--opening .signal-guide-v'),
  ).toHaveCount(4);
  await expect(
    page.locator('.signal-guides--opening .signal-guide-h'),
  ).toHaveCount(6);
  await expect(
    page.locator('.signal-guides--context .signal-guide-v'),
  ).toHaveCount(4);
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
  const contextBox = (await context.boundingBox())!;
  const markerBox = (await marker.boundingBox())!;
  const lastLineBox = (await context.locator('p').last().boundingBox())!;
  expect(markerBox.y).toBeGreaterThan(lastLineBox.y + lastLineBox.height);
  expect(
    Math.abs(
      markerBox.x + markerBox.width / 2 - (contextBox.x + contextBox.width / 2),
    ),
  ).toBeLessThan(1);
  const initialVideo = (await page
    .locator('[data-video-shell]')
    .boundingBox())!;
  const before = initialVideo.width;
  expect(Math.abs(initialVideo.x + initialVideo.width / 2 - 720)).toBeLessThan(
    1,
  );
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
  const expandedVideo = (await page
    .locator('[data-video-shell]')
    .boundingBox())!;
  expect(
    Math.abs(expandedVideo.x + expandedVideo.width / 2 - 720),
  ).toBeLessThan(1);
  await expect(page.locator('.fellow-video-placeholder')).toContainText(
    '待提供',
  );
  await expect(page.locator('[data-fellow-video]')).toHaveCount(0);
});

test('English Fellow subtitle changes from outline to fill without overlapping its copy', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('en/contact.html');
  const outline = page.locator('.next-en-outline');
  const fill = page.locator('.next-en-fill');
  await expect(outline).toHaveCSS('color', 'rgba(0, 0, 0, 0)');
  await expect(fill).toHaveCSS('opacity', '0');
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
  const fillBox = (await fill.boundingBox())!;
  const contextBox = (await page.locator('.fellow-context').boundingBox())!;
  expect(fillBox.y + fillBox.height).toBeLessThan(contextBox.y);
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
    await expect(scene).toHaveAttribute('data-highlighted-edges', '3');
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
  await star.click();
  await star.hover();
  if ((await scene.getAttribute('data-renderer')) === 'webgl') {
    await expect(star.locator('.star-glyph')).toHaveCSS('filter', 'none');
    await expect(star).toHaveAttribute('data-hovered', 'true');
    await expect(scene).toHaveAttribute(
      'data-highlighted-node',
      'sector-physical',
    );
    await expect
      .poll(async () =>
        Number(await scene.getAttribute('data-highlighted-edges')),
      )
      .toBe(3);
    await expect(
      page.locator('[data-topology-anchor=sector-infrastructure]'),
    ).toHaveAttribute('data-topology-state', 'unrelated');
    await expect(
      page.locator('[data-topology-anchor=company-phybot]').first(),
    ).toHaveAttribute('data-topology-state', 'connected');
    await expect(star.locator('.glyph-active')).toBeVisible();
    await expect(star.locator('.glyph-inactive')).toBeHidden();
    const value = await scene.getAttribute('data-render-frames');
    await expect
      .poll(() => scene.getAttribute('data-render-frames'))
      .not.toBe(value);
    await page.locator('[data-motion-toggle]').click();
    await expect(scene).toHaveAttribute('data-running', 'false');
  } else
    await expect(star.locator('.star-glyph')).not.toHaveCSS('filter', 'none');
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
