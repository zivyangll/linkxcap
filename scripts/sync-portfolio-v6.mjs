import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

// The V6 CSV is the portfolio of record: its 56 companies, names, detail copy,
// websites and tags replace the site's list. Companies outside it are removed.
// Copy keeps the site-wide terms of the copy deck (具身智能 / embodied AI,
// straight apostrophes).

const sourcePath = 'docs/被投企业汇总_V6.csv';
const configPath = 'src/data/content.json';
const mappingPath = 'docs/portfolio-v6-classification-audit.json';
const source = await fs.readFile(sourcePath, 'utf8');

// Preserve quoted commas, escaped quotes and multiline cells from the source.
function parseCsv(text) {
  const rows = [];
  let row = [],
    cell = '',
    quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && character === ',') {
      row.push(cell);
      cell = '';
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else cell += character;
  }
  assert.equal(quoted, false, 'CSV has an unclosed quoted field');
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const headers = rows.shift();
  assert.equal(
    new Set(headers).size,
    headers.length,
    'CSV headers must be unique',
  );
  return rows.map((values, index) => {
    assert.equal(
      values.length,
      headers.length,
      `CSV record ${index + 1}: column count`,
    );
    return Object.fromEntries(
      headers.map((header, column) => [header, values[column]]),
    );
  });
}

const rows = parseCsv(source);
const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
const categoryIds = {
  基础模型与学习范式: 'foundation',
  芯片: 'chips',
  'AI 基础设施': 'infrastructure',
  'AI 原生应用': 'applications',
  具身智能: 'physical',
  科学智能: 'frontiers',
};
// These five renamed records have the same Chinese description after replacing
// only the opening company name (XING YUN already has an identical description).
const aliases = {
  行云: 'xingyun-ic',
  沐言: 'muyan-zhiyu',
  像素绽放: 'aippt',
  星脉智动: 'xmax-ai',
  魔豆领科: 'modalink',
};
const deckTerms = (text) =>
  text
    .replace(/物理智能/g, '具身智能')
    .replace(/\bPhysical AI\b/g, 'Embodied AI')
    .replace(/\bphysical AI\b/g, 'embodied AI')
    .replace(/[‘’]/g, "'")
    .trim();
// Website cells may carry a research note on a second line.
const website = (cell) => {
  const url = cell.split('\n')[0].trim();
  return /^https?:\/\//.test(url) ? url : '';
};
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const logos = await fs.readdir('public/company');
const categories = new Map();
const matched = new Set();
const records = [];
const missing = [];
assert.equal(
  new Set(rows.map((row) => row['序号'])).size,
  rows.length,
  'Duplicate source IDs',
);

for (const row of rows) {
  const tags = [];
  for (let tag = 1; tag <= 4; tag++) {
    const zh = row[`行业标签 ${tag}`];
    const en = row[`行业标签 ${tag} / English`];
    if (!zh) {
      assert.equal(en, '', 'English tag without Chinese tag');
      continue;
    }
    const id = categoryIds[zh];
    assert.ok(id && en, `Unknown/incomplete source category: ${zh}`);
    if (categories.has(id))
      assert.deepEqual(categories.get(id), { id, zh, en });
    else categories.set(id, { id, zh, en });
    tags.push(id);
  }
  assert.ok(
    tags.length && row['行业标签 1'],
    `Missing tag1: ${row['项目名/中文']}`,
  );
  assert.equal(
    new Set(tags).size,
    tags.length,
    `Duplicate tags: ${row['项目名/中文']}`,
  );
  const exact = config.companies.filter(
    (company) =>
      company.name_cn === row['项目名/中文'] ||
      company.name_en === row['项目名/英文'],
  );
  assert.ok(exact.length <= 1, `Ambiguous company: ${row['项目名/中文']}`);
  const company =
    exact[0] ||
    config.companies.find(
      (company) => company.id === aliases[row['项目名/中文']],
    );
  if (!company) {
    missing.push({
      sourceId: row['序号'],
      name: row['项目名/中文'],
      nameEn: row['项目名/英文'],
      sectorIds: tags,
    });
    records.push({
      sourceId: row['序号'],
      sourceName: row['项目名/中文'],
      companyId: slugify(row['项目名/英文']),
      siteName: row['项目名/中文'],
      match: 'added-from-source',
      tag1: row['行业标签 1'],
      tags: tags.map((id) => categories.get(id).zh),
      sectorId: tags[0],
      sectorIds: tags,
    });
    continue;
  }
  if (!exact.length) {
    const description = row['中文详情文案'];
    const sameBody =
      description.startsWith(row['项目名/中文']) &&
      company.detail_cn.startsWith(company.name_cn) &&
      description.slice(row['项目名/中文'].length).trimStart() ===
        company.detail_cn.slice(company.name_cn.length).trimStart();
    assert.ok(
      deckTerms(description) === deckTerms(company.detail_cn) ||
        description === company.detail_cn ||
        sameBody ||
        company.name_cn === row['项目名/中文'],
      `Alias description no longer matches: ${row['项目名/中文']}`,
    );
  }
  assert.ok(!matched.has(company.id), `Company matched twice: ${company.id}`);
  matched.add(company.id);
  records.push({
    sourceId: row['序号'],
    sourceName: row['项目名/中文'],
    companyId: company.id,
    siteName: company.name_cn,
    match: exact.length ? 'exact-name' : 'verified-description-alias',
    tag1: row['行业标签 1'],
    tags: tags.map((id) => categories.get(id).zh),
    sectorId: tags[0],
    sectorIds: tags,
  });
}

