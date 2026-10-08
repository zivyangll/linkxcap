import { test, expect, type Page } from '@playwright/test';
import content from '../src/data/content.json' with { type: 'json' };

const infrastructureCount = content.companies.filter(
  (company) => company.sector_id === 'infrastructure',
).length;

async function openScene(page: Page, lang = 'zh') {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`${lang}/index.html`);
  await expect(page.locator('[data-home]')).toHaveClass(
    /has-philosophy-motion/,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#focus').evaluate((element) =>
    scrollTo({
      top: element.getBoundingClientRect().top + scrollY,
      behavior: 'instant',
    }),
  );
  await expect(page.locator('#focus')).toHaveAttribute(
    'data-renderer',
    'webgl',
  );
  await expect(page.locator('#focus')).toHaveAttribute('data-running', 'true');
  return page.locator('#focus');
}
// H5 centres the selected sector, so distant sectors can pan past the screen
// edge; those are reached the way a visitor would, after the graph moves.
async function tapSector(page: Page, id: string) {
  const button = page.locator(`[data-sector="${id}"]`);
  await page.locator('.constellation').scrollIntoViewIfNeeded();
  await expect(page.locator('#focus')).not.toHaveAttribute(
    'data-camera-state',
    'settling',
    { timeout: 10000 },
  );
  const box = await button.boundingBox();
  const viewport = page.viewportSize()!;
  if (
    box &&
    box.x >= 0 &&
    box.y >= 0 &&
    box.x + box.width <= viewport.width &&
    box.y + box.height <= viewport.height
  )
    await button.tap();
  else await button.dispatchEvent('click');
  return button;
}

async function hoverNode(page: Page, id: string) {
  const button = page.locator(`[data-sector="${id}"]`);
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  return button;
}

