import { test, expect } from '@playwright/test';

const hash = 'a4f9c2e71b6d4830c5a8e2f94d7b136c';
const editorPath = `${hash}.html`;
const validPath = `${editorPath}?debug=true`;
const storageKey = `linkx-content-editor:127.0.0.1:schema-12`;

test('invalid and duplicate debug parameters never initialize the editor', async ({
  page,
}) => {
  for (const query of ['', '?debug=false', '?debug=true&debug=true']) {
    const requested: string[] = [];
    page.on('request', (request) => requested.push(request.url()));
    await page.goto(`${editorPath}${query}`);
    await page.waitForTimeout(200);
    await expect(page.locator('[data-gate-title]')).toHaveText('不可访问');
    await expect(page.locator('[data-editor]')).toBeHidden();
    expect(requested.some((url) => url.includes(`${hash}.content.json`))).toBe(
      false,
    );
    expect(requested.some((url) => /content-editor\..*\.js/.test(url))).toBe(
      false,
    );
  }
});

test('valid entry loads grouped bilingual fields and stays out of sitemap', async ({
  page,
  request,
}) => {
  await page.goto(validPath);
  await expect(page.locator('body')).toHaveAttribute(
    'data-editor-state',
    'ready',
  );
  await expect(page.locator('.config-section')).toHaveCount(8);
  await expect(page.locator('[data-config-path="site.brand_cn"]')).toHaveValue(
    '星连资本',
  );
  await expect(page.locator('[data-config-path="site.brand_en"]')).toHaveValue(
    'Link-X Capital',
  );
  await expect(page.locator('[data-config-path="team.0.id"]')).toHaveCount(0);
  await expect(page.locator('[data-config-path="companies.0.id"]')).toHaveCount(
    0,
  );
  await expect(
    page.locator('[data-config-path="team.0.slug"]'),
  ).not.toHaveAttribute('readonly', '');
  await expect(
    page.locator('[data-config-path="companies.0.slug"]'),
  ).not.toHaveAttribute('readonly', '');
  const sitemap = await (await request.get('sitemap.xml')).text();
  expect(sitemap).not.toContain(hash);
});

test('public pages do not download editor code or configuration data', async ({
  page,
}) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));
  await page.goto('zh/index.html');
  await page.waitForTimeout(300);
  expect(requested.some((url) => /content-editor\..*\.js/.test(url))).toBe(
    false,
  );
  expect(requested.some((url) => url.includes(`${hash}.content.json`))).toBe(
    false,
  );
});

