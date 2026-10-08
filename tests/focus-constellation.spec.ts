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
            '.sector-star, .sector-star .star-label, .constellation-scene:not([hidden]) .constellation-company, .constellation-scene:not([hidden]) .constellation-company-label',
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

for (const width of [360, 390, 768]) {
  for (const lang of ['zh', 'en'] as const) {
    test(`H5 ${lang} Figma map selects every sector and preserves all companies at ${width}px`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        hasTouch: true,
        isMobile: true,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${baseURL}${lang}/index.html`);
      await page.evaluate(() => document.fonts.ready);
      const map = page.locator('[data-h5-focus]');
      await map.scrollIntoViewIfNeeded();
      await expect(map).toBeVisible();
      await expect(page.locator('.constellation')).toBeHidden();
      for (const sector of content.sectors) {
        const button = map.locator(`[data-h5-sector="${sector.id}"]`);
        await button.tap();
        await expect(button).toHaveAttribute('aria-pressed', 'true');
        await expect(button).toHaveAttribute('data-h5-slot', '5');
        await expect(map.locator('[aria-pressed=true]')).toHaveCount(1);
        const result = map.locator(`[data-h5-result="${sector.id}"]`);
        await expect(result).toBeVisible();
        await expect(result.locator('h3')).toContainText(sector.name_en);
        await expect(result.locator('.h5-focus-details p')).toHaveText(
          lang === 'zh' ? sector.description_cn : sector.description_en,
        );
        const expected = content.companies.filter(
          (company) => company.sector_id === sector.id,
        );
        const links = map.locator(
          '.h5-focus-result:not([hidden]) [data-h5-company], [data-h5-overflow]:not([hidden]) [data-h5-company]',
        );
        await expect(links).toHaveCount(expected.length);
        for (const company of expected) {
          const link = links.filter({
            hasText: lang === 'zh' ? company.name_cn : company.name_en,
          });
          await expect(link).toHaveCount(1);
          await expect(link).toHaveAttribute(
            'href',
            `/linkxcap/${lang}/portfolio/${company.slug}.html`,
          );
          if (company.investment_year)
            await expect(link).toContainText(company.investment_year);
        }
        const metrics = await map.evaluate((root) => {
          const area = root.getBoundingClientRect();
          const labels = [
            ...root.querySelectorAll<HTMLElement>(
              '.h5-focus-node[aria-pressed=false] .h5-focus-node-label, .h5-focus-result:not([hidden]) .h5-focus-company span',
            ),
          ].map((el) => ({
            text: el.textContent,
            box: el.getBoundingClientRect(),
          }));
          return {
            outside: labels.filter(
              ({ box }) =>
                box.left < area.left - 1 || box.right > area.right + 1,
            ),
            overlaps: labels.flatMap((a, i) =>
              labels
                .slice(i + 1)
                .filter(
                  (b) =>
                    Math.min(a.box.right, b.box.right) >
                      Math.max(a.box.left, b.box.left) + 1 &&
                    Math.min(a.box.bottom, b.box.bottom) >
                      Math.max(a.box.top, b.box.top) + 1,
                )
                .map((b) => [a.text, b.text]),
            ),
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        expect(metrics.outside).toEqual([]);
        expect(metrics.overlaps).toEqual([]);
        expect(metrics.overflow).toBe(false);
      }
      const visibleImages = map.locator(
        '.h5-focus-result:not([hidden]) img, .h5-focus-nodes img, [data-h5-focus-backdrop]',
      );
      await expect
        .poll(() =>
          visibleImages.evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
        )
        .toBe(true);
      const link = map
        .locator('.h5-focus-result:not([hidden]) [data-h5-company]')
        .first();
      const href = await link.getAttribute('href');
      await link.locator('span').tap();
      await expect(page).toHaveURL(new URL(href!, baseURL).href);
      expect(errors).toEqual([]);
      await context.close();
    });
  }
}

test('H5 selection stays fixed while ambience plays, and reduced motion stops it', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 900 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const heavy: string[] = [];
  page.on('request', (request) => {
    if (
      /(?:topology\..*\.js|starfield-lottie\..*\.js|linkx-twinkling-starfield-transparent\.json|focusStars)/.test(
        request.url(),
      )
    )
      heavy.push(request.url());
  });
  await page.goto(`${baseURL}zh/index.html`);
  const map = page.locator('[data-h5-focus]');
  await map.scrollIntoViewIfNeeded();
  await map.locator('[data-h5-sector=infrastructure]').tap();
  await expect(map).toHaveAttribute('data-h5-selection', 'infrastructure');
  await expect(map).toHaveAttribute('data-h5-animating', 'true');
  const graph = map.locator(
    '[data-h5-result=infrastructure] .h5-focus-company-map',
  );
  const pose = await graph.evaluate((el) => getComputedStyle(el).transform);
  await expect
    .poll(() => graph.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(pose);
  await page.waitForTimeout(5400);
  await expect(map).toHaveAttribute('data-h5-selection', 'infrastructure');
  expect(heavy).toEqual([]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(graph).toHaveCSS('animation-name', 'none');
  await expect
    .poll(() =>
      map
        .locator('[data-h5-sector=infrastructure]')
        .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration)),
    )
    .toBeLessThan(0.001);
  const button = map.locator('[data-h5-sector=chips]');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(map).toHaveAttribute('data-h5-selection', 'chips');
  await context.close();
});

test('H5 and PC retain separate selections when switching the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('en/index.html');
  const map = page.locator('[data-h5-focus]');
  await map.scrollIntoViewIfNeeded();
  await map.locator('[data-h5-sector=chips]').click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(map).toBeHidden();
  await expect(page.locator('.constellation')).toBeVisible();
  await expect(page.locator('#focus')).toHaveAttribute(
    'aria-labelledby',
    'focus-title',
  );
  await expect(page.locator('[data-sector=foundation]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute('data-h5-selection', 'chips');
  await expect(page.locator('.constellation')).toBeHidden();
});
