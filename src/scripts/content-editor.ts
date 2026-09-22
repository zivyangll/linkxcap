import {
  CONTENT_SCHEMA_VERSION,
  MAX_CONTENT_FILE_BYTES,
  validateContentConfig,
} from '../lib/content-schema';

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };
type Path = Array<string | number>;

const groups = [
  { id: 'site', title: '全站设置', paths: [['site']] },
  {
    id: 'common',
    title: '导航与公共文案',
    paths: [['navigation'], ['ui'], ['socials']],
  },
  { id: 'home', title: '首页', paths: [['pages', 'home'], ['sectors']] },
  {
    id: 'portfolio',
    title: '投资组合',
    paths: [['companies'], ['pages', 'portfolio']],
  },
  { id: 'team', title: '团队', paths: [['team'], ['pages', 'team']] },
  {
    id: 'insights',
    title: '洞察公共设置',
    paths: [['pages', 'insights'], ['insights']],
  },
  {
    id: 'contact',
    title: '联系方式和媒体',
    paths: [['pages', 'contact'], ['media']],
  },
  { id: 'legal', title: '法律声明', paths: [['pages', 'legal']] },
] as const;

const labels: Record<string, string> = {
  site: '全站信息',
  navigation: '导航',
  ui: '公共界面文案',
  socials: '社交平台',
  sectors: '投资领域',
  companies: '公司资料',
  team: '团队成员',
  insights: '洞察内容',
  media: '媒体配置',
  home: '首页',
  portfolio: '投资组合页',
  contact: '联系与 Fellow 页面',
  legal: '法律声明页',
  brand: '品牌名称',
  email: '邮箱',
  company_legal_name: '公司法定名称',
  copyright: '版权文字',
  record_number: '备案号',
  meta_description: 'SEO 描述',
  og_image_file: '社交分享图片文件名',
  page_titles: '页面 SEO 标题',
  items: '记录',
  label: '显示名称',
  title: '标题',
  body: '正文',
  description: '描述',
  detail: '详细介绍',
  intro: '介绍',
  summary: '摘要',
  list_title: '列表标题',
  list_summary: '列表摘要',
  source_name: '来源名称',
  source_url: '原文链接',
  website_url: '官网链接',
  image_file: '图片文件名',
  logo_file: 'Logo 文件名',
  video_url: '视频地址',
  poster_file: '视频封面图片文件名',
  name: '名称',
  role: '职务',
  bio: '人物简介',
  date: '日期',
  order: '排序',
  category: '分类',
  eyebrow: '标题上方辅助小字',
  orbit_eyebrow: '轨道标签上方小字',
  join_eyebrow: '加入我们标题英文小字',
  details_eyebrow: '联系信息标题上方小字',
  id: '结构 ID',
  slug: '详情页路由 slug',
  route: '页面路由',
  page: '页面标识',
  sector_id: '投资领域 ID',
};

const sectionNotes: Record<string, string> = {
  navigation:
    '控制主导航顺序和双语名称；移动菜单底部文字也在这里维护，页面标识与静态路由绑定',
  ui: '全站复用的按钮、交互状态和无障碍提示',
  'pages.home':
    '首页五屏文案；数组中的每一项对应一个视觉换行，统计数据目前为待确认占位',
  'pages.portfolio': '投资组合列表及公司详情的固定界面文案',
  companies: '公司 Logo 只填写文件名；对应图片放在 public/assets 根目录',
  'pages.team': '团队页面固定文案；姓名、职务和人物简介在团队成员中维护',
  team: '成员照片只填写文件名；路由 slug 决定 team-<slug>.html；内部结构 ID 已隐藏并由系统维护',
  'pages.insights':
    '洞察列表页和文章详情页的公共文案；文章内容在 src/content/insights/*.md 中维护',
  insights:
    '文章 Markdown 的 category 必须填写下方某个筛选项的结构 ID；all 仅表示“全部文章”，不能作为文章分类',
  'pages.contact': '联系与 Fellow 页的可见文案',
  media:
    'Fellow 视频地址及封面图片文件名；封面放在 public/assets 根目录，视频不配置字幕',
  'pages.legal': '当前仍是预览占位，正式上线前需由公司或法务审核',
};

const structuralFields = new Set(['id', 'route', 'page']);

