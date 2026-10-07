import { expect, test, type Page } from '@playwright/test';
import content from '../src/data/content.json' with { type: 'json' };

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

test('03 First Light title is a single line', async ({ page }) => {
  await prepare(page);
  await expect(page.locator('.opening-title br')).toHaveCount(0);
  await expect(page.locator('.opening-title')).toHaveText('First Light');
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

test('05 the orbit and lower junction share one travelling marker', async ({
  page,
}) => {
  await prepare(page);
  await setPhilosophyProgress(page, 0.3);
  await expect(page.locator('.philosophy-stage-canvas')).toHaveAttribute(
    'data-marker-count',
    '1',
  );
  await expect(page.locator('.philosophy-stage-canvas')).not.toHaveAttribute(
    'data-left-star-point',
    /.+/,
  );
});

test('06 Partnering appears while the single marker enters chapter two', async ({
  page,
}) => {
  await prepare(page);
  const stage = await setPhilosophyProgress(page, 0.45);
  const state = await stage.evaluate((element) => {
    const canvas = element.querySelector('canvas')!;
    const [, y] = (canvas.dataset.point || '0,0').split(',').map(Number);
    return {
      ratio: y / element.getBoundingClientRect().height,
      opacity: Number(
        getComputedStyle(element.querySelector('.hero-title')!).opacity,
      ),
    };
  });
  expect(state.ratio).toBeGreaterThan(0.15);
  expect(state.opacity).toBeGreaterThan(0.2);
});

test('07 Backing the builders headline keeps two lines', async ({ page }) => {
  await prepare(page);
  await expect(page.locator('.hero-title br')).toHaveCount(1);
  await expect(page.locator('.hero-title')).toContainText(
    'Backing the builders',
  );
  await expect(page.locator('.hero-title')).toContainText(
    'of the intelligence age',
  );
});

test('07b Hero chapter renders only the active language', async ({ page }) => {
  for (const { path, expected, excluded, breaks, zh } of [
    {
      path: 'en/index.html',
      expected: 'Backing the builders of the intelligence age',
      excluded: '投资真正的创造者',
      breaks: 1,
      zh: false,
    },
    {
      path: 'zh/index.html',
      expected: '投资真正的创造者 推动智能时代向前',
      excluded: 'Backing',
      breaks: 1,
      zh: true,
    },
  ]) {
    await prepare(page, path);
    const title = page.locator('.hero-title');
    await expect(title).toContainText(expected);
    await expect(title).not.toContainText(excluded);
    await expect(title.locator('br')).toHaveCount(breaks);
    await expect(title).toHaveClass(
      zh ? 'hero-title hero-title--zh' : 'hero-title',
    );
    await expect(page.locator('.hero-zh')).toHaveCount(0);
  }
});

test('07a route starts pale, activates behind the node, and keeps hero copy visible', async ({
  page,
}) => {
  await prepare(page);
  const openingTrail = page.locator('.opening .scroll-trail');
  await expect(openingTrail).toHaveAttribute(
    'data-trail-base-color',
    'rgba(87,60,121,.18)',
  );
  await expect(openingTrail).toHaveAttribute(
    'data-trail-active-color',
    'rgba(87,60,121,.95)',
  );
  await expect(openingTrail).toHaveAttribute('data-node-color', '#573c79');
  await expect(page.locator('.opening-track > img')).toBeHidden();

  let stage = await setPhilosophyProgress(page, 0);
  await expect(page.locator('.hero-title')).toHaveCSS('opacity', '0');

  stage = await setPhilosophyProgress(page, 0.06);
  expect(
    Number(
      await page
        .locator('.hero-title')
        .evaluate((title) => getComputedStyle(title).opacity),
    ),
  ).toBeGreaterThan(0.99);

  stage = await setPhilosophyProgress(page, 0.55);
  const stageTrail = stage.locator('.philosophy-stage-canvas');
  await expect(stageTrail).toHaveAttribute('data-trail-base-color', '#c9c9c9');
  await expect(stageTrail).toHaveAttribute(
    'data-trail-active-color',
    '#573c79',
  );
  expect(Number(await stageTrail.getAttribute('data-trail-progress'))).toBe(1);
  expect(
    Number(
      await page
        .locator('.hero-title')
        .evaluate((title) => getComputedStyle(title).opacity),
    ),
  ).toBeGreaterThan(0.98);
  const copyGeometry = await stage.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return [...element.querySelectorAll('.hero-title')].map((copy) => {
      const rect = copy.getBoundingClientRect();
      return {
        horizontal: rect.right > box.left && rect.left < box.right,
        vertical: rect.bottom > box.top && rect.top < box.bottom,
      };
    });
  });
  expect(copyGeometry).toEqual([{ horizontal: true, vertical: true }]);
  await expect(page.locator('.orbit-label')).toContainText('Follow the stars');
  await expect(page.locator('.orbit-label')).toContainText('First Light');

  await setPhilosophyProgress(page, 0.8);
  expect(
    Number(
      await page
        .locator('.hero-title')
        .evaluate((title) => getComputedStyle(title).opacity),
    ),
  ).toBeLessThan(0.01);
});

