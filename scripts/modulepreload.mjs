import fs from 'node:fs/promises';
import path from 'node:path';

// Astro emits each page script as <script type="module" src>, but the chunks
// those scripts import (gsap, shared helpers) are only discovered once the
// entry has downloaded and parsed: one extra round trip before any motion can
// start, which on a 3G link is over a second. This step lists every static
// import of every page script as <link rel="modulepreload"> in the head, so
// the browser requests the whole graph together with the entries.
const dist = process.argv[2] || 'dist';
const base = (process.env.SITE_BASE || '/linkxcap').replace(/\/$/, '');

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? walk(path.join(dir, entry.name))
          : [path.join(dir, entry.name)],
      ),
    )
  ).flat();
}

// Static `import … from "./x.js"`, bare `import "./x.js"` and
// `export … from "./x.js"`. Dynamic import() is skipped on purpose: those
// chunks are optional and load on demand.
const STATIC_IMPORT =
  /\b(?:import|export)\s*(?:[^"'`();]*?\bfrom\s*)?["'](\.\/[^"']+\.js)["']/g;
const graph = new Map();
async function staticImports(file) {
  if (graph.has(file)) return graph.get(file);
  const found = [];
  graph.set(file, found);
  const code = await fs.readFile(file, 'utf8');
  for (const [, specifier] of code.matchAll(STATIC_IMPORT)) {
    const dependency = path.join(path.dirname(file), specifier);
    found.push(dependency, ...(await staticImports(dependency)));
  }
  return found;
}

const toFile = (src) => path.join(dist, src.slice(base.length));
const toUrl = (file) =>
  `${base}/${path.relative(dist, file).split(path.sep).join('/')}`;

let pages = 0;
for (const html of (await walk(dist)).filter((f) => f.endsWith('.html'))) {
  const text = await fs.readFile(html, 'utf8');
  const entries = [
    ...text.matchAll(/<script type="module" src="([^"]+)"/g),
  ].map(([, src]) => src);
  if (!entries.length || text.includes('rel="modulepreload"')) continue;
  const preload = new Set();
  for (const src of entries)
    for (const dependency of await staticImports(toFile(src)))
      preload.add(toUrl(dependency));
  entries.forEach((src) => preload.delete(src));
  if (!preload.size) continue;
  const links = [...preload]
    .map((href) => `<link rel="modulepreload" href="${href}">`)
    .join('');
  // The entries sit at the end of <body>; the head lets the preload scanner
  // see the whole graph as soon as the first bytes arrive.
  await fs.writeFile(html, text.replace('</head>', `${links}</head>`));
  pages++;
}
console.log(`Listed static module imports as modulepreload on ${pages} pages.`);
