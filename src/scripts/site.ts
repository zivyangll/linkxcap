import { mountFocusControls } from './focus-controls';
export {};
// The copyright year is never written at build time: the site is deployed
// once and keeps running for years, so the browser fills it in.
function fillCurrentYear() {
  const year = String(new Date().getFullYear());
  document
    .querySelectorAll<HTMLElement>('[data-current-year]')
    .forEach((element) => {
      element.textContent = year;
      element.setAttribute('datetime', year);
    });
}
fillCurrentYear();
// A page restored from the back/forward cache may be from another year.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) fillCurrentYear();
});
const liveStatus = document.querySelector<HTMLElement>('[data-status]');
const menu = document.querySelector<HTMLDialogElement>('#site-menu');
const menuOpener =
  document.querySelector<HTMLButtonElement>('[data-menu-open]');
menuOpener?.addEventListener('click', () => {
  menu?.showModal();
  menuOpener.setAttribute('aria-expanded', 'true');
  document.body.classList.add('menu-open');
});
document
  .querySelector('[data-menu-close]')
  ?.addEventListener('click', () => menu?.close());
// A click anywhere outside the panel closes it. This listens on the document:
// on desktop the ::backdrop is clipped to the panel, so a click on the blank
// area never reaches the dialog itself.
document.addEventListener('click', (event) => {
  if (!menu?.open) return;
  if ((event.target as Element | null)?.closest('[data-menu-open]')) return;
  const rect = menu.getBoundingClientRect();
  const { clientX: x, clientY: y } = event;
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom)
    menu.close();
});
menu?.addEventListener('close', () => {
  document.body.classList.remove('menu-open');
  menuOpener?.setAttribute('aria-expanded', 'false');
  menuOpener?.focus({ preventScroll: true });
});

function updateLanguageLinks() {
  document
    .querySelectorAll<HTMLAnchorElement>('[data-language]')
    .forEach((link) => {
      const target = new URL(link.href);
      if (location.hash) target.hash = location.hash;
      const category = new URL(location.href).searchParams.get('category');
      if (category) target.searchParams.set('category', category);
      else target.searchParams.delete('category');
      link.href = target.href;
    });
}
updateLanguageLinks();
window.addEventListener('hashchange', updateLanguageLinks);

const filterButtons =
  document.querySelectorAll<HTMLButtonElement>('[data-filter]');
const stories = document.querySelectorAll<HTMLElement>('[data-category]');
function filterStories(category: string, updateUrl = true) {
  const allowed = Array.from(filterButtons).some(
    (button) => button.dataset.filter === category,
  );
  const selected = allowed ? category : 'all';
  let visible = 0;
  filterButtons.forEach((button) =>
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.filter === selected),
    ),
  );
  stories.forEach((story) => {
    const show = selected === 'all' || story.dataset.category === selected;
    story.hidden = !show;
    if (show) visible++;
  });
  const empty = document.querySelector<HTMLElement>('[data-empty]');
  if (empty) empty.hidden = visible > 0;
  if (liveStatus)
    liveStatus.textContent = (
      document.body.dataset.storiesStatus || ''
    ).replace('{count}', String(visible));
  if (updateUrl) {
    const url = new URL(location.href);
    if (selected === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', selected);
    history.replaceState(null, '', url);
    updateLanguageLinks();
  }
}
filterButtons.forEach((button) =>
  button.addEventListener('click', () => filterStories(button.dataset.filter!)),
);
document
  .querySelector('[data-filter-reset]')
  ?.addEventListener('click', () => filterStories('all'));
if (filterButtons.length)
  filterStories(
    new URL(location.href).searchParams.get('category') || 'all',
    false,
  );

document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((button) =>
  button.addEventListener('click', async () => {
    const value = button.dataset.copy || location.href;
    try {
      await navigator.clipboard.writeText(value);
      const copied = document.body.dataset.copiedStatus || '';
      if (liveStatus) liveStatus.textContent = copied;
      const previous = button.textContent;
      button.textContent = copied;
      window.setTimeout(() => (button.textContent = previous), 1800);
    } catch {
      if (liveStatus)
        liveStatus.textContent = document.body.dataset.copyFailedStatus || '';
    }
  }),
);

const header = document.querySelector<HTMLElement>('[data-header]');
const homeStory = document.querySelector('[data-home]');
if (homeStory) {
  const updateHeaderMask = () =>
    header?.classList.toggle('is-scrolled', scrollY > 12);
  updateHeaderMask();
  window.addEventListener('scroll', updateHeaderMask, { passive: true });
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          header?.classList.toggle(
            'is-minimal',
            entry.target.hasAttribute('data-minimal-header'),
          );
          header?.classList.toggle(
            'is-dark',
            entry.target.hasAttribute('data-dark-header'),
          );
        }
      }
    },
    { rootMargin: '-8% 0px -87% 0px', threshold: 0 },
  );
  document
    .querySelectorAll('.story-scene')
    .forEach((section) => observer.observe(section));
  window.addEventListener(
    'pagehide',
    () => {
      observer.disconnect();
      window.removeEventListener('scroll', updateHeaderMask);
    },
    { once: true },
  );
}

// Content selection stays available if the optional animation chunk fails.
for (const root of document.querySelectorAll<HTMLElement>(
  '[data-topology-kind="home"]',
))
  mountFocusControls(root);