const clone = <T>(value: T): T =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
const isObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const getAtPath = (source: JsonObject, path: readonly (string | number)[]) =>
  path.reduce<JsonValue>((value, key) => {
    if (Array.isArray(value) && typeof key === 'number') return value[key];
    if (isObject(value) && typeof key === 'string') return value[key];
    throw new Error(`无法读取配置路径：${path.join('.')}`);
  }, source);
const setAtPath = (source: JsonObject, path: Path, next: JsonValue) => {
  const parent = getAtPath(source, path.slice(0, -1));
  const key = path.at(-1)!;
  if (Array.isArray(parent) && typeof key === 'number') parent[key] = next;
  else if (isObject(parent) && typeof key === 'string') parent[key] = next;
  else throw new Error(`无法更新配置路径：${path.join('.')}`);
};

const fieldBase = (key: string) => key.replace(/_(cn|en)$/, '');
const readableLabel = (key: string) => {
  const base = fieldBase(key);
  return (
    labels[base] ||
    base
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  );
};
const languageOf = (key: string) =>
  key.endsWith('_cn') ? '中文' : key.endsWith('_en') ? 'English' : '';
const isLongText = (key: string, value: string) =>
  value.length > 90 ||
  /(body|description|detail|summary|bio|intro|copy|notice)/.test(key);
const isReadonly = (key: string) => structuralFields.has(key);
const editableCollections = new Set(['companies', 'team']);

let defaults: JsonObject;
let current: JsonObject;
let storageKey = '';
let storageWritable = true;
let activeGroupId: string = groups[0].id;
const activeRecordIndices = new Map<string, number>();

const body = document.body;
const editor = document.querySelector<HTMLElement>('[data-editor]')!;
const gate = document.querySelector<HTMLElement>('[data-gate-card]')!;
const form = document.querySelector<HTMLFormElement>('[data-config-form]')!;
const groupNav = document.querySelector<HTMLElement>('[data-group-nav]')!;
const saveStatus = document.querySelector<HTMLElement>('[data-save-status]')!;
const validationSummary = document.querySelector<HTMLElement>(
  '[data-validation-summary]',
)!;
const errorPanel = document.querySelector<HTMLElement>('[data-errors]')!;
const errorList =
  document.querySelector<HTMLUListElement>('[data-error-list]')!;
const fileInput =
  document.querySelector<HTMLInputElement>('[data-file-input]')!;
const confirmDialog = document.querySelector<HTMLDialogElement>(
  '[data-confirm-dialog]',
)!;
const confirmTitle = document.querySelector<HTMLElement>(
  '[data-confirm-title]',
)!;
const confirmMessage = document.querySelector<HTMLElement>(
  '[data-confirm-message]',
)!;
const confirmAccept = document.querySelector<HTMLButtonElement>(
  '[data-confirm-accept]',
)!;
const confirmCancel = document.querySelector<HTMLButtonElement>(
  '[data-confirm-cancel]',
)!;

let pendingDelete: { collection: string; index: number } | null = null;

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function setStatus(message: string, state: 'saved' | 'error' | 'neutral') {
  saveStatus.textContent = message;
  saveStatus.dataset.state = state;
}

type ValidationLocation = {
  path: string;
  groupId: string;
  label: string;
  detail: string;
  collection?: string;
  recordIndex?: number;
};

function groupForPath(segments: string[]) {
  return groups.find((group) =>
    group.paths.some((configuredPath) =>
      configuredPath.every(
        (segment, index) => String(segment) === segments[index],
      ),
    ),
  );
}

function fieldLocationLabel(key: string) {
  const language = languageOf(key);
  return `${readableLabel(key)}${language ? `（${language}）` : ''}`;
}