test('07c Partnering follows the node rightward and exits before screen three', async ({
  page,
}) => {
  await prepare(page);
  const sample = async (progress: number) => {
    const stage = await setPhilosophyProgress(page, progress);
    return stage.evaluate((element) => {
      const title = element.querySelector('.hero-title')!;
      const rect = title.getBoundingClientRect();
      const [pointX] = (element.querySelector('canvas')!.dataset.point || '0,0')
        .split(',')
        .map(Number);
      return {
        left: rect.left,
        nodeX: element.getBoundingClientRect().left + pointX,
        opacity: Number(getComputedStyle(title).opacity),
        orbitOpacity: Number(
          getComputedStyle(element.querySelector('.orbit-label')!).opacity,
        ),
      };
    });
  };
  const entered = await sample(0.06);
  const travelled = await sample(0.5);
  const exiting = await sample(0.68);
  expect(travelled.left).toBeGreaterThan(entered.left + 50);
  expect(travelled.left - travelled.nodeX).toBeGreaterThan(20);
  expect(travelled.opacity).toBeGreaterThan(0.99);
  expect(travelled.orbitOpacity).toBeLessThan(0.01);
  expect(exiting.left).toBeGreaterThan(travelled.left);
  expect(exiting.opacity).toBeLessThan(0.1);
  const reversed = await sample(0.5);
  expect(reversed.left).toBeCloseTo(travelled.left, 0);
  expect(reversed.opacity).toBeCloseTo(travelled.opacity, 3);
  expect(reversed.orbitOpacity).toBeCloseTo(travelled.orbitOpacity, 3);
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

test('14 north-star label stays aligned to the fixed junction during the drop', async ({
  page,
}) => {
  await prepare(page);
  const stage = await setPhilosophyProgress(page, 0.96);
  const offset = await stage.evaluate((element) => {
    const [, y] = (
      element.querySelector('canvas')!.dataset.junctionPoint || '0,0'
    )
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

test('14a node moves left first, then drops vertically to the research axis', async ({
  page,
}) => {
  await prepare(page);
  const sample = async (progress: number) => {
    const stage = await setPhilosophyProgress(page, progress);
    return stage.evaluate((element) => {
      const canvas = element.querySelector('canvas')!;
      const [pointX, pointY] = (canvas.dataset.point || '0,0')
        .split(',')
        .map(Number);
      const [junctionX, junctionY] = (canvas.dataset.junctionPoint || '0,0')
        .split(',')
        .map(Number);
      const stageBox = element.getBoundingClientRect();
      const researchAxis = document
        .querySelector('.research-axis')!
        .getBoundingClientRect();
      const label = element
        .querySelector('.about-label')!
        .getBoundingClientRect();
      return {
        vertical: Number((element as HTMLElement).dataset.researchHandoff),
        horizontal: Number((element as HTMLElement).dataset.horizontalHandoff),
        nodeOpacity: Number(canvas.dataset.nodeOpacity),
        markerCount: Number(canvas.dataset.markerCount),
        pointX: stageBox.left + pointX,
        pointY,
        junctionX: stageBox.left + junctionX,
        junctionY,
        stageHeight: stageBox.height,
        researchX: researchAxis.left,
        labelGap: stageBox.left + pointX - label.right,
      };
    });
  };
  const horizontal = await sample(0.94);
  expect(horizontal.horizontal).toBe(1);
  expect(horizontal.vertical).toBe(0);
  expect(horizontal.markerCount).toBe(1);
  expect(horizontal.pointX).toBeCloseTo(horizontal.junctionX, 0);
  expect(horizontal.pointY).toBeCloseTo(horizontal.junctionY, 0);
  expect(Math.abs(horizontal.pointX - horizontal.researchX)).toBeLessThan(2);

  const dropping = await sample(0.97);
  expect(dropping.pointX).toBeCloseTo(horizontal.pointX, 0);
  expect(dropping.markerCount).toBe(2);
  expect(dropping.junctionX).toBeCloseTo(horizontal.junctionX, 0);
  expect(dropping.pointY).toBeGreaterThan(dropping.junctionY);

  const complete = await sample(1);
  expect(complete.vertical).toBe(1);
  expect(complete.nodeOpacity).toBe(0);
  expect(complete.markerCount).toBe(1);
  expect(complete.pointX).toBeCloseTo(horizontal.pointX, 0);
  expect(complete.pointY / complete.stageHeight).toBeGreaterThan(0.99);
  expect(complete.labelGap).toBeGreaterThanOrEqual(18);
});

test('14b active node stays dark and no left fork marker is rendered', async ({
  page,
}) => {
  await prepare(page);
  let stage = await setPhilosophyProgress(page, 0.06);
  const initial = await stage.locator('canvas').evaluate((canvas) => ({
    node: Number(canvas.dataset.nodeActivation),
    color: canvas.dataset.nodeColor,
    branchMarker: Number(canvas.dataset.branchMarkerOpacity),
  }));
  expect(initial).toEqual({
    node: 1,
    color: '#573c79',
    branchMarker: 0,
  });

  stage = await setPhilosophyProgress(page, 0.86);
  const fork = await stage.locator('canvas').evaluate((canvas) => ({
    node: Number(canvas.dataset.nodeActivation),
    color: canvas.dataset.nodeColor,
    branchMarker: Number(canvas.dataset.branchMarkerOpacity),
    markerCount: Number(canvas.dataset.markerCount),
    rail: Number(canvas.dataset.railActivation),
    rays: Number(canvas.dataset.rayActivation),
  }));
  expect(fork.node).toBe(1);
  expect(fork.color).toBe('#573c79');
  expect(fork.branchMarker).toBe(0);
  expect(fork.markerCount).toBe(1);
  expect(fork.rail).toBe(1);
  expect(fork.rays).toBeGreaterThan(0);

  stage = await setPhilosophyProgress(page, 0.94);
  const hold = await stage.locator('canvas').evaluate((canvas) => {
    const [pointX, pointY] = (canvas.dataset.point || '0,0')
      .split(',')
      .map(Number);
    const [junctionX, junctionY] = (canvas.dataset.junctionPoint || '0,0')
      .split(',')
      .map(Number);
    return {
      pointX,
      pointY,
      junctionX,
      junctionY,
      branchMarker: Number(canvas.dataset.branchMarkerOpacity),
    };
  });
  expect(hold.branchMarker).toBe(0);
  expect(hold.pointX).toBeCloseTo(hold.junctionX, 1);
  expect(hold.pointY).toBeCloseTo(hold.junctionY, 1);
  await expect(page.locator('.about-title span').first()).toHaveCSS(
    'filter',
    'blur(0px)',
  );
  await expect(page.locator('.about-copy')).toHaveCSS('opacity', '1');

  const researchNodeColor = await page
    .locator('.research-axis .diamond')
    .evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(researchNodeColor).toBe('rgb(87, 60, 121)');
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
  // "All" plus one filter per investment direction.
  await expect(page.locator('[data-portfolio-filter]')).toHaveCount(
    content.sectors.length + 1,
  );
  await page.locator('[data-portfolio-filter="applications"]').click();
  const state = await page
    .locator('[data-company-card]')
    .evaluateAll((cards) => ({
      visible: cards.filter((card) => !(card as HTMLElement).hidden).length,
      wrong: cards.filter(
        (card) =>
          !(card as HTMLElement).hidden &&
          !(card as HTMLElement).dataset
            .sectors!.split(' ')
            .includes('applications'),
      ).length,
    }));
  expect(state.visible).toBeGreaterThan(0);
  expect(state.wrong).toBe(0);
});

test('19a portfolio filters sit between the title and the grid like Figma', async ({
  page,
}) => {
  await prepare(page, 'zh/portfolio.html');
  const box = await page.evaluate(() => {
    const rect = (selector: string) =>
      document.querySelector(selector)!.getBoundingClientRect();
    const title = rect('.page-title');
    const filters = rect('.portfolio-filters');
    const grid = rect('.portfolio-grid');
    return {
      titleBottom: title.bottom,
      filtersTop: filters.top,
      filtersBottom: filters.bottom,
      filtersLeft: filters.left,
      gridTop: grid.top,
      gridLeft: grid.left,
    };
  });
  expect(box.filtersTop).toBeGreaterThanOrEqual(box.titleBottom);
  expect(box.filtersBottom).toBeLessThanOrEqual(box.gridTop);
  expect(Math.abs(box.filtersLeft - box.gridLeft)).toBeLessThan(2);
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