for (const width of [1440, 2048])
  test(`refresh starts with Foundation at the right viewport centre at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const lang of ['zh', 'en']) {
      await page.goto(`${lang}/index.html`);
      for (let refresh = 0; refresh < 3; refresh++) {
        if (refresh) await page.reload();
        await expect(page.locator('[data-home]')).toHaveClass(
          /has-philosophy-motion/,
        );
        await page.evaluate(() => document.fonts.ready);
        await page.locator('#focus').evaluate(
          (element, offset) =>
            scrollTo({
              top: element.getBoundingClientRect().top + scrollY + offset,
              behavior: 'instant',
            }),
          refresh === 2 ? 200 : 0,
        );
        const scene = page.locator('#focus');
        await expect(scene).toHaveAttribute('data-running', 'true');
        await expect(scene).toHaveAttribute('data-focus', 'foundation');
        await expect(scene).toHaveAttribute(
          'data-highlighted-node',
          'sector-foundation',
        );
        await expect(
          page.locator('[data-sector-panel=foundation]'),
        ).toBeVisible();
        await expect
          .poll(async () => {
            const node = (await page
              .locator('[data-sector=foundation]')
              .boundingBox())!;
            return Math.max(
              Math.abs(node.x + node.width / 2 - width * 0.75) / (width * 0.03),
              Math.abs(node.y + node.height / 2 - 450) / 60,
            );
          })
          .toBeLessThan(1);
        // Refresh after a different pinned selection must still start afresh.
        await page.locator('[data-sector=chips]').dispatchEvent('click');
        await expect(scene).toHaveAttribute('data-focus', 'chips');
      }
    }
  });

test('the first Foundation cycle waits until the star map is reached', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('zh/index.html');
  await expect(page.locator('[data-home]')).toHaveClass(
    /has-philosophy-motion/,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#focus').evaluate((element) =>
    scrollTo({
      top: element.getBoundingClientRect().top + scrollY - 600,
      behavior: 'instant',
    }),
  );
  const scene = page.locator('#focus');
  await expect(scene).toHaveAttribute('data-running', 'true');
  await page.waitForTimeout(5600);
  await expect(scene).toHaveAttribute('data-focus', 'foundation');
  await scene.evaluate((element) =>
    scrollTo({
      top: element.getBoundingClientRect().top + scrollY,
      behavior: 'instant',
    }),
  );
  await expect(scene).toHaveAttribute('data-focus', 'foundation');
  await expect
    .poll(() => scene.getAttribute('data-focus'), { timeout: 10000 })
    .toBe(content.sectors[1].id);
});

for (const width of [1440, 2048])
  test(`all desktop graph nodes respect 150px container padding at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1058 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('zh/index.html');
    await expect(page.locator('[data-home]')).toHaveClass(
      /has-philosophy-motion/,
    );
    await page.evaluate(() => document.fonts.ready);
    const scene = page.locator('#focus');
    await scene.evaluate((element) =>
      scrollTo({
        top: element.getBoundingClientRect().top + scrollY,
        behavior: 'instant',
      }),
    );
    await expect(scene).toHaveAttribute('data-running', 'true');
    const checkNodes = async () => {
      const outside = await scene.evaluate(async (element) => {
        const header = document.querySelector<HTMLElement>('[data-header]')!;
        const area = {
          left: innerWidth / 4 + 150,
          right: innerWidth - 150,
          top: header.offsetHeight + 150,
          bottom: innerHeight - 150,
        };
        for (let frame = 0; frame < 12; frame++) {
          await new Promise(requestAnimationFrame);
          for (const node of element.querySelectorAll<HTMLElement>(
            '.sector-star, .constellation-scene:not([hidden]) .constellation-company',
          )) {
            const box = node.getBoundingClientRect();
            if (
              box.left < area.left - 1 ||
              box.right > area.right + 1 ||
              box.top < area.top - 1 ||
              box.bottom > area.bottom + 1
            )
              return {
                node: node.dataset.topologyAnchor,
                box: box.toJSON(),
                area,
              };
          }
        }
        return null;
      });
      expect(outside).toBeNull();
    };
    await checkNodes();
    for (const sector of content.sectors) {
      await scene.evaluate(
        (element, id) =>
          element.dispatchEvent(new CustomEvent('focusselect', { detail: id })),
        sector.id,
      );
      await checkNodes();
    }
    // Turning the scene must not allow its nodes to cross the container edge.
    await page.mouse.move(width * 0.9, 150);
    await page.mouse.down();
    await page.mouse.move(width * 0.8, 700, { steps: 8 });
    await expect(scene).toHaveAttribute('data-dragging', 'true');
    await checkNodes();
    await page.mouse.up();
    await checkNodes();
  });

