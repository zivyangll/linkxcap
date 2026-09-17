import fs from 'node:fs/promises';
import path from 'node:path';
async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? walk(path.join(dir, e.name))
          : [path.join(dir, e.name)],
      ),
    )
  ).flat();
}
const pages = (await walk('dist')).filter((f) => /\.(html|css|js)$/.test(f));
const used = new Set();
for (const file of pages) {
  const text = await fs.readFile(file, 'utf8');
  for (const [, name] of text.matchAll(
    /assets\/figma\/([a-f0-9]+\.[a-z0-9]+)/g,
  ))
    used.add(name);
}
let removed = 0;
for (const name of await fs.readdir('dist/assets/figma'))
  if (!used.has(name)) {
    await fs.unlink(path.join('dist/assets/figma', name));
    removed++;
  }
console.log(
  `Publishing ${used.size} referenced Figma assets; excluded ${removed} unused originals / exports.`,
);