const report = {
  source: sourcePath,
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  sourceCount: rows.length,
  matchedCount: records.length,
  scope:
    'The CSV is the portfolio of record: add its missing companies, remove unlisted ones, and take names, detail copy, websites and tags from it.',
  categories: [...categories.values()],
  records,
  missing,
  unlisted: config.companies
    .filter((company) => !matched.has(company.id))
    .map((company) => ({
      companyId: company.id,
      siteName: company.name_cn,
      preservedSectorId: company.sector_id,
    })),
};

if (process.argv.includes('--write')) {
  config.schemaVersion = 18;
  // Copy deck: the six directions keep this fixed order everywhere.
  config.sectors = Object.values(categoryIds)
    .map((id) => categories.get(id))
    .map(({ id, zh, en }) => {
      const previous = config.sectors.find((sector) => sector.id === id);
      return {
        id,
        name_cn: zh,
        name_en: en,
        description_cn: previous?.description_cn || '',
        description_en: previous?.description_en || '',
      };
    });
  config.companies = rows
    .map((row) => {
      const record = records.find((record) => record.sourceId === row['序号']);
      const previous = config.companies.find(
        (company) => company.id === record.companyId,
      );
      const id = previous?.id || record.companyId;
      const logo =
        previous?.logo_file ||
        logos.find((file) => file.replace(/\.\w+$/, '') === id) ||
        '';
      assert.ok(logo, `${id}: no logo file in public/company`);
      const detailCn = deckTerms(row['中文详情文案']);
      const detailEn = deckTerms(row['English detail copy']);
      return {
        id,
        slug: previous?.slug || id,
        name_cn: row['项目名/中文'].trim(),
        name_en: row['项目名/英文'].trim() || previous?.name_en || '',
        description_cn: detailCn,
        description_en: detailEn,
        detail_cn: detailCn,
        detail_en: detailEn,
        website_url: website(row['官网']),
        investment_year: previous?.investment_year || '',
        sector_id: record.sectorId,
        logo_file: logo,
        sector_ids: record.sectorIds,
      };
    })
    .sort((a, b) =>
      a.name_en.localeCompare(b.name_en, 'en', { sensitivity: 'base' }),
    );
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  await fs.writeFile(mappingPath, `${JSON.stringify(report, null, 2)}\n`);
} else {
  const storedReport = JSON.parse(await fs.readFile(mappingPath, 'utf8'));
  assert.equal(
    storedReport.sourceSha256,
    report.sourceSha256,
    'Source CSV changed; audit must be refreshed',
  );
  assert.deepEqual(
    storedReport.records,
    records,
    'Audit mappings differ from current CSV',
  );
  assert.deepEqual(
    storedReport.missing,
    missing,
    'Audit missing-company list differs from current CSV',
  );
  assert.equal(
    config.companies.length,
    rows.length,
    'Site companies differ from the CSV',
  );
  for (const record of records) {
    const company = config.companies.find(
      (company) => company.id === record.companyId,
    );
    assert.ok(company, `${record.companyId}: missing from the site`);
    const row = rows.find((row) => row['序号'] === record.sourceId);
    assert.equal(
      company.name_cn,
      row['项目名/中文'].trim(),
      `${company.id}: name`,
    );
    if (row['项目名/英文'].trim())
      assert.equal(
        company.name_en,
        row['项目名/英文'].trim(),
        `${company.id}: English name`,
      );
    assert.equal(
      company.detail_cn,
      deckTerms(row['中文详情文案']),
      `${company.id}: detail`,
    );
    assert.equal(
      company.detail_en,
      deckTerms(row['English detail copy']),
      `${company.id}: English detail`,
    );
    assert.equal(
      company.website_url,
      website(row['官网']),
      `${company.id}: website`,
    );
    assert.equal(company.sector_id, record.sectorId, `${company.id}: tag1`);
    assert.deepEqual(
      company.sector_ids,
      record.sectorIds,
      `${company.id}: tags 1–4`,
    );
  }
  assert.deepEqual(
    config.sectors.map((sector) => sector.id),
    Object.values(categoryIds),
    'Directions must keep the copy-deck order',
  );
  for (const { id, zh, en } of categories.values()) {
    const sector = config.sectors.find((sector) => sector.id === id);
    assert.equal(sector?.name_cn, zh, `${id}: Chinese category`);
    assert.equal(sector?.name_en, en, `${id}: English category`);
  }
}
console.log(
  JSON.stringify(
    {
      sourceCount: rows.length,
      matchedCount: records.length,
      categoryCount: categories.size,
      multiCategoryCount: records.filter(
        (record) => record.sectorIds.length > 1,
      ).length,
      missing,
      unlistedCount: report.unlisted.length,
    },
    null,
    2,
  ),
);
