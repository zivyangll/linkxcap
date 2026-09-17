// Metrics compare native pixels; no resampling, registration, masking or exclusions.
import sharp from 'sharp';
import fs from 'node:fs/promises';
const root = 'docs/verification/visual-audit',
  phase = process.argv[2] || 'after';
await fs.mkdir(`${root}/diff`, { recursive: true });
const cases = JSON.parse(await fs.readFile(`${root}/cases.json`, 'utf8'));
const report = [];
for (const c of cases) {
  const rp = `${root}/reference/${c.id}.png`,
    ap = `${root}/${phase}/${c.id}.png`;
  const rm = await sharp(rp).metadata(),
    am = await sharp(ap).metadata();
  const width = Math.max(rm.width, am.width),
    height = Math.max(rm.height, am.height);
  const raw = async (p, m) =>
    sharp(p)
      .flatten({ background: '#ff00ff' })
      .extend({
        right: width - m.width,
        bottom: height - m.height,
        background: '#ff00ff',
      })
      .removeAlpha()
      .raw()
      .toBuffer();
  const [a, b] = await Promise.all([raw(rp, rm), raw(ap, am)]);
  let total = 0,
    changed = 0,
    strong = 0;
  const heat = Buffer.alloc(width * height * 3, 248);
  for (let i = 0; i < a.length; i += 3) {
    const d = Math.max(
      Math.abs(a[i] - b[i]),
      Math.abs(a[i + 1] - b[i + 1]),
      Math.abs(a[i + 2] - b[i + 2]),
    );
    if (d) changed++;
    if (d > 16) {
      strong++;
      heat[i] = 220;
      heat[i + 1] = 40;
      heat[i + 2] = 95;
    }
    total +=
      Math.abs(a[i] - b[i]) +
      Math.abs(a[i + 1] - b[i + 1]) +
      Math.abs(a[i + 2] - b[i + 2]);
  }
  if (phase === 'after')
    await sharp(heat, { raw: { width, height, channels: 3 } })
      .png()
      .toFile(`${root}/diff/${c.id}.png`);
  report.push({
    ...c,
    reference: [rm.width, rm.height],
    actual: [am.width, am.height],
    differentPixelPercent: (changed / (width * height)) * 100,
    over16PixelPercent: (strong / (width * height)) * 100,
    meanAbsoluteChannelDifference: total / (width * height * 3),
  });
}
await fs.writeFile(
  `${root}/${phase}-metrics.json`,
  JSON.stringify(report, null, 2),
);
console.table(
  report.map((x) => ({
    id: x.id,
    height: x.actual[1] + '/' + x.reference[1],
    diff: x.differentPixelPercent.toFixed(2),
    over16: x.over16PixelPercent.toFixed(2),
    MAE: x.meanAbsoluteChannelDifference.toFixed(3),
  })),
);
await fs.mkdir('.cache/figma-audit', { recursive: true });
for (const id of [
  '3297',
  '3348',
  '3438',
  '3487',
  '3549',
  '1282',
  '4631',
  '1692',
  '3191',
  '2833',
  '4729',
  '2021',
]) {
  const ref = await sharp(`${root}/reference/${id}.png`)
    .resize({ width: 960 })
    .png()
    .toBuffer();
  const actual = await sharp(`${root}/${phase}/${id}.png`)
    .resize({ width: 960 })
    .png()
    .toBuffer();
  const r = await sharp(ref).metadata(),
    a = await sharp(actual).metadata();
  await sharp({
    create: {
      width: 1920,
      height: Math.max(r.height, a.height),
      channels: 3,
      background: '#dddddd',
    },
  })
    .composite([
      { input: ref, left: 0, top: 0 },
      { input: actual, left: 960, top: 0 },
    ])
    .png()
    .toFile(`.cache/figma-audit/${phase}-${id}-pair.png`);
}