function validationLocation(message: string): ValidationLocation | null {
  const separator = message.indexOf('：');
  const rawPath = separator >= 0 ? message.slice(0, separator) : message;
  if (!rawPath.startsWith('content')) return null;
  const path = rawPath.replace(/^content\.?/, '').replace(/\[(\d+)\]/g, '.$1');
  const segments = path.split('.').filter(Boolean);
  const group = groupForPath(segments) || groups[0];
  const detail = separator >= 0 ? message.slice(separator + 1) : message;
  const parts: string[] = [group.title];
  const displaySegments =
    segments[0] === 'pages' ? segments.slice(1) : segments;
  let collection: string | undefined;
  let recordIndex: number | undefined;

  segments.forEach((segment, index) => {
    if (
      /^\d+$/.test(segment) &&
      ['companies', 'team'].includes(segments[index - 1])
    ) {
      collection = segments[index - 1];
      recordIndex = Number(segment);
    }
  });

  const displayOffset = segments[0] === 'pages' ? 1 : 0;
  displaySegments.forEach((segment, displayIndex) => {
    const originalIndex = displayIndex + displayOffset;
    if (/^\d+$/.test(segment)) {
      const index = Number(segment);
      try {
        const record = getAtPath(
          current,
          segments
            .slice(0, originalIndex + 1)
            .map((part) => (/^\d+$/.test(part) ? Number(part) : part)),
        );
        parts.push(
          isObject(record) ? recordTitle(record, index) : `第 ${index + 1} 项`,
        );
      } catch {
        parts.push(`第 ${index + 1} 项`);
      }
      return;
    }
    const nextIsIndex = /^\d+$/.test(displaySegments[displayIndex + 1] || '');
    const isLast = displayIndex === displaySegments.length - 1;
    const label =
      isLast || !nextIsIndex
        ? fieldLocationLabel(segment)
        : readableLabel(segment);
    if (parts.at(-1) !== label) parts.push(label);
  });

  return {
    path,
    groupId: group.id,
    label: parts.join(' › '),
    detail,
    collection,
    recordIndex,
  };
}

function locateValidationError(location: ValidationLocation) {
  activeGroupId = location.groupId;
  if (location.collection && location.recordIndex !== undefined)
    activeRecordIndices.set(location.collection, location.recordIndex);
  renderEditor();
  requestAnimationFrame(() => {
    const target = Array.from(
      form.querySelectorAll<HTMLElement>('[data-config-path]'),
    ).find((node) => node.dataset.configPath === location.path);
    const fallback = location.collection
      ? form.querySelector<HTMLElement>(
          `#${location.collection}-panel-${location.recordIndex || 0}`,
        )
      : form.querySelector<HTMLElement>(`#config-${location.groupId}`);
    const destination = target || fallback;
    destination?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      target.focus({ preventScroll: true });
      const field = target.closest<HTMLElement>('.field, .boolean-field');
      field?.classList.add('is-error-target');
      window.setTimeout(() => field?.classList.remove('is-error-target'), 1800);
    }
  });
}

function showErrors(errors: string[]) {
  errorList.replaceChildren();
  for (const message of errors.slice(0, 30)) {
    const item = element('li', 'validation-error-item');
    const location = validationLocation(message);
    const copy = element('div', 'validation-error-copy');
    const place = element('strong', 'validation-error-location');
    place.textContent = location?.label || '配置文件';
    const detail = element('span', 'validation-error-detail');
    detail.textContent = location?.detail || message;
    copy.append(place, detail);
    item.append(copy);
    if (location) {
      const locate = element('button', 'validation-error-locate');
      locate.type = 'button';
      locate.textContent = '定位';
      locate.dataset.errorPath = location.path;
      locate.addEventListener('click', () => locateValidationError(location));
      item.append(locate);
    }
    errorList.append(item);
  }
  if (errors.length > 30) {
    const item = element('li');
    item.textContent = `另有 ${errors.length - 30} 项问题未显示。`;
    errorList.append(item);
  }
  errorPanel.hidden = errors.length === 0;
  validationSummary.textContent = errors.length
    ? `当前配置有 ${errors.length} 项问题，可点击定位`
    : '当前配置格式有效';
}

function validateCurrent() {
  const result = validateContentConfig(current, defaults);
  showErrors(result.errors);
  return result;
}

function saveDraft() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(current));
    storageWritable = true;
    const time = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());
    setStatus(`已保存到本地 · ${time}`, 'saved');
  } catch (error) {
    storageWritable = false;
    const detail = error instanceof Error ? error.message : '浏览器拒绝写入';
    setStatus(`保存失败：${detail}。当前内容仍可导出。`, 'error');
  }
  validateCurrent();
}

function updateValue(path: Path, value: JsonValue) {
  setAtPath(current, path, value);
  saveDraft();
  refreshRecordTabLabel(path);
}