test('top-level groups use tabs and only show the selected section', async ({
  page,
}) => {
  await page.goto(validPath);
  const sitePanel = page.locator('#config-site');
  const portfolioPanel = page.locator('#config-portfolio');
  await expect(sitePanel).toBeVisible();
  await expect(portfolioPanel).toBeHidden();
  await page.getByRole('tab', { name: '投资组合', exact: true }).click();
  await expect(sitePanel).toBeHidden();
  await expect(portfolioPanel).toBeVisible();
  await expect(
    page.getByRole('tab', { name: '投资组合', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-config-path$=".note"]')).toHaveCount(0);
});

test('validation errors identify and open the exact configuration field', async ({
  page,
}) => {
  await page.goto(validPath);
  await page.getByRole('tab', { name: '投资组合', exact: true }).click();
  const companyName = page.locator('[data-config-path="companies.0.name_cn"]');
  await companyName.fill('');
  const error = page.locator('.validation-error-item', {
    has: page.locator('[data-error-path="companies.0.name_cn"]'),
  });
  await expect(error).toContainText('投资组合');
  await expect(error).toContainText('公司资料');
  await expect(error).toContainText('名称（中文）');
  await expect(error).toContainText('必须填写');

  await page.getByRole('tab', { name: '全站设置', exact: true }).click();
  await error.locator('[data-error-path="companies.0.name_cn"]').click();
  await expect(page.locator('#config-portfolio')).toBeVisible();
  await expect(companyName).toBeFocused();
});

test('business images accept filenames instead of CDN URLs', async ({
  page,
}) => {
  await page.goto(validPath);
  await page.getByRole('tab', { name: '投资组合', exact: true }).click();
  const logoFile = page.locator('[data-config-path="companies.0.logo_file"]');
  await logoFile.fill('https://cdn.example.com/zhipu-ai.webp');
  const error = page.locator('.validation-error-item', {
    has: page.locator('[data-error-path="companies.0.logo_file"]'),
  });
  await expect(error).toContainText('只能填写文件名');
  await logoFile.fill('zhipu-ai.webp');
  await expect(error).toHaveCount(0);
});

test('company tabs can rename, drag, add, delete and persist their order', async ({
  page,
}) => {
  await page.goto(validPath);
  await page.getByRole('tab', { name: '投资组合', exact: true }).click();
  const tabs = page.locator('[data-record-tabs="companies"] [role="tab"]');
  const rows = page.locator(
    '[data-record-tabs="companies"] [data-record-index]',
  );
  const initialCount = await tabs.count();
  const firstName = await page
    .locator('[data-config-path="companies.0.name_cn"]')
    .inputValue();
  const secondName = await page
    .locator('[data-config-path="companies.1.name_cn"]')
    .inputValue();

  await rows.nth(0).dragTo(rows.nth(1));
  await expect(
    page.locator('[data-config-path="companies.0.name_cn"]'),
  ).toHaveValue(secondName);
  await expect(
    page.locator('[data-config-path="companies.1.name_cn"]'),
  ).toHaveValue(firstName);

  await page
    .locator('[data-config-path="companies.1.name_cn"]')
    .fill('可修改公司名称');
  const slug = page.locator('[data-config-path="companies.1.slug"]');
  await slug.fill('Invalid/Company Route');
  await expect(
    page.locator('[data-error-path="companies.1.slug"]'),
  ).toBeVisible();
  await slug.fill('editable-company-route');
  await expect(
    page.locator('[data-error-path="companies.1.slug"]'),
  ).toHaveCount(0);
  await expect(tabs.nth(1)).toContainText('可修改公司名称');
  const storedAfterMove = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    storageKey,
  );
  expect(storedAfterMove.companies[0].name_cn).toBe(secondName);
  expect(storedAfterMove.companies[1].name_cn).toBe('可修改公司名称');
  expect(storedAfterMove.companies[1].slug).toBe('editable-company-route');

  await page.locator('[data-collection-add="companies"]').click();
  await expect(tabs).toHaveCount(initialCount + 1);
  await page
    .locator(`[data-config-path="companies.${initialCount}.name_cn"]`)
    .fill('新增投资公司');
  await expect(tabs.nth(initialCount)).toContainText('新增投资公司');
  await page.locator(`#companies-panel-${initialCount} .record-delete`).click();
  await expect(page.locator('[data-confirm-dialog]')).toBeVisible();
  await expect(page.locator('[data-confirm-message]')).toContainText(
    '新增投资公司',
  );
  await page.locator('[data-confirm-accept]').click();
  await expect(tabs).toHaveCount(initialCount);
});

test('team members use editable record tabs and support add, reorder and delete', async ({
  page,
}) => {
  await page.goto(validPath);
  await page.getByRole('tab', { name: '团队', exact: true }).click();
  const tabs = page.locator('[data-record-tabs="team"] [role="tab"]');
  const initialCount = await tabs.count();
  await page.locator('[data-collection-add="team"]').click();
  await expect(tabs).toHaveCount(initialCount + 1);
  await page
    .locator(`[data-config-path="team.${initialCount}.name_cn"]`)
    .fill('新团队成员');
  const slug = page.locator(`[data-config-path="team.${initialCount}.slug"]`);
  await slug.fill('Invalid/Team Route');
  await expect(
    page.locator(`[data-error-path="team.${initialCount}.slug"]`),
  ).toBeVisible();
  await slug.fill('new-team-member');
  await expect(
    page.locator(`[data-error-path="team.${initialCount}.slug"]`),
  ).toHaveCount(0);
  await expect(tabs.nth(initialCount)).toContainText('新团队成员');
  await page
    .locator(
      `[data-record-tabs="team"] [data-record-index="${initialCount}"] .record-move`,
    )
    .first()
    .click();
  await expect(
    page.locator(`[data-config-path="team.${initialCount - 1}.name_cn"]`),
  ).toHaveValue('新团队成员');
  await page.locator(`#team-panel-${initialCount - 1} .record-delete`).click();
  await expect(page.locator('[data-confirm-dialog]')).toBeVisible();
  await page.locator('[data-confirm-accept]').click();
  await expect(tabs).toHaveCount(initialCount);
});

test('every edit is immediately restored from the domain and schema isolated draft', async ({
  page,
}) => {
  await page.goto(validPath);
  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
  await page.reload();
  const chinese = page.locator('[data-config-path="site.brand_cn"]');
  const english = page.locator('[data-config-path="site.brand_en"]');
  await chinese.fill('星连资本草稿');
  await english.fill('Link-X Draft');
  await expect(page.locator('[data-save-status]')).toContainText(
    '已保存到本地',
  );
  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    storageKey,
  );
  expect(JSON.parse(stored!).site.brand_cn).toBe('星连资本草稿');
  await page.reload();
  await expect(chinese).toHaveValue('星连资本草稿');
  await expect(english).toHaveValue('Link-X Draft');
  await expect(page.locator('[data-save-status]')).toContainText('已恢复');
});

