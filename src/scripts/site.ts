export {};
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
menu?.addEventListener('click', (event) => {
  if (event.target === menu) {
    const rect = menu.getBoundingClientRect();
    if ((event as MouseEvent).clientX < rect.left) menu.close();
  }
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
if (document.querySelector('[data-home]')) {
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
  window.addEventListener('pagehide', () => observer.disconnect(), {
    once: true,
  });
}

// Content selection stays available if the optional animation chunk fails.
const stars = document.querySelectorAll<HTMLButtonElement>('[data-sector]');
const panels = document.querySelectorAll<HTMLElement>('[data-sector-panel]');
const select = (id: string) => {
  stars.forEach((star) => {
    const active = star.dataset.sector === id;
    star.classList.toggle('is-active', active);
    star.setAttribute('aria-pressed', String(active));
  });
  panels.forEach((panel) => {
    const active = panel.dataset.sectorPanel === id;
    panel.style.display = active ? 'block' : 'none';
    panel.classList.toggle('is-active', active);
    if (active && !matchMedia('(prefers-reduced-motion:reduce)').matches)
      panel.animate(
        [
          { opacity: 0.4, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 300, easing: 'ease-out' },
      );
  });
  document.querySelector<HTMLElement>('.focus')?.setAttribute('data-focus', id);
  document.querySelector<HTMLElement>('.focus')?.classList.add('has-selection');
  document
    .querySelectorAll<HTMLElement>('[data-constellation]')
    .forEach((scene) => {
      scene.hidden = scene.dataset.constellation !== id;
    });
};
stars.forEach((star) =>
  star.addEventListener('click', () => select(star.dataset.sector!)),
);