function scalarField(
  value: string | number | boolean | null,
  key: string,
  path: Path,
  captionText = readableLabel(key),
) {
  const wrapper = element(
    'label',
    typeof value === 'boolean' ? 'boolean-field' : 'field',
  );
  const caption = element('span', 'field-label');
  caption.textContent = captionText;
  const language = languageOf(key);
  if (language) {
    const badge = element('span', 'language-badge');
    badge.textContent = language;
    caption.append(badge);
  }
  if (key === 'slug') {
    const hint = element('small', 'field-label-note');
    const routePattern =
      path[0] === 'team'
        ? '/team-<slug>.html'
        : path[0] === 'companies'
          ? '/portfolio/<slug>.html'
          : '<slug>';
    hint.textContent = `（可修改；使用小写字母、数字和连字符，对应 ${routePattern}）`;
    caption.append(hint);
  }
  const readonly = isReadonly(key);
  let control: HTMLInputElement | HTMLTextAreaElement;
  if (typeof value === 'boolean') {
    const input = element('input');
    input.type = 'checkbox';
    input.checked = value;
    input.dataset.configPath = path.join('.');
    input.disabled = readonly;
    input.addEventListener('change', () => updateValue(path, input.checked));
    control = input;
    wrapper.append(control, caption);
  } else {
    const stringValue = value === null ? '' : String(value);
    if (typeof value === 'string' && isLongText(key, value)) {
      control = element('textarea');
      control.value = stringValue;
    } else {
      control = element('input');
      control.type =
        typeof value === 'number'
          ? 'number'
          : key === 'email'
            ? 'email'
            : key === 'url' || key.endsWith('_url')
              ? 'url'
              : 'text';
      control.value = stringValue;
    }
    control.dataset.configPath = path.join('.');
    control.readOnly = readonly;
    control.addEventListener('input', () => {
      const next =
        typeof value === 'number'
          ? Number((control as HTMLInputElement).value)
          : control.value;
      updateValue(path, next);
    });
    wrapper.append(caption, control);
  }
  if (readonly) {
    const note = element('span', 'field-note');
    note.textContent =
      key === 'id'
        ? '只读：内部 ID 用于绑定视觉素材和页面交互。'
        : '只读：此字段与静态路由或页面交互绑定。';
    wrapper.append(note);
  }
  return wrapper;
}

function recordTitle(value: JsonObject, index: number) {
  for (const key of [
    'name_cn',
    'name_en',
    'title_cn',
    'label_cn',
    'slug',
    'id',
  ])
    if (typeof value[key] === 'string' && value[key])
      return `${index + 1}. ${value[key]}`;
  return `记录 ${index + 1}`;
}

function refreshRecordTabLabel(path: Path) {
  const [collection, index, field] = path;
  if (
    typeof collection !== 'string' ||
    !editableCollections.has(collection) ||
    typeof index !== 'number' ||
    !['name_cn', 'name_en'].includes(String(field))
  )
    return;
  const records = current[collection];
  const record = Array.isArray(records) ? records[index] : undefined;
  if (!isObject(record)) return;
  const label = document.querySelector<HTMLElement>(
    `[data-record-tabs="${collection}"] [data-record-index="${index}"] .record-tab-label`,
  );
  if (label) label.textContent = recordTitle(record, index);
  const heading = document.querySelector<HTMLElement>(
    `[data-record-panel-title="${collection}-${index}"]`,
  );
  if (heading)
    heading.textContent = recordTitle(record, index).replace(/^\d+\.\s*/, '');
}

function nextIdentifier(
  records: JsonValue[],
  field: 'slug' | 'id',
  prefix: string,
) {
  const existing = new Set(
    records.flatMap((record) =>
      isObject(record) && typeof record[field] === 'string'
        ? [record[field] as string]
        : [],
    ),
  );
  let suffix = records.length + 1;
  while (existing.has(`${prefix}-${suffix}`)) suffix += 1;
  return `${prefix}-${suffix}`;
}