test('valid imports replace the complete draft and the last import wins', async ({
  page,
}) => {
  await page.goto(validPath);
  const source = await page.evaluate(async (name) => {
    const response = await fetch(`${name}.content.json`);
    return response.json();
  }, hash);
  page.on('dialog', (dialog) => dialog.accept());

  const first = structuredClone(source);
  first.site.brand_cn = '第一次导入';
  first.site.brand_en = 'First import';
  await page.locator('[data-file-input]').setInputFiles({
    name: 'first.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(first)),
  });
  await expect(page.locator('[data-config-path="site.brand_cn"]')).toHaveValue(
    '第一次导入',
  );

  const second = structuredClone(source);
  second.site.brand_cn = '第二次导入';
  second.site.brand_en = 'Second import';
  await page.locator('[data-file-input]').setInputFiles({
    name: 'second.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(second)),
  });
  await expect(page.locator('[data-config-path="site.brand_cn"]')).toHaveValue(
    '第二次导入',
  );
  await expect(page.locator('[data-config-path="site.brand_en"]')).toHaveValue(
    'Second import',
  );
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    storageKey,
  );
  expect(stored.site.brand_cn).toBe('第二次导入');
  expect(stored.site.brand_en).toBe('Second import');
});

test('invalid imports and cancelled imports leave form and draft unchanged', async ({
  page,
}) => {
  await page.goto(validPath);
  await page.locator('[data-config-path="site.brand_cn"]').fill('保留内容');
  const before = await page.evaluate(
    (key) => localStorage.getItem(key),
    storageKey,
  );

  await page.locator('[data-file-input]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":1,"__proto__":{}}'),
  });
  await expect(page.locator('[data-save-status]')).toContainText('导入失败');
  await expect(page.locator('[data-config-path="site.brand_cn"]')).toHaveValue(
    '保留内容',
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe(before);

  const source = await page.evaluate(
    async (name) => (await fetch(`${name}.content.json`)).json(),
    hash,
  );
  source.site.brand_cn = '不应出现';
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator('[data-file-input]').setInputFiles({
    name: 'cancelled.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(source)),
  });
  await expect(page.locator('[data-save-status]')).toContainText('已取消导入');
  await expect(page.locator('[data-config-path="site.brand_cn"]')).toHaveValue(
    '保留内容',
  );
});

test('export uses the latest fields and can round-trip through import', async ({
  page,
}) => {
  await page.goto(validPath);
  await page.locator('[data-config-path="site.brand_cn"]').fill('导出即时内容');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-export]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^content-\d{4}-\d{2}-\d{2}-\d{6}\.json$/,
  );
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const exported = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(exported.site.brand_cn).toBe('导出即时内容');
  expect(exported.schemaVersion).toBe(12);
  expect(exported.pages.contact).not.toHaveProperty('play_video_cn');
  expect(exported.pages.contact).not.toHaveProperty('play_video_en');
  expect(exported.insights.articles).toBeUndefined();
  expect(exported.insights.list_rows).toBeUndefined();

  await page.locator('[data-config-path="site.brand_cn"]').fill('临时变化');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-file-input]').setInputFiles({
    name: 'roundtrip.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await expect(page.locator('[data-config-path="site.brand_cn"]')).toHaveValue(
    '导出即时内容',
  );
});