test('hover immediately selects every sector and connects only its configured companies', async ({
  page,
}) => {
  const scene = await openScene(page);
  for (const sector of content.sectors) {
    const button = await hoverNode(page, sector.id);
    await expect(
      page.locator(`[data-sector-panel="${sector.id}"]`),
    ).toBeVisible();
    const companies = content.companies.filter(
      (company) => company.sector_id === sector.id,
    );
    await expect(scene).toHaveAttribute(
      'data-highlighted-edges',
      String(companies.length),
    );
    const group = page.locator(`[data-constellation="${sector.id}"]`);
    await expect(group.locator('.constellation-company')).toHaveCount(
      companies.length,
    );
    expect(
      await group.locator('.constellation-company').evaluateAll((links) =>
        links.map((link) => ({
          key: (link as HTMLElement).dataset.topologyAnchor,
          href: link.getAttribute('href'),
          label: link.textContent?.trim(),
        })),
      ),
    ).toEqual(
      companies.map((company) => ({
        key: `company-${company.id}`,
        href: `/linkxcap/zh/portfolio/${company.slug}.html`,
        label: company.investment_year
          ? `(${company.investment_year}, ${company.name_cn})`
          : company.name_cn,
      })),
    );
    await expect(button.locator('.diamond')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    if (companies.length)
      await expect(scene).toHaveAttribute('data-branch-progress', '1.000');
  }
});

test('homepage topology renders the supplied twinkling starfield behind the graph', async ({
  page,
}) => {
  const scene = await openScene(page);
  await expect(scene).toHaveAttribute('data-starfield', 'ready');
  expect(
    await page.locator('.focus-starfield').evaluate(async (container) => {
      const response = await fetch(
        (container as HTMLElement).dataset.lottieSrc!,
      );
      const source = await response.arrayBuffer();
      const hash = [
        ...new Uint8Array(await crypto.subtle.digest('SHA-256', source)),
      ]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      const animation = JSON.parse(new TextDecoder().decode(source));
      return {
        bytes: source.byteLength,
        hash,
        layers: animation.layers.length,
      };
    }),
  ).toEqual({
    bytes: 324909,
    hash: 'f8d91b1d7c77e87c96a79b8b8f704fd0bbaf29e26294ebb3516cfe798c8cfecb',
    layers: 180,
  });
  const starfield = page.locator('.focus-starfield');
  await expect(starfield.locator('svg')).toBeVisible();
  await expect(starfield.locator('svg')).toHaveAttribute(
    'preserveAspectRatio',
    'xMidYMid slice',
  );
  const initialFrames = await scene.getAttribute('data-render-frames');
  await expect
    .poll(() => scene.getAttribute('data-render-frames'))
    .not.toBe(initialFrames);
  await expect(page.locator('.focus-starfield-fallback')).toHaveCSS(
    'opacity',
    '0',
  );
});

test('idle graph cycles automatically; hover holds pose and copy, leaving resumes the cycle', async ({
  page,
}) => {
  const scene = await openScene(page);
  await page.mouse.move(100, 200);
  const initial = await scene.getAttribute('data-focus');
  const rotation = await scene.getAttribute('data-rotation');
  await expect
    .poll(() => scene.getAttribute('data-rotation'))
    .not.toBe(rotation);
  await expect
    .poll(() => scene.getAttribute('data-focus'), { timeout: 10000 })
    .not.toBe(initial);
  const button = await hoverNode(page, 'physical');
  await expect(scene).toHaveAttribute('data-focus-mode', 'held');
  const pose = await scene.getAttribute('data-rotation');
  const box = await button.boundingBox();
  await page.waitForTimeout(5600);
  await expect(scene).toHaveAttribute('data-focus', 'physical');
  await expect(scene).toHaveAttribute('data-rotation', pose!);
  expect(await button.boundingBox()).toEqual(box);
  await page.mouse.move(100, 200);
  await expect(scene).toHaveAttribute('data-focus-held', 'false');
  await expect.poll(() => scene.getAttribute('data-rotation')).not.toBe(pose);
  await expect
    .poll(() => scene.getAttribute('data-focus'), { timeout: 10000 })
    .not.toBe('physical');
});

test('company labels preserve the hovered branch, and company links still navigate', async ({
  page,
}) => {
  const scene = await openScene(page, 'en');
  await hoverNode(page, 'physical');
  // Company links travel with the sector until it settles at the front.
  await expect(scene).toHaveAttribute('data-camera-state', 'front');
  const link = page.locator('[data-constellation=physical] a').first();
  await link.locator('span').hover();
  await expect(scene).toHaveAttribute('data-focus-held', 'true');
  await page.waitForTimeout(750);
  await expect(scene).toHaveAttribute('data-focus', 'physical');
  // The first link follows the sector's company order in content.json.
  const first = content.companies.find(
    (company) => company.sector_id === 'physical',
  )!;
  await expect(link).toContainText(first.name_en);
  await link.locator('span').click();
  await expect(page).toHaveURL(new RegExp(`/en/portfolio/${first.slug}.html$`));
});

test('keyboard focus holds a sector without a background toggle', async ({
  page,
}) => {
  const scene = await openScene(page);
  const button = page.locator('[data-sector=infrastructure]');
  await page.keyboard.press('Tab');
  await button.focus();
  await expect(scene).toHaveAttribute('data-focus', 'infrastructure');
  await expect(scene).toHaveAttribute('data-focus-held', 'true');
  await page.waitForTimeout(700);
  await expect(page.locator('[data-motion-toggle]')).toHaveCount(0);
  const pose = await scene.getAttribute('data-rotation');
  await page.waitForTimeout(800);
  await expect(scene).toHaveAttribute('data-rotation', pose!);
  await button.evaluate((element) => element.blur());
  await expect.poll(() => scene.getAttribute('data-rotation')).not.toBe(pose);
});

test('WebGL context loss falls back to connected SVG and interactive text', async ({
  page,
}) => {
  const scene = await openScene(page);
  await hoverNode(page, 'infrastructure');
  await page
    .locator('.topology-canvas')
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })),
    );
  await expect(scene).toHaveAttribute('data-renderer', 'static');
  await expect(scene).toHaveAttribute('data-running', 'false');
  await expect(page.locator('.topology-canvas')).toBeHidden();
  await expect(page.locator('[data-motion-toggle]')).toBeHidden();
  await hoverNode(page, 'physical');
  await expect(
    page.locator(
      '[data-constellation=physical] .constellation-fallback--desktop',
    ),
  ).toBeVisible();
  await expect(
    page.locator('[data-constellation=physical] a').first(),
  ).toBeVisible();
});