function createRecord(collection: string, records: JsonValue[]): JsonObject {
  if (collection === 'companies') {
    const sectors = current.sectors;
    const firstSector =
      Array.isArray(sectors) && isObject(sectors[0])
        ? String(sectors[0].id || '')
        : '';
    const number = records.length + 1;
    return {
      id: nextIdentifier(records, 'id', 'company'),
      slug: nextIdentifier(records, 'slug', 'company'),
      name_cn: `新公司 ${number}`,
      name_en: `New company ${number}`,
      description_cn: '',
      description_en: '',
      detail_cn: '',
      detail_en: '',
      website_url: '',
      sector_id: firstSector,
      logo_file: '',
    };
  }
  const number = records.length + 1;
  return {
    id: nextIdentifier(records, 'id', 'member'),
    slug: nextIdentifier(records, 'slug', 'member'),
    name_cn: `新成员 ${number}`,
    name_en: `New member ${number}`,
    role_cn: '',
    role_en: '',
    image_file: '',
    bio_cn: '',
    bio_en: '',
  };
}

function reorderRecord(collection: string, from: number, to: number) {
  const records = current[collection];
  if (!Array.isArray(records) || from === to || to < 0 || to >= records.length)
    return;
  const [record] = records.splice(from, 1);
  records.splice(to, 0, record);
  activeRecordIndices.set(collection, to);
  saveDraft();
  renderEditor();
}

function addRecord(collection: string) {
  const records = current[collection];
  if (!Array.isArray(records)) return;
  records.push(createRecord(collection, records));
  activeRecordIndices.set(collection, records.length - 1);
  saveDraft();
  renderEditor();
}

function performDeleteRecord(collection: string, index: number) {
  const records = current[collection];
  if (!Array.isArray(records)) return;
  records.splice(index, 1);
  activeRecordIndices.set(collection, Math.min(index, records.length - 1));
  saveDraft();
  renderEditor();
}

function deleteRecord(collection: string, index: number) {
  const records = current[collection];
  if (!Array.isArray(records)) return;
  if (records.length <= 1) {
    setStatus(`${readableLabel(collection)}至少需要保留一条记录。`, 'error');
    return;
  }
  const record = records[index];
  const name = isObject(record)
    ? recordTitle(record, index).replace(/^\d+\.\s*/, '')
    : `记录 ${index + 1}`;
  const kind = collection === 'companies' ? '公司' : '团队成员';
  confirmTitle.textContent = `删除${kind}？`;
  confirmMessage.textContent = `“${name}”将从当前草稿中移除。此操作会立即保存到本地，但在关闭弹窗前仍可取消。`;
  confirmAccept.textContent = `删除${kind}`;
  pendingDelete = { collection, index };
  confirmDialog.showModal();
  confirmCancel.focus();
}

