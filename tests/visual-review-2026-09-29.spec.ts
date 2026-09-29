import { expect, test, type Page } from '@playwright/test';

const prepare = async (page: Page, path = 'en/index.html') => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
};

const setPhilosophyProgress = async (page: Page, progress: number) => {
  const stage = page.locator('[data-philosophy-stage]');
  const bounds = await stage.evaluate((element) => ({
    start: element.parentElement!.getBoundingClientRect().top + scrollY,
    distance:
      element.parentElement!.getBoundingClientRect().height -
      element.getBoundingClientRect().height,
  }));
  await page.evaluate(
    (target) => scrollTo(0, target),
    bounds.start + bounds.distance * progress,
  );
  await expect
    .poll(() => stage.getAttribute('data-motion-progress'))
    .not.toBeNull();
  await expect
    .poll(async () => Number(await stage.getAttribute('data-motion-progress')))
    .toBeCloseTo(progress, 2);
  return stage;
};

test('01 expanded-menu contact hierarchy is legible', async ({ page }) => {
  await prepare(page, 'en/portfolio/openmaic.html');
  await page.evaluate(() =>
    (document.querySelector('#site-menu') as HTMLDialogElement).showModal(),
  );
  const sizes = await page
    .locator(
      '.menu-contact h2,.menu-contact p,.menu-contact .line-link,.menu-language',
    )
    .evaluateAll((elements) =>
      elements.map((element) => parseFloat(getComputedStyle(element).fontSize)),
    );
  expect(sizes[0]).toBeGreaterThan(sizes[1]);
  expect(Math.min(...sizes.slice(1))).toBeGreaterThanOrEqual(10);
  expect(sizes[2]).toBeGreaterThanOrEqual(sizes[1]);
});

test('02 Open Signal body uses a stronger reading weight', async ({ page }) => {
  await prepare(page);
  const weight = await page
    .locator('.opening-copy')
    .evaluate((element) => Number(getComputedStyle(element).fontWeight));
  expect(weight).toBeGreaterThanOrEqual(500);
});

test('03 Open Signal title is exactly two lines', async ({ page }) => {
  await prepare(page);
  await expect(page.locator('.opening-title br')).toHaveCount(1);
  await expect(page.locator('.opening-title')).toContainText('Open');
  await expect(page.locator('.opening-title')).toContainText('Signal');
});

test('04 moving marker is a complete diamond without the legacy arrow', async ({
  page,
}) => {
  await prepare(page);
  await setPhilosophyProgress(page, 0.3);
  await expect(page.locator('.philosophy-stage-canvas')).toHaveAttribute(
    'data-marker-shape',
    'diamond',
  );
  await expect(page.locator('.orbit-label .diamond')).toBeHidden();
});

test('05 left travelling marker is light gray', async ({ page }) => {
  await prepare(page);
  await setPhilosophyProgress(page, 0.3);
  await expect(page.locator('.philosophy-stage-canvas')).toHaveAttribute(
    'data-left-star-color',
    '#c9c9c9',
  );
});

test('06 Partnering appears only after the marker nears the lower field', async ({
  page,
}) => {
  await prepare(page);
  const stage = await setPhilosophyProgress(page, 0.45);
  const state = await stage.evaluate((element) => {
    const canvas = element.querySelector('canvas')!;
    const [, y] = (canvas.dataset.leftStarPoint || '0,0')
      .split(',')
      .map(Number);
    return {
      ratio: y / element.getBoundingClientRect().height,
      opacity: Number(
        getComputedStyle(element.querySelector('.hero-title')!).opacity,
      ),
    };
  });
  expect(state.ratio).toBeGreaterThan(0.72);
  expect(state.opacity).toBeGreaterThan(0.2);
});

test('07 Partnering headline is exactly three lines', async ({ page }) => {
  await prepare(page);
  await expect(page.locator('.hero-title br')).toHaveCount(2);
  await expect(page.locator('.hero-title')).toContainText('Partnering');
  await expect(page.locator('.hero-title')).toContainText('with founders');
  await expect(page.locator('.hero-title')).toContainText(
    'defining the AGI era',
  );
});

