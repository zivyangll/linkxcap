import fs from 'node:fs/promises';
import sharp from 'sharp';
import { createHash } from 'node:crypto';

const manifest = JSON.parse(
  await fs.readFile('src/data/figma-assets.json', 'utf8'),
);
for (const assets of Object.values(manifest)) {
  for (const [key, value] of Object.entries(assets)) {
    if (!value.endsWith('.png')) continue;
    const data = await sharp(`public${value}`)
      .webp({ lossless: true, effort: 6 })
      .toBuffer();
    const hash = createHash('sha256').update(data).digest('hex').slice(0, 16);
    const output = `/assets/figma/${hash}.webp`;
    await fs.writeFile(`public${output}`, data);
    assets[key] = output;
  }
}
await fs.writeFile('src/data/assets.json', JSON.stringify(manifest, null, 2));
console.log('Optimized source images and updated the runtime asset map.');