function renderCollectionTabs(
  value: JsonValue[],
  key: string,
  path: Path,
): HTMLElement {
  const group = element('fieldset', 'object-group collection-group');
  const legend = element('legend');
  legend.textContent = readableLabel(key);
  group.append(legend);

  const layout = element('div', 'collection-layout');
  const sidebar = element('div', 'collection-sidebar');
  const header = element('div', 'collection-header');
  const hint = element('p', 'collection-hint');
  hint.textContent = '拖动调整顺序；触摸设备可使用上下按钮。';
  const add = element('button', 'collection-add');
  add.type = 'button';
  const addIcon = element('span', 'collection-add-icon');
  addIcon.textContent = '+';
  addIcon.setAttribute('aria-hidden', 'true');
  const addLabel = element('span');
  addLabel.textContent = key === 'companies' ? '新增公司' : '新增成员';
  add.append(addIcon, addLabel);
  add.dataset.collectionAdd = key;
  add.addEventListener('click', () => addRecord(key));
  header.append(hint, add);

  const tabs = element('div', 'record-tabs');
  tabs.dataset.recordTabs = key;
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', `${readableLabel(key)}列表`);
  const selected = Math.min(
    activeRecordIndices.get(key) || 0,
    Math.max(value.length - 1, 0),
  );
  activeRecordIndices.set(key, selected);
  let draggedIndex = -1;
  const panels = element('div', 'record-panels');

  value.forEach((item, index) => {
    if (!isObject(item)) return;
    const tabRow = element('div', 'record-tab-row');
    tabRow.draggable = true;
    tabRow.dataset.recordIndex = String(index);
    const tab = element('button', 'record-tab');
    tab.type = 'button';
    tab.id = `${key}-tab-${index}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `${key}-panel-${index}`);
    tab.setAttribute('aria-selected', String(index === selected));
    tab.tabIndex = index === selected ? 0 : -1;
    const dragMark = element('span', 'drag-mark');
    dragMark.textContent = '⋮⋮';
    dragMark.setAttribute('aria-hidden', 'true');
    const tabLabel = element('span', 'record-tab-label');
    tabLabel.textContent = recordTitle(item, index);
    tab.append(dragMark, tabLabel);
    tab.addEventListener('click', () => {
      activeRecordIndices.set(key, index);
      tabs.querySelectorAll<HTMLElement>('[role="tab"]').forEach((node) => {
        const active = node === tab;
        node.setAttribute('aria-selected', String(active));
        node.tabIndex = active ? 0 : -1;
      });
      panels
        .querySelectorAll<HTMLElement>('[role="tabpanel"]')
        .forEach((panel) => {
          panel.hidden = panel.id !== `${key}-panel-${index}`;
        });
    });

    const actions = element('span', 'record-tab-actions');
    const up = element('button', 'record-move');
    up.type = 'button';
    up.textContent = '↑';
    up.title = '上移';
    up.disabled = index === 0;
    up.addEventListener('click', () => reorderRecord(key, index, index - 1));
    const down = element('button', 'record-move');
    down.type = 'button';
    down.textContent = '↓';
    down.title = '下移';
    down.disabled = index === value.length - 1;
    down.addEventListener('click', () => reorderRecord(key, index, index + 1));
    actions.append(up, down);
    tabRow.append(tab, actions);
    tabRow.addEventListener('dragstart', (event) => {
      draggedIndex = index;
      event.dataTransfer?.setData('text/plain', String(index));
      event.dataTransfer?.setDragImage(tabRow, 12, 12);
      tabRow.classList.add('is-dragging');
    });
    tabRow.addEventListener('dragend', () => {
      draggedIndex = -1;
      tabRow.classList.remove('is-dragging');
      tabs
        .querySelectorAll('.is-drag-target')
        .forEach((node) => node.classList.remove('is-drag-target'));
    });
    tabRow.addEventListener('dragover', (event) => {
      event.preventDefault();
      tabRow.classList.add('is-drag-target');
    });
    tabRow.addEventListener('dragleave', () =>
      tabRow.classList.remove('is-drag-target'),
    );
    tabRow.addEventListener('drop', (event) => {
      event.preventDefault();
      tabRow.classList.remove('is-drag-target');
      const source = Number(
        event.dataTransfer?.getData('text/plain') || draggedIndex,
      );
      if (Number.isInteger(source)) reorderRecord(key, source, index);
    });
    tabs.append(tabRow);

    const panel = element('section', 'record-panel');
    panel.id = `${key}-panel-${index}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.hidden = index !== selected;
    const panelHeader = element('div', 'record-panel-header');
    const panelTitle = element('h3');
    panelTitle.dataset.recordPanelTitle = `${key}-${index}`;
    panelTitle.textContent = recordTitle(item, index).replace(/^\d+\.\s*/, '');
    const remove = element('button', 'record-delete');
    remove.type = 'button';
    remove.textContent = '删除';
    remove.addEventListener('click', () => deleteRecord(key, index));
    panelHeader.append(panelTitle, remove);
    panel.append(panelHeader, renderObject(item, [...path, index]));
    panels.append(panel);
  });

  sidebar.append(header, tabs);
  layout.append(sidebar, panels);
  group.append(layout);
  return group;
}

function renderValue(value: JsonValue, key: string, path: Path): HTMLElement {
  if (Array.isArray(value)) {
    if (editableCollections.has(key))
      return renderCollectionTabs(value, key, path);
    const group = element('fieldset', 'object-group');
    const legend = element('legend');
    appendTitleWithNote(legend, readableLabel(key), path);
    group.append(legend);
    if (value.every((item) => !isObject(item) && !Array.isArray(item))) {
      const list = element('div', 'primitive-list');
      value.forEach((item, index) =>
        list.append(
          scalarField(
            item as string | number | boolean | null,
            key,
            [...path, index],
            `${readableLabel(key)} · ${index + 1}`,
          ),
        ),
      );
      group.append(list);
    } else {
      const list = element('div', 'record-list');
      value.forEach((item, index) => {
        const card = element('article', 'record-card');
        const title = element('h3');
        title.textContent = isObject(item)
          ? recordTitle(item, index)
          : `记录 ${index + 1}`;
        card.append(title);
        if (isObject(item)) card.append(renderObject(item, [...path, index]));
        else
          card.append(renderValue(item, String(index + 1), [...path, index]));
        list.append(card);
      });
      group.append(list);
    }
    return group;
  }
  if (isObject(value)) {
    const group = element('fieldset', 'object-group');
    const legend = element('legend');
    appendTitleWithNote(legend, readableLabel(key), path);
    group.append(legend, renderObject(value, path));
    return group;
  }
  return scalarField(value, key, path);
}

