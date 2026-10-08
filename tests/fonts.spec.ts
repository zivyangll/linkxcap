import { test, expect } from '@playwright/test';

const family = 'LinkX Source Han Serif';
const routes = [
  'index',
  'portfolio',
  'portfolio/zhipu-ai',
  'team',
  'team-alex',
  'insights',
  'portfolio-yuanmu',
  'fellowship',
  'legal',
];

for (const lang of ['zh', 'en']) {
  for (const width of [390, 768, 1440, 2560]) {
    test(`${lang} text uses Source Han Serif on every template at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await page.goto(`${lang}/${route}.html`);
        await page.evaluate(() => document.fonts.ready);
        const audit = await page.evaluate((family) => {
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
          );
          const incorrect = new Set<string>();
          let node: Node | null;
          while ((node = walker.nextNode())) {
            const parent = node.parentElement;
            if (
              !node.textContent?.trim() ||
              !parent ||
              parent.closest('script, style, noscript')
            )
              continue;
            const font = getComputedStyle(parent).fontFamily;
            if (font.split(',')[0].trim().replaceAll('"', '') !== family)
              incorrect.add(`${parent.tagName}.${parent.className}: ${font}`);
          }
          return {
            incorrect: [...incorrect],
            loaded: [...document.fonts].some(
              (face) =>
                face.family.replaceAll('"', '') === family &&
                face.status === 'loaded',
            ),
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
          };
        }, family);
        expect(audit.incorrect, `${lang}/${route}`).toEqual([]);
        expect(audit.loaded, `${lang}/${route}`).toBe(true);
        expect(audit.overflow, `${lang}/${route}`).toBe(false);
      }
    });
  }
}

test('Chinese and Latin glyphs render from the hosted font at different weights', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Requires Chromium font inspection');
  await page.goto('zh/team.html');
  await page.evaluate(async (family) => {
    for (const weight of [400, 600, 900]) {
      const probe = document.createElement('p');
      probe.id = `font-probe-${weight}`;
      probe.style.font = `${weight} 24px "${family}"`;
      probe.textContent = '基础模型 Foundation 123';
      document.body.append(probe);
    }
    await document.fonts.ready;
  }, family);
  const client = await page.context().newCDPSession(page);
  await client.send('DOM.enable');
  await client.send('CSS.enable');
  const { root } = await client.send('DOM.getDocument');
  for (const weight of [400, 600, 900]) {
    const { nodeId } = await client.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: `#font-probe-${weight}`,
    });
    const { fonts } = await client.send('CSS.getPlatformFontsForNode', {
      nodeId,
    });
    expect(fonts.length).toBeGreaterThan(0);
    for (const font of fonts) {
      expect(font.familyName).toBe(family);
      expect(font.isCustomFont).toBe(true);
    }
  }
});

test('standalone content editor fields and code use the same font', async ({
  page,
}) => {
  await page.goto('a4f9c2e71b6d4830c5a8e2f94d7b136c.html?debug=true');
  await expect(page.locator('body')).toHaveAttribute(
    'data-editor-state',
    'ready',
  );
  await page.evaluate(() => document.fonts.ready);
  for (const selector of [
    'h1',
    'code',
    'button',
    'input',
    'textarea',
    'select',
  ]) {
    const fonts = await page
      .locator(selector)
      .evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).fontFamily),
      );
    for (const font of fonts) expect(font).toContain(family);
  }
});
