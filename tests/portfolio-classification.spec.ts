import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  CONTENT_SCHEMA_VERSION,
  upgradeContentConfig,
  validateContentConfig,
} from '../src/lib/content-schema';

const content = JSON.parse(
  readFileSync('src/data/content.json', 'utf8'),
) as typeof import('../src/data/content.json');

for (const lang of ['zh', 'en'] as const) {
  for (const width of [390, 1440]) {
    test(`${lang} ${width}px portfolio filters include primary and secondary categories`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${lang}/portfolio.html`);
      const buttons = page.locator('[data-portfolio-filter]');
      await expect(buttons).toHaveCount(content.sectors.length + 1);
      for (const sector of content.sectors) {
        const button = page.locator(`[data-portfolio-filter="${sector.id}"]`);
        await expect(button).toHaveText(
          lang === 'zh' ? sector.name_cn : sector.name_en,
        );
        await button.click();
        await expect(button).toHaveAttribute('aria-pressed', 'true');
        const expected = content.companies
          .filter((company) => company.sector_ids.includes(sector.id))
          .map((company) => company.slug)
          .sort();
        const visible = page.locator('[data-company-card]:not([hidden])');
        await expect(visible).toHaveCount(expected.length);
        expect(
          await visible.evaluateAll((cards) =>
            cards.map((card) => (card as HTMLElement).dataset.slug).sort(),
          ),
        ).toEqual(expected);
      }
      await page.locator('[data-portfolio-filter="all"]').click();
      await expect(
        page.locator('[data-company-card]:not([hidden])'),
      ).toHaveCount(content.companies.length);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    });
  }
  test(`${lang} homepage connects each company only to tag1`, async ({
    page,
  }) => {
    await page.goto(`${lang}/index.html`);
    await expect(page.locator('.sector-star')).toHaveCount(
      content.sectors.length,
    );
    await expect(page.locator('.constellation-company')).toHaveCount(
      content.companies.length,
    );
    for (const sector of content.sectors) {
      const expected = content.companies
        .filter((company) => company.sector_id === sector.id)
        .map((company) => `company-${company.id}`)
        .sort();
      const actual = await page
        .locator(`.constellation-company[data-focus-sector="${sector.id}"]`)
        .evaluateAll((nodes) =>
          nodes
            .map((node) => (node as HTMLElement).dataset.topologyAnchor)
            .sort(),
        );
      expect(actual).toEqual(expected);
    }
    // AMIO is listed in foundation too, but its homepage branch stays physical.
    await expect(
      page.locator('[data-topology-anchor="company-amio-robotics"]'),
    ).toHaveAttribute('data-focus-sector', 'physical');
    await expect(
      page.locator('[data-topology-anchor="sector-chips"]'),
    ).toHaveCount(1);
  });
}

test('configuration rejects invalid or inconsistent categories and upgrades single-category drafts', () => {
  expect(validateContentConfig(content, content).valid).toBe(true);
  for (const ids of [
    [],
    ['unknown'],
    ['foundation', 'foundation'],
    ['physical'],
  ]) {
    const candidate = structuredClone(content);
    candidate.companies[0].sector_ids = ids;
    expect(validateContentConfig(candidate, content).valid).toBe(false);
  }
  const legacy = structuredClone(content) as Record<string, any>;
  legacy.schemaVersion = 17;
  legacy.companies.forEach(
    (company: Record<string, unknown>) => delete company.sector_ids,
  );
  const upgraded = upgradeContentConfig(legacy) as typeof content;
  expect(upgraded.schemaVersion).toBe(CONTENT_SCHEMA_VERSION);
  expect(validateContentConfig(upgraded, content).valid).toBe(true);
  expect(
    upgraded.companies.every(
      (company) =>
        company.sector_ids.length === 1 &&
        company.sector_ids[0] === company.sector_id,
    ),
  ).toBe(true);
  expect(
    legacy.companies.every(
      (company: Record<string, unknown>) => !('sector_ids' in company),
    ),
  ).toBe(true);
});

test('editor saves multiple list categories while keeping a single homepage primary', async ({
  page,
}) => {
  await page.goto('a4f9c2e71b6d4830c5a8e2f94d7b136c.html?debug=true');
  await expect(page.locator('body')).toHaveAttribute(
    'data-editor-state',
    'ready',
  );
  await page.getByRole('tab', { name: '投资组合', exact: true }).click();
  // The first company gains another direction as an extra list tag, then
  // makes it the homepage primary.
  const index = 0;
  const added = content.sectors.find(
    (sector) => !content.companies[index].sector_ids.includes(sector.id),
  )!.id;
  const primary = page.locator(
    `[data-config-path="companies.${index}.sector_id"]`,
  );
  const extra = page.locator(
    `[data-config-path="companies.${index}.sector_ids.${added}"]`,
  );
  await extra.check();
  await expect(extra).toBeChecked();
  await primary.selectOption(added);
  await expect(extra).toBeDisabled();
  const saved = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem('linkx-content-editor:127.0.0.1:schema-18')!,
    ),
  );
  expect(saved.companies[index].sector_id).toBe(added);
  expect(saved.companies[index].sector_ids).toEqual([
    added,
    ...content.companies[index].sector_ids,
  ]);
  expect(validateContentConfig(saved, content).valid).toBe(true);
});

test('v17 draft restores without overwriting user edits or the old storage entry', async ({
  page,
}) => {
  const legacy = structuredClone(content) as Record<string, any>;
  legacy.schemaVersion = 17;
  legacy.site.brand_cn = '保留原有编辑';
  legacy.companies.forEach(
    (company: Record<string, unknown>) => delete company.sector_ids,
  );
  await page.addInitScript((draft) => {
    localStorage.setItem(
      'linkx-content-editor:127.0.0.1:schema-17',
      JSON.stringify(draft),
    );
  }, legacy);
  await page.goto('a4f9c2e71b6d4830c5a8e2f94d7b136c.html?debug=true');
  await expect(page.locator('[data-config-path="site.brand_cn"]')).toHaveValue(
    '保留原有编辑',
  );
  await expect(page.locator('[data-save-status]')).toContainText(
    '升级旧版本草稿',
  );
  await page.locator('[data-config-path="site.brand_cn"]').fill('新编辑仍保留');
  const stored = await page.evaluate(() => ({
    old: JSON.parse(
      localStorage.getItem('linkx-content-editor:127.0.0.1:schema-17')!,
    ),
    current: JSON.parse(
      localStorage.getItem('linkx-content-editor:127.0.0.1:schema-18')!,
    ),
  }));
  expect(stored.old).toEqual(legacy);
  expect(stored.current.site.brand_cn).toBe('新编辑仍保留');
  expect(validateContentConfig(stored.current, content).valid).toBe(true);
});
