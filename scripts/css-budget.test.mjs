import assert from 'node:assert/strict';
import test from 'node:test';
import { checkPageCss, PAGE_CSS_BUDGET } from './css-budget.mjs';

const sheets = (names) =>
  names
    .map((name) => `<link href="/linkxcap/${name}" rel="stylesheet">`)
    .join('');

test('separate routes can share a budget without loading all site CSS', () => {
  const css = new Map([
    ['shared.css', 20 * 1024],
    ['home.css', 12 * 1024],
    ['detail.css', 2 * 1024],
    ['editor.css', 4 * 1024],
  ]);
  assert(
    [...css.values()].reduce((sum, bytes) => sum + bytes, 0) > PAGE_CSS_BUDGET,
  );
  for (const route of ['home', 'detail', 'editor']) {
    const result = checkPageCss(
      sheets(['shared.css', `${route}.css`]),
      css,
      '/linkxcap',
      route,
    );
    assert(result.gzip <= PAGE_CSS_BUDGET);
  }
});

test('a page over the original 35 KiB limit still fails', () => {
  const css = new Map([
    ['shared.css', 20 * 1024],
    ['home.css', 16 * 1024],
  ]);
  assert.throws(
    () =>
      checkPageCss(
        sheets(['shared.css', 'home.css']),
        css,
        '/linkxcap',
        'home',
      ),
    /page CSS exceeds 35 KiB/,
  );
});

test('inline styles count and identical stylesheet requests are counted once', () => {
  const css = new Map([['shared.css', PAGE_CSS_BUDGET]]);
  const links = sheets(['shared.css?v=1', 'shared.css?v=1']);
  assert.equal(
    checkPageCss(links, css, '/linkxcap', 'home').gzip,
    PAGE_CSS_BUDGET,
  );
  assert.throws(
    () =>
      checkPageCss(
        `${links}<style>body{color:red}</style>`,
        css,
        '/linkxcap',
        'home',
      ),
    /page CSS exceeds 35 KiB/,
  );
  assert.throws(
    () =>
      checkPageCss(
        sheets(['shared.css?v=1', 'shared.css?v=2']),
        css,
        '/linkxcap',
        'home',
      ),
    /page CSS exceeds 35 KiB/,
  );
});

test('missing sheets and references outside the configured base fail', () => {
  assert.throws(
    () => checkPageCss(sheets(['missing.css']), new Map(), '/linkxcap', 'home'),
    /missing CSS/,
  );
  assert.throws(
    () =>
      checkPageCss(
        '<link rel="stylesheet" href="/other/style.css">',
        new Map(),
        '/linkxcap',
        'home',
      ),
    /outside site base/,
  );
});
