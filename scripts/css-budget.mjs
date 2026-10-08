import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';

export const PAGE_CSS_BUDGET = 35 * 1024;

// Separate routes do not load each other's stylesheets. Apply the budget to
// each page's unique external sheets plus its inline styles, including fonts.
export function checkPageCss(html, cssByPath, base, page) {
  const stylesheets = new Map();
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = tag.match(/\brel=["']([^"']*)["']/i)?.[1];
    if (!rel?.toLowerCase().split(/\s+/).includes('stylesheet')) continue;
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    assert(href, `${page}: stylesheet is missing href`);
    const pathname = decodeURI(href.split(/[?#]/)[0]);
    assert(
      pathname.startsWith(`${base}/`),
      `${page}: stylesheet outside site base: ${href}`,
    );
    stylesheets.set(href.split('#')[0], pathname.slice(base.length + 1));
  }
  let externalGzip = 0;
  for (const stylesheet of stylesheets.values()) {
    assert(cssByPath.has(stylesheet), `${page}: missing CSS ${stylesheet}`);
    externalGzip += cssByPath.get(stylesheet);
  }
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)]
    .map((match) => match[1])
    .join('\n');
  const inlineGzip = inline ? gzipSync(inline).length : 0;
  const gzip = externalGzip + inlineGzip;
  assert(
    gzip <= PAGE_CSS_BUDGET,
    `${page}: page CSS exceeds 35 KiB gzip: ${gzip}`,
  );
  return {
    page,
    gzip,
    externalGzip,
    inlineGzip,
    stylesheets: [...stylesheets.keys()],
  };
}