test('reduced motion has static connections, no automatic cycle and no Three.js request', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/(topology|starfield-lottie|lottie_light)\..*\.js/.test(request.url()))
      requests.push(request.url());
    if (/linkx-twinkling-starfield-transparent\.json/.test(request.url()))
      requests.push(request.url());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('zh/index.html');
  await page.locator('[data-sector=infrastructure]').click();
  await expect(page.locator('#focus')).toHaveAttribute(
    'data-focus',
    'infrastructure',
  );
  await expect(
    page.locator(
      '[data-constellation=infrastructure] .constellation-fallback--desktop line',
    ),
  ).toHaveCount(infrastructureCount);
  await page.waitForTimeout(700);
  expect(requests).toHaveLength(0);
  await expect(page.locator('.topology-canvas')).toBeHidden();
  await expect(page.locator('#focus')).toHaveAttribute(
    'data-focus',
    'infrastructure',
  );
});

for (const width of [360, 768])
  test(`touch focus controls remain usable at ${width}px with homepage motion enabled`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}zh/index.html`);
    await expect(page.locator('[data-home]')).toHaveClass(/has-mobile-motion/);
    for (const sector of content.sectors) {
      const button = await tapSector(page, sector.id);
      await expect(
        page.locator(`[data-sector-panel="${sector.id}"]`),
      ).toBeVisible();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator('#focus')).toHaveAttribute(
      'data-renderer',
      'webgl',
    );
    await expect(page.locator('.topology-canvas')).toBeVisible();
    await expect(page.locator('#focus')).toHaveAttribute(
      'data-focus-pinned',
      'true',
    );
    await context.close();
  });

for (const width of [360, 768])
  test(`H5 ${width}px automatically connects companies and tapping locks then resumes the graph`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}zh/index.html`);
    await expect(page.locator('[data-home]')).toHaveClass(/has-mobile-motion/);
    await page.locator('.constellation').scrollIntoViewIfNeeded();
    const scene = page.locator('#focus');
    await expect(scene).toHaveAttribute('data-renderer', 'webgl');
    const initial = await scene.getAttribute('data-focus');
    await expect
      .poll(() => scene.getAttribute('data-focus'), { timeout: 15000 })
      .not.toBe(initial);
    await page.locator('[data-sector=infrastructure]').tap();
    await expect(scene).toHaveAttribute('data-focus-pinned', 'true');
    await expect(scene).toHaveAttribute(
      'data-highlighted-edges',
      String(infrastructureCount),
    );
    await expect(scene).toHaveAttribute('data-branch-progress', '1.000');
    await expect(scene).toHaveAttribute('data-running', 'false');
    const overlaps = await page
      .locator('.sector-star .star-label')
      .evaluateAll((labels) => {
        const boxes = labels.map((label) => label.getBoundingClientRect());
        return boxes.flatMap((a, i) =>
          boxes
            .slice(i + 1)
            .filter(
              (b) =>
                Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
                Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top),
            ),
        );
      });
    expect(overlaps).toEqual([]);
    const rotation = await scene.getAttribute('data-rotation');
    const frames = await scene.getAttribute('data-render-frames');
    await page.waitForTimeout(5500);
    await expect(scene).toHaveAttribute('data-focus', 'infrastructure');
    await expect(scene).toHaveAttribute('data-rotation', rotation!);
    await expect(scene).toHaveAttribute('data-render-frames', frames!);
    const box = (await page.locator('.constellation').boundingBox())!;
    const canvas = await page.locator('.topology-canvas').evaluate((node) => ({
      width: (node as HTMLCanvasElement).width,
      height: (node as HTMLCanvasElement).height,
    }));
    expect(canvas.width * canvas.height).toBeLessThanOrEqual(910000);
    expect(box.width).toBeLessThanOrEqual(width);
    await page.locator('[data-sector=infrastructure]').tap();
    await expect(scene).toHaveAttribute('data-focus-pinned', 'false');
    await expect(scene).toHaveAttribute('data-running', 'true');
    await expect
      .poll(() => scene.getAttribute('data-rotation'))
      .not.toBe(rotation);
    await context.close();
  });

