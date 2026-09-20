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
  const handoffStart = start - 900 * 0.9;
  await page.evaluate((y) => scrollTo(0, y), handoffStart + 2);
  await expect(page.locator('[data-home]')).toHaveClass(/is-hero-handoff/);
  const openingHandoffPoint = (await page
    .locator('[data-scroll-trail=opening]')
    .getAttribute('data-point'))!
    .split(',')
    .map(Number);
  const openingCanvas = (await page
    .locator('[data-scroll-trail=opening]')
    .boundingBox())!;
  const heroTrack = (await page.locator('.hero-track').boundingBox())!;
  const heroGuide = (await page.locator('.hero-track-start').boundingBox())!;
  const arcStart = (await page
    .locator('.philosophy-trail')
    .getAttribute('data-point'))!
    .split(',')
    .map(Number);
  expect(openingCanvas.y + openingHandoffPoint[1]).toBeCloseTo(heroTrack.y, 0);
  expect(arcStart[0]).toBeCloseTo(heroTrack.x + heroTrack.width / 2, 0);
  expect(arcStart[1]).toBeCloseTo(heroTrack.y, 0);
  await expect(page.locator('[data-scroll-trail=opening]')).toHaveCSS(
    'opacity',
    '1',
  );
  await page.evaluate((y) => scrollTo(0, y), handoffStart + 100);
  await expect
    .poll(() =>
      page.locator('.hero').evaluate((e) => Number(e.dataset.handoffProgress)),
    )
    .toBeGreaterThan(0.03);
  await expect
    .poll(() => page.locator('.philosophy-trail').getAttribute('data-point'))
    .not.toBe(arcStart.join(','));
  const verticalPoint = (await page
    .locator('.philosophy-trail')
    .getAttribute('data-point'))!
    .split(',')
    .map(Number);
  expect(verticalPoint[0]).toBeCloseTo(arcStart[0], 0);
  expect(verticalPoint[1]).toBeGreaterThan(arcStart[1]);
  expect(verticalPoint[1]).toBeLessThan(heroGuide.y + heroGuide.height / 2);
  await page.evaluate((y) => scrollTo(0, y), start);
  const orbitBefore = await page.locator('.philosophy-orbit').boundingBox();
  const titleBefore = await page.locator('.hero-title').boundingBox();
  const trackBefore = await page.locator('.hero-track').boundingBox();
  const labelBefore = await page.locator('.orbit-label').boundingBox();
  await expect(page.locator('.philosophy-orbit')).toHaveCSS('opacity', '0');
  const heroGuideLine = await page
    .locator('.hero-track')
    .evaluate(
      (element) => getComputedStyle(element, '::before').backgroundImage,
    );
  expect(heroGuideLine).toContain('repeating-linear-gradient');
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
  const labelAfter = await page.locator('.orbit-label').boundingBox();
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
  expect(Math.abs(labelAfter!.x - labelBefore!.x)).toBeGreaterThan(40);
  expect(Math.abs(labelAfter!.y - labelBefore!.y)).toBeGreaterThan(40);
  const trailPoint = (await page
    .locator('.philosophy-trail')
    .getAttribute('data-point'))!
    .split(',')
    .map(Number);
  const labelDot = (await page.locator('.orbit-label .diamond').boundingBox())!;
  expect(labelDot.x + labelDot.width / 2).toBeCloseTo(trailPoint[0], 0);
  expect(labelDot.y + labelDot.height / 2).toBeCloseTo(trailPoint[1], 0);
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
  const aboutHandoffStart = aboutStart - 900 * 0.9;
  await page.evaluate((y) => scrollTo(0, y), aboutHandoffStart + 2);
  await expect(page.locator('[data-home]')).toHaveClass(/is-about-active/);
  await expect(page.locator('.philosophy-orbit')).toHaveCSS('opacity', '1');
  await expect(page.locator('.philosophy-trail')).toHaveCSS('opacity', '0');
  await expect(page.locator('.hero .orbit-label')).toHaveCSS('opacity', '0');
  await expect(page.locator('.about')).toHaveAttribute(
    'data-motion-phase',
    'line-drop',
  );
  await expect(page.locator('.about-rays .diamond')).toHaveCSS('opacity', '0');
  await expect(page.locator('.about-rays')).toHaveCSS(
    'background-image',
    /repeating-linear-gradient/,
  );
  await expect(page.locator('.about-drop-line')).toHaveCSS(
    'background-image',
    /repeating-linear-gradient/,
  );
  await expect(page.locator('.about-rays span').first()).toHaveCSS(
    'background-image',
    /repeating-linear-gradient/,
  );
  const contactLine = (await page.locator('.about-rays').boundingBox())!;
  const contactDot = (await page
    .locator('.about-rays .diamond')
    .boundingBox())!;
  expect(contactDot.y + contactDot.height / 2).toBeCloseTo(
    contactLine.y + contactLine.height,
    0,
  );
  const orbitStart = (await page.locator('.philosophy-orbit').boundingBox())!.x;
  const fallingLineStart = (await page.locator('.about-rays').boundingBox())!.y;
  const titleOpacity = await page
    .locator('.about-title span')
    .first()
    .evaluate((e) => Number(getComputedStyle(e).opacity));
  await page.evaluate((y) => scrollTo(0, y), aboutHandoffStart + 100);
  await expect(page.locator('.about')).toHaveAttribute(
    'data-motion-phase',
    'line-drop',
  );
  await expect(page.locator('.about-rays .diamond')).toHaveCSS('opacity', '0');
  await expect
    .poll(async () => (await page.locator('.about-rays').boundingBox())!.y)
    .toBeGreaterThan(fallingLineStart + 10);
  await page.evaluate((y) => scrollTo(0, y), aboutHandoffStart + 430);
  await expect(page.locator('.about')).toHaveAttribute(
    'data-motion-phase',
    'point-drop',
  );
  await expect
    .poll(() =>
      page
        .locator('.about-rays .diamond')
        .evaluate((e) => Number(getComputedStyle(e).opacity)),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      page
        .locator('.about-title span')
        .first()
        .evaluate((e) => Number(getComputedStyle(e).opacity)),
    )
    .toBeGreaterThan(0.1);
  await expect
    .poll(
      async () => (await page.locator('.philosophy-orbit').boundingBox())!.x,
    )
    .toBeCloseTo(orbitStart, 0);
  const enteringTitleY = (await page
    .locator('.about-title span')
    .first()
    .boundingBox())!.y;
  const enteringTitleOpacity = await page
    .locator('.about-title span')
    .first()
    .evaluate((e) => Number(getComputedStyle(e).opacity));
  expect(enteringTitleOpacity).toBeGreaterThan(0);
  expect(enteringTitleOpacity).toBeLessThan(1);
  await expect(page.locator('.about')).toHaveCSS('z-index', '1');
  await expect(page.locator('.about-title')).toHaveCSS('z-index', '2');
  const enteringDotY = (await page
    .locator('.about-rays .diamond')
    .boundingBox())!.y;
  await page.evaluate((y) => scrollTo(0, y), aboutStart - 20);
  await expect(page.locator('.about')).toHaveAttribute(
    'data-motion-phase',
    'point-drop',
  );
  await expect(page.locator('.about-rays .diamond')).toHaveCSS('opacity', '1');
  const dotDropped = (await page.locator('.about-rays .diamond').boundingBox())!
    .y;
  expect(dotDropped).toBeGreaterThan(enteringDotY + 40);
  const centeredTitle = (await page
    .locator('.about-title span')
    .first()
    .boundingBox())!.x;
  expect(
    (await page.locator('.about-title span').first().boundingBox())!.y,
  ).toBeGreaterThan(enteringTitleY + 40);
  await page.evaluate((y) => scrollTo(0, y), aboutStart + 300);
  await expect(page.locator('.about')).toHaveAttribute(
    'data-motion-phase',
    'pan-left',
  );
  await expect(page.locator('.philosophy-trail')).toHaveCSS('opacity', '0');
  await expect(page.locator('.about-rays .diamond')).toHaveCSS('opacity', '1');
  await expect
    .poll(
      async () => (await page.locator('.philosophy-orbit').boundingBox())!.x,
    )
    .toBeLessThan(orbitStart - 40);
  await expect
    .poll(
      async () =>
        (await page.locator('.about-title span').first().boundingBox())!.x,
    )
    .toBeLessThan(centeredTitle - 20);
  await expect(page.locator('.about-rays span').first()).toHaveCSS(
    'opacity',
    '0',
  );
  await expect(page.locator('.about-copy')).toHaveCSS('opacity', '0');
  await page.evaluate((y) => scrollTo(0, y), aboutStart + 620);
  await expect(page.locator('.about')).toHaveAttribute(
    'data-motion-phase',
    'focus',
  );
  await expect
    .poll(
      async () => (await page.locator('.about-rays .diamond').boundingBox())!.y,
    )
    .toBeLessThan(dotDropped - 20);
  await expect
    .poll(() =>
      page
        .locator('.about-rays span')
        .first()
        .evaluate((e) => Number(getComputedStyle(e).opacity)),
    )
    .toBeGreaterThan(0);
  await page.evaluate((y) => scrollTo(0, y), aboutStart + 770);
  await expect(page.locator('.about')).toHaveAttribute(
    'data-motion-phase',
    'details',
  );
  await expect
    .poll(() =>
      page
        .locator('.about-copy')
        .evaluate((e) => Number(getComputedStyle(e).opacity)),
    )
    .toBeGreaterThan(0.5);
  await expect(page.locator('.about-drop-line')).toHaveCSS('opacity', '1');
  const finalDropLine = (await page.locator('.about-drop-line').boundingBox())!;
  const finalDot = (await page.locator('.about-rays .diamond').boundingBox())!;
  expect(finalDropLine.y + finalDropLine.height).toBeCloseTo(
    finalDot.y + finalDot.height / 2,
    0,
  );
  const finalRing = (await page.locator('.about-ring').boundingBox())!;
  expect(finalRing.y + finalRing.height / 2).toBeCloseTo(
    finalDot.y + finalDot.height / 2,
    0,
  );
  await expect
    .poll(() =>
      page
        .locator('.about-title span')
        .first()
        .evaluate((e) => Number(getComputedStyle(e).opacity)),
    )
    .toBeGreaterThan(titleOpacity);
  const researchStart = await page
    .locator('.research')
    .evaluate((e) => e.parentElement!.getBoundingClientRect().top + scrollY);
  await expect(page.locator('.research-axis')).toHaveCSS(
    'background-image',
    /repeating-linear-gradient/,
  );
  await expect(page.locator('.research-axis')).toHaveCSS(
    'border-left-width',
    '0px',
  );
  const researchHandoffStart = researchStart - 900 * 0.9;
  await page.evaluate((y) => scrollTo(0, y), researchHandoffStart + 2);
  const orbitLeavingStart = (await page
    .locator('.philosophy-orbit')
    .boundingBox())!.y;
  const aboutLeavingStart = (await page
    .locator('.about-title span')
    .first()
    .boundingBox())!.y;
  await page.evaluate((y) => scrollTo(0, y), researchHandoffStart + 400);
  const orbitLeavingEnd = (await page
    .locator('.philosophy-orbit')
    .boundingBox())!.y;
  const aboutLeavingEnd = (await page
    .locator('.about-title span')
    .first()
    .boundingBox())!.y;
  expect(orbitLeavingEnd).toBeLessThan(orbitLeavingStart - 300);
  expect(aboutLeavingEnd).toBeLessThan(aboutLeavingStart - 300);
  expect(
    Math.abs(
      orbitLeavingEnd -
        orbitLeavingStart -
        (aboutLeavingEnd - aboutLeavingStart),
    ),
  ).toBeLessThan(25);
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

