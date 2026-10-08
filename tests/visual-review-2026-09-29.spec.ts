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

test('02 Open Signal body follows the Regular weight of the frame', async ({
  page,
}) => {
  await prepare(page);
  const weight = await page
    .locator('.opening-copy')
    .evaluate((element) => Number(getComputedStyle(element).fontWeight));
  // Figma 272:783: the opening paragraph is Regular (400).
  expect(weight).toBe(400);
});

test('03 First Light breaks onto two lines in en and sits under no extra line', async ({
  page,
}) => {
  await prepare(page);
  await expect(page.locator('.opening-title-line')).toHaveText([
    'First',
    'Light',
  ]);
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

test('07 Backing the builders headline sets three lines in the frame', async ({
  page,
}) => {
  await prepare(page);
  // "Backing" breaks off on desktop; the second break is the original one.
  await expect(page.locator('.hero-title br')).toHaveCount(2);
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
      breaks: 2,
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
    const title = page.locator('#hero-title');
    await expect(title).toContainText(expected);
    await expect(title).not.toContainText(excluded);
    await expect(title.locator('br')).toHaveCount(breaks);
    await expect(title).toHaveClass(
      zh ? 'hero-title hero-title--zh' : 'hero-title',
    );
    // zh also sets the English headline above the Chinese one (frame 2).
    await expect(page.locator('.hero-title-en')).toHaveCount(zh ? 1 : 0);
    await expect(page.locator('.hero-zh')).toHaveCount(0);
  }
});

test('07a route starts pale, activates behind the node, and keeps hero copy visible', async ({
  page,
}) => {
  await prepare(page);
  const openingTrail = page.locator('.opening .scroll-trail');
  // Figma 272:791: the rail is #573C79 fading to #8C8A9E.
  await expect(openingTrail).toHaveAttribute(
    'data-trail-base-color',
    'linear-gradient(#573c79,#8c8a9e)',
  );
  await expect(openingTrail).toHaveAttribute(
    'data-trail-active-color',
    'rgba(87,60,121,.95)',
  );
  await expect(openingTrail).toHaveAttribute('data-node-color', '#000');
  await expect(page.locator('.opening-track > svg')).toBeHidden();

  let stage = await setPhilosophyProgress(page, 0);
  await expect(page.locator('#hero-title')).toHaveCSS('opacity', '1');

  stage = await setPhilosophyProgress(page, 0.06);
  expect(
    Number(
      await page
        .locator('#hero-title')
        .evaluate((title) => getComputedStyle(title).opacity),
    ),
  ).toBeGreaterThan(0.99);

  stage = await setPhilosophyProgress(page, 0.5);
  const stageTrail = stage.locator('.philosophy-stage-canvas');
  await expect(stageTrail).toHaveAttribute('data-trail-base-color', '#c9c9c9');
  await expect(stageTrail).toHaveAttribute(
    'data-trail-active-color',
    '#573c79',
  );
  expect(
    Number(await stageTrail.getAttribute('data-trail-progress')),
  ).toBeGreaterThan(0.9);
  expect(
    Number(
      await page
        .locator('#hero-title')
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

test('07c Partnering holds its frame position and exits before screen three', async ({
  page,
}) => {
  await prepare(page);
  const sample = async (progress: number) => {
    const stage = await setPhilosophyProgress(page, progress);
    return stage.evaluate((element) => {
      const title = element.querySelector('#hero-title')!;
      const rect = title.getBoundingClientRect();
      return {
        left: rect.left,
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
  // Frame 2 keeps the headline where it is drawn while the node travels.
  expect(travelled.left).toBeCloseTo(entered.left, 0);
  expect(travelled.opacity).toBeGreaterThan(0.99);
  // "open signal" waits beside its marker on the arc until the hero leaves.
  expect(travelled.orbitOpacity).toBeGreaterThan(0.99);
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

test('09 institution headline sits in the upper band of frame 4', async ({
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
  // Figma 272:970 top 263 of 1080.
  expect(ratio).toBeGreaterThan(0.2);
  expect(ratio).toBeLessThan(0.3);
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
    '4,4',
  );
});

test('12 node and the blurred label pair form frame 3', async ({ page }) => {
  await prepare(page);
  const stage = await setPhilosophyProgress(page, 0.74);
  const geometry = await stage.evaluate((element) => {
    const [x, y] = (element.querySelector('canvas')!.dataset.point || '0,0')
      .split(',')
      .map(Number);
    const label = element
      .querySelector('.about-label-line')!
      .getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return {
      below: label.top - (box.top + y),
      sideways: Math.abs(label.left + label.width / 2 - (box.left + x)),
      opacity: Number(
        getComputedStyle(element.querySelector('.about-label')!).opacity,
      ),
    };
  });
  // Figma 275:3955/272:881: the label sits below the node, left of centre.
  expect(geometry.below).toBeGreaterThan(40);
  expect(geometry.sideways).toBeLessThan(260);
  expect(geometry.opacity).toBeGreaterThan(0.99);
});

test('13 the rail arrives before the final marker appears', async ({
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
  expect(before.guide).toBe(0);
  expect(before.ring).toBe(0);
  expect(after.guide).toBe(1);
  expect(after.ring).toBeGreaterThan(0);
});

test('14 north-star label has cleared before the drop', async ({ page }) => {
  await prepare(page);
  await setPhilosophyProgress(page, 0.96);
  await expect(page.locator('.about-label')).toHaveCSS('opacity', '0');
});

test('14a the node stays on its frame 4 position instead of travelling left', async ({
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
      return {
        vertical: Number((element as HTMLElement).dataset.researchHandoff),
        horizontal: Number((element as HTMLElement).dataset.horizontalHandoff),
        nodeOpacity: Number(canvas.dataset.nodeOpacity),
        markerCount: Number(canvas.dataset.markerCount),
        pointX,
        pointY,
        width: element.getBoundingClientRect().width,
      };
    });
  };
  const held = await sample(0.94);
  // Figma 275:2208: the node rests at x 959 of 1920, centred.
  expect(held.pointX / held.width).toBeCloseTo(959 / 1920, 2);
  for (const progress of [0.975, 0.99, 1]) {
    const next = await sample(progress);
    expect(next.horizontal).toBe(0);
    expect(next.vertical).toBe(0);
    expect(next.markerCount).toBe(1);
    expect(next.pointX).toBeCloseTo(held.pointX, 0);
    expect(next.pointY).toBeCloseTo(held.pointY, 0);
  }
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
    color: '#000',
    branchMarker: 0,
  });

  stage = await setPhilosophyProgress(page, 0.9);
  const fork = await stage.locator('canvas').evaluate((canvas) => ({
    node: Number(canvas.dataset.nodeActivation),
    color: canvas.dataset.nodeColor,
    branchMarker: Number(canvas.dataset.branchMarkerOpacity),
    markerCount: Number(canvas.dataset.markerCount),
    rail: Number(canvas.dataset.railActivation),
    rays: Number(canvas.dataset.rayActivation),
  }));
  expect(fork.node).toBe(1);
  expect(fork.color).toBe('#000');
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
  // Figma 272:1033: the research node is near-black.
  expect(researchNodeColor).toBe('rgb(9, 9, 9)');
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
