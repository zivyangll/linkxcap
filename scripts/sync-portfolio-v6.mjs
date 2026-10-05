import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

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
  'AI 基础设施': 'infrastructure',
  芯片: 'chips',
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
      description === company.detail_cn || sameBody,
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
    'Update existing companies only; do not add/remove companies or infer missing tags.',
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
  config.sectors = [...categories.values()].map(({ id, zh, en }) => {
    const previous = config.sectors.find((sector) => sector.id === id);
    return {
      id,
      name_cn: zh,
      name_en: en,
      description_cn: previous?.description_cn || '',
      description_en: previous?.description_en || '',
    };
  });
  config.companies.forEach((company) => {
    const record = records.find((record) => record.companyId === company.id);
    company.sector_id = record?.sectorId || company.sector_id;
    company.sector_ids = record?.sectorIds ||
      company.sector_ids || [company.sector_id];
  });
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
  for (const record of records) {
    const company = config.companies.find(
      (company) => company.id === record.companyId,
    );
    assert.equal(company.sector_id, record.sectorId, `${company.id}: tag1`);
    assert.deepEqual(
      company.sector_ids,
      record.sectorIds,
      `${company.id}: tags 1–4`,
    );
  }
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