test('desktop company rail remains a single continuous blurred arc at both ends', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('zh/portfolio/zhipu-ai.html');
  const browser = page.locator('[data-company-browser]');
  const rail = page.locator('[data-company-nav]');
  await expect(browser).toHaveAttribute('data-rail-ready', 'true');

  const circleErrors = await page
    .locator('[data-company-link]')
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
  await expect
    .poll(() =>
      page
        .locator('[data-arc-side=top]')
        .evaluateAll(
          (dots) =>
            dots.filter(
              (dot) => Number.parseFloat(getComputedStyle(dot).opacity) > 0.05,
            ).length,
        ),
    )
    .toBeGreaterThan(2);

  await page.keyboard.press('End');
  await expect(browser).toHaveAttribute('data-current-company', 'xingyun-ic');
  await expect
    .poll(() =>
      page
        .locator('[data-arc-side=bottom]')
        .evaluateAll(
          (dots) =>
            dots.filter(
              (dot) => Number.parseFloat(getComputedStyle(dot).opacity) > 0.05,
            ).length,
        ),
    )
    .toBeGreaterThan(2);
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
      .toBeGreaterThan(0);
    await expect(
      page.locator('[data-topology-anchor=sector-infrastructure]'),
    ).toHaveAttribute('data-topology-state', 'unrelated');
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
