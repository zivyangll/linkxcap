import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
const base = (process.env.SITE_BASE || '/linkxcap').replace(/\/$/, '');
async function walk(dir) {
  const all = await fs.readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      all.map((x) =>
        x.isDirectory()
          ? walk(path.join(dir, x.name))
          : [path.join(dir, x.name)],
      ),
    )
  ).flat();
}
const files = await walk('dist');
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const pages = htmlFiles.filter((f) => /^dist\/(zh|en)\//.test(f));
assert.equal(pages.length, 70, 'Expected 35 pages per language');
const failures = [];
for (const file of htmlFiles) {
  const html = await fs.readFile(file, 'utf8');
  if (html.includes('figma.com/api/mcp/asset'))
    failures.push(`${file}: ephemeral asset URL`);
  if (pages.includes(file)) {
    const lang = file.split('/')[1];
    if (!html.includes(`lang="${lang === 'zh' ? 'zh-CN' : 'en'}"`))
      failures.push(`${file}: language`);
    for (const value of [
      'rel="canonical"',
      'hreflang="zh-CN"',
      'hreflang="en"',
      'name="description"',
    ])
      if (!html.includes(value)) failures.push(`${file}: missing ${value}`);
    if ((html.match(/<h1[\s>]/g) || []).length !== 1)
      failures.push(`${file}: expected one h1`);
  }
  for (const [, ref] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (!ref.startsWith('/') || ref.startsWith('//')) continue;
    const local = decodeURI(ref.split(/[?#]/)[0]);
    if (base && !(local === base || local.startsWith(base + '/'))) {
      failures.push(`${file}: wrong base ${ref}`);
      continue;
    }
    let target = local.slice(base.length) || '/';
    if (target.endsWith('/')) target += 'index.html';
    try {
      await fs.access(path.join('dist', target));
    } catch {
      failures.push(`${file}: missing ${ref}`);
    }
  }
}
assert.deepEqual(failures, []);
const report = [];
for (const file of files.filter((f) => /\.(css|js)$/.test(f))) {
  const raw = await fs.readFile(file);
  report.push({
    file: file.replace('dist/', ''),
    bytes: raw.length,
    gzip: gzipSync(raw).length,
  });
}
const css = report
  .filter((f) => f.file.endsWith('.css'))
  .reduce((n, x) => n + x.gzip, 0);
const js = report
  .filter((f) => f.file.endsWith('.js'))
  .reduce((n, x) => n + x.gzip, 0);
assert(css <= 35 * 1024, `CSS exceeds 35 KiB gzip: ${css}`);
// Three.js is an optional, viewport-loaded enhancement with its own budget.
// Core navigation/content must remain within the original 120 KiB ceiling.
const topologyJs = report.filter(f => /\/topology\..*\.js$/.test(f.file)).reduce((n, f) => n + f.gzip, 0);
const coreJs = js - topologyJs;
assert(coreJs <= 120 * 1024, `Core JS exceeds 120 KiB gzip: ${coreJs}`);
assert(topologyJs <= 145 * 1024, `Optional 3D JS exceeds 145 KiB gzip: ${topologyJs}`);
assert(js <= 200 * 1024, `Combined JS exceeds 200 KiB gzip: ${js}`);
await fs.mkdir('.cache', { recursive: true });
await fs.writeFile(
  '.cache/build-report.json',
  JSON.stringify(
    {
      pages: pages.length,
      totalHtml: htmlFiles.length,
      cssGzip: css,
      jsGzip: js,
      coreJsGzip: coreJs,
      optionalTopologyJsGzip: topologyJs,
      chunks: report,
    },
    null,
    2,
  ),
);
console.log(
  `Verified ${pages.length} bilingual content pages, local links, SEO and assets. CSS ${(css / 1024).toFixed(1)} KiB, JS ${(js / 1024).toFixed(1)} KiB gzip.`,
);
