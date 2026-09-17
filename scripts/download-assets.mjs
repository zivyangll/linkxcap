import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// Exported Figma bytes remain intact. Temporary Figma URLs never reach the site.
const root = 'docs/research/design-context';
await fs.mkdir('public/assets/figma', { recursive: true });
await fs.mkdir('src/data', { recursive: true });
const manifest = {};
const jobs = [];
for (const file of await fs.readdir(root)) {
  if (!file.endsWith('.txt')) continue;
  const code = await fs.readFile(path.join(root, file), 'utf8');
  const id = path.basename(file, '.txt');
  manifest[id] = {};
  for (const match of code.matchAll(
    /const (img\w*) = "(https:\/\/www\.figma\.com\/api\/mcp\/asset\/[^"\s]+)"/g,
  )) {
    jobs.push({ id, key: match[1], url: match[2] });
  }
}
let done = 0;
async function worker() {
  while (jobs.length) {
    const job = jobs.shift();
    const response = await fetch(job.url);
    if (!response.ok)
      throw new Error(`${job.id}/${job.key}: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const ext = new URL(job.url).pathname.split('.').at(-1);
    const hash = crypto
      .createHash('sha256')
      .update(bytes)
      .digest('hex')
      .slice(0, 16);
    const name = `${hash}.${ext}`;
    await fs.writeFile(`public/assets/figma/${name}`, bytes);
    manifest[job.id][job.key] = `/assets/figma/${name}`;
    done++;
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
await fs.writeFile(
  'src/data/figma-assets.json',
  JSON.stringify(manifest, null, 2),
);
console.log(`Saved ${done} Figma references, deduplicated by content hash.`);