for (const width of [360, 390, 768]) {
  for (const lang of ['zh', 'en']) {
    test(`mobile ${lang} graph shows every full label at ${width}px without overlap`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        hasTouch: true,
        isMobile: true,
        reducedMotion: 'no-preference',
      });
      const page = await context.newPage();
      await page.goto(`${baseURL}${lang}/index.html`);
      await page.locator('.constellation').scrollIntoViewIfNeeded();
      for (const sector of content.sectors) {
        await tapSector(page, sector.id);
        await expect(page.locator('#focus')).toHaveAttribute(
          'data-branch-progress',
          '1.000',
        );
        const metrics = await page
          .locator('.constellation')
          .evaluate((root) => {
            const rootBox = root.getBoundingClientRect();
            const labels = [
              ...root.querySelectorAll<HTMLElement>(
                '.sector-star .star-label, .constellation-scene:not([hidden]) .constellation-company-label',
              ),
            ].map((element) => ({
              // The selected sector and its companies are the centred branch.
              branch:
                element.closest(
                  '.sector-star.is-active, .constellation-scene',
                ) !== null,
              text: element.textContent,
              display: getComputedStyle(element).display,
              clipped:
                element.scrollWidth > element.clientWidth + 1 ||
                element.scrollHeight > element.clientHeight + 1,
              box: element.getBoundingClientRect(),
            }));
            const overlaps = labels.flatMap((a, index) =>
              labels
                .slice(index + 1)
                .filter(
                  (b) =>
                    (a.branch || b.branch) &&
                    Math.min(a.box.right, b.box.right) >
                      Math.max(a.box.left, b.box.left) + 1 &&
                    Math.min(a.box.bottom, b.box.bottom) >
                      Math.max(a.box.top, b.box.top) + 1,
                )
                .map((b) => [a.text, b.text]),
            );
            return {
              count: labels.length,
              hidden: labels.filter(
                ({ display, box }) =>
                  display === 'none' || box.width === 0 || box.height === 0,
              ),
              clipped: labels.filter((label) => label.clipped),
              outside: labels.filter(
                ({ branch, box }) =>
                  branch &&
                  (box.left < rootBox.left - 1 ||
                    box.top < rootBox.top - 1 ||
                    box.right > rootBox.right + 1 ||
                    box.bottom > rootBox.bottom + 1),
              ),
              overlaps,
            };
          });
        expect(metrics.count).toBe(
          content.sectors.length +
            content.companies.filter(
              (company) => company.sector_id === sector.id,
            ).length,
        );
        expect(metrics.hidden).toEqual([]);
        expect(metrics.clipped).toEqual([]);
        expect(metrics.outside).toEqual([]);
        expect(metrics.overlaps).toEqual([]);
      }
      await context.close();
    });
  }
}