test('08 institution headline is a centered two-line composition', async ({
  page,
}) => {
  await prepare(page);
  const stage = await setPhilosophyProgress(page, 0.96);
  const geometry = await stage.evaluate((element) => {
    const lines = [...element.querySelectorAll('.about-title span')].map(
      (line) => line.getBoundingClientRect(),
    );
    const box = element.getBoundingClientRect();
    return {
      count: lines.length,
      centre:
        (Math.min(...lines.map((line) => line.left)) +
          Math.max(...lines.map((line) => line.right))) /
          2 -
        box.left,
      width: box.width,
    };
  });
  expect(geometry.count).toBe(2);
  expect(Math.abs(geometry.centre - geometry.width / 2)).toBeLessThan(
    geometry.width * 0.13,
  );
});

test('09 institution headline sits in the lower reading band', async ({
  page,
}) => {
  await prepare(page);
  const stage = await setPhilosophyProgress(page, 0.96);
  const ratio = await stage.evaluate((element) => {
    const stageBox = element.getBoundingClientRect();
    const title = element
      .querySelector('.about-title')!
      .getBoundingClientRect();
    return (title.top - stageBox.top) / stageBox.height;
  });
  expect(ratio).toBeGreaterThan(0.44);
  expect(ratio).toBeLessThan(0.7);
});

test('10 guide system uses the calibrated gradient dashed treatment', async ({
  page,
}) => {
  await prepare(page);
  await setPhilosophyProgress(page, 0.9);
  await expect(page.locator('.philosophy-stage-canvas')).toHaveAttribute(
    'data-guide-style',
    'gradient-dashed',
  );
});

test('11 dashed guide spacing uses the authored sparse rhythm', async ({
  page,
}) => {
  await prepare(page);
  await setPhilosophyProgress(page, 0.9);
  await expect(page.locator('.philosophy-stage-canvas')).toHaveAttribute(
    'data-guide-dash',
    '3,8',
  );
});

test('12 diamond and side label remain a coordinated unit', async ({
  page,
}) => {
  await prepare(page);
  const stage = await setPhilosophyProgress(page, 0.72);
  const geometry = await stage.evaluate((element) => {
    const [x, y] = (element.querySelector('canvas')!.dataset.point || '0,0')
      .split(',')
      .map(Number);
    const label = element
      .querySelector('.about-label')!
      .getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return {
      horizontalGap: box.left + x - label.right,
      verticalGap: Math.abs(box.top + y - (label.top + label.height / 2)),
    };
  });
  expect(geometry.horizontalGap).toBeGreaterThanOrEqual(18);
  expect(geometry.verticalGap).toBeLessThan(45);
});

test('13 line reaches the node before the outer ring appears', async ({
  page,
}) => {
  await prepare(page);
  let stage = await setPhilosophyProgress(page, 0.53);
  const before = {
    guide: Number(await stage.getAttribute('data-guide-progress')),
    ring: Number(await stage.getAttribute('data-ring-progress')),
  };
  stage = await setPhilosophyProgress(page, 0.9);
  const after = {
    guide: Number(await stage.getAttribute('data-guide-progress')),
    ring: Number(await stage.getAttribute('data-ring-progress')),
  };
  expect(before.guide).toBeGreaterThan(0);
  expect(before.ring).toBe(0);
  expect(after.guide).toBe(1);
  expect(after.ring).toBeGreaterThan(0);
});

test('14 north-star label stays aligned to its diamond', async ({ page }) => {
  await prepare(page);
  const stage = await setPhilosophyProgress(page, 0.96);
  const offset = await stage.evaluate((element) => {
    const [, y] = (element.querySelector('canvas')!.dataset.point || '0,0')
      .split(',')
      .map(Number);
    const label = element
      .querySelector('.about-label')!
      .getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return Math.abs(box.top + y - (label.top + label.height / 2));
  });
  expect(offset).toBeLessThan(38);
});

