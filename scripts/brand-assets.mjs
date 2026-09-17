import fs from 'node:fs/promises';
import sharp from 'sharp';
const assets = JSON.parse(await fs.readFile('src/data/assets.json', 'utf8'))[
  '3297'
];
const mark = await fs.readFile(`public${assets.img1}`);
await fs.writeFile('public/favicon.svg', mark);
await sharp({
  create: { width: 180, height: 180, channels: 4, background: '#fdfbf5' },
})
  .composite([
    {
      input: await sharp(mark)
        .resize(92, 92, { fit: 'contain' })
        .png()
        .toBuffer(),
      gravity: 'centre',
    },
  ])
  .png()
  .toFile('public/apple-touch-icon.png');
const names = [
  ['imgGroup287', 258, 285, 196, 66],
  ['img1', 466, 286, 110, 65],
  ['imgGroup289', 590, 289, 362, 56],
];
const overlays = await Promise.all(
  names.map(async ([name, left, top, width, height]) => ({
    input: await sharp(`public${assets[name]}`)
      .resize(width, height, { fit: 'fill' })
      .png()
      .toBuffer(),
    left,
    top,
  })),
);
await sharp({
  create: { width: 1200, height: 630, channels: 3, background: '#fdfbf5' },
})
  .composite(overlays)
  .jpeg({ quality: 90 })
  .toFile('public/assets/og.jpg');
console.log('Exported brand icon and social image from the Figma vectors.');