test('localStorage write failures are visible and do not prevent export', async ({
  browser,
}) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('linkx-content-editor:'))
        throw new DOMException('Quota blocked for test', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  const page = await context.newPage();
  await page.goto(validPath);
  await page.locator('[data-config-path="site.brand_cn"]').fill('仍可导出');
  await expect(page.locator('[data-save-status]')).toContainText('保存失败');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-export]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  await expect(page.locator('[data-save-status]')).toContainText(
    '已直接导出当前内存中的完整配置',
  );
  await context.close();
});

test('editor remains usable on a 360px mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(validPath);
  await expect(page.locator('[data-editor]')).toBeVisible();
  await expect(
    page.locator('[data-config-path="site.brand_cn"]'),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

for (const version of [9, 10, 11])
  test(`v${version} drafts preserve edits and migrate video filenames without overwriting the old draft`, async ({
    page,
  }) => {
    await page.goto(validPath);
    await expect(page.locator('body')).toHaveAttribute(
      'data-editor-state',
      'ready',
    );
    const response = await page.request.get(`${hash}.content.json`);
    const legacy = await response.json();
    legacy.schemaVersion = version;
    legacy.media.fellow.video_url =
      'https://example.com/assets/video_example.mp4';
    delete legacy.media.fellow.video_file;
    legacy.site.brand_cn = '保留我的品牌修改';
    legacy.pages.contact.play_video_cn = '旧播放视频';
    legacy.pages.contact.play_video_en = 'Old play film';
    Object.assign(legacy.ui, {
      pause_cn: '旧暂停',
      pause_en: 'Old pause',
      resume_cn: '旧开启',
      resume_en: 'Old resume',
    });
    const previousKey = storageKey.replace('schema-12', `schema-${version}`);
    await page.evaluate(
      ({ previousKey, storageKey, legacy }) => {
        localStorage.removeItem(storageKey);
        localStorage.setItem(previousKey, JSON.stringify(legacy));
      },
      { previousKey, storageKey, legacy },
    );
    await page.reload();
    await expect(
      page.locator('[data-config-path="site.brand_cn"]'),
    ).toHaveValue('保留我的品牌修改');
    expect(
      await page.evaluate((key) => localStorage.getItem(key), storageKey),
    ).toBeNull();
    expect(
      JSON.parse(
        (await page.evaluate((key) => localStorage.getItem(key), previousKey))!,
      ).ui.pause_cn,
    ).toBe('旧暂停');
    await expect(page.locator('[data-config-path="ui.pause_cn"]')).toHaveCount(
      0,
    );
    const download = page.waitForEvent('download');
    await page.locator('[data-export]').click();
    const file = await download;
    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const exported = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    expect(exported.schemaVersion).toBe(12);
    expect(exported.site.brand_cn).toBe('保留我的品牌修改');
    expect(exported.media.fellow.video_file).toBe('video_example.mp4');
    expect(exported.media.fellow).not.toHaveProperty('video_url');
    expect(exported.ui).not.toHaveProperty('pause_cn');
    expect(exported.ui).not.toHaveProperty('resume_en');
    expect(exported.pages.contact).not.toHaveProperty('play_video_cn');
    expect(exported.pages.contact).not.toHaveProperty('play_video_en');
  });

test('video filename can be edited and exported, and invalid URLs identify the media field', async ({
  page,
}) => {
  await page.goto(validPath);
  await page.getByRole('tab', { name: '联系方式和媒体', exact: true }).click();
  const video = page.locator('[data-config-path="media.fellow.video_file"]');
  await expect(video).toHaveValue('video_example.mp4');
  await video.fill('https://example.com/movie.mp4');
  await page.locator('[data-export]').click();
  await expect(page.locator('[data-errors]')).toContainText('视频文件名');
  await video.fill('my-film.mp4');
  const download = page.waitForEvent('download');
  await page.locator('[data-export]').click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(
    JSON.parse(Buffer.concat(chunks).toString('utf8')).media.fellow.video_file,
  ).toBe('my-film.mp4');
});