test('15 T-ONE frame appears in place without sliding from the left', async ({
  page,
}) => {
  await prepare(page);
  const triggerY = await page
    .locator('.research')
    .evaluate(
      (element) =>
        element.getBoundingClientRect().top + scrollY + innerHeight * 0.25,
    );
  await page.evaluate((y) => scrollTo(0, y), triggerY);
  await expect
    .poll(() => page.locator('.research').getAttribute('data-scroll-progress'))
    .not.toBeNull();
  const transform = await page
    .locator('.research-marker')
    .evaluate((element) => getComputedStyle(element).transform);
  const values =
    transform === 'none'
      ? []
      : transform.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  expect(Math.abs(values.at(-2) || 0)).toBeLessThan(2);
  expect(Math.abs(values.at(-1) || 0)).toBeLessThan(2);
});

test('16 focus branches are asymmetrical with varied lengths and angles', async ({
  page,
}) => {
  await prepare(page);
  const layout = await page.locator('.focus').evaluate((root) => {
    const sector = root.querySelector<HTMLElement>(
      '[data-sector="foundation"]',
    )!;
    const sx = Number(sector.dataset.x);
    const sy = Number(sector.dataset.y);
    const points = [
      ...root.querySelectorAll<HTMLElement>('[data-focus-sector="foundation"]'),
    ].map((node) => ({ x: Number(node.dataset.x), y: Number(node.dataset.y) }));
    return {
      distances: points.map((point) =>
        Math.round(Math.hypot(point.x - sx, point.y - sy) / 20),
      ),
      quadrants: new Set(
        points.map(
          (point) => `${point.x >= sx ? 1 : -1},${point.y >= sy ? 1 : -1}`,
        ),
      ).size,
    };
  });
  expect(new Set(layout.distances).size).toBeGreaterThanOrEqual(5);
  expect(layout.quadrants).toBe(4);
  const scene = page.locator('#focus');
  await scene.scrollIntoViewIfNeeded();
  await page.locator('[data-sector="applications"]').hover();
  await expect(scene).toHaveAttribute('data-focus', 'applications');
  await expect(scene).toHaveAttribute('data-focus-held', 'true');
  await expect(scene).toHaveAttribute('data-camera-state', 'front', {
    timeout: 2500,
  });
});

test('17 unselected portfolio logos are centered in their cards', async ({
  page,
}) => {
  await prepare(page, 'en/portfolio.html');
  const deltas = await page
    .locator('[data-company-card]')
    .evaluateAll((cards) =>
      cards.slice(0, 6).map((card) => {
        const outer = card.getBoundingClientRect();
        const logo = card
          .querySelector('.company-logo')!
          .getBoundingClientRect();
        return {
          x: Math.abs(
            logo.left + logo.width / 2 - (outer.left + outer.width / 2),
          ),
          y: Math.abs(
            logo.top + logo.height / 2 - (outer.top + outer.height / 2),
          ),
        };
      }),
    );
  deltas.forEach(({ x, y }) => {
    expect(x).toBeLessThan(2);
    expect(y).toBeLessThan(2);
  });
});

test('18 portfolio language switch uses the reduced scale', async ({
  page,
}) => {
  await prepare(page, 'en/portfolio.html');
  const size = await page
    .locator('.language-switch')
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(size).toBeLessThanOrEqual(14);
});

test('19 portfolio category filters select and filter the grid', async ({
  page,
}) => {
  await prepare(page, 'en/portfolio.html');
  await expect(page.locator('[data-portfolio-filter]')).toHaveCount(6);
  await page.locator('[data-portfolio-filter="applications"]').click();
  const state = await page
    .locator('[data-company-card]')
    .evaluateAll((cards) => ({
      visible: cards.filter((card) => !(card as HTMLElement).hidden).length,
      wrong: cards.filter(
        (card) =>
          !(card as HTMLElement).hidden &&
          (card as HTMLElement).dataset.sector !== 'applications',
      ).length,
    }));
  expect(state.visible).toBeGreaterThan(0);
  expect(state.wrong).toBe(0);
});

test('20 selected OPENMAIC node has a subtle looping breath', async ({
  page,
}) => {
  await prepare(page, 'en/portfolio/openmaic.html');
  const marker = page.locator(
    '[data-company-link="openmaic"][aria-current] .rail-marker img',
  );
  await expect(marker).toHaveCSS('animation-name', 'company-node-breathe');
  const duration = await marker.evaluate(
    (element) => getComputedStyle(element).animationDuration,
  );
  expect(parseFloat(duration)).toBeGreaterThanOrEqual(3);
});