function appendTitleWithNote(target: HTMLElement, title: string, path: Path) {
  const titleNode = element('span');
  titleNode.textContent = title;
  target.append(titleNode);
  const note = sectionNotes[path.join('.')];
  if (!note) return;
  const noteNode = element('small', 'title-note');
  noteNode.textContent = `（${note}）`;
  target.append(noteNode);
}

function renderObject(value: JsonObject, path: Path) {
  const container = element('div', 'record-list');
  const handled = new Set<string>();
  for (const key of Object.keys(value)) {
    if (handled.has(key)) continue;
    if (
      key === 'id' &&
      (path[0] === 'companies' || path[0] === 'team') &&
      typeof path[1] === 'number'
    ) {
      handled.add(key);
      continue;
    }
    const match = key.match(/^(.*)_cn$/);
    const englishKey = match ? `${match[1]}_en` : '';
    if (match && Object.hasOwn(value, englishKey)) {
      const pair = element('div', 'language-pair');
      pair.append(
        renderValue(value[key], key, [...path, key]),
        renderValue(value[englishKey], englishKey, [...path, englishKey]),
      );
      container.append(pair);
      handled.add(key);
      handled.add(englishKey);
      continue;
    }
    container.append(renderValue(value[key], key, [...path, key]));
    handled.add(key);
  }
  return container;
}

confirmDialog.addEventListener('close', () => {
  if (confirmDialog.returnValue === 'confirm' && pendingDelete)
    performDeleteRecord(pendingDelete.collection, pendingDelete.index);
  pendingDelete = null;
  confirmDialog.returnValue = '';
});

confirmDialog.addEventListener('click', (event) => {
  if (event.target === confirmDialog) confirmDialog.close('cancel');
});

function renderEditor() {
  form.replaceChildren();
  groupNav.replaceChildren();
  for (const group of groups) {
    const tab = element('button', 'group-tab');
    tab.type = 'button';
    tab.id = `group-tab-${group.id}`;
    tab.textContent = group.title;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `config-${group.id}`);
    tab.setAttribute('aria-selected', String(group.id === activeGroupId));
    tab.tabIndex = group.id === activeGroupId ? 0 : -1;
    tab.addEventListener('click', () => {
      activeGroupId = group.id;
      groupNav.querySelectorAll<HTMLElement>('[role="tab"]').forEach((node) => {
        const active = node === tab;
        node.setAttribute('aria-selected', String(active));
        node.tabIndex = active ? 0 : -1;
      });
      form
        .querySelectorAll<HTMLElement>('[data-group-panel]')
        .forEach((panel) => {
          panel.hidden = panel.id !== `config-${group.id}`;
        });
    });
    groupNav.append(tab);

    const section = element('section', 'config-section');
    section.id = `config-${group.id}`;
    section.dataset.groupPanel = group.id;
    section.setAttribute('role', 'tabpanel');
    section.setAttribute('aria-labelledby', tab.id);
    section.hidden = group.id !== activeGroupId;
    const heading = element('h2');
    heading.textContent = group.title;
    section.append(heading);
    for (const configuredPath of group.paths) {
      const path = [...configuredPath] as Path;
      const value = getAtPath(current, path);
      section.append(renderValue(value, path.at(-1) as string, path));
    }
    form.append(section);
  }
  validateCurrent();
}

function fatalDraftErrors(errors: string[]) {
  return errors.some((error) =>
    /(危险字段|双语字段必须|缺少必填字段|未知字段|应为|schemaVersion)/.test(
      error,
    ),
  );
}

