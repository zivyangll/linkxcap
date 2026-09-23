export const CONTENT_SCHEMA_VERSION = 13;
export const MAX_CONTENT_FILE_BYTES = 2 * 1024 * 1024;

export type ContentValidation = {
  valid: boolean;
  errors: string[];
};

const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const valueType = (value: unknown) =>
  Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;

function inspectKeys(
  value: unknown,
  path: string,
  errors: string[],
  depth = 0,
) {
  if (depth > 30) {
    errors.push(`${path}：嵌套层级过深`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      inspectKeys(item, `${path}[${index}]`, errors, depth + 1),
    );
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) errors.push(`${path}.${key}：禁止的危险字段`);
    if (key === 'zh' || key === 'en' || /(?:Zh|En)$/.test(key))
      errors.push(`${path}.${key}：双语字段必须使用 _cn / _en 后缀`);
    inspectKeys(child, `${path}.${key}`, errors, depth + 1);
  }
}

function compareShape(
  value: unknown,
  template: unknown,
  path: string,
  errors: string[],
) {
  if (Array.isArray(template)) {
    if (!Array.isArray(value)) {
      errors.push(`${path}：应为数组，实际为 ${valueType(value)}`);
      return;
    }
    if (template.length)
      value.forEach((item, index) =>
        compareShape(item, template[0], `${path}[${index}]`, errors),
      );
    return;
  }
  if (isObject(template)) {
    if (!isObject(value)) {
      errors.push(`${path}：应为对象，实际为 ${valueType(value)}`);
      return;
    }
    const expected = new Set(Object.keys(template));
    for (const key of expected)
      if (!Object.hasOwn(value, key))
        errors.push(`${path}.${key}：缺少必填字段`);
    for (const key of Object.keys(value))
      if (!expected.has(key)) errors.push(`${path}.${key}：未知字段`);
    for (const key of expected)
      if (Object.hasOwn(value, key))
        compareShape(value[key], template[key], `${path}.${key}`, errors);
    return;
  }
  if (typeof value !== typeof template)
    errors.push(`${path}：应为 ${typeof template}，实际为 ${valueType(value)}`);
}

function uniqueStrings(
  items: unknown,
  key: string,
  path: string,
  errors: string[],
) {
  if (!Array.isArray(items)) return new Set<string>();
  const seen = new Set<string>();
  items.forEach((item, index) => {
    const value = isObject(item) ? item[key] : undefined;
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(`${path}[${index}].${key}：必须是非空字符串`);
      return;
    }
    if (seen.has(value))
      errors.push(`${path}[${index}].${key}：值 ${value} 重复`);
    seen.add(value);
  });
  return seen;
}

function requireRecordStrings(
  items: unknown,
  fields: string[],
  path: string,
  errors: string[],
) {
  if (!Array.isArray(items)) return;
  items.forEach((item, index) => {
    if (!isObject(item)) return;
    for (const field of fields)
      if (typeof item[field] !== 'string' || !item[field].trim())
        errors.push(`${path}[${index}].${field}：必须填写`);
  });
}

function validateUrls(value: unknown, path: string, errors: string[]) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateUrls(item, `${path}[${index}]`, errors),
    );
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if ((key === 'url' || key.endsWith('_url')) && typeof child === 'string') {
      if (child === '') continue;
      try {
        const parsed = new URL(child.replace('{lang}', 'zh'));
        if (!['http:', 'https:'].includes(parsed.protocol))
          errors.push(`${childPath}：只允许 http 或 https 链接`);
      } catch {
        errors.push(`${childPath}：不是有效链接`);
      }
    }
    validateUrls(child, childPath, errors);
  }
}

function validateAssetFilenames(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateAssetFilenames(item, `${path}[${index}]`, errors),
    );
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (key.endsWith('_file') && typeof child === 'string' && child !== '') {
      if (
        child.includes('/') ||
        child.includes('\\') ||
        child.includes('..') ||
        child.includes('?') ||
        child.includes('#')
      )
        errors.push(`${childPath}：只能填写文件名，不能包含目录或查询参数`);
      if (key === 'video_file') {
        if (!/^[^:<>\x00-\x1f]+\.mp4$/i.test(child))
          errors.push(
            `${childPath}：必须填写 MP4 视频文件名，例如 video_example.mp4`,
          );
      } else if (!/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(child))
        errors.push(`${childPath}：必须是受支持的图片文件名`);
    }
    validateAssetFilenames(child, childPath, errors);
  }
}

