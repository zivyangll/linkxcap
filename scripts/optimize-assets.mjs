import fs from 'node:fs/promises';
import sharp from 'sharp';

const manifest = JSON.parse(
  await fs.readFile('src/data/figma-assets.json', 'utf8'),
);
const sizes = {};
for (const assets of Object.values(manifest)) {
  for (const [key, value] of Object.entries(assets)) {
    if (!value.endsWith('.png')) continue;
    const output = value.replace('.png', '.webp');
    const info = await sharp(`public${value}`)
      .resize({ width: 1400, withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 100 })
      .toFile(`public${output}`);
    sizes[output] = {
      width: info.width,
      height: info.height,
      bytes: info.size,
    };
    assets[key] = output;
  }
}
await fs.writeFile('src/data/assets.json', JSON.stringify(manifest, null, 2));
await fs.writeFile('src/data/asset-sizes.json', JSON.stringify(sizes, null, 2));
console.log(`Optimized ${Object.keys(sizes).length} source images.`);