function restoreDraft() {
  let serialized: string | null = null;
  try {
    serialized = localStorage.getItem(storageKey);
  } catch (error) {
    storageWritable = false;
    setStatus(
      `无法读取本地草稿：${error instanceof Error ? error.message : '浏览器已禁用 localStorage'}。当前使用项目默认配置。`,
      'error',
    );
    return;
  }
  if (!serialized) {
    setStatus('当前使用项目默认配置；修改任意字段后会自动保存。', 'neutral');
    return;
  }
  try {
    const parsed = JSON.parse(serialized) as unknown;
    const validation = validateContentConfig(parsed, defaults);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      (parsed as { schemaVersion?: unknown }).schemaVersion !==
        CONTENT_SCHEMA_VERSION ||
      fatalDraftErrors(validation.errors)
    ) {
      showErrors(validation.errors);
      setStatus(
        '已有草稿损坏或版本不兼容，未覆盖该草稿；当前暂用项目默认配置。',
        'error',
      );
      return;
    }
    current = parsed as JsonObject;
    showErrors(validation.errors);
    setStatus(
      validation.valid
        ? '已恢复当前域名下的本地草稿。'
        : '已恢复本地草稿；其中仍有格式问题，请修正后再导出。',
      validation.valid ? 'saved' : 'error',
    );
  } catch (error) {
    setStatus(
      `已有草稿无法解析，未覆盖该草稿：${error instanceof Error ? error.message : 'JSON 损坏'}`,
      'error',
    );
  }
}

async function importFile(file: File) {
  if (file.size > MAX_CONTENT_FILE_BYTES) {
    showErrors([
      `文件过大：最大允许 ${MAX_CONTENT_FILE_BYTES / 1024 / 1024} MB`,
    ]);
    return;
  }
  let candidate: unknown;
  try {
    candidate = JSON.parse(await file.text());
  } catch (error) {
    showErrors([
      `JSON 解析失败：${error instanceof Error ? error.message : '文件内容无效'}`,
    ]);
    return;
  }
  const validation = validateContentConfig(candidate, defaults);
  if (!validation.valid) {
    showErrors(validation.errors);
    setStatus('导入失败，当前表单和本地草稿均未改变。', 'error');
    return;
  }
  const confirmed = confirm(
    '导入将完整覆盖当前全部表单内容和本地草稿，不会与旧配置合并。是否继续？',
  );
  if (!confirmed) {
    setStatus('已取消导入，当前内容未改变。', 'neutral');
    return;
  }
  const replacement = clone(candidate as JsonObject);
  try {
    localStorage.setItem(storageKey, JSON.stringify(replacement));
    storageWritable = true;
  } catch (error) {
    storageWritable = false;
    setStatus(
      `导入未执行：无法替换本地草稿（${error instanceof Error ? error.message : '存储失败'}）。当前内容未改变。`,
      'error',
    );
    return;
  }
  current = replacement;
  renderEditor();
  setStatus(`已完整导入 ${file.name} 并替换本地草稿。`, 'saved');
}

function timestamp() {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(new Date())
    .replace(' ', '-')
    .replaceAll(':', '');
  return parts;
}

function exportCurrent() {
  const validation = validateCurrent();
  if (!validation.valid) {
    setStatus('导出已停止：请先修正上方列出的配置问题。', 'error');
    errorPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const json = `${JSON.stringify(current, null, 2)}\n`;
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = element('a');
  link.href = objectUrl;
  link.download = `content-${timestamp()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  setStatus(
    storageWritable
      ? '已导出当前完整配置。'
      : '本地保存不可用；已直接导出当前内存中的完整配置。',
    'saved',
  );
}

export async function initContentEditor() {
  const configUrl = body.dataset.configUrl;
  if (!configUrl) throw new Error('缺少配置数据地址');
  const response = await fetch(configUrl, {
    cache: 'no-store',
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error(`配置载入失败：HTTP ${response.status}`);
  const source = (await response.json()) as unknown;
  const validation = validateContentConfig(source, source);
  if (!validation.valid)
    throw new Error(`项目默认配置无效：${validation.errors.join('；')}`);
  defaults = clone(source as JsonObject);
  current = clone(defaults);
  storageKey = `linkx-content-editor:${location.hostname}:schema-${CONTENT_SCHEMA_VERSION}`;
  restoreDraft();
  renderEditor();

  document.querySelector('[data-import]')?.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (file) await importFile(file);
  });
  document
    .querySelector('[data-export]')
    ?.addEventListener('click', exportCurrent);
  form.addEventListener('submit', (event) => event.preventDefault());
  editor.hidden = false;
  gate.hidden = true;
  body.dataset.editorState = 'ready';
}