function validateRelations(config: Record<string, unknown>, errors: string[]) {
  const site = config.site;
  if (isObject(site)) {
    const email = site.email;
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push('content.site.email：邮箱格式无效');
    if (typeof site.og_image_file !== 'string' || !site.og_image_file.trim())
      errors.push('content.site.og_image_file：必须填写');
  }

  const sectors = uniqueStrings(
    config.sectors,
    'id',
    'content.sectors',
    errors,
  );
  const team = uniqueStrings(config.team, 'id', 'content.team', errors);
  const teamSlugs = uniqueStrings(config.team, 'slug', 'content.team', errors);
  const companyIds = uniqueStrings(
    config.companies,
    'id',
    'content.companies',
    errors,
  );
  const companies = uniqueStrings(
    config.companies,
    'slug',
    'content.companies',
    errors,
  );
  if (!team.size) errors.push('content.team：至少需要一名团队成员');
  if (!companies.size) errors.push('content.companies：至少需要一家公司');
  requireRecordStrings(
    config.companies,
    [
      'id',
      'slug',
      'name_cn',
      'name_en',
      'description_cn',
      'description_en',
      'detail_cn',
      'detail_en',
      'sector_id',
      'logo_file',
    ],
    'content.companies',
    errors,
  );
  requireRecordStrings(
    config.team,
    [
      'id',
      'slug',
      'name_cn',
      'name_en',
      'role_cn',
      'role_en',
      'image_file',
      'bio_cn',
      'bio_en',
    ],
    'content.team',
    errors,
  );

  if (Array.isArray(config.companies))
    config.companies.forEach((company, index) => {
      if (
        isObject(company) &&
        typeof company.slug === 'string' &&
        company.slug &&
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(company.slug)
      )
        errors.push(
          `content.companies[${index}].slug：只能使用小写字母、数字和连字符，且不能以连字符开头或结尾`,
        );
      if (
        isObject(company) &&
        typeof company.sector_id === 'string' &&
        !sectors.has(company.sector_id)
      )
        errors.push(
          `content.companies[${index}].sector_id：未找到对应投资领域`,
        );
    });

  if (Array.isArray(config.team))
    config.team.forEach((person, index) => {
      if (
        isObject(person) &&
        typeof person.slug === 'string' &&
        person.slug &&
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(person.slug)
      )
        errors.push(
          `content.team[${index}].slug：只能使用小写字母、数字和连字符，且不能以连字符开头或结尾`,
        );
    });

  if (!companyIds.size)
    errors.push('content.companies：每家公司都需要稳定的内部 ID');
  if (!teamSlugs.size)
    errors.push('content.team：每位团队成员都需要唯一的路由 slug');

  const insights = config.insights;
  if (isObject(insights))
    uniqueStrings(insights.filters, 'id', 'content.insights.filters', errors);
}

export function validateContentConfig(
  candidate: unknown,
  template?: unknown,
): ContentValidation {
  const errors: string[] = [];
  if (!isObject(candidate))
    return { valid: false, errors: ['content：顶层必须是对象'] };
  inspectKeys(candidate, 'content', errors);
  if (candidate.schemaVersion !== CONTENT_SCHEMA_VERSION)
    errors.push(
      `content.schemaVersion：必须为 ${CONTENT_SCHEMA_VERSION}，实际为 ${String(candidate.schemaVersion)}`,
    );
  if (template !== undefined)
    compareShape(candidate, template, 'content', errors);
  validateUrls(candidate, 'content', errors);
  validateAssetFilenames(candidate, 'content', errors);
  validateRelations(candidate, errors);
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

// Preserve older drafts/imports without merging defaults or overwriting storage.
export function upgradeContentConfig(candidate: unknown): unknown {
  if (
    !isObject(candidate) ||
    ![9, 10, 11, 12].includes(candidate.schemaVersion as number) ||
    !isObject(candidate.ui) ||
    !isObject(candidate.media) ||
    !isObject(candidate.media.fellow)
  )
    return candidate;
  const ui = { ...candidate.ui };
  for (const key of ['pause_cn', 'pause_en', 'resume_cn', 'resume_en'])
    delete ui[key];
  const fellow = { ...candidate.media.fellow };
  const pages = { ...(candidate.pages as Record<string, unknown>) };
  if (isObject(pages.contact)) {
    const contact = { ...pages.contact };
    delete contact.play_video_cn;
    delete contact.play_video_en;
    if (Array.isArray(contact.wechat)) {
      const files = [
        'wechat-linkx-capital.png',
        'wechat-tone-innovation-lab.png',
      ];
      contact.wechat = contact.wechat.map((item, index) => {
        if (!isObject(item)) return item;
        const next = { ...item };
        if (!Object.hasOwn(next, 'image_file'))
          next.image_file = files[index] || '';
        delete next.pending_cn;
        delete next.pending_en;
        return next;
      });
    }
    pages.contact = contact;
  }
  if (
    Object.hasOwn(fellow, 'video_url') &&
    !Object.hasOwn(fellow, 'video_file')
  ) {
    // The asset must be copied to public/assets; invalid names remain visible
    // to the normal validator rather than silently discarding the user's value.
    let filename = fellow.video_url;
    if (typeof filename === 'string' && filename) {
      try {
        const source = new URL(filename, 'https://local.invalid/');
        if (['https:', 'http:'].includes(source.protocol))
          filename = decodeURIComponent(
            source.pathname.slice(source.pathname.lastIndexOf('/') + 1),
          );
      } catch {
        /* Keep the original value so validation explains the problem. */
      }
    }
    fellow.video_file = filename;
    delete fellow.video_url;
  }
  return {
    ...candidate,
    schemaVersion: CONTENT_SCHEMA_VERSION,
    ui,
    pages,
    media: { ...candidate.media, fellow },
  };
}
